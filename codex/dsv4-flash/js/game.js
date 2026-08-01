// 回合制玩法：经济系统、炸弹、购买、计分板、HUD
window.Game = function (opts) {
  this.THREE = opts.THREE;
  this.scene = opts.scene;
  this.map = opts.map;
  this.player = opts.player;
  this.bots = opts.bots;
  this.botNames = opts.botNames || [];
  this.SHOP = [
    { id: 'armor', name: '防弹衣', desc: '+100 护甲', price: 650, team: 'both' },
    { id: 'helmet', name: '防弹头盔', desc: '大幅减免爆头伤害', price: 350, team: 'both', need: 'armor' },
    { id: 'p9', name: 'P9 手枪', desc: '标准手枪', price: 500, team: 'both' },
    { id: 'ak', name: 'AK-47', desc: 'T 专属步枪', price: 2700, team: 'T' },
    { id: 'm4', name: 'M4 卡宾枪', desc: 'CT 专属步枪', price: 2700, team: 'CT' },
    { id: 'awp', name: 'AWP 狙击枪', desc: '高伤害 · 可开镜', price: 4750, team: 'both' },
    { id: 'kit', name: '拆弹钳', desc: '拆弹时间减半', price: 200, team: 'CT' }
  ];

  this.round = 0;
  this.phase = 'idle';
  this.phaseT = 0;
  this.timeLeft = 0;
  this.tScore = 0;
  this.ctScore = 0;
  this.bomb = null;
  this.carrier = null;
  this.carrierTransferT = 0;
  this.planting = 0;
  this.defusing = 0;
  this.endT = 0;
  this.buyOpen = false;
  this.sbOpen = false;
  this.bannerT = 0;
  this.bannerPersist = false;
  this.beepT = 0;
  this.minimapT = 0;
  this.buyOpenDelay = 0;
  this.explodeFx = null;
  this.roundWonBy = null;

  this.el = {
    hud: $('#hud'),
    roundText: $('#roundText'),
    timerText: $('#timerText'),
    scoreText: $('#scoreText'),
    bombTimerText: $('#bombTimerText'),
    moneyText: $('#moneyText'),
    weaponText: $('#weaponText'),
    ammoText: $('#ammoText'),
    hpFill: $('#hpFill'),
    hpText: $('#hpText'),
    armorFill: $('#armorFill'),
    armorText: $('#armorText'),
    killfeed: $('#killfeed'),
    banner: $('#banner'),
    bannerSub: $('#bannerSub'),
    hint: $('#hint'),
    minimap: $('#minimap'),
    crosshair: $('#crosshair'),
    hitmarker: $('#hitmarker'),
    dmg: $('#dmg'),
    flash: $('#flash'),
    progressWrap: $('#progressWrap'),
    progressText: $('#progressText'),
    progressFill: $('#progressFill'),
    buyMenu: $('#buyMenu'),
    buyMoney: $('#buyMoney'),
    buyList: $('#buyList'),
    scoreboard: $('#scoreboard'),
    sbTitle: $('#sbTitle'),
    sbTable: $('#sbTable'),
    deathOverlay: $('#deathOverlay'),
    deathText: $('#deathText')
  };
  var self0 = this;
  Object.keys(this.el).forEach(function (k) {
    if (!self0.el[k]) console.error('[game] 缺少 DOM 元素: #' + k);
  });
  this.buildBombMesh();
};

Game.prototype.start = function () {
  this.round = 0;
  this.tScore = 0; this.ctScore = 0;
  this.beginRound();
};

