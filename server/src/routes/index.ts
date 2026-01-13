import { Router } from "express";
import runnersRoutes from "./runners";
import targetsRoutes from "./targets";

const router = Router();

router.use("/runners", runnersRoutes);
router.use("/targets", targetsRoutes);

export default router;
