// 人类玩家：输入、物理、射击、后座、换弹、开镜
window.Player = function (opts) {
  this.map = opts.map;
  this.game = opts.game;
  this.team = opts.team;
  this.isHuman = !!opts.isHuman;
  this.name = opts.name || '玩家';
  this.weaponsDef = Weapons.DEFS;

  this.pos = { x: 0, y: 1.62, z: 0 };
  this.vel = { x: 0, y: 0, z: 0 };
  this.yaw = Math.PI;
  this.pitch = 0;
  this.recoilP = 0;
  this.recoilY = 0;
  this.hp = 100;
  this.armor = 0;
  this.helmet = false;
  this.alive = true;
  this.money = 800;
  this.kills = 0;
  this.deaths = 0;
  this.score = 0;
  this.haveKit = false;
  this.haveBomb = opts.team === 'T';

  this.weapons = { knife: true, p9: true };
  this.slot = 'p9';
  this.ammo = {};
  var self = this;
  Object.keys(this.weaponsDef).forEach(function (k) {
    var a = Weapons.ammoOf(k);
    self.ammo[k] = { mag: a.mag, res: a.res };
  });

  this.crouch = 0;
  this.onGround = true;
  this.fireCd = 0;
  this.reloadT = 0;
  this.spray = 0;
  this.scoped = false;
  this.damageFlash = 0;
  this.hitmarkerT = 0;
  this.footT = 0;
  this.bobT = 0;
  this.bobAmt = 0;
  this.radius = 0.36;
  this.viewmodels = {};
  this.currentVm = null;
};

Player.prototype.buildViewmodels = function (THREE, camera) {
  var self = this;
  this.vmRoot = new THREE.Group();
  this.vmRoot.visible = false;
  camera.add(this.vmRoot);
  Weapons.SLOTS.forEach(function (k) {
    var g = Weapons.buildViewModel(THREE, k);
    g.visible = false;
    self.vmRoot.add(g);
    self.viewmodels[k] = g;
  });
  this.selectSlot(1, true);
  this.vmRoot.visible = true;
};

Player.prototype.reset = function (spawn) {
  this.pos.x = spawn.x + (Math.random() - 0.5) * 1.2;
  this.pos.z = spawn.z + (Math.random() - 0.5) * 1.2;
  this.pos.y = this.crouch > 0.5 ? 1.05 : 1.62;
  this.vel = { x: 0, y: 0, z: 0 };
  this.pitch = 0;
  this.recoilP = 0; this.recoilY = 0;
  this.spray = 0; this.scoped = false;
  this.fireCd = 0; this.reloadT = 0;
  this.hp = 100;
  this.alive = true;
  this.yaw = Math.atan2(this.map.site.x - this.pos.x, this.map.site.z - this.pos.z) + (Math.random() - 0.5) * 0.3;
  var self = this;
  Object.keys(this.ammo).forEach(function (k) {
    var a = Weapons.ammoOf(k);
    self.ammo[k].mag = a.mag; self.ammo[k].res = a.res;
  });
};

Player.prototype.canMove = function () {
  if (!this.alive) return false;
  if (!this.game) return true;
  var ph = this.game.phase;
  return ph === 'buy' || ph === 'active';
};
Player.prototype.canShoot = function () {
  if (!this.alive) return false;
  if (!this.game) return true;
  return this.game.phase === 'active';
};
Player.prototype.inBuyZone = function () {
  if (!this.game) return false;
  var z = this.map.buyZones[this.team];
  var dx = this.pos.x - z.x, dz = this.pos.z - z.z;
  return dx * dx + dz * dz < z.r * z.r;
};

Player.prototype.eyeY = function () {
  return 1.62 + (1.05 - 1.62) * this.crouch;
};

