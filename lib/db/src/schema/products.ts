import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { brandsTable } from "./brands";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  productCode: text("product_code").unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  brandId: integer("brand_id").references(() => brandsTable.id),
  barcode: text("barcode"),
  salesPrice: numeric("sales_price", { precision: 12, scale: 2 }).notNull().default("0"),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountType: text("discount_type").notNull().default("fixed"),
  hasExpiry: boolean("has_expiry").notNull().default(false),
  valuationMethod: text("valuation_method").notNull().default("fifo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
