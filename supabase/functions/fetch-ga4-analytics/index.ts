import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GA4Request {
  tenantId: string;
  startDate: string;
  endDate: string;
  propertyId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenantId, startDate, endDate, propertyId = '507500067' }: GA4Request = await req.json();

    console.log(`[GA4] Fetching analytics for tenant: ${tenantId}, dates: ${startDate} to ${endDate}`);

    // Get Google Service Account credentials
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Generate JWT for Google API authentication
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const jwtHeader = btoa(JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    }));

    const jwtClaimSet = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiry,
      iat: now,
    }));

    // Import private key for signing
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = serviceAccount.private_key
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const dataToSign = new TextEncoder().encode(`${jwtHeader}.${jwtClaimSet}`);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, dataToSign);
    const jwtSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${jwtHeader}.${jwtClaimSet}.${jwtSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[GA4] Token exchange failed:', errorText);
      throw new Error('Failed to get Google access token');
    }

    const { access_token } = await tokenResponse.json();
    console.log('[GA4] Access token obtained successfully');

    // Query GA4 Data API
    const ga4Response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'sessionDefaultChannelGrouping' },
            { name: 'customEvent:tenant_id' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'customEvent:tenant_id',
              stringFilter: {
                matchType: 'EXACT',
                value: tenantId,
              },
            },
          },
          metrics: [
            { name: 'sessions' },
            { name: 'newUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'screenPageViews' },
          ],
        }),
      }
    );

    if (!ga4Response.ok) {
      const errorText = await ga4Response.text();
      console.error('[GA4] API request failed:', errorText);
      throw new Error(`GA4 API error: ${errorText}`);
    }

    const ga4Data = await ga4Response.json();
    console.log('[GA4] Data retrieved successfully:', JSON.stringify(ga4Data, null, 2));

    // Parse GA4 response
    const rows = ga4Data.rows || [];
    const trafficSources: { [key: string]: number } = {};
    let totalSessions = 0;
    let totalNewUsers = 0;
    let totalPageViews = 0;
    let avgSessionDuration = 0;
    let avgBounceRate = 0;

    rows.forEach((row: any) => {
      const source = row.dimensionValues?.[0]?.value || 'direct';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      const newUsers = parseInt(row.metricValues?.[1]?.value || '0');
      const bounceRate = parseFloat(row.metricValues?.[2]?.value || '0');
      const sessionDuration = parseFloat(row.metricValues?.[3]?.value || '0');
      const pageViews = parseInt(row.metricValues?.[4]?.value || '0');

      trafficSources[source] = (trafficSources[source] || 0) + sessions;
      totalSessions += sessions;
      totalNewUsers += newUsers;
      totalPageViews += pageViews;
      avgSessionDuration += sessionDuration;
      avgBounceRate += bounceRate;
    });

    const rowCount = rows.length || 1;
    avgSessionDuration = avgSessionDuration / rowCount;
    avgBounceRate = avgBounceRate / rowCount;

    const result = {
      sessions: totalSessions,
      newUsers: totalNewUsers,
      bounceRate: avgBounceRate,
      averageSessionDuration: avgSessionDuration,
      pageViews: totalPageViews,
      trafficSources: Object.entries(trafficSources).map(([source, sessions]) => ({
        source,
        sessions,
      })),
    };

    console.log('[GA4] Processed result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[GA4] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        sessions: 0,
        newUsers: 0,
        bounceRate: 0,
        averageSessionDuration: 0,
        pageViews: 0,
        trafficSources: [],
      }),
      { 
        status: 200, // Return 200 with empty data instead of error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
