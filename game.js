/* Drive-Thru Résumé — a cyber-noir city you drive through to read a career.
   three.js r128 (global build), custom arcade physics, no build step.
   World: +x east, +z south, heading 0 = north (-z). 1 unit ~ 1 metre. */
(function () {
'use strict';
var R = window.RESUME;
var $ = function (s) { return document.querySelector(s); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var store = {
  get: function (k) { try { return localStorage.getItem('dtr.' + k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem('dtr.' + k, v); } catch (e) {} }
};
var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
var C = { bg: 0x07080b, y: 0xffd400, c: 0x00e5ff, m: 0xff2e88 };
var HEX = { y: '#ffd400', c: '#00e5ff', m: '#ff2e88' };

/* ------------------------------------------------------------ résumé view */
function buildResume() {
  var el = $('#resume');
  var jobs = R.jobs.map(function (j) {
    return '<div class="job"><b>' + esc(j.role) + '</b><div class="m">' + esc(j.co) + ' · ' + esc(j.dates) + ' · ' + esc(j.loc) + '</div><p>' + esc(j.text) + '</p></div>';
  }).join('');
  el.innerHTML =
    '<div class="bar"><b>// PLAIN RÉSUMÉ</b><span><button class="btn ghost" id="rsPrint">Print / save PDF</button> <button class="btn go" id="rsBack">Back to the city</button></span></div>' +
    '<div class="page"><h1>' + esc(R.name) + '</h1><div class="t">' + esc(R.title) + '</div>' +
    '<div class="links"><a href="mailto:' + esc(R.email) + '">' + esc(R.email) + '</a><a href="' + esc(R.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a><a href="' + esc(R.github) + '" target="_blank" rel="noopener">GitHub</a></div>' +
    '<h3>SUMMARY</h3><p>' + esc(R.summary) + '</p><h3>EXPERIENCE</h3>' + jobs +
    '<div class="g"><div><h3>SKILLS</h3><ul>' + R.skills.map(function (s) { return '<li><b>' + esc(s[0]) + ':</b> ' + esc(s[1].join(', ')) + '</li>'; }).join('') + '</ul>' +
    '<h3>EDUCATION</h3><ul>' + R.edu.map(function (e) { return '<li>' + esc(e[0]) + ' — ' + esc(e[2]) + ' (' + esc(e[1]) + ')</li>'; }).join('') + '</ul>' +
    '<h3>LANGUAGES</h3><ul>' + R.langs.map(function (l) { return '<li>' + esc(l[0]) + ' — ' + esc(l[1]) + '</li>'; }).join('') + '</ul></div>' +
    '<div><h3>CERTIFICATIONS</h3><ul>' + R.certs.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div></div></div>';
  $('#rsBack').onclick = closeResume;
  $('#rsPrint').onclick = function () { window.print(); };
}
var resumeOpen = false;
function openResume() { resumeOpen = true; $('#resume').hidden = false; $('#resume').scrollTop = 0; }
function closeResume() { resumeOpen = false; $('#resume').hidden = true; }
buildResume();
$('#skip').onclick = openResume;
$('#skip2').onclick = openResume;

/* ------------------------------------------------------------ renderer */
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
} catch (err) { renderer = null; }
if (!renderer || !window.THREE) {
  $('#intro').classList.add('gone');
  openResume();
  $('#rsBack').style.display = 'none';
  return;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.bg, 1);
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(C.bg, 70, 300);
var camera = new THREE.PerspectiveCamera(62, 1, 0.5, 700);
scene.add(new THREE.AmbientLight(0x8a96c0, 0.95));
var sun = new THREE.DirectionalLight(0x9fd8ff, 0.7); sun.position.set(-30, 60, 20); scene.add(sun);
function resize() {
  var w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ------------------------------------------------------------ helpers */
var seed = 1337;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, repeat) {
  var t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4; return t;
}
function fit(ctx, text, maxW, size, font) {
  do { ctx.font = font.replace('#', size); size -= 2; } while (ctx.measureText(text).width > maxW && size > 10);
}

var glowTex = (function () {
  var c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c);
})();
function glow(color, size, x, y, z, op) {
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op == null ? 0.9 : op }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); scene.add(s); return s;
}

/* window-lit facade textures, one per accent colour */
var winCache = {};
function windowTex(accent) {
  if (winCache[accent]) return winCache[accent];
  var c = mkCanvas(256, 512), g = c.getContext('2d'), cols = 8, rows = 16, cw = 32, rh = 32;
  g.fillStyle = '#080a10'; g.fillRect(0, 0, 256, 512);
  var pal = [HEX[accent], HEX[accent], '#ffd400', '#ffd400', '#00e5ff', '#e8f4ff'];
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    var lit = rnd() < 0.32;
    g.fillStyle = lit ? pal[Math.floor(rnd() * pal.length)] : '#0d121b';
    g.globalAlpha = lit ? 0.55 + rnd() * 0.45 : 1;
    g.fillRect(x * cw + 6, y * rh + 7, cw - 12, rh - 14);
  }
  g.globalAlpha = 1;
  g.strokeStyle = HEX[accent]; g.globalAlpha = .35; g.lineWidth = 2; g.strokeRect(1, 1, 254, 510);
  var t = tex(c, true); winCache[accent] = t; return t;
}
var matCache = {};
function sideMat(accent, rx, ry) {
  var k = accent + ':' + rx.toFixed(1) + ':' + ry.toFixed(1);
  if (matCache[k]) return matCache[k];
  var t = windowTex(accent).clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return (matCache[k] = new THREE.MeshBasicMaterial({ map: t }));
}
var roofMat = new THREE.MeshBasicMaterial({ color: 0x10141d });
var edgeMats = {
  y: new THREE.LineBasicMaterial({ color: C.y, transparent: true, opacity: .8 }),
  c: new THREE.LineBasicMaterial({ color: C.c, transparent: true, opacity: .8 }),
  m: new THREE.LineBasicMaterial({ color: C.m, transparent: true, opacity: .8 })
};

var colliders = [];
function building(x, z, w, d, h, accent, noEdge) {
  var rx = Math.max(.5, Math.round(w / 16 * 2) / 2), rz = Math.max(.5, Math.round(d / 16 * 2) / 2), ry = Math.max(.5, Math.round(h / 32 * 2) / 2);
  var mats = [sideMat(accent, rz, ry), sideMat(accent, rz, ry), roofMat, roofMat, sideMat(accent, rx, ry), sideMat(accent, rx, ry)];
  var geo = new THREE.BoxGeometry(w, h, d);
  var m = new THREE.Mesh(geo, mats); m.position.set(x, h / 2, z); scene.add(m);
  if (!noEdge) { var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMats[accent]); e.position.copy(m.position); scene.add(e); }
  colliders.push({ x: x, z: z, hw: w / 2, hd: d / 2 });
  return m;
}

