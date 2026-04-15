import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, salesReturnsTable, salesReturnDetailsTable, productsTable, customersTable, stockMovementsTable } from "@workspace/db";
import {
  CreateSalesReturnBody,
  GetSalesReturnParams,
  ListSalesReturnsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getReturnWithDetails(id: number) {
  const [ret] = await db
    .select({
      id: salesReturnsTable.id,
      returnDate: salesReturnsTable.returnDate,
      customerId: salesReturnsTable.customerId,
      customerName: customersTable.name,
      originalBillNo: salesReturnsTable.originalBillNo,
      totalAmount: salesReturnsTable.totalAmount,
      createdAt: salesReturnsTable.createdAt,
    })
    .from(salesReturnsTable)
    .leftJoin(customersTable, eq(salesReturnsTable.customerId, customersTable.id))
    .where(eq(salesReturnsTable.id, id));

  if (!ret) return null;

  const details = await db
    .select({
      id: salesReturnDetailsTable.id,
      salesReturnId: salesReturnDetailsTable.salesReturnId,
      productId: salesReturnDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      salesPrice: salesReturnDetailsTable.salesPrice,
      discount: salesReturnDetailsTable.discount,
      qty: salesReturnDetailsTable.qty,
    })
    .from(salesReturnDetailsTable)
    .leftJoin(productsTable, eq(salesReturnDetailsTable.productId, productsTable.id))
    .where(eq(salesReturnDetailsTable.salesReturnId, id));

  return {
    ...ret,
    totalAmount: Number(ret.totalAmount),
    createdAt: ret.createdAt.toISOString(),
    details: details.map(d => ({
      ...d,
      productName: d.productName ?? "",
      productCode: d.productCode ?? "",
      salesPrice: Number(d.salesPrice),
      discount: Number(d.discount),
      qty: Number(d.qty),
    })),
  };
}

router.get("/sales-returns", async (req, res): Promise<void> => {
  const qp = ListSalesReturnsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (qp.data.customerId != null) conditions.push(eq(salesReturnsTable.customerId, qp.data.customerId));

  const returns = await db
    .select({
      id: salesReturnsTable.id,
      returnDate: salesReturnsTable.returnDate,
      customerId: salesReturnsTable.customerId,
      customerName: customersTable.name,
      originalBillNo: salesReturnsTable.originalBillNo,
      totalAmount: salesReturnsTable.totalAmount,
      createdAt: salesReturnsTable.createdAt,
    })
    .from(salesReturnsTable)
    .leftJoin(customersTable, eq(salesReturnsTable.customerId, customersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(salesReturnsTable.id);

  res.json(returns.map(r => ({
    ...r,
    totalAmount: Number(r.totalAmount),
    createdAt: r.createdAt.toISOString(),
    details: [],
  })));
});

router.post("/sales-returns", async (req, res): Promise<void> => {
  const parsed = CreateSalesReturnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const totalAmount = parsed.data.details.reduce((sum, d) => {
    return sum + (Number(d.salesPrice) - Number(d.discount ?? 0)) * Number(d.qty);
  }, 0);

  const [ret] = await db.insert(salesReturnsTable).values({
    returnDate: parsed.data.returnDate,
    customerId: parsed.data.customerId ?? null,
    originalBillNo: parsed.data.originalBillNo ?? null,
    totalAmount: String(totalAmount),
  }).returning();

  const detailValues = parsed.data.details.map(d => ({
    salesReturnId: ret.id,
    productId: d.productId,
    salesPrice: String(d.salesPrice),
    discount: String(d.discount ?? 0),
    qty: String(d.qty),
  }));
  await db.insert(salesReturnDetailsTable).values(detailValues);

  // Record stock movements (stock in for sales return)
  const stockMovements = parsed.data.details.map(d => ({
    movementDate: parsed.data.returnDate,
    productId: d.productId,
    stockIn: String(d.qty),
    stockOut: "0",
    movementType: "sales_return" as const,
    referenceId: ret.id,
    notes: `Sales Return #${ret.id}`,
  }));
  await db.insert(stockMovementsTable).values(stockMovements);

  const result = await getReturnWithDetails(ret.id);
  res.status(201).json(result);
});

router.get("/sales-returns/:id", async (req, res): Promise<void> => {
  const params = GetSalesReturnParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getReturnWithDetails(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Sales return not found" });
    return;
  }
  res.json(result);
});

export default router;
