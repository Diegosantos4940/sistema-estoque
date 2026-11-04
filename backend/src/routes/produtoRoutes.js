import { Router } from "express";

import {
    listarProdutos,
    criarProduto,
    editarProduto,
    excluirProduto
} from "../controllers/produtoController.js";

import {
    autenticar,
    somenteAdmin
} from "../middlewares/authMiddleware.js";

const router = Router();

// Todas as rotas exigem login
router.use(autenticar);

// Listar produtos
router.get("/", listarProdutos);

// Cadastrar produto
router.post("/", criarProduto);

// Editar produto
router.put("/:id", editarProduto);

// Excluir produto (somente administrador)
router.delete("/:id", somenteAdmin, excluirProduto);

export default router;