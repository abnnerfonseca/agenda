/* Guerras Bíblicas: draft + campanha/sobrevivência/online bíblica, dados via Google Sheets (TSV).
   Inclua este arquivo no site e chame window.abrirGuerrasBiblicas() para abrir.
   Balanceamento: no console do navegador, rode  await gwSimularBalanceamento(3000)  */

const GW_SHEET_PERSONAGENS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=643844560&single=true&output=tsv';
const GW_SHEET_GUERRAS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1733993415&single=true&output=tsv';

const GW_POSITIONS = ['general', 'guerreiro', 'exercito'];

const GW_POSITION_LABEL = {
  general:   { nome: 'General',   icone: 'espadas' },
  guerreiro: { nome: 'Guerreiro', icone: 'escudo' },
  exercito:  { nome: 'Exército',  icone: 'arco' },
};

const GW_WAR_COUNT = 5;
const GW_SPECIALTY_BONUS_PCT = 0.18;
const GW_WEAKNESS_PENALTY_PCT = 0.17;
const GW_RANDOM_JITTER_PCT = 0.07;
const GW_BATTLE_SIM_MIN_MS = 2000;
const GW_BATTLE_SIM_MAX_MS = 3000;

const GW_HARD_EARLY_ROUND_WEIGHT = 0.2;
const GW_HARD_EARLY_ROUNDS = 2;

const GW_LEGENDARY_THRESHOLD = 90;

const GW_BEST_KEY = 'gwBestGuerrasVencidas';
const GW_BEST_SURVIVAL_KEY = 'gwBestGuerrasSobrevivencia';
const GW_DATA_CACHE_KEY = 'gwUltimaCopiaPlanilhas';

const GW_SHARE_SITE_URL = 'https://adbelembarueri.com.br/mais';
const GW_SHARE_SITE_LABEL = 'adbelembarueri.com.br/mais';

const GW_MEMORY_SLOTS = 3;
const GW_MEMORY_WINS_TO_LEARN = 2;
const GW_MEMORY_COLORS = ['#c9a24a', '#7fd28e', '#e08c8c', '#8ab4e0', '#c98ae0', '#e0c98a', '#8ae0d0', '#e08ac9'];

const GW_EVOLVE_EVERY_WINS = 10;
const GW_EVOLVE_MIN_BOOST = 1;
const GW_EVOLVE_MAX_BOOST = 3;
const GW_EVOLVE_OVERALL_CAP = 99;

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
  terraPrometida: 'A campanha foi vencida! O esquadrão chegou à Terra Prometida!',
  imbativel: 'Nenhuma guerra restou para enfrentar... esse esquadrão é IMBATÍVEL!',
};

/* ============================== ÍCONES (SVG) ==============================
   Grade 24x24. Cada item é um caminho 'd' (só traço) ou [d, modo]:
   'a' = traço + preenchimento suave (dá o ar "duotone"), 'f' = preenchido.
   Os mesmos caminhos são usados no HTML (gwIcon) e na imagem de compartilhar (Path2D). */
const GW_ICONS = {
  espadas: [
    'M20.5 3.5 L9.5 14.5 M7.5 12.5 L11.5 16.5 M9.5 14.5 L4.5 19.5 M3.5 18.5 L5.5 20.5',
    'M3.5 3.5 L14.5 14.5 M16.5 12.5 L12.5 16.5 M14.5 14.5 L19.5 19.5 M20.5 18.5 L18.5 20.5',
  ],
  escudo: [
    ['M12 3 L19.5 6 V12 C19.5 16.5 16.5 19.8 12 21 C7.5 19.8 4.5 16.5 4.5 12 V6 Z', 'a'],
    'M12 7.5 V16 M8.7 11 H15.3',
  ],
  escudoQuebrado: [
    ['M12 3 L19.5 6 V12 C19.5 16.5 16.5 19.8 12 21 C7.5 19.8 4.5 16.5 4.5 12 V6 Z', 'a'],
    'M12.5 3.4 L10.5 9 L13.8 12.2 L11 17 L12 21',
  ],
  arco: [
    'M6 3 C13.5 6.5 13.5 17.5 6 21 M6 3 V21',
    'M4 12 H20.5 M17.5 9 L20.5 12 L17.5 15 M4 12 L2.5 10.5 M4 12 L2.5 13.5',
  ],
  mapa: [
    ['M3 6.5 L9 4 L15 6.5 L21 4 V17.5 L15 20 L9 17.5 L3 20 Z', 'a'],
    'M9 4 V17.5 M15 6.5 V20',
  ],
  chama: [
    ['M12 3 C12.8 7 18 9 18 14.2 C18 17.9 15.3 21 12 21 C8.7 21 6 17.9 6 14.2 C6 11.7 7.3 10.2 8.4 8.6 C8.9 10.2 9.9 10.8 10.6 10.3 C10.1 7.6 10.9 5 12 3 Z', 'a'],
    'M12 21 C10.4 21 9.3 19.7 9.3 18.1 C9.3 16.3 11 15.4 12 13.5 C13 15.4 14.7 16.3 14.7 18.1 C14.7 19.7 13.6 21 12 21 Z',
  ],
  globo: [
    ['M21 12 A9 9 0 1 1 3 12 A9 9 0 1 1 21 12 Z', 'a'],
    'M3 12 H21 M12 3 C15.5 6.5 15.5 17.5 12 21 C8.5 17.5 8.5 6.5 12 3 Z M4.9 7.5 H19.1 M4.9 16.5 H19.1',
  ],
  medalha: [
    ['M18 9 A6 6 0 1 1 6 9 A6 6 0 1 1 18 9 Z', 'a'],
    'M8.6 13.6 L7 21 L12 18.5 L17 21 L15.4 13.6',
    ['M12 6.3 L12.9 8.2 L15 8.5 L13.5 10 L13.8 12.1 L12 11.1 L10.2 12.1 L10.5 10 L9 8.5 L11.1 8.2 Z', 'f'],
  ],
  dado: [
    ['M7 3 H17 A4 4 0 0 1 21 7 V17 A4 4 0 0 1 17 21 H7 A4 4 0 0 1 3 17 V7 A4 4 0 0 1 7 3 Z', 'a'],
    ['M8 8.2 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0 Z', 'f'],
    ['M13.6 15.8 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0 Z', 'f'],
    ['M10.8 12 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0 Z', 'f'],
  ],
  ideia: [
    ['M12 3 A6 6 0 0 0 8.5 14 C9.3 14.8 9.5 15.7 9.5 17 H14.5 C14.5 15.7 14.7 14.8 15.5 14 A6 6 0 0 0 12 3 Z', 'a'],
    'M9.7 20 H14.3 M10.5 22 H13.5',
  ],
  trofeu: [
    ['M7.5 4 H16.5 V9.5 A4.5 4.5 0 0 1 7.5 9.5 Z', 'a'],
    'M7.5 6 H4.5 V8 A3 3 0 0 0 7.5 11 M16.5 6 H19.5 V8 A3 3 0 0 1 16.5 11 M12 14 V17.5 M9.5 17.5 H14.5 V20.5 H9.5 Z M8 20.5 H16',
  ],
  livro: [
    ['M12 6.5 C10 4.8 6.5 4.3 3.5 4.8 V18.5 C6.5 18 10 18.5 12 20.2 C14 18.5 17.5 18 20.5 18.5 V4.8 C17.5 4.3 14 4.8 12 6.5 Z', 'a'],
    'M12 6.5 V20.2',
  ],
  coroa: [
    ['M3.5 8.5 L8 12.5 L12 5.5 L16 12.5 L20.5 8.5 L19 18.5 H5 Z', 'a'],
    'M5.5 21 H18.5',
  ],
  camera: [
    ['M4 8 H7.5 L9 5.5 H15 L16.5 8 H20 V19 H4 Z', 'a'],
    'M8.8 13.5 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0 Z',
  ],
  cruz: [['M10 4 H14 V10 H20 V14 H14 V20 H10 V14 H4 V10 H10 Z', 'a']],
  trocar: ['M4 8 H18 M14.5 4.5 L18 8 L14.5 11.5 M20 16 H6 M9.5 12.5 L6 16 L9.5 19.5'],
  alerta: [
    ['M12 3.5 L21.5 20 H2.5 Z', 'a'],
    'M12 10 V14.5 M12 17.3 V17.4',
  ],
  estrela: [['M12 3 L14.6 9 L21 9.6 L16.2 13.9 L17.6 20.2 L12 16.9 L6.4 20.2 L7.8 13.9 L3 9.6 L9.4 9 Z', 'f']],
  sobe: ['M12 19 V6 M6.5 11.5 L12 6 L17.5 11.5'],
  desce: ['M12 5 V18 M6.5 12.5 L12 18 L17.5 12.5'],
  check: ['M5 12.5 L10 17.5 L19 7'],
  x: ['M6 6 L18 18 M18 6 L6 18'],
  alvo: [
    'M20 12 a8 8 0 1 0 -16 0 a8 8 0 1 0 16 0 Z M16 12 a4 4 0 1 0 -8 0 a4 4 0 1 0 8 0 Z',
    ['M13 12 a1 1 0 1 0 -2 0 a1 1 0 1 0 2 0 Z', 'f'],
  ],
};

