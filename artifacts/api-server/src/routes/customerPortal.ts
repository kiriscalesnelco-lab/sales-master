import { Router } from "express";
import { db } from "@workspace/db";
import { customerOtpsTable, customerOrdersTable, customerOrderDetailsTable, customersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.post("/customer/request-otp", async (req, res) => {
  const { mobile } = req.body as { mobile: string };
  if (!mobile) {
    res.status(400).json({ error: "mobile is required" });
    return;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const existingCustomer = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.contactNo, mobile))
    .limit(1);

  const isNew = existingCustomer.length === 0;

  await db.insert(customerOtpsTable).values({
    mobile,
    otp,
    customerName: existingCustomer[0]?.name ?? null,
    isVerified: false,
    expiresAt,
  });

  res.json({
    message: "OTP sent successfully. (Demo: OTP shown below)",
    otp,
    isNew,
  });
});

router.post("/customer/verify-otp", async (req, res) => {
  const { mobile, otp } = req.body as { mobile: string; otp: string };
  if (!mobile || !otp) {
    res.status(400).json({ error: "mobile and otp are required" });
    return;
  }

  const records = await db
    .select()
    .from(customerOtpsTable)
    .where(eq(customerOtpsTable.mobile, mobile))
    .orderBy(desc(customerOtpsTable.createdAt))
    .limit(1);

  if (records.length === 0) {
    res.status(400).json({ error: "OTP not found. Please request a new OTP." });
    return;
  }

  const record = records[0];

  if (record.otp !== otp) {
    res.status(400).json({ error: "Invalid OTP." });
    return;
  }

  if (new Date() > record.expiresAt) {
    res.status(400).json({ error: "OTP has expired. Please request a new one." });
    return;
  }

  await db
    .update(customerOtpsTable)
    .set({ isVerified: true })
    .where(eq(customerOtpsTable.id, record.id));

  const existingCustomer = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.contactNo, mobile))
    .limit(1);

  const isNew = existingCustomer.length === 0;

  res.json({
    mobile,
    customerName: existingCustomer[0]?.name ?? null,
    isNew,
    isVerified: true,
  });
});

router.post("/customer/register", async (req, res) => {
  const { mobile, name } = req.body as { mobile: string; name: string };
  if (!mobile || !name) {
    res.status(400).json({ error: "mobile and name are required" });
    return;
  }

  const existingCustomer = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.contactNo, mobile))
    .limit(1);

  if (existingCustomer.length > 0) {
    res.json({
      mobile,
      customerName: existingCustomer[0].name,
      isNew: false,
      isVerified: true,
    });
    return;
  }

  const [inserted] = await db
    .insert(customersTable)
    .values({
      name,
      contactNo: mobile,
      creditLimit: "0",
      loyaltyPoints: "0",
    })
    .returning();

  res.json({
    mobile,
    customerName: inserted.name,
    isNew: false,
    isVerified: true,
  });
});

router.post("/customer/orders", async (req, res) => {
  const { mobile, customerName, details } = req.body as {
    mobile: string;
    customerName: string;
    details: { productId: number; productName: string; price: number; qty: number }[];
  };

  if (!mobile || !customerName || !details || details.length === 0) {
    res.status(400).json({ error: "mobile, customerName, and details are required" });
    return;
  }

  const totalAmount = details.reduce((sum, d) => sum + Number(d.price) * Number(d.qty), 0);

  const [order] = await db
    .insert(customerOrdersTable)
    .values({
      mobile,
      customerName,
      status: "pending",
      totalAmount: totalAmount.toFixed(2),
      billNo: null,
      orderDate: getTodayDate(),
    })
    .returning();

  await db.insert(customerOrderDetailsTable).values(
    details.map((d) => ({
      orderId: order.id,
      productId: d.productId,
      productName: d.productName,
      price: Number(d.price).toFixed(2),
      qty: Number(d.qty).toFixed(2),
    }))
  );

  res.status(201).json({
    id: order.id,
    mobile: order.mobile,
    customerName: order.customerName,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    billNo: order.billNo,
    orderDate: order.orderDate,
    createdAt: order.createdAt.toISOString(),
  });
});

router.get("/customer/orders/:mobile", async (req, res) => {
  const { mobile } = req.params;
  const orders = await db
    .select()
    .from(customerOrdersTable)
    .where(eq(customerOrdersTable.mobile, mobile))
    .orderBy(desc(customerOrdersTable.createdAt));

  res.json(
    orders.map((o) => ({
      id: o.id,
      mobile: o.mobile,
      customerName: o.customerName,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      billNo: o.billNo,
      orderDate: o.orderDate,
      createdAt: o.createdAt.toISOString(),
    }))
  );
});

export default router;
