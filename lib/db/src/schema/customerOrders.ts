import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";

export const customerOrdersTable = pgTable("customer_orders", {
  id: serial("id").primaryKey(),
  mobile: text("mobile").notNull(),
  customerName: text("customer_name").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  billNo: text("bill_no"),
  orderDate: text("order_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerOrderDetailsTable = pgTable("customer_order_details", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => customerOrdersTable.id),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
});

export type CustomerOrder = typeof customerOrdersTable.$inferSelect;
export type CustomerOrderDetail = typeof customerOrderDetailsTable.$inferSelect;
