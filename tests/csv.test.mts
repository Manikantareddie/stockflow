import test from "node:test";
import assert from "node:assert/strict";
import { mapProductRows, parseCsv } from "../lib/csv.ts";

test("parses simple comma separated rows", () => {
  assert.deepEqual(parseCsv("a,b\n1,2"), [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("keeps commas inside quoted fields", () => {
  assert.deepEqual(parseCsv('name,sku\n"Widget, large",W-1'), [
    ["name", "sku"],
    ["Widget, large", "W-1"],
  ]);
});

test("unescapes doubled quotes", () => {
  assert.deepEqual(parseCsv('sku\n"A""1"'), [["sku"], ['A"1']]);
});

test("handles CRLF line endings and strips the byte order mark", () => {
  assert.deepEqual(parseCsv("\uFEFFname,sku\r\nWidget,W-1\r\n"), [
    ["name", "sku"],
    ["Widget", "W-1"],
  ]);
});

test("handles quoted fields containing newlines", () => {
  assert.deepEqual(parseCsv('name,sku\n"line one\nline two",W-1'), [
    ["name", "sku"],
    ["line one\nline two", "W-1"],
  ]);
});

test("drops blank rows", () => {
  assert.deepEqual(parseCsv("a,b\n\n1,2\n"), [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("maps headers using aliases and defaults a blank quantity to zero", () => {
  const rows = parseCsv("Product,Code,Qty,Cost Price,Selling Price\nWidget,W-1,,2.50,4.00");
  const { products, errors } = mapProductRows(rows);

  assert.deepEqual(errors, []);
  assert.equal(products.length, 1);
  assert.equal(products[0].name, "Widget");
  assert.equal(products[0].sku, "W-1");
  assert.equal(products[0].quantity_on_hand, "0");
  assert.equal(products[0].cost_price, "2.50");
  assert.equal(products[0].selling_price, "4.00");
  assert.equal(products[0].line, 2);
});

test("reports the header row when Name or SKU columns are missing", () => {
  const { products, errors } = mapProductRows(parseCsv("Quantity,Cost price\n3,1.00"));

  assert.equal(products.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 1);
});
