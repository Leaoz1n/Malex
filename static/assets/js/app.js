let eventos = JSON.parse(localStorage.getItem("eventos")) || [];
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
let operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

let filtroEventoDashboardSelecionado = localStorage.getItem("filtroEventoDashboard") || "";
let filtroEventoRelatorioSelecionado = localStorage.getItem("filtroEventoRelatorio") || "";

function salvarDados() {
  localStorage.setItem("eventos", JSON.stringify(eventos));
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  localStorage.setItem("operacoes", JSON.stringify(operacoes));
}

function getUserLogado() {
  return JSON.parse(localStorage.getItem("user"));
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;

  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;

  return resto === parseInt(cpf.substring(10, 11));
}

function filtrarPorPermissao(lista, campoEvento = "eventoId") {
  const user = getUserLogado();

  if (!user || user.cargo === "Master") return lista;

  return lista.filter(item => String(item[campoEvento]) === String(user.eventoId));
}

/* EVENTOS */

function pegarPagamentosSelecionados() {
  const checks = document.querySelectorAll("input[name='pagamentoEvento']:checked");
  return Array.from(checks).map(c => c.value);
}

function criarEvento() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const nome = document.getElementById("nomeEvento").value.trim();
  const valor = Number(document.getElementById("valorVolume").value);
  const pagamentos = pegarPagamentosSelecionados();

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

  const novoEvento = {
    id: Date.now().toString(),
    nome,
    status: "ativo",
    ativo: true,
    valor,
    pagamentos,
    formaPagamentoPadrao: pagamentos[0],
    mostrarCPF: configCPF !== "nao_exibir",
    cpfObrigatorio: configCPF === "obrigatorio",
    mostrarEmail: configEmail !== "nao_exibir",
    emailObrigatorio: configEmail === "obrigatorio",
    permitirImpressao,
    createdAt: new Date().toLocaleString("pt-BR")
  };

  eventos.push(novoEvento);
  salvarDados();

  alert("Evento criado com sucesso!");
  limparFormularioEvento();
  listarEventos();
}

function limparFormularioEvento() {
  if (document.getElementById("nomeEvento")) document.getElementById("nomeEvento").value = "";
  if (document.getElementById("valorVolume")) document.getElementById("valorVolume").value = "";

  document.querySelectorAll("input[name='pagamentoEvento']").forEach(c => c.checked = false);

  if (document.getElementById("configCPF")) document.getElementById("configCPF").value = "nao_exibir";
  if (document.getElementById("configEmail")) document.getElementById("configEmail").value = "nao_exibir";
  if (document.getElementById("permitirImpressao")) document.getElementById("permitirImpressao").checked = true;
}

function listarEventos() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const lista = document.getElementById("listaEventos");
  if (!lista) return;

  lista.innerHTML = "";

  if (eventos.length === 0) {
    lista.innerHTML = `<div class="card">Nenhum evento cadastrado.</div>`;
    return;
  }

  eventos.forEach(evt => {
    lista.innerHTML += `
      <div class="card">
        <h3>${evt.nome}</h3>
        <p>Status: ${evt.status}</p>
        <p>Valor por volume: ${formatarMoeda(evt.valor)}</p>
        <p>Pagamentos: ${(evt.pagamentos || []).join(", ")}</p>
        <p>CPF: ${evt.mostrarCPF ? (evt.cpfObrigatorio ? "Obrigatório" : "Opcional") : "Não exibir"}</p>
        <p>E-mail: ${evt.mostrarEmail ? (evt.emailObrigatorio ? "Obrigatório" : "Opcional") : "Não exibir"}</p>
        <p>Impressão de etiqueta: ${evt.permitirImpressao ? "Ativada" : "Desativada"}</p>

        <button onclick="editarEvento('${evt.id}')">Editar</button>
        <button onclick="encerrarEvento('${evt.id}')">Encerrar</button>
        <button onclick="apagarEvento('${evt.id}')">Apagar</button>
      </div>
    `;
  });
}

function editarEvento(id) {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const evento = eventos.find(e => String(e.id) === String(id));
  if (!evento) return;

  const novoNome = prompt("Nome do evento:", evento.nome);
  if (!novoNome) return;

  const novoValor = prompt("Valor por volume:", evento.valor);
  if (!novoValor || Number(novoValor) <= 0) {
    alert("Valor inválido.");
    return;
  }

  const novoStatus = prompt("Status: ativo ou encerrado", evento.status);
  if (!novoStatus) return;

  const impressao = confirm("Permitir impressão de etiqueta neste evento?");

  evento.nome = novoNome;
  evento.valor = Number(novoValor);
  evento.status = novoStatus.toLowerCase() === "encerrado" ? "encerrado" : "ativo";
  evento.ativo = evento.status === "ativo";
  evento.permitirImpressao = impressao;

  salvarDados();

  alert("Evento atualizado com sucesso.");
  listarEventos();
}

