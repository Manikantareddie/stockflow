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
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          created_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      current_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      adjust_stock: {
        Args: { p_product_id: string; p_delta: number };
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
