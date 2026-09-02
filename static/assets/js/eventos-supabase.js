let topoEventoBase64 = "";
let formasPagamentoMaster = [];
let eventosCache = [];
let produtosEventoCache = [];

async function iniciarTelaEventos() {
  prepararUploadTopoEvento();
  await carregarFormasPagamentoMaster();
  await listarEventos();
}

function prepararUploadTopoEvento() {
  const inputTopo = document.getElementById("topoEvento");
  const preview = document.getElementById("previewTopoEvento");

  if (!inputTopo) return;

  inputTopo.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      topoEventoBase64 = e.target.result;

      if (preview) {
        preview.src = topoEventoBase64;
        preview.style.display = "block";
      }
    };

    reader.readAsDataURL(file);
  });
}

async function carregarFormasPagamentoMaster() {
  const { data, error } = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    alert("Erro ao carregar formas de pagamento: " + error.message);
    console.error(error);
    formasPagamentoMaster = [];
    return;
  }

  formasPagamentoMaster = data || [];
  localStorage.setItem("formasPagamentoMaster", JSON.stringify(formasPagamentoMaster));
  renderizarFormasPagamentoMaster();
  renderizarCheckboxesEvento();
}

function renderizarFormasPagamentoMaster() {
  const box = document.getElementById("listaFormasPagamentoMaster");
  if (!box) return;

  const formasOrdenadas = [...formasPagamentoMaster].sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
  );

  if (formasOrdenadas.length === 0) {
    box.innerHTML = `<p>Nenhuma forma de pagamento cadastrada.</p>`;
    return;
  }

  box.innerHTML = `
    <div class="box-pagamentos-master" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;">
      <select id="selectFormaPagamentoMaster" style="max-width:320px;">
        ${formasOrdenadas.map(f => `<option value="${f.id}">${f.nome}</option>`).join("")}
      </select>

      <button type="button" onclick="desativarFormaPagamentoSelecionada()" style="width:auto;background:#b42318;">
        Remover selecionada
      </button>
    </div>
  `;
}

function renderizarCheckboxesEvento(selecionadas = []) {
  const box = document.getElementById("formasPagamentoEvento");
  if (!box) return;

  const formasOrdenadas = [...formasPagamentoMaster].sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
  );

  if (formasOrdenadas.length === 0) {
    box.innerHTML = `<p>Crie pelo menos uma forma de pagamento acima.</p>`;
    return;
  }

  box.innerHTML = `
    <div style="
      max-width:520px;
      max-height:180px;
      overflow:auto;
      border:1px solid #ddd;
      border-radius:12px;
      padding:12px;
      background:#fff;
      margin-top:8px;
    ">
      ${formasOrdenadas.map(f => {
        const checked = selecionadas.includes(f.nome) ? "checked" : "";
        return `
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <input type="checkbox" name="pagamentoEvento" value="${f.nome}" ${checked} style="width:auto;">
            ${f.nome}
          </label>
        `;
      }).join("")}
    </div>
  `;
}

async function criarFormaPagamento() {
  const input = document.getElementById("novaFormaPagamento");
  const nome = input.value.trim();

  if (!nome) {
    alert("Digite o nome da forma de pagamento.");
    return;
  }

  const { error } = await supabaseClient
    .from("formas_pagamento")
    .upsert([{ nome, ativo: true }], { onConflict: "nome" });

  if (error) {
    alert("Erro ao criar forma de pagamento: " + error.message);
    console.error(error);
    return;
  }

  input.value = "";
  await carregarFormasPagamentoMaster();
  alert("Forma de pagamento salva.");
}

async function desativarFormaPagamento(id) {
  if (!confirm("Remover esta forma da lista? Eventos já criados não serão apagados.")) return;

  const { error } = await supabaseClient
    .from("formas_pagamento")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    alert("Erro ao remover forma de pagamento: " + error.message);
    console.error(error);
    return;
  }

  await carregarFormasPagamentoMaster();
}

function desativarFormaPagamentoSelecionada() {
  const select = document.getElementById("selectFormaPagamentoMaster");

  if (!select || !select.value) {
    alert("Selecione uma forma de pagamento para remover.");
    return;
  }

  desativarFormaPagamento(select.value);
}

function pagamentosSelecionadosEvento() {
  const checks = document.querySelectorAll("input[name='pagamentoEvento']:checked");
  return Array.from(checks).map(c => c.value);
}

