import jwt from "jsonwebtoken";
import pool from "../config/database.js";

export async function autenticar(req, res, next) {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                mensagem: "Autenticação necessária."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                issuer: "sistema-estoque"
            }
        );

        const resultado = await pool.query(
            `SELECT id, nome, email, perfil
             FROM usuarios
             WHERE id = $1 AND ativo = TRUE`,
            [decoded.sub]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: "Usuário não autorizado."
            });
        }

        req.usuario = resultado.rows[0];

        next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                mensagem: "Sessão inválida ou expirada."
            });
        }

        console.error("Erro na autenticação:", error);

        return res.status(500).json({
            mensagem: "Erro ao verificar autenticação."
        });
    }
}

export function somenteAdmin(req, res, next) {
    if (req.usuario?.perfil !== "admin") {
        return res.status(403).json({
            mensagem: "Você não tem permissão para realizar esta operação."
        });
    }

    next();
}