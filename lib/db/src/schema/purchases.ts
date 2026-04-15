import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { productsTable } from "./products";

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseDate: text("purchase_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  supplierBillNo: text("supplier_bill_no"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseDetailsTable = pgTable("purchase_details", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => purchasesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, createdAt: true });
export const insertPurchaseDetailSchema = createInsertSchema(purchaseDetailsTable).omit({ id: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
export type PurchaseDetail = typeof purchaseDetailsTable.$inferSelect;
