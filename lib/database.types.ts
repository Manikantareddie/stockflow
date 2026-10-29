export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          default_low_stock_threshold: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          default_low_stock_threshold?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          default_low_stock_threshold?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          email: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_invites: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          role: string;
          created_by: string | null;
          created_at: string;
          expires_at: string | null;
          used_by: string | null;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          role?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string | null;
          used_by?: string | null;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          code?: string;
          role?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string | null;
          used_by?: string | null;
          used_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sku: string;
          description: string | null;
          quantity_on_hand: number;
          cost_price: number | null;
          selling_price: number | null;
          low_stock_threshold: number | null;
          last_updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sku: string;
          description?: string | null;
          quantity_on_hand?: number;
          cost_price?: number | null;
          selling_price?: number | null;
          low_stock_threshold?: number | null;
          last_updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          sku?: string;
          description?: string | null;
          quantity_on_hand?: number;
          cost_price?: number | null;
          selling_price?: number | null;
          low_stock_threshold?: number | null;
          last_updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          user_id: string | null;
          delta: number;
          quantity_after: number;
          reason: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          user_id?: string | null;
          delta: number;
          quantity_after: number;
          reason?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string;
          user_id?: string | null;
          delta?: number;
          quantity_after?: number;
          reason?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      adjust_stock: {
        Args: { p_product_id: string; p_delta: number; p_note?: string | null };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
