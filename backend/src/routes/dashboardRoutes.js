import { Router } from "express";

import { obterDashboard } from "../controllers/dashboardController.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(autenticar);

router.get("/", obterDashboard);

export default router;