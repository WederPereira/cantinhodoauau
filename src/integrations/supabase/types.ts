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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          created_at: string
          file_path: string
          file_size_bytes: number
          id: string
          notes: string | null
          source: string
          total_clients: number | null
          total_photos: number | null
          total_records: number | null
          triggered_by: string | null
          triggered_by_name: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size_bytes?: number
          id?: string
          notes?: string | null
          source?: string
          total_clients?: number | null
          total_photos?: number | null
          total_records?: number | null
          triggered_by?: string | null
          triggered_by_name?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          notes?: string | null
          source?: string
          total_clients?: number | null
          total_photos?: number | null
          total_records?: number | null
          triggered_by?: string | null
          triggered_by_name?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          birth_date: string | null
          breed: string
          castrated: boolean
          created_at: string
          entry_date: string
          gender: string | null
          health_restrictions: string | null
          id: string
          name: string
          pet_size: string | null
          photo: string | null
          tutor_address: string
          tutor_birth_date: string | null
          tutor_cpf: string
          tutor_email: string
          tutor_name: string
          tutor_neighborhood: string
          tutor_phone: string
          tutor_photo: string | null
          updated_at: string
          vaccines: Json
          weight: number | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string
          castrated?: boolean
          created_at?: string
          entry_date?: string
          gender?: string | null
          health_restrictions?: string | null
          id?: string
          name: string
          pet_size?: string | null
          photo?: string | null
          tutor_address?: string
          tutor_birth_date?: string | null
          tutor_cpf?: string
          tutor_email?: string
          tutor_name?: string
          tutor_neighborhood?: string
          tutor_phone?: string
          tutor_photo?: string | null
          updated_at?: string
          vaccines?: Json
          weight?: number | null
        }
        Update: {
          birth_date?: string | null
          breed?: string
          castrated?: boolean
          created_at?: string
          entry_date?: string
          gender?: string | null
          health_restrictions?: string | null
          id?: string
          name?: string
          pet_size?: string | null
          photo?: string | null
          tutor_address?: string
          tutor_birth_date?: string | null
          tutor_cpf?: string
          tutor_email?: string
          tutor_name?: string
          tutor_neighborhood?: string
          tutor_phone?: string
          tutor_photo?: string | null
          updated_at?: string
          vaccines?: Json
          weight?: number | null
        }
        Relationships: []
      }
      contract_plans: {
        Row: {
          active: boolean
          base_monthly_value: number
          created_at: string
          frequency_per_week: number
          id: string
          notes: string | null
          plan_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_monthly_value?: number
          created_at?: string
          frequency_per_week: number
          id?: string
          notes?: string | null
          plan_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_monthly_value?: number
          created_at?: string
          frequency_per_week?: number
          id?: string
          notes?: string | null
          plan_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          base_monthly_value: number
          cancellation_fee: number | null
          cancelled_at: string | null
          client_id: string
          client_snapshot: Json
          created_at: string
          created_by: string | null
          created_by_name: string | null
          discount_percent: number
          discount_type: string
          docx_url: string | null
          end_date: string | null
          final_monthly_value: number
          frequency_per_week: number
          id: string
          missing_fields: Json | null
          observations: string | null
          payment_method: string | null
          pdf_url: string | null
          plan_type: string
          start_date: string
          status: string
          total_contract_value: number
          updated_at: string
        }
        Insert: {
          base_monthly_value?: number
          cancellation_fee?: number | null
          cancelled_at?: string | null
          client_id: string
          client_snapshot?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          discount_percent?: number
          discount_type?: string
          docx_url?: string | null
          end_date?: string | null
          final_monthly_value?: number
          frequency_per_week: number
          id?: string
          missing_fields?: Json | null
          observations?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          plan_type: string
          start_date?: string
          status?: string
          total_contract_value?: number
          updated_at?: string
        }
        Update: {
          base_monthly_value?: number
          cancellation_fee?: number | null
          cancelled_at?: string | null
          client_id?: string
          client_snapshot?: Json
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          discount_percent?: number
          discount_type?: string
          docx_url?: string | null
          end_date?: string | null
          final_monthly_value?: number
          frequency_per_week?: number
          id?: string
          missing_fields?: Json | null
          observations?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          plan_type?: string
          start_date?: string
          status?: string
          total_contract_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_records: {
        Row: {
          ate: boolean
          created_at: string
          date: string
          dog: string
          id: string
          notes: string | null
          qr_entry_id: string
          tutor: string
          updated_at: string
        }
        Insert: {
          ate?: boolean
          created_at?: string
          date?: string
          dog: string
          id?: string
          notes?: string | null
          qr_entry_id: string
          tutor: string
          updated_at?: string
        }
        Update: {
          ate?: boolean
          created_at?: string
          date?: string
          dog?: string
          id?: string
          notes?: string | null
          qr_entry_id?: string
          tutor?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_records_qr_entry_id_fkey"
            columns: ["qr_entry_id"]
            isOneToOne: false
            referencedRelation: "qr_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      feces_collections: {
        Row: {
          client_id: string
          collected: boolean
          collected_at: string | null
          collected_by: string | null
          collected_by_name: string | null
          created_at: string
          id: string
          month_year: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          id?: string
          month_year: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          id?: string
          month_year?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      flea_records: {
        Row: {
          brand: string
          client_id: string
          created_at: string
          date: string
          duration_months: number
          flea_type: string
          id: string
          notes: string | null
        }
        Insert: {
          brand: string
          client_id: string
          created_at?: string
          date: string
          duration_months?: number
          flea_type?: string
          id?: string
          notes?: string | null
        }
        Update: {
          brand?: string
          client_id?: string
          created_at?: string
          date?: string
          duration_months?: number
          flea_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flea_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_meals: {
        Row: {
          ate: boolean | null
          created_at: string
          date: string
          hotel_stay_id: string
          id: string
          meal_type: string
          updated_at: string
        }
        Insert: {
          ate?: boolean | null
          created_at?: string
          date?: string
          hotel_stay_id: string
          id?: string
          meal_type: string
          updated_at?: string
        }
        Update: {
          ate?: boolean | null
          created_at?: string
          date?: string
          hotel_stay_id?: string
          id?: string
          meal_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_meals_hotel_stay_id_fkey"
            columns: ["hotel_stay_id"]
            isOneToOne: false
            referencedRelation: "hotel_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_medications: {
        Row: {
          administered: boolean
          administered_at: string | null
          client_id: string | null
          created_at: string
          hotel_stay_id: string | null
          id: string
          medication_name: string
          medication_type: string
          notes: string | null
          recurrence: string
          scheduled_time: string
        }
        Insert: {
          administered?: boolean
          administered_at?: string | null
          client_id?: string | null
          created_at?: string
          hotel_stay_id?: string | null
          id?: string
          medication_name: string
          medication_type?: string
          notes?: string | null
          recurrence?: string
          scheduled_time: string
        }
        Update: {
          administered?: boolean
          administered_at?: string | null
          client_id?: string | null
          created_at?: string
          hotel_stay_id?: string | null
          id?: string
          medication_name?: string
          medication_type?: string
          notes?: string | null
          recurrence?: string
          scheduled_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_medications_hotel_stay_id_fkey"
            columns: ["hotel_stay_id"]
            isOneToOne: false
            referencedRelation: "hotel_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_stays: {
        Row: {
          active: boolean
          ate: boolean
          belonging_labels: Json | null
          belongings_photos: string[] | null
          check_in: string
          check_out: string | null
          client_id: string
          created_at: string
          dog_name: string
          expected_checkout: string | null
          id: string
          observations: string | null
          tutor_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          ate?: boolean
          belonging_labels?: Json | null
          belongings_photos?: string[] | null
          check_in?: string
          check_out?: string | null
          client_id: string
          created_at?: string
          dog_name: string
          expected_checkout?: string | null
          id?: string
          observations?: string | null
          tutor_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          ate?: boolean
          belonging_labels?: Json | null
          belongings_photos?: string[] | null
          check_in?: string
          check_out?: string | null
          client_id?: string
          created_at?: string
          dog_name?: string
          expected_checkout?: string | null
          id?: string
          observations?: string | null
          tutor_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: Database["public"]["Enums"]["app_role"]
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_entries: {
        Row: {
          created_at: string
          data_hora: string
          dog: string
          id: string
          raca: string
          tutor: string
        }
        Insert: {
          created_at?: string
          data_hora?: string
          dog: string
          id?: string
          raca?: string
          tutor: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          dog?: string
          id?: string
          raca?: string
          tutor?: string
        }
        Relationships: []
      }
      reels_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "reels_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reels_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          media_url: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          user_id: string
          user_name?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      taxi_groups: {
        Row: {
          created_at: string
          entries: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entries?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entries?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccine_records: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      work_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          recurrence: string
          scheduled_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          recurrence?: string
          scheduled_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          recurrence?: string
          scheduled_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "noturnista" | "monitor" | "admin_comercial"
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
      app_role: ["admin", "noturnista", "monitor", "admin_comercial"],
    },
  },
} as const
