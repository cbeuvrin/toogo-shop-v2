// Updated to use Openprovider XML API - v2.0
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment & clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openproviderUsername = Deno.env.get('OPENPROVIDER_USERNAME')!;
const openproviderPassword = Deno.env.get('OPENPROVIDER_PASSWORD')!;
const openproviderApiUrl = 'https://api.openprovider.eu'; // XML API endpoint

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Default customer handle for Keting Media
const DEFAULT_CUSTOMER_HANDLE = {
  handle_id: "CB982561-MX",
  firstName: "Keting",
  lastName: "Media",
  companyName: "Keting Media",
  email: "c.beuvrin@ketingmedia.com",
  phone: {
    countryCode: "+54",
    areaCode: "",
    subscriberNumber: "3830150"
  },
  address: {
    street: "Av Alvaro Obregon 179",
    city: "Buenos Aires",
    state: "Buenos Aires",
    zipcode: "1000",
    country: "AR"
  }
};

// Helper functions
const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const sanitizeDomain = (raw: string) => {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
    .replace(/\s+/g, '')
    .replace(/\.$/, '');
};

const getTldKey = (domain: string) => {
  if (domain.endsWith('.com.mx')) return 'com.mx';
  const parts = domain.split('.');
  return parts[parts.length - 1] || '';
};

const validTlds = new Set(['com', 'com.mx', 'info', 'mx', 'net', 'store', 'online', 'xyz', 'site', 'shop']);

// XML Helper Functions
function buildXMLRequest(command: string, params: Record<string, any>): string {
  const buildXMLParams = (obj: Record<string, any>, indent = 2): string => {
    return Object.entries(obj)
      .map(([key, value]) => {
        const spaces = ' '.repeat(indent);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}<${key}>\n${buildXMLParams(value, indent + 2)}\n${spaces}</${key}>`;
        } else if (Array.isArray(value)) {
          return value.map(item => 
            typeof item === 'object' 
              ? `${spaces}<item>\n${buildXMLParams(item, indent + 2)}\n${spaces}</item>`
              : `${spaces}<item>${item}</item>`
          ).join('\n');
        }
        return `${spaces}<${key}>${value}</${key}>`;
      })
      .join('\n');
  };

  const paramsXML = buildXMLParams(params);

  return `<?xml version="1.0" encoding="UTF-8"?>
<openXML>
  <credentials>
    <username>${openproviderUsername}</username>
    <password>${openproviderPassword}</password>
  </credentials>
  <${command}>
${paramsXML}
  </${command}>
</openXML>`;
}

function parseXMLResponse(xmlString: string): any {
  // Extract code and desc
  const codeMatch = xmlString.match(/<code>(\d+)<\/code>/);
  const descMatch = xmlString.match(/<desc>(.*?)<\/desc>/);
  
  const code = codeMatch ? parseInt(codeMatch[1]) : 999;
  const desc = descMatch ? descMatch[1] : 'Unknown error';
  
  // Parse data section
  const dataMatch = xmlString.match(/<data>(.*?)<\/data>/s);
  let data: any = {};
  
  if (dataMatch) {
    const dataContent = dataMatch[1];
    
    // Parse domain ID
    const idMatch = dataContent.match(/<id>(\d+)<\/id>/);
    if (idMatch) data.id = parseInt(idMatch[1]);
    
    // Parse status
    const statusMatch = dataContent.match(/<status>(.*?)<\/status>/);
    if (statusMatch) data.status = statusMatch[1];
    
    // Parse domain
    const domainMatch = dataContent.match(/<domain>(.*?)<\/domain>/);
    if (domainMatch) data.domain = domainMatch[1];
    
    // Parse simple price (for checkDomainRequest)
    const priceMatch = dataContent.match(/<price>([\d.]+)<\/price>/);
    if (priceMatch) data.price = parseFloat(priceMatch[1]);
    
    // Parse simple reseller price (for checkDomainRequest)
    const resellerPriceMatch = dataContent.match(/<reseller_price>([\d.]+)<\/reseller_price>/);
    if (resellerPriceMatch) data.reseller_price = parseFloat(resellerPriceMatch[1]);
    
    // Parse complex price structure (for retrievePriceDomainRequest)
    // Structure: <product><price><reseller><price>12.50</price></reseller></price></product>
    const productMatch = dataContent.match(/<product>(.*?)<\/product>/s);
    if (productMatch) {
      const productContent = productMatch[1];
      const resellerPriceInnerMatch = productContent.match(/<reseller>.*?<price>([\d.]+)<\/price>.*?<\/reseller>/s);
      if (resellerPriceInnerMatch) {
        data.product = {
          price: {
            reseller: {
              price: parseFloat(resellerPriceInnerMatch[1])
            }
          }
        };
      }
    }
    
    // Alternative structure: <price><reseller><price>12.50</price></reseller></price>
    const priceStructMatch = dataContent.match(/<price>(.*?)<\/price>/s);
    if (priceStructMatch && !data.price) {
      const priceStructContent = priceStructMatch[1];
      const resellerInnerMatch = priceStructContent.match(/<reseller>.*?<price>([\d.]+)<\/price>.*?<\/reseller>/s);
      if (resellerInnerMatch) {
        data.price = {
          reseller: {
            price: parseFloat(resellerInnerMatch[1])
          }
        };
      }
    }
  }
  
  return { code, desc, data };
}

// Make XML request to Openprovider API
async function openproviderRequest(command: string, params: Record<string, any> = {}): Promise<any> {
  const xmlBody = buildXMLRequest(command, params);
  
  console.log(`[Openprovider XML] Command: ${command}`);
  console.log(`[Openprovider XML] Request:\n${xmlBody}`);

  const response = await fetch(openproviderApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
    },
    body: xmlBody
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Openprovider XML] HTTP Error: ${response.status}`, text);
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
  }

  const xmlResponse = await response.text();
  console.log(`[Openprovider XML] Response:\n${xmlResponse}`);

  const parsed = parseXMLResponse(xmlResponse);
  console.log(`[Openprovider XML] Parsed - Code: ${parsed.code}, Desc: ${parsed.desc}`);
  console.log(`[Openprovider XML] Parsed data:`, JSON.stringify(parsed, null, 2));
  
  if (parsed.code !== 0) {
    console.error('[Openprovider XML] API Error:', parsed);
    throw new Error(`Openprovider API error (code ${parsed.code}): ${parsed.desc}`);
  }

  return parsed;
}

