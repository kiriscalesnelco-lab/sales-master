import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, purchasesTable, purchaseDetailsTable, productsTable, suppliersTable, stockMovementsTable } from "@workspace/db";
import {
  CreatePurchaseBody,
  GetPurchaseParams,
  DeletePurchaseParams,
  ListPurchasesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getPurchaseWithDetails(id: number) {
  const [purchase] = await db
    .select({
      id: purchasesTable.id,
      purchaseDate: purchasesTable.purchaseDate,
      supplierId: purchasesTable.supplierId,
      supplierName: suppliersTable.name,
      supplierBillNo: purchasesTable.supplierBillNo,
      totalAmount: purchasesTable.totalAmount,
      createdAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(eq(purchasesTable.id, id));

  if (!purchase) return null;

  const details = await db
    .select({
      id: purchaseDetailsTable.id,
      purchaseId: purchaseDetailsTable.purchaseId,
      productId: purchaseDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      cost: purchaseDetailsTable.cost,
      price: purchaseDetailsTable.price,
      discount: purchaseDetailsTable.discount,
      qty: purchaseDetailsTable.qty,
    })
    .from(purchaseDetailsTable)
    .leftJoin(productsTable, eq(purchaseDetailsTable.productId, productsTable.id))
    .where(eq(purchaseDetailsTable.purchaseId, id));

  return {
    ...purchase,
    totalAmount: Number(purchase.totalAmount),
    createdAt: purchase.createdAt.toISOString(),
    details: details.map(d => ({
      ...d,
      productName: d.productName ?? "",
      productCode: d.productCode ?? "",
      cost: Number(d.cost),
      price: Number(d.price),
      discount: Number(d.discount),
      qty: Number(d.qty),
    })),
  };
}

router.get("/purchases", async (req, res): Promise<void> => {
  const qp = ListPurchasesQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (qp.data.supplierId != null) conditions.push(eq(purchasesTable.supplierId, qp.data.supplierId));

  const purchases = await db
    .select({
      id: purchasesTable.id,
      purchaseDate: purchasesTable.purchaseDate,
      supplierId: purchasesTable.supplierId,
      supplierName: suppliersTable.name,
      supplierBillNo: purchasesTable.supplierBillNo,
      totalAmount: purchasesTable.totalAmount,
      createdAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(purchasesTable.id);

  const purchaseIds = purchases.map(p => p.id);
  if (purchaseIds.length === 0) {
    res.json([]);
    return;
  }

  const allDetails = await db
    .select({
      id: purchaseDetailsTable.id,
      purchaseId: purchaseDetailsTable.purchaseId,
      productId: purchaseDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      cost: purchaseDetailsTable.cost,
      price: purchaseDetailsTable.price,
      discount: purchaseDetailsTable.discount,
      qty: purchaseDetailsTable.qty,
    })
    .from(purchaseDetailsTable)
    .leftJoin(productsTable, eq(purchaseDetailsTable.productId, productsTable.id));

  const detailsByPurchase = new Map<number, typeof allDetails>();
  for (const d of allDetails) {
    if (!detailsByPurchase.has(d.purchaseId)) detailsByPurchase.set(d.purchaseId, []);
    detailsByPurchase.get(d.purchaseId)!.push(d);
  }

  res.json(purchases.map(p => ({
    ...p,
    totalAmount: Number(p.totalAmount),
    createdAt: p.createdAt.toISOString(),
    details: (detailsByPurchase.get(p.id) ?? []).map(d => ({
      ...d,
      productName: d.productName ?? "",
      productCode: d.productCode ?? "",
      cost: Number(d.cost),
      price: Number(d.price),
      discount: Number(d.discount),
      qty: Number(d.qty),
    })),
  })));
});

router.post("/purchases", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const totalAmount = parsed.data.details.reduce((sum, d) => {
    const lineTotal = (Number(d.cost) - Number(d.discount ?? 0)) * Number(d.qty);
    return sum + lineTotal;
  }, 0);

  const [purchase] = await db.insert(purchasesTable).values({
    purchaseDate: parsed.data.purchaseDate,
    supplierId: parsed.data.supplierId ?? null,
    supplierBillNo: parsed.data.supplierBillNo ?? null,
    totalAmount: String(totalAmount),
  }).returning();

  const detailValues = parsed.data.details.map(d => ({
    purchaseId: purchase.id,
    productId: d.productId,
    cost: String(d.cost),
    price: String(d.price),
    discount: String(d.discount ?? 0),
    qty: String(d.qty),
  }));

  await db.insert(purchaseDetailsTable).values(detailValues);

  // Record stock movements (stock in)
  const stockMovements = parsed.data.details.map(d => ({
    movementDate: parsed.data.purchaseDate,
    productId: d.productId,
    stockIn: String(d.qty),
    stockOut: "0",
    movementType: "purchase" as const,
    referenceId: purchase.id,
    notes: `Purchase #${purchase.id}`,
  }));
  await db.insert(stockMovementsTable).values(stockMovements);

  const result = await getPurchaseWithDetails(purchase.id);
  res.status(201).json(result);
});

router.get("/purchases/:id", async (req, res): Promise<void> => {
  const params = GetPurchaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getPurchaseWithDetails(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Purchase not found" });
    return;
  }
  res.json(result);
});

router.delete("/purchases/:id", async (req, res): Promise<void> => {
  const params = DeletePurchaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(purchasesTable).where(eq(purchasesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
