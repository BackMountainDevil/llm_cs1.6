// 全部纹理通过 Canvas 程序化生成，零外部素材依赖
window.Textures = (function () {
  function rand(a, b) { return a + Math.random() * (b - a); }
  function canvas(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    draw(g, w, h);
    return c;
  }
  function toTex(THREE, c, rx, ry) {
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry);
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  function speckle(g, w, h, n, color) {
    g.fillStyle = color;
    for (var i = 0; i < n; i++) {
      g.globalAlpha = rand(0.05, 0.28);
      var s = rand(1, 3);
      g.fillRect(rand(0, w), rand(0, h), s, s);
    }
    g.globalAlpha = 1;
  }

  function floorCanvas() {
    return canvas(256, 256, function (g, w, h) {
      g.fillStyle = '#c8b183';
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 90; i++) {
        g.globalAlpha = rand(0.04, 0.16);
        g.fillStyle = Math.random() < 0.5 ? '#a98f63' : '#d9c697';
        g.beginPath();
        g.ellipse(rand(0, w), rand(0, h), rand(8, 38), rand(6, 26), rand(0, Math.PI), 0, Math.PI * 2);
        g.fill();
      }
      speckle(g, w, h, 600, 'rgba(70,55,30,0.5)');
      speckle(g, w, h, 260, 'rgba(245,235,210,0.55)');
    });
  }

  function wallCanvas() {
    return canvas(256, 256, function (g, w, h) {
      g.fillStyle = '#c9b795';
      g.fillRect(0, 0, w, h);
      var bw = 64, bh = 32;
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 4; c++) {
          var x = c * bw + (r % 2 ? 32 : 0);
          var y = r * bh;
          var shade = rand(-18, 18);
          var col = 'rgb(' + Math.round(196 + shade) + ',' + Math.round(172 + shade) + ',' + Math.round(128 + shade) + ')';
          g.fillStyle = col;
          g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          g.fillStyle = 'rgba(90,75,45,0.35)';
          g.fillRect(x, y, 2, bh);
          g.fillRect(x, y, bw, 2);
          speckle(g, w, h, 8, 'rgba(80,65,40,0.35)');
        }
      }
      speckle(g, w, h, 260, 'rgba(80,65,40,0.3)');
    });
  }

  function crateCanvas() {
    return canvas(256, 256, function (g, w, h) {
      g.fillStyle = '#a97b42';
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 6; i++) {
        var x = i * 43;
        g.fillStyle = 'rgba(60,40,15,0.45)';
        g.fillRect(x, 0, 3, h);
        g.fillStyle = 'rgba(255,230,180,0.14)';
        g.fillRect(x + 3, 0, 3, h);
      }
      for (var j = 0; j < 5; j++) {
        var y = j * 51;
        g.fillStyle = 'rgba(60,40,15,0.35)';
        g.fillRect(0, y, w, 2);
      }
      g.strokeStyle = 'rgba(55,38,14,0.9)';
      g.lineWidth = 6;
      g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = 'rgba(255,240,200,0.25)';
      g.fillRect(8, 8, w - 16, 8);
      g.fillStyle = 'rgba(40,28,10,0.8)';
      for (var n = 0; n < 4; n++) {
        g.beginPath();
        g.arc(24 + n * 70, 20 + (n % 2) * 150, 4, 0, Math.PI * 2);
        g.fill();
      }
      speckle(g, w, h, 120, 'rgba(70,50,20,0.4)');
    });
  }

  function makeSignTexture(text, bg, fg) {
    return canvas(512, 256, function (g, w, h) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 18;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = fg;
      g.font = 'bold 150px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 6);
    });
  }

  function makeBlinkTexture(color) {
    return canvas(64, 64, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      g.fillStyle = color;
      g.beginPath();
      g.arc(w / 2, h / 2, 24, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath();
      g.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
      g.fill();
    });
  }

  function makeMuzzleTexture() {
    return canvas(64, 64, function (g, w, h) {
      var grad = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 30);
      grad.addColorStop(0, 'rgba(255,255,220,1)');
      grad.addColorStop(0.4, 'rgba(255,200,80,0.8)');
      grad.addColorStop(1, 'rgba(255,150,30,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
  }

  var cached = null;
  var api = {
    build: function (THREE) {
      if (cached) return cached;
      var out = {
        floor: toTex(THREE, floorCanvas(), 30, 22),
        wall: toTex(THREE, wallCanvas(), 1, 1),
        crate: toTex(THREE, crateCanvas(), 1, 1),
        signA: makeSignTexture('A', '#b03a1e', '#ffe9b0'),
        signBuy: makeSignTexture('BUY', '#1e6a3a', '#d9ffe0'),
        muzzle: makeMuzzleTexture(),
        bombBlink: makeBlinkTexture('#ff3b30'),
        tracer: makeBlinkTexture('#ffe9a0')
      };
      cached = out;
      return out;
    },
    makeSignTexture: makeSignTexture
  };
  return api;
})();
