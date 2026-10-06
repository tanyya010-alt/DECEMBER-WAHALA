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
    shower: [1.8, 1.8], speaker: [1.6, 0.8], sofa: [3, 1.1], broom: [0.6, 0.6], plant: [0.8, 0.8], pots: [5, 1.2], toilet: [1.4, 1.4],
    counter: [4, 1.2], bar: [1.4, 6], dancefloor: [8, 6], dj: [3, 1.4], couch: [1.4, 3], photowall: [3.5, 0.3], shop: [4, 1.4],
    kiosk: [3, 1.2], cinema: [6, 0.4], bench: [2.4, 0.7], xtree: [1.6, 1.6], rack: [4, 0.8], mirror: [1, 0.3], salonchair: [1, 1],
    dryer: [1, 2.8], treadmill: [1, 2], weights: [3.5, 1], cooler: [0.6, 0.6], altar: [3, 1.2], choir: [3, 1.4], pew: [3.6, 0.8],
    stage: [8, 2], crates: [1.6, 1.6], pool: [6, 3.6], bike: [0.7, 1.8], door: [2.2, 0.3],
  };
  const WALKABLE = new Set(["dancefloor", "choir", "door", "photowall"]);

  function build(type, opts = {}) {
    const T = SIMS.INTERIORS[type] || SIMS.INTERIORS.home;
    const home = opts.home || SIMS.START_HOME;
    const g = new THREE.Group();
    const RW = T.w, RD = T.d;
    const colliders = [], objects = [], walls = [], anim = { tiles: [], spin: [], lights: [] };
    const put = (m, x, y, z, parent = g) => { m.position.set(x, y, z); parent.add(m); return m; };
    const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === "number" ? lam(c) : c);
    const cyl = (rt, rb, h, c, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === "number" ? lam(c) : c);
    const sph = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), typeof c === "number" ? lam(c) : c);

    // Floor, walls (the two facing the camera drop down, like The Sims).
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshLambertMaterial({ map: tile(T.floor[0], T.floor[1], RW / 2, RD / 2) }));
    floor.rotation.x = -Math.PI / 2; floor.userData.floor = true; g.add(floor);
    put(box(RW + 0.6, 0.5, RD + 0.6, 0x8d6e63), 0, -0.26, 0);
    const wallMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(T.wall) });
    const H = 3.4;
    const wall = (w, d, x, z, nx, nz) => {
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
    if (!T.dark) for (let x = -RW / 2 + 2.5; x < RW / 2 - 1.5; x += 4.2) put(box(1.6, 1.3, 0.05, 0xbfe3ff), x, 2.1, -RD / 2 + 0.15);
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
        case "pool": P(box(w + 0.6, 0.2, d + 0.6, 0xeceff1), 0, 0.1, 0); { const m = new THREE.MeshLambertMaterial({ color: 0x29b6f6 }); P(box(w, 0.05, d, m), 0, 0.2, 0); anim.tiles.push({ mat: m, kind: "water" }); } break;
        case "bike": P(cyl(0.3, 0.3, 0.1, 0x111111, 12), 0, 0.3, 0.6).rotation.z = Math.PI / 2; P(cyl(0.3, 0.3, 0.1, 0x111111, 12), 0, 0.3, -0.6).rotation.z = Math.PI / 2; P(box(0.25, 0.4, 1.2, 0xd32f2f), 0, 0.65, 0); P(box(0.7, 0.05, 0.05, 0x9e9e9e), 0, 1.0, 0.55); break;
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
      if (["table", "desk", "bar"].includes(o.k)) (o.seats || []).forEach(([sx, sz, r, pose]) => {
        if (pose !== "sit") return;
        const ch = new THREE.Group();
        ch.position.set(sx, 0, sz); ch.rotation.y = r;
        const c = type === "club" || type === "lounge" ? 0x880e4f : type === "restaurant" ? 0x5d4037 : type === "mamaput" ? 0xd62828 : 0xa1785a;
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
    // Christmas from the 15th: a little tree in the corner.
    if ((opts.day || 0) >= 15 && !T.objects.some((o) => o.k === "xtree")) {
      const tx = RW / 2 - 1.1, tz = -RD / 2 + 1.1;
      for (let i = 0; i < 3; i++) put(new THREE.Mesh(new THREE.ConeGeometry(0.7 - i * 0.18, 0.9, 8), lam(0x1b7a3a)), tx, 0.55 + i * 0.6, tz);
      put(new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(0xffd23b)), tx, 2.3, tz);
      colliders.push({ x0: tx - 0.7, x1: tx + 0.7, z0: tz - 0.7, z1: tz + 0.7 });
    }

    // Lights.
    const main = new THREE.PointLight(T.light, T.dark ? 0.5 : 0.75, Math.max(RW, RD) * 2.2);
    main.position.set(0, 3.6, 0); g.add(main);
    if (T.dark) for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xff3dbb, 0.9, 12); l.position.set(-3 + i * 3, 3, 0); g.add(l); anim.lights.push(l); }
    return { group: g, colliders, objects, walls, anim, w: RW, d: RD, dark: !!T.dark, type };
  }

  // Animate dance floors, TVs, neon, candles and disco balls.
  function animate(room, t) {
    if (!room) return;
    for (const a of room.anim.tiles) {
      if (a.kind === "floor") a.mat.color.setHSL(((a.i * 0.13 + a.j * 0.21 + t * 0.35) % 1), 0.85, 0.35 + 0.15 * Math.sin(t * 4 + a.i + a.j));
      else if (a.kind === "tv") a.mat.color.setHSL((t * 0.05) % 1, 0.5, 0.35 + Math.sin(t * 3) * 0.05);
      else if (a.kind === "neon") a.mat.color.setHSL((0.88 + Math.sin(t * 0.5) * 0.08) % 1, 1, 0.55);
      else if (a.kind === "flame") a.mat.color.setHSL(0.1, 1, 0.55 + Math.sin(t * 9) * 0.08);
      else if (a.kind === "twinkle") a.mat.color.setHSL(((a.i * 0.25) % 1), 1, 0.4 + 0.3 * ((Math.sin(t * 3 + a.i) + 1) / 2));
      else if (a.kind === "water") a.mat.color.setHSL(0.55, 0.8, 0.55 + Math.sin(t * 1.5) * 0.03);
    }
    room.anim.spin.forEach((m) => { m.rotation.y += 0.03; if (m.geometry.type === "CylinderGeometry") m.rotation.z += 0.3; });
    room.anim.lights.forEach((l, i) => { l.color.setHSL(((t * 0.2 + i / 3) % 1), 1, 0.5); l.position.x = Math.sin(t * 0.8 + i * 2) * room.w * 0.3; l.position.z = Math.cos(t * 0.6 + i * 2) * room.d * 0.3; });
  }

  window.Rooms = { build, animate, SIZE };
})();
