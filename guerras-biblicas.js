/* Guerras Bíblicas: draft + campanha/sobrevivência bíblica, dados via Google Sheets (TSV).
   Inclua este arquivo no site e chame window.abrirGuerrasBiblicas() para abrir. */

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
const GW_SPECIALTY_BONUS_PCT = 0.20;
const GW_WEAKNESS_PENALTY_PCT = 0.20;
const GW_RANDOM_JITTER_PCT = 0.08;
const GW_BATTLE_SIM_MIN_MS = 2000;
const GW_BATTLE_SIM_MAX_MS = 3000;

// Peso de dificuldade "dificil" nas primeiras rodadas (0 = índice da guerra, ou seja,
// guerra 1 e guerra 2). A partir da guerra 3 (índice 2) o peso volta ao normal.
const GW_HARD_EARLY_ROUND_WEIGHT = 0.2;
const GW_HARD_EARLY_ROUNDS = 2; // quantidade de rodadas iniciais com peso reduzido

const GW_LEGENDARY_THRESHOLD = 90;

const GW_BEST_KEY = 'gwBestGuerrasVencidas';
const GW_BEST_SURVIVAL_KEY = 'gwBestGuerrasSobrevivencia';

const GW_SHARE_SITE_URL = 'adbelembarueri.com.br/#mais';

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
  imbativel: 'Nenhuma guerra restou para enfrentar — esse time é IMBATÍVEL!',
};

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

