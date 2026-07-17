/* =========================================================================
   GUERRAS BÍBLICAS — Draft estilo "7a0"
   ---------------------------------------------------------------------
   Monte um time (General, Guerreiro, Exército) escolhendo 1 de 3 cartas
   sorteadas por rodada, depois enfrente uma campanha de 5 guerras
   bíblicas sorteadas. Perder uma guerra = fim de jogo na hora.

   Todos os dados (personagens e guerras) vêm de duas abas do Google
   Sheets publicadas como TSV. Nada de conteúdo fica fixo no código,
   exceto os textos de relato/resultado.

   Para plugar no seu site:
   1. Ajuste GW_SHEET_PERSONAGENS_GID e GW_SHEET_GUERRAS_GID abaixo com
      o "gid" de cada aba (Arquivo → Compartilhar → Publicar na Web).
   2. Inclua este arquivo depois do script do quiz (ele reaproveita
      window.fetchSheet e window.escHtml se existirem).
   3. Chame window.abrirGuerrasBiblicas() a partir de um botão do seu site.
   ========================================================================= */

/* ------------------------------ CONFIG ---------------------------------- */

// URLs fixas: essa planilha é um documento próprio, diferente do SHEET_BASE
// do site (por isso não reaproveitamos a variável global aqui).
const GW_SHEET_PERSONAGENS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=643844560&single=true&output=tsv';
const GW_SHEET_GUERRAS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1733993415&single=true&output=tsv';

const GW_POSITIONS = ['general', 'guerreiro', 'exercito'];

const GW_POSITION_LABEL = {
  general:   { nome: 'General',   emoji: '⚔️' },
  guerreiro: { nome: 'Guerreiro', emoji: '🛡️' },
  exercito:  { nome: 'Exército',  emoji: '🏹' },
};

const GW_WAR_COUNT = 5;
const GW_SPECIALTY_BONUS_PCT = 0.20;   // especialidade bate com tipo_de_batalha -> +20%
const GW_WEAKNESS_PENALTY_PCT = 0.20;  // fraqueza bate com tipo_de_batalha -> -20%
const GW_RANDOM_JITTER_PCT = 0.08;     // pequena aleatoriedade: até ±8% no poder final
const GW_BATTLE_SIM_MIN_MS = 2000;     // duração mínima da animação de batalha
const GW_BATTLE_SIM_MAX_MS = 4000;     // duração máxima da animação de batalha

const GW_BEST_KEY = 'gwBestGuerrasVencidas';

/* Textos de relato — únicos dados "fixos" no código, conforme o combinado. */
const GW_NARRATIVE = {
  vitoriaMeio: [
    'As tropas avançam e o inimigo recua.',
    'Mais uma vitória para a campanha!',
    'O terreno tremeu, mas o time se manteve firme.',
  ],
  derrota: [
    'A linha de frente cedeu. A campanha termina aqui.',
    'O exército inimigo foi forte demais desta vez.',
    'Não foi possível superar essa guerra.',
  ],
  terraPrometida: 'A campanha foi vencida — o time chegou à Terra Prometida!',
};

/* ------------------------------ HELPERS ---------------------------------- */

const gwFetchSheet = window.fetchSheet || (async function (url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const text = await r.text();
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t');
      const obj = {};
      headers.forEach((h, j) => { obj[h] = (cells[j] !== undefined ? cells[j] : '').trim(); });
      if (Object.values(obj).some(v => v !== '')) rows.push(obj);
    }
    return rows;
  } catch (e) { console.error(e); return []; }
});

const gwEscHtml = window.escHtml || function (s) {
  return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
};

