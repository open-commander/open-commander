# Spec: Project-Centric Revamp

> **Status:** Draft
> **Scope:** Sidebar, Navbar, Project CRUD, Session-per-Project panel
> **Constraint:** A tela atual de Sessions (`/sessions`) permanece intacta.

---

## 1. Visao Geral

O sistema atual e orientado a terminais avulsos. O revamp muda o foco para **projetos**: cada projeto mapeia uma pasta do workspace e agrupa sessoes de terminal dentro dele. A sidebar vira o hub de navegacao entre projetos, enquanto Tasks e Security sobem para a navbar.

### Layout Resultante (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAVBAR   [ Brand ]           [ Tasks ] [ Security ] [ Status ] [U] │
├────┬────────────┬────────────────────────────────────────────────────┤
│ S  │  Project   │                                                    │
│ I  │  Sessions  │              MAIN CONTENT                          │
│ D  │  Panel     │              (terminal / page)                     │
│ E  │            │                                                    │
│ B  │  - sess 1  │                                                    │
│ A  │  - sess 2  │                                                    │
│ R  │  - sess 3  │                                                    │
│    │            │                                                    │
│ [P1]│           │                                                    │
│ [P2]│           │                                                    │
│ [+] │           │                                                    │
│ ── │            │                                                    │
│ [⌨] │           │                                                    │
│ [⚙] │           │                                                    │
└────┴────────────┴────────────────────────────────────────────────────┘
```

- **Sidebar (w-16):** Icones dos projetos + botao `+` + Shortcuts + Settings (bottom).
- **Project Sessions Panel (w-56):** Lista de sessoes do projeto selecionado. Aparece ao lado da sidebar quando um projeto esta ativo.
- **Navbar:** Brand (left), Tasks + Security + Status + User (right).

---

## 2. Mudancas na Navbar

**Arquivo:** `apps/web/src/components/app-navbar.tsx`

### O que muda

| Antes | Depois |
|-------|--------|
| Brand + SidebarToggle (left) | Brand + SidebarToggle (left) |
| Status + User (right) | **Tasks** + **Security** + Status + User (right) |

### Detalhes

- Adicionar dois icon-buttons antes do `AppStatusButton`:
  - **Tasks** (`CheckSquare` icon) — `<Link href="/tasks">` com tooltip "Tasks".
  - **Security** (`Shield` icon) — `<Link href="/security">` com tooltip "Security".
- Estilo: mesmo `navButtonBase` da sidebar (h-9 w-9, hover purple).
- Active state: highlight quando pathname match `/tasks` ou `/security`.
- Mobile: esses botoes ficam sempre visiveis na navbar (nao vao para hamburger).

---

## 3. Mudancas na Sidebar

**Arquivo:** `apps/web/src/components/app-sidebar.tsx`

### O que sai

- Link de **Tasks** (CheckSquare)
- Link de **Security** (Shield)
- Link de **Dashboard** (LayoutDashboard) — sera substituido pelo contexto de projetos
- Link de **Sessions** (Terminal) — a pagina de sessions continua existindo via navbar ou rota direta, mas sai da sidebar

### O que fica

- **Shortcuts** (bottom)
- **Settings** (bottom)

### O que entra

- **Icones de projeto**: um botao circular/quadrado por projeto criado. Mostra as 2 primeiras letras do nome do projeto. Ao clicar, seleciona o projeto e abre o Project Sessions Panel ao lado.
- **Botao `+`** (Plus icon): posicionado abaixo dos projetos, acima do separador. Abre o modal de criacao de projeto.

### Comportamento

1. Ao clicar em um projeto na sidebar, ele recebe destaque visual (borda emerald ou bg-emerald-400/20).
2. O Project Sessions Panel expande ao lado (w-56) com a lista de sessoes daquele projeto.
3. Clicar novamente no mesmo projeto colapsa o panel.
4. O projeto selecionado persiste no `localStorage` (`open-commander.selected-project`).

### Estrutura Desktop

```
<aside class="w-16 ...">  <!-- sidebar principal -->
  <div>  <!-- top: project icons -->
    {projects.map(p => <ProjectIcon />)}
    <PlusButton onClick={openCreateProjectModal} />
  </div>
  <div>  <!-- bottom -->
    <ShortcutsButton />
    <SettingsLink />
  </div>
