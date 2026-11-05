
import pool from "../config/database.js";

// LISTAR HISTÓRICO DE MOVIMENTAÇÕES
export async function listarMovimentacoes(req, res) {
    try {
        const { tipo, produto_id } = req.query;

        const filtros = [];
        const valores = [];

        if (tipo && ["entrada", "saida", "ajuste"].includes(tipo)) {
            valores.push(tipo);
            filtros.push(`m.tipo = $${valores.length}`);
        }

        if (produto_id) {
            const id = Number(produto_id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do produto inválido."
                });
            }

            valores.push(id);
            filtros.push(`m.produto_id = $${valores.length}`);
        }

        const where = filtros.length
            ? `WHERE ${filtros.join(" AND ")}`
            : "";

        valores.push(100);

        const resultado = await pool.query(
            `
            SELECT
                m.id,
                m.produto_id,
                p.nome AS produto,
                m.usuario_id,
                u.nome AS usuario,
                m.tipo,
                m.quantidade,
                m.descricao,
                m.data_movimentacao
            FROM movimentacoes m
            INNER JOIN produtos p ON p.id = m.produto_id
            LEFT JOIN usuarios u ON u.id = m.usuario_id
            ${where}
            ORDER BY m.data_movimentacao DESC, m.id DESC
            LIMIT $${valores.length}
            `,
            valores
        );

        return res.json(resultado.rows);

    } catch (error) {
        console.error("Erro ao listar movimentações:", error);

        return res.status(500).json({
            mensagem: "Erro ao consultar o histórico de movimentações."
        });
    }
}


// REGISTRAR ENTRADA OU SAÍDA
async function registrarMovimentacao(req, res, tipo) {
    const { produto_id, quantidade, descricao } = req.body;

    const idProduto = Number(produto_id);
    const quantidadeMovimentada = Number(quantidade);

    if (
        !Number.isInteger(idProduto) ||
        idProduto <= 0 ||
        !Number.isInteger(quantidadeMovimentada) ||
        quantidadeMovimentada <= 0
    ) {
        return res.status(400).json({
            mensagem: "Informe um produto e uma quantidade válida."
        });
    }

    if (
        descricao !== undefined &&
        (typeof descricao !== "string" || descricao.length > 500)
    ) {
        return res.status(400).json({
            mensagem: "A descrição deve ter no máximo 500 caracteres."
        });
    }

    const conexao = await pool.connect();

    try {
        await conexao.query("BEGIN");

        // BLOQUEIA O PRODUTO DURANTE A OPERAÇÃO
        const produto = await conexao.query(
            `
            SELECT id, nome, quantidade
            FROM produtos
            WHERE id = $1 AND ativo = TRUE
            FOR UPDATE
            `,
            [idProduto]
        );

        if (produto.rows.length === 0) {
            await conexao.query("ROLLBACK");

            return res.status(404).json({
                mensagem: "Produto não encontrado ou inativo."
            });
        }

        const estoqueAtual = produto.rows[0].quantidade;

        // VERIFICA SE EXISTE ESTOQUE SUFICIENTE
        if (
            tipo === "saida" &&
            estoqueAtual < quantidadeMovimentada
        ) {
            await conexao.query("ROLLBACK");

            return res.status(400).json({
                mensagem: `Estoque insuficiente. Disponível: ${estoqueAtual} unidades.`
            });
        }

        // CALCULA O NOVO ESTOQUE
        const novoEstoque = tipo === "entrada"
            ? estoqueAtual + quantidadeMovimentada
            : estoqueAtual - quantidadeMovimentada;

        // ATUALIZA A QUANTIDADE DO PRODUTO
        await conexao.query(
            `
            UPDATE produtos
            SET quantidade = $1,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $2
            `,
            [novoEstoque, idProduto]
        );

        // REGISTRA A MOVIMENTAÇÃO
        const movimentacao = await conexao.query(
            `
            INSERT INTO movimentacoes (
                produto_id,
                usuario_id,
                tipo,
                quantidade,
                descricao
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                idProduto,
                req.usuario.id,
                tipo,
                quantidadeMovimentada,
                descricao?.trim() || null
            ]
        );

        await conexao.query("COMMIT");

        return res.status(201).json({
            mensagem: tipo === "entrada"
                ? "Entrada registrada com sucesso."
                : "Saída registrada com sucesso.",
            movimentacao: movimentacao.rows[0],
            produto: {
                id: idProduto,
                nome: produto.rows[0].nome,
                quantidade_anterior: estoqueAtual,
                quantidade_atual: novoEstoque
            }
        });

    } catch (error) {
        await conexao.query("ROLLBACK");

        console.error("Erro ao registrar movimentação:", error);

        return res.status(500).json({
            mensagem: "Erro ao registrar a movimentação."
        });

    } finally {
        conexao.release();
    }
}


// REGISTRAR ENTRADA
export async function registrarEntrada(req, res) {
    return registrarMovimentacao(req, res, "entrada");
}


// REGISTRAR SAÍDA
export async function registrarSaida(req, res) {
    return registrarMovimentacao(req, res, "saida");
}