function gwIcon(nome, size, cls) {
  const def = GW_ICONS[nome];
  if (!def) return '';
  const s = size || 18;
  const paths = def.map(p => {
    const d = typeof p === 'string' ? p : p[0];
    const m = typeof p === 'string' ? '' : p[1];
    if (m === 'f') return `<path d="${d}" fill="currentColor"/>`;
    if (m === 'a') return `<path d="${d}" fill="currentColor" fill-opacity=".2"/>`;
    return `<path d="${d}"/>`;
  }).join('');
  return `<svg class="gw-ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

// Desenha o mesmo ícone num canvas (imagem de compartilhar), centrado em (cx, cy).
function gwDrawIconCanvas(ctx, nome, cx, cy, size, color) {
  const def = GW_ICONS[nome];
  if (!def) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  def.forEach(p => {
    const d = typeof p === 'string' ? p : p[0];
    const m = typeof p === 'string' ? '' : p[1];
    const path = new Path2D(d);
    if (m === 'f') ctx.fill(path);
    else if (m === 'a') { ctx.save(); ctx.globalAlpha = 0.2; ctx.fill(path); ctx.restore(); }
    ctx.stroke(path);
  });
  ctx.restore();
}

/* ============================== UTILITÁRIOS ============================== */

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
  if (n.startsWith('med')) return 'medio';
  if (n.startsWith('dificil')) return 'dificil';
  return 'facil';
}
function gwNum(v, fallback) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}
// Qualquer número que venha do banco online passa por aqui antes de entrar no HTML.
function gwSafeNum(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}
function gwPct(x) { return Math.round(x * 100); }
function gwPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function gwShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Especialidade/fraqueza podem ter vários tipos separados por ; , ou |  (ex.: "cerco; defesa")
function gwMatchesType(campo, tipo) {
  const alvo = gwStrip(tipo);
  if (!alvo || !campo) return false;
  return String(campo).split(/[;,|]/).some(parte => gwStrip(parte) === alvo);
}
function gwCardEffect(card, war) {
  const esp = gwMatchesType(card.especialidade, war.tipo_de_batalha);
  const fra = gwMatchesType(card.fraqueza, war.tipo_de_batalha);
  let mult = 1;
  if (esp) mult += GW_SPECIALTY_BONUS_PCT;
  if (fra) mult -= GW_WEAKNESS_PENALTY_PCT;
  return { mult, esp, fra };
}
function gwCardContribution(card, war) {
  return card.overall * gwCardEffect(card, war).mult;
}

// Campanha: sorteio ponderado (guerras difíceis raramente nas primeiras rodadas).
function gwBuildWeightedWarSequence(pool, count) {
  const remaining = pool.slice();
  const seq = [];
  const n = Math.min(count, remaining.length);
  for (let i = 0; i < n; i++) {
    const weights = remaining.map(w => {
      if (w.dificuldade === 'dificil' && i < GW_HARD_EARLY_ROUNDS) return GW_HARD_EARLY_ROUND_WEIGHT;
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
// Sobrevivência: do fácil ao difícil, embaralhando dentro de cada nível (recorde menos dependente de sorte).
function gwBuildSurvivalSequence(pool) {
  const seq = [];
  ['facil', 'medio', 'dificil'].forEach(nivel => {
    seq.push(...gwShuffle(pool.filter(w => w.dificuldade === nivel)));
  });
  return seq;
}

function gwIsLegendary(overall) { return overall >= GW_LEGENDARY_THRESHOLD; }
function gwRarityCls(overall) { return gwIsLegendary(overall) ? 'lendario' : 'normal'; }

function gwStarBadge() {
  return `<span class="gw-card-rarity lendario">${gwIcon('estrela', 11)} Lendário</span>`;
}
function gwDraftBadgeHtml(card) {
  return gwIsLegendary(card.overall) ? gwStarBadge() : '<span class="gw-card-rarity"></span>';
}
function gwFinalBadgeHtml(card) {
  const groupHtml = `<span class="gw-card-group">${gwEscHtml(card.grupo || '')}</span>`;
  return gwIsLegendary(card.overall) ? gwStarBadge() + groupHtml : groupHtml;
}
// Especialidade (alvo) e fraqueza (seta) da carta: o jogador precisa ver isso para decidir o draft.
function gwTraitsHtml(card) {
  const rows = [];
  if (card.especialidade) rows.push(`<span class="gw-trait up" title="Especialidade">${gwIcon('alvo', 11)}${gwEscHtml(card.especialidade)}</span>`);
  if (card.fraqueza) rows.push(`<span class="gw-trait down" title="Fraqueza">${gwIcon('desce', 11)}${gwEscHtml(card.fraqueza)}</span>`);
  return rows.length ? `<div class="gw-traits">${rows.join('')}</div>` : '';
}

function gwGetBest(key) {
  try {
    const v = parseInt(localStorage.getItem(key) || '0', 10);
    return isNaN(v) ? 0 : v;
  } catch (e) { return 0; }
}
function gwSaveBest(key, n) {
  const best = gwGetBest(key);
  if (n > best) {
    try { localStorage.setItem(key, String(n)); } catch (e) {}
    return true;
  }
  return false;
}

function gwMemoryTypeKey(warType) {
  const k = gwStrip(warType);
  return k || null;
}
function gwMemoryColorForKey(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return GW_MEMORY_COLORS[hash % GW_MEMORY_COLORS.length];
}
function gwNewGeneralMemory() {
  return { counts: {}, queue: [] };
}
function gwMemoryDotsHtml(queue) {
  const dots = [];
  for (let i = 0; i < GW_MEMORY_SLOTS; i++) {
    const item = queue[i];
    if (item) {
      const color = gwMemoryColorForKey(item.key);
      dots.push(`<span class="gw-memory-dot filled" style="background:${color}" title="${gwEscHtml(item.label)}"></span>`);
    } else {
      dots.push('<span class="gw-memory-dot"></span>');
    }
  }
  return `<div class="gw-memory-dots">${dots.join('')}</div>`;
}

/* Poder do time numa guerra (usado na luta e no simulador de balanceamento). */
function gwPlayerPower(team, war, usarMemoria) {
  const detalhes = GW_POSITIONS.map(pos => {
    const card = team[pos];
    const ef = gwCardEffect(card, war);
    let valor = card.overall * ef.mult;
    const mem = pos === 'general' && !!usarMemoria;
    if (mem) valor += card.overall * GW_SPECIALTY_BONUS_PCT;
    return { pos, nome: card.nome, overall: card.overall, valor, esp: ef.esp, fra: ef.fra, mem };
  });
  const base = detalhes.reduce((a, d) => a + d.valor, 0);
  const jitter = 1 + (Math.random() * 2 - 1) * GW_RANDOM_JITTER_PCT;
  return { total: Math.round(base * jitter), detalhes };
}
function gwEnemyPower(war) {
  const jitter = 1 + (Math.random() * 2 - 1) * GW_RANDOM_JITTER_PCT;
  return Math.round(war.overall * jitter);
}

/* ============================== CSS ============================== */

const GW_CSS = `
.gw-overlay{position:fixed;inset:0;background:rgba(10,9,7,.85);backdrop-filter:blur(6px);z-index:500;display:none;align-items:center;justify-content:center;padding:20px}
.gw-overlay.open{display:flex}
.gw-box{background:linear-gradient(180deg,#1c1a17,#100f0d);width:100%;max-width:800px;height:min(720px,88vh);height:min(720px,88dvh);display:flex;flex-direction:column;border-radius:14px;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.55);border:1px solid rgba(169,134,58,.25)}
.gw-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#f1ece1;cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;padding:0}
.gw-close:hover{background:rgba(255,255,255,.16)}
.gw-body{padding:36px 30px 28px;color:#f1ece1;font-family:var(--sans,sans-serif);flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;justify-content:flex-start}
@media(max-width:600px){.gw-body{padding:44px 16px 20px}}
.gw-ico{display:inline-block;vertical-align:-.16em;flex:none}
.gw-eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold,#c9a24a);font-weight:600;margin-bottom:10px;text-align:center}
.gw-title{font-size:clamp(24px,4vw,36px);font-weight:700;margin-bottom:12px;text-align:center;color:#fff}
.gw-desc{font-size:13px;color:#c9c4b8;font-weight:300;line-height:1.6;max-width:480px;margin:0 auto 18px;text-align:center}
.gw-hint{font-size:11px;color:#a8a396;font-weight:300;line-height:1.5;max-width:420px;margin:0 auto 14px;text-align:center}
.gw-positions-preview{display:flex;justify-content:center;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.gw-pos-chip{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:10px;padding:10px 16px;text-align:center;min-width:90px}
.gw-pos-chip .gw-ico{display:block;margin:0 auto 5px;color:var(--gold,#c9a24a)}
.gw-pos-chip .label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8}
.gw-record{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--gold,#c9a24a);font-weight:600;text-align:center;margin-bottom:6px}
.gw-btn{background:var(--accent,#7a2e2e);color:#fff;border:none;padding:11px 24px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:var(--sans,sans-serif);display:flex;align-items:center;justify-content:center;gap:8px;margin:0 auto}
.gw-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.gw-btn-secondary{background:rgba(255,255,255,.06);color:#e8e3d8;border:1px solid rgba(255,255,255,.16)}
.gw-btn:disabled{opacity:.5;cursor:not-allowed}
.gw-mode-choice{display:flex;flex-direction:column;gap:12px;max-width:340px;margin:0 auto 26px}
.gw-mode-btn{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:16px 18px;cursor:pointer;text-align:left;transition:transform .15s,box-shadow .15s,border-color .15s;font-family:var(--sans,sans-serif);color:#f1ece1}
.gw-mode-btn:hover{transform:translateY(-2px);border-color:var(--gold,#c9a24a);box-shadow:0 10px 26px rgba(0,0,0,.35)}
.gw-mode-btn .gw-mode-title{font-size:15px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:9px}
.gw-mode-btn .gw-mode-title .gw-ico{color:var(--gold,#c9a24a)}
.gw-mode-btn .gw-mode-desc{font-size:12px;color:#c9c4b8;font-weight:300;line-height:1.5}
.gw-loading,.gw-empty{text-align:center;padding:60px 20px;color:#c9c4b8;font-size:14px}
.gw-round-label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#c9a24a);font-weight:600;text-align:center;margin-bottom:6px}
.gw-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
@media(max-width:640px){.gw-cards{grid-template-columns:1fr}}
.gw-card{border-radius:12px;padding:14px 12px;cursor:pointer;text-align:center;transition:transform .15s,box-shadow .15s;border:1px solid rgba(255,255,255,.14);background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.01));position:relative;overflow:hidden;min-height:168px;display:flex;flex-direction:column;justify-content:flex-start;box-sizing:border-box}
.gw-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.4)}
.gw-card.normal{border-color:rgba(255,255,255,.14)}
.gw-card.lendario{border-color:var(--gold,#c9a24a);box-shadow:0 0 24px rgba(201,162,74,.35)}
.gw-card-rarity{font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:6px;display:inline-flex;align-items:center;justify-content:center;gap:3px;min-height:12px}
.gw-card-rarity:empty{visibility:hidden}
.gw-card-rarity.lendario{color:var(--gold,#c9a24a)}
.gw-card-group{font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#c9c4b8;margin-bottom:6px;display:block;font-weight:600}
.gw-card-pos{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8;margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:5px}
.gw-card-pos .gw-ico{color:var(--gold,#c9a24a)}
.gw-card-name{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.25;min-height:37.5px}
.gw-card-overall{font-size:28px;font-weight:800;color:var(--gold,#c9a24a);margin-bottom:2px;line-height:1}
.gw-traits{display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:6px}
.gw-trait{font-size:10px;line-height:1.25;display:inline-flex;align-items:center;gap:4px;color:#c9c4b8}
.gw-trait.up .gw-ico{color:#7fd28e}
.gw-trait.down .gw-ico{color:#e08c8c}
.gw-cards.compact .gw-card{padding:10px 10px;min-height:112px}
.gw-cards.compact .gw-card-name{font-size:13px;margin-bottom:3px}
.gw-cards.compact .gw-card-overall{font-size:20px}
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
.gw-battle-sim-label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#c9c4b8;margin-bottom:26px;display:flex;align-items:center;justify-content:center;gap:8px}
.gw-battle-sim-label .gw-ico{color:var(--gold,#c9a24a)}
.gw-battlefield{position:relative;height:64px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12)}
.gw-army{position:absolute;top:0;bottom:0}
.gw-army.player{left:0;background:linear-gradient(90deg,rgba(201,162,74,.18),rgba(201,162,74,.6));animation:gwArmyPlayer 1.05s ease-in-out infinite alternate}
.gw-army.enemy{right:0;background:linear-gradient(270deg,rgba(122,46,46,.22),rgba(122,46,46,.65));animation:gwArmyEnemy 1.05s ease-in-out infinite alternate}
.gw-clash-line{position:absolute;top:0;bottom:0;width:3px;background:#fff;box-shadow:0 0 14px rgba(255,255,255,.65);animation:gwClash 1.05s ease-in-out infinite alternate}
@keyframes gwArmyPlayer{from{width:44%}to{width:59%}}
@keyframes gwArmyEnemy{from{width:44%}to{width:59%}}
@keyframes gwClash{from{left:43%}to{left:59%}}
.gw-war-comentario{font-size:12px;color:#c9c4b8;font-weight:300;font-style:italic;line-height:1.6;max-width:460px;margin:0 auto 16px}
.gw-team-progress{margin:16px 0 22px;border-top:1px solid rgba(255,255,255,.1);padding-top:12px}
.gw-team-progress-label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#c9c4b8;text-align:center;margin-bottom:8px}
.gw-tp-row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
.gw-tp-chip{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:8px 10px;width:108px;box-sizing:border-box;text-align:center;background:rgba(255,255,255,.03);display:flex;flex-direction:column;align-items:center}
.gw-tp-chip.empty{opacity:.4;border-style:dashed}
.gw-tp-chip .gw-ico{display:block;margin:0 auto 3px;color:var(--gold,#c9a24a)}
.gw-tp-chip .pos{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8;margin-bottom:2px}
.gw-tp-chip .name{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.gw-tp-chip .over{font-size:11px;color:var(--gold,#c9a24a);font-weight:700;margin-top:2px}
.gw-tp-chip .gw-memory-dots{margin-top:5px;justify-content:center}
.gw-tp-chip.evolved{border-color:var(--gold,#c9a24a);box-shadow:0 0 14px rgba(201,162,74,.3)}
.gw-evolved-badge{display:inline-flex;align-items:center;margin-left:4px;font-size:10px;color:#7fd28e;font-weight:700}
.gw-fx{display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:700;margin-top:3px;padding:1px 5px;border-radius:6px}
.gw-fx.up{color:#7fd28e;background:rgba(127,210,142,.12)}
.gw-fx.down{color:#e08c8c;background:rgba(224,140,140,.12)}
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
.gw-card.evolved{border-color:#7fd28e}
.gw-evolved-ribbon{position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:2px;font-size:9px;font-weight:700;letter-spacing:.05em;background:rgba(127,210,142,.16);color:#7fd28e;border:1px solid rgba(127,210,142,.4);padding:2px 6px;border-radius:6px}
.gw-info-btn{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);color:#f1ece1;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:6;line-height:1;padding:0;font-family:var(--sans,sans-serif)}
.gw-info-btn:hover,.gw-info-btn.open{background:var(--gold,#c9a24a);border-color:var(--gold,#c9a24a);color:#1c1a17}
.gw-info-tooltip{display:none;position:absolute;top:26px;left:50%;transform:translateX(-50%);width:min(220px,80vw);background:#1c1a17;border:1px solid rgba(201,162,74,.45);border-radius:8px;padding:10px 12px;font-size:11px;font-weight:400;line-height:1.55;color:#e8e3d8;text-align:left;box-shadow:0 12px 28px rgba(0,0,0,.45);z-index:30;white-space:normal}
.gw-info-btn:hover .gw-info-tooltip,.gw-info-btn.open .gw-info-tooltip{display:block}
.gw-battle-result{text-align:center;padding:6px 0 14px}
.gw-big-ico{display:block;margin:0 auto 10px}
.gw-big-ico.win{color:var(--gold,#c9a24a)}
.gw-big-ico.lose{color:#e08c8c}
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
.gw-breakdown{display:flex;flex-direction:column;gap:5px;max-width:380px;margin:0 auto 14px}
.gw-bd-row{display:flex;align-items:center;gap:8px;font-size:11px;color:#c9c4b8;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:5px 9px}
.gw-bd-name{flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;color:#f1ece1}
.gw-bd-name .gw-ico{color:var(--gold,#c9a24a)}
.gw-bd-tags{display:flex;gap:4px}
.gw-bd-tags .gw-fx{margin-top:0}
.gw-bd-val{width:34px;text-align:right;font-weight:700;color:#fff}
.gw-final{text-align:center;padding:4px 0}
.gw-final-ico{display:block;margin:0 auto 8px;color:var(--gold,#c9a24a)}
.gw-final-title{font-size:20px;font-weight:700;color:#fff;margin-bottom:4px}
.gw-final-sub{font-size:12px;color:#c9c4b8;font-weight:300;margin-bottom:14px}
.gw-final-newrecord{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:700;color:var(--gold,#c9a24a);margin-bottom:8px}
.gw-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
.gw-actions .gw-btn{margin:0}
.gw-memory-dots{display:flex;justify-content:center;gap:7px}
.gw-memory-dot{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.06);border:1px dashed rgba(255,255,255,.28);box-sizing:border-box}
.gw-memory-dot.filled{border-style:solid;border-color:transparent}
.gw-memory-ready{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--gold,#c9a24a);font-weight:700;text-align:center;margin-bottom:10px}
.gw-memory-msg{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#c9c4b8;font-weight:300;margin-bottom:4px}
.gw-memory-msg.gained{color:var(--gold,#c9a24a);font-weight:600}
.gw-card-memory{margin-top:6px}
.gw-input{width:100%;max-width:320px;display:block;margin:0 auto 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:12px 14px;color:#f1ece1;font-family:var(--sans,sans-serif);font-size:14px;text-align:center;box-sizing:border-box}
.gw-input:focus{outline:none;border-color:var(--gold,#c9a24a)}
.gw-input.code{text-transform:uppercase;letter-spacing:.3em;font-weight:700;font-size:18px}
.gw-room-code{font-size:38px;font-weight:800;letter-spacing:.18em;color:var(--gold,#c9a24a);text-align:center;margin:10px 0 6px;font-family:var(--sans,sans-serif)}
.gw-room-code-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#c9c4b8;text-align:center;margin-bottom:4px}
.gw-online-status{font-size:13px;color:#c9c4b8;text-align:center;margin:14px 0;font-weight:300}
.gw-spinner{width:26px;height:26px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:var(--gold,#c9a24a);margin:0 auto 14px;animation:gwSpin .8s linear infinite}
@keyframes gwSpin{to{transform:rotate(360deg)}}
.gw-vs-badge{font-size:11px;color:var(--gold,#c9a24a);font-weight:700}
.gw-score-row{display:flex;align-items:center;justify-content:center;gap:22px;margin-bottom:18px}
.gw-score-side{text-align:center}
.gw-score-num{font-size:40px;font-weight:800;color:var(--gold,#c9a24a);line-height:1}
.gw-score-name{font-size:11px;color:#c9c4b8;margin-top:4px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gw-injury-card{border:1px solid rgba(224,140,140,.35);background:rgba(224,140,140,.06);border-radius:12px;padding:16px 18px;text-align:center;margin-bottom:18px}
.gw-injury-card b{color:#fff}
.gw-online-disconnected{display:flex;align-items:center;justify-content:center;gap:8px;color:#e08c8c;font-weight:700;text-align:center;margin-bottom:14px}
`;

/* ============================== ESTADO / DOM ============================== */

let _gwCache = null;

function gwFreshState(mode) {
  return {
    team: {},
    usedGroupIds: new Set(),
    currentGroup: null,
    rerollUsed: false,
    mode: mode || null,
    wars: [],
    warIndex: 0,
    warsWon: 0,
    lastBattle: null,
    history: [],
    generalMemory: gwNewGeneralMemory(),
    lutando: false,
  };
}
let _gwState = gwFreshState(null);

let _gwRollTimer = null;
let _gwBattleTimer = null;

function gwEnsureDom() {
  if (document.getElementById('gwOverlay')) return;
  const style = document.createElement('style');
  style.textContent = GW_CSS;
  document.head.appendChild(style);
  const div = document.createElement('div');
  div.id = 'gwOverlay';
  div.className = 'gw-overlay';
  div.setAttribute('role', 'dialog');
  div.setAttribute('aria-modal', 'true');
  div.setAttribute('aria-label', 'Guerras Bíblicas');
  div.innerHTML = `<div class="gw-box"><button type="button" class="gw-close" aria-label="Fechar" onclick="gwClose()">${gwIcon('x', 16)}</button><div class="gw-body" id="gwBody"></div></div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target === div) gwClose(); });

  const gwBody = div.querySelector('#gwBody');
  new MutationObserver(() => { gwBody.scrollTop = 0; }).observe(gwBody, { childList: true });
}

function gwRenderIntro() {
  gwOnlineLeaveRoom(); // voltar ao início sempre encerra qualquer sala online ativa
  const body = document.getElementById('gwBody');
  const bestCampanha = gwGetBest(GW_BEST_KEY);
  const bestSobrevivencia = gwGetBest(GW_BEST_SURVIVAL_KEY);
  const chips = GW_POSITIONS.map(p => `<div class="gw-pos-chip">${gwIcon(GW_POSITION_LABEL[p].icone, 22)}<span class="label">${GW_POSITION_LABEL[p].nome}</span></div>`).join('');
  body.innerHTML = `
    <div class="gw-eyebrow">Draft Bíblico</div>
    <h2 class="gw-title">Guerras Bíblicas</h2>
    <p class="gw-desc">Escolha o modo de jogo e depois monte seu time sorteando grupos de 3 heróis.</p>
    <div class="gw-positions-preview">${chips}</div>
    ${bestCampanha > 0 ? `<div class="gw-record">${gwIcon('medalha', 15)} Recorde Campanha: ${bestCampanha} guerra${bestCampanha === 1 ? '' : 's'} vencida${bestCampanha === 1 ? '' : 's'}</div>` : ''}
    ${bestSobrevivencia > 0 ? `<div class="gw-record">${gwIcon('chama', 15)} Recorde Sobrevivência: ${bestSobrevivencia} guerra${bestSobrevivencia === 1 ? '' : 's'} vencida${bestSobrevivencia === 1 ? '' : 's'} em sequência</div>` : ''}
    <div style="height:8px"></div>
    <div class="gw-mode-choice">
      <button class="gw-mode-btn" onclick="gwStart('campanha')">
        <div class="gw-mode-title">${gwIcon('mapa', 20)} Modo Campanha</div>
        <div class="gw-mode-desc">Enfrente ${GW_WAR_COUNT} guerras sorteadas. Vença todas para chegar à Terra Prometida.</div>
      </button>
      <button class="gw-mode-btn" onclick="gwStart('sobrevivencia')">
        <div class="gw-mode-title">${gwIcon('chama', 20)} Modo Sobrevivência</div>
        <div class="gw-mode-desc">Guerreie sem parar, das mais fáceis às mais difíceis, até perder. Vença todas e seja imbatível.</div>
      </button>
      <button class="gw-mode-btn" onclick="gwOnlineRenderNickname()">
        <div class="gw-mode-title">${gwIcon('globo', 20)} Modo Online</div>
        <div class="gw-mode-desc">Desafie outro jogador em tempo real. Melhor de 5 guerras, vence quem fizer 3 vitórias.</div>
      </button>
    </div>
  `;
}

/* ============================== DADOS ============================== */

async function gwLoadData() {
  if (_gwCache) return _gwCache;
  let [rawPersonagens, rawGuerras] = await Promise.all([
    gwFetchSheet(GW_SHEET_PERSONAGENS_URL),
    gwFetchSheet(GW_SHEET_GUERRAS_URL),
  ]);

  // Planilha ok: guarda uma cópia. Planilha fora do ar: usa a última cópia boa (o jogo segue funcionando).
  if (rawPersonagens.length && rawGuerras.length) {
    try { localStorage.setItem(GW_DATA_CACHE_KEY, JSON.stringify({ p: rawPersonagens, g: rawGuerras })); } catch (e) {}
  } else {
    try {
      const salvo = JSON.parse(localStorage.getItem(GW_DATA_CACHE_KEY) || 'null');
      if (salvo && salvo.p && salvo.p.length && salvo.g && salvo.g.length) {
        rawPersonagens = salvo.p;
        rawGuerras = salvo.g;
        console.warn('[Guerras Bíblicas] planilha indisponível agora; usando a última cópia salva.');
      }
    } catch (e) {}
  }

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
  const data = { personagens, guerras, groups };
  // Só guarda em cache se deu certo: uma falha de rede não pode travar o jogo até recarregar a página.
  if (personagens.length && guerras.length && groups.length) _gwCache = data;
  return data;
}

function gwBuildGroups(personagens) {
  const map = {};
  personagens.forEach(c => {
    const key = gwStrip(c.grupo); // "Davi" e "davi " são o mesmo grupo
    if (!map[key]) map[key] = { id: c.grupo, general: null, guerreiro: null, exercito: null };
    if (map[key][c.categoria]) {
      console.warn(`[Guerras Bíblicas] grupo "${c.grupo}" tem mais de um ${c.categoria}; ficou só o último ("${c.nome}").`);
    }
    map[key][c.categoria] = c;
  });
  const all = Object.values(map);
  const complete = all.filter(g => g.general && g.guerreiro && g.exercito);
  const incomplete = all.filter(g => !(g.general && g.guerreiro && g.exercito));
  if (incomplete.length) {
    console.warn('[Guerras Bíblicas] grupos incompletos (ignorados):', incomplete.map(g => g.id));
  }
  return complete;
}

function gwDadosErroHtml() {
  return '<div class="gw-empty">Não foi possível carregar os dados do jogo agora.<br>Verifique a internet e tente de novo.</div>' +
    '<button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar</button>';
}

async function gwStart(mode) {
  const body = document.getElementById('gwBody');
  body.innerHTML = '<div class="gw-loading">Convocando os personagens…</div>';
  const data = await gwLoadData();

  if (!data.personagens.length || !data.guerras.length || !data.groups.length) {
    console.warn('[Guerras Bíblicas] Verifique se as abas personagens (nome, categoria, overall, especialidade, fraqueza, grupo) e guerras (nome, dificuldade, tipo_de_batalha, overall) estão publicadas, e se cada grupo tem 1 general, 1 guerreiro e 1 exército.');
    body.innerHTML = `<div class="gw-empty">Não foi possível carregar os dados do jogo agora.<br>Verifique a internet e tente de novo.</div>
      <div class="gw-actions">
        <button class="gw-btn" onclick="gwStart('${mode || 'campanha'}')">Tentar de novo</button>
        <button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar</button>
      </div>`;
    return;
  }

  _gwState = gwFreshState(mode || 'campanha');
  gwRenderDraftRound();
}

/* ============================== DRAFT (SOLO) ============================== */

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
        ${gwIcon(GW_POSITION_LABEL[p].icone, 18)}
        <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
        <div class="name">${gwEscHtml(c.nome)}</div>
        <div class="over">${c.overall}</div>
      </div>`;
    }
    return `<div class="gw-tp-chip empty">
      ${gwIcon(GW_POSITION_LABEL[p].icone, 18)}
      <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
      <div class="name">—</div>
    </div>`;
  }).join('');
  return `<div class="gw-team-progress">
    <div class="gw-team-progress-label">Seu time até agora</div>
    <div class="gw-tp-row">${chips}</div>
  </div>`;
}

// Esquadrão na tela da guerra: se "war" for passado, mostra o efeito de especialidade/fraqueza naquele tipo de batalha.
function gwMiniTeamHtml(war) {
  const st = _gwState;
  const isSurvival = st.mode === 'sobrevivencia';
  const chips = GW_POSITIONS.map(p => {
    const c = st.team[p];
    if (!c) return '';
    const memHtml = (p === 'general' && isSurvival) ? gwMemoryDotsHtml(st.generalMemory.queue) : '';
    const evolved = isSurvival && c._evolvedTotal;
    const evolvedBadge = evolved ? `<span class="gw-evolved-badge">${gwIcon('sobe', 10)}+${c._evolvedTotal}</span>` : '';
    const ef = war ? gwCardEffect(c, war) : null;
    let fx = '';
    if (ef && ef.esp) fx += `<span class="gw-fx up">${gwIcon('sobe', 10)}+${gwPct(GW_SPECIALTY_BONUS_PCT)}%</span>`;
    if (ef && ef.fra) fx += `<span class="gw-fx down">${gwIcon('desce', 10)}-${gwPct(GW_WEAKNESS_PENALTY_PCT)}%</span>`;
    return `<div class="gw-tp-chip${evolved ? ' evolved' : ''}">
      ${gwIcon(GW_POSITION_LABEL[p].icone, 18)}
      <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
      <div class="name">${gwEscHtml(c.nome)}</div>
      <div class="over">${c.overall}${evolvedBadge}</div>
      ${fx}
      ${memHtml}
    </div>`;
  }).join('');
  return `<div class="gw-team-progress">
    <div class="gw-team-progress-label">Seu esquadrão</div>
    <div class="gw-tp-row">${chips}</div>
  </div>`;
}

// Peças de carta compartilhadas entre o draft solo e o online.
function gwCardInnerHtml(pos, c) {
  return `${gwDraftBadgeHtml(c)}
    <div class="gw-card-pos">${gwIcon(GW_POSITION_LABEL[pos].icone, 13)} ${GW_POSITION_LABEL[pos].nome}</div>
    <div class="gw-card-name">${gwEscHtml(c.nome)}</div>
    <div class="gw-card-overall">${c.overall}</div>`;
}
function gwRollCardsHtml(idPrefix) {
  const pool = _gwCache.personagens;
  return GW_POSITIONS.map((pos, i) => {
    const c = gwPick(pool);
    return `<div class="gw-card gw-card-rolling ${gwRarityCls(c.overall)}" id="${idPrefix}-${i}">${gwCardInnerHtml(pos, c)}</div>`;
  }).join('');
}
function gwStartRoll(idPrefix, onDone) {
  const pool = _gwCache.personagens;
  if (_gwRollTimer) clearInterval(_gwRollTimer);
  const duration = 1200 + Math.random() * 300;
  const startedAt = Date.now();
  _gwRollTimer = setInterval(() => {
    GW_POSITIONS.forEach((pos, i) => {
      const el = document.getElementById(`${idPrefix}-${i}`);
      if (!el) return;
      const c = gwPick(pool);
      el.className = `gw-card gw-card-rolling ${gwRarityCls(c.overall)}`;
      el.innerHTML = gwCardInnerHtml(pos, c);
    });
    if (Date.now() - startedAt >= duration) {
      clearInterval(_gwRollTimer);
      _gwRollTimer = null;
      onDone();
    }
  }, 80);
}
function gwDraftCardsHtml(group, team, pickFn) {
  return GW_POSITIONS.map(pos => {
    const card = group[pos];
    const filled = !!team[pos];
    const clickAttr = filled ? '' : ` onclick="${pickFn}('${pos}')"`;
    return `<div class="gw-card ${gwRarityCls(card.overall)}${filled ? ' disabled' : ''}"${clickAttr}>
      ${filled ? '<div class="gw-card-filled-badge">Posição já preenchida</div>' : ''}
      ${gwCardInnerHtml(pos, card)}
      ${gwTraitsHtml(card)}
    </div>`;
  }).join('');
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
    document.getElementById('gwBody').innerHTML = `<div class="gw-empty">Não há mais grupos disponíveis para completar o time.<br>
      Adicione mais grupos completos (general + guerreiro + exército) na planilha.</div>`;
    return;
  }

  const roundNum = GW_POSITIONS.length - empty.length + 1;
  if (isNewDraw) gwPlayDraftRollAnimation(group, roundNum);
  else gwRenderDraftCards(group, roundNum);
}

function gwPlayDraftRollAnimation(group, roundNum) {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">Rodada ${roundNum} de ${GW_POSITIONS.length}</div>
    <div class="gw-group-label">${gwIcon('dado', 14)} Sorteando grupo…</div>
    <div class="gw-cards">${gwRollCardsHtml('gwRollCard')}</div>
    ${gwTeamProgressHtml()}
  `;
  gwStartRoll('gwRollCard', () => gwRenderDraftCards(group, roundNum));
}

function gwRenderDraftCards(group, roundNum) {
  const canReroll = !_gwState.rerollUsed;
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">Rodada ${roundNum} de ${GW_POSITIONS.length}</div>
    <div class="gw-group-label">Grupo sorteado: <b>${gwEscHtml(group.id)}</b></div>
    <div class="gw-cards">${gwDraftCardsHtml(group, _gwState.team, 'gwPickCard')}</div>
    <div class="gw-reroll-wrap">
      ${canReroll ? `<button class="gw-btn gw-btn-secondary" onclick="gwRerollGroup()">${gwIcon('dado', 15)} Sortear outro grupo (1x por rodada)</button>` : ''}
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
  _gwState.rerollUsed = false;
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
  const memoryQueue = opts && opts.memoryQueue;
  const showEvolved = !!(opts && opts.showEvolved);
  const cards = GW_POSITIONS.map(pos => {
    const c = team[pos];
    const infoHtml = (showInfo && c.comentario)
      ? `<button type="button" class="gw-info-btn" onclick="event.stopPropagation();gwToggleInfo(this)" aria-label="Sobre ${gwEscHtml(c.nome)}">?
          <span class="gw-info-tooltip">${gwEscHtml(c.comentario)}</span>
        </button>`
      : '';
    const memoryHtml = (pos === 'general' && memoryQueue) ? `<div class="gw-card-memory">${gwMemoryDotsHtml(memoryQueue)}</div>` : '';
    const evolved = showEvolved && c._evolvedTotal;
    const evolvedRibbon = evolved ? `<div class="gw-evolved-ribbon">${gwIcon('sobe', 10)}+${c._evolvedTotal}</div>` : '';
    return `<div class="gw-card gw-card-static ${gwRarityCls(c.overall)}${evolved ? ' evolved' : ''}">
      ${evolvedRibbon}
      ${infoHtml}
      ${gwFinalBadgeHtml(c)}
      <div class="gw-card-pos">${gwIcon(GW_POSITION_LABEL[pos].icone, 13)} ${GW_POSITION_LABEL[pos].nome}</div>
      <div class="gw-card-name">${gwEscHtml(c.nome)}</div>
      <div class="gw-card-overall">${c.overall}</div>
      ${gwTraitsHtml(c)}
      ${memoryHtml}
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
  const modeLabel = isSurvival ? `${gwIcon('chama', 20)} Modo Sobrevivência` : `${gwIcon('mapa', 20)} Modo Campanha`;
  const modeDesc = isSurvival
    ? 'Guerreie sem parar, das mais fáceis às mais difíceis, até perder. Vença todas e seja imbatível.'
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

/* ============================== CAMPANHA / SOBREVIVÊNCIA ============================== */

function gwStartCampaign() {
  const mode = _gwState.mode || 'campanha';
  const pool = _gwCache.guerras;
  const wars = mode === 'sobrevivencia'
    ? gwBuildSurvivalSequence(pool)
    : gwBuildWeightedWarSequence(pool, Math.min(GW_WAR_COUNT, pool.length));
  _gwState.wars = wars;
  _gwState.warIndex = 0;
  _gwState.warsWon = 0;
  _gwState.history = [];
  _gwState.generalMemory = gwNewGeneralMemory();
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
  st.lutando = false;
  const war = st.wars[st.warIndex];
  if (!war) { gwRenderFinal(true); return; }

  const isSurvival = st.mode === 'sobrevivencia';
  const showDots = st.wars.length <= 12;
  const dotsHtml = showDots
    ? `<div class="gw-progress-dots">${st.wars.map((w, i) => {
        const cls = i < st.warIndex ? 'done' : i === st.warIndex ? 'active' : '';
        return `<span class="gw-dot ${cls}"></span>`;
      }).join('')}</div>`
    : '';

  let memoryReadyHtml = '';
  if (isSurvival) {
    const key = gwMemoryTypeKey(war.tipo_de_batalha);
    const ready = key && st.generalMemory.queue.some(q => q.key === key);
    if (ready) memoryReadyHtml = `<div class="gw-memory-ready">${gwIcon('ideia', 15)} Vantagem do General pronta para uso nesta guerra!</div>`;
  }

  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">${isSurvival ? `Guerra ${st.warIndex + 1}` : `Guerra ${st.warIndex + 1} de ${st.wars.length}`}</div>
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
    ${memoryReadyHtml}
    ${gwMiniTeamHtml(war)}
    <p class="gw-hint">Quem tem a especialidade do tipo de batalha ganha +${gwPct(GW_SPECIALTY_BONUS_PCT)}% de poder; quem tem a fraqueza perde ${gwPct(GW_WEAKNESS_PENALTY_PCT)}%.</p>
    <button class="gw-btn" onclick="gwFight()">${gwIcon('espadas', 16)} Lutar</button>
  `;
}

// A cada GW_EVOLVE_EVERY_WINS vitórias (só no Modo Sobrevivência), um dos 3 personagens
// evolui: ganha +1 a +3 de overall (sorteado), sem passar do teto. Clona o card em vez de
// mutar o objeto original, pra não estragar o cache compartilhado da planilha.
function gwSurvivalEvolve() {
  const st = _gwState;
  const eligible = GW_POSITIONS.filter(p => st.team[p].overall < GW_EVOLVE_OVERALL_CAP);
  const pos = eligible.length ? gwPick(eligible) : gwPick(GW_POSITIONS);
  const card = st.team[pos];
  const boost = GW_EVOLVE_MIN_BOOST + Math.floor(Math.random() * (GW_EVOLVE_MAX_BOOST - GW_EVOLVE_MIN_BOOST + 1));
  const novoOverall = Math.min(GW_EVOLVE_OVERALL_CAP, card.overall + boost);
  const ganho = novoOverall - card.overall;
  const evolvedAntes = card._evolvedTotal || 0;
  st.team[pos] = Object.assign({}, card, { overall: novoOverall, _evolvedTotal: evolvedAntes + ganho });
  return { pos, ganho, novoOverall };
}

function gwFight() {
  const st = _gwState;
  if (st.lutando) return; // duplo toque no botão não pode contar duas batalhas
  st.lutando = true;
  const war = st.wars[st.warIndex];
  const isSurvival = st.mode === 'sobrevivencia';

  let memoryUsed = null;
  if (isSurvival) {
    const key = gwMemoryTypeKey(war.tipo_de_batalha);
    if (key) {
      const idx = st.generalMemory.queue.findIndex(q => q.key === key);
      if (idx !== -1) {
        memoryUsed = st.generalMemory.queue[idx];
        st.generalMemory.queue.splice(idx, 1);
      }
    }
  }

  const poder = gwPlayerPower(st.team, war, !!memoryUsed);
  const playerPower = poder.total;
  const enemyPower = gwEnemyPower(war);

  const win = playerPower > enemyPower;
  const diff = playerPower - enemyPower;

  let memoryGained = null;
  let evolution = null;
  if (win) {
    st.warsWon++;
    if (isSurvival) {
      const key = gwMemoryTypeKey(war.tipo_de_batalha);
      if (key) {
        const mem = st.generalMemory;
        const alreadyQueued = mem.queue.some(q => q.key === key);
        if (!alreadyQueued) {
          if (!mem.counts[key]) mem.counts[key] = { count: 0, label: war.tipo_de_batalha };
          mem.counts[key].count++;
          if (mem.counts[key].count >= GW_MEMORY_WINS_TO_LEARN) {
            const learned = { key, label: war.tipo_de_batalha };
            mem.queue.push(learned);
            if (mem.queue.length > GW_MEMORY_SLOTS) mem.queue.shift();
            delete mem.counts[key];
            memoryGained = learned;
          }
        }
      }
      if (st.warsWon % GW_EVOLVE_EVERY_WINS === 0) {
        evolution = gwSurvivalEvolve();
      }
    }
  }

  st.lastBattle = { war, playerPower, enemyPower, diff, win, detalhes: poder.detalhes, memoryUsed, memoryGained, evolution, tratada: false };
  st.history.push({ nome: war.nome, win, diff, dificuldade: war.dificuldade });

  gwRenderBattleSimulation();
}

function gwRenderBattleSimulation() {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-battle-sim">
      <div class="gw-battle-sim-label">${gwIcon('espadas', 16)} Simulando a batalha…</div>
      <div class="gw-battlefield">
        <div class="gw-army player"></div>
        <div class="gw-clash-line"></div>
        <div class="gw-army enemy"></div>
      </div>
    </div>
  `;
  const duration = GW_BATTLE_SIM_MIN_MS + Math.random() * (GW_BATTLE_SIM_MAX_MS - GW_BATTLE_SIM_MIN_MS);
  if (_gwBattleTimer) clearTimeout(_gwBattleTimer);
  _gwBattleTimer = setTimeout(() => { _gwBattleTimer = null; gwRenderBattleResult(); }, duration);
}

function gwBreakdownHtml(detalhes) {
  const linhas = detalhes.map(d => {
    const tags = [];
    if (d.esp) tags.push(`<span class="gw-fx up">${gwIcon('sobe', 10)}+${gwPct(GW_SPECIALTY_BONUS_PCT)}%</span>`);
    if (d.fra) tags.push(`<span class="gw-fx down">${gwIcon('desce', 10)}-${gwPct(GW_WEAKNESS_PENALTY_PCT)}%</span>`);
    if (d.mem) tags.push(`<span class="gw-fx up">${gwIcon('ideia', 10)}+${gwPct(GW_SPECIALTY_BONUS_PCT)}%</span>`);
    return `<div class="gw-bd-row">
      <span class="gw-bd-name">${gwIcon(GW_POSITION_LABEL[d.pos].icone, 13)}${gwEscHtml(d.nome)}</span>
      <span class="gw-bd-tags">${tags.join('')}</span>
      <span class="gw-bd-val">${Math.round(d.valor)}</span>
    </div>`;
  }).join('');
  return `<div class="gw-breakdown">${linhas}</div>`;
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

  let memoryMsgHtml = '';
  if (b.memoryUsed) memoryMsgHtml += `<div class="gw-memory-msg">${gwIcon('ideia', 14)} O General usou a experiência de <b>${gwEscHtml(b.memoryUsed.label)}</b> nesta batalha!</div>`;
  if (b.memoryGained) memoryMsgHtml += `<div class="gw-memory-msg gained">${gwIcon('ideia', 14)} O General aprendeu um novo tipo de batalha: <b>${gwEscHtml(b.memoryGained.label)}</b>!</div>`;
  if (b.evolution && b.evolution.ganho > 0) {
    const ev = st.team[b.evolution.pos];
    memoryMsgHtml += `<div class="gw-memory-msg gained">${gwIcon('sobe', 14)} ${gwEscHtml(ev.nome)} evoluiu +${b.evolution.ganho} (agora ${b.evolution.novoOverall})!</div>`;
  }

  document.getElementById('gwBody').innerHTML = `
    <div class="gw-battle-result">
      ${gwIcon(b.win ? 'trofeu' : 'escudoQuebrado', 46, 'gw-big-ico ' + (b.win ? 'win' : 'lose'))}
      <div class="gw-battle-title-war">${gwEscHtml(b.war.nome)}</div>
      <div class="gw-battle-title ${b.win ? 'win' : 'lose'}">${b.win ? 'Vitória!' : 'Derrota'}</div>
      <div class="gw-battle-diff">Diferença de poder: <b>${b.diff > 0 ? '+' : ''}${b.diff}</b></div>
      <p class="gw-battle-narr">${narrText}</p>
      ${memoryMsgHtml}
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
      ${gwBreakdownHtml(b.detalhes)}
      ${gwMiniTeamHtml(b.war)}
      <button class="gw-btn" onclick="gwAfterBattle()">${nextLabel}</button>
    </div>
  `;
}

function gwAfterBattle() {
  const st = _gwState;
  if (!st.lastBattle || st.lastBattle.tratada) return; // evita pular duas guerras com duplo toque
  st.lastBattle.tratada = true;
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

  let title, icone, sub;
  if (isSurvival) {
    if (reachedAll) {
      title = 'Imbatível!';
      icone = 'coroa';
      sub = `Seu esquadrão venceu todas as ${st.wars.length} guerras disponíveis em sequência. Ninguém pode com vocês!`;
    } else {
      title = 'Fim da sequência';
      icone = 'livro';
      sub = `${st.warsWon} guerra${st.warsWon === 1 ? '' : 's'} vencida${st.warsWon === 1 ? '' : 's'} em sequência antes da derrota.`;
    }
  } else {
    title = reachedAll ? 'Vocês chegaram à Terra Prometida!' : 'A campanha terminou';
    icone = reachedAll ? 'trofeu' : 'livro';
    sub = reachedAll
      ? `Time invicto: ${st.warsWon} de ${st.wars.length} guerras vencidas.`
      : `${st.warsWon} de ${st.wars.length} guerras vencidas antes da derrota.`;
  }

  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Guerras Bíblicas</div>
    <div class="gw-final">
      ${gwIcon(icone, 48, 'gw-final-ico')}
      <div class="gw-final-title">${title}</div>
      ${isNewRecord ? `<div class="gw-final-newrecord">${gwIcon('medalha', 15)} Novo recorde!</div>` : ''}
      <p class="gw-final-sub">${sub}</p>
    </div>
    ${gwHistoryHtml()}
    ${gwTeamCardsHtml(st.team, { showInfo: true, memoryQueue: isSurvival ? st.generalMemory.queue : null, showEvolved: isSurvival })}
    <div class="gw-actions">
      <button class="gw-btn" onclick="gwRenderIntro()">Jogar novamente</button>
      <button class="gw-btn gw-btn-secondary" id="gwShareImgBtn" onclick="gwShareImage(this)">${gwIcon('camera', 15)} Compartilhar como imagem</button>
    </div>
  `;
}

/* ============================== COMPARTILHAR COMO IMAGEM ============================== */

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

function gwFitTextLine(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

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
  const W = 1080, H = 1920;
  const displayHistory = gwBuildImageHistory(st.history);
  const rows = displayHistory.length;
  const rowH = 56, rowGap = 12;
  const boxH = 300;
  const historyTop = 460;
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
    const diffLabel = `${h.diff > 0 ? '+' : ''}${h.diff}`;
    const rightEdge = rowX + rowW - 24;
    ctx.fillText(diffLabel, rightEdge, y + rowH / 2 + 8);
    const tw = ctx.measureText(diffLabel).width;
    gwDrawIconCanvas(ctx, h.win ? 'check' : 'x', rightEdge - tw - 20, y + rowH / 2, 24, h.win ? green : red);
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

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = isLegendary ? gold : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = isLegendary ? 3 : 2;
    gwRoundRect(ctx, x, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '600 18px Montserrat, sans-serif';
    ctx.fillStyle = muted;
    gwWrapFillText(ctx, (card.grupo || '').toUpperCase(), x + boxW / 2, boxY + 40, boxW - 30, 22);

    gwDrawIconCanvas(ctx, GW_POSITION_LABEL[pos].icone, x + boxW / 2, boxY + 100, 58, gold);

    ctx.font = '600 20px Montserrat, sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(GW_POSITION_LABEL[pos].nome.toUpperCase(), x + boxW / 2, boxY + 150);

    ctx.font = '700 30px Montserrat, sans-serif';
    ctx.fillStyle = isLegendary ? gold : white;
    gwWrapFillText(ctx, card.nome, x + boxW / 2, boxY + 220, boxW - 30, 34);

    if (isLegendary) {
      ctx.font = '700 20px Montserrat, sans-serif';
      ctx.fillStyle = gold;
      const legY = boxY + boxH - 24;
      ctx.fillText('LENDÁRIO', x + boxW / 2, legY);
      const lw = ctx.measureText('LENDÁRIO').width;
      gwDrawIconCanvas(ctx, 'estrela', x + boxW / 2 - lw / 2 - 16, legY - 7, 20, gold);
      gwDrawIconCanvas(ctx, 'estrela', x + boxW / 2 + lw / 2 + 16, legY - 7, 20, gold);
    }
  });

  ctx.textAlign = 'center';
  ctx.font = '600 30px Montserrat, sans-serif';
  ctx.fillStyle = gold;
  ctx.fillText(GW_SHARE_SITE_LABEL, W / 2, H - 60);

  return canvas;
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
      ? `Fui IMBATÍVEL no modo Sobrevivência de Guerras Bíblicas, vencendo todas as ${st.wars.length} guerras em sequência! Vem jogar também: ${GW_SHARE_SITE_URL}`
      : `Venci ${st.warsWon} guerra${st.warsWon === 1 ? '' : 's'} em sequência no modo Sobrevivência de Guerras Bíblicas! Vem jogar também: ${GW_SHARE_SITE_URL}`;
  }
  return `Venci ${st.warsWon} de ${st.wars.length} guerras em Guerras Bíblicas! Vem jogar também: ${GW_SHARE_SITE_URL}`;
}

async function gwShareImage(btnEl) {
  const originalHtml = btnEl ? btnEl.innerHTML : '';
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
    if (!e || e.name !== 'AbortError') console.error('[Guerras Bíblicas] erro ao compartilhar imagem:', e);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHtml; }
  }
}

/* ============================== MODO ONLINE ============================== */

const GW_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCMUYuQuxo9mijMtAUTm-QvuDHFOmMMX5Q",
  authDomain: "guerras-biblicas.firebaseapp.com",
  databaseURL: "https://guerras-biblicas-default-rtdb.firebaseio.com",
  projectId: "guerras-biblicas",
  storageBucket: "guerras-biblicas.firebasestorage.app",
  messagingSenderId: "367452222555",
  appId: "1:367452222555:web:59beff2a6e424387717b7e",
};

// Só usado se a planilha de guerras não tiver nenhum tipo_de_batalha (os tipos reais vêm da planilha).
const GW_ONLINE_TIPOS = ['campo aberto', 'cerco', 'emboscada', 'duelo', 'defesa', 'inspiração', 'guerrilha'];
const GW_ONLINE_ROUNDS = 5;
const GW_ONLINE_WINS_NEEDED = 3;
const GW_ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I/L
const GW_ROOM_CODE_REGEX = new RegExp('^[' + GW_ROOM_CODE_ALPHABET + ']{6}$');

let _gwFbLoadPromise = null;
function gwOnlineLoadSdk() {
  if (_gwFbLoadPromise) return _gwFbLoadPromise;
  _gwFbLoadPromise = new Promise((resolve, reject) => {
    const s1 = document.createElement('script');
    s1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js';
      s2.onload = () => {
        try {
          if (!firebase.apps.length) firebase.initializeApp(GW_FIREBASE_CONFIG);
          resolve(firebase.database());
        } catch (e) { reject(e); }
      };
      s2.onerror = () => reject(new Error('Falha ao carregar Firebase Database SDK'));
      document.head.appendChild(s2);
    };
    s1.onerror = () => reject(new Error('Falha ao carregar Firebase App SDK'));
    document.head.appendChild(s1);
  }).catch(e => { _gwFbLoadPromise = null; throw e; }); // permite tentar de novo se a rede falhou
  return _gwFbLoadPromise;
}

function gwOnlineGenCode() {
  let out = '';
  for (let i = 0; i < 6; i++) out += GW_ROOM_CODE_ALPHABET[Math.floor(Math.random() * GW_ROOM_CODE_ALPHABET.length)];
  return out;
}

let _gwOnlineSimTimer = null;
let _gwOnlineNick = '';

function gwOnlineFreshState() {
  return {
    db: null, codigo: null, meuSlot: null, apelido: '',
    roomRef: null, listener: null, _connRef: null, _connCb: null,
    team: {}, usedGroupIds: new Set(), currentGroup: null, rerollUsed: false,
    injuryHandled: {}, _roundIdxShown: -1, _pendingInjuryGroup: null,
    _simShownForRound: -1, _simInProgress: false,
    lastSala: null, _holdRender: false, _finalVisto: false,
  };
}
let _gwOnline = gwOnlineFreshState();

function gwOnlineGetNick() {
  const el = document.getElementById('gwNickInput');
  if (el) _gwOnlineNick = el.value.trim().slice(0, 16);
  return _gwOnlineNick || 'Jogador';
}

function gwOnlineRenderNickname() {
  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-eyebrow">Modo Online</div>
    <h2 class="gw-title">Como podemos te chamar?</h2>
    <input id="gwNickInput" class="gw-input" maxlength="16" placeholder="Seu apelido" value="${gwEscHtml(_gwOnlineNick)}" />
    <div class="gw-mode-choice">
      <button class="gw-btn" onclick="gwOnlineCreateRoom()">Criar Sala</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwOnlineRenderJoin()">Entrar em Sala</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar</button>
    </div>
  `;
  const input = document.getElementById('gwNickInput');
  if (input) input.focus();
}

function gwOnlineRenderJoin() {
  const nick = gwOnlineGetNick();
  const body = document.getElementById('gwBody');
  body.innerHTML = `
    <div class="gw-eyebrow">Modo Online</div>
    <h2 class="gw-title">Entrar em Sala</h2>
    <input id="gwNickInput" class="gw-input" maxlength="16" placeholder="Seu apelido" value="${gwEscHtml(nick)}" />
    <input id="gwCodeInput" class="gw-input code" maxlength="6" placeholder="CÓDIGO" />
    <div class="gw-mode-choice">
      <button class="gw-btn" onclick="gwOnlineJoinRoom()">Entrar</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwOnlineRenderNickname()">Voltar</button>
    </div>
  `;
}

function gwOnlineConnectErrorHtml() {
  return '<div class="gw-empty">Não foi possível conectar ao servidor online. Verifique sua internet e tente novamente.</div><button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar</button>';
}

async function gwOnlineCreateRoom() {
  const apelido = gwOnlineGetNick();
  const body = document.getElementById('gwBody');
  body.innerHTML = '<div class="gw-spinner"></div><div class="gw-online-status">Criando sala…</div>';
  try {
    if (!_gwCache) await gwLoadData();
    if (!_gwCache) { body.innerHTML = gwDadosErroHtml(); return; }
    const db = await gwOnlineLoadSdk();

    // Garante que o código não colide com uma sala que já existe (set() sobrescreveria a outra).
    let codigo = null;
    for (let i = 0; i < 6 && !codigo; i++) {
      const candidato = gwOnlineGenCode();
      const existente = await db.ref('salas/' + candidato).once('value');
      if (!existente.exists()) codigo = candidato;
    }
    if (!codigo) throw new Error('Sem código livre');

    // Tipos de batalha vêm da planilha de guerras (tudo do jogo mora no Sheets).
    const tiposPlanilha = [...new Set(_gwCache.guerras.map(g => g.tipo_de_batalha).filter(Boolean))];
    const baseTipos = tiposPlanilha.length ? tiposPlanilha : GW_ONLINE_TIPOS;
    const tiposRodadas = [];
    for (let i = 0; i < GW_ONLINE_ROUNDS; i++) tiposRodadas.push(gwPick(baseTipos));

    await db.ref('salas/' + codigo).set({
      criadaEm: firebase.database.ServerValue.TIMESTAMP,
      status: 'aguardando',
      placar: { p1: 0, p2: 0 },
      rodadaAtual: 0,
      tiposRodadas,
      jogadores: { p1: { apelido, pronto: false, time: null, conectado: true } },
      rodadas: {},
    });

    _gwOnline = gwOnlineFreshState();
    _gwOnline.db = db;
    _gwOnline.codigo = codigo;
    _gwOnline.meuSlot = 'p1';
    _gwOnline.apelido = apelido;
    gwOnlineWatchConnection();
    gwOnlineAttachListener();
  } catch (e) {
    console.error('[Guerras Bíblicas Online] erro ao criar sala:', e);
    body.innerHTML = gwOnlineConnectErrorHtml();
  }
}

async function gwOnlineJoinRoom() {
  const apelido = gwOnlineGetNick();
  const codeEl = document.getElementById('gwCodeInput');
  const codigo = codeEl ? codeEl.value.trim().toUpperCase() : '';
  const body = document.getElementById('gwBody');
  if (!GW_ROOM_CODE_REGEX.test(codigo)) {
    body.innerHTML = '<div class="gw-empty">Código inválido. Ele tem 6 letras ou números.</div><button class="gw-btn gw-btn-secondary" onclick="gwOnlineRenderJoin()">Tentar de novo</button>';
    return;
  }
  body.innerHTML = '<div class="gw-spinner"></div><div class="gw-online-status">Entrando na sala…</div>';
  try {
    if (!_gwCache) await gwLoadData();
    if (!_gwCache) { body.innerHTML = gwDadosErroHtml(); return; }
    const db = await gwOnlineLoadSdk();
    const snap = await db.ref('salas/' + codigo).once('value');
    if (!snap.exists()) {
      body.innerHTML = '<div class="gw-empty">Sala não encontrada. Confira o código.</div><button class="gw-btn gw-btn-secondary" onclick="gwOnlineRenderJoin()">Tentar de novo</button>';
      return;
    }
    const sala = snap.val();
    if (sala.status !== 'aguardando') {
      body.innerHTML = '<div class="gw-empty">Essa sala não está mais aberta para novos jogadores.</div><button class="gw-btn gw-btn-secondary" onclick="gwOnlineRenderJoin()">Tentar outro código</button>';
      return;
    }

    // Transação: se dois jogadores tentarem entrar ao mesmo tempo, só um fica com a vaga.
    const res = await db.ref(`salas/${codigo}/jogadores/p2`).transaction(atual =>
      atual === null ? { apelido, pronto: false, conectado: true } : undefined
    );
    if (!res.committed) {
      body.innerHTML = '<div class="gw-empty">Essa sala já está cheia.</div><button class="gw-btn gw-btn-secondary" onclick="gwOnlineRenderJoin()">Tentar outro código</button>';
      return;
    }
    await db.ref(`salas/${codigo}/status`).set('draft');

    _gwOnline = gwOnlineFreshState();
    _gwOnline.db = db;
    _gwOnline.codigo = codigo;
    _gwOnline.meuSlot = 'p2';
    _gwOnline.apelido = apelido;
    gwOnlineWatchConnection();
    gwOnlineAttachListener();
  } catch (e) {
    console.error('[Guerras Bíblicas Online] erro ao entrar na sala:', e);
    body.innerHTML = gwOnlineConnectErrorHtml();
  }
}

// Presença que sobrevive a oscilações de rede: o onDisconnect só vale uma vez, então a cada
// reconexão ele é armado de novo e o jogador volta a aparecer como conectado.
function gwOnlineWatchConnection() {
  const { db, codigo, meuSlot } = _gwOnline;
  const connRef = db.ref('.info/connected');
  const cb = snap => {
    if (snap.val() !== true) return;
    const me = db.ref(`salas/${codigo}/jogadores/${meuSlot}`);
    me.onDisconnect().update({ conectado: false })
      .then(() => me.update({ conectado: true }))
      .catch(() => {});
  };
  connRef.on('value', cb);
  _gwOnline._connRef = connRef;
  _gwOnline._connCb = cb;
}

function gwOnlineAttachListener() {
  const { db, codigo } = _gwOnline;
  const ref = db.ref('salas/' + codigo);
  _gwOnline.roomRef = ref;
  const cb = snap => {
    const sala = snap.val();
    if (!sala) { gwOnlineRenderError('Essa sala foi encerrada.'); return; }
    gwOnlineRenderFromState(sala);
  };
  ref.on('value', cb);
  _gwOnline.listener = cb;
}

// removida = true quando a sala já foi apagada (evita recriar um nó solto no banco).
// Se o oponente também já saiu, a sala é apagada para não acumular lixo.
function gwOnlineLeaveRoom(removida) {
  const o = _gwOnline;
  if (o.roomRef && o.listener) o.roomRef.off('value', o.listener);
  if (o._connRef && o._connCb) o._connRef.off('value', o._connCb);
  if (_gwOnlineSimTimer) { clearTimeout(_gwOnlineSimTimer); _gwOnlineSimTimer = null; }
  if (o.db && o.codigo && o.meuSlot) {
    const db = o.db, codigo = o.codigo, slot = o.meuSlot;
    const me = db.ref(`salas/${codigo}/jogadores/${slot}`);
    me.onDisconnect().cancel().catch(() => {});
    if (!removida) {
      me.update({ conectado: false })
        .then(() => db.ref('salas/' + codigo).once('value'))
        .then(snap => {
          const s = snap.val();
          const outro = s && s.jogadores && s.jogadores[slot === 'p1' ? 'p2' : 'p1'];
          if (!outro || !outro.conectado) return db.ref('salas/' + codigo).remove();
        })
        .catch(() => {});
    }
  }
  _gwOnline = gwOnlineFreshState();
}

function gwOnlineCancelRoom() {
  if (_gwOnline.db && _gwOnline.codigo) {
    _gwOnline.db.ref('salas/' + _gwOnline.codigo).remove().catch(() => {});
  }
  gwOnlineLeaveRoom(true);
  gwRenderIntro();
}

function gwOnlineRenderError(msg) {
  gwOnlineLeaveRoom(true);
  const body = document.getElementById('gwBody');
  if (body) body.innerHTML = `<div class="gw-empty">${gwEscHtml(msg)}</div><button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar</button>`;
}

function gwOnlineRenderFromState(sala) {
  const meuSlot = _gwOnline.meuSlot;
  if (!meuSlot) return;
  _gwOnline.lastSala = sala;
  if (_gwOnline._holdRender) return; // tela local (substituição) em andamento: não sobrescrever
  const oponenteSlot = meuSlot === 'p1' ? 'p2' : 'p1';
  const eu = sala.jogadores && sala.jogadores[meuSlot];
  const oponente = sala.jogadores && sala.jogadores[oponenteSlot];

  if (sala.status !== 'finalizada' && oponente && oponente.conectado === false) {
    gwOnlineRenderDisconnected(oponente);
    return;
  }

  if (sala.status === 'aguardando') { gwOnlineRenderWaiting(); return; }

  if (sala.status === 'draft') {
    if (!eu || !eu.pronto) {
      gwOnlineRenderDraft();
    } else {
      gwOnlineRenderWaitingOpponentDraft(oponente);
      if (oponente && oponente.pronto) {
        _gwOnline.db.ref(`salas/${_gwOnline.codigo}/status`).set('batalha').catch(() => {});
      }
    }
    return;
  }

  if (sala.status === 'batalha') { gwOnlineRenderBattlePhase(sala); return; }

  if (sala.status === 'finalizada') {
    // A rodada decisiva grava vencedor e "finalizada" juntos: mostra a batalha dela antes do resultado final.
    const r = sala.rodadas && sala.rodadas[sala.rodadaAtual];
    if (!_gwOnline._finalVisto && r && r.vencedor) gwOnlineRenderBattlePhase(sala);
    else gwOnlineRenderFinal(sala);
  }
}

function gwOnlineRenderWaiting() {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Modo Online</div>
    <h2 class="gw-title">Aguardando oponente…</h2>
    <div class="gw-room-code-label">Compartilhe este código</div>
    <div class="gw-room-code">${gwEscHtml(_gwOnline.codigo)}</div>
    <div class="gw-spinner"></div>
    <p class="gw-desc">Assim que alguém entrar com esse código, o duelo começa automaticamente.</p>
    <button class="gw-btn gw-btn-secondary" onclick="gwOnlineCancelRoom()">Cancelar</button>
  `;
}

function gwOnlineRenderWaitingOpponentDraft(oponente) {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Time confirmado</div>
    <h2 class="gw-title">Aguardando ${gwEscHtml(oponente ? oponente.apelido : 'oponente')}…</h2>
    ${gwTeamCardsHtml(_gwOnline.team)}
    <div class="gw-spinner"></div>
  `;
}

function gwOnlineEmptyPositions() {
  return GW_POSITIONS.filter(p => !_gwOnline.team[p]);
}
function gwOnlineDrawGroup(excludeId) {
  const empty = gwOnlineEmptyPositions();
  const pool = _gwCache.groups.filter(g =>
    !_gwOnline.usedGroupIds.has(g.id) && g.id !== excludeId && empty.some(pos => g[pos])
  );
  return pool.length ? gwPick(pool) : null;
}
function gwOnlineDrawAnyGroupWithPos(pos) {
  const pool = _gwCache.groups.filter(g => g[pos]);
  return pool.length ? gwPick(pool) : null;
}

function gwOnlineRenderDraft() {
  const empty = gwOnlineEmptyPositions();
  if (!empty.length) { gwOnlineRenderReadyCheck(); return; }

  let isNewDraw = false;
  if (!_gwOnline.currentGroup) {
    _gwOnline.currentGroup = gwOnlineDrawGroup();
    isNewDraw = true;
  }
  const group = _gwOnline.currentGroup;
  if (!group) {
    document.getElementById('gwBody').innerHTML = '<div class="gw-empty">Não há mais grupos disponíveis para completar o time.</div>';
    return;
  }
  const roundNum = GW_POSITIONS.length - empty.length + 1;
  if (isNewDraw) gwOnlinePlayDraftRoll(group, roundNum);
  else gwOnlineRenderDraftCards(group, roundNum);
}

function gwOnlinePlayDraftRoll(group, roundNum) {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">Seu time (privado) — Rodada ${roundNum} de ${GW_POSITIONS.length}</div>
    <div class="gw-group-label">${gwIcon('dado', 14)} Sorteando grupo…</div>
    <div class="gw-cards">${gwRollCardsHtml('gwOnlineRollCard')}</div>
  `;
  gwStartRoll('gwOnlineRollCard', () => {
    if (_gwOnline.currentGroup === group) gwOnlineRenderDraftCards(group, roundNum);
  });
}

function gwOnlineRenderDraftCards(group, roundNum) {
  const canReroll = !_gwOnline.rerollUsed;
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">Seu time (privado) — Rodada ${roundNum} de ${GW_POSITIONS.length}</div>
    <div class="gw-group-label">Grupo sorteado: <b>${gwEscHtml(group.id)}</b></div>
    <div class="gw-cards">${gwDraftCardsHtml(group, _gwOnline.team, 'gwOnlinePickCard')}</div>
    <div class="gw-reroll-wrap">
      ${canReroll ? `<button class="gw-btn gw-btn-secondary" onclick="gwOnlineRerollGroup()">${gwIcon('dado', 15)} Sortear outro grupo (1x por rodada)</button>` : ''}
    </div>
  `;
}

function gwOnlinePickCard(pos) {
  const group = _gwOnline.currentGroup;
  if (!group) return;
  const card = group[pos];
  if (!card || _gwOnline.team[pos]) return;
  _gwOnline.team[pos] = card;
  _gwOnline.usedGroupIds.add(group.id);
  _gwOnline.currentGroup = null;
  _gwOnline.rerollUsed = false;
  gwOnlineRenderDraft();
}

function gwOnlineRerollGroup() {
  if (_gwOnline.rerollUsed || !_gwOnline.currentGroup) return;
  _gwOnline.rerollUsed = true;
  const prevId = _gwOnline.currentGroup.id;
  const empty = gwOnlineEmptyPositions();
  const roundNum = GW_POSITIONS.length - empty.length + 1;
  const newGroup = gwOnlineDrawGroup(prevId);
  _gwOnline.currentGroup = newGroup;
  if (newGroup) gwOnlinePlayDraftRoll(newGroup, roundNum);
  else { _gwOnline.currentGroup = null; gwOnlineRenderDraft(); }
}

function gwOnlineRenderReadyCheck() {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Time pronto</div>
    <h2 class="gw-title">Seu esquadrão está montado</h2>
    ${gwTeamCardsHtml(_gwOnline.team)}
    <p class="gw-desc">O time do seu oponente fica em segredo até os dois confirmarem.</p>
    <button class="gw-btn" onclick="gwOnlineConfirmReady()">Confirmar e aguardar oponente</button>
  `;
}
async function gwOnlineConfirmReady() {
  const { db, codigo, meuSlot, team } = _gwOnline;
  await db.ref(`salas/${codigo}/jogadores/${meuSlot}`).update({ time: team, pronto: true });
}

function gwOnlineScoreRowHtml(sala) {
  const meuSlot = _gwOnline.meuSlot;
  const opSlot = meuSlot === 'p1' ? 'p2' : 'p1';
  const meuNome = sala.jogadores[meuSlot] ? sala.jogadores[meuSlot].apelido : 'Você';
  const opNome = sala.jogadores[opSlot] ? sala.jogadores[opSlot].apelido : 'Oponente';
  const placar = sala.placar || {};
  return `<div class="gw-score-row">
    <div class="gw-score-side"><div class="gw-score-num">${gwSafeNum(placar[meuSlot])}</div><div class="gw-score-name">${gwEscHtml(meuNome)}</div></div>
    <div class="gw-vs-badge">×</div>
    <div class="gw-score-side"><div class="gw-score-num">${gwSafeNum(placar[opSlot])}</div><div class="gw-score-name">${gwEscHtml(opNome)}</div></div>
  </div>`;
}

// Chips pequenos e agrupados, mais compactos que os cards grandes: mostram os dois esquadrões na batalha.
function gwOnlineTeamChipsHtml(team, label) {
  const chips = GW_POSITIONS.map(p => {
    const c = team[p];
    if (!c) return '';
    return `<div class="gw-tp-chip">
      ${gwIcon(GW_POSITION_LABEL[p].icone, 18)}
      <div class="pos">${GW_POSITION_LABEL[p].nome}</div>
      <div class="name">${gwEscHtml(c.nome)}</div>
      <div class="over">${gwSafeNum(c.overall)}</div>
    </div>`;
  }).join('');
  return `<div class="gw-team-progress">
    <div class="gw-team-progress-label">${gwEscHtml(label)}</div>
    <div class="gw-tp-row">${chips}</div>
  </div>`;
}

// Mostra os dois esquadrões (o meu e o do oponente) durante toda a batalha,
// para lembrar quem está no time na hora de decidir uma substituição.
function gwOnlineBothTeamsHtml(sala) {
  const meuSlot = _gwOnline.meuSlot;
  const opSlot = meuSlot === 'p1' ? 'p2' : 'p1';
  const opJogador = sala.jogadores && sala.jogadores[opSlot];
  const opTime = opJogador && opJogador.time;
  let html = gwOnlineTeamChipsHtml(_gwOnline.team, 'Seu time');
  if (opTime) html += gwOnlineTeamChipsHtml(opTime, opJogador.apelido || 'Oponente');
  return html;
}

function gwOnlineMyPowerForRound(sala) {
  const idx = sala.rodadaAtual;
  const tipo = sala.tiposRodadas[idx];
  const fakeWar = { tipo_de_batalha: tipo };
  const contributions = GW_POSITIONS.map(p => gwCardContribution(_gwOnline.team[p], fakeWar));
  const basePower = contributions.reduce((a, b) => a + b, 0);
  const jitter = 1 + (Math.random() * 2 - 1) * GW_RANDOM_JITTER_PCT;
  return Math.round(basePower * jitter);
}

function gwOnlineComputeRoundWinner(sala, rodada) {
  const p1 = gwSafeNum(rodada.poderP1), p2 = gwSafeNum(rodada.poderP2);
  if (p1 !== p2) return p1 > p2 ? 'p1' : 'p2';
  const g1 = (sala.jogadores.p1.time && sala.jogadores.p1.time.general && gwSafeNum(sala.jogadores.p1.time.general.overall)) || 0;
  const g2 = (sala.jogadores.p2.time && sala.jogadores.p2.time.general && gwSafeNum(sala.jogadores.p2.time.general.overall)) || 0;
  if (g1 !== g2) return g1 > g2 ? 'p1' : 'p2';
  // Desempate igual nos dois aparelhos (nada de Math.random aqui: cada cliente decidiria diferente).
  const seed = (_gwOnline.codigo || 'A').split('').reduce((a, c) => a + c.charCodeAt(0), 0) + sala.rodadaAtual;
  return seed % 2 ? 'p1' : 'p2';
}

async function gwOnlineFinalizeRound(sala, idx, vencedor) {
  const db = _gwOnline.db, codigo = _gwOnline.codigo;
  const novoPlacarVencedor = (sala.placar[vencedor] || 0) + 1;
  const perdedor = vencedor === 'p1' ? 'p2' : 'p1';
  const updates = {};
  updates[`rodadas/${idx}/vencedor`] = vencedor;
  updates[`placar/${vencedor}`] = novoPlacarVencedor;

  const matchAcabou = novoPlacarVencedor >= GW_ONLINE_WINS_NEEDED || idx + 1 >= sala.tiposRodadas.length;
  if (matchAcabou) {
    updates['status'] = 'finalizada';
    updates['vencedorPartida'] = novoPlacarVencedor >= GW_ONLINE_WINS_NEEDED
      ? vencedor
      : (novoPlacarVencedor >= (sala.placar[perdedor] || 0) ? vencedor : perdedor);
  }
  await db.ref('salas/' + codigo).update(updates);
}

async function gwOnlineRenderBattlePhase(sala) {
  const idx = sala.rodadaAtual;
  const meuSlot = _gwOnline.meuSlot;
  const oponenteSlot = meuSlot === 'p1' ? 'p2' : 'p1';
  const rodada = (sala.rodadas && sala.rodadas[idx]) || {};
  const meuPoderKey = meuSlot === 'p1' ? 'poderP1' : 'poderP2';
  const opPoderKey = oponenteSlot === 'p1' ? 'poderP1' : 'poderP2';

  if (rodada[meuPoderKey] === undefined || rodada[meuPoderKey] === null) {
    const poder = gwOnlineMyPowerForRound(sala);
    await _gwOnline.db.ref(`salas/${_gwOnline.codigo}/rodadas/${idx}/${meuPoderKey}`).set(poder);
    gwOnlineRenderBattleWaiting(sala);
    return;
  }

  if (rodada[opPoderKey] === undefined || rodada[opPoderKey] === null) {
    gwOnlineRenderBattleWaiting(sala);
    return;
  }

  if (!rodada.vencedor) {
    const vencedor = gwOnlineComputeRoundWinner(sala, rodada);
    await gwOnlineFinalizeRound(sala, idx, vencedor);
    return;
  }

  // Roda a animação de batalha (barras se chocando) uma única vez por rodada, localmente
  // em cada cliente. Enquanto ela roda, ignora re-renders vindos do listener pra não cortar.
  if (_gwOnline._simShownForRound !== idx) {
    _gwOnline._simShownForRound = idx;
    _gwOnline._simInProgress = true;
    gwOnlineRenderBattleSimAnimation(sala, rodada);
    return;
  }
  if (_gwOnline._simInProgress) return;

  const bothReady = rodada.prontoP1 && rodada.prontoP2;
  if (bothReady && sala.status !== 'finalizada') {
    _gwOnline.db.ref(`salas/${_gwOnline.codigo}/rodadaAtual`).set(idx + 1).catch(() => {});
    document.getElementById('gwBody').innerHTML = '<div class="gw-spinner"></div><div class="gw-online-status">Preparando próxima rodada…</div>';
    return;
  }

  gwOnlineRenderRoundResult(sala, rodada);
}

function gwOnlineRenderBattleSimAnimation(sala, rodada) {
  const idx = sala.rodadaAtual;
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">Rodada ${idx + 1} de ${sala.tiposRodadas.length}</div>
    ${gwOnlineScoreRowHtml(sala)}
    ${gwOnlineBothTeamsHtml(sala)}
    <div class="gw-battle-sim">
      <div class="gw-battle-sim-label">${gwIcon('espadas', 16)} Simulando a batalha…</div>
      <div class="gw-battlefield">
        <div class="gw-army player"></div>
        <div class="gw-clash-line"></div>
        <div class="gw-army enemy"></div>
      </div>
    </div>
  `;
  const duration = GW_BATTLE_SIM_MIN_MS + Math.random() * (GW_BATTLE_SIM_MAX_MS - GW_BATTLE_SIM_MIN_MS);
  if (_gwOnlineSimTimer) clearTimeout(_gwOnlineSimTimer);
  _gwOnlineSimTimer = setTimeout(() => {
    _gwOnlineSimTimer = null;
    _gwOnline._simInProgress = false;
    gwOnlineRenderRoundResult(sala, rodada);
  }, duration);
}

function gwOnlineRenderBattleWaiting(sala) {
  const idx = sala.rodadaAtual;
  const tipo = sala.tiposRodadas[idx];
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-round-label">Rodada ${idx + 1} de ${sala.tiposRodadas.length}</div>
    ${gwOnlineScoreRowHtml(sala)}
    <div class="gw-war-card"><div class="gw-war-name">Tipo de batalha: ${gwEscHtml(tipo)}</div></div>
    ${gwOnlineBothTeamsHtml(sala)}
    <div class="gw-battle-sim-label">${gwIcon('espadas', 16)} Calculando o poder dos exércitos…</div>
    <div class="gw-spinner"></div>
  `;
}

function gwOnlineWeakestPos() {
  const team = _gwOnline.team;
  let weakest = GW_POSITIONS[0];
  GW_POSITIONS.forEach(p => { if (team[p].overall < team[weakest].overall) weakest = p; });
  return weakest;
}

function gwOnlineRenderRoundResult(sala, rodada) {
  const idx = sala.rodadaAtual;
  _gwOnline._roundIdxShown = idx;
  const meuSlot = _gwOnline.meuSlot;
  const euVenci = rodada.vencedor === meuSlot;
  const tipo = sala.tiposRodadas[idx];
  const meuPoder = gwSafeNum(meuSlot === 'p1' ? rodada.poderP1 : rodada.poderP2);
  const opPoder = gwSafeNum(meuSlot === 'p1' ? rodada.poderP2 : rodada.poderP1);
  const maxPower = Math.max(meuPoder, opPoder, 1);
  const handled = _gwOnline.injuryHandled[idx];
  const acabou = sala.status === 'finalizada';

  document.getElementById('gwBody').innerHTML = `
    <div class="gw-battle-result">
      ${gwIcon(euVenci ? 'trofeu' : 'escudoQuebrado', 46, 'gw-big-ico ' + (euVenci ? 'win' : 'lose'))}
      <div class="gw-battle-title-war">Tipo de batalha: ${gwEscHtml(tipo)}</div>
      <div class="gw-battle-title ${euVenci ? 'win' : 'lose'}">${euVenci ? 'Vitória!' : 'Derrota'}</div>
      <div class="gw-power-bars">
        <div class="gw-power-row">
          <span class="lbl">Você</span>
          <div class="gw-power-track"><div class="gw-power-fill player" style="width:${Math.round(meuPoder / maxPower * 100)}%"></div></div>
          <span class="gw-power-val">${meuPoder}</span>
        </div>
        <div class="gw-power-row">
          <span class="lbl">Oponente</span>
          <div class="gw-power-track"><div class="gw-power-fill enemy" style="width:${Math.round(opPoder / maxPower * 100)}%"></div></div>
          <span class="gw-power-val">${opPoder}</span>
        </div>
      </div>
      ${gwOnlineScoreRowHtml(sala)}
      ${gwOnlineBothTeamsHtml(sala)}
      ${(!acabou && !euVenci && !handled) ? gwOnlineInjuryPromptHtml(idx) : ''}
      ${acabou
        ? `<button class="gw-btn" onclick="gwOnlineVerFinal()">Ver resultado final</button>`
        : ((euVenci || handled) ? `<button class="gw-btn" onclick="gwOnlineContinueAfterRound()">Continuar</button>` : '')}
    </div>
  `;
}

function gwOnlineVerFinal() {
  _gwOnline._finalVisto = true;
  if (_gwOnline.lastSala) gwOnlineRenderFinal(_gwOnline.lastSala);
}

function gwOnlineInjuryPromptHtml(idx) {
  const pos = gwOnlineWeakestPos();
  const card = _gwOnline.team[pos];
  return `<div class="gw-injury-card">
    <b>${gwEscHtml(card.nome)}</b> se feriu durante a batalha!<br>Substituir ou deixá-lo se recuperar?
    <div class="gw-actions" style="margin-top:12px">
      <button class="gw-btn" onclick="gwOnlineStartInjuryReroll('${pos}', ${idx})">${gwIcon('trocar', 15)} Substituir</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwOnlineDeclineInjury(${idx})">${gwIcon('cruz', 15)} Deixar se recuperar</button>
    </div>
  </div>`;
}

function gwOnlineDeclineInjury(idx) {
  _gwOnline.injuryHandled[idx] = true;
  gwOnlineContinueAfterRound();
}

function gwOnlineStartInjuryReroll(pos, idx) {
  _gwOnline.injuryHandled[idx] = true;
  const group = gwOnlineDrawAnyGroupWithPos(pos);
  if (!group || !group[pos]) { gwOnlineContinueAfterRound(); return; }
  gwOnlineRenderInjuryGroup(group, pos);
}

function gwOnlineRenderInjuryGroup(group, pos) {
  _gwOnline._holdRender = true; // o oponente clicar em "Continuar" não pode apagar esta tela
  const card = group[pos];
  _gwOnline._pendingInjuryGroup = group;
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Substituição</div>
    <h2 class="gw-title">Novo ${GW_POSITION_LABEL[pos].nome} disponível</h2>
    <div class="gw-cards" style="max-width:260px;margin-left:auto;margin-right:auto">
      <div class="gw-card ${gwRarityCls(card.overall)}" onclick="gwOnlineConfirmInjurySwap('${pos}')">
        ${gwCardInnerHtml(pos, card)}
        ${gwTraitsHtml(card)}
      </div>
    </div>
    <div class="gw-actions">
      <button class="gw-btn gw-btn-secondary" onclick="gwOnlineContinueAfterRound()">Manter ${gwEscHtml(_gwOnline.team[pos].nome)}</button>
    </div>
  `;
}

function gwOnlineConfirmInjurySwap(pos) {
  const group = _gwOnline._pendingInjuryGroup;
  if (!group) return;
  _gwOnline.team[pos] = group[pos];
  _gwOnline._pendingInjuryGroup = null;
  gwOnlineContinueAfterRound();
}

async function gwOnlineContinueAfterRound() {
  _gwOnline._holdRender = false;
  const { db, codigo, meuSlot } = _gwOnline;
  const idx = _gwOnline._roundIdxShown;
  const updates = {};
  updates[`rodadas/${idx}/pronto${meuSlot === 'p1' ? 'P1' : 'P2'}`] = true;
  await db.ref(`salas/${codigo}`).update(updates);
  await db.ref(`salas/${codigo}/jogadores/${meuSlot}/time`).set(_gwOnline.team);
  document.getElementById('gwBody').innerHTML = '<div class="gw-spinner"></div><div class="gw-online-status">Aguardando o oponente…</div>';
}

function gwOnlineRenderFinal(sala) {
  const meuSlot = _gwOnline.meuSlot;
  const opSlot = meuSlot === 'p1' ? 'p2' : 'p1';
  const euGanhei = sala.vencedorPartida === meuSlot;
  const placar = sala.placar || {};
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Guerras Bíblicas — Online</div>
    <div class="gw-final">
      ${gwIcon(euGanhei ? 'trofeu' : 'livro', 48, 'gw-final-ico')}
      <div class="gw-final-title">${euGanhei ? 'Vitória!' : 'Derrota'}</div>
      <p class="gw-final-sub">Placar final: ${gwSafeNum(placar[meuSlot])} × ${gwSafeNum(placar[opSlot])}</p>
    </div>
    ${gwOnlineScoreRowHtml(sala)}
    ${gwTeamCardsHtml(_gwOnline.team, { showInfo: true })}
    <div class="gw-actions">
      <button class="gw-btn" onclick="gwOnlineRematch()">Jogar novamente</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar ao início</button>
    </div>
  `;
}

function gwOnlineRematch() {
  gwOnlineLeaveRoom();
  gwOnlineRenderNickname();
}

function gwOnlineRenderDisconnected(oponente) {
  document.getElementById('gwBody').innerHTML = `
    <div class="gw-eyebrow">Modo Online</div>
    <div class="gw-online-disconnected">${gwIcon('alerta', 18)} ${gwEscHtml(oponente && oponente.apelido ? oponente.apelido : 'O oponente')} desconectou.</div>
    <p class="gw-desc">A partida não pode continuar sem os dois jogadores. Se foi só uma oscilação de internet, ela volta sozinha assim que a conexão voltar.</p>
    <div class="gw-actions">
      <button class="gw-btn" onclick="gwOnlineRematch()">Nova partida</button>
      <button class="gw-btn gw-btn-secondary" onclick="gwRenderIntro()">Voltar ao início</button>
    </div>
  `;
}

/* ============================== ABRIR / FECHAR ============================== */

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
  if (_gwBattleTimer) { clearTimeout(_gwBattleTimer); _gwBattleTimer = null; }
  gwOnlineLeaveRoom();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('gwOverlay');
    if (ov && ov.classList.contains('open')) gwClose();
  }
});

/* ============================== SIMULADOR DE BALANCEAMENTO ==============================
   Uso (console do navegador, F12):  await gwSimularBalanceamento(3000)
   Sorteia milhares de times (draft "guloso": sempre a carta de maior overall do grupo sorteado,
   sem usar o sorteio extra) e mostra a % de vitória contra cada guerra e a chance de zerar a campanha.
   Use para ajustar os overalls na planilha. Não altera nada no jogo. */
async function gwSimularBalanceamento(vezes) {
  const n = vezes || 2000;
  const data = await gwLoadData();
  if (!data.groups.length || !data.guerras.length) {
    console.warn('[Guerras Bíblicas] sem dados para simular.');
    return;
  }
  const stats = data.guerras.map(w => ({ w, wins: 0 }));
  let validos = 0, campanhaOk = 0, somaOverall = 0;

  for (let i = 0; i < n; i++) {
    const team = {};
    const usados = new Set();
    while (GW_POSITIONS.some(p => !team[p])) {
      const livres = GW_POSITIONS.filter(p => !team[p]);
      const pool = data.groups.filter(g => !usados.has(g.id));
      if (!pool.length) break;
      const g = gwPick(pool);
      let melhor = livres[0];
      livres.forEach(p => { if (g[p].overall > g[melhor].overall) melhor = p; });
      team[melhor] = g[melhor];
      usados.add(g.id);
    }
    if (GW_POSITIONS.some(p => !team[p])) continue;
    validos++;
    somaOverall += GW_POSITIONS.reduce((a, p) => a + team[p].overall, 0);
    stats.forEach(s => { if (gwPlayerPower(team, s.w, false).total > gwEnemyPower(s.w)) s.wins++; });
    const seq = gwBuildWeightedWarSequence(data.guerras, GW_WAR_COUNT);
    if (seq.every(w => gwPlayerPower(team, w, false).total > gwEnemyPower(w))) campanhaOk++;
  }

  if (!validos) { console.warn('[Guerras Bíblicas] não foi possível montar times para simular.'); return; }
  const linhas = stats.map(s => ({
    guerra: s.w.nome,
    dificuldade: s.w.dificuldade,
    tipo: s.w.tipo_de_batalha,
    poder_inimigo: s.w.overall,
    vitoria_pct: Math.round(s.wins / validos * 1000) / 10,
  }));
  console.log(`[Guerras Bíblicas] ${validos} times simulados. Soma média dos 3 overalls: ${Math.round(somaOverall / validos)}.`);
  console.table(linhas);
  console.log(`Campanha de ${GW_WAR_COUNT} guerras: ${Math.round(campanhaOk / validos * 1000) / 10}% dos times chegam à Terra Prometida.`);
  return linhas;
}

window.abrirGuerrasBiblicas = gwOpen;
window.gwSimularBalanceamento = gwSimularBalanceamento;