function gwNormKey(k) {
  return k.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_');
}
function gwNormalizeRow(row) {
  const out = {};
  Object.keys(row).forEach(k => { out[gwNormKey(k)] = row[k]; });
  return out;
}
function gwStrip(v) {
  return (v || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function gwNormCategoria(v) {
  const n = gwStrip(v);
  if (n.startsWith('general')) return 'general';
  if (n.startsWith('exercito')) return 'exercito';
  if (n.startsWith('guerreiro') || n.startsWith('heroi')) return 'guerreiro';
  return null;
}
function gwNormDificuldade(v) {
  const n = gwStrip(v);
  if (n.startsWith('medio')) return 'medio';
  if (n.startsWith('dificil')) return 'dificil';
  return 'facil';
}
function gwNum(v, fallback) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}
function gwShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function gwPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function gwRarity(overall) {
  if (overall >= 90) return { label: 'Lendário', cls: 'lendario' };
  if (overall >= 80) return { label: 'Épico', cls: 'epico' };
  if (overall >= 65) return { label: 'Raro', cls: 'raro' };
  return { label: 'Comum', cls: 'comum' };
}

function gwGetBest() {
  const v = parseInt(localStorage.getItem(GW_BEST_KEY) || '0', 10);
  return isNaN(v) ? 0 : v;
}
function gwSaveBest(n) {
  const best = gwGetBest();
  if (n > best) { localStorage.setItem(GW_BEST_KEY, String(n)); return true; }
  return false;
}

/* ------------------------------ CSS --------------------------------------- */

const GW_CSS = `
.gw-overlay{position:fixed;inset:0;background:rgba(10,9,7,.85);backdrop-filter:blur(6px);z-index:500;display:none;align-items:center;justify-content:center;padding:20px}
.gw-overlay.open{display:flex}
.gw-box{background:linear-gradient(180deg,#1c1a17,#100f0d);width:100%;max-width:800px;max-height:92vh;overflow-y:auto;border-radius:14px;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.55);border:1px solid rgba(169,134,58,.25)}
.gw-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#f1ece1;font-size:16px;cursor:pointer;z-index:5}
.gw-close:hover{background:rgba(255,255,255,.16)}
.gw-body{padding:44px 36px 36px;color:#f1ece1;font-family:var(--sans,sans-serif)}
@media(max-width:600px){.gw-body{padding:56px 20px 26px}}
.gw-eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold,#c9a24a);font-weight:600;margin-bottom:10px;text-align:center}
.gw-title{font-size:clamp(24px,4vw,36px);font-weight:700;margin-bottom:12px;text-align:center;color:#fff}
.gw-desc{font-size:14px;color:#c9c4b8;font-weight:300;line-height:1.7;max-width:480px;margin:0 auto 26px;text-align:center}
.gw-positions-preview{display:flex;justify-content:center;gap:14px;margin-bottom:28px;flex-wrap:wrap}
.gw-pos-chip{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:10px;padding:12px 18px;text-align:center;min-width:100px}
.gw-pos-chip .emoji{font-size:22px;display:block;margin-bottom:4px}
.gw-pos-chip .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8}
.gw-record{font-size:12px;color:var(--gold,#c9a24a);font-weight:600;text-align:center;margin-bottom:20px}
.gw-btn{background:var(--accent,#7a2e2e);color:#fff;border:none;padding:13px 30px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:var(--sans,sans-serif);display:block;margin:0 auto}
.gw-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.gw-btn-secondary{background:rgba(255,255,255,.06);color:#e8e3d8;border:1px solid rgba(255,255,255,.16)}
.gw-loading,.gw-empty{text-align:center;padding:60px 20px;color:#c9c4b8;font-size:14px}
.gw-round-label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#c9a24a);font-weight:600;text-align:center;margin-bottom:6px}
.gw-round-sub{font-size:13px;color:#c9c4b8;text-align:center;margin-bottom:24px}
.gw-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:640px){.gw-cards{grid-template-columns:1fr}}
.gw-card{border-radius:14px;padding:18px 16px;cursor:pointer;text-align:left;transition:transform .15s,box-shadow .15s;border:1px solid rgba(255,255,255,.14);background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.01));position:relative;overflow:hidden}
.gw-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.4)}
.gw-card.comum{border-color:rgba(255,255,255,.14)}
.gw-card.raro{border-color:rgba(201,162,74,.55)}
.gw-card.epico{border-color:rgba(122,46,46,.7);box-shadow:0 0 0 1px rgba(122,46,46,.25) inset}
.gw-card.lendario{border-color:var(--gold,#c9a24a);box-shadow:0 0 24px rgba(201,162,74,.35)}
.gw-card-rarity{font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:8px;display:inline-block}
.gw-card.comum .gw-card-rarity{color:#9a9689}
.gw-card.raro .gw-card-rarity{color:var(--gold,#c9a24a)}
.gw-card.epico .gw-card-rarity{color:#e08c8c}
.gw-card.lendario .gw-card-rarity{color:var(--gold,#c9a24a)}
.gw-card-pos{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8;margin-bottom:6px}
.gw-card-name{font-size:17px;font-weight:700;color:#fff;margin-bottom:10px;line-height:1.25}
.gw-card-overall{font-size:34px;font-weight:800;color:var(--gold,#c9a24a);margin-bottom:10px;line-height:1}
.gw-card-attr{font-size:11px;color:#c9c4b8;margin-bottom:3px}
.gw-card-attr b{color:#e8e3d8;font-weight:600}
.gw-card.disabled{opacity:.32;cursor:not-allowed;filter:grayscale(70%)}
.gw-card.disabled:hover{transform:none;box-shadow:none}
.gw-card-filled-badge{position:absolute;top:10px;right:10px;font-size:8px;text-transform:uppercase;letter-spacing:.05em;background:rgba(0,0,0,.55);color:#e8e3d8;padding:3px 8px;border-radius:6px}
.gw-group-label{text-align:center;font-size:12px;color:#c9c4b8;margin-bottom:20px}
.gw-group-label b{color:var(--gold,#c9a24a)}
.gw-reroll-wrap{text-align:center;margin-top:18px}
.gw-battle-sim{text-align:center;padding:36px 0 16px}
.gw-battle-sim-label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#c9c4b8;margin-bottom:26px}
.gw-battlefield{position:relative;height:64px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12)}
.gw-army{position:absolute;top:0;bottom:0}
.gw-army.player{left:0;background:linear-gradient(90deg,rgba(201,162,74,.18),rgba(201,162,74,.6));animation:gwArmyPlayer 1.05s ease-in-out infinite alternate}
.gw-army.enemy{right:0;background:linear-gradient(270deg,rgba(122,46,46,.22),rgba(122,46,46,.65));animation:gwArmyEnemy 1.05s ease-in-out infinite alternate}
.gw-clash-line{position:absolute;top:0;bottom:0;width:3px;background:#fff;box-shadow:0 0 14px rgba(255,255,255,.65);animation:gwClash 1.05s ease-in-out infinite alternate}
@keyframes gwArmyPlayer{from{width:44%}to{width:59%}}
@keyframes gwArmyEnemy{from{width:44%}to{width:59%}}
@keyframes gwClash{from{left:43%}to{left:59%}}
.gw-team{display:flex;flex-direction:column;gap:12px;margin-bottom:26px}
.gw-team-row{display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px 18px;background:rgba(255,255,255,.03)}
.gw-team-row .emoji{font-size:26px}
.gw-team-row .info{flex:1}
.gw-team-row .pos{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8}
.gw-team-row .name{font-size:16px;font-weight:700;color:#fff}
.gw-team-row .overall{font-size:22px;font-weight:800;color:var(--gold,#c9a24a)}
.gw-war-card{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:26px 24px;text-align:center;margin-bottom:22px;background:rgba(255,255,255,.03)}
.gw-war-name{font-size:20px;font-weight:700;color:#fff;margin-bottom:8px}
.gw-war-meta{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;font-size:12px;color:#c9c4b8;margin-bottom:4px}
.gw-war-meta b{color:var(--gold,#c9a24a)}
.gw-progress-dots{display:flex;justify-content:center;gap:8px;margin-bottom:22px}
.gw-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.15)}
.gw-dot.done{background:var(--gold,#c9a24a)}
.gw-dot.active{background:var(--accent,#7a2e2e);box-shadow:0 0 0 3px rgba(122,46,46,.3)}
.gw-battle-result{text-align:center;padding:10px 0 20px}
.gw-battle-emoji{font-size:48px;margin-bottom:10px}
.gw-battle-title{font-size:20px;font-weight:700;margin-bottom:8px}
.gw-battle-title.win{color:#7fd28e}
.gw-battle-title.lose{color:#e08c8c}
.gw-battle-diff{font-size:13px;color:#c9c4b8;margin-bottom:6px}
.gw-battle-narr{font-size:13px;color:#c9c4b8;font-weight:300;max-width:420px;margin:0 auto 22px}
.gw-power-bars{display:flex;flex-direction:column;gap:10px;max-width:360px;margin:0 auto 20px}
.gw-power-row{display:flex;align-items:center;gap:10px;font-size:11px;color:#c9c4b8}
.gw-power-row .lbl{width:70px;text-align:right;flex-shrink:0}
.gw-power-track{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.gw-power-fill{height:100%;border-radius:4px}
.gw-power-fill.player{background:var(--gold,#c9a24a)}
.gw-power-fill.enemy{background:var(--accent,#7a2e2e)}
.gw-power-val{width:40px;flex-shrink:0;font-weight:700;color:#fff}
.gw-final{text-align:center;padding:10px 0}
.gw-final-emoji{font-size:56px;margin-bottom:12px}
.gw-final-title{font-size:24px;font-weight:700;color:#fff;margin-bottom:6px}
.gw-final-sub{font-size:13px;color:#c9c4b8;font-weight:300;margin-bottom:22px}
.gw-final-newrecord{font-size:13px;font-weight:700;color:var(--gold,#c9a24a);margin-bottom:10px}
.gw-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px}
`;

/* ------------------------------ STATE --------------------------------------- */

let _gwCache = null; // { personagens: [...], guerras: [...], groups: [...] }

let _gwState = {
  team: {},            // { general: card, guerreiro: card, exercito: card }
  usedGroupIds: new Set(), // grupos já escolhidos (descartados após uma carta ser selecionada deles)
  currentGroup: null,      // grupo { id, general, guerreiro, exercito } exibido na rodada atual
  rerollUsed: false,       // resort de grupo: 1 vez por partida inteira
  wars: [],
  warIndex: 0,
  warsWon: 0,
  lastBattle: null,
};

/* ------------------------------ DOM SETUP ----------------------------------- */

function gwEnsureDom() {
  if (document.getElementById('gwOverlay')) return;
  const style = document.createElement('style');
  style.textContent = GW_CSS;
  document.head.appendChild(style);
  const div = document.createElement('div');
  div.id = 'gwOverlay';
  div.className = 'gw-overlay';
  div.innerHTML = '<div class="gw-box"><button class="gw-close" onclick="gwClose()">✕</button><div class="gw-body" id="gwBody"></div></div>';
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target === div) gwClose(); });
}

