import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { productsTable } from "./products";

export const purchaseReturnsTable = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  returnDate: text("return_date").notNull(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  supplierBillNo: text("supplier_bill_no"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseReturnDetailsTable = pgTable("purchase_return_details", {
  id: serial("id").primaryKey(),
  purchaseReturnId: integer("purchase_return_id").notNull().references(() => purchaseReturnsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertPurchaseReturnSchema = createInsertSchema(purchaseReturnsTable).omit({ id: true, createdAt: true });
export const insertPurchaseReturnDetailSchema = createInsertSchema(purchaseReturnDetailsTable).omit({ id: true });
export type InsertPurchaseReturn = z.infer<typeof insertPurchaseReturnSchema>;
export type PurchaseReturn = typeof purchaseReturnsTable.$inferSelect;
export type PurchaseReturnDetail = typeof purchaseReturnDetailsTable.$inferSelect;
