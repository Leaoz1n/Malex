"""
Sistema Malex - entrada para hospedagem no Streamlit Community Cloud.

Este app NÃO reescreve o sistema em Streamlit. O sistema continua sendo
o mesmo HTML/CSS/JS estático de sempre (pasta static/), falando direto
com o Supabase. O Streamlit aqui funciona só como "porta de entrada":
ele serve a pasta static/ como arquivos estáticos e redireciona o
navegador para static/index.html assim que a página abre.

Por isso o app.py é enxuto - ele não precisa saber nada sobre eventos,
cadastros, vendas etc. Toda a lógica continua 100% nos arquivos
dentro de static/.
"""

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="Sistema Malex", page_icon="📦", layout="centered")

# Caminho servido pelo Streamlit quando existe uma pasta "static" ao lado
# deste arquivo e "enableStaticServing" está ligado em .streamlit/config.toml
CAMINHO_SISTEMA = "app/static/index.html"

components.html(
    f"""
    <script>
      const destino = window.top.location.origin + "/{CAMINHO_SISTEMA}";
      window.top.location.href = destino;
    </script>
    <p style="font-family: Arial, sans-serif; color: #444;">
      Abrindo o Sistema Malex...
    </p>
    """,
    height=60,
)

st.markdown(f"Se não abrir automaticamente, [clique aqui]({CAMINHO_SISTEMA}).")
