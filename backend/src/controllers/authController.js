import pool from "../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function registrar(req, res) {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: "Preencha todos os campos."
            });
        }

        if (typeof nome !== "string" ||
            typeof email !== "string" ||
            typeof senha !== "string") {
            return res.status(400).json({
                mensagem: "Dados inválidos."
            });
        }

        if (senha.length < 8 || senha.length > 72) {
            return res.status(400).json({
                mensagem: "A senha deve ter entre 8 e 72 caracteres."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            return res.status(400).json({
                mensagem: "E-mail inválido."
            });
        }

        const existente = await pool.query(
            "SELECT id FROM usuarios WHERE email = $1",
            [emailNormalizado]
        );

        if (existente.rows.length > 0) {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        const hash = await bcrypt.hash(senha, 12);

        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha, perfil)
             VALUES ($1, $2, $3, 'funcionario')
             RETURNING id, nome, email, perfil`,
            [nome.trim(), emailNormalizado, hash]
        );

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso.",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error("Erro no cadastro:", error);

        return res.status(500).json({
            mensagem: "Erro interno ao cadastrar usuário."
        });
    }
}

export async function login(req, res) {
    try {
        const { email, senha } = req.body;

        if (
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !email.trim() ||
            !senha
        ) {
            return res.status(400).json({
                mensagem: "Informe e-mail e senha."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const resultado = await pool.query(
            `SELECT id, nome, email, senha, perfil, ativo
             FROM usuarios
             WHERE email = $1`,
            [emailNormalizado]
        );

        const usuario = resultado.rows[0];

        if (
            !usuario ||
            !usuario.ativo ||
            !(await bcrypt.compare(senha, usuario.senha))
        ) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const token = jwt.sign(
            {
                sub: String(usuario.id)
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "30m",
                issuer: "sistema-estoque"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 60 * 1000,
            path: "/"
        });

        return res.json({
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });

    } catch (error) {
        console.error("Erro no login:", error);

        return res.status(500).json({
            mensagem: "Erro interno ao realizar login."
        });
    }
}
export function logout(req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return res.json({
        mensagem: "Logout realizado com sucesso."
    });
}

export async function usuarioAtual(req, res) {
    return res.json({
        usuario: req.usuario
    });
}