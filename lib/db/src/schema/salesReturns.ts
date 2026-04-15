import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const salesReturnsTable = pgTable("sales_returns", {
  id: serial("id").primaryKey(),
  returnDate: text("return_date").notNull(),
  customerId: integer("customer_id").references(() => customersTable.id),
  originalBillNo: text("original_bill_no"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesReturnDetailsTable = pgTable("sales_return_details", {
  id: serial("id").primaryKey(),
  salesReturnId: integer("sales_return_id").notNull().references(() => salesReturnsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  salesPrice: numeric("sales_price", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertSalesReturnSchema = createInsertSchema(salesReturnsTable).omit({ id: true, createdAt: true });
export const insertSalesReturnDetailSchema = createInsertSchema(salesReturnDetailsTable).omit({ id: true });
export type InsertSalesReturn = z.infer<typeof insertSalesReturnSchema>;
export type SalesReturn = typeof salesReturnsTable.$inferSelect;
export type SalesReturnDetail = typeof salesReturnDetailsTable.$inferSelect;
