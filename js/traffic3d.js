// DECEMBER WAHALA — street traffic: danfos, BRT buses, cars, kekes, okadas and
// trucks driving every road on the right-hand side, turning at junctions,
// queueing behind each other, slowing for go-slow and stopping for you.
// Plus pedestrians walking the pavements.
/* global THREE, WORLD */
(function () {
  const W3 = window.World3D;
  if (!W3) return;
  const P = W3.prototype;
  const G = window.WORLD.GRID;
  const mats = new Map();
  const lam = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
  const B = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); g.add(m); return m; };
  const wheel = (g, x, z, r = 0.32) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.24, 10), lam(0x111111)); m.rotation.z = Math.PI / 2; m.position.set(x, r, z); g.add(m); return m; };

  // Vehicle models face +z.
  const KINDS = {
    danfo: { speed: 9, len: 4.8, make(g) { B(g, 2.1, 1.7, 4.6, 0xffc400, 0, 1.2, 0); B(g, 2.12, 0.22, 4.62, 0x111111, 0, 1.0, 0); B(g, 2.14, 0.55, 3.6, 0x222b33, 0, 1.65, -0.2); B(g, 2.0, 0.5, 0.06, 0x222b33, 0, 1.6, 2.31); [[-0.85, 1.5], [0.85, 1.5], [-0.85, -1.5], [0.85, -1.5]].forEach(([x, z]) => wheel(g, x, z, 0.36)); B(g, 1.6, 0.18, 1.2, 0x5b3a23, 0, 2.15, -0.4); } },
    brt: { speed: 10, len: 9, make(g, c) { B(g, 2.4, 2.4, 8.8, c || 0x1f4fb8, 0, 1.55, 0); B(g, 2.42, 0.9, 8.4, 0x1b2733, 0, 2.0, 0); B(g, 2.44, 0.25, 8.82, 0xd83a3a, 0, 0.75, 0); B(g, 2.3, 0.8, 0.06, 0x1b2733, 0, 2.0, 4.42); [[-1, 3], [1, 3], [-1, -3], [1, -3]].forEach(([x, z]) => wheel(g, x, z, 0.45)); } },
    car: { speed: 12, len: 3.8, make(g, c) { B(g, 1.8, 0.75, 3.8, c, 0, 0.65, 0); B(g, 1.6, 0.6, 2.0, c, 0, 1.3, -0.25); B(g, 1.62, 0.45, 1.9, 0x1b2733, 0, 1.3, -0.25); B(g, 0.3, 0.15, 0.05, 0xfff2b0, -0.6, 0.75, 1.92); B(g, 0.3, 0.15, 0.05, 0xfff2b0, 0.6, 0.75, 1.92); B(g, 0.3, 0.15, 0.05, 0xd83a3a, -0.6, 0.75, -1.92); B(g, 0.3, 0.15, 0.05, 0xd83a3a, 0.6, 0.75, -1.92); [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].forEach(([x, z]) => wheel(g, x, z)); } },
    suv: { speed: 11, len: 4.4, make(g, c) { B(g, 2.0, 1.0, 4.4, c, 0, 0.85, 0); B(g, 1.9, 0.8, 3.0, c, 0, 1.75, -0.4); B(g, 1.92, 0.55, 2.9, 0x111820, 0, 1.75, -0.4); [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]].forEach(([x, z]) => wheel(g, x, z, 0.4)); } },
    keke: { speed: 7, len: 2.6, make(g) { B(g, 1.3, 1.0, 2.2, 0xffc400, 0, 0.85, 0); B(g, 1.32, 0.1, 2.3, 0x1f8a3a, 0, 1.95, -0.1); [[-0.6, -0.9], [0.6, -0.9]].forEach(([x, z]) => B(g, 0.06, 1.0, 0.06, 0x333333, x, 1.45, z)); B(g, 1.2, 0.6, 0.05, 0x1b2733, 0, 1.45, 0.8); wheel(g, 0, 1.0, 0.25); wheel(g, -0.55, -0.8, 0.25); wheel(g, 0.55, -0.8, 0.25); } },
    okada: { speed: 13, len: 2, noBridge: true, make(g) { B(g, 0.3, 0.5, 1.6, 0xd83a3a, 0, 0.65, 0); wheel(g, 0, 0.7, 0.3).rotation.z = Math.PI / 2; wheel(g, 0, -0.7, 0.3).rotation.z = Math.PI / 2; g.children.slice(-2).forEach((w) => { w.rotation.set(0, Math.PI / 2, Math.PI / 2); }); B(g, 0.45, 0.8, 0.35, [0x2f9b58, 0x2f6fd8, 0x1c1c1e][Math.floor(Math.random() * 3)], 0, 1.4, -0.05); const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lam(0x3b2417)); h.position.set(0, 2.0, 0); g.add(h); B(g, 0.4, 0.7, 0.3, 0xffffff, 0, 1.35, -0.45); } },
    truck: { speed: 7, len: 7, make(g, c) { B(g, 2.3, 1.9, 2.2, c || 0xd83a3a, 0, 1.3, 2.3); B(g, 2.2, 0.6, 0.06, 0x1b2733, 0, 1.6, 3.42); const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4.4, 14), lam(0xdfe3e7)); t.rotation.x = Math.PI / 2; t.position.set(0, 1.55, -1.2); g.add(t); [[-1, 2.3], [1, 2.3], [-1, -0.6], [1, -0.6], [-1, -2.4], [1, -2.4]].forEach(([x, z]) => wheel(g, x, z, 0.42)); } },
  };
  const CAR_COLS = [0xf2f2f2, 0x1c1c1e, 0x9aa0a6, 0xd83a3a, 0x2f6fd8, 0x2f9b58, 0x8d1b3d, 0xc9b28a, 0x35495e];
  const MIX = ["danfo", "danfo", "danfo", "car", "car", "car", "car", "suv", "suv", "keke", "keke", "okada", "okada", "okada", "brt", "truck"];

  P.buildVehicles = function () {
    this.cars = []; // the old looping cars are retired
    const lagos = this.city === "lagos";
    const [w0, w1] = G.water.band;
    const nodes = {}, key = (x, z) => x + "," + z;
    for (const x of G.vRoads) for (const z of G.hRoads) nodes[key(x, z)] = { x, z, out: [] };
    const link = (a, b, bridge) => { nodes[a].out.push({ to: b, bridge }); nodes[b].out.push({ to: a, bridge }); };
    for (const z of G.hRoads) for (let i = 0; i < G.vRoads.length - 1; i++) link(key(G.vRoads[i], z), key(G.vRoads[i + 1], z), false);
    for (const x of G.vRoads) for (let j = 0; j < G.hRoads.length - 1; j++) {
      const z1 = G.hRoads[j], z2 = G.hRoads[j + 1];
      const crosses = z1 < w0 && z2 > w1;
      if (lagos && crosses && !G.water.bridges.includes(x)) continue;
      link(key(x, z1), key(x, z2), crosses && lagos);
    }
    this.trafficNodes = nodes;
    const keys = Object.keys(nodes);
    let seed = 1234;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    this.vehicles = [];
    const N = this.mobile ? 46 : 72;
    for (let i = 0; i < N; i++) {
      const kind = MIX[i % MIX.length], K = KINDS[kind];
      const g = new THREE.Group();
      K.make(g, kind === "brt" ? [0x1f4fb8, 0xd83a3a][i % 2] : kind === "truck" ? [0xd83a3a, 0xf0c52a, 0x2f6fd8][i % 3] : CAR_COLS[Math.floor(rnd() * CAR_COLS.length)]);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = !!this.shadows; } });
      this.cityGroup.add(g);
      let from = keys[Math.floor(rnd() * keys.length)];
      const opts = nodes[from].out.filter((e) => !(K.noBridge && e.bridge));
      const e = opts[Math.floor(rnd() * opts.length)];
      this.vehicles.push({ g, kind, K, from, to: e.to, t: rnd(), speed: K.speed * (0.85 + rnd() * 0.3), v: 0, yaw: 0, wait: 0, phase: rnd() * 6 });
    }
    // Pedestrians on the pavements.
    this.walkers = [];
    const tops = [0xd83a3a, 0x2f6fd8, 0xf0c52a, 0x2f9b58, 0xb04bff, 0xff7a00, 0xffffff, 0x1c1c1e, 0x20d6e6, 0xff3dbb];
    const skins = [0x6b4423, 0x8d5524, 0x3b2417, 0x5a3a22];
    const NW = this.mobile ? 40 : 70;
    for (let i = 0; i < NW; i++) {
      const g = new THREE.Group();
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.28), lam([0x1c2a3a, 0x3b3f45, 0x5b4636][i % 3])); legs.position.y = 0.35; g.add(legs);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), lam(tops[i % tops.length])); body.position.y = 1.08; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), lam(skins[i % 4])); head.position.y = 1.65; g.add(head);
      if (i % 5 === 0) { const load = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.25, 10), lam([0xd83a3a, 0x2f6fd8, 0xc9a46a][i % 3])); load.position.y = 1.95; g.add(load); } // goods on the head
      g.scale.setScalar(1.35);
      this.cityGroup.add(g);
      const horiz = i % 2 === 0;
      const line = horiz ? G.hRoads[i % G.hRoads.length] + (i % 4 < 2 ? 3.6 : -3.6) : G.vRoads[i % G.vRoads.length] + (i % 4 < 2 ? 3.6 : -3.6);
      const north = (i >> 1) % 2 === 0; // vertical walkers stay on one side of the lagoon
      const lo = horiz ? -64 : north ? -48 : 7, hi = horiz ? 92 : north ? -9 : 47;
      this.walkers.push({ g, horiz, line, lo, hi, pos: lo + rnd() * (hi - lo), dir: rnd() < 0.5 ? -1 : 1, sp: 1.2 + rnd() * 0.9, ph: rnd() * 6, legs, pause: 0 });
    }
  };

  const tmp = new THREE.Vector3();
  P.updateTraffic = function (dt) {
    if (!this.vehicles) return;
    const tl = this.sim.trafficLevel ? this.sim.trafficLevel() : 1;
    const flow = [1.15, 1, 0.55, 0.28][tl];
    const visibleN = Math.round(this.vehicles.length * [0.45, 0.65, 0.85, 1][tl]);
    const nodes = this.trafficNodes, pp = this.player.position;
    // Group by road segment so each vehicle can see who is ahead of it.
    const seg = new Map();
    this.vehicles.forEach((v, i) => { v.on = i < visibleN; v.g.visible = v.on && !this.interior; if (!v.on) return; const k = v.from + ">" + v.to; if (!seg.has(k)) seg.set(k, []); seg.get(k).push(v); });
    for (const v of this.vehicles) {
      if (!v.on) continue;
      const a = nodes[v.from], b = nodes[v.to];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      // Gap to the vehicle ahead in the same lane.
      let gap = Infinity;
      for (const o of seg.get(v.from + ">" + v.to)) if (o !== v && o.t > v.t) gap = Math.min(gap, (o.t - v.t) * L - (o.K.len + v.K.len) / 2);
      // Stop for the player standing in the road ahead.
      const px = v.g.position.x + dx * 3, pz = v.g.position.z + dz * 3;
      const playerAhead = !this.interior && !this.overview && Math.hypot(px - pp.x, pz - pp.z) < 3;
      // Brief pauses at junctions (danfos also stop to pick up passengers).
      if (v.wait > 0) v.wait -= dt;
      const want = v.wait > 0 || playerAhead ? 0 : gap < 1.5 ? 0 : gap < 6 ? v.speed * flow * (gap / 6) : v.speed * flow * (1 - Math.max(0, 0.45 - Math.min(v.t, 1 - v.t)) * (v.t > 0.55 ? 0.9 : 0));
      v.v += (want - v.v) * Math.min(1, dt * 3);
      v.t += (v.v * dt) / L;
      if (v.t >= 1) {
        const opts = b.out.filter((e) => e.to !== v.from && !(v.K.noBridge && e.bridge));
        const e = opts.length ? opts[Math.floor(Math.random() * opts.length)] : { to: v.from };
        v.from = v.to; v.to = e.to; v.t = 0;
        if (Math.random() < (v.kind === "danfo" ? 0.35 : 0.12)) v.wait = 0.6 + Math.random() * (v.kind === "danfo" ? 2.5 : 1);
        continue;
      }
      const lane = v.kind === "okada" ? 2.2 : 1.45;
      const x = a.x + (b.x - a.x) * v.t - dz * lane, z = a.z + (b.z - a.z) * v.t + dx * lane;
      v.g.position.set(x, 0.05 + (v.kind === "danfo" && v.v > 1 ? Math.abs(Math.sin(this.time * 9 + v.phase)) * 0.04 : 0), z);
      const yaw = Math.atan2(dx, dz);
      let d = yaw - v.g.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      v.g.rotation.y += d * Math.min(1, dt * 8);
      if (v.kind === "okada") v.g.rotation.z = -d * 0.4;
    }
    // Pedestrians stroll, stop to gist, turn around at the ends.
    for (const w of this.walkers) {
      w.g.visible = !this.interior;
      if (w.pause > 0) { w.pause -= dt; w.legs.scale.y = 1; }
      else {
        w.pos += w.dir * w.sp * dt;
        if (w.pos > w.hi) { w.pos = w.hi; w.dir = -1; } else if (w.pos < w.lo) { w.pos = w.lo; w.dir = 1; }
        if (Math.random() < dt * 0.04) w.pause = 1 + Math.random() * 4;
      }
      if (w.horiz) { w.g.position.set(w.pos, 0.12, w.line); w.g.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { w.g.position.set(w.line, 0.12, w.pos); w.g.rotation.y = w.dir > 0 ? 0 : Math.PI; }
      w.g.position.y = 0.12 + (w.pause > 0 ? 0 : Math.abs(Math.sin(this.time * 7 + w.ph)) * 0.06);
      // Step aside if you walk into them.
      tmp.copy(w.g.position); if (tmp.distanceTo(pp) < 1.2 && !this.interior) w.pause = 0.6;
    }
  };
})();
