
import { useEffect, useState } from "react";
import { History, Eye, RefreshCw, X } from "lucide-react";
import api from "../services/api";
import "./HistoricoVendas.css";

const formatarMoeda = (valor) =>
    Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const formatarData = (data) =>
    new Date(data).toLocaleString("pt-BR");

export default function HistoricoVendas() {
    const [vendas, setVendas] = useState([]);
    const [vendaSelecionada, setVendaSelecionada] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
    const [erro, setErro] = useState("");

    async function carregarVendas() {
        setCarregando(true);
        setErro("");

        try {
            const resposta = await api.get("/vendas");
            setVendas(resposta.data);
        } catch (error) {
            setErro("Não foi possível carregar as vendas.");
        } finally {
            setCarregando(false);
        }
    }

    async function visualizarVenda(id) {
        setErro("");
        setCarregandoDetalhes(true);

        try {
            const resposta = await api.get(`/vendas/${id}`);
            setVendaSelecionada(resposta.data);
        } catch (error) {
            setErro("Não foi possível consultar a venda.");
        } finally {
            setCarregandoDetalhes(false);
        }
    }

    useEffect(() => {
        carregarVendas();
    }, []);

    return (
        <section className="hv-container">
            <header className="hv-cabecalho">
                <div>
                    <h1>
                        <History size={26} />
                        Histórico de vendas
                    </h1>
                    <p>Consulte as vendas registradas no sistema.</p>
                </div>

                <button
                    className="hv-botao"
                    onClick={carregarVendas}
                    disabled={carregando}
                >
                    <RefreshCw size={18} />
                    Atualizar
                </button>
            </header>

            {erro && <div className="hv-erro">{erro}</div>}

            <div className="hv-tabela-container">
                <table className="hv-tabela">
                    <thead>
                        <tr>
                            <th>Venda</th>
                            <th>Responsável</th>
                            <th>Data e horário</th>
                            <th>Unidades</th>
                            <th>Valor total</th>
                            <th>Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {carregando ? (
                            <tr>
                                <td colSpan={6}>Carregando vendas...</td>
                            </tr>
                        ) : vendas.length === 0 ? (
                            <tr>
                                <td colSpan={6}>Nenhuma venda registrada.</td>
                            </tr>
                        ) : (
                            vendas.map((venda) => (
                                <tr key={venda.id}>
                                    <td>#{venda.id}</td>
                                    <td>{venda.usuario || "Não informado"}</td>
                                    <td>{formatarData(venda.data_venda)}</td>
                                    <td>{venda.total_itens}</td>
                                    <td>{formatarMoeda(venda.valor_total)}</td>
                                    <td>
                                        <button
                                            className="hv-detalhes"
                                            disabled={carregandoDetalhes}
                                            onClick={() => visualizarVenda(venda.id)}
                                        >
                                            <Eye size={17} />
                                            Detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {vendaSelecionada && (
                <div className="hv-overlay">
                    <div
                        className="hv-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Detalhes da venda"
                    >
                        <header className="hv-modal-cabecalho">
                            <h2>Venda #{vendaSelecionada.id}</h2>

                            <button
                                className="hv-fechar"
                                aria-label="Fechar detalhes"
                                onClick={() => setVendaSelecionada(null)}
                            >
                                <X size={22} />
                            </button>
                        </header>

                        <p>
                            <strong>Responsável:</strong>{" "}
                            {vendaSelecionada.usuario || "Não informado"}
                        </p>

                        <p>
                            <strong>Data:</strong>{" "}
                            {formatarData(vendaSelecionada.data_venda)}
                        </p>

                        <div className="hv-tabela-container">
                            <table className="hv-tabela">
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Qtd.</th>
                                        <th>Preço</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {vendaSelecionada.itens.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.produto}</td>
                                            <td>{item.quantidade}</td>
                                            <td>{formatarMoeda(item.preco_unitario)}</td>
                                            <td>{formatarMoeda(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="hv-total">
                            Total: {formatarMoeda(vendaSelecionada.valor_total)}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