function signTex(kick, title, sub, color) {
  var c = mkCanvas(512, 256), g = c.getContext('2d');
  g.fillStyle = 'rgba(5,7,10,.88)'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(6, 6, 500, 244);
  g.fillStyle = color; g.font = '700 26px "JetBrains Mono",monospace'; g.fillText(kick, 28, 52);
  g.fillStyle = '#fff'; fit(g, title, 460, 64, '700 #px "Space Grotesk",sans-serif'); g.fillText(title, 28, 140);
  g.fillStyle = '#8fd8e8'; fit(g, sub, 460, 28, '400 #px "JetBrains Mono",monospace'); g.fillText(sub, 28, 200);
  return tex(c);
}
function sign(t, w, h, x, y, z, ry) {
  var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; scene.add(m); return m;
}
function labelSprite(text, color, scale) {
  var c = mkCanvas(512, 128), g = c.getContext('2d');
  g.fillStyle = 'rgba(5,7,10,.7)'; g.fillRect(8, 24, 496, 80);
  g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(8, 24, 496, 80);
  g.fillStyle = '#fff'; fit(g, text, 470, 40, '700 #px "JetBrains Mono",monospace'); g.textAlign = 'center'; g.fillText(text, 256, 78);
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(scale || 18, (scale || 18) / 4, 1); return s;
}

/* ------------------------------------------------------------ ground & roads */
(function ground() {
  var gc = mkCanvas(128, 128), g = gc.getContext('2d');
  g.fillStyle = '#080a10'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#13212e'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
  var gt = tex(gc, true); gt.repeat.set(100, 100);
  var gp = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ map: gt }));
  gp.rotation.x = -Math.PI / 2; scene.add(gp);

  var rc = mkCanvas(64, 128), r = rc.getContext('2d');
  r.fillStyle = '#10131b'; r.fillRect(0, 0, 64, 128);
  r.fillStyle = '#ffd400'; r.fillRect(2, 0, 3, 128); r.fillRect(59, 0, 3, 128);
  r.fillStyle = '#c9d2e6'; r.fillRect(30, 8, 4, 48); r.fillRect(30, 72, 4, 48);
  r.fillStyle = 'rgba(0,229,255,.06)'; r.fillRect(8, 0, 2, 128); r.fillRect(54, 0, 2, 128);
  var rt = tex(rc, true);
  function road(cx, cz, len, horizontal) {
    var t = rt.clone(); t.needsUpdate = true; t.repeat.set(1, len / 16);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(18, len), new THREE.MeshBasicMaterial({ map: t }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = horizontal ? Math.PI / 2 : 0;
    m.position.set(cx, 0.03, cz); scene.add(m);
  }
  road(0, -150, 340, false);   /* timeline road, north */
  road(58, 0, 116, true);      /* east road */
  road(-48, 0, 96, true);      /* west road */
  road(0, 66, 132, false);     /* south road */
  function disc(x, z, rad, col, op) {
    var m = new THREE.Mesh(new THREE.CircleGeometry(rad, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .04, z); scene.add(m);
    var ring = new THREE.Mesh(new THREE.RingGeometry(rad - .5, rad, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, .05, z); scene.add(ring);
  }
  disc(0, 0, 26, C.y, .07); disc(115, 0, 56, C.c, .05); disc(-100, 0, 24, C.y, .05); disc(0, 125, 52, C.m, .05); disc(-110, 150, 24, C.m, .04);
  /* boundary wire */
  var b = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-185, .1, -380), new THREE.Vector3(185, .1, -380), new THREE.Vector3(185, .1, 195), new THREE.Vector3(-185, .1, 195)]), new THREE.LineBasicMaterial({ color: C.y, transparent: true, opacity: .5 }));
  scene.add(b);
})();

/* street lamps (glow sprites on poles) */
(function lamps() {
  var pole = new THREE.BoxGeometry(.3, 7, .3), pm = new THREE.MeshBasicMaterial({ color: 0x1a2030 });
  function lamp(x, z, col) {
    var p = new THREE.Mesh(pole, pm); p.position.set(x, 3.5, z); scene.add(p);
    glow(col, 9, x, 7.4, z, .75);
  }
  for (var z = 10; z > -310; z -= 30) { lamp(-11, z, C.y); lamp(11, z - 15, C.c); }
  for (var x = 25; x < 108; x += 40) { lamp(x, -11, C.c); lamp(x + 20, 11, C.y); }
  for (var x2 = -25; x2 > -90; x2 -= 40) { lamp(x2, -11, C.y); lamp(x2 - 20, 11, C.c); }
  for (var z2 = 30; z2 < 115; z2 += 30) { lamp(-11, z2, C.m); lamp(11, z2 + 15, C.c); }
})();

/* ------------------------------------------------------------ zones */
var zones = [];
var found = {};
(function () { try { found = JSON.parse(store.get('found') || '{}') || {}; } catch (e) { found = {}; } })();
var unlocked = store.get('unlocked') === '1';

function addZone(o) {
  var col = o.color || C.y;
  var ring = new THREE.Mesh(new THREE.RingGeometry(o.r - .8, o.r, 56), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(o.x, .08, o.z); scene.add(ring);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 36, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(o.x, 18, o.z); scene.add(beam);
  var lab = labelSprite(o.label, HEX[o.cname || 'y'], 20); lab.position.set(o.x, 20, o.z); scene.add(lab);
  o.ring = ring; o.beam = beam; o.lab = lab; o.col = col; zones.push(o); return o;
}

/* --- chapters: timeline road, oldest at the south end, "now" at the tower --- */
var jobsOld = R.jobs.slice().reverse();
var jobPos = [[-30, -60, 24, 22, 38, 'y', 1], [30, -115, 24, 22, 48, 'c', -1], [-30, -170, 26, 24, 58, 'm', 1], [30, -225, 26, 24, 68, 'y', -1], [-30, -278, 26, 24, 78, 'c', 1]];
jobsOld.forEach(function (j, i) {
  var kick = 'CH.0' + (i + 1) + '  ' + j.dates.replace(/ – /, ' → ');
  var lastYear = j.dates.split('–')[0].trim().split('/')[1];
  if (i < jobsOld.length - 1) {
    var p = jobPos[i], side = p[6], acc = p[5];
    building(p[0], p[1], p[2], p[3], p[4], acc);
    var sx = p[0] + side * (p[2] / 2 + .2);
    sign(signTex('CH.0' + (i + 1) + ' · ' + lastYear, j.co.toUpperCase(), j.dates, HEX[acc]), 18, 9, sx, Math.min(p[4] - 7, 26), p[1], side > 0 ? Math.PI / 2 : -Math.PI / 2);
    addZone({ id: 'j' + i, x: side * 8, z: p[1], r: 13, color: C[acc], cname: acc, label: 'CH.0' + (i + 1) + ' · ' + j.co.toUpperCase(), jobIdx: i, cardCls: acc === 'c' ? 'c2' : acc === 'm' ? 'c3' : '' });
  } else {
    building(0, -330, 44, 32, 104, 'y');
    building(-30, -322, 14, 14, 62, 'c'); building(30, -322, 14, 14, 74, 'm');
    sign(signTex('CH.0' + (i + 1) + ' · LATEST', j.co.toUpperCase(), j.dates + ' · CUSTOMER SUCCESS ENG.', HEX.y), 30, 15, 0, 34, -313.8, 0);
    var nowc = mkCanvas(512, 128), g2 = nowc.getContext('2d'); g2.fillStyle = HEX.y; g2.font = '700 96px "Space Grotesk",sans-serif'; g2.textAlign = 'center'; g2.shadowColor = HEX.y; g2.shadowBlur = 24; g2.fillText('LATEST', 256, 100);
    sign(tex(nowc), 26, 6.5, 0, 66, -313.7, 0);
    glow(C.y, 60, 0, 108, -330, .5);
    addZone({ id: 'j' + i, x: 0, z: -304, r: 12, color: C.y, cname: 'y', label: 'CH.0' + (i + 1) + ' · ' + j.co.toUpperCase() + ' · LATEST', jobIdx: i, cardCls: '' });
  }
});

/* --- origin: the plaza --- */
(function () {
  var g = new THREE.Group(); g.position.set(0, 7, 0);
  var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(3, .7, 90, 10), new THREE.MeshBasicMaterial({ color: C.y, wireframe: true }));
  var ico = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5, 1), new THREE.MeshBasicMaterial({ color: C.c, wireframe: true, transparent: true, opacity: .45 }));
  g.add(knot); g.add(ico); scene.add(g); scene.userData.holo = [knot, ico];
  var base = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0x1a2030 })); base.position.y = .6; scene.add(base);
  var bedge = new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), edgeMats.y); bedge.position.y = .6; scene.add(bedge);
  glow(C.y, 24, 0, 7, 0, .5);
  colliders.push({ x: 0, z: 0, r: 4.2 });
  addZone({ id: 'origin', x: 0, z: 0, r: 15, color: C.y, cname: 'y', label: 'START · WHO I AM', cardCls: '' });
})();

