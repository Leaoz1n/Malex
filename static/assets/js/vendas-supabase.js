/* ============================================================
   VENDAS - Sistema Malex
   Segue exatamente o mesmo padrão de assets/js/cadastros-supabase.js
   (mesma estrutura de offline-first, mesmas validações), mudando
   apenas que aqui o cliente compra um PRODUTO (cadastrado em
   Eventos > Formulário) em vez de guardar volumes/malas.

   Reaproveita funções já existentes em cadastros-supabase.js:
   moeda(), mascaraTelefone(), garantirEstiloAcoes(), toggleAcoes(),
   abrirDetalhes(), carregarEventosSelect().
   ============================================================ */

let produtosVendaCache = [];

/* ---------- Produtos do evento selecionado ---------- */

async function carregarProdutosVenda() {
  const selectProduto = document.getElementById("produtoVenda");
  const selectEvento = document.getElementById("eventoVenda");
  if (!selectProduto || !selectEvento) return;

  const eventoId = selectEvento.value;

  selectProduto.innerHTML = `<option value="">Selecione um produto</option>`;
  produtosVendaCache = [];

  if (!eventoId) return;

  let produtos = [];

  if (navigator.onLine) {
    const { data, error } = await supabaseClient
      .from("produtos")
      .select("*")
      .eq("evento_id", Number(eventoId))
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!error && data) {
      produtos = data;
      localStorage.setItem("produtos_evento_" + eventoId, JSON.stringify(produtos));
    } else {
      produtos = JSON.parse(localStorage.getItem("produtos_evento_" + eventoId)) || [];
    }
  } else {
    produtos = JSON.parse(localStorage.getItem("produtos_evento_" + eventoId)) || [];
  }

  produtosVendaCache = produtos;

  if (produtos.length === 0) {
    selectProduto.innerHTML = `<option value="">Nenhum produto cadastrado para este evento</option>`;
    return;
  }

  produtos.forEach(p => {
    selectProduto.innerHTML += `<option value="${p.id}" data-valor="${p.valor}" data-nome="${p.nome}">${p.nome} - ${moeda(p.valor)}</option>`;
  });
}

async function atualizarProdutosVenda() {
  await carregarProdutosVenda();
  atualizarValorTotalVenda();
}

/* ---------- CPF/Email/Pagamento conforme o evento ---------- */

function atualizarCamposVenda() {
  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const eventoId = document.getElementById("eventoVenda") ? document.getElementById("eventoVenda").value : "";
  const evento = eventos.find(e => String(e.id) === String(eventoId));

  const campoCPF = document.getElementById("campoCPFVenda");
  const campoEmail = document.getElementById("campoEmailVenda");
  const pagamentosDiv = document.getElementById("pagamentosVenda");

  if (!campoCPF || !campoEmail || !pagamentosDiv) return;

  campoCPF.style.display = "none";
  campoEmail.style.display = "none";
  pagamentosDiv.innerHTML = "";

  if (!evento) return;

  if (evento.mostrarCPF) campoCPF.style.display = "block";
  if (evento.mostrarEmail) campoEmail.style.display = "block";

  const pagamentos = (evento.pagamentos || []).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
  const ultimo = localStorage.getItem("ultimoPagamentoVenda") || evento.formaPagamentoPadrao;

  if (pagamentos.length === 0) return;

  pagamentosDiv.innerHTML = `<select id="formaPagamentoVenda" style="max-width:260px;"></select>`;
  const select = document.getElementById("formaPagamentoVenda");

  pagamentos.forEach(pag => {
    select.innerHTML += `<option value="${pag}">${pag}</option>`;
  });

  if (ultimo && pagamentos.includes(ultimo)) {
    select.value = ultimo;
  }
}

function atualizarValorTotalVenda() {
  const selectProduto = document.getElementById("produtoVenda");
  const qtd = Number(document.getElementById("quantidadeVenda") ? document.getElementById("quantidadeVenda").value : 0) || 0;
  const preview = document.getElementById("valorTotalPreviewVenda");
  if (!preview) return;

  const opt = selectProduto ? selectProduto.selectedOptions[0] : null;
  const valorUnit = opt ? Number(opt.dataset.valor || 0) : 0;

  if (!opt || !opt.value || !qtd) {
    preview.innerText = "Total: R$ 0,00";
    return;
  }

  preview.innerText = "Total: " + moeda(qtd * valorUnit);
}

/* ---------- Offline ---------- */