/* ------------------------------ INTRO ---------------------------------------- */

function gwRenderIntro() {
  const body = document.getElementById('gwBody');
  const best = gwGetBest();
  const chips = GW_POSITIONS.map(p => `<div class="gw-pos-chip"><span class="emoji">${GW_POSITION_LABEL[p].emoji}</span><span class="label">${GW_POSITION_LABEL[p].nome}</span></div>`).join('');
  body.innerHTML = `
    <div class="gw-eyebrow">Draft Bíblico</div>
    <h2 class="gw-title">Guerras Bíblicas</h2>
    <p class="gw-desc">Monte seu time sorteando grupos de 3 heróis (general, guerreiro e exército) e enfrente ${GW_WAR_COUNT} guerras sorteadas. Perder uma guerra encerra a campanha — chegue até a Terra Prometida.</p>
    <div class="gw-positions-preview">${chips}</div>
    ${best > 0 ? `<div class="gw-record">🏅 Seu recorde: ${best} guerra${best === 1 ? '' : 's'} vencida${best === 1 ? '' : 's'}</div>` : ''}
    <button class="gw-btn" onclick="gwStart()">Iniciar Draft</button>
  `;
}

/* ------------------------------ LOAD DATA ------------------------------------ */

async function gwLoadData() {
  if (_gwCache) return _gwCache;
  const [rawPersonagens, rawGuerras] = await Promise.all([
    gwFetchSheet(GW_SHEET_PERSONAGENS_URL),
    gwFetchSheet(GW_SHEET_GUERRAS_URL),
  ]);

  const personagens = rawPersonagens.map(gwNormalizeRow)
    .map(r => ({
      nome: r.nome || '',
      categoria: gwNormCategoria(r.categoria),
      overall: gwNum(r.overall, 50),
      especialidade: r.especialidade || '',
      fraqueza: r.fraqueza || '',
      grupo: (r.grupo || '').trim(),
    }))
    .filter(c => c.nome && c.categoria && c.grupo);

  const guerras = rawGuerras.map(gwNormalizeRow)
    .map(r => ({
      nome: r.nome || '',
      dificuldade: gwNormDificuldade(r.dificuldade),
      tipo_de_batalha: r.tipo_de_batalha || '',
      overall: gwNum(r.overall, 50),
    }))
    .filter(w => w.nome);

  const groups = gwBuildGroups(personagens);

  console.log('[Guerras Bíblicas] personagens válidos:', personagens.length, 'guerras válidas:', guerras.length, 'grupos completos:', groups.length);
  _gwCache = { personagens, guerras, groups };
  return _gwCache;
}

