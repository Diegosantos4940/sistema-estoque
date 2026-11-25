
import express from "express";

import {
    registrarVenda,
    listarVendas,
    detalharVenda
} from "../controllers/vendaController.js";

import { autenticar } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas as rotas exigem autenticação
router.use(autenticar);

// Registrar venda
router.post("/", registrarVenda);

// Listar vendas
router.get("/", listarVendas);

// Consultar detalhes de uma venda
router.get("/:id", detalharVenda);

export default router;