</aside>
```

### Estrutura Mobile

- Hamburger abre drawer com lista de projetos (nome completo) + Shortcuts + Settings.
- Tasks e Security ficam na navbar (nao no drawer).

---

## 4. Project Sessions Panel

**Novo componente:** `apps/web/src/components/project-sessions-panel.tsx`

### O que e

Sidebar secundaria (w-56) que aparece entre a sidebar principal e o main content. Lista as sessoes do projeto selecionado.

### Layout

```
┌─────────────────────┐
│ Project Name    [+]  │  <- header com nome + botao add session
│─────────────────────│
│ ● Session Alpha      │  <- lista de sessoes
│   Session Beta       │
│   Session Gamma      │
│─────────────────────│
│ No sessions yet.     │  <- empty state
│ Create one to start. │
└─────────────────────┘
```

### Comportamento

1. Header mostra o nome do projeto (truncado) e um botao `+` para criar sessao naquele projeto.
2. Cada item da lista mostra: indicador de status (dot colorido), nome da sessao.
3. Clicar em uma sessao navega para `/sessions?sessionId={id}` **ou** carrega o terminal inline no main content (decisao: carregar inline).
4. Botao de contexto (right-click ou `...`): Rename session, Remove session.
5. Transicao: slide-in da esquerda com `transition-all duration-200`.

### Inline Terminal Mode

Quando um projeto tem uma sessao selecionada, o main content area renderiza o `TerminalPane` diretamente (sem ir para `/sessions`). Isso mantem o contexto do projeto enquanto o usuario trabalha.

- A rota permanece `/` ou `/project/{projectId}` (TBD, pode ser query param).
- O componente reutiliza `TerminalPane` existente.

---

## 5. Create Project Modal

**Novo componente:** `apps/web/src/components/projects/create-project-modal.tsx`

### Campos

| Campo | Tipo | Descricao |
|-------|------|-----------|
| Folder | Autocomplete input | Selecao de pasta dentro do workspace |
| Name | Text input | Nome do projeto (pre-preenchido com o nome da pasta selecionada, editavel) |

### Autocomplete de Pastas

1. Query: reutiliza `api.terminal.workspaceOptions` (ja retorna a lista de pastas).
2. Input com texto livre que filtra a lista conforme o usuario digita.
3. Dropdown aparece abaixo do input mostrando opcoes filtradas.
4. Ao selecionar uma pasta, o campo Name e preenchido automaticamente com o nome da pasta.
5. O usuario pode editar o nome livremente apos o auto-fill.
6. Se nao ha match, mostra "No folders found".

### Fluxo

```
[User clica +] → Modal abre
  → User digita/seleciona pasta → Name auto-preenche
  → User ajusta nome se quiser
  → Clica "Create" → Projeto salvo → Modal fecha → Sidebar atualiza
