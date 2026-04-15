import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const customerOtpsTable = pgTable("customer_otps", {
  id: serial("id").primaryKey(),
  mobile: text("mobile").notNull(),
  otp: text("otp").notNull(),
  customerName: text("customer_name"),
  isVerified: boolean("is_verified").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CustomerOtp = typeof customerOtpsTable.$inferSelect;
