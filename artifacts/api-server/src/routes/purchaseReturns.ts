import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, purchaseReturnsTable, purchaseReturnDetailsTable, productsTable, suppliersTable, stockMovementsTable } from "@workspace/db";
import {
  CreatePurchaseReturnBody,
  GetPurchaseReturnParams,
  ListPurchaseReturnsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getReturnWithDetails(id: number) {
  const [ret] = await db
    .select({
      id: purchaseReturnsTable.id,
      returnDate: purchaseReturnsTable.returnDate,
      supplierId: purchaseReturnsTable.supplierId,
      supplierName: suppliersTable.name,
      supplierBillNo: purchaseReturnsTable.supplierBillNo,
      totalAmount: purchaseReturnsTable.totalAmount,
      createdAt: purchaseReturnsTable.createdAt,
    })
    .from(purchaseReturnsTable)
    .leftJoin(suppliersTable, eq(purchaseReturnsTable.supplierId, suppliersTable.id))
    .where(eq(purchaseReturnsTable.id, id));

  if (!ret) return null;

  const details = await db
    .select({
      id: purchaseReturnDetailsTable.id,
      purchaseReturnId: purchaseReturnDetailsTable.purchaseReturnId,
      productId: purchaseReturnDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      cost: purchaseReturnDetailsTable.cost,
      discount: purchaseReturnDetailsTable.discount,
      qty: purchaseReturnDetailsTable.qty,
    })
    .from(purchaseReturnDetailsTable)
    .leftJoin(productsTable, eq(purchaseReturnDetailsTable.productId, productsTable.id))
    .where(eq(purchaseReturnDetailsTable.purchaseReturnId, id));

  return {
    ...ret,
    totalAmount: Number(ret.totalAmount),
    createdAt: ret.createdAt.toISOString(),
    details: details.map(d => ({
      ...d,
      productName: d.productName ?? "",
      productCode: d.productCode ?? "",
      cost: Number(d.cost),
      discount: Number(d.discount),
      qty: Number(d.qty),
    })),
  };
}

router.get("/purchase-returns", async (req, res): Promise<void> => {
  const qp = ListPurchaseReturnsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (qp.data.supplierId != null) conditions.push(eq(purchaseReturnsTable.supplierId, qp.data.supplierId));

  const returns = await db
    .select({
      id: purchaseReturnsTable.id,
      returnDate: purchaseReturnsTable.returnDate,
      supplierId: purchaseReturnsTable.supplierId,
      supplierName: suppliersTable.name,
      supplierBillNo: purchaseReturnsTable.supplierBillNo,
      totalAmount: purchaseReturnsTable.totalAmount,
      createdAt: purchaseReturnsTable.createdAt,
    })
    .from(purchaseReturnsTable)
    .leftJoin(suppliersTable, eq(purchaseReturnsTable.supplierId, suppliersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(purchaseReturnsTable.id);

  res.json(returns.map(r => ({
    ...r,
    totalAmount: Number(r.totalAmount),
    createdAt: r.createdAt.toISOString(),
    details: [],
  })));
});

router.post("/purchase-returns", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseReturnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const totalAmount = parsed.data.details.reduce((sum, d) => {
    return sum + (Number(d.cost) - Number(d.discount ?? 0)) * Number(d.qty);
  }, 0);

  const [ret] = await db.insert(purchaseReturnsTable).values({
    returnDate: parsed.data.returnDate,
    supplierId: parsed.data.supplierId ?? null,
    supplierBillNo: parsed.data.supplierBillNo ?? null,
    totalAmount: String(totalAmount),
  }).returning();

  const detailValues = parsed.data.details.map(d => ({
    purchaseReturnId: ret.id,
    productId: d.productId,
    cost: String(d.cost),
    discount: String(d.discount ?? 0),
    qty: String(d.qty),
  }));
  await db.insert(purchaseReturnDetailsTable).values(detailValues);

  // Record stock movements (stock out for purchase return)
  const stockMovements = parsed.data.details.map(d => ({
    movementDate: parsed.data.returnDate,
    productId: d.productId,
    stockIn: "0",
    stockOut: String(d.qty),
    movementType: "purchase_return" as const,
    referenceId: ret.id,
    notes: `Purchase Return #${ret.id}`,
  }));
  await db.insert(stockMovementsTable).values(stockMovements);

  const result = await getReturnWithDetails(ret.id);
  res.status(201).json(result);
});

router.get("/purchase-returns/:id", async (req, res): Promise<void> => {
  const params = GetPurchaseReturnParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getReturnWithDetails(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Purchase return not found" });
    return;
  }
  res.json(result);
});

export default router;
