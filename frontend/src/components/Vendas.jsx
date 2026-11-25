import { useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";

import api from "../services/api";
import "./Movimentacoes.css";
import "./Vendas.css";

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

export default function Vendas() {
    const [produtos, setProdutos] = useState([]);
    const [itens, setItens] = useState([]);
    const [produtoId, setProdutoId] = useState("");
    const [quantidade, setQuantidade] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [erroProdutos, setErroProdutos] = useState("");
    const [erroVenda, setErroVenda] = useState("");
    const [mensagem, setMensagem] = useState("");
    const envioPendente = useRef(false);

    const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
    const produtoSelecionado = produtosPorId.get(Number(produtoId));
    const itensDaVenda = itens.map((item) => {
        const produto = produtosPorId.get(item.produto_id);
        const precoCentavos = Math.round(Number(produto?.preco ?? item.preco) * 100);

        return {
            ...item,
            produto,
            precoCentavos,
            subtotalCentavos: precoCentavos * item.quantidade
        };
    });
    const totalCentavos = itensDaVenda.reduce((total, item) => total + item.subtotalCentavos, 0);

    function carregarProdutos(signal) {
        return api.get("/produtos", { signal })
            .then(({ data }) => {
                if (signal?.aborted) return;
                setProdutos(data);
                setErroProdutos("");
            })
            .catch((error) => {
                if (!signal?.aborted) {
                    setErroProdutos(error.response?.data?.mensagem || "Não foi possível atualizar os produtos.");
                }
            })
            .finally(() => {
                if (!signal?.aborted) setCarregando(false);
            });
    }

    useEffect(() => {
        const controller = new AbortController();
        carregarProdutos(controller.signal);
        return () => controller.abort();
    }, []);

    function atualizarProdutos() {
        setCarregando(true);
        carregarProdutos();
    }

    function adicionarItem(event) {
        event.preventDefault();
        setErroVenda("");
        setMensagem("");

        const unidades = Number(quantidade);
        if (!produtoSelecionado || !Number.isInteger(unidades) || unidades < 1) {
            setErroVenda("Selecione um produto e informe uma quantidade inteira positiva.");
            return;
        }

        if (itens.some((item) => item.produto_id === produtoSelecionado.id)) {
            setErroVenda("Esse produto já foi adicionado. Remova o item para alterar a quantidade.");
            return;
        }

        if (unidades > produtoSelecionado.quantidade) {
            setErroVenda(`Estoque insuficiente. Disponível: ${produtoSelecionado.quantidade} unidades.`);
            return;
        }

        setItens([...itens, {
            produto_id: produtoSelecionado.id,
            quantidade: unidades,
            nome: produtoSelecionado.nome,
            preco: produtoSelecionado.preco
        }]);
        setProdutoId("");
        setQuantidade("");
    }

    async function finalizarVenda() {
        if (envioPendente.current || carregando || erroProdutos || itens.length === 0) return;
        setErroVenda("");
        setMensagem("");

        const itemIndisponivel = itensDaVenda.find(({ produto, quantidade }) =>
            !produto || quantidade > produto.quantidade
        );
        if (itemIndisponivel) {
            setErroVenda(`Revise o item "${itemIndisponivel.nome}". Disponível: ${itemIndisponivel.produto?.quantidade ?? 0} unidades.`);
            return;
        }

        envioPendente.current = true;
        setSalvando(true);

        try {
            const resposta = await api.post("/vendas", {
                itens: itens.map(({ produto_id, quantidade }) => ({ produto_id, quantidade }))
            });

            const { venda, mensagem: confirmacao } = resposta.data;
            setMensagem(`${confirmacao} Venda #${venda.id} · Total: ${moeda.format(venda.valor_total)}.`);
            setItens([]);
            setProdutoId("");
            setQuantidade("");
            await carregarProdutos();
        } catch (error) {
            setErroVenda(error.response?.data?.mensagem || "Não foi possível confirmar o registro da venda.");
            await carregarProdutos();
        } finally {
            envioPendente.current = false;
            setSalvando(false);
        }
    }

    const indisponivel = carregando || salvando || Boolean(erroProdutos);

    return (
        <div className="movimentacoes">
            <header className="mov-cabecalho">
                <h1>Vendas</h1>
            </header>

            <section className="mov-painel">
                <div className="mov-painel-titulo">
                    <ShoppingCart size={21} />
                    <h2>Registrar venda</h2>
                </div>

                {carregando && <p role="status">Carregando produtos...</p>}
                {mensagem && <div className="mov-sucesso" role="status">{mensagem}</div>}
                {erroProdutos && (
                    <div className="mov-erro">
                        <p role="alert">{erroProdutos}</p>
                        <button type="button" className="mov-atualizar" onClick={atualizarProdutos}
                            disabled={carregando || salvando}>
                            <RefreshCw size={17} /> Atualizar produtos
                        </button>
                    </div>
                )}
                {erroVenda && <div className="mov-erro" role="alert">{erroVenda}</div>}

                <form onSubmit={adicionarItem}>
                    <div className="mov-form-grid">
                        <div className="mov-campo">
                            <label htmlFor="venda-produto">Produto</label>
                            <select id="venda-produto" value={produtoId}
                                onChange={(event) => setProdutoId(event.target.value)}
                                disabled={indisponivel} required>
                                <option value="">Selecione um produto</option>
                                {produtos.map((produto) => (
                                    <option key={produto.id} value={produto.id} disabled={produto.quantidade < 1}>
                                        {produto.nome} — Estoque: {produto.quantidade}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mov-campo">
                            <label htmlFor="venda-quantidade">Quantidade</label>
                            <input id="venda-quantidade" type="number" min="1" step="1"
                                max={produtoSelecionado?.quantidade}
                                value={quantidade}
                                onChange={(event) => setQuantidade(event.target.value)}
                                disabled={indisponivel} required />
                        </div>
                    </div>

                    <button type="submit" className="botao-principal" disabled={indisponivel}>
                        <Plus size={18} /> Adicionar item
                    </button>
                </form>
            </section>

            <section className="mov-painel">
                <div className="mov-painel-titulo"><h2>Itens da venda</h2></div>
                <div className="mov-tabela-container">
                    <table className="mov-tabela">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Quantidade</th>
                                <th>Preço unitário</th>
                                <th>Subtotal</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensDaVenda.map((item) => (
                                <tr key={item.produto_id}>
                                    <td>{item.produto?.nome ?? item.nome}</td>
                                    <td>{item.quantidade}</td>
                                    <td>{moeda.format(item.precoCentavos / 100)}</td>
                                    <td>{moeda.format(item.subtotalCentavos / 100)}</td>
                                    <td>
                                        <button type="button" className="botao-icone"
                                            aria-label={`Remover ${item.nome}`} disabled={salvando}
                                            onClick={() => {
                                                setItens(itens.filter(({ produto_id }) => produto_id !== item.produto_id));
                                                setErroVenda("");
                                            }}>
                                            <Trash2 size={17} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {itens.length === 0 && (
                                <tr><td colSpan="5" className="mov-vazio">Nenhum item adicionado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="venda-rodape">
                    <div>Total estimado <strong>{moeda.format(totalCentavos / 100)}</strong></div>
                    <button type="button" className="botao-principal"
                        onClick={finalizarVenda} disabled={indisponivel || itens.length === 0}>
                        {salvando ? "Registrando..." : "Finalizar venda"}
                    </button>
                </div>
            </section>
        </div>
    );
}