Game.prototype.beginRound = function () {
  this.round++;
  this.phase = 'freeze';
  this.phaseT = 5;
  this.timeLeft = 150;
  this.bomb = null;
  this.planting = 0;
  this.defusing = 0;
  this.carrierTransferT = 0;
  this.roundWonBy = null;
  this.hideBombMesh();
  this.hideProgress();
  this.el.deathOverlay.classList.remove('show');

  // 玩家重置
  var p = this.player;
  var spawns = this.map.spawns[p.team];
  p.reset(spawns[Math.floor(Math.random() * spawns.length)]);
  p.haveBomb = p.team === 'T';
  this.carrier = p.team === 'T' ? p : null;

  // 机器人重置
  this.bots.forEach(function (b) {
    b.haveBomb = false;
    var s = this.map.spawns[b.team];
    b.reset(s[Math.floor(Math.random() * s.length)]);
  }, this);

  if (!this.carrier) {
    var tBots = this.bots.filter(function (b) { return b.team === 'T' && b.alive; });
    if (tBots.length) {
      var c = tBots[Math.floor(Math.random() * tBots.length)];
      c.haveBomb = true;
      this.carrier = c;
    }
  }

  this.setBanner('第 ' + this.round + ' 回合', '购买阶段', true);
  this.buyOpenDelay = 0.6;
  AudioSys.roundStart();
};

Game.prototype.update = function (dt) {
  var p = this.player;
  if (this.phase === 'ended') {
    this.endT -= dt;
    if (this.endT <= 0) this.beginRound();
    return;
  }

  // 阶段计时
  if (this.phase === 'freeze') {
    this.phaseT -= dt;
    if (this.phaseT <= 0) {
      this.phase = 'buy';
      this.phaseT = 15;
    }
  } else if (this.phase === 'buy') {
    this.phaseT -= dt;
    if (this.phaseT <= 0) this.startActive();
  } else if (this.phase === 'active') {
    if (!(this.bomb && this.bomb.planted)) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endRound('timeout');
        return;
      }
    }
  }

  // 自动打开购买菜单
  if (this.buyOpenDelay > 0) {
    this.buyOpenDelay -= dt;
    if (this.buyOpenDelay <= 0 && p.alive && this.phase === 'freeze') this.openBuy();
  }

  // 玩家下包 / 拆包
  var nearSite = p.alive && this.phase === 'active'
    ? Math.hypot(p.pos.x - this.map.site.x, p.pos.z - this.map.site.z) < this.map.site.r
    : false;
  var nearBomb = p.alive && this.phase === 'active' && this.bomb && this.bomb.planted
    ? Math.hypot(p.pos.x - this.bomb.mesh.position.x, p.pos.z - this.bomb.mesh.position.z) < 2.0
    : false;
  if (p.alive && this.phase === 'active') {
    if (p.team === 'T' && p.haveBomb && !this.bomb && nearSite && CS.input.use) {
      this.planting += dt;
      this.showProgress('正在安装炸弹…', this.planting / 3);
      if (this.planting >= 3) {
        this.planting = 0;
        this.plantBomb(p);
      }
    } else if (p.team === 'CT' && this.bomb && this.bomb.planted) {
      if (nearBomb && CS.input.use) {
        var need = p.haveKit ? 5 : 10;
        this.defusing += dt;
        this.showProgress('正在拆弹…', this.defusing / need);
        if (this.defusing >= need) {
          this.defusing = 0;
          this.defuseBomb(p);
        }
      } else {
        this.defusing = 0;
      }
    } else {
      this.planting = 0;
      this.defusing = 0;
    }
  } else {
    this.planting = 0;
    this.defusing = 0;
  }
  if (!(p.alive && this.phase === 'active' && CS.input.use && (
    (p.team === 'T' && p.haveBomb && !this.bomb && nearSite) ||
    (p.team === 'CT' && this.bomb && this.bomb.planted && nearBomb)
  ))) {
    if (this.planting <= 0 && this.defusing <= 0) this.hideProgress();
  }

  // 炸弹计时
  if (this.bomb && this.bomb.planted) {
    this.bomb.timer -= dt;
    this.beepT -= dt;
    var interval = Math.max(0.14, this.bomb.timer / 45 * 1.0);
    if (this.beepT <= 0) {
      this.beepT = interval;
      AudioSys.beep(this.bomb.timer < 10);
      this.bomb.blink(Math.random() < 0.5);
    }
    if (this.bomb.timer <= 0) {
      this.bomb.timer = 0;
      this.explode();
    }
  }

  // 炸弹转移
  if (this.carrierTransferT > 0) {
    this.carrierTransferT -= dt;
    if (this.carrierTransferT <= 0 && !this.bomb) {
      var tAlive = this.bots.filter(function (b) { return b.team === 'T' && b.alive; });
      var cands = [p].concat(tAlive).filter(function (e) { return e.alive && e.team === 'T'; });
      if (cands.length) {
        var nc = cands[Math.floor(Math.random() * cands.length)];
        cands.forEach(function (e) { e.haveBomb = false; });
        nc.haveBomb = true;
        this.carrier = nc;
        this.setBanner('炸弹已转移', nc.name + ' 携带着炸弹');
      }
    }
  }

  this.minimapT -= dt;
  if (this.minimapT <= 0) { this.minimapT = 0.1; this.drawMinimap(); }
};

