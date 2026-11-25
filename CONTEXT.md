# CONTEXT.md — Sistema de gerenciamento de estoque

## 1. Finalidade e fontes

Este documento transfere o contexto do sistema de estoque para o Codex. O código e o Git locais foram consultados em 24/11/2026. O CONTEXT.md fornecido pelo usuário registra o histórico da conversa anterior, incluindo o DDL e os testes manuais relatados. O estado do banco em execução continua sem verificação. As próximas etapas registram o ponto de retomada do desenvolvimento.

## 2. Objetivo do projeto

Construir um sistema web multiusuário de gerenciamento de estoque com autenticação, cadastro e gerenciamento de produtos, busca em tempo real, dashboard, movimentações de entrada e saída, registro de vendas com baixa automática de estoque, histórico, relatórios e exportação PDF/Excel. A interface deve ser moderna, clara e responsiva.

## 3. Ambiente e arquitetura

- Ambiente de desenvolvimento: Windows, VS Code, PowerShell, pgAdmin e Thunder Client/Postman para testes HTTP.
- Diretório local informado: `C:\Users\monar\Desktop\portifolio\sistema-estoque`.
- Frontend: React, Vite, JavaScript/JSX, CSS, Axios, Lucide React e Recharts.
- Backend: Node.js, Express, JavaScript com módulos ES, PostgreSQL via `pg`, com pool em `src/config/database.js`.
- Dependências utilizadas ou mencionadas: express, pg, dotenv, cors, jsonwebtoken, bcrypt, helmet, express-rate-limit, zod, cookie-parser e nodemon. Express 5 no backend e React 19 com Vite 8 no frontend, conforme os manifests. express-rate-limit e zod estão declarados no backend.
- Banco: PostgreSQL, database `sistema_estoque`.
- API local: `http://localhost:3000/api`; frontend local: `http://localhost:5173`.
- Versionamento: repositório privado no GitHub, branch `main`, remoto `origin`.

Fluxo: navegador React → Axios (cookies habilitados) → Express (rotas e autenticação) → controllers → pool PostgreSQL. O banco é a fonte de verdade para estoque e preços. O frontend não acessa o banco diretamente.

## 4. Estrutura do projeto

```text
sistema-estoque/
├── .gitignore
├── CONTEXT.md
├── backend/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── server.js
│       ├── config/database.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── dashboardController.js
│       │   ├── movimentacaoController.js
│       │   ├── produtoController.js
│       │   └── vendaController.js
│       ├── middlewares/authMiddleware.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── dashboardRoutes.js
│       │   ├── movimentacaoRoutes.js
│       │   ├── produtoRoutes.js
│       │   └── vendaRoutes.js
│       └── scripts/criarAdmin.js
└── frontend/
    ├── .gitignore
    ├── README.md
    ├── package.json
    ├── package-lock.json
    ├── index.html
    ├── vite.config.js
    ├── eslint.config.js
    ├── public/
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx
        ├── App.css
        ├── assets/
        ├── services/api.js
        └── components/
            ├── Dashboard.jsx
            ├── Dashboard.css
            ├── Movimentacoes.jsx
            ├── Movimentacoes.css
            ├── Vendas.jsx
            └── Vendas.css
```

### Execução local

Em terminais separados, execute `npm run dev` dentro de `backend/` e de `frontend/`, com as dependências instaladas. Use `npm ci` em cada subprojeto quando for necessário restaurar dependências a partir do lockfile. No backend, `npm start` executa `src/server.js` sem nodemon e `npm run criar:admin` executa o script de criação do primeiro administrador.

O backend usa `PORT` (padrão 3000), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `JWT_SECRET`. O script de bootstrap usa também `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Os nomes constam de `backend/.env.example`. No frontend, `npm run build` gera o pacote e `npm run lint` executa o ESLint.

## 5. Banco de dados

DDL histórico da criação das tabelas e alterações posteriores, fornecido no anexo. O repositório consultado não contém arquivos SQL versionados nem migrações identificadas.

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL DEFAULT 'funcionario'
        CHECK (perfil IN ('admin', 'funcionario')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(100),
    quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    preco NUMERIC(12, 2) NOT NULL CHECK (preco >= 0),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id),
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);
CREATE TABLE movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    descricao TEXT,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_vendas_data ON vendas(data_venda);
CREATE INDEX idx_itens_venda_produto ON itens_venda(produto_id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_produtos_ativos ON produtos(ativo);
```

Não executar novamente o DDL de criação sobre o banco existente. Conferir o schema real antes de propor migrações.

