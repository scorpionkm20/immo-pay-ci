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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          dernier_message: string | null
          dernier_message_date: string | null
          gestionnaire_id: string
          id: string
          locataire_id: string
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dernier_message?: string | null
          dernier_message_date?: string | null
          gestionnaire_id: string
          id?: string
          locataire_id: string
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dernier_message?: string | null
          dernier_message_date?: string | null
          gestionnaire_id?: string
          id?: string
          locataire_id?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          date_signature: string | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          lease_id: string
          signature_url: string | null
          signe: boolean
          titre: string
          type_document: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          date_signature?: string | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          lease_id: string
          signature_url?: string | null
          signe?: boolean
          titre: string
          type_document: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          date_signature?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          lease_id?: string
          signature_url?: string | null
          signe?: boolean
          titre?: string
          type_document?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      leases: {
        Row: {
          caution_montant: number
          caution_payee: boolean | null
          contrat_url: string | null
          created_at: string
          date_debut: string
          date_fin: string | null
          gestionnaire_id: string
          id: string
          locataire_id: string
          montant_mensuel: number
          property_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          caution_montant: number
          caution_payee?: boolean | null
          contrat_url?: string | null
          created_at?: string
          date_debut: string
          date_fin?: string | null
          gestionnaire_id: string
          id?: string
          locataire_id: string
          montant_mensuel: number
          property_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          caution_montant?: number
          caution_payee?: boolean | null
          contrat_url?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          gestionnaire_id?: string
          id?: string
          locataire_id?: string
          montant_mensuel?: number
          property_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          lu: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          lu?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          lu?: boolean
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lease_id: string
          lu: boolean
          message: string
          titre: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lease_id: string
          lu?: boolean
          message: string
          titre: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lease_id?: string
          lu?: boolean
          message?: string
          titre?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string
          date_paiement: string | null
          id: string
          lease_id: string
          methode_paiement: string
          mois_paiement: string
          montant: number
          numero_telephone: string
          recu_url: string | null
          statut: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string | null
          id?: string
          lease_id: string
          methode_paiement: string
          mois_paiement: string
          montant: number
          numero_telephone: string
          recu_url?: string | null
          statut?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string | null
          id?: string
          lease_id?: string
          methode_paiement?: string
          mois_paiement?: string
          montant?: number
          numero_telephone?: string
          recu_url?: string | null
          statut?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          adresse: string
          caution: number
          created_at: string
          date_mise_a_jour: string
          date_publication: string
          description: string
          equipements: string[] | null
          gestionnaire_id: string
          id: string
          images: string[] | null
          nombre_pieces: number
          prix_mensuel: number
          proprietaire_id: string | null
          quartier: string | null
          statut: Database["public"]["Enums"]["property_status"]
          surface_m2: number | null
          titre: string
          type_propriete: string
          updated_at: string
          validation_proprietaire: boolean | null
          ville: string
        }
        Insert: {
          adresse: string
          caution: number
          created_at?: string
          date_mise_a_jour?: string
          date_publication?: string
          description: string
          equipements?: string[] | null
          gestionnaire_id: string
          id?: string
          images?: string[] | null
          nombre_pieces: number
          prix_mensuel: number
          proprietaire_id?: string | null
          quartier?: string | null
          statut?: Database["public"]["Enums"]["property_status"]
          surface_m2?: number | null
          titre: string
          type_propriete: string
          updated_at?: string
          validation_proprietaire?: boolean | null
          ville: string
        }
        Update: {
          adresse?: string
          caution?: number
          created_at?: string
          date_mise_a_jour?: string
          date_publication?: string
          description?: string
          equipements?: string[] | null
          gestionnaire_id?: string
          id?: string
          images?: string[] | null
          nombre_pieces?: number
          prix_mensuel?: number
          proprietaire_id?: string | null
          quartier?: string | null
          statut?: Database["public"]["Enums"]["property_status"]
          surface_m2?: number | null
          titre?: string
          type_propriete?: string
          updated_at?: string
          validation_proprietaire?: boolean | null
          ville?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "locataire" | "gestionnaire" | "proprietaire"
      property_status:
        | "disponible"
        | "loue"
        | "en_attente_validation"
        | "indisponible"
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
      app_role: ["locataire", "gestionnaire", "proprietaire"],
      property_status: [
        "disponible",
        "loue",
        "en_attente_validation",
        "indisponible",
      ],
    },
  },
} as const
