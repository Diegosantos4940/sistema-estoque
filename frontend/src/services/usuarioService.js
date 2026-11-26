import api from "./api";

export async function listarUsuarios() {
    const resposta = await api.get("/usuarios");
    return resposta.data;
}

export async function detalharUsuario(id) {
    const resposta = await api.get(`/usuarios/${id}`);
    return resposta.data;
}

export async function cadastrarUsuario(dados) {
    const resposta = await api.post("/auth/register", dados);
    return resposta.data;
}

export async function editarUsuario(id, dados) {
    const resposta = await api.put(`/usuarios/${id}`, dados);
    return resposta.data;
}

export async function alterarPermissoes(id, dados) {
    const resposta = await api.patch(
        `/usuarios/${id}/permissoes`,
        dados
    );

    return resposta.data;
}

export async function redefinirSenha(id, senha) {
    const resposta = await api.patch(
        `/usuarios/${id}/senha`,
        { senha }
    );

    return resposta.data;
}