// 机器人：寻路、索敌、射击、下包/拆包
window.Bot = function (opts) {
  var THREE = opts.THREE;
  this.THREE = THREE;
  this.map = opts.map;
  this.game = opts.game;
  this.team = opts.team;
  this.name = opts.name;
  this.defs = Weapons.DEFS;

  this.pos = { x: 0, y: 0, z: 0 };
  this.yaw = 0;
  this.hp = 100;
  this.armor = 0;
  this.helmet = false;
  this.alive = true;
  this.money = 800;
  this.kills = 0;
  this.deaths = 0;
  this.score = 0;
  this.weapon = 'p9';
  this.haveKit = this.team === 'CT';
  this.haveBomb = false;

  this.state = 'idle';
  this.target = null;
  this.path = [];
  this.pi = 0;
  this.thinkT = 0;
  this.fireCd = 0;
  this.burst = 0;
  this.burstPause = 0;
  this.strafe = 1;
  this.strafeT = 0;
  this.plantT = 0;
  this.defuseT = 0;
  this.stuckT = 0;
  this.lastPos = { x: 0, z: 0 };
  this.reactT = 0;
  this.crouchT = 0;
  this.deadT = 0;

  var bodyMat = new THREE.MeshLambertMaterial({ color: this.team === 'T' ? 0xb5471f : 0x2f6fb5 });
  var pantsMat = new THREE.MeshLambertMaterial({ color: 0x3d3f45 });
  var skinMat = new THREE.MeshLambertMaterial({ color: 0xd9a06a });
  var helmetMat = new THREE.MeshLambertMaterial({ color: 0x24262b });
  this.group = new THREE.Group();
  this.bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), bodyMat);
  this.bodyMesh.position.y = 0.95;
  this.bodyMesh.userData = { bot: this, part: 'body' };
  this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), skinMat);
  this.headMesh.position.y = 1.62;
  this.headMesh.userData = { bot: this, part: 'head' };
  this.helmetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.28), helmetMat);
  this.helmetMesh.position.y = 1.76;
  this.gunMesh = Weapons.makeBotGun(THREE, this.weapon);
  this.gunMesh.position.set(0.24, 1.02, 0.12);
  this.group.add(this.bodyMesh, this.headMesh, this.helmetMesh, this.gunMesh);
  this.group.castShadow = true;
  opts.scene.add(this.group);
};

Bot.prototype.reset = function (spawn, round) {
  this.pos.x = spawn.x + (Math.random() - 0.5) * 1.4;
  this.pos.z = spawn.z + (Math.random() - 0.5) * 1.4;
  this.pos.y = 0;
  this.yaw = Math.atan2(this.map.site.x - this.pos.x, this.map.site.z - this.pos.z);
  this.hp = 100;
  this.alive = true;
  this.state = 'idle';
  this.target = null;
  this.path = [];
  this.pi = 0;
  this.fireCd = 0;
  this.burst = 0;
  this.burstPause = 0;
  this.plantT = 0;
  this.defuseT = 0;
  this.deadT = 0;
  this.reactT = 0;
  this.crouchT = 0;
  this.group.visible = true;
  this.group.rotation.set(0, 0, 0);
  this.group.position.set(this.pos.x, 0, this.pos.z);
  this.weapon = 'p9';
  this.group.remove(this.gunMesh);
  this.gunMesh = Weapons.makeBotGun(this.THREE, this.weapon);
  this.gunMesh.position.set(0.24, 1.02, 0.12);
  this.group.add(this.gunMesh);
  this.buy();
};

Bot.prototype.buy = function () {
  var m = this.money;
  var def = this.team === 'T' ? 'ak' : 'm4';
  if (m >= 2700) {
    this.weapon = def;
    this.money -= 2700;
    if (m >= 3350) { this.armor = 100; this.money -= 650; }
    if (m >= 3700) { this.helmet = true; this.money -= 350; }
  } else {
    this.weapon = 'p9';
    if (m >= 650) { this.armor = 100; this.money -= 650; }
  }
  if (this.group) {
    this.group.remove(this.gunMesh);
    this.gunMesh = Weapons.makeBotGun(this.THREE, this.weapon);
    this.gunMesh.position.set(0.24, 1.02, 0.12);
    this.group.add(this.gunMesh);
  }
};

Bot.prototype.speed = function () {
  var base = this.defs[this.weapon].moveScale * 5.8;
  return base * (this.crouchT > 0 ? 0.6 : 1);
};

