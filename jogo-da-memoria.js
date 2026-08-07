/* Jogo da Memória Bíblico: monte pares de cartas (personagem + imagem), dados via TSV.
   Inclua este arquivo no site e chame window.abrirJogoDaMemoria() para abrir. */

const MB_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRyhTenbfftqs8iUdYuhP_6XSjAWeRJIHouHTtpTtWgqLRDEDssg8zex00DDDHDu5s_GsmVnQFWQdNy/pub?gid=1197709706&single=true&output=tsv';

const MB_LEVELS = {
  facil:   { label: 'Fácil',   pares: 3, cols: 3 },
  medio:   { label: 'Médio',   pares: 6, cols: 4 },
  dificil: { label: 'Difícil', pares: 9, cols: 6 },
};

const MB_FLIP_BACK_DELAY_MS = 900;
const MB_BEST_KEY_PREFIX = 'mbBestTempo_';

const mbFetchSheet = window.fetchSheet || (async function (url) {
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

const mbEscHtml = window.escHtml || function (s) {
  return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
};

function mbShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mbFmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mbGetBest(level) {
  const v = parseInt(localStorage.getItem(MB_BEST_KEY_PREFIX + level) || '', 10);
  return isNaN(v) ? null : v;
}
function mbSaveBest(level, seconds) {
  const best = mbGetBest(level);
  if (best === null || seconds < best) {
    localStorage.setItem(MB_BEST_KEY_PREFIX + level, String(seconds));
    return true;
  }
  return false;
}

const MB_CSS = `
.mb-overlay{position:fixed;inset:0;background:rgba(30,28,24,.55);backdrop-filter:blur(4px);z-index:500;display:none;align-items:center;justify-content:center;padding:20px}
.mb-overlay.open{display:flex}
.mb-box{background:var(--paper,#fff);width:100%;max-width:760px;height:min(680px,88vh);display:flex;flex-direction:column;border-radius:14px;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.3)}
.mb-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:var(--ink,#1e1e1e);font-size:16px;cursor:pointer;z-index:5}
.mb-close:hover{background:rgba(0,0,0,.12)}
.mb-body{padding:40px 32px 28px;flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;justify-content:flex-start;font-family:var(--sans,sans-serif);color:var(--ink,#1e1e1e)}
@media(max-width:600px){.mb-body{padding:48px 16px 20px}}
.mb-eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold,#a9863a);font-weight:600;margin-bottom:10px;text-align:center}
.mb-title{font-size:clamp(22px,4vw,32px);font-weight:700;margin-bottom:12px;text-align:center;color:var(--ink,#1e1e1e)}
.mb-desc{font-size:13px;color:var(--ink-soft,#5a5d54);font-weight:300;line-height:1.6;max-width:440px;margin:0 auto 22px;text-align:center}
.mb-levels{display:flex;flex-direction:column;gap:12px;max-width:340px;margin:0 auto}
.mb-level-btn{width:100%;background:var(--paper,#fff);border:1px solid var(--line,#e2ddd2);border-radius:12px;padding:16px 18px;cursor:pointer;text-align:left;transition:transform .15s,box-shadow .15s,border-color .15s;font-family:var(--sans,sans-serif);color:var(--ink,#1e1e1e)}
.mb-level-btn:hover{transform:translateY(-2px);border-color:var(--accent,#7a2e2e);box-shadow:0 8px 20px rgba(0,0,0,.08)}
.mb-level-title{font-size:15px;font-weight:700;margin-bottom:3px}
.mb-level-desc{font-size:12px;color:var(--ink-soft,#5a5d54);font-weight:300}
.mb-level-record{font-size:11px;color:var(--gold,#a9863a);font-weight:600;margin-top:6px}
.mb-btn{background:var(--accent,#7a2e2e);color:#fff;border:none;padding:11px 24px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:var(--sans,sans-serif);display:block;margin:0 auto}
.mb-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.15)}
.mb-btn-secondary{background:var(--accent-soft,#f3e9e4);color:var(--accent,#7a2e2e)}
.mb-loading,.mb-empty{text-align:center;padding:60px 20px;color:var(--ink-soft,#5a5d54);font-size:14px}
.mb-hud{display:flex;justify-content:center;gap:26px;margin-bottom:18px}
.mb-hud-item{text-align:center}
.mb-hud-num{font-size:22px;font-weight:800;color:var(--accent,#7a2e2e);line-height:1}
.mb-hud-label{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft,#5a5d54);margin-top:3px}
.mb-board{display:grid;gap:10px;margin:0 auto 10px;justify-content:center}
.mb-card{aspect-ratio:3/4;width:100%;perspective:800px;cursor:pointer}
.mb-card-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .4s}
.mb-card.flipped .mb-card-inner,.mb-card.matched .mb-card-inner{transform:rotateY(180deg)}
.mb-card-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.mb-card-back{background:linear-gradient(160deg,var(--accent,#7a2e2e),#5a2020);display:flex;align-items:center;justify-content:center;font-size:26px;color:rgba(255,255,255,.85);border:1px solid rgba(0,0,0,.08)}
.mb-card-front{transform:rotateY(180deg);background:var(--paper,#fff);border:1px solid var(--line,#e2ddd2);justify-content:space-between}
.mb-card.matched .mb-card-front{border-color:#4a7a4a;box-shadow:0 0 0 2px rgba(74,122,74,.25) inset}
.mb-card-imgwrap{flex:1;overflow:hidden;background:#e8e4da}
.mb-card-imgwrap img{width:100%;height:100%;object-fit:cover;display:block}
.mb-card-imgwrap.mb-img-error{display:flex;align-items:center;justify-content:center;font-size:20px;color:#bbb}
.mb-card-name{font-size:9px;font-weight:700;text-align:center;padding:4px 3px;color:var(--ink,#1e1e1e);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mb-final{text-align:center;padding:20px 0}
.mb-final-emoji{font-size:50px;margin-bottom:10px}
.mb-final-title{font-size:22px;font-weight:700;color:var(--ink,#1e1e1e);margin-bottom:6px}
.mb-final-newrecord{font-size:13px;font-weight:700;color:var(--gold,#a9863a);margin-bottom:8px}
.mb-final-sub{font-size:13px;color:var(--ink-soft,#5a5d54);font-weight:300;margin-bottom:24px}
.mb-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
@media(max-width:480px){.mb-card-name{display:none}}
`;

let _mbCache = null;
let _mbState = {
  level: null,
  pares: 0,
  cards: [],
  flippedIdx: [],
  matchedCount: 0,
  lockBoard: false,
  startedAt: null,
  timerHandle: null,
  elapsedSeconds: 0,
};

function mbEnsureDom() {
  if (document.getElementById('mbOverlay')) return;
  const style = document.createElement('style');
  style.textContent = MB_CSS;
  document.head.appendChild(style);
  const div = document.createElement('div');
  div.id = 'mbOverlay';
  div.className = 'mb-overlay';
  div.innerHTML = '<div class="mb-box"><button class="mb-close" onclick="mbClose()">✕</button><div class="mb-body" id="mbBody"></div></div>';
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target === div) mbClose(); });

  const mbBody = div.querySelector('#mbBody');
  new MutationObserver(() => { mbBody.scrollTop = 0; }).observe(mbBody, { childList: true });
}