async function salvarEvento() {
  const id = document.getElementById("eventoEditandoId").value;
  const nome = document.getElementById("nomeEvento").value.trim();
  const valor = Number(document.getElementById("valorVolume").value);
  const pagamentos = pagamentosSelecionadosEvento();

  const configCPF = document.getElementById("configCPF").value;
  const configEmail = document.getElementById("configEmail").value;
  const permitirImpressao = document.getElementById("permitirImpressao").checked;

  if (!nome) {
    alert("Preencha o nome do evento.");
    return;
  }

  if (!valor || valor <= 0) {
    alert("Preencha o valor por volume.");
    return;
  }

  if (pagamentos.length === 0) {
    alert("Selecione pelo menos uma forma de pagamento.");
    return;
  }

  const dadosEvento = {
    nome: nome,
    status: "ativo",
    ativo: true,
    valor_volume: valor,
    forma_pagamento_padrao: pagamentos[0],
    formas_pagamento: pagamentos,
    mostrar_cpf: configCPF !== "nao_exibir",
    cpf_obrigatorio: configCPF === "obrigatorio",
    mostrar_email: configEmail !== "nao_exibir",
    email_obrigatorio: configEmail === "obrigatorio",
    permitir_impressao: permitirImpressao
  };

  if (topoEventoBase64) {
    dadosEvento.topo_evento = topoEventoBase64;
  }

  let error;
  let novoId = null;

  if (id) {
    ({ error } = await supabaseClient
      .from("eventos")
      .update(dadosEvento)
      .eq("id", id));
  } else {
    dadosEvento.topo_evento = topoEventoBase64 || null;
    let data;
    ({ data, error } = await supabaseClient
      .from("eventos")
      .insert([dadosEvento])
      .select());
    if (data && data[0]) novoId = data[0].id;
  }

  if (error) {
    alert("Erro ao salvar evento: " + error.message);
    console.error(error);
    return;
  }

  alert(id ? "Evento atualizado." : "Evento criado com sucesso no Supabase!");

  await listarEventos();

  if (novoId) {
    // Mantém o evento recém-criado aberto para já poder cadastrar os produtos do Formulário.
    editarEvento(novoId);
  } else {
    limparFormularioEvento();
  }
}

function criarEvento() {
  salvarEvento();
}

function limparFormularioEvento() {
  const eventoEditandoId = document.getElementById("eventoEditandoId");
  const tituloFormularioEvento = document.getElementById("tituloFormularioEvento");
  const btnSalvarEvento = document.getElementById("btnSalvarEvento");
  const nomeEvento = document.getElementById("nomeEvento");
  const valorVolume = document.getElementById("valorVolume");
  const configCPF = document.getElementById("configCPF");
  const configEmail = document.getElementById("configEmail");
  const permitirImpressao = document.getElementById("permitirImpressao");
  const topoEvento = document.getElementById("topoEvento");
  const previewTopo = document.getElementById("previewTopoEvento");

  if (eventoEditandoId) eventoEditandoId.value = "";
  if (tituloFormularioEvento) tituloFormularioEvento.innerText = "Novo Evento";
  if (btnSalvarEvento) btnSalvarEvento.innerText = "Salvar Evento";
  if (nomeEvento) nomeEvento.value = "";
  if (valorVolume) valorVolume.value = "";
  if (configCPF) configCPF.value = "nao_exibir";
  if (configEmail) configEmail.value = "nao_exibir";
  if (permitirImpressao) permitirImpressao.checked = true;
  if (topoEvento) topoEvento.value = "";
  if (previewTopo) {
    previewTopo.src = "";
    previewTopo.style.display = "none";
  }

  topoEventoBase64 = "";
  renderizarCheckboxesEvento([]);
  carregarProdutosEvento(null);
}

