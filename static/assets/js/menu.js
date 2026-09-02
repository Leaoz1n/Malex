function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("hidden");
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("user"));
}

function setLayoutInfo() {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  if (user.primeiroAcesso || user.alterarSenhaObrigatoria) {
    window.location.href = "trocar-senha.html";
    return;
  }

  const eventoTopo = document.getElementById("eventoTopo");
  const menuUserInfo = document.getElementById("menuUserInfo");

  if (eventoTopo) {
    eventoTopo.innerText = user.cargo === "Master"
      ? "Global"
      : (user.eventoNome || "Evento não informado");
  }

  if (menuUserInfo) {
    menuUserInfo.innerHTML = `
      <div class="user-area">
        <div class="user-box">
          <strong>Evento</strong>
          <span>${user.cargo === "Master" ? "Global" : (user.eventoNome || "Evento não informado")}</span>
        </div>

        <div class="user-box">
          <strong>Usuário</strong>
          <span>${user.nome}</span>
        </div>

        <div class="user-box">
          <strong>Função</strong>
          <span>${user.cargo}</span>
        </div>

        <div class="logout-link" onclick="logout()">Sair</div>

        <div class="assinatura">
          <div class="malex-footer">Sistema Malex v1.0</div>
          <div class="jr-footer">© JRTecnologia - Soluções Criativas</div>
          <div class="jr-footer">Desenvolvido por Jessyca Rocha Tavares</div>
        </div>
      </div>
    `;
  }

  aplicarPermissoes(user);
}

function aplicarPermissoes(user) {
  const links = document.querySelectorAll("[data-role]");

  links.forEach(link => {
    const allowed = link.dataset.role.split(",");

    if (!allowed.includes(user.cargo)) {
      link.style.display = "none";
    }
  });
}

function logout() {
  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    localStorage.removeItem("activeSession_" + user.login);
  }

  localStorage.removeItem("user");
  window.location.href = "../login.html";
}