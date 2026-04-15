import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, salesTable, purchasesTable, productsTable, customersTable, suppliersTable, stockMovementsTable, saleDetailsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + "01";

  const [salesTodayResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
    .from(salesTable)
    .where(sql`sale_date = ${today}`);

  const [salesMonthResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
    .from(salesTable)
    .where(sql`sale_date >= ${firstOfMonth}`);

  const [purchasesMonthResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
    .from(purchasesTable)
    .where(sql`purchase_date >= ${firstOfMonth}`);

  const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customersTable);
  const [supplierCount] = await db.select({ count: sql<number>`count(*)` }).from(suppliersTable);

  // Low stock: products with stock <= 10
  const stockSums = await db
    .select({
      productId: stockMovementsTable.productId,
      stock: sql<string>`COALESCE(SUM(stock_in), 0) - COALESCE(SUM(stock_out), 0)`,
    })
    .from(stockMovementsTable)
    .groupBy(stockMovementsTable.productId);

  const lowStockCount = stockSums.filter(s => Number(s.stock) <= 10).length;

  const salesMonth = Number(salesMonthResult.total);
  const purchasesMonth = Number(purchasesMonthResult.total);

  res.json({
    totalSalesToday: Number(salesTodayResult.total),
    totalSalesThisMonth: salesMonth,
    totalPurchasesThisMonth: purchasesMonth,
    totalProductsCount: Number(productCount.count),
    lowStockCount,
    totalCustomers: Number(customerCount.count),
    totalSuppliers: Number(supplierCount.count),
    netProfitThisMonth: salesMonth - purchasesMonth,
  });
});

router.get("/dashboard/recent-sales", async (req, res): Promise<void> => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;

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
    .orderBy(sql`${salesTable.createdAt} DESC`)
    .limit(limit);

  res.json(sales.map(s => ({
    ...s,
    totalAmount: Number(s.totalAmount),
    createdAt: s.createdAt.toISOString(),
    details: [],
    payments: [],
  })));
});

router.get("/dashboard/low-stock", async (req, res): Promise<void> => {
  const threshold = req.query.threshold ? Number(req.query.threshold) : 10;

  const stockSums = await db
    .select({
      productId: stockMovementsTable.productId,
      stock: sql<string>`COALESCE(SUM(stock_in), 0) - COALESCE(SUM(stock_out), 0)`,
    })
    .from(stockMovementsTable)
    .groupBy(stockMovementsTable.productId)
    .having(sql`COALESCE(SUM(stock_in), 0) - COALESCE(SUM(stock_out), 0) <= ${threshold}`);

  if (stockSums.length === 0) {
    res.json([]);
    return;
  }

  const productIds = stockSums.map(s => s.productId);
  const stockMap = new Map(stockSums.map(s => [s.productId, Number(s.stock)]));

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
    })
    .from(productsTable)
    .where(sql`${productsTable.id} = ANY(${productIds})`);

  res.json(products.map(p => ({
    ...p,
    salesPrice: Number(p.salesPrice),
    cost: Number(p.cost),
    discount: Number(p.discount),
    currentStock: stockMap.get(p.id) ?? 0,
    categoryName: null,
    brandName: null,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.get("/dashboard/sales-trend", async (req, res): Promise<void> => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString().slice(0, 10);

  const trendData = await db
    .select({
      date: salesTable.saleDate,
      totalSales: sql<string>`SUM(total_amount)`,
      orderCount: sql<number>`count(*)`,
    })
    .from(salesTable)
    .where(sql`sale_date >= ${fromStr}`)
    .groupBy(salesTable.saleDate)
    .orderBy(salesTable.saleDate);

  res.json(trendData.map(t => ({
    date: t.date,
    totalSales: Number(t.totalSales),
    orderCount: Number(t.orderCount),
  })));
});

router.get("/dashboard/top-products", async (req, res): Promise<void> => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;

  const topProducts = await db
    .select({
      productId: saleDetailsTable.productId,
      productName: productsTable.name,
      productCode: productsTable.productCode,
      totalQtySold: sql<string>`SUM(${saleDetailsTable.qty})`,
      totalRevenue: sql<string>`SUM(${saleDetailsTable.salesPrice} * ${saleDetailsTable.qty})`,
    })
    .from(saleDetailsTable)
    .leftJoin(productsTable, eq(saleDetailsTable.productId, productsTable.id))
    .groupBy(saleDetailsTable.productId, productsTable.name, productsTable.productCode)
    .orderBy(sql`SUM(${saleDetailsTable.qty}) DESC`)
    .limit(limit);

  res.json(topProducts.map(p => ({
    productId: p.productId,
    productName: p.productName ?? "",
    productCode: p.productCode ?? "",
    totalQtySold: Number(p.totalQtySold),
    totalRevenue: Number(p.totalRevenue),
  })));
});

export default router;
