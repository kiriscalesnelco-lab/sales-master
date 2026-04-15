import { Router } from "express";
import { db } from "@workspace/db";
import { customerOrdersTable, customerOrderDetailsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

function generateBillNo(id: number): string {
  return `CORD-${String(id).padStart(6, "0")}`;
}

async function fetchOrderWithDetails(id: number) {
  const [order] = await db
    .select()
    .from(customerOrdersTable)
    .where(eq(customerOrdersTable.id, id))
    .limit(1);

  if (!order) return null;

  const details = await db
    .select()
    .from(customerOrderDetailsTable)
    .where(eq(customerOrderDetailsTable.orderId, id));

  return {
    id: order.id,
    mobile: order.mobile,
    customerName: order.customerName,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    billNo: order.billNo,
    orderDate: order.orderDate,
    createdAt: order.createdAt.toISOString(),
    details: details.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      productId: d.productId,
      productName: d.productName,
      price: Number(d.price),
      qty: Number(d.qty),
    })),
  };
}

router.get("/orders", async (req, res) => {
  const { status } = req.query as { status?: string };

  const orders = await db
    .select()
    .from(customerOrdersTable)
    .orderBy(desc(customerOrdersTable.createdAt));

  const filtered = status ? orders.filter((o) => o.status === status) : orders;

  const results = await Promise.all(filtered.map((o) => fetchOrderWithDetails(o.id)));
  res.json(results.filter(Boolean));
});

router.get("/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const order = await fetchOrderWithDetails(id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.patch("/orders/:id/confirm", async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db
    .select()
    .from(customerOrdersTable)
    .where(eq(customerOrdersTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const billNo = existing.billNo ?? generateBillNo(id);

  await db
    .update(customerOrdersTable)
    .set({ status: "billed", billNo })
    .where(eq(customerOrdersTable.id, id));

  const order = await fetchOrderWithDetails(id);
  res.json(order);
});

router.get("/orders/:id/bill", async (req, res) => {
  const id = parseInt(req.params.id);
  const order = await fetchOrderWithDetails(id);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const billNo = order.billNo ?? generateBillNo(id);

  const billDetails = order.details.map((d) => ({
    productName: d.productName,
    price: d.price,
    qty: d.qty,
    lineTotal: Number((d.price * d.qty).toFixed(2)),
  }));

  const qrData = JSON.stringify({
    billNo,
    customerName: order.customerName,
    mobile: order.mobile,
    totalAmount: order.totalAmount,
    orderDate: order.orderDate,
    items: billDetails.map((d) => ({
      name: d.productName,
      qty: d.qty,
      price: d.price,
    })),
  });

  res.json({
    billNo,
    mobile: order.mobile,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    orderDate: order.orderDate,
    details: billDetails,
    qrData,
    createdAt: order.createdAt,
  });
});

export default router;
