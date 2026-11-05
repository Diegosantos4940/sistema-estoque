
import { Router } from "express";

import {
    listarMovimentacoes,
    registrarEntrada,
    registrarSaida
} from "../controllers/movimentacaoController.js";

import { autenticar } from "../middlewares/authMiddleware.js";

const router = Router();

// Todas as rotas exigem autenticação
router.use(autenticar);

// Consultar histórico
router.get("/", listarMovimentacoes);

// Registrar entrada
router.post("/entrada", registrarEntrada);

// Registrar saída
router.post("/saida", registrarSaida);

export default router;