/* --- skills pylons + certs ring --- */
var certSlabs = [];
(function () {
  R.skills.forEach(function (s, i) {
    var n = s[1].length, h = 6 + n * 4, x = 150, z = -48 + i * 10, col = [C.c, C.y, C.m][i % 3], hc = [HEX.c, HEX.y, HEX.m][i % 3];
    var m = new THREE.Mesh(new THREE.BoxGeometry(4, h, 4), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, h / 2, z); scene.add(m);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: col })); e.position.copy(m.position); scene.add(e);
    for (var k = 1; k <= n; k++) { var cap = new THREE.Mesh(new THREE.BoxGeometry(4.2, .25, 4.2), new THREE.MeshBasicMaterial({ color: col })); cap.position.set(x, 6 + k * 4 - .1, z); scene.add(cap); }
    var lb = labelSprite(s[0].toUpperCase(), hc, 18); lb.position.set(x, h + 4, z); scene.add(lb);
    glow(col, 14, x, h + 1, z, .7);
    colliders.push({ x: x, z: z, r: 2.8 });
  });
  addZone({ id: 'skills', x: 118, z: -28, r: 12, color: C.c, cname: 'c', label: 'SKILLS · THE TOOLBELT', cardCls: 'c2' });
  R.certs.forEach(function (c, i) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4, .3), new THREE.MeshBasicMaterial({ color: C.c, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }));
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: i % 3 === 0 ? C.y : C.c })); m.add(e);
    scene.add(m); certSlabs.push(m);
  });
  addZone({ id: 'certs', x: 118, z: 36, r: 10, color: C.m, cname: 'm', label: 'CERTIFICATIONS', cardCls: 'c3' });
})();

/* --- education campus --- */
(function () {
  var hs = [14, 10, 18], zs = [-28, 0, 28], accs = ['c', 'y', 'm'];
  R.edu.forEach(function (e, i) {
    building(-130, zs[i], 14, 18, hs[i], accs[i]);
    sign(signTex('EDU · ' + e[1].split('–')[0].trim(), e[0].toUpperCase(), e[2], HEX[accs[i]]), 14, 7, -122.8, hs[i] - 3.5, zs[i], Math.PI / 2);
  });
  addZone({ id: 'edu', x: -98, z: 0, r: 12, color: C.y, cname: 'y', label: 'EDUCATION · LANGUAGES', cardCls: '' });
})();

/* --- art gallery --- */
var artPieces = [];
(function () {
  function ctxArt(size) { var c = mkCanvas(size, size); return { c: c, g: c.getContext('2d') }; }
  function title(g, t) { g.fillStyle = 'rgba(5,7,10,.8)'; g.fillRect(0, 232, 256, 24); g.fillStyle = '#fff'; g.font = '700 12px "JetBrains Mono",monospace'; g.fillText(t, 8, 249); }
  var defs = [];
  /* 1 flow field */
  defs.push({ name: 'SIGNAL / NOISE', draw: function (g) {
    g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 700; i++) {
      var x = rnd() * 256, y = rnd() * 256; g.beginPath(); g.moveTo(x, y);
      for (var s = 0; s < 22; s++) { var a = Math.sin(x * .021) * 3 + Math.cos(y * .019) * 3 + Math.sin((x + y) * .008) * 2; x += Math.cos(a) * 2.2; y += Math.sin(a) * 2.2; g.lineTo(x, y); }
      g.strokeStyle = ['#00e5ff', '#ff2e88', '#ffd400'][i % 3]; g.globalAlpha = .55; g.lineWidth = 1; g.stroke();
    } g.globalAlpha = 1; title(g, 'SIGNAL / NOISE'); } });
  /* 2 rings (animated) */
  defs.push({ name: 'PULSE', anim: true, draw: function (g, t) {
    g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 14; i++) { var r = Math.abs((i * 10 + Math.max(0, t) * 30) % 140); g.beginPath(); g.arc(128, 116, r, 0, 6.283); g.strokeStyle = i % 2 ? '#ffd400' : '#ff2e88'; g.globalAlpha = 1 - r / 140; g.lineWidth = 2; g.stroke(); }
    g.globalAlpha = 1; title(g, 'PULSE'); } });
  /* 3 glitch bars (animated) */
  defs.push({ name: 'PACKET LOSS', anim: true, draw: function (g, t) {
    g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 256);
    var sd = Math.floor(t * 6);
    for (var i = 0; i < 26; i++) { var h = 4 + ((i * 7 + sd * 13) % 17), y = (i * 9.7) % 232, off = Math.sin(i * 12.9 + sd) * 40; g.fillStyle = ['#00e5ff', '#ff2e88', '#ffd400'][(i + sd) % 3]; g.globalAlpha = .75; g.fillRect(60 + off, y, 80 + ((i * 31 + sd * 7) % 90), h); }
    g.globalAlpha = 1; title(g, 'PACKET LOSS'); } });
  /* 4 code rain (animated) */
  var cols = []; for (var q = 0; q < 22; q++) cols.push(rnd() * 256);
  defs.push({ name: 'RAIN.EXE', anim: true, draw: function (g, t) {
    g.fillStyle = 'rgba(5,7,10,.35)'; g.fillRect(0, 0, 256, 256); g.font = '12px "JetBrains Mono",monospace';
    for (var i = 0; i < 22; i++) { var y = (cols[i] + t * (30 + i * 4)) % 270; g.fillStyle = i % 5 ? '#00e5ff' : '#ffd400'; g.fillText(String.fromCharCode(0x30A0 + ((i * 7 + Math.floor(y / 12)) % 90)), i * 11.6 + 2, y); }
    g.fillStyle = '#05070a'; g.fillRect(0, 232, 256, 24); title(g, 'RAIN.EXE'); } });
  /* 5 lissajous (animated trails) */
  defs.push({ name: 'LISSAJOUS', anim: true, trail: true, draw: function (g, t) {
    g.fillStyle = 'rgba(5,7,10,.07)'; g.fillRect(0, 0, 256, 232);
    for (var k = 0; k < 3; k++) { var a = t * (.8 + k * .3); var x = 128 + Math.sin(a * 3 + k) * 100, y = 116 + Math.sin(a * 4) * 90; g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.fillStyle = ['#ffd400', '#00e5ff', '#ff2e88'][k]; g.fill(); }
    g.fillStyle = '#05070a'; g.fillRect(0, 232, 256, 24); title(g, 'LISSAJOUS'); } });
  /* 6 fractal tree */
  defs.push({ name: 'ROOT / BRANCH', draw: function (g) {
    g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 256);
    (function br(x, y, a, l, d) { if (d > 9) return; var x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.strokeStyle = d < 3 ? '#ffd400' : d < 6 ? '#ff2e88' : '#00e5ff'; g.lineWidth = 3 - d * .28; g.stroke(); br(x2, y2, a - .42 - rnd() * .1, l * .78, d + 1); br(x2, y2, a + .42 + rnd() * .1, l * .78, d + 1); })(128, 225, -Math.PI / 2, 46, 0);
    title(g, 'ROOT / BRANCH'); } });

  var cx = 0, cz = 125, rad = 36;
  defs.forEach(function (d, i) {
    var a = (20 + i * 28) * Math.PI / 180, px = cx + Math.cos(a) * rad, pz = cz + Math.sin(a) * rad;
    var cv = ctxArt(256); d.g = cv.g; d.tex = tex(cv.c); d.draw(d.g, 0); d.tex.needsUpdate = true;
    var grp = new THREE.Group(); grp.position.set(px, 0, pz); grp.rotation.y = Math.atan2(cx - px, cz - pz);
    var ped = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 3), new THREE.MeshBasicMaterial({ color: 0x151a26 })); ped.position.y = 2; grp.add(ped);
    var frame = new THREE.Mesh(new THREE.BoxGeometry(14.8, 14.8, .4), new THREE.MeshBasicMaterial({ color: 0x0d1018 })); frame.position.y = 11.5; grp.add(frame);
    var art = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: d.tex })); art.position.set(0, 11.5, .5); grp.add(art);
    var ed = new THREE.LineSegments(new THREE.EdgesGeometry(frame.geometry), new THREE.LineBasicMaterial({ color: [C.c, C.y, C.m][i % 3] })); ed.position.y = 11.5; grp.add(ed);
    scene.add(grp); glow([C.c, C.y, C.m][i % 3], 26, px + (px - cx) / rad * 4, 11.5, pz + (pz - cz) / rad * 4, .4);
    colliders.push({ x: px, z: pz, r: 2.4 });
    artPieces.push(d);
  });
  addZone({ id: 'gallery', x: 0, z: 125, r: 15, color: C.m, cname: 'm', label: 'THE GALLERY · ART × CYBER', cardCls: 'c3' });
})();