// Sorteia uma sequência de guerras sem repetição, dando menos peso a guerras
// "dificil" nas primeiras GW_HARD_EARLY_ROUNDS rodadas (não é impossível, só menos provável).
function gwBuildWeightedWarSequence(pool, count) {
  const remaining = pool.slice();
  const seq = [];
  const n = Math.min(count, remaining.length);
  for (let i = 0; i < n; i++) {
    const weights = remaining.map(w => {
      if (w.dificuldade === 'dificil' && i < GW_HARD_EARLY_ROUNDS) {
        return GW_HARD_EARLY_ROUND_WEIGHT;
      }
      return 1.0;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    if (idx >= remaining.length) idx = remaining.length - 1;
    seq.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return seq;
}

// Apenas "Lendário" (90+) é uma classificação especial. Os demais não recebem selo.
function gwIsLegendary(overall) {
  return overall >= GW_LEGENDARY_THRESHOLD;
}
function gwRarityCls(overall) {
  return gwIsLegendary(overall) ? 'lendario' : 'normal';
}

// Selo mostrado nos cards de draft (rolando ou escolhendo grupo): só aparece para lendários.
function gwDraftBadgeHtml(card) {
  return gwIsLegendary(card.overall) ? '<span class="gw-card-rarity lendario">★ Lendário</span>' : '<span class="gw-card-rarity"></span>';
}
// Selo mostrado nos "cards finais" (resumo do time / resultado final): o grupo do
// personagem sempre aparece; lendários também recebem a estrelinha, além do grupo.
function gwFinalBadgeHtml(card) {
  const groupHtml = `<span class="gw-card-group">${gwEscHtml(card.grupo || '')}</span>`;
  if (gwIsLegendary(card.overall)) {
    return `<span class="gw-card-rarity lendario">★ Lendário</span>${groupHtml}`;
  }
  return groupHtml;
}

function gwGetBest(key) {
  const v = parseInt(localStorage.getItem(key) || '0', 10);
  return isNaN(v) ? 0 : v;
}
function gwSaveBest(key, n) {
  const best = gwGetBest(key);
  if (n > best) { localStorage.setItem(key, String(n)); return true; }
  return false;
}

const GW_CSS = `
.gw-overlay{position:fixed;inset:0;background:rgba(10,9,7,.85);backdrop-filter:blur(6px);z-index:500;display:none;align-items:center;justify-content:center;padding:20px}
.gw-overlay.open{display:flex}
.gw-box{background:linear-gradient(180deg,#1c1a17,#100f0d);width:100%;max-width:800px;max-height:94vh;overflow-y:auto;border-radius:14px;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.55);border:1px solid rgba(169,134,58,.25)}
.gw-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#f1ece1;font-size:16px;cursor:pointer;z-index:5}
.gw-close:hover{background:rgba(255,255,255,.16)}
.gw-body{padding:36px 30px 28px;color:#f1ece1;font-family:var(--sans,sans-serif)}
@media(max-width:600px){.gw-body{padding:44px 16px 20px}}
.gw-eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold,#c9a24a);font-weight:600;margin-bottom:10px;text-align:center}
.gw-title{font-size:clamp(24px,4vw,36px);font-weight:700;margin-bottom:12px;text-align:center;color:#fff}
.gw-desc{font-size:13px;color:#c9c4b8;font-weight:300;line-height:1.6;max-width:480px;margin:0 auto 18px;text-align:center}
.gw-positions-preview{display:flex;justify-content:center;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.gw-pos-chip{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:10px;padding:10px 16px;text-align:center;min-width:90px}
.gw-pos-chip .emoji{font-size:20px;display:block;margin-bottom:3px}
.gw-pos-chip .label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8}
.gw-record{font-size:11px;color:var(--gold,#c9a24a);font-weight:600;text-align:center;margin-bottom:6px}
.gw-btn{background:var(--accent,#7a2e2e);color:#fff;border:none;padding:11px 24px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:var(--sans,sans-serif);display:block;margin:0 auto}
.gw-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.gw-btn-secondary{background:rgba(255,255,255,.06);color:#e8e3d8;border:1px solid rgba(255,255,255,.16)}
.gw-btn:disabled{opacity:.5;cursor:not-allowed}
.gw-mode-choice{display:flex;flex-direction:column;gap:12px;max-width:340px;margin:0 auto 26px}
.gw-mode-btn{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:16px 18px;cursor:pointer;text-align:left;transition:transform .15s,box-shadow .15s,border-color .15s;font-family:var(--sans,sans-serif);color:#f1ece1}
.gw-mode-btn:hover{transform:translateY(-2px);border-color:var(--gold,#c9a24a);box-shadow:0 10px 26px rgba(0,0,0,.35)}
.gw-mode-btn .gw-mode-title{font-size:15px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.gw-mode-btn .gw-mode-desc{font-size:12px;color:#c9c4b8;font-weight:300;line-height:1.5}
.gw-loading,.gw-empty{text-align:center;padding:60px 20px;color:#c9c4b8;font-size:14px}
.gw-round-label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#c9a24a);font-weight:600;text-align:center;margin-bottom:6px}
.gw-round-sub{font-size:13px;color:#c9c4b8;text-align:center;margin-bottom:24px}
.gw-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
@media(max-width:640px){.gw-cards{grid-template-columns:1fr}}
.gw-card{border-radius:12px;padding:14px 12px;cursor:pointer;text-align:center;transition:transform .15s,box-shadow .15s;border:1px solid rgba(255,255,255,.14);background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.01));position:relative;overflow:hidden;height:150px;display:flex;flex-direction:column;justify-content:flex-start;box-sizing:border-box}
.gw-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.4)}
.gw-card.normal{border-color:rgba(255,255,255,.14)}
.gw-card.lendario{border-color:var(--gold,#c9a24a);box-shadow:0 0 24px rgba(201,162,74,.35)}
.gw-card-rarity{font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:6px;display:inline-block;min-height:12px}
.gw-card-rarity:empty{visibility:hidden}
.gw-card-rarity.lendario{color:var(--gold,#c9a24a)}
.gw-card-group{font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#c9c4b8;margin-bottom:6px;display:block;font-weight:600}
.gw-card-pos{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8;margin-bottom:4px}
.gw-card-name{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.25;min-height:37.5px}
.gw-card-overall{font-size:28px;font-weight:800;color:var(--gold,#c9a24a);margin-bottom:2px;line-height:1}
.gw-cards.compact .gw-card{padding:10px 10px;height:auto;min-height:112px}
.gw-cards.compact .gw-card-name{font-size:13px;margin-bottom:3px}
.gw-cards.compact .gw-card-overall{font-size:20px}
.gw-card-attr{font-size:11px;color:#c9c4b8;margin-bottom:3px}
.gw-card-attr b{color:#e8e3d8;font-weight:600}
.gw-card.disabled{opacity:.32;cursor:not-allowed;filter:grayscale(70%)}
.gw-card.disabled:hover{transform:none;box-shadow:none}
.gw-card-filled-badge{position:absolute;top:10px;right:10px;font-size:8px;text-transform:uppercase;letter-spacing:.05em;background:rgba(0,0,0,.55);color:#e8e3d8;padding:3px 8px;border-radius:6px}
.gw-card-rolling{cursor:default;pointer-events:none;animation:gwRollFlicker .16s ease-in-out infinite}
.gw-card-rolling:hover{transform:none;box-shadow:none}
.gw-card-static{cursor:default}
.gw-card-static:hover{transform:none;box-shadow:none}
@keyframes gwRollFlicker{0%{opacity:.7}50%{opacity:1}100%{opacity:.7}}
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
.gw-war-comentario{font-size:12px;color:#c9c4b8;font-weight:300;font-style:italic;line-height:1.6;max-width:460px;margin:0 auto 16px}
.gw-team-progress{margin-top:16px;border-top:1px solid rgba(255,255,255,.1);padding-top:12px}
.gw-team-progress-label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#c9c4b8;text-align:center;margin-bottom:8px}
.gw-tp-row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
.gw-tp-chip{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:8px 12px;min-width:100px;text-align:center;background:rgba(255,255,255,.03)}
.gw-tp-chip.empty{opacity:.4;border-style:dashed}
.gw-tp-chip .emoji{font-size:16px;display:block;margin-bottom:3px}
.gw-tp-chip .pos{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8;margin-bottom:2px}
.gw-tp-chip .name{font-size:12px;font-weight:700;color:#fff}
.gw-tp-chip .over{font-size:11px;color:var(--gold,#c9a24a);font-weight:700;margin-top:2px}
.gw-history{margin:14px 0}
.gw-history-label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#c9c4b8;text-align:center;margin-bottom:8px}
.gw-history-list{display:flex;flex-direction:column;gap:5px;max-width:420px;margin:0 auto;max-height:180px;overflow-y:auto}
.gw-history-item{font-size:11px;padding:6px 10px;border-radius:8px;display:flex;justify-content:space-between;gap:10px;border:1px solid rgba(255,255,255,.1)}
.gw-history-item.win{color:#7fd28e;border-color:rgba(127,210,142,.25);background:rgba(127,210,142,.06)}
.gw-history-item.lose{color:#e08c8c;border-color:rgba(224,140,140,.25);background:rgba(224,140,140,.06)}
.gw-war-card{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px 20px;text-align:center;margin-bottom:16px;background:rgba(255,255,255,.03)}
.gw-war-name{font-size:18px;font-weight:700;color:#fff;margin-bottom:6px}
.gw-war-meta{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;font-size:12px;color:#c9c4b8;margin-bottom:4px}
.gw-war-meta b{color:var(--gold,#c9a24a)}
.gw-progress-dots{display:flex;justify-content:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.gw-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.15)}
.gw-dot.done{background:var(--gold,#c9a24a)}
.gw-dot.active{background:var(--accent,#7a2e2e);box-shadow:0 0 0 3px rgba(122,46,46,.3)}
.gw-cards.final .gw-card{overflow:visible}
.gw-info-btn{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);color:#f1ece1;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:6;line-height:1;padding:0;font-family:var(--sans,sans-serif)}
.gw-info-btn:hover,.gw-info-btn.open{background:var(--gold,#c9a24a);border-color:var(--gold,#c9a24a);color:#1c1a17}
.gw-info-tooltip{display:none;position:absolute;top:26px;left:50%;transform:translateX(-50%);width:min(220px,80vw);background:#1c1a17;border:1px solid rgba(201,162,74,.45);border-radius:8px;padding:10px 12px;font-size:11px;font-weight:400;line-height:1.55;color:#e8e3d8;text-align:left;box-shadow:0 12px 28px rgba(0,0,0,.45);z-index:30;white-space:normal}
.gw-info-btn:hover .gw-info-tooltip,.gw-info-btn.open .gw-info-tooltip{display:block}
.gw-streak-label{text-align:center;font-size:12px;color:var(--gold,#c9a24a);font-weight:600;margin-bottom:16px}
.gw-battle-result{text-align:center;padding:6px 0 14px}
.gw-battle-emoji{font-size:42px;margin-bottom:8px}
.gw-battle-title-war{font-size:12px;color:#c9c4b8;letter-spacing:.03em;margin-bottom:4px}
.gw-battle-title{font-size:18px;font-weight:700;margin-bottom:6px}
.gw-battle-title.win{color:#7fd28e}
.gw-battle-title.lose{color:#e08c8c}
.gw-battle-diff{font-size:12px;color:#c9c4b8;margin-bottom:4px}
.gw-battle-narr{font-size:12px;color:#c9c4b8;font-weight:300;max-width:420px;margin:0 auto 14px}
.gw-power-bars{display:flex;flex-direction:column;gap:8px;max-width:360px;margin:0 auto 14px}
.gw-power-row{display:flex;align-items:center;gap:10px;font-size:11px;color:#c9c4b8}
.gw-power-row .lbl{width:70px;text-align:right;flex-shrink:0}
.gw-power-track{flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.gw-power-fill{height:100%;border-radius:4px}
.gw-power-fill.player{background:var(--gold,#c9a24a)}
.gw-power-fill.enemy{background:var(--accent,#7a2e2e)}
.gw-power-val{width:40px;flex-shrink:0;font-weight:700;color:#fff}
.gw-final{text-align:center;padding:4px 0}
.gw-final-emoji{font-size:44px;margin-bottom:8px}
.gw-final-title{font-size:20px;font-weight:700;color:#fff;margin-bottom:4px}
.gw-final-sub{font-size:12px;color:#c9c4b8;font-weight:300;margin-bottom:14px}
.gw-final-newrecord{font-size:12px;font-weight:700;color:var(--gold,#c9a24a);margin-bottom:8px}
.gw-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
`;

let _gwCache = null;

let _gwState = {
  team: {},
  usedGroupIds: new Set(),
  currentGroup: null,
  rerollUsed: false,
  mode: null, // 'campanha' | 'sobrevivencia'
  wars: [],
  warIndex: 0,
  warsWon: 0,
  lastBattle: null,
  history: [],
};

let _gwRollTimer = null;

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

function gwRenderIntro() {
  const body = document.getElementById('gwBody');
  const bestCampanha = gwGetBest(GW_BEST_KEY);
  const bestSobrevivencia = gwGetBest(GW_BEST_SURVIVAL_KEY);
  const chips = GW_POSITIONS.map(p => `<div class="gw-pos-chip"><span class="emoji">${GW_POSITION_LABEL[p].emoji}</span><span class="label">${GW_POSITION_LABEL[p].nome}</span></div>`).join('');
  body.innerHTML = `
    <div class="gw-eyebrow">Draft Bíblico</div>
    <h2 class="gw-title">Guerras Bíblicas</h2>
    <p class="gw-desc">Escolha o modo de jogo e depois monte seu time sorteando grupos de 3 heróis (general, guerreiro e exército).</p>
    <div class="gw-positions-preview">${chips}</div>
    ${bestCampanha > 0 ? `<div class="gw-record">🏅 Recorde Campanha: ${bestCampanha} guerra${bestCampanha === 1 ? '' : 's'} vencida${bestCampanha === 1 ? '' : 's'}</div>` : ''}
    ${bestSobrevivencia > 0 ? `<div class="gw-record">🔥 Recorde Sobrevivência: ${bestSobrevivencia} guerra${bestSobrevivencia === 1 ? '' : 's'} vencida${bestSobrevivencia === 1 ? '' : 's'} em sequência</div>` : ''}
    <div style="height:8px"></div>
    <div class="gw-mode-choice">
      <button class="gw-mode-btn" onclick="gwStart('campanha')">
        <div class="gw-mode-title">🗺️ Modo Campanha</div>
        <div class="gw-mode-desc">Enfrente ${GW_WAR_COUNT} guerras sorteadas. Vença todas para chegar à Terra Prometida.</div>
      </button>
      <button class="gw-mode-btn" onclick="gwStart('sobrevivencia')">
        <div class="gw-mode-title">🔥 Modo Sobrevivência</div>
        <div class="gw-mode-desc">Guerreie sem parar até perder. Vença todas as guerras disponíveis e seja imbatível.</div>
      </button>
    </div>
  `;
}

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
      comentario: r.comentario || '',
    }))
    .filter(c => c.nome && c.categoria && c.grupo);

  const guerras = rawGuerras.map(gwNormalizeRow)
    .map(r => ({
      nome: r.nome || '',
      dificuldade: gwNormDificuldade(r.dificuldade),
      tipo_de_batalha: r.tipo_de_batalha || '',
      overall: gwNum(r.overall, 50),
      comentario: r.comentario || '',
    }))
    .filter(w => w.nome);

  const groups = gwBuildGroups(personagens);

  console.log('[Guerras Bíblicas] personagens válidos:', personagens.length, 'guerras válidas:', guerras.length, 'grupos completos:', groups.length);
  _gwCache = { personagens, guerras, groups };
  return _gwCache;
}

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