function getVendasOffline() {
  return JSON.parse(localStorage.getItem("vendasOffline")) || [];
}

function salvarVendasOffline(lista) {
  localStorage.setItem("vendasOffline", JSON.stringify(lista));
}

function salvarVendaOffline(venda) {
  const pendentes = getVendasOffline();
  pendentes.push(venda);
  salvarVendasOffline(pendentes);
  return true;
}

function removerCamposOfflineVenda(venda) {
  const copia = { ...venda };
  if (!copia.created_at && copia.offline_created_at) {
    copia.created_at = copia.offline_created_at;
  }
  delete copia.offline_id;
  delete copia.offline_created_at;
  delete copia.offline_status;
  return copia;
}

function atualizarStatusOfflineVendas() {
  const status = document.getElementById("statusOfflineVendas");
  if (!status) return;

  const pendentes = getVendasOffline();

  if (!navigator.onLine) {
    status.className = "offline-status offline";
    status.innerText = `Sem internet. Vendas pendentes para sincronizar: ${pendentes.length}`;
    return;
  }

  if (pendentes.length > 0) {
    status.className = "offline-status pendente";
    status.innerText = `Online. Existem ${pendentes.length} venda(s) pendente(s) para sincronizar.`;
    return;
  }

  status.className = "offline-status online";
  status.innerText = "Online. Tudo sincronizado.";
}

/* ---------- Início da tela ---------- */

async function iniciarTelaVendas() {
  setLayoutInfo();
  await carregarEventosSelect();
  await carregarProdutosVenda();
  atualizarCamposVenda();
  atualizarValorTotalVenda();
  await listarVendas();
  atualizarStatusOfflineVendas();

  window.addEventListener("online", async () => {
    atualizarStatusOfflineVendas();
    await sincronizarVendasOffline();
    await listarVendas();
  });

  window.addEventListener("offline", () => {
    atualizarStatusOfflineVendas();
  });
}

/* ---------- Registrar venda ---------- */

async function registrarVenda() {
  const eventoId = document.getElementById("eventoVenda").value;
  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(eventoId));
  const user = getUserLogado();

  const selectProduto = document.getElementById("produtoVenda");
  const opt = selectProduto ? selectProduto.selectedOptions[0] : null;

  const nome = document.getElementById("nomeClienteVenda").value.trim();
  const telefone = document.getElementById("telefoneClienteVenda").value.trim();
  const telefoneLimpo = telefone.replace(/\D/g, "");

  const cpf = document.getElementById("cpfClienteVenda") ? document.getElementById("cpfClienteVenda").value.trim() : "";
  const email = document.getElementById("emailClienteVenda") ? document.getElementById("emailClienteVenda").value.trim() : "";
  const qtd = Number(document.getElementById("quantidadeVenda").value);
  const observacoes = document.getElementById("observacoesVenda").value.trim();

  const pagamentoSelecionado = document.getElementById("formaPagamentoVenda");

  if (!evento) {
    alert("Selecione um evento.");
    return;
  }

  if (!opt || !opt.value) {
    alert("Selecione um produto.");
    return;
  }

  if (!nome || !telefone || !qtd || qtd <= 0) {
    alert("Preencha nome, telefone e quantidade.");
    return;
  }

  if (telefoneLimpo.length !== 11) {
    alert("Telefone inválido. Use o formato (11) 99999-9999.");
    return;
  }

  if (evento.mostrarCPF && evento.cpfObrigatorio && !cpf) {
    alert("CPF/CNPJ é obrigatório neste evento.");
    return;
  }

  if (evento.mostrarEmail && evento.emailObrigatorio && !email) {
    alert("E-mail é obrigatório neste evento.");
    return;
  }

  if (!pagamentoSelecionado || !pagamentoSelecionado.value) {
    alert("Selecione uma forma de pagamento.");
    return;
  }

  localStorage.setItem("ultimoPagamentoVenda", pagamentoSelecionado.value);

  const valorUnitario = Number(opt.dataset.valor || 0);
  const dataVenda = new Date().toISOString();

  const novaVenda = {
    created_at: dataVenda,
    evento_id: Number(eventoId),
    produto_id: Number(opt.value),
    produto_nome: opt.dataset.nome || "",
    usuario_id: user && user.login !== "Jess_" ? user.id : null,
    nome,
    telefone,
    cpf,
    email,
    quantidade: qtd,
    forma_pagamento: pagamentoSelecionado.value,
    valor_unitario: valorUnitario,
    valor_total: qtd * valorUnitario,
    observacoes,
    offline_id: "offline_venda_" + Date.now(),
    offline_created_at: dataVenda,
    offline_status: "pendente"
  };

  if (!navigator.onLine) {
    salvarVendaOffline(novaVenda);
    alert("Sem internet. Venda salva offline e será sincronizada quando voltar.");
    limparFormularioVenda();
    await listarVendas();
    atualizarStatusOfflineVendas();
    return;
  }

  const { error } = await supabaseClient
    .from("vendas")
    .insert([removerCamposOfflineVenda(novaVenda)]);

  if (error) {
    salvarVendaOffline(novaVenda);
    alert("Erro de conexão. Venda salva offline para sincronizar depois.");
    limparFormularioVenda();
    await listarVendas();
    atualizarStatusOfflineVendas();
    return;
  }

  alert("Venda registrada com sucesso!");
  limparFormularioVenda();
  await listarVendas();
  atualizarStatusOfflineVendas();
}

