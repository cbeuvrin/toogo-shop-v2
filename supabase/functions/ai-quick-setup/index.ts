import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Templates disponibles con sus tags para que Gemini elija una
const AVAILABLE_TEMPLATES = [
  { id: 'default', name: 'Atlántico', tags: ['versátil', 'clásico', 'cualquier tipo de tienda'] },
  { id: 'simple_live', name: 'Pacífico', tags: ['deporte', 'dinámico', 'moderno', 'streetwear'] },
  { id: 'minimal', name: 'Mediterráneo', tags: ['lujo', 'moda alta gama', 'sofisticado', 'minimalista'] },
  { id: 'fashion', name: 'Adriático', tags: ['moda', 'editorial', 'identidad visual fuerte'] },
  { id: 'fashion_hero', name: 'Índico', tags: ['moda', 'split layout', 'minimalista', 'foto grande'] },
  { id: 'trendy_fashion', name: 'Caribe', tags: ['moda premium', 'elegante', 'orgánico'] },
  { id: 'nature', name: 'Nature & Earth', tags: ['ecológico', 'outdoor', 'sustentable', 'orgánico', 'natural'] },
  { id: 'premium_brand', name: 'Premium Brand', tags: ['premium', 'café', 'oscuro', 'alta conversión'] },
  { id: 'bauhaus', name: 'Bauhaus', tags: ['arte', 'diseño', 'creativo', 'geométrico', 'editorial'] },
  { id: 'cyber', name: 'Cyber', tags: ['tech', 'gaming', 'streetwear', 'futurista', 'neón', 'digital'] },
];

interface AISetupResponse {
  template_id: string;
  store_name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  hero_title: string;
  hero_message: string;
  categories: string[];
  products: Array<{ title: string; price_mxn: number; description: string }>;
  announcement: string;
}

function buildPrompt(description: string, hasUserLogo: boolean): string {
  return `Eres un diseñador experto en e-commerce. Recibes la descripción de un negocio en español y devuelves un JSON válido con la configuración inicial de su tienda online.

DESCRIPCIÓN DEL NEGOCIO:
"${description}"

${hasUserLogo ? 'IMPORTANTE: También recibes la imagen del logo del usuario. ANALÍZALO y EXTRAE los 2 colores dominantes para usar como primary_color y secondary_color. El background_color debe complementarlos (típicamente claro/neutro).' : ''}

PLANTILLAS DISPONIBLES (elige UNA por id):
${AVAILABLE_TEMPLATES.map(t => `- ${t.id}: ${t.name} (${t.tags.join(', ')})`).join('\n')}

INSTRUCCIONES:
1. Analiza el rubro del negocio
2. Elige la plantilla más apropiada de la lista
3. ${hasUserLogo ? 'Extrae paleta del LOGO (colores dominantes de la imagen)' : 'Sugiere paleta de colores acorde al rubro (3 hex codes)'}
4. Genera un nombre de tienda si no es obvio en la descripción
5. Escribe un hero title MUY corto (máx 3 líneas usando \\n) y un hero message (1 frase)
6. Crea 3-5 categorías relevantes (en español, sin la palabra "General")
7. Crea 3-5 productos placeholder con título, precio en MXN realista para el mercado mexicano, y descripción de 1-2 frases
8. Escribe un texto breve para la barra de anuncio superior

RESPONDE EXCLUSIVAMENTE CON ESTE JSON, SIN markdown, SIN bloques de código, SIN texto adicional:

{
  "template_id": "string (uno de los ids de arriba)",
  "store_name": "string",
  "primary_color": "#hexcode",
  "secondary_color": "#hexcode",
  "background_color": "#hexcode",
  "hero_title": "string (máx 3 líneas con \\\\n)",
  "hero_message": "string (1 frase)",
  "categories": ["categoría 1", "categoría 2", "categoría 3"],
  "products": [
    {"title": "nombre", "price_mxn": 299, "description": "descripción corta"}
  ],
  "announcement": "string corto para barra superior"
}`;
}