async function gwStart(mode) {
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
    mode: mode || 'campanha',
    wars: [],
    warIndex: 0,
    warsWon: 0,
    lastBattle: null,
    history: [],
  };

  gwRenderDraftRound();
}

function gwEmptyPositions() {
  return GW_POSITIONS.filter(p => !_gwState.team[p]);
}

function gwDrawGroup(excludeId) {
  const empty = gwEmptyPositions();
  const pool = _gwCache.groups.filter(g =>
    !_gwState.usedGroupIds.has(g.id) &&
    g.id !== excludeId &&
    empty.some(pos => g[pos])
  );
  return pool.length ? gwPick(pool) : null;
}

function gwTeamProgressHtml() {
  const chips = GW_POSITIONS.map(p => {
    const c = _gwState.team[p];
    if (c) {
      return `<div class="gw-tp-chip">
        <span class="emoji">${GW_POSITION_LABEL[p].emoji}</span>
        <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
        <div class="name">${gwEscHtml(c.nome)}</div>
        <div class="over">${c.overall}</div>
      </div>`;
    }
    return `<div class="gw-tp-chip empty">
      <span class="emoji">${GW_POSITION_LABEL[p].emoji}</span>
      <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
      <div class="name">—</div>
    </div>`;
  }).join('');
  return `<div class="gw-team-progress">
    <div class="gw-team-progress-label">Seu time até agora</div>
    <div class="gw-tp-row">${chips}</div>
  </div>`;
}