function limparFormularioVenda() {
  const nome = document.getElementById("nomeClienteVenda");
  const telefone = document.getElementById("telefoneClienteVenda");
  const cpf = document.getElementById("cpfClienteVenda");
  const email = document.getElementById("emailClienteVenda");
  const qtd = document.getElementById("quantidadeVenda");
  const obs = document.getElementById("observacoesVenda");
  const produto = document.getElementById("produtoVenda");

  if (nome) nome.value = "";
  if (telefone) telefone.value = "";
  if (cpf) cpf.value = "";
  if (email) email.value = "";
  if (qtd) qtd.value = "1";
  if (obs) obs.value = "";
  if (produto) produto.value = "";

  atualizarValorTotalVenda();
}

async function sincronizarVendasOffline() {
  if (!navigator.onLine) {
    alert("Sem internet. Não foi possível sincronizar agora.");
    atualizarStatusOfflineVendas();
    return;
  }

  let pendentes = getVendasOffline();
  if (pendentes.length === 0) {
    atualizarStatusOfflineVendas();
    return;
  }

  const sincronizadas = [];
  const falharam = [];

  for (const venda of pendentes) {
    const { error } = await supabaseClient
      .from("vendas")
      .insert([removerCamposOfflineVenda(venda)]);

    if (error) {
      falharam.push(venda);
    } else {
      sincronizadas.push(venda);
    }
  }

  salvarVendasOffline(falharam);
  atualizarStatusOfflineVendas();

  if (sincronizadas.length > 0) {
    alert(`${sincronizadas.length} venda(s) offline sincronizada(s) com sucesso.`);
  }

  if (falharam.length > 0) {
    alert(`${falharam.length} venda(s) não sincronizaram. Verifique a conexão.`);
  }
}

/* ---------- Listagem ---------- */