// Agrupa personagens pelo campo "grupo". Só mantém grupos com os 3 papéis completos
// (general + guerreiro + exército) — grupos incompletos são ignorados e avisados no console.
function gwBuildGroups(personagens) {
  const map = {};
  personagens.forEach(c => {
    if (!map[c.grupo]) map[c.grupo] = { id: c.grupo, general: null, guerreiro: null, exercito: null };
    map[c.grupo][c.categoria] = c;
  });
  const all = Object.values(map);
  const complete = all.filter(g => g.general && g.guerreiro && g.exercito);
  const incomplete = all.filter(g => !(g.general && g.guerreiro && g.exercito));
  if (incomplete.length) {
    console.warn('[Guerras Bíblicas] grupos incompletos (ignorados):', incomplete.map(g => g.id));
  }
  return complete;
}

/* ------------------------------ DRAFT ----------------------------------------- */

async function gwStart() {
  const body = document.getElementById('gwBody');
  body.innerHTML = '<div class="gw-loading">Convocando os personagens…</div>';
  const data = await gwLoadData();

  if (!data.personagens.length || !data.guerras.length || !data.groups.length) {
    body.innerHTML = `<div class="gw-empty">Não foi possível carregar os dados.<br><br>
      Verifique se as abas <b>personagens</b> (colunas: nome, categoria, overall, especialidade, fraqueza, grupo)
      e <b>guerras</b> (colunas: nome, dificuldade, tipo_de_batalha, overall) estão publicadas na web,
      e se cada <b>grupo</b> tem exatamente 1 general, 1 guerreiro e 1 exército.
      Veja o console (F12) para detalhes.</div>`;
    return;
  }

  _gwState = {
    team: {},
    usedGroupIds: new Set(),
    currentGroup: null,
    rerollUsed: false,
    wars: [],
    warIndex: 0,
    warsWon: 0,
    lastBattle: null,
  };

  gwRenderDraftRound();
}

