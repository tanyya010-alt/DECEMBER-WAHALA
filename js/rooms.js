// DECEMBER WAHALA — walk-in interiors. Builds a furnished, Sims-style cutaway
// room (low-poly three.js) for any venue from the templates in sims-data.js.
// Your flat's furniture reflects what you've bought in Buy mode.
/* global THREE, WORLD */
(function () {
  const W = window.WORLD;
  const SIMS = W.SIMS;
  const mats = new Map();
  const lam = (c) => { const k = "l" + c; if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c })); return mats.get(k); };
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c });

  function tile(a, b, rx, rz) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 32, y * 32, 32, 32); }
    g.strokeStyle = "rgba(0,0,0,.06)"; g.strokeRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
  }
  function art(cols) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 96;
    const g = c.getContext("2d");
    g.fillStyle = cols[0]; g.fillRect(0, 0, 128, 96);
    for (let i = 0; i < 9; i++) { g.fillStyle = cols[1 + (i % (cols.length - 1))]; g.beginPath(); g.arc(14 + (i % 3) * 50, 14 + Math.floor(i / 3) * 34, 12, 0, 7); g.fill(); }
    return new THREE.CanvasTexture(c);
  }

  // Footprints [w, d] and whether you can walk through them.
  const SIZE = {
    bed: [2.6, 3.6], wardrobe: [1.6, 0.8], desk: [2.4, 1.1], tv: [3, 0.8], stove: [1.4, 1.0], fridge: [1.1, 0.8], table: [2.0, 2.0],
    shower: [1.8, 1.8], speaker: [1.6, 0.8], cabana: [3, 3], pergola: [5, 3.6], djstage: [8, 2.6], firepit: [4.4, 1.2], shedbar: [3.6, 1.2], pillars: [3.4, 3.4], glowbar: [7, 1.3], dancedeck: [7, 3.4], ringlight: [1.4, 0.6], lounger: [0.9, 2.1], sofa: [3, 1.1], broom: [0.6, 0.6], plant: [0.8, 0.8], pots: [5, 1.2], toilet: [1.4, 1.4],
    counter: [4, 1.2], bar: [1.4, 6], dancefloor: [8, 6], dj: [3, 1.4], couch: [1.4, 3], photowall: [3.5, 0.3], shop: [4, 1.4],
    kiosk: [3, 1.2], cinema: [6, 0.4], bench: [2.4, 0.7], xtree: [1.6, 1.6], rack: [4, 0.8], mirror: [1, 0.3], salonchair: [1, 1],
    dryer: [1, 2.8], treadmill: [1, 2], weights: [3.5, 1], cooler: [0.6, 0.6], altar: [3, 1.2], choir: [3, 1.4], pew: [3.6, 0.8],
    stage: [8, 2], crates: [1.6, 1.6], pool: [6, 3.6], bike: [0.7, 1.8], door: [2.2, 0.3],
    kitchen: [9, 1.2], island: [5, 1.4], dining: [6, 1.6], winewall: [1.1, 4.6], stairs: [5, 2.6], sectional: [6, 3], bedlux: [4.4, 3.8], curvechairs: [3.6, 1.6], concierge: [0.8, 0.6],
  };
  const WALKABLE = new Set(["dancefloor", "choir", "door", "photowall", "dancedeck"]);

  function build(type, opts = {}) {
    const T = SIMS.INTERIORS[type] || SIMS.INTERIORS.home;
    const home = opts.home || SIMS.START_HOME;
    const g = new THREE.Group();
    const RW = T.w, RD = T.d;
    const colliders = [], objects = [], walls = [], anim = { tiles: [], spin: [], lights: [], flames: [], heads: [] };
    const put = (m, x, y, z, parent = g) => { m.position.set(x, y, z); parent.add(m); return m; };
    const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === "number" ? lam(c) : c);
    const cyl = (rt, rb, h, c, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === "number" ? lam(c) : c);
    const sph = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), typeof c === "number" ? lam(c) : c);

    // Floor, walls (the two facing the camera drop down, like The Sims).
    const floorMat = T.glass ? new THREE.MeshPhongMaterial({ map: tile(T.floor[0], T.floor[1], RW / 3, RD / 3), shininess: 110, specular: 0x9a9a9a })
      : new THREE.MeshLambertMaterial({ map: T.open ? tile(T.floor[0], T.floor[1], RW / 6, RD * 1.4) : tile(T.floor[0], T.floor[1], RW / 2, RD / 2) });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.userData.floor = true; g.add(floor);
    put(box(RW + 0.6, 0.5, RD + 0.6, T.glass ? 0xe8e8e6 : 0x8d6e63), 0, -0.26, 0);
    const wallMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(T.wall) });
    const H = T.height || 3.4;
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xd6ecf7, transparent: true, opacity: 0.16, depthWrite: false });
    const wall = (w, d, x, z, nx, nz) => {
      if (T.glass && !(nx < 0)) { // floor-to-ceiling glass with black mullions; the left wall stays solid
        const gw = new THREE.Group(); put(gw, x, H / 2, z);
        const along = w > d, len = along ? w : d;
        const bar = (l, h, px, py) => { const b = box(along ? l : 0.08, h, along ? 0.08 : l, 0x1c1c1e); b.position.set(along ? px : 0, py, along ? 0 : px); gw.add(b); };
        const pane = box(w, H, d, glassMat); gw.add(pane);
        const n = Math.max(1, Math.round(len / 2.6));
        for (let i = 0; i <= n; i++) bar(0.08, H, -len / 2 + (i * len) / n, 0);
        bar(len, 0.1, 0, H / 2 - 0.05); bar(len, 0.1, 0, -H / 2 + 0.05); bar(len, 0.06, 0, -H / 2 + 3.1);
        gw.traverse((m) => { if (m.isMesh) m.userData.wall = { nx, nz, h: H }; });
        gw.userData.wall = { nx, nz, h: H };
        walls.push(gw);
        return gw;
      }
      if (T.open) { // open-air venues get a low balustrade instead of walls
        if (T.setting === "rooftop") { put(box(w, 0.9, d, 0x8a8f96), x, 0.45, z); put(box(w, 0.6, d, new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.3 })), x, 1.2, z); put(box(w, 0.05, d + 0.04, 0x2f3238), x, 1.52, z); return null; }
        put(box(w, 1.0, d, new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35 })), x, 0.5, z);
        put(box(w, 0.06, d + 0.04, 0xd8a93b), x, 1.02, z);
        return null;
      }
      const m = put(box(w, H, d, wallMat), x, H / 2, z);
      m.userData.wall = { nx, nz, h: H };
      walls.push(m);
      return m;
    };
    wall(RW + 0.5, 0.25, 0, -RD / 2, 0, -1);
    wall(0.25, RD, -RW / 2, 0, -1, 0);
    wall(0.25, RD, RW / 2, 0, 1, 0);
    const seg = (RW - 2.4) / 2;
    wall(seg, 0.25, -RW / 2 + seg / 2, RD / 2, 0, 1);
    wall(seg, 0.25, RW / 2 - seg / 2, RD / 2, 0, 1);
    colliders.push({ x0: -RW / 2 - 2, x1: RW / 2 + 2, z0: -RD / 2 - 2, z1: -RD / 2 + 0.15 }, { x0: -RW / 2 - 2, x1: -RW / 2 + 0.15, z0: -RD / 2 - 2, z1: RD / 2 + 2 }, { x0: RW / 2 - 0.15, x1: RW / 2 + 2, z0: -RD / 2 - 2, z1: RD / 2 + 2 });
    colliders.push({ x0: -RW / 2 - 2, x1: -1.1, z0: RD / 2 - 0.15, z1: RD / 2 + 2 }, { x0: 1.1, x1: RW / 2 + 2, z0: RD / 2 - 0.15, z1: RD / 2 + 2 }, { x0: -1.1, x1: 1.1, z0: RD / 2 + 0.6, z1: RD / 2 + 2 });
    // Windows on the back wall (lit venues).
    if (!T.dark && !T.open && !T.glass) for (let x = -RW / 2 + 2.5; x < RW / 2 - 1.5; x += 4.2) put(box(1.6, 1.3, 0.05, 0xbfe3ff), x, 2.1, -RD / 2 + 0.15);
    // Skirting and a doormat.

    // ------------------------------------------------------------ objects
    const all = T.objects.map((o) => ({ ...o }));
    all.push({ k: "door", x: 0, z: RD / 2 - 0.25, act: ["exit"], label: "Leave", icon: "🚪" });
    for (const o of all) {
      const og = new THREE.Group();
      og.position.set(o.x, 0, o.z);
      g.add(og);
      const [sw, sd] = SIZE[o.k] || [1, 1];
      const w = o.w || sw, d = o.d || sd;
      const P = (m, x, y, z) => put(m, x, y, z, og);
      const tier = o.furniture ? (home[o.furniture] === undefined ? -1 : home[o.furniture]) : 0;
      switch (o.k) {
        case "bed": {
          const big = tier >= 2, wide = big ? 3.2 : 2.6, long = big ? 3.8 : 3.6;
          P(box(wide, 0.5, long, tier >= 1 ? 0x5d4037 : 0x8d6e63), 0, 0.25, 0);
          P(box(wide - 0.2, tier === 0 ? 0.22 : 0.35, long - 0.4, tier >= 2 ? 0xf5e6c8 : tier === 1 ? 0xc62828 : 0x90a4ae), 0, 0.62, 0.15);
          P(box(wide - 0.6, 0.22, 0.6, 0xffffff), 0, 0.85, -long / 2 + 0.55);
          if (tier >= 1) P(box(wide, tier >= 2 ? 2.2 : 1.4, 0.2, tier >= 2 ? 0xd8a93b : 0x4e342e), 0, tier >= 2 ? 1.1 : 0.7, -long / 2);
          if (tier >= 2) P(box(wide - 0.3, 0.06, 1.2, 0x8d1b3d), 0, 0.82, 0.9);
          break;
        }
        case "wardrobe":
          P(box(1.6, 3.0, 0.8, 0xd7b98e), 0, 1.5, 0);
          P(box(0.02, 2.6, 0.82, 0x8d6e63), 0, 1.5, 0);
          if ((home.mirror || 0) >= 1) { P(box(0.9, 2.2, 0.06, 0x8d6e63), 0.4, 1.2, 1.4); P(box(0.75, 2.0, 0.07, 0xcfe8ff), 0.4, 1.2, 1.42); }
          else P(box(0.6, 0.8, 0.05, 0xcfe8ff), 0, 1.8, 0.43);
          break;
        case "desk":
          P(box(2.4, 0.1, 1.1, 0xd7b98e), 0, 1.0, 0);
          [-1.05, 1.05].forEach((x) => P(box(0.08, 1.0, 1.0, 0xa1785a), x, 0.5, 0));
          P(box(0.9, 0.04, 0.6, 0x9e9e9e), 0, 1.07, 0);
          P(box(0.9, 0.55, 0.04, 0x37474f), 0, 1.36, -0.28).rotation.x = -0.2;
          if (type === "home" && home.decor >= 1) { P(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 20), glow(0xffffff)), 1.8, 2.3, -0.2); P(cyl(0.03, 0.03, 2.0, 0x222222, 5), 1.8, 1.0, -0.2); }
          break;
        case "tv": {
          const big = type === "home" ? tier >= 1 : true;
          P(box(3, 0.6, 0.8, 0x6d4c41), 0, 0.3, 0);
          P(box(big ? 2.8 : 1.6, big ? 1.6 : 1.0, 0.08, 0x111111), 0, big ? 1.5 : 1.15, -0.25);
          const scr = P(box(big ? 2.6 : 1.45, big ? 1.4 : 0.85, 0.02, glow(0x2a3f6e)), 0, big ? 1.5 : 1.15, -0.2);
          anim.tiles.push({ mat: scr.material, kind: "tv" });
          if (type === "shortlet") { // slatted oak feature wall with vertical LED strips
            P(box(4.2, 3.6, 0.12, 0x3a2a1e), 0, 1.8, -0.5);
            for (let i = 0; i < 18; i++) P(box(0.12, 3.5, 0.08, 0xa8794f), -1.95 + i * 0.23, 1.8, -0.42);
            [-2.15, 2.15].forEach((x) => { const m = glow(0x888888); anim.tiles.push({ mat: m, kind: "led", col: 0xffe2b0, day: 0xf0e6d6 }); P(box(0.06, 3.5, 0.06, m), x, 1.8, -0.4); });
            const ul = glow(0x888888); anim.tiles.push({ mat: ul, kind: "led", col: 0xffe2b0, day: 0xf0e6d6 }); P(box(3, 0.04, 0.04, ul), 0, 0.02, 0.41);
          }
          if (type === "home" && tier >= 2) { P(box(0.45, 0.1, 0.35, 0xffffff), 0.9, 0.65, 0.1); P(box(0.18, 0.05, 0.12, 0x111111), 0.4, 0.63, 0.25); }
          break;
        }
        case "stove":
          P(box(tier >= 2 ? 2.2 : 1.4, 1.0, 1.0, tier >= 1 ? 0xeceff1 : 0xbcaaa4), 0, 0.5, 0);
          P(box(1.2, 0.05, 0.8, 0x424242), 0, 1.03, 0);
          if (tier >= 1) [-0.3, 0.3].forEach((x) => P(cyl(0.16, 0.16, 0.03, 0x111111), x, 1.07, 0.1));
          P(cyl(0.22, 0.2, 0.35, 0x9e9e9e), -0.3, 1.25, 0.1);
          if (tier >= 2) { P(box(1.6, 0.5, 0.6, 0xb0bec5), 0, 2.6, -0.2); P(box(0.8, 1.9, 0.8, 0xe0e0e0), -1.6, 0.95, 0); }
          break;
        case "fridge": P(box(1.1, 0.9, 0.8, 0x1565c0), 0, 0.45, 0); P(box(1.1, 0.2, 0.8, 0xffffff), 0, 0.95, 0); break;
        case "table":
          P(cyl(1.0, 1.0, 0.1, type === "restaurant" ? 0xfafafa : type === "club" ? 0x222222 : 0xa1785a, 18), 0, 1.0, 0);
          P(cyl(0.12, 0.3, 1.0, 0x5d4037), 0, 0.5, 0);
          if (["restaurant", "hall", "lounge"].includes(type)) { P(cyl(0.05, 0.05, 0.4, 0xd8a93b, 6), 0, 1.25, 0); P(sph(0.09, glow(0xffd27a)), 0, 1.5, 0); }
          if (["mamaput", "fastfood", "restaurant", "hall", "cafe"].includes(type)) [[0.4, 0.2], [-0.35, -0.3]].forEach(([x, z]) => P(cyl(0.22, 0.18, 0.06, 0xffffff), x, 1.08, z));
          break;
        case "shower":
          P(box(1.8, 0.1, 1.8, 0xe0f2f1), 0, 0.05, 0);
          P(box(0.05, 2.4, 1.8, new THREE.MeshLambertMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.5 })), 0.9, 1.2, 0);
          P(cyl(0.05, 0.05, 0.5, 0xb0bec5, 6), -0.6, 2.2, -0.6);
          P(box(0.5, 0.45, 0.6, 0xffffff), -0.5, 0.25, 0.7);
          break;
        case "speaker":
          if (home.sound >= 0 || type !== "home") {
            const big = home.sound >= 1;
            [-0.45, 0.45].forEach((x) => { P(box(big ? 0.6 : 0.4, big ? 1.6 : 0.6, 0.5, 0x212121), x, big ? 0.8 : 0.3, 0); P(cyl(0.15, 0.15, 0.02, 0x555555), x, big ? 1.1 : 0.35, 0.26).rotation.x = Math.PI / 2; });
          }
          if (type === "home") {
            if (home.power >= 1) { P(box(0.7, 0.9, 0.4, 0xeceff1), -1.4, 0.45, 0.2); P(box(0.8, 0.5, 0.4, 0x263238), -1.4, 1.2, 0.2); }
            else if (home.power >= 0) { P(box(1.0, 0.7, 0.7, 0x2e7d32), -1.4, 0.35, 0.3); P(box(0.3, 0.3, 0.3, 0x111111), -1.0, 0.85, 0.3); }
            else P(box(0.4, 0.5, 0.4, 0xff7043), -1.2, 0.25, 0.3); // jerrycan
          }
          break;
        case "sofa":
          P(box(3, 0.5, 1.1, 0x8e24aa), 0, 0.45, 0);
          P(box(3, 0.9, 0.3, 0x7b1fa2), 0, 0.9, -0.45);
          [-1.4, 1.4].forEach((x) => P(box(0.25, 0.75, 1.1, 0x7b1fa2), x, 0.6, 0));
          break;
        case "couch":
          P(box(1.1, 0.5, 3, 0x6a1b9a), 0, 0.45, 0);
          P(box(0.3, 0.9, 3, 0x4a148c), -0.45, 0.9, 0);
          P(box(2.4, 0.5, 1.0, 0x6a1b9a), 0.7, 0.45, -1.4);
          P(cyl(0.5, 0.5, 0.5, 0x222222, 12), 1.3, 0.4, 0.3);
          P(cyl(0.08, 0.08, 0.4, 0x2e7d32, 6), 1.3, 0.85, 0.3);
          break;
        case "broom": P(cyl(0.03, 0.03, 1.6, 0xa1887f, 5), 0, 0.8, 0).rotation.z = 0.2; P(cyl(0.25, 0.2, 0.4, 0x1e88e5), 0.25, 0.2, 0.2); break;
        case "plant": P(cyl(0.3, 0.25, 0.5, 0x8d6e63), 0, 0.25, 0); P(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), lam(0x43a047)), 0, 1.0, 0); break;
        case "pots":
          P(box(w, 1.0, 1.2, 0x8d6e63), 0, 0.5, 0);
          [-1.6, -0.5, 0.6, 1.7].forEach((x, i) => { P(cyl(0.38, 0.32, 0.5, [0x546e7a, 0x37474f, 0xb71c1c, 0x546e7a][i]), x, 1.25, 0); P(cyl(0.34, 0.34, 0.04, [0xff7043, 0x6d4c41, 0xffca28, 0x8bc34a][i]), x, 1.5, 0); });
          break;
        case "toilet":
          P(box(1.4, 2.2, 0.08, 0xe0e0e0), 0, 1.1, 0.7);
          P(box(0.08, 2.2, 1.4, 0xe0e0e0), -0.7, 1.1, 0);
          P(box(0.5, 0.45, 0.6, 0xffffff), 0.1, 0.25, -0.2);
          break;
        case "counter":
          P(box(w, 1.05, d, type === "bank" ? 0x283593 : type === "bdc" ? 0x2e7d32 : 0x8d6e63), 0, 0.52, 0);
          P(box(w + 0.1, 0.06, d + 0.1, 0xeceff1), 0, 1.07, 0);
          if (type === "cafe") { P(box(0.5, 0.6, 0.4, 0x424242), w / 2 - 0.6, 1.4, 0); P(cyl(0.08, 0.08, 0.14, 0xffffff), 0.5, 1.15, 0.2); }
          if (type === "fastfood") P(box(w - 0.6, 0.7, 0.1, glow(0xffeb3b)), 0, 2.4, -0.4);
          break;
        case "bar": {
          P(box(w, 1.1, d, 0x3e2723), 0, 0.55, 0);
          P(box(w + 0.2, 0.08, d + 0.2, 0xd8a93b), 0, 1.12, 0);
          const shelfX = (o.x > 0 ? 1 : -1) * (w / 2 + 0.8);
          P(box(0.4, 2.2, d, 0x4e342e), shelfX, 1.6, 0);
          for (let i = 0; i < 8; i++) P(cyl(0.06, 0.07, 0.35, [0x2e7d32, 0xd84315, 0x6a1b9a, 0xffb300][i % 4], 6), shelfX - 0.05, 1.3 + (i % 2) * 0.7, -d / 2 + 0.5 + i * (d - 1) / 7);
          break;
        }
        case "dancefloor": {
          const nx = Math.round(w / 1), nz = Math.round(d / 1);
          for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
            const m = glow(0x333333);
            anim.tiles.push({ mat: m, kind: "floor", i, j });
            P(box(0.96, 0.04, 0.96, m), -w / 2 + 0.5 + i, 0.02, -d / 2 + 0.5 + j);
          }
          if (type === "club") { const ball = P(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshLambertMaterial({ color: 0xe0e0e0, flatShading: true })), 0, 4.4, 0); anim.spin.push(ball); P(cyl(0.01, 0.01, 1.2, 0x888888, 4), 0, 5.2, 0); }
          break;
        }
        case "dj": P(box(3, 1.1, 1.4, 0x212121), 0, 0.55, 0); [-0.6, 0.6].forEach((x) => P(cyl(0.3, 0.3, 0.06, 0x111111), x, 1.14, 0)); { const l = P(box(3, 0.1, 0.1, glow(0xff3dbb)), 0, 1.0, 0.71); anim.tiles.push({ mat: l.material, kind: "neon" }); } break;
        case "photowall": { const m = new THREE.MeshBasicMaterial({ map: art(["#ff4fa3", "#ffffff", "#ffb300", "#20b46e"]) }); P(box(3.5, 2.6, 0.1, m), 0, 1.4, 0); break; }
        case "shop": case "kiosk":
          P(box(w, 1.0, d, o.k === "kiosk" ? 0x0277bd : 0xad1457), 0, 0.5, 0);
          P(box(w, 0.6, 0.08, glow(o.k === "kiosk" ? 0x4fc3f7 : 0xff80ab)), 0, 2.6, -d / 2);
          for (let i = 0; i < 4; i++) P(box(0.4, 0.4, 0.4, [0xffca28, 0xef5350, 0x66bb6a, 0x42a5f5][i]), -w / 2 + 0.6 + i * (w - 1.2) / 3, 1.2, -0.1);
          break;
        case "cinema": { const m = glow(0x1a237e); anim.tiles.push({ mat: m, kind: "tv" }); P(box(w, 2.6, 0.2, 0x111111), 0, 1.7, 0); P(box(w - 0.4, 2.2, 0.05, m), 0, 1.7, 0.12); break; }
        case "bench": P(box(2.4, 0.1, 0.6, 0xa1785a), 0, 0.72, 0); [-1, 1].forEach((x) => P(box(0.08, 0.7, 0.5, 0x5d4037), x, 0.35, 0)); break;
        case "xtree":
          for (let i = 0; i < 3; i++) P(new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 1.1, 8), lam(0x1b7a3a)), 0, 0.7 + i * 0.75, 0);
          P(new THREE.Mesh(new THREE.OctahedronGeometry(0.2), glow(0xffd23b)), 0, 2.8, 0);
          for (let i = 0; i < 10; i++) { const m = glow([0xff3b3b, 0x2fe06b, 0xffd23b, 0x4fa3ff][i % 4]); anim.tiles.push({ mat: m, kind: "twinkle", i }); P(sph(0.06, m), Math.cos(i * 2.4) * (0.7 - i * 0.05), 0.6 + i * 0.2, Math.sin(i * 2.4) * (0.7 - i * 0.05)); }
          break;
        case "rack":
          P(cyl(0.03, 0.03, w, 0x9e9e9e, 6), 0, 1.9, 0).rotation.z = Math.PI / 2;
          [-w / 2, w / 2].forEach((x) => P(cyl(0.04, 0.04, 1.9, 0x9e9e9e, 6), x, 0.95, 0));
          for (let i = 0; i < Math.floor(w / 0.45); i++) P(box(0.08, 1.0, 0.6, [0xec4899, 0x8b5cf6, 0xffb300, 0x20b46e, 0xffffff, 0x111111][i % 6]), -w / 2 + 0.3 + i * 0.45, 1.35, 0);
          break;
        case "mirror": P(box(1, 2.2, 0.1, 0x8d6e63), 0, 1.2, 0); P(box(0.85, 2.0, 0.05, 0xcfe8ff), 0, 1.2, 0.06); break;
        case "salonchair": P(box(0.8, 0.5, 0.8, 0x212121), 0, 0.55, 0); P(box(0.8, 0.8, 0.15, 0x212121), 0, 1.0, 0.4); P(box(1.2, 1.0, 0.1, 0xcfe8ff), 0, 1.6, -0.9); break;
        case "dryer": [0, 1.7].forEach((z) => { P(box(0.8, 0.5, 0.8, 0xab47bc), 0, 0.5, z); P(sph(0.42, 0xe1bee7), 0.15, 1.75, z).scale.set(1, 0.8, 1); P(cyl(0.04, 0.04, 1.2, 0x9e9e9e, 5), 0.35, 1.2, z); }); break;
        case "treadmill": P(box(0.9, 0.2, 1.9, 0x37474f), 0, 0.1, 0); P(box(0.9, 1.2, 0.1, 0x263238), 0, 0.8, -0.9); P(box(0.6, 0.3, 0.2, 0x111111), 0, 1.4, -0.85); break;
        case "weights": P(box(3.4, 0.9, 0.5, 0x424242), 0, 0.45, 0); for (let i = 0; i < 6; i++) P(cyl(0.12, 0.12, 0.35, 0x111111, 8), -1.4 + i * 0.56, 1.0, 0).rotation.z = Math.PI / 2; break;
        case "cooler": P(box(0.5, 1.0, 0.5, 0xeceff1), 0, 0.5, 0); P(cyl(0.2, 0.2, 0.5, new THREE.MeshLambertMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.7 })), 0, 1.25, 0); break;
        case "altar":
          P(box(3, 1.1, 1.2, 0xfafafa), 0, 0.55, 0); P(box(3.1, 0.06, 1.3, 0xd8a93b), 0, 1.12, 0);
          P(box(0.15, 1.6, 0.15, 0xd8a93b), 0, 2.6, -0.6); P(box(0.8, 0.15, 0.15, 0xd8a93b), 0, 3.0, -0.6);
          [-1, 1].forEach((x) => { P(cyl(0.05, 0.05, 0.4, 0xffffff, 6), x, 1.35, 0); const f = P(sph(0.06, glow(0xffb300)), x, 1.6, 0); anim.tiles.push({ mat: f.material, kind: "flame" }); });
          break;
        case "choir": P(box(3, 0.3, 1.4, 0x8d6e63), 0, 0.15, 0); break;
        case "pew": P(box(3.6, 0.1, 0.7, 0x6d4c41), 0, 0.72, 0); P(box(3.6, 0.8, 0.1, 0x5d4037), 0, 1.1, -0.35); [-1.6, 1.6].forEach((x) => P(box(0.1, 0.72, 0.7, 0x5d4037), x, 0.36, 0)); break;
        case "stage":
          P(box(w, 0.6, 2, 0x4a148c), 0, 0.3, 0);
          [-w / 2 + 0.5, w / 2 - 0.5].forEach((x) => P(box(0.8, 1.6, 0.7, 0x111111), x, 1.4, -0.2));
          for (let i = 0; i < 3; i++) P(cyl(0.05, 0.05, 1.4, 0x9e9e9e, 5), -1.5 + i * 1.5, 1.3, 0);
          break;
        case "crates": for (let i = 0; i < 5; i++) P(box(0.6, 0.06, 0.6, 0xd32f2f), 0, 0.3 + i * 0.12, 0); P(box(0.6, 0.06, 0.6, 0xd32f2f), 0.7, 0.3, 0.4); break;
        case "pool": if (T.open) {
          // Sunken infinity pool: stone rim, glowing water, light rings at night.
          [[0, -d / 2 - 0.25, w + 1, 0.5], [0, d / 2 + 0.25, w + 1, 0.5], [-w / 2 - 0.25, 0, 0.5, d], [w / 2 + 0.25, 0, 0.5, d]].forEach(([x, z, w2, d2]) => P(box(w2, 0.16, d2, 0xf4efe6), x, 0.08, z));
          const water = new THREE.MeshLambertMaterial({ color: 0x2bc4e8, transparent: true, opacity: 0.82, emissive: 0x0a4a66 });
          P(box(w, 0.04, d, water), 0, 0.06, 0);
          anim.tiles.push({ mat: water, kind: "poolglow" });
          for (let r = 0; r < 3; r++) { const m = new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0 }); const ring = P(new THREE.Mesh(new THREE.RingGeometry(0.5 + r * 0.6, 0.6 + r * 0.6, 40), m), 1.5, 0.09, 0); ring.rotation.x = -Math.PI / 2; anim.tiles.push({ mat: m, kind: "nightfade", max: 0.75 - r * 0.15 }); }
          [[0, -d / 2 - 0.02, w + 0.4, 0.06], [0, d / 2 + 0.02, w + 0.4, 0.06], [-w / 2 - 0.02, 0, 0.06, d], [w / 2 + 0.02, 0, 0.06, d]].forEach(([x, z, w2, d2]) => { const m = glow(0x444444); anim.tiles.push({ mat: m, kind: "led", col: 0xfff1c2 }); P(box(w2, 0.05, d2, m), x, 0.17, z); });
          break;
        }
        P(box(w + 0.6, 0.2, d + 0.6, 0xeceff1), 0, 0.1, 0); { const m = new THREE.MeshLambertMaterial({ color: 0x29b6f6 }); P(box(w, 0.05, d, m), 0, 0.2, 0); anim.tiles.push({ mat: m, kind: "water" }); } break;
        case "bike": P(cyl(0.3, 0.3, 0.1, 0x111111, 12), 0, 0.3, 0.6).rotation.z = Math.PI / 2; P(cyl(0.3, 0.3, 0.1, 0x111111, 12), 0, 0.3, -0.6).rotation.z = Math.PI / 2; P(box(0.25, 0.4, 1.2, 0xd32f2f), 0, 0.65, 0); P(box(0.7, 0.05, 0.05, 0x9e9e9e), 0, 1.0, 0.55); break;
        case "cabana": {
          // White cabana: four posts, a canopy frame, sheer curtains, a daybed with gold pillows.
          const white = 0xfafafa;
          [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([x, z]) => P(box(0.14, 2.6, 0.14, white), x, 1.3, z));
          [[0, -1.4, 3, 0.12], [0, 1.4, 3, 0.12], [-1.4, 0, 0.12, 3], [1.4, 0, 0.12, 3]].forEach(([x, z, w2, d2]) => P(box(w2, 0.12, d2, white), x, 2.6, z));
          P(box(3, 0.05, 3, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })), 0, 2.68, 0);
          const sheer = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
          if (o.tint) {
            // Uplit curtains: they glow in the cabana's colour after dark.
            anim.tiles.push({ mat: sheer, kind: "emis", col: o.tint });
            const up = glow(0x333333); anim.tiles.push({ mat: up, kind: "led", col: o.tint }); P(box(3, 0.05, 3, up), 0, 0.02, 0);
          }
          [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([x, z]) => { const c = P(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.4), sheer), x + (x < 0 ? 0.35 : -0.35), 1.3, z); c.rotation.y = 0; });
          P(box(2.4, 0.45, 2.4, 0xf5f5f5), 0, 0.3, 0);
          P(box(2.3, 0.18, 2.3, 0xffffff), 0, 0.6, 0);
          [-0.6, 0.6].forEach((x) => P(box(0.6, 0.35, 0.2, 0xd8a93b), x, 0.85, -0.9));
          const led = glow(0x444444); anim.tiles.push({ mat: led, kind: "led", col: 0xffe2a8 }); P(box(3.1, 0.05, 0.05, led), 0, 2.52, 1.42);
          break;
        }
        case "pergola": {
          // Wooden pergola with string lights and an outdoor sectional (orange cushions).
          const wood = 0xc8975f;
          [[-2.4, -1.7], [2.4, -1.7], [-2.4, 1.7], [2.4, 1.7]].forEach(([x, z]) => P(box(0.22, 2.9, 0.22, wood), x, 1.45, z));
          [-1.7, 1.7].forEach((z) => P(box(5.2, 0.22, 0.16, wood), 0, 2.9, z));
          for (let x = -2.4; x <= 2.41; x += 0.6) P(box(0.1, 0.12, 3.8, wood), x, 3.04, 0);
          P(box(4.6, 0.12, 3.2, 0xb08355), 0, 0.06, 0);
          P(box(3.8, 0.45, 0.8, 0x3e3a36), 0, 0.35, -1.1); P(box(3.8, 0.18, 0.75, 0xe8642c), 0, 0.66, -1.05); P(box(3.8, 0.6, 0.2, 0x3e3a36), 0, 0.85, -1.45);
          P(box(0.8, 0.45, 2.2, 0x3e3a36), 2.0, 0.35, 0.2); P(box(0.75, 0.18, 2.1, 0xe8642c), 2.0, 0.66, 0.2);
          P(box(1.2, 0.4, 0.8, 0x2f2b28), 0, 0.3, 0.2);
          for (let i = 0; i < 10; i++) { const m = glow(0x666666); anim.tiles.push({ mat: m, kind: "bulb", i }); P(sph(0.07, m), -2.3 + i * 0.51, 2.72 - Math.sin((i / 9) * Math.PI) * 0.18, -1.7); const m2 = glow(0x666666); anim.tiles.push({ mat: m2, kind: "bulb", i: i + 3 }); P(sph(0.07, m2), -2.3 + i * 0.51, 2.72 - Math.sin((i / 9) * Math.PI) * 0.18, 1.7); }
          break;
        }
        case "glowbar": {
          // Marble bar with LED trim and a backlit gold shelf of bottles.
          P(box(w, 1.1, d, 0xf3f1ee), 0, 0.55, 0);
          P(box(w + 0.2, 0.08, d + 0.2, 0xd8a93b), 0, 1.13, 0);
          const led = glow(0x444444); anim.tiles.push({ mat: led, kind: "led", col: 0xffd27a }); P(box(w + 0.1, 0.06, 0.04, led), 0, 0.12, d / 2 + 0.03);
          const back = glow(0x6b5a2a); anim.tiles.push({ mat: back, kind: "led", col: 0xffe6a8, day: 0x8a7a4a }); P(box(w - 1, 2.0, 0.1, back), 0, 1.9, -1.6);
          for (let r = 0; r < 3; r++) { P(box(w - 1.2, 0.05, 0.3, 0xd8a93b), 0, 1.2 + r * 0.6, -1.45); for (let i = 0; i < 9; i++) P(cyl(0.05, 0.06, 0.32, [0x2e7d32, 0xd84315, 0x6a1b9a, 0xffb300, 0x90caf9][(i + r) % 5], 6), -(w - 2) / 2 + i * (w - 2) / 8, 1.38 + r * 0.6, -1.45); }
          [-1, 1].forEach((sd) => P(box(0.2, 3.2, 0.2, 0xffffff), sd * (w / 2 - 0.2), 1.6, -1.6));
          (o.seats || []).forEach(([sx, sz]) => { P(cyl(0.22, 0.22, 0.06, 0xd8a93b, 10), sx - o.x, 0.8, sz - o.z); P(cyl(0.04, 0.04, 0.8, 0xd8a93b, 5), sx - o.x, 0.4, sz - o.z); });
          break;
        }
        case "dancedeck": {
          const m = glow(0x333333); anim.tiles.push({ mat: m, kind: "deck" });
          P(box(w, 0.06, d, m), 0, 0.03, 0);
          P(box(w + 0.2, 0.08, 0.1, 0xd8a93b), 0, 0.04, d / 2);
          break;
        }
        case "djstage": {
          // DJ hub: stage, booth with glowing decks and an LED video wall behind.
          P(box(w, 0.5, d, 0x15151b), 0, 0.25, 0);
          P(box(w + 0.1, 0.06, 0.06, 0x6ad8ff), 0, 0.52, d / 2);
          P(box(2.6, 1.0, 0.9, 0x111111), 0, 1.0, 0.3);
          const deck = glow(0x333333); anim.tiles.push({ mat: deck, kind: "led", col: 0x6ad8ff }); P(box(2.4, 0.05, 0.7, deck), 0, 1.53, 0.3);
          P(box(6.4, 3.4, 0.2, 0x0b0b0f), 0, 2.4, -1.0);
          for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) { const m = glow(0x222244); anim.tiles.push({ mat: m, kind: "floor", i, j }); P(box(0.48, 0.48, 0.04, m), -2.75 + i * 0.5, 1.1 + j * 0.5, -0.88); }
          break;
        }
        case "firepit": {
          // Long concrete fire trough with flames, deep sofas on both sides.
          P(box(w, 0.55, d, 0x8a8a86), 0, 0.28, 0);
          P(box(w - 0.3, 0.05, d - 0.4, 0x1a1a1a), 0, 0.56, 0);
          for (let i = 0; i < 7; i++) { const f = P(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 6), glow(i % 2 ? 0xffb23b : 0xff6a1a)), -w / 2 + 0.5 + i * (w - 1) / 6, 0.85, 0); anim.flames.push(f); }
          [-1, 1].forEach((sd) => {
            P(box(w + 0.6, 0.42, 0.85, 0x3d4047), 0, 0.3, sd * 1.55);
            P(box(w + 0.6, 0.16, 0.8, 0x6b6f78), 0, 0.58, sd * 1.5);
            P(box(w + 0.6, 0.7, 0.22, 0x3d4047), 0, 0.85, sd * 1.95);
            for (let k = 0; k < 4; k++) P(box(0.8, 0.5, 0.18, 0x7b7f88), -w / 2 + 0.6 + k * (w - 0.6) / 3, 0.95, sd * 1.8);
          });
          P(box(1.1, 0.35, 0.7, 0x7a5a3a), w / 2 + 1.2, 0.25, 0);
          P(new THREE.PointLight(0xff8a3d, 0.9, 7), 0, 1.2, 0);
          break;
        }
        case "shedbar": {
          // Grey wooden shed bar: bunting, hanging planters, chalkboard, metal stools.
          const grey = 0x9aa3ad;
          P(box(w + 0.6, 2.8, 0.15, grey), 0, 1.4, -1.0);
          [-1, 1].forEach((sd) => P(box(0.15, 2.8, 1.2, grey), sd * (w / 2 + 0.3), 1.4, -0.45));
          const roof = P(box(w + 1.2, 0.12, 2.2, 0x7d8690), 0, 2.95, -0.2); roof.rotation.x = 0.12;
          P(box(w, 1.05, d, grey), 0, 0.52, 0);
          P(box(w + 0.3, 0.08, d + 0.3, 0x55606b), 0, 1.08, 0.1);
          for (let i = 0; i < 9; i++) P(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 3), lam([0x2f3238, 0xffffff][i % 2])), -w / 2 + 0.3 + i * (w - 0.6) / 8, 2.45, -0.88).rotation.x = Math.PI;
          P(box(0.8, 0.6, 0.04, 0x1f2a24), w / 2 - 0.6, 1.9, -0.9);
          [-1, 1].forEach((sd) => { P(cyl(0.18, 0.14, 0.3, 0xdedede, 8), sd * (w / 2 + 0.55), 2.2, 0.4); P(new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), lam(0x3f8f4a)), sd * (w / 2 + 0.55), 2.45, 0.4); });
          for (let i = 0; i < 5; i++) P(cyl(0.05, 0.06, 0.32, [0xf6c26b, 0xd84315, 0xffffff, 0x2e7d32, 0xec407a][i], 6), -1.2 + i * 0.6, 1.28, 0);
          (o.seats || []).forEach(([sx, sz]) => { P(cyl(0.2, 0.2, 0.05, 0x111111, 10), sx - o.x, 0.8, sz - o.z); [-1, 1].forEach((a) => P(box(0.04, 0.8, 0.04, 0x111111), sx - o.x + a * 0.14, 0.4, sz - o.z)); });
          break;
        }
        case "pillars": {
          // Glowing light pillars standing in a dark reflecting pool.
          P(box(w, 0.04, d, new THREE.MeshLambertMaterial({ color: 0x0b1020 })), 0, 0.03, 0);
          const c = document.createElement("canvas"); c.width = 32; c.height = 128; const x = c.getContext("2d");
          x.fillStyle = "#1e64ff"; x.fillRect(0, 0, 32, 128); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(200,240,255,${0.3 + Math.random() * 0.6})`; x.fillRect(Math.random() * 32, 0, 1, 128); }
          const tex = new THREE.CanvasTexture(c);
          [[-1, -0.8, 0.12], [0.3, 0.7, -0.1], [1.1, -0.6, 0.18]].forEach(([px, pz, tilt], i) => {
            const m = new THREE.MeshBasicMaterial({ map: tex, color: 0x6688aa });
            anim.tiles.push({ mat: m, kind: "led", col: i === 1 ? 0xbfe9ff : 0xffffff, day: 0x6688aa });
            const pl = P(box(0.8, 3.4 - i * 0.3, 0.8, m), px, 1.6, pz); pl.rotation.z = tilt; pl.rotation.x = tilt * 0.5;
            P(new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), lam(0x3a3a3a)), px + 0.3, 0.15, pz + 0.3);
          });
          break;
        }
        case "ringlight": {
          const m = glow(0x777777); anim.tiles.push({ mat: m, kind: "led", col: 0xfff3d6, day: 0xe8e8e8 });
          P(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 48), m), 0, 1.25, 0);
          P(box(1.2, 0.12, 0.5, 0xd8d8d8), 0, 0.06, 0);
          break;
        }
        case "lounger":
          P(box(0.8, 0.3, 2.0, 0x1f1f1f), 0, 0.25, 0);
          P(box(0.78, 0.12, 1.4, 0xffffff), 0, 0.46, 0.25);
          P(box(0.78, 0.5, 0.12, 0xffffff), 0, 0.7, -0.75).rotation.x = -0.6;
          P(new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 10), lam(0xffffff)), 0.9, 2.3, 0); P(cyl(0.03, 0.03, 2.2, 0xd8a93b, 5), 0.9, 1.1, 0);
          break;
        // ---- IJGB penthouse pieces
        case "kitchen": {
          P(box(w, 0.95, d, 0xf5f5f3), 0, 0.48, 0);
          P(box(w + 0.05, 0.06, d + 0.05, 0x1d1d1f), 0, 0.98, 0);
          [-w / 2 + 0.45, w / 2 - 0.45].forEach((x) => P(box(0.9, 3.2, d, 0xf5f5f3), x, 1.6, 0));
          P(box(w - 1.8, 0.9, 0.5, 0xf5f5f3), 0, 2.7, -d / 2 + 0.25);
          const cove = glow(0x888888); anim.tiles.push({ mat: cove, kind: "led", col: 0xfff1d6, day: 0xf2f2f2 }); P(box(w - 1.8, 0.04, 0.06, cove), 0, 2.22, -d / 2 + 0.5);
          P(box(1.6, 0.04, 0.6, 0x9aa0a6), -1.6, 1.02, 0); P(box(1.4, 0.03, 0.7, 0x111111), 1.6, 1.02, 0); // sink and hob
          P(box(1.4, 0.5, 0.6, 0xd8d8d8), 1.6, 2.1, -0.2);
          P(cyl(0.18, 0.16, 0.3, 0xb0b0b0), 1.3, 1.18, 0.1); P(box(0.5, 0.35, 0.08, 0x2a2a2a), -3.2, 1.2, -0.3);
          break;
        }
        case "island": {
          P(box(w, 0.95, d, 0xf3f3f1), 0, 0.48, 0);
          P(box(w + 0.1, 0.08, d + 0.1, 0xb9bcc2), 0, 0.99, 0);
          [-w / 2, w / 2].forEach((x) => P(box(0.08, 1.02, d + 0.1, 0xb9bcc2), x, 0.5, 0)); // waterfall ends
          P(cyl(0.22, 0.2, 0.25, 0x2f6b3c), -1.6, 1.16, 0); P(sph(0.22, 0x3f9b4f), -1.6, 1.42, 0);
          [0.4, 0.8].forEach((x) => { P(cyl(0.03, 0.03, 0.3, 0x5b1a2a, 6), x, 1.18, -0.2); P(cyl(0.05, 0.03, 0.12, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), 8), x + 0.2, 1.1, -0.1); });
          (o.seats || []).forEach(([sx, sz]) => { P(cyl(0.24, 0.24, 0.08, 0x2b2b2b, 12), sx - o.x, 0.78, sz - o.z); P(cyl(0.04, 0.04, 0.78, 0xc0c0c0, 6), sx - o.x, 0.39, sz - o.z); P(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 4, 12), lam(0xc0c0c0)), sx - o.x, 0.3, sz - o.z).rotation.x = Math.PI / 2; });
          // Linear LED pendant over the island.
          const bar = glow(0x999999); anim.tiles.push({ mat: bar, kind: "led", col: 0xfff3dc, day: 0xeeeeee });
          P(box(w - 0.8, 0.08, 0.12, 0x1c1c1e), 0, 3.6, 0); P(box(w - 0.9, 0.03, 0.1, bar), 0, 3.55, 0);
          [-1.8, 1.8].forEach((x) => P(cyl(0.008, 0.008, 1.5, 0x333333, 3), x, 4.35, 0));
          break;
        }
        case "dining": {
          P(box(w, 0.08, d, 0x4a3426), 0, 1.0, 0);
          [-w / 2 + 0.4, w / 2 - 0.4].forEach((x) => P(box(0.1, 0.96, d - 0.3, 0x1c1c1e), x, 0.48, 0));
          [-1.8, 0, 1.8].forEach((x) => { P(cyl(0.05, 0.05, 0.2, 0xd8a93b, 6), x, 1.14, 0); P(cyl(0.3, 0.3, 0.02, 0xffffff, 16), x, 1.05, 0.5); });
          // Hanging cylinder pendants.
          [-2, -0.7, 0.7, 2].forEach((x, i) => { P(cyl(0.008, 0.008, 1.6, 0x333333, 3), x, 4.0, 0); P(cyl(0.16, 0.16, 0.5, 0x1c1c1e, 12), x, 3.0 - (i % 2) * 0.2, 0); const m = glow(0x777777); anim.tiles.push({ mat: m, kind: "led", col: 0xffd9a0, day: 0xdddddd }); P(cyl(0.14, 0.14, 0.02, m, 12), x, 2.74 - (i % 2) * 0.2, 0); });
          break;
        }
        case "winewall": {
          P(box(w, 3.4, d, 0x2b2118), 0, 1.7, 0);
          const back = glow(0x6b5a2a); anim.tiles.push({ mat: back, kind: "led", col: 0xffc56b, day: 0x8a7350 }); P(box(0.05, 3.0, d - 0.3, back), -w / 2 + 0.3, 1.75, 0);
          for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) { const b = P(cyl(0.05, 0.05, 0.5, [0x2e4a2a, 0x5b1a2a, 0x1f2a1f][(r + c) % 3], 6), 0.05, 0.5 + r * 0.45, -d / 2 + 0.45 + c * ((d - 0.9) / 7)); b.rotation.z = Math.PI / 2; }
          P(box(0.04, 3.1, d - 0.2, new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25 })), w / 2 + 0.02, 1.75, 0);
          break;
        }
        case "stairs": {
          // Floating oak treads up to a glass-railed mezzanine, an indoor garden underneath.
          const steps = 8, run = w / steps, rise = 3.2 / steps;
          for (let i = 0; i < steps; i++) P(box(run + 0.05, 0.12, d - 0.6, 0xc49a6c), w / 2 - run * (i + 0.5), rise * (i + 1) - 0.06, -0.3);
          P(box(w, 0.08, 0.06, 0x1c1c1e), 0, 0.04, d / 2 - 0.4);
          const rail = P(box(w * 1.05, 1.0, 0.04, glassMat), 0, 2.1, d / 2 - 0.55); rail.rotation.z = -Math.atan2(3.2, w);
          P(box(w - 0.4, 0.15, d - 0.8, 0x6b5a48), 0, 0.08, -0.3);
          P(box(w - 0.6, 0.06, d - 1.0, 0xcfcac2), 0, 0.17, -0.3); // pebbles
          for (let i = 0; i < 6; i++) P(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + (i % 3) * 0.08, 0), lam([0x3f9b4f, 0x2f7d3c, 0x58b368][i % 3])), -w / 2 + 0.6 + i * 0.75, 0.42, -0.3 + ((i % 2) - 0.5) * 0.5);
          // Mezzanine slab with a glass balustrade.
          const mx = -w / 2 - 1.45;
          P(box(2.9, 0.25, 2.6, 0xf5f5f3), mx, 3.2, -0.3);
          P(box(2.9, 1.0, 0.04, glassMat), mx, 3.8, 1.0); P(box(2.9, 0.05, 0.06, 0x1c1c1e), mx, 4.3, 1.0);
          const strip = glow(0x888888); anim.tiles.push({ mat: strip, kind: "led", col: 0xfff1d6, day: 0xf2f2f2 }); P(box(2.9, 0.04, 0.04, strip), mx, 3.06, 1.0);
          P(cyl(0.25, 0.2, 0.5, 0xf5f5f3), mx - 0.8, 3.58, -0.6); P(sph(0.38, 0x3f9b4f), mx - 0.8, 4.05, -0.6);
          break;
        }
        case "sectional": {
          const c = 0xcfc6b8, cb = 0xbdb3a3;
          P(box(w, 0.45, 1.3, c), 0, 0.23, 0.25);
          P(box(w, 0.85, 0.35, cb), 0, 0.45, 1.07);
          P(box(1.3, 0.45, 1.1, c), -w / 2 + 0.95, 0.23, -0.95); // chaise towards the screen
          P(box(0.35, 0.85, d, cb), -w / 2 + 0.18, 0.45, 0);
          P(box(0.3, 0.65, 1.3, cb), w / 2 - 0.15, 0.33, 0.25);
          [-1.6, 0.2, 1.8].forEach((x, i) => { P(box(0.6, 0.45, 0.15, i === 1 ? 0x1c1c1e : 0xb8a58c), x, 0.7, 0.8).rotation.x = 0.2; });
          P(box(1.6, 0.04, 0.9, 0x2a2a2a), 0.6, 0.47, 0.3);
          // Black bouclé accent chair beside it.
          P(box(1.0, 0.4, 0.9, 0x1f1f1f), w / 2 + 0.9, 0.2, -0.6); P(box(1.0, 0.7, 0.25, 0x1f1f1f), w / 2 + 0.9, 0.55, -0.15);
          colliders.push({ x0: o.x + w / 2 + 0.4, x1: o.x + w / 2 + 1.4, z0: o.z - 1.05, z1: o.z - 0.05 });
          break;
        }
        case "bedlux": {
          const bw = 3.0, bl = 3.6;
          P(box(bw + 0.1, 0.4, bl, 0x6b6b6b), 0, 0.2, 0);
          P(box(bw - 0.1, 0.3, bl - 0.3, 0xffffff), 0, 0.55, 0.12);
          P(box(bw - 0.05, 0.06, 1.1, 0x8a8f96), 0, 0.73, 1.0);
          [-0.7, 0.7].forEach((x) => P(box(1.0, 0.25, 0.45, 0xf2f2f2), x, 0.82, -bl / 2 + 0.55));
          // Padded, tufted headboard.
          P(box(bw + 0.6, 2.0, 0.2, 0xb9b2a6), 0, 1.0, -bl / 2);
          for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) P(box(0.54, 0.54, 0.08, 0xc9c2b6), -1.4 + c * 0.56, 0.6 + r * 0.58, -bl / 2 + 0.12);
          // Hex side tables with lamps.
          [-1, 1].forEach((s2) => { P(cyl(0.38, 0.38, 0.6, 0x8a6b4a, 6), s2 * (bw / 2 + 0.55), 0.3, -bl / 2 + 0.5); P(cyl(0.05, 0.12, 0.35, 0xd8a93b, 8), s2 * (bw / 2 + 0.55), 0.78, -bl / 2 + 0.5); const m = glow(0x999999); anim.tiles.push({ mat: m, kind: "led", col: 0xffd9a0, day: 0xf3ead8 }); P(cyl(0.16, 0.22, 0.26, m, 10), s2 * (bw / 2 + 0.55), 1.06, -bl / 2 + 0.5); });
          break;
        }
        case "curvechairs": {
          (o.seats || []).forEach(([sx, sz], i) => {
            const x = sx - o.x, z = sz - o.z, col = i ? 0x5f8f8a : 0xe8dcc8;
            P(cyl(0.45, 0.42, 0.42, col, 16), x, 0.21, z);
            const back = P(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.55, 16, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })), x, 0.69, z); back.scale.set(1, 1, 0.9);
          });
          P(cyl(0.3, 0.3, 0.55, 0x1c1c1e, 6), 0, 0.28, 0.1); P(cyl(0.03, 0.03, 0.4, 0xd8a93b, 5), 0, 0.75, 0.1); P(sph(0.13, glow(0xffe2b0)), 0, 1.0, 0.1);
          break;
        }
        case "concierge": {
          P(cyl(0.22, 0.3, 1.0, 0x1c1c1e, 12), 0, 0.5, 0);
          const scr = P(box(0.5, 0.36, 0.04, glow(0x3a6fd8)), 0, 1.12, 0.05); scr.rotation.x = -0.6;
          anim.tiles.push({ mat: scr.material, kind: "tv" });
          break;
        }
        case "door": {
          // A doormat with a glowing exit arrow (the front wall is cut away, Sims-style).
          P(box(2.2, 0.04, 1.1, 0x6d4c41), 0, 0.03, 0);
          const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 3), glow(0x20b46e));
          arrow.rotation.x = Math.PI / 2; P(arrow, 0, 0.12, 0.15);
          P(box(2.2, 0.6, 1.1, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })), 0, 0.3, 0); // easy to click
          [-1.15, 1.15].forEach((x) => P(box(0.18, 0.5, 0.3, 0x5b3a23), x, 0.25, 0.3));
          break;
        }
        default: P(box(w, 1, d, 0x9e9e9e), 0, 0.5, 0);
      }
      // Chairs for tables and desks.
      if (["table", "desk", "bar", "dining"].includes(o.k)) (o.seats || []).forEach(([sx, sz, r, pose]) => {
        if (pose !== "sit") return;
        const ch = new THREE.Group();
        ch.position.set(sx, 0, sz); ch.rotation.y = r;
        const c = type === "shortlet" ? 0x2b2b2b : type === "club" || type === "lounge" ? 0x880e4f : type === "restaurant" ? 0x5d4037 : type === "mamaput" ? 0xd62828 : 0xa1785a;
        put(box(0.6, 0.08, 0.6, c), 0, 0.72, 0, ch); put(box(0.6, 0.7, 0.08, c), 0, 1.05, -0.3, ch); put(cyl(0.04, 0.04, 0.72, 0x333333, 5), 0, 0.36, 0, ch);
        g.add(ch);
      });
      const pick = { kind: "object", obj: o };
      og.traverse((m) => { if (m.isMesh) m.userData.pick = pick; });
      o.mesh = og;
      o.w = w; o.d = d;
      objects.push(o);
      if (!WALKABLE.has(o.k)) colliders.push({ x0: o.x - w / 2, x1: o.x + w / 2, z0: o.z - d / 2, z1: o.z + d / 2 });
    }

    // Home extras: cooling and wall art from Buy mode.
    if (type === "home") {
      if (home.cooling >= 1) { put(box(1.6, 0.5, 0.35, 0xfafafa), -3.8, 2.8, -RD / 2 + 0.35); put(box(1.4, 0.06, 0.05, 0x90a4ae), -3.8, 2.6, -RD / 2 + 0.53); }
      else if (home.cooling >= 0) { put(cyl(0.04, 0.04, 1.4, 0x222222, 5), -1.6, 0.7, -2.2); const fan = put(cyl(0.45, 0.45, 0.08, 0x26a69a, 12), -1.6, 1.5, -2.2); fan.rotation.x = Math.PI / 2; anim.spin.push(fan); colliders.push({ x0: -1.9, x1: -1.3, z0: -2.5, z1: -1.9 }); }
      if (home.decor >= 0) put(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ map: art(["#ffb300", "#d84315", "#2e7d32", "#1565c0", "#6a1b9a"]) })), 1.6, 2.4, -RD / 2 + 0.14);
      put(box(2.6, 0.02, 2, 0xc62828), -1.2, 0.01, 2.2); // rug
    }
    if (["lounge", "restaurant", "hotel"].includes(type)) put(box(4, 0.02, 3, type === "lounge" ? 0x4e342e : 0x8d1b3d), -2, 0.01, 2.5);
    if (type === "church") for (let x = -RW / 2 + 2.5; x < RW / 2 - 1.5; x += 4.2) { const m = new THREE.MeshBasicMaterial({ map: art(["#1565c0", "#ffb300", "#c62828", "#2e7d32"]) }); put(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), m), x, 2.2, -RD / 2 + 0.16); }
    if (type === "hall") for (let i = 0; i < 12; i++) put(sph(0.3, [0xff4fa3, 0xffb300, 0x20b46e, 0x2f7de1][i % 4]), -RW / 2 + 1 + i * (RW - 2) / 11, 3.1 + (i % 2) * 0.25, -RD / 2 + 0.4);
    if (T.dark) {
      // Neon strips along the walls.
      [[0, -RD / 2 + 0.16, RW - 0.4, 0.05], [-RW / 2 + 0.16, 0, 0.05, RD - 0.4]].forEach(([x, z, w2, d2]) => { const m = glow(0xff3dbb); anim.tiles.push({ mat: m, kind: "neon" }); put(box(w2, 0.08, d2, m), x, 2.9, z); });
    }
    if (T.open) {
      // Shared open-air pieces: moving-head lights on a truss, string lights, LED strips.
      const heads = (xs, z, y = 4.35) => {
        const x0 = Math.min(...xs) - 0.6, x1 = Math.max(...xs) + 0.6;
        put(box(x1 - x0, 0.15, 0.15, 0xbdbdbd), (x0 + x1) / 2, y + 0.25, z - 0.2);
        [x0, x1].forEach((x) => put(box(0.1, y + 0.3, 0.1, 0xbdbdbd), x, (y + 0.3) / 2, z - 0.2));
        xs.forEach((x, i) => {
          const head = new THREE.Group(); head.position.set(x, y, z); g.add(head);
          head.add(box(0.36, 0.36, 0.36, 0xeeeeee));
          const lensMat = glow(0x222222); const lens = box(0.24, 0.05, 0.24, lensMat); lens.position.y = -0.2; head.add(lens);
          const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
          const beam = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.5, 16, 1, true), beamMat); beam.position.y = -2.95; head.add(beam);
          anim.heads.push({ head, lensMat, beamMat, i });
        });
      };
      const strings = (rows, y = 3.7) => rows.forEach((z, k) => { for (let i = 0; i <= 24; i++) {
        const x = -RW / 2 + 1 + i * (RW - 2) / 24;
        const m = glow(0x666666); anim.tiles.push({ mat: m, kind: "bulb", i: i + k * 7 });
        put(sph(0.08, m), x, y - Math.abs(Math.sin(i * 0.5)) * 0.4, z + Math.sin(i * 0.9) * 0.6);
      } });
      const led = (x, z, w2, d2, col) => { const m = glow(0x444444); anim.tiles.push({ mat: m, kind: "led", col }); put(box(w2, 0.04, d2, m), x, 0.03, z); };
      const speakers = (x, z) => { for (let k = 0; k < 4; k++) put(box(0.9, 0.55, 0.7, 0xf4f4f4), x, 0.3 + k * 0.57, z); colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.4, z1: z + 0.4 }); };

      if (T.setting === "rooftop") {
        // The roof around us and the city skyline in every direction.
        const roof = put(new THREE.Mesh(new THREE.PlaneGeometry(RW + 16, RD + 16), lam(0x3b3f45)), 0, -0.04, 0); roof.rotation.x = -Math.PI / 2;
        const winTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 64, 128); for (let r = 0; r < 16; r++) for (let q = 0; q < 6; q++) if (Math.random() < 0.55) { x.fillStyle = Math.random() < 0.8 ? "#ffd98a" : "#9fd6ff"; x.fillRect(4 + q * 10, 4 + r * 8, 6, 4); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
        for (let i = 0; i < 34; i++) {
          const a = (i / 34) * Math.PI * 2 + 0.3, r = 30 + (i * 7919 % 13);
          const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r - 4;
          if (z > RD / 2 + 4) continue; // keep the view behind the camera clear
          const h = 18 + (i * 37 % 40), bw = 4 + (i % 4) * 1.5;
          const tex = winTex.clone(); tex.needsUpdate = true; tex.repeat.set(bw / 4, h / 8);
          const mat = new THREE.MeshLambertMaterial({ color: [0x2d3a4f, 0x3a4458, 0x26303f][i % 3], emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 });
          anim.tiles.push({ mat, kind: "skyline" });
          put(box(bw, h, bw, mat), x, h / 2 - 30, z);
          if (i % 5 === 0) { const tip = glow(0xff3b3b); anim.tiles.push({ mat: tip, kind: "led", col: 0xff3b3b, day: 0x552222 }); put(sph(0.3, tip), x, h - 29.6, z); }
        }
        // Planters along the parapet.
        [[-12, -8.4], [-6, -8.4], [6, -8.4], [12.4, -8.4], [-12.4, 6], [12.4, 1]].forEach(([x, z]) => { put(box(1.2, 0.7, 0.7, 0x2f2f33), x, 0.35, z); put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), lam(0x3f8f4a)), x, 1.1, z); colliders.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.35, z1: z + 0.35 }); });
        // Neon sign on the back parapet.
        const sc = document.createElement("canvas"); sc.width = 512; sc.height = 128; const sx = sc.getContext("2d");
        sx.fillStyle = "#0b0b14"; sx.fillRect(0, 0, 512, 128); sx.font = "700 50px Fredoka, system-ui, sans-serif"; sx.textAlign = "center"; sx.textBaseline = "middle";
        sx.shadowColor = "#ff3dbb"; sx.shadowBlur = 18; sx.fillStyle = "#ffd6f3"; sx.fillText("#DETTYDECEMBER", 256, 66);
        const neon = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc) });
        anim.tiles.push({ mat: neon, kind: "led", col: 0xffffff, day: 0x8a8a8a });
        put(box(5.2, 1.3, 0.12, neon), 7.6, 2.3, -RD / 2 + 0.35);
        // DJ hub: speakers, moving heads, LED walkway from the door to the floor.
        speakers(-5, -7.8); speakers(5, -7.8);
        heads([-3, -1, 1, 3], -6.6, 4.6);
        led(-1.7, 4.6, 0.06, 7.4, 0x6ad8ff); led(1.7, 4.6, 0.06, 7.4, 0x6ad8ff);
        led(0, -RD / 2 + 0.3, RW - 0.6, 0.06, 0xb04bff); led(-RW / 2 + 0.3, 0, 0.06, RD - 0.6, 0xb04bff); led(RW / 2 - 0.3, 0, 0.06, RD - 0.6, 0xb04bff);
        strings([-1, 2.5, 6], 3.9);
      } else {
        // Sand and sea beyond the deck.
        const sand = put(new THREE.Mesh(new THREE.PlaneGeometry(RW + 40, RD + 30), lam(0xd9b97c)), 0, -0.04, 0); sand.rotation.x = -Math.PI / 2;
        const sea = put(new THREE.Mesh(new THREE.PlaneGeometry(RW + 120, 80), new THREE.MeshLambertMaterial({ color: 0x3d97cf })), 0, -0.02, -RD / 2 - 44); sea.rotation.x = -Math.PI / 2;
        anim.tiles.push({ mat: sea.material, kind: "sea" });
        // Palms, gold lanterns and balloons.
        const palm = (x, z, sc = 1) => {
          const t = put(cyl(0.12 * sc, 0.2 * sc, 4.4 * sc, 0x9a7448, 6), x, 2.2 * sc, z); t.rotation.z = 0.08;
          for (let i = 0; i < 7; i++) { const l = put(box(2.4 * sc, 0.06, 0.5 * sc, 0x2f9b48), x + 0.2, 4.4 * sc, z); l.rotation.y = (i / 7) * Math.PI * 2; l.rotation.z = -0.38; l.translateX(1.0 * sc); }
        };
        [[-13, -9], [13.4, -1.5], [-13.3, 8.5], [13.3, 8.6], [-8.5, 8.8], [4, -9.4]].forEach(([x, z]) => { palm(x, z); colliders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 }); });
        [[-9.6, 6.9], [9.6, 6.9], [-3, 7.6], [2.6, 7.6], [7.2, -2.2], [-9.2, -6.4]].forEach(([x, z]) => {
          put(box(0.4, 0.75, 0.4, new THREE.MeshLambertMaterial({ color: 0xd8a93b, transparent: true, opacity: 0.6 })), x, 0.38, z);
          const f = put(sph(0.08, glow(0xffb300)), x, 0.35, z); anim.tiles.push({ mat: f.material, kind: "flame" });
          put(box(0.46, 0.05, 0.46, 0xd8a93b), x, 0.78, z);
        });
        [[-12.5, -5.2, 0xffffff], [-12.2, -4.6, 0xd8a93b], [12.4, 1.4, 0xffffff], [12.8, 0.8, 0xd8a93b]].forEach(([x, z, c]) => { put(sph(0.45, c), x, 2.7, z); put(cyl(0.01, 0.01, 2.2, 0x999999, 3), x, 1.4, z); });
        speakers(-9.2, -8.3); speakers(-4.8, -8.3);
        heads([-7.5, -4, -0.5, 1.6], -8.4);
        strings([-6, 0, 6]);
        led(0, -RD / 2 + 0.3, RW - 0.6, 0.06, 0xffd9a0); led(-RW / 2 + 0.3, 0, 0.06, RD - 0.6, 0xffd9a0); led(RW / 2 - 0.3, 0, 0.06, RD - 0.6, 0xffd9a0);
      }
    }
    if (T.glass) {
      // Geometric black-and-white rug under the sectional.
      const rc = document.createElement("canvas"); rc.width = 256; rc.height = 160; const rx = rc.getContext("2d");
      rx.fillStyle = "#f4f2ee"; rx.fillRect(0, 0, 256, 160); rx.strokeStyle = "#1c1c1e"; rx.lineWidth = 5;
      for (let i = -6; i < 14; i++) { rx.beginPath(); rx.moveTo(i * 28, 0); rx.lineTo(i * 28 + 80, 160); rx.moveTo(i * 28 + 80, 0); rx.lineTo(i * 28, 160); rx.stroke(); }
      rx.lineWidth = 10; rx.strokeRect(5, 5, 246, 150);
      const rug = put(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(rc) })), -2.6, 0.012, -1.4); rug.rotation.x = -Math.PI / 2;
      // Ring chandelier over the lounge.
      const ring = glow(0x999999); anim.tiles.push({ mat: ring, kind: "led", col: 0xfff3dc, day: 0xf4f4f4 });
      [1.3, 0.9].forEach((r, i) => { const t = put(new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 40), ring), -2.6, 4.0 - i * 0.35, 0.2); t.rotation.x = Math.PI / 2; });
      [-1, 1].forEach((a) => put(cyl(0.008, 0.008, 1.2, 0x555555, 3), -2.6 + a * 1.2, 4.6, 0.2));
      // Cove lighting along the top of the walls and LED skirting.
      const cove = (x, z, w2, d2, y) => { const m = glow(0x888888); anim.tiles.push({ mat: m, kind: "led", col: 0xfff1d6, day: 0xf2f2f2 }); put(box(w2, 0.05, d2, m), x, y, z); };
      cove(-RW / 2 + 0.2, 0, 0.05, RD - 0.4, H - 0.2); cove(-RW / 2 + 0.2, 0, 0.05, RD - 0.4, 0.04);
      cove(0, -RD / 2 + 0.15, RW - 0.4, 0.05, 0.04);
      // Big potted plants.
      [[-12.2, 1.2], [12.2, -1.6], [12.2, 2.6], [-6.8, -3.6]].forEach(([x, z]) => {
        put(cyl(0.4, 0.32, 0.8, 0xf5f5f3, 12), x, 0.4, z);
        for (let i = 0; i < 4; i++) put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), lam(i % 2 ? 0x2f7d3c : 0x3f9b4f)), x + Math.cos(i * 1.6) * 0.25, 1.2 + i * 0.35, z + Math.sin(i * 1.6) * 0.25);
        colliders.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45 });
      });
      // A low glass partition hides the spa bathroom.
      put(box(0.06, 2.4, 3.4, new THREE.MeshLambertMaterial({ color: 0xe8eef2, transparent: true, opacity: 0.55 })), -9.9, 1.2, 7.2);
      colliders.push({ x0: -10, x1: -9.8, z0: 5.5, z1: 8.9 });
      // Outside the glass: lawn, a lit infinity pool with loungers, palms, a hedge and the ocean.
      const lawn = put(new THREE.Mesh(new THREE.PlaneGeometry(RW + 60, RD + 50), lam(0x3f7a3a)), 0, -0.3, -6); lawn.rotation.x = -Math.PI / 2;
      put(box(RW + 6, 0.12, 9, 0xe9e4da), 0, -0.24, -RD / 2 - 5);
      const water = new THREE.MeshLambertMaterial({ color: 0x2bb8e0, emissive: 0x000000 });
      put(box(16, 0.06, 4.2, water), -2, -0.15, -RD / 2 - 5.2); anim.tiles.push({ mat: water, kind: "poolglow" });
      [-8, -5.5, 4, 6.5].forEach((x) => { put(box(0.8, 0.25, 2.0, 0xffffff), x, -0.05, -RD / 2 - 1.6); put(box(0.78, 0.5, 0.12, 0xffffff), x, 0.15, -RD / 2 - 0.8).rotation.x = -0.6; });
      const palm = (x, z, sc = 1) => {
        const t = put(cyl(0.12 * sc, 0.2 * sc, 4.4 * sc, 0x9a7448, 6), x, 2.2 * sc - 0.3, z); t.rotation.z = 0.08;
        for (let i = 0; i < 7; i++) { const l = put(box(2.4 * sc, 0.06, 0.5 * sc, 0x2f9b48), x + 0.2, 4.1 * sc, z); l.rotation.y = (i / 7) * Math.PI * 2; l.rotation.z = -0.38; l.translateX(1.0 * sc); }
      };
      [[-15, -12], [15, -12], [16.5, 0], [-16.5, -4], [9, -15.5], [-9, -15.5]].forEach(([x, z]) => palm(x, z, 1.3));
      put(box(1.0, 1.2, RD + 10, 0x2f6b3c), RW / 2 + 5, 0.3, -2); put(box(1.0, 1.2, RD + 10, 0x2f6b3c), -RW / 2 - 5, 0.3, -2);
      put(box(RW + 10, 1.0, 0.6, 0xf0ede6), 0, 0.2, -RD / 2 - 10);
      const sea = put(new THREE.Mesh(new THREE.PlaneGeometry(RW + 140, 80), new THREE.MeshLambertMaterial({ color: 0x3d97cf })), 0, -0.6, -RD / 2 - 52); sea.rotation.x = -Math.PI / 2;
      anim.tiles.push({ mat: sea.material, kind: "sea" });
      const warm = new THREE.PointLight(0xffd9a0, 0, 26); warm.position.set(0, 4.2, 0); g.add(warm); anim.night = warm;
    }
    // Christmas from the 15th: a little tree in the corner.
    if ((opts.day || 0) >= 15 && !T.objects.some((o) => o.k === "xtree")) {
      const tx = RW / 2 - 1.1, tz = -RD / 2 + 1.1;
      for (let i = 0; i < 3; i++) put(new THREE.Mesh(new THREE.ConeGeometry(0.7 - i * 0.18, 0.9, 8), lam(0x1b7a3a)), tx, 0.55 + i * 0.6, tz);
      put(new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(0xffd23b)), tx, 2.3, tz);
      colliders.push({ x0: tx - 0.7, x1: tx + 0.7, z0: tz - 0.7, z1: tz + 0.7 });
    }

    // Lights.
    const main = new THREE.PointLight(T.light, T.dark ? 0.5 : T.open ? 0 : 0.75, Math.max(RW, RD) * 2.2);
    main.position.set(0, 3.6, 0); g.add(main);
    if (T.open) { anim.night = main; [[-6, -5, 0xff4fd8], [6, -5, 0x4fc3ff], [0, 3, 0x7c4dff]].forEach(([x, z, c]) => { const l = new THREE.PointLight(c, 0, 14); l.position.set(x, 3.2, z); g.add(l); anim.lights.push(l); }); }
    if (T.dark) for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xff3dbb, 0.9, 12); l.position.set(-3 + i * 3, 3, 0); g.add(l); anim.lights.push(l); }
    return { group: g, colliders, objects, walls, anim, w: RW, d: RD, dark: !!T.dark, open: !!T.open, glass: !!T.glass, type };
  }

  // Animate dance floors, TVs, neon, candles and disco balls.
  // night: 0 (full day) to 1 (full night); open-air venues change with it.
  function animate(room, t, night = 1) {
    if (!room) return;
    const tmp = new THREE.Color();
    for (const a of room.anim.tiles) {
      if (a.kind === "led") { tmp.setHex(a.day || 0x9a9a9a).lerp(new THREE.Color(a.col), night); a.mat.color.copy(tmp); continue; }
      if (a.kind === "bulb") { if (night < 0.3) a.mat.color.setHex(0xf3ead8); else a.mat.color.setHSL(0.11, 0.9, 0.5 + 0.35 * night * (0.85 + 0.15 * Math.sin(t * 2 + a.i))); continue; }
      if (a.kind === "nightfade") { a.mat.opacity = a.max * night * (0.7 + 0.3 * Math.sin(t * 1.5)); continue; }
      if (a.kind === "poolglow") { a.mat.emissive.setHSL(0.53, 0.9, 0.08 + 0.22 * night); continue; }
      if (a.kind === "skyline") { a.mat.emissiveIntensity = 0.12 + 0.88 * night; continue; }
      if (a.kind === "emis") { a.mat.emissive.setHex(a.col).multiplyScalar(0.7 * night); continue; }
      if (a.kind === "sea") { a.mat.color.setHSL(0.57, 0.62, 0.4 - 0.25 * night); continue; }
      if (a.kind === "deck") { if (night < 0.4) a.mat.color.setHex(0xe9dcc5); else a.mat.color.setHSL(((t * 0.15) % 1), 0.8, 0.3 + 0.12 * Math.sin(t * 4)); continue; }
      if (a.kind === "floor") a.mat.color.setHSL(((a.i * 0.13 + a.j * 0.21 + t * 0.35) % 1), 0.85, 0.35 + 0.15 * Math.sin(t * 4 + a.i + a.j));
      else if (a.kind === "tv") a.mat.color.setHSL((t * 0.05) % 1, 0.5, 0.35 + Math.sin(t * 3) * 0.05);
      else if (a.kind === "neon") a.mat.color.setHSL((0.88 + Math.sin(t * 0.5) * 0.08) % 1, 1, 0.55);
      else if (a.kind === "flame") a.mat.color.setHSL(0.1, 1, 0.55 + Math.sin(t * 9) * 0.08);
      else if (a.kind === "twinkle") a.mat.color.setHSL(((a.i * 0.25) % 1), 1, 0.4 + 0.3 * ((Math.sin(t * 3 + a.i) + 1) / 2));
      else if (a.kind === "water") a.mat.color.setHSL(0.55, 0.8, 0.55 + Math.sin(t * 1.5) * 0.03);
    }
    room.anim.spin.forEach((m) => { m.rotation.y += 0.03; if (m.geometry.type === "CylinderGeometry") m.rotation.z += 0.3; });
    if (room.anim.night) room.anim.night.intensity = 0.7 * night;
    (room.anim.flames || []).forEach((f, i) => { f.scale.set(1, 0.7 + 0.45 * Math.abs(Math.sin(t * 7 + i * 1.7)), 1); f.position.y = 0.72 + f.scale.y * 0.18; });
    (room.anim.heads || []).forEach((h) => {
      const on = night > 0.5;
      h.head.rotation.z = Math.sin(t * 0.9 + h.i * 1.3) * 0.6;
      h.head.rotation.x = Math.cos(t * 0.7 + h.i) * 0.45;
      const c = new THREE.Color().setHSL(((t * 0.1 + h.i * 0.25) % 1), 1, 0.6);
      h.lensMat.color.copy(on ? c : new THREE.Color(0x222222));
      h.beamMat.color.copy(c); h.beamMat.opacity = on ? 0.13 : 0;
    });
    if (room.open) { room.anim.lights.forEach((l, i) => { l.intensity = night > 0.5 ? 0.9 : 0; l.color.setHSL(((t * 0.12 + i / 3) % 1), 1, 0.55); }); return; }
    room.anim.lights.forEach((l, i) => { l.color.setHSL(((t * 0.2 + i / 3) % 1), 1, 0.5); l.position.x = Math.sin(t * 0.8 + i * 2) * room.w * 0.3; l.position.z = Math.cos(t * 0.6 + i * 2) * room.d * 0.3; });
  }

  window.Rooms = { build, animate, SIZE };
})();
