// DECEMBER WAHALA — City view: a bird's-eye view of the whole city with map
// layers you can switch on and off (go-slow traffic, billboards, neighbours,
// sea traffic, government, names), plus the things you mostly see from up
// there: housing estates, the refinery site, the advertisers' sea plots,
// government buildings and ferries.
/* global THREE */
(function () {
  const W3 = window.World3D;
  if (!W3) return;
  const P = W3.prototype;
  const lam = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...(o || {}) });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);

  function label(text, bg, fg = "#ffffff", w = 512, h = 96) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.fillStyle = bg; x.beginPath(); x.roundRect ? x.roundRect(0, 0, w, h, h / 2) : x.rect(0, 0, w, h); x.fill();
    x.fillStyle = fg; x.textAlign = "center"; x.textBaseline = "middle";
    let fs = Math.round(h * 0.5); x.font = `800 ${fs}px Fredoka, system-ui, sans-serif`;
    while (x.measureText(text).width > w * 0.9 && fs > 10) { fs -= 2; x.font = `800 ${fs}px Fredoka, system-ui, sans-serif`; }
    x.fillText(text, w / 2, h / 2 + 2);
    return new THREE.CanvasTexture(c);
  }

  // A sheet of tiny ads for the sea plots: advertisers rent a square each.
  const BRANDS = ["CHUKS", "Paycashless", "MARVEL", "10 GAMES. ONE APP.", "Freelance like a pro", "yadsale", "Build once.", "Sports Find", "Shortletify", "Chowdeck", "Don't click this", "SOFT LIFE", "Detty Fest", "Bolt", "Naija Trust", "Jollof Wars", "Eko Atlantic", "Lagos Ferries", "Owambe.ng", "Japa Visas", "Gele Studio", "Suya Express", "Afrobeats FM", "Tech Hub"];
  function adSheet(seed, cols = 8, rows = 6) {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 768; const x = c.getContext("2d");
    x.fillStyle = "#e9edf2"; x.fillRect(0, 0, 1024, 768);
    const cw = 1024 / cols, ch = 768 / rows;
    const pal = ["#1c1c1e", "#d83a3a", "#2f6fd8", "#f0c52a", "#2f9b58", "#b45cff", "#ff7a00", "#20d6e6", "#ffffff", "#ff3dbb"];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const k = (seed * 31 + r * 7 + q * 13) % 97;
      if (k % 9 === 0) continue; // an unsold plot
      const bg = pal[k % pal.length], fg = bg === "#ffffff" || bg === "#f0c52a" || bg === "#20d6e6" ? "#111111" : "#ffffff";
      const px = q * cw + 5, py = r * ch + 5, w = cw - 10, h = ch - 10;
      x.fillStyle = bg; x.fillRect(px, py, w, h);
      x.fillStyle = "rgba(255,255,255,.18)"; x.beginPath(); x.arc(px + w * 0.8, py + h * 0.25, h * 0.4, 0, 7); x.fill();
      if (k % 4 === 0) { x.fillStyle = ["#8d5524", "#3b2417", "#c68642"][k % 3]; x.beginPath(); x.arc(px + w * 0.75, py + h * 0.6, h * 0.22, 0, 7); x.fill(); }
      x.fillStyle = fg; x.font = `800 ${Math.round(h * 0.2)}px Fredoka, system-ui, sans-serif`; x.textAlign = "left";
      const t = BRANDS[k % BRANDS.length];
      x.fillText(t.length > 12 ? t.slice(0, 12) : t, px + 8, py + h * 0.35);
      x.font = `600 ${Math.round(h * 0.12)}px system-ui`; x.fillText("AD · rent this plot", px + 8, py + h * 0.75);
    }
    return new THREE.CanvasTexture(c);
  }

  // Rows of houses as instances (cheap even when there are hundreds).
  function estate(group, x0, z0, cols, rows, gapX, gapZ, skip) {
    const n = cols * rows;
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 2.4, 3), lam(0xeef0ee), n);
    const roof = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 1.4, 4), lam(0x3f9b6b), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4), one = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = x0 + c * gapX, z = z0 + r * gapZ;
      if (skip && skip(x, z)) continue;
      m4.makeTranslation(x, 1.2, z); body.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(x, 3.1, z), q, one); roof.setMatrixAt(i, m4);
      i++;
    }
    body.count = roof.count = i;
    group.add(body, roof);
    return i;
  }

  P.buildExtras = function () {
    const lagos = this.city === "lagos";
    this.layers = { goslow: true, billboards: true, neighbours: true, sea: true, gov: true, names: true };
    this.layerObjs = { billboards: [], neighbours: [], sea: [], gov: [] };
    this.ovLabels = [];
    const addTo = (layer, obj) => { this.cityGroup.add(obj); if (layer) this.layerObjs[layer].push(obj); return obj; };
    const pad = (x, z, w, d, c) => { const m = box(w, 0.3, d, lam(c)); m.position.set(x, -0.15, z); return m; };

    // Neighbours: estates north of the mainland and east of Lekki.
    const ne = new THREE.Group();
    ne.add(pad(-28, -80, 84, 44, 0x9fcb7e));
    for (let r = 0; r < 4; r++) { const road = box(80, 0.06, 1.6, lam(0x8f949a)); road.position.set(-28, 0.05, -64 - r * 10); ne.add(road); }
    const govAt = (x, z) => [[-50, -72], [-30, -72], [-10, -72]].some(([gx, gz]) => Math.abs(x - gx) < 7 && Math.abs(z - gz) < 6);
    estate(ne, -66, -62, 20, 4, 4, -10, govAt);
    ne.add(pad(122, 30, 50, 66, 0x9fcb7e));
    for (let r = 0; r < 6; r++) { const road = box(46, 0.06, 1.4, lam(0x8f949a)); road.position.set(122, 0.05, 2 + r * 10); ne.add(road); }
    estate(ne, 101, 5, 11, 6, 4.2, 10);
    // A walled compound in the corner of the Lekki estate.
    const villa = box(8, 4, 6, lam(0xf4f4f2)); villa.position.set(124, 2, 66); ne.add(villa);
    const pool = box(4, 0.1, 2.6, lam(0x3fb4e0)); pool.position.set(130, 0.1, 66); ne.add(pool);
    addTo("neighbours", ne);
    this.ovLabels.push({ x: -28, z: -100, text: lagos ? "🏘️ YABA ESTATES" : "🏘️ KUBWA ESTATES", layer: "neighbours" }, { x: 122, z: -6, text: lagos ? "🏘️ LEKKI ESTATE" : "🏘️ GWARINPA ESTATE", layer: "neighbours" });

    // Government: secretariat, police HQ and general hospital.
    const gv = new THREE.Group();
    const gb = (x, z, w, h, d, c, icon, name) => {
      const b = box(w, h, d, lam(c)); b.position.set(x, h / 2, z); gv.add(b);
      const r = box(w + 0.4, 0.4, d + 0.4, lam(0x2f3439)); r.position.set(x, h + 0.2, z); gv.add(r);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: label(`${icon} ${name}`, "#1d2433"), depthWrite: false })); s.scale.set(9, 1.7, 1); s.position.set(x, h + 3, z); gv.add(s);
      return b;
    };
    gb(-30, -70, 12, 9, 7, 0xf4f4f2, "🏛️", lagos ? "State Secretariat" : "Federal Secretariat");
    const pole = cyl(0.08, 0.08, 7, lam(0xdddddd), 6); pole.position.set(-24, 3.5, -66); gv.add(pole);
    const flag = box(2, 1.2, 0.05, lam(0x0f8a4a)); flag.position.set(-23, 6.4, -66); gv.add(flag);
    const mid = box(0.7, 1.2, 0.06, lam(0xffffff)); mid.position.set(-23, 6.4, -66); gv.add(mid);
    gb(-50, -70, 9, 6, 6, 0x2f4f8a, "🚓", "Police HQ");
    gb(-10, -70, 10, 7, 6, 0xf4f4f2, "🏥", "General Hospital");
    const cross = box(2, 0.6, 0.1, lam(0xd83a3a)); cross.position.set(-10, 5, -66.9); gv.add(cross);
    const cross2 = box(0.6, 2, 0.1, lam(0xd83a3a)); cross2.position.set(-10, 5, -66.9); gv.add(cross2);
    addTo("gov", gv);

    // The refinery site (coming soon) west of Lagos Island.
    const rf = new THREE.Group();
    rf.add(pad(-92, 28, 32, 40, 0xcdbf9c));
    for (let i = 0; i < 6; i++) { const t = cyl(3, 3, 3.4, lam(i < 3 ? 0xeef0f2 : 0xc9cdd2), 24); t.position.set(-102 + (i % 3) * 7, 1.7, 14 + Math.floor(i / 3) * 8); rf.add(t); if (i >= 3) { const ring = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.08, 6, 24), lam(0x888888)); ring.rotation.x = Math.PI / 2; ring.position.set(t.position.x, 3.4, t.position.z); rf.add(ring); } else { const band = cyl(3.02, 3.02, 0.3, lam(0x0f8a4a), 24); band.position.set(t.position.x, 2.6, t.position.z); rf.add(band); } }
    for (let i = 0; i < 2; i++) { const col = cyl(1, 1, 10, lam(0xd0d3d7), 12); col.position.set(-82 + i * 3, 5, 18); rf.add(col); }
    const stack = cyl(2.5, 3.5, 8, lam(0xd0d3d7), 16); stack.position.set(-82, 4, 36); rf.add(stack);
    const pipe = box(30, 0.6, 0.8, lam(0x5b6168)); pipe.position.set(-92, 0.8, 30); rf.add(pipe);
    [[-96, 20], [-80, 26]].forEach(([x, z]) => { const mast = box(0.5, 12, 0.5, lam(0xf0c52a)); mast.position.set(x, 6, z); rf.add(mast); const jib = box(10, 0.4, 0.4, lam(0xf0c52a)); jib.position.set(x + 4, 12, z); rf.add(jib); });
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: label("🚧🛢️ Refinery · Coming soon", "#f0c52a", "#1d2433"), depthWrite: false })); sign.scale.set(16, 3, 1); sign.position.set(-92, 6, 48); rf.add(sign);
    this.cityGroup.add(rf);

    // Advertisers' sea plots far east.
    const ads = new THREE.Group();
    ads.add(pad(195, -10, 92, 140, 0xdfe5ea));
    for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(42, 31.5), new THREE.MeshBasicMaterial({ map: adSheet(r * 2 + q + 1) }));
      m.rotation.x = -Math.PI / 2; m.position.set(173 + q * 44, 0.12, -62 + r * 34); ads.add(m);
    }
    addTo("billboards", ads);
    this.ovLabels.push({ x: 195, z: 64, text: "📢 SEA PLOTS · ADVERTISE HERE", layer: "billboards" });
    (this.billboardObjs || []).forEach((b) => this.layerObjs.billboards.push(b));

    // Sea traffic: ferries on the lagoon and boats on the ocean.
    const sea = new THREE.Group();
    this.boats = [];
    const boat = (c) => { const g = new THREE.Group(); const hull = box(2.2, 0.8, 6, lam(c)); hull.position.y = 0.3; g.add(hull); const cab = box(1.8, 0.9, 2.4, lam(0xffffff)); cab.position.set(0, 1.1, -0.5); g.add(cab); return g; };
    for (let i = 0; i < 6; i++) { const b = boat([0xf0c52a, 0xffffff, 0x2f6fd8, 0xd83a3a][i % 4]); sea.add(b); this.boats.push({ b, lagoon: i < 3 && lagos, i }); }
    addTo("sea", sea);
    this.ovLabels.push({ x: -40, z: 85, text: lagos ? "🌊 ATLANTIC OCEAN" : "🌊 JABI LAKE", layer: "sea" });
    if (lagos) this.ovLabels.push({ x: 40, z: -1, text: "LAGOS LAGOON", layer: "sea" });
  };

  P.updateExtras = function (dt) {
    if (!this.boats) return;
    const t = this.time;
    this.boats.forEach((o) => {
      const k = ((t * 0.012 + o.i * 0.17) % 1);
      const dir = o.i % 2 ? 1 : -1;
      const x = dir > 0 ? -70 + k * 165 : 95 - k * 165;
      o.b.position.set(x, 0.05, o.lagoon ? -1 + (o.i % 2) * 2.5 : 72 + o.i * 4);
      o.b.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
    // Go-slow: roads blush red with the traffic when the layer is on in City view.
    if (this.roadMat) {
      const lvl = this.sim.trafficLevel();
      const want = this.overview && this.layers.goslow ? [0x4b6b59, 0x7a6a3a, 0x9a4a2a, 0xb02a2a][lvl] : 0x4b5059;
      this.roadMat.color.lerp(new THREE.Color(want), Math.min(1, dt * 3));
    }
  };

  // ------------------------------------------------ the bird's-eye view
  P.setOverview = function (on) {
    if (on === !!this.overview) return;
    if (on && this.interior) return false;
    this.overview = on;
    if (on) {
      const p = this.player.position;
      this.ov = { x: Math.max(-40, Math.min(70, p.x)), z: Math.max(-40, Math.min(40, p.z)), zoom: this.camera.aspect < 1 ? 1.5 : 1, fog: [this.scene.fog.near, this.scene.fog.far] };
      if (!this.ovSeen) { this.ovSeen = true; if (this.camera.aspect < 1) this.layers.names = false; } // phones: names off at first, too crowded
      this.scene.fog.near = 400; this.scene.fog.far = 1200;
      this.camera.far = 1500; this.camera.updateProjectionMatrix();
      this.cancelWalk && this.cancelWalk();
    } else {
      if (this.ov) { this.scene.fog.near = this.ov.fog[0]; this.scene.fog.far = this.ov.fog[1]; }
      this.camera.far = 500; this.camera.updateProjectionMatrix();
      this.snapCamera = true;
    }
    this.applyLayers();
    return true;
  };
  P.setLayer = function (k, on) { this.layers[k] = on; this.applyLayers(); };
  P.applyLayers = function () {
    if (!this.layerObjs) return;
    for (const k in this.layerObjs) this.layerObjs[k].forEach((o) => { o.visible = this.layers[k] !== false; });
  };
  P.updateOverviewCam = function (dt) {
    const o = this.ov;
    let kx = 0, kz = 0;
    if (this.keys.w || this.keys.arrowup) kz -= 1;
    if (this.keys.s || this.keys.arrowdown) kz += 1;
    if (this.keys.a || this.keys.arrowleft) kx -= 1;
    if (this.keys.d || this.keys.arrowright) kx += 1;
    kx += this.joy.x; kz += this.joy.z;
    const sp = 90 * o.zoom * dt;
    o.x = Math.max(-120, Math.min(220, o.x + kx * sp)); o.z = Math.max(-110, Math.min(110, o.z + kz * sp));
    const want = new THREE.Vector3(o.x, 200 * o.zoom, o.z + 140 * o.zoom);
    if (!o.cam) o.cam = this.camera.position.clone();
    o.cam.lerp(want, Math.min(1, dt * 4));
    this.camera.position.copy(o.cam);
    this.camera.lookAt(this.camera.position.x, 0, this.camera.position.z - 140 * o.zoom);
    this.camera.updateMatrixWorld(); // labels project with this before the next render
  };
  P.panOverview = function (dxPx, dyPx) {
    const o = this.ov; if (!o) return;
    const k = 0.32 * o.zoom;
    o.x = Math.max(-120, Math.min(220, o.x - dxPx * k)); o.z = Math.max(-110, Math.min(110, o.z - dyPx * k));
  };
  P.zoomOverview = function (f) { if (this.ov) this.ov.zoom = Math.max(0.35, Math.min(1.6, this.ov.zoom * f)); };
})();
