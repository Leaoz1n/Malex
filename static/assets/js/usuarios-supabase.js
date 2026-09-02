async function carregarEventosSelect() {
  const selects = document.querySelectorAll(".selectEventos");
  const user = getUserLogado();

  const { data, error } = await supabaseClient
    .from("eventos")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    alert("Erro ao carregar eventos: " + error.message);
    console.error(error);
    return;
  }

  const eventosFormatados = (data || []).map(evt => ({
    id: evt.id,
    nome: evt.nome,
    ativo: evt.ativo
  }));

  localStorage.setItem("eventos", JSON.stringify(eventosFormatados));

  selects.forEach(select => {
    select.innerHTML = `<option value="">Selecione um evento</option>`;

    let lista = eventosFormatados;

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

async function criarUsuario() {
  const nome = document.getElementById("nomeUsuario").value.trim();
  const login = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("senhaUsuario").value.trim();
  const cargo = document.getElementById("cargoUsuario").value;
  const eventoId = document.getElementById("eventoUsuario").value;
  const permitirEdicao = document.getElementById("usuarioPermitirEdicao").checked;
  const permitirExclusao = document.getElementById("usuarioPermitirExclusao").checked;

  if (!nome || !login || !senha || !cargo) {
    alert("Preencha todos os dados do usuário.");
    return;
  }

  if (login.toLowerCase() === "jess_") {
    alert("Este login é reservado para o Master.");
    return;
  }

  if (cargo !== "Master" && !eventoId) {
    alert("Supervisor e operador precisam estar vinculados a um evento.");
    return;
  }

  const { data: loginExistente, error: erroBusca } = await supabaseClient
    .from("usuarios")
    .select("id")
    .eq("usuario", login)
    .maybeSingle();

  if (erroBusca) {
    alert("Erro ao verificar login: " + erroBusca.message);
    console.error(erroBusca);
    return;
  }

  if (loginExistente) {
    alert("Este login já está em uso. Escolha outro.");
    return;
  }

  const novoUsuario = {
    nome: nome,
    usuario: login,
    senha: senha,
    cargo: cargo,
    evento_id: cargo === "Master" ? null : Number(eventoId),
    primeiro_acesso: true,
    alterar_senha_obrigatoria: true,
    ativo: true,
    permitir_edicao: permitirEdicao,
    permitir_exclusao: permitirExclusao
  };

  const { error } = await supabaseClient
    .from("usuarios")
    .insert([novoUsuario]);

  if (error) {
    alert("Erro ao criar usuário: " + error.message);
    console.error(error);
    return;
  }

  alert("Usuário criado com sucesso no Supabase!");

  limparFormularioUsuario();
  listarUsuarios();
}

async function listarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  if (!lista) return;

  lista.innerHTML = `<div class="card">Carregando usuários...</div>`;

  const { data, error } = await supabaseClient
    .from("usuarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    lista.innerHTML = `<div class="card">Erro ao carregar usuários: ${error.message}</div>`;
    console.error(error);
    return;
  }

  const { data: eventosData, error: eventosError } = await supabaseClient
    .from("eventos")
    .select("id, nome");

  if (eventosError) {
    lista.innerHTML = `<div class="card">Erro ao carregar eventos: ${eventosError.message}</div>`;
    console.error(eventosError);
    return;
  }

  const usuariosFormatados = (data || []).map(u => {
    const evento = (eventosData || []).find(e => String(e.id) === String(u.evento_id));

    return {
      id: u.id,
      nome: u.nome,
      login: u.usuario,
      senha: u.senha,
      cargo: u.cargo,
      eventoId: u.evento_id,
      eventoNome: evento ? evento.nome : "Global",
      primeiroAcesso: u.primeiro_acesso,
      alterarSenhaObrigatoria: u.alterar_senha_obrigatoria,
      ativo: u.ativo,
      permitirEdicao: u.permitir_edicao,
      permitirExclusao: u.permitir_exclusao
    };
  });

  localStorage.setItem("usuarios", JSON.stringify(usuariosFormatados));

  lista.innerHTML = "";

  if (usuariosFormatados.length === 0) {
    lista.innerHTML = `<div class="card">Nenhum usuário cadastrado.</div>`;
    return;
  }

  usuariosFormatados.forEach(u => {
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
async function editarUsuario(id) {
  const novoNome = prompt("Nome:");
  if (!novoNome) return;

  const novoLogin = prompt("Login:");
  if (!novoLogin) return;

  const novoCargo = prompt("Cargo: Master, Supervisor ou Operador");
  if (!novoCargo) return;

  const permitirEdicao = confirm("Permitir edição para este usuário?");
  const permitirExclusao = confirm("Permitir exclusão para este usuário?");

  const { error } = await supabaseClient
    .from("usuarios")
    .update({
      nome: novoNome,
      usuario: novoLogin,
      cargo: novoCargo,
      permitir_edicao: permitirEdicao,
      permitir_exclusao: permitirExclusao
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao editar usuário: " + error.message);
    console.error(error);
    return;
  }

  alert("Usuário atualizado.");
  listarUsuarios();
}

async function resetarSenha(id) {
  const novaSenha = prompt("Digite a nova senha temporária:");
  if (!novaSenha) return;

  const { error } = await supabaseClient
    .from("usuarios")
    .update({
      senha: novaSenha,
      primeiro_acesso: true,
      alterar_senha_obrigatoria: true
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao resetar senha: " + error.message);
    console.error(error);
    return;
  }

  alert("Senha resetada. Usuário deverá trocar no próximo acesso.");
  listarUsuarios();
}

async function excluirUsuario(id) {
  if (!confirm("Deseja excluir este usuário?")) return;

  const { error } = await supabaseClient
    .from("usuarios")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir usuário: " + error.message);
    console.error(error);
    return;
  }

  alert("Usuário excluído.");
  listarUsuarios();
}