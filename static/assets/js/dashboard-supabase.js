const CORES_DASHBOARD = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#eab308",
  "#db2777",
  "#22c55e",
  "#0f172a"
];

function moedaDashboard(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function iniciarDashboard() {
  setLayoutInfo();
  await carregarFiltroEventoDashboardSupabase();
  await carregarDashboardSupabase();
}

async function carregarFiltroEventoDashboardSupabase() {
  const div = document.getElementById("filtroEventoDashboard");
  const user = getUserLogado();

  if (!div) return;

  if (user.cargo !== "Master") {
    div.innerHTML = `<strong>Evento:</strong> ${user.eventoNome}`;
    return;
  }

  const { data, error } = await supabaseClient
    .from("eventos")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) {
    div.innerHTML = "Erro ao carregar eventos.";
    console.error(error);
    return;
  }

  const filtroSalvo = localStorage.getItem("filtroEventoDashboard") || "";

  div.innerHTML = `
    <label><strong>Selecionar Evento</strong></label>
    <select id="eventoDashboard" onchange="salvarFiltroDashboardSupabase(); carregarDashboardSupabase();">
      <option value="">Selecione um evento</option>
      ${(data || []).map(e => `<option value="${e.id}">${e.nome}</option>`).join("")}
    </select>
  `;

  document.getElementById("eventoDashboard").value = filtroSalvo;
}

function salvarFiltroDashboardSupabase() {
  const select = document.getElementById("eventoDashboard");
  if (select) {
    localStorage.setItem("filtroEventoDashboard", select.value);
  }
}

async function carregarDashboardSupabase() {
  const user = getUserLogado();
  let eventoId = "";

  if (user.cargo === "Master") {
    eventoId = localStorage.getItem("filtroEventoDashboard") || "";
  } else {
    eventoId = user.eventoId;
  }

  if (!eventoId) {
    limparGraficosDashboard("Selecione um evento");
    return;
  }

  let query = supabaseClient
    .from("cadastros")
    .select("*")
    .eq("evento_id", Number(eventoId));

  const { data, error } = await query;

  if (error) {
    alert("Erro ao carregar dashboard: " + error.message);
    console.error(error);
    return;
  }

  const { data: usuariosData } = await supabaseClient
    .from("usuarios")
    .select("id, nome");

  const usuarios = usuariosData || [];
  const cadastros = data || [];

  const cadastrosDia = {};
  const volumesDia = {};
  const valorDia = {};
  const pagamentos = {
    "PIX": 0,
    "Cartão": 0,
    "Dinheiro": 0
  };

  const usuariosDia = {};

  cadastros.forEach(c => {
    const dia = c.created_at
      ? new Date(c.created_at).toLocaleDateString("pt-BR")
      : "Sem data";

    cadastrosDia[dia] = (cadastrosDia[dia] || 0) + 1;
    volumesDia[dia] = (volumesDia[dia] || 0) + Number(c.quantidade_volumes || 0);
    valorDia[dia] = (valorDia[dia] || 0) + Number(c.valor_total || 0);

    const forma = c.forma_pagamento || "Não informado";
    pagamentos[forma] = (pagamentos[forma] || 0) + Number(c.valor_total || 0);

    const usuario = usuarios.find(u => String(u.id) === String(c.usuario_id));
    const nomeUsuario = usuario ? usuario.nome : "Master";

    const chaveFuncionarioDia = `${nomeUsuario} - ${dia}`;
    usuariosDia[chaveFuncionarioDia] = (usuariosDia[chaveFuncionarioDia] || 0) + 1;
  });

  desenharGraficoPizzaColorido("graficoCadastrosDia", cadastrosDia, "legendaCadastrosDia", false);
  desenharGraficoPizzaColorido("graficoVolumesDia", volumesDia, "legendaVolumesDia", false);
  desenharGraficoPizzaColorido("graficoValorDia", valorDia, "legendaValorDia", true);
  desenharGraficoPizzaColorido("graficoPagamento", pagamentos, "legendaPagamento", true);
  desenharGraficoPizzaColorido("graficoUsuariosDia", usuariosDia, "legendaUsuariosDia", false);
}

function limparGraficosDashboard(texto) {
  const ids = [
    "graficoCadastrosDia",
    "graficoVolumesDia",
    "graficoValorDia",
    "graficoPagamento",
    "graficoUsuariosDia"
  ];

  const legendas = [
    "legendaCadastrosDia",
    "legendaVolumesDia",
    "legendaValorDia",
    "legendaPagamento",
    "legendaUsuariosDia"
  ];

  ids.forEach((id, index) => {
    const canvas = document.getElementById(id);
    const legenda = document.getElementById(legendas[index]);

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 95, 0, 2 * Math.PI);
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(texto, canvas.width / 2, canvas.height / 2);

    if (legenda) legenda.innerHTML = "";
  });
}

function desenharGraficoPizzaColorido(canvasId, dados, legendaId, dinheiro = false) {
  const canvas = document.getElementById(canvasId);
  const legenda = document.getElementById(legendaId);

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = Object.keys(dados);
  const valores = Object.values(dados).map(v => Number(v || 0));
  const total = valores.reduce((a, b) => a + b, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (legenda) legenda.innerHTML = "";

  if (total === 0 || labels.length === 0) {
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 95, 0, 2 * Math.PI);
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.font = "15px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sem dados", canvas.width / 2, canvas.height / 2);
    return;
  }

  let inicio = 0;
  const centroX = canvas.width / 2;
  const centroY = canvas.height / 2;
  const raio = Math.min(canvas.width, canvas.height) / 2 - 35;

  valores.forEach((valor, index) => {
    const fatia = (valor / total) * 2 * Math.PI;

    ctx.beginPath();
    ctx.moveTo(centroX, centroY);
    ctx.arc(centroX, centroY, raio, inicio, inicio + fatia);
    ctx.closePath();
    ctx.fillStyle = CORES_DASHBOARD[index % CORES_DASHBOARD.length];
    ctx.fill();

    inicio += fatia;
  });

  if (legenda) {
    labels.forEach((label, index) => {
      const valor = dinheiro ? moedaDashboard(dados[label]) : dados[label];

      legenda.innerHTML += `
        <p class="legenda-item">
          <span style="background:${CORES_DASHBOARD[index % CORES_DASHBOARD.length]}"></span>
          ${label}: ${valor}
        </p>
      `;
    });
  }
}