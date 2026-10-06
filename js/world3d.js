// DECEMBER WAHALA — the explorable 3D city (three.js r128).
// Builds Lagos or Abuja from WORLD data, moves the player with keys or a
// joystick, handles collisions, follows with the camera, draws everyone the
// sim says is out on the streets, and runs day/night and December decorations.
/* global THREE, WORLD, DATA, NAV, Avatar3D */
(function () {
  const W = window.WORLD, D = window.DATA, NAV = window.NAV;
  const G = W.GRID;
  const lam = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const lerp = (a, b, k) => a + (b - a) * k;
  const PLAYER_R = 0.5;
  const HUMAN = 1.7; // characters are drawn a little larger than life so they read well on the street
  const WALK = 6.2, RUN = 9.5;

  // Sky colours through the day, keyed by hour.
  const SKY = [[0, 0x16224a], [5, 0x22305e], [6.5, 0xffb27a], [8, 0xa9d8ff], [17, 0xa9d8ff], [18.5, 0xff9466], [19.6, 0x34366e], [21, 0x16224a], [24, 0x16224a]];
  function skyAt(h) {
    for (let i = 1; i < SKY.length; i++) if (h <= SKY[i][0]) {
      const [h0, c0] = SKY[i - 1], [h1, c1] = SKY[i];
      const k = (h - h0) / (h1 - h0);
      return new THREE.Color(c0).lerp(new THREE.Color(c1), k);
    }
    return new THREE.Color(SKY[0][1]);
  }
  function daylight(h) { return h < 5.5 || h > 20 ? 0 : h < 7.5 ? (h - 5.5) / 2 : h > 18 ? (20 - h) / 2 : 1; }

  function signTexture(icon, text, opts = {}) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = opts.bg || "#ffffff";
    const r = 40;
    g.beginPath(); g.moveTo(r, 8); g.arcTo(504, 8, 504, 120, r); g.arcTo(504, 120, 8, 120, r); g.arcTo(8, 120, 8, 8, r); g.arcTo(8, 8, 504, 8, r); g.fill();
    g.fillStyle = opts.fg || "#1b2232";
    g.font = "700 46px 'Plus Jakarta Sans', system-ui, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    let label = `${icon}  ${text}`;
    while (g.measureText(label).width > 470 && label.length > 6) label = label.slice(0, -2);
    g.fillText(label, 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function muralTexture() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, "#ff4fa3"); grad.addColorStop(0.5, "#ffb300"); grad.addColorStop(1, "#20b46e");
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsla(${i * 37},90%,70%,.5)`; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 256, 8 + Math.random() * 22, 0, 7); g.fill(); }
    g.fillStyle = "#fff"; g.font = "900 64px 'Bricolage Grotesque', system-ui"; g.textAlign = "center";
    g.fillText("DETTY", 256, 110); g.fillText("DECEMBER", 256, 180);
    return new THREE.CanvasTexture(c);
  }
  function tileTexture(a, b) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 32, y * 32, 32, 32); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 5); return t;
  }

  class World {
    constructor(container, sim, hooks) {
      this.el = container;
      this.sim = sim;
      this.hooks = hooks || {};
      this.city = sim.s.city;
      this.places = sim.places;
      this.colliders = [];
      this.people = new Map();
      this.remote = new Map();
      this.keys = {};
      this.joy = { x: 0, z: 0 };
      this.zoom = 1;
      this.interior = false;
      this.autoPath = null;
      this.target = null;
      this.labels = new Map();
      this.time = 0;
      this.mobile = matchMedia("(pointer: coarse)").matches;

      const r = new THREE.WebGLRenderer({ antialias: !this.mobile, powerPreference: "high-performance" });
      r.setPixelRatio(Math.min(this.mobile ? 1.5 : 2, devicePixelRatio || 1));
      this.renderer = r;
      container.appendChild(r.domElement);
      r.domElement.className = "world-canvas";
      this.labelLayer = document.createElement("div");
      this.labelLayer.className = "world-labels";
      container.appendChild(this.labelLayer);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0xa9d8ff, 70, 170);
      this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 500);
      this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 0.85);
      this.sun = new THREE.DirectionalLight(0xffffff, 0.75);
      this.sun.position.set(30, 60, 40);
      this.scene.add(this.hemi, this.sun);

      this.cityGroup = new THREE.Group();
      this.scene.add(this.cityGroup);
      this.windowMat = new THREE.MeshBasicMaterial({ color: 0x2b3a55 });
      this.bulbMat = new THREE.MeshBasicMaterial({ color: 0x777777 });
      this.neonMats = [];
      this.xmas = new THREE.Group();
      this.cityGroup.add(this.xmas);
      this.buildCity();
      this.buildVehicles();
      this.buildInterior();
      this.buildPlayer(sim.s.look);
      this.placePlayer();

      // Soft sun shadows on bigger screens; phones skip them to stay smooth.
      this.shadows = !this.mobile;
      if (this.shadows) {
        r.shadowMap.enabled = true;
        r.shadowMap.type = THREE.PCFSoftShadowMap;
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        const sc = this.sun.shadow.camera;
        sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 1; sc.far = 220;
        this.sun.shadow.bias = -0.0015;
        this.scene.add(this.sun.target);
        this.cityGroup.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = !(o.geometry && o.geometry.type === "PlaneGeometry"); o.receiveShadow = true; } });
        this.room.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.shadowify(this.player);
      }

      this.bindInput();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
      this.resize();
    }

    // ------------------------------------------------------------ city
    collider(cx, cz, w, d) { this.colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }); }
    add(m, x, y, z) { m.position.set(x, y, z); this.cityGroup.add(m); return m; }

    buildCity() {
      const lagos = this.city === "lagos";
      const land = lagos ? 0xd6e4b5 : 0xcfe3b0;
      this.add(new THREE.Mesh(new THREE.PlaneGeometry(220, 200), lam(land)), 0, -0.02, 5).rotation.x = -Math.PI / 2;

      // Block pads (pavements and plazas).
      const pad = lam(0xe8e2d4);
      for (const x of G.cols) for (const z of G.rows) this.add(box(G.blockW + 1.2, 0.12, G.blockD + 1.2, pad), x, 0.06, z);

      // Roads with lane markings.
      const asphalt = lam(0x4b5059);
      const dashGeo = new THREE.BoxGeometry(1.6, 0.02, 0.18);
      const dashes = [];
      const crosses = (z1, z2) => lagos && Math.min(z1, z2) < G.water.band[0] && Math.max(z1, z2) > G.water.band[1];
      for (const z of G.hRoads) {
        this.add(box(136, 0.1, G.roadW, asphalt), 0, 0.05, z);
        for (let x = -66; x < 66; x += 4) if (!G.vRoads.some((v) => Math.abs(v - x) < 3.5)) dashes.push([x, z, 0]);
      }
      for (const x of G.vRoads) for (let j = 0; j < G.hRoads.length - 1; j++) {
        const z1 = G.hRoads[j], z2 = G.hRoads[j + 1];
        if (crosses(z1, z2) && !G.water.bridges.includes(x)) continue;
        const bridge = crosses(z1, z2);
        const seg = this.add(box(G.roadW, bridge ? 0.5 : 0.1, z2 - z1 - G.roadW, bridge ? lam(0x6b707a) : asphalt), x, bridge ? 0.25 : 0.05, (z1 + z2) / 2);
        void seg;
        if (bridge) {
          const rail = lam(0xd0d4da);
          [-1, 1].forEach((s) => this.add(box(0.25, 0.8, z2 - z1 - G.roadW, rail), x + s * 3.1, 0.9, (z1 + z2) / 2));
        }
        for (let z = z1 + 5; z < z2 - 4; z += 4) dashes.push([x, z, Math.PI / 2]);
      }
      const dashMesh = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: 0xf5f1e6 }), dashes.length);
      const m4 = new THREE.Matrix4();
      dashes.forEach(([x, z, r], i) => { m4.makeRotationY(r); m4.setPosition(x, 0.11, z); dashMesh.setMatrixAt(i, m4); });
      this.cityGroup.add(dashMesh);

      // Water: lagoon (Lagos) or park (Abuja); ocean or lake to the south.
      const [b0, b1] = G.water.band;
      if (lagos) {
        this.water = this.add(new THREE.Mesh(new THREE.PlaneGeometry(150, b1 - b0), lam(0x4fa9d6)), 0, 0.02, (b0 + b1) / 2);
        this.water.rotation.x = -Math.PI / 2;
        const xs = [-75, ...G.water.bridges.flatMap((b) => [b - 3.2, b + 3.2]), 75];
        for (let i = 0; i < xs.length; i += 2) this.collider((xs[i] + xs[i + 1]) / 2, (b0 + b1) / 2, xs[i + 1] - xs[i], b1 - b0);
      } else {
        this.add(new THREE.Mesh(new THREE.PlaneGeometry(150, b1 - b0), lam(0xa9d68e)), 0, 0.03, (b0 + b1) / 2).rotation.x = -Math.PI / 2;
        this.addTrees([...Array(26)].map((_, i) => [-62 + i * 5, b0 + 2 + (i % 2) * 7]));
        const path = lam(0xe9dcc0);
        this.add(box(140, 0.06, 1.6, path), 0, 0.05, (b0 + b1) / 2);
      }
      const [s0, s1] = G.beach;
      this.add(new THREE.Mesh(new THREE.PlaneGeometry(150, s1 - s0 + 2), lam(lagos ? 0xf1dda2 : 0xc9e2a6)), 0, 0.03, (s0 + s1) / 2).rotation.x = -Math.PI / 2;
      this.sea = this.add(new THREE.Mesh(new THREE.PlaneGeometry(220, 60), lam(lagos ? 0x3d97cf : 0x5cb2d6)), 0, 0.01, s1 + 30);
      this.sea.rotation.x = -Math.PI / 2;
      this.collider(0, s1 + 30, 240, 60);
      this.foam = this.add(box(150, 0.03, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })), 0, 0.05, s1 + 0.4);
      if (!lagos) {
        const rock = this.add(new THREE.Mesh(new THREE.DodecahedronGeometry(30, 1), lam(0x8f8c78, { flatShading: true })), 30, 6, -95);
        rock.scale.set(1.6, 0.9, 1);
      } else {
        // Far skyline across the water.
        const tower = lam(0x9fb3c8);
        for (let i = 0; i < 9; i++) this.add(box(5 + (i % 3), 16 + (i * 7) % 22, 5, tower), -60 + i * 15, 10, s1 + 48);
      }
      // World edges.
      const B = G.bounds;
      this.collider(B.x[0] - 5, 5, 10, 200); this.collider(B.x[1] + 5, 5, 10, 200); this.collider(0, B.z[0] - 5, 200, 10);

      // Places.
      for (const p of Object.values(this.places)) if (!p.remote) this.buildPlace(p);

      // Street lamps along the roads.
      const lampPos = [];
      for (const z of G.hRoads) for (let x = -60; x <= 60; x += 13) lampPos.push([x, z + 3.6]);
      const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), lam(0x3c4048), lampPos.length);
      const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), this.bulbMat, lampPos.length);
      lampPos.forEach(([x, z], i) => { m4.makeTranslation(x, 2.1, z); poleMesh.setMatrixAt(i, m4); m4.makeTranslation(x, 4.25, z); bulbMesh.setMatrixAt(i, m4); });
      this.cityGroup.add(poleMesh, bulbMesh);

      // Trees around the blocks.
      const trees = [];
      for (const x of G.cols) for (const z of G.rows) { trees.push([x - 9.6, z - 6.6], [x + 9.6, z - 6.6]); }
      for (let x = -64; x <= 64; x += 9) trees.push([x, lagos ? 59 : 60]);
      this.addTrees(trees);
      this.buildDecorations();
    }

    addTrees(list) {
      const m4 = new THREE.Matrix4();
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 6), lam(0x7a5233), list.length);
      const tops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.4, 0), lam(0x3f9b4f, { flatShading: true }), list.length);
      list.forEach(([x, z], i) => {
        m4.makeTranslation(x, 1.1, z); trunks.setMatrixAt(i, m4);
        const s = 0.8 + ((i * 37) % 10) / 20;
        m4.makeScale(s, s * 1.15, s); m4.setPosition(x, 2.8, z); tops.setMatrixAt(i, m4);
      });
      this.cityGroup.add(trunks, tops);
      list.forEach(([x, z]) => this.collider(x, z, 0.6, 0.6));
    }
    palm(x, z) {
      const trunk = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 5, 6), lam(0x9a7448)), x, 2.5, z);
      trunk.rotation.z = 0.12;
      for (let i = 0; i < 6; i++) {
        const leaf = this.add(box(2.6, 0.08, 0.6, lam(0x3e9b48)), x + 0.3, 5, z);
        leaf.rotation.y = (i / 6) * Math.PI * 2; leaf.rotation.z = -0.35; leaf.translateX(1.1);
      }
      this.collider(x, z, 0.5, 0.5);
    }

    buildPlace(p) {
      const T = W.TYPES[p.type];
      const front = p.z + (p.side === "S" ? 1 : -1) * (p.d / 2);
      const dir = p.side === "S" ? 1 : -1;
      const sign = (y, w = Math.min(p.w - 1, 9)) => {
        const s = this.add(new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true })), p.x, y, front + dir * 0.08);
        if (dir < 0) s.rotation.y = Math.PI;
        return s;
      };
      if (T.kind === "building") {
        const w = p.w - 1, d = p.d - 1, h = p.h;
        const body = this.add(box(w, h, d, lam(new THREE.Color(T.color))), p.x, h / 2 + 0.12, p.z);
        void body;
        this.collider(p.x, p.z, w, d);
        // Roof.
        if (p.type === "family" || p.type === "church" || p.type === "hall") {
          const roof = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.62, w + 0.6, 4, 1), lam(new THREE.Color(T.roof), { flatShading: true })), p.x, h + 1.4, p.z);
          roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 4; roof.scale.set(1, 1, 0.55);
        } else this.add(box(w + 0.4, 0.35, d + 0.4, lam(new THREE.Color(T.roof))), p.x, h + 0.3, p.z);
        // Windows (both long faces) as instances, lit at night.
        const floors = Math.max(1, Math.floor((h - 1) / 3.1));
        const cols = Math.max(1, Math.floor(w / 2.4));
        const wins = [];
        for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
          const x = p.x - w / 2 + (c + 0.5) * (w / cols);
          if (f === 0 && Math.abs(x - p.x) < 1.6) continue;
          const y = 1.9 + f * 3.1;
          wins.push([x, y, p.z + d / 2 + 0.02, 0], [x, y, p.z - d / 2 - 0.02, Math.PI]);
        }
        const wm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.4), this.windowMat, wins.length);
        const m4 = new THREE.Matrix4();
        wins.forEach(([x, y, z, r], i) => { m4.makeRotationY(r); m4.setPosition(x, y, z); wm.setMatrixAt(i, m4); });
        this.cityGroup.add(wm);
        // Door and sign.
        this.add(box(2.2, 2.7, 0.2, lam(p.type === "club" ? 0x111111 : 0x5b3a23)), p.x, 1.45, front + dir * 0.02);
        sign(Math.min(h - 0.6, 4.4));
        if (["mamaput", "fastfood", "restaurant", "cafe", "fashion", "salon", "bdc"].includes(p.type)) {
          this.add(box(Math.min(w - 0.5, 7), 0.15, 1.6, lam(new THREE.Color(T.roof))), p.x, 3.05, front + dir * 0.8).rotation.x = dir * 0.18;
        }
        this.decorate(p, w, d, h, front, dir);
      } else {
        this.buildOpen(p, front, dir);
      }
    }

    decorate(p, w, d, h, front, dir) {
      const t = p.type;
      if (t === "church") {
        this.add(new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 6), lam(0x8d6e63, { flatShading: true })), p.x + w / 2 - 1.6, h + 4, p.z);
        this.add(box(0.25, 1.6, 0.25, lam(0xd8a93b)), p.x + w / 2 - 1.6, h + 7.6, p.z);
        this.add(box(1.0, 0.25, 0.25, lam(0xd8a93b)), p.x + w / 2 - 1.6, h + 7.9, p.z);
      }
      if (t === "club" || t === "lounge") {
        const neon = new THREE.MeshBasicMaterial({ color: new THREE.Color(W.TYPES[t].neon) });
        this.neonMats.push(neon);
        this.add(box(w, 0.25, 0.25, neon), p.x, h - 0.2, front + dir * 0.1);
        this.add(box(0.2, 3, 0.2, neon), p.x - 1.3, 1.5, front + dir * 0.15);
        this.add(box(0.2, 3, 0.2, neon), p.x + 1.3, 1.5, front + dir * 0.15);
        if (t === "club") for (let i = -1; i <= 1; i += 2) this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1, 6), lam(0xd8a93b)), p.x + i * 2.6, 0.6, front + dir * 2);
        if (t === "lounge") for (let i = -2; i <= 2; i++) { this.add(new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8), lam(0xffffff)), p.x + i * 2.4, h + 2.1, p.z); this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 4), lam(0x555555)), p.x + i * 2.4, h + 1.2, p.z); }
      }
      if (t === "home") {
        for (let f = 1; f < 3; f++) this.add(box(w - 2, 0.15, 1.2, lam(0xcfcfcf)), p.x, 0.12 + f * 3.3, front + dir * 0.6);
        this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10), lam(0x1d1d1d)), p.x - w / 2 + 1.5, h + 1.3, p.z); // water tank
      }
      if (t === "family") {
        const wall = lam(0xe6d3b3);
        const ww = w + 3, dd = d + 3;
        this.add(box(ww, 1.6, 0.3, wall), p.x, 0.9, p.z - dd / 2);
        this.add(box(0.3, 1.6, dd, wall), p.x - ww / 2, 0.9, p.z);
        this.add(box(0.3, 1.6, dd, wall), p.x + ww / 2, 0.9, p.z);
        this.add(box(ww / 2 - 1.6, 1.6, 0.3, wall), p.x - ww / 4 - 0.8, 0.9, p.z + dd / 2);
        this.add(box(ww / 2 - 1.6, 1.6, 0.3, wall), p.x + ww / 4 + 0.8, 0.9, p.z + dd / 2);
        this.add(box(1.4, 0.4, 1.8, lam(0x2e7d32)), p.x + w / 2 - 1, 0.32, p.z + d / 2 + 1); // gen
      }
      if (t === "mall") {
        this.add(box(w - 2, h - 2.6, 0.15, lam(0x9fd2f2)), p.x, (h - 2.6) / 2 + 2.8, front + dir * 0.04);
        this.xmasTreeAt = [p.x - w / 2 + 2, front + dir * 2.2];
      }
      if (t === "hotel") for (let f = 1; f < 6; f++) this.add(box(w - 2, 0.15, 0.8, lam(0xffffff)), p.x, f * 3.2, front + dir * 0.4);
      if (t === "office") this.add(box(w - 1, h - 3, 0.15, lam(0x7fa7c9)), p.x, (h - 3) / 2 + 3, front + dir * 0.04);
      if (t === "bank") { for (let i = -1; i <= 1; i += 2) this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), lam(0xffffff)), p.x + i * 1.8, 2.1, front + dir * 0.6); this.add(box(0.8, 1.6, 0.6, lam(0x283593)), p.x + w / 2 - 1, 0.9, front + dir * 0.5); }
      if (t === "fashion") for (let i = -1; i <= 1; i += 2) { const col = i < 0 ? 0xec4899 : 0x8b5cf6; this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.5, 8), lam(col)), p.x + i * 2.4, 1, front + dir * 0.4); this.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), lam(0x6b4423)), p.x + i * 2.4, 1.95, front + dir * 0.4); }
      if (t === "hall") {
        const cols = [0xff4fa3, 0xffb300, 0x20b46e, 0x2f7de1];
        for (let i = 0; i < 6; i++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lam(cols[i % 4])), p.x - 3 + i * 1.2, 3.3 + (i % 2) * 0.3, front + dir * 0.3);
      }
      if (t === "mamaput" || t === "fastfood" || t === "cafe" || t === "restaurant") {
        const chair = lam(t === "mamaput" ? 0xd62828 : 0xffffff);
        for (let i = -1; i <= 1; i += 2) {
          this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 10), chair), p.x + i * 3.2, 0.85, front + dir * 2.4);
          this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 5), chair), p.x + i * 3.2, 0.45, front + dir * 2.4);
          this.collider(p.x + i * 3.2, front + dir * 2.4, 1, 1);
        }
      }
      if (t === "hustle") for (let i = 0; i < 3; i++) this.add(box(1.6, 1.0, 0.9, lam([0xffcc80, 0x90caf9, 0xa5d6a7][i])), p.x - 4 + i * 4, 0.6, front + dir * 1.4);
    }

    buildOpen(p, front, dir) {
      const t = p.type;
      const signPole = (x, z) => {
        this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), lam(0x444444)), x, 1.7, z);
        const s = this.add(new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true, side: THREE.DoubleSide })), x, 3.6, z);
        return s;
      };
      if (t === "market") {
        const cols = [0xff7043, 0x42a5f5, 0xffca28, 0x66bb6a, 0xab47bc, 0xef5350];
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
          const x = p.x - 7 + c * 4.6, z = p.z - 3.5 + r * 5;
          this.add(box(3.4, 0.15, 2.6, lam(cols[(r * 4 + c) % 6])), x, 2.4, z);
          for (const [dx, dz] of [[-1.5, -1.1], [1.5, -1.1], [-1.5, 1.1], [1.5, 1.1]]) this.add(box(0.1, 2.3, 0.1, lam(0x6d4c41)), x + dx, 1.2, z + dz);
          this.add(box(3, 0.8, 1.6, lam(0x8d6e63)), x, 0.5, z);
          for (let k = 0; k < 5; k++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), lam([0xff7043, 0xffeb3b, 0x8bc34a, 0xd32f2f][k % 4])), x - 1 + k * 0.5, 1.0, z);
          this.collider(x, z, 3.2, 1.8);
        }
        signPole(p.x - 9, front - 0.5);
      } else if (t === "busstop") {
        this.add(box(8, 0.2, 2.4, lam(0x2e7d32)), p.x - 3, 2.8, front - 1.6);
        for (const dx of [-6.6, 0.6]) this.add(box(0.15, 2.7, 0.15, lam(0x555555)), p.x + dx, 1.4, front - 0.6);
        this.add(box(6, 0.15, 0.7, lam(0x795548)), p.x - 3, 0.6, front - 2.2);
        const bus = this.add(box(6.2, 2.6, 2.6, lam(0xffc400)), p.x + 4, 1.5, p.z - 1);
        void bus;
        this.add(box(6.25, 0.25, 2.65, lam(0x111111)), p.x + 4, 1.2, p.z - 1);
        this.add(box(5.6, 0.8, 2.66, lam(0x263238)), p.x + 4, 2.1, p.z - 1);
        this.collider(p.x + 4, p.z - 1, 6.2, 2.6);
        signPole(p.x - 8, front - 0.4);
      } else if (t === "suya") {
        this.add(box(3.2, 1, 1.2, lam(0x5d4037)), p.x, 0.6, p.z);
        this.coals = this.add(box(2.8, 0.1, 0.9, new THREE.MeshBasicMaterial({ color: 0xff6d00 })), p.x, 1.15, p.z);
        this.add(box(4, 0.15, 2.4, lam(0xc62828)), p.x, 2.7, p.z);
        for (const dx of [-1.8, 1.8]) this.add(box(0.1, 2.6, 0.1, lam(0x444444)), p.x + dx, 1.4, p.z + 1);
        for (let i = 0; i < 4; i++) this.add(box(1.8, 0.4, 0.5, lam(0x8d6e63)), p.x - 4 + (i % 2) * 8, 0.35, p.z - 2 + Math.floor(i / 2) * 4.5);
        this.collider(p.x, p.z, 3.2, 1.2);
        signPole(p.x - 6, front - 0.5);
      } else if (t === "concert") {
        this.add(box(14, 1.2, 5, lam(0x212121)), p.x, 0.6, p.z - 4);
        this.collider(p.x, p.z - 4, 14, 5);
        const truss = lam(0x9e9e9e);
        for (const dx of [-7, 7]) this.add(box(0.3, 8, 0.3, truss), p.x + dx, 4, p.z - 4);
        this.add(box(14.3, 0.3, 0.3, truss), p.x, 8, p.z - 4);
        this.screen = this.add(box(8, 3.6, 0.2, new THREE.MeshBasicMaterial({ color: 0x222244 })), p.x, 4.4, p.z - 6.4);
        this.stageLights = [];
        for (let i = 0; i < 6; i++) { const m = new THREE.MeshBasicMaterial({ color: 0x333333 }); this.stageLights.push(m); this.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), m), p.x - 6 + i * 2.4, 7.6, p.z - 3.8); }
        for (const dx of [-8.5, 8.5]) { this.add(box(1.6, 3.2, 1.4, lam(0x111111)), p.x + dx, 1.6, p.z - 3); this.collider(p.x + dx, p.z - 3, 1.6, 1.4); }
        signPole(p.x - 10, front - 0.5);
      } else if (t === "beach") {
        const cols = [0xff5252, 0xffd740, 0x40c4ff, 0x69f0ae];
        for (let i = 0; i < 8; i++) {
          const x = p.x - 18 + i * 5.2, z = p.z + (i % 2) * 2;
          this.add(new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 10), lam(cols[i % 4])), x, 2.6, z);
          this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4), lam(0xffffff)), x, 1.25, z);
          this.add(box(0.8, 0.2, 1.9, lam(0xffffff)), x + 1, 0.3, z + 0.4);
        }
        for (let i = 0; i < 7; i++) this.palm(-58 + i * 19, 52.5 + (i % 2) * 1.4);
        signPole(p.x - 21, 52);
      } else if (t === "photo") {
        const wall = this.add(new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 0.4), [lam(0xffffff), lam(0xffffff), lam(0xffffff), lam(0xffffff), new THREE.MeshBasicMaterial({ map: muralTexture() }), lam(0xffffff)]), p.x, 2.25, p.z + 1);
        void wall;
        this.collider(p.x, p.z + 1, 9, 0.4);
        const arch = this.add(new THREE.Mesh(new THREE.TorusGeometry(2, 0.25, 6, 16, Math.PI), lam(0xff80ab)), p.x - 7, 0, p.z);
        arch.rotation.y = 0;
        signPole(p.x + 6, p.z - 2);
      }
    }

    buildDecorations() {
      // String lights along roofs and a Christmas tree — switched on from the 15th.
      const pts = [];
      for (const p of Object.values(this.places)) if (p.kind === "building") for (let x = -p.w / 2 + 0.6; x < p.w / 2 - 0.5; x += 0.9) pts.push([p.x + x, p.h + 0.5, p.z + p.d / 2 - 0.4, pts.length]);
      const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), pts.length);
      const m4 = new THREE.Matrix4();
      const cols = [0xff3b3b, 0x2fe06b, 0xffd23b, 0x4fa3ff];
      pts.forEach(([x, y, z, i]) => { m4.makeTranslation(x, y, z); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, new THREE.Color(cols[i % 4])); });
      this.xmas.add(bulbs);
      if (this.xmasTreeAt) {
        const [x, z] = this.xmasTreeAt;
        for (let i = 0; i < 3; i++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(2 - i * 0.5, 2.4, 8), lam(0x1b7a3a, { flatShading: true })); cone.position.set(x, 1.4 + i * 1.4, z); this.xmas.add(cone); }
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xffd23b }));
        star.position.set(x, 5.6, z);
        this.xmas.add(star);
        this.collider(x, z, 3, 3);
      }
      this.fireworks = [];
    }

    buildVehicles() {
      this.cars = [];
      const loops = [
        [[-65, -30], [65, -30], [65, -50], [-65, -50]],
        [[-65, -10], [65, -10], [65, -30], [-65, -30]],
        [[-39, -10], [-39, 8], [13, 8], [13, -10]],
        [[-65, 28], [65, 28], [65, 48], [-65, 48]],
        [[-65, 8], [65, 8], [65, 28], [-65, 28]],
      ];
      const cols = [0xffc400, 0xffffff, 0x1565c0, 0xc62828, 0x212121, 0xffc400, 0x9e9e9e];
      loops.forEach((loop, i) => {
        for (let k = 0; k < 2; k++) {
          const danfo = cols[(i * 2 + k) % cols.length] === 0xffc400;
          const g = new THREE.Group();
          const body = box(danfo ? 2.2 : 1.9, danfo ? 1.9 : 1.2, danfo ? 4.6 : 3.8, lam(cols[(i * 2 + k) % cols.length]));
          body.position.y = danfo ? 1.2 : 0.85;
          const glass = box(danfo ? 2.22 : 1.7, 0.55, danfo ? 3.8 : 1.9, lam(0x263238));
          glass.position.set(0, danfo ? 1.7 : 1.45, danfo ? 0 : -0.2);
          g.add(body, glass);
          if (danfo) { const stripe = box(2.24, 0.2, 4.62, lam(0x111111)); stripe.position.y = 1.0; g.add(stripe); }
          this.cityGroup.add(g);
          const L = loop.reduce((a, p, j) => a + Math.hypot(loop[(j + 1) % loop.length][0] - p[0], loop[(j + 1) % loop.length][1] - p[1]), 0);
          this.cars.push({ g, loop, L, d: (k / 2) * L + i * 17, speed: danfo ? 8 : 10 });
        }
      });
    }

    // ------------------------------------------------------------ home interior
    buildInterior() {
      const g = new THREE.Group();
      g.position.set(0, 0, 400);
      g.visible = false;
      this.scene.add(g);
      this.room = g;
      this.roomColliders = [];
      this.roomObjects = [];
      const W2 = 12, D2 = 10;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), lam(0xffffff, { map: tileTexture("#e9dcc5", "#d9c7a8") }));
      floor.rotation.x = -Math.PI / 2; g.add(floor);
      const wall = lam(0xf0d9b5);
      const back = box(W2, 4, 0.3, wall); back.position.set(0, 2, -D2 / 2); g.add(back);
      const left = box(0.3, 4, D2, wall); left.position.set(-W2 / 2, 2, 0); g.add(left);
      const trim = lam(0xa1785a);
      const base = box(W2 + 0.4, 0.5, D2 + 0.4, trim); base.position.set(0, -0.26, 0); g.add(base);
      const add = (m, x, y, z, collide) => { m.position.set(x, y, z); g.add(m); if (collide) this.roomColliders.push({ x0: x - collide[0] / 2, x1: x + collide[0] / 2, z0: z - collide[1] / 2, z1: z + collide[1] / 2 }); return m; };
      const obj = (id, label, x, z, action) => this.roomObjects.push({ id, label, x, z, action });
      // Bed.
      add(box(2.6, 0.5, 3.6, lam(0x8d6e63)), -3.8, 0.25, -2.9, [2.6, 3.6]);
      add(box(2.4, 0.35, 3.0, lam(0xc62828)), -3.8, 0.65, -2.6);
      add(box(2.0, 0.25, 0.7, lam(0xffffff)), -3.8, 0.85, -4.2);
      obj("bed", "🛏️ Bed", -2.1, -2.6, "sleep");
      // Wardrobe and mirror.
      add(box(1.6, 3.2, 0.8, lam(0xd7b98e)), -5.4, 1.6, 1.6, [1.0, 1.6]);
      add(box(0.9, 2.2, 0.08, lam(0xcfe8ff)), -5.75, 1.5, 3.6);
      obj("mirror", "🪞 Mirror & wardrobe", -4.6, 3.2, "wardrobe");
      // Desk with laptop and ring light.
      add(box(2.4, 0.12, 1.1, lam(0xd7b98e)), 1.6, 1.0, -4.2, [2.4, 1.2]);
      add(box(0.9, 0.05, 0.6, lam(0x9e9e9e)), 1.6, 1.1, -4.2);
      const screen = add(box(0.9, 0.55, 0.04, lam(0x37474f)), 1.6, 1.38, -4.48); screen.rotation.x = -0.25;
      add(box(0.7, 0.9, 0.7, lam(0xffab91)), 1.6, 0.45, -3.2);
      add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })), 3.6, 2.6, -4.3);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 4), lam(0x222222)), 3.6, 1.2, -4.3);
      obj("desk", "💻 Desk", 1.6, -2.6, "post_home");
      // TV.
      add(box(3, 0.6, 0.8, lam(0xd7b98e)), 4.4, 0.3, -1.4, [3, 0.9]);
      add(box(2.4, 1.4, 0.1, lam(0x111111)), 4.4, 1.4, -1.7);
      obj("tv", "📺 TV", 4.2, 0.2, "tv");
      // Stove and cooler.
      add(box(1.4, 1.0, 1.0, lam(0xbcaaa4)), 4.8, 0.5, 2.8, [1.4, 1.0]);
      add(box(1.2, 0.05, 0.8, lam(0x424242)), 4.8, 1.03, 2.8);
      obj("stove", "🍳 Stove", 4.0, 2.2, "cook");
      add(box(1.1, 0.9, 0.8, lam(0x1565c0)), 2.6, 0.45, 4.2, [1.1, 0.8]);
      add(box(1.1, 0.2, 0.8, lam(0xffffff)), 2.6, 0.95, 4.2);
      // Table and chairs.
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 18), lam(0xa1785a)), -1.2, 1.0, 2.2, [2, 2]);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1, 8), lam(0x6d4c41)), -1.2, 0.5, 2.2);
      // Fan, plant, door.
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4), lam(0x222222)), 0, 1.2, -4.4);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10), lam(0x26a69a)), 0, 2.4, -4.3).rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 6), lam(0x43a047, { flatShading: true })), -5.2, 0.9, -0.6);
      add(box(0.1, 2.6, 1.4, lam(0x5b3a23)), -5.9, 1.3, -0.15);
      obj("door", "🚪 Go outside", -5.0, -0.15, "exit");
      const light = new THREE.PointLight(0xffe2b8, 0.7, 20);
      light.position.set(0, 3.5, 0);
      g.add(light);
      this.roomColliders.push({ x0: -7, x1: -W2 / 2 + 0.3, z0: -6, z1: 6 }, { x0: -7, x1: 7, z0: -7, z1: -D2 / 2 + 0.3 }, { x0: W2 / 2, x1: 8, z0: -6, z1: 6 }, { x0: -7, x1: 7, z0: D2 / 2, z1: 7 });
    }

    // ------------------------------------------------------------ the player
    buildPlayer(look) {
      if (this.player) { this.scene.remove(this.player); }
      const s = this.sim.s;
      const full = { ...look, shoes: s.equip.shoes || "slippers", bag: s.equip.bag, watch: s.equip.jewelry === "gold_watch", chain: s.equip.jewelry === "chain" || look.chain };
      this.player = Avatar3D.build(full);
      this.player.scale.multiplyScalar(HUMAN);
      this.player.userData.phase = 0;
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
      this.player.add(shadow);
      const ring = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0x20b46e }));
      ring.scale.set(0.8, 1.4, 0.8); ring.position.y = 2.15;
      this.player.add(ring);
      this.plumbob = ring;
      this.scene.add(this.player);
      this.lookKey = JSON.stringify(full);
      if (this.lastPos) this.player.position.copy(this.lastPos);
    }
    shadowify(model) {
      if (!this.shadows) return;
      model.traverse((o) => { if (o.isMesh && o.geometry.type !== "CircleGeometry") o.castShadow = true; });
    }
    refreshLook() {
      const s = this.sim.s;
      const key = JSON.stringify({ ...s.look, shoes: s.equip.shoes || "slippers", bag: s.equip.bag, watch: s.equip.jewelry === "gold_watch", chain: s.equip.jewelry === "chain" || s.look.chain });
      if (key !== this.lookKey) { this.lastPos = this.player.position.clone(); const rot = this.player.rotation.y; this.buildPlayer(s.look); this.player.rotation.y = rot; this.shadowify(this.player); }
    }
    placePlayer() {
      const s = this.sim.s;
      let p;
      if (s.pos) p = s.pos;
      else { const pl = this.places[s.place && !this.places[s.place].remote ? s.place : "home"]; p = pl.spot; }
      this.player.position.set(p.x, 0, p.z);
      this.player.rotation.y = Math.PI;
      if (s.place === "home" && s.inside) this.enterHome(true);
      this.snapCamera = true;
    }
    enterHome(silent) {
      this.interior = true;
      this.room.visible = true;
      this.cityGroup.visible = false;
      this.player.position.set(-3.6, 0, 400 + 0.6);
      this.player.rotation.y = Math.PI / 2;
      this.snapCamera = true;
      if (!silent && this.hooks.onRoom) this.hooks.onRoom(true);
    }
    leaveInterior() { this.interior = false; this.room.visible = false; this.cityGroup.visible = true; }
    exitHome() {
      this.interior = false;
      this.room.visible = false;
      this.cityGroup.visible = true;
      const p = this.places.home;
      this.player.position.set(p.spot.x, 0, p.spot.z + 1);
      this.player.rotation.y = 0;
      this.sim.leave();
      this.sim.setPos(p.spot.x, p.spot.z + 1);
      this.snapCamera = true;
      if (this.hooks.onRoom) this.hooks.onRoom(false);
    }

    walkTo(placeId) {
      const pos = this.player.position;
      const pts = NAV.pathFromPoint(NAV.get(this.city), pos.x, pos.z, placeId);
      const pl = this.places[placeId];
      if (pl.kind === "building") pts.push({ x: pl.door.x, z: pl.door.z + (pl.side === "S" ? 1.2 : -1.2) });
      else pts.push({ x: pl.spot.x, z: pl.spot.z });
      this.autoPath = { pts, i: 1, place: placeId };
    }

    // ------------------------------------------------------------ input
    bindInput() {
      this.onKey = (e) => {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        const down = e.type === "keydown";
        const k = e.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
          this.keys[k] = down;
          if (down) { this.autoPath = null; e.preventDefault(); }
        }
        if (down && (k === "e" || k === "enter") && !e.repeat) { if (this.hooks.onInteractKey) this.hooks.onInteractKey(); }
      };
      window.addEventListener("keydown", this.onKey);
      window.addEventListener("keyup", this.onKey);
      this.onBlur = () => { this.keys = {}; };
      window.addEventListener("blur", this.onBlur);
      this.renderer.domElement.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom = Math.max(0.55, Math.min(1.7, this.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: false });
      // Pinch to zoom.
      let pinch = null;
      this.renderer.domElement.addEventListener("touchstart", (e) => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
      this.renderer.domElement.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && pinch) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); this.zoom = Math.max(0.55, Math.min(1.7, this.zoom * pinch / d)); pinch = d; }
      }, { passive: true });
    }
    setJoystick(x, z) { this.joy.x = x; this.joy.z = z; if (x || z) this.autoPath = null; }

    blockedAt(x, z) {
      const list = this.interior ? this.roomColliders : this.colliders;
      const ox = this.interior ? 0 : 0, oz = this.interior ? 400 : 0;
      for (const c of list) if (x + PLAYER_R > c.x0 + ox && x - PLAYER_R < c.x1 + ox && z + PLAYER_R > c.z0 + oz && z - PLAYER_R < c.z1 + oz) return true;
      return false;
    }

    // ------------------------------------------------------------ per frame
    update(dt, realDt) {
      this.time += realDt;
      const s = this.sim.s;
      const busy = !!(s.activity || s.ride || s.event || s.convo || s.over);
      const hidden = !!s.ride || (s.activity && !this.interior && this.places[s.activity.place] && this.places[s.activity.place].kind === "building");
      this.player.visible = !hidden;
      if (s.ride === null && this.wasRiding && s.pos) { this.player.position.set(s.pos.x, 0, s.pos.z); this.snapCamera = true; this.leaveInterior(); }
      this.wasRiding = !!s.ride;
      this.refreshLook();

      // Movement.
      let mx = 0, mz = 0;
      if (!busy && !this.frozen) {
        if (this.keys.w || this.keys.arrowup) mz -= 1;
        if (this.keys.s || this.keys.arrowdown) mz += 1;
        if (this.keys.a || this.keys.arrowleft) mx -= 1;
        if (this.keys.d || this.keys.arrowright) mx += 1;
        mx += this.joy.x; mz += this.joy.z;
        if (!mx && !mz && this.autoPath) {
          const ap = this.autoPath;
          const tgt = ap.pts[ap.i];
          const dx = tgt.x - this.player.position.x, dz = tgt.z - this.player.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.6) { ap.i++; if (ap.i >= ap.pts.length) { const pl = ap.place; this.autoPath = null; if (this.hooks.onArrive) this.hooks.onArrive(pl); } }
          else { mx = dx / dist; mz = dz / dist; }
        }
      }
      const len = Math.hypot(mx, mz);
      let moving = false;
      if (len > 0.05) {
        mx /= Math.max(1, len); mz /= Math.max(1, len);
        const run = (this.keys.shift || this.autoPath) && s.needs.energy > 15;
        const sp = (run ? RUN : WALK) * realDt;
        const p = this.player.position;
        const nx = p.x + mx * sp, nz = p.z + mz * sp;
        if (!this.blockedAt(nx, p.z)) p.x = nx;
        if (!this.blockedAt(p.x, nz)) p.z = nz;
        const want = Math.atan2(mx, mz);
        let d = want - this.player.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.player.rotation.y += d * Math.min(1, realDt * 12);
        moving = true;
        if (!this.interior) {
          this.posTimer = (this.posTimer || 0) + realDt;
          if (this.posTimer > 0.1) { this.posTimer = 0; this.sim.setPos(p.x, p.z); }
        }
      }
      this.animate(this.player, moving, realDt, s.activity && ["party", "dance", "owambe_attend", "concert", "beach_party"].includes(s.activity.id));
      this.plumbob.rotation.y += realDt * 2;
      this.plumbob.position.y = 2.15 + Math.sin(this.time * 2.4) * 0.06;
      const mood = this.sim.mood();
      this.plumbob.material.color.setHex(mood >= 55 ? 0x20b46e : mood >= 30 ? 0xf2b632 : 0xe5484d);

      // Camera.
      const tgt = this.player.position;
      const off = this.interior ? new THREE.Vector3(6, 13, 13.5) : new THREE.Vector3(0, 34, 29).multiplyScalar(this.zoom);
      const want = tgt.clone().add(off);
      if (this.snapCamera) { this.camera.position.copy(want); this.snapCamera = false; }
      else this.camera.position.lerp(want, Math.min(1, realDt * 4));
      if (this.interior) this.camera.lookAt(lerp(tgt.x, 0, 0.6), 0.5, lerp(tgt.z, 400, 0.6)); else this.camera.lookAt(tgt.x, tgt.y + 1.2, tgt.z);

      this.updatePeople(realDt);
      this.updateAmbient(realDt);
      this.findTarget();
      this.updateLabels();
      this.renderer.render(this.scene, this.camera);
    }

    animate(model, moving, dt, dancing) {
      const L = model.userData.limbs;
      model.userData.phase = (model.userData.phase || 0) + dt * (moving ? 9 : dancing ? 7 : 1.6);
      const ph = model.userData.phase;
      if (!L) return;
      const swing = moving ? Math.sin(ph) * 0.65 : 0;
      if (L.legs[0]) { L.legs[0].rotation.x = swing; L.legs[1].rotation.x = -swing; }
      if (L.arms[0]) {
        const armSwing = moving ? -swing * 0.8 : dancing ? Math.sin(ph) * 1.2 - 1.2 : Math.sin(ph) * 0.03;
        L.arms[0].rotation.x = armSwing; L.arms[1].rotation.x = dancing ? Math.sin(ph + 1.5) * 1.2 - 1.2 : moving ? swing * 0.8 : -armSwing;
        L.arms[0].rotation.z = dancing ? -0.4 : 0; L.arms[1].rotation.z = dancing ? 0.4 : 0;
      }
      model.children.forEach((c) => { if (c.userData && c.userData.bob) c.position.y = c.userData.bob; });
      const bounce = moving ? Math.abs(Math.sin(ph)) * 0.05 : dancing ? Math.abs(Math.sin(ph)) * 0.12 : 0;
      model.userData.bounce = bounce;
    }

    lookFor(id) {
      const n = W.NPCS.find((x) => x.id === id);
      if (n) return { look: n.look, name: n.name, lite: false };
      const st = this.sim.s.strangers.find((x) => x.id === id);
      return st ? { look: st.look, name: st.name, lite: true } : null;
    }

    updatePeople(dt) {
      const s = this.sim.s;
      const seen = new Set();
      if (!this.interior) {
        const cam = this.player.position;
        for (const p of this.sim.peoplePositions()) {
          if (Math.hypot(p.x - cam.x, p.z - cam.z) > 60) continue;
          seen.add(p.id);
          let rec = this.people.get(p.id);
          if (!rec) {
            const info = this.lookFor(p.id);
            if (!info) continue;
            const model = Avatar3D.build(info.look, { lite: info.lite });
            model.scale.multiplyScalar(HUMAN);
            const sh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
            sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; model.add(sh);
            model.position.set(p.x, 0, p.z);
            this.shadowify(model);
            this.scene.add(model);
            rec = { model, name: info.name, kind: "person" };
            this.people.set(p.id, rec);
          }
          const m = rec.model;
          const dx = p.x - m.position.x, dz = p.z - m.position.z;
          const far = Math.hypot(dx, dz) > 8;
          if (far) m.position.set(p.x, 0, p.z);
          else { m.position.x += dx * Math.min(1, dt * 6); m.position.z += dz * Math.min(1, dt * 6); }
          let d = p.heading - m.rotation.y;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          m.rotation.y += d * Math.min(1, dt * 6);
          const party = !p.walking && p.place && ["club", "concert", "hall"].includes(p.place) && this.sim.clock().hh >= 15;
          this.animate(m, p.walking && Math.hypot(dx, dz) > 0.002, dt * (this.sim.speedNow() > 1 ? 1.5 : 1), party);
          m.visible = true;
          rec.x = p.x; rec.z = p.z;
        }
        // Real players stand at their places.
        (this.hooks.remotePlayers ? this.hooks.remotePlayers() : []).forEach((rp, i) => {
          const pl = this.places[rp.place];
          if (!pl || pl.remote) return;
          const key = "p:" + rp.username;
          seen.add(key);
          let rec = this.people.get(key);
          if (!rec) {
            const model = Avatar3D.build(rp.look, { lite: true });
            model.scale.multiplyScalar(HUMAN);
            model.position.set(pl.spot.x + ((i % 3) - 1) * 1.6, 0, pl.spot.z + 1.6 + Math.floor(i / 3));
            model.rotation.y = 0;
            this.scene.add(model);
            rec = { model, name: "@" + rp.username, kind: "player", username: rp.username };
            this.people.set(key, rec);
          }
          rec.x = rec.model.position.x; rec.z = rec.model.position.z;
          rec.model.visible = true;
          this.animate(rec.model, false, dt, false);
        });
      }
      for (const [id, rec] of this.people) if (!seen.has(id)) {
        rec.model.visible = false;
        if (this.people.size > 70) { this.scene.remove(rec.model); this.people.delete(id); }
      }
    }

    updateAmbient(dt) {
      const s = this.sim.s;
      const c = this.sim.clock();
      const h = c.hh + c.mm / 60;
      const sky = this.interior ? new THREE.Color(0x1d1a24) : skyAt(h);
      this.scene.background = sky;
      this.scene.fog.color = sky;
      const day = daylight(h);
      // Night keeps a cool moonlit fill so the streets stay readable.
      this.hemi.intensity = 0.62 + day * 0.33;
      this.hemi.color.setRGB(lerp(0.62, 1, day), lerp(0.7, 1, day), lerp(1, 1, day));
      this.sun.intensity = 0.22 + day * 0.58;
      this.sun.color.setRGB(lerp(0.6, 1, day), lerp(0.68, 0.97, day), lerp(0.95, 0.92, day));
      const pp = this.player.position;
      this.sun.position.set(pp.x + Math.cos((h / 24) * Math.PI * 2 - Math.PI / 2) * 50, 45 + day * 25, pp.z + 35);
      this.sun.target.position.set(pp.x, 0, pp.z);
      const night = 1 - day;
      this.windowMat.color.setRGB(lerp(0.17, 1.0, night), lerp(0.23, 0.85, night), lerp(0.33, 0.45, night));
      this.bulbMat.color.setRGB(lerp(0.45, 1.0, night), lerp(0.45, 0.93, night), lerp(0.45, 0.6, night));
      const flick = (Math.sin(this.time * 3) + 1) / 2;
      this.neonMats.forEach((m, i) => m.color.setHSL(i % 2 ? 0.9 : 0.12, 1, 0.35 + night * 0.25 + flick * 0.05));
      this.xmas.visible = c.day >= 15 && !this.interior;
      if (this.coals) this.coals.material.color.setHSL(0.06, 1, 0.45 + Math.sin(this.time * 6) * 0.08);
      if (this.water) this.water.material.color.setHSL(0.56, 0.6, 0.55 + Math.sin(this.time * 0.8) * 0.02);
      this.foam.position.z = G.beach[1] + 0.4 + Math.sin(this.time * 0.9) * 0.5;
      // Concert stage comes alive on concert nights.
      const concert = this.sim.events().includes("concert") && h >= 16 || (this.sim.events(c.day - 1).includes("concert") && h < 2);
      if (this.stageLights) this.stageLights.forEach((m, i) => m.color.setHSL(((this.time * 0.3 + i / 6) % 1), 1, concert ? 0.6 : 0.15));
      if (this.screen) this.screen.material.color.setHSL((this.time * 0.1) % 1, concert ? 0.8 : 0.2, concert ? 0.45 : 0.12);
      // Traffic: more cars when traffic is heavy.
      const tl = this.sim.trafficLevel();
      const speedMul = [1.2, 1, 0.6, 0.3][tl];
      this.cars.forEach((car, i) => {
        car.g.visible = !this.interior && (i < 4 + tl * 2);
        const pp = this.player.position;
        const ahead = car.g.position.clone().add(new THREE.Vector3(Math.sin(car.g.rotation.y), 0, Math.cos(car.g.rotation.y)).multiplyScalar(3));
        const yieldTo = !this.interior && Math.hypot(ahead.x - pp.x, ahead.z - pp.z) < 3.2;
        if (!yieldTo) car.d = (car.d + car.speed * speedMul * dt) % car.L;
        let d = car.d;
        for (let j = 0; j < car.loop.length; j++) {
          const a = car.loop[j], b = car.loop[(j + 1) % car.loop.length];
          const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (d <= seg) {
            const k = d / seg;
            const dirx = (b[0] - a[0]) / seg, dirz = (b[1] - a[1]) / seg;
            car.g.position.set(a[0] + (b[0] - a[0]) * k - dirz * 1.4, 0.05, a[1] + (b[1] - a[1]) * k + dirx * 1.4);
            car.g.rotation.y = Math.atan2(dirx, dirz);
            break;
          }
          d -= seg;
        }
      });
      // Crossover fireworks.
      const fw = c.day === 31 && h >= 23.5 || (c.day === 32 && h < 1) || (c.day === 31 && h >= 21 && Math.random() < 0.002);
      if (fw && !this.interior && Math.random() < dt * 3) this.spawnFirework();
      this.fireworks = this.fireworks.filter((f) => {
        f.life -= dt;
        f.pts.forEach((p) => { p.mesh.position.addScaledVector(p.v, dt); p.v.y -= 4 * dt; p.mesh.material.opacity = Math.max(0, f.life); });
        if (f.life <= 0) { f.pts.forEach((p) => this.scene.remove(p.mesh)); return false; }
        return true;
      });
    }
    spawnFirework() {
      const p = this.player.position;
      const x = p.x + (Math.random() - 0.5) * 50, z = p.z - 25 - Math.random() * 25, y = 18 + Math.random() * 10;
      const col = new THREE.Color().setHSL(Math.random(), 1, 0.6);
      const pts = [];
      for (let i = 0; i < 22; i++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 4, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(7 + Math.random() * 4);
        pts.push({ mesh, v });
      }
      this.fireworks.push({ pts, life: 1.6 });
    }

    // What the player can interact with right now.
    findTarget() {
      const s = this.sim.s;
      if (s.activity || s.ride || s.event || s.convo || s.over) { this.target = null; return; }
      const p = this.player.position;
      let best = null, bd = Infinity;
      const consider = (t, d) => { if (d < bd) { bd = d; best = t; } };
      if (this.interior) {
        for (const o of this.roomObjects) consider({ kind: "object", id: o.action, label: o.label, x: o.x, z: o.z + 400 }, Math.hypot(o.x - p.x, o.z + 400 - p.z) - 0.4);
        if (bd > 1.8) best = null;
        this.target = best;
        return;
      }
      for (const [id, rec] of this.people) {
        if (!rec.model.visible) continue;
        const d = Math.hypot(rec.model.position.x - p.x, rec.model.position.z - p.z);
        if (d < 2.4) consider({ kind: rec.kind, id: rec.kind === "player" ? rec.username : id, label: `Talk to ${rec.name}`, x: rec.model.position.x, z: rec.model.position.z }, d - 0.6);
      }
      for (const pl of Object.values(this.places)) {
        if (pl.remote) continue;
        const d = pl.kind === "building" ? Math.hypot(pl.door.x - p.x, pl.door.z - p.z) : Math.max(Math.abs(pl.x - p.x) - pl.w / 2, Math.abs(pl.z - p.z) - pl.d / 2, 0) + 0.5;
        if (d < 3.2) consider({ kind: "place", id: pl.id, label: pl.kind === "building" ? `Enter ${pl.id === "home" ? "your flat" : pl.name}` : `${pl.icon} ${pl.name}`, x: pl.door.x, z: pl.door.z }, d < 2.2 ? d - 1.5 : d);
      }
      this.target = best;
    }

    // Floating labels: place names from afar, people's names up close.
    updateLabels() {
      const live = new Set();
      const w = this.el.clientWidth, h = this.el.clientHeight;
      const v = new THREE.Vector3();
      const show = (key, x, y, z, html, cls) => {
        v.set(x, y, z).project(this.camera);
        if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) return;
        live.add(key);
        let el = this.labels.get(key);
        if (!el) { el = document.createElement("div"); this.labelLayer.appendChild(el); this.labels.set(key, el); }
        if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
        el.className = "wl " + cls;
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      };
      if (!this.interior) {
        const p = this.player.position;
        for (const pl of Object.values(this.places)) {
          if (pl.remote) continue;
          const d = Math.hypot(pl.x - p.x, pl.z - p.z);
          if (d > 55 || d < 9) continue;
          show("pl:" + pl.id, pl.x, (pl.h || 2) + 3.2, pl.z, `${pl.icon} ${escapeHtml(pl.id === "home" ? "Your Flat" : pl.name)}`, "wl-place");
        }
        for (const [id, rec] of this.people) {
          if (!rec.model.visible) continue;
          const d = Math.hypot(rec.model.position.x - p.x, rec.model.position.z - p.z);
          if (d > 11) continue;
          const st = this.sim.whoState(id);
          const rel = rec.kind === "player" ? "Real player" : st && st.met ? this.sim.relLevel(id) : "";
          show("pp:" + id, rec.model.position.x, 3.6, rec.model.position.z, `${escapeHtml(rec.name)}${rel ? ` <i>${rel}</i>` : ""}`, rec.kind === "player" ? "wl-player" : "wl-person");
        }
      }
      if (this.target && this.target.kind !== "player") {
        show("target", this.target.x, this.interior ? 1.6 : 3.8, this.target.z, `<b>${this.mobile ? "Tap ✋" : "E"}</b> ${escapeHtml(this.target.label)}`, "wl-target");
      } else if (this.target) show("target", this.target.x, 3.8, this.target.z, `<b>${this.mobile ? "Tap ✋" : "E"}</b> ${escapeHtml(this.target.label)}`, "wl-target");
      for (const [k, el] of this.labels) if (!live.has(k)) { el.remove(); this.labels.delete(k); }
    }

    resize() {
      const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.camera.aspect = w / h;
      this.camera.fov = w / h < 0.8 ? 48 : 36;
      this.camera.updateProjectionMatrix();
    }

    dispose() {
      window.removeEventListener("keydown", this.onKey);
      window.removeEventListener("keyup", this.onKey);
      window.removeEventListener("blur", this.onBlur);
      this.ro.disconnect();
      this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.labelLayer.remove();
    }
  }

  function escapeHtml(t) { return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  window.World3D = World;
})();
