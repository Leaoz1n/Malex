function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function mascaraTelefone(campo) {
  let valor = campo.value.replace(/\D/g, "");

  if (valor.length > 11) valor = valor.substring(0, 11);

  if (valor.length > 6) {
    valor = valor.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
  } else if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d+)/, "($1) $2");
  } else if (valor.length > 0) {
    valor = valor.replace(/^(\d+)/, "($1");
  }

  campo.value = valor;
}

function normalizarNumerosMalas(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor.map(item => String(item));
  if (typeof valor === "string") {
    return valor
      .replace("{", "")
      .replace("}", "")
      .replace("[", "")
      .replace("]", "")
      .replaceAll('"', "")
      .split(",")
      .map(item => item.trim())
      .filter(item => item !== "");
  }
  return [];
}

function abrirDetalhes(id) {
  const el = document.getElementById("detalhes-" + id);
  if (el) el.classList.toggle("aberto");
}

function getConfigEtiquetaPorEvento(eventoId) {
  return JSON.parse(localStorage.getItem("configImpressora_" + eventoId)) || {
    nome: "Argox",
    largura: 89,
    altura: 40,
    margem: 4,
    fonteMala: 24
  };
}

function getCadastrosOffline() {
  return JSON.parse(localStorage.getItem("cadastrosOffline")) || [];
}

function salvarCadastrosOffline(lista) {
  localStorage.setItem("cadastrosOffline", JSON.stringify(lista));
}

function getRetiradasOffline() {
  return JSON.parse(localStorage.getItem("retiradasOffline")) || [];
}

function salvarRetiradasOffline(lista) {
  localStorage.setItem("retiradasOffline", JSON.stringify(lista));
}

function atualizarCacheRetiradaLocal(id, dataRetirada) {
  const atualizarLista = (chave) => {
    const lista = JSON.parse(localStorage.getItem(chave)) || [];
    const novaLista = lista.map(item => {
      if (String(item.id) === String(id)) {
        return { ...item, retirado: true, dataRetirada: dataRetirada, data_retirada: dataRetirada };
      }
      return item;
    });
    localStorage.setItem(chave, JSON.stringify(novaLista));
  };

  atualizarLista("operacoes");
  atualizarLista("operacoesOnlineCache");
}

function salvarCadastroOffline(cadastro) {
  const pendentes = getCadastrosOffline();

  const malasJaOffline = pendentes
    .filter(c => String(c.evento_id) === String(cadastro.evento_id))
    .flatMap(c => normalizarNumerosMalas(c.numeros_malas));

  const repetidaOffline = cadastro.numeros_malas.find(m => malasJaOffline.includes(m));

  if (repetidaOffline) {
    alert("A mala número " + repetidaOffline + " já está salva offline neste aparelho.");
    return false;
  }

  pendentes.push(cadastro);
  salvarCadastrosOffline(pendentes);
  return true;
}

function removerCamposOffline(cadastro) {
  const copia = { ...cadastro };

  // Mantém a data/hora real em que o cadastro foi feito no aparelho,
  // e não a hora em que sincronizou depois.
  if (!copia.created_at && copia.offline_created_at) {
    copia.created_at = copia.offline_created_at;
  }

  delete copia.offline_id;
  delete copia.offline_created_at;
  delete copia.offline_status;
  return copia;
}

function atualizarStatusOffline() {
  const status = document.getElementById("statusOffline");
  if (!status) return;

  const pendentes = getCadastrosOffline();
  const retiradasPendentes = getRetiradasOffline();
  const totalPendentes = pendentes.length + retiradasPendentes.length;

  if (!navigator.onLine) {
    status.className = "offline-status offline";
    status.innerText = `Sem internet. Pendências para sincronizar: ${totalPendentes}`;
    return;
  }

  if (totalPendentes > 0) {
    status.className = "offline-status pendente";
    status.innerText = `Online. Existem ${totalPendentes} pendência(s) para sincronizar.`;
    return;
  }

  status.className = "offline-status online";
  status.innerText = "Online. Tudo sincronizado.";
}

