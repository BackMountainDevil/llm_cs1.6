// 地图：基于字符网格程序化构建，附带 A* 寻路与碰撞体
window.MapBuilder = (function () {
  var W = 40, H = 28, CELL = 3;
  var grid = [];

  function rect(c0, r0, c1, r1, ch) {
    for (var r = r0; r <= r1; r++)
      for (var c = c0; c <= c1; c++) grid[r][c] = ch;
  }

  function buildGrid() {
    grid = [];
    for (var r = 0; r < H; r++) grid.push(new Array(W).fill('.'));
    // 边界
    rect(0, 0, W - 1, 0, '#');
    rect(0, H - 1, W - 1, H - 1, '#');
    rect(0, 0, 0, H - 1, '#');
    rect(W - 1, 0, W - 1, H - 1, '#');
    // 两道竖墙，中间留门（行 13-14）
    rect(9, 6, 9, 12, '#');
    rect(9, 15, 9, 21, '#');
    rect(30, 6, 30, 12, '#');
    rect(30, 15, 30, 21, '#');
    // 顶部走廊掩体
    rect(13, 4, 14, 5, '=');
    rect(24, 4, 25, 5, '=');
    // 底部走廊掩体
    rect(14, 22, 15, 23, '=');
    rect(24, 22, 25, 23, '=');
    // 中路集装箱（保留行14通道）
    rect(18, 12, 21, 13, '=');
    rect(18, 15, 21, 16, '=');
    // 中路两侧掩体
    rect(12, 10, 13, 11, '=');
    rect(26, 10, 27, 11, '=');
    // A 区掩体
    rect(23, 18, 24, 18, '=');
    rect(23, 19, 24, 19, '=');
    rect(23, 21, 24, 21, '=');
    rect(23, 22, 24, 22, '=');
    rect(28, 18, 28, 21, '=');
    // 出生点附近掩体
    rect(6, 2, 7, 3, '=');
    rect(32, 2, 33, 3, '=');
    // 包点与出生点标记
    rect(25, 19, 27, 21, 'A');
    var T = [[2, 2], [3, 2], [2, 3], [4, 3], [3, 4]];
    var C = [[37, 2], [36, 2], [37, 3], [35, 3], [36, 4]];
    T.forEach(function (p) { grid[p[1]][p[0]] = 'T'; });
    C.forEach(function (p) { grid[p[1]][p[0]] = 'C'; });
  }

  function isSolid(c, r) {
    if (c < 0 || r < 0 || c >= W || r >= H) return true;
    return grid[r][c] === '#' || grid[r][c] === '=';
  }
  function cellToWorld(c, r) {
    return { x: (c - W / 2 + 0.5) * CELL, z: (r - H / 2 + 0.5) * CELL };
  }
  function worldToCell(x, z) {
    return { c: Math.floor(x / CELL + W / 2), r: Math.floor(z / CELL + H / 2) };
  }

  function aStar(c0, r0, c1, r1) {
    if (isSolid(c0, r0) || isSolid(c1, r1)) return [];
    var key = function (c, r) { return r * W + c; };
    var open = [{ c: c0, r: r0, g: 0, f: Math.abs(c1 - c0) + Math.abs(r1 - r0), parent: null }];
    var came = {};
    var gs = {};
    gs[key(c0, r0)] = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var guard = 0;
    while (open.length && guard++ < 5000) {
      open.sort(function (a, b) { return a.f - b.f; });
      var cur = open.shift();
      if (cur.c === c1 && cur.r === r1) {
        var path = [];
        var n = cur;
        while (n) { path.push([n.c, n.r]); n = n.parent; }
        path.reverse();
        return path.slice(1).map(function (p) { return cellToWorld(p[0], p[1]); });
      }
      for (var i = 0; i < 4; i++) {
        var nc = cur.c + dirs[i][0], nr = cur.r + dirs[i][1];
        if (isSolid(nc, nr)) continue;
        var ng = cur.g + 1;
        var k = key(nc, nr);
        if (gs[k] === undefined || ng < gs[k]) {
          gs[k] = ng;
          open.push({ c: nc, r: nr, g: ng, f: ng + Math.abs(c1 - nc) + Math.abs(r1 - nr), parent: cur });
        }
      }
    }
    return [];
  }

  function buildColliders() {
    var boxes = [];
    for (var r = 0; r < H; r++) {
      var c = 0;
      while (c < W) {
        if (isSolid(c, r)) {
          var c1 = c;
          while (c1 + 1 < W && isSolid(c1 + 1, r)) c1++;
          var a = cellToWorld(c, r), b = cellToWorld(c1, r);
          boxes.push({
            minX: a.x - CELL / 2, maxX: b.x + CELL / 2,
            minZ: a.z - CELL / 2, maxZ: a.z + CELL / 2,
            crate: grid[r][c] === '='
          });
          c = c1 + 1;
        } else c++;
      }
    }
    return boxes;
  }

  buildGrid();

  var api = {
    W: W, H: H, CELL: CELL,
    grid: function () { return grid; },
    isSolid: isSolid,
    cellToWorld: cellToWorld,
    worldToCell: worldToCell,
    aStar: aStar,
    build: function (THREE, scene, textures) {
      var wallGeo = new THREE.BoxGeometry(CELL, 3, CELL);
      var crateGeo = new THREE.BoxGeometry(CELL, 1.7, CELL);
      var wallMat = new THREE.MeshLambertMaterial({ map: textures.wall });
      var crateMat = new THREE.MeshLambertMaterial({ map: textures.crate });
      var nW = 0, nC = 0;
      for (var r = 0; r < H; r++)
        for (var c = 0; c < W; c++) {
          if (grid[r][c] === '#') nW++;
          else if (grid[r][c] === '=') nC++;
        }
      var wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, nW);
      var crateMesh = new THREE.InstancedMesh(crateGeo, crateMat, nC);
      wallMesh.castShadow = true; wallMesh.receiveShadow = true;
      crateMesh.castShadow = true; crateMesh.receiveShadow = true;
      var wi = 0, ci = 0;
      var m = new THREE.Matrix4();
      var q = new THREE.Quaternion();
      var scale = new THREE.Vector3(1, 1, 1);
      for (var rr = 0; rr < H; rr++)
        for (var cc = 0; cc < W; cc++) {
          if (grid[rr][cc] === '#' || grid[rr][cc] === '=') {
            var w = cellToWorld(cc, rr);
            var target = grid[rr][cc] === '#' ? wallMesh : crateMesh;
            var idx = grid[rr][cc] === '#' ? wi++ : ci++;
            var h = grid[rr][cc] === '#' ? 1.5 : 0.85;
            m.compose(new THREE.Vector3(w.x, h, w.z), q, scale);
            target.setMatrixAt(idx, m);
          }
        }
      wallMesh.instanceMatrix.needsUpdate = true;
      crateMesh.instanceMatrix.needsUpdate = true;
      scene.add(wallMesh, crateMesh);

      // 地面
      var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(W * CELL + 20, H * CELL + 20),
        new THREE.MeshLambertMaterial({ map: textures.floor })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // A 区标记
      var siteCenter = cellToWorld(26, 20);
      var siteR = 5.5;
      var siteDisc = new THREE.Mesh(
        new THREE.CircleGeometry(siteR, 40),
        new THREE.MeshBasicMaterial({ color: 0xc23a24, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      );
      siteDisc.rotation.x = -Math.PI / 2;
      siteDisc.position.set(siteCenter.x, 0.02, siteCenter.z);
      scene.add(siteDisc);
      var signA = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(textures.signA),
        transparent: true, depthWrite: false
      }));
      signA.scale.set(4, 2, 1);
      signA.position.set(siteCenter.x, 3.4, siteCenter.z);
      scene.add(signA);

      // 出生点/购买区
      var buyZones = {
        T: { x: cellToWorld(3, 3).x, z: cellToWorld(3, 3).z, r: 9 },
        CT: { x: cellToWorld(36, 3).x, z: cellToWorld(36, 3).z, r: 9 }
      };
      [['T', 0x3fb45f], ['CT', 0x3f8fb4]].forEach(function (it) {
        var z = buyZones[it[0]];
        var disc = new THREE.Mesh(
          new THREE.CircleGeometry(z.r, 40),
          new THREE.MeshBasicMaterial({ color: it[1], transparent: true, opacity: 0.10, side: THREE.DoubleSide })
        );
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(z.x, 0.015, z.z);
        scene.add(disc);
        var sg = new THREE.Sprite(new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(textures.signBuy),
          transparent: true, depthWrite: false
        }));
        sg.scale.set(3, 1.5, 1);
        sg.position.set(z.x, 2.6, z.z);
        scene.add(sg);
      });

      var spawns = {
        T: [[2, 2], [3, 2], [2, 3], [4, 3], [3, 4]].map(function (p) { return cellToWorld(p[0], p[1]); }),
        CT: [[37, 2], [36, 2], [37, 3], [35, 3], [36, 4]].map(function (p) { return cellToWorld(p[0], p[1]); })
      };

      return {
        W: W, H: H, CELL: CELL,
        grid: grid,
        colliders: buildColliders(),
        wallMesh: wallMesh,
        crateMesh: crateMesh,
        colliderMeshes: [wallMesh, crateMesh],
        site: { x: siteCenter.x, z: siteCenter.z, r: siteR },
        buyZones: buyZones,
        spawns: spawns,
        cellToWorld: cellToWorld,
        worldToCell: worldToCell,
        isSolid: isSolid,
        aStar: aStar
      };
    }
  };
  return api;
})();
