import { useEffect, useState, useRef } from "react";

import {
    Users,
    UserCheck,
    UserX,
    Search,
    Plus,
    Pencil,
    KeyRound,
    Shield
} from "lucide-react";

import { listarUsuarios, cadastrarUsuario, editarUsuario, alterarPermissoes, redefinirSenha } from "../services/usuarioService";

import "./Usuarios.css";

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [busca, setBusca] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [modal, setModal] = useState(null);
    const [dados, setDados] = useState({});
    const [salvando, setSalvando] = useState(false);
    const [erroModal, setErroModal] = useState("");
    const [sucesso, setSucesso] = useState("");
    const dialogRef = useRef(null);
    const enviando = useRef(false);

    function abrirModal(tipo, usuario = null) {
        setErroModal("");
        setSucesso("");
        setDados({ nome: usuario?.nome ?? "", email: usuario?.email ?? "",
            perfil: usuario?.perfil ?? "funcionario", ativo: usuario?.ativo ?? true,
            senha: "", confirmarSenha: "" });
        setModal({ tipo, usuario });
    }

    useEffect(() => {
        if (modal && !dialogRef.current.open) dialogRef.current.showModal();
    }, [modal]);

    function fecharModal() {
        if (enviando.current) return;
        dialogRef.current?.close();
        setModal(null);
        setDados({});
        setErroModal("");
    }

    function atualizarCampo(campo, valor) {
        setDados(anterior => ({ ...anterior, [campo]: valor }));
    }

    async function salvar(event) {
        event.preventDefault();
        if (enviando.current || !modal) return;
        setErroModal("");
        const { tipo, usuario } = modal;
        const { nome, email, senha, confirmarSenha, perfil, ativo } = dados;
        if (["cadastro", "edicao"].includes(tipo) && nome.trim().length < 3) {
            setErroModal("Informe um nome com pelo menos 3 caracteres.");
            return;
        }
        if (["cadastro", "senha"].includes(tipo)) {
            if (senha.length < 8 || new TextEncoder().encode(senha).length > 72 || !senha.trim()) {
                setErroModal("A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.");
                return;
            }
            if (senha !== confirmarSenha) {
                setErroModal("As senhas não coincidem.");
                return;
            }
        }
        enviando.current = true;
        setSalvando(true);
        try {
            let resposta;
            if (tipo === "cadastro") resposta = await cadastrarUsuario({ nome: nome.trim(), email: email.trim(), senha });
            if (tipo === "edicao") resposta = await editarUsuario(usuario.id, { nome: nome.trim(), email: email.trim() });
            if (tipo === "permissoes") resposta = await alterarPermissoes(usuario.id, { perfil, ativo });
            if (tipo === "senha") resposta = await redefinirSenha(usuario.id, senha);
            setSucesso(resposta?.mensagem || "Operação realizada com sucesso.");
            enviando.current = false;
            fecharModal();
            await carregarUsuarios();
        } catch (error) {
            setErroModal(error.response?.data?.mensagem || "Não foi possível concluir a operação.");
        } finally {
            enviando.current = false;
            setSalvando(false);
        }
    }

    async function carregarUsuarios() {
        try {
            setCarregando(true);
            setErro("");

            const dados = await listarUsuarios();

            setUsuarios(dados);
        } catch (error) {
            setErro(
                error.response?.data?.mensagem ||
                "Não foi possível carregar os usuários."
            );
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const totalUsuarios = usuarios.length;

    const usuariosAtivos = usuarios.filter(
        (usuario) => usuario.ativo
    ).length;

    const usuariosInativos = usuarios.filter(
        (usuario) => !usuario.ativo
    ).length;

    const termoBusca = busca.trim().toLowerCase();

    const usuariosFiltrados = usuarios.filter(
        (usuario) =>
            usuario.nome.toLowerCase().includes(termoBusca) ||
            usuario.email.toLowerCase().includes(termoBusca)
    );

    return (
        <div className="usuarios-pagina">

            <header className="usuarios-cabecalho">
                <div>
                    <h1>Gerenciamento de usuários</h1>

                    <p>
                        Gerencie contas e permissões de acesso.
                    </p>
                </div>

                <button
                    className="usuarios-btn-novo"
                    disabled={salvando || carregando}
                    onClick={() => abrirModal("cadastro")}
                >
                    <Plus size={18} />
                    Novo usuário
                </button>
            </header>

            <section className="usuarios-indicadores">

                <div className="usuarios-card">
                    <Users size={24} />
                    <span>Total de usuários</span>
                    <strong>{totalUsuarios}</strong>
                </div>

                <div className="usuarios-card">
                    <UserCheck size={24} />
                    <span>Usuários ativos</span>
                    <strong>{usuariosAtivos}</strong>
                </div>

                <div className="usuarios-card">
                    <UserX size={24} />
                    <span>Usuários inativos</span>
                    <strong>{usuariosInativos}</strong>
                </div>

            </section>

            {sucesso && <div className="usuarios-sucesso" role="status">{sucesso}</div>}

            <section className="usuarios-listagem">

                <div className="usuarios-busca">
                    <Search size={20} />

                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
                        aria-label="Buscar usuários"
                        value={busca}
                        onChange={(event) =>
                            setBusca(event.target.value)
                        }
                    />
                </div>

                {erro && (
                    <div className="usuarios-erro">
                        {erro}
                    </div>
                )}

                {carregando ? (
                    <p>Carregando usuários...</p>
                ) : !erro && (
                    <div className="usuarios-tabela-container">

                        <table className="usuarios-tabela">

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>E-mail</th>
                                    <th>Perfil</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>

                            <tbody>
                                {usuariosFiltrados.map((usuario) => (
                                    <tr key={usuario.id}>

                                        <td>{usuario.id}</td>

                                        <td>{usuario.nome}</td>

                                        <td>{usuario.email}</td>

                                        <td>
                                            <span
                                                className={
                                                    usuario.perfil === "admin"
                                                        ? "usuarios-perfil-admin"
                                                        : "usuarios-perfil-funcionario"
                                                }
                                            >
                                                {usuario.perfil === "admin"
                                                    ? "Administrador"
                                                    : "Funcionário"}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    usuario.ativo
                                                        ? "usuarios-status-ativo"
                                                        : "usuarios-status-inativo"
                                                }
                                            >
                                                {usuario.ativo
                                                    ? "Ativo"
                                                    : "Inativo"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="usuarios-acoes">

                                                <button
                                                    title="Editar usuário"
                                                    aria-label="Editar usuário"
                                                    disabled={salvando}
                                                    onClick={() => abrirModal("edicao", usuario)}
                                                >
                                                    <Pencil size={18} />
                                                </button>

                                                <button
                                                    title="Alterar permissões"
                                                    aria-label="Alterar permissões"
                                                    disabled={salvando}
                                                    onClick={() => abrirModal("permissoes", usuario)}
                                                >
                                                    <Shield size={18} />
                                                </button>

                                                <button
                                                    title="Redefinir senha"
                                                    aria-label="Redefinir senha"
                                                    disabled={salvando}
                                                    onClick={() => abrirModal("senha", usuario)}
                                                >
                                                    <KeyRound size={18} />
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                ))}

                                {usuariosFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                        </table>

                    </div>
                )}

            </section>

            <dialog ref={dialogRef} className="usuarios-modal" aria-labelledby="usuarios-modal-titulo"
                onCancel={event => { event.preventDefault(); fecharModal(); }}>
                {modal && (
                    <form onSubmit={salvar} className="usuarios-formulario">
                        <h2 id="usuarios-modal-titulo">{{ cadastro: "Novo usuário", edicao: "Editar usuário", permissoes: "Alterar permissões", senha: "Redefinir senha" }[modal.tipo]}</h2>
                        {modal.usuario && <p>{modal.usuario.nome}</p>}
                        {erroModal && <div className="usuarios-erro" role="alert">{erroModal}</div>}
                        <fieldset disabled={salvando}>
                            {["cadastro", "edicao"].includes(modal.tipo) && <>
                                <label>Nome completo<input required minLength={3} maxLength={120} value={dados.nome} onChange={e => atualizarCampo("nome", e.target.value)} /></label>
                                <label>E-mail<input type="email" required maxLength={150} value={dados.email} onChange={e => atualizarCampo("email", e.target.value)} /></label>
                            </>}
                            {["cadastro", "senha"].includes(modal.tipo) && <>
                                <label>{modal.tipo === "senha" ? "Nova senha" : "Senha"}<input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={dados.senha} onChange={e => atualizarCampo("senha", e.target.value)} /></label>
                                <label>Confirmar senha<input type="password" autoComplete="new-password" required value={dados.confirmarSenha} onChange={e => atualizarCampo("confirmarSenha", e.target.value)} /></label>
                            </>}
                            {modal.tipo === "cadastro" && <p>Novas contas são cadastradas como funcionários.</p>}
                            {modal.tipo === "permissoes" && <>
                                <label>Perfil<select value={dados.perfil} onChange={e => atualizarCampo("perfil", e.target.value)}><option value="funcionario">Funcionário</option><option value="admin">Administrador</option></select></label>
                                <label>Situação<select value={String(dados.ativo)} onChange={e => atualizarCampo("ativo", e.target.value === "true")}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
                            </>}
                        </fieldset>
                        <div className="usuarios-modal-botoes">
                            <button type="button" className="usuarios-btn-cancelar" disabled={salvando} onClick={fecharModal}>Cancelar</button>
                            <button type="submit" className="usuarios-btn-novo" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
                        </div>
                    </form>
                )}
            </dialog>

        </div>
    );
}