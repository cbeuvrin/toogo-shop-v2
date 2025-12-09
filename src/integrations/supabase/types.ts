export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          target_tenant_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          target_tenant_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          target_tenant_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          link_url: string | null
          sort: number | null
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          sort?: number | null
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          sort?: number | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_auto_generation_settings: {
        Row: {
          auto_publish: boolean | null
          created_at: string
          enabled: boolean | null
          frequency_hours: number | null
          id: string
          notification_email: string | null
          updated_at: string
        }
        Insert: {
          auto_publish?: boolean | null
          created_at?: string
          enabled?: boolean | null
          frequency_hours?: number | null
          id?: string
          notification_email?: string | null
          updated_at?: string
        }
        Update: {
          auto_publish?: boolean | null
          created_at?: string
          enabled?: boolean | null
          frequency_hours?: number | null
          id?: string
          notification_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_images: {
        Row: {
          alt_text: string | null
          blog_post_id: string | null
          caption: string | null
          created_at: string | null
          id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          blog_post_id?: string | null
          caption?: string | null
          created_at?: string | null
          id?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          blog_post_id?: string | null
          caption?: string | null
          created_at?: string | null
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_images_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          seo_analysis: Json | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_score: number | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_analysis?: Json | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_score?: number | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_analysis?: Json | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_score?: number | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      blog_topics_queue: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          generated_at: string | null
          generated_post_id: string | null
          id: string
          keywords: string[] | null
          length: string | null
          status: string | null
          tone: string | null
          topic: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_post_id?: string | null
          id?: string
          keywords?: string[] | null
          length?: string | null
          status?: string | null
          tone?: string | null
          topic: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_post_id?: string | null
          id?: string
          keywords?: string[] | null
          length?: string | null
          status?: string | null
          tone?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_topics_queue_generated_post_id_fkey"
            columns: ["generated_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_requests: {
        Row: {
          can_revert: boolean
          created_at: string
          id: string
          reason: string | null
          requested_at: string
          scheduled_deletion_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          can_revert?: boolean
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_deletion_at: string
          status?: string
          tenant_id: string
        }
        Update: {
          can_revert?: boolean
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          show_on_home: boolean | null
          slug: string
          sort: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          show_on_home?: boolean | null
          slug: string
          sort?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          show_on_home?: boolean | null
          slug?: string
          sort?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_tokens: number
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          system_prompt: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          applied_to: string
          coupon_id: string
          discount_applied: number
          id: string
          tenant_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          applied_to: string
          coupon_id: string
          discount_applied: number
          id?: string
          tenant_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          applied_to?: string
          coupon_id?: string
          discount_applied?: number
          id?: string
          tenant_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_to: string
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_total_uses: number
          max_uses_per_user: number
          updated_at: string
        }
        Insert: {
          applicable_to: string
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_type: string
          discount_value: number
          expires_at: string
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_total_uses: number
          max_uses_per_user?: number
          updated_at?: string
        }
        Update: {
          applicable_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_total_uses?: number
          max_uses_per_user?: number
          updated_at?: string
        }
        Relationships: []
      }
      dashboard2_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard4_settings: {
        Row: {
          created_at: string
          current_step: number | null
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
          wizard_completed: boolean | null
        }
        Insert: {
          created_at?: string
          current_step?: number | null
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
          wizard_completed?: boolean | null
        }
        Update: {
          created_at?: string
          current_step?: number | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
          wizard_completed?: boolean | null
        }
        Relationships: []
      }
      domain_purchases: {
        Row: {
          created_at: string
          dns_check_attempts: number | null
          dns_instructions_sent_at: string | null
          dns_verified_at: string | null
          dns_verified_bool: boolean | null
          domain: string
          id: string
          metadata: Json | null
          openprovider_domain_id: number | null
          openprovider_handle: string | null
          provider: string | null
          sandbox_bool: boolean | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dns_check_attempts?: number | null
          dns_instructions_sent_at?: string | null
          dns_verified_at?: string | null
          dns_verified_bool?: boolean | null
          domain: string
          id?: string
          metadata?: Json | null
          openprovider_domain_id?: number | null
          openprovider_handle?: string | null
          provider?: string | null
          sandbox_bool?: boolean | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dns_check_attempts?: number | null
          dns_instructions_sent_at?: string | null
          dns_verified_at?: string | null
          dns_verified_bool?: boolean | null
          domain?: string
          id?: string
          metadata?: Json | null
          openprovider_domain_id?: number | null
          openprovider_handle?: string | null
          provider?: string | null
          sandbox_bool?: boolean | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_renewals: {
        Row: {
          amount_mxn: number | null
          auto_renew: boolean
          created_at: string
          domain: string
          id: string
          next_renewal_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_mxn?: number | null
          auto_renew?: boolean
          created_at?: string
          domain: string
          id?: string
          next_renewal_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_mxn?: number | null
          auto_renew?: boolean
          created_at?: string
          domain?: string
          id?: string
          next_renewal_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_renewals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_mxn: number
          product_id: string
          qty: number
          sale_price_mxn: number | null
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_mxn: number
          product_id: string
          qty: number
          sale_price_mxn?: number | null
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_mxn?: number
          product_id?: string
          qty?: number
          sale_price_mxn?: number | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_state: string | null
          id: string
          payment_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_ref: string | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_coupon_id: string | null
          store_discount_amount: number | null
          tenant_id: string
          total_mxn: number
          total_usd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          id?: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_ref?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_coupon_id?: string | null
          store_discount_amount?: number | null
          tenant_id: string
          total_mxn: number
          total_usd: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          id?: string
          payment_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          payment_ref?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_coupon_id?: string | null
          store_discount_amount?: number | null
          tenant_id?: string
          total_mxn?: number
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_coupon_id_fkey"
            columns: ["store_coupon_id"]
            isOneToOne: false
            referencedRelation: "tenant_store_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_orders: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          order_type: string
          payment_provider: string | null
          payment_ref: string | null
          status: string
          tenant_id: string | null
          total_mxn: number
          total_usd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          order_type: string
          payment_provider?: string | null
          payment_ref?: string | null
          status?: string
          tenant_id?: string | null
          total_mxn?: number
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          order_type?: string
          payment_provider?: string | null
          payment_ref?: string | null
          status?: string
          tenant_id?: string | null
          total_mxn?: number
          total_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort: number | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort?: number | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variable_assignments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          product_id: string
          variable_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id: string
          variable_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string
          variable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variable_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variable_assignments_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "product_variables"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variable_values: {
        Row: {
          created_at: string
          id: string
          sort_order: number | null
          value: string
          variable_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number | null
          value: string
          variable_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number | null
          value?: string
          variable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variable_values_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "product_variables"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variables: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean | null
          name: string
          sort_order: number | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean | null
          name: string
          sort_order?: number | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean | null
          name?: string
          sort_order?: number | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          combination: Json
          created_at: string
          id: string
          price_modifier: number | null
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          combination?: Json
          created_at?: string
          id?: string
          price_modifier?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          combination?: Json
          created_at?: string
          id?: string
          price_modifier?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          price_mxn: number
          product_type: string | null
          sale_price_mxn: number | null
          sku: string | null
          status: string | null
          stock: number | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          price_mxn: number
          product_type?: string | null
          sale_price_mxn?: number | null
          sku?: string | null
          status?: string | null
          stock?: number | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          price_mxn?: number
          product_type?: string | null
          sale_price_mxn?: number | null
          sku?: string | null
          status?: string | null
          stock?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_realtime: {
        Row: {
          connected_at: string
          country: string | null
          device: string | null
          disconnected_at: string | null
          id: string
          region: string | null
          state: string | null
          tenant_id: string
          user_label: string | null
        }
        Insert: {
          connected_at?: string
          country?: string | null
          device?: string | null
          disconnected_at?: string | null
          id?: string
          region?: string | null
          state?: string | null
          tenant_id: string
          user_label?: string | null
        }
        Update: {
          connected_at?: string
          country?: string | null
          device?: string | null
          disconnected_at?: string | null
          id?: string
          region?: string | null
          state?: string | null
          tenant_id?: string
          user_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_realtime_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_mxn: number
          created_at: string
          id: string
          mercadopago_subscription_id: string | null
          next_billing_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_mxn?: number
          created_at?: string
          id?: string
          mercadopago_subscription_id?: string | null
          next_billing_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_mxn?: number
          created_at?: string
          id?: string
          mercadopago_subscription_id?: string | null
          next_billing_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tenant_coupon_usage: {
        Row: {
          coupon_id: string
          discount_applied: number
          id: string
          order_id: string | null
          tenant_id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          discount_applied: number
          id?: string
          order_id?: string | null
          tenant_id: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          tenant_id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "tenant_store_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_coupon_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          custom_email_template_customer: Json | null
          exchange_rate_mode: string | null
          exchange_rate_value: number | null
          fb_pixel: string | null
          footer_bg_color: string | null
          footer_icon_color: string | null
          footer_icon_scale: number | null
          ga4_id: string | null
          header_icon_color: string | null
          header_icon_scale: number | null
          id: string
          logo_size: number | null
          logo_url: string | null
          mercadopago_public_key: string | null
          navbar_bg_color: string | null
          paypal_client_id: string | null
          primary_color: string | null
          product_card_bg_color: string | null
          product_card_hover_color: string | null
          secondary_color: string | null
          share_description: string | null
          share_image_url: string | null
          share_title: string | null
          shipping_enabled: boolean | null
          shipping_flat_rate: number | null
          shipping_minimum_amount: number | null
          shipping_type: string | null
          shipping_zones_config: Json | null
          shipping_zones_enabled: boolean | null
          store_background_color: string | null
          tenant_id: string
          updated_at: string
          whatsapp_message: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          custom_email_template_customer?: Json | null
          exchange_rate_mode?: string | null
          exchange_rate_value?: number | null
          fb_pixel?: string | null
          footer_bg_color?: string | null
          footer_icon_color?: string | null
          footer_icon_scale?: number | null
          ga4_id?: string | null
          header_icon_color?: string | null
          header_icon_scale?: number | null
          id?: string
          logo_size?: number | null
          logo_url?: string | null
          mercadopago_public_key?: string | null
          navbar_bg_color?: string | null
          paypal_client_id?: string | null
          primary_color?: string | null
          product_card_bg_color?: string | null
          product_card_hover_color?: string | null
          secondary_color?: string | null
          share_description?: string | null
          share_image_url?: string | null
          share_title?: string | null
          shipping_enabled?: boolean | null
          shipping_flat_rate?: number | null
          shipping_minimum_amount?: number | null
          shipping_type?: string | null
          shipping_zones_config?: Json | null
          shipping_zones_enabled?: boolean | null
          store_background_color?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          custom_email_template_customer?: Json | null
          exchange_rate_mode?: string | null
          exchange_rate_value?: number | null
          fb_pixel?: string | null
          footer_bg_color?: string | null
          footer_icon_color?: string | null
          footer_icon_scale?: number | null
          ga4_id?: string | null
          header_icon_color?: string | null
          header_icon_scale?: number | null
          id?: string
          logo_size?: number | null
          logo_url?: string | null
          mercadopago_public_key?: string | null
          navbar_bg_color?: string | null
          paypal_client_id?: string | null
          primary_color?: string | null
          product_card_bg_color?: string | null
          product_card_hover_color?: string | null
          secondary_color?: string | null
          share_description?: string | null
          share_image_url?: string | null
          share_title?: string | null
          shipping_enabled?: boolean | null
          shipping_flat_rate?: number | null
          shipping_minimum_amount?: number | null
          shipping_type?: string | null
          shipping_zones_config?: Json | null
          shipping_zones_enabled?: boolean | null
          store_background_color?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_message?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_store_coupons: {
        Row: {
          applies_to_all_products: boolean | null
          applies_to_categories: Json | null
          applies_to_products: Json | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_total_uses: number | null
          max_uses_per_user: number | null
          minimum_purchase_amount: number | null
          name: string
          starts_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          applies_to_all_products?: boolean | null
          applies_to_categories?: Json | null
          applies_to_products?: Json | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_total_uses?: number | null
          max_uses_per_user?: number | null
          minimum_purchase_amount?: number | null
          name: string
          starts_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          applies_to_all_products?: boolean | null
          applies_to_categories?: Json | null
          applies_to_products?: Json | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_total_uses?: number | null
          max_uses_per_user?: number | null
          minimum_purchase_amount?: number | null
          name?: string
          starts_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_store_coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          extra_hosts: string[] | null
          id: string
          name: string
          owner_user_id: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          primary_host: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra_hosts?: string[] | null
          id?: string
          name: string
          owner_user_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          primary_host: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra_hosts?: string[] | null
          id?: string
          name?: string
          owner_user_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          primary_host?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          created_at: string
          id: string
          step_1_logo: boolean | null
          step_2_products: boolean | null
          step_3_branding: boolean | null
          step_4_payments: boolean | null
          step_5_confirmed: boolean | null
          step_5_publish: boolean | null
          tenant_id: string
          total_progress: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          step_1_logo?: boolean | null
          step_2_products?: boolean | null
          step_3_branding?: boolean | null
          step_4_payments?: boolean | null
          step_5_confirmed?: boolean | null
          step_5_publish?: boolean | null
          tenant_id: string
          total_progress?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          step_1_logo?: boolean | null
          step_2_products?: boolean | null
          step_3_branding?: boolean | null
          step_4_payments?: boolean | null
          step_5_confirmed?: boolean | null
          step_5_publish?: boolean | null
          tenant_id?: string
          total_progress?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      visual_editor_data: {
        Row: {
          created_at: string
          data: Json
          element_id: string
          element_type: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          element_id: string
          element_type: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          element_id?: string
          element_type?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          id: string
          payload_json: Json
          processed_bool: boolean | null
          provider: string
          received_at: string
          tenant_id: string | null
          type: string
        }
        Insert: {
          id?: string
          payload_json: Json
          processed_bool?: boolean | null
          provider: string
          received_at?: string
          tenant_id?: string | null
          type: string
        }
        Update: {
          id?: string
          payload_json?: Json
          processed_bool?: boolean | null
          provider?: string
          received_at?: string
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          customer_phone: string
          id: string
          last_message_at: string | null
          started_at: string | null
          status: string | null
          tenant_id: string
          whatsapp_user_id: string
        }
        Insert: {
          customer_phone: string
          id?: string
          last_message_at?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id: string
          whatsapp_user_id: string
        }
        Update: {
          customer_phone?: string
          id?: string
          last_message_at?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          whatsapp_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_user_id_fkey"
            columns: ["whatsapp_user_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          audio_url: string | null
          content: string | null
          conversation_id: string
          created_at: string | null
          direction: string
          id: string
          image_url: string | null
          message_type: string
          meta_message_id: string | null
          processed_at: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          direction: string
          id?: string
          image_url?: string | null
          message_type: string
          meta_message_id?: string | null
          processed_at?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          direction?: string
          id?: string
          image_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          phone_number: string
          tenant_id: string
          updated_at: string | null
          verification_code: string | null
          verification_expires_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          phone_number: string
          tenant_id: string
          updated_at?: string | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          phone_number?: string
          tenant_id?: string
          updated_at?: string | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_metrics: {
        Args: never
        Returns: {
          basic_tenants: number
          free_tenants: number
          new_users_24h: number
          new_users_30d: number
          new_users_7d: number
          premium_tenants: number
          total_revenue: number
          total_tenant_sales: number
          total_tenants: number
          total_users: number
        }[]
      }
      get_product_variables: {
        Args: { product_id_param: string }
        Returns: {
          id: string
          is_required: boolean
          name: string
          type: string
          variable_values: Json
        }[]
      }
      get_product_variations_with_details: {
        Args: { product_id_param: string }
        Returns: {
          combination: Json
          id: string
          price_modifier: number
          product_id: string
          sku: string
          stock: number
          variable_names: Json
        }[]
      }
      get_public_store_data: { Args: { p_host: string }; Returns: Json }
      get_public_store_data_demo: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_tenant_analytics: {
        Args: never
        Returns: {
          created_at: string
          owner_email: string
          plan: Database["public"]["Enums"]["plan_type"]
          primary_host: string
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          tenant_name: string
          total_orders: number
          total_products: number
          total_revenue_usd: number
        }[]
      }
      get_tenant_by_host: {
        Args: { p_host: string }
        Returns: {
          extra_hosts: string[]
          id: string
          name: string
          plan: Database["public"]["Enums"]["plan_type"]
          primary_host: string
          status: Database["public"]["Enums"]["tenant_status"]
        }[]
      }
      get_tenant_payment_display_config: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_tenant_payment_settings: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_user_analytics: {
        Args: {
          filter_plan?: Database["public"]["Enums"]["plan_type"]
          filter_role?: Database["public"]["Enums"]["app_role"]
          limit_count?: number
          offset_count?: number
          search_email?: string
        }
        Returns: {
          email: string
          first_name: string
          last_name: string
          last_sign_in_at: string
          plan: Database["public"]["Enums"]["plan_type"]
          registered_at: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          tenant_name: string
          tenant_status: Database["public"]["Enums"]["tenant_status"]
          total_orders: number
          total_products: number
          total_revenue_usd: number
          user_id: string
          username: string
          whatsapp: string
        }[]
      }
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_description?: string
          p_metadata?: Json
          p_target_tenant_id?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      sync_visual_editor_products_to_products: {
        Args: never
        Returns: undefined
      }
      upsert_product_variations: {
        Args: { p_product_id: string; p_variations: Json }
        Returns: Json
      }
      user_can_access_order: {
        Args: { _order: Record<string, unknown>; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "tenant_admin" | "tenant_staff"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
      payment_provider: "mercadopago" | "paypal" | "whatsapp"
      plan_type: "free" | "basic" | "premium"
      tenant_status: "pending" | "active" | "suspended" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadmin", "tenant_admin", "tenant_staff"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
      payment_provider: ["mercadopago", "paypal", "whatsapp"],
      plan_type: ["free", "basic", "premium"],
      tenant_status: ["pending", "active", "suspended", "cancelled"],
    },
  },
} as const
