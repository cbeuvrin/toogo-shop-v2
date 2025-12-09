import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@2.0.15"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { 
      masterTenantId, 
      newTenantName, 
      buyerUserId, 
      primaryHost,
      couponId,
      discountAmount
    } = await req.json()

    console.log('Cloning store for:', { 
      masterTenantId, 
      newTenantName, 
      buyerUserId, 
      primaryHost,
      couponId,
      discountAmount
    })

    // 1. Create new tenant
    const { data: newTenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        name: newTenantName,
        primary_host: primaryHost,
        owner_user_id: buyerUserId,
        plan: 'basic',
        status: 'active'
      })
      .select()
      .single()

    if (tenantError) {
      throw new Error(`Error creating tenant: ${tenantError.message}`)
    }

    const newTenantId = newTenant.id

    // 2. Assign buyer as tenant admin
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: buyerUserId,
        tenant_id: newTenantId,
        role: 'tenant_admin'
      })

    if (roleError) {
      throw new Error(`Error assigning role: ${roleError.message}`)
    }

    // 2.5 Create Mercado Pago Preapproval (Recurring Subscription)
    console.log('Creating Mercado Pago Preapproval for tenant:', newTenantId)
    
    const subscriptionAmount = 299 // Plan mensual básico
    const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    
    let preapprovalId = null
    
    if (mercadopagoToken) {
      try {
        // Get user email for the preapproval
        const { data: userData } = await supabaseClient.auth.admin.getUserById(buyerUserId)
        
        // Create preapproval using SDK
        const client = new MercadoPagoConfig({ 
          accessToken: mercadopagoToken,
          options: { timeout: 5000 }
        });
        const preapprovalClient = new PreApproval(client);

        const preapproval = await preapprovalClient.create({
          body: {
            reason: 'Plan Pro Mensual - Toogo',
            payer_email: userData?.user?.email || '',
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: subscriptionAmount,
              currency_id: 'MXN',
              start_date: new Date().toISOString(),
              end_date: null
            },
            back_url: `${Deno.env.get('SUPABASE_URL')?.replace('/functions/v1', '') || 'https://herqxhfmsstbteahhxpr.supabase.co'}/auth/v1/callback`,
            external_reference: `tenant_${newTenantId}_subscription`,
            notification_url: 'https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/mercadopago-webhook',
            status: 'pending'
          }
        });

        preapprovalId = preapproval.id
        console.log('✅ Mercado Pago Preapproval created:', preapprovalId)
        console.log('📧 User must authorize at:', preapproval.init_point)
      } catch (error) {
        console.error('❌ Error creating Preapproval:', error)
      }
    }

    // 2.6 Create subscription record in database
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .insert({
        tenant_id: newTenantId,
        status: preapprovalId ? 'pending' : 'active', // pending si hay preapproval, active si no
        next_billing_date: nextBillingDate.toISOString(),
        amount_mxn: subscriptionAmount,
        mercadopago_subscription_id: preapprovalId
      })

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
    } else {
      console.log('✅ Subscription record created')
    }

    // 2.7 Apply coupon if provided
    if (couponId && discountAmount) {
      console.log('Applying coupon:', { couponId, discountAmount })
      
      const { error: couponError } = await supabaseClient.functions.invoke('apply-coupon', {
        body: {
          couponId,
          userId: buyerUserId,
          tenantId: newTenantId,
          discountApplied: discountAmount,
          appliedTo: 'membership'
        }
      })

      if (couponError) {
        console.error('Error applying coupon:', couponError)
        // No lanzamos error, solo loggeamos para auditoria
      } else {
        console.log('✅ Coupon applied successfully')
      }
    }

    // 3. Clone products
    const { data: masterProducts, error: productsError } = await supabaseClient
      .from('products')
      .select(`
        *,
        product_images(*),
        product_categories(category_id),
        product_variations(*)
      `)
      .eq('tenant_id', masterTenantId)

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`)
    }

    // Clone each product
    for (const product of masterProducts || []) {
      const { data: newProduct, error: newProductError } = await supabaseClient
        .from('products')
        .insert({
          tenant_id: newTenantId,
          title: product.title,
          description: product.description,
          price_mxn: product.price_mxn,
          sale_price_mxn: product.sale_price_mxn,
          stock: product.stock,
          status: product.status,
          product_type: product.product_type,
          features: product.features,
          sku: product.sku
        })
        .select()
        .single()

      if (newProductError) {
        console.error('Error cloning product:', newProductError)
        continue
      }

      // Clone product images
      for (const image of product.product_images || []) {
        await supabaseClient
          .from('product_images')
          .insert({
            product_id: newProduct.id,
            url: image.url,
            sort: image.sort
          })
      }

      // Clone product variations
      for (const variation of product.product_variations || []) {
        await supabaseClient
          .from('product_variations')
          .insert({
            product_id: newProduct.id,
            combination: variation.combination,
            stock: variation.stock,
            price_modifier: variation.price_modifier,
            sku: variation.sku
          })
      }
    }

    // 4. Clone categories
    const { data: masterCategories, error: categoriesError } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('tenant_id', masterTenantId)

    if (categoriesError) {
      throw new Error(`Error fetching categories: ${categoriesError.message}`)
    }

    const categoryMapping: { [key: string]: string } = {}

    for (const category of masterCategories || []) {
      const { data: newCategory, error: newCategoryError } = await supabaseClient
        .from('categories')
        .insert({
          tenant_id: newTenantId,
          name: category.name,
          slug: category.slug,
          show_on_home: category.show_on_home,
          sort: category.sort
        })
        .select()
        .single()

      if (newCategoryError) {
        console.error('Error cloning category:', newCategoryError)
        continue
      }

      categoryMapping[category.id] = newCategory.id
    }

    // 5. Clone product variables
    const { data: masterVariables, error: variablesError } = await supabaseClient
      .from('product_variables')
      .select(`
        *,
        product_variable_values(*)
      `)
      .eq('tenant_id', masterTenantId)

    if (variablesError) {
      throw new Error(`Error fetching variables: ${variablesError.message}`)
    }

    for (const variable of masterVariables || []) {
      const { data: newVariable, error: newVariableError } = await supabaseClient
        .from('product_variables')
        .insert({
          tenant_id: newTenantId,
          name: variable.name,
          type: variable.type,
          is_required: variable.is_required,
          sort_order: variable.sort_order
        })
        .select()
        .single()

      if (newVariableError) {
        console.error('Error cloning variable:', newVariableError)
        continue
      }

      // Clone variable values
      for (const value of variable.product_variable_values || []) {
        await supabaseClient
          .from('product_variable_values')
          .insert({
            variable_id: newVariable.id,
            value: value.value,
            sort_order: value.sort_order
          })
      }
    }

    // 6. Clone tenant settings
    const { data: masterSettings, error: settingsError } = await supabaseClient
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', masterTenantId)
      .single()

    if (!settingsError && masterSettings) {
      await supabaseClient
        .from('tenant_settings')
        .insert({
          tenant_id: newTenantId,
          logo_url: masterSettings.logo_url,
          primary_color: masterSettings.primary_color,
          secondary_color: masterSettings.secondary_color,
          exchange_rate_mode: masterSettings.exchange_rate_mode,
          exchange_rate_value: masterSettings.exchange_rate_value
        })
    }

    // 7. Clone banners
    const { data: masterBanners, error: bannersError } = await supabaseClient
      .from('banners')
      .select('*')
      .eq('tenant_id', masterTenantId)

    if (!bannersError && masterBanners) {
      for (const banner of masterBanners) {
        await supabaseClient
          .from('banners')
          .insert({
            tenant_id: newTenantId,
            title: banner.title,
            description: banner.description,
            image_url: banner.image_url,
            link_url: banner.link_url,
            sort: banner.sort,
            active: banner.active
          })
      }
    }

    console.log('Store cloned successfully:', {
      newTenantId,
      clonedProducts: masterProducts?.length || 0,
      clonedCategories: masterCategories?.length || 0,
      clonedVariables: masterVariables?.length || 0
    })

    return new Response(
      JSON.stringify({
        success: true,
        newTenantId,
        message: 'Store cloned successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})