import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import {
  CreateSupplierBody,
  UpdateSupplierBody,
  GetSupplierParams,
  UpdateSupplierParams,
  DeleteSupplierParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapSupplier(s: typeof suppliersTable.$inferSelect) {
  return { ...s, creditLimit: Number(s.creditLimit), createdAt: s.createdAt.toISOString() };
}

router.get("/suppliers", async (_req, res): Promise<void> => {
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(suppliers.map(mapSupplier));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [s] = await db.insert(suppliersTable).values(parsed.data).returning();
  res.status(201).json(mapSupplier(s));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  if (!s) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(mapSupplier(s));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [s] = await db.update(suppliersTable).set(parsed.data).where(eq(suppliersTable.id, params.data.id)).returning();
  if (!s) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(mapSupplier(s));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
