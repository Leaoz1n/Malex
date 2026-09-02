# Sistema Malex — hospedagem no Streamlit Community Cloud

Este repositório contém o Sistema Malex (o mesmo HTML/CSS/JS de sempre,
falando direto com o Supabase) mais uma "casca" em `app.py` que serve
esses arquivos através do Streamlit.

**Nada da lógica do sistema mudou.** Guarda-volumes, Eventos, Dashboard,
Usuários, Login, Configurações continuam exatamente como estavam.
Foram adicionados: aba **Vendas**, seção **Formulário** (produtos) em
Eventos, e filtro **Tipo** (Todos/Guarda-volumes/Vendas) em Relatórios.

## Estrutura do repositório

```
app.py                      -> abre o Streamlit e redireciona para o sistema
requirements.txt            -> dependências Python (só o streamlit)
.streamlit/config.toml      -> liga o "enableStaticServing" do Streamlit
SUPABASE_SETUP.sql          -> SQL para criar as tabelas novas no Supabase
static/                     -> o sistema inteiro (não mexer na estrutura)
  index.html
  login.html
  pages/
    dashboard.html
    eventos.html
    usuarios.html
    cadastros.html
    vendas.html              (novo)
    relatorios.html
    configuracoes.html
    trocar-senha.html
  assets/
    css/style.css
    js/*.js (+ vendas-supabase.js, novo)
    img/logo.jpeg
```

## Passo a passo

### 1. Supabase
Abra seu projeto → **SQL Editor** → cole o conteúdo de `SUPABASE_SETUP.sql`
→ **Run**. Isso cria as tabelas `produtos` e `vendas`.

### 2. GitHub
1. Crie um repositório novo (pode ser privado).
2. Suba **todo** o conteúdo deste pacote na raiz do repositório —
   ou seja, `app.py`, `requirements.txt`, `.streamlit/`,
   `SUPABASE_SETUP.sql` e a pasta `static/` inteira devem ficar na
   raiz do repo (não dentro de uma subpasta).

### 3. Streamlit Community Cloud
1. Acesse https://share.streamlit.io/ e faça login com o GitHub.
2. **New app** → selecione o repositório e a branch.
3. Em **Main file path**, coloque `app.py`.
4. Deploy.

Pronto — o Streamlit vai abrir `app.py`, que redireciona
automaticamente para `static/index.html` (a tela de login do
sistema, igual sempre foi).