function gwEmptyPositions() {
  return GW_POSITIONS.filter(p => !_gwState.team[p]);
}

// Sorteia um grupo ainda não usado (e opcionalmente diferente de excludeId,
// usado no resort para não repetir imediatamente o mesmo grupo).
function gwDrawGroup(excludeId) {
  const empty = gwEmptyPositions();
  const pool = _gwCache.groups.filter(g =>
    !_gwState.usedGroupIds.has(g.id) &&
    g.id !== excludeId &&
    empty.some(pos => g[pos])
  );
  return pool.length ? gwPick(pool) : null;
}

function gwRenderDraftRound() {
  const empty = gwEmptyPositions();
  if (!empty.length) { gwRenderTeamSummary(); return; }

  if (!_gwState.currentGroup) {
    _gwState.currentGroup = gwDrawGroup();
  }
  const group = _gwState.currentGroup;

  if (!group) {
    const body = document.getElementById('gwBody');
    body.innerHTML = `<div class="gw-empty">Não há mais grupos disponíveis para completar o time.<br>
      Adicione mais grupos completos (general + guerreiro + exército) na planilha.</div>`;
    return;
  }

  const roundNum = GW_POSITIONS.length - empty.length + 1;
  const cardsHtml = GW_POSITIONS.map(pos => {
    const card = group[pos];
    const filled = !!_gwState.team[pos];
    const rarity = gwRarity(card.overall);
    const clickAttr = filled ? '' : ` onclick="gwPickCard('${pos}')"`;
    return `<div class="gw-card ${rarity.cls}${filled ? ' disabled' : ''}"${clickAttr}>
      ${filled ? '<div class="gw-card-filled-badge">Posição já preenchida</div>' : ''}
      <span class="gw-card-rarity">${rarity.label}</span>
      <div class="gw-card-pos">${GW_POSITION_LABEL[pos].emoji} ${GW_POSITION_LABEL[pos].nome}</div>
      <div class="gw-card-name">${gwEscHtml(card.nome)}</div>
      <div class="gw-card-overall">${card.overall}</div>
      <div class="gw-card-attr"><b>Especialidade:</b> ${gwEscHtml(card.especialidade) || '—'}</div>
      <div class="gw-card-attr"><b>Fraqueza:</b> ${gwEscHtml(card.fraqueza) || '—'}</div>
    </div>`;
  }).join('');

  const canReroll = !_gwState.rerollUsed;
  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-round-label">Rodada ${roundNum} de ${GW_POSITIONS.length}</div>
    <div class="gw-group-label">Grupo sorteado: <b>${gwEscHtml(group.id)}</b></div>
    <div class="gw-cards">${cardsHtml}</div>
    <div class="gw-reroll-wrap">
      ${canReroll ? `<button class="gw-btn gw-btn-secondary" onclick="gwRerollGroup()">🎲 Sortear outro grupo (1x por partida)</button>` : ''}
    </div>
  `;
}

function gwPickCard(pos) {
  const group = _gwState.currentGroup;
  if (!group) return;
  const card = group[pos];
  if (!card || _gwState.team[pos]) return;
  _gwState.team[pos] = card;
  _gwState.usedGroupIds.add(group.id);
  _gwState.currentGroup = null;
  gwRenderDraftRound();
}

function gwRerollGroup() {
  if (_gwState.rerollUsed || !_gwState.currentGroup) return;
  _gwState.rerollUsed = true;
  const prevId = _gwState.currentGroup.id;
  _gwState.currentGroup = gwDrawGroup(prevId);
  gwRenderDraftRound();
}

/* ------------------------------ TEAM SUMMARY ----------------------------------- */

function gwRenderTeamSummary() {
  const rows = GW_POSITIONS.map(p => {
    const c = _gwState.team[p];
    return `<div class="gw-team-row">
      <span class="emoji">${GW_POSITION_LABEL[p].emoji}</span>
      <div class="info">
        <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
        <div class="name">${gwEscHtml(c.nome)}</div>
      </div>
      <div class="overall">${c.overall}</div>
    </div>`;
  }).join('');

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-eyebrow">Time montado</div>
    <h2 class="gw-title">Pronto para a campanha</h2>
    <div class="gw-team">${rows}</div>
    <button class="gw-btn" onclick="gwStartCampaign()">Começar Campanha</button>
  `;
}

