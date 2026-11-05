
import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

import {
    Package,
    Boxes,
    AlertTriangle,
    DollarSign,
    TrendingUp
} from "lucide-react";

    import api from "../services/api";
    import "./Dashboard.css";

    export default function Dashboard() {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        async function carregarDashboard() {
        try {
            setCarregando(true);
            setErro("");

            const resposta = await api.get("/dashboard");
            setDados(resposta.data);
        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
            setErro("Não foi possível carregar os dados do dashboard.");
        } finally {
            setCarregando(false);
        }
        }

        carregarDashboard();
    }, []);

    const formatarMoeda = (valor) =>
        Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
        });

    if (carregando) {
        return <div className="dashboard-mensagem">Carregando dashboard...</div>;
    }

    if (erro) {
        return <div className="dashboard-erro">{erro}</div>;
    }

    const resumo = dados?.resumo || {};
    const maisVendidos = dados?.maisVendidos || [];
    const estoqueBaixo = dados?.estoqueBaixo || [];

    const indicadores = [
        {
        titulo: "Total de produtos",
        valor: resumo.total_produtos || 0,
        icone: Package,
        descricao: "Produtos cadastrados"
        },
        {
        titulo: "Unidades em estoque",
        valor: resumo.total_unidades || 0,
        icone: Boxes,
        descricao: "Quantidade disponível"
        },
        {
        titulo: "Estoque baixo",
        valor: resumo.produtos_estoque_baixo || 0,
        icone: AlertTriangle,
        descricao: "Produtos com até 5 unidades"
        },
        {
        titulo: "Valor em estoque",
        valor: formatarMoeda(resumo.valor_total_estoque),
        icone: DollarSign,
        descricao: "Valor total dos produtos"
        }
    ];

    return (
        <div className="dashboard">
        <div className="dashboard-cabecalho">
            <div>
            <h1>Dashboard</h1>
            <p>Visão geral do seu estoque.</p>
            </div>
        </div>

        <div className="dashboard-indicadores">
            {indicadores.map((item) => {
            const Icone = item.icone;

            return (
                <div className="indicador-card" key={item.titulo}>
                <div className="indicador-topo">
                    <span>{item.titulo}</span>
                    <div className="indicador-icone">
                    <Icone size={20} />
                    </div>
                </div>

                <strong>{item.valor}</strong>
                <small>{item.descricao}</small>
                </div>
            );
            })}
        </div>

        <div className="dashboard-secoes">
            <section className="dashboard-painel painel-grafico">
            <div className="painel-cabecalho">
                <div>
                <h2>Produtos mais vendidos</h2>
                <p>Desempenho das vendas neste mês</p>
                </div>
                <TrendingUp size={21} />
            </div>

            {maisVendidos.length > 0 ? (
                <div className="grafico-container">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={maisVendidos}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="nome"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip />
                    <Bar
                        dataKey="quantidade_vendida"
                        name="Unidades vendidas"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                    />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            ) : (
                <div className="dashboard-vazio">
                Ainda não existem vendas registradas neste mês.
                </div>
            )}
            </section>

            <section className="dashboard-painel painel-estoque">
            <div className="painel-cabecalho">
                <div>
                <h2>Estoque baixo</h2>
                <p>Produtos que precisam de atenção</p>
                </div>
                <AlertTriangle size={21} />
            </div>

            {estoqueBaixo.length > 0 ? (
                <div className="tabela-container">
                <table className="tabela-dashboard">
                    <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Preço</th>
                    </tr>
                    </thead>

                    <tbody>
                    {estoqueBaixo.map((produto) => (
                        <tr key={produto.id}>
                        <td>{produto.nome}</td>
                        <td>
                            <span className="estoque-alerta">
                            {produto.quantidade}
                            </span>
                        </td>
                        <td>{formatarMoeda(produto.preco)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            ) : (
                <div className="dashboard-vazio">
                Nenhum produto com estoque baixo.
                </div>
            )}
            </section>
        </div>
        </div>
    );
    }
