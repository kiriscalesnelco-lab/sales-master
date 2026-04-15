import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, stockMovementsTable, productsTable } from "@workspace/db";
import { ListStockMovementsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stock-movements", async (req, res): Promise<void> => {
  const qp = ListStockMovementsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (qp.data.productId != null) conditions.push(eq(stockMovementsTable.productId, qp.data.productId));

  const movements = await db
    .select({
      id: stockMovementsTable.id,
      movementDate: stockMovementsTable.movementDate,
      productId: stockMovementsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      stockIn: stockMovementsTable.stockIn,
      stockOut: stockMovementsTable.stockOut,
      movementType: stockMovementsTable.movementType,
      referenceId: stockMovementsTable.referenceId,
      notes: stockMovementsTable.notes,
    })
    .from(stockMovementsTable)
    .leftJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(stockMovementsTable.id);

  res.json(movements.map(m => ({
    ...m,
    productName: m.productName ?? "",
    productCode: m.productCode ?? "",
    stockIn: Number(m.stockIn),
    stockOut: Number(m.stockOut),
  })));
});

export default router;
