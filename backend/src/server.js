import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import pool from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(helmet());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Rota inicial
app.get("/", (req, res) => {
    res.json({
        mensagem: "API do Sistema de Estoque funcionando!"
    });
});

// Teste do PostgreSQL
app.get("/api/health/db", async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT NOW() AS horario"
        );

        res.json({
            status: "conectado",
            banco: "PostgreSQL",
            horario: resultado.rows[0].horario
        });

    } catch (error) {
        console.error("Erro no banco:", error);

        res.status(500).json({
            status: "erro",
            mensagem: "Falha na conexão com o banco."
        });
    }
});

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Inicialização
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});