function encerrarEvento(id) {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const evento = eventos.find(e => String(e.id) === String(id));
  if (!evento) return;

  if (evento.status === "encerrado") {
    alert("Este evento já está encerrado.");
    return;
  }

  if (!confirm("Deseja encerrar este evento? Os usuários vinculados serão bloqueados.")) return;

  evento.status = "encerrado";
  evento.ativo = false;

  usuarios = usuarios.map(u => {
    if (String(u.eventoId) === String(id)) {
      return { ...u, ativo: false };
    }

    return u;
  });

  salvarDados();

  alert("Evento encerrado com sucesso.");
  listarEventos();
}

function apagarEvento(id) {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const temUsuarios = usuarios.some(u => String(u.eventoId) === String(id));
  const temCadastros = operacoes.some(op => String(op.eventoId) === String(id));

  if (temUsuarios || temCadastros) {
    alert("Não é possível apagar este evento porque ele possui usuários ou cadastros vinculados. Encerre o evento para manter o histórico.");
    return;
  }

  if (!confirm("Deseja apagar este evento? Essa ação não pode ser desfeita.")) return;

  eventos = eventos.filter(e => String(e.id) !== String(id));
  salvarDados();

  alert("Evento apagado com sucesso.");
  listarEventos();
}

/* SELECTS */

