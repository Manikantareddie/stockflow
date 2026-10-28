"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StockFilter } from "@/lib/types";

export function ProductsToolbar({
  search,
  filter,
  onNewProduct,
  onExport,
  exporting,
}: {
  search: string;
  filter: StockFilter;
  onNewProduct: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => {
    if (searchValue === search) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchValue) params.set("search", searchValue);
      if (filter !== "all") params.set("filter", filter);
      const query = params.toString();
      router.push(query ? `/products?${query}` : "/products");
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, search, filter, router]);

  function handleFilterChange(value: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (value !== "all") params.set("filter", value);
    const query = params.toString();
    router.push(query ? `/products?${query}` : "/products");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by name or SKU"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by stock status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="low_stock">Low stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onExport} disabled={exporting}>
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
        <Button onClick={onNewProduct}>New product</Button>
      </div>
    </div>
  );
}
