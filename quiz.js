const QZ_SHEET_URL=(typeof SHEET_BASE!=='undefined'?SHEET_BASE:'')+'?gid=1010611117&single=true&output=tsv';

const QZ_PRIZE_STEPS=[
  {value:1000,   nivel:'facil'},
  {value:2000,   nivel:'facil'},
  {value:5000,   nivel:'facil'},
  {value:10000,  nivel:'facil'},
  {value:20000,  nivel:'medio',   checkpoint:true},
  {value:50000,  nivel:'medio'},
  {value:100000, nivel:'medio'},
  {value:200000, nivel:'dificil', checkpoint:true},
  {value:500000, nivel:'dificil'},
  {value:1000000,nivel:'dificil'},
];

const QZ_FULL_BEST_KEY='qzFullBestStreak';

const qzFetchSheet=window.fetchSheet||(async function(url){
  try{
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok) throw new Error();
    const text=await r.text();
    const lines=text.replace(/\r/g,'').split('\n').filter(l=>l.trim());
    if(lines.length<2) return [];
    const headers=lines[0].split('\t').map(h=>h.trim().toLowerCase());
    const rows=[];
    for(let i=1;i<lines.length;i++){
      const cells=lines[i].split('\t');const obj={};
      headers.forEach((h,j)=>{obj[h]=(cells[j]!==undefined?cells[j]:'').trim();});
      if(Object.values(obj).some(v=>v!=='')) rows.push(obj);
    }
    return rows;
  }catch(e){console.error(e);return [];}
});
const qzEscHtml=window.escHtml||function(s){return s==null?'':String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));};

