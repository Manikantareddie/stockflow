/**
 * Framework-free CSV helpers for the product importer. Kept dependency-free so
 * the parsing rules can be unit tested without touching Next.js or Supabase.
 */

export type CsvRowError = { line: number; message: string };

export type CsvProductRow = {
  line: number;
  name: string;
  sku: string;
  description: string;
  quantity_on_hand: string;
  low_stock_threshold: string;
  cost_price: string;
  selling_price: string;
};

type ProductField = keyof Omit<CsvProductRow, "line">;

/**
 * Parses CSV text into a matrix of cells. Handles quoted fields, escaped
 * double quotes, and both LF and CRLF line endings. Blank rows are dropped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const source = text.replace(/^\uFEFF/, "");

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" || char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && source[i + 1] === "\n") i += 1;
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const HEADER_ALIASES: Record<string, ProductField> = {
  name: "name",
  product: "name",
  "product name": "name",
  sku: "sku",
  code: "sku",
  description: "description",
  details: "description",
  quantity: "quantity_on_hand",
  qty: "quantity_on_hand",
  "quantity on hand": "quantity_on_hand",
  quantity_on_hand: "quantity_on_hand",
  threshold: "low_stock_threshold",
  "low stock threshold": "low_stock_threshold",
  low_stock_threshold: "low_stock_threshold",
  "cost price": "cost_price",
  cost: "cost_price",
  cost_price: "cost_price",
  "selling price": "selling_price",
  price: "selling_price",
  selling_price: "selling_price",
};

/**
 * Maps parsed CSV rows onto product records. The first row is treated as the
 * header and must provide at least a Name and a SKU column. Field level
 * validation happens later against `productSchema`.
 */
export function mapProductRows(rows: string[][]): {
  products: CsvProductRow[];
  errors: CsvRowError[];
} {
  const errors: CsvRowError[] = [];

  if (rows.length === 0) {
    return { products: [], errors };
  }

  const columns = rows[0].map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? null);

  if (!columns.includes("name") || !columns.includes("sku")) {
    errors.push({
      line: 1,
      message: 'The header row must include "Name" and "SKU" columns.',
    });
    return { products: [], errors };
  }

  const products: CsvProductRow[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const record: CsvProductRow = {
      line: i + 1,
      name: "",
      sku: "",
      description: "",
      quantity_on_hand: "0",
      low_stock_threshold: "",
      cost_price: "",
      selling_price: "",
    };

    columns.forEach((column, index) => {
      if (!column) return;
      const value = (cells[index] ?? "").trim();
      if (column === "quantity_on_hand" && value === "") return;
      record[column] = value;
    });

    products.push(record);
  }

  return { products, errors };
}