/* --- decoder terminal (the puzzle) --- */
var SECRET = 'SOAR-EVERYTHING';
var PACKET = btoa(SECRET);
(function () {
  var g = new THREE.Group(); g.position.set(24, 0, 100);
  var body = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 3), new THREE.MeshBasicMaterial({ color: 0x131824 })); body.position.y = 3.5; g.add(body);
  var c = mkCanvas(256, 192), x = c.getContext('2d'); x.fillStyle = '#021012'; x.fillRect(0, 0, 256, 192); x.fillStyle = '#00e5ff'; x.font = '700 20px "JetBrains Mono",monospace';
  x.fillText('> DECODER', 14, 38); x.font = '13px "JetBrains Mono",monospace'; x.fillStyle = '#5dffb0'; x.fillText(PACKET.slice(0, 14), 14, 76); x.fillText(PACKET.slice(14), 14, 96); x.fillStyle = '#ffd400'; x.fillText('base64 -d _', 14, 140);
  var scr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.1), new THREE.MeshBasicMaterial({ map: tex(c) })); scr.position.set(0, 4.6, 1.52); g.add(scr);
  var ed = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), edgeMats.c); ed.position.y = 3.5; g.add(ed);
  scene.add(g); glow(C.c, 16, 24, 5, 102, .6);
  colliders.push({ x: 24, z: 100, hw: 2.5, hd: 1.5 });
  addZone({ id: 'terminal', x: 24, z: 108, r: 7, color: C.c, cname: 'c', label: 'TERMINAL', cardCls: 'c2', secret: true });
})();

/* --- contact garage (hidden until the terminal is solved) --- */
var gate, gateBox, gateCollider, garageSign, garageSignOK, garageZone;
(function () {
  var cxg = -110, czg = 150, A = 'm';
  building(-130, czg, 2, 30, 4, A, false); building(-90, czg, 2, 30, 4, A, false); building(cxg, 165, 42, 2, 4, A, false);
  building(-123, 135, 14, 2, 4, A, false); building(-97, 135, 14, 2, 4, A, false);
  var gm = new THREE.MeshBasicMaterial({ color: 0x2a0f1c });
  gate = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 1.2), gm); gate.position.set(cxg, 2, 135); scene.add(gate);
  gate.add(new THREE.LineSegments(new THREE.EdgesGeometry(gate.geometry), edgeMats.m));
  gateCollider = { x: cxg, z: 135, hw: 6, hd: .8, off: false }; colliders.push(gateCollider);
  var c = mkCanvas(512, 128), g = c.getContext('2d');
  function sg(txt, col, bg) { g.clearRect(0, 0, 512, 128); g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(5, 5, 502, 118); g.fillStyle = col; g.textAlign = 'center'; g.font = '700 44px "JetBrains Mono",monospace'; g.fillText(txt, 256, 82); return tex(c); }
  garageSign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: sg('RESTRICTED', '#ff2e88', '#16060d'), transparent: true }));
  garageSign.position.set(cxg, 7, 134.2); garageSign.rotation.y = Math.PI; scene.add(garageSign);
  var s2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: sg('CONTACT · OPEN', '#5dffb0', '#04130c'), transparent: true }));
  s2.position.set(cxg, 7, 136.2); s2.visible = false; scene.add(s2); garageSignOK = s2;
  glow(C.m, 18, cxg, 7, 133, .5);
  /* interior: floor, parked cars */
  var fl = new THREE.Mesh(new THREE.PlaneGeometry(38, 28), new THREE.MeshBasicMaterial({ color: 0x1a0612, transparent: true, opacity: .8 })); fl.rotation.x = -Math.PI / 2; fl.position.set(cxg, .06, czg); scene.add(fl);
  var pc = makeCar(0xff2e88, C.c); pc.position.set(-122, 0, 158); pc.rotation.y = .5; scene.add(pc);
  var pc2 = makeCar(0x00e5ff, C.y); pc2.position.set(-98, 0, 158); pc2.rotation.y = -.4; scene.add(pc2);
  colliders.push({ x: -122, z: 158, r: 2.4 }); colliders.push({ x: -98, z: 158, r: 2.4 });
  garageZone = addZone({ id: 'garage', x: cxg, z: 148, r: 10, color: C.m, cname: 'm', label: 'THE GARAGE · CONTACT', cardCls: 'c3', secret: true });
})();