async function listarVendas() {
  garantirEstiloAcoes();

  const lista = document.getElementById("listaVendas");
  if (!lista) return;

  lista.innerHTML = `<div class="card">Carregando vendas...</div>`;

  const user = getUserLogado();
  const selectEvento = document.getElementById("eventoVenda");
  const eventosLocal = JSON.parse(localStorage.getItem("eventos")) || [];
  const pendentesOffline = getVendasOffline();

  let registrosOnline = [];

  if (navigator.onLine) {
    try {
      let query = supabaseClient
        .from("vendas")
        .select("*")
        .order("created_at", { ascending: false });

      if (user && user.cargo !== "Master") {
        query = query.eq("evento_id", Number(user.eventoId));
      }

      if (user && user.cargo === "Master" && selectEvento && selectEvento.value) {
        query = query.eq("evento_id", Number(selectEvento.value));
      }

      const { data, error } = await query;

      if (error) {
        registrosOnline = JSON.parse(localStorage.getItem("vendasOnlineCache")) || [];
      } else {
        registrosOnline = (data || []).map(v => mapearVenda(v, eventosLocal, false));
        localStorage.setItem("vendasOnlineCache", JSON.stringify(registrosOnline));
      }
    } catch (erro) {
      registrosOnline = JSON.parse(localStorage.getItem("vendasOnlineCache")) || [];
    }
  } else {
    registrosOnline = JSON.parse(localStorage.getItem("vendasOnlineCache")) || [];
  }

  let registrosOffline = pendentesOffline.map(v => mapearVendaOffline(v, eventosLocal));
  let registros = [...registrosOffline, ...registrosOnline];

  if (user && user.cargo !== "Master") {
    registros = registros.filter(r => String(r.eventoId) === String(user.eventoId));
  }

  if (user && user.cargo === "Master" && selectEvento && selectEvento.value) {
    registros = registros.filter(r => String(r.eventoId) === String(selectEvento.value));
  }

  const pesquisa = document.getElementById("pesquisaVenda") ? document.getElementById("pesquisaVenda").value.toLowerCase() : "";
  const tipoPesquisa = document.getElementById("tipoPesquisaVenda") ? document.getElementById("tipoPesquisaVenda").value : "nome";

  if (pesquisa) {
    registros = registros.filter(v => {
      if (tipoPesquisa === "nome") return v.nome.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "telefone") return v.telefone.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "cpf") return v.cpf.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "produto") return v.produtoNome.toLowerCase().includes(pesquisa);
      return false;
    });
  }

  localStorage.setItem("vendas", JSON.stringify(registros));

  if (registros.length === 0) {
    lista.innerHTML = `<div class="card">Nenhuma venda encontrada.</div>`;
    return;
  }

  let html = `
    <div class="tabela-container">
      <table class="tabela-cadastros">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Pagamento</th>
            <th>Total</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  registros.forEach(v => {
    const podeEditar = user && !v.offline && (user.cargo === "Master" || user.permitirEdicao);
    const podeExcluir = user && !v.offline && (user.cargo === "Master" || user.permitirExclusao);

    html += `
      <tr class="${v.offline ? "linha-offline" : ""}">
        <td>${v.nome}</td>
        <td>${v.telefone}</td>
        <td>${v.produtoNome}</td>
        <td>${v.quantidade}</td>
        <td>${v.formaPagamento}</td>
        <td>${moeda(v.valorTotal)}</td>
        <td>${v.offline ? `<span class="status-pendente">Offline pendente</span>` : `<span class="status-retirado">Concluída</span>`}</td>
        <td class="acoes-cell">
          <div class="acoes-dropdown">
            <button class="btn-acoes" onclick="toggleAcoes('${v.id}')">•••</button>
            <div class="acoes-menu" id="acoes-${v.id}">
              <button onclick="abrirDetalhes('${v.id}'); toggleAcoes('${v.id}')">Ver detalhes</button>
              <button onclick="gerarReciboVenda('${v.id}'); toggleAcoes('${v.id}')">Recibo</button>
              ${podeEditar ? `<button onclick="editarVenda('${v.id}'); toggleAcoes('${v.id}')">Editar</button>` : ""}
              ${podeExcluir ? `<button class="btn-danger" onclick="excluirVenda('${v.id}'); toggleAcoes('${v.id}')">Excluir</button>` : ""}
            </div>
          </div>
        </td>
      </tr>

      <tr>
        <td colspan="8">
          <div class="detalhes-cadastro" id="detalhes-${v.id}">
            <p><strong>Evento:</strong> ${v.eventoNome}</p>
            <p><strong>CPF/CNPJ:</strong> ${v.cpf || "-"}</p>
            <p><strong>E-mail:</strong> ${v.email || "-"}</p>
            <p><strong>Data da venda:</strong> ${v.createdAt ? new Date(v.createdAt).toLocaleString("pt-BR") : "-"}</p>
            <p><strong>Observações:</strong> ${v.observacoes || "-"}</p>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  lista.innerHTML = html;
}

function mapearVenda(v, eventosLocal, offline) {
  const evento = eventosLocal.find(e => String(e.id) === String(v.evento_id));
  return {
    id: String(v.id),
    eventoId: v.evento_id,
    eventoNome: evento ? evento.nome : "Evento não informado",
    produtoNome: v.produto_nome || "",
    nome: v.nome || "",
    telefone: v.telefone || "",
    cpf: v.cpf || "",
    email: v.email || "",
    quantidade: v.quantidade || 0,
    formaPagamento: v.forma_pagamento || "",
    valorTotal: v.valor_total || 0,
    observacoes: v.observacoes || "",
    createdAt: v.created_at || "",
    offline: offline
  };
}