async function fetchImageAsInlineData(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get('content-type') || 'image/png';
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { mimeType: mimeType.split(';')[0].trim(), data: btoa(binary) };
  } catch (err) {
    console.warn('[AI Setup] Failed to fetch image for vision input:', err);
    return null;
  }
}

async function callGemini(googleApiKey: string, prompt: string, userLogoUrl?: string): Promise<AISetupResponse> {
  // Usamos Flash en vez de Pro: para este task (parsear descripción → JSON) la calidad es equivalente
  // y la cuota gratis es 60x mayor (1500/día vs 25/día). El costo en plan pagado también es ~5x menor.
  // Si hay logo del usuario, lo pasamos como inlineData para que Gemini Vision extraiga la paleta.
  const parts: any[] = [{ text: prompt }];
  if (userLogoUrl) {
    const inline = await fetchImageAsInlineData(userLogoUrl);
    if (inline) {
      parts.push({ inlineData: inline });
      console.log('[AI Setup] Logo del usuario incluido como input visual para extracción de paleta');
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${res.status} ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');

  // Limpiar posibles wrappers markdown
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as AISetupResponse;

  // Validar template_id contra lista permitida
  if (!AVAILABLE_TEMPLATES.find(t => t.id === parsed.template_id)) {
    console.warn(`[AI Setup] Invalid template_id "${parsed.template_id}", falling back to default`);
    parsed.template_id = 'default';
  }

  return parsed;
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Genera una imagen con Gemini 2.0 Flash Image, la sube a Supabase Storage,
 * y retorna la URL pública. Si falla en cualquier paso retorna null (tolerante).
 */
// Lista de modelos a probar en orden. El primero que funcione gana.
const IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
  'imagen-3.0-generate-002',
];

async function generateAndUploadImage(
  supabase: any,
  googleApiKey: string,
  prompt: string,
  bucket: 'logos' | 'banners' | 'product-images',
  tenantId: string,
  filePrefix: string,
  errorCollector: string[]
): Promise<string | null> {
  let lastError = '';

  for (const model of IMAGE_MODELS) {
    try {
      console.log(`[AI Setup] 🎨 Trying ${model} for ${filePrefix}...`);
      const imageRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
        }
      );

      if (!imageRes.ok) {
        const errTxt = await imageRes.text();
        lastError = `${model}: ${imageRes.status} ${errTxt.substring(0, 200)}`;
        console.warn(`[AI Setup] ⚠️ ${filePrefix} failed with ${model}:`, imageRes.status, errTxt.substring(0, 200));
        continue; // Probar siguiente modelo
      }

      const imgData = await imageRes.json();
      const parts = imgData.candidates?.[0]?.content?.parts || [];
      const inlinePart = parts.find((p: any) => p.inlineData);
      if (!inlinePart?.inlineData?.data) {
        lastError = `${model}: no inline data returned`;
        console.warn(`[AI Setup] ⚠️ ${model} returned no image for ${filePrefix}`);
        continue;
      }

      const base64Data = inlinePart.inlineData.data;
      const mimeType = inlinePart.inlineData.mimeType || 'image/png';
      const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `ai-generated/${tenantId}/${filePrefix}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, bytes, { contentType: mimeType, upsert: false });

      if (uploadErr) {
        lastError = `upload failed: ${uploadErr.message}`;
        console.warn(`[AI Setup] ⚠️ Upload failed (${bucket}):`, uploadErr);
        return null; // Si la subida falla, no tiene sentido probar otros modelos
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      console.log(`[AI Setup] ✅ ${bucket}/${filePrefix} uploaded with ${model}:`, publicData.publicUrl);
      return publicData.publicUrl;
    } catch (err: any) {
      lastError = `${model}: ${err.message || err}`;
      console.warn(`[AI Setup] ⚠️ Exception for ${filePrefix} with ${model}:`, err);
      continue;
    }
  }

  // Si llegamos acá, ningún modelo funcionó
  console.error(`[AI Setup] ❌ All image models failed for ${filePrefix}. Last error: ${lastError}`);
  errorCollector.push(`${filePrefix}: ${lastError}`);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, description, uploadedLogoUrl } = await req.json();

    if (!tenantId || !description) {
      throw new Error('tenantId y description son requeridos');
    }
    if (description.trim().length < 10) {
      throw new Error('La descripción es muy corta. Cuéntanos más sobre tu negocio.');
    }

    // Errores acumulados de generación de imágenes (para debugging desde el frontend)
    const imageGenErrors: string[] = [];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')!;
    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY no configurada');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth: requiere JWT del dueño con rol en este tenant
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar rol en el tenant
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!role) {
      const { data: superAdmin } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (!superAdmin) {
        return new Response(JSON.stringify({ error: 'No tienes permiso sobre este tenant' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Rate limit: 1 quick-setup por tenant por día
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentRuns } = await supabase
      .from('whatsapp_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('event_type', 'ai_quick_setup')
      .gte('created_at', since);

    if ((recentRuns || 0) >= 3) {
      return new Response(JSON.stringify({
        error: 'Has alcanzado el límite de 3 generaciones por día. Intenta mañana o edita los datos manualmente.'
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[AI Setup] Generating for tenant:', tenantId);

    // 1. Llamar a Gemini (con logo opcional para extracción de paleta)
    const aiResult = await callGemini(googleApiKey, buildPrompt(description, !!uploadedLogoUrl), uploadedLogoUrl);
    console.log('[AI Setup] Gemini result:', JSON.stringify(aiResult).substring(0, 300));

    // 2. Actualizar tenant_settings (template + colores)
    const { error: settingsErr } = await supabase
      .from('tenant_settings')
      .update({
        template_id: aiResult.template_id,
        primary_color: aiResult.primary_color,
        secondary_color: aiResult.secondary_color,
        store_background_color: aiResult.background_color,
      })
      .eq('tenant_id', tenantId);

    if (settingsErr) console.error('[AI Setup] Settings error:', settingsErr);

    // 3. Actualizar nombre del tenant
    await supabase.from('tenants').update({ name: aiResult.store_name }).eq('id', tenantId);

    // 4. Guardar hero (title + message) en visual_editor_data
    const { data: existingHero } = await supabase
      .from('visual_editor_data')
      .select('id, data')
      .eq('tenant_id', tenantId)
      .eq('element_type', 'hero')
      .eq('element_id', 'main_hero')
      .maybeSingle();

    const heroData = {
      ...(existingHero?.data || {}),
      title: aiResult.hero_title,
      message: aiResult.hero_message,
    };

    if (existingHero) {
      await supabase.from('visual_editor_data').update({ data: heroData }).eq('id', existingHero.id);
    } else {
      await supabase.from('visual_editor_data').insert({
        tenant_id: tenantId,
        element_type: 'hero',
        element_id: 'main_hero',
        data: heroData,
      });
    }

    // 4b. Generar logo y banner principal con IA (en paralelo para ahorrar tiempo)
    const businessHint = description.length > 120 ? description.substring(0, 120) + '...' : description;
    const logoPromptText = `Logo minimalista para una tienda llamada "${aiResult.store_name}".
Negocio: ${businessHint}
Estilo: limpio, moderno, vectorial, fondo BLANCO sólido.
Paleta de colores principal: ${aiResult.primary_color} y ${aiResult.secondary_color}.
Formato: cuadrado, alta calidad, sin texto adicional excepto el nombre de la tienda si es necesario.
NO incluir slogans ni texto explicativo. Solo el isotipo o logotipo limpio.`;

    const bannerPromptText = `Banner cinematográfico de tienda online para "${aiResult.store_name}".
Negocio: ${businessHint}
Estilo: fotografía de marketing premium, ambientación realista del producto/rubro, profesional.
Paleta visual: ${aiResult.primary_color}, ${aiResult.secondary_color}, ${aiResult.background_color}.
Formato: panorámico horizontal 16:9, sin texto, sin logos, sin marcas comerciales.
Iluminación profesional, composición elegante, alta resolución.`;

    // Si el usuario subió su propio logo, usamos ese y solo generamos el banner.
    // Si no, generamos logo Y banner en paralelo.
    const [generatedLogoUrl, bannerUrl] = await Promise.all([
      uploadedLogoUrl
        ? Promise.resolve(null)
        : generateAndUploadImage(supabase, googleApiKey, logoPromptText, 'logos', tenantId, 'logo', imageGenErrors),
      generateAndUploadImage(supabase, googleApiKey, bannerPromptText, 'banners', tenantId, 'banner', imageGenErrors),
    ]);

    const logoUrl = uploadedLogoUrl || generatedLogoUrl;

    // Guardar logo_url (sea el subido o el generado)
    if (logoUrl) {
      await supabase
        .from('tenant_settings')
        .update({ logo_url: logoUrl })
        .eq('tenant_id', tenantId);
    }

    // Si se generó banner, insertar en visual_editor_data como banner principal (sort=0)
    if (bannerUrl) {
      // Limpiar banners existentes con sort=0 para evitar duplicados
      await supabase
        .from('visual_editor_data')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('element_type', 'banner')
        .eq('element_id', 'banner_main');

      await supabase.from('visual_editor_data').insert({
        tenant_id: tenantId,
        element_type: 'banner',
        element_id: 'banner_main',
        data: { imageUrl: bannerUrl, sort: 0, position: 'center center' },
      });
    }

    // 5. Insertar categorías (excluyendo duplicados con la 'General' del bootstrap)
    const categoriesToInsert = aiResult.categories
      .filter(name => name && name.toLowerCase() !== 'general')
      .map(name => ({
        tenant_id: tenantId,
        name,
        slug: slugify(name),
      }));

    let categoryIdMap: Record<string, string> = {};
    if (categoriesToInsert.length > 0) {
      const { data: insertedCats, error: catErr } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select('id, name');
      if (catErr) console.error('[AI Setup] Categories error:', catErr);
      if (insertedCats) {
        for (const c of insertedCats) {
          categoryIdMap[c.name] = c.id;
        }
      }
    }

    // 5. Insertar productos (sin imágenes)
    const firstCategoryId = Object.values(categoryIdMap)[0] || null;
    const productsToInsert = aiResult.products.map(p => ({
      tenant_id: tenantId,
      title: p.title,
      description: p.description,
      price_mxn: p.price_mxn,
      stock: 10,
      status: 'active',
    }));

    let productImagesGenerated = 0;
    if (productsToInsert.length > 0) {
      const { data: insertedProds, error: prodErr } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select('id, title');
      if (prodErr) console.error('[AI Setup] Products error:', prodErr);

      // Vincular productos a la primera categoría via product_categories
      if (insertedProds && firstCategoryId) {
        const productCategoryLinks = insertedProds.map(p => ({
          product_id: p.id,
          category_id: firstCategoryId,
        }));
        const { error: linkErr } = await supabase.from('product_categories').insert(productCategoryLinks);
        if (linkErr) console.error('[AI Setup] Product-category link error:', linkErr);
      }

      // Generar imágenes demo para los primeros 3 productos (en paralelo)
      // Costo: ~$0.02 USD por imagen × 3 = ~$0.06 extra
      if (insertedProds && insertedProds.length > 0) {
        const productsToImage = insertedProds.slice(0, 3);
        console.log(`[AI Setup] Generando fotos demo para ${productsToImage.length} productos...`);

        const productImagePromises = productsToImage.map((prod, idx) => {
          const productInfo = aiResult.products[idx];
          const productPrompt = `Foto profesional de producto para e-commerce.
Producto: "${prod.title}"
Descripción: ${productInfo?.description || ''}
Estilo: fotografía de catálogo premium, fondo BLANCO o neutro limpio, iluminación de estudio, alta resolución, sin texto, sin marcas comerciales, encuadre cuadrado, producto centrado y bien visible.`;
          return generateAndUploadImage(supabase, googleApiKey, productPrompt, 'banners', tenantId, `product_${idx}`, imageGenErrors);
        });

        const productImageUrls = await Promise.all(productImagePromises);

        // Insertar las imágenes en product_images
        const productImageRecords = productImageUrls
          .map((url, idx) => url ? { product_id: productsToImage[idx].id, url, sort: 0 } : null)
          .filter(Boolean) as Array<{ product_id: string; url: string; sort: number }>;

        if (productImageRecords.length > 0) {
          const { error: imgErr } = await supabase.from('product_images').insert(productImageRecords);
          if (imgErr) {
            console.error('[AI Setup] Product images insert error:', imgErr);
          } else {
            productImagesGenerated = productImageRecords.length;
            console.log(`[AI Setup] ✅ ${productImagesGenerated} fotos de productos generadas y vinculadas`);
          }
        }
      }
    }

    // 6. Guardar anuncio en visual_editor_data si existe
    if (aiResult.announcement) {
      // Verificar si ya existe
      const { data: existingAnnouncement } = await supabase
        .from('visual_editor_data')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('element_type', 'announcement')
        .maybeSingle();

      if (existingAnnouncement) {
        await supabase
          .from('visual_editor_data')
          .update({ data: { text: aiResult.announcement, enabled: true } })
          .eq('id', existingAnnouncement.id);
      } else {
        await supabase.from('visual_editor_data').insert({
          tenant_id: tenantId,
          element_type: 'announcement',
          element_id: 'announcement_main',
          data: { text: aiResult.announcement, enabled: true },
        });
      }
    }

    // 7. Marcar todos los pasos de onboarding como completos
    await supabase
      .from('user_onboarding_progress')
      .update({
        step_1_logo: true,
        step_2_products: true,
        step_3_branding: true,
        step_4_payments: true,
        step_5_publish: true,
      })
      .eq('tenant_id', tenantId);

    // 8. Log para rate limiting y analytics (incluye errores de imagen para debugging)
    await supabase.from('whatsapp_logs').insert({
      tenant_id: tenantId,
      event_type: 'ai_quick_setup',
      payload: {
        description: description.substring(0, 500),
        template_id: aiResult.template_id,
        categories_count: categoriesToInsert.length,
        products_count: productsToInsert.length,
        logo_generated: !!generatedLogoUrl,
        logo_uploaded: !!uploadedLogoUrl,
        banner_generated: !!bannerUrl,
        product_images_generated: productImagesGenerated,
        image_gen_errors: imageGenErrors.slice(0, 10), // capturar primeros 10 errores
      },
    });

    console.log('[AI Setup] ✅ Setup complete for tenant', tenantId, '— logo:', !!logoUrl, '| banner:', !!bannerUrl, '| product images:', productImagesGenerated);

    return new Response(
      JSON.stringify({
        success: true,
        result: aiResult,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        product_images_count: productImagesGenerated,
        logo_was_uploaded: !!uploadedLogoUrl,
        image_gen_errors: imageGenErrors.length > 0 ? imageGenErrors : undefined,
        message: '¡Tu tienda está lista! Toogi generó tu plantilla, colores, logo, banner, categorías y productos con fotos.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AI Setup] Error:', error);
    console.error('[AI Setup] Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error generando setup con IA',
        stack: error.stack?.substring(0, 500),
        name: error.name,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