async function listarEventos() {
  const lista = document.getElementById("listaEventos");
  if (!lista) return;

  lista.innerHTML = `<div class="card">Carregando eventos...</div>`;

  const { data, error } = await supabaseClient
    .from("eventos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    lista.innerHTML = `<div class="card">Erro ao carregar eventos.</div>`;
    console.error(error);
    return;
  }

  eventosCache = data || [];

  const eventosFormatados = eventosCache.map(evt => ({
    id: evt.id,
    nome: evt.nome,
    status: evt.status,
    ativo: evt.ativo,
    valor: evt.valor_volume,
    pagamentos: evt.formas_pagamento || [evt.forma_pagamento_padrao],
    formaPagamentoPadrao: evt.forma_pagamento_padrao,
    mostrarCPF: evt.mostrar_cpf,
    cpfObrigatorio: evt.cpf_obrigatorio,
    mostrarEmail: evt.mostrar_email,
    emailObrigatorio: evt.email_obrigatorio,
    permitirImpressao: evt.permitir_impressao,
    topoEvento: evt.topo_evento || ""
  }));

  localStorage.setItem("eventos", JSON.stringify(eventosFormatados));

  lista.innerHTML = "";

  if (eventosFormatados.length === 0) {
    lista.innerHTML = `<div class="card">Nenhum evento cadastrado.</div>`;
    return;
  }

  eventosFormatados.forEach(evt => {
    lista.innerHTML += `
      <div class="card">
        ${evt.topoEvento ? `<img src="${evt.topoEvento}" style="width:100%;max-height:140px;object-fit:contain;margin-bottom:12px;border-radius:12px;">` : ""}
        <h3>${evt.nome}</h3>
        <p>Status: ${evt.status}</p>
        <p>Valor por volume: ${formatarMoeda(evt.valor)}</p>
        <p>Pagamentos: ${(evt.pagamentos || []).join(", ")}</p>
        <p>CPF: ${evt.mostrarCPF ? (evt.cpfObrigatorio ? "Obrigatório" : "Opcional") : "Não exibir"}</p>
        <p>E-mail: ${evt.mostrarEmail ? (evt.emailObrigatorio ? "Obrigatório" : "Opcional") : "Não exibir"}</p>
        <p>Impressão de etiqueta: ${evt.permitirImpressao ? "Ativada" : "Desativada"}</p>

        <button onclick="editarEvento('${evt.id}')">Configurar evento</button>
        <button onclick="encerrarEvento('${evt.id}')">Encerrar</button>
        <button onclick="apagarEvento('${evt.id}')">Apagar</button>
      </div>
    `;
  });
}

