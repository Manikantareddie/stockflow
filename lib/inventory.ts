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
