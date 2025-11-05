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
          credits: number
          created_at: string
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
          credits?: number
          created_at?: string
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
          credits?: number
          created_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          agent_id: string
          title: string
          description: string
          price: number | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          bedrooms: number | null
          bathrooms: number | null
          sqft: number | null
          property_type: string | null
          photos: string[] | null
          audio_url: string | null
          status: string
          views: number
          slug: string
          created_at: string
          updated_at: string
          listing_type: string | null
          latitude: number | null
          longitude: number | null
          plus_code: string | null
          show_map: boolean
        }
        Insert: {
          id?: string
          agent_id: string
          title: string
          description: string
          price?: number | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          sqft?: number | null
          property_type?: string | null
          photos?: string[] | null
          audio_url?: string | null
          status?: string
          views?: number
          slug: string
          created_at?: string
          updated_at?: string
          listing_type?: string | null
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
          show_map?: boolean
        }
        Update: {
          id?: string
          agent_id?: string
          title?: string
          description?: string
          price?: number | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          sqft?: number | null
          property_type?: string | null
          photos?: string[] | null
          audio_url?: string | null
          status?: string
          views?: number
          slug?: string
          created_at?: string
          updated_at?: string
          listing_type?: string | null
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
          show_map?: boolean
        }
      }
      purchases: {
        Row: {
          id: string
          agent_id: string
          pack_type: string
          credits_purchased: number
          amount_paid: number
          paypal_order_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          pack_type: string
          credits_purchased: number
          amount_paid: number
          paypal_order_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          pack_type?: string
          credits_purchased?: number
          amount_paid?: number
          paypal_order_id?: string | null
          status?: string
          created_at?: string
        }
      }
    }
  }
}