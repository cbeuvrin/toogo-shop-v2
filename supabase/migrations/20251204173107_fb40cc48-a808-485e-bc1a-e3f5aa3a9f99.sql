-- 1. Primero identificar y eliminar variaciones duplicadas que NO tienen órdenes asociadas
-- Mantener solo una variación por combinación única (la más antigua)

WITH duplicates AS (
  SELECT 
    pv.id,
    pv.product_id,
    pv.combination,
    ROW_NUMBER() OVER (
      PARTITION BY pv.product_id, pv.combination::text 
      ORDER BY pv.created_at ASC
    ) as rn,
    EXISTS (
      SELECT 1 FROM order_items oi WHERE oi.variation_id = pv.id
    ) as has_orders
  FROM product_variations pv
),
to_delete AS (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1 AND has_orders = false
)
DELETE FROM product_variations WHERE id IN (SELECT id FROM to_delete);

-- 2. Crear función para manejar variaciones de forma segura
CREATE OR REPLACE FUNCTION public.upsert_product_variations(
  p_product_id UUID,
  p_variations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_variation JSONB;
  v_existing_ids UUID[];
  v_new_ids UUID[];
  v_variation_id UUID;
  v_result JSONB := '{"inserted": 0, "updated": 0, "skipped": 0}'::jsonb;
BEGIN
  -- Obtener IDs de variaciones existentes
  SELECT array_agg(id) INTO v_existing_ids
  FROM product_variations
  WHERE product_id = p_product_id;
  
  v_new_ids := ARRAY[]::UUID[];
  
  -- Procesar cada variación del input
  FOR v_variation IN SELECT * FROM jsonb_array_elements(p_variations)
  LOOP
    -- Buscar si existe una variación con la misma combinación
    SELECT id INTO v_variation_id
    FROM product_variations
    WHERE product_id = p_product_id
      AND combination::text = (v_variation->>'combination')::jsonb::text
    LIMIT 1;
    
    IF v_variation_id IS NOT NULL THEN
      -- Actualizar variación existente
      UPDATE product_variations
      SET 
        stock = COALESCE((v_variation->>'stock')::integer, 0),
        price_modifier = COALESCE((v_variation->>'price_modifier')::numeric, 0),
        sku = v_variation->>'sku',
        updated_at = now()
      WHERE id = v_variation_id;
      
      v_new_ids := array_append(v_new_ids, v_variation_id);
      v_result := jsonb_set(v_result, '{updated}', to_jsonb((v_result->>'updated')::int + 1));
    ELSE
      -- Insertar nueva variación
      INSERT INTO product_variations (product_id, combination, stock, price_modifier, sku)
      VALUES (
        p_product_id,
        (v_variation->>'combination')::jsonb,
        COALESCE((v_variation->>'stock')::integer, 0),
        COALESCE((v_variation->>'price_modifier')::numeric, 0),
        v_variation->>'sku'
      )
      RETURNING id INTO v_variation_id;
      
      v_new_ids := array_append(v_new_ids, v_variation_id);
      v_result := jsonb_set(v_result, '{inserted}', to_jsonb((v_result->>'inserted')::int + 1));
    END IF;
  END LOOP;
  
  -- Eliminar variaciones que ya no existen Y no tienen órdenes asociadas
  IF v_existing_ids IS NOT NULL THEN
    DELETE FROM product_variations
    WHERE product_id = p_product_id
      AND id = ANY(v_existing_ids)
      AND NOT (id = ANY(v_new_ids))
      AND NOT EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.variation_id = product_variations.id
      );
      
    -- Contar las que se saltaron por tener órdenes
    SELECT COUNT(*) INTO v_variation_id
    FROM product_variations
    WHERE product_id = p_product_id
      AND id = ANY(v_existing_ids)
      AND NOT (id = ANY(v_new_ids))
      AND EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.variation_id = product_variations.id
      );
    
    v_result := jsonb_set(v_result, '{skipped}', to_jsonb(v_variation_id));
  END IF;
  
  RETURN v_result;
END;
$$;

-- 3. Crear índice único para prevenir duplicados futuros
-- Usamos un índice parcial con la conversión de JSONB a text para comparación
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variations_unique_combination 
ON product_variations (product_id, (combination::text));