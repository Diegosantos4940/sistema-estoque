import pool from "../config/database.js";

export async function obterDashboard(req, res) {
    try {
        // Indicadores gerais
        const [resumo, estoqueBaixo, maisVendidos] = await Promise.all([

            // RESUMO DO ESTOQUE
            pool.query(`
                SELECT
                    COUNT(*) AS total_produtos,
                    COALESCE(SUM(quantidade), 0) AS total_unidades,
                    COUNT(*) FILTER (WHERE quantidade <= 5)
                        AS produtos_estoque_baixo,
                    COALESCE(SUM(quantidade * preco), 0)
                        AS valor_total_estoque
                FROM produtos
                WHERE ativo = TRUE
            `),

            // PRODUTOS COM ESTOQUE BAIXO
            pool.query(`
                SELECT id, nome, categoria, quantidade, preco
                FROM produtos
                WHERE ativo = TRUE
                AND quantidade <= 5
                ORDER BY quantidade ASC, nome ASC
                LIMIT 10
            `),

            // PRODUTOS MAIS VENDIDOS NO MÊS
            pool.query(`
                SELECT
                    p.id,
                    p.nome,
                    SUM(iv.quantidade) AS quantidade_vendida,
                    SUM(iv.subtotal) AS valor_vendido
                FROM itens_venda iv
                INNER JOIN vendas v ON v.id = iv.venda_id
                INNER JOIN produtos p ON p.id = iv.produto_id
                WHERE v.data_venda >= DATE_TRUNC('month', CURRENT_DATE)
                AND v.data_venda < DATE_TRUNC('month', CURRENT_DATE)
                    + INTERVAL '1 month'
                GROUP BY p.id, p.nome
                ORDER BY quantidade_vendida DESC
                LIMIT 5
            `)
        ]);

        return res.json({
            resumo: resumo.rows[0],
            estoqueBaixo: estoqueBaixo.rows,
            maisVendidos: maisVendidos.rows
        });

    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);

        return res.status(500).json({
            mensagem: "Erro ao carregar os indicadores do dashboard."
        });
    }
}