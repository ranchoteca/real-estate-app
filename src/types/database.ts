export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          email: string
          name: string | null
          google_id: string | null
          username: string | null
          full_name: string | null
          phone: string | null
          brokerage: string | null
          license_number: string | null
          bio: string | null
          profile_photo: string | null
          credits: number | null
          created_at: string | null
          plan: string | null
          properties_this_month: number | null
          plan_started_at: string | null
          paypal_subscription_id: string | null
          watermark_logo: string | null
          watermark_position: string | null
          watermark_size: string | null
          facebook_page_id: string | null
          facebook_page_name: string | null
          facebook_access_token: string | null
          facebook_connected_at: string | null
          fb_ai_enabled: boolean | null
          fb_brand_color_primary: string | null
          fb_brand_color_secondary: string | null
          fb_template: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          google_id?: string | null
          username?: string | null
          full_name?: string | null
          phone?: string | null
          brokerage?: string | null
          license_number?: string | null
          bio?: string | null
          profile_photo?: string | null
          credits?: number | null
          created_at?: string
          plan?: string | null
          properties_this_month?: number | null
          plan_started_at?: string | null
          paypal_subscription_id?: string | null
          watermark_logo?: string | null
          watermark_position?: string | null
          watermark_size?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_access_token?: string | null
          facebook_connected_at?: string | null
          fb_ai_enabled?: boolean | null
          fb_brand_color_primary?: string | null
          fb_brand_color_secondary?: string | null
          fb_template?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          google_id?: string | null
          username?: string | null
          full_name?: string | null
          phone?: string | null
          brokerage?: string | null
          license_number?: string | null
          bio?: string | null
          profile_photo?: string | null
          credits?: number | null
          created_at?: string
          plan?: string | null
          properties_this_month?: number | null
          plan_started_at?: string | null
          paypal_subscription_id?: string | null
          watermark_logo?: string | null
          watermark_position?: string | null
          watermark_size?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          facebook_access_token?: string | null
          facebook_connected_at?: string | null
          fb_ai_enabled?: boolean | null
          fb_brand_color_primary?: string | null
          fb_brand_color_secondary?: string | null
          fb_template?: string | null
        }
      }
      properties: {
        Row: {
          id: string
          agent_id: string | null
          title: string
          description: string
          price: number | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          property_type: string | null
          photos: string[] | null
          audio_url: string | null
          status: string | null
          views: number | null
          slug: string
          created_at: string | null
          updated_at: string | null
          listing_type: string | null
          latitude: number | null
          longitude: number | null
          show_map: boolean | null
          currency_id: string | null
          custom_fields_data: Json | null
          plus_code: string | null
          location?: string | null // Campo auxiliar para compatibilidad
        }
        Insert: {
          id?: string
          agent_id?: string | null
          title: string
          description: string
          price?: number | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          property_type?: string | null
          photos?: string[] | null
          audio_url?: string | null
          status?: string | null
          views?: number | null
          slug: string
          created_at?: string
          updated_at?: string
          listing_type?: string | null
          latitude?: number | null
          longitude?: number | null
          show_map?: boolean | null
          currency_id?: string | null
          custom_fields_data?: Json | null
          plus_code?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          title?: string
          description?: string
          price?: number | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          property_type?: string | null
          photos?: string[] | null
          audio_url?: string | null
          status?: string | null
          views?: number | null
          slug?: string
          created_at?: string
          updated_at?: string
          listing_type?: string | null
          latitude?: number | null
          longitude?: number | null
          show_map?: boolean | null
          currency_id?: string | null
          custom_fields_data?: Json | null
          plus_code?: string | null
        }
      }
      purchases: {
        Row: {
          id: string
          agent_id: string | null
          pack_type: string
          credits_purchased: number
          amount_paid: number
          paypal_order_id: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          pack_type: string
          credits_purchased: number
          amount_paid: number
          paypal_order_id?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          pack_type?: string
          credits_purchased?: number
          amount_paid?: number
          paypal_order_id?: string | null
          status?: string | null
          created_at?: string
        }
      }
      facebook_posts: {
        Row: {
          id: string
          property_id: string | null
          agent_id: string | null
          facebook_post_id: string
          flyer_url: string | null
          published_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          property_id?: string | null
          agent_id?: string | null
          facebook_post_id: string
          flyer_url?: string | null
          published_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          agent_id?: string | null
          facebook_post_id?: string
          flyer_url?: string | null
          published_at?: string | null
          created_at?: string
        }
      }
      custom_fields: {
        Row: {
          id: string
          agent_id: string | null
          property_type: string
          listing_type: string
          field_name: string
          field_name_en: string | null
          field_type: string
          field_key: string
          placeholder: string | null
          icon: string | null
          display_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          property_type: string
          listing_type: string
          field_name: string
          field_name_en?: string | null
          field_type: string
          field_key: string
          placeholder?: string | null
          icon?: string | null
          display_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          property_type?: string
          listing_type?: string
          field_name?: string
          field_name_en?: string | null
          field_type?: string
          field_key?: string
          placeholder?: string | null
          icon?: string | null
          display_order?: number | null
          created_at?: string
        }
      }
      upload_tokens: {
        Row: {
          id: string
          agent_id: string
          token: string
          expires_at: string
          created_at: string
          used_count: number
          max_uses: number
          is_active: boolean
        }
        Insert: {
          id?: string
          agent_id: string
          token: string
          expires_at: string
          created_at?: string
          used_count?: number
          max_uses?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          agent_id?: string
          token?: string
          expires_at?: string
          created_at?: string
          used_count?: number
          max_uses?: number
          is_active?: boolean
        }
      }
    }
  }
}