function garantirEstiloAcoes() {
  if (document.getElementById("estilo-acoes-malex")) return;

  const style = document.createElement("style");
  style.id = "estilo-acoes-malex";
  style.innerHTML = `
    .acoes-cell{position:relative;white-space:nowrap;}
    .acoes-dropdown{position:relative;display:inline-block;}
    .btn-acoes{
      min-width:38px;
      width:auto;
      padding:8px 12px;
      border-radius:8px;
      border:1px solid #ddd;
      background:#111;
      color:#fff;
      font-weight:bold;
      cursor:pointer;
    }
    .acoes-menu{
      display:none;
      position:absolute;
      right:0;
      top:42px;
      z-index:50;
      min-width:170px;
      padding:8px;
      background:#fff;
      border:1px solid #ddd;
      border-radius:12px;
      box-shadow:0 10px 25px rgba(0,0,0,.18);
    }
    .acoes-menu.aberto{display:block;}
    .acoes-menu button{
      width:100%;
      display:block;
      margin:4px 0;
      text-align:left;
      padding:9px 10px;
      border:0;
      border-radius:8px;
      background:#f3f4f6;
      color:#111;
      cursor:pointer;
    }
    .acoes-menu button:hover{background:#e5e7eb;}
    .acoes-menu .btn-retirado{background:#0a8f2d;color:#fff;}
    .acoes-menu .btn-etiqueta{background:#111;color:#fff;}
    .acoes-menu .btn-danger{background:#b42318;color:#fff;}
  `;
  document.head.appendChild(style);
}

function toggleAcoes(id) {
  document.querySelectorAll(".acoes-menu").forEach(menu => {
    if (menu.id !== "acoes-" + id) menu.classList.remove("aberto");
  });

  const menu = document.getElementById("acoes-" + id);
  if (menu) menu.classList.toggle("aberto");
}

