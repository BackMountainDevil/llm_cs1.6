// 武器定义与低多边形第一人称模型
window.Weapons = (function () {
  var DEFS = {
    knife: { name: '匕首', price: 0, slot: 0, team: 'both', damage: 58, headMult: 1.4, range: 2.9, rate: 0.4, mag: 0, reserve: 0, auto: false, reload: 0, moveScale: 1.0, spreadBase: 0, spreadMove: 0, recoilPitch: 0, recoilYaw: 0, sound: 'knife' },
    p9: { name: 'P9', price: 500, slot: 1, team: 'both', damage: 27, headMult: 2.2, range: 95, rate: 0.17, mag: 12, reserve: 24, auto: false, reload: 1.5, moveScale: 0.92, spreadBase: 0.013, spreadMove: 0.03, recoilPitch: 0.011, recoilYaw: 0.003, sound: 'pistol' },
    ak: { name: 'AK-47', price: 2700, slot: 2, team: 'T', damage: 34, headMult: 2.3, range: 135, rate: 0.1, mag: 30, reserve: 90, auto: true, reload: 2.2, moveScale: 0.85, spreadBase: 0.01, spreadMove: 0.028, recoilPitch: 0.017, recoilYaw: 0.007, sound: 'rifle' },
    m4: { name: 'M4', price: 2700, slot: 3, team: 'CT', damage: 31, headMult: 2.2, range: 135, rate: 0.095, mag: 30, reserve: 90, auto: true, reload: 2.1, moveScale: 0.85, spreadBase: 0.009, spreadMove: 0.026, recoilPitch: 0.015, recoilYaw: 0.005, sound: 'rifle' },
    awp: { name: 'AWP', price: 4750, slot: 4, team: 'both', damage: 115, headMult: 2.0, range: 240, rate: 1.45, mag: 10, reserve: 30, auto: false, reload: 2.7, moveScale: 0.78, spreadBase: 0.001, spreadMove: 0.05, recoilPitch: 0.05, recoilYaw: 0.012, scope: true, sound: 'sniper' }
  };
  var SLOTS = ['knife', 'p9', 'ak', 'm4', 'awp'];

  function buildViewModel(THREE, key) {
    var g = new THREE.Group();
    var dark = new THREE.MeshLambertMaterial({ color: 0x24262b });
    var metal = new THREE.MeshLambertMaterial({ color: 0x8f959e });
    var wood = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
    var blade = new THREE.MeshLambertMaterial({ color: 0xc9ced6 });
    function box(w, h, d, mat, x, y, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    }
    function cyl(r, len, mat, x, y, z, rx) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      g.add(m);
      return m;
    }
    if (key === 'knife') {
      box(0.05, 0.05, 0.18, wood, 0, 0, 0);
      box(0.026, 0.026, 0.26, blade, 0, 0.02, -0.2);
    } else if (key === 'p9') {
      box(0.075, 0.13, 0.26, dark, 0, 0, 0);
      cyl(0.018, 0.12, metal, 0, 0.025, -0.16, Math.PI / 2);
      box(0.04, 0.09, 0.07, dark, 0, -0.09, -0.02);
    } else if (key === 'ak') {
      box(0.075, 0.15, 0.72, wood, 0, 0, 0.03);
      box(0.07, 0.11, 0.3, dark, 0, 0.02, -0.34);
      cyl(0.017, 0.42, metal, 0, -0.02, -0.48, Math.PI / 2);
      box(0.06, 0.16, 0.16, dark, 0, -0.03, 0.3);
      box(0.09, 0.22, 0.18, dark, 0, -0.08, -0.18);
    } else if (key === 'm4') {
      box(0.07, 0.13, 0.7, dark, 0, 0, 0.05);
      cyl(0.016, 0.32, metal, 0, -0.02, -0.4, Math.PI / 2);
      box(0.05, 0.09, 0.26, dark, 0, 0.09, -0.18);
      box(0.06, 0.14, 0.2, dark, 0, -0.06, 0.2);
    } else if (key === 'awp') {
      box(0.09, 0.16, 0.5, dark, 0, 0, 0.2);
      cyl(0.028, 0.8, dark, 0, -0.03, -0.34, Math.PI / 2);
      cyl(0.045, 0.26, dark, 0, 0.1, 0.08);
      box(0.09, 0.08, 0.28, wood, 0, -0.08, 0.28);
    }
    return g;
  }

  function makeBotGun(THREE, key) {
    var g = new THREE.Group();
    var dark = new THREE.MeshLambertMaterial({ color: 0x1c1e22 });
    if (key === 'knife' || !key) return g;
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.5), dark);
    g.add(body);
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.22, 6), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.34;
    g.add(barrel);
    return g;
  }

  return {
    DEFS: DEFS,
    SLOTS: SLOTS,
    buildViewModel: buildViewModel,
    makeBotGun: makeBotGun,
    ammoOf: function (key) { return { mag: DEFS[key].mag, res: DEFS[key].reserve }; }
  };
})();
