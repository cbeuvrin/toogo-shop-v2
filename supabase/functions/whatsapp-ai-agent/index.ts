import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convertir tools de formato OpenAI a formato Google
function convertToolsToGoogle(openAITools: any[]) {
  return openAITools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, message, conversationId, imageUrl } = await req.json();

    if (!tenantId || !message) {
      throw new Error('tenantId and message are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')!;
    
    if (!googleApiKey) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Processing AI request for tenant:', tenantId);

    // Obtener datos del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    if (tenantError) throw tenantError;

    // Obtener historial de conversación (últimos 10 mensajes)
    let historyContext = '';
    let lastImageUrlFromHistory = '';
    
    if (conversationId) {
      const { data: conversationHistory } = await supabase
        .from('whatsapp_messages')
        .select('direction, content, message_type, image_url')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Extraer la última imagen del historial de esta conversación
      const messagesWithImages = conversationHistory?.filter(msg => msg.image_url);
      if (messagesWithImages && messagesWithImages.length > 0) {
        lastImageUrlFromHistory = messagesWithImages[0].image_url;
        console.log('🖼️ Last image URL from current conversation:', lastImageUrlFromHistory);
      }

      // Si no hay imagen en esta conversación, buscar en TODAS las conversaciones recientes del tenant (últimas 24h)
      if (!lastImageUrlFromHistory) {
        console.log('🔍 No image in current conversation, searching recent messages from tenant...');
        const { data: recentImagesFromTenant } = await supabase
          .from('whatsapp_messages')
          .select('image_url, created_at, conversation_id')
          .not('image_url', 'is', null)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        // Filtrar para solo imágenes del tenant actual (via join con conversaciones)
        if (recentImagesFromTenant && recentImagesFromTenant.length > 0) {
          // Verificar que la conversación pertenece a este tenant
          for (const imgMsg of recentImagesFromTenant) {
            const { data: conv } = await supabase
              .from('whatsapp_conversations')
              .select('tenant_id')
              .eq('id', imgMsg.conversation_id)
              .single();
            
            if (conv && conv.tenant_id === tenantId) {
              lastImageUrlFromHistory = imgMsg.image_url;
              console.log('🖼️ Found recent image from tenant (last 24h):', lastImageUrlFromHistory);
              break;
            }
          }
        }
      }

      historyContext = conversationHistory
        ?.reverse()
        .map(msg => {
          const role = msg.direction === 'inbound' ? 'Usuario' : 'Asistente';
          const content = msg.image_url ? `${msg.content} [Imagen: ${msg.image_url}]` : msg.content;
          return `${role}: ${content}`;
        })
        .join('\n') || '';
    }

    // System prompt personalizado
    const systemPrompt = `Eres el asistente personal con IA del dueño de ${tenant.name}, una tienda online.

Tu trabajo es ayudar al vendedor a gestionar su tienda de forma conversacional. Puedes:

📊 **Gestión de datos:**
- Consultar estadísticas de ventas, productos y pedidos
- Listar y filtrar productos por estado, precio, SKU
- Ver pedidos recientes y su estado

✏️ **Modificación de productos:**
- Actualizar precios, stock y estado de productos
- Crear nuevos productos con título, descripción, precio, stock, SKU
- AGREGAR IMÁGENES a productos (pide al vendedor que envíe fotos)
- Eliminar productos existentes
- **Buscar productos por SKU**

💰 **Gestión de ofertas:**
- Poner productos en oferta con precio de venta especial
- Quitar ofertas de productos
- Ver productos que están en oferta

🎨 **Gestión visual:**
- Cambiar colores de la tienda (primario, secundario, fondo, navbar)
- Actualizar el logo de la tienda
- **GESTIONAR BANNERS** (crear, editar, eliminar, activar/desactivar)
- Gestionar categorías (crear, actualizar, eliminar)

⚠️ **REGLA OBLIGATORIA PARA BANNERS:**
Cuando el vendedor quiera subir un banner, SIEMPRE pregunta:
"¿En qué posición quieres el banner? 
1️⃣ Principal (primero)
2️⃣ Segundo lugar
3️⃣ Tercer lugar  
4️⃣ Cuarto lugar"

Usa el parámetro 'sort' así:
- Posición 1 (principal) = sort: 0
- Posición 2 = sort: 1
- Posición 3 = sort: 2
- Posición 4 = sort: 3

📚 **SI EL VENDEDOR NO ENTIENDE:**
Explícale: "Tu tienda tiene un carrusel de banners en la parte superior. Es como un slideshow que rota automáticamente mostrando hasta 4 imágenes. La posición 1 es la primera que se ve cuando alguien entra a tu tienda, la posición 2 es la siguiente, y así sucesivamente. ¿En cuál posición quieres poner este banner?"

NUNCA subas un banner sin confirmar primero la posición con el vendedor.

📦 **Gestión de pedidos:**
- Cambiar estado de pedidos (pagado, enviado, entregado, cancelado)
- Consultar información detallada de pedidos

🔍 **BÚSQUEDA Y MODIFICACIÓN DE PRODUCTOS - CRÍTICO:**
- Cuando el vendedor mencione un producto por NOMBRE (ej: "toogi", "camiseta azul"), PRIMERO búscalo con list_products usando searchByName
- Si encuentras UN solo producto, confirma: "Encontré el producto '[nombre]' (ID: abc123, SKU: X, $Y MXN). ¿Es este el que quieres modificar?"
- Si encuentras VARIOS productos, muéstralos CON SUS IDs y pregunta cuál quiere modificar
- Si NO encuentras ninguno, dile: "No encontré productos con ese nombre. ¿Puedes verificar el nombre o darme el SKU?"
- **NUNCA pidas el SKU si el usuario ya te dio el nombre - ¡Búscalo primero!**

⚠️ **REGLA CRÍTICA SOBRE IDs DE PRODUCTOS:**
- SIEMPRE usa el ID EXACTO que devuelve list_products (campo "id")
- NUNCA inventes o asumas un ID de producto
- Antes de llamar update_product, VERIFICA que el productId viene del resultado de list_products
- Si no tienes el ID correcto, vuelve a buscar el producto primero
- Los IDs son UUIDs como: "bb83dc42-caca-45fa-9455-6df5bd67fd63"

🖼️ **GENERACIÓN Y EDICIÓN DE IMÁGENES CON IA:**
- Puedes GENERAR imágenes nuevas con IA (para banners, productos, etc.)
- Puedes EDITAR/MODIFICAR imágenes que el vendedor te envíe:
  - Quitar fondos / hacer fondos transparentes
  - Agregar texto o logos
  - Cambiar colores
  - Recortar o ajustar tamaños
  - Mejorar calidad de imagen
- Ejemplo: "Quítale el fondo a esta imagen" o "Genera un banner de navidad"

⚠️ **REGLAS CRÍTICAS SOBRE IMÁGENES - LEE ESTO:**
- NUNCA JAMÁS inventes, imagines o asumas URLs de imágenes
- SOLO usa las URLs que aparecen EXPLÍCITAMENTE en:
  1. "ÚLTIMA IMAGEN DEL HISTORIAL" (abajo en este contexto)
  2. "IMAGEN ENVIADA EN ESTE MENSAJE" (abajo en este contexto)
  3. Respuestas de herramientas como generate_image o edit_image
- Si el vendedor dice "esta imagen" o "ponle esta imagen" pero NO hay URL en las secciones anteriores:
  RESPONDE: "No veo ninguna imagen reciente en nuestra conversación. ¿Podrías enviarla de nuevo para poder actualizarla?"
- Las URLs válidas de imágenes son de: herqxhfmsstbteahhxpr.supabase.co/storage/
- Si una herramienta devuelve error de imagen, NO inventes otra URL, pide al usuario que reenvíe la imagen
- NUNCA uses URLs antiguas o de hace semanas - solo las del contexto actual

📸 **ASIGNAR IMAGEN A UN PRODUCTO - FLUJO OBLIGATORIO:**
Cuando el vendedor pida poner/asignar una imagen a un producto:
1. **BUSCA** el producto con list_products (usando searchByName)
2. **IDENTIFICA** la URL de la imagen a usar:
   - Si hay una "ÚLTIMA IMAGEN DEL HISTORIAL" abajo, USA ESA URL
   - Si el vendedor envió una imagen en este mensaje, usa imageUrl
   - Si NO hay ninguna imagen disponible, pregunta: "No veo una imagen reciente. ¿Podrías enviarla de nuevo?"
3. **CONFIRMA** con el vendedor: "Voy a asignar esta imagen al producto '[nombre]' (ID: xxx). ¿Confirmas?"
4. **EJECUTA** update_product con AMBOS parámetros: productId e imageUrl

⚠️ **ERROR COMÚN A EVITAR:**
NO llames update_product sin el parámetro imageUrl cuando el vendedor quiere cambiar la imagen.
Siempre verifica que tienes AMBOS: el ID del producto Y la URL de la imagen.

IMPORTANTE:
- Sé conciso, directo y amigable
- Usa las herramientas disponibles cuando el vendedor lo pida
- Responde en español de forma profesional y conversacional
- Si no tienes información o no puedes hacer algo, explícalo claramente

**FLUJO DE GENERACIÓN DE IMÁGENES:**
1. Vendedor pide imagen: "Genera un banner de verano"
2. Usas generate_image con el prompt
3. Recibes URL de la imagen generada
4. Le preguntas si le gusta y qué quiere hacer con ella
5. Si quiere usarla como banner, PREGUNTA LA POSICIÓN (1ro, 2do, 3ro, 4to)
6. Si no entiende, explícale que es un carrusel de 4 banners
7. Una vez confirmada la posición, usas manage_banners con el sort correcto

${historyContext ? `\n**Contexto de conversación reciente:**\n${historyContext}\n` : ''}
${lastImageUrlFromHistory ? `\n🖼️ **ÚLTIMA IMAGEN DEL HISTORIAL (úsala para asignar a productos):**\n${lastImageUrlFromHistory}\n` : ''}
${imageUrl ? `\n🖼️ **IMAGEN ENVIADA EN ESTE MENSAJE (USA ESTA URL):**\n${imageUrl}\n\nPuedes usar esta URL con edit_image, create_product, update_product o manage_banners.` : ''}`;


    // Definir tools disponibles (formato OpenAI para después convertir)
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_store_stats',
          description: 'Obtiene estadísticas generales de la tienda (productos totales, pedidos, ingresos)',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_products',
          description: 'Lista productos con filtros opcionales. Incluye SKU y precio de oferta si existe.',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['active', 'inactive'],
                description: 'Filtrar por estado'
              },
              limit: {
                type: 'number',
                description: 'Número máximo de productos a retornar (default: 10)'
              },
              searchByName: {
                type: 'string',
                description: 'Buscar producto por nombre (parcial o completo). Ej: "toogi", "camiseta". USAR PRIMERO cuando el vendedor menciona un producto por nombre.'
              },
              searchBySku: {
                type: 'string',
                description: 'Buscar producto por SKU exacto o parcial'
              },
              onlyOnSale: {
                type: 'boolean',
                description: 'Mostrar solo productos en oferta'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_product',
          description: 'Actualiza precio, stock, estado o SKU de un producto',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'ID del producto'
              },
              price: {
                type: 'number',
                description: 'Nuevo precio en MXN'
              },
              stock: {
                type: 'number',
                description: 'Nuevo stock disponible'
              },
              status: {
                type: 'string',
                enum: ['active', 'inactive'],
                description: 'Nuevo estado'
              },
              sku: {
                type: 'string',
                description: 'Nuevo SKU del producto'
              },
              imageUrl: {
                type: 'string',
                description: 'URL de nueva imagen principal para el producto'
              }
            },
            required: ['productId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'manage_sale',
          description: 'Gestiona ofertas/descuentos en productos',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['set_sale', 'remove_sale', 'list_sales'],
                description: 'Acción: poner en oferta, quitar oferta, o listar productos en oferta'
              },
              productId: {
                type: 'string',
                description: 'ID del producto (para set_sale o remove_sale)'
              },
              salePrice: {
                type: 'number',
                description: 'Precio de oferta en MXN (para set_sale)'
              },
              discountPercent: {
                type: 'number',
                description: 'Alternativamente: porcentaje de descuento (ej: 20 para 20% off)'
              }
            },
            required: ['action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_orders',
          description: 'Lista pedidos recientes',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
                description: 'Filtrar por estado'
              },
              limit: {
                type: 'number',
                description: 'Número de pedidos (default: 10)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_order_status',
          description: 'Cambia el estado de un pedido',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                description: 'ID del pedido'
              },
              status: {
                type: 'string',
                enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
                description: 'Nuevo estado'
              }
            },
            required: ['orderId', 'status']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_product',
          description: 'Crea un nuevo producto en la tienda. PUEDES incluir una imagen si el vendedor envió una recientemente.',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Nombre del producto'
              },
              description: {
                type: 'string',
                description: 'Descripción del producto'
              },
              price: {
                type: 'number',
                description: 'Precio en MXN'
              },
              stock: {
                type: 'number',
                description: 'Stock inicial'
              },
              sku: {
                type: 'string',
                description: 'SKU del producto'
              },
              status: {
                type: 'string',
                enum: ['active', 'inactive'],
                description: 'Estado inicial (default: active)'
              },
              imageUrl: {
                type: 'string',
                description: 'URL de la imagen del producto (si el vendedor envió una foto recientemente)'
              }
            },
            required: ['title', 'price']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_product',
          description: 'Elimina un producto de la tienda',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'ID del producto a eliminar'
              }
            },
            required: ['productId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'manage_banners',
          description: 'Gestiona los banners de la tienda: listar, crear, actualizar o eliminar',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['list', 'create', 'update', 'delete'],
                description: 'Acción a realizar'
              },
              bannerId: {
                type: 'string',
                description: 'ID del banner (para update/delete)'
              },
              imageUrl: {
                type: 'string',
                description: 'URL de la imagen del banner'
              },
              title: {
                type: 'string',
                description: 'Título del banner'
              },
              description: {
                type: 'string',
                description: 'Descripción del banner'
              },
              linkUrl: {
                type: 'string',
                description: 'URL a donde lleva el banner al hacer clic'
              },
              active: {
                type: 'boolean',
                description: 'Si el banner está activo o no'
              },
              sort: {
                type: 'number',
                description: 'Orden del banner (menor = primero)'
              }
            },
            required: ['action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_image',
          description: 'Genera una imagen NUEVA con IA basada en un prompt. Ideal para banners, promociones, etc.',
          parameters: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Descripción detallada de la imagen a generar. Ej: "Banner promocional de navidad con fondo rojo y texto de descuentos"'
              }
            },
            required: ['prompt']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'edit_image',
          description: 'Modifica/edita una imagen existente que el vendedor envió. Puede quitar fondos, agregar texto, cambiar colores, mejorar calidad, etc.',
          parameters: {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: 'URL de la imagen a modificar (la que envió el vendedor)'
              },
              editPrompt: {
                type: 'string',
                description: 'Instrucciones de qué modificar. Ej: "Quita el fondo", "Agrega texto OFERTA 20%", "Haz el fondo transparente", "Mejora la calidad"'
              }
            },
            required: ['imageUrl', 'editPrompt']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_store_branding',
          description: 'Actualiza colores y logo de la tienda',
          parameters: {
            type: 'object',
            properties: {
              primaryColor: {
                type: 'string',
                description: 'Color primario en formato hex (ej: #3B82F6)'
              },
              secondaryColor: {
                type: 'string',
                description: 'Color secundario en formato hex'
              },
              backgroundColor: {
                type: 'string',
                description: 'Color de fondo en formato hex'
              },
              navbarColor: {
                type: 'string',
                description: 'Color de la navbar en formato hex'
              },
              logoUrl: {
                type: 'string',
                description: 'URL del nuevo logo'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_store_config',
          description: 'Obtiene la configuración visual actual de la tienda',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'manage_categories',
          description: 'Gestiona categorías: crear, actualizar o listar',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['list', 'create', 'update'],
                description: 'Acción a realizar'
              },
              categoryId: {
                type: 'string',
                description: 'ID de la categoría (para update)'
              },
              name: {
                type: 'string',
                description: 'Nombre de la categoría'
              },
              slug: {
                type: 'string',
                description: 'Slug de la categoría'
              }
            },
            required: ['action']
          }
        }
      }
    ];

    // Convertir tools al formato de Google
    const googleTools = convertToolsToGoogle(tools);

    // Llamar a Google AI (Gemini 3 Pro) directamente
    console.log('📤 Calling Google AI API (Gemini 3 Pro)...');
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          tools: [{ functionDeclarations: googleTools }]
        })
      }
    );

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('❌ Google AI error:', error);
      if (aiResponse.status === 429) {
        throw new Error('Rate limit de Google AI excedido. Intenta de nuevo en unos segundos.');
      }
      throw new Error(`Google AI error: ${error}`);
    }

    const aiData = await aiResponse.json();
    console.log('📥 Google AI response received');

    // Parsear respuesta de Google
    const candidate = aiData.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error('Invalid Google AI response structure');
    }

    const parts = candidate.content.parts;
    const textPart = parts.find((p: any) => p.text);
    const functionCallPart = parts.find((p: any) => p.functionCall);

    // Si hay function call, ejecutarlo
    if (functionCallPart) {
      const functionCall = functionCallPart.functionCall;
      const functionName = functionCall.name;
      const args = functionCall.args || {};

      console.log('🔧 Executing function:', functionName, 'with args:', JSON.stringify(args));

      let result;

      switch (functionName) {
        case 'get_store_stats': {
          const { data: products } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('tenant_id', tenantId);

          const { data: orders } = await supabase
            .from('orders')
            .select('total_mxn', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .eq('status', 'paid');

          const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_mxn || 0), 0) || 0;

          result = {
            totalProducts: products?.length || 0,
            totalOrders: orders?.length || 0,
            totalRevenue
          };
          break;
        }

        case 'list_products': {
          let query = supabase
            .from('products')
            .select('id, title, price_mxn, sale_price_mxn, stock, status, sku')
            .eq('tenant_id', tenantId);

          if (args.status) query = query.eq('status', args.status);
          if (args.searchByName) query = query.ilike('title', `%${args.searchByName}%`);
          if (args.searchBySku) query = query.ilike('sku', `%${args.searchBySku}%`);
          if (args.onlyOnSale) query = query.not('sale_price_mxn', 'is', null);
          query = query.limit(args.limit || 10);

          const { data } = await query;
          result = data?.map(p => ({
            ...p,
            onSale: p.sale_price_mxn !== null,
            discount: p.sale_price_mxn ? Math.round((1 - p.sale_price_mxn / p.price_mxn) * 100) + '%' : null
          })) || [];
          break;
        }

        case 'update_product': {
          const updates: any = {};
          if (args.price !== undefined) updates.price_mxn = args.price;
          if (args.stock !== undefined) updates.stock = args.stock;
          if (args.status !== undefined) updates.status = args.status;
          if (args.sku !== undefined) updates.sku = args.sku;

          const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', args.productId)
            .eq('tenant_id', tenantId);

          // Si hay imageUrl, VALIDAR antes de usar
          let imageResult = null;
          if (args.imageUrl) {
            console.log('🖼️ Validating image URL before update:', args.imageUrl.substring(0, 100));
            
            // VALIDACIÓN 1: Rechazar URLs base64 (datos inline, no URLs reales)
            if (args.imageUrl.startsWith('data:')) {
              console.log('❌ Rejected base64 image - not a real URL');
              result = { 
                success: false, 
                error: 'No puedo usar imágenes en formato base64. Por favor envía la imagen de nuevo como archivo.' 
              };
              break;
            }
            
            // VALIDACIÓN 2: Verificar que es una URL de nuestro storage
            if (!args.imageUrl.includes('herqxhfmsstbteahhxpr.supabase.co/storage')) {
              console.log('❌ Invalid image URL domain:', args.imageUrl);
              result = { 
                success: false, 
                error: 'URL de imagen no válida. Solo puedo usar imágenes de nuestra conversación. Por favor envía la imagen de nuevo.' 
              };
              break;
            }

            // Verificar que la imagen existe haciendo una petición HEAD
            try {
              const checkResponse = await fetch(args.imageUrl, { method: 'HEAD' });
              if (!checkResponse.ok) {
                console.log('❌ Image URL returns 404:', args.imageUrl, checkResponse.status);
                result = { 
                  success: false, 
                  error: `La imagen ya no está disponible (error ${checkResponse.status}). Por favor envíala de nuevo.` 
                };
                break;
              }
              console.log('✅ Image URL is valid and accessible');
            } catch (e) {
              console.log('❌ Error checking image URL:', e);
              result = { 
                success: false, 
                error: 'No pude verificar la imagen. Por favor envíala de nuevo.' 
              };
              break;
            }

            // Primero intentar eliminar imagen existente con sort=0
            await supabase
              .from('product_images')
              .delete()
              .eq('product_id', args.productId)
              .eq('sort', 0);

            // Insertar nueva imagen principal
            const { error: imgError } = await supabase
              .from('product_images')
              .insert({
                product_id: args.productId,
                url: args.imageUrl,
                sort: 0
              });

            imageResult = imgError ? { imageUpdated: false, imageError: imgError.message } : { imageUpdated: true, imageUrl: args.imageUrl };
          }

          result = error 
            ? { success: false, error: error.message } 
            : { success: true, ...imageResult };
          break;
        }

        case 'manage_sale': {
          if (args.action === 'list_sales') {
            const { data } = await supabase
              .from('products')
              .select('id, title, price_mxn, sale_price_mxn, sku')
              .eq('tenant_id', tenantId)
              .not('sale_price_mxn', 'is', null);

            result = data?.map(p => ({
              ...p,
              discount: Math.round((1 - p.sale_price_mxn / p.price_mxn) * 100) + '%'
            })) || [];
          } else if (args.action === 'set_sale') {
            let salePrice = args.salePrice;
            
            if (args.discountPercent && !salePrice) {
              const { data: product } = await supabase
                .from('products')
                .select('price_mxn')
                .eq('id', args.productId)
                .single();
              
              if (product) {
                salePrice = Math.round(product.price_mxn * (1 - args.discountPercent / 100));
              }
            }

            const { error } = await supabase
              .from('products')
              .update({ sale_price_mxn: salePrice })
              .eq('id', args.productId)
              .eq('tenant_id', tenantId);

            result = error ? { success: false, error: error.message } : { success: true, salePrice };
          } else if (args.action === 'remove_sale') {
            const { error } = await supabase
              .from('products')
              .update({ sale_price_mxn: null })
              .eq('id', args.productId)
              .eq('tenant_id', tenantId);

            result = error ? { success: false, error: error.message } : { success: true };
          }
          break;
        }

        case 'list_orders': {
          let query = supabase
            .from('orders')
            .select('id, customer_name, total_mxn, status, created_at')
            .eq('tenant_id', tenantId);

          if (args.status) query = query.eq('status', args.status);
          query = query.limit(args.limit || 10).order('created_at', { ascending: false });

          const { data } = await query;
          result = data || [];
          break;
        }

        case 'update_order_status': {
          const { error } = await supabase
            .from('orders')
            .update({ status: args.status })
            .eq('id', args.orderId)
            .eq('tenant_id', tenantId);

          result = error ? { success: false, error: error.message } : { success: true };
          break;
        }

        case 'create_product': {
          const productData: any = {
            tenant_id: tenantId,
            title: args.title,
            price_mxn: args.price,
            stock: args.stock || 0,
            status: args.status || 'active'
          };

          if (args.description) productData.description = args.description;
          if (args.sku) productData.sku = args.sku;

          const { data, error } = await supabase
            .from('products')
            .insert(productData)
            .select('id, title')
            .single();

          if (error) {
            result = { success: false, error: error.message };
          } else {
            if (args.imageUrl) {
              const { error: imgError } = await supabase
                .from('product_images')
                .insert({
                  product_id: data.id,
                  url: args.imageUrl,
                  sort: 0
                });

              result = {
                success: true,
                product: data,
                imageAdded: !imgError,
                message: imgError ? 'Producto creado pero no se pudo agregar la imagen' : 'Producto creado con imagen exitosamente'
              };
            } else {
              result = { success: true, product: data };
            }
          }
          break;
        }

        case 'delete_product': {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', args.productId)
            .eq('tenant_id', tenantId);

          result = error ? { success: false, error: error.message } : { success: true };
          break;
        }

        case 'manage_banners': {
          if (args.action === 'list') {
            const { data, error } = await supabase
              .from('visual_editor_data')
              .select('id, element_id, data, created_at')
              .eq('tenant_id', tenantId)
              .eq('element_type', 'banner')
              .order('created_at', { ascending: true });

            if (error) {
              result = { success: false, error: error.message };
            } else {
              result = (data || []).map((item: any, index: number) => ({
                id: item.element_id,
                imageUrl: item.data?.imageUrl || item.data?.url || '',
                sort: item.data?.sort ?? index
              }));
            }
          } else if (args.action === 'create') {
            if (!args.imageUrl) {
              result = { success: false, error: 'Se requiere imageUrl para crear un banner' };
            } else {
              const bannerId = `banner_${Date.now()}`;
              const { data, error } = await supabase
                .from('visual_editor_data')
                .insert({
                  tenant_id: tenantId,
                  element_type: 'banner',
                  element_id: bannerId,
                  data: {
                    imageUrl: args.imageUrl,
                    sort: args.sort || 0
                  }
                })
                .select()
                .single();

              if (error) {
                result = { success: false, error: error.message };
              } else {
                result = { 
                  success: true, 
                  banner: { 
                    id: bannerId, 
                    imageUrl: args.imageUrl,
                    sort: args.sort || 0
                  }
                };
              }
            }
          } else if (args.action === 'update') {
            if (!args.bannerId) {
              result = { success: false, error: 'Se requiere bannerId para actualizar' };
            } else {
              const { data: current } = await supabase
                .from('visual_editor_data')
                .select('data')
                .eq('element_id', args.bannerId)
                .eq('tenant_id', tenantId)
                .single();

              const updatedData: any = { ...(current?.data || {}) };
              if (args.imageUrl !== undefined) updatedData.imageUrl = args.imageUrl;
              if (args.sort !== undefined) updatedData.sort = args.sort;

              const { error } = await supabase
                .from('visual_editor_data')
                .update({ data: updatedData })
                .eq('element_id', args.bannerId)
                .eq('tenant_id', tenantId);

              result = error ? { success: false, error: error.message } : { success: true };
            }
          } else if (args.action === 'delete') {
            if (!args.bannerId) {
              result = { success: false, error: 'Se requiere bannerId para eliminar' };
            } else {
              const { error } = await supabase
                .from('visual_editor_data')
                .delete()
                .eq('element_id', args.bannerId)
                .eq('tenant_id', tenantId);

              result = error ? { success: false, error: error.message } : { success: true };
            }
          }
          break;
        }

        case 'generate_image': {
          console.log('🎨 Generating image with prompt:', args.prompt);
          
          try {
            // Usar Google Gemini 3 Pro Image directamente
            const imageResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${googleApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: args.prompt }] }],
                  generationConfig: { 
                    responseModalities: ['IMAGE', 'TEXT']
                  }
                })
              }
            );

            if (!imageResponse.ok) {
              const errorText = await imageResponse.text();
              console.error('Image generation failed:', errorText);
              result = { success: false, error: 'No se pudo generar la imagen' };
            } else {
              const imageData = await imageResponse.json();
              
              // Google devuelve la imagen en candidates[0].content.parts
              const imageParts = imageData.candidates?.[0]?.content?.parts || [];
              const inlineDataPart = imageParts.find((p: any) => p.inlineData);
              
              if (inlineDataPart?.inlineData?.data) {
                const base64Data = inlineDataPart.inlineData.data;
                const mimeType = inlineDataPart.inlineData.mimeType || 'image/png';
                
                // Convertir base64 a bytes
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                const extension = mimeType.includes('jpeg') ? 'jpg' : 'png';
                const fileName = `generated/${tenantId}/${Date.now()}.${extension}`;

                const { error: uploadError } = await supabase.storage
                  .from('banners')
                  .upload(fileName, imageBytes, {
                    contentType: mimeType,
                    upsert: false
                  });

                if (uploadError) {
                  console.error('Upload error:', uploadError);
                  result = { success: false, error: 'No se pudo subir la imagen generada' };
                } else {
                  const { data: publicUrlData } = supabase.storage
                    .from('banners')
                    .getPublicUrl(fileName);

                  const publicUrl = publicUrlData.publicUrl;
                  console.log('✅ Image generated and uploaded:', publicUrl);

                  result = {
                    success: true,
                    imageUrl: publicUrl,
                    message: 'Imagen generada exitosamente. Te la envío para que la revises.'
                  };
                }
              } else {
                console.error('No image data in response:', JSON.stringify(imageData));
                result = { success: false, error: 'La IA no devolvió una imagen' };
              }
            }
          } catch (imgError) {
            console.error('Image generation error:', imgError);
            result = { success: false, error: 'Error al generar imagen' };
          }
          break;
        }

        case 'edit_image': {
          console.log('✏️ Editing image:', args.imageUrl, 'with prompt:', args.editPrompt);
          try {
            // 1. Descargar la imagen original
            const originalImageResponse = await fetch(args.imageUrl);
            if (!originalImageResponse.ok) {
              throw new Error('No se pudo descargar la imagen original');
            }
            
            const imageArrayBuffer = await originalImageResponse.arrayBuffer();
            const imageUint8Array = new Uint8Array(imageArrayBuffer);
            
            // Convertir a base64
            let binaryString = '';
            for (let i = 0; i < imageUint8Array.length; i++) {
              binaryString += String.fromCharCode(imageUint8Array[i]);
            }
            const base64ImageData = btoa(binaryString);
            
            const contentType = originalImageResponse.headers.get('content-type') || 'image/png';
            const mimeType = contentType.split(';')[0].trim();
            
            console.log('📷 Image downloaded, size:', imageUint8Array.length, 'mime:', mimeType);
            
            // 2. Enviar a Google AI con el prompt de edición
            const editResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${googleApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: args.editPrompt },
                      { 
                        inlineData: { 
                          mimeType: mimeType, 
                          data: base64ImageData 
                        } 
                      }
                    ]
                  }],
                  generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT']
                  }
                })
              }
            );

            console.log('📤 Edit image response status:', editResponse.status);

            if (!editResponse.ok) {
              const errorText = await editResponse.text();
              console.error('Edit image API error:', errorText);
              result = { success: false, error: 'Error al editar la imagen con IA' };
            } else {
              const editData = await editResponse.json();
              console.log('📥 Edit response received');

              // Buscar la imagen en la respuesta
              const editParts = editData.candidates?.[0]?.content?.parts || [];
              const editedImagePart = editParts.find((p: any) => p.inlineData);

              if (editedImagePart?.inlineData) {
                const editedBase64 = editedImagePart.inlineData.data;
                const editedMimeType = editedImagePart.inlineData.mimeType || 'image/png';

                // Convertir base64 a bytes
                const editedBytes = Uint8Array.from(atob(editedBase64), c => c.charCodeAt(0));
                const extension = editedMimeType.includes('jpeg') ? 'jpg' : 'png';
                const fileName = `edited/${tenantId}/${Date.now()}.${extension}`;

                const { error: uploadError } = await supabase.storage
                  .from('banners')
                  .upload(fileName, editedBytes, {
                    contentType: editedMimeType,
                    upsert: false
                  });

                if (uploadError) {
                  console.error('Upload error:', uploadError);
                  result = { success: false, error: 'No se pudo subir la imagen editada' };
                } else {
                  const { data: publicUrlData } = supabase.storage
                    .from('banners')
                    .getPublicUrl(fileName);

                  const publicUrl = publicUrlData.publicUrl;
                  console.log('✅ Image edited and uploaded:', publicUrl);

                  result = {
                    success: true,
                    imageUrl: publicUrl,
                    message: 'Imagen editada exitosamente. Te la envío para que la revises.'
                  };
                }
              } else {
                console.error('No edited image in response:', JSON.stringify(editData));
                result = { success: false, error: 'La IA no devolvió una imagen editada' };
              }
            }
          } catch (editError) {
            console.error('Image edit error:', editError);
            result = { success: false, error: 'Error al editar imagen: ' + (editError as Error).message };
          }
          break;
        }

        case 'update_store_branding': {
          const updates: any = {};
          if (args.primaryColor) updates.primary_color = args.primaryColor;
          if (args.secondaryColor) updates.secondary_color = args.secondaryColor;
          if (args.backgroundColor) updates.store_background_color = args.backgroundColor;
          if (args.navbarColor) updates.navbar_bg_color = args.navbarColor;
          if (args.logoUrl) updates.logo_url = args.logoUrl;

          const { error } = await supabase
            .from('tenant_settings')
            .update(updates)
            .eq('tenant_id', tenantId);

          result = error ? { success: false, error: error.message } : { success: true };
          break;
        }

        case 'get_store_config': {
          const { data, error } = await supabase
            .from('tenant_settings')
            .select('primary_color, secondary_color, store_background_color, navbar_bg_color, logo_url, whatsapp_number')
            .eq('tenant_id', tenantId)
            .single();

          result = error ? { success: false, error: error.message } : data;
          break;
        }

        case 'manage_categories': {
          if (args.action === 'list') {
            const { data, error } = await supabase
              .from('categories')
              .select('id, name, slug, show_on_home')
              .eq('tenant_id', tenantId);

            result = error ? { success: false, error: error.message } : data;
          } else if (args.action === 'create') {
            const { data, error } = await supabase
              .from('categories')
              .insert({
                tenant_id: tenantId,
                name: args.name,
                slug: args.slug || args.name.toLowerCase().replace(/\s+/g, '-')
              })
              .select()
              .single();

            result = error ? { success: false, error: error.message } : { success: true, category: data };
          } else if (args.action === 'update') {
            const updates: any = {};
            if (args.name) updates.name = args.name;
            if (args.slug) updates.slug = args.slug;

            const { error } = await supabase
              .from('categories')
              .update(updates)
              .eq('id', args.categoryId)
              .eq('tenant_id', tenantId);

            result = error ? { success: false, error: error.message } : { success: true };
          }
          break;
        }

        default:
          result = { error: 'Unknown function' };
      }

      console.log('🔧 Function result:', JSON.stringify(result));

      // Segunda llamada con resultados de function call (formato Google)
      console.log('🔧 Making final AI call with function result...');
      
      const finalResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              { role: 'user', parts: [{ text: message }] },
              { role: 'model', parts: [{ functionCall: { name: functionName, args } }] },
              { role: 'function', parts: [{ functionResponse: { name: functionName, response: { content: result } } }] }
            ]
          })
        }
      );

      console.log('📥 Final AI Response status:', finalResponse.status);

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error('❌ Final AI error:', errorText);
        throw new Error(`Final AI response failed: ${errorText}`);
      }

      const finalData = await finalResponse.json();
      
      // Parsear respuesta final de Google
      const finalCandidate = finalData.candidates?.[0];
      const finalParts = finalCandidate?.content?.parts || [];
      let responseText = finalParts.find((p: any) => p.text)?.text;

      if (!responseText) {
        console.warn('⚠️ AI returned empty content, using fallback');
        responseText = 'Procesé tu solicitud correctamente. ¿Hay algo más en lo que pueda ayudarte?';
      }
      
      console.log('✅ Final response text length:', responseText.length);

      // Detectar si se generó una imagen para enviarla
      let generatedImageUrl = null;
      if (result && typeof result === 'object' && 'imageUrl' in result && result.success) {
        generatedImageUrl = result.imageUrl;
      }

      console.log('🎉 Returning response with image:', !!generatedImageUrl);

      return new Response(
        JSON.stringify({ 
          response: responseText,
          generatedImageUrl 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Respuesta directa sin function calls
    const directResponse = textPart?.text || 'No pude procesar tu mensaje. ¿Podrías intentarlo de nuevo?';
    
    return new Response(
      JSON.stringify({ response: directResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ AI Agent error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