// Main server
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestData: any;
  try {
    requestData = await req.json();
  } catch (_) {
    return json({ 
      status: 'error', 
      code: 'INVALID_REQUEST_BODY', 
      message: 'Body must be valid JSON' 
    }, 400);
  }

  const action = requestData?.action;
  console.log(`[Openprovider API] Action: ${action}`);

  try {
    switch (action) {
      case 'health':
        return json({ status: 'ok', provider: 'openprovider', api: 'xml' });
        
      case 'diagnostics':
        return await handleDiagnostics();
        
      case 'validate-credentials':
        return await handleValidateCredentials();
        
      case 'pricing':
        return await handleGetPricing();
        
      case 'check-availability':
        return await handleCheckAvailability(requestData);
        
      case 'purchase':
        return await handlePurchaseDomain(requestData);
        
      case 'transfer':
        return await handleTransferDomain(requestData);
        
      default:
        return json({ 
          status: 'error', 
          code: 'INVALID_ACTION', 
          message: 'Invalid action' 
        }, 400);
    }
  } catch (error) {
    console.error('[Openprovider] Unhandled error:', error);
    return json({ 
      status: 'error', 
      code: 'UNHANDLED', 
      message: (error as Error).message 
    }, 500);
  }
});

async function handleDiagnostics() {
  const diagnostics: any = {
    status: 'ok',
    provider: 'openprovider',
    api: 'xml',
    env: {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
      hasOpenproviderUsername: !!openproviderUsername,
      hasOpenproviderPassword: !!openproviderPassword,
      apiUrl: openproviderApiUrl,
      usernamePreview: openproviderUsername ? `${openproviderUsername.substring(0, 5)}...` : 'N/A'
    }
  };

  try {
    // Test with simple searchDomainRequest
    const testResult = await openproviderRequest('searchDomainRequest', {
      domainNamePattern: 'test.com',
      limit: 1
    });
    
    diagnostics.auth = {
      success: true,
      testCommand: 'searchDomainRequest',
      responseCode: testResult.code
    };
  } catch (error) {
    diagnostics.status = 'error';
    diagnostics.auth = {
      success: false,
      error: (error as Error).message
    };
  }

  return json(diagnostics);
}