Relacionamentos: usuário 1:N vendas e movimentações; venda 1:N itens_venda; produto 1:N itens_venda e movimentações. O preço unitário histórico é armazenado em cada item, preservando o valor da venda mesmo após alterações no cadastro. Produtos são desativados logicamente para preservar referências históricas.

## 6. Backend: funcionalidades e contratos HTTP

### 6.1 Autenticação

JWT no cookie `token` com HttpOnly, SameSite=Lax, Secure quando NODE_ENV é production, expiração de 30 minutos, issuer `sistema-estoque`, hash de senha bcrypt com custo 12. Middleware `autenticar` valida o cookie e consulta se o usuário permanece ativo; controllers utilizam `req.usuario.id`. Perfis `admin` e `funcionario`. Registro de usuários e exclusão de produtos restritos ao administrador. O primeiro administrador foi criado pelo script `src/scripts/criarAdmin.js`; credenciais temporárias foram retiradas do `.env` depois.

Servidor utiliza Helmet, CORS com origem local do frontend e credenciais habilitadas, cookie-parser e limite JSON de 10 KB. Não expor tokens ou senhas.

### 6.2 Endpoints conhecidos

| Método | Caminho (prefixo `/api`) | Função |
|---|---|---|
| POST | `/auth/login` | Autenticar e emitir cookie |
| GET | `/health/db` | Verificar conexão com o banco, rota pública |
| POST | `/auth/logout` | Encerrar sessão, requer autenticação |
| GET | `/auth/me` | Consultar usuário autenticado |
| POST | `/auth/register` | Cadastrar usuário (admin) |
| GET | `/produtos` | Listar produtos ativos ou buscar com `q` por nome e categoria (`ILIKE`) |
| POST | `/produtos` | Cadastrar produto |
| PUT | `/produtos/:id` | Editar produto |
| DELETE | `/produtos/:id` | Desativar produto (admin) |
| GET | `/dashboard` | Indicadores, estoque baixo e mais vendidos |
| GET | `/movimentacoes` | Histórico de movimentações |
| POST | `/movimentacoes/entrada` | Registrar entrada |
| POST | `/movimentacoes/saida` | Registrar saída |
| POST | `/vendas` | Registrar venda |

Os endpoints de negócio são protegidos. O login recebe `email` e `senha`. O cadastro administrativo recebe `nome`, `email` e `senha` e cria um funcionário. `GET /api/produtos` devolve um array de produtos, usado diretamente pelas telas. `GET /` também está disponível para verificar se o servidor responde. A rota de vendas implementa somente POST.

### 6.3 Produtos — `produtoController.js`

CRUD de produtos ativos. Cadastro com estoque inicial gera movimentação `entrada`; alteração de quantidade gera movimentação `ajuste` com diferença absoluta. Edição usa transação. Exclusão lógica por `ativo = FALSE`. Exemplo de payload de edição:

```json
{"nome":"Arroz 5 kg","categoria":"Alimentos","quantidade":30,"preco":30.00}
```

### 6.4 Dashboard — `dashboardController.js` e `dashboardRoutes.js`

Resumo de produtos ativos, total de unidades, quantidade de produtos com estoque baixo (até 5 unidades), valor total do estoque, lista de estoque baixo e produtos mais vendidos no mês (consultas às tabelas de vendas e itens).

Resposta histórica validada antes das vendas:

```json
{
  "resumo": {
    "total_produtos": "1",
    "total_unidades": "35",
    "produtos_estoque_baixo": "0",
    "valor_total_estoque": "1050.00"
  },
  "estoqueBaixo": [],
  "maisVendidos": []
}
```

Valores numéricos podem chegar como strings do PostgreSQL. A lista de estoque baixo tem até 10 produtos. `maisVendidos` tem até 5 itens do mês corrente e usa os campos `id`, `nome`, `quantidade_vendida` e `valor_vendido`.

### 6.5 Movimentações — `movimentacaoController.js` e `movimentacaoRoutes.js`

Listagem com filtros opcionais `tipo` e `produto_id`, até 100 registros, incluindo nomes de produto/usuário e data. Entrada e saída utilizam transação, bloqueio de produto com `FOR UPDATE`, validação de produto ativo, quantidade inteira positiva e descrição de até 500 caracteres. Saída exige saldo suficiente. Atualiza `produtos.quantidade` e `atualizado_em`, insere movimentação associada ao usuário autenticado, confirma ou desfaz a transação.

