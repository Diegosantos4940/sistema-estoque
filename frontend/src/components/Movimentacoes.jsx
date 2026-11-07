
import { useEffect, useState } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
    RefreshCw
} from "lucide-react";

import api from "../services/api";
import "./Movimentacoes.css";

export default function Movimentacoes() {
    const [produtos, setProdutos] = useState([]);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [tipo, setTipo] = useState("todas");

    const [formulario, setFormulario] = useState({
        produto_id: "",
        quantidade: "",
        descricao: ""
    });

    const [operacao, setOperacao] = useState("entrada");
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState("");

    async function carregarProdutos() {
        const resposta = await api.get("/produtos");
        setProdutos(resposta.data);
    }

    async function carregarMovimentacoes() {
        try {
            const parametros = tipo !== "todas"
                ? { tipo }
                : {};

            const resposta = await api.get("/movimentacoes", {
                params: parametros
            });

            setMovimentacoes(resposta.data);
        } catch (error) {
            console.error(error);
            setErro("Erro ao carregar o histórico.");
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        carregarProdutos().catch((error) => {
            console.error(error);
            setErro("Erro ao carregar os produtos.");
        });
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        carregarMovimentacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo]);

    function atualizarCampo(e) {
        setFormulario({
            ...formulario,
            [e.target.name]: e.target.value
        });
    }

    async function registrarMovimentacao(e) {
        e.preventDefault();

        setMensagem("");
        setErro("");

        if (!formulario.produto_id || !formulario.quantidade) {
            setErro("Selecione um produto e informe a quantidade.");
            return;
        }

        try {
            setCarregando(true);

            const rota = operacao === "entrada"
                ? "/movimentacoes/entrada"
                : "/movimentacoes/saida";

            const resposta = await api.post(rota, {
                produto_id: Number(formulario.produto_id),
                quantidade: Number(formulario.quantidade),
                descricao: formulario.descricao
            });

            setMensagem(
                `${resposta.data.mensagem} Estoque atual: ${resposta.data.produto.quantidade_atual} unidades.`
            );

            setFormulario({
                produto_id: "",
                quantidade: "",
                descricao: ""
            });

            await Promise.all([
                carregarProdutos(),
                carregarMovimentacoes()
            ]);

        } catch (error) {
            setErro(
                error.response?.data?.mensagem ||
                "Erro ao registrar movimentação."
            );
        } finally {
            setCarregando(false);
        }
    }

    function formatarData(data) {
        return new Date(data).toLocaleString("pt-BR");
    }

    return (
        <div className="movimentacoes">

            <header className="mov-cabecalho">
                <div>
                    <h1>Movimentações de estoque</h1>
                    <p>Registre entradas, saídas e acompanhe o histórico.</p>
                </div>
            </header>

            <section className="mov-painel">
                <div className="mov-painel-titulo">
                    <History size={21} />
                    <h2>Registrar movimentação</h2>
                </div>

                <div className="mov-operacoes">
                    <button
                        type="button"
                        className={operacao === "entrada" ? "operacao-ativa entrada" : "operacao"}
                        onClick={() => setOperacao("entrada")}
                    >
                        <ArrowDownToLine size={18} />
                        Entrada
                    </button>

                    <button
                        type="button"
                        className={operacao === "saida" ? "operacao-ativa saida" : "operacao"}
                        onClick={() => setOperacao("saida")}
                    >
                        <ArrowUpFromLine size={18} />
                        Saída
                    </button>
                </div>

                <form onSubmit={registrarMovimentacao}>
                    <div className="mov-form-grid">

                        <div className="mov-campo">
                            <label>Produto</label>
                            <select
                                name="produto_id"
                                value={formulario.produto_id}
                                onChange={atualizarCampo}
                                required
                            >
                                <option value="">Selecione um produto</option>

                                {produtos.map((produto) => (
                                    <option key={produto.id} value={produto.id}>
                                        {produto.nome} — Estoque: {produto.quantidade}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mov-campo">
                            <label>Quantidade</label>
                            <input
                                type="number"
                                name="quantidade"
                                min="1"
                                step="1"
                                value={formulario.quantidade}
                                onChange={atualizarCampo}
                                placeholder="Informe a quantidade"
                                required
                            />
                        </div>

                    </div>

                    <div className="mov-campo">
                        <label>Descrição</label>
                        <input
                            type="text"
                            name="descricao"
                            maxLength="500"
                            value={formulario.descricao}
                            onChange={atualizarCampo}
                            placeholder="Ex.: Reposição de estoque"
                        />
                    </div>

                    {mensagem && (
                        <div className="mov-sucesso">{mensagem}</div>
                    )}

                    {erro && (
                        <div className="mov-erro">{erro}</div>
                    )}

                    <button
                        type="submit"
                        className="mov-botao"
                        disabled={carregando}
                    >
                        {carregando
                            ? "Registrando..."
                            : `Registrar ${operacao}`}
                    </button>
                </form>
            </section>

            <section className="mov-painel mov-historico">

                <div className="mov-historico-topo">
                    <div>
                        <h2>Histórico de movimentações</h2>
                        <p>Acompanhe as últimas operações realizadas.</p>
                    </div>

                    <button
                        type="button"
                        className="mov-atualizar"
                        onClick={carregarMovimentacoes}
                    >
                        <RefreshCw size={17} />
                        Atualizar
                    </button>
                </div>

                <div className="mov-filtros">
                    <label>Tipo de movimentação:</label>

                    <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        <option value="todas">Todas</option>
                        <option value="entrada">Entradas</option>
                        <option value="saida">Saídas</option>
                        <option value="ajuste">Ajustes</option>
                    </select>
                </div>

                <div className="mov-tabela-container">
                    <table className="mov-tabela">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Tipo</th>
                                <th>Quantidade</th>
                                <th>Usuário</th>
                                <th>Descrição</th>
                                <th>Data</th>
                            </tr>
                        </thead>

                        <tbody>
                            {movimentacoes.length > 0 ? (
                                movimentacoes.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.produto}</td>

                                        <td>
                                            <span className={`mov-tipo ${item.tipo}`}>
                                                {item.tipo}
                                            </span>
                                        </td>

                                        <td>{item.quantidade}</td>
                                        <td>{item.usuario || "Não identificado"}</td>
                                        <td>{item.descricao || "-"}</td>
                                        <td>{formatarData(item.data_movimentacao)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="mov-vazio">
                                        Nenhuma movimentação encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </section>
        </div>
    );
}