function editarEvento(id) {
  const evt = eventosCache.find(e => String(e.id) === String(id));

  if (!evt) {
    alert("Evento não encontrado.");
    return;
  }

  document.getElementById("eventoEditandoId").value = evt.id;
  document.getElementById("tituloFormularioEvento").innerText = "Configurar Evento";
  document.getElementById("btnSalvarEvento").innerText = "Salvar Alterações";
  document.getElementById("nomeEvento").value = evt.nome || "";
  document.getElementById("valorVolume").value = evt.valor_volume || "";

  const pagamentos = evt.formas_pagamento || (evt.forma_pagamento_padrao ? [evt.forma_pagamento_padrao] : []);
  renderizarCheckboxesEvento(pagamentos);

  if (!evt.mostrar_cpf) {
    document.getElementById("configCPF").value = "nao_exibir";
  } else if (evt.cpf_obrigatorio) {
    document.getElementById("configCPF").value = "obrigatorio";
  } else {
    document.getElementById("configCPF").value = "opcional";
  }

  if (!evt.mostrar_email) {
    document.getElementById("configEmail").value = "nao_exibir";
  } else if (evt.email_obrigatorio) {
    document.getElementById("configEmail").value = "obrigatorio";
  } else {
    document.getElementById("configEmail").value = "opcional";
  }

  document.getElementById("permitirImpressao").checked = evt.permitir_impressao !== false;

  topoEventoBase64 = "";
  const previewTopo = document.getElementById("previewTopoEvento");
  const topoInput = document.getElementById("topoEvento");
  if (topoInput) topoInput.value = "";

  if (evt.topo_evento && previewTopo) {
    previewTopo.src = evt.topo_evento;
    previewTopo.style.display = "block";
  } else if (previewTopo) {
    previewTopo.src = "";
    previewTopo.style.display = "none";
  }

  carregarProdutosEvento(evt.id);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function encerrarEvento(id) {
  if (!confirm("Deseja encerrar este evento?")) return;

  const { error } = await supabaseClient
    .from("eventos")
    .update({
      status: "encerrado",
      ativo: false
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao encerrar evento: " + error.message);
    console.error(error);
    return;
  }

  alert("Evento encerrado.");
  listarEventos();
}

async function apagarEvento(id) {
  if (!confirm("Deseja apagar este evento? Essa ação não pode ser desfeita.")) return;

  const { error } = await supabaseClient
    .from("eventos")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao apagar evento: " + error.message);
    console.error(error);
    return;
  }

  alert("Evento apagado.");
  listarEventos();
}

/* ============================================================
   FORMULÁRIO DE PRODUTOS DO EVENTO (usado na tela Vendas)
   ============================================================ */

async function carregarProdutosEvento(eventoId) {
  const lista = document.getElementById("listaProdutosEvento");
  const aviso = document.getElementById("avisoFormularioProdutos");
  const btnAdicionar = document.getElementById("btnAdicionarProduto");

  produtosEventoCache = [];

  if (!eventoId) {
    if (lista) lista.innerHTML = "";
    if (aviso) aviso.style.display = "block";
    if (btnAdicionar) btnAdicionar.style.display = "none";
    return;
  }

  if (aviso) aviso.style.display = "none";
  if (btnAdicionar) btnAdicionar.style.display = "inline-block";

  if (!lista) return;
  lista.innerHTML = `<p>Carregando produtos...</p>`;

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("evento_id", eventoId)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar produtos.</p>`;
    console.error(error);
    return;
  }

  produtosEventoCache = data || [];
  renderizarProdutosEvento();
}

function renderizarProdutosEvento() {
  const lista = document.getElementById("listaProdutosEvento");
  if (!lista) return;

  if (produtosEventoCache.length === 0) {
    lista.innerHTML = `<p>Nenhum produto cadastrado ainda.</p>`;
    return;
  }

  lista.innerHTML = produtosEventoCache.map(p => `
    <div class="produto-linha">
      <div>
        <strong>${p.nome}</strong> — ${formatarMoeda(p.valor)}
        ${p.descricao ? `<br><span style="color:#666;font-size:13px;">${p.descricao}</span>` : ""}
      </div>
      <div class="produto-acoes">
        <button type="button" onclick="editarProduto('${p.id}')">Editar</button>
        <button type="button" style="background:#b42318;" onclick="removerProduto('${p.id}')">Remover</button>
      </div>
    </div>
  `).join("");
}

function abrirModalProduto() {
  const eventoId = document.getElementById("eventoEditandoId").value;

  if (!eventoId) {
    alert("Salve o evento primeiro para poder adicionar produtos.");
    return;
  }

  document.getElementById("produtoEditandoId").value = "";
  document.getElementById("tituloModalProduto").innerText = "Novo Produto";
  document.getElementById("produtoNome").value = "";
  document.getElementById("produtoValor").value = "";
  document.getElementById("produtoDescricao").value = "";

  document.getElementById("modalProduto").style.display = "flex";
}

function fecharModalProduto() {
  document.getElementById("modalProduto").style.display = "none";
}

function editarProduto(id) {
  const produto = produtosEventoCache.find(p => String(p.id) === String(id));
  if (!produto) return;

  document.getElementById("produtoEditandoId").value = produto.id;
  document.getElementById("tituloModalProduto").innerText = "Editar Produto";
  document.getElementById("produtoNome").value = produto.nome || "";
  document.getElementById("produtoValor").value = produto.valor || "";
  document.getElementById("produtoDescricao").value = produto.descricao || "";

  document.getElementById("modalProduto").style.display = "flex";
}

async function salvarProduto() {
  const eventoId = document.getElementById("eventoEditandoId").value;
  const produtoId = document.getElementById("produtoEditandoId").value;
  const nome = document.getElementById("produtoNome").value.trim();
  const valor = Number(document.getElementById("produtoValor").value);
  const descricao = document.getElementById("produtoDescricao").value.trim();

  if (!nome) {
    alert("Preencha o nome do produto.");
    return;
  }

  if (!valor || valor <= 0) {
    alert("Preencha o valor do produto.");
    return;
  }

  let error;

  if (produtoId) {
    ({ error } = await supabaseClient
      .from("produtos")
      .update({ nome, valor, descricao })
      .eq("id", produtoId));
  } else {
    ({ error } = await supabaseClient
      .from("produtos")
      .insert([{ evento_id: Number(eventoId), nome, valor, descricao, ativo: true }]));
  }

  if (error) {
    alert("Erro ao salvar produto: " + error.message);
    console.error(error);
    return;
  }

  fecharModalProduto();
  await carregarProdutosEvento(eventoId);
}

async function removerProduto(id) {
  if (!confirm("Remover este produto? Vendas já feitas com ele não serão apagadas.")) return;

  const eventoId = document.getElementById("eventoEditandoId").value;

  const { error } = await supabaseClient
    .from("produtos")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    alert("Erro ao remover produto: " + error.message);
    console.error(error);
    return;
  }

  await carregarProdutosEvento(eventoId);
}