function carregarEventosSelect() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const selects = document.querySelectorAll(".selectEventos");
  const user = getUserLogado();

  selects.forEach(select => {
    select.innerHTML = `<option value="">Selecione um evento</option>`;

    let lista = eventos.filter(e => e.ativo !== false);

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

/* USUÁRIOS */

function criarUsuario() {
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const nome = document.getElementById("nomeUsuario").value.trim();
  const login = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("senhaUsuario").value.trim();
  const cargo = document.getElementById("cargoUsuario").value;
  const eventoId = document.getElementById("eventoUsuario").value;
  const permitirEdicao = document.getElementById("usuarioPermitirEdicao").checked;
  const permitirExclusao = document.getElementById("usuarioPermitirExclusao").checked;

  const evento = eventos.find(e => String(e.id) === String(eventoId));

  if (!nome || !login || !senha || !cargo) {
    alert("Preencha todos os dados do usuário.");
    return;
  }

  const loginExiste = usuarios.some(u => u.login.toLowerCase() === login.toLowerCase());

  if (loginExiste || login.toLowerCase() === "jess_") {
    alert("Este login já está em uso. Escolha outro.");
    return;
  }

  if (cargo !== "Master" && !eventoId) {
    alert("Supervisor e operador precisam estar vinculados a um evento.");
    return;
  }

  const novoUsuario = {
    id: Date.now().toString(),
    nome,
    login,
    senha,
    cargo,
    eventoId: cargo === "Master" ? null : eventoId,
    eventoNome: cargo === "Master" ? "Global" : evento.nome,
    primeiroAcesso: true,
    alterarSenhaObrigatoria: true,
    ativo: true,
    permitirEdicao,
    permitirExclusao
  };

  usuarios.push(novoUsuario);
  salvarDados();

  alert("Usuário criado com sucesso!");
  limparFormularioUsuario();
  listarUsuarios();
}

function limparFormularioUsuario() {
  document.getElementById("nomeUsuario").value = "";
  document.getElementById("loginUsuario").value = "";
  document.getElementById("senhaUsuario").value = "";
  document.getElementById("cargoUsuario").value = "Supervisor";
  document.getElementById("eventoUsuario").value = "";
  document.getElementById("usuarioPermitirEdicao").checked = true;
  document.getElementById("usuarioPermitirExclusao").checked = false;
}

function listarUsuarios() {
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const lista = document.getElementById("listaUsuarios");
  if (!lista) return;

  lista.innerHTML = "";

  if (usuarios.length === 0) {
    lista.innerHTML = `<div class="card">Nenhum usuário cadastrado.</div>`;
    return;
  }

  usuarios.forEach(u => {
    lista.innerHTML += `
      <div class="card">
        <h3>${u.nome}</h3>
        <p>Login: ${u.login}</p>
        <p>Cargo: ${u.cargo}</p>
        <p>Evento: ${u.eventoNome || "Global"}</p>
        <p>Status: ${u.ativo === false ? "Bloqueado" : "Ativo"}</p>
        <p>Permite edição: ${u.permitirEdicao ? "Sim" : "Não"}</p>
        <p>Permite exclusão: ${u.permitirExclusao ? "Sim" : "Não"}</p>

        <button onclick="editarUsuario('${u.id}')">Editar</button>
        <button onclick="resetarSenha('${u.id}')">Resetar Senha</button>
        <button onclick="excluirUsuario('${u.id}')">Excluir</button>
      </div>
    `;
  });
}

function editarUsuario(id) {
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const usuario = usuarios.find(u => String(u.id) === String(id));
  if (!usuario) return;

  const novoNome = prompt("Nome:", usuario.nome);
  if (!novoNome) return;

  const novoLogin = prompt("Login:", usuario.login);
  if (!novoLogin) return;

  const loginExiste = usuarios.some(u =>
    String(u.id) !== String(id) &&
    u.login.toLowerCase() === novoLogin.toLowerCase()
  );

  if (loginExiste || novoLogin.toLowerCase() === "jess_") {
    alert("Este login já está em uso.");
    return;
  }

  const novoCargo = prompt("Cargo: Master, Supervisor ou Operador", usuario.cargo);
  if (!novoCargo) return;

  const permitirEdicao = confirm("Permitir edição para este usuário?");
  const permitirExclusao = confirm("Permitir exclusão para este usuário?");

  usuario.nome = novoNome;
  usuario.login = novoLogin;
  usuario.cargo = novoCargo;
  usuario.permitirEdicao = permitirEdicao;
  usuario.permitirExclusao = permitirExclusao;

  salvarDados();
  listarUsuarios();
}

function resetarSenha(id) {
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  const usuario = usuarios.find(u => String(u.id) === String(id));
  if (!usuario) return;

  const novaSenha = prompt("Digite a nova senha temporária:");
  if (!novaSenha) return;

  usuario.senha = novaSenha;
  usuario.primeiroAcesso = true;
  usuario.alterarSenhaObrigatoria = true;

  salvarDados();

  alert("Senha resetada. Usuário deverá trocar no próximo acesso.");
  listarUsuarios();
}

function excluirUsuario(id) {
  usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  if (!confirm("Deseja excluir este usuário?")) return;

  usuarios = usuarios.filter(u => String(u.id) !== String(id));
  salvarDados();

  listarUsuarios();
}

/* GUARDA-VOLUMES */

function atualizarCamposOperacao() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const eventoId = document.getElementById("eventoOperacao").value;
  const evento = eventos.find(e => String(e.id) === String(eventoId));

  const campoCPF = document.getElementById("campoCPF");
  const campoEmail = document.getElementById("campoEmail");
  const pagamentosDiv = document.getElementById("pagamentosOperacao");

  if (!campoCPF || !campoEmail || !pagamentosDiv) return;

  campoCPF.style.display = "none";
  campoEmail.style.display = "none";
  pagamentosDiv.innerHTML = "";

  if (!evento) return;

  if (evento.mostrarCPF) campoCPF.style.display = "block";
  if (evento.mostrarEmail) campoEmail.style.display = "block";

  const ultimoPagamento = localStorage.getItem("ultimoPagamento") || evento.formaPagamentoPadrao;

  (evento.pagamentos || []).forEach(pag => {
    const checked = pag === ultimoPagamento ? "checked" : "";

    pagamentosDiv.innerHTML += `
      <label>
        <input type="radio" name="pagamentoOperacao" value="${pag}" ${checked}>
        ${pag}
      </label>
    `;
  });
}

function atualizarValorTotalPreview() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const eventoId = document.getElementById("eventoOperacao") ? document.getElementById("eventoOperacao").value : "";
  const qtd = Number(document.getElementById("quantidadeVolumes") ? document.getElementById("quantidadeVolumes").value : 0);
  const evento = eventos.find(e => String(e.id) === String(eventoId));
  const preview = document.getElementById("valorTotalPreview");

  if (!preview) return;

  if (!evento || !qtd) {
    preview.innerText = "Total: R$ 0,00";
    return;
  }

  preview.innerText = "Total: " + formatarMoeda(qtd * Number(evento.valor));
}

function gerarCamposMalas() {
  const qtd = Number(document.getElementById("quantidadeVolumes").value);
  const div = document.getElementById("camposMalas");

  if (!div) return;

  div.innerHTML = "";

  for (let i = 1; i <= qtd; i++) {
    div.innerHTML += `<input class="numeroMala" placeholder="Número da Mala ${i}">`;
  }
}