async function mbLoadData() {
  if (_mbCache) return _mbCache;
  const raw = await mbFetchSheet(MB_SHEET_URL);
  const personagens = raw
    .map(r => ({ nome: (r.nome || '').trim(), imagem: (r.imagem || '').trim() }))
    .filter(p => p.nome && p.imagem);
  console.log('[Jogo da Memória] personagens válidos:', personagens.length);
  _mbCache = personagens;
  return _mbCache;
}

function mbRenderIntro() {
  const body = document.getElementById('mbBody');
  const levelsHtml = Object.keys(MB_LEVELS).map(key => {
    const lvl = MB_LEVELS[key];
    const best = mbGetBest(key);
    return `<button class="mb-level-btn" onclick="mbStart('${key}')">
      <div class="mb-level-title">${lvl.label}</div>
      <div class="mb-level-desc">${lvl.pares} personagens (${lvl.pares * 2} cartas)</div>
      ${best !== null ? `<div class="mb-level-record">🏅 Recorde: ${mbFmtTime(best)}</div>` : ''}
    </button>`;
  }).join('');

  body.innerHTML = `
    <div class="mb-eyebrow">Jogo da Memória</div>
    <h2 class="mb-title">Encontre os pares</h2>
    <p class="mb-desc">Escolha o nível e vire as cartas duas por vez para encontrar os personagens bíblicos combinando.</p>
    <div class="mb-levels">${levelsHtml}</div>
  `;
}

async function mbStart(levelKey) {
  const body = document.getElementById('mbBody');
  body.innerHTML = '<div class="mb-loading">Preparando as cartas…</div>';
  const personagens = await mbLoadData();
  const lvl = MB_LEVELS[levelKey];

  if (!personagens.length || personagens.length < lvl.pares) {
    body.innerHTML = `<div class="mb-empty">Não há personagens suficientes cadastrados para o nível ${lvl.label.toLowerCase()}.<br><br>
      Verifique se a aba está publicada na web e se as colunas <b>nome</b> e <b>imagem</b> estão preenchidas.
      Veja o console (F12) para detalhes.</div>`;
    return;
  }

  const escolhidos = mbShuffle(personagens).slice(0, lvl.pares);
  const pares = escolhidos.flatMap((p, i) => [
    { id: i, nome: p.nome, imagem: p.imagem },
    { id: i, nome: p.nome, imagem: p.imagem },
  ]);
  const cards = mbShuffle(pares).map((c, idx) => ({ ...c, idx, flipped: false, matched: false }));

  if (_mbState.timerHandle) clearInterval(_mbState.timerHandle);
  _mbState = {
    level: levelKey,
    pares: lvl.pares,
    cards,
    flippedIdx: [],
    matchedCount: 0,
    lockBoard: false,
    startedAt: Date.now(),
    timerHandle: null,
    elapsedSeconds: 0,
  };
  _mbState.timerHandle = setInterval(mbTickTimer, 1000);

  mbRenderBoard();
}

