import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
    em?: string; // hashed email
    ph?: string; // hashed phone
    fn?: string; // hashed first name
    ln?: string; // hashed last name
    ct?: string; // hashed city
    st?: string; // hashed state
    zp?: string; // hashed zip
    country?: string; // hashed country
  };
  custom_data?: {
    content_ids?: string[];
    content_type?: string;
    content_name?: string;
    value?: number;
    currency?: string;
    num_items?: number;
  };
}

// SHA-256 hash function for PII
async function sha256Hash(str: string): Promise<string> {
  if (!str) return '';
  
  const normalizedStr = str.toLowerCase().trim();
  const msgBuffer = new TextEncoder().encode(normalizedStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      event_name,
      event_id,
      tenant_id,
      user_data = {},
      custom_data = {},
      event_source_url
    } = await req.json();

    console.log('📊 [Facebook Conversions API] Event received:', event_name);

    // Get global Pixel ID from environment
    const pixelId = Deno.env.get('FACEBOOK_PIXEL_ID');
    
    if (!pixelId) {
      console.log('⚠️ [Facebook Conversions API] No global Pixel ID configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No Pixel ID configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('❌ [Facebook Conversions API] No access token configured');
      return new Response(
        JSON.stringify({ success: false, error: 'No access token configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash PII data
    const hashedUserData: any = {
      client_ip_address: user_data.client_ip_address,
      client_user_agent: user_data.client_user_agent,
    };

    if (user_data.email) {
      hashedUserData.em = await sha256Hash(user_data.email);
    }
    if (user_data.phone) {
      hashedUserData.ph = await sha256Hash(user_data.phone);
    }
    if (user_data.first_name) {
      hashedUserData.fn = await sha256Hash(user_data.first_name);
    }
    if (user_data.last_name) {
      hashedUserData.ln = await sha256Hash(user_data.last_name);
    }
    if (user_data.city) {
      hashedUserData.ct = await sha256Hash(user_data.city);
    }
    if (user_data.state) {
      hashedUserData.st = await sha256Hash(user_data.state);
    }
    if (user_data.zip) {
      hashedUserData.zp = await sha256Hash(user_data.zip);
    }
    if (user_data.country) {
      hashedUserData.country = await sha256Hash(user_data.country);
    }

    // Prepare event data
    const conversionEvent: ConversionEvent = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      event_source_url,
      user_data: hashedUserData,
      custom_data
    };

    // Send to Facebook Conversions API
    const fbApiUrl = `https://graph.facebook.com/v18.0/${pixelId}/events`;
    const fbResponse = await fetch(fbApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [conversionEvent],
        access_token: accessToken,
      }),
    });

    const fbResult = await fbResponse.json();

    console.log('✅ [Facebook Conversions API] Event sent:', event_name, fbResult);

    return new Response(
      JSON.stringify({ success: true, result: fbResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Facebook Conversions API] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
