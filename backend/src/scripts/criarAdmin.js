import "dotenv/config";

import bcrypt from "bcrypt";
import pool from "../config/database.js";

async function criarAdmin() {
    try {
        const nome = process.env.ADMIN_NAME;
        const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const senha = process.env.ADMIN_PASSWORD;

        if (!nome || !email || !senha) {
            throw new Error(
                "Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no .env"
            );
        }

        if (senha.length < 8 || senha.length > 72) {
            throw new Error("A senha deve ter entre 8 e 72 caracteres.");
        }

        const hash = await bcrypt.hash(senha, 12);

        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha, perfil)
             VALUES ($1, $2, $3, 'admin')
             ON CONFLICT (email) DO NOTHING
             RETURNING id, nome, email, perfil`,
            [nome, email, hash]
        );

        if (resultado.rows.length === 0) {
            console.log("Este e-mail já possui cadastro.");
        } else {
            console.log("Administrador criado:");
            console.log(resultado.rows[0]);
        }

    } catch (error) {
        console.error("Erro:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

criarAdmin();