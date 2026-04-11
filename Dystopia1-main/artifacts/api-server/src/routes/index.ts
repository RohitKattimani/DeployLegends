import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulationsRouter from "./simulations";
import agentsRouter from "./agents";
import consiliumRouter from "./consilium";
import messagesRouter from "./messages";
import threadsRouter from "./threads";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/simulations", simulationsRouter);
router.use("/agents", agentsRouter);
router.use("/consilium", consiliumRouter);
router.use("/messages", messagesRouter);
router.use("/threads", threadsRouter);

export default router;
