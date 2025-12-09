import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  topic: string;
  targetKeywords?: string[];
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
  length?: 'short' | 'medium' | 'long';
  generateImage?: boolean;
}

interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  featuredImageBase64?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, targetKeywords = [], tone = 'professional', length = 'medium', generateImage = false } = await req.json() as GenerateRequest;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    if (!topic || topic.trim().length === 0) {
      throw new Error('Topic is required');
    }

    // Define word counts based on length
    const wordCounts = {
      short: '500-800',
      medium: '1000-1500',
      long: '2000-3000'
    };

    // Define tone descriptions
    const toneDescriptions = {
      professional: 'profesional, formal y autoritativo',
      casual: 'casual, conversacional y cercano',
      technical: 'técnico, detallado y preciso',
      friendly: 'amigable, accesible y motivador'
    };

    const prompt = `Eres un experto escritor de contenido SEO. Genera un artículo completo de blog sobre el tema: "${topic}"

REGLA CRÍTICA DE FORMATO - OBLIGATORIO:
- TODOS los títulos DEBEN usar formato de oración estándar del español
- SOLO la primera letra del título en MAYÚSCULA
- El resto de las palabras en minúsculas (excepto nombres propios)
- NUNCA JAMÁS uses "Title Case" donde Cada Palabra Empieza Con Mayúscula
- Esto aplica a: title, seoTitle, <h2>, <h3>

EJEMPLOS CORRECTOS (HACER ASÍ):
✅ "Cómo crear contenido de calidad para tu blog"
✅ "Los mejores consejos para emprendedores"
✅ "Marketing digital: estrategias efectivas en 2025"
✅ "Costos y transparencia: una ventaja competitiva clave"

EJEMPLOS INCORRECTOS (NUNCA HACER):
❌ "Cómo Crear Contenido De Calidad Para Tu Blog"
❌ "Los Mejores Consejos Para Emprendedores"
❌ "Marketing Digital: Estrategias Efectivas En 2025"
❌ "Costos Y Transparencia: Una Ventaja Competitiva Clave"

INSTRUCCIONES DE CONTENIDO:
- Longitud: ${wordCounts[length]} palabras
- Tono: ${toneDescriptions[tone]}
${targetKeywords.length > 0 ? `- Palabras clave objetivo: ${targetKeywords.join(', ')}` : ''}
- Usa HTML semántico: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- NO incluyas <h1> en el contenido (el título ya se muestra por separado)
- El contenido debe empezar directamente con <h2> para la primera sección principal
- Usa múltiples <h2> para secciones principales (en formato de oración)
- Usa <h3> para subsecciones (en formato de oración)
- Crea párrafos bien estructurados con <p>
- Usa listas cuando sea apropiado
- Optimiza para SEO
- Incluye palabras clave naturalmente en el contenido
- NO incluyas imágenes, solo contenido de texto estructurado

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "title": "Título principal en formato de oración - SOLO primera letra mayúscula (máximo 60 caracteres)",
  "content": "Contenido completo del artículo en HTML (debe empezar con <h2> en formato de oración, NO incluir <h1>)",
  "excerpt": "Resumen breve y atractivo del artículo (100-150 caracteres)",
  "seoTitle": "Título SEO en formato de oración - SOLO primera letra mayúscula (50-60 caracteres, con palabra clave principal)",
  "seoDescription": "Descripción meta para SEO (150-160 caracteres, persuasiva con CTA)",
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"]
}

RECORDATORIO FINAL: 
- El contenido HTML debe estar bien formateado y ser válido
- No uses markdown, solo HTML
- Asegúrate de cerrar todas las etiquetas HTML correctamente
- El JSON debe ser válido y parseable
- OBLIGATORIO: Todos los títulos (title, seoTitle, h2, h3) en formato de oración
- Ejemplo título correcto: "Guía completa de marketing digital para principiantes"
- Ejemplo título incorrecto: "Guía Completa De Marketing Digital Para Principiantes"
`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un experto escritor de contenido SEO en español. Generas artículos con títulos en formato de oración (solo primera letra mayúscula, resto en minúsculas). NUNCA uses Title Case donde Cada Palabra Empieza Con Mayúscula. Siempre respondes con JSON válido y bien estructurado.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI gateway error: ' + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error('AI response data:', JSON.stringify(aiData, null, 2));
      throw new Error('No content generated from AI');
    }
    
    console.log('Generated text length:', generatedText.length);

    // Parse the JSON response
    let generatedContent: GeneratedContent;
    let cleanedText = '';
    try {
      // Remove markdown code blocks if present
      cleanedText = generatedText
        .replace(/\`\`\`json[\n\r]?/g, '')
        .replace(/\`\`\`[\n\r]?/g, '')
        .trim();
      
      generatedContent = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!generatedContent.title || !generatedContent.content || !generatedContent.excerpt) {
        throw new Error('Missing required fields in generated content');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Cleaned text length:', cleanedText.length);
      console.error('First 500 chars:', cleanedText.substring(0, 500));
      console.error('Last 500 chars:', cleanedText.substring(Math.max(0, cleanedText.length - 500)));
      throw new Error('Failed to parse AI response as JSON: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
    }

    // Post-processing: Convert any Title Case to sentence case
    const toSentenceCase = (text: string): string => {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };

    // Convert title to sentence case if it's in Title Case
    if (generatedContent.title && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(generatedContent.title)) {
      generatedContent.title = toSentenceCase(generatedContent.title);
    }

    // Convert seoTitle to sentence case if it's in Title Case
    if (generatedContent.seoTitle && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(generatedContent.seoTitle)) {
      generatedContent.seoTitle = toSentenceCase(generatedContent.seoTitle);
    }

    // Clean up content: ensure proper heading formatting
    if (generatedContent.content) {
      generatedContent.content = generatedContent.content.replace(
        /<h([1-6])>([^<]+)<\/h[1-6]>/g,
        (match, level, text) => {
          // Convert headings to sentence case if they're in Title Case
          const cleanText = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(text.trim()) 
            ? toSentenceCase(text.trim())
            : text.trim();
          return '<h' + level + '>' + cleanText + '</h' + level + '>';
        }
      );
    }

    // Generate featured image if requested
    let featuredImageBase64: string | undefined;
    if (generateImage) {
      try {
        console.log('Generating featured image...');
        const imagePrompt = 'Create a professional, modern featured image for a blog post about: ' + generatedContent.title + '. The image should be visually appealing, relevant to the topic, and suitable for a blog header. High quality, 16:9 aspect ratio, professional photography or illustration style.';
        
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + LOVABLE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: imagePrompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (!imageResponse.ok) {
          console.error('Image generation failed:', await imageResponse.text());
        } else {
          const imageData = await imageResponse.json();
          const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (imageUrl) {
            featuredImageBase64 = imageUrl;
            console.log('Featured image generated successfully');
          }
        }
      } catch (imageError) {
        console.error('Error generating image:', imageError);
        // Continue without image if generation fails
      }
    }

    const response = {
      ...generatedContent,
      ...(featuredImageBase64 && { featuredImageBase64 })
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-blog-content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
