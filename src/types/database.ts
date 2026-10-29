/**
 * SafeSwap Database Types
 * Generated from Supabase Schema Migrations (including Manual QR Ph & Staff Console)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DealStatus =
  | 'CREATED'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_REJECTED'
  | 'FUNDED'
  | 'HELD'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'PAYOUT_PENDING'
  | 'RELEASED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export type UserRole = 'buyer' | 'seller' | 'staff' | 'admin';

export type ProofType = 'photo' | 'file' | 'tracking_number' | 'notes';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_buyer'
  | 'resolved_seller';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          title: string;
          description: string | null;
          terms: string;
          status: DealStatus;
          price_amount: number; // minor units (e.g. centavos)
          price_currency: string;
          service_fee_amount: number;
          payment_provider_ref: string | null;
          payment_session_id: string | null;
          expires_at: string | null;
          delivered_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          title: string;
          description?: string | null;
          terms: string;
          status?: DealStatus;
          price_amount: number;
          price_currency?: string;
          service_fee_amount?: number;
          payment_provider_ref?: string | null;
          payment_session_id?: string | null;
          expires_at?: string | null;
          delivered_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          title?: string;
          description?: string | null;
          terms?: string;
          status?: DealStatus;
          price_amount?: number;
          price_currency?: string;
          service_fee_amount?: number;
          payment_provider_ref?: string | null;
          payment_session_id?: string | null;
          expires_at?: string | null;
          delivered_at?: string | null;
          confirmed_at?: string | null;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          deal_id: string;
          direction: 'in' | 'out' | 'refund';
          amount_centavos: number;
          currency: string;
          reference_number: string;
          proof_path: string | null;
          status: 'submitted' | 'verified' | 'rejected' | 'completed';
          submitted_by: string | null;
          reviewed_by: string | null;
          second_approver_id: string | null;
          reviewed_at: string | null;
          reject_reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          direction: 'in' | 'out' | 'refund';
          amount_centavos: number;
          currency?: string;
          reference_number: string;
          proof_path?: string | null;
          status?: 'submitted' | 'verified' | 'rejected' | 'completed';
          submitted_by?: string | null;
          reviewed_by?: string | null;
          second_approver_id?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          status?: 'submitted' | 'verified' | 'rejected' | 'completed';
          reviewed_by?: string | null;
          second_approver_id?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          metadata?: Json;
        };
      };
      payment_events: {
        Row: {
          id: string;
          deal_id: string | null;
          idempotency_key: string;
          event_type: string;
          actor_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string | null;
          idempotency_key: string;
          event_type: string;
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: never;
      };
      seller_payout_methods: {
        Row: {
          id: string;
          seller_id: string;
          account_name: string;
          institution: string;
          account_number: string;
          qr_image_path: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          account_name: string;
          institution: string;
          account_number: string;
          qr_image_path?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          institution?: string;
          account_number?: string;
          qr_image_path?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      staff_actions: {
        Row: {
          id: string;
          staff_id: string;
          action: string;
          target_deal_id: string | null;
          payment_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          action: string;
          target_deal_id?: string | null;
          payment_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      deal_timeline: {
        Row: {
          id: string;
          deal_id: string;
          actor_id: string | null;
          from_status: DealStatus | null;
          to_status: DealStatus;
          action: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          actor_id?: string | null;
          from_status?: DealStatus | null;
          to_status: DealStatus;
          action: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          actor_id?: string | null;
          from_status?: DealStatus | null;
          to_status?: DealStatus;
          action?: string;
          note?: string | null;
        };
      };
      audit_log: {
        Row: {
          id: string;
          deal_id: string;
          actor_id: string | null;
          from_status: DealStatus | null;
          to_status: DealStatus;
          reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };
      delivery_proofs: {
        Row: {
          id: string;
          deal_id: string;
          seller_id: string;
          proof_type: ProofType;
          file_path: string | null;
          tracking_number: string | null;
          carrier: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          seller_id: string;
          proof_type: ProofType;
          file_path?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_path?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          notes?: string | null;
        };
      };
      disputes: {
        Row: {
          id: string;
          deal_id: string;
          raised_by: string;
          reason: string;
          status: DisputeStatus;
          resolution_notes: string | null;
          resolved_by: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          deal_id: string;
          raised_by: string;
          reason: string;
          status?: DisputeStatus;
          resolution_notes?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          status?: DisputeStatus;
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
      };
      dispute_evidence: {
        Row: {
          id: string;
          dispute_id: string;
          uploaded_by: string;
          file_path: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          uploaded_by: string;
          file_path: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          description?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          deal_id: string | null;
          type: string;
          title: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deal_id?: string | null;
          type: string;
          title: string;
          body: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
      };
    };
    Functions: {
      transition_deal: {
        Args: {
          p_deal_id: string;
          p_target_status: DealStatus;
          p_action: string;
          p_note?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
    };
  };
}
