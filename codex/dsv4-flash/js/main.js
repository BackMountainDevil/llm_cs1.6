// 启动、主循环、输入、特效与菜单
(function () {
  window.$ = function (id) { return document.getElementById(String(id).replace(/^#/, '')); };
  window.CS = {
    input: {
      fwd: false, back: false, left: false, right: false,
      jump: false, crouch: false, walk: false, use: false,
      shoot: false, shootPressed: false
    },
    paused: false,
    playing: false,
    intentUnlock: false,
    shake: 0,
    settings: { sens: 1, muted: false, team: 'T' }
  };

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem('csweb_settings') || '{}');
      if (typeof s.sens === 'number') CS.settings.sens = s.sens;
      if (typeof s.muted === 'boolean') CS.settings.muted = s.muted;
      if (s.team === 'T' || s.team === 'CT') CS.settings.team = s.team;
    } catch (e) { /* 忽略 */ }
  }
  function saveSettings() {
    try { localStorage.setItem('csweb_settings', JSON.stringify(CS.settings)); } catch (e) { /* 忽略 */ }
  }
  loadSettings();

  function $(id) { return document.getElementById(String(id).replace(/^#/, '')); }

  var THREE = null, scene, camera, renderer, map, player, game, bots = [];
  var textures;
  var tracers = [], decals = [], blood = [], muzzles = [], explosions = [];
  var clock = null;

  window.__three.then(function (T) {
    THREE = T;
    init();
  }).catch(function () {
    var el = $('loading');
    el.textContent = 'Three.js 加载失败，请检查网络后刷新页面。';
  });

  function init() {
    var canvas = $('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcdbfa6);
    scene.fog = new THREE.Fog(0xcdbfa6, 70, 180);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 400);
    camera.rotation.order = 'YXZ';
    scene.add(camera);
    window.camera = camera;

    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0xc9b48a, 0.95));
    var sun = new THREE.DirectionalLight(0xfff2d8, 1.25);
    sun.position.set(70, 90, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 260;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    textures = Textures.build(THREE);
    map = MapBuilder.build(THREE, scene, textures);

    player = new Player({ map: map, game: null, team: CS.settings.team, isHuman: true, name: '你' });
    player.buildViewmodels(THREE, camera);

    var tNames = ['小虎', '阿飞', '老鬼', '独狼'];
    var cNames = ['铁面', '白鹰', '雷克', '冰峰'];
    tNames.forEach(function (n, i) {
      var b = new Bot({ THREE: THREE, map: map, scene: scene, team: 'T', name: n, game: null });
      b.index = i;
      bots.push(b);
    });
    cNames.forEach(function (n, i) {
      var b = new Bot({ THREE: THREE, map: map, scene: scene, team: 'CT', name: n, game: null });
      b.index = 10 + i;
      bots.push(b);
    });

    game = new Game({ THREE: THREE, scene: scene, map: map, player: player, bots: bots });
    player.game = game;
    bots.forEach(function (b) { b.game = game; });
    game.explodeFx = function (x, z) { spawnExplosion(x, z); };

    clock = new THREE.Clock();
    $('loading').style.display = 'none';
    $('mainMenu').classList.add('show');
    $('sens1').value = CS.settings.sens;
    $('sens2').value = CS.settings.sens;
    updateMuteButtons();
    highlightTeam();

    bindUI();
    bindInput();
    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(loop);
  }

  function highlightTeam() {
    $('teamT').classList.toggle('sel', CS.settings.team === 'T');
    $('teamCT').classList.toggle('sel', CS.settings.team === 'CT');
  }

  function bindUI() {
    $('teamT').onclick = function () { CS.settings.team = 'T'; saveSettings(); highlightTeam(); };
    $('teamCT').onclick = function () { CS.settings.team = 'CT'; saveSettings(); highlightTeam(); };
    $('startBtn').onclick = startGame;
    $('resumeBtn').onclick = resumeGame;
    $('restartBtn').onclick = function () { location.reload(); };
    $('buyClose').onclick = function () { game.closeBuy(); };
    $('sens1').oninput = function () { CS.settings.sens = parseFloat(this.value); saveSettings(); $('sens2').value = this.value; };
    $('sens2').oninput = function () { CS.settings.sens = parseFloat(this.value); saveSettings(); $('sens1').value = this.value; };
    $('muteBtn1').onclick = toggleMute;
    $('muteBtn2').onclick = toggleMute;
    $('gameCanvas').addEventListener('mousedown', onMouseDown);
    $('gameCanvas').addEventListener('mouseup', onMouseUp);
    $('gameCanvas').addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('pointerlockchange', onLockChange);
  }

  function bindInput() {
    document.addEventListener('keydown', function (e) {
      if (!CS.playing) return;
      var k = e.code;
      if (k === 'Tab') {
        e.preventDefault();
        if (!e.repeat) game.toggleScoreboard(true);
        return;
      }
      if (CS.paused) {
        if (k === 'Escape' || k === 'Enter') resumeGame();
        return;
      }
      switch (k) {
        case 'KeyW': CS.input.fwd = true; break;
        case 'KeyS': CS.input.back = true; break;
        case 'KeyA': CS.input.left = true; break;
        case 'KeyD': CS.input.right = true; break;
        case 'Space': CS.input.jump = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': CS.input.walk = true; break;
        case 'KeyC': CS.input.crouch = true; break;
        case 'KeyE': CS.input.use = true; break;
        case 'KeyR': player.startReload(); break;
        case 'KeyB': if (!e.repeat) game.toggleBuy(); break;
        case 'KeyM': toggleMute(); break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
          if (game.buyOpen) {
            var idx = Number(k.slice(5)) - 1;
            if (idx >= 0 && idx < game.SHOP.length) game.buyItem(game.SHOP[idx].id);
          } else {
            player.selectByKey(Number(k.slice(5)));
          }
          break;
        case 'Escape': if (CS.paused) resumeGame(); break;
      }
    });
    document.addEventListener('keyup', function (e) {
      var k = e.code;
      if (k === 'Tab') { game.toggleScoreboard(false); return; }
      switch (k) {
        case 'KeyW': CS.input.fwd = false; break;
        case 'KeyS': CS.input.back = false; break;
        case 'KeyA': CS.input.left = false; break;
        case 'KeyD': CS.input.right = false; break;
        case 'Space': CS.input.jump = false; break;
        case 'ShiftLeft': case 'ShiftRight': CS.input.walk = false; break;
        case 'KeyC': CS.input.crouch = false; break;
        case 'KeyE': CS.input.use = false; break;
      }
    });
    document.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== $('gameCanvas') || !player) return;
      var sens = CS.settings.sens * 0.0022;
      player.yaw -= e.movementX * sens;
      player.pitch -= e.movementY * sens;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
    });
  }

  function onMouseDown(e) {
    if (document.pointerLockElement !== $('gameCanvas')) {
      if (CS.playing && !CS.paused) requestLock();
      return;
    }
    if (e.button === 0) { CS.input.shoot = true; CS.input.shootPressed = true; }
    if (e.button === 2 && player.alive) player.toggleScope();
  }
  function onMouseUp(e) {
    if (e.button === 0) CS.input.shoot = false;
  }

  function onLockChange() {
    var locked = document.pointerLockElement === $('gameCanvas');
    if (!locked && CS.playing && !CS.intentUnlock && !CS.paused) {
      pauseGame();
    }
  }

  function startGame() {
    AudioSys.enable();
    AudioSys.setMuted(CS.settings.muted);
    player.team = CS.settings.team;
    player.haveBomb = player.team === 'T';
    $('mainMenu').classList.remove('show');
    $('pauseMenu').classList.remove('show');
    $('hud').classList.remove('hidden');
    CS.playing = true;
    CS.paused = false;
    game.start();
    requestLock();
  }

  function pauseGame() {
    CS.paused = true;
    CS.input.shoot = false;
    $('pauseMenu').classList.add('show');
  }
  function resumeGame() {
    CS.paused = false;
    $('pauseMenu').classList.remove('show');
    requestLock();
  }
  function requestLock() {
    if (!CS.playing || CS.paused) return;
    try { $('gameCanvas').requestPointerLock(); } catch (e) { /* 忽略 */ }
  }
  window.CS.unlockForMenu = function () {
    CS.intentUnlock = true;
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(function () { CS.intentUnlock = false; }, 300);
  };
  window.CS.relockForGame = function () {
    CS.intentUnlock = false;
    requestLock();
  };

  function toggleMute() {
    CS.settings.muted = !CS.settings.muted;
    AudioSys.setMuted(CS.settings.muted);
    saveSettings();
    updateMuteButtons();
  }
  function updateMuteButtons() {
    var txt = '音效：' + (CS.settings.muted ? '关' : '开');
    $('muteBtn1').textContent = txt;
    $('muteBtn2').textContent = txt;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function loop() {
    var dt = Math.min(clock.getDelta(), 0.05);
    if (CS.playing && !CS.paused) {
      game.update(dt);
      player.update(dt, camera);
      bots.forEach(function (b) { b.update(dt); });
      handleShooting();
      updateEffects(dt);
      game.updateHUD();
    } else if (CS.playing) {
      renderer.render(scene, camera);
      return;
    } else {
      // 主菜单背景：缓慢旋转相机展示地图
      if (!game._menuT) game._menuT = 0;
      game._menuT += dt;
      var ang = game._menuT * 0.12;
      camera.position.set(Math.sin(ang) * 55, 38, Math.cos(ang) * 55);
      camera.lookAt(0, 0, 0);
    }

    // 开镜 FOV
    var targetFov = (player.scoped && player.slot === 'awp' && player.alive) ? 26 : 75;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14);
      camera.updateProjectionMatrix();
    }
    // 镜头震动
    if (CS.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * CS.shake;
      camera.position.y += (Math.random() - 0.5) * CS.shake * 0.6;
      camera.position.z += (Math.random() - 0.5) * CS.shake;
      CS.shake = Math.max(0, CS.shake - dt * 3.2);
    }
    renderer.render(scene, camera);
  }

  function handleShooting() {
    if (!player.alive) { CS.input.shoot = false; return; }
    var w = player.weaponsDef[player.slot];
    var fire = false;
    if (w.auto && CS.input.shoot) fire = true;
    else if (CS.input.shootPressed) { fire = true; CS.input.shootPressed = false; }
    if (!fire) return;
    var ev = player.tryFire(THREE, new THREE.Raycaster(), bots);
    if (!ev) return;
    spawnMuzzle(ev.origin, ev.dir);
    if (ev.hit) {
      spawnTracer(ev.origin, ev.point);
      if (ev.wall) spawnDecal(ev.point, ev.normal || new THREE.Vector3(0, 1, 0));
      if (ev.bot) {
        var wd = player.weaponsDef[ev.weapon];
        var dmg = wd.damage;
        ev.bot.takeDamage(dmg, player, ev.part);
        var head = ev.part === 'head';
        if (ev.bot.alive) {
          game.showHitmarker(false);
          if (head) AudioSys.headshot(); else AudioSys.hit();
        }
        spawnBlood(ev.point);
      }
    }
  }

  // ---------- 特效 ----------
  function spawnMuzzle(origin, dir) {
    var mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(textures.muzzle), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    var sp = new THREE.Sprite(mat);
    sp.position.copy(origin.clone().add(dir.clone().multiplyScalar(0.05)));
    sp.scale.set(0.55, 0.55, 1);
    sp.rotation.z = Math.random() * Math.PI * 2;
    scene.add(sp);
    var light = new THREE.PointLight(0xffcc66, 1.6, 9);
    light.position.copy(origin);
    scene.add(light);
    muzzles.push({ sp: sp, light: light, t: 0.06, mat: mat });
  }
  function spawnTracer(a, b) {
    var geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    var mat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.85 });
    var line = new THREE.Line(geo, mat);
    scene.add(line);
    tracers.push({ line: line, mat: mat, t: 0.09 });
  }
  function spawnDecal(point, normal) {
    var mat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b, transparent: true, opacity: 0.75, depthWrite: false });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), mat);
    mesh.position.copy(point).add(normal.clone().multiplyScalar(0.02));
    mesh.lookAt(point.clone().add(normal));
    mesh.rotation.z = Math.random() * Math.PI * 2;
    scene.add(mesh);
    decals.push({ mesh: mesh, mat: mat, t: 3.0 });
  }
  function spawnBlood(point) {
    var mat = new THREE.MeshBasicMaterial({ color: 0xaa1f1f, transparent: true, opacity: 0.95 });
    for (var i = 0; i < 7; i++) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mat);
      m.position.copy(point);
      var v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 + 0.5, (Math.random() - 0.5) * 2);
      scene.add(m);
      blood.push({ mesh: m, vel: v, t: 0.75, mat: mat });
    }
  }
  function spawnExplosion(x, z) {
    var mat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    var sph = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mat);
    sph.position.set(x, 1.5, z);
    scene.add(sph);
    var light = new THREE.PointLight(0xffaa44, 6, 50);
    light.position.set(x, 3, z);
    scene.add(light);
    explosions.push({ sph: sph, light: light, t: 0.55, mat: mat });
    CS.shake = 0.8;
    var fl = $('flash');
    fl.style.opacity = 0.85;
    setTimeout(function () { fl.style.opacity = 0; }, 80);
  }
  function updateEffects(dt) {
    for (var i = tracers.length - 1; i >= 0; i--) {
      var tr = tracers[i];
      tr.t -= dt;
      tr.mat.opacity = Math.max(0, tr.t / 0.09) * 0.85;
      if (tr.t <= 0) { scene.remove(tr.line); tr.mat.dispose(); tr.line.geometry.dispose(); tracers.splice(i, 1); }
    }
    for (var j = decals.length - 1; j >= 0; j--) {
      var dc = decals[j];
      dc.t -= dt;
      dc.mat.opacity = Math.min(0.75, dc.t);
      if (dc.t <= 0) { scene.remove(dc.mesh); dc.mat.dispose(); dc.mesh.geometry.dispose(); decals.splice(j, 1); }
    }
    for (var k = blood.length - 1; k >= 0; k--) {
      var bd = blood[k];
      bd.t -= dt;
      bd.vel.y -= 9.8 * dt;
      bd.mesh.position.add(bd.vel.clone().multiplyScalar(dt));
      bd.mat.opacity = Math.max(0, bd.t / 0.75);
      if (bd.t <= 0) { scene.remove(bd.mesh); bd.mat.dispose(); bd.mesh.geometry.dispose(); blood.splice(k, 1); }
    }
    for (var m = muzzles.length - 1; m >= 0; m--) {
      var mz = muzzles[m];
      mz.t -= dt;
      mz.light.intensity = Math.max(0, mz.t / 0.06) * 1.6;
      mz.mat.opacity = Math.max(0, mz.t / 0.06);
      if (mz.t <= 0) { scene.remove(mz.sp); scene.remove(mz.light); mz.mat.dispose(); muzzles.splice(m, 1); }
    }
    for (var e = explosions.length - 1; e >= 0; e--) {
      var ex = explosions[e];
      ex.t -= dt;
      var s = 1 + (0.55 - ex.t) * 18;
      ex.sph.scale.set(s, s, s);
      ex.mat.opacity = Math.max(0, ex.t / 0.55) * 0.9;
      ex.light.intensity = Math.max(0, ex.t / 0.55) * 6;
      if (ex.t <= 0) { scene.remove(ex.sph); scene.remove(ex.light); ex.mat.dispose(); ex.sph.geometry.dispose(); explosions.splice(e, 1); }
    }
  }

  // 全局错误提示：任何运行时异常都会显示在画面上，方便排查
  window.addEventListener('error', function (e) {
    try {
      var div = document.getElementById('errBanner');
      if (!div) {
        div = document.createElement('div');
        div.id = 'errBanner';
        div.style.cssText = 'position:fixed;left:10px;bottom:10px;right:10px;z-index:999;background:rgba(120,20,20,0.92);color:#fff;font:12px/1.6 monospace;padding:8px 12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;';
        document.body.appendChild(div);
      }
      div.textContent = '运行时错误：' + (e.message || e.error || '未知错误');
    } catch (err) { /* 忽略 */ }
  });
})();