async function handleValidateCredentials() {
  console.log('[Validate] Checking Openprovider credentials...');

  if (!openproviderUsername || !openproviderPassword) {
    return json({
      status: 'error',
      code: 'MISSING_CREDENTIALS',
      message: 'Faltan credenciales de Openprovider en Supabase secrets',
      details: 'OPENPROVIDER_USERNAME y OPENPROVIDER_PASSWORD no están configurados'
    }, 400);
  }

  try {
    // Test credentials with simple search
    await openproviderRequest('searchDomainRequest', {
      domainNamePattern: 'test.com',
      limit: 1
    });
    
    console.log('[Validate] Credentials validated successfully');
    return json({
      status: 'success',
      message: 'Las credenciales de Openprovider son válidas',
      provider: 'openprovider',
      api: 'xml',
      username: openproviderUsername
    });
  } catch (error) {
    console.error('[Validate] Credential validation failed:', error);
    
    const errorMessage = (error as Error).message;
    let userMessage = 'Error al validar credenciales';
    let code = 'VALIDATION_ERROR';
    
    // Detectar código 196: Autenticación fallida
    if (errorMessage.includes('196')) {
      userMessage = 'Usuario o contraseña incorrectos';
      code = 'AUTHENTICATION_FAILED';
    } 
    // Detectar código 309: Contrato no firmado
    else if (errorMessage.includes('309')) {
      userMessage = 'Debes firmar el último contrato en tu cuenta de Openprovider';
      code = 'CONTRACT_NOT_SIGNED';
    }
    // Detectar código 4007: API bloqueada por uso excesivo
    else if (errorMessage.includes('4007')) {
      userMessage = 'API temporalmente bloqueada por uso excesivo. Espera unos minutos.';
      code = 'RATE_LIMIT_EXCEEDED';
    }
    // Errores de red
    else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = 'No se puede conectar con la API de Openprovider';
      code = 'NETWORK_ERROR';
    }
    
    return json({
      status: 'error',
      code: code,
      message: userMessage,
      details: errorMessage,
      provider: 'openprovider',
      api: 'xml'
    }, 400);
  }
}

async function handleGetPricing() {
  console.log('[Pricing] Fetching pricing from Openprovider...');

  try {
    // Get pricing for each TLD
    const pricingMXN: Record<string, { registration: string; renewal: string }> = {};
    
    for (const tld of Array.from(validTlds)) {
      try {
        const result = await openproviderRequest('retrieveExtensionRequest', {
          name: tld
        });
        
        if (result.data?.price) {
          const regUSD = result.data.reseller_price || result.data.price;
          
          // Apply 45% markup
          const regMarkup = regUSD * 1.45;
          
          // Convert to MXN (1 USD = 20 MXN)
          const regMXN = Math.round(regMarkup * 20);
          
          pricingMXN[tld] = {
            registration: regMXN.toString(),
            renewal: regMXN.toString()
          };
          
          console.log(`[Pricing] .${tld}: $${regUSD} USD -> $${regMarkup.toFixed(2)} USD (45% markup) -> $${regMXN} MXN`);
        }
      } catch (error) {
        console.warn(`[Pricing] Could not get pricing for .${tld}:`, (error as Error).message);
      }
    }

    return json({ 
      status: 'success', 
      pricing: pricingMXN,
      provider: 'openprovider',
      api: 'xml'
    });
  } catch (error) {
    console.error('[Pricing] Error:', error);
    return json({ 
      status: 'error', 
      code: 'PRICING_ERROR', 
      message: (error as Error).message 
    }, 500);
  }
}

