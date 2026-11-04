import { Router } from "express";

import {
    registrar,
    login,
    logout,
    usuarioAtual
} from "../controllers/authController.js";

import {
    autenticar,
    somenteAdmin
} from "../middlewares/authMiddleware.js";

const router = Router();

// Login
router.post("/login", login);

// Logout
router.post("/logout", autenticar, logout);

// Consultar usuário autenticado
router.get("/me", autenticar, usuarioAtual);

// Cadastro de funcionários (somente administrador)
router.post(
    "/register",
    autenticar,
    somenteAdmin,
    registrar
);

export default router;