import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if auto-generation is enabled
    const { data: settings } = await supabase
      .from('blog_auto_generation_settings')
      .select('*')
      .single();

    if (!settings?.enabled) {
      console.log('Auto-generation is disabled');
      return new Response(
        JSON.stringify({ message: 'Auto-generation is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get next pending topic
    const { data: topic, error: topicError } = await supabase
      .from('blog_topics_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (topicError || !topic) {
      console.log('No pending topics found');
      return new Response(
        JSON.stringify({ message: 'No pending topics' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as generating
    await supabase
      .from('blog_topics_queue')
      .update({ status: 'generating' })
      .eq('id', topic.id);

    try {
      // Generate blog content with image
      console.log('Generating content for topic:', topic.topic);
      const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-blog-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.topic,
          targetKeywords: topic.keywords?.join(', ') || '',
          tone: topic.tone || 'professional',
          length: topic.length || 'medium',
          generateImage: true
        }),
      });

      if (!generateResponse.ok) {
        throw new Error(`Failed to generate content: ${await generateResponse.text()}`);
      }

      const generated = await generateResponse.json();

      // Upload featured image if generated
      let featuredImageUrl: string | null = null;
      if (generated.featuredImageBase64) {
        console.log('Uploading featured image...');
        const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/upload-blog-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: generated.featuredImageBase64
          }),
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          featuredImageUrl = uploadData.url;
          console.log('Image uploaded:', featuredImageUrl);
        }
      }

      // Create blog post
      const { data: newPost, error: postError } = await supabase
        .from('blog_posts')
        .insert({
          title: generated.title,
          slug: generated.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          content: generated.content,
          excerpt: generated.excerpt,
          seo_title: generated.seoTitle,
          seo_description: generated.seoDescription,
          keywords: generated.keywords,
          featured_image_url: featuredImageUrl,
          status: settings.auto_publish ? 'published' : 'draft',
        })
        .select()
        .single();

      if (postError) {
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      // Update topic as completed
      await supabase
        .from('blog_topics_queue')
        .update({
          status: 'completed',
          generated_at: new Date().toISOString(),
          generated_post_id: newPost.id
        })
        .eq('id', topic.id);

      // Send notification email if configured
      if (resendApiKey && settings.notification_email) {
        try {
          const resend = new Resend(resendApiKey);
          const statusText = settings.auto_publish ? 'publicado' : 'borrador creado';
          
          await resend.emails.send({
            from: 'Blog Automático <onboarding@resend.dev>',
            to: [settings.notification_email],
            subject: `✅ Nuevo artículo ${statusText}: ${generated.title}`,
            html: `
              <h2>Se ha generado un nuevo artículo</h2>
              <p><strong>Título:</strong> ${generated.title}</p>
              <p><strong>Estado:</strong> ${statusText}</p>
              <p><strong>Tema:</strong> ${topic.topic}</p>
              ${featuredImageUrl ? `<p><strong>Imagen destacada:</strong> <a href="${featuredImageUrl}">Ver imagen</a></p>` : ''}
              <p><a href="https://toogo.store/admin">Ver en el admin</a></p>
            `,
          });
          console.log('Notification email sent');
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
        }
      }

      console.log('Blog post created successfully:', newPost.id);

      return new Response(
        JSON.stringify({
          success: true,
          post: newPost,
          topic: topic.topic
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (generationError) {
      console.error('Generation error:', generationError);
      
      // Mark as failed
      await supabase
        .from('blog_topics_queue')
        .update({
          status: 'failed',
          error_message: generationError.message
        })
        .eq('id', topic.id);

      throw generationError;
    }

  } catch (error) {
    console.error('Error in auto-generate-blog-post:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});