Game.prototype.startActive = function () {
  this.phase = 'active';
  this.phaseT = 0;
  this.setBanner('回合开始', '', true);
  AudioSys.roundStart();
  if (this.buyOpen) this.closeBuy();
};

Game.prototype.plantBomb = function (by) {
  var p = this.player;
  var s = this.map.site;
  this.bomb = {
    timer: 45,
    planted: true,
    by: by,
    mesh: this.bombMesh,
    blink: function (on) { this.mesh.visible = on; }
  };
  this.bombMesh.position.set(s.x, 0.15, s.z);
  this.bombMesh.visible = true;
  this.bombLight.intensity = 2;
  this.carrier = null;
  var carrierName = by === p ? '你' : by.name;
  this.setBanner('炸弹已安装', carrierName + ' 安装了炸弹，45 秒后爆炸！');
  AudioSys.plant();
  if (by === p) this.giveMoney(p, 300);
};

Game.prototype.defuseBomb = function (by) {
  this.hideBombMesh();
  this.bomb = null;
  this.defusing = 0;
  var p = this.player;
  this.endRound('defused');
  AudioSys.defused();
  if (by === p) this.giveMoney(p, 300);
};

Game.prototype.explode = function () {
  var s = this.map.site;
  this.hideBombMesh();
  if (this.explodeFx) this.explodeFx(s.x, s.z);
  AudioSys.explosion();
  this.endRound('bomb');
  var p = this.player;
  var ents = [p].concat(this.bots).filter(function (e) { return e.alive; });
  ents.forEach(function (e) {
    var d = Math.hypot(e.pos.x - s.x, e.pos.z - s.z);
    if (d < 9) {
      var dmg = Math.round(150 * (1 - d / 9) * (0.8 + Math.random() * 0.4));
      if (e === p) p.takeDamage(dmg, null, 'body');
      else e.takeDamage(dmg, null, 'body');
    }
  });
};

Game.prototype.onDeath = function (victim, attacker, part) {
  var p = this.player;
  var head = part === 'head';

  if (victim === p) {
    this.el.deathOverlay.classList.add('show');
    this.el.deathText.textContent = '你阵亡了' + (attacker ? '（被 ' + attacker.name + ' 击杀）' : '');
    AudioSys.death();
  }

  // 击杀奖励
  if (attacker && attacker !== victim) {
    attacker.kills++;
    attacker.score++;
    this.giveMoney(attacker, 300 + (head ? 50 : 0));
    if (attacker === p) {
      AudioSys.kill();
      if (head) AudioSys.headshot();
      this.showHitmarker(true);
    }
  }
  victim.deaths++;

  // 击杀播报
  var kName = attacker ? attacker.name : '炸弹';
  var kTeam = attacker ? (attacker.team === 'T' ? 't' : 'ct') : 't';
  var vName = victim.name;
  var vTeam = victim.team === 'T' ? 't' : 'ct';
  this.addKillfeed(kName + (attacker ? ' [' + this.weaponLabel(attacker) + ']' : '') + ' 击杀 ' + vName + (head ? ' <b class="hs">爆头!</b>' : ''), kTeam, vTeam);

  // 炸弹转移
  if (victim === this.carrier && !this.bomb) {
    this.carrierTransferT = 3;
    this.setBanner('炸弹掉落', '即将转移给其他 T 队员');
  }

  this.checkWin();
};

