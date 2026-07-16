import { Router } from "express";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import contractsRouter from "./contracts";
import questionsRouter from "./questions";
import remindersRouter from "./reminders";
import adminRouter from "./admin";

const router = Router();

router.use(authRouter);
router.use(dashboardRouter);
router.use(contractsRouter);
router.use(questionsRouter);
router.use(remindersRouter);
router.use(adminRouter);

export default router;
