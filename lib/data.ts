import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { effectiveThreshold, isLowStock, topProductsByValue, valuateInventory } from "@/lib/inventory";
import type {
  Organization,
  OrganizationInvite,
  Product,
  Profile,
  StockFilter,
} from "@/lib/types";

export { effectiveThreshold, isLowStock };
export type { Organization, OrganizationInvite, Product, Profile, StockFilter };

export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getCurrentContext() {
  const { supabase, user } = await requireSession();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login?error=profile");
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  if (orgError || !organization) {
    redirect("/login?error=organization");
  }

  return {
    supabase,
    user,
    profile: profile as Profile,
    organization: organization as Organization,
  };
}

export async function getProducts(options?: { search?: string; filter?: StockFilter }) {
  const { supabase, organization } = await getCurrentContext();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Unable to load products.");
  }

  let products = (data ?? []) as Product[];

  const search = options?.search?.trim().toLowerCase();
  if (search) {
    products = products.filter(
      (p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search),
    );
  }

  if (options?.filter && options.filter !== "all") {
    products = products.filter((p) =>
      options.filter === "low_stock"
        ? isLowStock(p, organization)
        : !isLowStock(p, organization),
    );
  }

  return { organization, products };
}

export async function getDashboardData() {
  const { organization } = await getCurrentContext();
  const { products } = await getProducts();

  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.quantity_on_hand, 0);
  const lowStockProducts = products.filter((p) => isLowStock(p, organization));
  const valuation = valuateInventory(products);
  const topByValue = topProductsByValue(products, 5);

  return { organization, totalProducts, totalUnits, lowStockProducts, valuation, topByValue };
}

export async function getTeamData() {
  const { supabase, organization, profile, user } = await getCurrentContext();

  const { data: members, error: membersError } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error("Unable to load team members.");
  }

  const isOwner = profile.role === "owner";
  let invites: OrganizationInvite[] = [];

  if (isOwner) {
    const { data, error } = await supabase
      .from("organization_invites")
      .select("*")
      .eq("organization_id", organization.id)
      .is("used_by", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Unable to load invite codes.");
    }

    invites = (data ?? []) as OrganizationInvite[];
  }

  return {
    organization,
    currentUserId: user.id,
    isOwner,
    members: (members ?? []) as Profile[],
    invites,
  };
}