Game.prototype.weaponLabel = function (ent) {
  if (ent === this.player) return this.player.weaponsDef[this.player.slot].name;
  return ent.defs[ent.weapon].name;
};

Game.prototype.checkWin = function () {
  if (this.phase === 'ended') return;
  var tAlive = 0, ctAlive = 0;
  if (this.player.alive) this.player.team === 'T' ? tAlive++ : ctAlive++;
  this.bots.forEach(function (b) { if (b.alive) b.team === 'T' ? tAlive++ : ctAlive++; });
  if (tAlive <= 0) this.endRound('elim_t');
  else if (ctAlive <= 0) this.endRound('elim_ct');
};

Game.prototype.endRound = function (reason) {
  if (this.phase === 'ended') return;
  this.phase = 'ended';
  this.endT = 5;
  this.roundWonBy = (reason === 'elim_t' || reason === 'defused' || reason === 'timeout') ? 'CT' : 'T';
  var tWin = this.roundWonBy === 'T';
  var text = '', sub = '';
  if (reason === 'elim_t') { text = 'CT 胜利'; sub = '所有 T 队员阵亡'; }
  else if (reason === 'elim_ct') { text = 'T 胜利'; sub = '所有 CT 队员阵亡'; }
  else if (reason === 'bomb') { text = 'T 胜利'; sub = '炸弹爆炸了！'; }
  else if (reason === 'defused') { text = 'CT 胜利'; sub = '炸弹被成功拆除'; }
  else if (reason === 'timeout') { text = 'CT 胜利'; sub = '时间到，炸弹未被安装'; }
  this.setBanner(text, sub, true);
  if (tWin) this.tScore++; else this.ctScore++;
  this.hideProgress();
  if (this.buyOpen) this.closeBuy();

  var p = this.player;
  var ents = [p].concat(this.bots);
  ents.forEach(function (e) {
    if (e.alive && e.team === this.roundWonBy) this.giveMoney(e, 3000);
    else if (e.alive) this.giveMoney(e, 1500);
  }, this);
  if (tWin) AudioSys.win(); else AudioSys.lose();
};

Game.prototype.giveMoney = function (ent, amt) {
  if (!ent || !('money' in ent)) return;
  ent.money = Math.min(16000, ent.money + amt);
};

// ---------- 购买 ----------
Game.prototype.openBuy = function () {
  if (!this.player.alive) return;
  this.buyOpen = true;
  this.el.buyMenu.classList.add('show');
  this.buildBuyList();
  if (CS.unlockForMenu) CS.unlockForMenu();
};
Game.prototype.closeBuy = function () {
  this.buyOpen = false;
  this.el.buyMenu.classList.remove('show');
  if (CS.relockForGame) CS.relockForGame();
};
Game.prototype.toggleBuy = function () {
  if (this.buyOpen) this.closeBuy();
  else this.openBuy();
};
Game.prototype.canBuyNow = function () {
  var okPhase = this.phase === 'freeze' || this.phase === 'buy';
  return this.player.alive && okPhase && this.player.inBuyZone();
};
Game.prototype.buildBuyList = function () {
  var p = this.player;
  this.el.buyMoney.textContent = '$' + p.money;
  var self = this;
  this.el.buyList.innerHTML = '';
  this.SHOP.forEach(function (item) {
    var div = document.createElement('div');
    div.className = 'buyItem';
    var off = false;
    var reason = '';
    if (item.team !== 'both' && item.team !== p.team) { off = true; reason = '仅 ' + (item.team === 'T' ? 'T' : 'CT') + ' 可用'; }
    if (!off && item.id === 'p9' && p.weapons.p9) { off = true; reason = '已拥有'; }
    if (!off && (item.id === 'ak' || item.id === 'm4' || item.id === 'awp') && p.weapons[item.id]) { off = true; reason = '已拥有'; }
    if (!off && item.id === 'armor' && p.armor >= 100) { off = true; reason = '已满'; }
    if (!off && item.id === 'helmet' && p.helmet) { off = true; reason = '已拥有'; }
    if (!off && item.id === 'kit' && p.haveKit) { off = true; reason = '已拥有'; }
    if (!off && item.need === 'armor' && p.armor <= 0) { off = true; reason = '需先购买防弹衣'; }
    if (!off && p.money < item.price) { off = true; reason = '资金不足'; }
    if (!off && !self.canBuyNow()) { off = true; reason = self.player.inBuyZone() ? '只能在购买阶段购买' : '需回到出生点购买区'; }
    div.className = 'buyItem' + (off ? ' off' : '');
    div.innerHTML = '<div><div class="bi-name">' + item.name + '</div><div class="bi-desc">' + (reason || item.desc) + '</div></div><div class="bi-price">$' + item.price + '</div>';
    if (!off) div.onclick = function () { self.buyItem(item.id); };
    self.el.buyList.appendChild(div);
  });
};
Game.prototype.buyItem = function (id) {
  var p = this.player;
  var item = this.SHOP.filter(function (s) { return s.id === id; })[0];
  if (!item || !this.canBuyNow()) { AudioSys.denied(); return; }
  if (item.team !== 'both' && item.team !== p.team) { AudioSys.denied(); return; }
  if (p.money < item.price) { AudioSys.denied(); return; }
  if (id === 'p9' || id === 'ak' || id === 'm4' || id === 'awp') {
    if (p.weapons[id]) { AudioSys.denied(); return; }
    p.weapons[id] = true;
    p.money -= item.price;
    AudioSys.buy();
  } else if (id === 'armor') {
    if (p.armor >= 100) { AudioSys.denied(); return; }
    p.armor = 100;
    p.money -= item.price;
    AudioSys.buy();
  } else if (id === 'helmet') {
    if (p.helmet || p.armor <= 0) { AudioSys.denied(); return; }
    p.helmet = true;
    p.money -= item.price;
    AudioSys.buy();
  } else if (id === 'kit') {
    if (p.haveKit) { AudioSys.denied(); return; }
    p.haveKit = true;
    p.money -= item.price;
    AudioSys.buy();
  }
  this.buildBuyList();
};

