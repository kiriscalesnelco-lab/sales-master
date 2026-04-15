import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  DeleteCustomerParams,
  ListCustomersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapCustomer(c: typeof customersTable.$inferSelect) {
  return {
    ...c,
    creditLimit: Number(c.creditLimit),
    loyaltyPoints: Number(c.loyaltyPoints),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", async (req, res): Promise<void> => {
  const qp = ListCustomersQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  let customers;
  if (qp.data.search) {
    customers = await db.select().from(customersTable).where(ilike(customersTable.name, `%${qp.data.search}%`)).orderBy(customersTable.name);
  } else {
    customers = await db.select().from(customersTable).orderBy(customersTable.name);
  }
  res.json(customers.map(mapCustomer));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [c] = await db.insert(customersTable).values({
    ...parsed.data,
    loyaltyPoints: parsed.data.loyaltyPoints ?? 0,
  }).returning();
  res.status(201).json(mapCustomer(c));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!c) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(mapCustomer(c));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [c] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, params.data.id)).returning();
  if (!c) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(mapCustomer(c));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(customersTable).where(eq(customersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
