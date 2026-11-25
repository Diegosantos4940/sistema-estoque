import bcrypt from "bcrypt";
import pool from "../config/database.js";

// LISTAR USUÁRIOS
export async function listarUsuarios(req, res) {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                email,
                perfil,
                ativo,
                criado_em
            FROM usuarios
            ORDER BY id ASC
        `);

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error("Erro ao listar usuários:", error);

        return res.status(500).json({
            mensagem: "Erro ao consultar os usuários."
        });
    }
}


// CONSULTAR USUÁRIO POR ID
export async function detalharUsuario(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        return res.status(400).json({
            mensagem: "ID do usuário inválido."
        });
    }

    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                email,
                perfil,
                ativo,
                criado_em
            FROM usuarios
            WHERE id = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (error) {
        console.error("Erro ao consultar usuário:", error);

        return res.status(500).json({
            mensagem: "Erro ao consultar o usuário."
        });
    }
}


// EDITAR USUÁRIO
export async function editarUsuario(req, res) {
    const id = Number(req.params.id);
    const { nome, email } = req.body || {};

    // Validar ID
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        return res.status(400).json({
            mensagem: "ID do usuário inválido."
        });
    }

    // Validar nome
    if (
        typeof nome !== "string" ||
        nome.trim().length < 3 ||
        nome.trim().length > 120
    ) {
        return res.status(400).json({
            mensagem: "Informe um nome válido."
        });
    }

    // Validar e-mail
    if (
        typeof email !== "string" ||
        email.trim().length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return res.status(400).json({
            mensagem: "Informe um e-mail válido."
        });
    }

    try {
        const resultado = await pool.query(`
            UPDATE usuarios
            SET nome = $1,
                email = $2
            WHERE id = $3
            RETURNING
                id,
                nome,
                email,
                perfil,
                ativo,
                criado_em
        `, [
            nome.trim(),
            email.trim().toLowerCase(),
            id
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Usuário atualizado com sucesso.",
            usuario: resultado.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        console.error("Erro ao editar usuário:", error);

        return res.status(500).json({
            mensagem: "Erro ao atualizar o usuário."
        });
    }
}


// ALTERAR PERFIL E SITUAÇÃO DO USUÁRIO
export async function alterarPermissoes(req, res) {
    const id = Number(req.params.id);
    const { perfil, ativo } = req.body || {};

    // Validar ID
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        return res.status(400).json({
            mensagem: "ID do usuário inválido."
        });
    }

    // Validar perfil
    if (!["admin", "funcionario"].includes(perfil)) {
        return res.status(400).json({
            mensagem: "Perfil inválido."
        });
    }

    // Validar situação da conta
    if (typeof ativo !== "boolean") {
        return res.status(400).json({
            mensagem: "Situação da conta inválida."
        });
    }

    // Impedir que o administrador perca o próprio acesso
    if (
        id === Number(req.usuario.id) &&
        (perfil !== "admin" || ativo === false)
    ) {
        return res.status(400).json({
            mensagem: "Você não pode desativar sua própria conta ou remover suas permissões administrativas."
        });
    }

    let conexao;

    try {
        conexao = await pool.connect();

        await conexao.query("BEGIN");

        // Evitar alterações simultâneas nas permissões
        await conexao.query(`
            LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE
        `);

        const resultado = await conexao.query(`
            SELECT id, perfil, ativo
            FROM usuarios
            WHERE id = $1
            FOR UPDATE
        `, [id]);

        if (resultado.rows.length === 0) {
            await conexao.query("ROLLBACK");

            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        const usuario = resultado.rows[0];

        // Proteger o último administrador ativo
        if (
            usuario.perfil === "admin" &&
            usuario.ativo === true &&
            (perfil !== "admin" || ativo === false)
        ) {
            const administradores = await conexao.query(`
                SELECT COUNT(*) AS total
                FROM usuarios
                WHERE perfil = 'admin'
                AND ativo = TRUE
            `);

            if (Number(administradores.rows[0].total) <= 1) {
                await conexao.query("ROLLBACK");

                return res.status(400).json({
                    mensagem: "O sistema precisa manter pelo menos um administrador ativo."
                });
            }
        }

        // Atualizar usuário
        const atualizado = await conexao.query(`
            UPDATE usuarios
            SET perfil = $1,
                ativo = $2
            WHERE id = $3
            RETURNING
                id,
                nome,
                email,
                perfil,
                ativo,
                criado_em
        `, [perfil, ativo, id]);

        await conexao.query("COMMIT");

        return res.status(200).json({
            mensagem: "Permissões atualizadas com sucesso.",
            usuario: atualizado.rows[0]
        });

    } catch (error) {
        if (conexao) {
            await conexao.query("ROLLBACK").catch(console.error);
        }

        console.error("Erro ao alterar permissões:", error);

        return res.status(500).json({
            mensagem: "Erro ao atualizar as permissões."
        });

    } finally {
        if (conexao) {
            conexao.release();
        }
    }
}


// REDEFINIR SENHA DO USUÁRIO
export async function redefinirSenha(req, res) {
    const id = Number(req.params.id);
    const { senha } = req.body || {};

    // Validar ID
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        return res.status(400).json({
            mensagem: "ID do usuário inválido."
        });
    }

    // Validar nova senha
    if (
        typeof senha !== "string" ||
        senha.length < 8 ||
        Buffer.byteLength(senha, "utf8") > 72 ||
        senha.trim().length === 0
    ) {
        return res.status(400).json({
            mensagem: "A senha deve possuir pelo menos 8 caracteres e no máximo 72 bytes."
        });
    }

    try {
        // Gerar hash da nova senha
        const senhaHash = await bcrypt.hash(senha, 12);

        // Atualizar senha no banco de dados
        const resultado = await pool.query(`
            UPDATE usuarios
            SET senha = $1
            WHERE id = $2
            RETURNING id, nome
        `, [senhaHash, id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        return res.status(200).json({
            mensagem: "Senha redefinida com sucesso."
        });

    } catch (error) {
        console.error("Erro ao redefinir senha:", error);

        return res.status(500).json({
            mensagem: "Erro ao redefinir a senha."
        });
    }
}
