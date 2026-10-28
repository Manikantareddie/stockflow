import { getProducts } from "@/lib/data";
import type { StockFilter } from "@/lib/types";
import { ProductsView } from "./products-view";

const FILTERS: StockFilter[] = ["all", "in_stock", "low_stock"];

function parseFilter(value: string | undefined): StockFilter {
  return FILTERS.includes(value as StockFilter) ? (value as StockFilter) : "all";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const filter = parseFilter(params.filter);

  let products: Awaited<ReturnType<typeof getProducts>>["products"] = [];
  let organization: Awaited<ReturnType<typeof getProducts>>["organization"] | null = null;
  let errorMessage: string | null = null;

  try {
    const result = await getProducts({ search, filter });
    products = result.products;
    organization = result.organization;
  } catch {
    errorMessage = "Unable to load products. Please refresh the page.";
  }

  if (errorMessage || !organization) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {errorMessage ?? "Unable to load products."}
      </div>
    );
  }

  return (
    <ProductsView
      products={products}
      organization={organization}
      search={search}
      filter={filter}
    />
  );
}