Player.prototype.update = function (dt, camera) {
  this.fireCd -= dt;
  if (this.reloadT > 0) {
    this.reloadT -= dt;
    if (this.reloadT <= 0) this.finishReload();
  }
  this.spray = Math.max(0, this.spray - dt * 2.4);
  this.recoilP = Math.max(0, this.recoilP - dt * 7);
  this.recoilY = Math.max(0, this.recoilY - dt * 7);
  this.hitmarkerT -= dt;
  this.damageFlash = Math.max(0, this.damageFlash - dt * 1.6);

  var crouchTarget = CS.input.crouch ? 1 : 0;
  this.crouch += (crouchTarget - this.crouch) * Math.min(1, dt * 9);
  var floorEye = this.eyeY();

  var canMove = this.canMove();
  var moving = false;
  if (canMove) {
    var fwd = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    var right = { x: -fwd.z, z: fwd.x };
    var ix = 0, iz = 0;
    if (CS.input.fwd) { ix += fwd.x; iz += fwd.z; }
    if (CS.input.back) { ix -= fwd.x; iz -= fwd.z; }
    if (CS.input.left) { ix -= right.x; iz -= right.z; }
    if (CS.input.right) { ix += right.x; iz += right.z; }
    var len = Math.sqrt(ix * ix + iz * iz);
    if (len > 0.01) {
      ix /= len; iz /= len;
      var spd = CS.input.walk ? 3.1 : 6.35;
      if (this.crouch > 0.4) spd = 2.6;
      spd *= this.weaponsDef[this.slot].moveScale;
      this.vel.x += (ix * spd - this.vel.x) * Math.min(1, dt * 10);
      this.vel.z += (iz * spd - this.vel.z) * Math.min(1, dt * 10);
      moving = true;
    } else {
      this.vel.x *= Math.max(0, 1 - dt * 10);
      this.vel.z *= Math.max(0, 1 - dt * 10);
    }
    if (CS.input.jump && this.onGround) {
      this.vel.y = 5.0;
      this.onGround = false;
      AudioSys.jump();
    }
  } else {
    this.vel.x = 0; this.vel.z = 0;
  }

  // 重力
  this.vel.y -= 13 * dt;
  this.pos.y += this.vel.y * dt;
  if (this.pos.y <= floorEye) {
    this.pos.y = floorEye;
    this.vel.y = 0;
    this.onGround = true;
  }

  // 碰撞（先 X 后 Z 滑行）
  var nx = this.pos.x + this.vel.x * dt;
  if (!this.collides(nx, this.pos.z)) this.pos.x = nx;
  var nz = this.pos.z + this.vel.z * dt;
  if (!this.collides(this.pos.x, nz)) this.pos.z = nz;

  // 脚步
  if (moving && this.onGround && this.canMove()) {
    this.bobT += dt * (CS.input.walk ? 7 : 12);
    this.footT -= dt;
    if (this.footT <= 0) {
      this.footT = CS.input.walk ? 0.38 : 0.32;
      AudioSys.footstep(Math.random() < 0.5 ? 0 : 1);
    }
  }

  // 镜头
  camera.rotation.order = 'YXZ';
  camera.rotation.y = this.yaw;
  camera.rotation.x = this.pitch + this.recoilP;
  camera.rotation.z = this.recoilY * 0.12;
  camera.position.set(this.pos.x, this.pos.y, this.pos.z);
  this.updateViewmodel(dt, moving);
};

Player.prototype.collides = function (x, z) {
  var r = this.radius;
  var bs = this.map.colliders;
  for (var i = 0; i < bs.length; i++) {
    var b = bs[i];
    if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
  }
  return false;
};

Player.prototype.updateViewmodel = function (dt, moving) {
  if (!this.currentVm) return;
  var g = this.currentVm;
  var bobX = moving ? Math.sin(this.bobT * 2.1) * 0.014 : 0;
  var bobY = moving ? Math.abs(Math.cos(this.bobT * 2.1)) * 0.012 : 0;
  var y = -0.26 + bobY;
  var z = -0.5;
  var rx = 0;
  if (this.reloadT > 0) {
    var t = 1 - Math.abs(this.reloadT / this.weaponsDef[this.slot].reload - 0.5) * 2;
    y -= t * 0.16;
    rx = -t * 0.5;
  }
  g.position.x = 0.32 + bobX + this.recoilY * 0.05;
  g.position.y = y + this.recoilP * 0.02;
  g.position.z = z + this.recoilP * 0.06;
  g.rotation.x = rx;
};

Player.prototype.selectSlot = function (i, silent) {
  var keys = Weapons.SLOTS;
  if (i < 0 || i >= keys.length) return;
  this.selectSlotKey(keys[i], silent);
};

Player.prototype.selectByKey = function (n) {
  var order = this.team === 'T' ? ['knife', 'p9', 'ak', 'awp'] : ['knife', 'p9', 'm4', 'awp'];
  if (n < 1 || n > 4) return;
  this.selectSlotKey(order[n - 1]);
};

Player.prototype.selectSlotKey = function (k, silent) {
  if (!this.weapons[k]) return;
  this.slot = k;
  this.reloadT = 0;
  this.scoped = false;
  var self = this;
  Weapons.SLOTS.forEach(function (kk) {
    if (self.viewmodels[kk]) self.viewmodels[kk].visible = kk === k;
  });
  this.currentVm = this.viewmodels[k];
  if (!silent) AudioSys.dry();
};