async function carregarEventosSelect() {
  const selects = document.querySelectorAll(".selectEventos");
  const user = getUserLogado();

  try {
    if (!navigator.onLine) {
      preencherSelectEventosComLocalStorage(selects, user);
      atualizarStatusOffline();
      return;
    }

    const { data, error } = await supabaseClient
      .from("eventos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      preencherSelectEventosComLocalStorage(selects, user);
      atualizarStatusOffline();
      return;
    }

    const eventosFormatados = (data || []).map(evt => ({
      id: evt.id,
      nome: evt.nome,
      ativo: evt.ativo,
      status: evt.status,
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
    preencherSelectEventosComLista(selects, user, eventosFormatados);
    atualizarStatusOffline();

  } catch (erro) {
    preencherSelectEventosComLocalStorage(selects, user);
    atualizarStatusOffline();
  }
}

function preencherSelectEventosComLocalStorage(selects, user) {
  const eventosLocal = JSON.parse(localStorage.getItem("eventos")) || [];
  preencherSelectEventosComLista(selects, user, eventosLocal);
}

function preencherSelectEventosComLista(selects, user, eventosFormatados) {
  selects.forEach(select => {
    select.innerHTML = `<option value="">Selecione um evento</option>`;

    let lista = eventosFormatados.filter(e => e.ativo !== false);

    if (user && user.cargo !== "Master") {
      lista = lista.filter(e => String(e.id) === String(user.eventoId));
    }

    lista.forEach(evt => {
      select.innerHTML += `<option value="${evt.id}">${evt.nome}</option>`;
    });

    if (user && user.cargo !== "Master" && user.eventoId) {
      select.value = user.eventoId;
      select.disabled = true;
    }
  });
}

function preencherPagamentoOperacaoComoSelect() {
  const selectEvento = document.getElementById("eventoOperacao");
  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(selectEvento ? selectEvento.value : ""));

  const pagamentos = (evento && evento.pagamentos ? evento.pagamentos : [])
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

  let select = document.getElementById("formaPagamentoOperacao");

  if (!select) {
    const radios = document.querySelectorAll("input[name='pagamentoOperacao']");

    if (radios.length > 0) {
      let container = radios[0].closest("div");

      if (!container) {
        container = radios[0].parentElement;
      }

      if (container) {
        container.innerHTML = `<select id="formaPagamentoOperacao" style="max-width:260px;"></select>`;
        select = document.getElementById("formaPagamentoOperacao");
      }
    }
  }

  if (!select) return;

  select.innerHTML = "";

  pagamentos.forEach(pagamento => {
    select.innerHTML += `<option value="${pagamento}">${pagamento}</option>`;
  });

  const ultimo = localStorage.getItem("ultimoPagamentoOperacao");
  const padrao = evento ? evento.formaPagamentoPadrao : "";

  if (ultimo && pagamentos.includes(ultimo)) {
    select.value = ultimo;
  } else if (padrao && pagamentos.includes(padrao)) {
    select.value = padrao;
  } else if (pagamentos.length > 0) {
    select.value = pagamentos[0];
  }
}

function ativarPagamentoOperacaoComoSelect() {
  const original = window.atualizarCamposOperacao;

  if (typeof original === "function" && !original.__malexPagamentoSelect) {
    window.atualizarCamposOperacao = function() {
      original.apply(this, arguments);
      setTimeout(preencherPagamentoOperacaoComoSelect, 0);
    };

    window.atualizarCamposOperacao.__malexPagamentoSelect = true;
  }

  setTimeout(preencherPagamentoOperacaoComoSelect, 0);
}

async function iniciarTelaCadastros() {
  setLayoutInfo();
  await carregarEventosSelect();
  ativarPagamentoOperacaoComoSelect();
  atualizarCamposOperacao();
  preencherPagamentoOperacaoComoSelect();
  atualizarValorTotalPreview();
  await listarOperacoes();
  atualizarStatusOffline();

  window.addEventListener("online", async () => {
    atualizarStatusOffline();
    await sincronizarCadastrosOffline();
    await sincronizarRetiradasOffline();
    await listarOperacoes();
  });

  window.addEventListener("offline", () => {
    atualizarStatusOffline();
  });
}

async function validarMalaOnline(eventoId, numerosMalas) {
  try {
    const { data, error } = await supabaseClient
      .from("cadastros")
      .select("numeros_malas")
      .eq("evento_id", Number(eventoId));

    if (error) {
      return { ok: false, mensagem: "Erro ao verificar malas no banco. Tente novamente." };
    }

    const malasJaUsadas = (data || []).flatMap(c => normalizarNumerosMalas(c.numeros_malas));
    const malaRepetida = numerosMalas.find(n => malasJaUsadas.includes(n));

    if (malaRepetida) {
      return { ok: false, mensagem: "A mala número " + malaRepetida + " já foi cadastrada neste evento." };
    }

    return { ok: true };
  } catch (erro) {
    return { ok: false, mensagem: "Sem conexão para validar mala online." };
  }
}

async function registrarOperacao() {
  const eventoId = document.getElementById("eventoOperacao").value;
  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(eventoId));
  const user = getUserLogado();

  const nome = document.getElementById("nomeCliente").value.trim();
  const telefone = document.getElementById("telefoneCliente").value.trim();
  const telefoneLimpo = telefone.replace(/\D/g, "");

  const cpf = document.getElementById("cpfCliente") ? document.getElementById("cpfCliente").value.trim() : "";
  const email = document.getElementById("emailCliente") ? document.getElementById("emailCliente").value.trim() : "";
  const qtd = Number(document.getElementById("quantidadeVolumes").value);
  const observacoes = document.getElementById("observacoes").value.trim();

  const pagamentoSelecionado = document.getElementById("formaPagamentoOperacao") || document.querySelector("input[name='pagamentoOperacao']:checked");
  const numerosMalas = Array.from(document.querySelectorAll(".numeroMala")).map(i => i.value.trim());

  if (!evento) {
    alert("Selecione um evento.");
    return;
  }

  if (!nome || !telefone || !qtd) {
    alert("Preencha nome, telefone e quantidade de volumes.");
    return;
  }

  if (telefoneLimpo.length !== 11) {
    alert("Telefone inválido. Use o formato (11) 99999-9999.");
    return;
  }

  if (evento.mostrarCPF && evento.cpfObrigatorio && !cpf) {
    alert("CPF é obrigatório neste evento.");
    return;
  }

  if (cpf && !validarCPF(cpf)) {
    alert("CPF inválido.");
    return;
  }

  if (evento.mostrarEmail && evento.emailObrigatorio && !email) {
    alert("E-mail é obrigatório neste evento.");
    return;
  }

  if (numerosMalas.length !== qtd || numerosMalas.some(n => !n)) {
    alert("Preencha o número de todas as malas.");
    return;
  }

  const malasUnicas = new Set(numerosMalas);
  if (malasUnicas.size !== numerosMalas.length) {
    alert("Não é permitido repetir número de mala no mesmo cadastro.");
    return;
  }

  if (!pagamentoSelecionado) {
    alert("Selecione uma forma de pagamento.");
    return;
  }

  localStorage.setItem("ultimoPagamento", pagamentoSelecionado.value);

  const dataCadastro = new Date().toISOString();

  localStorage.setItem("ultimoPagamentoOperacao", pagamentoSelecionado.value);

  const novoCadastro = {
    created_at: dataCadastro,
    evento_id: Number(eventoId),
    usuario_id: user && user.login !== "Jess_" ? user.id : null,
    nome,
    telefone,
    cpf,
    email,
    quantidade_volumes: qtd,
    numeros_malas: numerosMalas,
    forma_pagamento: pagamentoSelecionado.value,
    valor_unitario: Number(evento.valor),
    valor_total: qtd * Number(evento.valor),
    retirado: false,
    data_retirada: null,
    observacoes,
    offline_id: "offline_" + Date.now(),
    offline_created_at: dataCadastro,
    offline_status: "pendente"
  };

  if (!navigator.onLine) {
    const salvou = salvarCadastroOffline(novoCadastro);
    if (salvou) {
      alert("Sem internet. Cadastro salvo offline e será sincronizado quando voltar.");
      limparFormularioOperacao();
      await listarOperacoes();
      atualizarStatusOffline();
    }
    return;
  }

  const podeCadastrar = await validarMalaOnline(eventoId, numerosMalas);

  if (!podeCadastrar.ok) {
    const confirmar = confirm(podeCadastrar.mensagem + "\n\nDeseja salvar mesmo assim como pendente offline para conferir depois pelo nome e telefone?");
    if (!confirmar) return;

    const salvou = salvarCadastroOffline(novoCadastro);
    if (salvou) {
      alert("Cadastro salvo offline para sincronizar depois.");
      limparFormularioOperacao();
      await listarOperacoes();
      atualizarStatusOffline();
    }
    return;
  }

  const { error } = await supabaseClient
    .from("cadastros")
    .insert([removerCamposOffline(novoCadastro)]);

  if (error) {
    const salvou = salvarCadastroOffline(novoCadastro);
    if (salvou) {
      alert("Erro de conexão. Cadastro salvo offline para sincronizar depois.");
      limparFormularioOperacao();
      await listarOperacoes();
      atualizarStatusOffline();
    }
    return;
  }

  alert("Guarda-volumes cadastrado com sucesso!");
  limparFormularioOperacao();
  await listarOperacoes();
  atualizarStatusOffline();
}

async function listarOperacoes() {
  garantirEstiloAcoes();

  const lista = document.getElementById("listaOperacoes");
  if (!lista) return;

  lista.innerHTML = `<div class="card">Carregando cadastros...</div>`;

  const user = getUserLogado();
  const selectEvento = document.getElementById("eventoOperacao");
  const eventosLocal = JSON.parse(localStorage.getItem("eventos")) || [];
  const pendentesOffline = getCadastrosOffline();

  let registrosOnline = [];

  if (navigator.onLine) {
    try {
      let query = supabaseClient
        .from("cadastros")
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
        registrosOnline = JSON.parse(localStorage.getItem("operacoesOnlineCache")) || [];
      } else {
        registrosOnline = (data || []).map(op => {
          const evento = eventosLocal.find(e => String(e.id) === String(op.evento_id));
          return {
            id: String(op.id),
            eventoId: op.evento_id,
            eventoNome: evento ? evento.nome : "Evento não informado",
            nome: op.nome || "",
            telefone: op.telefone || "",
            cpf: op.cpf || "",
            email: op.email || "",
            quantidadeVolumes: op.quantidade_volumes || 0,
            numerosMalas: normalizarNumerosMalas(op.numeros_malas),
            formaPagamento: op.forma_pagamento || "",
            valorTotal: op.valor_total || 0,
            retirado: op.retirado === true,
            dataRetirada: op.data_retirada || "",
            observacoes: op.observacoes || "",
            createdAt: op.created_at || "",
            offline: false
          };
        });
        localStorage.setItem("operacoesOnlineCache", JSON.stringify(registrosOnline));
      }
    } catch (erro) {
      registrosOnline = JSON.parse(localStorage.getItem("operacoesOnlineCache")) || [];
    }
  } else {
    registrosOnline = JSON.parse(localStorage.getItem("operacoesOnlineCache")) || [];
  }

  let registrosOffline = pendentesOffline.map(op => {
    const evento = eventosLocal.find(e => String(e.id) === String(op.evento_id));
    return {
      id: op.offline_id,
      eventoId: op.evento_id,
      eventoNome: evento ? evento.nome : "Evento não informado",
      nome: op.nome || "",
      telefone: op.telefone || "",
      cpf: op.cpf || "",
      email: op.email || "",
      quantidadeVolumes: op.quantidade_volumes || 0,
      numerosMalas: normalizarNumerosMalas(op.numeros_malas),
      formaPagamento: op.forma_pagamento || "",
      valorTotal: op.valor_total || 0,
      retirado: op.retirado === true,
      dataRetirada: op.data_retirada || "",
      observacoes: op.observacoes || "",
      createdAt: op.offline_created_at || "",
      offline: true
    };
  });

  let registros = [...registrosOffline, ...registrosOnline];

  if (user && user.cargo !== "Master") {
    registros = registros.filter(r => String(r.eventoId) === String(user.eventoId));
  }

  if (user && user.cargo === "Master" && selectEvento && selectEvento.value) {
    registros = registros.filter(r => String(r.eventoId) === String(selectEvento.value));
  }

  const pesquisa = document.getElementById("pesquisaCadastro") ? document.getElementById("pesquisaCadastro").value.toLowerCase() : "";
  const tipoPesquisa = document.getElementById("tipoPesquisaCadastro") ? document.getElementById("tipoPesquisaCadastro").value : "nome";

  if (pesquisa) {
    registros = registros.filter(op => {
      if (tipoPesquisa === "nome") return op.nome.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "telefone") return op.telefone.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "cpf") return op.cpf.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "mala") return op.numerosMalas.some(m => String(m).toLowerCase() === pesquisa);
      return false;
    });
  }

  localStorage.setItem("operacoes", JSON.stringify(registros));

  if (registros.length === 0) {
    lista.innerHTML = `<div class="card">Nenhum cadastro encontrado.</div>`;
    return;
  }

  let html = `
    <div class="tabela-container">
      <table class="tabela-cadastros">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Malas</th>
            <th>Volumes</th>
            <th>Pagamento</th>
            <th>Total</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
  `;

  registros.forEach(op => {
    const evento = eventosLocal.find(e => String(e.id) === String(op.eventoId));
    const impressaoPermitida = evento && evento.permitirImpressao;
    const podeEditar = user && !op.offline && (user.cargo === "Master" || user.permitirEdicao);
    const podeExcluir = user && !op.offline && (user.cargo === "Master" || user.permitirExclusao);

    html += `
      <tr class="${op.offline ? "linha-offline" : ""}">
        <td>${op.nome}</td>
        <td>${op.telefone}</td>
        <td>${op.numerosMalas.join(", ") || "-"}</td>
        <td>${op.quantidadeVolumes}</td>
        <td>${op.formaPagamento}</td>
        <td>${moeda(op.valorTotal)}</td>
        <td>
          ${
            op.offline
              ? `<span class="status-pendente">Offline pendente</span>`
              : op.retirado
                ? `<span class="status-retirado">Retirado</span>`
                : `<span class="status-pendente">Pendente</span>`
          }
        </td>
        <td class="acoes-cell">
          <div class="acoes-dropdown">
            <button class="btn-acoes" onclick="toggleAcoes('${op.id}')">•••</button>
            <div class="acoes-menu" id="acoes-${op.id}">
              <button onclick="abrirDetalhes('${op.id}'); toggleAcoes('${op.id}')">Ver detalhes</button>
              <button onclick="gerarRecibo('${op.id}'); toggleAcoes('${op.id}')">Recibo</button>
              ${impressaoPermitida ? `<button class="btn-etiqueta" onclick="imprimirEtiqueta('${op.id}'); toggleAcoes('${op.id}')">Etiqueta</button>` : ""}
              ${!op.retirado ? `<button class="btn-retirado" onclick="marcarRetirado('${op.id}'); toggleAcoes('${op.id}')">Retirado</button>` : ""}
              ${podeEditar ? `<button onclick="editarOperacao('${op.id}'); toggleAcoes('${op.id}')">Editar</button>` : ""}
              ${podeExcluir ? `<button class="btn-danger" onclick="excluirOperacao('${op.id}'); toggleAcoes('${op.id}')">Excluir</button>` : ""}
            </div>
          </div>
        </td>
      </tr>

      <tr>
        <td colspan="8">
          <div class="detalhes-cadastro" id="detalhes-${op.id}">
            <p><strong>Evento:</strong> ${op.eventoNome}</p>
            <p><strong>CPF:</strong> ${op.cpf || "-"}</p>
            <p><strong>E-mail:</strong> ${op.email || "-"}</p>
            <p><strong>Malas:</strong> ${op.numerosMalas.join(", ") || "-"}</p>
            <p><strong>Data do cadastro:</strong> ${op.createdAt ? new Date(op.createdAt).toLocaleString("pt-BR") : "-"}</p>
            <p><strong>Observações:</strong> ${op.observacoes || "-"}</p>
            <p><strong>Status:</strong> ${op.offline ? "Offline pendente de sincronização" : op.retirado ? "Retirado" : "Pendente"}</p>
            <p><strong>Horário de retirada:</strong> ${op.dataRetirada ? new Date(op.dataRetirada).toLocaleString("pt-BR") : "-"}</p>
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

async function sincronizarCadastrosOffline() {
  if (!navigator.onLine) {
    alert("Sem internet. Não foi possível sincronizar agora.");
    atualizarStatusOffline();
    return;
  }

  let pendentes = getCadastrosOffline();

  if (pendentes.length === 0) {
    atualizarStatusOffline();
    return;
  }

  const sincronizados = [];
  const falharam = [];

  for (const cadastro of pendentes) {
    const { error } = await supabaseClient
      .from("cadastros")
      .insert([removerCamposOffline(cadastro)]);

    if (error) {
      falharam.push(cadastro);
    } else {
      sincronizados.push(cadastro);
    }
  }

  salvarCadastrosOffline(falharam);
  atualizarStatusOffline();

  if (sincronizados.length > 0) {
    alert(`${sincronizados.length} cadastro(s) offline sincronizado(s) com sucesso.`);
  }

  if (falharam.length > 0) {
    alert(`${falharam.length} cadastro(s) não sincronizaram. Verifique conexão ou dados duplicados.`);
  }
}

async function sincronizarRetiradasOffline() {
  if (!navigator.onLine) {
    atualizarStatusOffline();
    return;
  }

  const pendentes = getRetiradasOffline();

  if (pendentes.length === 0) {
    atualizarStatusOffline();
    return;
  }

  const falharam = [];
  let sincronizadas = 0;

  for (const retirada of pendentes) {
    const { error } = await supabaseClient
      .from("cadastros")
      .update({
        retirado: true,
        data_retirada: retirada.data_retirada
      })
      .eq("id", retirada.id);

    if (error) {
      falharam.push(retirada);
    } else {
      sincronizadas++;
    }
  }

  salvarRetiradasOffline(falharam);
  atualizarStatusOffline();

  if (sincronizadas > 0) {
    alert(`${sincronizadas} retirada(s) sincronizada(s) com sucesso.`);
  }
}

async function marcarRetirado(id) {
  if (!confirm("Confirmar retirada deste guarda-volumes?")) return;

  const dataRetirada = new Date().toISOString();
  const idTexto = String(id);

  // Cadastro criado offline e ainda não sincronizado: marca retirado direto no cadastro offline.
  if (idTexto.startsWith("offline_")) {
    const pendentes = getCadastrosOffline();
    const novaLista = pendentes.map(cadastro => {
      if (String(cadastro.offline_id) === idTexto) {
        return {
          ...cadastro,
          retirado: true,
          data_retirada: dataRetirada
        };
      }
      return cadastro;
    });

    salvarCadastrosOffline(novaLista);
    alert("Retirada registrada offline. Será sincronizada junto com o cadastro.");
    await listarOperacoes();
    atualizarStatusOffline();
    return;
  }

  // Cadastro já existe online, mas o aparelho está sem internet: cria uma fila de retirada.
  if (!navigator.onLine) {
    const pendentes = getRetiradasOffline();
    const semDuplicar = pendentes.filter(item => String(item.id) !== idTexto);

    semDuplicar.push({
      id: idTexto,
      data_retirada: dataRetirada
    });

    salvarRetiradasOffline(semDuplicar);
    atualizarCacheRetiradaLocal(idTexto, dataRetirada);

    alert("Retirada registrada offline. Será sincronizada quando a internet voltar.");
    await listarOperacoes();
    atualizarStatusOffline();
    return;
  }

  const { error } = await supabaseClient
    .from("cadastros")
    .update({
      retirado: true,
      data_retirada: dataRetirada
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao marcar retirada: " + error.message);
    return;
  }

  alert("Retirada registrada com sucesso.");
  await listarOperacoes();
}

async function editarOperacao(id) {
  const novoNome = prompt("Nome:");
  if (!novoNome) return;

  const novoTelefone = prompt("Telefone:");
  if (!novoTelefone) return;

  const novaObs = prompt("Observações:", "");

  const { error } = await supabaseClient
    .from("cadastros")
    .update({ nome: novoNome, telefone: novoTelefone, observacoes: novaObs })
    .eq("id", id);

  if (error) {
    alert("Erro ao editar cadastro: " + error.message);
    return;
  }

  alert("Cadastro atualizado.");
  await listarOperacoes();
}

async function excluirOperacao(id) {
  if (!confirm("Deseja excluir este cadastro?")) return;

  const { error } = await supabaseClient
    .from("cadastros")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir cadastro: " + error.message);
    return;
  }

  alert("Cadastro excluído.");
  await listarOperacoes();
}

function imprimirEtiqueta(id) {
  const operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];
  const op = operacoes.find(o => String(o.id) === String(id));

  if (!op) {
    alert("Cadastro não encontrado para imprimir.");
    return;
  }

  if (!op.numerosMalas || op.numerosMalas.length === 0) {
    alert("Este cadastro não possui números de mala.");
    return;
  }

  const config = getConfigEtiquetaPorEvento(op.eventoId);
  const totalVolumes = op.numerosMalas.length;
  let etiquetas = "";

  op.numerosMalas.forEach((numero, index) => {
    etiquetas += `
      <section class="etiqueta">
        <div class="titulo">MALEX</div>
        <div class="evento">${op.eventoNome || "Evento"}</div>
        <div class="mala">MALA ${numero}</div>
        <div class="cliente">${op.nome}</div>
        <div class="telefone">${op.telefone}</div>
        <div class="volume">${index + 1}/${totalVolumes}</div>
        <div class="rodape">JRTecnologia</div>
      </section>
    `;
  });

  abrirJanelaEtiqueta(etiquetas, config, true);
}

function abrirJanelaEtiqueta(etiquetas, config, imprimirAutomatico) {
  const htmlEtiqueta = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta Malex</title>
      <style>
        @page { size: ${config.largura}mm ${config.altura}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
        .etiqueta { width: ${config.largura}mm; height: ${config.altura}mm; padding: ${config.margem}mm; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; color: black; background: white; }
        .titulo { font-size: 14px; font-weight: bold; text-align: center; line-height: 1; }
        .evento { font-size: 10px; text-align: center; line-height: 1; }
        .mala { font-size: ${config.fonteMala}px; font-weight: bold; text-align: center; line-height: 1; }
        .cliente { font-size: 12px; font-weight: bold; text-align: center; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .telefone { font-size: 11px; text-align: center; line-height: 1; }
        .volume { font-size: 14px; font-weight: bold; text-align: center; line-height: 1; }
        .rodape { font-size: 9px; text-align: center; line-height: 1; }
      </style>
    </head>
    <body>
      ${etiquetas}
      <script>
        setTimeout(function() {
          window.focus();
          ${imprimirAutomatico ? "window.print();" : ""}
        }, 800);
      <\/script>
    </body>
    </html>
  `;

  const blob = new Blob([htmlEtiqueta], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank");

  if (!janela) alert("O navegador bloqueou a janela da etiqueta. Permita pop-ups para este site.");
}

function gerarRecibo(id) {
  const operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];
  const op = operacoes.find(o => String(o.id) === String(id));

  if (!op) {
    alert("Cadastro não encontrado.");
    return;
  }

  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(op.eventoId));
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
      <h1>RECIBO DE GUARDA-VOLUMES</h1>
      <div class="sub">${op.eventoNome || "Malex"}</div>

      <div class="linha"><span class="titulo">Cliente:</span><span>${op.nome}</span></div>
      <div class="linha"><span class="titulo">Telefone:</span><span>${op.telefone}</span></div>
      <div class="linha"><span class="titulo">CPF:</span><span>${op.cpf || "-"}</span></div>
      <div class="linha"><span class="titulo">E-mail:</span><span>${op.email || "-"}</span></div>
      <div class="linha"><span class="titulo">Volumes:</span><span>${op.quantidadeVolumes}</span></div>
      <div class="linha"><span class="titulo">Malas:</span><span>${op.numerosMalas.join(", ") || "-"}</span></div>
      <div class="linha"><span class="titulo">Pagamento:</span><span>${op.formaPagamento}</span></div>
      <div class="linha"><span class="titulo">Data:</span><span>${op.createdAt ? new Date(op.createdAt).toLocaleString("pt-BR") : "-"}</span></div>
      <div class="linha"><span class="titulo">Observações:</span><span>${op.observacoes || "-"}</span></div>

      <div class="total">Total: ${moeda(op.valorTotal)}</div>
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
