# Sistema Malex — arquitetura híbrida (site + Streamlit)

A partir de agora o sistema roda em **dois lugares**, falando com o
**mesmo Supabase**:

- **`site-fila/`** — o HTML/CSS/JS de sempre. É o que os operadores
  usam na fila: Guarda-volumes e Vendas. Rápido, responde na hora.
- **`app.py`** — Streamlit nativo (Python, um arquivo só, igual ao
  seu sistema de notas). É o que você usa fora da fila: Dashboard,
  Eventos (com Formulário de produtos), Usuários, Relatórios
  (com Fechamento de Caixa e PDF) e Configurações.

Login, Guarda-volumes e Vendas continuam se comportando exatamente
como sempre (etiqueta e recibo abrindo a janela de impressão do
navegador, validação de telefone/CPF, etc.) — só que agora o campo
de documento aceita **CPF ou CNPJ** nos dois formulários.

## O que mudou nesta entrega

1. **CPF/CNPJ**: em Guarda-volumes e Vendas, o campo agora aceita
   CPF (11 dígitos) ou CNPJ (14 dígitos), validando o dígito
   verificador correto para cada um.
2. **Fechamento de Caixa por Pessoa**: dentro de Relatórios
   (`app.py`), dá pra ver quanto cada operador registrou/vendeu no
   período filtrado, com total em R$. Exporta em CSV.
3. **Relatório em PDF**: além do CSV, um botão "Baixar PDF" com
   tabela e totais, pronto pra mandar pro organizador do evento.
4. Sem trava de mala no banco (decidimos manter como está, já que
   o controle real é pela pulseira física).

## Passo a passo

### 1. Supabase
No SQL Editor, rode **`SUPABASE_SETUP.sql`** (é só um arquivo agora,
substitui os dois anteriores). Ele cria `produtos`, `vendas`,
`config_impressora` e corrige a permissão que estava dando o erro
"permission denied for table produtos". Pode rodar de novo sem medo,
ele não duplica nada.

Se quiser dar uma faxina no banco depois, tem uma consulta comentada
no fim do arquivo que só **lista** tabelas/colunas (não apaga nada) -
me manda o resultado que eu te digo o que dá pra remover com
segurança.

### 2. `site-fila/` → hospedar separado (não precisa mais ser no Streamlit)
Como esse pedaço é 100% estático, a forma mais simples e estável é o
**GitHub Pages** (gratuito, direto do mesmo repositório):
1. Suba a pasta `site-fila/` pra um repositório no GitHub (o conteúdo
   dela na raiz do repo, ou numa branch própria).
2. No repositório: **Settings → Pages → Deploy from a branch** →
   escolha a branch e a pasta (`/root` se `site-fila` for a raiz).
3. Em alguns minutos o GitHub te dá uma URL tipo
   `https://seuusuario.github.io/repo/`. Esse é o link que os
   operadores usam na fila (e o que você adiciona à tela inicial do
   celular pra abrir em tela cheia).

### 3. `app.py` → Streamlit Community Cloud
1. Suba `app.py` e `requirements.txt` na raiz de **outro** repositório
   (ou outra pasta/branch do mesmo).
2. Abra `app.py` e troque `SUPABASE_URL = "https://SEU-PROJETO.supabase.co"`
   pela URL real do seu projeto (Project Settings → API → Project URL).
3. share.streamlit.io → login com GitHub → **New app** → escolha o
   repositório → Main file path: `app.py`.
4. Em **Advanced settings → Secrets**, cole:
   ```toml
   SUPABASE_KEY = "sua-chave-anon-do-supabase"
   ```
5. Deploy.

## Por que separar assim
Streamlit não roda no navegador do operador — cada clique vai pro
servidor e volta, o que numa fila de verdade fica perceptivelmente
mais lento que o site atual (que responde localmente e só grava no
Supabase por trás). Por isso a fila continua no site rápido de
sempre, e o Streamlit fica só pra quem administra, sem pressa de
fila.