function gwRenderDraftRound() {
  const empty = gwEmptyPositions();
  if (!empty.length) { gwRenderTeamSummary(); return; }

  let isNewDraw = false;
  if (!_gwState.currentGroup) {
    _gwState.currentGroup = gwDrawGroup();
    isNewDraw = true;
  }
  const group = _gwState.currentGroup;

  if (!group) {
    const body = document.getElementById('gwBody');
    body.innerHTML = `<div class="gw-empty">Não há mais grupos disponíveis para completar o time.<br>
      Adicione mais grupos completos (general + guerreiro + exército) na planilha.</div>`;
    return;
  }

  const roundNum = GW_POSITIONS.length - empty.length + 1;

  if (isNewDraw) {
    gwPlayDraftRollAnimation(group, roundNum);
  } else {
    gwRenderDraftCards(group, roundNum);
  }
}

function gwPlayDraftRollAnimation(group, roundNum) {
  const body = document.getElementById('gwBody');
  const pool = _gwCache.personagens;

  const cardsHtml = GW_POSITIONS.map((pos, i) => {
    const c = gwPick(pool);
    return `<div class="gw-card gw-card-rolling ${gwRarityCls(c.overall)}" id="gwRollCard-${i}">
      ${gwDraftBadgeHtml(c)}
      <div class="gw-card-pos">${GW_POSITION_LABEL[pos].emoji} ${GW_POSITION_LABEL[pos].nome}</div>
      <div class="gw-card-name">${gwEscHtml(c.nome)}</div>
      <div class="gw-card-overall">${c.overall}</div>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="gw-round-label">Rodada ${roundNum} de ${GW_POSITIONS.length}</div>
    <div class="gw-group-label">🎲 Sorteando grupo…</div>
    <div class="gw-cards">${cardsHtml}</div>
    ${gwTeamProgressHtml()}
  `;

  if (_gwRollTimer) clearInterval(_gwRollTimer);
  const duration = 1200 + Math.random() * 300;
  const tickMs = 80;
  const startedAt = Date.now();

  _gwRollTimer = setInterval(() => {
    GW_POSITIONS.forEach((pos, i) => {
      const el = document.getElementById(`gwRollCard-${i}`);
      if (!el) return;
      const c = gwPick(pool);
      el.className = `gw-card gw-card-rolling ${gwRarityCls(c.overall)}`;
      el.innerHTML = `${gwDraftBadgeHtml(c)}
        <div class="gw-card-pos">${GW_POSITION_LABEL[pos].emoji} ${GW_POSITION_LABEL[pos].nome}</div>
        <div class="gw-card-name">${gwEscHtml(c.nome)}</div>
        <div class="gw-card-overall">${c.overall}</div>`;
    });
    if (Date.now() - startedAt >= duration) {
      clearInterval(_gwRollTimer);
      _gwRollTimer = null;
      gwRenderDraftCards(group, roundNum);
    }
  }, tickMs);
}

function gwRenderDraftCards(group, roundNum) {
  const cardsHtml = GW_POSITIONS.map(pos => {
    const card = group[pos];
    const filled = !!_gwState.team[pos];
    const clickAttr = filled ? '' : ` onclick="gwPickCard('${pos}')"`;
    return `<div class="gw-card ${gwRarityCls(card.overall)}${filled ? ' disabled' : ''}"${clickAttr}>
      ${filled ? '<div class="gw-card-filled-badge">Posição já preenchida</div>' : ''}
      ${gwDraftBadgeHtml(card)}
      <div class="gw-card-pos">${GW_POSITION_LABEL[pos].emoji} ${GW_POSITION_LABEL[pos].nome}</div>
      <div class="gw-card-name">${gwEscHtml(card.nome)}</div>
      <div class="gw-card-overall">${card.overall}</div>
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
    ${gwTeamProgressHtml()}
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
  const empty = gwEmptyPositions();
  const roundNum = GW_POSITIONS.length - empty.length + 1;
  const newGroup = gwDrawGroup(prevId);
  _gwState.currentGroup = newGroup;
  if (newGroup) {
    gwPlayDraftRollAnimation(newGroup, roundNum);
  } else {
    _gwState.currentGroup = null;
    gwRenderDraftRound();
  }
}

function gwTeamCardsHtml(team, opts) {
  const showInfo = !!(opts && opts.showInfo);
  const cards = GW_POSITIONS.map(pos => {
    const c = team[pos];
    const infoHtml = (showInfo && c.comentario)
      ? `<button type="button" class="gw-info-btn" onclick="event.stopPropagation();gwToggleInfo(this)" aria-label="Sobre ${gwEscHtml(c.nome)}">?
          <span class="gw-info-tooltip">${gwEscHtml(c.comentario)}</span>
        </button>`
      : '';
    return `<div class="gw-card gw-card-static ${gwRarityCls(c.overall)}">
      ${infoHtml}
      ${gwFinalBadgeHtml(c)}
      <div class="gw-card-pos">${GW_POSITION_LABEL[pos].emoji} ${GW_POSITION_LABEL[pos].nome}</div>
      <div class="gw-card-name">${gwEscHtml(c.nome)}</div>
      <div class="gw-card-overall">${c.overall}</div>
    </div>`;
  }).join('');
  return `<div class="gw-cards compact${showInfo ? ' final' : ''}">${cards}</div>`;
}

function gwToggleInfo(btn) {
  const wasOpen = btn.classList.contains('open');
  document.querySelectorAll('.gw-info-btn.open').forEach(b => b.classList.remove('open'));
  if (!wasOpen) btn.classList.add('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.gw-info-btn')) {
    document.querySelectorAll('.gw-info-btn.open').forEach(b => b.classList.remove('open'));
  }
});

function gwRenderTeamSummary() {
  const body = document.getElementById('gwBody');
  const isSurvival = _gwState.mode === 'sobrevivencia';
  const modeLabel = isSurvival ? '🔥 Modo Sobrevivência' : '🗺️ Modo Campanha';
  const modeDesc = isSurvival
    ? 'Guerreie sem parar até perder. Vença todas as guerras disponíveis e seja imbatível.'
    : `Enfrente ${GW_WAR_COUNT} guerras sorteadas. Vença todas para chegar à Terra Prometida.`;
  body.innerHTML = `
    <div class="gw-eyebrow">Time montado</div>
    <h2 class="gw-title">Pronto para a batalha</h2>
    ${gwTeamCardsHtml(_gwState.team)}
    <div class="gw-mode-choice">
      <div class="gw-mode-btn" style="cursor:default;pointer-events:none">
        <div class="gw-mode-title">${modeLabel}</div>
        <div class="gw-mode-desc">${modeDesc}</div>
      </div>
    </div>
    <button class="gw-btn" onclick="gwStartCampaign()">Começar</button>
  `;
}

function gwStartCampaign() {
  const mode = _gwState.mode || 'campanha';
  const pool = _gwCache.guerras;
  const count = mode === 'sobrevivencia' ? pool.length : Math.min(GW_WAR_COUNT, pool.length);
  const wars = gwBuildWeightedWarSequence(pool, count);
  _gwState.wars = wars;
  _gwState.warIndex = 0;
  _gwState.warsWon = 0;
  _gwState.history = [];
  gwRenderWar();
}

function gwHistoryHtml() {
  const hist = _gwState.history;
  if (!hist || !hist.length) return '';
  const items = hist.map(h => `<div class="gw-history-item ${h.win ? 'win' : 'lose'}">
    <span>${gwEscHtml(h.nome)}</span><span>${h.win ? 'Vitória' : 'Derrota'}</span>
  </div>`).join('');
  return `<div class="gw-history">
    <div class="gw-history-label">Histórico ${_gwState.mode === 'sobrevivencia' ? 'da sequência' : 'da campanha'}</div>
    <div class="gw-history-list">${items}</div>
  </div>`;
}

function gwRenderWar() {
  const st = _gwState;
  const war = st.wars[st.warIndex];
  if (!war) { gwRenderFinal(true); return; }

  const showDots = st.wars.length <= 12;
  const dotsHtml = showDots
    ? `<div class="gw-progress-dots">${st.wars.map((w, i) => {
        const cls = i < st.warIndex ? 'done' : i === st.warIndex ? 'active' : '';
        return `<span class="gw-dot ${cls}"></span>`;
      }).join('')}</div>`
    : '';

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-round-label">${st.mode === 'sobrevivencia' ? `Guerra ${st.warIndex + 1}` : `Guerra ${st.warIndex + 1} de ${st.wars.length}`}</div>
    ${dotsHtml}
    ${gwHistoryHtml()}
    <div class="gw-war-card">
      <div class="gw-war-name">${gwEscHtml(war.nome)}</div>
      <div class="gw-war-meta">
        <span>Dificuldade: <b>${gwEscHtml(war.dificuldade)}</b></span>
        <span>Tipo de batalha: <b>${gwEscHtml(war.tipo_de_batalha) || '—'}</b></span>
      </div>
    </div>
    ${war.comentario ? `<p class="gw-war-comentario">${gwEscHtml(war.comentario)}</p>` : ''}
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
  st.history.push({ nome: war.nome, win, diff, dificuldade: war.dificuldade });

  gwRenderBattleSimulation();
}

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
    ? (isLastWar ? (st.mode === 'sobrevivencia' ? GW_NARRATIVE.imbativel : GW_NARRATIVE.terraPrometida) : gwPick(GW_NARRATIVE.vitoriaMeio))
    : gwPick(GW_NARRATIVE.derrota);

  const nextLabel = b.win
    ? (isLastWar ? 'Ver resultado final' : 'Próxima guerra')
    : 'Ver resultado final';

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-battle-result">
      <div class="gw-battle-emoji">${b.win ? '🏆' : '💀'}</div>
      <div class="gw-battle-title-war">${gwEscHtml(b.war.nome)}</div>
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

function gwRenderFinal(reachedAll) {
  const st = _gwState;
  const isSurvival = st.mode === 'sobrevivencia';
  const bestKey = isSurvival ? GW_BEST_SURVIVAL_KEY : GW_BEST_KEY;
  const isNewRecord = gwSaveBest(bestKey, st.warsWon);

  let title, emoji, sub;
  if (isSurvival) {
    if (reachedAll) {
      title = 'Imbatível!';
      emoji = '👑';
      sub = `Seu time venceu todas as ${st.wars.length} guerras disponíveis em sequência. Ninguém pode com vocês!`;
    } else {
      title = 'Fim da sequência';
      emoji = '📖';
      sub = `${st.warsWon} guerra${st.warsWon === 1 ? '' : 's'} vencida${st.warsWon === 1 ? '' : 's'} em sequência antes da derrota.`;
    }
  } else {
    title = reachedAll ? 'Vocês chegaram à Terra Prometida!' : 'A campanha terminou';
    emoji = reachedAll ? '🏆' : '📖';
    sub = reachedAll
      ? `Time invicto: ${st.warsWon} de ${st.wars.length} guerras vencidas.`
      : `${st.warsWon} de ${st.wars.length} guerras vencidas antes da derrota.`;
  }

  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-eyebrow">Guerras Bíblicas</div>
    <div class="gw-final">
      <div class="gw-final-emoji">${emoji}</div>
      <div class="gw-final-title">${title}</div>
      ${isNewRecord ? '<div class="gw-final-newrecord">🎉 Novo recorde!</div>' : ''}
      <p class="gw-final-sub">${sub}</p>
    </div>
    ${gwHistoryHtml()}
    ${gwTeamCardsHtml(st.team, { showInfo: true })}
    <div class="gw-actions">
      <button class="gw-btn" onclick="gwRenderIntro()">Jogar novamente</button>
      <button class="gw-btn gw-btn-secondary" id="gwShareImgBtn" onclick="gwShareImage(this)">📸 Compartilhar como imagem</button>
    </div>
  `;
}

function gwRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function gwWrapFillText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  let finalLines = lines.slice(0, 2);
  if (lines.length > 2) finalLines[1] = finalLines[1].replace(/.{0,3}$/, '') + '…';
  const totalH = finalLines.length * lineHeight;
  const startY = y - (totalH - lineHeight) / 2;
  finalLines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

// Quando o histórico é muito grande (modo Sobrevivência), a imagem não lista todas as
// guerras: mostra as mais difíceis, um resumo "+ N guerras" para o restante, e sempre
// mantém a última entrada (o fim da sequência) visível.
const GW_IMAGE_MAX_HISTORY_ROWS = 10;
function gwBuildImageHistory(history) {
  if (history.length <= GW_IMAGE_MAX_HISTORY_ROWS) return history.map(h => ({ ...h }));

  const diffRank = { dificil: 3, medio: 2, facil: 1 };
  const lastEntry = history[history.length - 1];
  const lastIsLoss = !lastEntry.win;
  const body = lastIsLoss ? history.slice(0, -1) : history.slice();

  const reservedForLast = lastIsLoss ? 1 : 0;
  const keepSlots = Math.max(0, GW_IMAGE_MAX_HISTORY_ROWS - 1 - reservedForLast);

  const ranked = body
    .map((h, i) => ({ ...h, _i: i }))
    .sort((a, b) => (diffRank[b.dificuldade] || 0) - (diffRank[a.dificuldade] || 0) || a._i - b._i);

  const shown = ranked.slice(0, keepSlots).sort((a, b) => a._i - b._i);
  const hiddenCount = body.length - shown.length;

  const rowsOut = shown.map(({ _i, ...rest }) => rest);
  if (hiddenCount > 0) rowsOut.push({ summary: true, count: hiddenCount });
  if (lastIsLoss) rowsOut.push(lastEntry);
  return rowsOut;
}

function gwBuildShareCanvas() {
  const st = _gwState;
  const isSurvival = st.mode === 'sobrevivencia';
  const W = 1080, H = 1920; // formato retrato de celular (9:16)
  const displayHistory = gwBuildImageHistory(st.history);
  const rows = displayHistory.length;
  const rowH = 56, rowGap = 12;
  const boxH = 300;
  const historyTop = 460; // colado logo abaixo do placar
  const teamTop = historyTop + 36 + rows * (rowH + rowGap) - rowGap + 24;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const gold = '#c9a24a';
  const white = '#f5f1e6';
  const muted = '#b9b2a2';
  const green = '#7fd28e';
  const red = '#e08c8c';

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#221f1b');
  grad.addColorStop(1, '#0c0b09');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Moldura dupla: duas linhas concêntricas com a mesma espessura.
  ctx.strokeStyle = 'rgba(201,162,74,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.strokeRect(34, 34, W - 68, H - 68);

  ctx.textAlign = 'center';

  ctx.fillStyle = gold;
  ctx.font = '600 26px Montserrat, sans-serif';
  ctx.fillText('DRAFT BÍBLICO', W / 2, 88);

  ctx.fillStyle = white;
  ctx.font = '700 66px Montserrat, sans-serif';
  ctx.fillText('GUERRAS BÍBLICAS', W / 2, 168);

  const allWon = st.warsWon === st.wars.length;
  let statusText;
  if (isSurvival) {
    statusText = allWon ? 'IMBATÍVEL!' : 'SEQUÊNCIA ENCERRADA';
  } else {
    statusText = allWon ? 'CHEGOU À TERRA PROMETIDA!' : 'CAMPANHA ENCERRADA';
  }
  ctx.font = '700 34px Montserrat, sans-serif';
  ctx.fillStyle = allWon ? gold : white;
  ctx.fillText(statusText, W / 2, 234);

  ctx.font = '700 104px Montserrat, sans-serif';
  ctx.fillStyle = gold;
  ctx.fillText(isSurvival ? `${st.warsWon}` : `${st.warsWon}/${st.wars.length}`, W / 2, 352);

  ctx.font = '400 28px Montserrat, sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText(isSurvival ? 'guerras vencidas em sequência' : 'guerras vencidas', W / 2, 390);

  let y = historyTop;
  ctx.font = '600 22px Montserrat, sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText(isSurvival ? 'HISTÓRICO DA SEQUÊNCIA' : 'HISTÓRICO DA CAMPANHA', W / 2, y);
  y += 36;

  const rowW = 900, rowX = (W - rowW) / 2;
  displayHistory.forEach(h => {
    if (h.summary) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      gwRoundRect(ctx, rowX, y, rowW, rowH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '700 22px Montserrat, sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(`+ ${h.count} guerra${h.count === 1 ? '' : 's'} vencida${h.count === 1 ? '' : 's'}`, rowX + rowW / 2, y + rowH / 2 + 8);

      y += rowH + rowGap;
      return;
    }

    ctx.fillStyle = h.win ? 'rgba(127,210,142,0.08)' : 'rgba(224,140,140,0.08)';
    ctx.strokeStyle = h.win ? 'rgba(127,210,142,0.3)' : 'rgba(224,140,140,0.3)';
    ctx.lineWidth = 2;
    gwRoundRect(ctx, rowX, y, rowW, rowH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '600 24px Montserrat, sans-serif';
    ctx.fillStyle = white;
    ctx.fillText(gwFitTextLine(ctx, h.nome, rowW - 260), rowX + 24, y + rowH / 2 + 8);

    ctx.textAlign = 'right';
    ctx.font = '700 24px Montserrat, sans-serif';
    ctx.fillStyle = h.win ? green : red;
    const diffLabel = `${h.win ? '✔' : '✘'} ${h.diff > 0 ? '+' : ''}${h.diff}`;
    ctx.fillText(diffLabel, rowX + rowW - 24, y + rowH / 2 + 8);
    ctx.textAlign = 'center';

    y += rowH + rowGap;
  });

  const boxY = teamTop;
  const boxW = 300, gap = 30;
  const startX = (W - (boxW * 3 + gap * 2)) / 2;

  GW_POSITIONS.forEach((pos, i) => {
    const card = st.team[pos];
    const isLegendary = gwIsLegendary(card.overall);
    const x = startX + i * (boxW + gap);

    // Fundo igual para todos — lendário só se distingue pelo contorno dourado, sem preenchimento colorido.
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = isLegendary ? gold : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = isLegendary ? 3 : 2;
    gwRoundRect(ctx, x, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 18px Montserrat, sans-serif';
    ctx.fillStyle = muted;
    gwWrapFillText(ctx, (card.grupo || '').toUpperCase(), x + boxW / 2, boxY + 40, boxW - 30, 22);

    ctx.font = '50px sans-serif';
    ctx.fillStyle = white;
    ctx.fillText(gwStripEmojiVariation(GW_POSITION_LABEL[pos].emoji), x + boxW / 2, boxY + 116);

    ctx.font = '600 20px Montserrat, sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(GW_POSITION_LABEL[pos].nome.toUpperCase(), x + boxW / 2, boxY + 150);

    ctx.font = '700 30px Montserrat, sans-serif';
    ctx.fillStyle = isLegendary ? gold : white;
    gwWrapFillText(ctx, card.nome, x + boxW / 2, boxY + 220, boxW - 30, 34);

    if (isLegendary) {
      ctx.font = '700 20px Montserrat, sans-serif';
      ctx.fillStyle = gold;
      ctx.fillText('★ LENDÁRIO ★', x + boxW / 2, boxY + boxH - 24);
    }
  });

  // Site sempre travado no canto de baixo, independente da altura do conteúdo acima.
  ctx.font = '600 30px Montserrat, sans-serif';
  ctx.fillStyle = gold;
  ctx.fillText(GW_SHARE_SITE_URL, W / 2, H - 60);

  return canvas;
}

function gwStripEmojiVariation(emoji) {
  return emoji.replace(/\uFE0F/g, '');
}

function gwFitTextLine(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

async function gwGenerateShareImageBlob() {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }
  const canvas = gwBuildShareCanvas();
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

function gwShareText() {
  const st = _gwState;
  if (st.mode === 'sobrevivencia') {
    const invencivel = st.warsWon === st.wars.length;
    return invencivel
      ? `Fui IMBATÍVEL no modo Sobrevivência de Guerras Bíblicas, vencendo todas as ${st.wars.length} guerras em sequência! Vem jogar também 👉 ${GW_SHARE_SITE_URL}`
      : `Venci ${st.warsWon} guerra${st.warsWon === 1 ? '' : 's'} em sequência no modo Sobrevivência de Guerras Bíblicas! Vem jogar também 👉 ${GW_SHARE_SITE_URL}`;
  }
  return `Venci ${st.warsWon} de ${st.wars.length} guerras em Guerras Bíblicas! Vem jogar também 👉 ${GW_SHARE_SITE_URL}`;
}

async function gwShareImage(btnEl) {
  const originalLabel = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando imagem…'; }
  try {
    const blob = await gwGenerateShareImageBlob();
    const file = new File([blob], 'guerras-biblicas-resultado.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Guerras Bíblicas', text: gwShareText() });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'guerras-biblicas-resultado.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  } catch (e) {
    console.error('[Guerras Bíblicas] erro ao compartilhar imagem:', e);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalLabel || '📸 Compartilhar como imagem'; }
  }
}

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
  if (_gwRollTimer) { clearInterval(_gwRollTimer); _gwRollTimer = null; }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('gwOverlay');
    if (ov && ov.classList.contains('open')) gwClose();
  }
});

window.abrirGuerrasBiblicas = gwOpen;
