async function iniciarTelaConfiguracoes() {
  setLayoutInfo();
  await carregarEventosSelect();
  carregarConfiguracaoImpressora();
}

function getEventoConfigSelecionado() {
  const select = document.getElementById("eventoConfig");
  return select ? select.value : "";
}

function getChaveConfigImpressora(eventoId) {
  return "configImpressora_" + eventoId;
}

function getConfigEtiquetaPorEvento(eventoId) {
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

  const config = getConfigEtiquetaPorEvento(eventoId);

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

function visualizarEtiquetaTeste() {
  const eventoId = getEventoConfigSelecionado();

  if (!eventoId) {
    alert("Selecione um evento.");
    return;
  }

  const eventos = JSON.parse(localStorage.getItem("eventos")) || [];
  const evento = eventos.find(e => String(e.id) === String(eventoId));
  const config = getConfigEtiquetaPorEvento(eventoId);

  const opTeste = {
    eventoNome: evento ? evento.nome : "Evento Teste",
    nome: "Nome do Cliente",
    telefone: "(11) 99999-9999",
    numerosMalas: ["001", "002", "003"]
  };

  const totalVolumes = opTeste.numerosMalas.length;

  let etiquetas = "";

  opTeste.numerosMalas.forEach((numero, index) => {
    etiquetas += `
      <section class="etiqueta">
        <div class="titulo">MALEX</div>
        <div class="evento">${opTeste.eventoNome}</div>
        <div class="mala">MALA ${numero}</div>
        <div class="cliente">${opTeste.nome}</div>
        <div class="telefone">${opTeste.telefone}</div>
        <div class="volume">${index + 1}/${totalVolumes}</div>
        <div class="rodape">JRTecnologia</div>
      </section>
    `;
  });

  abrirJanelaEtiqueta(etiquetas, config, false);
}