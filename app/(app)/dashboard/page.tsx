import Link from "next/link";
import { effectiveThreshold, getDashboardData } from "@/lib/data";
import { StatCard } from "@/components/app/stat-card";
import { InventoryValueChart } from "@/components/app/inventory-value-chart";
import { formatAmount } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const { organization, totalProducts, totalUnits, lowStockProducts, valuation, topByValue } =
    await getDashboardData();

  const missingCost = totalProducts - valuation.costPricedProducts;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{organization.name}</h1>
        <p className="mt-0.5 text-sm text-secondary">Overview of your inventory health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total products" value={totalProducts} />
        <StatCard label="Units on hand" value={totalUnits} />
        <StatCard label="Low-stock products" value={lowStockProducts.length} emphasized />
        <StatCard label="Inventory value (at cost)" value={formatAmount(valuation.costValue)} />
        <StatCard label="Retail value" value={formatAmount(valuation.retailValue)} />
        <StatCard label="Potential profit" value={formatAmount(valuation.potentialProfit)} />
      </div>

      {missingCost > 0 ? (
        <p className="text-xs text-muted">
          {missingCost} of {totalProducts} product{totalProducts === 1 ? "" : "s"} ha
          {missingCost === 1 ? "s" : "ve"} no cost price and {missingCost === 1 ? "is" : "are"}{" "}
          excluded from the cost-based figures.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Top products by value</CardTitle>
          <CardDescription>
            Stock value at cost price, falling back to the selling price where no cost is recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topByValue.length === 0 ? (
            <EmptyState
              title="No priced products yet"
              description="Add a cost or selling price to your products to see their stock value."
            />
          ) : (
            <InventoryValueChart items={topByValue} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Low stock</CardTitle>
            <CardDescription>Products at or below their effective threshold.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/products?filter=low_stock">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {lowStockProducts.length === 0 ? (
            <EmptyState
              title="Everything is well stocked"
              description="No products are currently at or below their threshold."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-secondary">{product.sku}</TableCell>
                    <TableCell>{product.quantity_on_hand}</TableCell>
                    <TableCell>{effectiveThreshold(product, organization)}</TableCell>
                    <TableCell>
                      <Badge variant="low">Low stock</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
