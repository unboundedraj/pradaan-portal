/**
 * Placeholder type file — replace with the real generated output by running:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 *
 * This file mirrors the live schema AND satisfies the GenericTable constraint
 * from @supabase/postgrest-js (which requires Relationships: GenericRelationship[]).
 * Without Relationships, .update() and .insert() resolve to `never`.
 */

export type UserRole = "DONOR" | "ORGANIZATION" | "ADMIN";
export type DriveStatus = "PENDING" | "APPROVED" | "ACTIVE" | "COMPLETED";
export type TransactionSource = "STRIPE" | "WALLET";
export type PotLedgerType = "INFLOW_OVERFLOW" | "OUTFLOW_POLL";
export type PollStatus = "ACTIVE" | "RESOLVED";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          is_verified: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          is_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          is_verified?: boolean;
        };
        Relationships: [];
      };
      donor_profiles: {
        Row: {
          id: string;
          full_name: string;
          wallet_balance: number;
        };
        Insert: {
          id: string;
          full_name: string;
          wallet_balance?: number;
        };
        Update: {
          full_name?: string;
          wallet_balance?: number;
        };
        Relationships: [];
      };
      org_profiles: {
        Row: {
          id: string;
          org_name: string;
          description: string;
          website: string | null;
        };
        Insert: {
          id: string;
          org_name: string;
          description: string;
          website?: string | null;
        };
        Update: {
          org_name?: string;
          description?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      drives: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          description: string;
          target_amount: number;
          current_amount: number;
          status: DriveStatus;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          title: string;
          description: string;
          target_amount: number;
          current_amount?: number;
          status?: DriveStatus;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          target_amount?: number;
          current_amount?: number;
          status?: DriveStatus;
          ends_at?: string;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          donor_id: string;
          drive_id: string;
          amount: number;
          source: TransactionSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          donor_id: string;
          drive_id: string;
          amount: number;
          source: TransactionSource;
          created_at?: string;
        };
        Update: Record<string, never>; // immutable ledger
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          donor_id: string;
          amount: number;
          stripe_intent_id: string;
          status: "COMPLETED";
          created_at: string;
        };
        Insert: {
          id?: string;
          donor_id: string;
          amount: number;
          stripe_intent_id: string;
          status: "COMPLETED";
          created_at?: string;
        };
        Update: Record<string, never>; // immutable ledger
        Relationships: [];
      };
      pradaan_pot_ledger: {
        Row: {
          id: string;
          type: PotLedgerType;
          amount: number;
          drive_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: PotLedgerType;
          amount: number;
          drive_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>; // immutable ledger
        Relationships: [];
      };
      polls: {
        Row: {
          id: string;
          title: string;
          description: string;
          allocated_amount: number;
          status: PollStatus;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          allocated_amount: number;
          status?: PollStatus;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          status?: PollStatus;
          ends_at?: string;
        };
        Relationships: [];
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          option_text: string;
          votes_count: number;
        };
        Insert: {
          id?: string;
          poll_id: string;
          option_text: string;
          votes_count?: number;
        };
        Update: {
          option_text?: string;
          votes_count?: number;
        };
        Relationships: [];
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          option_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id: string;
          option_id: string;
          created_at?: string;
        };
        Update: Record<string, never>; // votes are immutable; UNIQUE(poll_id, user_id) enforced by DB
        Relationships: [];
      };
    };
    Views: {
      donor_analytics: {
        Row: {
          donor_id: string;
          total_donated_cents: number;
          total_drives_supported: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      donate_with_overflow: {
        Args: {
          p_donor_id: string;
          p_drive_id: string;
          p_amount: number;
          p_source: TransactionSource;
        };
        Returns: {
          donation_id: string;
          overflow_amount: number;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      drive_status: DriveStatus;
      transaction_source: TransactionSource;
      pot_ledger_type: PotLedgerType;
      poll_status: PollStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