/* ------------------------------------------------------------ filler city */
(function fillers() {
  var ex = [ /* rect exclusions: x0,x1,z0,z1 */
    [-52, 52, -350, 36], [0, 190, -22, 22], [-190, 0, -22, 22], [-22, 22, 0, 200], [-155, -70, 112, 190]
  ];
  var circ = [[0, 0, 44], [115, 0, 72], [-102, 0, 40], [0, 125, 60]];
  function blocked(x, z, w, d) {
    var hw = w / 2 + 6, hd = d / 2 + 6, i;
    for (i = 0; i < ex.length; i++) { var e = ex[i]; if (x + hw > e[0] && x - hw < e[1] && z + hd > e[2] && z - hd < e[3]) return true; }
    for (i = 0; i < circ.length; i++) { var c = circ[i]; if (Math.hypot(x - c[0], z - c[1]) < c[2] + Math.max(w, d) / 2) return true; }
    return false;
  }
  var accs = ['y', 'c', 'm', 'c', 'y', 'm', 'c'];
  for (var x = -172; x <= 172; x += 30) for (var z = -340; z <= 182; z += 30) {
    if (rnd() < .22) continue;
    var px = x + (rnd() - .5) * 10, pz = z + (rnd() - .5) * 10, w = 11 + rnd() * 10, d = 11 + rnd() * 10;
    if (Math.abs(px) > 176 || pz < -372 || pz > 188) continue;
    if (blocked(px, pz, w, d)) continue;
    var dist = Math.hypot(px, pz), h = 10 + rnd() * 26 + Math.min(30, dist * .08);
    building(px, pz, w, d, h, accs[Math.floor(rnd() * accs.length)], rnd() < .35);
  }
})();

/* ------------------------------------------------------------ car */
function makeCar(bodyHex, glowHex) {
  var g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); g.userData.inner = inner;
  var lam = function (c) { return new THREE.MeshLambertMaterial({ color: c }); };
  var body = new THREE.Mesh(new THREE.BoxGeometry(2.1, .7, 4.3), lam(bodyHex)); body.position.y = .75; inner.add(body);
  var hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, .35, 1.4), lam(bodyHex)); hood.position.set(0, 1.0, -1.35); inner.add(hood);
  var cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, .62, 2.0), new THREE.MeshLambertMaterial({ color: 0x0b1018 })); cab.position.set(0, 1.35, .35); inner.add(cab);
  var wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, .1, .5), lam(0x0b1018)); wing.position.set(0, 1.55, 1.95); inner.add(wing);
  var stripe = new THREE.Mesh(new THREE.BoxGeometry(.5, .02, 4.31), new THREE.MeshBasicMaterial({ color: 0x07080b })); stripe.position.set(0, 1.115, 0); inner.add(stripe);
  var tl = new THREE.MeshBasicMaterial({ color: C.m }), hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  [-.75, .75].forEach(function (x) {
    var t = new THREE.Mesh(new THREE.BoxGeometry(.5, .18, .1), tl); t.position.set(x, .85, 2.17); inner.add(t);
    var h = new THREE.Mesh(new THREE.BoxGeometry(.5, .18, .1), hl); h.position.set(x, .85, -2.17); inner.add(h);
  });
  var wm = new THREE.MeshLambertMaterial({ color: 0x050608 }), wg = new THREE.CylinderGeometry(.45, .45, .4, 14); wg.rotateZ(Math.PI / 2);
  g.userData.wheels = [];
  [[-1.1, -1.4], [1.1, -1.4], [-1.1, 1.4], [1.1, 1.4]].forEach(function (p, i) {
    var piv = new THREE.Group(); piv.position.set(p[0], .45, p[1]);
    var w = new THREE.Mesh(wg, wm); piv.add(w); inner.add(piv); g.userData.wheels.push({ piv: piv, w: w, front: i < 2 });
  });
  var ug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.4), new THREE.MeshBasicMaterial({ map: glowTex, color: glowHex, blending: THREE.AdditiveBlending, transparent: true, opacity: .9, depthWrite: false }));
  ug.rotation.x = -Math.PI / 2; ug.position.y = .08; g.add(ug);
  return g;
}
var car = { x: 0, z: 26, h: 0, vx: 0, vz: 0, steer: 0, vf: 0, vr: 0 };
var carMesh = makeCar(C.y, C.c); scene.add(carMesh);
var cone = new THREE.Mesh(new THREE.PlaneGeometry(9, 22), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xfff2b0, blending: THREE.AdditiveBlending, transparent: true, opacity: .32, depthWrite: false }));
cone.rotation.x = -Math.PI / 2; cone.position.set(0, .1, -13); carMesh.add(cone);
var flame = [-.6, .6].map(function (x) {
  var f = new THREE.Mesh(new THREE.ConeGeometry(.28, 1.8, 8), new THREE.MeshBasicMaterial({ color: C.y, blending: THREE.AdditiveBlending, transparent: true, opacity: .9 }));
  f.rotation.x = Math.PI / 2; f.position.set(x, .8, 3.1); f.visible = false; carMesh.userData.inner.add(f); return f;
});
carMesh.position.set(car.x, 0, car.z);
var carGlow = glow(C.c, 7, car.x, .5, car.z, .6);

/* sparks */
var SP = 90, spPos = new Float32Array(SP * 3), spVel = [], spLife = new Float32Array(SP);
for (var si = 0; si < SP; si++) { spVel.push([0, 0, 0]); spPos[si * 3 + 1] = -100; }
var spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
var sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffb020, size: .6, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
sparks.frustumCulled = false; scene.add(sparks);
var spHead = 0;
function emit(x, y, z, vx, vy, vz) { var i = spHead++ % SP; spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z; spVel[i][0] = vx; spVel[i][1] = vy; spVel[i][2] = vz; spLife[i] = .5 + rnd() * .35; }

/* rain */
var RN = 520, rainA = new Float32Array(RN * 6), rainB = [];
for (var ri = 0; ri < RN; ri++) rainB.push([rnd() * 100, rnd() * 50, rnd() * 100, 40 + rnd() * 25]);
var rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainA, 3));
var rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: .32 }));
rain.frustumCulled = false; scene.add(rain);

