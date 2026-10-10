// DECEMBER WAHALA — the explorable 3D city (three.js r128).
// Builds Lagos or Abuja from WORLD data, moves the player with keys or a
// joystick, handles collisions, follows with the camera, draws everyone the
// sim says is out on the streets, and runs day/night and December decorations.
/* global THREE, WORLD, DATA, NAV, Avatar3D, GridNav, Rooms, Poses */
(function () {
  const W = window.WORLD, D = window.DATA, NAV = window.NAV;
  const SIMS = W.SIMS;
  const ROOM_Z = 400; // interiors are built far away from the city
  const CHATTER = ["💬", "😂", "☕", "🎶", "👀", "💅🏾", "🙌🏾", "🤣", "🍗", "📱", "💸", "🎄", "🔥", "🥂", "🤫", "❤️"];
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
    g.fillStyle = "#fff"; g.font = "700 64px 'Fredoka', system-ui"; g.textAlign = "center";
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
      this.pickables = [];
      this.room = null;
      this.interiorPlace = null;
      this.walk = null;
      this.seat = null;
      this.camYaw = 0;
      this.bubbles = new Map();
      this.assign = new Map();
      this.staff = [];
      this.chatT = 0;
      this.raycaster = new THREE.Raycaster();

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
      // Walk grid for click-to-move around the city.
      this.cityNav = new GridNav(G.bounds.x[0] - 2, -110, G.bounds.x[1] + 2, 64, 1);
      this.colliders.forEach((c) => this.cityNav.block(c, PLAYER_R));
      this.marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 24), new THREE.MeshBasicMaterial({ color: 0x20b46e, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      this.marker.rotation.x = -Math.PI / 2; this.marker.visible = false;
      this.scene.add(this.marker);
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
      const land = lagos ? 0x9fcb7e : 0xa7cf86;
      this.add(new THREE.Mesh(new THREE.PlaneGeometry(220, 200), lam(land)), 0, -0.02, 5).rotation.x = -Math.PI / 2;

      // Block pads (pavements and plazas).
      const pad = lam(0xe8e2d4);
      for (const x of G.cols) for (const z of G.rows) this.add(box(G.blockW + 1.2, 0.12, G.blockD + 1.2, pad), x, 0.06, z);

      // Roads with lane markings.
      const asphalt = lam(0x4b5059);
      this.roadMat = asphalt;
      const dashGeo = new THREE.BoxGeometry(1.6, 0.02, 0.18);
      const dashes = [];
      const crosses = (z1, z2) => lagos && Math.min(z1, z2) < G.water.band[0] && Math.max(z1, z2) > G.water.band[1];
      for (const z of G.hRoads) {
        this.add(box(G.bounds.x[1] - G.bounds.x[0], 0.1, G.roadW, asphalt), (G.bounds.x[0] + G.bounds.x[1]) / 2, 0.05, z);
        for (let x = G.bounds.x[0] + 2; x < G.bounds.x[1] - 2; x += 4) if (!G.vRoads.some((v) => Math.abs(v - x) < 3.5)) dashes.push([x, z, 0]);
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
        this.water = this.add(new THREE.Mesh(new THREE.PlaneGeometry(175, b1 - b0), lam(0x4fa9d6)), 12.5, 0.02, (b0 + b1) / 2);
        this.water.rotation.x = -Math.PI / 2;
        const xs = [-75, ...G.water.bridges.flatMap((b) => [b - 3.2, b + 3.2]), 100];
        for (let i = 0; i < xs.length; i += 2) this.collider((xs[i] + xs[i + 1]) / 2, (b0 + b1) / 2, xs[i + 1] - xs[i], b1 - b0);
      } else {
        this.add(new THREE.Mesh(new THREE.PlaneGeometry(175, b1 - b0), lam(0xa9d68e)), 12.5, 0.03, (b0 + b1) / 2).rotation.x = -Math.PI / 2;
        this.addTrees([...Array(31)].map((_, i) => [-62 + i * 5, b0 + 2 + (i % 2) * 7]).filter(([x]) => !G.vRoads.some((v) => Math.abs(v - x) < 4)));
        const path = lam(0xe9dcc0);
        this.add(box(165, 0.06, 1.6, path), 12.5, 0.05, (b0 + b1) / 2);
      }
      const [s0, s1] = G.beach;
      this.add(new THREE.Mesh(new THREE.PlaneGeometry(175, s1 - s0 + 2), lam(lagos ? 0xf1dda2 : 0xc9e2a6)), 12.5, 0.03, (s0 + s1) / 2).rotation.x = -Math.PI / 2;
      this.sea = this.add(new THREE.Mesh(new THREE.PlaneGeometry(220, 60), lam(lagos ? 0x3d97cf : 0x5cb2d6)), 0, 0.01, s1 + 30);
      this.sea.rotation.x = -Math.PI / 2;
      this.collider(0, s1 + 30, 240, 60);
      this.foam = this.add(box(175, 0.03, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })), 12.5, 0.05, s1 + 0.4);
      if (lagos) {
        // Eko Atlantic: glass towers on reclaimed land, off to the south-east so
        // they never sit between the camera and the beach.
        this.add(box(58, 0.6, 46, lam(0xd9d2c0)), 108, 0.1, s1 + 22);
        this.add(box(18, 0.4, 3, lam(0x9aa0a6)), 72, 0.2, s1 + 4);
        const glassBody = [0x2f4f6f, 0x3d6a8a, 0x284057, 0x4a7896, 0x1f3346];
        for (let i = 0; i < 18; i++) {
          const x = 86 + (i % 6) * 7.2 + (Math.floor(i / 6) % 2) * 3, z = s1 + 6 + Math.floor(i / 6) * 12 + ((i * 7) % 3);
          const h = 12 + ((i * 37) % 26), bw = 3.6 + (i % 3) * 1.0;
          this.add(box(bw, h, bw, lam(glassBody[i % 5])), x, h / 2 + 0.3, z);
          for (let f = 3; f < h - 1; f += 3.2) this.add(box(bw + 0.06, 0.5, bw + 0.06, this.windowMat), x, f, z);
          if (i % 4 === 0) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), this.bulbMat), x, h + 0.6, z);
        }
        const eko = this.add(new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: signTexture("🏙️", "Eko Atlantic"), transparent: true })), 80, 7, s1 + 1.5);
        eko.rotation.y = -0.5;
      }
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
      for (const p of Object.values(this.places)) {
        if (p.remote) continue;
        const n0 = this.cityGroup.children.length;
        this.buildPlace(p);
        const pick = { kind: "place", id: p.id };
        for (let i = n0; i < this.cityGroup.children.length; i++) {
          const m = this.cityGroup.children[i];
          if (m.isMesh && !m.isInstancedMesh) { m.userData.pick = pick; this.pickables.push(m); }
        }
      }

      // Zone colours on the ground: glowing kerbs around every block, like the map.
      this.zoneMats = {};
      for (const x of G.cols) for (const z of G.rows) {
        const zn = W.zoneAt(this.city, x, z);
        const m = this.zoneMats[zn.id] || (this.zoneMats[zn.id] = new THREE.MeshBasicMaterial({ color: new THREE.Color(zn.color) }));
        const hw = G.blockW / 2 + 0.75, hd = G.blockD / 2 + 0.75;
        this.add(box(G.blockW + 1.5, 0.14, 0.18, m), x, 0.14, z - hd); this.add(box(G.blockW + 1.5, 0.14, 0.18, m), x, 0.14, z + hd);
        this.add(box(0.18, 0.14, G.blockD + 1.5, m), x - hw, 0.14, z); this.add(box(0.18, 0.14, G.blockD + 1.5, m), x + hw, 0.14, z);
      }
      // Welcome arches where the bridges land on each side.
      G.water.bridges.forEach((bx) => [[G.water.band[0] - 1.5, true], [G.water.band[1] + 1.5, false]].forEach(([bz, north]) => {
        const zn = W.zoneAt(this.city, bx - 1, north ? -12 : 12);
        const m = this.zoneMats[zn.id] || new THREE.MeshBasicMaterial({ color: new THREE.Color(zn.color) });
        [-3.6, 3.6].forEach((dx) => this.add(box(0.3, 5, 0.3, m), bx + dx, 2.5, bz));
        this.add(box(7.5, 0.3, 0.3, m), bx, 5, bz);
        const sg = this.add(new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: signTexture(zn.icon, zn.name), transparent: true, side: THREE.DoubleSide })), bx, 6.2, bz);
        void sg;
      }));
      // Blocks with no venue get a row of homes.
      for (const x of G.cols) for (const z of G.rows) {
        if (Object.values(this.places).some((p) => !p.remote && Math.abs(p.x - x) < 10 && Math.abs(p.z - z) < 7)) continue;
        this.buildHomes(x, z);
      }
      // The airport north of Ikeja, billboards and floating place icons.
      if (this.buildAirport) {
        const n0 = this.cityGroup.children.length;
        this.buildAirport();
        const pick = { kind: "place", id: "airport" };
        for (let i = n0; i < this.cityGroup.children.length; i++) { const m = this.cityGroup.children[i]; m.traverse((o) => { if (o.isMesh) o.userData.pick = pick; }); if (m.isMesh) this.pickables.push(m); else m.traverse((o) => { if (o.isMesh) this.pickables.push(o); }); }
        this.buildBillboards(); this.buildPlaceIcons();
        if (this.buildExtras) this.buildExtras();
      }
      // Street lamps along the roads.
      const lampPos = [];
      for (const z of G.hRoads) for (let x = -60; x <= 88; x += 13) lampPos.push([x, z + 3.6]);
      const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), lam(0x3c4048), lampPos.length);
      const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), this.bulbMat, lampPos.length);
      lampPos.forEach(([x, z], i) => { m4.makeTranslation(x, 2.1, z); poleMesh.setMatrixAt(i, m4); m4.makeTranslation(x, 4.25, z); bulbMesh.setMatrixAt(i, m4); });
      this.cityGroup.add(poleMesh, bulbMesh);

      // Trees around the blocks.
      const trees = [];
      for (const x of G.cols) for (const z of G.rows) { trees.push([x - 9.6, z - 6.6], [x + 9.6, z - 6.6]); }
      const inClub = (x, z) => ["beachclub", "shortlet", "conceptstore", "balogun", "beach"].some((k) => { const bc = this.places[k]; return bc && Math.abs(x - bc.x) < bc.w / 2 + 2 && Math.abs(z - bc.z) < bc.d / 2 + 2; });
      for (let x = -64; x <= 90; x += 9) if (!inClub(x, lagos ? 59 : 60)) trees.push([x, lagos ? 59 : 60]);
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

    // The VIP beach club from outside: a white pavilion on the sand.
    buildBeachClub(p) {
      const x0 = p.x, z0 = p.z, w = p.w, d = p.d, front = z0 - d / 2;
      this.add(box(w, 0.3, d, lam(0xc89a68)), x0, 0.15, z0);
      const glass = new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.4 });
      [[0, -d / 2, w, 0.1], [0, d / 2, w, 0.1], [-w / 2, 0, 0.1, d], [w / 2, 0, 0.1, d]].forEach(([dx, dz, ww, dd]) => { this.add(box(ww, 1.0, dd, glass), x0 + dx, 0.8, z0 + dz); this.add(box(ww + 0.05, 0.06, dd + 0.05, lam(0xd8a93b)), x0 + dx, 1.32, z0 + dz); });
      this.collider(x0, z0, w, d);
      // Glowing pool inside.
      this.add(box(8, 0.05, 3.2, new THREE.MeshBasicMaterial({ color: 0x2bc4e8 })), x0 - 1, 0.33, z0 + 0.8);
      // Cabana canopies.
      [[-6.5, -1.8], [-6.5, 2.4], [6.8, 2.4]].forEach(([dx, dz]) => {
        [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([px, pz]) => this.add(box(0.1, 2.3, 0.1, lam(0xffffff)), x0 + dx + px, 1.45, z0 + dz + pz));
        this.add(box(2.4, 0.12, 2.4, lam(0xffffff)), x0 + dx, 2.6, z0 + dz);
      });
      // Entrance arch with the sign and gold lanterns.
      [-1.6, 1.6].forEach((dx) => this.add(box(0.3, 3.6, 0.3, lam(0xffffff)), x0 + dx, 1.8, front));
      this.add(box(3.6, 0.35, 0.3, lam(0xffffff)), x0, 3.7, front);
      const s = this.add(new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true })), x0, 4.6, front - 0.05);
      s.rotation.y = Math.PI;
      const neon = new THREE.MeshBasicMaterial({ color: 0xffd27a }); this.neonMats.push(neon);
      this.add(box(3.3, 0.06, 0.06, neon), x0, 3.5, front - 0.17);
      [-2.4, 2.4].forEach((dx) => { this.add(box(0.4, 0.8, 0.4, lam(0xd8a93b)), x0 + dx, 0.4, front - 0.6); this.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), this.bulbMat), x0 + dx, 0.5, front - 0.6); });
      // Palms at the corners and string lights between poles.
      [[-w / 2 - 0.8, -d / 2 - 0.6], [w / 2 + 0.8, -d / 2 - 0.6], [-w / 2 - 0.8, d / 2 + 0.6], [w / 2 + 0.8, d / 2 + 0.6]].forEach(([dx, dz]) => this.palm(x0 + dx, z0 + dz));
      [-w / 2 + 0.3, w / 2 - 0.3].forEach((dx) => this.add(box(0.1, 3.6, 0.1, lam(0x6d4c41)), x0 + dx, 1.8, z0));
      for (let i = 0; i <= 18; i++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), this.bulbMat), x0 - w / 2 + 0.3 + i * (w - 0.6) / 18, 3.5 - Math.sin((i / 18) * Math.PI) * 0.6, z0);
    }

    // The IJGB shortlet from outside: a modern mansion with white and wood-clad
    // blocks, a grey tower, glass balconies, a garage and palms.
    buildMansion(p) {
      const x0 = p.x, z0 = p.z, w = p.w, d = p.d, front = z0 - d / 2;
      const white = lam(0xf4f4f2), wood = lam(0xa8794f), grey = lam(0x5a5f66), dark = lam(0x2a2d33);
      const glass = new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35 });
      this.add(box(w, 0.25, d, lam(0xdedbd4)), x0, 0.12, z0);
      const fz = z0 + 0.4 - (d - 2.4) / 2; // building face, leaving a forecourt
      // Left white block (two storeys, glass balcony), wood-clad centre, low garage wing.
      this.add(box(6, 6.4, d - 2.4, white), x0 - 6, 3.45, z0 + 0.4);
      this.add(box(6.5, 4.6, 0.6, this.windowMat), x0 + 0.2, 5.0, fz + 0.1);
      this.add(box(6, 8.2, d - 2.4, wood), x0 + 0.2, 4.35, z0 + 0.4);
      for (let i = 0; i < 12; i++) this.add(box(0.08, 3, 0.1, lam(0x6e4a2c)), x0 - 2.5 + i * 0.5, 1.75, fz - 0.05);
      this.add(box(5.4, 3.0, 0.2, this.windowMat), x0 - 6, 4.6, fz - 0.05);
      this.add(box(5.6, 0.15, 1.6, white), x0 - 6, 3.1, fz - 0.6);
      this.add(box(5.6, 1.0, 0.06, glass), x0 - 6, 3.7, fz - 1.4);
      this.add(box(5.4, 2.4, 0.2, this.windowMat), x0 - 6, 1.5, fz - 0.05);
      this.add(box(5.5, 3.6, d - 2.4, white), x0 + 6.3, 1.92, z0 + 0.4);
      this.add(box(4.2, 2.6, 0.12, dark), x0 + 6.3, 1.45, fz - 0.02); // garage door
      for (let i = 0; i < 6; i++) this.add(box(4.2, 0.04, 0.14, lam(0x3a3e45)), x0 + 6.3, 0.4 + i * 0.42, fz - 0.05);
      this.add(box(4.5, 2.4, d - 3.4, white), x0 + 6.6, 4.95, z0 + 0.9);
      this.add(box(4.0, 1.6, 0.2, this.windowMat), x0 + 6.6, 5.0, fz + 0.95);
      this.add(box(4.6, 0.12, 1.2, white), x0 + 6.6, 3.8, fz + 0.4); this.add(box(4.6, 0.9, 0.06, glass), x0 + 6.6, 4.3, fz - 0.2);
      // Grey tower and roof slabs.
      this.add(box(2.6, 10.5, 2.6, grey), x0 - 8, 5.37, z0 + 1.6);
      this.add(box(0.5, 6, 0.1, this.windowMat), x0 - 8, 6, z0 + 0.25);
      this.add(box(6.6, 0.3, d - 1.8, white), x0 - 6, 6.8, z0 + 0.4);
      this.add(box(6.6, 0.3, d - 1.8, grey), x0 + 0.2, 8.6, z0 + 0.4);
      this.collider(x0, z0 + 0.4, w, d - 2.2);
      // The garden side (what you mostly see): big glass, balconies and a plunge pool.
      const bz = z0 + 0.4 + (d - 2.4) / 2;
      this.add(box(5.4, 2.6, 0.2, this.windowMat), x0 - 6, 1.6, bz + 0.05);
      this.add(box(5.4, 2.6, 0.2, this.windowMat), x0 - 6, 4.8, bz + 0.05);
      this.add(box(5.6, 0.15, 1.2, white), x0 - 6, 3.3, bz + 0.6); this.add(box(5.6, 1.0, 0.06, glass), x0 - 6, 3.9, bz + 1.2);
      this.add(box(5.2, 6.8, 0.2, this.windowMat), x0 + 0.2, 4.0, bz + 0.05);
      for (let i = 0; i < 6; i++) this.add(box(0.08, 6.8, 0.1, dark), x0 - 2.4 + i * 1.04, 4.0, bz + 0.17);
      this.add(box(4.8, 2.4, 0.2, this.windowMat), x0 + 6.3, 1.5, bz + 0.05);
      this.add(box(3.8, 1.6, 0.2, this.windowMat), x0 + 6.6, 5.0, bz - 0.45);
      this.add(box(w - 1, 0.06, 0.9, new THREE.MeshBasicMaterial({ color: 0x2bc4e8 })), x0, 0.27, z0 + d / 2 - 0.5);
      [-6, -2, 3].forEach((dx) => this.add(box(0.7, 0.25, 0.5, lam(0xffffff)), x0 + dx, 0.38, bz + 0.45));
      // Front door with a warm glow.
      this.add(box(1.6, 2.8, 0.1, lam(0x3a2a1e)), x0 + 0.2, 1.5, fz - 0.12);
      const warm = new THREE.MeshBasicMaterial({ color: 0xffd27a }); this.neonMats.push(warm);
      this.add(box(1.8, 0.05, 0.05, warm), x0 + 0.2, 3.0, fz - 0.2);
      const s = this.add(new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true })), x0 + 0.2, 7.2, fz - 0.06);
      s.rotation.y = Math.PI;
      // Cars outside the garage, a round flower bed, bollard lights and palms.
      [[5.1, 0x111111], [7.5, 0xf2f2f2]].forEach(([dx, c]) => {
        this.add(box(1.7, 0.7, 3.2, lam(c)), x0 + dx, 0.6, front - 0.1); this.collider(x0 + dx, front - 0.1, 1.8, 3.2);
        this.add(box(1.5, 0.55, 1.9, lam(0x1f2a36)), x0 + dx, 1.2, front + 0.1);
        [[-0.8, -1.1], [0.8, -1.1], [-0.8, 1.1], [0.8, 1.1]].forEach(([wx, wz]) => { const t = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10), lam(0x111111)), x0 + dx + wx, 0.35, front - 0.1 + wz); t.rotation.z = Math.PI / 2; });
      });
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.35, 18), lam(0xdedbd4)), x0 - 3.2, 0.3, front + 0.2);
      for (let i = 0; i < 10; i++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), lam([0xe53935, 0xffffff, 0xf06292][i % 3])), x0 - 3.2 + Math.cos(i * 0.63) * 0.8, 0.6, front + 0.2 + Math.sin(i * 0.63) * 0.8);
      this.add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 7), lam(0x2f7d3c)), x0 - 3.2, 1.2, front + 0.2);
      this.collider(x0 - 3.2, front + 0.2, 2.4, 2.4);
      [-8.5, -6, -1.4, 1.8, 3.6].forEach((dx) => { this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6), dark), x0 + dx, 0.45, front - 0.3); this.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), this.bulbMat), x0 + dx, 0.85, front - 0.3); });
      [[-w / 2 - 0.6, front + 0.6], [w / 2 + 0.6, front + 0.6], [-w / 2 - 0.6, z0 + d / 2 - 0.5], [w / 2 + 0.6, z0 + d / 2 - 0.5]].forEach(([dx, z]) => this.palm(x0 + dx, z));
    }

    // The designer concept store: cream stone, gold trim, glass showrooms both sides.
    buildBoutique(p) {
      const x0 = p.x, z0 = p.z, w = p.w - 1, d = p.d - 2, h = p.h, front = z0 - d / 2, back = z0 + d / 2;
      const stone = lam(0xf3ede4), black = lam(0x1c1c1e), gold = lam(0xd8a93b);
      this.add(box(p.w, 0.25, p.d, lam(0xe2dccf)), x0, 0.12, z0);
      this.add(box(w, h, d, stone), x0, h / 2 + 0.25, z0);
      this.add(box(w + 0.3, 0.4, d + 0.3, black), x0, h + 0.45, z0);
      this.add(box(w + 0.32, 0.08, d + 0.32, gold), x0, h + 0.2, z0);
      this.collider(x0, z0, w, d);
      [front - 0.06, back + 0.06].forEach((fz, side) => {
        this.add(box(w - 1.6, 3.2, 0.12, this.windowMat), x0, 2.0, fz);
        for (let i = 0; i <= 4; i++) this.add(box(0.12, 3.3, 0.18, black), x0 - (w - 1.6) / 2 + i * (w - 1.6) / 4, 2.0, fz);
        this.add(box(w - 1.2, 0.12, 1.4, black), x0, 3.75, fz + (side ? 0.7 : -0.7)); // awning
        this.add(box(w - 1.2, 0.06, 0.06, gold), x0, 3.68, fz + (side ? 1.4 : -1.4));
        [-2.6, 0, 2.6].forEach((dx, i) => { const m = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.2, 10), lam([0xc9a24a, 0x8d1b3d, 0x2f5d8a][i])), x0 + dx, 1.4, fz + (side ? -0.5 : 0.5)); void m; });
      });
      this.add(box(1.8, 2.8, 0.14, black), x0, 1.65, front - 0.1);
      const s = this.add(new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.6), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true })), x0, h - 0.6, front - 0.1);
      s.rotation.y = Math.PI;
      const s2 = this.add(new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.6), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true })), x0, h - 0.6, back + 0.1);
      void s2;
      // Velvet rope and gold planters by the door.
      [-1.6, 1.6].forEach((dx) => { this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), gold), x0 + dx, 0.75, front - 1.2); this.add(box(0.7, 0.8, 0.7, gold), x0 + dx * 2.2, 0.65, front - 0.8); this.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), lam(0x2f7d3c)), x0 + dx * 2.2, 1.4, front - 0.8); });
      this.add(box(3.2, 0.06, 0.06, lam(0x8d1b3d)), x0, 1.05, front - 1.2);
      [[-w / 2 - 0.5, front - 0.4], [w / 2 + 0.5, back]].forEach(([dx, z]) => this.palm(x0 + dx, z));
    }

    // A row of family homes with walls and gates (empty blocks).
    buildHomes(cx, cz) {
      const cols = [0xf3e3c3, 0xe9d2b4, 0xf6efe4, 0xd9e4ec, 0xf2d7d0];
      for (let i = 0; i < 3; i++) {
        const x = cx - 6.4 + i * 6.4, h = 4.5 + ((i * 7 + cx) % 3) * 1.6;
        this.add(box(5.2, h, 7, lam(cols[(i + Math.abs(cx)) % 5])), x, h / 2 + 0.12, cz - 1);
        this.add(box(5.6, 0.3, 7.4, lam(0x8a5a44)), x, h + 0.25, cz - 1);
        [-1.3, 1.3].forEach((dx) => this.add(box(1.1, 1.1, 0.1, this.windowMat), x + dx, h - 1.4, cz + 2.55));
        this.add(box(1, 1.9, 0.1, lam(0x5b3a23)), x, 1.07, cz + 2.55);
        this.add(box(5.6, 1.4, 0.2, lam(0xe8e2d4)), x, 0.82, cz + 5.4);
        this.add(box(1.6, 1.3, 0.22, lam(0x2f3238)), x, 0.8, cz + 5.42);
        this.collider(x, cz + 1.2, 5.8, 9);
      }
    }

    // Neon Palm, Lekki: the restaurant-lounge-club everyone ends up at.
    buildNeonLounge(p) {
      const x0 = p.x, z0 = p.z, w = p.w - 1, d = p.d - 1, h = p.h, front = z0 + d / 2;
      const body = lam(0x2a1f3d), black = lam(0x141018);
      const pink = new THREE.MeshBasicMaterial({ color: 0xff3dbb }), blue = new THREE.MeshBasicMaterial({ color: 0x4fc3ff });
      this.neonMats.push(pink);
      this.add(box(w, h, d - 3, body), x0, h / 2 + 0.12, z0 - 1.5);
      this.add(box(w + 0.4, 0.4, d - 2.6, black), x0, h + 0.3, z0 - 1.5);
      this.collider(x0, z0 - 1.5, w, d - 3);
      const fz = front - 3;
      this.add(box(w - 2, 3.0, 0.15, this.windowMat), x0, 1.8, fz + 0.05);
      this.add(box(w - 2, 1.6, 0.15, this.windowMat), x0, 5.0, fz + 0.05);
      this.add(box(w + 0.1, 0.12, 0.12, pink), x0, h + 0.05, fz + 0.1);
      this.add(box(w - 2, 0.1, 0.1, pink), x0, 3.45, fz + 0.15);
      [-w / 2 + 0.3, w / 2 - 0.3].forEach((dx) => this.add(box(0.12, h, 0.12, blue), x0 + dx, h / 2 + 0.12, fz + 0.1));
      const s = this.add(new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.9), new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true })), x0, h - 0.6, fz + 0.2);
      void s;
      // Front terrace: tables under umbrellas, palms in pink-lit planters, string bulbs.
      this.add(box(w, 0.15, 3, lam(0x3a2c4f)), x0, 0.14, front - 1.4);
      [-5.5, -2, 2, 5.5].forEach((dx, i) => {
        this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 12), lam(0xf4f4f4)), x0 + dx, 1.0, front - 1.4);
        this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), black), x0 + dx, 0.5, front - 1.4);
        this.add(new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 10), lam(i % 2 ? 0xff3dbb : 0x1c1c1e)), x0 + dx, 2.5, front - 1.4);
        this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4), black), x0 + dx, 1.75, front - 1.4);
      });
      this.collider(x0, front - 1.4, w - 2, 1.4);
      [-w / 2 - 0.2, w / 2 + 0.2].forEach((dx) => { this.add(box(1, 0.8, 1, pink), x0 + dx, 0.5, front - 0.6); this.palm(x0 + dx, front - 0.6); });
      for (let i = 0; i <= 16; i++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), this.bulbMat), x0 - w / 2 + i * (w / 16), 3.2 - Math.sin((i / 16) * Math.PI) * 0.5, front - 0.1);
    }

    // Admiralty Close: Lekki homes, one of them always throwing a party.
    buildLekkiStreet(p) {
      const x0 = p.x, z0 = p.z;
      const homes = [[-6.5, 0xf6efe4, false], [0, 0xffffff, true], [6.5, 0xe9d2b4, false]];
      homes.forEach(([dx, c, party]) => {
        const x = x0 + dx, h = party ? 7.4 : 6;
        this.add(box(5.6, h, 7, lam(c)), x, h / 2 + 0.12, z0 - 2.5);
        this.add(box(6, 0.3, 7.4, lam(party ? 0x1c1c1e : 0x7a4b3a)), x, h + 0.25, z0 - 2.5);
        [-1.4, 1.4].forEach((wx) => { this.add(box(1.2, 1.4, 0.1, this.windowMat), x + wx, 1.6, z0 + 1.05); this.add(box(1.2, 1.4, 0.1, this.windowMat), x + wx, h - 1.6, z0 + 1.05); });
        this.add(box(6, 1.5, 0.2, lam(0xe8e2d4)), x, 0.87, z0 + 3.8);
        this.add(box(1.8, 1.4, 0.22, lam(0x2f3238)), x, 0.82, z0 + 3.82);
        this.collider(x, z0 - 0.6, 6.2, 9.2);
        if (party) {
          const cA = new THREE.MeshBasicMaterial({ color: 0xff3dbb }), cB = new THREE.MeshBasicMaterial({ color: 0x4fc3ff });
          this.neonMats.push(cA, cB);
          this.add(box(5.7, 0.1, 0.1, cA), x, h - 0.1, z0 + 1.1);
          this.add(box(5.7, 0.1, 0.1, cB), x, 3.2, z0 + 1.1);
          [-2.2, 2.2].forEach((sx) => { this.add(box(0.7, 1.4, 0.6, lam(0x111111)), x + sx, 0.85, z0 + 2.2); });
          for (let i = 0; i < 9; i++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), i % 2 ? cA : cB), x - 2.8 + i * 0.7, 2.2 - Math.sin(i / 8 * Math.PI) * 0.3, z0 + 3.9);
          this.add(new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: signTexture("🎉", "House Party Tonight"), transparent: true })), x, h + 1.3, z0 + 1.1);
        }
      });
      // Cars squeezed onto the close, palms and a gateman's post.
      [[-4, 0xc62828], [4.6, 0x1565c0]].forEach(([dx, c]) => { this.add(box(1.8, 0.8, 3.6, lam(c)), x0 + dx, 0.6, z0 + 5.6); this.add(box(1.6, 0.6, 1.8, lam(0x263238)), x0 + dx, 1.2, z0 + 5.4); this.collider(x0 + dx, z0 + 5.6, 1.9, 3.6); });
      this.palm(x0 - 9.6, z0 + 4.5); this.palm(x0 + 9.6, z0 + 4.5);
      this.add(box(1.4, 2.2, 1.4, lam(0xf0e6c8)), x0 + 9.2, 1.2, z0 + 1.5);
    }

    // Balogun Market: a waterfront maze of umbrella stalls, fabric racks and crowds.
    buildBalogun(p) {
      const x0 = p.x, z0 = p.z, w = p.w;
      this.add(box(w + 8, 0.08, 12, lam(0x8f8a80)), x0, 0.07, z0 + 0.5); // paved marina instead of sand
      const cols = [0xff3b4e, 0xffc400, 0x2f7de1, 0x20b46e, 0xff7a00, 0xb04bff];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) {
        const x = x0 - w / 2 + 2.5 + c * ((w - 5) / 6), z = z0 - 1.5 + r * 4.6;
        const umb = this.add(new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 8), lam(cols[(r * 7 + c) % 6])), x, 2.6, z); void umb;
        this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 4), lam(0x555555)), x, 1.2, z);
        this.add(box(2.2, 0.8, 1.2, lam(0x6d4c41)), x, 0.45, z);
        for (let k = 0; k < 3; k++) this.add(box(0.5, 0.25, 0.5, lam(cols[(c + k + r) % 6])), x - 0.6 + k * 0.6, 0.98, z);
        this.collider(x, z, 2.3, 1.3);
      }
      // Fabric racks and Christmas decorations strung across.
      for (let i = 0; i < 4; i++) { const x = x0 - w / 2 + 4 + i * ((w - 8) / 3); this.add(box(3, 0.08, 0.08, lam(0x333333)), x, 2.0, z0 + 3.9); for (let k = 0; k < 6; k++) this.add(box(0.4, 1.4, 0.05, lam(cols[(i + k) % 6])), x - 1.25 + k * 0.5, 1.25, z0 + 3.9); }
      for (let i = 0; i <= 20; i++) this.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), this.bulbMat), x0 - w / 2 + i * (w / 20), 3.4 - Math.sin((i / 20) * Math.PI) * 0.5, z0 + 1);
      const sm = new THREE.MeshBasicMaterial({ map: signTexture(p.icon, p.name), transparent: true });
      this.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 2), sm), x0, 4.6, z0 - 3.55);
      this.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 2), sm), x0, 4.6, z0 - 3.65).rotation.y = Math.PI;
      [-w / 2 + 0.5, w / 2 - 0.5].forEach((dx) => this.add(box(0.3, 4.4, 0.3, lam(0x444444)), x0 + dx, 2.2, z0 - 3.6));
      this.add(box(w, 0.25, 0.25, lam(0x444444)), x0, 4.4, z0 - 3.6);
    }

    buildPlace(p) {
      const T = W.TYPES[p.type];
      if (p.type === "beachclub") { this.buildBeachClub(p); return; }
      if (p.type === "shortlet") { this.buildMansion(p); return; }
      if (p.type === "conceptstore") { this.buildBoutique(p); return; }
      if (p.type === "lekkilounge") { this.buildNeonLounge(p); return; }
      if (p.type === "balogun") { this.buildBalogun(p); return; }
      if (p.type === "lekkistreet") { this.buildLekkiStreet(p); return; }
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
        const nU = Math.max(3, Math.floor(p.w / 5.2));
        for (let i = 0; i < nU; i++) {
          const x = p.x - p.w / 2 + 2.5 + i * ((p.w - 5) / (nU - 1)), z = p.z + (i % 2) * 2;
          this.add(new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 10), lam(cols[i % 4])), x, 2.6, z);
          this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4), lam(0xffffff)), x, 1.25, z);
          this.add(box(0.8, 0.2, 1.9, lam(0xffffff)), x + 1, 0.3, z + 0.4);
        }
        for (let i = 0; i < 9; i++) { const x = -58 + i * 19; if (["beachclub", "shortlet", "conceptstore", "balogun", "photo"].some((k) => { const bc = this.places[k]; return bc && Math.abs(x - bc.x) < bc.w / 2 + 2; })) continue; this.palm(x, 52.5 + (i % 2) * 1.4); }
        signPole(p.x - p.w / 2 - 1, 52);
        // Tarkwa Bay jetty and the boats that ferry people across.
        this.add(box(2.4, 0.3, 9, lam(0x8a6b4a)), p.x + 6, 0.3, G.beach[1] + 4);
        [[p.x + 9, G.beach[1] + 6, 0xffffff], [p.x + 3, G.beach[1] + 9, 0xffc400]].forEach(([bx, bz, c]) => { this.add(box(1.8, 0.7, 4.6, lam(c)), bx, 0.35, bz); this.add(box(1.4, 0.6, 1.6, lam(0x1f6f8b)), bx, 0.95, bz - 0.4); });
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
        [[-65, -30], [91, -30], [91, -50], [-65, -50]],
        [[-65, -10], [65, -10], [65, -30], [-65, -30]],
        [[-39, -10], [-39, 8], [13, 8], [13, -10]],
        [[-65, 28], [91, 28], [91, 48], [-65, 48]],
        [[-65, 8], [65, 8], [65, 28], [-65, 28]],
        [[65, 8], [91, 8], [91, 48], [65, 48]],
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

    // ------------------------------------------------------------ interiors
    // Walk inside a venue: build its room, its walk grid and where things are.
    enterRoom(placeId, silent) {
      const pl = this.places[placeId];
      if (!pl || pl.kind !== "building") return;
      this.disposeRoom();
      const s = this.sim.s;
      const room = Rooms.build(pl.type, { home: s.home, house: s.house, day: this.sim.day() });
      room.group.position.set(0, 0, ROOM_Z);
      this.scene.add(room.group);
      if (this.shadows) room.group.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.floor && !o.userData.wall; o.receiveShadow = true; } });
      const nav = new GridNav(-room.w / 2 - 1, ROOM_Z - room.d / 2 - 1, room.w / 2 + 1, ROOM_Z + room.d / 2 + 2, 0.5);
      room.colliders.forEach((c) => nav.block({ x0: c.x0, x1: c.x1, z0: c.z0 + ROOM_Z, z1: c.z1 + ROOM_Z }, PLAYER_R * 0.75));
      room.nav = nav;
      // Where to stand to use each thing.
      room.objects.forEach((o) => {
        const toC = Math.atan2(-o.x, -o.z * 0.6 + 0.0001);
        let ap = null;
        for (const r of [0, 0.7, -0.7, 1.4, -1.4, Math.PI]) {
          const a = toC + r, dist = Math.max(o.w, o.d) / 2 + 0.7;
          const x = o.x + Math.sin(a) * dist, z = o.z + Math.cos(a) * dist;
          if (nav.freeAt(x, z + ROOM_Z)) { ap = { x, z }; break; }
        }
        if (!ap) { const sn = nav.snap(o.x, o.z + ROOM_Z); ap = sn ? { x: sn.x, z: sn.z - ROOM_Z } : { x: 0, z: room.d / 2 - 1.2 }; }
        if (o.k === "door") ap = { x: 0, z: room.d / 2 - 1.0 };
        o.ap = ap;
        o.face = Math.atan2(o.x - ap.x, o.z - ap.z);
      });
      this.room = room;
      this.interior = true;
      this.interiorPlace = placeId;
      this.homeKey = placeId === "home" ? JSON.stringify([s.home, s.house]) : null;
      this.cityGroup.visible = false;
      this.assign.clear();
      this.buildStaff();
      this.walk = null; this.seat = null;
      this.player.position.set(0, 0, ROOM_Z + room.d / 2 - 1.3);
      this.player.rotation.y = Math.PI;
      this.snapCamera = true;
      if (this.hooks.onRoom) this.hooks.onRoom(true, placeId, silent);
    }
    disposeRoom() {
      if (!this.room) return;
      this.scene.remove(this.room.group);
      this.room.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.staff.forEach((m) => this.scene.remove(m.model));
      this.staff = [];
      this.room = null;
    }
    leaveInterior() { this.disposeRoom(); this.interior = false; this.interiorPlace = null; this.cityGroup.visible = true; this.seat = null; this.walk = null; }
    // Step out of the front door onto the street.
    exitRoom() {
      const id = this.interiorPlace || this.sim.s.place || "home";
      this.leaveInterior();
      const p = this.places[id] || this.places.home;
      const dz = p.side === "S" ? 1.4 : -1.4;
      this.player.position.set(p.door.x, 0, p.door.z + dz);
      this.player.rotation.y = p.side === "S" ? 0 : Math.PI;
      this.sim.leave();
      this.sim.setPos(p.door.x, p.door.z + dz);
      this.snapCamera = true;
      if (this.hooks.onRoom) this.hooks.onRoom(false, id);
    }
    enterHome(silent) { this.enterRoom("home", silent); }
    exitHome() { this.exitRoom(); }
    roomObject(fn) { return this.room ? this.room.objects.find(fn) : null; }
    // Shop staff, bartenders and DJs who work in the room.
    buildStaff() {
      if (!this.room) return;
      const pl = this.places[this.interiorPlace];
      if (pl.type === "home" || pl.type === "family" || !W.isOpen(pl.type, this.sim.s.t)) return;
      const vendors = W.NPCS.filter((n) => n.vendor && this.sim.s.npcs[n.id].place === this.interiorPlace).length;
      let k = 0;
      this.room.objects.filter((o) => o.vendorSpot).forEach((o, i) => {
        if (i < vendors) return;
        const r = (n) => { k = (k * 9301 + 49297 + n * 7) % 233280; return k / 233280; };
        r(i + this.interiorPlace.length * 13);
        const body = r(1) < 0.5 ? "woman" : "man";
        const hairs = Object.keys(D.HAIR[body]);
        const look = { body, skin: Math.floor(r(2) * 7), hair: hairs[Math.floor(r(3) * hairs.length)], hairColour: "black", style: pl.type === "club" || pl.type === "lounge" ? "allblack" : "streetwear", colour: Math.floor(r(4) * 10), fabric: "plain", build: "regular" };
        const model = Avatar3D.build(look, { lite: true });
        model.scale.multiplyScalar(HUMAN);
        model.rotation.order = "YXZ";
        const [vx, vz, vr] = o.vendorSpot;
        model.position.set(vx, 0, vz + ROOM_Z);
        model.rotation.y = vr;
        model.userData.pick = { kind: "object", obj: o };
        model.traverse((m) => { if (m.isMesh) m.userData.pick = model.userData.pick; });
        this.shadowify(model);
        this.scene.add(model);
        this.staff.push({ model, pose: o.k === "pots" || o.k === "stove" ? "cook" : o.k === "dj" ? "dance" : "stand", obj: o });
      });
    }

    // ------------------------------------------------------------ the player
    buildPlayer(look) {
      if (this.player) { this.scene.remove(this.player); }
      const s = this.sim.s;
      const full = { ...look, shoes: s.equip.shoes || "slippers", bag: s.equip.bag, watch: s.equip.jewelry === "gold_watch", chain: s.equip.jewelry === "chain" || look.chain };
      this.player = Avatar3D.build(full);
      this.player.scale.multiplyScalar(HUMAN);
      this.player.rotation.order = "YXZ";
      this.player.userData.phase = 0;
      this.player.userData.pick = { kind: "self" };
      this.player.traverse((m) => { if (m.isMesh) m.userData.pick = this.player.userData.pick; });
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02;
      this.player.add(shadow);
      const ring = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshLambertMaterial({ color: 0x20b46e, emissive: 0x0b4a2a }));
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
      else { const pl = this.places[s.place && (!this.places[s.place].remote || s.place === "airport") ? s.place : "home"]; p = pl.spot; }
      this.player.position.set(p.x, 0, p.z);
      this.player.rotation.y = Math.PI;
      const pl = s.place && this.places[s.place];
      if (s.inside && pl && pl.kind === "building") this.enterRoom(s.place, true);
      this.snapCamera = true;
    }

    // ------------------------------------------------------------ walking
    navNow() { return this.interior ? this.room.nav : this.cityNav; }
    // Walk to a point (world coords) along a clear route, then call back.
    goTo(x, z, onArrive, opts = {}) {
      const p = this.player.position;
      let pts = this.navNow().find(p.x, p.z, x, z);
      if (!pts || !pts.length) pts = [{ x, z }];
      this.walk = { pts, i: 0, onArrive, stop: opts.stop || 0, follow: opts.follow || null, tries: 0, run: opts.run };
      this.seat = null;
      if (opts.marker !== false) { const e = pts[pts.length - 1]; this.marker.position.set(e.x, 0.06, e.z); this.marker.visible = true; this.markerT = 1.2; }
      return true;
    }
    cancelWalk() { if (this.walk) { const w = this.walk; this.walk = null; this.marker.visible = false; if (w.onCancel) w.onCancel(); } }
    isWalking() { return !!this.walk; }
    // Walk to a venue's door (outdoors) or an open place's centre.
    walkTo(placeId, onArrive) {
      const pl = this.places[placeId];
      if (!pl) return;
      if (this.interior) this.exitRoom();
      const t = pl.kind === "building" ? { x: pl.door.x, z: pl.door.z + (pl.side === "S" ? 1.2 : -1.2) } : { x: pl.spot.x, z: pl.spot.z };
      this.goTo(t.x, t.z, () => { if (onArrive) onArrive(placeId); else if (this.hooks.onArrive) this.hooks.onArrive(placeId); }, { run: true });
    }
    // Walk up to a room object, ready to use it.
    walkToObject(o, cb) {
      if (!this.room || !o) return;
      this.goTo(o.ap.x, o.ap.z + ROOM_Z, () => { this.player.rotation.y = o.face; if (cb) cb(o); });
    }
    // Walk up to a person (keeps following if they move).
    walkToPerson(id, cb) {
      const rec = this.people.get(id);
      if (!rec || !rec.model.visible) { if (cb) cb(false); return; }
      const m = rec.model.position;
      const p = this.player.position;
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (d < 1.8) { this.faceTowards(m); if (cb) cb(true); return; }
      const ang = Math.atan2(p.x - m.x, p.z - m.z);
      const tx = m.x + Math.sin(ang) * 1.3, tz = m.z + Math.cos(ang) * 1.3;
      this.goTo(tx, tz, () => { this.faceTowards(rec.model.position); if (cb) cb(true); }, { follow: id, run: !this.interior });
    }
    faceTowards(v) { this.player.rotation.y = Math.atan2(v.x - this.player.position.x, v.z - this.player.position.z); }

    // ------------------------------------------------------------ input
    bindInput() {
      this.onKey = (e) => {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        const down = e.type === "keydown";
        const k = e.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
          this.keys[k] = down;
          if (down && k !== "shift") { this.cancelWalk(); e.preventDefault(); }
        }
        if (down && (k === "q" || k === "r")) this.camYawTarget = (this.camYawTarget || this.camYaw) + (k === "q" ? 1 : -1) * Math.PI / 4;
        if (down && (k === "e" || k === "enter") && !e.repeat) { if (this.hooks.onInteractKey) this.hooks.onInteractKey(); }
      };
      window.addEventListener("keydown", this.onKey);
      window.addEventListener("keyup", this.onKey);
      this.onBlur = () => { this.keys = {}; };
      window.addEventListener("blur", this.onBlur);
      const cv = this.renderer.domElement;
      cv.addEventListener("wheel", (e) => { e.preventDefault(); if (this.overview) { this.zoomOverview(e.deltaY > 0 ? 1.1 : 0.91); return; } this.zoom = Math.max(0.5, Math.min(1.7, this.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: false });
      cv.addEventListener("contextmenu", (e) => e.preventDefault());
      // Click or tap to walk and to open interaction menus; right-drag to turn the camera.
      let down = null, pinch = null;
      cv.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), b: e.button, yaw: this.camYawTarget || this.camYaw, id: e.pointerId }; });
      cv.addEventListener("pointermove", (e) => {
        if (down && this.overview && e.pointerId === down.id && !pinch) { this.panOverview(e.clientX - (down.px ?? down.x), e.clientY - (down.py ?? down.y)); down.px = e.clientX; down.py = e.clientY; return; }
        if (down && down.b !== 0 && e.pointerId === down.id) { this.camYawTarget = down.yaw - (e.clientX - down.x) / 160; this.camYaw = this.camYawTarget; return; }
        if (!this.mobile && performance.now() - (this.hoverT || 0) > 70) { this.hoverT = performance.now(); this.hover = this.pickAt(e.clientX, e.clientY, true); cv.style.cursor = this.hover && this.hover.kind !== "ground" ? "pointer" : "default"; }
      });
      cv.addEventListener("pointerleave", () => { this.hover = null; });
      cv.addEventListener("pointerup", (e) => {
        const d = down; down = null;
        if (!d || d.id !== e.pointerId || pinch) return;
        if (d.b !== 0) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600) return;
        const pick = this.pickAt(e.clientX, e.clientY);
        if (pick && this.hooks.onPick) this.hooks.onPick(pick, e.clientX, e.clientY);
      });
      // Pinch to zoom, two-finger twist to turn.
      cv.addEventListener("touchstart", (e) => { if (e.touches.length === 2) { down = null; const [a, b] = e.touches; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), ang: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX), yaw: this.camYaw }; } }, { passive: true });
      cv.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && pinch) {
          const [a, b] = e.touches;
          const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          if (this.overview) this.zoomOverview(pinch.d / d); else this.zoom = Math.max(0.5, Math.min(1.7, this.zoom * pinch.d / d));
          pinch.d = d;
          const ang = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
          this.camYaw = this.camYawTarget = pinch.yaw - (ang - pinch.ang);
        }
      }, { passive: true });
      cv.addEventListener("touchend", (e) => { if (e.touches.length < 2) setTimeout(() => { pinch = null; }, 50); }, { passive: true });
    }
    setJoystick(x, z) { this.joy.x = x; this.joy.z = z; if (x || z) this.cancelWalk(); }
    // What's under the pointer: a person, an object, a building, yourself, or the ground.
    pickAt(cx, cy, hoverOnly) {
      const r = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const list = [this.player];
      for (const rec of this.people.values()) if (rec.model.visible) list.push(rec.model);
      this.staff.forEach((st) => list.push(st.model));
      if (this.interior && this.room) this.room.objects.forEach((o) => list.push(o.mesh));
      else if (!hoverOnly || true) list.push(...this.pickables);
      const hits = this.raycaster.intersectObjects(list, true);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData.pick && !o.userData.personId) o = o.parent;
        if (!o) continue;
        if (o.userData.personId) return { kind: o.userData.personKind || "person", id: o.userData.personId, point: h.point };
        const pk = o.userData.pick;
        if (pk.kind === "self" && hits.length > 1 && this.sim.s.activity) continue;
        return { ...pk, point: h.point };
      }
      // Otherwise the floor.
      const ray = this.raycaster.ray;
      if (Math.abs(ray.direction.y) < 1e-4) return null;
      const t = -ray.origin.y / ray.direction.y;
      if (t < 0) return null;
      const x = ray.origin.x + ray.direction.x * t, z = ray.origin.z + ray.direction.z * t;
      if (this.interior && this.room) {
        if (Math.abs(x) > this.room.w / 2 + 1 || Math.abs(z - ROOM_Z) > this.room.d / 2 + 1.5) return null;
        // Keep taps inside the room's walls.
        const hw = this.room.w / 2 - 0.6, hd = this.room.d / 2 - 0.6;
        return { kind: "ground", x: Math.max(-hw, Math.min(hw, x)), z: ROOM_Z + Math.max(-hd, Math.min(hd, z - ROOM_Z)) };
      }
      return { kind: "ground", x, z };
    }

    blockedAt(x, z) {
      if (this.interior) return this.room ? this.roomBlocked(x, z) : false;
      for (const c of this.colliders) if (x + PLAYER_R > c.x0 && x - PLAYER_R < c.x1 && z + PLAYER_R > c.z0 && z - PLAYER_R < c.z1) return true;
      return false;
    }
    roomBlocked(x, z) {
      const R = PLAYER_R * 0.7;
      for (const c of this.room.colliders) if (x + R > c.x0 && x - R < c.x1 && z - ROOM_Z + R > c.z0 && z - ROOM_Z - R < c.z1) return true;
      return false;
    }

    // ------------------------------------------------------------ per frame
    // Keep the 3D scene in step with where the sim says you are.
    syncRoom() {
      const s = this.sim.s;
      if (s.ride) { if (this.interior) this.leaveInterior(); return; }
      const pl = s.place && this.places[s.place];
      const wantRoom = s.inside && pl && pl.kind === "building";
      if (wantRoom && this.interiorPlace !== s.place) this.enterRoom(s.place, true);
      else if (!wantRoom && this.interior) {
        const id = this.interiorPlace;
        this.leaveInterior();
        const p = this.places[id] || this.places.home;
        const dz = p.side === "S" ? 1.4 : -1.4;
        this.player.position.set(p.door.x, 0, p.door.z + dz);
        this.sim.setPos(p.door.x, p.door.z + dz);
        this.snapCamera = true;
        if (this.hooks.onRoom) this.hooks.onRoom(false, id);
      } else if (this.interiorPlace === "home" && this.homeKey !== JSON.stringify([s.home, s.house]) && !s.activity) {
        const pos = this.player.position.clone();
        this.enterRoom("home", true);
        this.player.position.copy(pos);
      }
    }
    // When an activity starts in a room, sit or stand at the thing you're using.
    updateSeat() {
      const s = this.sim.s, a = s.activity;
      const key = a ? a.id + ":" + a.start : null;
      if (key !== this.actKey) {
        if (!a && this.seat) this.standUp();
        this.actKey = key;
        this.seat = null;
        if (a && a.id !== "social" && this.interior && this.room) {
          const p = this.player.position;
          const objs = this.room.objects.filter((o) => o.act.includes(a.id));
          let obj = null, bd = Infinity;
          for (const o of objs) { const d = Math.hypot(o.ap.x - p.x, o.ap.z + ROOM_Z - p.z); if (d < bd) { bd = d; obj = o; } }
          if (obj) {
            const taken = new Set([...this.assign.values()].map((sl) => sl.key));
            let seat = null, sd = Infinity;
            (obj.seats || []).forEach((st, i) => { if (taken.has(obj.x + ":" + obj.z + ":" + i)) return; const d = Math.hypot(st[0] - p.x, st[1] + ROOM_Z - p.z); if (d < sd) { sd = d; seat = st; } });
            this.seat = seat ? { x: seat[0], z: seat[1] + ROOM_Z, rot: seat[2], pose: seat[3], obj } : { x: obj.ap.x, z: obj.ap.z + ROOM_Z, rot: obj.face, pose: "stand", obj };
            this.seat.stand = { x: obj.ap.x, z: obj.ap.z + ROOM_Z };
            this.walk = null; this.marker.visible = false;
          }
        }
      }
      if (this.seat && a) {
        const st = this.seat;
        if (st.pose === "lie") this.player.position.set(st.x + Math.sin(st.rot) * 1.45, 0, st.z + Math.cos(st.rot) * 1.45);
        else this.player.position.set(st.x, 0, st.z);
        this.player.rotation.y = st.rot;
      }
    }
    standUp() {
      const st = this.seat;
      this.seat = null;
      if (st && st.stand) this.player.position.set(st.stand.x, 0, st.stand.z);
      this.player.rotation.x = 0;
    }

    update(dt, realDt) {
      this.time += realDt;
      const s = this.sim.s;
      if (this.flight) { this.updateFlight(realDt); this.updateAirport(realDt); if (this.updateExtras) this.updateExtras(realDt); this.updateAmbient(realDt); this.hemi.intensity *= 0.62; this.sun.intensity *= 0.6; this.renderer.render(this.scene, this.camera); return; }
      this.syncRoom();
      if (s.ride === null && this.wasRiding && s.pos) { this.leaveInterior(); this.player.position.set(s.pos.x, 0, s.pos.z); this.snapCamera = true; }
      this.wasRiding = !!s.ride;
      this.refreshLook();
      this.updateSeat();

      // Movement: keys or joystick, or following a clicked route.
      let mx = 0, mz = 0, kx = 0, kz = 0;
      const blocked = !!(s.ride || s.event || s.convo || s.over || this.frozen || this.overview);
      if (!blocked) {
        if (this.keys.w || this.keys.arrowup) kz -= 1;
        if (this.keys.s || this.keys.arrowdown) kz += 1;
        if (this.keys.a || this.keys.arrowleft) kx -= 1;
        if (this.keys.d || this.keys.arrowright) kx += 1;
        kx += this.joy.x; kz += this.joy.z;
        // Walking away stops what you're doing (except sleep).
        if ((Math.abs(kx) > 0.2 || Math.abs(kz) > 0.2) && s.activity && s.activity.id !== "sleep") { this.sim.cancelActivity(); if (this.hooks.onCancel) this.hooks.onCancel(); }
        if (!s.activity) {
          const c = Math.cos(this.camYaw), sn = Math.sin(this.camYaw);
          mx = kx * c + kz * sn; mz = -kx * sn + kz * c;
          if (!mx && !mz && this.walk) {
            const w = this.walk;
            // Following someone who moved? Re-route.
            if (w.follow && w.i === w.pts.length - 1 && w.tries < 4) {
              const rec = this.people.get(w.follow), end = w.pts[w.pts.length - 1];
              if (rec && Math.hypot(rec.model.position.x - end.x, rec.model.position.z - end.z) > 2.4) {
                w.tries++;
                const m = rec.model.position, p = this.player.position, ang = Math.atan2(p.x - m.x, p.z - m.z);
                const pts = this.navNow().find(p.x, p.z, m.x + Math.sin(ang) * 1.3, m.z + Math.cos(ang) * 1.3);
                if (pts) { w.pts = pts; w.i = 0; }
              }
            }
            const tgt = w.pts[w.i];
            const dx = tgt.x - this.player.position.x, dz = tgt.z - this.player.position.z;
            const dist = Math.hypot(dx, dz);
            const last = w.i === w.pts.length - 1;
            if (dist < (last ? 0.25 : 0.5)) {
              w.i++;
              if (w.i >= w.pts.length) { this.walk = null; this.marker.visible = false; if (w.onArrive) w.onArrive(); }
            } else { mx = dx / dist; mz = dz / dist; if (last && dist < 0.8) { mx *= Math.max(0.35, dist / 0.8); mz *= Math.max(0.35, dist / 0.8); } }
          }
        }
      }
      const len = Math.hypot(mx, mz);
      let moving = false, run = false;
      if (len > 0.05) {
        if (len > 1) { mx /= len; mz /= len; }
        run = (this.keys.shift || (this.walk && this.walk.run && !this.interior)) && s.needs.energy > 15;
        const sp = (run ? RUN : this.interior ? WALK * 0.75 : WALK) * realDt;
        const p = this.player.position;
        const nx = p.x + mx * sp, nz = p.z + mz * sp;
        const free = (x, z) => !this.blockedAt(x, z);
        // Overlapping something already? Let any step get you out instead of freezing.
        const stuck = !free(p.x, p.z);
        if (this.walk && !stuck && !free(nx, nz)) {
          // A route that would clip a wall stops here (close enough to use the thing).
          const wk = this.walk; this.walk = null; this.marker.visible = false;
          if (wk.onArrive) wk.onArrive();
        } else if (this.walk || stuck) { p.x = nx; p.z = nz; }
        else { if (free(nx, p.z)) p.x = nx; if (free(p.x, nz)) p.z = nz; }
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

      // Pose.
      const a = s.activity;
      let pose = moving ? (run ? "run" : "walk") : "stand", seated = false;
      if (!moving && a) {
        if (a.id === "social") {
          pose = "talk";
          const rec = this.people.get(a.with);
          if (rec && rec.model.visible) { const m = rec.model.position; const want = Math.atan2(m.x - this.player.position.x, m.z - this.player.position.z); this.player.rotation.y += (want - this.player.rotation.y) * Math.min(1, realDt * 8); }
        } else if (this.seat) { pose = Poses.seatedPose(a.pose, this.seat.pose); seated = this.seat.pose === "sit"; }
        else pose = a.pose || "stand";
      }
      if (!moving && !a && this.approachHold && this.approachHold.until > this.time) pose = "talk";
      this.player.visible = !s.ride && !(a && a.pose === "hide" && (this.seat || !this.interior));
      this.player.userData.phase += realDt * (moving ? (run ? 11 : 8.5) : pose === "dance" ? 6.5 : pose === "workout" ? 10 : 2.4);
      const yOff = Poses.apply(this.player, pose === "hide" ? "stand" : pose, this.player.userData.phase, { seated });
      this.player.position.y = yOff;
      this.plumbob.rotation.y += realDt * 2;
      this.plumbob.position.y = 2.15 + Math.sin(this.time * 2.4) * 0.06;
      const mood = this.sim.mood();
      this.plumbob.material.color.setHex(mood >= 55 ? 0x20b46e : mood >= 30 ? 0xf2b632 : 0xe5484d);
      this.plumbob.material.emissive.setHex(mood >= 55 ? 0x0b4a2a : mood >= 30 ? 0x4a3a0b : 0x4a0b0b);
      if (this.marker.visible) { this.markerT -= realDt; this.marker.material.opacity = Math.max(0, Math.min(0.9, this.markerT + 0.4)); this.marker.scale.setScalar(1 + Math.sin(this.time * 6) * 0.08); }

      // Camera: orbit with Q/R or right-drag; rooms get the Sims cutaway view.
      if (this.camYawTarget !== undefined) this.camYaw += (this.camYawTarget - this.camYaw) * Math.min(1, realDt * 6);
      const tgt = this.player.position;
      const cy = Math.cos(this.camYaw), sy = Math.sin(this.camYaw);
      let base, look;
      if (this.interior && this.room) {
        const fit = this.camera.aspect < 1.1 ? Math.pow(1.1 / Math.max(0.45, this.camera.aspect), 0.42) : 1;
        const k = Math.pow(Math.max(this.room.w / 12, this.room.d / 10), 0.85) * this.zoom * fit;
        base = new THREE.Vector3(6, 13, 13.5).multiplyScalar(k);
        look = new THREE.Vector3(lerp(tgt.x, 0, 0.45), 0.6, lerp(tgt.z, ROOM_Z, 0.45));
      } else {
        base = new THREE.Vector3(0, 34, 29).multiplyScalar(this.zoom);
        look = new THREE.Vector3(tgt.x, 1.2, tgt.z);
      }
      const off = new THREE.Vector3(base.x * cy + base.z * sy, base.y, -base.x * sy + base.z * cy);
      const want = look.clone().add(off);
      if (this.snapCamera) { this.camera.position.copy(want); this.snapCamera = false; }
      else this.camera.position.lerp(want, Math.min(1, realDt * 4));
      this.camera.lookAt(look);
      if (this.overview) this.updateOverviewCam(realDt);
      if (this.updateExtras) this.updateExtras(realDt);
      if (this.interior && this.room) {
        const ox = off.x, oz = off.z, ol = Math.hypot(ox, oz) || 1;
        this.room.walls.forEach((m) => {
          const wl = m.userData.wall;
          const low = (wl.nx * ox + wl.nz * oz) / ol > 0.25;
          const sc = low ? 0.08 : 1;
          m.scale.y += (sc - m.scale.y) * Math.min(1, realDt * 8);
          m.position.y = (wl.h * m.scale.y) / 2;
        });
        const c = this.sim.clock(), hr = c.hh + c.mm / 60;
        Rooms.animate(this.room, this.time, this.room.open || this.room.glass || this.room.house ? 1 - daylight(hr) : 1);
      }

      this.updatePeople(realDt);
      this.updateGifts(realDt);
      this.updateBubbles(realDt);
      this.updateAmbient(realDt);
      if (this.updateAirport) this.updateAirport(realDt);
      this.findTarget();
      this.updateLabels();
      this.renderer.render(this.scene, this.camera);
    }

    lookFor(id) {
      const n = W.NPCS.find((x) => x.id === id);
      if (n) return { look: n.look, name: n.name, lite: false };
      const st = this.sim.s.strangers.find((x) => x.id === id);
      if (st) return { look: st.look, name: st.name, lite: true };
      const c = this.sim.celebDef(id);
      return c ? { look: c.look, name: c.name, lite: false, celeb: c } : null;
    }
    personRec(id) {
      let rec = this.people.get(id);
      if (rec) return rec;
      const info = this.lookFor(id);
      if (!info) return null;
      const model = Avatar3D.build(info.look, { lite: info.lite });
      model.scale.multiplyScalar(HUMAN);
      model.rotation.order = "YXZ";
      model.userData.personId = id;
      model.userData.phase = Math.random() * 6;
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; model.add(sh);
      this.shadowify(model);
      this.scene.add(model);
      rec = { model, name: info.name, kind: "person", celeb: info.celeb || null };
      if (info.celeb) { // a gold halo ring so stars stand out in a crowd
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 24), new THREE.MeshBasicMaterial({ color: 0xffd23b, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; model.add(ring);
      }
      this.people.set(id, rec);
      return rec;
    }
    // Seats and standing spots inside the current room.
    roomSlots() {
      const r = this.room;
      if (r.slots) return r.slots;
      const slots = [];
      r.objects.forEach((o) => (o.seats || []).forEach((st, i) => slots.push({ key: o.x + ":" + o.z + ":" + i, x: st[0], z: st[1], rot: st[2], pose: st[3], obj: o })));
      // Standing spots for chatting in small groups.
      let k = r.w * 31 + r.d;
      const rnd = () => { k = (k * 9301 + 49297) % 233280; return k / 233280; };
      for (let n = 0, tries = 0; n < 10 && tries < 200; tries++) {
        const x = (rnd() - 0.5) * (r.w - 3), z = (rnd() - 0.5) * (r.d - 3);
        if (!r.nav.freeAt(x, z + ROOM_Z) || Math.hypot(x, z - r.d / 2) < 2.2) continue;
        slots.push({ key: "st" + n, x, z, rot: Math.atan2(-x, -z) + (rnd() - 0.5), pose: "talk", obj: null });
        n++;
      }
      r.slots = slots;
      return slots;
    }
    slotFor(id) {
      if (this.assign.has(id)) return this.assign.get(id);
      const def = W.NPCS.find((n) => n.id === id);
      let slot = null;
      if (def && def.vendor) {
        const o = this.room.objects.find((x) => x.vendorSpot);
        if (o) slot = { key: "v:" + id, x: o.vendorSpot[0], z: o.vendorSpot[1], rot: o.vendorSpot[2], pose: "stand", obj: o };
        else slot = { key: "v:" + id, x: 1.6, z: this.room.d / 2 - 1.6, rot: Math.PI, pose: "stand", obj: null };
      } else {
        const taken = new Set([...this.assign.values()].map((sl) => sl.key));
        const free = this.roomSlots().filter((sl) => !taken.has(sl.key));
        if (free.length) {
          let h = 0;
          for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
          slot = free[h % free.length];
        } else slot = { key: "x:" + id, x: (Math.random() - 0.5) * 4, z: 0, rot: 0, pose: "talk", obj: null };
      }
      this.assign.set(id, slot);
      return slot;
    }
    npcPose(slot, id) {
      const pl = this.places[this.interiorPlace];
      const p = slot.pose;
      if (p === "sit" && slot.obj && slot.obj.k === "table") {
        const eatery = ["mamaput", "fastfood", "restaurant", "cafe", "hall", "family"].includes(pl.type);
        const flip = Math.floor(this.time / 7 + id.length) % 3;
        return { pose: eatery && flip !== 2 ? "eat" : "talk", seated: true };
      }
      if (p === "sit" && slot.obj && ["salonchair", "dryer", "desk"].includes(slot.obj.k)) return { pose: slot.obj.k === "desk" ? "talk" : "phone", seated: true };
      if (p === "sit") return { pose: Math.floor(this.time / 9 + id.length) % 4 === 0 ? "phone" : "sit", seated: true };
      if (p === "drink") return { pose: "drink", seated: false };
      return { pose: p, seated: false };
    }

    updatePeople(dt) {
      const s = this.sim.s;
      const seen = new Set();
      const appr = s.approach;
      const pp = this.player.position;
      const talkTo = s.activity && s.activity.id === "social" ? s.activity.with : null;
      const place = (rec, x, z, heading, pose, seated, snapFar) => {
        const m = rec.model;
        const dx = x - m.position.x, dz = z - m.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > (snapFar || 8)) { m.position.x = x; m.position.z = z; }
        else { m.position.x += dx * Math.min(1, dt * 6); m.position.z += dz * Math.min(1, dt * 6); }
        let d = heading - m.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        m.rotation.y += d * Math.min(1, dt * 6);
        m.userData.phase += dt * (pose === "walk" ? 8.5 : pose === "dance" ? 6 + (m.userData.phase % 1) : pose === "workout" ? 10 : 2.2);
        m.position.y = Poses.apply(m, pose, m.userData.phase, { seated });
        m.visible = true;
        rec.x = m.position.x; rec.z = m.position.z;
      };
      // Someone walking over to you, then chatting for a moment.
      const approaching = (id, rec) => {
        if (appr && appr.id === id) {
          const m = rec.model.position;
          const d = Math.hypot(pp.x - m.x, pp.z - m.z);
          const head = Math.atan2(pp.x - m.x, pp.z - m.z);
          if (d > 1.35) { const sp = Math.min(d - 1.3, dt * 2.6); m.x += Math.sin(head) * sp; m.z += Math.cos(head) * sp; rec.model.rotation.y = head; rec.model.userData.phase += dt * 8.5; rec.model.position.y = Poses.apply(rec.model, "walk", rec.model.userData.phase); }
          else { this.sim.resolveApproach(); this.approachHold = { id, until: this.time + 3.2 }; this.faceTowards(m); }
          rec.model.visible = true;
          return true;
        }
        if (this.approachHold && this.approachHold.id === id && this.approachHold.until > this.time) {
          const m = rec.model.position;
          rec.model.rotation.y = Math.atan2(pp.x - m.x, pp.z - m.z);
          rec.model.userData.phase += dt * 2.4;
          rec.model.position.y = Poses.apply(rec.model, "talk", rec.model.userData.phase);
          rec.model.visible = true;
          return true;
        }
        return false;
      };
      if (this.interior && this.room) {
        for (const id of this.sim.peopleAt(this.interiorPlace)) {
          const rec = this.personRec(id);
          if (!rec) continue;
          seen.add(id);
          if (approaching(id, rec)) continue;
          const sl = this.slotFor(id);
          const np = this.npcPose(sl, id);
          let heading = sl.rot, pose = np.pose;
          if (id === talkTo) { heading = Math.atan2(pp.x - sl.x, pp.z - ROOM_Z - sl.z); if (!np.seated) pose = "talk"; }
          const lie = sl.pose === "lie";
          place(rec, sl.x + (lie ? Math.sin(sl.rot) * 1.45 : 0), sl.z + ROOM_Z + (lie ? Math.cos(sl.rot) * 1.45 : 0), heading, pose, np.seated, 3);
        }
        for (const id of [...this.assign.keys()]) if (!seen.has(id)) this.assign.delete(id);
        const open = W.isOpen(this.places[this.interiorPlace].type, s.t);
        this.staff.forEach((st) => { st.model.visible = open; st.model.userData.phase = (st.model.userData.phase || 0) + dt * (st.pose === "dance" ? 6 : 2.2); st.model.position.y = Poses.apply(st.model, st.pose, st.model.userData.phase); });
      } else {
        const party = (pl) => pl && ["club", "concert", "hall"].includes(pl) && this.sim.clock().hh >= 15;
        for (const p of this.sim.peoplePositions()) {
          if (Math.hypot(p.x - pp.x, p.z - pp.z) > 60) continue;
          const rec = this.personRec(p.id);
          if (!rec) continue;
          seen.add(p.id);
          if (approaching(p.id, rec)) continue;
          let heading = p.heading, pose = p.walking ? "walk" : party(p.place) ? "dance" : "stand";
          if (p.id === talkTo) { heading = Math.atan2(pp.x - p.x, pp.z - p.z); pose = "talk"; }
          else if (!p.walking && pose === "stand" && Math.floor(this.time / 6 + p.id.length) % 3 === 0) pose = "talk";
          place(rec, p.x, p.z, heading, pose, false);
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
            model.rotation.order = "YXZ";
            model.userData.personId = rp.username;
            model.userData.personKind = "player";
            model.userData.phase = 0;
            model.position.set(pl.spot.x + ((i % 3) - 1) * 1.6, 0, pl.spot.z + 1.6 + Math.floor(i / 3));
            this.scene.add(model);
            rec = { model, name: "@" + rp.username, kind: "player", username: rp.username };
            this.people.set(key, rec);
          }
          rec.x = rec.model.position.x; rec.z = rec.model.position.z;
          rec.model.visible = true;
          rec.model.userData.phase += dt * 2.2;
          rec.model.position.y = Poses.apply(rec.model, "stand", rec.model.userData.phase);
        });
        this.staff.forEach((st) => { st.model.visible = false; });
      }
      for (const [id, rec] of this.people) if (!seen.has(id)) {
        rec.model.visible = false;
        if (this.people.size > 80) { this.scene.remove(rec.model); this.people.delete(id); }
      }
    }

    // Today's hidden gift boxes: walk into one to collect it.
    updateGifts() {
      if (!this.gifts) {
        this.gifts = [0, 1, 2].map((i) => {
          const g = new THREE.Group();
          const cols = [0xe5484d, 0x20b46e, 0x8b5cf6][i];
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: cols, emissive: cols, emissiveIntensity: 0.25 }));
          const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.2), new THREE.MeshLambertMaterial({ color: 0xffd23b, emissive: 0x6a5000 }));
          const r2 = r1.clone(); r2.rotation.y = Math.PI / 2;
          const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 6, 12), r1.material); bow.position.y = 0.55;
          const glowRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 24), new THREE.MeshBasicMaterial({ color: 0xffd23b, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
          glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = -1.05;
          g.add(b, r1, r2, bow, glowRing);
          g.userData.ring = glowRing;
          this.scene.add(g);
          return g;
        });
      }
      const sim = this.sim, h = sim.hunt();
      if (this.giftDay !== h.day) { this.giftDay = h.day; this.giftSpots = sim.huntSpots(h.day); }
      const p = this.player.position;
      this.gifts.forEach((g, i) => {
        const spot = this.giftSpots[i];
        const show = !this.interior && !h.found[i] && !sim.s.ride;
        g.visible = show;
        if (!show) return;
        g.position.set(spot.x, 1.3 + Math.sin(this.time * 2 + i) * 0.18, spot.z);
        g.rotation.y = this.time * 1.4 + i;
        g.userData.ring.material.opacity = 0.3 + Math.sin(this.time * 4 + i) * 0.15;
        if (Math.hypot(p.x - spot.x, p.z - spot.z) < 1.8) sim.collectGift(i);
      });
    }

    // Speech bubbles from the sim, plus background chatter between people.
    updateBubbles(dt) {
      const now = this.time;
      for (const b of this.sim.bubbles.splice(0)) this.bubbles.set(b.who, { text: b.text, until: now + (b.kind === "reply" ? 3.2 : 2.6), kind: b.kind });
      this.chatT += dt;
      if (this.chatT > 1.1) {
        this.chatT = 0;
        const vis = [...this.people.entries()].filter(([, r]) => r.model.visible && r.kind === "person");
        if (vis.length >= 2) {
          const [id, rec] = vis[Math.floor(Math.random() * vis.length)];
          const near = vis.some(([id2, r2]) => id2 !== id && Math.hypot(r2.model.position.x - rec.model.position.x, r2.model.position.z - rec.model.position.z) < 3.6);
          if (near && !this.bubbles.has(id)) this.bubbles.set(id, { text: CHATTER[Math.floor(Math.random() * CHATTER.length)], until: now + 2.2, kind: "chat" });
        }
      }
      for (const [k, b] of this.bubbles) if (b.until < now) this.bubbles.delete(k);
    }

    updateAmbient(dt) {
      const s = this.sim.s;
      const c = this.sim.clock();
      const h = c.hh + c.mm / 60;
      const openAir = this.interior && this.room && (this.room.open || this.room.glass || this.room.house);
      const sky = this.interior && !openAir ? new THREE.Color(0x1d1a24) : skyAt(h);
      this.scene.background = sky;
      this.scene.fog.color = sky;
      const day = this.interior && !openAir ? 1 : daylight(h);
      // Night keeps a cool moonlit fill so the streets stay readable.
      this.hemi.intensity = this.interior && !openAir ? (this.room && this.room.dark ? 0.32 : 0.78) : openAir ? 0.42 + day * 0.5 : 0.62 + day * 0.33;
      this.hemi.color.setRGB(lerp(0.62, 1, day), lerp(0.7, 1, day), lerp(1, 1, day));
      this.sun.intensity = this.interior && !openAir ? (this.room && this.room.dark ? 0.08 : 0.42) : openAir ? 0.1 + day * 0.7 : 0.22 + day * 0.58;
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

    // What the player can interact with right now (for the E key and the ✋ button).
    findTarget() {
      const s = this.sim.s;
      if (this.overview || s.ride || s.event || s.convo || s.over || (s.activity && s.activity.id === "sleep")) { this.target = null; return; }
      const p = this.player.position;
      let best = null, bd = Infinity;
      const consider = (t, d) => { if (d < bd) { bd = d; best = t; } };
      for (const [id, rec] of this.people) {
        if (!rec.model.visible) continue;
        const d = Math.hypot(rec.model.position.x - p.x, rec.model.position.z - p.z);
        if (d < 2.4) consider({ kind: rec.kind, id: rec.kind === "player" ? rec.username : id, label: rec.name, x: rec.model.position.x, z: rec.model.position.z }, d - 0.6);
      }
      if (this.interior && this.room) {
        for (const o of this.room.objects) {
          const d = Math.hypot(o.ap.x - p.x, o.ap.z + ROOM_Z - p.z);
          if (d < 1.7) consider({ kind: "object", obj: o, label: `${o.icon || ""} ${o.label || ""}`.trim(), x: o.x, z: o.z + ROOM_Z }, d - 0.3);
        }
        this.target = best;
        return;
      }
      for (const pl of Object.values(this.places)) {
        if (pl.remote) continue;
        const d = pl.kind === "building" ? Math.hypot(pl.door.x - p.x, pl.door.z - p.z) : Math.max(Math.abs(pl.x - p.x) - pl.w / 2, Math.abs(pl.z - p.z) - pl.d / 2, 0) + 0.5;
        if (d < 3.2) consider({ kind: "place", id: pl.id, label: pl.kind === "building" ? (pl.id === "home" ? "Your flat" : pl.name) : `${pl.icon} ${pl.name}`, x: pl.door.x, z: pl.door.z }, d < 2.2 ? d - 1.5 : d);
      }
      this.target = best;
    }
    // Screen position of a target (for opening its menu with the keyboard).
    screenOf(x, y, z) {
      const v = new THREE.Vector3(x, y, z).project(this.camera);
      const r = this.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    }

    // Floating labels: place names, people's names, speech bubbles, hover hints.
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
        if (el.dataset.cls !== cls) { el.className = "wl " + cls; el.dataset.cls = cls; }
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      };
      const p = this.player.position;
      if (!this.interior) {
        for (const pl of Object.values(this.places)) {
          if (pl.remote) continue;
          const d = Math.hypot(pl.x - p.x, pl.z - p.z);
          if (this.overview ? !this.layers.names : d > 55 || d < 9) continue;
          const open = pl.kind === "building" && W.TYPES[pl.type].hours !== null ? (W.isOpen(pl.type, this.sim.s.t) ? "" : " · closed") : "";
          const cel = this.sim.celebHere(pl.id), cd = cel && this.sim.celebDef(cel.id);
          show("pl:" + pl.id, pl.x, (pl.h || 2) + 3.2, pl.z, `${pl.icon} ${escapeHtml(pl.id === "home" ? "Your Flat" : pl.name)}<i>${open}</i>${cd ? `<i class="wl-star">⭐ ${escapeHtml(cd.name)} is here</i>` : ""}`, "wl-place");
        }
      }
      if (this.overview) (this.ovLabels || []).forEach((l, k) => { if (this.layers[l.layer] !== false) show("ov:" + k, l.x, 4, l.z, escapeHtml(l.text), "wl-place wl-ov"); });
      for (const [id, rec] of this.people) {
        if (!rec.model.visible || this.overview) continue;
        const d = Math.hypot(rec.model.position.x - p.x, rec.model.position.z - p.z);
        const st = this.sim.whoState(id);
        const known = rec.kind === "player" || (st && st.met) || (this.hover && this.hover.id === id);
        if (rec.celeb) { if (d < 16) show("pp:" + id, rec.model.position.x, 3.5 + rec.model.position.y, rec.model.position.z, `⭐ ${escapeHtml(rec.name)} <i>${escapeHtml(rec.celeb.title)}</i>`, "wl-person wl-celeb"); continue; }
        if (d > (this.interior ? (known ? 9 : 4.5) : (known ? 11 : 6))) continue;
        const rel = rec.kind === "player" ? "Real player" : st && st.met ? this.sim.relLevel(id) : "";
        const mood = st && st.mood && st.mood.until > this.sim.s.t ? " 😠" : "";
        show("pp:" + id, rec.model.position.x, 3.5 + rec.model.position.y, rec.model.position.z, `${escapeHtml(rec.name)}${mood}${rel ? ` <i>${rel}</i>` : ""}`, rec.kind === "player" ? "wl-player" : "wl-person");
      }
      // Speech bubbles.
      for (const [who, b] of this.bubbles) {
        const m = who === "me" ? this.player : this.people.get(who) && this.people.get(who).model;
        if (!m || !m.visible) continue;
        const lying = Math.abs(m.rotation.x) > 1;
        show("b:" + who, m.position.x, lying ? m.position.y + 1.4 : 4.35 + m.position.y, m.position.z, `<span>${escapeHtml(b.text)}</span>`, "wl-bubble " + (b.kind || ""));
      }
      // What's under the mouse.
      const hv = this.hover;
      if (hv && hv.kind !== "ground" && hv.kind !== "self" && hv.point) {
        let label = "";
        if (hv.kind === "object") label = `${hv.obj.icon || ""} ${hv.obj.label || ""}`;
        else if (hv.kind === "place") { const pl = this.places[hv.id]; label = `${pl.icon} ${pl.id === "home" ? "Your Flat" : pl.name}`; }
        if (label.trim()) show("hover", hv.point.x, hv.point.y + 0.6, hv.point.z, escapeHtml(label.trim()), "wl-hover");
      }
      if (this.target && !hv) show("target", this.target.x, this.interior ? 2.6 : 3.9, this.target.z, `<b>${this.mobile ? "✋" : "E"}</b> ${escapeHtml(this.target.label)}`, "wl-target");
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
      this.disposeRoom();
      this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.labelLayer.remove();
    }
  }

  function escapeHtml(t) { return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  window.World3D = World;
})();