function mapearVendaOffline(v, eventosLocal) {
  const evento = eventosLocal.find(e => String(e.id) === String(v.evento_id));
  return {
    id: v.offline_id,
    eventoId: v.evento_id,
    eventoNome: evento ? evento.nome : "Evento não informado",
    produtoNome: v.produto_nome || "",
    nome: v.nome || "",
    telefone: v.telefone || "",
    cpf: v.cpf || "",
    email: v.email || "",
    quantidade: v.quantidade || 0,
    formaPagamento: v.forma_pagamento || "",
    valorTotal: v.valor_total || 0,
    observacoes: v.observacoes || "",
    createdAt: v.offline_created_at || "",
    offline: true
  };
}

async function editarVenda(id) {
  const novoNome = prompt("Nome:");
  if (!novoNome) return;

  const novoTelefone = prompt("Telefone:");
  if (!novoTelefone) return;

  const novaObs = prompt("Observações:", "");

  const { error } = await supabaseClient
    .from("vendas")
    .update({ nome: novoNome, telefone: novoTelefone, observacoes: novaObs })
    .eq("id", id);

  if (error) {
    alert("Erro ao editar venda: " + error.message);
    return;
  }

  alert("Venda atualizada.");
  await listarVendas();
}

async function excluirVenda(id) {
  if (!confirm("Deseja excluir esta venda?")) return;

  const { error } = await supabaseClient
    .from("vendas")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir venda: " + error.message);
    return;
  }

  alert("Venda excluída.");
  await listarVendas();
}

function gerarReciboVenda(id) {
  const vendas = JSON.parse(localStorage.getItem("vendas")) || [];
  const v = vendas.find(x => String(x.id) === String(id));

  if (!v) {
    alert("Venda não encontrada.");
    return;
  }

  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(v.eventoId));
  const topoEvento = evento ? evento.topoEvento : "";

  const html = `
  <!DOCTYPE html>
  <html lang="pt-br">
  <head>
    <meta charset="UTF-8">
    <title>Recibo Malex</title>
    <style>
      body{font-family:Arial;padding:30px;color:#222;background:#fff;}
      .recibo{max-width:800px;margin:auto;border:1px solid #ddd;border-radius:16px;padding:30px;}
      .topo-recibo{width:100%;max-height:180px;object-fit:contain;margin-bottom:22px;border-radius:12px;}
      h1{text-align:center;margin:0 0 8px 0;font-size:26px;}
      .sub{text-align:center;color:#666;margin-bottom:25px;}
      .linha{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:10px 0;gap:18px;}
      .titulo{font-weight:bold;}
      .total{text-align:right;font-size:24px;font-weight:bold;margin-top:25px;}
      .ass{text-align:center;margin-top:45px;color:#555;font-size:13px;}
      .acoes{text-align:center;margin-top:28px;}
      button{padding:12px 22px;background:#0b2a52;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:bold;}
      @media print{.acoes{display:none}.recibo{border:0}body{padding:0}}
    </style>
  </head>
  <body>
    <div class="recibo">
      ${topoEvento ? `<img class="topo-recibo" src="${topoEvento}">` : ""}
      <h1>RECIBO DE VENDA</h1>
      <div class="sub">${v.eventoNome || "Malex"}</div>

      <div class="linha"><span class="titulo">Cliente:</span><span>${v.nome}</span></div>
      <div class="linha"><span class="titulo">Telefone:</span><span>${v.telefone}</span></div>
      <div class="linha"><span class="titulo">CPF/CNPJ:</span><span>${v.cpf || "-"}</span></div>
      <div class="linha"><span class="titulo">E-mail:</span><span>${v.email || "-"}</span></div>
      <div class="linha"><span class="titulo">Produto:</span><span>${v.produtoNome}</span></div>
      <div class="linha"><span class="titulo">Quantidade:</span><span>${v.quantidade}</span></div>
      <div class="linha"><span class="titulo">Pagamento:</span><span>${v.formaPagamento}</span></div>
      <div class="linha"><span class="titulo">Data:</span><span>${v.createdAt ? new Date(v.createdAt).toLocaleString("pt-BR") : "-"}</span></div>
      <div class="linha"><span class="titulo">Observações:</span><span>${v.observacoes || "-"}</span></div>

      <div class="total">Total: ${moeda(v.valorTotal)}</div>
      <div class="ass">JRTecnologia - Soluções Criativas<br>Sistema Malex</div>
      <div class="acoes"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
    </div>
  </body>
  </html>
  `;

  const janela = window.open("", "_blank");
  if (!janela) {
    alert("O navegador bloqueou o recibo. Permita pop-ups para este site.");
    return;
  }

  janela.document.write(html);
  janela.document.close();
}
