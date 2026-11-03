import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import pool from "./config/database.js";

const app = express();

app.use(helmet());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.json());

// Rota inicial
app.get("/", (req, res) => {
    res.json({
        mensagem: "API do Sistema de Estoque funcionando!"
    });
});

// Teste de conexão com PostgreSQL
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
        console.error("Erro ao conectar ao banco:", error);

        res.status(500).json({
            status: "erro",
            mensagem: "Não foi possível conectar ao banco de dados."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});