Bot.prototype.update = function (dt) {
  if (!this.alive) {
    this.deadT += dt;
    if (this.deadT > 1.2 && this.group.rotation.x < Math.PI / 2) {
      this.group.rotation.x = Math.min(Math.PI / 2, this.group.rotation.x + dt * 4);
    }
    if (this.deadT > 6) this.group.visible = false;
    return;
  }
  var game = this.game;
  if (!game || game.phase === 'ended') { this.state = 'idle'; this.updateMesh(dt); return; }
  if (game.phase === 'freeze') { this.updateMesh(dt); return; }

  this.fireCd -= dt;
  this.burstPause -= dt;
  this.thinkT -= dt;
  this.reactT -= dt;
  this.crouchT = Math.max(0, this.crouchT - dt);
  this.plantT = Math.max(0, this.plantT - dt);
  this.defuseT = Math.max(0, this.defuseT - dt);

  if (this.thinkT <= 0) {
    this.thinkT = 0.35 + Math.random() * 0.25;
    this.think();
  }

  var wantPlant = this.haveBomb && !(game.bomb && game.bomb.planted) && this.nearSite();
  var wantDefuse = this.team === 'CT' && game.bomb && game.bomb.planted && this.nearBomb();

  if (this.state === 'plant' && (!wantPlant || game.phase !== 'active')) this.state = 'move';
  if (this.state === 'defuse' && (!wantDefuse || game.phase !== 'active')) this.state = 'move';
  if (this.state === 'move') {
    if (wantPlant && game.phase === 'active') { this.state = 'plant'; this.plantT = 3; }
    else if (wantDefuse && game.phase === 'active') { this.state = 'defuse'; this.defuseT = this.haveKit ? 5 : 10; }
  }

  var move = { x: 0, z: 0 };
  if (this.state !== 'plant' && this.state !== 'defuse') {
    this.state = 'move';
    var target = this.getMoveTarget();
    if (this.target && this.target.obj.alive && this.hasLOS(this.targetPos())) {
      // 战斗：接近 + 横向走位
      var dist = this.distTo(this.targetPos());
      var toT = this.vectorTo(this.targetPos());
      if (dist > 22) move = toT;
      else if (dist < 7) move = { x: -toT.x, z: -toT.z };
      else move = { x: toT.z * this.strafe, z: -toT.x * this.strafe };
    } else if (target) {
      var wp = this.nextWaypoint();
      if (wp) {
        var dx = wp.x - this.pos.x, dz = wp.z - this.pos.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < 1.0) { this.pi++; }
        else { move = { x: dx / d, z: dz / d }; }
      }
    }
  }

  // 卡住检测
  var moved = Math.abs(this.pos.x - this.lastPos.x) + Math.abs(this.pos.z - this.lastPos.z);
  if (moved < 0.15 * dt * this.speed() && (move.x || move.z)) {
    this.stuckT += dt;
    if (this.stuckT > 0.8) { this.path = []; this.pi = 0; this.stuckT = 0; this.thinkT = 0; }
  } else this.stuckT = 0;
  this.lastPos.x = this.pos.x; this.lastPos.z = this.pos.z;

  var sp = this.speed();
  var vx = move.x * sp, vz = move.z * sp;
  var nx = this.pos.x + vx * dt;
  if (!this.collides(nx, this.pos.z)) this.pos.x = nx;
  var nz = this.pos.z + vz * dt;
  if (!this.collides(this.pos.x, nz)) this.pos.z = nz;

  if (move.x || move.z) this.yaw = Math.atan2(-move.x, -move.z) + Math.PI;
  if (this.target && this.target.obj.alive) {
    var t = this.targetPos();
    this.yaw = Math.atan2(t.x - this.pos.x, t.z - this.pos.z);
  }

  // 下包 / 拆包进度
  if (this.state === 'plant') {
    this.plantT = Math.max(0, this.plantT - dt);
    if (this.plantT <= 0 && game.phase === 'active') { game.plantBomb(this); }
  }
  if (this.state === 'defuse') {
    this.defuseT = Math.max(0, this.defuseT - dt);
    if (this.defuseT <= 0 && game.bomb && game.bomb.planted) { game.defuseBomb(this); }
  }

  // 射击
  this.tryShoot(dt);
  this.updateMesh(dt);
};

Bot.prototype.updateMesh = function (dt) {
  this.group.position.set(this.pos.x, 0, this.pos.z);
  this.group.rotation.y = this.yaw;
  if (this.crouchT > 0) this.group.position.y = -0.55;
};

Bot.prototype.think = function () {
  var game = this.game;
  if (!game) return;
  // 索敌
  this.target = null;
  var best = 1e9;
  var self = this;
  var candidates = [];
  var player = game.player;
  if (player && player.alive && player.team !== this.team) candidates.push({ x: player.pos.x, y: player.pos.y, z: player.pos.z, obj: player, head: true });
  game.bots.forEach(function (b) {
    if (b !== self && b.alive && b.team !== self.team) candidates.push({ x: b.pos.x, y: b.pos.y + 1.3, z: b.pos.z, obj: b, head: false });
  });
  candidates.forEach(function (c) {
    var d = Math.sqrt((c.x - self.pos.x) ** 2 + (c.z - self.pos.z) ** 2);
    if (d < best && d < 70 && self.hasLOS(c)) { best = d; self.target = c; }
  });
  if (this.target) this.reactT = 0.25 + Math.random() * 0.4;
  // 走位
  if (this.strafeT <= 0) { this.strafeT = 0.7 + Math.random() * 1.1; this.strafe = Math.random() < 0.5 ? 1 : -1; }
};

