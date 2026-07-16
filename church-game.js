/**
 * ========================================================================
 * IGREJA PRIMITIVA - SIMULADOR (v1)
 * ------------------------------------------------------------------------
 * Motor de gestão da igreja local, ambientado entre 33-70 d.C.
 * Todo o conteúdo (cidades, eventos, decisões, missões, personagens,
 * cartas, história, conquistas, avaliações) vem do Google Sheets, publicado
 * como TSV. O JavaScript é só o motor: aplica efeitos, checa condições,
 * avança turnos e renderiza a interface.
 *
 * Como usar:
 *   1. Preencha os links TSV em CONFIG.SHEETS abaixo.
 *   2. Coloque <div id="church-game-root"></div> onde o jogo deve aparecer.
 *   3. Inclua <script src="church-game.js"></script> antes de </body>.
 *      O jogo se auto-inicializa se encontrar a div. Também é possível
 *      chamar manualmente: ChurchGame.init(document.getElementById('...'))
 *      -- útil se a aba "mais" só monta o conteúdo quando é aberta.
 *
 * Sem build step, sem dependências externas, sem frameworks.
 * ========================================================================
 */
(function (global) {
  'use strict';

  // ======================================================================
  // 1. CONFIG
  // ======================================================================
  var CONFIG = {
    // Cole aqui os links "Publicar na Web" (TSV) de cada aba do Sheets.
    SHEETS: {
      config: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=0&single=true&output=tsv', // <-- você ainda não me passou o link desta aba; o jogo usa DEFAULTS abaixo enquanto estiver vazio
      cidades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1649394407&single=true&output=tsv',
      personagens: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=643844560&single=true&output=tsv',
      eventos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1733993415&single=true&output=tsv',
      decisoes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1912982421&single=true&output=tsv',
      missoes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1055605089&single=true&output=tsv',
      desenvolvimento: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=753116534&single=true&output=tsv',
      historia: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1421598526&single=true&output=tsv',
      cartas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1274698364&single=true&output=tsv',
      indicadores: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1261692391&single=true&output=tsv',
      conquistas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1704718943&single=true&output=tsv',
      dificuldades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1364017505&single=true&output=tsv',
      avaliacoes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJIvqpjlqm5GCLgrbQCtc-BA5w5krliwzcaStKPIPsf-3s9101Rx2NlUHvT9Tis1m93raki4XrHD9R/pub?gid=1849680132&single=true&output=tsv'
    },

    // Usado somente enquanto CONFIG.SHEETS.config estiver vazio.
    DEFAULTS: {
      titulo_jogo: 'Igreja Primitiva - Simulador',
      ano_inicial: 33,
      ano_final: 70,
      cidade_inicial: 'JER',
      dificuldade_padrao: 'normal',
      fe_inicial: 70,
      unidade_inicial: 70,
      conhecimento_inicial: 40,
      coragem_inicial: 60,
      recursos_inicial: 50,
      influencia_inicial: 20,
      reputacao_inicial: 50,
      membros_inicial: 120,
      missionarios_inicial: 12,
      perseguicao_inicial: 10
    },

    CORE_INDICATORS: ['fe', 'unidade', 'conhecimento', 'coragem', 'recursos', 'influencia', 'reputacao', 'membros', 'missionarios', 'perseguicao'],
    STORAGE_KEY: 'churchGameSaveV1',

    // Chance-base (0-1) de um personagem aparecer em um turno sem crise,
    // e multiplicador de peso quando o "gatilho" dele está ativo.
    PERSONAGEM_CHANCE_BASE: 0.10,
    PERSONAGEM_PESO_GATILHO: 6,
    PERSONAGEM_PESO_NORMAL: 1
  };

  // ======================================================================
  // 2. UTILS - funções puras, sem estado
  // ======================================================================
  var Utils = {
    normalizeKey: function (str) {
      return String(str || '')
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos
    },

    toNumber: function (val, fallback) {
      var n = parseFloat(String(val).replace(',', '.'));
      return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
    },

    clamp: function (value, min, max) {
      if (typeof min === 'number' && value < min) return min;
      if (typeof max === 'number' && value > max) return max;
      return value;
    },

    parseTSV: function (text) {
      var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim().length > 0; });
      if (lines.length === 0) return [];
      var headers = lines[0].split('\t').map(function (h) { return h.trim(); });
      return lines.slice(1).map(function (line) {
        var cols = line.split('\t');
        var obj = {};
        headers.forEach(function (h, i) {
          obj[h] = cols[i] !== undefined ? cols[i].trim() : '';
        });
        return obj;
      });
    },

    // "fe+10;perseguicao-20;cidade=ANT" -> [{key,op,value}]
    parseEffects: function (str) {
      if (!str) return [];
      return String(str).split(';').map(function (part) {
        var m = part.trim().match(/^([a-zA-Z_]+)\s*(\+|-|=)\s*(.+)$/);
        if (!m) return null;
        return { key: Utils.normalizeKey(m[1]), op: m[2], value: m[3].trim() };
      }).filter(Boolean);
    },

    // "fe>=60;ano>=50" -> [{key,op,value}] (AND entre todos)
    // "sempre" -> []  (lista vazia = condição sempre satisfeita)
    parseConditions: function (str) {
      var raw = String(str || '').trim();
      if (!raw || Utils.normalizeKey(raw) === 'sempre') return [];
      return raw.split(';').map(function (part) {
        var m = part.trim().match(/^([a-zA-Z_]+)\s*(>=|<=|>|<|=)\s*(.+)$/);
        if (!m) return null;
        return { key: Utils.normalizeKey(m[1]), op: m[2], value: m[3].trim() };
      }).filter(Boolean);
    },

    uid: function (prefix) {
      return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
    },

    weightedPick: function (items, weightFn) {
      var total = 0;
      var weights = items.map(function (it) {
        var w = Math.max(0, weightFn(it));
        total += w;
        return w;
      });
      if (total <= 0) return null;
      var r = Math.random() * total;
      for (var i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    }
  };

  // ======================================================================
  // 3. LOADER - busca e cacheia as abas do Sheets
  // ======================================================================
  var Loader = {
    data: {}, // { cidades: [...], eventos: [...], ... }

    fetchSheet: function (url) {
      if (!url) return Promise.resolve(null);
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('Falha ao buscar planilha: ' + url);
        return res.text();
      }).then(Utils.parseTSV);
    },

    fetchAll: function () {
      var names = Object.keys(CONFIG.SHEETS);
      var self = this;
      return Promise.all(names.map(function (name) {
        return self.fetchSheet(CONFIG.SHEETS[name]).then(function (rows) {
          self.data[name] = rows || [];
        }).catch(function (err) {
          console.error('[ChurchGame] erro carregando aba "' + name + '":', err);
          self.data[name] = [];
        });
      })).then(function () {
        self.buildConfigMap();
        self.buildIndicadoresMap();
        return self.data;
      });
    },

    // aba "config" (chave/valor) -> objeto simples, com fallback em DEFAULTS
    buildConfigMap: function () {
      var map = {};
      (this.data.config || []).forEach(function (row) {
        if (row.chave) map[Utils.normalizeKey(row.chave)] = row.valor;
      });
      Object.keys(CONFIG.DEFAULTS).forEach(function (key) {
        if (!(key in map) || map[key] === '') map[key] = CONFIG.DEFAULTS[key];
      });
      this.config = map;
    },

    // aba "indicadores" -> mapa normalizado {indicador: {nome_exibicao,minimo,maximo,cor}}
    buildIndicadoresMap: function () {
      var map = {};
      (this.data.indicadores || []).forEach(function (row) {
        var key = Utils.normalizeKey(row.indicador);
        map[key] = {
          nome: row.nome_exibicao || row.indicador,
          min: Utils.toNumber(row.minimo, 0),
          max: Utils.toNumber(row.maximo, 100),
          cor: row.cor || '#888888'
        };
      });
      this.indicadores = map;
    }
  };

  // ======================================================================
  // 4. STATE - estado vivo da partida
  // ======================================================================
  var State = {
    reset: function () {
      var cfg = Loader.config;
      this.year = Utils.toNumber(cfg.ano_inicial, 33);
      this.yearFinal = Utils.toNumber(cfg.ano_final, 70);
      this.difficulty = cfg.dificuldade_padrao || 'normal';
      this.currentCity = cfg.cidade_inicial || 'JER';
      this.visitedCities = {};
      this.visitedCities[this.currentCity] = true;

      this.player = {};
      CONFIG.CORE_INDICATORS.forEach(function (key) {
        this.player[key] = Utils.toNumber(cfg[key + '_inicial'], 0);
      }, this);

      this.completedMissions = {};
      this.receivedLetters = {};
      this.unlockedAchievements = {};
      this.builtDevelopments = {};
      this.history = []; // [{year, text, type}]
      this.pendingEvent = null; // evento aguardando decisão do jogador
      this.finished = false;
      this.finalReport = null;
    },

    cidadesAlcancadas: function () {
      return Object.keys(this.visitedCities).length;
    },

    indicatorValue: function (key) {
      key = Utils.normalizeKey(key);
      if (key === 'ano') return this.year;
      if (key === 'cidade') return this.currentCity;
      if (key === 'cidades_alcancadas') return this.cidadesAlcancadas();
      if (key in this.player) return this.player[key];
      return undefined;
    },

    log: function (text, type) {
      this.history.unshift({ year: this.year, text: text, type: type || 'info' });
      if (this.history.length > 200) this.history.length = 200;
    }
  };

  // ======================================================================
  // 5. ENGINE - regras genéricas: aplicar efeitos, checar condições
  // ======================================================================
  var Engine = {
    evaluateConditionList: function (conditions) {
      // AND entre todas; lista vazia = sempre verdadeiro
      return conditions.every(function (cond) {
        var current = State.indicatorValue(cond.key);
        if (current === undefined) return false;

        if (cond.key === 'cidade') {
          return cond.op === '=' ? current === cond.value : false;
        }

        var target = Utils.toNumber(cond.value, NaN);
        if (isNaN(target)) return false;
        var cur = Utils.toNumber(current, NaN);

        switch (cond.op) {
          case '>=': return cur >= target;
          case '<=': return cur <= target;
          case '>': return cur > target;
          case '<': return cur < target;
          case '=': return cur === target;
          default: return false;
        }
      });
    },

    conditionMet: function (conditionString) {
      return this.evaluateConditionList(Utils.parseConditions(conditionString));
    },

    applyEffects: function (effectString) {
      var effects = Utils.parseEffects(effectString);
      var self = this;
      effects.forEach(function (fx) {
        self.applyOneEffect(fx);
      });
    },

    applyOneEffect: function (fx) {
      // atribuições especiais
      if (fx.key === 'cidade' && fx.op === '=') {
        Game.travelTo(fx.value);
        return;
      }
      if (fx.key === 'missao' && fx.op === '=') {
        Game.completeMissionById(fx.value);
        return;
      }
      if (fx.key === 'conquista' && fx.op === '=') {
        Game.unlockAchievementById(fx.value);
        return;
      }

      // indicadores numéricos padrão
      if (CONFIG.CORE_INDICATORS.indexOf(fx.key) === -1) return; // ignora chaves desconhecidas, sem quebrar
      var meta = Loader.indicadores[fx.key] || { min: 0, max: 999999 };
      var delta = Utils.toNumber(fx.value, 0);
      var current = State.player[fx.key] || 0;
      var next = current;
      if (fx.op === '+') next = current + delta;
      else if (fx.op === '-') next = current - delta;
      else if (fx.op === '=') next = delta;
      State.player[fx.key] = Utils.clamp(next, meta.min, meta.max);
    }
  };

  // ======================================================================
  // 6. GAME - orquestra o loop de turnos e as regras temáticas
  // ======================================================================
  var Game = {
    container: null,

    init: function (container) {
      this.container = typeof container === 'string' ? document.getElementById(container) : container;
      if (!this.container) {
        console.error('[ChurchGame] container não encontrado.');
        return;
      }
      UI.injectStyles();
      UI.renderLoading(this.container);

      Loader.fetchAll().then(function () {
        var saved = Storage.load();
        if (saved) {
          State.reset();
          Object.assign(State, saved);
        } else {
          State.reset();
        }
        UI.render();
      }).catch(function (err) {
        console.error('[ChurchGame] erro fatal ao iniciar:', err);
        UI.renderError(Game.container);
      });
    },

    restart: function () {
      Storage.clear();
      State.reset();
      UI.render();
    },

    travelTo: function (cityId) {
      if (!cityId) return;
      State.currentCity = cityId;
      State.visitedCities[cityId] = true;
    },

    // ---- avançar um turno (1 ano) ----
    advanceYear: function () {
      if (State.finished) return;

      // 1. eventos históricos fixos deste ano
      (Loader.data.historia || []).forEach(function (row) {
        if (Utils.toNumber(row.ano) === State.year) {
          Engine.applyEffects(row.efeito);
          State.log('📜 ' + row.evento, 'historia');
        }
      });

      // 2. evento aleatório do turno
      var evento = this.rollEvent();
      if (evento) {
        var temDecisao = Utils.normalizeKey(evento.tem_decisao) === 'sim';
        Engine.applyEffects(evento.efeito_base);
        if (temDecisao) {
          State.pendingEvent = evento;
          State.log('⚠️ ' + evento.texto, 'evento-pendente');
          UI.render();
          return; // pausa o turno até o jogador escolher
        } else {
          State.log('⚠️ ' + evento.texto, 'evento');
        }
      }

      this.finishTurnChecks();
    },

    // chamado depois que o jogador resolve (ou não há) decisão pendente
    resolveDecision: function (optionEffect, optionText) {
      Engine.applyEffects(optionEffect);
      State.log('➡️ Decisão: ' + optionText, 'decisao');
      State.pendingEvent = null;
      this.finishTurnChecks();
    },

    finishTurnChecks: function () {
      this.checkPersonagens();
      this.checkMissoes();
      this.checkCartas();
      this.checkConquistas();

      State.year += 1;
      if (State.year > State.yearFinal) {
        State.year = State.yearFinal;
        this.finishGame();
      }
      Storage.save();
      UI.render();
    },

    rollEvent: function () {
      var eventos = Loader.data.eventos || [];
      if (eventos.length === 0) return null;
      return Utils.weightedPick(eventos, function (e) {
        return Utils.toNumber(e.probabilidade, 1);
      });
    },

    checkPersonagens: function () {
      var elegiveis = (Loader.data.personagens || []).filter(function (p) {
        return Engine.conditionMet(p.desbloqueio);
      });
      if (elegiveis.length === 0) return;
      if (Math.random() > CONFIG.PERSONAGEM_CHANCE_BASE * (elegiveis.some(function (p) { return Engine.conditionMet(p.gatilho); }) ? 4 : 1)) {
        return;
      }
      var escolhido = Utils.weightedPick(elegiveis, function (p) {
        return Engine.conditionMet(p.gatilho) ? CONFIG.PERSONAGEM_PESO_GATILHO : CONFIG.PERSONAGEM_PESO_NORMAL;
      });
      if (!escolhido) return;
      Engine.applyEffects(escolhido.efeito_ajuda);
      State.log('🧑‍🦳 ' + escolhido.nome + ' veio ajudar a igreja.', 'personagem');
    },

    checkMissoes: function () {
      (Loader.data.missoes || []).forEach(function (m) {
        if (State.completedMissions[m.id]) return;
        if (Engine.conditionMet(m.objetivo)) {
          Engine.applyEffects(m.recompensa);
          State.completedMissions[m.id] = true;
          State.log('✅ Missão concluída: ' + m.nome, 'missao');
        }
      });
    },

    completeMissionById: function (id) {
      var m = (Loader.data.missoes || []).find(function (r) { return r.id === id; });
      if (!m || State.completedMissions[id]) return;
      Engine.applyEffects(m.recompensa);
      State.completedMissions[id] = true;
      State.log('✅ Missão concluída: ' + m.nome, 'missao');
    },

    checkCartas: function () {
      (Loader.data.cartas || []).forEach(function (c) {
        if (State.receivedLetters[c.id]) return;
        if (Engine.conditionMet(c.condicao)) {
          Engine.applyEffects(c.bonus);
          State.receivedLetters[c.id] = true;
          State.log('✉️ Carta recebida: ' + c.carta, 'carta');
        }
      });
    },

    checkConquistas: function () {
      (Loader.data.conquistas || []).forEach(function (a) {
        if (State.unlockedAchievements[a.id]) return;
        if (Engine.conditionMet(a.condicao)) {
          State.unlockedAchievements[a.id] = true;
          State.log('🏆 Conquista desbloqueada: ' + a.nome, 'conquista');
        }
      });
    },

    unlockAchievementById: function (id) {
      var a = (Loader.data.conquistas || []).find(function (r) { return r.id === id; });
      if (!a || State.unlockedAchievements[id]) return;
      State.unlockedAchievements[id] = true;
      State.log('🏆 Conquista desbloqueada: ' + a.nome, 'conquista');
    },

    buildDevelopment: function (devId) {
      var dev = (Loader.data.desenvolvimento || []).find(function (d) { return d.id === devId; });
      if (!dev || State.builtDevelopments[devId]) return;
      if (!Engine.conditionMet(dev.pre_requisito)) return;
      Engine.applyEffects(dev.custo);
      Engine.applyEffects(dev.efeito);
      State.builtDevelopments[devId] = true;
      State.log('🏗️ Construído: ' + dev.nome, 'desenvolvimento');
      Storage.save();
      UI.render();
    },

    finishGame: function () {
      State.finished = true;
      var alcancadas = (Loader.data.avaliacoes || []).filter(function (av) {
        return Engine.conditionMet(av.condicao);
      });
      State.finalReport = alcancadas;
      State.log('🕊️ O relatório final da igreja está pronto.', 'final');
    }
  };

  // ======================================================================
  // 7. STORAGE - persistência em LocalStorage
  // ======================================================================
  var Storage = {
    save: function () {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(State));
      } catch (e) {
        console.warn('[ChurchGame] não foi possível salvar:', e);
      }
    },
    load: function () {
      try {
        var raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    clear: function () {
      try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
    }
  };

  // ======================================================================
  // 8. UI - renderização (DOM puro, sem framework)
  // ======================================================================
  var UI = {
    injectStyles: function () {
      if (document.getElementById('church-game-styles')) return;
      var style = document.createElement('style');
      style.id = 'church-game-styles';
      style.textContent = [
        '.cg-root{--cg-bg:#2b2420;--cg-card:#3a2f28;--cg-ink:#f3ead9;--cg-gold:#c9a24b;--cg-muted:#b9ab97;',
        '  font-family:Georgia,\'Times New Roman\',serif;background:var(--cg-bg);color:var(--cg-ink);',
        '  border-radius:14px;padding:20px;max-width:640px;margin:0 auto;line-height:1.4;}',
        '.cg-root *{box-sizing:border-box;}',
        '.cg-header{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:14px;border-bottom:1px solid rgba(201,162,75,.35);padding-bottom:10px;}',
        '.cg-title{font-size:1.3rem;color:var(--cg-gold);letter-spacing:.5px;}',
        '.cg-meta{font-size:.85rem;color:var(--cg-muted);}',
        '.cg-indicators{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 14px;margin-bottom:16px;}',
        '.cg-indicator{font-size:.78rem;}',
        '.cg-indicator-label{display:flex;justify-content:space-between;margin-bottom:2px;}',
        '.cg-bar-track{background:rgba(255,255,255,.08);border-radius:6px;height:8px;overflow:hidden;}',
        '.cg-bar-fill{height:100%;border-radius:6px;transition:width .4s ease;}',
        '.cg-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}',
        '.cg-btn{background:var(--cg-gold);color:#241d17;border:none;padding:9px 14px;border-radius:8px;font-family:inherit;font-size:.85rem;font-weight:bold;cursor:pointer;}',
        '.cg-btn:hover{filter:brightness(1.08);}',
        '.cg-btn.cg-btn-secondary{background:rgba(255,255,255,.12);color:var(--cg-ink);}',
        '.cg-btn:disabled{opacity:.4;cursor:not-allowed;}',
        '.cg-card{background:var(--cg-card);border-radius:10px;padding:14px;margin-bottom:12px;border:1px solid rgba(201,162,75,.25);}',
        '.cg-card h4{margin:0 0 8px;color:var(--cg-gold);font-size:1rem;}',
        '.cg-options{display:flex;flex-direction:column;gap:8px;margin-top:10px;}',
        '.cg-log{max-height:220px;overflow-y:auto;font-size:.82rem;display:flex;flex-direction:column;gap:6px;}',
        '.cg-log-item{border-left:2px solid var(--cg-gold);padding-left:8px;}',
        '.cg-log-year{color:var(--cg-muted);margin-right:6px;}',
        '.cg-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}',
        '.cg-modal{background:var(--cg-card);color:var(--cg-ink);border-radius:12px;padding:20px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;font-family:Georgia,serif;}',
        '.cg-list-empty{color:var(--cg-muted);font-size:.85rem;font-style:italic;}'
      ].join('');
      document.head.appendChild(style);
    },

    renderLoading: function (container) {
      container.innerHTML = '<div class="cg-root"><p>Carregando a história da igreja...</p></div>';
    },

    renderError: function (container) {
      container.innerHTML = '<div class="cg-root"><p>Não foi possível carregar os dados do jogo. Verifique os links das planilhas.</p></div>';
    },

    render: function () {
      if (!Game.container) return;
      var cfg = Loader.config || {};
      var cidade = (Loader.data.cidades || []).find(function (c) { return c.id === State.currentCity; });

      var html = '<div class="cg-root">';
      html += this.renderHeader(cfg, cidade);
      html += this.renderIndicators();
      html += this.renderActions();
      html += this.renderLog();
      html += '</div>';

      Game.container.innerHTML = html;
      this.bindActions();

      if (State.finished) this.showFinalReport();
      else if (State.pendingEvent) this.showEventModal(State.pendingEvent);
    },

    renderHeader: function (cfg, cidade) {
      return '' +
        '<div class="cg-header">' +
        '<div class="cg-title">' + (cfg.titulo_jogo || 'Igreja Primitiva') + '</div>' +
        '<div class="cg-meta">Ano ' + State.year + ' d.C. · ' + (cidade ? cidade.cidade : State.currentCity) + '</div>' +
        '</div>';
    },

    renderIndicators: function () {
      var html = '<div class="cg-indicators">';
      CONFIG.CORE_INDICATORS.forEach(function (key) {
        var meta = Loader.indicadores[key] || { nome: key, min: 0, max: 100, cor: '#c9a24b' };
        var value = State.player[key] || 0;
        var pct = Utils.clamp(((value - meta.min) / (meta.max - meta.min || 1)) * 100, 0, 100);
        html += '' +
          '<div class="cg-indicator">' +
          '<div class="cg-indicator-label"><span>' + meta.nome + '</span><span>' + Math.round(value) + '</span></div>' +
          '<div class="cg-bar-track"><div class="cg-bar-fill" style="width:' + pct + '%;background:' + meta.cor + ';"></div></div>' +
          '</div>';
      });
      html += '</div>';
      return html;
    },

    renderActions: function () {
      var disabled = State.pendingEvent || State.finished ? 'disabled' : '';
      return '' +
        '<div class="cg-actions">' +
        '<button class="cg-btn" data-action="advance" ' + disabled + '>Avançar Ano</button>' +
        '<button class="cg-btn cg-btn-secondary" data-action="viajar" ' + disabled + '>Viajar</button>' +
        '<button class="cg-btn cg-btn-secondary" data-action="desenvolvimento" ' + disabled + '>Desenvolvimento</button>' +
        '<button class="cg-btn cg-btn-secondary" data-action="missoes">Missões</button>' +
        '<button class="cg-btn cg-btn-secondary" data-action="cartas">Cartas</button>' +
        '<button class="cg-btn cg-btn-secondary" data-action="conquistas">Conquistas</button>' +
        '<button class="cg-btn cg-btn-secondary" data-action="reiniciar">Reiniciar</button>' +
        '</div>';
    },

    renderLog: function () {
      if (State.history.length === 0) return '<div class="cg-list-empty">Nenhum acontecimento ainda.</div>';
      var html = '<div class="cg-log">';
      State.history.forEach(function (item) {
        html += '<div class="cg-log-item"><span class="cg-log-year">' + item.year + '</span>' + item.text + '</div>';
      });
      html += '</div>';
      return html;
    },

    bindActions: function () {
      var map = {
        advance: function () { Game.advanceYear(); },
        viajar: function () { UI.showTravelModal(); },
        desenvolvimento: function () { UI.showDevelopmentModal(); },
        missoes: function () { UI.showListModal('Missões', Loader.data.missoes, function (m) {
          return (State.completedMissions[m.id] ? '✅ ' : '⏳ ') + m.nome;
        }); },
        cartas: function () { UI.showListModal('Cartas', Loader.data.cartas, function (c) {
          return (State.receivedLetters[c.id] ? '✉️ ' : '📪 ') + c.carta;
        }); },
        conquistas: function () { UI.showListModal('Conquistas', Loader.data.conquistas, function (a) {
          return (State.unlockedAchievements[a.id] ? '🏆 ' : '🔒 ') + a.nome;
        }); },
        reiniciar: function () {
          if (confirm('Reiniciar o jogo do zero? Todo o progresso será perdido.')) Game.restart();
        }
      };
      Game.container.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var action = btn.getAttribute('data-action');
          if (map[action]) map[action]();
        });
      });
    },

    openModal: function (innerHtml) {
      this.closeModal();
      var overlay = document.createElement('div');
      overlay.className = 'cg-modal-overlay';
      overlay.id = 'cg-modal-overlay';
      overlay.innerHTML = '<div class="cg-modal">' + innerHtml + '</div>';
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) UI.closeModal();
      });
      document.body.appendChild(overlay);
      return overlay;
    },

    closeModal: function () {
      var existing = document.getElementById('cg-modal-overlay');
      if (existing) existing.remove();
    },

    showEventModal: function (evento) {
      var opcoes = (Loader.data.decisoes || []).filter(function (d) { return d.evento === evento.id; });
      var html = '<h4>' + evento.texto + '</h4><div class="cg-options">';
      opcoes.forEach(function (op, i) {
        html += '<button class="cg-btn" data-op="' + i + '">' + op.texto_opcao + '</button>';
      });
      html += '</div>';
      var overlay = this.openModal(html);
      overlay.querySelectorAll('[data-op]').forEach(function (btn, i) {
        btn.addEventListener('click', function () {
          UI.closeModal();
          Game.resolveDecision(opcoes[i].efeito, opcoes[i].texto_opcao);
        });
      });
    },

    showTravelModal: function () {
      var cidades = Loader.data.cidades || [];
      var html = '<h4>Viajar para...</h4><div class="cg-options">';
      cidades.forEach(function (c) {
        var atual = c.id === State.currentCity ? ' (atual)' : '';
        html += '<button class="cg-btn cg-btn-secondary" data-city="' + c.id + '" ' + (c.id === State.currentCity ? 'disabled' : '') + '>' + c.cidade + atual + '</button>';
      });
      html += '</div>';
      var overlay = this.openModal(html);
      overlay.querySelectorAll('[data-city]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Game.travelTo(btn.getAttribute('data-city'));
          Storage.save();
          UI.closeModal();
          UI.render();
        });
      });
    },

    showDevelopmentModal: function () {
      var devs = Loader.data.desenvolvimento || [];
      var html = '<h4>Desenvolvimento</h4><div class="cg-options">';
      devs.forEach(function (d) {
        var construido = State.builtDevelopments[d.id];
        var disponivel = !construido && Engine.conditionMet(d.pre_requisito);
        html += '<button class="cg-btn ' + (construido ? 'cg-btn-secondary' : '') + '" data-dev="' + d.id + '" ' + (construido || !disponivel ? 'disabled' : '') + '>' +
          (construido ? '✅ ' : '') + d.nome + ' (' + d.custo + ')' +
          '</button>';
      });
      html += '</div>';
      var overlay = this.openModal(html);
      overlay.querySelectorAll('[data-dev]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Game.buildDevelopment(btn.getAttribute('data-dev'));
          UI.closeModal();
        });
      });
    },

    showListModal: function (title, items, labelFn) {
      var html = '<h4>' + title + '</h4>';
      if (!items || items.length === 0) {
        html += '<div class="cg-list-empty">Nada disponível ainda.</div>';
      } else {
        html += '<div class="cg-options">';
        items.forEach(function (item) {
          html += '<div class="cg-card">' + labelFn(item) + '</div>';
        });
        html += '</div>';
      }
      this.openModal(html);
    },

    showFinalReport: function () {
      var html = '<h4>A igreja no ano ' + State.yearFinal + ' d.C.</h4>';
      if (!State.finalReport || State.finalReport.length === 0) {
        html += '<p>Sua igreja perseverou até o fim, com sua própria identidade e caminho.</p>';
      } else {
        html += '<div class="cg-options">';
        State.finalReport.forEach(function (av) {
          html += '<div class="cg-card"><h4>' + av.nome_resultado + '</h4><p>' + av.descricao + '</p></div>';
        });
        html += '</div>';
      }
      html += '<button class="cg-btn" id="cg-restart-final">Jogar Novamente</button>';
      var overlay = this.openModal(html);
      overlay.querySelector('#cg-restart-final').addEventListener('click', function () {
        UI.closeModal();
        Game.restart();
      });
    }
  };

  // ======================================================================
  // 9. EXPORTAÇÃO PÚBLICA + AUTO-INIT
  // ======================================================================
  global.ChurchGame = {
    init: function (container) { Game.init(container); },
    restart: function () { Game.restart(); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var auto = document.getElementById('church-game-root');
    if (auto) Game.init(auto);
  });
})(window);
