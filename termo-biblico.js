/* Termo Bíblico: uma palavra bíblica por dia (estilo Wordle), dados via Google Sheets (TSV).
   Inclua este arquivo no site e chame window.abrirTermoBiblico() para abrir.
   Planilha (aba "termo"): palavra | categoria | dica | referencia | comentario | data (opcional).
   A aba precisa estar publicada na web em formato TSV (pub?gid=...&single=true&output=tsv). */

const TB_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRyhTenbfftqs8iUdYuhP_6XSjAWeRJIHouHTtpTtWgqLRDEDssg8zex00DDDHDu5s_GsmVnQFWQdNy/pub?gid=1917499254&single=true&output=tsv';

const TB_TENTATIVAS = 6;
const TB_MIN_LETRAS = 4;
const TB_MAX_LETRAS = 8;
const TB_DICA_APOS = 3;
const TB_DATA_INICIO = '2026-11-22';
const TB_FUSO = 'America/Sao_Paulo';

const TB_STATS_KEY = 'tbStats';
const TB_DIA_KEY = 'tbDiaSalvo';
const TB_AJUDA_KEY = 'tbAjudaVista';
const TB_DATA_CACHE_KEY = 'tbUltimaCopiaPlanilha';

const TB_SHARE_SITE_URL = 'https://adbelembarueri.com.br/mais';
const TB_SHARE_SITE_LABEL = 'adbelembarueri.com.br/mais';

const TB_ELOGIOS = ['Genial!', 'Magnífico!', 'Impressionante!', 'Muito bem!', 'Boa!', 'Ufa!'];

const TB_ICONS = {
  x: ['M6 6 L18 18 M18 6 L6 18'],
  check: ['M5 12.5 L10 17.5 L19 7'],
  ajuda: [
    ['M21 12 A9 9 0 1 1 3 12 A9 9 0 1 1 21 12 Z', 'a'],
    'M9.5 9.5 A2.5 2.5 0 1 1 12.8 11.9 C12.2 12.3 12 12.8 12 13.6',
    'M12 17.2 V17.3',
  ],
  grafico: ['M5 20 V12 M12 20 V5 M19 20 V9 M3 20 H21'],
  apagar: [
    ['M9 5 H20 V19 H9 L3 12 Z', 'a'],
    'M12.5 9.5 L16.5 14.5 M16.5 9.5 L12.5 14.5',
  ],
  enter: ['M20 5 V13 H8 M12 9 L8 13 L12 17'],
  relogio: [
    ['M21 12 A9 9 0 1 1 3 12 A9 9 0 1 1 21 12 Z', 'a'],
    'M12 7 V12 L15.5 14',
  ],
  girar: ['M19.5 12 A7.5 7.5 0 0 0 6.2 7.2 M5.5 3.8 V7.8 H9.5 M4.5 12 A7.5 7.5 0 0 0 17.8 16.8 M18.5 20.2 V16.2 H14.5'],
  camera: [
    ['M4 8 H7.5 L9 5.5 H15 L16.5 8 H20 V19 H4 Z', 'a'],
    'M8.8 13.5 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0 Z',
  ],
  trofeu: [
    ['M7.5 4 H16.5 V9.5 A4.5 4.5 0 0 1 7.5 9.5 Z', 'a'],
    'M7.5 6 H4.5 V8 A3 3 0 0 0 7.5 11 M16.5 6 H19.5 V8 A3 3 0 0 1 16.5 11 M12 14 V17.5 M9.5 17.5 H14.5 V20.5 H9.5 Z M8 20.5 H16',
  ],
  livro: [
    ['M12 6.5 C10 4.8 6.5 4.3 3.5 4.8 V18.5 C6.5 18 10 18.5 12 20.2 C14 18.5 17.5 18 20.5 18.5 V4.8 C17.5 4.3 14 4.8 12 6.5 Z', 'a'],
    'M12 6.5 V20.2',
  ],
  chama: [
    ['M12 3 C12.8 7 18 9 18 14.2 C18 17.9 15.3 21 12 21 C8.7 21 6 17.9 6 14.2 C6 11.7 7.3 10.2 8.4 8.6 C8.9 10.2 9.9 10.8 10.6 10.3 C10.1 7.6 10.9 5 12 3 Z', 'a'],
    'M12 21 C10.4 21 9.3 19.7 9.3 18.1 C9.3 16.3 11 15.4 12 13.5 C13 15.4 14.7 16.3 14.7 18.1 C14.7 19.7 13.6 21 12 21 Z',
  ],
  ideia: [
    ['M12 3 A6 6 0 0 0 8.5 14 C9.3 14.8 9.5 15.7 9.5 17 H14.5 C14.5 15.7 14.7 14.8 15.5 14 A6 6 0 0 0 12 3 Z', 'a'],
    'M9.7 20 H14.3 M10.5 22 H13.5',
  ],
  pessoa: [
    ['M15.5 8 A3.5 3.5 0 1 1 8.5 8 A3.5 3.5 0 1 1 15.5 8 Z', 'a'],
    'M5 20 C5 16 8 14 12 14 C16 14 19 16 19 20',
  ],
  lugar: [
    ['M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z', 'a'],
    'M14.2 9.5 A2.2 2.2 0 1 1 9.8 9.5 A2.2 2.2 0 1 1 14.2 9.5 Z',
  ],
};