// ---------- HUD ----------
Game.prototype.setBanner = function (text, sub, persist) {
  this.el.banner.textContent = text;
  this.el.bannerSub.textContent = sub || '';
  this.bannerPersist = !!persist;
  this.bannerT = persist ? 0 : 3.5;
};
Game.prototype.showHitmarker = function (kill) {
  var hm = this.el.hitmarker;
  hm.classList.add('show');
  if (kill) hm.classList.add('kill'); else hm.classList.remove('kill');
  clearTimeout(this._hmT);
  this._hmT = setTimeout(function () { hm.classList.remove('show'); }, 140);
};
Game.prototype.showProgress = function (text, frac) {
  this.el.progressWrap.classList.remove('hidden');
  this.el.progressText.textContent = text;
  this.el.progressFill.style.width = Math.round(frac * 100) + '%';
};
Game.prototype.hideProgress = function () {
  this.el.progressWrap.classList.add('hidden');
};
Game.prototype.addKillfeed = function (html, kTeam, vTeam) {
  var div = document.createElement('div');
  div.className = 'kf';
  div.innerHTML = '<span class="' + kTeam + '">' + html.split(' 击杀 ')[0] + '</span> 击杀 <span class="' + vTeam + '">' + html.split(' 击杀 ')[1].split(' <b')[0] + '</span>' + (html.indexOf('爆头') >= 0 ? ' <b class="hs">爆头!</b>' : '');
  div.dataset.t = String(Date.now());
  this.el.killfeed.appendChild(div);
  while (this.el.killfeed.children.length > 5) this.el.killfeed.removeChild(this.el.killfeed.firstChild);
};

