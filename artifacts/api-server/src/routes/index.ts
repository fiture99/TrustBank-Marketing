import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import campaignsRouter from "./campaigns";
import leadsRouter from "./leads";
import interactionsRouter from "./interactions";
import dealsRouter from "./deals";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(campaignsRouter);
router.use(leadsRouter);
router.use(interactionsRouter);
router.use(dealsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
