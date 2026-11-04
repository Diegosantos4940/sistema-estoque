import pool from "../config/database.js";

// LISTAR E PESQUISAR PRODUTOS
export async function listarProdutos(req, res) {
    try {
        const { q = "" } = req.query;

        const resultado = await pool.query(
            `SELECT id, nome, categoria, quantidade, preco,
                    criado_em, atualizado_em
             FROM produtos
             WHERE ativo = TRUE
             AND (
                nome ILIKE $1
                OR COALESCE(categoria, '') ILIKE $1
             )
             ORDER BY nome ASC`,
            [`%${q}%`]
        );

        return res.json(resultado.rows);

    } catch (error) {
        console.error("Erro ao listar produtos:", error);
        return res.status(500).json({
            mensagem: "Erro ao buscar produtos."
        });
    }
}

// CADASTRAR PRODUTO
export async function criarProduto(req, res) {
    const { nome, categoria, quantidade, preco } = req.body;

    const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
    const categoriaLimpa =
        typeof categoria === "string" ? categoria.trim() : null;

    if (!nomeLimpo || nomeLimpo.length > 150) {
        return res.status(400).json({
            mensagem: "Informe um nome válido para o produto."
        });
    }

    if (categoriaLimpa && categoriaLimpa.length > 100) {
        return res.status(400).json({
            mensagem: "A categoria deve ter no máximo 100 caracteres."
        });
    }

    if (!Number.isInteger(quantidade) || quantidade < 0) {
        return res.status(400).json({
            mensagem: "A quantidade deve ser um número inteiro igual ou maior que zero."
        });
    }

    if (typeof preco !== "number" || !Number.isFinite(preco) || preco < 0) {
        return res.status(400).json({
            mensagem: "Informe um preço válido."
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const resultado = await client.query(
            `INSERT INTO produtos (nome, categoria, quantidade, preco)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nomeLimpo, categoriaLimpa || null, quantidade, preco]
        );

        const produto = resultado.rows[0];

        if (quantidade > 0) {
            await client.query(
                `INSERT INTO movimentacoes
                 (produto_id, usuario_id, tipo, quantidade, descricao)
                 VALUES ($1, $2, 'entrada', $3, $4)`,
                [
                    produto.id,
                    req.usuario.id,
                    quantidade,
                    "Estoque inicial do produto"
                ]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({
            mensagem: "Produto cadastrado com sucesso.",
            produto
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Erro ao cadastrar produto:", error);

        return res.status(500).json({
            mensagem: "Erro ao cadastrar produto."
        });

    } finally {
        client.release();
    }
}

// EDITAR PRODUTO
export async function editarProduto(req, res) {
    const id = Number(req.params.id);
    const { nome, categoria, quantidade, preco } = req.body;

    const nomeLimpo = typeof nome === "string" ? nome.trim() : "";
    const categoriaLimpa =
        typeof categoria === "string" ? categoria.trim() : null;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensagem: "ID do produto inválido."
        });
    }

    if (!nomeLimpo || nomeLimpo.length > 150) {
        return res.status(400).json({
            mensagem: "Informe um nome válido."
        });
    }

    if (categoriaLimpa && categoriaLimpa.length > 100) {
        return res.status(400).json({
            mensagem: "A categoria deve ter no máximo 100 caracteres."
        });
    }

    if (!Number.isInteger(quantidade) || quantidade < 0) {
        return res.status(400).json({
            mensagem: "Quantidade inválida."
        });
    }

    if (typeof preco !== "number" || !Number.isFinite(preco) || preco < 0) {
        return res.status(400).json({
            mensagem: "Preço inválido."
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const atual = await client.query(
            `SELECT * FROM produtos
             WHERE id = $1 AND ativo = TRUE
             FOR UPDATE`,
            [id]
        );

        if (atual.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensagem: "Produto não encontrado."
            });
        }

        const produtoAnterior = atual.rows[0];
        const diferenca = quantidade - produtoAnterior.quantidade;

        const resultado = await client.query(
            `UPDATE produtos
             SET nome = $1,
                 categoria = $2,
                 quantidade = $3,
                 preco = $4,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [nomeLimpo, categoriaLimpa || null, quantidade, preco, id]
        );

        if (diferenca !== 0) {
            await client.query(
                `INSERT INTO movimentacoes
                 (produto_id, usuario_id, tipo, quantidade, descricao)
                 VALUES ($1, $2, 'ajuste', $3, $4)`,
                [
                    id,
                    req.usuario.id,
                    Math.abs(diferenca),
                    "Alteração manual do estoque"
                ]
            );
        }

        await client.query("COMMIT");

        return res.json({
            mensagem: "Produto atualizado com sucesso.",
            produto: resultado.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Erro ao editar produto:", error);

        return res.status(500).json({
            mensagem: "Erro ao atualizar produto."
        });

    } finally {
        client.release();
    }
}

// EXCLUIR PRODUTO (EXCLUSÃO LÓGICA)
export async function excluirProduto(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensagem: "ID do produto inválido."
        });
    }

    try {
        const resultado = await pool.query(
            `UPDATE produtos
             SET ativo = FALSE,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $1 AND ativo = TRUE
             RETURNING id`,
            [id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                mensagem: "Produto não encontrado."
            });
        }

        return res.json({
            mensagem: "Produto excluído com sucesso."
        });

    } catch (error) {
        console.error("Erro ao excluir produto:", error);

        return res.status(500).json({
            mensagem: "Erro ao excluir produto."
        });
    }
}