```js
router.use(autenticar);
router.get("/", listarMovimentacoes);
router.post("/entrada", registrarEntrada);
router.post("/saida", registrarSaida);
```

Exemplo de entrada (payload utilizado no desenvolvimento):

```json
{"produto_id":1,"quantidade":5,"descricao":"Reposição de estoque"}
```

O tipo `ajuste` aparece no histórico, mas não existe endpoint próprio de ajuste no contexto conhecido.

### 6.6 Vendas — `vendaController.js` e `vendaRoutes.js`

Backend concluído na etapa 9.3. `registrarVenda(req, res)` recebe `itens`, exige array não vazio, converte IDs e quantidades para números inteiros positivos e rejeita produtos duplicados usando `Map`. Obtém conexão do pool e inicia transação. Consulta produtos ativos em ordem de ID com bloqueio:

```sql
SELECT id, nome, quantidade, preco
FROM produtos
WHERE id = ANY($1::int[]) AND ativo = TRUE
ORDER BY id
FOR UPDATE;
```

Confere existência e estoque de todos os itens antes de registrar a venda. Calcula preços em centavos (`Math.round(Number(produto.preco) * 100)`), multiplica pela quantidade e soma o total. Persiste valores com duas casas decimais. Insere `vendas`, depois `itens_venda`, atualiza saldo e data do produto e insere movimentação `saida` com descrição `Venda #<id>`. Confirma com `COMMIT`, retorna HTTP 201; em erro executa `ROLLBACK` e libera a conexão em `finally`. Retorna 400 para validação/estoque insuficiente e 500 para falha interna.

Código da rota fornecido:

```js
import express from "express";
import { registrarVenda } from "../controllers/vendaController.js";
import { autenticar } from "../middlewares/authMiddleware.js";
const router = express.Router();
router.use(autenticar);
router.post("/", registrarVenda);
export default router;
```

Integração no `server.js`:

```js
import movimentacaoRoutes from "./routes/movimentacaoRoutes.js";
import vendaRoutes from "./routes/vendaRoutes.js";
// Após a configuração dos middlewares:
app.use("/api/movimentacoes", movimentacaoRoutes);
app.use("/api/vendas", vendaRoutes);
```

Contrato de criação:

```http
POST /api/vendas
Content-Type: application/json
```

```json
{"itens":[{"produto_id":7,"quantidade":2}]}
```

Não enviar preço como fonte de verdade; o backend consulta o cadastro. O ID 7 é apenas o exemplo testado, não fixar na interface.

O controlador fornecido retorna `{ mensagem, venda: { ...venda, itens: itensRegistrados } }`. Cada item inclui os campos persistidos e `produto` e `estoque_atual`. Exemplo de resposta esperada, com o trecho de itens efetivamente informado no teste:

```json
{
  "mensagem": "Venda registrada com sucesso.",
  "venda": {
    "id": 1,
    "itens": [
      {
        "id": 1,
        "venda_id": 1,
        "produto_id": 7,
        "quantidade": 2,
        "preco_unitario": "10.00",
        "subtotal": "20.00",
        "produto": "Arroz 5 kg",
        "estoque_atual": 15
      }
    ]
  }
}
```

O exemplo omite campos da venda não exibidos no trecho de resposta do usuário. O código usa `RETURNING *`, portanto pode incluir `usuario_id`, `valor_total` e `data_venda`.

## 7. Frontend

### 7.1 Serviço Axios — `src/services/api.js`

Instância compartilhada com `baseURL: "http://localhost:3000/api"`, `withCredentials: true` e cabeçalho JSON. Reutilizar essa instância em novos componentes, sem criar cliente paralelo ou armazenar JWT no localStorage.

### 7.2 App.jsx e produtos

Gerencia autenticação, carregamento inicial, login/logout, busca com debounce, formulário/modal CRUD, tabela de produtos e exclusão restrita ao administrador. Estado `pagina` inicia em `dashboard`. Menu lateral usa Lucide React e classe `menu-item ativo`. Interface branca/azul e responsiva.

Trecho de navegação integrado na etapa 8:

```jsx
import Dashboard from "./components/Dashboard";
import Movimentacoes from "./components/Movimentacoes";
// ArrowLeftRight adicionado ao import existente de lucide-react
// Dentro de App:
const [pagina, setPagina] = useState("dashboard");
// Dentro do menu:
<button type="button"
    className={`menu-item ${pagina === "movimentacoes" ? "ativo" : ""}`}
    onClick={() => setPagina("movimentacoes")}>
    <ArrowLeftRight size={19} />
    <span>Movimentações</span>
</button>
```