/* ------------------------------------------------------------ input */
var keys = {}, touch = {};
function typing() { var a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); }
var KMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'brake' };
var started = false;
window.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { if (resumeOpen) closeResume(); else if (typing()) document.activeElement.blur(); else dismissCard(); return; }
  if (typing()) return;
  if (!started && !resumeOpen && (e.key === 'Enter')) { startGame(); e.preventDefault(); return; }
  if (resumeOpen) return;
  var k = KMAP[e.code];
  if (k) { keys[k] = true; e.preventDefault(); if (!started) startGame(); }
  if (e.code === 'KeyR') resetCar();
  if (e.code === 'KeyM') toggleSound();
});
window.addEventListener('keyup', function (e) { var k = KMAP[e.code]; if (k) keys[k] = false; });
window.addEventListener('blur', function () { keys = {}; });
var isTouch = ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
Array.prototype.forEach.call(document.querySelectorAll('#touch button'), function (b) {
  var k = b.getAttribute('data-k');
  var on = function (e) { touch[k] = true; b.classList.add('on'); e.preventDefault(); };
  var off = function (e) { touch[k] = false; b.classList.remove('on'); e.preventDefault(); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
function inp(k) { return !!(keys[k] || touch[k]); }

/* ------------------------------------------------------------ audio */
var ac, o1, o2, filt, eg, soundOn = false;
function initAudio() {
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    o1 = ac.createOscillator(); o1.type = 'sawtooth'; o2 = ac.createOscillator(); o2.type = 'square';
    filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
    eg = ac.createGain(); eg.gain.value = 0;
    o1.connect(filt); o2.connect(filt); filt.connect(eg); eg.connect(ac.destination); o1.start(); o2.start();
  } catch (e) { ac = null; }
}
function toggleSound() {
  soundOn = !soundOn; if (soundOn && !ac) initAudio();
  if (ac) { if (soundOn) ac.resume(); else eg.gain.setTargetAtTime(0, ac.currentTime, .05); }
  var b = $('#snd'); b.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF'; b.setAttribute('aria-pressed', soundOn);
}
$('#snd').onclick = function () { toggleSound(); this.blur(); };
function chime(f, dur) {
  if (!soundOn || !ac) return; var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
  var t = ac.currentTime; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + (dur || .35)); o.start(t); o.stop(t + (dur || .35) + .05);
}
function engine(speed, thr, boosting) {
  if (!soundOn || !ac) return; var t = ac.currentTime;
  o1.frequency.setTargetAtTime(46 + speed * 4.1 + (boosting ? 22 : 0), t, .06); o2.frequency.setTargetAtTime(23 + speed * 2.05, t, .06);
  filt.frequency.setTargetAtTime(300 + speed * 38 + (boosting ? 500 : 0), t, .08); eg.gain.setTargetAtTime(.025 + thr * .035 + speed * .0008, t, .08);
}

/* ------------------------------------------------------------ cards */
var cardEl = $('#card'), activeZone = null, dismissed = null, toastTimer = 0;
function lvl(n) { var s = ''; for (var i = 0; i < 5; i++) s += '<i class="' + (i < n ? 'f' : '') + '"></i>'; return '<span>' + s + '</span>'; }
var CH = ['', '', '', '', ''];
function cardHTML(z) {
  var h = '<button class="x" aria-label="Close">×</button>';
  if (z.id === 'origin') {
    return h + '<div class="k">// ORIGIN · WHO I AM</div><h2>' + esc(R.name) + '</h2><div class="m">' + esc(R.title) + '</div><p>' + esc(R.summary) + '</p>' +
      '<div class="fine">Follow the north road for the career timeline, east for skills &amp; certs, west for education, south for the gallery. Something in this city is locked.</div>';
  }
  if (z.jobIdx != null) {
    var j = jobsOld[z.jobIdx];
    return h + '<div class="k">// CHAPTER 0' + (z.jobIdx + 1) + ' OF 0' + jobsOld.length + (z.jobIdx === jobsOld.length - 1 ? ' · LATEST' : '') + '</div><h2>' + esc(j.role) + '</h2><div class="m">' + esc(j.co) + ' · ' + esc(j.dates) + '<br>' + esc(j.loc) + '</div><p>' + esc(j.text) + '</p>';
  }
  if (z.id === 'skills') {
    return h + '<div class="k">// SKILLS · THE TOOLBELT</div><h2>SOC to SOAR to customers</h2>' + R.skills.map(function (s) { return '<div class="lvl"><span><b>' + esc(s[0]) + '</b><br><small>' + esc(s[1].join(' · ')) + '</small></span></div>'; }).join('') +
      '<div class="fine">One pylon per category, one block per tool.</div>';
  }
  if (z.id === 'certs') {
    return h + '<div class="k">// CERTIFICATIONS · ' + R.certs.length + '</div><h2>Credentials</h2><ul>' + R.certs.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';
  }
  if (z.id === 'edu') {
    return h + '<div class="k">// EDUCATION</div><h2>Computer science × applied physics</h2><ul>' + R.edu.map(function (e) { return '<li>' + esc(e[0]) + ' — ' + esc(e[2]) + '<small>' + esc(e[1]) + '</small></li>'; }).join('') +
      '</ul><div class="k" style="margin-top:14px">// LANGUAGES</div><ul>' + R.langs.map(function (l) { return '<li>' + esc(l[0]) + '<small>' + esc(l[1]) + '</small></li>'; }).join('') + '</ul>';
  }
  if (z.id === 'gallery') {
    return h + '<div class="k">// THE GALLERY</div><h2>Art × cyber</h2><p>Six pieces, all generated by code in your browser: flow fields, glitch, rain, trails, a fractal tree. Pattern and noise, signal and detection: the same eye, two canvases.</p>' +
      '<div class="fine">A terminal glows cyan near the south-east corner of the gallery. Analysts decode things.</div>';
  }
  if (z.id === 'terminal') {
    if (unlocked) return h + '<div class="k">// DECODER</div><h2>Access granted</h2><p class="ok">The garage door is open: west of the gallery. Contact lives there.</p>';
    return h + '<div class="k">// DECODER · ENCRYPTED PACKET</div><h2>Decode it, enter the passphrase</h2><div class="pk">' + esc(PACKET) + '</div>' +
      '<input id="pw" type="text" autocomplete="off" spellcheck="false" placeholder="passphrase, then Enter" aria-label="passphrase"><div id="pwmsg" class="fine">Click the field to type (Esc returns to driving). Hint: every analyst&#39;s first decode.</div>';
  }
  if (z.id === 'garage') {
    return h + '<div class="k">// THE GARAGE · CONTACT</div><h2>Let&#39;s talk</h2><p>Thanks for finding the door. Security automation, incident response, and building things that look as good as they run. Email me, and add me on LinkedIn.</p>' +
      '<div class="row"><a class="btn go" href="mailto:' + esc(R.email) + '">Email</a><a class="btn ghost" href="' + esc(R.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a><a class="btn ghost" href="' + esc(R.github) + '" target="_blank" rel="noopener">GitHub</a><button class="btn ghost" id="rsOpen">Plain résumé</button></div>';
  }
  return h;
}
function showCard(z) {
  cardEl.className = 'card ' + (z.cardCls || ''); cardEl.innerHTML = cardHTML(z); cardEl.hidden = false;
  var x = cardEl.querySelector('.x'); if (x) x.onclick = dismissCard;
  var pw = cardEl.querySelector('#pw'); if (pw) pw.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') { pw.blur(); return; } if (e.key === 'Enter') trySecret(pw.value); });
  var ro = cardEl.querySelector('#rsOpen'); if (ro) ro.onclick = openResume;
}
function dismissCard() { if (activeZone) dismissed = activeZone.id; cardEl.hidden = true; }
function toast(msg, cls) { var t = $('#toast'); t.textContent = msg; t.className = 'toast ' + (cls || ''); t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2800); }
function trySecret(v) {
  var msg = $('#pwmsg');
  if (String(v).trim().toUpperCase() === SECRET) { unlock(true); showCard(activeZone); }
  else if (msg) { msg.className = 'fine bad'; msg.textContent = 'ACCESS DENIED. Decode the packet first (base64).'; }
}
function unlock(fresh) {
  unlocked = true; store.set('unlocked', '1'); gateCollider.off = true; garageSign.visible = false; garageSignOK.visible = true;
  if (fresh) { toast('ACCESS GRANTED · GARAGE DOOR OPEN', 'm'); chime(660, .25); setTimeout(function () { chime(990, .4); }, 160); }
}
if (unlocked) { gateCollider.off = true; garageSign.visible = false; garageSignOK.visible = true; gate.position.y = -3; }

/* discovered chips */
var CHAPTERS = zones.filter(function (z) { return z.id !== 'terminal'; });
function renderDisc() {
  var n = CHAPTERS.filter(function (z) { return found[z.id]; }).length;
  $('#disc').innerHTML = '<em>CHAPTERS ' + n + '/' + CHAPTERS.length + '</em>' + CHAPTERS.map(function (z) {
    return '<i class="' + (found[z.id] ? 'on ' : '') + (z.secret ? 'sec' : '') + '" title="' + (found[z.id] || !z.secret ? esc(z.label) : '???') + '"></i>';
  }).join('');
}
renderDisc();

/* ------------------------------------------------------------ physics */
var boostE = 1, CR = 1.6;
function resetCar() { car.x = 0; car.z = 26; car.h = 0; car.vx = car.vz = 0; car.steer = 0; }
function physics(dt) {
  var up = inp('up'), dn = inp('down'), brake = inp('brake'), bst = inp('boost') && boostE > .02;
  var steerIn = (inp('right') ? 1 : 0) - (inp('left') ? 1 : 0);
  car.steer += (steerIn - car.steer) * Math.min(1, dt * 9);
  var fx = Math.sin(car.h), fz = -Math.cos(car.h), vf = car.vx * fx + car.vz * fz, sp = Math.abs(vf);
  var turn = car.steer * 2.4 * Math.min(1, sp / 6) / (1 + sp / 50) * (brake ? 1.55 : 1);
  car.h += turn * dt * (vf >= -.3 ? 1 : -1);
  fx = Math.sin(car.h); fz = -Math.cos(car.h);
  var rx = Math.cos(car.h), rz = Math.sin(car.h);
  vf = car.vx * fx + car.vz * fz; var vr = car.vx * rx + car.vz * rz;
  var maxF = bst ? 58 : 36, accel = bst ? 62 : 32;
  if (up) { if (vf < maxF) vf = Math.min(maxF, vf + accel * dt); }
  else if (dn) vf -= (vf > 0 ? 72 : 20) * dt;
  else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 8 * dt);
  if (vf < -14) vf = -14; if (vf > maxF) vf -= 38 * dt;
  vr *= Math.exp(-(brake ? 1.5 : 8.5) * dt);
  if (brake) vf *= Math.exp(-.8 * dt);
  vf *= Math.exp(-.1 * dt);
  car.vf = vf; car.vr = vr;
  car.vx = fx * vf + rx * vr; car.vz = fz * vf + rz * vr;
  car.x += car.vx * dt; car.z += car.vz * dt;
  /* boost energy */
  if (bst && up && sp > 3) boostE = Math.max(0, boostE - dt * .45); else boostE = Math.min(1, boostE + dt * .18);
  car.boosting = bst && up && sp > 3;
  /* collisions */
  for (var i = 0; i < colliders.length; i++) {
    var o = colliders[i]; if (o.off) continue;
    var nx = 0, nz = 0, pen = 0;
    if (o.r) {
      var dx = car.x - o.x, dz = car.z - o.z, d = Math.hypot(dx, dz), mn = o.r + CR;
      if (d < mn) { if (d < 1e-4) { dx = 1; dz = 0; d = 1; } nx = dx / d; nz = dz / d; pen = mn - d; }
    } else {
      if (Math.abs(car.x - o.x) > o.hw + CR || Math.abs(car.z - o.z) > o.hd + CR) continue;
      var cx = clamp(car.x, o.x - o.hw, o.x + o.hw), cz = clamp(car.z, o.z - o.hd, o.z + o.hd);
      var ddx = car.x - cx, ddz = car.z - cz, d2 = ddx * ddx + ddz * ddz;
      if (d2 < CR * CR) {
        if (d2 > 1e-6) { var dd = Math.sqrt(d2); nx = ddx / dd; nz = ddz / dd; pen = CR - dd; }
        else { var ox = o.hw - Math.abs(car.x - o.x), oz = o.hd - Math.abs(car.z - o.z); if (ox < oz) { nx = car.x >= o.x ? 1 : -1; pen = ox + CR; } else { nz = car.z >= o.z ? 1 : -1; pen = oz + CR; } }
      }
    }
    if (pen > 0) {
      car.x += nx * pen; car.z += nz * pen;
      var vn = car.vx * nx + car.vz * nz;
      if (vn < 0) { car.vx -= (1.28) * vn * nx; car.vz -= (1.28) * vn * nz; car.vx *= .96; car.vz *= .96; if (vn < -9) { chime(110, .12); for (var s = 0; s < 8; s++) emit(car.x - nx * CR, 1, car.z - nz * CR, nx * 6 + (rnd() - .5) * 8, 3 + rnd() * 4, nz * 6 + (rnd() - .5) * 8); } }
    }
  }
  /* world bounds */
  if (car.x < -183) { car.x = -183; car.vx = Math.max(0, car.vx) * .5; } if (car.x > 183) { car.x = 183; car.vx = Math.min(0, car.vx) * .5; }
  if (car.z < -378) { car.z = -378; car.vz = Math.max(0, car.vz) * .5; } if (car.z > 193) { car.z = 193; car.vz = Math.min(0, car.vz) * .5; }
  /* sparks: drift + boost */
  var slip = Math.abs(vr);
  if ((slip > 6 || car.boosting) && Math.abs(vf) > 5) for (var q = 0; q < 2; q++) {
    emit(car.x - fx * 2 + rx * (q ? .9 : -.9), .25, car.z - fz * 2 + rz * (q ? .9 : -.9), -fx * 2 + (rnd() - .5) * 3, 1 + rnd() * 2.5, -fz * 2 + (rnd() - .5) * 3);
  }
  engine(sp, up ? 1 : 0, car.boosting);
}