Game.prototype.updateHUD = function () {
  var p = this.player;
  this.el.roundText.textContent = this.phase === 'ended' ? '回合结束' : '第 ' + this.round + ' 回合';
  if (this.phase === 'freeze') this.el.timerText.textContent = '冻结 ' + Math.ceil(this.phaseT) + 's';
  else if (this.phase === 'buy') this.el.timerText.textContent = '购买 ' + Math.ceil(this.phaseT) + 's';
  else if (this.phase === 'active') this.el.timerText.textContent = Math.ceil(this.timeLeft) + 's';
  else this.el.timerText.textContent = '--';
  this.el.scoreText.textContent = 'T ' + this.tScore + ' : ' + this.ctScore + ' CT';
  if (this.bomb && this.bomb.planted) {
    this.el.bombTimerText.classList.remove('hidden');
    this.el.bombTimerText.textContent = '炸弹 ' + this.bomb.timer.toFixed(1) + 's';
  } else this.el.bombTimerText.classList.add('hidden');
  this.el.moneyText.textContent = '$' + p.money;
  var w = p.weaponsDef[p.slot];
  this.el.weaponText.textContent = w.name + (this.phase === 'active' && w.scope && p.scoped ? '（开镜）' : '');
  if (w.mag > 0) {
    var a = p.ammo[p.slot];
    this.el.ammoText.textContent = a.mag + ' / ' + a.res + (p.reloadT > 0 ? ' 换弹中' : '');
  } else this.el.ammoText.textContent = '';
  this.el.hpFill.style.width = p.hp + '%';
  this.el.hpText.textContent = p.hp;
  this.el.armorFill.style.width = p.armor + '%';
  this.el.armorText.textContent = p.armor > 0 ? p.armor : '';
  this.el.dmg.style.opacity = p.alive ? p.damageFlash * 0.8 : 0;

  // 提示
  var hint = '';
  if (!p.alive) hint = '你已阵亡，观战中…';
  else if (this.phase === 'freeze') hint = '购买阶段：按 B 打开购买菜单';
  else if (this.phase === 'buy') hint = p.inBuyZone() ? '购买阶段：按 B 购买装备' : '回到出生点购买区购买装备';
  else if (this.phase === 'active') {
    if (p.team === 'T') {
      if (this.bomb && this.bomb.planted) hint = '炸弹已安装，守住炸弹！';
      else hint = p.haveBomb ? '携带炸弹前往 A 区，按住 E 安装' : '前往 A 区';
    } else {
      if (this.bomb && this.bomb.planted) hint = p.haveKit ? '炸弹已安装！按住 E 拆弹（拆弹钳加速）' : '炸弹已安装！按住 E 拆弹';
      else hint = '前往 A 区防守';
    }
  }
  this.el.hint.textContent = hint;

  // 准星扩散
  var sp = 2;
  var wd = p.weaponsDef[p.slot];
  if (this.phase === 'active' && p.alive) {
    var moving = Math.abs(p.vel.x) + Math.abs(p.vel.z) > 1.2;
    var s = wd.spreadBase + (moving ? wd.spreadMove : 0) + p.spray * (wd.auto ? 0.02 : 0.004);
    if (p.crouch > 0.4) s *= 0.55;
    sp = 2 + Math.min(26, s * 520);
  }
  this.el.crosshair.style.transform = 'translate(-50%,-50%) scale(' + (sp / 2) + ')';

  // 击杀信息过期
  var now = Date.now();
  Array.prototype.slice.call(this.el.killfeed.children).forEach(function (c) {
    if (now - Number(c.dataset.t) > 6000) c.remove();
  });
};

Game.prototype.toggleScoreboard = function (show) {
  this.sbOpen = show;
  if (show) this.buildScoreboard();
  this.el.scoreboard.classList.toggle('show', show);
};
Game.prototype.buildScoreboard = function () {
  var p = this.player;
  this.el.sbTitle.textContent = 'T ' + this.tScore + ' : ' + this.ctScore + ' CT';
  var rows = '<tr><th>队伍</th><th>玩家</th><th>击杀</th><th>死亡</th><th>得分</th><th>资金</th></tr>';
  var self = this;
  [['T', 't'], ['CT', 'ct']].forEach(function (pair) {
    var ents = [p].concat(self.bots).filter(function (e) { return e.team === pair[0]; })
      .sort(function (a, b) { return b.score - a.score; });
    ents.forEach(function (e) {
      rows += '<tr class="' + (e === p ? 'me' : '') + '"><td class="' + pair[1] + '">' + pair[0] + '</td><td>' + e.name + (e === p ? '（你）' : '') + (e.haveBomb && e.team === 'T' ? ' 💣' : '') + '</td><td>' + e.kills + '</td><td>' + e.deaths + '</td><td>' + e.score + '</td><td>$' + e.money + '</td></tr>';
    });
  });
  this.el.sbTable.innerHTML = rows;
};

