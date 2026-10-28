import test from "node:test";
import assert from "node:assert/strict";
import { effectiveThreshold, isLowStock } from "../lib/inventory.ts";

const org = { default_low_stock_threshold: 5 };

test("uses the organization default when the product has no override", () => {
  assert.equal(effectiveThreshold({ quantity_on_hand: 10, low_stock_threshold: null }, org), 5);
});

test("uses the product override when present", () => {
  assert.equal(effectiveThreshold({ quantity_on_hand: 10, low_stock_threshold: 2 }, org), 2);
});

test("honours a product override of zero", () => {
  assert.equal(effectiveThreshold({ quantity_on_hand: 0, low_stock_threshold: 0 }, org), 0);
});

test("honours an organization default of zero", () => {
  assert.equal(
    effectiveThreshold({ quantity_on_hand: 0, low_stock_threshold: null }, { default_low_stock_threshold: 0 }),
    0,
  );
});

test("flags a product at the effective threshold as low stock", () => {
  assert.equal(isLowStock({ quantity_on_hand: 5, low_stock_threshold: null }, org), true);
});

test("flags a product below the effective threshold as low stock", () => {
  assert.equal(isLowStock({ quantity_on_hand: 3, low_stock_threshold: null }, org), true);
});

test("does not flag a product above the effective threshold", () => {
  assert.equal(isLowStock({ quantity_on_hand: 6, low_stock_threshold: null }, org), false);
});

test("a zero threshold only flags zero quantity", () => {
  assert.equal(isLowStock({ quantity_on_hand: 0, low_stock_threshold: 0 }, org), true);
  assert.equal(isLowStock({ quantity_on_hand: 1, low_stock_threshold: 0 }, org), false);
});
