import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import brandsRouter from "./brands";
import productsRouter from "./products";
import suppliersRouter from "./suppliers";
import customersRouter from "./customers";
import purchasesRouter from "./purchases";
import purchaseReturnsRouter from "./purchaseReturns";
import salesRouter from "./sales";
import salesReturnsRouter from "./salesReturns";
import stockMovementsRouter from "./stockMovements";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(brandsRouter);
router.use(productsRouter);
router.use(suppliersRouter);
router.use(customersRouter);
router.use(purchasesRouter);
router.use(purchaseReturnsRouter);
router.use(salesRouter);
router.use(salesReturnsRouter);
router.use(stockMovementsRouter);
router.use(dashboardRouter);

export default router;
