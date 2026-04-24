import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, salesTable, saleDetailsTable, paymentTransactionsTable, productsTable, customersTable, stockMovementsTable } from "@workspace/db";
import {
  CreateSaleBody,
  GetSaleParams,
  DeleteSaleParams,
  ListSalesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function generateBillNo(): Promise<string> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(salesTable);
  const num = Number(result[0].count) + 1;
  return `BILL-${String(num).padStart(6, "0")}`;
}

async function getSaleWithDetails(id: number) {
  const [sale] = await db
    .select({
      id: salesTable.id,
      saleDate: salesTable.saleDate,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      billNo: salesTable.billNo,
      totalAmount: salesTable.totalAmount,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(eq(salesTable.id, id));

  if (!sale) return null;

  const details = await db
    .select({
      id: saleDetailsTable.id,
      saleId: saleDetailsTable.saleId,
      productId: saleDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      salesPrice: saleDetailsTable.salesPrice,
      discount: saleDetailsTable.discount,
      qty: saleDetailsTable.qty,
      taxRate: productsTable.taxRate,
    })
    .from(saleDetailsTable)
    .leftJoin(productsTable, eq(saleDetailsTable.productId, productsTable.id))
    .where(eq(saleDetailsTable.saleId, id));

  const payments = await db.select().from(paymentTransactionsTable).where(eq(paymentTransactionsTable.saleId, id));

  return {
    ...sale,
    totalAmount: Number(sale.totalAmount),
    createdAt: sale.createdAt.toISOString(),
    details: details.map(d => ({
      ...d,
      productName: d.productName ?? "",
      productCode: d.productCode ?? "",
      salesPrice: Number(d.salesPrice),
      discount: Number(d.discount),
      qty: Number(d.qty),
      taxRate: Number(d.taxRate ?? 18),
    })),
    payments: payments.map(p => ({ ...p, amount: Number(p.amount) })),
  };
}

router.get("/sales", async (req, res): Promise<void> => {
  const qp = ListSalesQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (qp.data.customerId != null) conditions.push(eq(salesTable.customerId, qp.data.customerId));

  const sales = await db
    .select({
      id: salesTable.id,
      saleDate: salesTable.saleDate,
      customerId: salesTable.customerId,
      customerName: customersTable.name,
      billNo: salesTable.billNo,
      totalAmount: salesTable.totalAmount,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(salesTable.id);

  if (sales.length === 0) {
    res.json([]);
    return;
  }

  const allDetails = await db
    .select({
      id: saleDetailsTable.id,
      saleId: saleDetailsTable.saleId,
      productId: saleDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      salesPrice: saleDetailsTable.salesPrice,
      discount: saleDetailsTable.discount,
      qty: saleDetailsTable.qty,
      taxRate: productsTable.taxRate,
    })
    .from(saleDetailsTable)
    .leftJoin(productsTable, eq(saleDetailsTable.productId, productsTable.id));

  const allPayments = await db.select().from(paymentTransactionsTable);

  const detailsBySale = new Map<number, typeof allDetails>();
  const paymentsBySale = new Map<number, typeof allPayments>();
  for (const d of allDetails) {
    if (!detailsBySale.has(d.saleId)) detailsBySale.set(d.saleId, []);
    detailsBySale.get(d.saleId)!.push(d);
  }
  for (const p of allPayments) {
    if (!paymentsBySale.has(p.saleId)) paymentsBySale.set(p.saleId, []);
    paymentsBySale.get(p.saleId)!.push(p);
  }

  res.json(sales.map(s => ({
    ...s,
    totalAmount: Number(s.totalAmount),
    createdAt: s.createdAt.toISOString(),
    details: (detailsBySale.get(s.id) ?? []).map(d => ({
      ...d,
      productName: d.productName ?? "",
      productCode: d.productCode ?? "",
      salesPrice: Number(d.salesPrice),
      discount: Number(d.discount),
      qty: Number(d.qty),
      taxRate: Number(d.taxRate ?? 18),
    })),
    payments: (paymentsBySale.get(s.id) ?? []).map(p => ({ ...p, amount: Number(p.amount) })),
  })));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const totalAmount = parsed.data.details.reduce((sum, d) => {
    return sum + (Number(d.salesPrice) - Number(d.discount ?? 0)) * Number(d.qty);
  }, 0);

  const billNo = await generateBillNo();

  const [sale] = await db.insert(salesTable).values({
    saleDate: parsed.data.saleDate,
    customerId: parsed.data.customerId ?? null,
    billNo,
    totalAmount: String(totalAmount),
  }).returning();

  const detailValues = parsed.data.details.map(d => ({
    saleId: sale.id,
    productId: d.productId,
    salesPrice: String(d.salesPrice),
    discount: String(d.discount ?? 0),
    qty: String(d.qty),
  }));
  await db.insert(saleDetailsTable).values(detailValues);

  if (parsed.data.payments.length > 0) {
    const paymentValues = parsed.data.payments.map(p => ({
      saleId: sale.id,
      paymentType: p.paymentType,
      amount: String(p.amount),
    }));
    await db.insert(paymentTransactionsTable).values(paymentValues);
  }

  const stockMovements = parsed.data.details.map(d => ({
    movementDate: parsed.data.saleDate,
    productId: d.productId,
    stockIn: "0",
    stockOut: String(d.qty),
    movementType: "sale" as const,
    referenceId: sale.id,
    notes: `Sale ${billNo}`,
  }));
  await db.insert(stockMovementsTable).values(stockMovements);

  if (parsed.data.customerId) {
    const pointsEarned = Math.floor(totalAmount / 100);
    if (pointsEarned > 0) {
      await db.execute(
        sql`UPDATE customers SET loyalty_points = loyalty_points + ${pointsEarned} WHERE id = ${parsed.data.customerId}`
      );
    }
  }

  const result = await getSaleWithDetails(sale.id);
  res.status(201).json(result);
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getSaleWithDetails(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  res.json(result);
});

router.delete("/sales/:id", async (req, res): Promise<void> => {
  const params = DeleteSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(salesTable).where(eq(salesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