/* ------------------------------------------------------------ main loop */
var camH = 0, camPos = new THREE.Vector3(0, 8, 42), camLook = new THREE.Vector3(), freeCam = null, tAcc = 0, frameN = 0, last = performance.now(), introT = 0;
var hintT = 0;
function angDiff(a, b) { var d = (a - b + Math.PI) % (Math.PI * 2); if (d < 0) d += Math.PI * 2; return d - Math.PI; }

function updateZones(dt, t) {
  var best = null, bd = 1e9;
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    var vis = !z.secret || z.id === 'terminal' || unlocked; /* terminal visible always; garage after unlock */
    z.ring.visible = z.beam.visible = z.lab.visible = vis;
    if (!vis) continue;
    var pulse = 1 + Math.sin(t * 3 + i) * .02; z.ring.scale.set(pulse, pulse, 1);
    var done = !!found[z.id]; z.beam.material.opacity = done ? .16 : .42; z.ring.material.opacity = done ? .35 : .85;
    z.lab.position.y = 20 + Math.sin(t * 1.6 + i) * .6;
    var d = Math.hypot(car.x - z.x, car.z - z.z);
    if (d < z.r && d < bd) { best = z; bd = d; }
  }
  if (best !== activeZone) {
    activeZone = best; dismissed = null;
    if (best) {
      if (!found[best.id] && best.id !== 'terminal') { found[best.id] = 1; store.set('found', JSON.stringify(found)); renderDisc(); toast('CHAPTER DISCOVERED · ' + best.label); chime(520, .22); setTimeout(function () { chime(780, .3); }, 120); }
      else chime(440, .15);
      showCard(best);
    } else { cardEl.hidden = true; }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  var dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; tAcc += dt; frameN++;
  var t = tAcc;
  if (started && !resumeOpen) physics(dt);
  else if (!started) { car.vx = car.vz = 0; }
  /* car visuals */
  carMesh.position.set(car.x, 0, car.z); carMesh.rotation.y = -car.h;
  var inner = carMesh.userData.inner, spd = Math.abs(car.vf);
  inner.rotation.z += (-car.steer * Math.min(spd / 40, 1) * .09 - inner.rotation.z) * Math.min(1, dt * 8);
  carMesh.userData.wheels.forEach(function (w) { w.w.rotation.x += car.vf * dt / .45; if (w.front) w.piv.rotation.y = -car.steer * .45; });
  flame.forEach(function (f) { f.visible = !!car.boosting; if (f.visible) { f.scale.y = .8 + Math.random() * .7; } });
  carGlow.position.set(car.x, .5, car.z);
  /* camera */
  var sp = Math.hypot(car.vx, car.vz);
  if (freeCam) { camera.position.set(freeCam.p[0], freeCam.p[1], freeCam.p[2]); camera.lookAt(freeCam.l[0], freeCam.l[1], freeCam.l[2]); if (freeCam.fov) { camera.fov = freeCam.fov; camera.updateProjectionMatrix(); } }
  else if (!started) {
    introT += dt; var a = introT * .12 + .6;
    camPos.set(car.x + Math.sin(a) * 17, 5.5, car.z + Math.cos(a) * 17); camera.position.lerp(camPos, 1); camera.lookAt(car.x, 2, car.z - 6);
  } else {
    camH += angDiff(car.h, camH) * Math.min(1, dt * 3.4); /* ease toward heading */
    var back = 12.5 + sp * .13, hgt = 6.2 + sp * .05;
    camPos.x += (car.x - Math.sin(camH) * back - camPos.x) * Math.min(1, dt * 7);
    camPos.z += (car.z + Math.cos(camH) * back - camPos.z) * Math.min(1, dt * 7);
    camPos.y += (hgt - camPos.y) * Math.min(1, dt * 4);
    var shake = car.boosting ? .12 : 0;
    camera.position.set(camPos.x + (Math.random() - .5) * shake, camPos.y, camPos.z + (Math.random() - .5) * shake);
    camera.lookAt(car.x + Math.sin(camH) * 6, 1.6, car.z - Math.cos(camH) * 6);
    var fov = 60 + sp * .28 + (car.boosting ? 6 : 0); if (Math.abs(fov - camera.fov) > .15) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  }
  /* world animation */
  var holo = scene.userData.holo; holo[0].rotation.y = t * .6; holo[0].rotation.x = t * .3; holo[1].rotation.y = -t * .25; holo[1].rotation.z = t * .15;
  certSlabs.forEach(function (m, i) {
    var a = t * .22 + i / certSlabs.length * Math.PI * 2; m.position.set(118 + Math.cos(a) * 14, 5 + Math.sin(t + i) * .6, 36 + Math.sin(a) * 14); m.rotation.y = -a + Math.PI / 2;
  });
  if (gate && unlocked && gate.position.y > -3) gate.position.y -= dt * 3;
  if (frameN % 3 === 0) artPieces.forEach(function (d) { if (d.anim) { d.draw(d.g, t); d.tex.needsUpdate = true; } });
  /* rain + sparks */
  var cx = camera.position.x, cz = camera.position.z, cy = camera.position.y;
  for (var i = 0; i < RN; i++) {
    var b = rainB[i]; b[1] -= b[3] * dt; if (b[1] < 0) b[1] += 50;
    var wx = cx + (((b[0] - cx) % 100) + 150) % 100 - 50, wz = cz + (((b[2] - cz) % 100) + 150) % 100 - 50, wy = b[1];
    rainA[i * 6] = wx; rainA[i * 6 + 1] = wy; rainA[i * 6 + 2] = wz; rainA[i * 6 + 3] = wx - .12; rainA[i * 6 + 4] = wy - 1.5; rainA[i * 6 + 5] = wz + .05;
  }
  rainGeo.attributes.position.needsUpdate = true;
  for (var s = 0; s < SP; s++) { if (spLife[s] > 0) { spLife[s] -= dt; spPos[s * 3] += spVel[s][0] * dt; spPos[s * 3 + 1] += spVel[s][1] * dt; spPos[s * 3 + 2] += spVel[s][2] * dt; spVel[s][1] -= 12 * dt; if (spPos[s * 3 + 1] < 0 || spLife[s] <= 0) { spPos[s * 3 + 1] = -100; spLife[s] = 0; } } }
  spGeo.attributes.position.needsUpdate = true;
  updateZones(dt, t);
  /* HUD */
  if (frameN % 4 === 0) {
    $('#spd').textContent = Math.round(sp * 3.6); $('#bst').style.width = (boostE * 100) + '%'; drawMini();
  }
  renderer.render(scene, camera);
}