async function handleCheckAvailability(requestData: any) {
  try {
    const rawDomain = requestData?.domain as string | undefined;
    if (!rawDomain) {
      return json({ 
        status: 'error', 
        code: 'DOMAIN_REQUIRED', 
        message: 'Domain is required' 
      }, 400);
    }

    const domain = sanitizeDomain(rawDomain);
    const tldKey = getTldKey(domain);

    if (!tldKey || !validTlds.has(tldKey)) {
      return json({ 
        status: 'error', 
        code: 'INVALID_TLD', 
        message: `Only ${Array.from(validTlds).join(', ')} are supported.` 
      }, 400);
    }

    console.log(`[Availability] Checking domain: ${domain}`);

    // STEP 1: Check availability with Openprovider XML API
    const availabilityResult = await openproviderRequest('checkDomainRequest', {
      domains: {
        item: {
          name: domain.split('.')[0],
          extension: tldKey
        }
      }
    });

    const isAvailable = availabilityResult.data?.status === 'free';
    console.log(`[Availability] Available: ${isAvailable}`);

    let priceUSD = 0;

    // STEP 2: If available, get pricing with retrievePriceDomainRequest
    if (isAvailable) {
      console.log(`[Availability] Fetching price for ${domain}`);
      
      const priceResult = await openproviderRequest('retrievePriceDomainRequest', {
        domain: {
          name: domain.split('.')[0],
          extension: tldKey
        },
        operation: 'create'
      });

      // Parse price from response (handle multiple possible structures)
      priceUSD = priceResult.data?.product?.price?.reseller?.price || 
                 priceResult.data?.price?.reseller?.price || 
                 priceResult.data?.reseller_price ||
                 priceResult.data?.price ||
                 0;
      
      console.log(`[Availability] Base price from Openprovider: $${priceUSD} USD`);
    }

    // Apply 45% markup
    const priceWithMarkup = priceUSD * 1.45;
    const priceMXN = Math.round(priceWithMarkup * 20); // 20 MXN/USD

    console.log(`[Availability] Domain: ${domain}`);
    console.log(`[Availability] Base price: $${priceUSD} USD`);
    console.log(`[Availability] Price with 45% markup: $${priceWithMarkup.toFixed(2)} USD`);
    console.log(`[Availability] Final price: $${priceMXN} MXN`);

    return json({
      status: 'success',
      domain: domain,
      available: isAvailable,
      price_usd: parseFloat(priceWithMarkup.toFixed(2)),
      price_mxn: priceMXN,
      provider: 'openprovider',
      api: 'xml'
    });
  } catch (error) {
    console.error('[Availability] Error:', error);
    return json({ 
      status: 'error', 
      code: 'AVAILABILITY_ERROR', 
      message: (error as Error).message 
    }, 500);
  }
}

async function handlePurchaseDomain(requestData: any) {
  try {
    const { domain: rawDomain, tenantId } = requestData || {};
    
    if (!rawDomain || !tenantId) {
      return json({ 
        status: 'error', 
        code: 'MISSING_PARAMS', 
        message: 'Domain and tenantId are required' 
      }, 400);
    }

    const domain = sanitizeDomain(rawDomain);
    const domainName = domain.split('.')[0];
    const extension = getTldKey(domain);
    
    console.log(`[Purchase] Processing domain: ${domain} (name: ${domainName}, ext: ${extension}) for tenant: ${tenantId}`);

    // Create DB record
    const { data: domainRecord, error: dbError } = await supabase
      .from('domain_purchases')
      .insert({
        domain,
        tenant_id: tenantId,
        status: 'processing',
        provider: 'openprovider',
        sandbox_bool: false,
        dns_verified_bool: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Purchase] Database error:', dbError);
      return json({ 
        status: 'error', 
        code: 'DB_INSERT_FAILED', 
        message: 'Failed to create domain record', 
        details: dbError 
      }, 500);
    }

    try {
      // Register domain with Openprovider XML API
      console.log(`[Purchase] Calling Openprovider XML API: createDomainRequest`);
      
      const purchaseData = await openproviderRequest('createDomainRequest', {
        domain: {
          name: domainName,
          extension: extension
        },
        period: 1,
        ownerHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
        adminHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
        techHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
        billingHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
        nsGroup: 'vercel', // Uses the Openprovider nsGroup configured with Vercel nameservers
        autorenew: 'off'
      });

      if (!purchaseData.data?.id) {
        throw new Error('No domain ID returned from Openprovider');
      }

      // Update record with domain ID but keep status as pending
      // The complete-domain-setup function will change it to 'active' after all steps
      await supabase
        .from('domain_purchases')
        .update({ 
          status: 'pending',
          openprovider_domain_id: purchaseData.data.id,
          openprovider_handle: DEFAULT_CUSTOMER_HANDLE.handle_id,
          metadata: {
            openprovider_response: purchaseData,
            purchased_at: new Date().toISOString()
          } as any
        })
        .eq('id', domainRecord.id);

      console.log(`[Purchase] Domain registered successfully: ${domain} (ID: ${purchaseData.data.id})`);

      // Trigger complete-domain-setup automatically after successful purchase
      console.log(`[Purchase] Triggering complete-domain-setup for ${domain}...`);
      try {
        const { data: setupData, error: setupError } = await supabase.functions.invoke('complete-domain-setup', {
          body: {
            domainPurchaseId: domainRecord.id
          }
        });

        if (setupError) {
          console.error(`[Purchase] Setup trigger failed:`, setupError);
          // Don't block the purchase response, but log the error
        } else {
          console.log(`[Purchase] Setup triggered successfully:`, setupData);
        }
      } catch (error) {
        console.error(`[Purchase] Error triggering setup:`, error);
        // Don't block the purchase response
      }

      return json({
        status: 'success',
        message: 'Domain purchased successfully',
        domain: domain,
        openprovider_domain_id: purchaseData.data.id,
        provider: 'openprovider',
        api: 'xml',
        setup_triggered: true
      });

    } catch (error) {
      console.error('[Purchase] Failed:', error);
      
      const errorMessage = (error as Error).message;
      let errorCode = 'PURCHASE_FAILED';
      
      // Mapear errores de Openprovider a códigos específicos
      if (errorMessage.includes('309')) errorCode = 'CONTRACT_NOT_SIGNED';
      else if (errorMessage.includes('4007')) errorCode = 'RATE_LIMIT_EXCEEDED';
      else if (errorMessage.includes('196')) errorCode = 'AUTHENTICATION_FAILED';
      else if (errorMessage.includes('316')) errorCode = 'INVALID_PERIOD';
      else if (errorMessage.includes('235')) errorCode = 'DOMAIN_ALREADY_REGISTERED';
      
      // Mark as failed con código específico
      await supabase
        .from('domain_purchases')
        .update({
          status: 'failed',
          metadata: {
            error: errorMessage,
            error_code: errorCode,
            failed_at: new Date().toISOString()
          } as any
        })
        .eq('id', domainRecord.id);

      return json({
        status: 'error',
        code: errorCode,
        message: errorMessage
      }, 400);
    }
  } catch (error) {
    console.error('[Purchase] Error:', error);
    return json({ 
      status: 'error', 
      code: 'PURCHASE_ERROR', 
      message: (error as Error).message 
    }, 500);
  }
}