```

### Validacoes

- Pasta obrigatoria.
- Nome obrigatorio (min 1, max 80 chars).
- Nome unico por usuario (soft: warning, nao blocking).
- Pasta pode ser usada por multiplos projetos (allowed).

### UI

- Mesmo padrao de modal existente (rounded-2xl, border-white/10, bg-oc-panel-strong).
- Escape fecha.
- Enter submete.
- Auto-focus no input de folder ao abrir.

---

## 6. Modelo de Dados

**Arquivo:** `apps/web/prisma/schema.prisma`

### Novo Model: Project

```prisma
model Project {
  id        String   @id @default(cuid())
  name      String
  folder    String   // relative path within workspace (e.g., "my-app")
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  sessions  TerminalSession[]

  @@index([userId])
  @@map("projects")
}
```

### Alteracoes em Models Existentes

**User** — adicionar relacao:
```prisma
projects Project[]
```

**TerminalSession** — adicionar FK opcional para Project:
```prisma
projectId String?  @map("project_id")
project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
```

- `projectId` e opcional para manter backward-compat com sessoes criadas pelo fluxo antigo (`/sessions`).
- Index: `@@index([projectId])` adicionado.

---

## 7. API (tRPC Router)

**Novo arquivo:** `apps/web/src/server/api/routers/projects.ts`

### Procedures

| Procedure | Tipo | Input | Descricao |
|-----------|------|-------|-----------|
| `list` | query | — | Lista projetos do usuario autenticado, ordered by name |
| `create` | mutation | `{ name, folder }` | Cria projeto e retorna o record |
| `update` | mutation | `{ id, name }` | Renomeia o projeto |
| `delete` | mutation | `{ id }` | Remove o projeto (sessions ficam orfas com projectId=null) |
| `listSessions` | query | `{ projectId }` | Lista sessoes vinculadas ao projeto |
| `createSession` | mutation | `{ projectId, name }` | Cria sessao ja vinculada ao projeto (workspace suffix = project.folder) |

### Registro

Adicionar ao `apps/web/src/server/api/root.ts`:
```ts
import { projectRouter } from "./routers/projects";
// ...
project: projectRouter,
```

---

## 8. Componentes — Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `components/app-navbar.tsx` | Adicionar Tasks + Security icon links |
| `components/app-sidebar.tsx` | Remover Tasks, Security, Dashboard, Sessions. Adicionar project icons + botao `+` |
| `components/project-sessions-panel.tsx` | **Novo.** Sidebar secundaria com lista de sessoes |
| `components/projects/create-project-modal.tsx` | **Novo.** Modal de criacao de projeto |
| `components/projects/project-icon.tsx` | **Novo.** Avatar/icone do projeto para a sidebar |
| `components/projects/folder-autocomplete.tsx` | **Novo.** Input com autocomplete para pastas |
| `layout/with-sidebar-layout.tsx` | Ajustar para renderizar ProjectSessionsPanel condicionalmente |
| `server/api/routers/projects.ts` | **Novo.** tRPC router de projetos |
| `server/api/root.ts` | Registrar projectRouter |
| `prisma/schema.prisma` | Adicionar model Project + FK em TerminalSession |

---

## 9. Estado Global do Projeto Selecionado

### Opcao: Context Provider

**Novo arquivo:** `apps/web/src/components/projects/project-context.tsx`

```tsx
type ProjectContextValue = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  isPanelOpen: boolean;
};
```

- Persiste `selectedProjectId` e `selectedSessionId` no `localStorage`.
- `isPanelOpen` derivado: `selectedProjectId !== null`.
- Provider wraps o layout (dentro de `AppSidebarProvider` ou no mesmo nivel).

---

## 10. Fluxo de Uso Completo

```
1. Usuario abre o app → sidebar mostra projetos existentes
2. Clica no "+" → modal de criacao abre
3. Digita "my-" no campo folder → autocomplete mostra "my-app", "my-lib"
4. Seleciona "my-app" → campo Name auto-preenche com "my-app"
5. Edita para "My App" → clica Create
6. Sidebar agora mostra icone "MA" (iniciais de "My App")
7. Clica no icone → Project Sessions Panel expande ao lado
8. Panel mostra "No sessions yet"
9. Clica "+" no panel → cria sessao "Session 1" vinculada ao projeto
10. Sessao aparece na lista → clica nela
11. Terminal carrega no main content area
12. Usuario trabalha no terminal com workspace montado em /workspace/my-app
```

---

## 11. O que NAO muda

- **Pagina `/sessions`**: permanece intacta. Sessoes criadas por la continuam funcionando sem projeto.
- **Pagina `/tasks`**: permanece intacta, apenas acessada pela navbar agora.
- **Pagina `/security`**: permanece intacta, apenas acessada pela navbar agora.
- **Pagina `/settings`**: permanece intacta.
- **Pagina `/dashboard`**: permanece acessivel via rota, mas removida da sidebar.
- **Terminal components**: `TerminalPane`, `create-session-modal`, `confirm-remove-session-modal` permanecem intactos.

---

## 12. Migration Path

1. Criar migration Prisma para model `Project` e campo `projectId` em `TerminalSession`.
2. Sessoes existentes permanecem com `projectId = null` (orfas — acessiveis somente via `/sessions`).
3. Nenhuma data migration necessaria.

---

## 13. Ordem de Implementacao

| Step | Task | Deps |
|------|------|------|
| 1 | Prisma schema + migration | — |
| 2 | tRPC router `projects.ts` + registro em `root.ts` | Step 1 |
| 3 | `ProjectProvider` (context) | — |
| 4 | `create-project-modal.tsx` + `folder-autocomplete.tsx` | Step 2 |
| 5 | Atualizar `app-sidebar.tsx` (remover items, adicionar projects + botao +) | Step 3, 4 |
| 6 | Atualizar `app-navbar.tsx` (adicionar Tasks + Security) | — |
| 7 | `project-sessions-panel.tsx` | Step 2, 3 |
| 8 | `project-icon.tsx` | — |
| 9 | Atualizar `with-sidebar-layout.tsx` (panel condicional + inline terminal) | Step 5, 7 |
| 10 | Inline terminal rendering no main content | Step 7, 9 |
| 11 | Mobile adjustments (drawer, responsive) | Step 5, 6, 7 |
| 12 | Testes manuais e2e | All |
