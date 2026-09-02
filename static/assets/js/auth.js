async function login() {
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!user || !pass) {
    alert("Preencha usuário e senha.");
    return;
  }

  if (user === "Jess_" && pass === "Jessyca_10") {
    const sessionToken = Date.now().toString();

    const master = {
      id: 1,
      nome: "Jessyca",
      login: "Jess_",
      cargo: "Master",
      eventoId: null,
      eventoNome: "Global",
      ativo: true,
      primeiroAcesso: false,
      alterarSenhaObrigatoria: false,
      permitirEdicao: true,
      permitirExclusao: true,
      sessionToken
    };

    localStorage.setItem("activeSession_Jess_", sessionToken);
    localStorage.setItem("user", JSON.stringify(master));

    window.location.href = "pages/dashboard.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("usuarios")
    .select("*")
    .eq("usuario", user)
    .eq("senha", pass)
    .maybeSingle();

  if (error) {
    alert("Erro ao fazer login: " + error.message);
    console.error(error);
    return;
  }

  if (!data) {
    alert("Usuário ou senha inválidos.");
    return;
  }

  if (data.ativo === false) {
    alert("Usuário bloqueado.");
    return;
  }

  let eventoNome = "Global";

  if (data.evento_id) {
    const { data: evento } = await supabaseClient
      .from("eventos")
      .select("nome")
      .eq("id", data.evento_id)
      .maybeSingle();

    if (evento) {
      eventoNome = evento.nome;
    }
  }

  const sessionToken = Date.now().toString();

  await supabaseClient
    .from("usuarios")
    .update({ session_token: sessionToken })
    .eq("id", data.id);

  const usuarioLogado = {
    id: data.id,
    nome: data.nome,
    login: data.usuario,
    cargo: data.cargo,
    eventoId: data.evento_id,
    eventoNome,
    ativo: data.ativo,
    primeiroAcesso: data.primeiro_acesso,
    alterarSenhaObrigatoria: data.alterar_senha_obrigatoria,
    permitirEdicao: data.permitir_edicao,
    permitirExclusao: data.permitir_exclusao,
    sessionToken
  };

  localStorage.setItem("activeSession_" + data.usuario, sessionToken);
  localStorage.setItem("user", JSON.stringify(usuarioLogado));

  if (usuarioLogado.primeiroAcesso || usuarioLogado.alterarSenhaObrigatoria) {
    window.location.href = "pages/trocar-senha.html";
  } else {
    window.location.href = "pages/dashboard.html";
  }
}

function logout() {
  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    localStorage.removeItem("activeSession_" + user.login);
  }

  localStorage.removeItem("user");

  if (window.location.pathname.includes("/pages/")) {
    window.location.href = "../login.html";
  } else {
    window.location.href = "login.html";
  }
}

async function validarSessaoUnica() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  if (user.login === "Jess_") {
    const activeToken = localStorage.getItem("activeSession_Jess_");

    if (activeToken !== user.sessionToken) {
      alert("Este login foi acessado em outra página. Você será desconectado.");
      localStorage.removeItem("user");
      window.location.href = "../login.html";
    }

    return;
  }

  if (!window.supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("usuarios")
    .select("session_token")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return;

  if (data.session_token !== user.sessionToken) {
    alert("Este login foi acessado em outra página. Você será desconectado.");
    localStorage.removeItem("user");
    window.location.href = "../login.html";
  }
}

setInterval(validarSessaoUnica, 3000);