/* ------------------------------------------------------------ minimap */
var mm = $('#mini'), mg = mm.getContext('2d');
function drawMini() {
  var S = 176, sc = .85, cx = S / 2, cy = S / 2;
  mg.clearRect(0, 0, S, S); mg.save(); mg.beginPath(); mg.arc(cx, cy, S / 2 - 1, 0, 6.283); mg.clip();
  mg.fillStyle = 'rgba(7,8,11,.85)'; mg.fillRect(0, 0, S, S);
  function P(x, z) { return [cx + (x - car.x) * sc, cy + (z - car.z) * sc]; }
  mg.strokeStyle = '#26303f'; mg.lineWidth = 7 * sc;
  function seg(x1, z1, x2, z2) { var a = P(x1, z1), b = P(x2, z2); mg.beginPath(); mg.moveTo(a[0], a[1]); mg.lineTo(b[0], b[1]); mg.stroke(); }
  seg(0, 20, 0, -312); seg(0, 0, 115, 0); seg(-95, 0, 0, 0); seg(0, 0, 0, 125);
  mg.fillStyle = 'rgba(120,150,190,.25)';
  for (var i = 0; i < colliders.length; i++) { var o = colliders[i]; if (o.r) continue; var p = P(o.x - o.hw, o.z - o.hd); mg.fillRect(p[0], p[1], o.hw * 2 * sc, o.hd * 2 * sc); }
  zones.forEach(function (z) {
    if (z.secret && z.id === 'garage' && !unlocked) return;
    var p = P(z.x, z.z), col = z.cname === 'c' ? '#00e5ff' : z.cname === 'm' ? '#ff2e88' : '#ffd400';
    mg.beginPath(); mg.arc(p[0], p[1], 4.5, 0, 6.283);
    if (found[z.id]) { mg.fillStyle = col; mg.fill(); } else { mg.strokeStyle = col; mg.lineWidth = 2; mg.stroke(); }
  });
  mg.translate(cx, cy); mg.rotate(car.h); mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(0, -8); mg.lineTo(5.5, 7); mg.lineTo(-5.5, 7); mg.closePath(); mg.fill();
  mg.restore();
}

/* ------------------------------------------------------------ start */
function startGame() {
  if (started) return; started = true; $('#intro').classList.add('gone'); $('#hud').hidden = false;
  if (isTouch) { $('#touch').hidden = false; }
  setTimeout(function () { $('#hint').classList.add('off'); }, 9000);
  camH = car.h; camPos.set(car.x, 6, car.z + 12.5);
}
$('#start').onclick = startGame;
window.__game = { car: car, zones: zones, THREE: THREE, scene: scene, camera: camera, renderer: renderer, start: startGame, unlock: unlock,
  tp: function (x, z, h) { car.x = x; car.z = z; car.h = h || 0; camH = car.h; camPos.set(x, 6, z + 12); car.vx = car.vz = 0; },
  free: function (p, l, fov) { freeCam = p ? { p: p, l: l, fov: fov } : null; }, SECRET: SECRET, PACKET: PACKET };
requestAnimationFrame(frame);
})();