A renderização condicional de `App.jsx` abre Dashboard, Movimentacoes ou Vendas conforme `pagina`. A interface de produtos é o fallback. O menu Vendas e o import do componente estão presentes nas alterações locais.

### 7.3 Dashboard.jsx / Dashboard.css

Consulta `/dashboard`, apresenta quatro cartões de indicadores, gráfico de barras de produtos mais vendidos usando Recharts e tabela de estoque baixo. Possui estado vazio quando não há vendas. Implementado e funcionamento confirmado.

### 7.4 Movimentacoes.jsx / Movimentacoes.css

Utiliza `useEffect`, `useState`, ícones `ArrowDownToLine`, `ArrowUpFromLine`, `History`, `RefreshCw` e cliente Axios compartilhado. Busca produtos e histórico; permite selecionar entrada/saída, produto, quantidade e descrição; registra via POST; mostra feedback, limpa formulário e atualiza produtos e histórico. Tabela exibe produto, tipo, quantidade, usuário, descrição e data. Filtro todos/entrada/saída/ajuste. CSS responsivo com cartões, formulário, tabela e indicadores de tipo. Integração confirmada pelo usuário.

### 7.5 Vendas.jsx / Vendas.css

A tela já existe no workspace. Usa o cliente Axios comum para carregar produtos, estilos compartilhados com Movimentações e CSS específico. Permite selecionar produto e quantidade, incluir e remover itens, bloquear duplicatas e saldos insuficientes e exibir preço, subtotais e total estimado em reais. Revalida a disponibilidade antes de enviar e usa estado e uma referência para bloquear envios simultâneos.

O envio contém apenas IDs e quantidades. Com sucesso, mostra o número da venda e o total retornado pela API, limpa a seleção e recarrega produtos. Em erro, mostra a mensagem, mantém os itens e tenta recarregar os produtos. A etapa seguinte é verificar esse fluxo com o backend e o banco em execução.

## 8. Decisões técnicas

- Separar backend e frontend e organizar controllers, rotas, configuração e middlewares.
- Usar PostgreSQL relacional com chaves estrangeiras, índices e restrições de quantidade/preço.
- Autenticação por cookie HttpOnly em vez de expor JWT ao JavaScript do frontend.
- Controle de acesso por perfil e usuário ativo.
- Exclusão lógica de produtos para preservar histórico.
- Transações e bloqueios de linha para evitar alterações parciais e concorrência incorreta no estoque.
- Bloquear produtos de uma venda em ordem de ID para reduzir risco de deadlocks.
- Calcular valores monetários no backend em centavos; preservar preço unitário da venda.
- Rejeitar produtos duplicados em uma venda; a interface bloqueia duplicatas antes do envio.
- Registrar saídas de vendas no mesmo histórico das movimentações manuais.
- Reutilizar Axios e padrões visuais existentes; navegação atual por estado React.
- Desenvolver incrementalmente, testar cada etapa e versionar no GitHub antes da seguinte.

## 9. Problemas encontrados e soluções

| Problema ou situação | Solução / resultado |
|---|---|
| PUT de produto retornou 401 Unauthorized, mensagem `Autenticação necessária.` | Autenticar antes da requisição protegida, mantendo o cookie. Usuário confirmou resolução. |
| Import do controller de movimentações não resolvido porque o arquivo não existia no local esperado | Criar `src/controllers/movimentacaoController.js` e conferir import. Resolvido. |
| Dúvida sobre integração de Movimentacoes no App.jsx | Acrescentar ícone ao import existente, importar componente, adicionar botão e ampliar condicional sem substituir o CRUD. Funcionamento confirmado. |
| Dashboard inicialmente sem mais vendidos | Estado esperado antes de registrar vendas, não erro. Interface prevê estado vazio. |

Não há outros erros comprovados nesta conversa. Não confundir riscos potenciais com bugs já observados.

## 10. Testes relatados e verificações locais

- Conexão PostgreSQL e funcionamento da API confirmados.
- Login, consulta de sessão, cadastro autorizado e bloqueio de requisição não autenticada testados.
- CRUD de produtos testado; interface funcionando.
- Dashboard testado no backend e frontend; resposta histórica na seção 6.4.
- Movimentações: entrada, saída, listagem e teste de saldo insuficiente foram orientados; usuário confirmou funcionamento da etapa.
- Venda: POST `/api/vendas` retornou **201 Created**, 286 bytes, 69 ms. Venda ID 1, produto ID 7 (Arroz 5 kg), 2 unidades a R$ 10,00, subtotal R$ 20,00 e estoque restante 15.
- Após a venda, foi solicitado verificar GET `/api/movimentacoes` (saída de 2 unidades, descrição `Venda #1`) e GET `/api/produtos` (saldo 15). O usuário autorizou prosseguir, mas não forneceu os JSONs dessas duas consultas; não há evidência independente dos resultados.
- O histórico fornecido não contém teste ponta a ponta de venda pela interface. Testes de venda com múltiplos itens, duplicatas, saldo insuficiente e rollback ainda devem ser verificados se não existirem no repositório.

