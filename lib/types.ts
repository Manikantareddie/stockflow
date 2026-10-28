import type { Tables } from "@/lib/database.types";

export type Organization = Tables<"organizations">;
export type Profile = Tables<"profiles">;
export type Product = Tables<"products">;

export type StockFilter = "all" | "in_stock" | "low_stock";