function mbTickTimer() {
  _mbState.elapsedSeconds = Math.floor((Date.now() - _mbState.startedAt) / 1000);
  const el = document.getElementById('mbTimerVal');
  if (el) el.textContent = mbFmtTime(_mbState.elapsedSeconds);
}

function mbRenderBoard() {
  const st = _mbState;
  const lvl = MB_LEVELS[st.level];
  const body = document.getElementById('mbBody');
  const cardsHtml = st.cards.map(c => mbCardHtml(c)).join('');
  body.innerHTML = `
    <div class="mb-eyebrow">${lvl.label}</div>
    <div class="mb-hud">
      <div class="mb-hud-item"><div class="mb-hud-num" id="mbTimerVal">${mbFmtTime(st.elapsedSeconds)}</div><div class="mb-hud-label">Tempo</div></div>
      <div class="mb-hud-item"><div class="mb-hud-num">${st.matchedCount}/${st.pares}</div><div class="mb-hud-label">Pares</div></div>
    </div>
    <div class="mb-board" style="grid-template-columns:repeat(${lvl.cols},1fr);max-width:${lvl.cols * 92}px">${cardsHtml}</div>
  `;
}

function mbCardHtml(c) {
  const stateCls = c.matched ? ' matched' : (c.flipped ? ' flipped' : '');
  return `<div class="mb-card${stateCls}" onclick="mbFlipCard(${c.idx})">
    <div class="mb-card-inner">
      <div class="mb-card-face mb-card-back">📖</div>
      <div class="mb-card-face mb-card-front">
        <div class="mb-card-imgwrap"><img src="${mbEscHtml(c.imagem)}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('mb-img-error');this.parentElement.textContent='📷'"></div>
        <div class="mb-card-name">${mbEscHtml(c.nome)}</div>
      </div>
    </div>
  </div>`;
}

function mbFlipCard(idx) {
  const st = _mbState;
  if (st.lockBoard) return;
  const card = st.cards[idx];
  if (!card || card.flipped || card.matched) return;

  card.flipped = true;
  st.flippedIdx.push(idx);
  mbRenderBoard();

  if (st.flippedIdx.length < 2) return;

  st.lockBoard = true;
  const [i1, i2] = st.flippedIdx;
  const c1 = st.cards[i1], c2 = st.cards[i2];

  if (c1.id === c2.id) {
    c1.matched = true;
    c2.matched = true;
    st.matchedCount++;
    st.flippedIdx = [];
    st.lockBoard = false;
    mbRenderBoard();
    if (st.matchedCount >= st.pares) mbFinishGame();
  } else {
    setTimeout(() => {
      c1.flipped = false;
      c2.flipped = false;
      st.flippedIdx = [];
      st.lockBoard = false;
      mbRenderBoard();
    }, MB_FLIP_BACK_DELAY_MS);
  }
}

function mbFinishGame() {
  const st = _mbState;
  if (st.timerHandle) { clearInterval(st.timerHandle); st.timerHandle = null; }
  const isNewRecord = mbSaveBest(st.level, st.elapsedSeconds);
  const lvl = MB_LEVELS[st.level];

  const body = document.getElementById('mbBody');
  body.innerHTML = `
    <div class="mb-final">
      <div class="mb-final-emoji">🏆</div>
      <div class="mb-final-title">Você venceu!</div>
      ${isNewRecord ? '<div class="mb-final-newrecord">🎉 Novo recorde!</div>' : ''}
      <p class="mb-final-sub">Nível ${lvl.label} concluído em <b>${mbFmtTime(st.elapsedSeconds)}</b>.</p>
      <div class="mb-actions">
        <button class="mb-btn" onclick="mbStart('${st.level}')">Jogar de novo</button>
        <button class="mb-btn mb-btn-secondary" onclick="mbRenderIntro()">Escolher outro nível</button>
      </div>
    </div>
  `;
}

function mbOpen() {
  mbEnsureDom();
  document.getElementById('mbOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  mbRenderIntro();
}
function mbClose() {
  const ov = document.getElementById('mbOverlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
  if (_mbState.timerHandle) { clearInterval(_mbState.timerHandle); _mbState.timerHandle = null; }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('mbOverlay');
    if (ov && ov.classList.contains('open')) mbClose();
  }
});

window.abrirJogoDaMemoria = mbOpen;