function tbIcon(nome, size, cls) {
  const def = TB_ICONS[nome];
  if (!def) return '';
  const s = size || 18;
  const paths = def.map(p => {
    const d = typeof p === 'string' ? p : p[0];
    const m = typeof p === 'string' ? '' : p[1];
    if (m === 'f') return `<path d="${d}" fill="currentColor"/>`;
    if (m === 'a') return `<path d="${d}" fill="currentColor" fill-opacity=".2"/>`;
    return `<path d="${d}"/>`;
  }).join('');
  return `<svg class="tb-ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function tbDrawIconCanvas(ctx, nome, cx, cy, size, color) {
  const def = TB_ICONS[nome];
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

function tbIconeCategoria(cat) {
  const c = tbStrip(cat);
  if (c.startsWith('pessoa') || c.startsWith('person')) return 'pessoa';
  if (c.startsWith('lugar') || c.startsWith('local') || c.startsWith('cidade')) return 'lugar';
  if (c.startsWith('livro')) return 'livro';
  return 'ideia';
}

const tbEsc = window.escHtml || function (s) {
  return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
};

function tbStrip(v) {
  return (v || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function tbNormKey(k) {
  return tbStrip(k).replace(/\s+/g, '_');
}
function tbPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function tbParseTsv(text) {
  if (!text) return [];
  text = text.replace(/\r\n?/g, '\n');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const live = rows.filter(r => r.some(v => v.trim() !== ''));
  if (live.length < 2) return [];
  const headers = live[0].map(h => h.trim().toLowerCase());
  return live.slice(1).map(r => {
    const o = {};
    headers.forEach((h, j) => { o[h] = (r[j] !== undefined ? r[j] : '').trim(); });
    return o;
  }).filter(o => Object.values(o).some(v => v !== ''));
}

async function tbFetchSheet(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('http');
    const text = await r.text();
    if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('html');
    return tbParseTsv(text);
  } catch (e) {
    console.warn('[Termo Bíblico] não foi possível ler a planilha:', e && e.message);
    return [];
  }
}

function tbHoje() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TB_FUSO }).format(new Date());
}
function tbParseDia(s) {
  const [a, m, d] = s.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}
function tbDiasEntre(a, b) { return Math.round((tbParseDia(b) - tbParseDia(a)) / 86400000); }
function tbDiaDeslocado(dia, delta) {
  const dt = new Date(tbParseDia(dia) + delta * 86400000);
  return dt.toISOString().slice(0, 10);
}
function tbNormData(v) {
  const s = (v || '').toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}
function tbDataExtenso(dia) {
  return new Date(tbParseDia(dia)).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function tbSegundosAteMeiaNoite() {
  const hms = new Intl.DateTimeFormat('en-GB', { timeZone: TB_FUSO, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date());
  const [h, m, s] = hms.split(':').map(Number);
  return 86400 - (h * 3600 + m * 60 + s);
}
function tbFormatarContagem(seg) {
  const p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(seg / 3600))}:${p(Math.floor(seg % 3600 / 60))}:${p(seg % 60)}`;
}