function qzShuffle(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function qzNormLevel(v){
  const n=(v||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  if(n.startsWith('medio')) return 'medio';
  if(n.startsWith('dificil')) return 'dificil';
  return 'facil';
}
function qzBRL(n){return Number(n).toLocaleString('pt-BR');}
function qzCorrectText(q){
  const r=(q.resposta||'').trim();
  if(/^[a-c]$/i.test(r)) return (q['opcao_'+r.toLowerCase()]||'').trim();
  return r;
}
function qzBuildOptions(q){
  const opts=['opcao_a','opcao_b','opcao_c'].map(k=>(q[k]||'').trim()).filter(Boolean);
  return qzShuffle(opts);
}
function qzBuildSequence(questions){
  const byLevel={facil:[],medio:[],dificil:[]};
  questions.forEach(q=>byLevel[qzNormLevel(q.nivel)].push(q));
  Object.keys(byLevel).forEach(k=>byLevel[k]=qzShuffle(byLevel[k]));
  const pool=qzShuffle(questions.slice());
  const used=new Set();
  const seq=[];
  QZ_PRIZE_STEPS.forEach(step=>{
    let q=byLevel[step.nivel].find(x=>!used.has(x.pergunta));
    if(!q) q=pool.find(x=>!used.has(x.pergunta));
    if(q){used.add(q.pergunta);seq.push({...step,question:q,options:qzBuildOptions(q)});}
  });
  return seq;
}

// Modo Full: todas as perguntas do banco, embaralhadas, sem repetir.
function qzBuildFullSequence(questions){
  const shuffled=qzShuffle(questions);
  return shuffled.map(q=>({question:q,options:qzBuildOptions(q)}));
}

function qzGetBestStreak(){
  const v=parseInt(localStorage.getItem(QZ_FULL_BEST_KEY)||'0',10);
  return isNaN(v)?0:v;
}
// Salva se for um novo recorde. Retorna true se bateu o recorde anterior.
function qzSaveBestStreak(n){
  const best=qzGetBestStreak();
  if(n>best){ localStorage.setItem(QZ_FULL_BEST_KEY,String(n)); return true; }
  return false;
}

function qzNormKey(k){
  return k.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,'_');
}
function qzNormalizeRow(row){
  const out={};
  Object.keys(row).forEach(k=>{out[qzNormKey(k)]=row[k];});
  return out;
}

let _qzCache=null;
let _qzState={mode:'milhao',sequence:[],index:0,lastCorrectValue:0,securedValue:0,correctCount:0,usedHelp:false,answered:false};

const QZ_CSS=`
.qz-overlay{position:fixed;inset:0;background:rgba(20,18,15,.75);backdrop-filter:blur(6px);z-index:500;display:none;align-items:center;justify-content:center;padding:20px}
.qz-overlay.open{display:flex}
.qz-box{background:var(--paper,#fff);width:100%;max-width:720px;max-height:90vh;overflow-y:auto;border-radius:12px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.qz-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:var(--ink,#1e1e1e);font-size:16px;cursor:pointer;z-index:5}
.qz-close:hover{background:rgba(0,0,0,.12)}
.qz-body{padding:44px 36px 36px}
@media(max-width:600px){.qz-body{padding:56px 22px 28px}}
.qz-intro{text-align:center}
.qz-intro-eyebrow{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold,#a9863a);font-weight:600;margin-bottom:10px}
.qz-intro-title{font-family:var(--sans,sans-serif);font-size:clamp(26px,4vw,38px);font-weight:700;margin-bottom:14px;color:var(--ink,#1e1e1e)}
.qz-intro-desc{font-size:14px;color:var(--ink-soft,#5a5d54);font-weight:300;line-height:1.7;max-width:440px;margin:0 auto 26px}
.qz-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;text-align:left}
@media(max-width:600px){.qz-mode-grid{grid-template-columns:1fr}}
.qz-mode-card{border:1px solid var(--line,#e2ddd2);border-radius:10px;padding:22px 20px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;height:100%}
.qz-mode-card-title{font-family:var(--sans,sans-serif);font-weight:700;font-size:16px;color:var(--ink,#1e1e1e)}
.qz-mode-card-desc{font-size:12px;color:var(--ink-soft,#5a5d54);font-weight:300;line-height:1.6}
.qz-record-badge{font-size:12px;font-weight:600;color:var(--gold,#a9863a)}
.qz-new-record{font-size:13px;font-weight:700;color:var(--gold,#a9863a);margin-bottom:6px}
.qz-ladder-preview{list-style:none;display:flex;flex-direction:column-reverse;gap:6px;max-width:100%;margin:0}
.qz-ladder-preview li{background:var(--bg,#faf8f4);border:1px solid var(--line,#e2ddd2);border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;color:var(--ink,#1e1e1e)}
.qz-ladder-preview li:last-child{background:var(--accent,#7a2e2e);color:#fff;border-color:var(--accent,#7a2e2e)}
.qz-btn-play{background:var(--accent,#7a2e2e);color:#fff;border:none;padding:12px 28px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:var(--sans,sans-serif);align-self:stretch;margin-top:auto}
.qz-btn-play:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.18)}
.qz-loading,.qz-empty-state{text-align:center;padding:60px 20px;color:var(--ink-soft,#5a5d54);font-size:14px}
.qz-game{display:grid;grid-template-columns:150px 1fr;gap:28px}
.qz-game.qz-game-full{grid-template-columns:1fr}
@media(max-width:600px){.qz-game{grid-template-columns:1fr}.qz-game-side{display:none}}
.qz-ladder-list{list-style:none;display:flex;flex-direction:column-reverse;gap:4px}
.qz-ladder-item{font-size:11px;font-weight:600;padding:6px 8px;border-radius:6px;color:var(--ink-soft,#5a5d54);white-space:nowrap}
.qz-ladder-item.active{background:var(--accent,#7a2e2e);color:#fff}
.qz-ladder-item.done{color:var(--gold,#a9863a)}
.qz-shield{margin-right:4px}
.qz-progress-label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#a9863a);font-weight:600;margin-bottom:14px}
.qz-streak-badge{display:inline-block;background:var(--accent-soft,#f3e9e4);color:var(--accent,#7a2e2e);font-weight:700;font-size:13px;padding:6px 14px;border-radius:999px;margin-bottom:14px}
.qz-question-text{font-family:var(--sans,sans-serif);font-size:clamp(18px,2.6vw,22px);font-weight:600;line-height:1.4;margin-bottom:22px;color:var(--ink,#1e1e1e)}
.qz-options{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.qz-option{text-align:left;padding:14px 18px;border:1px solid var(--line,#e2ddd2);background:var(--paper,#fff);border-radius:10px;font-family:var(--sans,sans-serif);font-size:14px;font-weight:500;color:var(--ink,#1e1e1e);cursor:pointer;transition:all .15s}
.qz-option:hover:not(.disabled){border-color:var(--accent,#7a2e2e);background:var(--accent-soft,#f3e9e4)}
.qz-option.correct{background:#e6f4ea;border-color:#4a7a4a;color:#2e5c2e}
.qz-option.wrong{background:#fbe9e7;border-color:#c0392b;color:#a33025}
.qz-option.disabled{cursor:default}
.qz-option.eliminated{opacity:.3;text-decoration:line-through;pointer-events:none}
.qz-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.qz-btn-help,.qz-btn-stop,.qz-btn-continue,.qz-btn-again,.qz-btn-fechar{border:none;border-radius:999px;padding:11px 20px;font-family:var(--sans,sans-serif);font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .2s}
.qz-btn-help{background:var(--accent-soft,#f3e9e4);color:var(--accent,#7a2e2e)}
.qz-btn-help:disabled{opacity:.4;cursor:not-allowed}
.qz-btn-stop{background:var(--bg,#faf8f4);color:var(--ink-soft,#5a5d54);border:1px solid var(--line,#e2ddd2)}
.qz-btn-continue,.qz-btn-again{background:var(--accent,#7a2e2e);color:#fff}
.qz-btn-fechar{background:var(--bg,#faf8f4);color:var(--ink-soft,#5a5d54);border:1px solid var(--line,#e2ddd2)}
.qz-btn-help:hover:not(:disabled),.qz-btn-stop:hover,.qz-btn-continue:hover,.qz-btn-again:hover,.qz-btn-fechar:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.12)}
.qz-feedback{font-weight:700;font-size:14px;margin-top:16px}
.qz-feedback.correct{color:#2e5c2e}
.qz-feedback.wrong{color:#a33025}
.qz-comentario{font-size:13px;color:var(--ink-soft,#5a5d54);font-weight:300;line-height:1.7;margin-top:8px;background:var(--bg,#faf8f4);border-left:3px solid var(--gold,#a9863a);padding:12px 16px;border-radius:0 8px 8px 0}
.qz-result{text-align:center;padding:20px 0}
.qz-result-emoji{font-size:52px;margin-bottom:12px}
.qz-result-title{font-family:var(--sans,sans-serif);font-size:22px;font-weight:700;margin-bottom:10px;color:var(--ink,#1e1e1e)}
.qz-result-value{font-family:var(--sans,sans-serif);font-size:clamp(32px,6vw,48px);font-weight:700;color:var(--accent,#7a2e2e);margin-bottom:14px}
.qz-result-msg{font-size:13px;color:var(--ink-soft,#5a5d54);font-weight:300;margin-bottom:26px;max-width:400px;margin-left:auto;margin-right:auto}
.qz-back-link{background:none;border:none;color:var(--ink-soft,#5a5d54);font-family:var(--sans,sans-serif);font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;margin-bottom:18px;padding:0}
.qz-back-link:hover{color:var(--accent,#7a2e2e)}
`;

function qzEnsureDom(){
  if(document.getElementById('qzOverlay')) return;
  const style=document.createElement('style');
  style.textContent=QZ_CSS;
  document.head.appendChild(style);
  const div=document.createElement('div');
  div.id='qzOverlay';
  div.className='qz-overlay';
  div.innerHTML='<div class="qz-box"><button class="qz-close" onclick="qzClose()">✕</button><div class="qz-body" id="qzBody"></div></div>';
  document.body.appendChild(div);
  div.addEventListener('click',e=>{if(e.target===div) qzClose();});
}

function qzRenderIntro(){
  const body=document.getElementById('qzBody');
  const best=qzGetBestStreak();
  body.innerHTML=`<div class="qz-intro">
    <div class="qz-intro-eyebrow">Quiz Bíblico</div>
    <h2 class="qz-intro-title">Quiz Bíblico</h2>
    <p class="qz-intro-desc">Escolha como quer jogar.</p>
    <div class="qz-mode-grid">
      <div class="qz-mode-card">
        <div class="qz-mode-card-title">Show do Crentão</div>
        <p class="qz-mode-card-desc">Avance na trilha de pontos. Se errar, você leva os pontos do último estágio de segurança conquistado (🛡).</p>
        <button class="qz-btn-play" onclick="qzRenderMilhaoPreview()">Jogar</button>
      </div>
      <div class="qz-mode-card">
        <div class="qz-mode-card-title">Modo Sequência</div>
        <p class="qz-mode-card-desc">Responda o máximo de perguntas seguidas que conseguir, na ordem que vierem. Errar uma encerra o jogo — mas você pode parar quando quiser antes disso.</p>
        ${best>0?`<div class="qz-record-badge">🏅 Seu recorde: ${best} acerto${best===1?'':'s'}</div>`:''}
        <button class="qz-btn-play" onclick="qzStart('full')">Jogar</button>
      </div>
    </div>
  </div>`;
}

function qzRenderMilhaoPreview(){
  const body=document.getElementById('qzBody');
  const ladderHtml=QZ_PRIZE_STEPS.slice().reverse().map(s=>`<li>${s.checkpoint?'🛡 ':''}${qzBRL(s.value)}</li>`).join('');
  body.innerHTML=`<div class="qz-intro">
    <button class="qz-back-link" onclick="qzRenderIntro()">← Voltar</button>
    <div class="qz-intro-eyebrow">Show do Crentão</div>
    <h2 class="qz-intro-title">A trilha de pontos</h2>
    <p class="qz-intro-desc">Suba a escada respondendo corretamente. Os estágios com 🛡 são pontos de segurança: se errar depois deles, você não perde tudo.</p>
    <ul class="qz-ladder-preview">${ladderHtml}</ul>
    <button class="qz-btn-play" style="margin-top:22px" onclick="qzStart('milhao')">Começar</button>
  </div>`;
}

async function qzStart(mode){
  mode = mode || _qzState.mode || 'milhao';
  const body=document.getElementById('qzBody');
  body.innerHTML='<div class="qz-loading">Preparando as perguntas…</div>';
  if(!_qzCache){
    const raw=await qzFetchSheet(QZ_SHEET_URL);
    console.log('[Quiz Bíblico] linhas recebidas da planilha:',raw.length,raw);
    _qzCache=raw.map(qzNormalizeRow).filter(q=>q.pergunta&&q.resposta);
    console.log('[Quiz Bíblico] perguntas válidas após filtro:',_qzCache.length);
  }
  if(!_qzCache.length){
    body.innerHTML=`<div class="qz-empty-state">Nenhuma pergunta encontrada.<br><br>
      Verifique se: (1) a aba "Quiz" está publicada em Arquivo → Compartilhar → Publicar na Web,
      e (2) as colunas <b>pergunta</b>, <b>opcao_a</b>, <b>opcao_b</b>, <b>opcao_c</b>, <b>resposta</b> estão preenchidas.
      Veja o console do navegador (F12) para mais detalhes.</div>`;
    return;
  }
  _qzState.mode=mode;
  _qzState.sequence= mode==='full' ? qzBuildFullSequence(_qzCache) : qzBuildSequence(_qzCache);
  _qzState.index=0;
  _qzState.lastCorrectValue=0;
  _qzState.securedValue=0;
  _qzState.correctCount=0;
  _qzState.usedHelp=false;
  _qzState.answered=false;
  qzRenderQuestion();
}

function qzRenderQuestion(){
  const st=_qzState;
  const step=st.sequence[st.index];
  if(!step){
    qzRenderResult(st.mode==='full' ? 'full_topo' : 'topo');
    return;
  }
  const total=st.sequence.length;
  const isMilhao = st.mode==='milhao';
  let sideHtml='', streakHtml='', progressText='';

  if(isMilhao){
    const ladder=st.sequence.slice().reverse().map((s,ri)=>{
      const i=total-1-ri;
      const cls=i===st.index?'active':i<st.index?'done':'';
      return `<li class="qz-ladder-item ${cls}">${s.checkpoint?'<span class="qz-shield">🛡</span>':''}${qzBRL(s.value)}</li>`;
    }).join('');
    sideHtml=`<div class="qz-game-side"><ul class="qz-ladder-list">${ladder}</ul></div>`;
    progressText=`Pergunta ${st.index+1} de ${total} · valendo <b>${qzBRL(step.value)}</b>`;
  }else{
    streakHtml=`<div class="qz-streak-badge">🔥 ${st.correctCount} acerto${st.correctCount===1?'':'s'} seguido${st.correctCount===1?'':'s'}</div>`;
    progressText=`Pergunta ${st.index+1} de ${total}`;
  }

  const optsHtml=step.options.map((opt,i)=>`<button class="qz-option" data-idx="${i}" onclick="qzAnswer(${i})">${qzEscHtml(opt)}</button>`).join('');
  const stopLabel = isMilhao ? `Parar e levar ${qzBRL(st.lastCorrectValue)}` : `Parar por aqui (${st.correctCount})`;
  const body=document.getElementById('qzBody');
  body.innerHTML=`<div class="qz-game${isMilhao?'':' qz-game-full'}">
    ${sideHtml}
    <div class="qz-game-main">
      <div class="qz-progress-label">${progressText}</div>
      ${streakHtml}
      <div class="qz-question-text">${qzEscHtml(step.question.pergunta)}</div>
      <div class="qz-options">${optsHtml}</div>
      <div class="qz-actions" id="qzActions">
        <button class="qz-btn-help" id="qzHelpBtn" onclick="qzUseHelp()" ${st.usedHelp?'disabled':''}>🛟 Eliminar uma alternativa</button>
        ${st.index>0?`<button class="qz-btn-stop" onclick="qzStop()">${stopLabel}</button>`:''}
      </div>
    </div>
  </div>`;
}

function qzAnswer(idx){
  const st=_qzState;
  if(st.answered) return;
  st.answered=true;
  const step=st.sequence[st.index];
  const correctText=qzCorrectText(step.question);
  const chosen=step.options[idx]||'';
  const isCorrect=correctText&&chosen.trim().toLowerCase()===correctText.trim().toLowerCase();
  document.querySelectorAll('.qz-option').forEach((btn,i)=>{
    btn.classList.add('disabled');
    btn.onclick=null;
    if(step.options[i].trim().toLowerCase()===correctText.trim().toLowerCase()) btn.classList.add('correct');
    else if(i===idx) btn.classList.add('wrong');
  });
  if(isCorrect){
    if(st.mode==='milhao'){
      st.lastCorrectValue=step.value;
      if(step.checkpoint) st.securedValue=step.value;
    }else{
      st.correctCount++;
    }
  }
  const comentario=step.question.comentario?`<div class="qz-comentario">${qzEscHtml(step.question.comentario)}</div>`:'';
  const wrongResultKind = st.mode==='full' ? 'full_erro' : 'erro';
  const feedbackHtml=`<div class="qz-feedback ${isCorrect?'correct':'wrong'}">${isCorrect?'✔ Resposta certa!':'✘ Resposta errada.'}</div>${comentario}
    <div class="qz-actions" style="margin-top:18px">
      ${isCorrect?'<button class="qz-btn-continue" onclick="qzNext()">Continuar</button>':`<button class="qz-btn-continue" onclick="qzRenderResult('${wrongResultKind}')">Ver resultado</button>`}
    </div>`;
  const actionsEl=document.getElementById('qzActions');
  if(actionsEl) actionsEl.outerHTML=feedbackHtml;
}

function qzNext(){
  _qzState.index++;
  _qzState.answered=false;
  qzRenderQuestion();
}
function qzUseHelp(){
  const st=_qzState;
  if(st.usedHelp||st.answered) return;
  const step=st.sequence[st.index];
  const correctText=qzCorrectText(step.question);
  const wrongIdxs=step.options.map((o,i)=>i).filter(i=>step.options[i].trim().toLowerCase()!==correctText.trim().toLowerCase());
  if(!wrongIdxs.length) return;
  const removeIdx=wrongIdxs[Math.floor(Math.random()*wrongIdxs.length)];
  const btn=document.querySelector(`.qz-option[data-idx="${removeIdx}"]`);
  if(btn){btn.classList.add('eliminated');btn.disabled=true;btn.onclick=null;}
  st.usedHelp=true;
  const helpBtn=document.getElementById('qzHelpBtn');
  if(helpBtn) helpBtn.disabled=true;
}
function qzStop(){
  const st=_qzState;
  qzRenderResult(st.mode==='full' ? 'full_parou' : 'parou');
}

function qzRenderResult(kind){
  const st=_qzState;
  const isFull = kind.indexOf('full')===0;

  if(isFull){
    const value=st.correctCount;
    let title,msg,emoji;
    if(kind==='full_topo'){
      title='Você zerou o banco de perguntas!';msg='Impressionante — não sobrou nenhuma pergunta para te derrubar.';emoji='🏆';
    }else if(kind==='full_parou'){
      title='Você parou por aqui';msg='Uma decisão sábia é sempre uma vitória.';emoji='🙌';
    }else{
      title='Sua sequência parou aqui';msg='Tente novamente e tente bater sua marca!';emoji='📖';
    }
    const isNewRecord=qzSaveBestStreak(value);
    const recordHtml=isNewRecord?'<div class="qz-new-record">🎉 Novo recorde!</div>':'';
    const body=document.getElementById('qzBody');
    body.innerHTML=`<div class="qz-result">
      <div class="qz-result-emoji">${emoji}</div>
      <div class="qz-result-title">${title}</div>
      ${recordHtml}
      <div class="qz-result-value">${value} acerto${value===1?'':'s'}</div>
      <p class="qz-result-msg">${msg}</p>
      <div class="qz-actions" style="justify-content:center">
        <button class="qz-btn-again" onclick="qzStart('full')">Jogar novamente</button>
        <button class="qz-btn-fechar" onclick="qzRenderIntro()">Escolher outro modo</button>
      </div>
    </div>`;
    return;
  }

  let value,title,msg,emoji;
  if(kind==='topo'){
    value=QZ_PRIZE_STEPS[QZ_PRIZE_STEPS.length-1].value;
    title='Você chegou ao topo!';msg='Parabéns, você conquistou o prêmio máximo!';emoji='🏆';
  }else if(kind==='parou'){
    value=st.lastCorrectValue;title='Você parou por aqui';msg='Uma decisão sábia é sempre uma vitória.';emoji='🙌';
  }else{
    value=st.securedValue;title='Não foi dessa vez';
    msg=value>0?'Mas seu ponto de segurança garantiu esse prêmio.':'Tente novamente e avance mais na trilha!';emoji='📖';
  }
  const body=document.getElementById('qzBody');
  body.innerHTML=`<div class="qz-result">
    <div class="qz-result-emoji">${emoji}</div>
    <div class="qz-result-title">${title}</div>
    <div class="qz-result-value">${qzBRL(value)}</div>
    <p class="qz-result-msg">${msg}</p>
    <div class="qz-actions" style="justify-content:center">
      <button class="qz-btn-again" onclick="qzStart('milhao')">Jogar novamente</button>
      <button class="qz-btn-fechar" onclick="qzRenderIntro()">Escolher outro modo</button>
    </div>
  </div>`;
}

function qzOpen(){
  qzEnsureDom();
  document.getElementById('qzOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  qzRenderIntro();
}
function qzClose(){
  const ov=document.getElementById('qzOverlay');
  if(ov) ov.classList.remove('open');
  document.body.style.overflow='';
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const ov=document.getElementById('qzOverlay');
    if(ov&&ov.classList.contains('open')) qzClose();
  }
});

window.abrirQuizDoMilhao=qzOpen;
