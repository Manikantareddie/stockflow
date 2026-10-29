export type ThresholdProduct = {
  quantity_on_hand: number;
  low_stock_threshold: number | null;
};

export type ThresholdOrganization = {
  default_low_stock_threshold: number;
};

/**
 * Effective threshold mirrors the SQL expression:
 * COALESCE(product.low_stock_threshold, organization.default_low_stock_threshold)
 * A product-level threshold of 0 is honoured and is not replaced by the default.
 */
export function effectiveThreshold(
  product: ThresholdProduct,
  organization: ThresholdOrganization,
): number {
  return product.low_stock_threshold ?? organization.default_low_stock_threshold;
}

export function isLowStock(
  product: ThresholdProduct,
  organization: ThresholdOrganization,
): boolean {
  return product.quantity_on_hand <= effectiveThreshold(product, organization);
}

export type ValuationProduct = {
  quantity_on_hand: number;
  cost_price: number | string | null;
  selling_price: number | string | null;
};

export type InventoryValuation = {
  /** Quantity multiplied by cost price, summed over products that have a cost price. */
  costValue: number;
  /** Quantity multiplied by selling price, summed over products that have a selling price. */
  retailValue: number;
  /** Unrealised profit, summed over products that have both prices. */
  potentialProfit: number;
  costPricedProducts: number;
  retailPricedProducts: number;
};

function asNumber(value: number | string | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Postgres `numeric` can arrive as either a number or a string depending on the
 * driver, so every price is coerced before use. Products missing a price are
 * excluded from the metric that needs it rather than counted as zero.
 */
export function valuateInventory(products: ValuationProduct[]): InventoryValuation {
  let costValue = 0;
  let retailValue = 0;
  let potentialProfit = 0;
  let costPricedProducts = 0;
  let retailPricedProducts = 0;

  for (const product of products) {
    const cost = asNumber(product.cost_price);
    const retail = asNumber(product.selling_price);
    const quantity = product.quantity_on_hand;

    if (cost !== null) {
      costValue += cost * quantity;
      costPricedProducts += 1;
    }

    if (retail !== null) {
      retailValue += retail * quantity;
      retailPricedProducts += 1;
    }

    if (cost !== null && retail !== null) {
      potentialProfit += (retail - cost) * quantity;
    }
  }

  return { costValue, retailValue, potentialProfit, costPricedProducts, retailPricedProducts };
}

export type ValuedProduct = ValuationProduct & {
  id: string;
  name: string;
  sku: string;
};

export type ProductValue = {
  id: string;
  name: string;
  sku: string;
  value: number;
};

/**
 * Ranks products by stock value, using the cost price and falling back to the
 * selling price when no cost has been recorded. Zero-value rows are dropped so
 * the chart is never padded with empty bars.
 */
export function topProductsByValue(
  products: ValuedProduct[],
  limit = 5,
): ProductValue[] {
  return products
    .map((product) => {
      const unitPrice = asNumber(product.cost_price) ?? asNumber(product.selling_price) ?? 0;
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        value: unitPrice * product.quantity_on_hand,
      };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
