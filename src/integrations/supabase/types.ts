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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean
          nom: string
          space_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean
          nom: string
          space_id: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean
          nom?: string
          space_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          dernier_message: string | null
          dernier_message_date: string | null
          gestionnaire_id: string
          id: string
          locataire_id: string
          property_id: string
          space_id: string
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
          space_id: string
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
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          changes_description: string | null
          created_at: string
          document_id: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          modification_type: string
          modified_by: string
          version_number: number
        }
        Insert: {
          changes_description?: string | null
          created_at?: string
          document_id: string
          file_name: string
          file_size: number
          file_url: string
          id?: string
          modification_type: string
          modified_by: string
          version_number: number
        }
        Update: {
          changes_description?: string | null
          created_at?: string
          document_id?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          modification_type?: string
          modified_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
          space_id: string
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
          space_id: string
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
          space_id?: string
          titre?: string
          type_document?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          caution_montant: number
          caution_payee: boolean | null
          contrat_url: string | null
          created_at: string
          date_caution_payee: string | null
          date_debut: string
          date_fin: string | null
          gestionnaire_id: string
          id: string
          locataire_id: string
          montant_mensuel: number
          property_id: string
          space_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          caution_montant: number
          caution_payee?: boolean | null
          contrat_url?: string | null
          created_at?: string
          date_caution_payee?: string | null
          date_debut: string
          date_fin?: string | null
          gestionnaire_id: string
          id?: string
          locataire_id: string
          montant_mensuel: number
          property_id: string
          space_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          caution_montant?: number
          caution_payee?: boolean | null
          contrat_url?: string | null
          created_at?: string
          date_caution_payee?: string | null
          date_debut?: string
          date_fin?: string | null
          gestionnaire_id?: string
          id?: string
          locataire_id?: string
          montant_mensuel?: number
          property_id?: string
          space_id?: string
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
          {
            foreignKeyName: "leases_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_interventions: {
        Row: {
          created_at: string
          description: string
          id: string
          intervenant_id: string
          statut_apres: Database["public"]["Enums"]["ticket_status"] | null
          statut_avant: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          intervenant_id: string
          statut_apres?: Database["public"]["Enums"]["ticket_status"] | null
          statut_avant?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          intervenant_id?: string
          statut_apres?: Database["public"]["Enums"]["ticket_status"] | null
          statut_avant?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_interventions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          lease_id: string
          photos: string[] | null
          priorite: Database["public"]["Enums"]["ticket_priority"]
          space_id: string
          statut: Database["public"]["Enums"]["ticket_status"]
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          lease_id: string
          photos?: string[] | null
          priorite?: Database["public"]["Enums"]["ticket_priority"]
          space_id: string
          statut?: Database["public"]["Enums"]["ticket_status"]
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          lease_id?: string
          photos?: string[] | null
          priorite?: Database["public"]["Enums"]["ticket_priority"]
          space_id?: string
          statut?: Database["public"]["Enums"]["ticket_status"]
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      management_spaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invitation_code: string | null
          nom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invitation_code?: string | null
          nom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invitation_code?: string | null
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          lu: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          lu?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          lu?: boolean
          sender_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          document_a_signer: boolean | null
          id: string
          mise_a_jour_ticket: boolean | null
          nouveau_message: boolean | null
          nouveau_ticket: boolean | null
          paiement_recu: boolean | null
          rappel_paiement: boolean | null
          retard_paiement: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_a_signer?: boolean | null
          id?: string
          mise_a_jour_ticket?: boolean | null
          nouveau_message?: boolean | null
          nouveau_ticket?: boolean | null
          paiement_recu?: boolean | null
          rappel_paiement?: boolean | null
          retard_paiement?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_a_signer?: boolean | null
          id?: string
          mise_a_jour_ticket?: boolean | null
          nouveau_message?: boolean | null
          nouveau_ticket?: boolean | null
          paiement_recu?: boolean | null
          rappel_paiement?: boolean | null
          retard_paiement?: boolean | null
          updated_at?: string | null
          user_id?: string
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
      payment_reminders: {
        Row: {
          created_at: string
          date_relance: string
          id: string
          message: string
          payment_id: string
          space_id: string
          statut: string
          type_relance: string
        }
        Insert: {
          created_at?: string
          date_relance?: string
          id?: string
          message: string
          payment_id: string
          space_id: string
          statut?: string
          type_relance: string
        }
        Update: {
          created_at?: string
          date_relance?: string
          id?: string
          message?: string
          payment_id?: string
          space_id?: string
          statut?: string
          type_relance?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          date_paiement: string | null
          id: string
          lease_id: string
          methode_paiement: string | null
          mois_paiement: string
          montant: number
          numero_telephone: string | null
          recu_url: string | null
          space_id: string
          statut: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string | null
          id?: string
          lease_id: string
          methode_paiement?: string | null
          mois_paiement: string
          montant: number
          numero_telephone?: string | null
          recu_url?: string | null
          space_id: string
          statut?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string | null
          id?: string
          lease_id?: string
          methode_paiement?: string | null
          mois_paiement?: string
          montant?: number
          numero_telephone?: string | null
          recu_url?: string | null
          space_id?: string
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
          {
            foreignKeyName: "payments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
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
          latitude: number | null
          longitude: number | null
          nombre_pieces: number
          prix_mensuel: number
          proprietaire_id: string | null
          quartier: string | null
          space_id: string
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
          latitude?: number | null
          longitude?: number | null
          nombre_pieces: number
          prix_mensuel: number
          proprietaire_id?: string | null
          quartier?: string | null
          space_id: string
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
          latitude?: number | null
          longitude?: number | null
          nombre_pieces?: number
          prix_mensuel?: number
          proprietaire_id?: string | null
          quartier?: string | null
          space_id?: string
          statut?: Database["public"]["Enums"]["property_status"]
          surface_m2?: number | null
          titre?: string
          type_propriete?: string
          updated_at?: string
          validation_proprietaire?: boolean | null
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amortization: {
        Row: {
          created_at: string
          date_acquisition: string
          duree_amortissement: number
          id: string
          property_id: string
          space_id: string
          updated_at: string
          valeur_acquisition: number
          valeur_residuelle: number | null
        }
        Insert: {
          created_at?: string
          date_acquisition: string
          duree_amortissement?: number
          id?: string
          property_id: string
          space_id: string
          updated_at?: string
          valeur_acquisition: number
          valeur_residuelle?: number | null
        }
        Update: {
          created_at?: string
          date_acquisition?: string
          duree_amortissement?: number
          id?: string
          property_id?: string
          space_id?: string
          updated_at?: string
          valeur_acquisition?: number
          valeur_residuelle?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_amortization_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amortization_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      property_charges: {
        Row: {
          created_at: string
          date_charge: string
          description: string | null
          facture_url: string | null
          frequence: string | null
          id: string
          montant: number
          property_id: string
          recurrent: boolean
          space_id: string
          type_charge: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_charge: string
          description?: string | null
          facture_url?: string | null
          frequence?: string | null
          id?: string
          montant: number
          property_id: string
          recurrent?: boolean
          space_id: string
          type_charge: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_charge?: string
          description?: string | null
          facture_url?: string | null
          frequence?: string | null
          id?: string
          montant?: number
          property_id?: string
          recurrent?: boolean
          space_id?: string
          type_charge?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_charges_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      property_favorites: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          prix_initial: number
          property_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          prix_initial: number
          property_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          prix_initial?: number
          property_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rejection_templates: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_default: boolean | null
          message: string
          nom: string
          space_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_default?: boolean | null
          message: string
          nom: string
          space_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_default?: boolean | null
          message?: string
          nom?: string
          space_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rejection_templates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_requests: {
        Row: {
          created_at: string
          id: string
          manager_id: string
          message: string | null
          property_id: string
          proposed_start_date: string | null
          request_status: string
          space_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id: string
          message?: string | null
          property_id: string
          proposed_start_date?: string | null
          request_status?: string
          space_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string
          message?: string | null
          property_id?: string
          proposed_start_date?: string | null
          request_status?: string
          space_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_bedroom_designs: {
        Row: {
          comments: string | null
          created_at: string
          design_name: string
          designed_image_url: string
          id: string
          original_image_url: string
          rating: number | null
          style_description: string | null
          style_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          design_name: string
          designed_image_url: string
          id?: string
          original_image_url: string
          rating?: number | null
          style_description?: string | null
          style_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          design_name?: string
          designed_image_url?: string
          id?: string
          original_image_url?: string
          rating?: number | null
          style_description?: string | null
          style_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_alerts: {
        Row: {
          actif: boolean | null
          created_at: string | null
          derniere_notification: string | null
          derniere_verification: string | null
          equipements: string[] | null
          frequence: string
          id: string
          nom_alerte: string
          nombre_notifications: number | null
          nombre_pieces_max: number | null
          nombre_pieces_min: number | null
          prix_max: number | null
          prix_min: number | null
          quartier: string | null
          surface_max: number | null
          surface_min: number | null
          type_propriete: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          derniere_notification?: string | null
          derniere_verification?: string | null
          equipements?: string[] | null
          frequence?: string
          id?: string
          nom_alerte: string
          nombre_notifications?: number | null
          nombre_pieces_max?: number | null
          nombre_pieces_min?: number | null
          prix_max?: number | null
          prix_min?: number | null
          quartier?: string | null
          surface_max?: number | null
          surface_min?: number | null
          type_propriete?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          derniere_notification?: string | null
          derniere_verification?: string | null
          equipements?: string[] | null
          frequence?: string
          id?: string
          nom_alerte?: string
          nombre_notifications?: number | null
          nombre_pieces_max?: number | null
          nombre_pieces_min?: number | null
          prix_max?: number | null
          prix_min?: number | null
          quartier?: string | null
          surface_max?: number | null
          surface_min?: number | null
          type_propriete?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      space_invitations: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          space_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          space_id: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          space_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_invitations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "management_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_appointments: {
        Row: {
          created_at: string | null
          date_rendez_vous: string
          duree_minutes: number | null
          gestionnaire_id: string
          id: string
          lien_video: string | null
          locataire_id: string
          notes_gestionnaire: string | null
          notes_locataire: string | null
          property_id: string
          statut: string
          type_visite: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_rendez_vous: string
          duree_minutes?: number | null
          gestionnaire_id: string
          id?: string
          lien_video?: string | null
          locataire_id: string
          notes_gestionnaire?: string | null
          notes_locataire?: string | null
          property_id: string
          statut?: string
          type_visite?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_rendez_vous?: string
          duree_minutes?: number | null
          gestionnaire_id?: string
          id?: string
          lien_video?: string | null
          locataire_id?: string
          notes_gestionnaire?: string | null
          notes_locataire?: string | null
          property_id?: string
          statut?: string
          type_visite?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_history: {
        Row: {
          changed_at: string | null
          changed_by: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_id?: string
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
      virtual_tours: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          media_url: string
          order_index: number | null
          property_id: string
          thumbnail_url: string | null
          titre: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          media_url: string
          order_index?: number | null
          property_id: string
          thumbnail_url?: string | null
          titre: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          media_url?: string
          order_index?: number | null
          property_id?: string
          thumbnail_url?: string | null
          titre?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_tours_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      audit_stats: {
        Row: {
          action: string | null
          count: number | null
          last_occurrence: string | null
          resource_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_rental_request: {
        Args: {
          p_caution_amount: number
          p_monthly_rent: number
          p_request_id: string
          p_start_date: string
        }
        Returns: Json
      }
      create_new_space: {
        Args: { space_description?: string; space_name: string }
        Returns: string
      }
      generate_invitation_code: { Args: never; Returns: string }
      get_user_spaces: {
        Args: { _user_id: string }
        Returns: {
          space_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_space_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _space_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_space_member: {
        Args: { _space_id: string; _user_id: string }
        Returns: boolean
      }
      join_space_with_code: {
        Args: {
          code: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      log_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      migrate_to_spaces: { Args: never; Returns: undefined }
      property_matches_alert: {
        Args: {
          alert_record: Database["public"]["Tables"]["search_alerts"]["Row"]
          property_record: Database["public"]["Tables"]["properties"]["Row"]
        }
        Returns: boolean
      }
      reject_rental_request: {
        Args: { p_rejection_reason?: string; p_request_id: string }
        Returns: Json
      }
      should_notify: {
        Args: { notif_type: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "locataire" | "gestionnaire" | "proprietaire" | "admin"
      property_status:
        | "disponible"
        | "loue"
        | "en_attente_validation"
        | "indisponible"
      ticket_priority: "faible" | "moyenne" | "haute" | "urgente"
      ticket_status: "ouvert" | "en_cours" | "resolu" | "ferme"
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
      app_role: ["locataire", "gestionnaire", "proprietaire", "admin"],
      property_status: [
        "disponible",
        "loue",
        "en_attente_validation",
        "indisponible",
      ],
      ticket_priority: ["faible", "moyenne", "haute", "urgente"],
      ticket_status: ["ouvert", "en_cours", "resolu", "ferme"],
    },
  },
} as const