// ---------- 炸弹实体 ----------
Game.prototype.buildBombMesh = function () {
  var T = this.THREE;
  var group = new T.Group();
  var body = new T.Mesh(new T.BoxGeometry(0.34, 0.18, 0.34), new T.MeshLambertMaterial({ color: 0x2b2e33 }));
  var strip = new T.Mesh(new T.BoxGeometry(0.36, 0.05, 0.05), new T.MeshBasicMaterial({ color: 0xff3322 }));
  strip.position.z = 0.18;
  strip.position.y = 0.03;
  group.add(body, strip);
  var sprite = new T.Sprite(new T.SpriteMaterial({
    map: new T.CanvasTexture(Textures.build(T).bombBlink),
    transparent: true, depthWrite: false
  }));
  sprite.scale.set(1.6, 1.6, 1);
  sprite.position.y = 1.0;
  group.add(sprite);
  this.bombLight = new T.PointLight(0xff3322, 0, 14);
  this.bombLight.position.y = 1.2;
  group.add(this.bombLight);
  group.visible = false;
  this.scene.add(group);
  this.bombMesh = group;
};
Game.prototype.hideBombMesh = function () {
  if (this.bombMesh) this.bombMesh.visible = false;
  if (this.bombLight) this.bombLight.intensity = 0;
};

// ---------- 小地图 ----------
Game.prototype.drawMinimap = function () {
  var cv = this.el.minimap;
  var g = cv.getContext('2d');
  var W = this.map.W, H = this.map.H;
  var s = cv.width / W;
  g.clearRect(0, 0, cv.width, cv.height);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, cv.width, cv.height);
  for (var r = 0; r < H; r++)
    for (var c = 0; c < W; c++) {
      var ch = this.map.grid[r][c];
      if (ch === '#') g.fillStyle = 'rgba(140,135,120,0.9)';
      else if (ch === '=') g.fillStyle = 'rgba(190,150,90,0.9)';
      else continue;
      g.fillRect(c * s, r * s, s, s);
    }
  // A 区
  var site = this.map.site;
  var sx = (this.map.worldToCell(site.x, site.z).c + 0.5) * s;
  var sy = (this.map.worldToCell(site.x, site.z).r + 0.5) * s;
  g.fillStyle = 'rgba(255,80,60,0.55)';
  g.beginPath(); g.arc(sx, sy, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
  g.fillText('A', sx, sy + 4);
  // 实体
  var p = this.player;
  var draw = function (x, z, color, size) {
    var cell = this.map.worldToCell(x, z);
    g.fillStyle = color;
    g.beginPath(); g.arc((cell.c + 0.5) * s, (cell.r + 0.5) * s, size, 0, Math.PI * 2); g.fill();
  }.bind(this);
  this.bots.forEach(function (b) {
    if (b.alive) draw(b.pos.x, b.pos.z, b.team === 'T' ? '#ff8a5c' : '#6cc9ff', 3);
  });
  if (p.alive) draw(p.pos.x, p.pos.z, p.team === 'T' ? '#ffd166' : '#aee4ff', 4);
  if (this.bomb && this.bomb.planted) {
    var bc = this.map.worldToCell(this.bomb.mesh.position.x, this.bomb.mesh.position.z);
    g.fillStyle = '#ff3b30';
    g.fillRect((bc.c + 0.5) * s - 3, (bc.r + 0.5) * s - 3, 6, 6);
  }
  if (this.carrier && this.carrier.alive) {
    var cc = this.map.worldToCell(this.carrier.pos.x, this.carrier.pos.z);
    g.fillStyle = '#ff9f43';
    g.beginPath(); g.arc((cc.c + 0.5) * s, (cc.r + 0.5) * s, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#333'; g.font = '10px sans-serif';
    g.fillText('B', (cc.c + 0.5) * s, (cc.r + 0.5) * s + 3);
  }
};
