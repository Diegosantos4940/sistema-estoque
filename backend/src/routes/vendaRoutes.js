
import express from "express";

import { registrarVenda } from "../controllers/vendaController.js";
import { autenticar } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(autenticar);

// Registrar venda
router.post("/", registrarVenda);

export default router;
