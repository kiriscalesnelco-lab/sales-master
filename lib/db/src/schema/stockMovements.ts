import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  movementDate: text("movement_date").notNull(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  stockIn: numeric("stock_in", { precision: 12, scale: 2 }).notNull().default("0"),
  stockOut: numeric("stock_out", { precision: 12, scale: 2 }).notNull().default("0"),
  movementType: text("movement_type").notNull(),
  referenceId: integer("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
