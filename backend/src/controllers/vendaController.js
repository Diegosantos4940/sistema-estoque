
import pool from "../config/database.js";

// REGISTRAR UMA VENDA
export async function registrarVenda(req, res) {
    const { itens } = req.body;

    // VALIDAÇÃO INICIAL
    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
            mensagem: "Adicione pelo menos um produto à venda."
        });
    }

    const produtosSolicitados = new Map();

    for (const item of itens) {
        const produtoId = Number(item.produto_id);
        const quantidade = Number(item.quantidade);

        if (
            !Number.isInteger(produtoId) ||
            produtoId <= 0 ||
            !Number.isInteger(quantidade) ||
            quantidade <= 0
        ) {
            return res.status(400).json({
                mensagem: "Verifique os produtos e as quantidades informadas."
            });
        }

        // Evita produtos repetidos na mesma venda
        if (produtosSolicitados.has(produtoId)) {
            return res.status(400).json({
                mensagem: "Não repita o mesmo produto na venda."
            });
        }

        produtosSolicitados.set(produtoId, quantidade);
    }

    const conexao = await pool.connect();
    let transacaoIniciada = false;

    try {
        await conexao.query("BEGIN");
        transacaoIniciada = true;

        const idsProdutos = [...produtosSolicitados.keys()];

        // CONSULTAR E BLOQUEAR OS PRODUTOS
        const resultadoProdutos = await conexao.query(
            `
            SELECT id, nome, quantidade, preco
            FROM produtos
            WHERE id = ANY($1::int[])
              AND ativo = TRUE
            ORDER BY id
            FOR UPDATE
            `,
            [idsProdutos]
        );

        if (resultadoProdutos.rows.length !== idsProdutos.length) {
            await conexao.query("ROLLBACK");
            transacaoIniciada = false;

            return res.status(400).json({
                mensagem: "Um ou mais produtos não foram encontrados ou estão inativos."
            });
        }

        const produtos = [];
        let valorTotalCentavos = 0;

        // VALIDAR ESTOQUE E CALCULAR VALORES
        for (const produto of resultadoProdutos.rows) {
            const quantidadeVendida = produtosSolicitados.get(produto.id);

            if (produto.quantidade < quantidadeVendida) {
                await conexao.query("ROLLBACK");
                transacaoIniciada = false;

                return res.status(400).json({
                    mensagem: `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.quantidade}.`
                });
            }

            const precoCentavos = Math.round(
                Number(produto.preco) * 100
            );

            const subtotalCentavos =
                precoCentavos * quantidadeVendida;

            valorTotalCentavos += subtotalCentavos;

            produtos.push({
                id: produto.id,
                nome: produto.nome,
                quantidade_anterior: produto.quantidade,
                quantidade_vendida: quantidadeVendida,
                preco_centavos: precoCentavos,
                subtotal_centavos: subtotalCentavos
            });
        }

        // REGISTRAR A VENDA
        const resultadoVenda = await conexao.query(
            `
            INSERT INTO vendas (usuario_id, valor_total)
            VALUES ($1, $2)
            RETURNING *
            `,
            [
                req.usuario.id,
                (valorTotalCentavos / 100).toFixed(2)
            ]
        );

        const venda = resultadoVenda.rows[0];
        const itensRegistrados = [];

        // REGISTRAR ITENS, ATUALIZAR ESTOQUE E MOVIMENTAÇÕES
        for (const produto of produtos) {
            const subtotal = (
                produto.subtotal_centavos / 100
            ).toFixed(2);

            const precoUnitario = (
                produto.preco_centavos / 100
            ).toFixed(2);

            // Registrar item da venda
            const itemVenda = await conexao.query(
                `
                INSERT INTO itens_venda (
                    venda_id,
                    produto_id,
                    quantidade,
                    preco_unitario,
                    subtotal
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                `,
                [
                    venda.id,
                    produto.id,
                    produto.quantidade_vendida,
                    precoUnitario,
                    subtotal
                ]
            );

            // Atualizar estoque
            const novoEstoque =
                produto.quantidade_anterior -
                produto.quantidade_vendida;

            await conexao.query(
                `
                UPDATE produtos
                SET quantidade = $1,
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [novoEstoque, produto.id]
            );

            // Registrar saída no histórico
            await conexao.query(
                `
                INSERT INTO movimentacoes (
                    produto_id,
                    usuario_id,
                    tipo,
                    quantidade,
                    descricao
                )
                VALUES ($1, $2, 'saida', $3, $4)
                `,
                [
                    produto.id,
                    req.usuario.id,
                    produto.quantidade_vendida,
                    `Venda #${venda.id}`
                ]
            );

            itensRegistrados.push({
                ...itemVenda.rows[0],
                produto: produto.nome,
                estoque_atual: novoEstoque
            });
        }

        await conexao.query("COMMIT");
        transacaoIniciada = false;

        return res.status(201).json({
            mensagem: "Venda registrada com sucesso.",
            venda: {
                ...venda,
                itens: itensRegistrados
            }
        });

    } catch (error) {
        if (transacaoIniciada) {
            await conexao.query("ROLLBACK");
        }

        console.error("Erro ao registrar venda:", error);

        return res.status(500).json({
            mensagem: "Erro ao registrar a venda."
        });

    } finally {
        conexao.release();
    }
}