// DEPRECATED: DNS setup is now handled via nsGroup during domain purchase
// and complete-domain-setup handles Vercel integration automatically

async function handleTransferDomain(requestData: any) {
  try {
    const { domain: rawDomain, authCode, tenantId } = requestData || {};
    
    if (!rawDomain || !authCode || !tenantId) {
      return json({ 
        status: 'error', 
        code: 'MISSING_PARAMS', 
        message: 'Domain, authCode, and tenantId are required' 
      }, 400);
    }

    const domain = sanitizeDomain(rawDomain);
    const domainName = domain.split('.')[0];
    const extension = getTldKey(domain);
    
    console.log(`[Transfer] Initiating transfer for: ${domain}`);

    // Create DB record
    const { data: domainRecord, error: dbError } = await supabase
      .from('domain_purchases')
      .insert({
        domain,
        tenant_id: tenantId,
        status: 'processing',
        provider: 'openprovider',
        sandbox_bool: false,
        dns_verified_bool: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Transfer] Database error:', dbError);
      return json({ 
        status: 'error', 
        code: 'DB_INSERT_FAILED', 
        message: 'Failed to create domain record', 
        details: dbError 
      }, 500);
    }

    try {
      // Initiate transfer with Openprovider XML API
      console.log(`[Transfer] Calling Openprovider XML API: transferDomainRequest`);
      
    const transferData = await openproviderRequest('transferDomainRequest', {
      domain: {
        name: domainName,
        extension: extension,
        authCode: authCode
      },
      period: 1,
      ownerHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
      adminHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
      techHandle: DEFAULT_CUSTOMER_HANDLE.handle_id,
      billingHandle: DEFAULT_CUSTOMER_HANDLE.handle_id
    });

      // Update record
      await supabase
        .from('domain_purchases')
        .update({ 
          status: 'active',
          openprovider_domain_id: transferData.data?.id,
          openprovider_handle: DEFAULT_CUSTOMER_HANDLE.handle_id,
          metadata: {
            transfer_initiated_at: new Date().toISOString(),
            openprovider_response: transferData
          } as any
        })
        .eq('id', domainRecord.id);

      console.log(`[Transfer] Transfer initiated for ${domain}`);

      return json({
        status: 'success',
        message: 'Domain transfer initiated successfully',
        domain: domain,
        provider: 'openprovider',
        api: 'xml'
      });

    } catch (error) {
      console.error('[Transfer] Failed:', error);
      
      await supabase
        .from('domain_purchases')
        .update({
          status: 'failed',
          metadata: {
            error: (error as Error).message,
            error_code: 'TRANSFER_FAILED',
            failed_at: new Date().toISOString()
          } as any
        })
        .eq('id', domainRecord.id);

      return json({
        status: 'error',
        code: 'TRANSFER_FAILED',
        message: `Failed to transfer domain: ${(error as Error).message}`
      }, 500);
    }
  } catch (error) {
    console.error('[Transfer] Error:', error);
    return json({ 
      status: 'error', 
      code: 'TRANSFER_ERROR', 
      message: (error as Error).message 
    }, 500);
  }
}
