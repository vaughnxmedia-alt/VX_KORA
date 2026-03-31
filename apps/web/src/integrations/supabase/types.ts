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
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          excerpt: string | null
          gallery_image_urls: Json | null
          icon_name: string | null
          id: string
          is_featured: boolean | null
          is_hidden: boolean
          is_hot_topic: boolean | null
          published_at: string | null
          published_date: string | null
          read_time: string | null
          slug: string | null
          status: string | null
          tagline: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          video_type: string | null
          video_url: string | null
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          excerpt?: string | null
          gallery_image_urls?: Json | null
          icon_name?: string | null
          id?: string
          is_featured?: boolean | null
          is_hidden?: boolean
          is_hot_topic?: boolean | null
          published_at?: string | null
          published_date?: string | null
          read_time?: string | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          excerpt?: string | null
          gallery_image_urls?: Json | null
          icon_name?: string | null
          id?: string
          is_featured?: boolean | null
          is_hidden?: boolean
          is_hot_topic?: boolean | null
          published_at?: string | null
          published_date?: string | null
          read_time?: string | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      brand_blueprints: {
        Row: {
          brand_gaps: string | null
          brand_personality: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          problem_statement: string | null
          six_month_vision: string | null
          status: string | null
          submitted_at: string | null
          target_audience: string | null
        }
        Insert: {
          brand_gaps?: string | null
          brand_personality?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          problem_statement?: string | null
          six_month_vision?: string | null
          status?: string | null
          submitted_at?: string | null
          target_audience?: string | null
        }
        Update: {
          brand_gaps?: string | null
          brand_personality?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          problem_statement?: string | null
          six_month_vision?: string | null
          status?: string | null
          submitted_at?: string | null
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_blueprints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendars: {
        Row: {
          calendar_type: string
          created_at: string
          customer_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          calendar_type?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          calendar_type?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_name: string | null
          client_status: Database["public"]["Enums"]["client_status"] | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          social_media_links: Json | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          business_name?: string | null
          client_status?: Database["public"]["Enums"]["client_status"] | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          social_media_links?: Json | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string | null
          client_status?: Database["public"]["Enums"]["client_status"] | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          social_media_links?: Json | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          location: string | null
          registration_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          location?: string | null
          registration_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          location?: string | null
          registration_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      JKPRusers: {
        Row: {
          created_at: string
          email: string
          "First Name": string
          id: number
          "Last Name": string
          "Phone Number": number | null
        }
        Insert: {
          created_at?: string
          email: string
          "First Name": string
          id?: number
          "Last Name": string
          "Phone Number"?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          "First Name"?: string
          id?: number
          "Last Name"?: string
          "Phone Number"?: number | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          additional_notes: string | null
          admin_confirmed_at: string | null
          booking_kind: string
          booking_status: string | null
          business_name: string | null
          confirmation_status: string | null
          created_at: string | null
          created_by: string | null
          current_challenge: string | null
          customer_id: string | null
          description: string | null
          duration_minutes: number | null
          email: string | null
          employee_reference_code: string | null
          full_name: string | null
          host_user_id: string | null
          id: string
          industry: string | null
          in_person_location: string | null
          internal_notes: string | null
          meeting_date: string
          offer_summary: string | null
          payment_status: string | null
          payment_transaction_id: string | null
          phone: string | null
          questionnaire_status: string | null
          service_name: string | null
          service_price: number | null
          session_goal: string | null
          session_type: string | null
          status: string | null
          target_audience: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          website_or_social: string | null
        }
        Insert: {
          additional_notes?: string | null
          admin_confirmed_at?: string | null
          booking_kind?: string
          booking_status?: string | null
          business_name?: string | null
          confirmation_status?: string | null
          created_at?: string | null
          created_by?: string | null
          current_challenge?: string | null
          customer_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          email?: string | null
          employee_reference_code?: string | null
          full_name?: string | null
          host_user_id?: string | null
          id?: string
          industry?: string | null
          in_person_location?: string | null
          internal_notes?: string | null
          meeting_date: string
          offer_summary?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          phone?: string | null
          questionnaire_status?: string | null
          service_name?: string | null
          service_price?: number | null
          session_goal?: string | null
          session_type?: string | null
          status?: string | null
          target_audience?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          website_or_social?: string | null
        }
        Update: {
          additional_notes?: string | null
          admin_confirmed_at?: string | null
          booking_kind?: string
          booking_status?: string | null
          business_name?: string | null
          confirmation_status?: string | null
          created_at?: string | null
          created_by?: string | null
          current_challenge?: string | null
          customer_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          email?: string | null
          employee_reference_code?: string | null
          full_name?: string | null
          host_user_id?: string | null
          id?: string
          industry?: string | null
          in_person_location?: string | null
          internal_notes?: string | null
          meeting_date?: string
          offer_summary?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          phone?: string | null
          questionnaire_status?: string | null
          service_name?: string | null
          service_price?: number | null
          session_goal?: string | null
          session_type?: string | null
          status?: string | null
          target_audience?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          website_or_social?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          created_at: string
          currency: string
          external_payment_id: string
          id: string
          idempotency_key: string | null
          meeting_id: string | null
          provider: string
          raw_status: string | null
          square_location_id: string | null
        }
        Insert: {
          amount_cents: number
          buyer_email?: string | null
          created_at?: string
          currency?: string
          external_payment_id: string
          id?: string
          idempotency_key?: string | null
          meeting_id?: string | null
          provider?: string
          raw_status?: string | null
          square_location_id?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          created_at?: string
          currency?: string
          external_payment_id?: string
          id?: string
          idempotency_key?: string | null
          meeting_id?: string | null
          provider?: string
          raw_status?: string | null
          square_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          calendar_id: string
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          media_urls: string[] | null
          platform_settings: Json | null
          platforms: string[]
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          platform_settings?: Json | null
          platforms?: string[]
          scheduled_date: string
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_urls?: string[] | null
          platform_settings?: Json | null
          platforms?: string[]
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "content_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_session_hosts: {
        Row: {
          active: boolean
          can_view_all_meetings: boolean
          created_at: string
          display_name: string
          id: string
          is_default_public: boolean
          list_subtitle: string | null
          reference_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          can_view_all_meetings?: boolean
          created_at?: string
          display_name: string
          id?: string
          is_default_public?: boolean
          list_subtitle?: string | null
          reference_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          can_view_all_meetings?: boolean
          created_at?: string
          display_name?: string
          id?: string
          is_default_public?: boolean
          list_subtitle?: string | null
          reference_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategy_session_host_schedule: {
        Row: {
          active: boolean
          created_at: string
          day_end: string
          day_start: string
          host_user_id: string
          slot_duration_minutes: number
          timezone: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_end?: string
          day_start?: string
          host_user_id: string
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          created_at?: string
          day_end?: string
          day_start?: string
          host_user_id?: string
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      strategy_session_schedule_block: {
        Row: {
          block_date: string
          created_at: string
          host_user_id: string
          id: string
        }
        Insert: {
          block_date: string
          created_at?: string
          host_user_id: string
          id?: string
        }
        Update: {
          block_date?: string
          created_at?: string
          host_user_id?: string
          id?: string
        }
        Relationships: []
      }
      strategy_session_schedule_override: {
        Row: {
          host_user_id: string
          id: string
          is_closed: boolean
          on_date: string
          time_windows: Json | null
        }
        Insert: {
          host_user_id: string
          id?: string
          is_closed?: boolean
          on_date: string
          time_windows?: Json | null
        }
        Update: {
          host_user_id?: string
          id?: string
          is_closed?: boolean
          on_date?: string
          time_windows?: Json | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          access_token: string | null
          created_at: string
          email: string
          email_sent: boolean
          id: string
          name: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email: string
          email_sent?: boolean
          id?: string
          name: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      outbound_email_logs: {
        Row: {
          approved_by_user_id: string | null
          body_html: string | null
          body_text: string | null
          channel: string
          created_at: string
          customer_id: string | null
          error_message: string | null
          from_email: string
          generated_by: string
          id: string
          message_type: string
          provider_message_id: string | null
          related_id: string | null
          related_table: string | null
          status: string
          subject: string
          subscriber_id: string | null
          to_email: string
        }
        Insert: {
          approved_by_user_id?: string | null
          body_html?: string | null
          body_text?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          from_email: string
          generated_by?: string
          id?: string
          message_type: string
          provider_message_id?: string | null
          related_id?: string | null
          related_table?: string | null
          status?: string
          subject: string
          subscriber_id?: string | null
          to_email: string
        }
        Update: {
          approved_by_user_id?: string | null
          body_html?: string | null
          body_text?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          from_email?: string
          generated_by?: string
          id?: string
          message_type?: string
          provider_message_id?: string | null
          related_id?: string | null
          related_table?: string | null
          status?: string
          subject?: string
          subscriber_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_email_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_email_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tab_permissions: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          tab_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          tab_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          tab_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { p_user_id: string }; Returns: string }
      increment_view_count: { Args: { post_id: string }; Returns: undefined }
    }
    Enums: {
      client_status:
        | "lead_captured"
        | "meeting_scheduled"
        | "contract_sent"
        | "second_meeting"
        | "strategy_session_pending"
        | "active_client"
        | "inactive"
      user_role: "admin" | "author" | "client"
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
      client_status: [
        "lead_captured",
        "meeting_scheduled",
        "contract_sent",
        "second_meeting",
        "strategy_session_pending",
        "active_client",
        "inactive",
      ],
      user_role: ["admin", "author", "client"],
    },
  },
} as const
