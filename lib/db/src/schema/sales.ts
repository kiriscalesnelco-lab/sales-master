import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleDate: text("sale_date").notNull(),
  customerId: integer("customer_id").references(() => customersTable.id),
  billNo: text("bill_no").notNull().unique(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saleDetailsTable = pgTable("sale_details", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  salesPrice: numeric("sales_price", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id, { onDelete: "cascade" }),
  paymentType: text("payment_type").notNull().default("cash"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export const insertSaleDetailSchema = createInsertSchema(saleDetailsTable).omit({ id: true });
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactionsTable).omit({ id: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleDetail = typeof saleDetailsTable.$inferSelect;
export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
