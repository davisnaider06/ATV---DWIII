// ====================================================================
// Frontend do Sistema de Reservas. Conversa com a API via fetch().
// ====================================================================

const API = "/api";

// Atalho para selecionar elementos.
const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------
// MENSAGENS de feedback ao usuário (sucesso / erro)
// ---------------------------------------------------------------
function mostrarMensagem(texto, tipo = "sucesso") {
  const el = $("#mensagem");
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  setTimeout(() => el.classList.add("oculto"), 4000);
}

// ---------------------------------------------------------------
// Helper de requisições: faz o fetch e já trata erros da API.
// ---------------------------------------------------------------
async function api(caminho, opcoes = {}) {
  const resp = await fetch(API + caminho, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  const corpo = await resp.json();
  if (!resp.ok) {
    // a API devolve { sucesso:false, mensagem:"..." }
    throw new Error(corpo.mensagem || "Erro na requisição");
  }
  return corpo;
}

// ---------------------------------------------------------------
// MAPA VISUAL DAS MESAS
// ---------------------------------------------------------------
async function carregarMapa() {
  const { dados } = await api("/mesas/mapa");
  const mapa = $("#mapa");
  mapa.innerHTML = "";

  dados.forEach((mesa) => {
    const botao = document.createElement("button");
    botao.className = `mesa ${mesa.status}`;
    botao.innerHTML = `
      <div class="num">Mesa ${mesa.numero}</div>
      <div class="info">${mesa.capacidade} lugares</div>
      <div class="info">${mesa.localizacao}</div>
    `;
    botao.onclick = () => abrirModalMesa(mesa);
    mapa.appendChild(botao);
  });
}

// Preenche o <select> de mesas do formulário.
async function carregarSelectMesas() {
  const { dados } = await api("/mesas");
  const select = $("#numeroMesa");
  select.innerHTML = '<option value="">Selecione...</option>';
  dados.forEach((mesa) => {
    const opt = document.createElement("option");
    opt.value = mesa.numero;
    opt.textContent = `Mesa ${mesa.numero} (${mesa.capacidade} lugares, ${mesa.localizacao})`;
    select.appendChild(opt);
  });
}

// ---------------------------------------------------------------
// MODAL ao clicar numa mesa
// ---------------------------------------------------------------
function abrirModalMesa(mesa) {
  const corpo = $("#modalCorpo");
  const statusTexto = {
    disponivel: "🟢 Disponível",
    reservado: "🟡 Reservado",
    ocupado: "🔴 Ocupado",
  }[mesa.status];

  let html = `
    <h3>Mesa ${mesa.numero}</h3>
    <p><strong>Status:</strong> ${statusTexto}</p>
    <p><strong>Capacidade:</strong> ${mesa.capacidade} pessoas</p>
    <p><strong>Localização:</strong> ${mesa.localizacao}</p>
  `;

  if (mesa.reserva) {
    html += `
      <hr style="margin:12px 0" />
      <p><strong>Cliente:</strong> ${mesa.reserva.nomeCliente}</p>
      <p><strong>Pessoas:</strong> ${mesa.reserva.quantidadePessoas}</p>
      <p><strong>Início:</strong> ${formatarData(mesa.reserva.dataHoraInicio)}</p>
    `;
  } else {
    // mesa livre: oferece reservar (preenche a mesa no formulário)
    html += `<button id="btnReservarMesa">Reservar esta mesa</button>`;
  }

  corpo.innerHTML = html;
  $("#modal").classList.remove("oculto");

  const btn = $("#btnReservarMesa");
  if (btn) {
    btn.onclick = () => {
      $("#numeroMesa").value = mesa.numero;
      fecharModal();
      $("#nomeCliente").focus();
      window.scrollTo({ top: 300, behavior: "smooth" });
    };
  }
}

function fecharModal() {
  $("#modal").classList.add("oculto");
}

// ---------------------------------------------------------------
// LISTA DE RESERVAS (com filtros)
// ---------------------------------------------------------------
async function carregarReservas() {
  const params = new URLSearchParams();
  if ($("#filtroCliente").value) params.append("cliente", $("#filtroCliente").value);
  if ($("#filtroMesa").value) params.append("mesa", $("#filtroMesa").value);
  if ($("#filtroData").value) params.append("data", $("#filtroData").value);
  if ($("#filtroStatus").value) params.append("status", $("#filtroStatus").value);

  const { dados } = await api("/reservas?" + params.toString());
  const tbody = $("#tabelaReservas tbody");
  tbody.innerHTML = "";

  if (dados.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#888">Nenhuma reserva encontrada.</td></tr>';
    return;
  }

  dados.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nomeCliente}</td>
      <td>${r.contatoCliente}</td>
      <td>${r.numeroMesa}</td>
      <td>${r.quantidadePessoas}</td>
      <td>${formatarData(r.dataHoraInicio)}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td class="acoes">
        <button class="btn-editar" data-id="${r._id}">Editar</button>
        ${
          r.status !== "cancelado"
            ? `<button class="btn-cancelar" data-id="${r._id}">Cancelar</button>`
            : ""
        }
        <button class="btn-excluir" data-id="${r._id}">Excluir</button>
      </td>
    `;
    // guarda a reserva inteira no elemento para a edição
    tr.querySelector(".btn-editar").onclick = () => editarReserva(r);
    const btnCancelar = tr.querySelector(".btn-cancelar");
    if (btnCancelar) btnCancelar.onclick = () => cancelarReserva(r._id);
    tr.querySelector(".btn-excluir").onclick = () => excluirReserva(r._id);
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------------
// CRIAR / ATUALIZAR (o mesmo formulário faz os dois)
// ---------------------------------------------------------------
async function salvarReserva(evento) {
  evento.preventDefault();
  const id = $("#reservaId").value;

  const dados = {
    nomeCliente: $("#nomeCliente").value,
    contatoCliente: $("#contatoCliente").value,
    numeroMesa: Number($("#numeroMesa").value),
    quantidadePessoas: Number($("#quantidadePessoas").value),
    dataHoraInicio: $("#dataHoraInicio").value,
    duracaoMinutos: Number($("#duracaoMinutos").value) || 90,
    observacoes: $("#observacoes").value,
  };

  try {
    if (id) {
      // PUT = atualização
      await api(`/reservas/${id}`, { method: "PUT", body: JSON.stringify(dados) });
      mostrarMensagem("Reserva atualizada com sucesso!");
    } else {
      // POST = criação
      await api("/reservas", { method: "POST", body: JSON.stringify(dados) });
      mostrarMensagem("Reserva criada com sucesso!");
    }
    resetarFormulario();
    await recarregarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}

function editarReserva(r) {
  $("#reservaId").value = r._id;
  $("#nomeCliente").value = r.nomeCliente;
  $("#contatoCliente").value = r.contatoCliente;
  $("#numeroMesa").value = r.numeroMesa;
  $("#quantidadePessoas").value = r.quantidadePessoas;
  // converte ISO -> formato do input datetime-local
  $("#dataHoraInicio").value = paraInputDateTime(r.dataHoraInicio);
  $("#duracaoMinutos").value = r.duracaoMinutos || 90;
  $("#observacoes").value = r.observacoes || "";

  $("#tituloForm").textContent = "Editar Reserva";
  $("#btnSalvar").textContent = "Atualizar reserva";
  $("#btnCancelarEdicao").classList.remove("oculto");
  window.scrollTo({ top: 300, behavior: "smooth" });
}

function resetarFormulario() {
  $("#formReserva").reset();
  $("#reservaId").value = "";
  $("#duracaoMinutos").value = 90;
  $("#tituloForm").textContent = "Nova Reserva";
  $("#btnSalvar").textContent = "Salvar reserva";
  $("#btnCancelarEdicao").classList.add("oculto");
}

async function cancelarReserva(id) {
  if (!confirm("Deseja realmente cancelar esta reserva?")) return;
  try {
    await api(`/reservas/${id}/cancelar`, { method: "PATCH" });
    mostrarMensagem("Reserva cancelada.");
    await recarregarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}

async function excluirReserva(id) {
  if (!confirm("Excluir esta reserva definitivamente?")) return;
  try {
    await api(`/reservas/${id}`, { method: "DELETE" });
    mostrarMensagem("Reserva removida.");
    await recarregarTudo();
  } catch (erro) {
    mostrarMensagem(erro.message, "erro");
  }
}

// ---------------------------------------------------------------
// UTILITÁRIOS de data
// ---------------------------------------------------------------
function formatarData(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Converte ISO para o formato exigido pelo input datetime-local (yyyy-MM-ddTHH:mm)
function paraInputDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------
// Recarrega mapa + lista de uma vez
// ---------------------------------------------------------------
async function recarregarTudo() {
  await Promise.all([carregarMapa(), carregarReservas()]);
}

// ---------------------------------------------------------------
// EVENTOS (ligados quando a página carrega)
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  $("#formReserva").addEventListener("submit", salvarReserva);
  $("#btnCancelarEdicao").addEventListener("click", resetarFormulario);
  $("#btnFiltrar").addEventListener("click", carregarReservas);
  $("#btnLimpar").addEventListener("click", () => {
    $("#filtroCliente").value = "";
    $("#filtroMesa").value = "";
    $("#filtroData").value = "";
    $("#filtroStatus").value = "";
    carregarReservas();
  });
  $("#fecharModal").addEventListener("click", fecharModal);
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") fecharModal(); // clicar fora fecha
  });

  await carregarSelectMesas();
  await recarregarTudo();
});
