let dadosRelatorioAtual = [];

function moedaRelatorio(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function iniciarTelaRelatorios() {
  setLayoutInfo();
  await carregarEventosRelatorio();
  await carregarPagamentosRelatorio();

  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = document.getElementById("dataInicioRelatorio");
  const fim = document.getElementById("dataFimRelatorio");

  if (inicio && !inicio.value) inicio.value = hoje;
  if (fim && !fim.value) fim.value = hoje;
}

function ajustarCamposPorTipoRelatorio() {
  const tipoSelect = document.getElementById("tipoRelatorio");
  const tipo = tipoSelect ? tipoSelect.value : "todos";

  const blocoStatus = document.getElementById("blocoStatusRelatorio");
  if (blocoStatus) blocoStatus.style.display = tipo === "vendas" ? "none" : "block";

  document.querySelectorAll(".campo-gv").forEach(label => {
    label.style.display = tipo === "vendas" ? "none" : "flex";
  });

  document.querySelectorAll(".campo-vendas").forEach(label => {
    label.style.display = tipo === "guarda_volumes" ? "none" : "flex";
  });
}

async function carregarEventosRelatorio() {
  const select = document.getElementById("relatorioEvento");
  if (!select) return;

  const user = getUserLogado();
  let eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  if (navigator.onLine) {
    const { data, error } = await supabaseClient
      .from("eventos")
      .select("*")
      .order("nome", { ascending: true });

    if (!error && data) {
      eventos = data.map(evt => ({
        id: evt.id,
        nome: evt.nome,
        ativo: evt.ativo,
        status: evt.status,
        valor: evt.valor_volume,
        pagamentos: (evt.formas_pagamento || [evt.forma_pagamento_padrao]).filter(Boolean),
        formaPagamentoPadrao: evt.forma_pagamento_padrao
      }));

      localStorage.setItem("eventos", JSON.stringify(eventos));
    }
  }

  if (user && user.cargo !== "Master") {
    eventos = eventos.filter(e => String(e.id) === String(user.eventoId));
  }

  select.innerHTML = `<option value="">Selecione um evento</option>`;

  eventos.forEach(evt => {
    select.innerHTML += `<option value="${evt.id}">${evt.nome}</option>`;
  });

  if (user && user.cargo !== "Master" && user.eventoId) {
    select.value = user.eventoId;
    select.disabled = true;
  }

  select.addEventListener("change", carregarPagamentosRelatorio);
}

async function carregarPagamentosRelatorio() {
  const selectEvento = document.getElementById("relatorioEvento");
  const selectPagamento = document.getElementById("pagamentoRelatorio");
  if (!selectPagamento) return;

  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(selectEvento?.value));

  let pagamentos = [];

  if (evento && evento.pagamentos) {
    pagamentos = evento.pagamentos;
  } else {
    const formas = JSON.parse(localStorage.getItem("formasPagamentoMaster")) || [];
    pagamentos = formas.map(f => f.nome);
  }

  pagamentos = pagamentos.filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));

  selectPagamento.innerHTML = `<option value="">Todos</option>`;
  pagamentos.forEach(p => {
    selectPagamento.innerHTML += `<option value="${p}">${p}</option>`;
  });
}

function camposSelecionadosRelatorio() {
  return Array.from(document.querySelectorAll(".campoRelatorio:checked")).map(c => c.value);
}

function nomeCampo(campo) {
  const nomes = {
    tipo: "Tipo",
    created_at: "Data",
    nome: "Nome",
    telefone: "Telefone",
    cpf: "CPF/CNPJ",
    email: "E-mail",
    quantidade_volumes: "Volumes/Qtd",
    numeros_malas: "Malas",
    produto: "Produto",
    forma_pagamento: "Pagamento",
    valor_total: "Valor",
    retirado: "Status retirada",
    data_retirada: "Data de retirada",
    observacoes: "Observações"
  };

  return nomes[campo] || campo;
}

function formatarValorCampo(campo, valor) {
  if (campo === "created_at" || campo === "data_retirada") {
    return valor ? new Date(valor).toLocaleString("pt-BR") : "";
  }

  if (campo === "valor_total") return moedaRelatorio(valor);
  if (campo === "retirado") {
    if (valor === null || valor === undefined) return "-";
    return valor ? "Retirado" : "Pendente";
  }
  if (Array.isArray(valor)) return valor.join(", ");

  return valor ?? "";
}

