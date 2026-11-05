import { useEffect, useState } from "react";
import {
    Package,
    Search,
    Plus,
    Pencil,
    Trash2,
    LogOut,
    X,
    Boxes,
    RefreshCw,
    LayoutDashboard,
    ArrowLeftRight,
} from "lucide-react";

import api from "./services/api";
import Dashboard from "./components/Dashboard";
import Movimentacoes from "./components/Movimentacoes";
import "./App.css";



function App() {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [pagina, setPagina] = useState("dashboard");

    const [produtos, setProdutos] = useState([]);
    const [pesquisa, setPesquisa] = useState("");
    const [erro, setErro] = useState("");

    const [modalAberto, setModalAberto] = useState(false);
    const [produtoEditando, setProdutoEditando] = useState(null);
    const [salvando, setSalvando] = useState(false);

    const [form, setForm] = useState({
        nome: "",
        categoria: "",
        quantidade: "",
        preco: ""
    });

    // VERIFICAR AUTENTICAÇÃO
    useEffect(() => {
        async function verificarUsuario() {
            try {
                const resposta = await api.get("/auth/me");
                setUsuario(resposta.data.usuario || resposta.data);
            } catch {
                setUsuario(null);
            } finally {
                setCarregando(false);
            }
        }

        verificarUsuario();
    }, []);

    // BUSCAR PRODUTOS
    async function carregarProdutos(termo = pesquisa) {
        try {
            setErro("");

            const resposta = await api.get("/produtos", {
                params: { q: termo }
            });

            setProdutos(resposta.data);

        } catch (error) {
            setErro(
                error.response?.data?.mensagem ||
                "Não foi possível carregar os produtos."
            );
        }
    }

    // PESQUISA AUTOMÁTICA
    useEffect(() => {
        if (!usuario) return;

        const intervalo = setTimeout(() => {
            carregarProdutos(pesquisa);
        }, 300);

        return () => clearTimeout(intervalo);
    }, [pesquisa, usuario]);

    // LOGIN
    async function fazerLogin(event) {
        event.preventDefault();

        const dados = new FormData(event.target);

        try {
            setErro("");

            await api.post("/auth/login", {
                email: dados.get("email"),
                senha: dados.get("senha")
            });

            const resposta = await api.get("/auth/me");
            setUsuario(resposta.data.usuario || resposta.data);

        } catch (error) {
            setErro(
                error.response?.data?.mensagem ||
                "Não foi possível realizar o login."
            );
        }
    }

    // LOGOUT
    async function fazerLogout() {
        try {
            await api.post("/auth/logout");
        } catch {
            // Continua encerrando a sessão na interface.
        }

        setUsuario(null);
        setProdutos([]);
    }

    // ABRIR FORMULÁRIO
    function abrirFormulario(produto = null) {
        setProdutoEditando(produto);

        setForm({
            nome: produto?.nome || "",
            categoria: produto?.categoria || "",
            quantidade: produto?.quantidade ?? "",
            preco: produto?.preco ?? ""
        });

        setModalAberto(true);
    }

    // ATUALIZAR CAMPOS
    function atualizarCampo(event) {
        const { name, value } = event.target;

        setForm((anterior) => ({
            ...anterior,
            [name]: value
        }));
    }

    // SALVAR PRODUTO
    async function salvarProduto(event) {
        event.preventDefault();

        const dados = {
            nome: form.nome.trim(),
            categoria: form.categoria.trim(),
            quantidade: Number(form.quantidade),
            preco: Number(form.preco)
        };

        if (
            !dados.nome ||
            form.quantidade === "" ||
            form.preco === "" ||
            !Number.isInteger(dados.quantidade) ||
            dados.quantidade < 0 ||
            !Number.isFinite(dados.preco) ||
            dados.preco < 0
        ) {
            setErro("Confira os dados informados.");
            return;
        }

        try {
            setSalvando(true);
            setErro("");

            if (produtoEditando) {
                await api.put(
                    `/produtos/${produtoEditando.id}`,
                    dados
                );
            } else {
                await api.post("/produtos", dados);
            }

            setModalAberto(false);
            setProdutoEditando(null);

            setForm({
                nome: "",
                categoria: "",
                quantidade: "",
                preco: ""
            });

            await carregarProdutos();

        } catch (error) {
            setErro(
                error.response?.data?.mensagem ||
                "Erro ao salvar o produto."
            );
        } finally {
            setSalvando(false);
        }
    }

    // EXCLUIR PRODUTO
    async function excluirProduto(produto) {
        const confirmar = window.confirm(
            `Deseja excluir o produto "${produto.nome}"?`
        );

        if (!confirmar) return;

        try {
            setErro("");

            await api.delete(`/produtos/${produto.id}`);

            await carregarProdutos();

        } catch (error) {
            setErro(
                error.response?.data?.mensagem ||
                "Não foi possível excluir o produto."
            );
        }
    }

    // CARREGAMENTO INICIAL
    if (carregando) {
        return (
            <div className="tela-carregamento">
                Carregando sistema...
            </div>
        );
    }

    // TELA DE LOGIN
    if (!usuario) {
        return (
            <div className="login-container">
                <form className="login-card" onSubmit={fazerLogin}>
                    <div className="login-icon">
                        <Package size={32} />
                    </div>

                    <h1>Sistema de Estoque</h1>
                    <p>Entre com sua conta para continuar.</p>

                    {erro && (
                        <div className="mensagem-erro">
                            {erro}
                        </div>
                    )}

                    <label>E-mail</label>
                    <input
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                    />

                    <label>Senha</label>
                    <input
                        name="senha"
                        type="password"
                        placeholder="Digite sua senha"
                        required
                    />

                    <button className="botao-principal" type="submit">
                        Entrar
                    </button>
                </form>
            </div>
        );
    }

    // INTERFACE DE PRODUTOS
    return (
        <div className="sistema">

            <aside className="sidebar">
                <div className="logo">
                    <Package size={28} />
                    <span>Estoque</span>
                </div>

                <div className="menu-titulo">MENU PRINCIPAL</div>

                <button
                    type="button"
                    className={`menu-item ${pagina === "dashboard" ? "ativo" : ""}`}
                    onClick={() => setPagina("dashboard")}
                >
                    <LayoutDashboard size={19} />
                    <span>Dashboard</span>
                </button>

                <button
                    type="button"
                    className={`menu-item ${pagina === "produtos" ? "ativo" : ""}`}
                    onClick={() => setPagina("produtos")}
                >
                    <Boxes size={19} />
                    <span>Produtos</span>
                </button>

                <button
                    type="button"
                    className={`menu-item ${pagina === "movimentacoes" ? "ativo" : ""}`}
                    onClick={() => setPagina("movimentacoes")}
                >
                    <ArrowLeftRight size={19} />
                    <span>Movimentações</span>
                </button>

                <div className="usuario-sidebar">
                    <div className="avatar">
                        {(usuario.nome || "U").charAt(0).toUpperCase()}
                    </div>

                    <div className="usuario-info">
                        <strong>{usuario.nome || "Usuário"}</strong>
                        <span>{usuario.perfil || "Funcionário"}</span>
                    </div>

                    <button
                        className="botao-icone"
                        onClick={fazerLogout}
                        title="Sair"
                    >
                        <LogOut size={19} />
                    </button>
                </div>
            </aside>

            <main className="conteudo">
            
                {pagina === "dashboard"? (
                        <Dashboard />
                ) : pagina === "movimentacoes" ? (
                        <Movimentacoes />
                ):(
                    <>

                <header className="cabecalho">
                    <div>
                        <h1>Produtos</h1>
                        <p>Gerencie os produtos do seu estoque.</p>
                    </div>

                    <button
                        className="botao-principal"
                        onClick={() => abrirFormulario()}
                    >
                        <Plus size={19} />
                        Novo produto
                    </button>
                </header>

                {erro && (
                    <div className="mensagem-erro">
                        {erro}
                    </div>
                )}

                <section className="resumo">
                    <div className="resumo-icone">
                        <Boxes size={25} />
                    </div>

                    <div>
                        <span>Total de produtos</span>
                        <strong>{produtos.length}</strong>
                    </div>
                </section>

                <section className="painel-produtos">
                    <div className="painel-topo">
                        <div>
                            <h2>Lista de produtos</h2>
                            <p>Consulte e gerencie seus produtos.</p>
                        </div>

                        <button
                            className="botao-atualizar"
                            onClick={() => carregarProdutos()}
                            title="Atualizar lista"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    <div className="campo-pesquisa">
                        <Search size={19} />

                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou categoria..."
                            value={pesquisa}
                            onChange={(event) =>
                                setPesquisa(event.target.value)
                            }
                        />
                    </div>

                    <div className="tabela-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Categoria</th>
                                    <th>Quantidade</th>
                                    <th>Preço</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                {produtos.length > 0 ? (
                                    produtos.map((produto) => (
                                        <tr key={produto.id}>
                                            <td>
                                                <strong>{produto.nome}</strong>
                                                <span className="produto-id">
                                                    ID: {produto.id}
                                                </span>
                                            </td>

                                            <td>
                                                {produto.categoria || "Sem categoria"}
                                            </td>

                                            <td>
                                                <span className={
                                                    produto.quantidade <= 5
                                                        ? "estoque-baixo"
                                                        : "estoque-normal"
                                                }>
                                                    {produto.quantidade}
                                                </span>
                                            </td>

                                            <td>
                                                {Number(produto.preco).toLocaleString(
                                                    "pt-BR",
                                                    {
                                                        style: "currency",
                                                        currency: "BRL"
                                                    }
                                                )}
                                            </td>

                                            <td>
                                                <div className="acoes">
                                                    <button
                                                        className="acao-editar"
                                                        title="Editar"
                                                        onClick={() =>
                                                            abrirFormulario(produto)
                                                        }
                                                    >
                                                        <Pencil size={17} />
                                                    </button>

                                                    {usuario.perfil === "admin" && (
                                                        <button
                                                            className="acao-excluir"
                                                            title="Excluir"
                                                            onClick={() =>
                                                                excluirProduto(produto)
                                                            }
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="vazio">
                                            Nenhum produto encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </>
                )}
            </main>

            {/* MODAL DE CADASTRO E EDIÇÃO */}
            {modalAberto && (
                <div className="modal-fundo">
                    <div className="modal">
                        <div className="modal-cabecalho">
                            <div>
                                <h2>
                                    {produtoEditando
                                        ? "Editar produto"
                                        : "Novo produto"}
                                </h2>

                                <p>Preencha as informações abaixo.</p>
                            </div>

                            <button
                                className="botao-icone"
                                onClick={() => setModalAberto(false)}
                                type="button"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={salvarProduto}>
                            <label>Nome do produto</label>
                            <input
                                name="nome"
                                value={form.nome}
                                onChange={atualizarCampo}
                                placeholder="Ex: Arroz 5 kg"
                                maxLength={150}
                                required
                            />

                            <label>Categoria</label>
                            <input
                                name="categoria"
                                value={form.categoria}
                                onChange={atualizarCampo}
                                placeholder="Ex: Alimentos"
                                maxLength={100}
                            />

                            <div className="form-linha">
                                <div>
                                    <label>Quantidade</label>
                                    <input
                                        name="quantidade"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.quantidade}
                                        onChange={atualizarCampo}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Preço (R$)</label>
                                    <input
                                        name="preco"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.preco}
                                        onChange={atualizarCampo}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="modal-acoes">
                                <button
                                    type="button"
                                    className="botao-cancelar"
                                    onClick={() => setModalAberto(false)}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="botao-principal"
                                    disabled={salvando}
                                >
                                    {salvando ? "Salvando..." : "Salvar produto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;