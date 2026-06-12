# Instalação e Execução — Sistema OPME NOS

## Pré-requisitos

- [Node.js 20+](https://nodejs.org) — **instale primeiro**
- [PostgreSQL 16+](https://postgresql.org) **OU** [Docker Desktop](https://docker.com)

---

## Opção 1 — Execução Rápida (sem banco de dados)

O frontend funciona 100% com armazenamento local (localStorage) para demonstração.

```
# 1. Abra o terminal e navegue até a pasta frontend
cd "C:\Sistema OPME (NOS)\frontend"

# 2. Instale as dependências
npm install

# 3. Inicie o sistema
npm run dev

# 4. Acesse no navegador
http://localhost:3000
```

**Credenciais de demo:**
- Admin: `admin` / `admin123`
- Vendedor: `joao.silva` / `123456`

---

## Opção 2 — Sistema Completo com PostgreSQL

### 2a. Com Docker (recomendado)

```
# Na raiz do projeto
docker-compose up -d
```

Acesse: http://localhost

### 2b. Manual

```
# 1. Crie o banco de dados PostgreSQL
# Crie um banco chamado: opme_db

# 2. Configure o backend
cd "C:\Sistema OPME (NOS)\backend"
copy .env.example .env
# Edite .env com suas credenciais do PostgreSQL

# 3. Instale dependências e configure banco
npm install
npx prisma migrate dev --name init
npx prisma db seed

# 4. Inicie o backend (terminal 1)
npm run dev

# 5. Inicie o frontend (terminal 2)
cd "C:\Sistema OPME (NOS)\frontend"
npm install
npm run dev
```

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Dashboard | KPIs, gráficos, alertas de cirurgias próximas |
| Requisições | CRUD completo, filtros, status flow |
| Formulário | Todos os campos do spec + materiais dinâmicos |
| Relatórios | Export Excel e PDF com filtros |
| Usuários | CRUD de usuários com perfis de acesso |
| PWA | Instalável em iPhone, Android e Windows |

## Perfis de Acesso

| Perfil | Permissões |
|--------|-----------|
| Admin | Acesso total: usuários, relatórios, editar qualquer req |
| Vendedor | Criar/editar/visualizar próprias requisições |
| Operacional | Idem ao vendedor |
| Consulta | Somente visualização |

## Tecnologias

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Prisma ORM
- **Banco:** PostgreSQL
- **Auth:** JWT
- **PWA:** Vite Plugin PWA (instalável como app)
- **Export:** xlsx + jsPDF
