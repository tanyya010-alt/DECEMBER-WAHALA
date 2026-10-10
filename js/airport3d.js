// DECEMBER WAHALA — the airport, north of Ikeja: terminal, gates, runway and
// apron with planes that really taxi, take off and land, plus helicopters and
// travellers. Also the flight you can board: a live view from the window (or
// a chase camera) through boarding, take-off over the city, cruising above the
// clouds and landing back home.
/* global THREE */
(function () {
  const W3 = window.World3D;
  if (!W3) return;
  const P = W3.prototype;
  const lam = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...(o || {}) });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c });
  const lerp = (a, b, k) => a + (b - a) * k;

  // ------------------------------------------------ a jet, nose towards +z
  function makePlane(opts = {}) {
    const g = new THREE.Group();
    g.rotation.order = "YXZ"; // heading, then pitch, then bank
    const white = lam(0xf6f7f9), tail = lam(opts.tail || 0x0f8a4a), grey = lam(0xb9c0c7), dark = lam(0x1d2a38);
    const body = cyl(0.75, 0.75, 9, white); body.rotation.x = Math.PI / 2; g.add(body);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), white); nose.scale.set(1, 0.95, 1.9); nose.position.z = 4.5; g.add(nose);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.6, 16), white); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0.2, -5.7); g.add(cone);
    const cockpit = box(1.0, 0.28, 0.5, dark); cockpit.position.set(0, 0.42, 5.2); cockpit.rotation.x = 0.35; g.add(cockpit);
    [-0.76, 0.76].forEach((x) => { const strip = box(0.02, 0.16, 7.2, dark); strip.position.set(x, 0.28, 0.2); g.add(strip); });
    const belly = box(1.3, 0.12, 8.5, tail); belly.position.set(0, -0.45, 0); g.add(belly);
    [-1, 1].forEach((s) => {
      const wing = box(6.2, 0.14, 2.0, grey); wing.position.set(s * 3.4, -0.3, 0.2); wing.rotation.y = s * -0.32; g.add(wing);
      const tip = box(0.12, 0.7, 0.6, tail); tip.position.set(s * 6.3, 0.0, -0.9); g.add(tip);
      const eng = cyl(0.36, 0.32, 1.6, grey, 12); eng.rotation.x = Math.PI / 2; eng.position.set(s * 2.4, -0.75, 1.0); g.add(eng);
      const intake = cyl(0.3, 0.3, 0.05, dark, 12); intake.rotation.x = Math.PI / 2; intake.position.set(s * 2.4, -0.75, 1.82); g.add(intake);
      const stab = box(2.2, 0.1, 1.1, white); stab.position.set(s * 1.2, 0.35, -6.0); stab.rotation.y = s * -0.3; g.add(stab);
    });
    const fin = box(0.14, 2.4, 2.1, tail); fin.position.set(0, 1.55, -5.8); fin.rotation.x = -0.35; g.add(fin);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), glow(0xff3b3b)); light.position.set(0, 2.7, -6.4); g.add(light);
    g.userData.beacon = light;
    if (opts.scale) g.scale.setScalar(opts.scale);
    return g;
  }
  function makeHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), lam(0x1c1c1e)); body.scale.set(1, 0.8, 1.5); body.position.y = 1.0; g.add(body);
    const boom = box(0.25, 0.25, 2.8, lam(0x1c1c1e)); boom.position.set(0, 1.1, -2.1); g.add(boom);
    const skidL = box(0.08, 0.08, 2.2, lam(0x777777)); skidL.position.set(-0.6, 0.1, 0); g.add(skidL);
    const skidR = skidL.clone(); skidR.position.x = 0.6; g.add(skidR);
    const rotor = new THREE.Group(); rotor.position.y = 1.85;
    [0, Math.PI / 2].forEach((r) => { const b = box(4.4, 0.04, 0.22, lam(0x333333)); b.rotation.y = r; rotor.add(b); });
    g.add(rotor); g.userData.rotor = rotor;
    return g;
  }

  // Keyframes [t, x, y, z] → position and heading at time t.
  function track(keys, t) {
    if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3], k: 0, i: 0 };
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t <= b[0]) {
        let k = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
        if (a[4] === "in") k = k * k; else if (a[4] === "out") k = 1 - (1 - k) * (1 - k); else if (a[4] === "io") k = k * k * (3 - 2 * k);
        return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), z: lerp(a[3], b[3], k), k, i };
      }
    }
    const l = keys[keys.length - 1];
    return { x: l[1], y: l[2], z: l[3], k: 1, i: keys.length - 1, done: true };
  }
  // Place a plane on a track, facing where it's going (or a fixed heading).
  function fly(obj, keys, t, opts = {}) {
    const p = track(keys, t), q = track(keys, t + 0.08);
    obj.position.set(p.x, p.y + (opts.lift || 0.95), p.z);
    const dx = q.x - p.x, dz = q.z - p.z, dy = q.y - p.y, d = Math.hypot(dx, dz);
    if (keys[p.i] && keys[p.i][5] !== undefined) obj.rotation.y = keys[p.i][5];
    else if (d > 0.0005) { const want = Math.atan2(dx, dz); let a = want - obj.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; obj.rotation.y += a * (opts.snap ? 1 : 0.25); }
    obj.rotation.x = d > 0.0005 ? -Math.atan2(dy, d) * 0.9 : 0;
    const turn = opts.bank ? Math.max(-0.5, Math.min(0.5, (q.x - p.x) * 0 + (obj.userData.lastYaw !== undefined ? (obj.rotation.y - obj.userData.lastYaw) * -18 : 0))) : 0;
    obj.rotation.z += (turn - obj.rotation.z) * 0.1;
    obj.userData.lastYaw = obj.rotation.y;
    obj.userData.speed = Math.hypot(dx, dz, dy) / 0.08;
    return p;
  }

  // ------------------------------------------------ the airport
  const AX = 55; // centre x
  P.buildAirport = function () {
    const lagos = this.city === "lagos";
    const add = (m, x, y, z) => this.add(m, x, y, z);
    const name = this.places.airport ? this.places.airport.name : "Airport";
    // Sea (or savanna) all around the city, so the view from a plane never ends in a void.
    const around = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lam(lagos ? 0x3d8fc4 : 0x8fbf70)); around.rotation.x = -Math.PI / 2; add(around, 20, -0.35, 0);
    // Ground and access road.
    add(box(82, 0.3, 54, lam(0x86b865)), AX, -0.1, -82);
    add(box(6, 0.12, 9, lam(0x4b5059)), AX, 0.06, -57.5);
    const bar = add(box(6, 0.12, 0.25, lam(0xd83a3a)), AX + 1.5, 1.05, -55.4); void bar;
    add(cyl(0.1, 0.1, 1.1, lam(0x444444), 6), AX - 1.6, 0.55, -55.4);
    const sg = add(new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: signLabel("✈️ " + name.toUpperCase(), "#0f8a4a"), transparent: true })), AX, 2.6, -55.2);
    sg.rotation.y = 0;
    // Forecourt: car parks either side of a palm-lined plaza with a fountain.
    const asphalt = lam(0x3d434c), paving = lam(0xe2ddd2);
    [[38, 1], [72, -1]].forEach(([cx]) => {
      add(box(16, 0.1, 8, asphalt), cx, 0.07, -63);
      const cols = [0xd83a3a, 0x2f6fd8, 0xf2f2f2, 0x1c1c1e, 0xf0c52a, 0x2f9b58, 0x9aa0a6];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) {
        if ((r * 7 + i + cx) % 5 === 0) continue;
        const c = box(1.2, 0.6, 2.1, lam(cols[(r * 3 + i + cx) % cols.length])); add(c, cx - 6.6 + i * 2.2, 0.42, -64.6 + r * 3.4);
        add(box(1.0, 0.35, 1.1, lam(0x263238)), cx - 6.6 + i * 2.2, 0.85, -64.7 + r * 3.4);
      }
      for (let i = 0; i < 8; i++) add(box(0.06, 0.02, 2.2, glow(0xffffff)), cx - 7.7 + i * 2.2, 0.13, -64.6);
      this.collider(cx, -63, 16, 8);
    });
    add(box(18, 0.1, 8, paving), AX, 0.07, -63);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.2, 28), lam(0x3fb4e0)); add(water, AX, 0.25, -62.8);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.15, 6, 28), lam(0xd9d2c5)); rim.rotation.x = Math.PI / 2; add(rim, AX, 0.3, -62.8);
    this.airportWater = water;
    this.collider(AX, -62.8, 5, 5);
    for (let i = 0; i < 6; i++) this.palm(AX - 8 + (i % 3) * 8, -59.5 - Math.floor(i / 3) * 6.6);
    // Drop-off road along the terminal.
    add(box(54, 0.1, 3.4, asphalt), AX, 0.07, -69);
    for (let i = 0; i < 12; i++) add(box(1.4, 0.02, 0.14, glow(0xffffff)), AX - 24 + i * 4.4, 0.13, -69);
    // Terminal: long white hall, blue roof stripes, green name band.
    add(box(46, 4.4, 8, lam(0xf3f5f7)), AX, 2.3, -75);
    add(box(47, 0.5, 9, lam(0xdfe5ea)), AX, 4.7, -75);
    for (let i = 0; i < 3; i++) add(box(40, 0.08, 0.35, lam(0x3a8fd6)), AX, 5.0, -73 - i * 2);
    add(box(44, 2.4, 0.1, this.windowMat), AX, 1.8, -70.95);
    for (let i = 0; i <= 11; i++) add(box(0.12, 2.6, 0.18, lam(0xc9d1d8)), AX - 22 + i * 4, 1.8, -70.9);
    add(box(46.4, 0.7, 0.2, lam(0x0f7a42)), AX, 3.55, -70.85);
    const tsign = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 0.6), new THREE.MeshBasicMaterial({ map: signLabel(name.toUpperCase(), "#0f7a42", 1024, 48, "#ffffff"), transparent: true })), AX, 3.55, -70.72);
    void tsign;
    const board = add(box(4, 1.4, 0.15, lam(0x111111)), AX, 2.0, -66.3); void board;
    this.departures = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.2), new THREE.MeshBasicMaterial({ map: boardTex(lagos), transparent: true }));
    add(this.departures, AX, 2.0, -66.2);
    add(cyl(0.08, 0.08, 1.4, lam(0x444444), 6), AX - 1.6, 0.7, -66.35); add(cyl(0.08, 0.08, 1.4, lam(0x444444), 6), AX + 1.6, 0.7, -66.35);
    this.collider(AX, -66.3, 4.2, 0.4);
    this.collider(AX, -75, 47, 8.4);
    // Concourse, jet bridges and planes at the gates (nose to the terminal).
    add(box(48, 3, 3, lam(0xe5e9ec)), AX, 1.6, -81);
    this.gateX = [AX - 20, AX - 10, AX, AX + 10, AX + 20];
    this.gatePlanes = this.gateX.map((x, i) => {
      add(box(1.4, 1.2, 4, lam(0xc9d1d8)), x, 2.2, -84.4);
      add(cyl(0.18, 0.18, 2.2, lam(0x777777), 6), x, 1.1, -86);
      const pl = makePlane({ tail: [0x0f8a4a, 0xd83a3a, 0x0f8a4a, 0x2f6fd8, 0x0f8a4a][i] });
      pl.position.set(x, 0.95, -92); pl.rotation.y = 0; this.cityGroup.add(pl);
      const num = add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: signLabel(String(i + 1), "#f0c52a", 64, 64, "#111111"), transparent: true })), x - 3, 0.14, -86.5);
      num.rotation.x = -Math.PI / 2;
      return pl;
    });
    // Aprons.
    add(box(66, 0.08, 12, lam(0xb5babf)), AX - 4, 0.05, -89.5);
    add(box(16, 0.08, 22, lam(0xb5babf)), AX + 31, 0.05, -82);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { const j = makePlane({ scale: 0.45, tail: i === 1 && r === 0 ? 0x1c1c1e : 0xb9c0c7 }); j.position.set(AX + 26 + i * 5, 0.45, -76 - r * 9); j.rotation.y = Math.PI; this.cityGroup.add(j); }
    // Helipads and hangar, fuel tanks, control tower.
    this.helis = [];
    [[AX - 34, -78], [AX - 34, -88]].forEach(([x, z], i) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.1, 28), lam(0x2a2f36)); add(pad, x, 0.08, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 6, 28), glow(0xf0c52a)); ring.rotation.x = Math.PI / 2; add(ring, x, 0.15, z);
      const H = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: signLabel("H", "#2a2f36", 64, 64, "#ffffff"), transparent: true })); H.rotation.x = -Math.PI / 2; add(H, x, 0.16, z);
      const h = makeHeli(); h.position.set(x, 0.1, z); h.rotation.y = i * 0.6; this.cityGroup.add(h);
      this.helis.push({ h, x, z, i });
    });
    const hangar = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 12, 20, 1, false, 0, Math.PI), lam(0xc9d1d8));
    hangar.rotation.z = Math.PI / 2; hangar.rotation.y = Math.PI / 2; add(hangar, AX - 33, 0, -67.5);
    this.collider(AX - 33, -67.5, 11, 10);
    for (let i = 0; i < 3; i++) add(cyl(1.3, 1.3, 1.6, lam(0xeef0f2), 18), AX - 36 + i * 3, 0.8, -61);
    add(cyl(0.7, 1.0, 9, lam(0xeef0f2), 14), AX + 36, 4.5, -64);
    add(cyl(2, 1.4, 1.6, this.windowMat, 14), AX + 36, 9.6, -64);
    add(cyl(2.1, 2.1, 0.3, lam(0xdfe3e7), 14), AX + 36, 10.5, -64);
    const radar = add(box(1.6, 0.6, 0.15, lam(0xd83a3a)), AX + 36, 11.2, -64); this.radar = radar;
    this.collider(AX + 36, -64, 3, 3);
    // Taxiway and runway with markings and edge lights.
    add(box(78, 0.08, 3, lam(0x5b6168)), AX, 0.06, -95);
    for (let i = 0; i < 26; i++) add(box(1.6, 0.02, 0.12, glow(0xf0c52a)), AX - 38 + i * 3, 0.11, -95);
    add(box(80, 0.08, 7, lam(0x2f3439)), AX, 0.07, -101);
    for (let i = 0; i < 18; i++) add(box(2.2, 0.02, 0.22, glow(0xffffff)), AX - 30 + i * 3.6, 0.12, -101);
    [-1, 1].forEach((s) => { for (let k = 0; k < 6; k++) add(box(1.6, 0.02, 0.35, glow(0xffffff)), AX + s * 36.5, 0.12, -98.6 + k * 0.95); });
    const n1 = add(new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), new THREE.MeshBasicMaterial({ map: signLabel("09", "#2f3439", 128, 96, "#ffffff"), transparent: true })), AX - 32, 0.13, -101); n1.rotation.x = -Math.PI / 2; n1.rotation.z = -Math.PI / 2;
    const n2 = add(new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), new THREE.MeshBasicMaterial({ map: signLabel("27", "#2f3439", 128, 96, "#ffffff"), transparent: true })), AX + 32, 0.13, -101); n2.rotation.x = -Math.PI / 2; n2.rotation.z = Math.PI / 2;
    for (let i = 0; i < 21; i++) [-97.3, -104.7].forEach((z) => add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), this.bulbMat), AX - 40 + i * 4, 0.2, z));
    // Perimeter: only the forecourt is walkable.
    this.collider(AX - 31, -88, 22, 40);
    this.collider(AX + 31, -88, 22, 40);
    this.collider(AX, -96, 82, 20);
    for (let i = 0; i < 14; i++) this.palm(AX - 39 + (i % 7) * 13, i < 7 ? -57.5 : -107);
    // Moving things.
    this.depPlane = makePlane({ tail: 0x0f8a4a }); this.cityGroup.add(this.depPlane);
    this.arrPlane = makePlane({ tail: 0xd83a3a }); this.cityGroup.add(this.arrPlane);
    this.skyPlane = makePlane({ tail: 0x2f6fd8, scale: 1.3 }); this.cityGroup.add(this.skyPlane);
    this.airCars = [0, 1, 2].map((i) => { const c = new THREE.Group(); const b = box(1.3, 0.7, 2.6, lam([0xf0c52a, 0x2f9b58, 0xf2f2f2][i])); b.position.y = 0.55; c.add(b); const t = box(1.1, 0.45, 1.3, lam(0x263238)); t.position.y = 1.1; c.add(t); c.rotation.y = Math.PI / 2; this.cityGroup.add(c); return c; });
    this.travellers = [];
    const tcols = [0xd83a3a, 0x2f6fd8, 0xf0c52a, 0x2f9b58, 0xb04bff, 0xff7a00, 0x1c1c1e, 0xffffff];
    for (let i = 0; i < 14; i++) {
      const t = new THREE.Group();
      const b = cyl(0.18, 0.22, 0.75, lam(tcols[i % tcols.length]), 8); b.position.y = 0.45; t.add(b);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), lam([0x6b4423, 0x8d5524, 0x3b2417][i % 3])); hd.position.y = 0.98; t.add(hd);
      const bag = box(0.3, 0.4, 0.2, lam(0x333333)); bag.position.set(0.32, 0.3, 0); t.add(bag);
      this.cityGroup.add(t);
      this.travellers.push({ t, x0: AX - 26 + ((i * 37) % 52), lane: -66.8 - (i % 3) * 0.9, sp: 0.6 + (i % 4) * 0.2, ph: i * 1.7 });
    }
  };

  function signLabel(text, bg, w = 512, h = 128, fg = "#ffffff") {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.fillStyle = fg; x.font = `800 ${Math.round(h * 0.55)}px Fredoka, system-ui, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    let fs = Math.round(h * 0.55); while (x.measureText(text).width > w * 0.92 && fs > 10) { fs -= 2; x.font = `800 ${fs}px Fredoka, system-ui, sans-serif`; }
    x.fillText(text, w / 2, h / 2 + 2);
    return new THREE.CanvasTexture(c);
  }
  function boardTex(lagos) {
    const c = document.createElement("canvas"); c.width = 384; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = "#0b0f1d"; x.fillRect(0, 0, 384, 128);
    x.font = "700 18px monospace"; x.fillStyle = "#f0c52a"; x.fillText("DEPARTURES", 12, 24);
    const rows = lagos ? [["DW247", "ABUJA", "BOARDING"], ["DW318", "PORT HARCOURT", "ON TIME"], ["DW101", "LAGOS SKYLINE", "ON TIME"], ["BA075", "LONDON LHR", "DELAYED"]] : [["DW248", "LAGOS", "BOARDING"], ["DW320", "PORT HARCOURT", "ON TIME"], ["DW102", "ABUJA SKYLINE", "ON TIME"], ["ET911", "ADDIS ABABA", "DELAYED"]];
    rows.forEach((r, i) => { x.fillStyle = "#e8ecf8"; x.font = "600 15px monospace"; x.fillText(r[0], 12, 48 + i * 20); x.fillText(r[1], 90, 48 + i * 20); x.fillStyle = r[2] === "DELAYED" ? "#ff5a6f" : r[2] === "BOARDING" ? "#5ef08a" : "#9fd6ff"; x.fillText(r[2], 270, 48 + i * 20); });
    return new THREE.CanvasTexture(c);
  }

  // Ambient airport life: one departure and one arrival every minute, a high
  // overflight, helicopters, cars and travellers.
  const DEP = [[0, AX + 33, 0, -95], [9, AX - 35, 0, -95], [11, AX - 37, 0, -101, "in"], [17, AX + 8, 0, -101, "in"], [20, AX + 40, 3, -101], [26, AX + 110, 26, -108]];
  const ARR = [[24, AX - 130, 32, -101], [31, AX - 38, 1.5, -101, "out"], [32, AX - 30, 0, -101, "out"], [36, AX + 18, 0, -101], [38, AX + 24, 0, -95], [44, AX + 40, 0, -95]];
  P.updateAirport = function (dt) {
    if (!this.depPlane) return;
    const t = this.time, cyc = t % 60;
    const flyingMine = !!this.flight;
    this.depPlane.visible = cyc < 26;
    if (this.depPlane.visible) fly(this.depPlane, DEP, cyc, { snap: cyc < 1 });
    this.arrPlane.visible = cyc > 24 && cyc < 44;
    if (this.arrPlane.visible) fly(this.arrPlane, ARR, cyc, { snap: cyc < 24.5 });
    const so = (t % 45) / 45;
    this.skyPlane.position.set(lerp(-160, 220, so), 46, lerp(40, -30, so));
    this.skyPlane.rotation.y = Math.atan2(380, -70);
    [this.depPlane, this.arrPlane, this.skyPlane].forEach((p) => { if (p.userData.beacon) p.userData.beacon.visible = Math.sin(t * 6) > 0.3; });
    if (this.radar) this.radar.rotation.y += dt * 1.5;
    if (this.airportWater) this.airportWater.material.color.setHSL(0.54, 0.65, 0.55 + Math.sin(t * 2) * 0.04);
    // Helicopters lift off in turn and hop over the city.
    this.helis.forEach((hh) => {
      hh.h.userData.rotor.rotation.y += dt * 22;
      const ph = (t + hh.i * 35) % 70;
      const up = ph < 30 ? Math.min(1, ph / 4) * Math.min(1, (30 - ph) / 4) : 0;
      const out = ph < 30 ? Math.sin((ph / 30) * Math.PI) : 0;
      hh.h.position.set(hh.x + out * 18, 0.1 + up * 14, hh.z + out * 30);
      hh.h.rotation.y = ph < 30 ? (ph < 15 ? 0 : Math.PI) : hh.i * 0.6;
    });
    this.airCars.forEach((c, i) => { const k = ((t * (0.06 + i * 0.01) + i / 3) % 1); c.position.set(AX - 26 + k * 52, 0, -68.3 - (i % 2) * 1.3); });
    this.travellers.forEach((tr) => { const x = tr.x0 + Math.sin(t * tr.sp * 0.25 + tr.ph) * 6; tr.t.position.set(Math.max(AX - 26, Math.min(AX + 26, x)), 0, tr.lane); tr.t.rotation.y = Math.cos(t * tr.sp * 0.25 + tr.ph) > 0 ? Math.PI / 2 : -Math.PI / 2; tr.t.position.y = Math.abs(Math.sin(t * 6 + tr.ph)) * 0.05; });
    void flyingMine;
  };

  // ------------------------------------------------ your flight
  // Out: board at gate 3, taxi, take off, turn over the city, climb above the clouds.
  // Back: descend over the lagoon, land and taxi to the gate.
  const G3 = AX;
  const OUT = [[0, G3, 0, -92, null, 0], [3, G3, 0, -92, null, 0], [6, G3, 0, -95.5, "io", 0], [7, G3 - 2, 0, -95.5], [12, AX - 35, 0, -95.5], [14, AX - 37, 0, -101, "in"], [21, AX + 14, 0, -101, "in"], [24, AX + 45, 5, -101], [29, AX + 70, 22, -60], [34, AX + 30, 40, 0], [40, AX - 40, 56, 40], [48, AX - 120, 70, 50]];
  const JOY = [[0, G3, 0, -92, null, 0], [3, G3, 0, -92, null, 0], [6, G3, 0, -95.5, "io", 0], [7, G3 - 2, 0, -95.5], [12, AX - 35, 0, -95.5], [14, AX - 37, 0, -101, "in"], [21, AX + 14, 0, -101, "in"], [24, AX + 45, 5, -101], [29, AX + 70, 22, -60], [34, AX + 40, 32, 10], [39, 0, 34, 40], [44, -55, 32, 10], [49, -40, 30, -40], [54, AX - 90, 22, -101], [59, AX - 38, 1.5, -101, "out"], [60, AX - 30, 0, -101, "out"], [64, AX + 10, 0, -101], [66, AX + 14, 0, -95.5], [70, G3 + 1, 0, -95.5], [72, G3, 0, -92, null, 0]];
  const BACK = [[0, AX - 150, 42, -40], [6, AX - 90, 22, -101], [11, AX - 38, 1.5, -101, "out"], [12, AX - 30, 0, -101, "out"], [16, AX + 10, 0, -101], [18, AX + 14, 0, -95.5], [22, G3 + 1, 0, -95.5], [24, G3, 0, -92, null, 0]];

  P.playFlight = function (info, done) {
    if (this.flight) return;
    this.leaveInterior && this.interior && this.leaveInterior();
    const plane = makePlane({ tail: 0x0f8a4a, scale: 1 });
    this.cityGroup.add(plane);
    if (this.gatePlanes && this.gatePlanes[2]) this.gatePlanes[2].visible = false;
    const legs = info.joy ? [{ keys: JOY, label: "Joyride" }] : [{ keys: OUT, label: "Outbound", clouds: 34 }, { keys: BACK, label: "Return", summary: true }];
    const ui = document.createElement("div");
    ui.className = "flight";
    ui.innerHTML = `<div class="fl-window"></div><div class="fl-card"><div class="fl-top"><b>✈️ ${info.code}</b><span>${info.from} → ${info.to}</span></div><div class="fl-phase">Boarding at Gate 3</div><div class="fl-stats"><span>ALT <b class="fl-alt">0</b> ft</span><span>SPD <b class="fl-spd">0</b> kt</span><span class="fl-time"></span></div><div class="fl-bar"><i></i></div></div><div class="fl-btns"><button class="btn sm" data-fl="view">🎥 Chase view</button><button class="btn sm" data-fl="skip">⏭ Skip</button></div><div class="fl-fade"></div>`;
    document.body.appendChild(ui);
    document.body.classList.add("flying");
    const f = { plane, info, legs, leg: 0, t: 0, view: "window", auto: true, ui, done, clouds: null, fogWas: [this.scene.fog.near, this.scene.fog.far] };
    this.flight = f;
    ui.querySelector('[data-fl="view"]').onclick = () => { f.auto = false; f.view = f.view === "window" ? "chase" : "window"; };
    ui.querySelector('[data-fl="skip"]').onclick = () => this.endFlight();
    this.player.visible = false;
    this.labelLayer.style.display = "none";
  };
  P.endFlight = function () {
    const f = this.flight;
    if (!f) return;
    this.flight = null;
    this.cityGroup.remove(f.plane);
    if (f.clouds) this.scene.remove(f.clouds);
    if (this.gatePlanes && this.gatePlanes[2]) this.gatePlanes[2].visible = true;
    this.scene.fog.near = f.fogWas[0]; this.scene.fog.far = f.fogWas[1];
    f.ui.remove();
    document.body.classList.remove("flying");
    this.labelLayer.style.display = "";
    this.player.visible = true;
    const sp = this.places.airport.spot;
    this.player.position.set(sp.x, 0, sp.z);
    this.snapCamera = true;
    if (f.done) f.done();
  };
  P.updateFlight = function (dt) {
    const f = this.flight, leg = f.legs[f.leg];
    f.t += dt;
    const keys = leg.keys, T = keys[keys.length - 1][0];
    const p = fly(f.plane, keys, f.t, { snap: f.t < 0.1, bank: true });
    const ui = f.ui;
    const alt = Math.max(0, Math.round((p.y * 700) / 100) * 100), spd = Math.round(Math.min(480, (f.plane.userData.speed || 0) * 9));
    ui.querySelector(".fl-alt").textContent = alt.toLocaleString();
    ui.querySelector(".fl-spd").textContent = spd;
    ui.querySelector(".fl-bar i").style.width = Math.min(100, ((f.leg + f.t / T) / f.legs.length) * 100) + "%";
    const out = leg.label !== "Return";
    const phase = f.t < 3 && out ? "Boarding at Gate 3 · welcome aboard" : f.t < 7 && out ? "Pushback" : f.t < 14 && out ? "Taxiing to runway 09" : f.t < 21 && out ? "Cleared for take-off 🛫" : out && !leg.clouds && f.t < 54 ? "Circling over the city — wave at your people!" : out && leg.clouds ? (f.t < 34 ? "Climbing over the city" : "Cruising above the clouds ☁️") : f.t < 11 ? "Descending · seatbelts on" : f.t < 16 ? "Touchdown 🛬" : "Taxiing to the gate";
    ui.querySelector(".fl-phase").textContent = leg.label === "Joyride" && f.t > 54 ? (f.t < 61 ? "Landing 🛬" : "Taxiing to the gate") : phase;
    // Auto camera: chase on the ground, window in the air.
    if (f.auto) f.view = p.y > 3 ? "window" : "chase";
    ui.querySelector('[data-fl="view"]').textContent = f.view === "window" ? "🎥 Chase view" : "🪟 Window view";
    ui.classList.toggle("win", f.view === "window");
    const pl = f.plane;
    pl.updateMatrixWorld();
    const cam = this.camera;
    if (out && f.t < 6 && leg.label !== "Return" && f.view === "chase") {
      // Boarding: watch from the apron as the jet bridge pulls away.
      const eye = new THREE.Vector3(-10, 5.5, -9).applyMatrix4(pl.matrixWorld), at = new THREE.Vector3(0, 1, 1).applyMatrix4(pl.matrixWorld);
      cam.position.copy(eye); cam.lookAt(at);
    } else if (f.view === "window") {
      const eye = new THREE.Vector3(-0.98, 0.42, 2.0).applyMatrix4(pl.matrixWorld);
      const look = new THREE.Vector3(-8, p.y > 40 ? -1.0 : -2.4, 3.2).applyMatrix4(pl.matrixWorld);
      cam.position.copy(eye); cam.lookAt(look);
    } else {
      const back = new THREE.Vector3(0, 8, -18).applyMatrix4(pl.matrixWorld);
      const ahead = new THREE.Vector3(0, 0.5, 8).applyMatrix4(pl.matrixWorld);
      cam.position.lerp(back, Math.min(1, dt * 3)); cam.lookAt(ahead);
    }
    // Clouds above the city on the way out.
    if (leg.clouds && f.t > leg.clouds - 4 && !f.clouds) {
      const cg = new THREE.Group();
      const ms = [0xffffff, 0xeef2f6, 0xdde5ee, 0xcfd9e4].map((c) => new THREE.MeshBasicMaterial({ color: c }));
      const geo = new THREE.IcosahedronGeometry(1, 1);
      for (let i = 0; i < 520; i++) { const s = new THREE.Mesh(geo, ms[i % 4]); const r = 3.5 + (i % 5) * 1.1; s.scale.set(r * 1.4, r * 0.55, r); const rx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, rz = Math.abs(Math.sin(i * 78.233) * 12543.123) % 1; s.position.set(AX - 230 + rx * 380, 28 + (i % 4) * 0.9, -110 + rz * 280); cg.add(s); }
      this.scene.add(cg); f.clouds = cg;
      this.scene.fog.near = 90; this.scene.fog.far = 320;
    }
    // Fade between legs.
    const fade = ui.querySelector(".fl-fade");
    const end = f.t >= T;
    fade.style.opacity = f.t > T - 1.5 && f.leg < f.legs.length - 1 ? Math.min(1, (f.t - (T - 1.5)) / 1.5) : f.t < 1 && f.leg > 0 ? 1 - f.t : 0;
    if (end && !f.waiting) {
      if (f.leg < f.legs.length - 1 && f.legs[f.leg + 1].summary) {
        f.waiting = true;
        const card = document.createElement("div");
        card.className = "fl-summary";
        card.innerHTML = `<h3>${f.info.icon || "🌆"} ${f.info.summaryTitle || "Touchdown"}</h3><p>${f.info.summary || ""}</p><button class="btn primary">✈️ Fly back home</button>`;
        ui.appendChild(card);
        const go = () => { if (!f.waiting) return; f.waiting = false; card.remove(); f.leg++; f.t = 0; if (f.clouds) { this.scene.remove(f.clouds); f.clouds = null; } this.scene.fog.near = f.fogWas[0]; this.scene.fog.far = f.fogWas[1]; };
        card.querySelector("button").onclick = go;
        setTimeout(go, 6000);
      } else if (!f.waiting) { this.endFlight(); }
    }
  };

  // ------------------------------------------------ billboards and place icons
  const ADS = [
    ["Chowdeck", "Food at your door in 20 mins 🛵", "#ff4f6d", "#fff"], ["Shortletify", "Luxury Apartments · Lekki · ₦200k/night", "#1c1c1e", "#ffd76a"], ["DETTY FEST", "26–28 Dec · Eko Atlantic 🎤", "#b45cff", "#fff"],
    ["Bolt", "Ride anywhere in Lagos", "#2f9b58", "#fff"], ["Better Call Mide", "Lawyer · Wahala Specialist 😎", "#f0c52a", "#1c1c1e"], ["Naija Trust Bank", "Quick loans, no wahala*", "#2f6fd8", "#fff"],
    ["Sports Find", "Book a 5-a-side pitch tonight ⚽", "#20d6e6", "#0b0f1d"], ["10 GAMES. ONE APP.", "Download on Android & iOS", "#d83a3a", "#fff"],
  ];
  function adTex([title, sub, bg, fg]) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d");
    x.fillStyle = bg; x.fillRect(0, 0, 512, 256);
    x.fillStyle = "rgba(255,255,255,.12)"; x.beginPath(); x.arc(430, 60, 120, 0, 7); x.fill();
    x.fillStyle = fg; x.textAlign = "left"; x.font = "800 52px Fredoka, system-ui, sans-serif"; x.fillText(title, 28, 110);
    x.font = "600 26px system-ui, sans-serif"; x.fillText(sub, 28, 160);
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(28, 190, 150, 36); x.fillStyle = "#fff"; x.font = "700 18px system-ui"; x.fillText("AD", 462, 236); x.fillText("Learn more ›", 40, 214);
    return new THREE.CanvasTexture(c);
  }
  P.buildBillboards = function () {
    const spots = [[-58, -58, 0], [-30, -58, 0], [-2, -58, 0], [-73, -40, Math.PI / 2], [-73, -20, Math.PI / 2], [-73, 18, Math.PI / 2], [-73, 38, Math.PI / 2], [98, 18, -Math.PI / 2]];
    spots.forEach(([x, z, r], i) => {
      const g = new THREE.Group();
      [-2.6, 2.6].forEach((dx) => { const leg = box(0.25, 3.2, 0.25, lam(0x222222)); leg.position.set(dx, 1.6, -0.1); g.add(leg); });
      const frame = box(7.4, 3.9, 0.3, lam(0x111111)); frame.position.y = 4.6; g.add(frame);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: adTex(ADS[i % ADS.length]) })); face.position.set(0, 4.6, 0.16); g.add(face);
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.4), this.bulbMat); l.position.set(-2.4 + k * 2.4, 6.65, 0.3); g.add(l); }
      g.position.set(x, 0, z); g.rotation.y = r;
      this.cityGroup.add(g);
      (this.billboardObjs = this.billboardObjs || []).push(g);
    });
  };
  P.buildPlaceIcons = function () {
    this.placeIcons = [];
    for (const p of Object.values(this.places)) {
      if (p.remote && p.id !== "airport") continue;
      const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
      x.fillStyle = "#ffffff"; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.fill();
      x.strokeStyle = "rgba(0,0,0,.12)"; x.lineWidth = 4; x.stroke();
      x.font = "64px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(p.icon, 64, 70);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
      const ax = p.id === "airport" ? AX : p.x, az = p.id === "airport" ? -77 : p.z;
      sp.position.set(ax, (p.id === "airport" ? 9 : p.h || 2) + 4.2, az);
      sp.scale.set(2.6, 2.6, 1);
      sp.renderOrder = 5;
      this.cityGroup.add(sp);
      this.placeIcons.push(sp);
    }
  };
})();