/* ------------------------------ CAMPAIGN / BATTLES ------------------------------ */

function gwStartCampaign() {
  const wars = gwShuffle(_gwCache.guerras).slice(0, GW_WAR_COUNT);
  _gwState.wars = wars;
  _gwState.warIndex = 0;
  _gwState.warsWon = 0;
  gwRenderWar();
}

function gwRenderWar() {
  const st = _gwState;
  const war = st.wars[st.warIndex];
  if (!war) { gwRenderFinal(true); return; }

  const dots = st.wars.map((w, i) => {
    const cls = i < st.warIndex ? 'done' : i === st.warIndex ? 'active' : '';
    return `<span class="gw-dot ${cls}"></span>`;
  }).join('');

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-round-label">Guerra ${st.warIndex + 1} de ${st.wars.length}</div>
    <div class="gw-progress-dots">${dots}</div>
    <div class="gw-war-card">
      <div class="gw-war-name">${gwEscHtml(war.nome)}</div>
      <div class="gw-war-meta">
        <span>Dificuldade: <b>${gwEscHtml(war.dificuldade)}</b></span>
        <span>Tipo de batalha: <b>${gwEscHtml(war.tipo_de_batalha) || '—'}</b></span>
      </div>
    </div>
    <button class="gw-btn" onclick="gwFight()">⚔️ Lutar</button>
  `;
}

function gwCardContribution(card, war) {
  let mult = 1;
  if (card.especialidade && gwStrip(card.especialidade) === gwStrip(war.tipo_de_batalha)) mult += GW_SPECIALTY_BONUS_PCT;
  if (card.fraqueza && gwStrip(card.fraqueza) === gwStrip(war.tipo_de_batalha)) mult -= GW_WEAKNESS_PENALTY_PCT;
  return card.overall * mult;
}

function gwFight() {
  const st = _gwState;
  const war = st.wars[st.warIndex];

  const contributions = GW_POSITIONS.map(p => gwCardContribution(st.team[p], war));
  const basePower = contributions.reduce((a, b) => a + b, 0);
  const playerJitter = 1 + (Math.random() * 2 - 1) * GW_RANDOM_JITTER_PCT;
  const playerPower = Math.round(basePower * playerJitter);

  const enemyJitter = 1 + (Math.random() * 2 - 1) * GW_RANDOM_JITTER_PCT;
  const enemyPower = Math.round(war.overall * enemyJitter);

  const win = playerPower > enemyPower;
  const diff = playerPower - enemyPower;

  if (win) st.warsWon++;
  st.lastBattle = { war, playerPower, enemyPower, diff, win, contributions };

  gwRenderBattleSimulation();
}

// Tela de "simulação rodando": só efeito visual, o resultado já foi calculado
// acima. Fica de 3 a 5s antes de revelar quem venceu.
function gwRenderBattleSimulation() {
  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-battle-sim">
      <div class="gw-battle-sim-label">⚔️ Simulando a batalha…</div>
      <div class="gw-battlefield">
        <div class="gw-army player"></div>
        <div class="gw-clash-line"></div>
        <div class="gw-army enemy"></div>
      </div>
    </div>
  `;
  const duration = GW_BATTLE_SIM_MIN_MS + Math.random() * (GW_BATTLE_SIM_MAX_MS - GW_BATTLE_SIM_MIN_MS);
  setTimeout(gwRenderBattleResult, duration);
}

