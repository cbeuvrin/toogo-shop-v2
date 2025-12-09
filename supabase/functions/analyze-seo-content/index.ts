import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SEOAnalysis {
  score: number;
  issues: {
    type: 'error' | 'warning' | 'success';
    message: string;
  }[];
  suggestions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, seoTitle, seoDescription, keywords } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    // Basic SEO checks
    const issues: SEOAnalysis['issues'] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check SEO title
    const titleLength = (seoTitle || title || '').length;
    if (titleLength === 0) {
      issues.push({ type: 'error', message: 'El título SEO está vacío' });
      score -= 20;
    } else if (titleLength < 30) {
      issues.push({ type: 'warning', message: `Título SEO muy corto (${titleLength} caracteres). Ideal: 50-60` });
      score -= 10;
    } else if (titleLength > 60) {
      issues.push({ type: 'warning', message: `Título SEO muy largo (${titleLength} caracteres). Se cortará en resultados` });
      score -= 10;
    } else {
      issues.push({ type: 'success', message: 'Longitud de título SEO óptima' });
    }

    // Check SEO description
    const descLength = (seoDescription || '').length;
    if (descLength === 0) {
      issues.push({ type: 'error', message: 'La descripción SEO está vacía' });
      score -= 20;
    } else if (descLength < 120) {
      issues.push({ type: 'warning', message: `Descripción SEO muy corta (${descLength} caracteres). Ideal: 150-160` });
      score -= 10;
    } else if (descLength > 160) {
      issues.push({ type: 'warning', message: `Descripción SEO muy larga (${descLength} caracteres). Se cortará` });
      score -= 10;
    } else {
      issues.push({ type: 'success', message: 'Longitud de descripción SEO óptima' });
    }

    // Check content length
    const contentLength = (content || '').length;
    if (contentLength < 300) {
      issues.push({ type: 'error', message: `Contenido muy corto (${contentLength} caracteres). Mínimo: 300` });
      score -= 15;
    } else if (contentLength < 600) {
      issues.push({ type: 'warning', message: 'El contenido podría ser más extenso para mejor SEO' });
      score -= 5;
    } else {
      issues.push({ type: 'success', message: 'Longitud de contenido adecuada' });
    }

    // Check headings
    const h1Count = (content || '').match(/<h1[^>]*>/gi)?.length || 0;
    const h2Count = (content || '').match(/<h2[^>]*>/gi)?.length || 0;
    
    if (h1Count === 0) {
      issues.push({ type: 'error', message: 'No hay encabezado H1 en el contenido' });
      score -= 15;
    } else if (h1Count > 1) {
      issues.push({ type: 'warning', message: `Hay ${h1Count} encabezados H1. Debería haber solo uno` });
      score -= 5;
    } else {
      issues.push({ type: 'success', message: 'Estructura de H1 correcta' });
    }

    if (h2Count === 0) {
      issues.push({ type: 'warning', message: 'No hay encabezados H2. Ayudan a estructurar el contenido' });
      score -= 5;
    }

    // Check images alt text
    const imgTags = (content || '').match(/<img[^>]*>/gi) || [];
    const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt=')).length;
    
    if (imgTags.length > 0) {
      if (imgsWithoutAlt > 0) {
        issues.push({ type: 'warning', message: `${imgsWithoutAlt} de ${imgTags.length} imágenes sin texto alternativo` });
        score -= 10;
      } else {
        issues.push({ type: 'success', message: 'Todas las imágenes tienen texto alternativo' });
      }
    }

    // Check keywords
    if (!keywords || keywords.length === 0) {
      issues.push({ type: 'warning', message: 'No hay palabras clave definidas' });
      score -= 5;
    } else {
      issues.push({ type: 'success', message: `${keywords.length} palabras clave definidas` });
    }

    // Use Gemini AI for advanced analysis
    try {
      const prompt = `Analiza este contenido de blog para SEO y dame 3 sugerencias específicas de mejora:

Título: ${title}
Título SEO: ${seoTitle || title}
Descripción SEO: ${seoDescription}
Palabras clave: ${keywords?.join(', ')}
Contenido: ${content?.substring(0, 1000)}...

Responde SOLO con un array JSON de 3 sugerencias concretas, sin explicaciones adicionales.
Formato: ["sugerencia 1", "sugerencia 2", "sugerencia 3"]`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOOGLE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Eres un experto en SEO que analiza contenido de blogs y da sugerencias concretas.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiSuggestions = aiData.choices?.[0]?.message?.content;
        
        try {
          const parsedSuggestions = JSON.parse(aiSuggestions);
          if (Array.isArray(parsedSuggestions)) {
            suggestions.push(...parsedSuggestions);
          }
        } catch {
          // If AI doesn't return valid JSON, use default suggestions
          suggestions.push(
            'Añade más enlaces internos a otros artículos',
            'Incluye ejemplos prácticos o casos de uso',
            'Optimiza las palabras clave en los primeros 100 caracteres'
          );
        }
      }
    } catch (error) {
      console.error('Error calling Gemini AI:', error);
      // Fallback suggestions
      suggestions.push(
        'Añade más enlaces internos a otros artículos',
        'Incluye ejemplos prácticos o casos de uso',
        'Optimiza las palabras clave en los primeros 100 caracteres'
      );
    }

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score));

    const analysis: SEOAnalysis = {
      score,
      issues,
      suggestions,
    };

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-seo-content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      score: 0,
      issues: [{ type: 'error', message: 'Error al analizar el contenido' }],
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