Na inspeção local, `npm run lint` e `npm run build` passaram no frontend. O Vite emitiu um aviso de tamanho do pacote JavaScript acima de 500 kB após minificação. Esses comandos verificam o código e a geração do pacote. O fluxo autenticado com o PostgreSQL continua pendente de validação.

Os valores históricos de estoque são exemplos de momentos diferentes. Não assumir que representam o saldo atual do banco.

## 11. Estado atual e planejamento

| Etapa | Descrição | Estado |
|---|---|---|
| 1 | Configuração inicial | Concluída |
| 2 | Banco PostgreSQL | Concluída |
| 3 | Autenticação | Concluída |
| 4 | CRUD de produtos backend | Concluída |
| 5 | Interface de produtos | Concluída |
| 6 | Dashboard backend | Concluída |
| 7 | Dashboard frontend | Concluída |
| 8 | Movimentações backend/frontend | Concluída |
| 9 | Registro de vendas | Backend versionado, frontend integrado localmente e validação ponta a ponta pendente |
| 10 | Histórico e consulta de vendas | Pendente |
| 11 | Gerenciamento de usuários | Pendente (autenticação e cadastro básico já existem) |
| 12 | Relatórios de estoque e vendas | Pendente |
| 13 | Filtros e exportação PDF/Excel | Pendente |
| 14 | Melhorias de segurança e validações | Pendente |
| 15 | Testes finais e preparação para publicação | Pendente |

O planejamento de 15 etapas é uma previsão, não um compromisso de escopo imutável.

## 12. Ponto de retomada — validação da etapa 9.4

1. Partir de `frontend/src/components/Vendas.jsx`, `Vendas.css` e da integração existente em `App.jsx`. As alterações da tela estavam locais na inspeção.
2. Com o PostgreSQL e os dois servidores em execução, fazer login e abrir Vendas. Usar dados de teste para registrar uma venda pela interface.
3. Conferir o identificador e o total retornados, a atualização do saldo em Produtos, a movimentação de saída com descrição `Venda #<id>` e os indicadores de mais vendidos no Dashboard.
4. Validar múltiplos itens, duplicatas, recusa de quantidade acima do saldo e preservação dos itens quando a API falha. Conferir que uma venda rejeitada não produz baixa parcial nem registros incompletos.
5. Após validar a etapa 9, o próximo item do planejamento é o histórico de vendas. A consulta de vendas e sua interface ainda precisam ser desenvolvidas.

## 13. Git e configuração local

A raiz do repositório Git é `sistema-estoque/`. Na inspeção, `main` estava associada à referência local `origin/main`, sem divergência indicada pelo status. O commit `8dd9b25` registra as movimentações e o commit `7317ad5` registra as rotas de vendas. Na árvore de trabalho, `frontend/src/App.jsx` estava modificado, e `frontend/src/components/Vendas.jsx` e `Vendas.css` estavam sem rastreamento. O estado atual do servidor remoto não foi consultado.

O `.gitignore` exclui arquivos locais como `.env`, dependências instaladas e artefatos de build. O exemplo versionado de configuração é `backend/.env.example`. Mantenha valores de credenciais e segredos na configuração local.

## 14. Pontos de revisão futura (não são falhas comprovadas)

- Conferir tratamento de falha em `pool.connect()` (no código fornecido, a conexão é obtida antes do `try`), rollback e validação de elementos nulos no array de itens.
- Conferir limites de valores monetários e quantidades para evitar estouro de inteiros seguros em JavaScript ou do tipo NUMERIC no banco.
- Avaliar proteção contra CSRF para autenticação baseada em cookies, flags de cookie em produção e rate limiting.
- Conferir consistência de filtros, tratamento de erros e atualização de dados ao trocar de página.
- Não alterar o schema ou as regras de negócio sem necessidade demonstrada e sem revisar compatibilidade.

**Retomar em validação ponta a ponta da etapa 9.4 — registro de vendas pela interface React.**