async function buscarDadosGuardaVolumes(eventoId, dataInicio, dataFim, pagamento, status) {
  if (navigator.onLine) {
    let query = supabaseClient
      .from("cadastros")
      .select("*")
      .eq("evento_id", Number(eventoId))
      .order("created_at", { ascending: true });

    if (dataInicio) query = query.gte("created_at", dataInicio + "T00:00:00");
    if (dataFim) query = query.lte("created_at", dataFim + "T23:59:59");
    if (pagamento) query = query.eq("forma_pagamento", pagamento);
    if (status === "retirado") query = query.eq("retirado", true);
    if (status === "pendente") query = query.eq("retirado", false);

    const { data, error } = await query;

    if (error) {
      alert("Erro ao gerar relatório de guarda-volumes: " + error.message);
      console.error(error);
      return [];
    }

    return (data || []).map(r => ({ ...r, tipo: "Guarda-volumes", produto: "" }));
  }

  let registros = JSON.parse(localStorage.getItem("operacoes")) || [];
  registros = registros.filter(r => String(r.eventoId || r.evento_id) === String(eventoId));
  if (dataInicio) registros = registros.filter(r => String(r.createdAt || r.created_at || "").slice(0, 10) >= dataInicio);
  if (dataFim) registros = registros.filter(r => String(r.createdAt || r.created_at || "").slice(0, 10) <= dataFim);
  if (pagamento) registros = registros.filter(r => String(r.formaPagamento || r.forma_pagamento) === String(pagamento));
  if (status === "retirado") registros = registros.filter(r => r.retirado === true);
  if (status === "pendente") registros = registros.filter(r => r.retirado !== true);

  return registros.map(r => ({
    tipo: "Guarda-volumes",
    created_at: r.createdAt || r.created_at,
    nome: r.nome,
    telefone: r.telefone,
    cpf: r.cpf,
    email: r.email,
    quantidade_volumes: r.quantidadeVolumes || r.quantidade_volumes,
    numeros_malas: r.numerosMalas || r.numeros_malas,
    produto: "",
    forma_pagamento: r.formaPagamento || r.forma_pagamento,
    valor_total: r.valorTotal || r.valor_total,
    retirado: r.retirado,
    data_retirada: r.dataRetirada || r.data_retirada,
    observacoes: r.observacoes
  }));
}

async function buscarDadosVendas(eventoId, dataInicio, dataFim, pagamento) {
  if (navigator.onLine) {
    let query = supabaseClient
      .from("vendas")
      .select("*")
      .eq("evento_id", Number(eventoId))
      .order("created_at", { ascending: true });

    if (dataInicio) query = query.gte("created_at", dataInicio + "T00:00:00");
    if (dataFim) query = query.lte("created_at", dataFim + "T23:59:59");
    if (pagamento) query = query.eq("forma_pagamento", pagamento);

    const { data, error } = await query;

    if (error) {
      alert("Erro ao gerar relatório de vendas: " + error.message);
      console.error(error);
      return [];
    }

    return (data || []).map(v => ({
      tipo: "Venda",
      created_at: v.created_at,
      nome: v.nome,
      telefone: v.telefone,
      cpf: v.cpf,
      email: v.email,
      quantidade_volumes: v.quantidade,
      numeros_malas: "",
      produto: v.produto_nome,
      forma_pagamento: v.forma_pagamento,
      valor_total: v.valor_total,
      retirado: null,
      data_retirada: "",
      observacoes: v.observacoes
    }));
  }

  let registros = JSON.parse(localStorage.getItem("vendas")) || [];
  registros = registros.filter(r => String(r.eventoId || r.evento_id) === String(eventoId));
  if (dataInicio) registros = registros.filter(r => String(r.createdAt || r.created_at || "").slice(0, 10) >= dataInicio);
  if (dataFim) registros = registros.filter(r => String(r.createdAt || r.created_at || "").slice(0, 10) <= dataFim);
  if (pagamento) registros = registros.filter(r => String(r.formaPagamento || r.forma_pagamento) === String(pagamento));

  return registros.map(r => ({
    tipo: "Venda",
    created_at: r.createdAt || r.created_at,
    nome: r.nome,
    telefone: r.telefone,
    cpf: r.cpf,
    email: r.email,
    quantidade_volumes: r.quantidade,
    numeros_malas: "",
    produto: r.produtoNome || r.produto_nome,
    forma_pagamento: r.formaPagamento || r.forma_pagamento,
    valor_total: r.valorTotal || r.valor_total,
    retirado: null,
    data_retirada: "",
    observacoes: r.observacoes
  }));
}

