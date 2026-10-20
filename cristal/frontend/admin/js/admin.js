// Funções compartilhadas do painel administrativo:
// autenticação (token JWT salvo no localStorage), chamadas autenticadas
// à API, e montagem do menu lateral.

const ADMIN_TOKEN_KEY = 'cristal_admin_token';
const ADMIN_INFO_KEY = 'cristal_admin_info';

function obterTokenAdmin() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function salvarSessaoAdmin(token, admin) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin));
}

function obterAdminLogado() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_INFO_KEY));
  } catch (e) {
    return null;
  }
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
  window.location.href = 'login.html';
}

// Redireciona para o login se não houver token. Chame no topo de cada
// página protegida do painel (dashboard, produtos, pedidos, financeiro).
function exigirLoginAdmin() {
  if (!obterTokenAdmin()) {
    window.location.href = 'login.html';
  }
}

// Wrapper de fetch que já inclui o header Authorization e trata 401
// (token expirado ou inválido) redirecionando para o login novamente.
async function apiFetchAdmin(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      Authorization: `Bearer ${obterTokenAdmin()}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    logoutAdmin();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    /* sem corpo */
  }

  if (!response.ok) {
    throw new Error((data && data.error) || 'Erro ao comunicar com o servidor.');
  }

  return data;
}

// Monta o menu lateral e marca o item ativo com base no nome do arquivo atual.
// Também injeta a barra superior mobile (com botão hambúrguer) que abre o
// menu como uma gaveta lateral em telas pequenas.
const ICONES_SIDEBAR_ADMIN = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  produtos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7 12 3 4 7v10l8 4 8-4Z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/></svg>',
  categorias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  frete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>',
  pedidos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h9l3 3v17H6z"/><path d="M15 2v3h3"/><path d="M9 11h6M9 15h6"/></svg>',
  financeiro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
  'conteudo-imagens': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
};

function montarSidebarAdmin(paginaAtiva) {
  const admin = obterAdminLogado();
  const itens = [
    { href: 'dashboard.html', label: 'Dashboard', chave: 'dashboard' },
    { href: 'produtos.html', label: 'Produtos', chave: 'produtos' },
    { href: 'categorias.html', label: 'Categorias', chave: 'categorias' },
    { href: 'pedidos.html', label: 'Pedidos', chave: 'pedidos' },
    { href: 'financeiro.html', label: 'Financeiro', chave: 'financeiro' },
    { href: 'frete.html', label: 'Fretes', chave: 'frete' },
    { href: 'conteudo-imagens.html', label: 'Imagens do site', chave: 'conteudo-imagens' },
  ];

  const nav = document.getElementById('admin-nav');
  if (!nav) return;

  nav.innerHTML = itens
    .map(
      (item) => `
      <li>
        <a href="${item.href}" class="${item.chave === paginaAtiva ? 'ativo' : ''}">${ICONES_SIDEBAR_ADMIN[item.chave] || ''}<span>${item.label}</span></a>
      </li>
    `
    )
    .join('');

  const nomeEl = document.getElementById('admin-nome');
  if (nomeEl && admin) nomeEl.textContent = admin.nome;

  const btnSair = document.getElementById('btn-sair');
  if (btnSair) btnSair.addEventListener('click', logoutAdmin);

  injetarMenuMobileAdmin();
  injetarSininhoNotificacoes();
}

// ---------- Notificação de novo pedido ----------
//
// Fica de olho a cada 20 segundos se chegou algum pedido novo desde a
// última vez que o admin olhou — sem precisar recarregar a página. Quando
// encontra, mostra um sininho com contador e (se o navegador permitir) uma
// notificação nativa do sistema operacional.

const CHAVE_ULTIMA_VERIFICACAO = 'cristal_admin_ultima_verificacao_pedidos';

function injetarSininhoNotificacoes() {
  if (document.getElementById('sininho-notificacoes')) return; // já existe

  const rodape = document.querySelector('.admin-sidebar__rodape');
  if (!rodape) return;

  const sininho = document.createElement('button');
  sininho.id = 'sininho-notificacoes';
  sininho.type = 'button';
  sininho.title = 'Notificações de novos pedidos';
  sininho.innerHTML = `Notificações <span id="contador-notificacoes" style="display:none;"></span>`;
  sininho.style.cssText = 'position:relative; background:none; border:1.5px solid var(--cor-linha); border-radius:8px; padding:8px 12px; cursor:pointer; font-size:1rem; width:100%; margin-bottom:10px; text-align:left;';
  rodape.insertBefore(sininho, rodape.firstChild);

  const painel = document.createElement('div');
  painel.id = 'painel-notificacoes';
  painel.style.cssText = 'display:none; background:#fff; border:1px solid var(--cor-linha); border-radius:8px; padding:10px; margin-bottom:10px; max-height:260px; overflow-y:auto; font-size:0.85rem;';
  rodape.insertBefore(painel, sininho.nextSibling);

  if (!localStorage.getItem(CHAVE_ULTIMA_VERIFICACAO)) {
    localStorage.setItem(CHAVE_ULTIMA_VERIFICACAO, new Date().toISOString());
  }

  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  let ultimoNumeroNotificado = null;

  async function verificarNovosPedidos() {
    try {
      const desde = localStorage.getItem(CHAVE_ULTIMA_VERIFICACAO);
      const novos = await apiFetchAdmin(`/pedidos/admin/novos?desde=${encodeURIComponent(desde)}`);

      const contador = document.getElementById('contador-notificacoes');
      if (novos.length > 0) {
        contador.textContent = novos.length;
        contador.style.cssText = 'display:inline-block; background:var(--cor-erro); color:#fff; border-radius:999px; padding:1px 7px; font-size:0.72rem; font-weight:700; margin-left:6px;';

        painel.innerHTML = novos.map((p) => `
          <div style="padding:8px 0; border-bottom:1px solid var(--cor-linha);">
            <strong>${escapeHtml(p.numero_pedido)}</strong><br>
            ${escapeHtml(p.cliente_nome)} — ${formatarPreco(p.total)}<br>
            <span class="${classeBadgeStatus(p.status)}" style="font-size:0.7rem;">${escapeHtml(p.status)}</span>
          </div>
        `).join('');

        // Notificação nativa do sistema, só uma vez por pedido (controlado
        // em memória) — sem isso, ela dispararia de novo a cada 20s
        // enquanto o pedido continuasse "não visto".
        const maisRecente = novos[0];
        if (window.Notification && Notification.permission === 'granted' && maisRecente.numero_pedido !== ultimoNumeroNotificado) {
          ultimoNumeroNotificado = maisRecente.numero_pedido;
          new Notification('Novo pedido na Cristal Floricultura', {
            body: `${maisRecente.cliente_nome} — ${formatarPreco(maisRecente.total)} (${maisRecente.status})`,
          });
        }
      } else {
        contador.style.display = 'none';
        painel.innerHTML = `<p class="texto-suave" style="padding:8px 0;">Nenhum pedido novo.</p>`;
      }
    } catch (err) {
      // Falha silenciosa — não queremos que um erro de rede aqui interrompa o resto do admin.
    }
  }

  sininho.addEventListener('click', () => {
    const abrindo = painel.style.display === 'none';
    painel.style.display = abrindo ? 'block' : 'none';
    if (abrindo) {
      // Marca como "visto" — limpa o contador e avança o relógio de
      // referência, pra esses pedidos não contarem de novo depois.
      localStorage.setItem(CHAVE_ULTIMA_VERIFICACAO, new Date().toISOString());
      document.getElementById('contador-notificacoes').style.display = 'none';
    }
  });

  verificarNovosPedidos();
  setInterval(verificarNovosPedidos, 20000);
}

// Cria (se ainda não existir) a barra superior mobile e o fundo escurecido,
// e liga o botão de abrir/fechar o menu lateral no celular.
function injetarMenuMobileAdmin() {
  const shell = document.querySelector('.admin-shell');
  const sidebar = document.querySelector('.admin-sidebar');
  if (!shell || !sidebar || document.querySelector('.admin-topbar-mobile')) return;

  const topbar = document.createElement('div');
  topbar.className = 'admin-topbar-mobile';
  topbar.innerHTML = `
    <div class="admin-topbar-mobile__logo">
      <img src="../assets/logo.png" alt="Logo Cristal Floricultura">
      <span>Cristal Floricultura Admin</span>
    </div>
    <button type="button" class="admin-menu-toggle" aria-label="Abrir menu"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
  `;
  shell.insertBefore(topbar, shell.firstChild);

  const fundo = document.createElement('div');
  fundo.className = 'admin-sidebar-fundo';
  shell.appendChild(fundo);

  function abrirMenu() {
    sidebar.classList.add('aberta');
    fundo.classList.add('visivel');
  }
  function fecharMenu() {
    sidebar.classList.remove('aberta');
    fundo.classList.remove('visivel');
  }

  topbar.querySelector('.admin-menu-toggle').addEventListener('click', abrirMenu);
  fundo.addEventListener('click', fecharMenu);
  sidebar.querySelectorAll('a').forEach((a) => a.addEventListener('click', fecharMenu));
}

function classeBadgeStatus(status) {
  return `badge badge-${status}`;
}