function registrarOperacao() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const eventoId = document.getElementById("eventoOperacao").value;
  const evento = eventos.find(e => String(e.id) === String(eventoId));
  const user = getUserLogado();

  const nome = document.getElementById("nomeCliente").value.trim();
  const telefone = document.getElementById("telefoneCliente").value.trim();
  const cpf = document.getElementById("cpfCliente") ? document.getElementById("cpfCliente").value.trim() : "";
  const email = document.getElementById("emailCliente") ? document.getElementById("emailCliente").value.trim() : "";
  const qtd = Number(document.getElementById("quantidadeVolumes").value);
  const observacoes = document.getElementById("observacoes").value.trim();

  const pagamentoSelecionado = document.querySelector("input[name='pagamentoOperacao']:checked");
  const numerosMalas = Array.from(document.querySelectorAll(".numeroMala")).map(i => i.value.trim());

  if (!evento) {
    alert("Selecione um evento.");
    return;
  }

  if (evento.status === "encerrado" || evento.ativo === false) {
    alert("Este evento está encerrado. Não é possível cadastrar.");
    return;
  }

  if (!nome || !telefone || !qtd) {
    alert("Preencha nome, telefone e quantidade de volumes.");
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

  const malasJaUsadasNoEvento = operacoes
    .filter(op => String(op.eventoId) === String(eventoId))
    .flatMap(op => op.numerosMalas || []);

  const malaRepetida = numerosMalas.find(n => malasJaUsadasNoEvento.includes(n));

  if (malaRepetida) {
    alert("A mala número " + malaRepetida + " já foi cadastrada neste evento.");
    return;
  }

  if (!pagamentoSelecionado) {
    alert("Selecione uma forma de pagamento.");
    return;
  }

  localStorage.setItem("ultimoPagamento", pagamentoSelecionado.value);

  const novaOperacao = {
    id: Date.now().toString(),
    createdAt: new Date().toLocaleString("pt-BR"),
    dataSimples: new Date().toLocaleDateString("pt-BR"),
    eventoId,
    eventoNome: evento.nome,
    usuarioId: user ? user.id : null,
    usuarioNome: user ? user.nome : "",
    nome,
    telefone,
    cpf,
    email,
    quantidadeVolumes: qtd,
    numerosMalas,
    formaPagamento: pagamentoSelecionado.value,
    valorUnitario: Number(evento.valor),
    valorTotal: qtd * Number(evento.valor),
    retirado: false,
    dataRetirada: "",
    observacoes
  };

  operacoes.push(novaOperacao);
  salvarDados();

  alert("Guarda-volumes cadastrado com sucesso!");
  limparFormularioOperacao();
  listarOperacoes();
}

function limparFormularioOperacao() {
  document.getElementById("nomeCliente").value = "";
  document.getElementById("telefoneCliente").value = "";
  if (document.getElementById("cpfCliente")) document.getElementById("cpfCliente").value = "";
  if (document.getElementById("emailCliente")) document.getElementById("emailCliente").value = "";
  document.getElementById("quantidadeVolumes").value = "";
  document.getElementById("camposMalas").innerHTML = "";
  document.getElementById("observacoes").value = "";
  atualizarCamposOperacao();
  atualizarValorTotalPreview();
}