function gwRenderBattleResult() {
  const st = _gwState;
  const b = st.lastBattle;
  const maxPower = Math.max(b.playerPower, b.enemyPower, 1);
  const isLastWar = st.warIndex === st.wars.length - 1;

  const narrText = b.win
    ? (isLastWar ? GW_NARRATIVE.terraPrometida : gwPick(GW_NARRATIVE.vitoriaMeio))
    : gwPick(GW_NARRATIVE.derrota);

  const nextLabel = b.win
    ? (isLastWar ? 'Ver resultado final' : 'Próxima guerra')
    : 'Ver resultado final';

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-battle-result">
      <div class="gw-battle-emoji">${b.win ? '🏆' : '💀'}</div>
      <div class="gw-battle-title ${b.win ? 'win' : 'lose'}">${b.win ? 'Vitória!' : 'Derrota'}</div>
      <div class="gw-battle-diff">Diferença de poder: <b>${b.diff > 0 ? '+' : ''}${b.diff}</b></div>
      <p class="gw-battle-narr">${narrText}</p>
      <div class="gw-power-bars">
        <div class="gw-power-row">
          <span class="lbl">Seu time</span>
          <div class="gw-power-track"><div class="gw-power-fill player" style="width:${Math.round(b.playerPower / maxPower * 100)}%"></div></div>
          <span class="gw-power-val">${b.playerPower}</span>
        </div>
        <div class="gw-power-row">
          <span class="lbl">Inimigo</span>
          <div class="gw-power-track"><div class="gw-power-fill enemy" style="width:${Math.round(b.enemyPower / maxPower * 100)}%"></div></div>
          <span class="gw-power-val">${b.enemyPower}</span>
        </div>
      </div>
      <button class="gw-btn" onclick="gwAfterBattle()">${nextLabel}</button>
    </div>
  `;
}

function gwAfterBattle() {
  const st = _gwState;
  if (!st.lastBattle.win) { gwRenderFinal(false); return; }
  st.warIndex++;
  if (st.warIndex >= st.wars.length) { gwRenderFinal(true); return; }
  gwRenderWar();
}

/* ------------------------------ FINAL SCREEN ------------------------------------ */

function gwRenderFinal(reachedPromisedLand) {
  const st = _gwState;
  const isNewRecord = gwSaveBest(st.warsWon);

  const title = reachedPromisedLand ? 'Vocês chegaram à Terra Prometida!' : 'A campanha terminou';
  const emoji = reachedPromisedLand ? '🏆' : '📖';
  const sub = reachedPromisedLand
    ? `Time invicto: ${st.warsWon} de ${st.wars.length} guerras vencidas.`
    : `${st.warsWon} de ${st.wars.length} guerras vencidas antes da derrota.`;

  const teamRows = GW_POSITIONS.map(p => {
    const c = st.team[p];
    return `<div class="gw-team-row">
      <span class="emoji">${GW_POSITION_LABEL[p].emoji}</span>
      <div class="info">
        <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
        <div class="name">${gwEscHtml(c.nome)}</div>
      </div>
      <div class="overall">${c.overall}</div>
    </div>`;
  }).join('');

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-final">
      <div class="gw-final-emoji">${emoji}</div>
      <div class="gw-final-title">${title}</div>
      ${isNewRecord ? '<div class="gw-final-newrecord">🎉 Novo recorde!</div>' : ''}
      <p class="gw-final-sub">${sub}</p>
    </div>
    <div class="gw-team">${teamRows}</div>
    <div class="gw-actions">
      <button class="gw-btn" onclick="gwStart()">Jogar novamente</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar ao início</button>
    </div>
  `;
}

/* ------------------------------ OPEN / CLOSE ------------------------------------- */

function gwOpen() {
  gwEnsureDom();
  document.getElementById('gwOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  gwRenderIntro();
}
function gwClose() {
  const ov = document.getElementById('gwOverlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('gwOverlay');
    if (ov && ov.classList.contains('open')) gwClose();
  }
});

window.abrirGuerrasBiblicas = gwOpen;
