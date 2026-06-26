import { Router, type IRouter } from "express";
import healthRouter from "./health";
import starsRouter from "./stars";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/stars", starsRouter);
router.use(statsRouter);

export default router;
