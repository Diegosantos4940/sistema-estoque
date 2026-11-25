
import express from "express";

import {
    listarUsuarios,
    detalharUsuario,
    editarUsuario,
    alterarPermissoes,
    redefinirSenha
} from "../controllers/usuarioController.js";

import {
    autenticar,
    somenteAdmin
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Exigir autenticação e perfil administrativo
router.use(autenticar);
router.use(somenteAdmin);

// Listar usuários
router.get("/", listarUsuarios);

// Consultar usuário específico
router.get("/:id", detalharUsuario);

// Editar informações
router.put("/:id", editarUsuario);

// Alterar perfil e situação da conta
router.patch("/:id/permissoes", alterarPermissoes);

// Redefinir senha
router.patch("/:id/senha", redefinirSenha);

export default router;