Player.prototype.startReload = function () {
  var w = this.weaponsDef[this.slot];
  if (w.mag <= 0) return;
  var a = this.ammo[this.slot];
  if (a.mag >= w.mag || a.res <= 0 || this.reloadT > 0) return;
  this.reloadT = w.reload;
  AudioSys.reload();
};

Player.prototype.finishReload = function () {
  var w = this.weaponsDef[this.slot];
  var a = this.ammo[this.slot];
  var need = w.mag - a.mag;
  var take = Math.min(need, a.res);
  a.mag += take;
  a.res -= take;
};

Player.prototype.toggleScope = function () {
  var w = this.weaponsDef[this.slot];
  if (!w.scope) { this.scoped = false; return; }
  this.scoped = !this.scoped;
  if (this.scoped) AudioSys.dry();
};

Player.prototype.tryFire = function (THREE, raycaster, bots) {
  if (this.fireCd > 0 || this.reloadT > 0 || !this.canShoot()) return null;
  var w = this.weaponsDef[this.slot];
  if (this.slot === 'knife') {
    this.fireCd = w.rate;
    AudioSys.knife();
    return this.hitscan(THREE, raycaster, bots, w.range, 0);
  }
  var a = this.ammo[this.slot];
  if (a.mag <= 0) {
    AudioSys.dry();
    this.fireCd = 0.25;
    this.startReload();
    return null;
  }
  a.mag--;
  this.fireCd = w.rate;
  AudioSys.shot(w.sound);
  if (w.auto) this.spray = Math.min(1, this.spray + 0.12);
  var moving = Math.abs(this.vel.x) + Math.abs(this.vel.z) > 1.2;
  var spread = w.spreadBase + (moving ? w.spreadMove : 0) + this.spray * (w.auto ? 0.02 : 0.004);
  if (this.crouch > 0.4) spread *= 0.55;
  if (this.scoped) spread *= 0.25;
  this.recoilP += w.recoilPitch * (0.7 + Math.random() * 0.6);
  this.recoilY += w.recoilYaw * (Math.random() - 0.5) * 2;
  return this.hitscan(THREE, raycaster, bots, w.range, spread);
};

Player.prototype.hitscan = function (THREE, raycaster, bots, range, spread) {
  var fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ'));
  var right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  var up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  var dir = fwd.clone();
  if (spread > 0) {
    var a = Math.random() * Math.PI * 2;
    var r = Math.tan(spread) * Math.sqrt(Math.random());
    dir.add(right.clone().multiplyScalar(Math.cos(a) * r));
    dir.add(up.clone().multiplyScalar(Math.sin(a) * r));
    dir.normalize();
  }
  var origin = camera.getWorldPosition(new THREE.Vector3());
  raycaster.set(origin, dir);
  raycaster.far = range;
  var targets = this.map.colliderMeshes.slice();
  var self = this;
  bots.forEach(function (b) {
    if (b.alive && b.team !== self.team) targets.push(b.headMesh, b.bodyMesh);
  });
  var hits = raycaster.intersectObjects(targets, false);
  if (!hits.length) {
    var farPoint = origin.clone().add(dir.clone().multiplyScalar(range));
    return { hit: false, point: farPoint, dir: dir, origin: origin, weapon: this.slot, dist: range };
  }
  var h = hits[0];
  return {
    hit: true,
    point: h.point,
    dir: dir,
    origin: origin,
    weapon: this.slot,
    dist: h.distance,
    bot: h.object.userData.bot || null,
    part: h.object.userData.part || null,
    wall: h.object.isInstancedMesh,
    normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null
  };
};

Player.prototype.takeDamage = function (dmg, attacker, part) {
  if (!this.alive) return;
  var mult = 1;
  if (part === 'head') mult = this.helmet ? 1.1 : 2.2;
  var d = dmg * mult;
  if (this.armor > 0) {
    var absorbed = Math.min(this.armor, d * 0.5);
    this.armor -= absorbed;
    d -= absorbed;
  }
  d = Math.max(1, Math.round(d));
  this.hp -= d;
  this.damageFlash = 1;
  this.hitmarkerT = 0;
  if (part === 'head') AudioSys.headshot(); else AudioSys.hit();
  if (this.hp <= 0) {
    this.hp = 0;
    this.die(attacker, part);
  }
};

Player.prototype.die = function (attacker, part) {
  if (!this.alive) return;
  this.alive = false;
  this.scoped = false;
  if (this.game) this.game.onDeath(this, attacker, part);
};

Player.prototype.muzzlePos = function () {
  var fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ'));
  var right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  var origin = camera.getWorldPosition(new THREE.Vector3());
  return origin.clone().add(fwd.multiplyScalar(0.55)).add(right.multiplyScalar(0.24)).add(new THREE.Vector3(0, -0.1, 0));
};