function listarOperacoes() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const lista = document.getElementById("listaOperacoes");
  if (!lista) return;

  const pesquisa = document.getElementById("pesquisaCadastro")
    ? document.getElementById("pesquisaCadastro").value.toLowerCase()
    : "";

  const tipoPesquisa = document.getElementById("tipoPesquisaCadastro")
    ? document.getElementById("tipoPesquisaCadastro").value
    : "nome";

  let listaFiltrada = filtrarPorPermissao(operacoes);

  const user = getUserLogado();
  const selectEvento = document.getElementById("eventoOperacao");

  if (user && user.cargo === "Master" && selectEvento && selectEvento.value) {
    listaFiltrada = listaFiltrada.filter(op => String(op.eventoId) === String(selectEvento.value));
  }

  if (pesquisa) {
    listaFiltrada = listaFiltrada.filter(op => {
      if (tipoPesquisa === "nome") return op.nome.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "telefone") return op.telefone.toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "cpf") return (op.cpf || "").toLowerCase().includes(pesquisa);
      if (tipoPesquisa === "mala") return (op.numerosMalas || []).some(m => m.toLowerCase() === pesquisa);
      return false;
    });
  }

  if (listaFiltrada.length === 0) {
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

  listaFiltrada.forEach(op => {
    const evento = eventos.find(e => String(e.id) === String(op.eventoId));
    const impressaoPermitida = evento && evento.permitirImpressao;

    const podeEditar = user && (user.cargo === "Master" || user.permitirEdicao);
    const podeExcluir = user && (user.cargo === "Master" || user.permitirExclusao);

    html += `
      <tr>
        <td>${op.nome}</td>
        <td>${op.telefone}</td>
        <td>${op.numerosMalas.join(", ")}</td>
        <td>${op.quantidadeVolumes}</td>
        <td>${op.formaPagamento}</td>
        <td>${formatarMoeda(op.valorTotal)}</td>
        <td>
          ${
            op.retirado
              ? `<span class="status-retirado">Retirado</span>`
              : `<span class="status-pendente">Pendente</span>`
          }
        </td>
        <td>
          <button onclick="toggleDetalhesCadastro('${op.id}')">Ver detalhes</button>
          ${impressaoPermitida ? `<button class="btn-etiqueta" onclick="imprimirEtiqueta('${op.id}')">Etiqueta</button>` : ""}
          ${!op.retirado ? `<button class="btn-retirado" onclick="marcarRetirado('${op.id}')">Retirado</button>` : ""}
          ${podeEditar ? `<button onclick="editarOperacao('${op.id}')">Editar</button>` : ""}
          ${podeExcluir ? `<button onclick="excluirOperacao('${op.id}')">Excluir</button>` : ""}
        </td>
      </tr>

      <tr>
        <td colspan="8">
          <div class="detalhes-cadastro" id="detalhes-${op.id}">
            <p><strong>Evento:</strong> ${op.eventoNome}</p>
            <p><strong>CPF:</strong> ${op.cpf || "-"}</p>
            <p><strong>E-mail:</strong> ${op.email || "-"}</p>
            <p><strong>Usuário:</strong> ${op.usuarioNome}</p>
            <p><strong>Data:</strong> ${op.createdAt}</p>
            <p><strong>Observações:</strong> ${op.observacoes || "-"}</p>
            <p><strong>Status:</strong> ${
              op.retirado
                ? `Retirado em ${op.dataRetirada}`
                : "Pendente"
            }</p>
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

function toggleDetalhesCadastro(id) {
  const detalhes = document.getElementById("detalhes-" + id);

  if (detalhes) {
    detalhes.classList.toggle("aberto");
  }
}

function editarOperacao(id) {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const op = operacoes.find(o => String(o.id) === String(id));
  if (!op) return;

  const novoNome = prompt("Nome:", op.nome);
  if (!novoNome) return;

  const novoTelefone = prompt("Telefone:", op.telefone);
  if (!novoTelefone) return;

  const novaObs = prompt("Observações:", op.observacoes || "");

  op.nome = novoNome;
  op.telefone = novoTelefone;
  op.observacoes = novaObs;

  salvarDados();
  listarOperacoes();
}

function excluirOperacao(id) {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  if (!confirm("Deseja excluir este cadastro?")) return;

  operacoes = operacoes.filter(o => String(o.id) !== String(id));
  salvarDados();

  listarOperacoes();
}

function marcarRetirado(id) {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const op = operacoes.find(o => String(o.id) === String(id));
  if (!op) return;

  if (!confirm("Confirmar retirada deste guarda-volumes?")) return;

  op.retirado = true;
  op.dataRetirada = new Date().toLocaleString("pt-BR");

  salvarDados();

  alert("Retirada registrada com sucesso.");
  listarOperacoes();
}

/* CONFIGURAÇÕES IMPRESSORA */

function carregarConfiguracaoImpressora() {
  const config = JSON.parse(localStorage.getItem("configImpressora")) || {
    nome: "Argox",
    largura: 89,
    altura: 40,
    margem: 4,
    fonteMala: 24
  };

  if (document.getElementById("nomeImpressora")) {
    document.getElementById("nomeImpressora").value = config.nome;
    document.getElementById("larguraEtiqueta").value = config.largura;
    document.getElementById("alturaEtiqueta").value = config.altura;
    document.getElementById("margemEtiqueta").value = config.margem;
    document.getElementById("fonteMalaEtiqueta").value = config.fonteMala;
  }
}

function salvarConfiguracaoImpressora() {
  const config = {
    nome: document.getElementById("nomeImpressora").value || "Argox",
    largura: Number(document.getElementById("larguraEtiqueta").value) || 89,
    altura: Number(document.getElementById("alturaEtiqueta").value) || 40,
    margem: Number(document.getElementById("margemEtiqueta").value) || 4,
    fonteMala: Number(document.getElementById("fonteMalaEtiqueta").value) || 24
  };

  localStorage.setItem("configImpressora", JSON.stringify(config));

  alert("Configuração salva com sucesso.");
}

function carregarPadraoEtiqueta() {
  document.getElementById("nomeImpressora").value = "Argox";
  document.getElementById("larguraEtiqueta").value = 89;
  document.getElementById("alturaEtiqueta").value = 40;
  document.getElementById("margemEtiqueta").value = 4;
  document.getElementById("fonteMalaEtiqueta").value = 24;

  salvarConfiguracaoImpressora();
}

function imprimirEtiqueta(id) {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const op = operacoes.find(o => String(o.id) === String(id));
  if (!op) return;

  const config = JSON.parse(localStorage.getItem("configImpressora")) || {
    nome: "Argox",
    largura: 89,
    altura: 40,
    margem: 4,
    fonteMala: 24
  };

  const totalVolumes = op.numerosMalas.length;

  const etiquetas = op.numerosMalas.map((numero, index) => `
    <div class="etiqueta">
      <div class="titulo">MALEX</div>
      <div class="evento">${op.eventoNome}</div>
      <div class="mala">MALA ${numero}</div>
      <div class="cliente">${op.nome}</div>
      <div class="telefone">${op.telefone}</div>
      <div class="volume">${index + 1}/${totalVolumes}</div>
      <div class="rodape">JRTecnologia</div>
    </div>
  `).join("");

  const janela = window.open("", "_blank");

  janela.document.write(`
    <html>
    <head>
      <title>Etiqueta Malex</title>

      <style>
        @page {
          size: ${config.largura}mm ${config.altura}mm;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }

        .etiqueta {
          width: ${config.largura}mm;
          height: ${config.altura}mm;
          box-sizing: border-box;
          padding: ${config.margem}mm;
          border: 1px solid #000;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .titulo {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .evento {
          font-size: 10px;
          text-align: center;
        }

        .mala {
          font-size: ${config.fonteMala}px;
          font-weight: bold;
          text-align: center;
          margin: 1mm 0;
        }

        .cliente {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
        }

        .telefone {
          font-size: 11px;
          text-align: center;
        }

        .volume {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .rodape {
          font-size: 9px;
          text-align: center;
        }
      </style>
    </head>

    <body>
      ${etiquetas}

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `);

  janela.document.close();
}

/* DASHBOARD */

function carregarFiltroEventoDashboard() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const div = document.getElementById("filtroEventoDashboard");
  const user = getUserLogado();

  if (!div || !user || user.cargo !== "Master") return;

  div.innerHTML = `
    <select id="eventoDashboard" onchange="salvarFiltroDashboard(); carregarDashboard();">
      <option value="">Selecione um evento</option>
      ${eventos.map(e => `<option value="${e.id}">${e.nome}</option>`).join("")}
    </select>
  `;

  document.getElementById("eventoDashboard").value = filtroEventoDashboardSelecionado;
}

function salvarFiltroDashboard() {
  const valor = document.getElementById("eventoDashboard").value;
  filtroEventoDashboardSelecionado = valor;
  localStorage.setItem("filtroEventoDashboard", valor);
}

function carregarDashboard() {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  let lista = filtrarPorPermissao(operacoes);
  const user = getUserLogado();

  if (user && user.cargo === "Master") {
    if (filtroEventoDashboardSelecionado) {
      lista = lista.filter(op => String(op.eventoId) === String(filtroEventoDashboardSelecionado));
    } else {
      lista = [];
    }
  }

  const cadastrosDia = {};
  const volumesDia = {};
  const valorDia = {};
  const pagamentos = { PIX: 0, Cartão: 0, Dinheiro: 0 };

  lista.forEach(op => {
    const dia = op.dataSimples || "Sem data";

    cadastrosDia[dia] = (cadastrosDia[dia] || 0) + 1;
    volumesDia[dia] = (volumesDia[dia] || 0) + Number(op.quantidadeVolumes || 0);
    valorDia[dia] = (valorDia[dia] || 0) + Number(op.valorTotal || 0);
    pagamentos[op.formaPagamento] = (pagamentos[op.formaPagamento] || 0) + Number(op.valorTotal || 0);
  });

  desenharGraficoPizza("graficoCadastrosDia", cadastrosDia, "legendaCadastrosDia");
  desenharGraficoPizza("graficoVolumesDia", volumesDia, "legendaVolumesDia");
  desenharGraficoPizza("graficoValorDia", valorDia, "legendaValorDia", true);
  desenharGraficoPizza("graficoPagamento", pagamentos, "legendaPagamento", true);
}

function desenharGraficoPizza(canvasId, dados, legendaId, dinheiro = false) {
  const canvas = document.getElementById(canvasId);
  const legenda = document.getElementById(legendaId);

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = Object.keys(dados);
  const valores = Object.values(dados);
  const total = valores.reduce((a, b) => a + Number(b || 0), 0);

  const cores = ["#222", "#555", "#777", "#999", "#bbb", "#ddd"];

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (legenda) legenda.innerHTML = "";

  if (total === 0 || labels.length === 0) {
    ctx.beginPath();
    ctx.arc(140, 140, 95, 0, 2 * Math.PI);
    ctx.fillStyle = "#ddd";
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.font = "15px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sem dados", 140, 145);
    return;
  }

  let inicio = 0;

  valores.forEach((valor, index) => {
    const fatia = (valor / total) * 2 * Math.PI;

    ctx.beginPath();
    ctx.moveTo(140, 140);
    ctx.arc(140, 140, 95, inicio, inicio + fatia);
    ctx.closePath();
    ctx.fillStyle = cores[index % cores.length];
    ctx.fill();

    inicio += fatia;
  });

  if (legenda) {
    labels.forEach((label, index) => {
      const valor = dinheiro ? formatarMoeda(dados[label]) : dados[label];

      legenda.innerHTML += `
        <p>
          <span style="display:inline-block;width:12px;height:12px;background:${cores[index % cores.length]};margin-right:6px;"></span>
          ${label}: ${valor}
        </p>
      `;
    });
  }
}

/* RELATÓRIOS */

function carregarFiltroEventoRelatorio() {
  eventos = JSON.parse(localStorage.getItem("eventos")) || [];

  const div = document.getElementById("filtroEventoRelatorio");
  const user = getUserLogado();

  if (!div) return;

  if (user && user.cargo === "Master") {
    div.innerHTML = `
      <select id="eventoRelatorio" onchange="salvarFiltroRelatorio(); gerarRelatorios();">
        <option value="">Selecione um evento</option>
        ${eventos.map(e => `<option value="${e.id}">${e.nome}</option>`).join("")}
      </select>
    `;

    document.getElementById("eventoRelatorio").value = filtroEventoRelatorioSelecionado;
  } else {
    div.innerHTML = `<p>${user.eventoNome}</p>`;
  }
}

function salvarFiltroRelatorio() {
  const valor = document.getElementById("eventoRelatorio").value;
  filtroEventoRelatorioSelecionado = valor;
  localStorage.setItem("filtroEventoRelatorio", valor);
}

function gerarRelatorios() {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const area = document.getElementById("areaRelatorios");
  if (!area) return;

  let lista = filtrarPorPermissao(operacoes);
  const user = getUserLogado();

  if (user && user.cargo === "Master") {
    if (filtroEventoRelatorioSelecionado) {
      lista = lista.filter(op => String(op.eventoId) === String(filtroEventoRelatorioSelecionado));
    } else {
      lista = [];
    }
  }

  const totalGeral = lista.reduce((acc, op) => acc + Number(op.valorTotal || 0), 0);
  const totalPix = lista.filter(op => op.formaPagamento === "PIX").reduce((acc, op) => acc + op.valorTotal, 0);
  const totalCartao = lista.filter(op => op.formaPagamento === "Cartão").reduce((acc, op) => acc + op.valorTotal, 0);
  const totalDinheiro = lista.filter(op => op.formaPagamento === "Dinheiro").reduce((acc, op) => acc + op.valorTotal, 0);

  area.innerHTML = `
    <div class="card"><h3>PIX</h3><p>${formatarMoeda(totalPix)}</p></div>
    <div class="card"><h3>Cartão</h3><p>${formatarMoeda(totalCartao)}</p></div>
    <div class="card"><h3>Dinheiro</h3><p>${formatarMoeda(totalDinheiro)}</p></div>
    <div class="card"><h3>Total Geral</h3><p>${formatarMoeda(totalGeral)}</p></div>
  `;
}

function exportarExcel() {
  operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  let lista = filtrarPorPermissao(operacoes);
  const user = getUserLogado();

  if (user && user.cargo === "Master" && filtroEventoRelatorioSelecionado) {
    lista = lista.filter(op => String(op.eventoId) === String(filtroEventoRelatorioSelecionado));
  }

  if (user && user.cargo === "Master" && !filtroEventoRelatorioSelecionado) {
    alert("Selecione um evento para exportar.");
    return;
  }

  let csv = "Nome;Telefone;CPF;Email;Volumes;Numeros das Malas;Forma de Pagamento;Valor Unitario;Valor Total;Usuario;Data\n";
  let totalGeral = 0;

  lista.forEach(op => {
    totalGeral += Number(op.valorTotal || 0);
    csv += `${op.nome};${op.telefone};${op.cpf || ""};${op.email || ""};${op.quantidadeVolumes};${op.numerosMalas.join(", ")};${op.formaPagamento};${op.valorUnitario};${op.valorTotal};${op.usuarioNome};${op.createdAt}\n`;
  });

  csv += `;;;;;;;;TOTAL GERAL;${totalGeral}\n`;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "relatorio-malex.csv";
  link.click();
}
function getEventoConfigSelecionado() {
  const select = document.getElementById("eventoConfig");
  return select ? select.value : "";
}

function getChaveConfigImpressora(eventoId) {
  return "configImpressora_" + eventoId;
}

function getConfigImpressoraPorEvento(eventoId) {
  return JSON.parse(localStorage.getItem(getChaveConfigImpressora(eventoId))) || {
    nome: "Argox",
    largura: 89,
    altura: 40,
    margem: 4,
    fonteMala: 24
  };
}

function carregarConfiguracaoImpressora() {
  const eventoId = getEventoConfigSelecionado();

  if (!eventoId) return;

  const config = getConfigImpressoraPorEvento(eventoId);

  document.getElementById("nomeImpressora").value = config.nome;
  document.getElementById("larguraEtiqueta").value = config.largura;
  document.getElementById("alturaEtiqueta").value = config.altura;
  document.getElementById("margemEtiqueta").value = config.margem;
  document.getElementById("fonteMalaEtiqueta").value = config.fonteMala;
}

function salvarConfiguracaoImpressora() {
  const eventoId = getEventoConfigSelecionado();

  if (!eventoId) {
    alert("Selecione um evento.");
    return;
  }

  const config = {
    nome: document.getElementById("nomeImpressora").value || "Argox",
    largura: Number(document.getElementById("larguraEtiqueta").value) || 89,
    altura: Number(document.getElementById("alturaEtiqueta").value) || 40,
    margem: Number(document.getElementById("margemEtiqueta").value) || 4,
    fonteMala: Number(document.getElementById("fonteMalaEtiqueta").value) || 24
  };

  localStorage.setItem(getChaveConfigImpressora(eventoId), JSON.stringify(config));

  alert("Configuração salva para este evento.");
}

function carregarPadraoEtiqueta() {
  document.getElementById("nomeImpressora").value = "Argox";
  document.getElementById("larguraEtiqueta").value = 89;
  document.getElementById("alturaEtiqueta").value = 40;
  document.getElementById("margemEtiqueta").value = 4;
  document.getElementById("fonteMalaEtiqueta").value = 24;

  salvarConfiguracaoImpressora();
}

function abrirEtiquetaHTML(op, imprimirAutomatico) {
  const config = getConfigImpressoraPorEvento(op.eventoId);
  const totalVolumes = op.numerosMalas.length;

  const etiquetas = op.numerosMalas.map((numero, index) => `
    <div class="etiqueta">
      <div class="titulo">MALEX</div>
      <div class="evento">${op.eventoNome}</div>
      <div class="mala">MALA ${numero}</div>
      <div class="cliente">${op.nome}</div>
      <div class="telefone">${op.telefone}</div>
      <div class="volume">${index + 1}/${totalVolumes}</div>
      <div class="rodape">JRTecnologia</div>
    </div>
  `).join("");

  const janela = window.open("", "_blank");

  janela.document.write(`
    <html>
    <head>
      <title>Etiqueta Malex</title>

      <style>
        @page {
          size: ${config.largura}mm ${config.altura}mm;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }

        .etiqueta {
          width: ${config.largura}mm;
          height: ${config.altura}mm;
          box-sizing: border-box;
          padding: ${config.margem}mm;
          border: 1px solid #000;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .titulo {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .evento {
          font-size: 10px;
          text-align: center;
        }

        .mala {
          font-size: ${config.fonteMala}px;
          font-weight: bold;
          text-align: center;
          margin: 1mm 0;
        }

        .cliente {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
        }

        .telefone {
          font-size: 11px;
          text-align: center;
        }

        .volume {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .rodape {
          font-size: 9px;
          text-align: center;
        }
      </style>
    </head>

    <body>
      ${etiquetas}

      <script>
        window.onload = function() {
          ${imprimirAutomatico ? "window.print();" : ""}
        }
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

function imprimirEtiqueta(id) {
  const operacoes = JSON.parse(localStorage.getItem("operacoes")) || [];

  const op = operacoes.find(o => String(o.id) === String(id));

  if (!op) {
    alert("Cadastro não encontrado para imprimir.");
    return;
  }

  const config = getConfigImpressoraPorEvento
    ? getConfigImpressoraPorEvento(op.eventoId)
    : {
        largura: 89,
        altura: 40,
        margem: 4,
        fonteMala: 24
      };

  const totalVolumes = op.numerosMalas.length;

  const etiquetas = op.numerosMalas.map((numero, index) => `
    <div class="etiqueta">
      <div class="titulo">MALEX</div>
      <div class="evento">${op.eventoNome || "Evento"}</div>
      <div class="mala">MALA ${numero}</div>
      <div class="cliente">${op.nome}</div>
      <div class="telefone">${op.telefone}</div>
      <div class="volume">${index + 1}/${totalVolumes}</div>
      <div class="rodape">JRTecnologia</div>
    </div>
  `).join("");

  const janela = window.open("", "_blank");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
    return;
  }

  janela.document.open();

  janela.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta Malex</title>

      <style>
        @page {
          size: ${config.largura}mm ${config.altura}mm;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: ${config.largura}mm;
          font-family: Arial, sans-serif;
          background: white;
        }

        .etiqueta {
          width: ${config.largura}mm;
          height: ${config.altura}mm;
          box-sizing: border-box;
          padding: ${config.margem}mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .titulo {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .evento {
          font-size: 10px;
          text-align: center;
        }

        .mala {
          font-size: ${config.fonteMala}px;
          font-weight: bold;
          text-align: center;
        }

        .cliente {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
        }

        .telefone {
          font-size: 11px;
          text-align: center;
        }

        .volume {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .rodape {
          font-size: 9px;
          text-align: center;
        }
      </style>
    </head>

    <body>
      ${etiquetas}

      <script>
        setTimeout(function() {
          window.print();
        }, 500);
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}