Bot.prototype.getMoveTarget = function () {
  var game = this.game;
  if (!game) return null;
  if (this.team === 'T') {
    if (!(game.bomb && game.bomb.planted)) return { x: this.map.site.x, z: this.map.site.z };
    return { x: this.map.site.x, z: this.map.site.z };
  }
  if (game.bomb && game.bomb.planted) {
    var bp = game.bomb.mesh ? game.bomb.mesh.position : null;
    if (bp) return { x: bp.x, z: bp.z };
  }
  return { x: this.map.site.x, z: this.map.site.z };
};

Bot.prototype.nearSite = function () {
  var s = this.map.site;
  var dx = this.pos.x - s.x, dz = this.pos.z - s.z;
  return dx * dx + dz * dz < s.r * s.r;
};
Bot.prototype.nearBomb = function () {
  var b = this.game.bomb;
  if (!b || !b.mesh) return false;
  var dx = this.pos.x - b.mesh.position.x, dz = this.pos.z - b.mesh.position.z;
  return dx * dx + dz * dz < 4;
};

Bot.prototype.nextWaypoint = function () {
  if (this.pi >= this.path.length) {
    var t = this.getMoveTarget();
    if (!t) return null;
    var cur = this.map.worldToCell(this.pos.x, this.pos.z);
    var tar = this.map.worldToCell(t.x, t.z);
    this.path = this.map.aStar(cur.c, cur.r, tar.c, tar.r);
    this.pi = 0;
  }
  return this.path[this.pi] || null;
};

Bot.prototype.targetPos = function () {
  if (!this.target) return { x: this.map.site.x, y: 0, z: this.map.site.z };
  return this.target;
};

Bot.prototype.distTo = function (p) {
  return Math.sqrt((p.x - this.pos.x) ** 2 + (p.z - this.pos.z) ** 2);
};
Bot.prototype.vectorTo = function (p) {
  var dx = p.x - this.pos.x, dz = p.z - this.pos.z;
  var d = Math.sqrt(dx * dx + dz * dz) || 1;
  return { x: dx / d, z: dz / d };
};

Bot.prototype.hasLOS = function (p) {
  var T = this.THREE;
  if (!this._ray) this._ray = new T.Raycaster();
  var from = new T.Vector3(this.pos.x, 1.4, this.pos.z);
  var to = new T.Vector3(p.x, (p.y === undefined ? 1.0 : p.y), p.z);
  var dir = to.clone().sub(from);
  var dist = dir.length();
  dir.normalize();
  this._ray.set(from, dir);
  this._ray.far = dist + 0.1;
  var hits = this._ray.intersectObjects(this.map.colliderMeshes, false);
  return !hits.length;
};

Bot.prototype.tryShoot = function (dt) {
  if (!this.game || this.game.phase !== 'active') return;
  if (this.burstPause > 0 || !this.target || !this.target.obj.alive) return;
  var t = this.targetPos();
  var dist = this.distTo(t);
  if (this.fireCd > 0) return;
  if (this.reactT > 0) return;
  if (!this.hasLOS(t)) return;
  var w = this.defs[this.weapon];
  if (this.burst <= 0) {
    this.burst = this.weapon === 'p9' ? 2 : 3 + Math.floor(Math.random() * 4);
    this.burstPause = 0.35 + Math.random() * 0.8;
  }
  this.burst--;
  this.fireCd = w.rate * (0.9 + Math.random() * 0.3);
  // 命中判定
  var err = (0.055 + dist * 0.0042) * (this.crouchT > 0 ? 0.65 : 1);
  if (Math.random() < 0.55) {
    var head = Math.random() < 0.22 && dist < 40;
    var dmg = w.damage;
    var part = head ? 'head' : 'body';
    if (this.target.obj === this.game.player) {
      this.game.player.takeDamage(dmg, this, part);
    } else {
      this.target.obj.takeDamage(dmg, this, part);
    }
  }
  AudioSys.shot(w.sound);
};

Bot.prototype.takeDamage = function (dmg, attacker, part) {
  if (!this.alive) return;
  var mult = part === 'head' ? (this.helmet ? 1.15 : 2.2) : 1;
  var d = dmg * mult;
  if (this.armor > 0) {
    var absorbed = Math.min(this.armor, d * 0.5);
    this.armor -= absorbed;
    d -= absorbed;
  }
  this.hp -= Math.max(1, Math.round(d));
  if (this.target && (!this.target.obj.alive || Math.random() < 0.5)) this.reactT = Math.max(this.reactT, 0.15);
  if (this.hp <= 0) this.die(attacker, part);
};

Bot.prototype.die = function (attacker, part) {
  if (!this.alive) return;
  this.alive = false;
  this.deadT = 0;
  this.target = null;
  if (this.game) this.game.onDeath(this, attacker, part);
};

Bot.prototype.collides = function (x, z) {
  var r = 0.34;
  var bs = this.map.colliders;
  for (var i = 0; i < bs.length; i++) {
    var b = bs[i];
    if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
  }
  return false;
};

Bot.prototype.plantSetup = function (plantTime) {
  this.state = 'plant';
  this.plantT = plantTime;
};
Bot.prototype.defuseSetup = function (defuseTime) {
  this.state = 'defuse';
  this.defuseT = defuseTime;
};
