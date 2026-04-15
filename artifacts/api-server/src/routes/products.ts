import { Router, type IRouter } from "express";
import { eq, sql, and, ilike, isNull } from "drizzle-orm";
import { db, productsTable, categoriesTable, brandsTable, stockMovementsTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapProduct(p: Record<string, unknown>, stock: number) {
  return {
    ...p,
    salesPrice: Number(p.salesPrice),
    cost: Number(p.cost),
    discount: Number(p.discount),
    currentStock: stock,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

async function getStock(productId: number): Promise<number> {
  const result = await db
    .select({
      total: sql<string>`COALESCE(SUM(stock_in), 0) - COALESCE(SUM(stock_out), 0)`,
    })
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.productId, productId));
  return Number(result[0]?.total ?? 0);
}

router.get("/products", async (req, res): Promise<void> => {
  const qp = ListProductsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (qp.data.categoryId != null) conditions.push(eq(productsTable.categoryId, qp.data.categoryId));
  if (qp.data.brandId != null) conditions.push(eq(productsTable.brandId, qp.data.brandId));
  if (qp.data.search) conditions.push(ilike(productsTable.name, `%${qp.data.search}%`));
  if (qp.data.activeOnly === true) conditions.push(eq(productsTable.isActive, true));

  const products = await db
    .select({
      id: productsTable.id,
      productCode: productsTable.productCode,
      name: productsTable.name,
      description: productsTable.description,
      categoryId: productsTable.categoryId,
      brandId: productsTable.brandId,
      barcode: productsTable.barcode,
      salesPrice: productsTable.salesPrice,
      cost: productsTable.cost,
      discount: productsTable.discount,
      discountType: productsTable.discountType,
      hasExpiry: productsTable.hasExpiry,
      valuationMethod: productsTable.valuationMethod,
      isActive: productsTable.isActive,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
      brandName: brandsTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  const stockSums = await db
    .select({
      productId: stockMovementsTable.productId,
      stock: sql<string>`COALESCE(SUM(stock_in), 0) - COALESCE(SUM(stock_out), 0)`,
    })
    .from(stockMovementsTable)
    .groupBy(stockMovementsTable.productId);

  const stockMap = new Map(stockSums.map(s => [s.productId, Number(s.stock)]));

  res.json(products.map(p => ({
    ...p,
    salesPrice: Number(p.salesPrice),
    cost: Number(p.cost),
    discount: Number(p.discount),
    currentStock: stockMap.get(p.id) ?? 0,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let productCode = parsed.data.productCode;
  if (!productCode) {
    const count = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
    productCode = `PRD-${String(Number(count[0].count) + 1).padStart(5, "0")}`;
  }

  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    productCode,
    discount: parsed.data.discount ?? 0,
    discountType: parsed.data.discountType ?? "fixed",
    hasExpiry: parsed.data.hasExpiry ?? false,
    valuationMethod: parsed.data.valuationMethod ?? "fifo",
    isActive: parsed.data.isActive ?? true,
  }).returning();

  res.status(201).json({
    ...product,
    salesPrice: Number(product.salesPrice),
    cost: Number(product.cost),
    discount: Number(product.discount),
    categoryName: null,
    brandName: null,
    createdAt: product.createdAt.toISOString(),
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select({
      id: productsTable.id,
      productCode: productsTable.productCode,
      name: productsTable.name,
      description: productsTable.description,
      categoryId: productsTable.categoryId,
      brandId: productsTable.brandId,
      barcode: productsTable.barcode,
      salesPrice: productsTable.salesPrice,
      cost: productsTable.cost,
      discount: productsTable.discount,
      discountType: productsTable.discountType,
      hasExpiry: productsTable.hasExpiry,
      valuationMethod: productsTable.valuationMethod,
      isActive: productsTable.isActive,
      createdAt: productsTable.createdAt,
      categoryName: categoriesTable.name,
      brandName: brandsTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(brandsTable, eq(productsTable.brandId, brandsTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const stock = await getStock(product.id);
  res.json({
    ...product,
    salesPrice: Number(product.salesPrice),
    cost: Number(product.cost),
    discount: Number(product.discount),
    currentStock: stock,
    createdAt: product.createdAt.toISOString(),
  });
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.update(productsTable).set(parsed.data).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    ...product,
    salesPrice: Number(product.salesPrice),
    cost: Number(product.cost),
    discount: Number(product.discount),
    categoryName: null,
    brandName: null,
    createdAt: product.createdAt.toISOString(),
  });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