function tbAvaliar(chute, alvo) {
  const n = alvo.length;
  const res = new Array(n).fill('ausente');
  const resto = {};
  for (let i = 0; i < n; i++) {
    if (chute[i] === alvo[i]) res[i] = 'certa';
    else resto[alvo[i]] = (resto[alvo[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (res[i] !== 'certa' && resto[chute[i]] > 0) {
      res[i] = 'presente';
      resto[chute[i]]--;
    }
  }
  return res;
}
const TB_ROTULO = { certa: 'letra certa no lugar certo', presente: 'letra existe em outro lugar', ausente: 'letra não está na palavra' };

function tbPalavraDoDia(lista, hoje) {
  const marcada = lista.find(p => p.data === hoje);
  if (marcada) return marcada;
  const rodizio = lista.filter(p => !p.data);
  if (!rodizio.length) return lista[0] || null;
  const n = tbDiasEntre(TB_DATA_INICIO, hoje);
  return rodizio[((n % rodizio.length) + rodizio.length) % rodizio.length];
}

let _tbLista = null;

async function tbCarregarLista() {
  if (_tbLista) return _tbLista;
  let raw = await tbFetchSheet(TB_SHEET_URL);
  if (raw.length) {
    try { localStorage.setItem(TB_DATA_CACHE_KEY, JSON.stringify(raw)); } catch (e) {}
  } else {
    try {
      const salvo = JSON.parse(localStorage.getItem(TB_DATA_CACHE_KEY) || 'null');
      if (salvo && salvo.length) { raw = salvo; console.warn('[Termo Bíblico] planilha indisponível agora; usando a última cópia salva.'); }
    } catch (e) {}
  }

  const lista = [];
  raw.forEach(linha => {
    const r = {};
    Object.keys(linha).forEach(k => { r[tbNormKey(k)] = linha[k]; });
    const palavra = (r.palavra || '').trim();
    if (!palavra) return;
    if (!/^[A-Za-zÀ-ÿ]+$/.test(palavra)) {
      console.warn(`[Termo Bíblico] "${palavra}" ignorada: use só letras (sem espaço, hífen ou número).`);
      return;
    }
    const norm = tbStrip(palavra).toUpperCase();
    if (norm.length < TB_MIN_LETRAS || norm.length > TB_MAX_LETRAS) {
      console.warn(`[Termo Bíblico] "${palavra}" ignorada: precisa ter de ${TB_MIN_LETRAS} a ${TB_MAX_LETRAS} letras.`);
      return;
    }
    lista.push({
      palavra: palavra.toUpperCase(),
      norm,
      categoria: (r.categoria || '').trim(),
      dica: (r.dica || '').trim(),
      referencia: (r.referencia || '').trim(),
      comentario: (r.comentario || '').trim(),
      data: tbNormData(r.data),
    });
  });
  console.log('[Termo Bíblico] palavras válidas:', lista.length);
  if (lista.length) _tbLista = lista;
  return lista;
}

function tbStatsVazias() {
  return { jogos: 0, vitorias: 0, sequencia: 0, melhorSequencia: 0, ultimaVitoria: '', dist: new Array(TB_TENTATIVAS).fill(0) };
}
function tbLerStats() {
  try {
    const s = JSON.parse(localStorage.getItem(TB_STATS_KEY) || 'null');
    if (s && Array.isArray(s.dist) && s.dist.length === TB_TENTATIVAS) return Object.assign(tbStatsVazias(), s);
  } catch (e) {}
  return tbStatsVazias();
}
function tbSalvarStats(s) {
  try { localStorage.setItem(TB_STATS_KEY, JSON.stringify(s)); } catch (e) {}
}
function tbRegistrarResultado(venceu, nTentativas, dia) {
  const s = tbLerStats();
  s.jogos++;
  if (venceu) {
    s.vitorias++;
    s.dist[nTentativas - 1]++;
    s.sequencia = s.ultimaVitoria === tbDiaDeslocado(dia, -1) ? s.sequencia + 1 : 1;
    s.ultimaVitoria = dia;
    if (s.sequencia > s.melhorSequencia) s.melhorSequencia = s.sequencia;
  } else {
    s.sequencia = 0;
  }
  tbSalvarStats(s);
}
function tbSequenciaAtual(s, hoje) {
  return (s.ultimaVitoria === hoje || s.ultimaVitoria === tbDiaDeslocado(hoje, -1)) ? s.sequencia : 0;
}
function tbLerDiaSalvo() {
  try { return JSON.parse(localStorage.getItem(TB_DIA_KEY) || 'null'); } catch (e) { return null; }
}
function tbSalvarDia() {
  if (_tb.modo !== 'dia' || !_tb.alvo) return;
  try {
    localStorage.setItem(TB_DIA_KEY, JSON.stringify({ dia: _tb.dia, norm: _tb.alvo.norm, tentativas: _tb.tentativas, status: _tb.status }));
  } catch (e) {}
}

const TB_CSS = `
.tb-overlay{position:fixed;inset:0;background:rgba(10,9,7,.85);backdrop-filter:blur(6px);z-index:500;display:none;align-items:center;justify-content:center;padding:14px}
.tb-overlay.open{display:flex}
.tb-box{background:linear-gradient(180deg,#1c1a17,#100f0d);width:100%;max-width:520px;height:min(780px,94vh);height:min(780px,94dvh);display:flex;flex-direction:column;border-radius:14px;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.55);border:1px solid rgba(169,134,58,.25)}
.tb-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#f1ece1;cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;padding:0}
.tb-close:hover{background:rgba(255,255,255,.16)}
.tb-body{padding:16px 16px 14px;color:#f1ece1;font-family:var(--sans,sans-serif);flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column}
.tb-ico{display:inline-block;vertical-align:-.16em;flex:none}
.tb-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-right:44px;margin-bottom:6px}
.tb-title{font-size:20px;font-weight:800;color:#fff;letter-spacing:.01em}
.tb-head-b{display:flex;gap:6px}
.tb-icbtn{width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#f1ece1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.tb-icbtn:hover{background:rgba(255,255,255,.16)}
.tb-sub{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;font-size:11px;color:#c9c4b8;margin-bottom:10px;text-align:center}
.tb-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(201,162,74,.4);background:rgba(201,162,74,.08);color:var(--gold,#c9a24a);border-radius:999px;padding:3px 10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:10px}
.tb-msg{min-height:22px;text-align:center;font-size:13px;font-weight:700;color:#fff;margin-bottom:6px;opacity:0;transition:opacity .15s}
.tb-msg.on{opacity:1}
.tb-grid{display:flex;flex-direction:column;gap:6px;align-items:center;margin-bottom:10px}
.tb-row{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:6px;width:100%;max-width:calc(var(--n) * 62px)}
.tb-row.shake{animation:tbShake .4s}
.tb-tile{--cor:transparent;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.16);border-radius:8px;font-weight:800;font-size:clamp(18px,5.4vw,26px);color:#fff;background:rgba(255,255,255,.03);box-sizing:border-box;user-select:none}
.tb-tile.cheio{border-color:rgba(255,255,255,.45);animation:tbPop .12s ease}
.tb-tile.certa{--cor:#4f9a62;background:var(--cor);border-color:var(--cor)}
.tb-tile.presente{--cor:#b08a2e;background:var(--cor);border-color:var(--cor)}
.tb-tile.ausente{--cor:#47433c;background:var(--cor);border-color:var(--cor)}
.tb-tile.flip{animation:tbFlip .6s ease both;animation-delay:calc(var(--i) * .22s)}
@keyframes tbFlip{0%{transform:rotateX(0);background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.45)}49%{transform:rotateX(90deg);background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.45)}50%{transform:rotateX(90deg);background:var(--cor);border-color:var(--cor)}100%{transform:rotateX(0);background:var(--cor);border-color:var(--cor)}}
@keyframes tbPop{0%{transform:scale(.9)}60%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes tbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.tb-dica{display:flex;align-items:flex-start;justify-content:center;gap:8px;text-align:center;font-size:12px;color:#e8e3d8;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;margin:0 auto 12px;max-width:440px;line-height:1.5}
.tb-dica .tb-ico{color:var(--gold,#c9a24a);margin-top:1px}
.tb-dica.trancada{color:#a8a396;font-style:italic}
.tb-kb{display:flex;flex-direction:column;gap:6px;margin-top:auto}
.tb-kb-row{display:flex;gap:5px;justify-content:center}
.tb-key{flex:1;min-width:0;height:46px;border:none;border-radius:8px;background:rgba(255,255,255,.12);color:#f1ece1;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--sans,sans-serif);padding:0}
.tb-key:hover{background:rgba(255,255,255,.2)}
.tb-key.wide{flex:1.55}
.tb-key.certa{background:#4f9a62}
.tb-key.presente{background:#b08a2e}
.tb-key.ausente{background:rgba(255,255,255,.04);color:#7d786d}
.tb-btn{background:var(--accent,#7a2e2e);color:#fff;border:none;padding:11px 20px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:var(--sans,sans-serif);display:flex;align-items:center;justify-content:center;gap:8px;margin:0 auto}
.tb-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.4)}
.tb-btn.sec{background:rgba(255,255,255,.06);color:#e8e3d8;border:1px solid rgba(255,255,255,.16)}
.tb-btn:disabled{opacity:.5;cursor:not-allowed}
.tb-fim{text-align:center;margin-top:4px}
.tb-fim-ico{display:block;margin:0 auto 6px}
.tb-fim-ico.win{color:var(--gold,#c9a24a)}
.tb-fim-ico.lose{color:#e08c8c}
.tb-fim-titulo{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px}
.tb-fim-palavra{font-size:26px;font-weight:800;letter-spacing:.14em;color:var(--gold,#c9a24a);margin-bottom:6px}
.tb-fim-ref{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#c9c4b8;margin-bottom:6px}
.tb-fim-com{font-size:12px;color:#c9c4b8;font-weight:300;line-height:1.6;max-width:420px;margin:0 auto 10px}
.tb-prox{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#c9c4b8;margin:8px 0 12px}
.tb-prox .tb-ico{color:var(--gold,#c9a24a)}
.tb-prox b{color:#fff;font-variant-numeric:tabular-nums}
.tb-acoes{display:flex;flex-direction:column;gap:8px;max-width:300px;margin:0 auto}
.tb-center{text-align:center;color:#c9c4b8;font-size:14px;padding:60px 20px}
.tb-h2{font-size:18px;font-weight:700;color:#fff;margin:0 0 12px;padding-right:44px}
.tb-p{font-size:13px;color:#c9c4b8;line-height:1.65;margin:0 0 12px}
.tb-leg{display:flex;align-items:center;gap:12px;font-size:13px;color:#e8e3d8;margin-bottom:10px}
.tb-leg .tb-tile{width:42px;flex:none}
.tb-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 18px;text-align:center}
.tb-num b{display:block;font-size:24px;font-weight:800;color:var(--gold,#c9a24a);line-height:1.1}
.tb-num span{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#c9c4b8}
.tb-bar{display:flex;align-items:center;gap:8px;font-size:11px;color:#c9c4b8;margin-bottom:5px}
.tb-bar > span{width:12px;text-align:right}
.tb-bar-trilho{flex:1}
.tb-bar-fill{background:rgba(255,255,255,.18);color:#fff;font-weight:700;text-align:right;padding:2px 7px;border-radius:4px;min-width:8%;box-sizing:border-box}
.tb-bar-fill.atual{background:#4f9a62}
.tb-voltar{margin-top:18px}
`;

let _tb = {
  aberto: false, tela: 'jogo', modo: 'dia', dia: '', alvo: null,
  tentativas: [], atual: '', status: 'jogando',
  travado: false, revelando: null, shake: false, avisoTxt: '',
  timers: { anim: null, aviso: null, shake: null, contagem: null },
};

function tbLimparTimers() {
  const t = _tb.timers;
  if (t.anim) clearTimeout(t.anim);
  if (t.aviso) clearTimeout(t.aviso);
  if (t.shake) clearTimeout(t.shake);
  if (t.contagem) clearInterval(t.contagem);
  t.anim = t.aviso = t.shake = t.contagem = null;
}

function tbEnsureDom() {
  if (document.getElementById('tbOverlay')) return;
  const style = document.createElement('style');
  style.textContent = TB_CSS;
  document.head.appendChild(style);
  const div = document.createElement('div');
  div.id = 'tbOverlay';
  div.className = 'tb-overlay';
  div.setAttribute('role', 'dialog');
  div.setAttribute('aria-modal', 'true');
  div.setAttribute('aria-label', 'Termo Bíblico');
  div.innerHTML = `<div class="tb-box"><button type="button" class="tb-close" aria-label="Fechar" onclick="tbFechar()">${tbIcon('x', 16)}</button><div class="tb-body" id="tbBody"></div></div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target === div) tbFechar(); });
}

function tbRender() {
  const body = document.getElementById('tbBody');
  if (!body) return;
  if (_tb.timers.contagem) { clearInterval(_tb.timers.contagem); _tb.timers.contagem = null; }
  if (_tb.tela === 'ajuda') body.innerHTML = tbAjudaHtml();
  else if (_tb.tela === 'stats') body.innerHTML = tbStatsHtml();
  else {
    body.innerHTML = tbJogoHtml();
    if (tbFimVisivel() && _tb.modo === 'dia') tbIniciarContagem();
  }
}

function tbFimVisivel() {
  return !!_tb.alvo && _tb.status !== 'jogando' && _tb.revelando === null;
}

function tbLinhaHtml(i) {
  const alvo = _tb.alvo.norm;
  const n = alvo.length;
  let tiles = '';
  if (i < _tb.tentativas.length) {
    const chute = _tb.tentativas[i];
    const res = tbAvaliar(chute, alvo);
    const flip = _tb.revelando === i;
    for (let c = 0; c < n; c++) {
      tiles += `<div class="tb-tile ${res[c]}${flip ? ' flip' : ''}" style="--i:${c}" aria-label="${chute[c]}: ${TB_ROTULO[res[c]]}">${chute[c]}</div>`;
    }
  } else if (i === _tb.tentativas.length && _tb.status === 'jogando') {
    for (let c = 0; c < n; c++) {
      const l = _tb.atual[c] || '';
      tiles += `<div class="tb-tile${l ? ' cheio' : ''}">${l}</div>`;
    }
  } else {
    for (let c = 0; c < n; c++) tiles += '<div class="tb-tile"></div>';
  }
  const shake = _tb.shake && i === _tb.tentativas.length;
  return `<div class="tb-row${shake ? ' shake' : ''}" style="--n:${n}">${tiles}</div>`;
}
function tbGridHtml() {
  let h = '';
  for (let i = 0; i < TB_TENTATIVAS; i++) h += tbLinhaHtml(i);
  return h;
}
function tbRenderGrid() {
  const el = document.getElementById('tbGrid');
  if (el) el.innerHTML = tbGridHtml();
  else tbRender();
}

function tbEstadoTeclas() {
  const est = {};
  const prio = { ausente: 1, presente: 2, certa: 3 };
  const ate = _tb.revelando !== null ? _tb.revelando : _tb.tentativas.length;
  for (let i = 0; i < ate; i++) {
    const ch = _tb.tentativas[i];
    const res = tbAvaliar(ch, _tb.alvo.norm);
    for (let c = 0; c < ch.length; c++) {
      const l = ch[c];
      if (!est[l] || prio[res[c]] > prio[est[l]]) est[l] = res[c];
    }
  }
  return est;
}

function tbTecladoHtml() {
  const est = tbEstadoTeclas();
  const linha = letras => letras.split('').map(l =>
    `<button type="button" class="tb-key ${est[l] || ''}" onmousedown="event.preventDefault()" onclick="tbTecla('${l}')" aria-label="${l}">${l}</button>`).join('');
  return `<div class="tb-kb">
    <div class="tb-kb-row">${linha('QWERTYUIOP')}</div>
    <div class="tb-kb-row">${linha('ASDFGHJKL')}</div>
    <div class="tb-kb-row">
      <button type="button" class="tb-key wide" onmousedown="event.preventDefault()" onclick="tbEnter()" aria-label="Enviar palavra">${tbIcon('enter', 18)}</button>
      ${linha('ZXCVBNM')}
      <button type="button" class="tb-key wide" onmousedown="event.preventDefault()" onclick="tbApagar()" aria-label="Apagar">${tbIcon('apagar', 18)}</button>
    </div>
  </div>`;
}

function tbNumeroDoDia() {
  return Math.max(1, tbDiasEntre(TB_DATA_INICIO, _tb.dia) + 1);
}

function tbJogoHtml() {
  const a = _tb.alvo;
  if (!a) {
    return `<div class="tb-center">A palavra do dia não está disponível agora.<br>Verifique a internet e tente de novo mais tarde.</div>
      <button class="tb-btn sec" onclick="tbIniciar('dia')">Tentar de novo</button>`;
  }
  const dia = _tb.modo === 'dia';
  const fim = tbFimVisivel();
  const reveladas = _tb.revelando !== null ? _tb.revelando : _tb.tentativas.length;
  const dicaLiberada = fim || reveladas >= TB_DICA_APOS;

  let dicaHtml = '';
  if (a.dica) {
    dicaHtml = dicaLiberada
      ? `<div class="tb-dica">${tbIcon('ideia', 16)}<span>${tbEsc(a.dica)}</span></div>`
      : `<div class="tb-dica trancada">Dica liberada depois da ${TB_DICA_APOS}ª tentativa</div>`;
  }

  return `
    <div class="tb-head">
      <div class="tb-title">Termo Bíblico</div>
      <div class="tb-head-b">
        <button type="button" class="tb-icbtn" aria-label="Como jogar" onclick="tbIr('ajuda')">${tbIcon('ajuda', 18)}</button>
        <button type="button" class="tb-icbtn" aria-label="Estatísticas" onclick="tbIr('stats')">${tbIcon('grafico', 18)}</button>
      </div>
    </div>
    <div class="tb-sub">
      ${a.categoria ? `<span class="tb-chip">${tbIcon(tbIconeCategoria(a.categoria), 13)} ${tbEsc(a.categoria)}</span>` : ''}
      <span>${a.norm.length} letras</span>
      <span>${dia ? `Palavra do dia · ${tbDataExtenso(_tb.dia)}` : 'Treino (não conta nas estatísticas)'}</span>
    </div>
    <div class="tb-msg" id="tbMsg" role="status" aria-live="polite"></div>
    <div class="tb-grid" id="tbGrid">${tbGridHtml()}</div>
    ${dicaHtml}
    ${fim ? tbFimHtml() : tbTecladoHtml()}
  `;
}

function tbFimHtml() {
  const a = _tb.alvo;
  const venceu = _tb.status === 'venceu';
  const n = _tb.tentativas.length;
  const dia = _tb.modo === 'dia';
  return `<div class="tb-fim">
    ${tbIcon(venceu ? 'trofeu' : 'livro', 40, 'tb-fim-ico ' + (venceu ? 'win' : 'lose'))}
    <div class="tb-fim-titulo">${venceu ? `Você acertou em ${n} ${n === 1 ? 'tentativa' : 'tentativas'}!` : 'Não foi dessa vez. A palavra era:'}</div>
    <div class="tb-fim-palavra">${tbEsc(a.palavra)}</div>
    ${a.referencia ? `<div class="tb-fim-ref">${tbIcon('livro', 14)} ${tbEsc(a.referencia)}</div>` : ''}
    ${a.comentario ? `<p class="tb-fim-com">${tbEsc(a.comentario)}</p>` : ''}
    ${dia ? `<div class="tb-prox">${tbIcon('relogio', 14)} Próxima palavra em <b id="tbContagem">${tbFormatarContagem(tbSegundosAteMeiaNoite())}</b></div>` : '<div style="height:10px"></div>'}
    <div class="tb-acoes">
      <button class="tb-btn" id="tbShareBtn" onclick="tbCompartilhar(this)">${tbIcon('camera', 15)} Compartilhar como imagem</button>
      <button class="tb-btn sec" onclick="tbIr('stats')">${tbIcon('grafico', 15)} Estatísticas</button>
      <button class="tb-btn sec" onclick="tbTreino()">${tbIcon('girar', 15)} ${dia ? 'Jogar uma palavra de treino' : 'Outra palavra de treino'}</button>
      ${dia ? '' : `<button class="tb-btn sec" onclick="tbDiaAtual()">Voltar à palavra do dia</button>`}
    </div>
  </div>`;
}

function tbAjudaHtml() {
  return `
    <h2 class="tb-h2">Como jogar</h2>
    <p class="tb-p">Descubra a palavra bíblica do dia em ${TB_TENTATIVAS} tentativas. Pode ser uma pessoa, um lugar, um livro ou um termo da fé, e o número de letras aparece na grade (de ${TB_MIN_LETRAS} a ${TB_MAX_LETRAS}).</p>
    <p class="tb-p">Digite uma palavra e envie. As cores mostram o quanto você chegou perto:</p>
    <div class="tb-leg"><div class="tb-tile certa">A</div><span>Letra certa, no lugar certo.</span></div>
    <div class="tb-leg"><div class="tb-tile presente">B</div><span>A letra existe na palavra, mas em outra posição.</span></div>
    <div class="tb-leg"><div class="tb-tile ausente">C</div><span>A letra não está na palavra.</span></div>
    <p class="tb-p">Acentos e cedilha não importam: digite "MOISES" para "Moisés". Depois da ${TB_DICA_APOS}ª tentativa aparece uma dica. Há uma palavra nova por dia, à meia-noite (horário de Brasília).</p>
    <button class="tb-btn tb-voltar" onclick="tbIr('jogo')">Jogar</button>
  `;
}

function tbStatsHtml() {
  const s = tbLerStats();
  const hoje = tbHoje();
  const pct = s.jogos ? Math.round(s.vitorias / s.jogos * 100) : 0;
  const max = Math.max(1, ...s.dist);
  const destaque = (_tb.modo === 'dia' && _tb.status === 'venceu') ? _tb.tentativas.length - 1 : -1;
  const barras = s.dist.map((v, i) => `<div class="tb-bar"><span>${i + 1}</span><div class="tb-bar-trilho"><div class="tb-bar-fill${i === destaque ? ' atual' : ''}" style="width:${Math.max(8, Math.round(v / max * 100))}%">${v}</div></div></div>`).join('');
  return `
    <h2 class="tb-h2">Estatísticas</h2>
    <div class="tb-nums">
      <div class="tb-num"><b>${s.jogos}</b><span>Jogos</span></div>
      <div class="tb-num"><b>${pct}%</b><span>Vitórias</span></div>
      <div class="tb-num"><b>${tbSequenciaAtual(s, hoje)}</b><span>Sequência</span></div>
      <div class="tb-num"><b>${s.melhorSequencia}</b><span>Melhor</span></div>
    </div>
    <div class="tb-p" style="margin-bottom:8px">${tbIcon('chama', 14)} Acertos por número de tentativas</div>
    ${barras}
    <button class="tb-btn tb-voltar" onclick="tbIr('jogo')">Voltar</button>
  `;
}

function tbAviso(msg, ms) {
  _tb.avisoTxt = msg;
  const el = document.getElementById('tbMsg');
  if (el) { el.textContent = msg; el.classList.add('on'); }
  if (_tb.timers.aviso) clearTimeout(_tb.timers.aviso);
  _tb.timers.aviso = setTimeout(() => {
    _tb.timers.aviso = null;
    const e = document.getElementById('tbMsg');
    if (e) { e.textContent = ''; e.classList.remove('on'); }
  }, ms || 1600);
}

function tbBalancar() {
  _tb.shake = true;
  tbRenderGrid();
  if (_tb.timers.shake) clearTimeout(_tb.timers.shake);
  _tb.timers.shake = setTimeout(() => { _tb.timers.shake = null; _tb.shake = false; tbRenderGrid(); }, 450);
}

function tbPodeDigitar() {
  return _tb.aberto && !!_tb.alvo && _tb.tela === 'jogo' && !_tb.travado && _tb.status === 'jogando';
}
function tbTecla(l) {
  if (!tbPodeDigitar()) return;
  if (_tb.atual.length >= _tb.alvo.norm.length) return;
  _tb.atual += l;
  tbRenderGrid();
}
function tbApagar() {
  if (!tbPodeDigitar() || !_tb.atual) return;
  _tb.atual = _tb.atual.slice(0, -1);
  tbRenderGrid();
}

function tbStatusDe(tentativas, norm) {
  if (tentativas.length && tentativas[tentativas.length - 1] === norm) return 'venceu';
  return tentativas.length >= TB_TENTATIVAS ? 'perdeu' : 'jogando';
}

function tbEnter() {
  if (!tbPodeDigitar()) return;
  const n = _tb.alvo.norm.length;
  if (_tb.atual.length < n) { tbAviso('Faltam letras'); tbBalancar(); return; }
  if (_tb.tentativas.includes(_tb.atual)) { tbAviso('Você já tentou essa palavra'); tbBalancar(); return; }

  _tb.tentativas.push(_tb.atual);
  _tb.atual = '';
  _tb.status = tbStatusDe(_tb.tentativas, _tb.alvo.norm);
  if (_tb.status !== 'jogando' && _tb.modo === 'dia') tbRegistrarResultado(_tb.status === 'venceu', _tb.tentativas.length, _tb.dia);
  tbSalvarDia();

  _tb.travado = true;
  _tb.revelando = _tb.tentativas.length - 1;
  tbRenderGrid();
  _tb.timers.anim = setTimeout(() => {
    _tb.timers.anim = null;
    _tb.travado = false;
    _tb.revelando = null;
    tbRender();
    if (_tb.status === 'venceu') tbAviso(TB_ELOGIOS[Math.min(_tb.tentativas.length, TB_ELOGIOS.length) - 1], 2200);
  }, n * 220 + 650);
}

function tbIr(tela) {
  if (_tb.travado) return;
  if (_tb.tela === 'ajuda') { try { localStorage.setItem(TB_AJUDA_KEY, '1'); } catch (e) {} }
  _tb.tela = tela;
  tbRender();
}

function tbIniciarContagem() {
  if (_tb.timers.contagem) clearInterval(_tb.timers.contagem);
  _tb.timers.contagem = setInterval(() => {
    const seg = tbSegundosAteMeiaNoite();
    const el = document.getElementById('tbContagem');
    if (el) el.textContent = tbFormatarContagem(seg);
    if (seg <= 1 && _tb.aberto && _tb.modo === 'dia') {
      clearInterval(_tb.timers.contagem);
      _tb.timers.contagem = null;
      setTimeout(() => { if (_tb.aberto) tbIniciar('dia'); }, 1500);
    }
  }, 1000);
}

async function tbIniciar(modo) {
  tbLimparTimers();
  let lista = [];
  try { lista = await tbCarregarLista(); } catch (e) { console.error('[Termo Bíblico]', e); }
  _tb.tela = 'jogo';
  _tb.modo = modo;
  _tb.tentativas = [];
  _tb.atual = '';
  _tb.status = 'jogando';
  _tb.travado = false;
  _tb.revelando = null;
  _tb.shake = false;
  _tb.dia = tbHoje();
  if (!lista.length) { _tb.alvo = null; tbRender(); return; }

  const doDia = tbPalavraDoDia(lista, _tb.dia);
  if (modo === 'treino') {
    const outras = lista.filter(p => p.norm !== doDia.norm);
    _tb.alvo = tbPick(outras.length ? outras : lista);
  } else {
    _tb.alvo = doDia;
    const salvo = tbLerDiaSalvo();
    if (salvo && salvo.dia === _tb.dia && salvo.norm === doDia.norm && Array.isArray(salvo.tentativas)) {
      _tb.tentativas = salvo.tentativas.slice(0, TB_TENTATIVAS);
      _tb.status = tbStatusDe(_tb.tentativas, doDia.norm);
    }
  }
  tbRender();
}
function tbTreino() { tbIniciar('treino'); }
function tbDiaAtual() { tbIniciar('dia'); }

const TB_CORES = { certa: '#4f9a62', presente: '#b08a2e', ausente: '#47433c' };

function tbRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tbBuildShareCanvas() {
  const W = 1080, H = 1920;
  const alvo = _tb.alvo.norm;
  const n = alvo.length;
  const linhas = _tb.tentativas.length;
  const venceu = _tb.status === 'venceu';
  const dia = _tb.modo === 'dia';

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const gold = '#c9a24a', white = '#f5f1e6', muted = '#b9b2a2';

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
  ctx.fillText(dia ? `PALAVRA DO DIA · ${tbDataExtenso(_tb.dia).toUpperCase()}` : 'TREINO', W / 2, 96);
  ctx.fillStyle = white;
  ctx.font = '700 76px Montserrat, sans-serif';
  ctx.fillText('TERMO BÍBLICO', W / 2, 188);
  if (dia) {
    ctx.fillStyle = muted;
    ctx.font = '400 28px Montserrat, sans-serif';
    ctx.fillText(`#${tbNumeroDoDia()}`, W / 2, 238);
  }

  tbDrawIconCanvas(ctx, venceu ? 'trofeu' : 'livro', W / 2, 400, 120, venceu ? gold : '#e08c8c');
  ctx.fillStyle = venceu ? gold : white;
  ctx.font = '700 120px Montserrat, sans-serif';
  ctx.fillText(`${venceu ? linhas : 'X'}/${TB_TENTATIVAS}`, W / 2, 590);
  ctx.fillStyle = muted;
  ctx.font = '400 30px Montserrat, sans-serif';
  ctx.fillText(venceu ? 'acertei a palavra' : 'não consegui desta vez', W / 2, 640);

  const gap = 14;
  const sq = Math.min(120, Math.floor((880 - gap * (n - 1)) / n));
  const gridW = n * sq + (n - 1) * gap;
  const gridH = linhas * sq + (linhas - 1) * gap;
  const x0 = (W - gridW) / 2;
  const y0 = 740 + Math.max(0, (TB_TENTATIVAS * (sq + gap) - gap - gridH) / 2);
  _tb.tentativas.forEach((chute, r) => {
    const res = tbAvaliar(chute, alvo);
    for (let c = 0; c < n; c++) {
      ctx.fillStyle = TB_CORES[res[c]];
      tbRoundRect(ctx, x0 + c * (sq + gap), y0 + r * (sq + gap), sq, sq, 16);
      ctx.fill();
    }
  });

  ctx.fillStyle = muted;
  ctx.font = '400 28px Montserrat, sans-serif';
  ctx.fillText('Consegue acertar a palavra bíblica de hoje?', W / 2, H - 130);
  ctx.fillStyle = gold;
  ctx.font = '600 32px Montserrat, sans-serif';
  ctx.fillText(TB_SHARE_SITE_LABEL, W / 2, H - 70);
  return canvas;
}

function tbShareText() {
  const venceu = _tb.status === 'venceu';
  const placar = `${venceu ? _tb.tentativas.length : 'X'}/${TB_TENTATIVAS}`;
  const nome = _tb.modo === 'dia' ? `Termo Bíblico #${tbNumeroDoDia()}` : 'Termo Bíblico (treino)';
  return `${nome} ${placar}. Consegue acertar? ${TB_SHARE_SITE_URL}`;
}

async function tbCompartilhar(btnEl) {
  const originalHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Gerando imagem…'; }
  try {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    const canvas = tbBuildShareCanvas();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
    const file = new File([blob], 'termo-biblico-resultado.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Termo Bíblico', text: tbShareText() });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'termo-biblico-resultado.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  } catch (e) {
    if (!e || e.name !== 'AbortError') console.error('[Termo Bíblico] erro ao compartilhar imagem:', e);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHtml; }
  }
}

async function tbAbrir() {
  tbEnsureDom();
  _tb.aberto = true;
  document.getElementById('tbOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('tbBody').innerHTML = '<div class="tb-center">Carregando a palavra do dia…</div>';
  await tbIniciar('dia');
  let vista = false;
  try { vista = !!localStorage.getItem(TB_AJUDA_KEY); } catch (e) {}
  if (!vista && _tb.alvo) { _tb.tela = 'ajuda'; tbRender(); }
}

function tbFechar() {
  const ov = document.getElementById('tbOverlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
  _tb.aberto = false;
  tbLimparTimers();
}

document.addEventListener('keydown', e => {
  if (!_tb.aberto) return;
  if (e.key === 'Escape') { tbFechar(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter') { if (tbPodeDigitar()) e.preventDefault(); tbEnter(); return; }
  if (e.key === 'Backspace') { tbApagar(); return; }
  if (e.key && e.key.length === 1) {
    const l = tbStrip(e.key).toUpperCase();
    if (/^[A-Z]$/.test(l)) tbTecla(l);
  }
});

window.abrirTermoBiblico = tbAbrir;