async function buscarDadosRelatorio() {
  const eventoId = document.getElementById("relatorioEvento").value;
  const dataInicio = document.getElementById("dataInicioRelatorio").value;
  const dataFim = document.getElementById("dataFimRelatorio").value;
  const pagamento = document.getElementById("pagamentoRelatorio").value;
  const status = document.getElementById("statusRelatorio").value;
  const tipoSelect = document.getElementById("tipoRelatorio");
  const tipo = tipoSelect ? tipoSelect.value : "todos";

  if (!eventoId) {
    alert("Selecione um evento.");
    return [];
  }

  let registros = [];

  if (tipo === "guarda_volumes" || tipo === "todos") {
    registros = registros.concat(await buscarDadosGuardaVolumes(eventoId, dataInicio, dataFim, pagamento, status));
  }

  if (tipo === "vendas" || tipo === "todos") {
    registros = registros.concat(await buscarDadosVendas(eventoId, dataInicio, dataFim, pagamento));
  }

  registros.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  return registros;
}

async function gerarPreviaRelatorio() {
  const campos = camposSelecionadosRelatorio();
  if (campos.length === 0) {
    alert("Selecione pelo menos um campo para o relatório.");
    return;
  }

  const registros = await buscarDadosRelatorio();
  dadosRelatorioAtual = registros;

  const resumo = document.getElementById("resumoRelatorio");
  const previa = document.getElementById("previaRelatorio");

  const totalCadastros = registros.length;
  const totalVolumes = registros.reduce((s, r) => s + Number(r.quantidade_volumes || 0), 0);
  const totalValor = registros.reduce((s, r) => s + Number(r.valor_total || 0), 0);

  const porPagamento = {};
  registros.forEach(r => {
    const p = r.forma_pagamento || "Não informado";
    porPagamento[p] = (porPagamento[p] || 0) + Number(r.valor_total || 0);
  });

  const totalGuardaVolumes = registros.filter(r => r.tipo === "Guarda-volumes").length;
  const totalVendas = registros.filter(r => r.tipo === "Venda").length;
  const valorGuardaVolumes = registros.filter(r => r.tipo === "Guarda-volumes").reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const valorVendas = registros.filter(r => r.tipo === "Venda").reduce((s, r) => s + Number(r.valor_total || 0), 0);

  resumo.innerHTML = `
    <p><strong>Registros:</strong> ${totalCadastros}</p>
    <p><strong>Guarda-volumes:</strong> ${totalGuardaVolumes} (${moedaRelatorio(valorGuardaVolumes)})</p>
    <p><strong>Vendas:</strong> ${totalVendas} (${moedaRelatorio(valorVendas)})</p>
    <p><strong>Volumes/Qtd somados:</strong> ${totalVolumes}</p>
    <p><strong>Total geral:</strong> ${moedaRelatorio(totalValor)}</p>
    <p><strong>Por pagamento:</strong></p>
    <ul>${Object.keys(porPagamento).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(p => `<li>${p}: ${moedaRelatorio(porPagamento[p])}</li>`).join("")}</ul>
  `;

  if (registros.length === 0) {
    previa.innerHTML = "Nenhum registro encontrado para os filtros selecionados.";
    return;
  }

  const linhas = registros.slice(0, 100).map(r => `
    <tr>${campos.map(c => `<td>${formatarValorCampo(c, r[c])}</td>`).join("")}</tr>
  `).join("");

  previa.innerHTML = `
    <div class="tabela-container">
      <table class="tabela-cadastros">
        <thead><tr>${campos.map(c => `<th>${nomeCampo(c)}</th>`).join("")}</tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    ${registros.length > 100 ? `<p>Mostrando os primeiros 100 registros de ${registros.length}. Exporte para ver tudo.</p>` : ""}
  `;
}

async function exportarRelatorioFiltrado() {
  const campos = camposSelecionadosRelatorio();
  if (campos.length === 0) {
    alert("Selecione pelo menos um campo para exportar.");
    return;
  }

  const registros = dadosRelatorioAtual.length ? dadosRelatorioAtual : await buscarDadosRelatorio();
  if (registros.length === 0) {
    alert("Nenhum registro para exportar.");
    return;
  }

  const selectEvento = document.getElementById("relatorioEvento");
  const eventoNome = selectEvento.options[selectEvento.selectedIndex]?.text || "Evento";

  let csv = campos.map(nomeCampo).join(";") + "\n";

  registros.forEach(r => {
    csv += campos.map(c => {
      const valor = formatarValorCampo(c, r[c]);
      return `"${String(valor).replaceAll('"', '""')}"`;
    }).join(";") + "\n";
  });

  const total = registros.reduce((s, r) => s + Number(r.valor_total || 0), 0);
  csv += "\n";
  csv += `${";".repeat(Math.max(campos.length - 2, 0))}"TOTAL GERAL";"${moedaRelatorio(total)}"\n`;

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);

  const dataInicio = document.getElementById("dataInicioRelatorio").value || "inicio";
  const dataFim = document.getElementById("dataFimRelatorio").value || "fim";

  a.download = `Relatorio_${eventoNome}_${dataInicio}_a_${dataFim}.csv`;
  a.click();
}
