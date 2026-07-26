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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_members: {
        Row: {
          added_at: string
          contact_id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          list_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      contact_view_preferences: {
        Row: {
          config: Json
          updated_at: string
          user_id: string
          view_key: string
        }
        Insert: {
          config?: Json
          updated_at?: string
          user_id?: string
          view_key: string
        }
        Update: {
          config?: Json
          updated_at?: string
          user_id?: string
          view_key?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          custom_fields: Json
          email: string | null
          id: string
          name: string
          phone: string | null
          score: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          score?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          score?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          entity: string
          field_type: string
          group_id: string | null
          id: string
          is_required: boolean
          key: string
          label: string
          options: Json | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          entity?: string
          field_type: string
          group_id?: string | null
          id?: string
          is_required?: boolean
          key: string
          label: string
          options?: Json | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          entity?: string
          field_type?: string
          group_id?: string | null
          id?: string
          is_required?: boolean
          key?: string
          label?: string
          options?: Json | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "custom_field_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_groups: {
        Row: {
          created_at: string
          entity: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          entity?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          entity?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          id: string
          sort_order: number
          title: string
          user_id: string
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          user_id?: string
          widget_type?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          user_id?: string
          widget_type?: string
        }
        Relationships: []
      }
      deal_stage_history: {
        Row: {
          deal_id: string
          entered_at: string
          id: string
          stage_id: string
        }
        Insert: {
          deal_id: string
          entered_at?: string
          id?: string
          stage_id: string
        }
        Update: {
          deal_id?: string
          entered_at?: string
          id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          contact_id: string | null
          created_at: string
          custom_fields: Json
          expected_close_date: string | null
          id: string
          pipeline_id: string
          stage_id: string
          status: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          custom_fields?: Json
          expected_close_date?: string | null
          id?: string
          pipeline_id: string
          stage_id: string
          status?: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          custom_fields?: Json
          expected_close_date?: string | null
          id?: string
          pipeline_id?: string
          stage_id?: string
          status?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          complained_at: string | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          resend_email_id: string | null
          sent_at: string | null
          status: string
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          complained_at?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          complained_at?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_contact_id: string | null
          audience_list_id: string | null
          audience_type: string
          content: Json
          created_at: string
          created_by: string | null
          from_email: string | null
          from_name: string | null
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audience_contact_id?: string | null
          audience_list_id?: string | null
          audience_type: string
          content?: Json
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audience_contact_id?: string | null
          audience_list_id?: string | null
          audience_type?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_audience_contact_id_fkey"
            columns: ["audience_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_audience_list_id_fkey"
            columns: ["audience_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          link_url: string | null
          occurred_at: string
          recipient_id: string
          resend_event_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          link_url?: string | null
          occurred_at: string
          recipient_id: string
          resend_event_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          link_url?: string | null
          occurred_at?: string
          recipient_id?: string
          resend_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "email_campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_metric_widgets: {
        Row: {
          config: Json
          created_at: string
          id: string
          sort_order: number
          title: string
          user_id: string
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          user_id?: string
          widget_type?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          user_id?: string
          widget_type?: string
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          contact_id: string | null
          created_at: string
          email: string
          id: string
          reason: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          reason: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_suppressions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          content: Json
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          name: string
          subject?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          pipeline_id: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          created_at: string
          field_key: string | null
          field_source: string
          id: string
          is_active: boolean
          name: string
          operator: string
          points: number
          sort_order: number
          value: string | null
        }
        Insert: {
          created_at?: string
          field_key?: string | null
          field_source: string
          id?: string
          is_active?: boolean
          name: string
          operator: string
          points?: number
          sort_order?: number
          value?: string | null
        }
        Update: {
          created_at?: string
          field_key?: string | null
          field_source?: string
          id?: string
          is_active?: boolean
          name?: string
          operator?: string
          points?: number
          sort_order?: number
          value?: string | null
        }
        Relationships: []
      }
      scoring_tiers: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
          min_score: number
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          label: string
          min_score?: number
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
          min_score?: number
          sort_order?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_contact_score: {
        Args: {
          p_company: string
          p_custom: Json
          p_email: string
          p_name: string
          p_phone: string
          p_tags: string[]
        }
        Returns: number
      }
      recalculate_all_contact_scores: { Args: never; Returns: undefined }
      remove_contact_tag: { Args: { tag_name: string }; Returns: undefined }
      rename_contact_tag: {
        Args: { new_name: string; old_name: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
