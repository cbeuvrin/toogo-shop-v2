import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderNotificationRequest {
  order_id: string;
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total_amount: number;
  order_items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

const logStep = (step: string, data?: any) => {
  console.log(`[SEND-ORDER-NOTIFICATIONS] ${step}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    const requestBody: OrderNotificationRequest = await req.json();
    logStep('Request received', { order_id: requestBody.order_id, tenant_id: requestBody.tenant_id });

    // Get email templates from system_settings
    const { data: templates, error: templatesError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['email_template_vendor', 'email_template_customer']);

    if (templatesError) {
      logStep('Error fetching templates', templatesError);
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    const systemVendorTemplate = templates?.find(t => t.setting_key === 'email_template_vendor')?.setting_value;
    const systemCustomerTemplate = templates?.find(t => t.setting_key === 'email_template_customer')?.setting_value;

    if (!systemVendorTemplate || !systemCustomerTemplate) {
      throw new Error('Email templates not found in system settings');
    }

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, owner_user_id')
      .eq('id', requestBody.tenant_id)
      .single();

    if (tenantError) {
      logStep('Error fetching tenant', tenantError);
      throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
    }

    // Get tenant settings including logo and custom email template
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('logo_url, custom_email_template_customer')
      .eq('tenant_id', requestBody.tenant_id)
      .single();

    // Prioritize tenant custom template over system template
    const vendorTemplate = systemVendorTemplate;
    const customerTemplate = tenantSettings?.custom_email_template_customer || systemCustomerTemplate;
    
    logStep('Using customer template from', { 
      source: tenantSettings?.custom_email_template_customer ? 'tenant_settings (custom)' : 'system_settings (default)' 
    });

    // Get vendor email
    const { data: vendorUser, error: vendorError } = await supabase.auth.admin.getUserById(tenant.owner_user_id);
    
    if (vendorError || !vendorUser?.user?.email) {
      logStep('Error fetching vendor email', vendorError);
      throw new Error('Vendor email not found');
    }

    // Process order items for email
    const orderItemsText = requestBody.order_items
      .map(item => `- ${item.product_name} x${item.quantity} = $${item.price * item.quantity}`)
      .join('\n');

    const orderDate = new Date().toLocaleDateString('es-MX');

    // Replace variables in vendor template
    const processTemplate = (template: any, variables: Record<string, string>) => {
      let processed = JSON.stringify(template);
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processed = processed.replace(regex, value);
      });
      return JSON.parse(processed);
    };

    const vendorVariables = {
      order_id: requestBody.order_id,
      store_name: tenant.name,
      customer_name: requestBody.customer_name,
      customer_email: requestBody.customer_email,
      customer_phone: requestBody.customer_phone || 'No proporcionado',
      total_amount: requestBody.total_amount.toString(),
      order_items: orderItemsText,
      order_date: orderDate
    };

    const customerVariables = {
      order_id: requestBody.order_id,
      store_name: tenant.name,
      customer_name: requestBody.customer_name,
      total_amount: requestBody.total_amount.toString(),
      order_items: orderItemsText,
      order_date: orderDate
    };

    const processedVendorTemplate = processTemplate(vendorTemplate, vendorVariables);
    const processedCustomerTemplate = processTemplate(customerTemplate, customerVariables);

    // Send vendor notification email
    logStep('Sending vendor email', { to: vendorUser.user.email });
    const vendorEmailResult = await resend.emails.send({
      from: 'Toogo <orders@toogo.store>',
      to: [vendorUser.user.email],
      subject: processedVendorTemplate.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
            <img src="https://herqxhfmsstbteahhxpr.supabase.co/storage/v1/object/public/logos/toogo-logo.png" alt="Toogo" style="height: 40px;">
          </div>
          <div style="padding: 20px;">
            <h2>${processedVendorTemplate.greeting}</h2>
            <p>${processedVendorTemplate.mainMessage}</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${processedVendorTemplate.orderDetails}</pre>
            </div>
            <p>${processedVendorTemplate.footerMessage}</p>
          </div>
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; color: #666;">
            <small>Powered by Toogo - Sistema de tiendas online</small>
          </div>
        </div>
      `,
    });

    // Send customer confirmation email
    logStep('Sending customer email', { to: requestBody.customer_email });
    const customerEmailResult = await resend.emails.send({
      from: `${tenant.name} <orders@toogo.store>`,
      to: [requestBody.customer_email],
      subject: processedCustomerTemplate.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${tenantSettings?.logo_url ? `
            <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
              <img src="${tenantSettings.logo_url}" alt="${tenant.name}" style="height: 60px; max-width: 200px;">
            </div>
          ` : `
            <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
              <h3>${tenant.name}</h3>
            </div>
          `}
          <div style="padding: 20px;">
            <h2>${processedCustomerTemplate.greeting}</h2>
            <p>${processedCustomerTemplate.mainMessage}</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${processedCustomerTemplate.orderDetails}</pre>
            </div>
            <p>${processedCustomerTemplate.footerMessage}</p>
          </div>
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; color: #666;">
            <small>by Toogo</small>
          </div>
        </div>
      `,
    });

    logStep('Emails sent successfully', { 
      vendorEmailId: vendorEmailResult.data?.id,
      customerEmailId: customerEmailResult.data?.id 
    });

    return new Response(JSON.stringify({
      success: true,
      vendor_email_sent: !!vendorEmailResult.data?.id,
      customer_email_sent: !!customerEmailResult.data?.id,
      vendor_email_id: vendorEmailResult.data?.id,
      customer_email_id: customerEmailResult.data?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep('Error in send-order-notifications', error);
    console.error('Error in send-order-notifications function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});