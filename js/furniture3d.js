// DECEMBER WAHALA — low-poly 3D models for every catalogue item, plus the
// little rendered pictures the Buy mode catalogue shows. Models stand on y = 0,
// face +z and report their footprint in userData.size ([w, d], or null if you
// can walk over them).
/* global THREE */
(function () {
  const mats = new Map();
  const lam = (c, o) => { const k = c + JSON.stringify(o || {}); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, ...(o || {}) })); return mats.get(k); };
  const glow = (c) => { const k = "g" + c; if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c })); return mats.get(k); };
  const glass = (c = 0xcfe8ff, op = 0.35) => lam(c, { transparent: true, opacity: op, depthWrite: false });
  const m = (c) => (typeof c === "number" ? lam(c) : c);

  function kit(g) {
    const B = (w, h, d, c, x = 0, y = h / 2, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); o.position.set(x, y, z); g.add(o); return o; };
    const C = (rt, rb, h, c, x = 0, y = h / 2, z = 0, seg = 14) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m(c)); o.position.set(x, y, z); g.add(o); return o; };
    const S = (r, c, x = 0, y = r, z = 0) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), m(c)); o.position.set(x, y, z); g.add(o); return o; };
    const T = (r, t, c, x, y, z, rx = Math.PI / 2) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 32), m(c)); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
    const legs = (w, d, h, c, t = 0.08, inset = 0.08) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B(t, h, t, c, a * (w / 2 - inset), h / 2, b * (d / 2 - inset)));
    const pillow = (x, y, z, w = 0.8) => { const p = B(w, 0.18, 0.42, 0xffffff, x, y, z); p.rotation.x = -0.15; return p; };
    return { B, C, S, T, legs, pillow };
  }
  const WOOD = 0x8a5a36, DARK = 0x3a2a1e, LIGHTWOOD = 0xd7b98e, WHITE = 0xf2f2f0, STEEL = 0xc7ccd1, BLACK = 0x1c1c1e, GOLD = 0xd8a93b;

  // id → (g, k) builds the model; returns [w, d] footprint (or null).
  const MODELS = {
    // ------------------------------------------------ sleep
    foam_mattress: (g, { B, pillow }) => { B(2.2, 0.22, 3.0, 0xe9e2cf); B(2.1, 0.06, 1.9, 0x8fa3b0, 0, 0.24, 0.4); pillow(0, 0.3, -1.1); return [2.3, 3.1]; },
    wood_bed: (g, { B, pillow }) => { B(2.4, 0.4, 3.2, WOOD, 0, 0.25); B(2.25, 0.25, 3.0, 0xf3efe6, 0, 0.55); B(2.25, 0.08, 1.8, 0x2f6b8a, 0, 0.7, 0.55); B(2.4, 1.2, 0.12, DARK, 0, 0.6, -1.6); pillow(-0.5, 0.75, -1.15, 0.8); pillow(0.5, 0.75, -1.15, 0.8); return [2.5, 3.3]; },
    ortho_bed: (g, { B, legs, pillow }) => { B(2.5, 0.25, 3.3, WOOD, 0, 0.32); legs(2.4, 3.2, 0.2, WHITE, 0.12); B(2.35, 0.35, 3.1, WHITE, 0, 0.6); B(2.38, 0.1, 2.0, 0x6a3fa0, 0, 0.82, 0.55); B(2.5, 1.3, 0.15, WOOD, 0, 0.65, -1.65); pillow(-0.55, 0.88, -1.15); pillow(0.55, 0.88, -1.15); return [2.6, 3.4]; },
    tufted_bed: (g, { B, S, pillow }) => { B(2.7, 0.45, 3.4, 0xd9d2c5, 0, 0.23); B(2.55, 0.3, 3.2, WHITE, 0, 0.6); B(2.58, 0.1, 2.0, 0x5d78b0, 0, 0.8, 0.6); B(2.9, 2.0, 0.25, 0xd9d2c5, 0, 1.0, -1.75); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) S(0.04, 0xa9a090, -1.1 + c * 0.55, 0.9 + r * 0.4, -1.61); pillow(-0.6, 0.86, -1.2); pillow(0.6, 0.86, -1.2); B(0.5, 0.12, 0.22, 0x5d78b0, 0, 0.9, -1.0); return [2.9, 3.6]; },
    canopy_bed: (g, { B, C, S, pillow }) => { B(2.6, 0.4, 3.3, DARK, 0, 0.3); B(2.45, 0.3, 3.1, WHITE, 0, 0.62); B(2.48, 0.1, 2.1, 0xe5c76b, 0, 0.82, 0.45); [[-1.25, -1.6], [1.25, -1.6], [-1.25, 1.6], [1.25, 1.6]].forEach(([x, z]) => { C(0.07, 0.07, 3.0, DARK, x, 1.5, z, 8); S(0.09, GOLD, x, 3.05, z); }); B(2.6, 0.08, 0.08, DARK, 0, 2.95, -1.6); B(2.6, 0.08, 0.08, DARK, 0, 2.95, 1.6); B(0.08, 0.08, 3.3, DARK, -1.25, 2.95, 0); B(0.08, 0.08, 3.3, DARK, 1.25, 2.95, 0); B(2.5, 2.4, 0.02, glass(0xffffff, 0.25), 0, 1.7, -1.58); B(0.02, 2.4, 3.2, glass(0xffffff, 0.2), 1.24, 1.7, 0); B(2.6, 1.6, 0.12, 0x5a3a26, 0, 1.0, -1.66); pillow(-0.55, 0.88, -1.2); pillow(0.55, 0.88, -1.2); return [2.7, 3.4]; },
    round_bed: (g, { C }) => { C(1.6, 1.6, 0.4, WHITE, 0, 0.2, 0, 32); C(1.55, 1.55, 0.25, WHITE, 0, 0.52, 0, 32); const top = C(1.5, 1.5, 0.08, 0x8d1b3d, 0, 0.68, 0.2, 32); top.scale.set(1, 1, 0.75); const back = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.6, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), lam(WHITE, { side: THREE.DoubleSide })); back.position.y = 0.8; g.add(back); const rim = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.035, 6, 48, Math.PI * 0.76), lam(GOLD)); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI * 1.12; rim.position.y = 1.6; g.add(rim); C(0.3, 0.3, 0.16, WHITE, -0.45, 0.82, -0.8, 12).rotation.z = Math.PI / 2; C(0.3, 0.3, 0.16, WHITE, 0.45, 0.82, -0.8, 12).rotation.z = Math.PI / 2; return [3.4, 3.4]; },
    rack_wardrobe: (g, { B }) => { B(1.4, 1.9, 0.6, 0x8aa0b4, 0, 0.95); B(1.42, 0.05, 0.62, 0x5d6e7d, 0, 1.92); B(0.02, 1.6, 0.62, 0x5d6e7d, 0, 0.95, 0.01); return [1.5, 0.7]; },
    wood_wardrobe: (g, { B }) => { B(1.6, 2.4, 0.7, 0x6b4a2e, 0, 1.2); B(0.04, 2.1, 0.02, DARK, 0, 1.2, 0.36); [-0.15, 0.15].forEach((x) => B(0.04, 0.3, 0.04, GOLD, x, 1.25, 0.38)); B(1.7, 0.1, 0.75, 0x5a3a26, 0, 2.45); return [1.7, 0.8]; },
    mirror_wardrobe: (g, { B }) => { B(1.8, 2.4, 0.7, 0x5a3a26, 0, 1.2); [-0.45, 0.45].forEach((x) => B(0.8, 2.1, 0.03, 0x8fa3b0, x, 1.2, 0.36)); [-0.06, 0.06].forEach((x) => B(0.03, 0.4, 0.04, BLACK, x, 1.2, 0.39)); B(1.9, 0.1, 0.75, DARK, 0, 2.45); return [1.9, 0.8]; },
    closet_display: (g, { B }) => { B(1.9, 2.4, 0.7, 0x141418, 0, 1.2); B(1.8, 2.25, 0.02, glass(0x404048, 0.45), 0, 1.2, 0.36); const cols = [0xd84a7a, 0x2f6fd8, 0xe8c447, 0x2f9b58, 0xf0f0f0, 0x8d1b3d]; for (let i = 0; i < 6; i++) B(0.1, 0.9, 0.5, cols[i], -0.8 + i * 0.13, 1.75, 0); [0.95, 0.55].forEach((y, r) => { B(0.85, 0.04, 0.6, 0x26262c, 0.45, y, 0); for (let k = 0; k < 2; k++) B(0.3, 0.12, 0.3, cols[(r * 2 + k + 1) % 6], 0.2 + k * 0.45, y + 0.08, 0); }); B(1.9, 0.04, 0.04, glow(0xfff1d6), 0, 2.35, 0.3); return [2.0, 0.8]; },
    plastic_stool: (g, { C }) => { C(0.25, 0.3, 0.5, 0x2f7de1, 0, 0.25, 0, 12); return [0.6, 0.6]; },
    bedside_table: (g, { B, C }) => { B(0.6, 0.6, 0.5, LIGHTWOOD, 0, 0.3); B(0.5, 0.04, 0.02, DARK, 0, 0.42, 0.26); C(0.05, 0.1, 0.35, GOLD, 0, 0.78); C(0.15, 0.2, 0.22, glow(0xffe8bf), 0, 1.06); return [0.6, 0.55]; },
    hex_nightstand: (g, { C }) => { C(0.4, 0.4, 0.6, 0x8a6b4a, 0, 0.3, 0, 6); C(0.05, 0.11, 0.38, GOLD, 0, 0.79); C(0.17, 0.24, 0.26, glow(0xffe0b0), 0, 1.11, 0, 10); return [0.8, 0.8]; },
    vanity_table: (g, { B, C, legs }) => { B(1.2, 0.06, 0.5, WHITE, 0, 0.78); legs(1.2, 0.5, 0.78, GOLD, 0.05); B(0.9, 1.0, 0.04, 0x9fb7c8, 0, 1.35, -0.22); B(1.0, 1.08, 0.03, GOLD, 0, 1.35, -0.24); for (let i = 0; i < 5; i++) C(0.04, 0.04, 0.04, glow(0xfff5d6), -0.45 + i * 0.225, 1.92, -0.2, 8); C(0.2, 0.2, 0.45, 0xf2c0c8, 0, 0.22, 0.45, 12); return [1.3, 0.9]; },
    // ------------------------------------------------ kitchen
    kerosene_stove: (g, { B, C, legs }) => { B(0.8, 0.05, 0.7, 0xd7c4a0, 0, 0.82); legs(0.8, 0.7, 0.8, 0xc8b28c, 0.06); B(0.7, 0.04, 0.04, 0xc8b28c, 0, 0.25, 0.3); C(0.22, 0.24, 0.22, 0x2f6b3c, 0, 0.96); C(0.17, 0.17, 0.3, 0x3a3f45, 0, 1.22); return [0.85, 0.75]; },
    gas_cooker: (g, { B, C }) => { B(0.9, 0.9, 0.7, 0xd6b896, 0, 0.45); B(0.92, 0.04, 0.72, 0xdfe3e7, 0, 0.92); B(0.72, 0.45, 0.02, 0x2a2f36, 0, 0.45, 0.36); B(0.74, 0.47, 0.01, glass(0x8fa3b0, 0.6), 0, 0.45, 0.37); B(0.6, 0.04, 0.03, STEEL, 0, 0.74, 0.37); [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]].forEach(([x, z]) => C(0.09, 0.09, 0.03, 0x2a2f36, x, 0.96, z, 10)); B(0.9, 0.02, 0.02, 0x8a9096, 0, 0.98, 0); return [0.95, 0.75]; },
    chef_range: (g, { B, C }) => { B(1.3, 0.9, 0.72, 0xe6e8eb, 0, 0.45); B(1.32, 0.04, 0.74, 0x2a2f36, 0, 0.92); [-0.33, 0.33].forEach((x) => { B(0.55, 0.42, 0.02, 0x22272e, x, 0.45, 0.37); B(0.45, 0.04, 0.04, STEEL, x, 0.72, 0.38); }); for (let i = 0; i < 6; i++) C(0.08, 0.08, 0.03, 0x111111, -0.45 + (i % 3) * 0.45, 0.96, i < 3 ? -0.15 : 0.15, 10); B(1.2, 0.5, 0.45, STEEL, 0, 2.0, -0.12); B(0.5, 0.6, 0.3, STEEL, 0, 1.5, -0.2); return [1.35, 0.8]; },
    cooler_box: (g, { B }) => { B(0.8, 0.5, 0.5, 0x1f63d8, 0, 0.25); B(0.84, 0.1, 0.54, 0xf2f2f2, 0, 0.55); return [0.85, 0.6]; },
    single_fridge: (g, { B }) => { B(0.75, 1.7, 0.7, 0xf0f2f4, 0, 0.85); B(0.02, 0.02, 0.01, 0x999999, 0, 1.2, 0.36); B(0.04, 0.4, 0.04, STEEL, 0.3, 1.2, 0.37); B(0.73, 0.01, 0.01, 0xcfd3d7, 0, 1.15, 0.36); return [0.8, 0.75]; },
    double_fridge: (g, { B }) => { B(1.1, 2.1, 0.75, 0xdcdfe2, 0, 1.05); B(0.01, 2.0, 0.01, 0x9aa0a6, 0, 1.05, 0.38); [-0.07, 0.07].forEach((x) => B(0.03, 0.6, 0.04, STEEL, x, 1.2, 0.4)); B(0.25, 0.35, 0.02, 0x5a6470, -0.3, 1.45, 0.38); return [1.15, 0.8]; },
    wood_shelf: (g, { B, C }) => { B(1.2, 0.9, 0.5, LIGHTWOOD, 0, 0.45); [0.3, 0.6].forEach((y) => B(1.15, 0.03, 0.48, 0xb89a6c, 0, y, 0.02)); C(0.15, 0.13, 0.2, 0x9aa0a6, -0.3, 1.0); C(0.12, 0.12, 0.25, 0xd84a3a, 0.3, 1.02); return [1.25, 0.55]; },
    kitchen_counter: (g, { B }) => { B(1.3, 0.88, 0.65, 0xd6b896, 0, 0.44); B(1.35, 0.06, 0.7, 0xdfe3e7, 0, 0.91); B(1.1, 0.6, 0.02, 0xc9a983, 0, 0.42, 0.33); B(0.25, 0.04, 0.04, STEEL, 0, 0.62, 0.36); return [1.35, 0.7]; },
    marble_counter: (g, { B }) => { B(1.3, 0.9, 0.7, 0xf0f0ee, 0, 0.45); B(1.36, 0.07, 0.76, 0xd6d8dc, 0, 0.93); [-0.68, 0.68].forEach((x) => B(0.05, 0.95, 0.76, 0xd6d8dc, x, 0.47, 0)); B(1.1, 0.03, 0.03, GOLD, 0, 0.8, 0.38); return [1.4, 0.8]; },
    plastic_basin: (g, { C }) => { C(0.38, 0.28, 0.25, 0x2fa8e0, 0, 0.13, 0, 16); C(0.32, 0.32, 0.02, glass(0x9fd6ff, 0.7), 0, 0.22, 0, 16); return [0.8, 0.8]; },
    kitchen_sink: (g, { B, C }) => { B(1.2, 0.88, 0.65, 0xd6b896, 0, 0.44); B(1.24, 0.06, 0.7, 0xdfe3e7, 0, 0.91); B(0.75, 0.04, 0.45, 0xa9b0b6, 0, 0.92); B(0.9, 0.6, 0.02, 0xc9a983, 0, 0.42, 0.33); B(0.25, 0.04, 0.04, STEEL, 0, 0.62, 0.36); C(0.025, 0.025, 0.35, STEEL, 0, 1.1, -0.25, 8); B(0.04, 0.04, 0.25, STEEL, 0, 1.27, -0.15); return [1.25, 0.7]; },
    blender: (g, { B, C }) => { B(0.7, 0.88, 0.6, WHITE, 0, 0.44); B(0.72, 0.05, 0.62, 0xdfe3e7, 0, 0.9); B(0.55, 0.55, 0.02, 0xd6b896, 0, 0.42, 0.31); C(0.12, 0.13, 0.15, BLACK, 0, 1.0); C(0.1, 0.12, 0.32, 0xf2b8c8, 0, 1.24); C(0.11, 0.11, 0.03, BLACK, 0, 1.42); return [0.75, 0.65]; },
    microwave: (g, { B }) => { B(0.7, 0.88, 0.6, WHITE, 0, 0.44); B(0.72, 0.05, 0.62, 0xdfe3e7, 0, 0.9); B(0.62, 0.36, 0.42, 0xf4f4f4, 0, 1.11); B(0.4, 0.26, 0.02, glass(0x5a6a7a, 0.7), -0.06, 1.11, 0.21); B(0.1, 0.26, 0.02, 0x9aa0a6, 0.23, 1.11, 0.21); return [0.75, 0.65]; },
    air_fryer: (g, { B, C }) => { B(0.7, 0.88, 0.6, WHITE, 0, 0.44); B(0.72, 0.05, 0.62, 0xdfe3e7, 0, 0.9); B(0.34, 0.4, 0.34, BLACK, 0, 1.13); B(0.2, 0.05, 0.02, glow(0x37d67a), 0, 1.25, 0.18); C(0.06, 0.06, 0.03, STEEL, 0, 1.33, 0, 10); return [0.75, 0.65]; },
    sachet_rack: (g, { B }) => { for (let i = 0; i < 3; i++) B(0.5, 0.25, 0.4, glass(0xdff3ff, 0.75), (i - 1) * 0.08, 0.13 + i * 0.25, 0); return [0.6, 0.5]; },
    water_dispenser: (g, { B, C }) => { B(0.45, 1.0, 0.45, WHITE, 0, 0.5); B(0.3, 0.2, 0.02, BLACK, 0, 0.82, 0.23); C(0.03, 0.03, 0.03, 0xd83a3a, -0.07, 0.82, 0.25, 8).rotation.x = Math.PI / 2; C(0.03, 0.03, 0.03, 0x2f6fd8, 0.07, 0.82, 0.25, 8).rotation.x = Math.PI / 2; C(0.2, 0.2, 0.5, glass(0x6ab8ff, 0.7), 0, 1.3); C(0.06, 0.2, 0.08, glass(0x6ab8ff, 0.7), 0, 1.06); return [0.5, 0.5]; },
    plastic_table: (g, { C, B }) => { C(0.6, 0.6, 0.05, WHITE, 0, 0.75, 0, 20); C(0.05, 0.08, 0.72, WHITE, 0, 0.36); [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(([x, z]) => { B(0.45, 0.05, 0.45, WHITE, x, 0.45, z); B(0.45, 0.5, 0.05, WHITE, x, 0.7, z + (z < 0 ? -0.22 : 0.22)); }); return [2.0, 1.4]; },
    wood_dining: (g, { B, legs }) => { B(1.8, 0.08, 1.0, WOOD, 0, 0.78); legs(1.8, 1.0, 0.76, DARK); [[-0.9, -1], [0.9, -1], [-0.9, 1], [0.9, 1]].forEach(([x, s]) => { B(0.5, 0.06, 0.5, 0x6b4a2e, x, 0.48, s * 1.0); B(0.5, 0.6, 0.06, 0x6b4a2e, x, 0.8, s * 1.22); legs(0.5, 0.5, 0.46, DARK, 0.05); }); return [2.0, 2.4]; },
    glass_dining: (g, { B, legs }) => { B(2.0, 0.04, 1.1, glass(0xbfe0f0, 0.6), 0, 0.78); legs(2.0, 1.1, 0.76, GOLD, 0.05); [[-0.9, -1], [0.9, -1], [-0.9, 1], [0.9, 1]].forEach(([x, s]) => { B(0.52, 0.1, 0.52, WHITE, x, 0.48, s * 1.0); B(0.52, 0.6, 0.08, WHITE, x, 0.82, s * 1.24); }); return [2.1, 2.5]; },
    // ------------------------------------------------ bath
    bucket_bowl: (g, { C }) => { C(0.32, 0.25, 0.6, 0x2f8ad8, 0.25, 0.3, 0, 16); C(0.3, 0.3, 0.02, glass(0x9fd6ff, 0.8), 0.25, 0.58, 0, 16); C(0.3, 0.18, 0.18, 0xd83a3a, -0.35, 0.09, 0.1, 16); return [1.2, 1.0]; },
    water_drum: (g, { C, B }) => { C(0.45, 0.45, 1.1, 0x1f4fb8, 0.2, 0.55, 0, 18); B(0.32, 0.45, 0.22, 0xf0c52a, -0.45, 0.23, 0.25); B(0.32, 0.45, 0.22, 0xf0c52a, -0.45, 0.23, -0.05); return [1.3, 1.0]; },
    rain_shower: (g, { B, C }) => { B(1.6, 0.1, 1.6, 0xeef3f5, 0, 0.05); B(1.6, 2.3, 0.04, glass(0xd8eef7, 0.35), 0, 1.25, 0.78); B(0.04, 2.3, 1.6, glass(0xd8eef7, 0.35), 0.78, 1.25, 0); B(1.6, 2.3, 0.06, 0xe8edf0, 0, 1.25, -0.78); C(0.22, 0.22, 0.03, STEEL, 0, 2.3, -0.3, 16); B(0.03, 0.03, 0.5, STEEL, 0, 2.35, -0.55); B(0.12, 0.08, 0.04, STEEL, 0.3, 1.1, -0.74); return [1.7, 1.7]; },
    bathtub: (g, { B }) => { B(1.9, 0.6, 0.9, WHITE, 0, 0.3); B(1.65, 0.05, 0.65, 0xbfe6f5, 0, 0.56); B(0.1, 0.1, 0.06, STEEL, 0.75, 0.68, 0); return [2.0, 1.0]; },
    jacuzzi: (g, { C, S }) => { C(1.1, 1.15, 0.65, 0xe9edf0, 0, 0.33, 0, 36); C(0.98, 0.98, 0.04, glass(0x6fd3f0, 0.85), 0, 0.6, 0, 36); const t = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.06, 8, 48), lam(GOLD)); t.rotation.x = Math.PI / 2; t.position.y = 0.66; g.add(t); for (let i = 0; i < 6; i++) S(0.04, 0xffffff, Math.cos(i) * 0.5, 0.63, Math.sin(i * 1.7) * 0.5); return [2.3, 2.3]; },
    wc_toilet: (g, { B, C }) => { C(0.2, 0.17, 0.4, WHITE, 0, 0.2, 0.05, 12); B(0.42, 0.06, 0.5, WHITE, 0, 0.43, 0.08); B(0.45, 0.45, 0.2, WHITE, 0, 0.62, -0.25); return [0.55, 0.75]; },
    smart_toilet: (g, { B, C }) => { B(0.42, 0.42, 0.55, BLACK, 0, 0.21, 0.05); B(0.44, 0.05, 0.57, 0x2a2a2e, 0, 0.44, 0.05); B(0.42, 0.5, 0.16, BLACK, 0, 0.5, -0.27); B(0.12, 0.04, 0.02, glow(0x4fc3ff), 0.12, 0.72, -0.18); return [0.55, 0.75]; },
    hand_wash: (g, { C }) => { C(0.32, 0.24, 0.2, 0x39a845, -0.25, 0.1, 0, 14); C(0.3, 0.22, 0.2, 0xd83a3a, 0.35, 0.1, 0.1, 14); return [1.1, 0.7]; },
    washing_machine: (g, { B, C }) => { B(0.75, 0.9, 0.7, WHITE, 0, 0.45); C(0.25, 0.25, 0.05, 0xb8c2cc, 0, 0.42, 0.36, 24).rotation.x = Math.PI / 2; C(0.19, 0.19, 0.06, glass(0x5a6a7a, 0.7), 0, 0.42, 0.37, 24).rotation.x = Math.PI / 2; B(0.7, 0.12, 0.02, 0x9fb0bf, 0, 0.8, 0.36); return [0.8, 0.75]; },
    small_mirror: (g, { B }) => { B(0.5, 0.7, 0.04, 0x8d6e63, 0, 1.55); B(0.42, 0.62, 0.02, 0xcfe8ff, 0, 1.55, 0.03); return [0.55, 0.15]; },
    vanity_mirror: (g, { B }) => { B(0.75, 2.0, 0.06, 0x5d4037, 0, 1.05); B(0.64, 1.88, 0.02, 0xcfe8ff, 0, 1.05, 0.04); return [0.8, 0.3]; },
    gold_vanity: (g, { B, C }) => { B(1.0, 0.8, 0.5, WHITE, 0, 0.4); B(1.0, 1.0, 0.04, GOLD, 0, 1.45, -0.2); B(0.88, 0.88, 0.02, 0xcfe8ff, 0, 1.45, -0.17); for (let i = 0; i < 4; i++) { C(0.04, 0.04, 0.04, glow(0xfff5d6), -0.44, 1.1 + i * 0.25, -0.15, 8); C(0.04, 0.04, 0.04, glow(0xfff5d6), 0.44, 1.1 + i * 0.25, -0.15, 8); } return [1.05, 0.55]; },
    // ------------------------------------------------ comfort
    plastic_chairs: (g, { B }) => { [-0.45, 0.45].forEach((x) => { B(0.5, 0.05, 0.5, WHITE, x, 0.45); B(0.5, 0.5, 0.05, WHITE, x, 0.72, -0.24); [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([a, b]) => B(0.04, 0.45, 0.04, WHITE, x + a, 0.22, b)); }); return [1.4, 0.6]; },
    fabric_sofa: (g, { B }) => { B(2.4, 0.45, 0.95, 0x5f7f8f, 0, 0.3); B(2.4, 0.8, 0.25, 0x4f6f7f, 0, 0.6, -0.36); [-1.15, 1.15].forEach((x) => B(0.22, 0.6, 0.95, 0x4f6f7f, x, 0.45)); [-0.55, 0.55].forEach((x) => B(1.0, 0.14, 0.7, 0x6f8f9f, x, 0.58, 0.08)); return [2.5, 1.0]; },
    red_velvet_sofa: (g, { B }) => { B(2.5, 0.42, 1.0, 0x7d1428, 0, 0.29); B(2.5, 0.85, 0.28, 0x6a1022, 0, 0.62, -0.37); [-1.2, 1.2].forEach((x) => B(0.26, 0.65, 1.0, 0x6a1022, x, 0.45)); B(2.0, 0.14, 0.72, 0x8d1b3d, 0, 0.56, 0.08); [-0.6, 0.6].forEach((x) => B(0.4, 0.38, 0.12, GOLD, x, 0.8, -0.18).rotation.x = -0.25); return [2.6, 1.05]; },
    boucle_sofa: (g, { B, C }) => { B(2.5, 0.42, 1.0, 0x1f1f22, 0, 0.29); C(0.45, 0.45, 2.5, 0x26262a, 0, 0.62, -0.32, 16).rotation.z = Math.PI / 2; [-1.2, 1.2].forEach((x) => C(0.42, 0.42, 1.0, 0x26262a, x, 0.42, 0, 16).rotation.x = Math.PI / 2); return [2.7, 1.05]; },
    leather_sectional: (g, { B }) => { B(2.8, 0.42, 1.0, 0x5a3a26, 0, 0.29); B(2.8, 0.8, 0.26, 0x4a2e1e, 0, 0.6, -0.37); B(1.0, 0.42, 1.0, 0x5a3a26, -0.9, 0.29, 0.95); B(0.26, 0.8, 1.95, 0x4a2e1e, -1.37, 0.6, 0.47); B(0.25, 0.6, 1.0, 0x4a2e1e, 1.3, 0.45); return [2.9, 2.0]; },
    cane_chair: (g, { B, C }) => { C(0.42, 0.38, 0.12, 0xc8a46a, 0, 0.45, 0, 14); const back = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 14, 1, true, Math.PI * 0.6, Math.PI * 0.8), lam(0xc8a46a, { side: THREE.DoubleSide })); back.position.y = 0.85; g.add(back); [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(([x, z]) => B(0.04, 0.42, 0.04, 0x9a7a48, x, 0.21, z)); return [0.9, 0.9]; },
    accent_chair: (g, { B }) => { B(0.9, 0.4, 0.85, 0xe8c447, 0, 0.32); B(0.9, 0.75, 0.2, 0xd9b53a, 0, 0.75, -0.33); [-0.4, 0.4].forEach((x) => B(0.14, 0.5, 0.85, 0xd9b53a, x, 0.5)); [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([x, z]) => B(0.05, 0.14, 0.05, DARK, x, 0.07, z)); return [0.95, 0.9]; },
    massage_chair: (g, { B, C }) => { B(0.9, 0.5, 1.0, BLACK, 0, 0.35); const back = B(0.85, 1.1, 0.3, 0x2a2a2e, 0, 1.0, -0.4); back.rotation.x = -0.3; [-0.42, 0.42].forEach((x) => B(0.16, 0.55, 0.95, 0x8d1b3d, x, 0.6)); B(0.6, 0.3, 0.5, 0x2a2a2e, 0, 0.2, 0.65); C(0.04, 0.04, 0.02, glow(0x4fc3ff), 0.42, 0.9, 0.3, 8); return [1.0, 1.3]; },
    no_rug: () => null,
    ankara_rug: (g) => { g.add(flat(3.6, 2.4, rugTex(["#e2a33d", "#2f7d6b", "#d84a3a", "#2b3a8a"], "ankara"))); return null; },
    persian_rug: (g) => { g.add(flat(3.6, 2.4, rugTex(["#7a1f2b", "#e5c78a", "#1f3a5f", "#9a3a2a"], "persian"))); return null; },
    gold_rug: (g) => { g.add(flat(3.8, 2.6, rugTex(["#6a0f1f", "#d8a93b"], "border"))); return null; },
    hand_fan: (g, { C }) => { const f = C(0.25, 0.25, 0.02, 0xe8d8b0, 0, 0.9, 0, 3); f.rotation.x = Math.PI / 2; return null; },
    standing_fan: (g, { C, B }) => { C(0.25, 0.28, 0.06, 0x2a2f36, 0, 0.03); C(0.03, 0.03, 1.3, 0x2a2f36, 0, 0.7, 0, 6); const h = C(0.4, 0.4, 0.12, 0x26a69a, 0, 1.45, 0.05, 16); h.rotation.x = Math.PI / 2; g.userData.spin = h; B(0.12, 0.12, 0.2, 0x2a2f36, 0, 1.45, -0.1); return [0.6, 0.6]; },
    ceiling_fan: (g, { B, C }) => { C(0.15, 0.15, 0.2, WHITE, 0, 3.1); C(0.015, 0.015, 0.4, WHITE, 0, 3.35, 0, 6); const blades = new THREE.Group(); blades.position.y = 3.0; for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.2), lam(WOOD)); b.position.x = 0.6; const piv = new THREE.Group(); piv.rotation.y = (i / 3) * Math.PI * 2; piv.add(b); blades.add(piv); } g.add(blades); g.userData.spinY = blades; void B; return null; },
    split_ac: (g, { B }) => { B(1.3, 0.38, 0.28, 0xfafafa, 0, 2.5); B(1.1, 0.04, 0.03, 0x90a4ae, 0, 2.35, 0.14); B(0.08, 0.03, 0.02, glow(0x37d67a), 0.5, 2.6, 0.15); return [1.3, 0.3]; },
    no_plant: () => null,
    snake_plant: (g, { C, B }) => { C(0.22, 0.18, 0.35, 0xf2f2f0, 0, 0.18, 0, 12); for (let i = 0; i < 7; i++) { const l = B(0.08, 0.7 + (i % 3) * 0.2, 0.02, i % 2 ? 0x3f7f3a : 0x5f9a3a, Math.cos(i * 2.3) * 0.08, 0.7, Math.sin(i * 2.3) * 0.08); l.rotation.y = i; l.rotation.z = (i - 3) * 0.06; } return [0.5, 0.5]; },
    potted_palm: (g, { C, B }) => { C(0.26, 0.2, 0.45, 0xb05a3a, 0, 0.23, 0, 12); C(0.035, 0.05, 1.1, 0x8a6b4a, 0, 1.0, 0, 6); for (let i = 0; i < 7; i++) { const l = B(0.8, 0.02, 0.18, 0x3f9b4f, 0, 1.55, 0); l.rotation.y = (i / 7) * Math.PI * 2; l.rotation.z = -0.4; l.translateX(0.35); } return [0.6, 0.6]; },
    fiddle_fig: (g, { C, S }) => { C(0.25, 0.22, 0.5, 0x2a2a2e, 0, 0.25, 0, 12); C(0.03, 0.04, 1.2, 0x6a4a2e, 0, 1.0, 0, 6); for (let i = 0; i < 9; i++) S(0.18, i % 2 ? 0x2f7d3c : 0x3f8f4a, Math.cos(i * 1.7) * 0.25, 1.1 + i * 0.12, Math.sin(i * 1.7) * 0.25).scale.set(1, 1.3, 0.4); return [0.6, 0.6]; },
    // ------------------------------------------------ fun
    transistor_radio: (g, { B, legs, C }) => { B(0.6, 0.05, 0.45, LIGHTWOOD, 0, 0.75); legs(0.6, 0.45, 0.75, 0xc8a87a, 0.05); B(0.55, 0.35, 0.22, 0xd9c19a, 0, 0.95); B(0.32, 0.22, 0.02, 0x9fb7c8, -0.08, 0.95, 0.12); C(0.05, 0.05, 0.03, DARK, 0.18, 1.0, 0.12, 10).rotation.x = Math.PI / 2; B(0.02, 0.5, 0.02, STEEL, 0.22, 1.35, -0.05); return [0.65, 0.5]; },
    tv_32: (g, { B }) => { B(1.4, 0.5, 0.45, LIGHTWOOD, 0, 0.25); B(0.12, 0.25, 0.1, 0x8fa3b0, 0, 0.63); B(1.1, 0.68, 0.05, 0x8fa3b0, 0, 1.1); B(1.02, 0.6, 0.02, 0x2a3f5e, 0, 1.1, 0.03); return [1.45, 0.5]; },
    tv_65: (g, { B }) => { B(2.2, 0.5, 0.5, 0xd6b896, 0, 0.25); B(0.4, 0.04, 0.25, 0x8fa3b0, 0, 0.52); B(0.1, 0.3, 0.08, 0x8fa3b0, 0, 0.68); B(1.9, 1.1, 0.06, 0x7f8f9a, 0, 1.38); B(1.82, 1.02, 0.02, 0x22344e, 0, 1.38, 0.035); return [2.25, 0.55]; },
    oled_75: (g, { B }) => { B(2.5, 0.42, 0.5, 0x4a2e1e, 0, 0.21); B(1.4, 0.08, 0.15, BLACK, 0, 0.47, 0.12); B(2.3, 1.32, 0.03, BLACK, 0, 1.25); B(2.24, 1.26, 0.01, 0x101828, 0, 1.25, 0.02); return [2.55, 0.55]; },
    cinema_wall: (g, { B }) => { B(3.2, 1.9, 0.08, BLACK, 0, 1.6); B(3.1, 1.8, 0.02, 0x0f1626, 0, 1.6, 0.05); B(2.6, 0.18, 0.25, 0x22252a, 0, 0.45, 0.1); [-1.75, 1.75].forEach((x) => { B(0.32, 1.8, 0.3, 0x15161a, x, 0.9); B(0.18, 0.18, 0.02, 0x3a3d44, x, 1.4, 0.16); B(0.18, 0.18, 0.02, 0x3a3d44, x, 0.8, 0.16); }); B(3.0, 0.3, 0.45, 0x1c1c1e, 0, 0.15, 0.05); return [3.9, 0.6]; },
    no_speaker: () => null,
    bt_speaker: (g, { C, B }) => { B(0.5, 0.5, 0.4, LIGHTWOOD, 0, 0.25); const s = C(0.12, 0.12, 0.35, 0x2a2f36, 0, 0.62, 0, 14); s.rotation.z = Math.PI / 2; return [0.55, 0.45]; },
    party_speakers: (g, { B }) => { [-0.35, 0.35].forEach((x) => { B(0.45, 1.5, 0.45, 0xd6b896, x, 0.75); B(0.5, 0.1, 0.5, 0xc9a983, x, 1.55); [1.2, 0.85, 0.45].forEach((y) => B(0.28, 0.28, 0.02, 0x8fa3b0, x, y, 0.23)); }); return [1.3, 0.5]; },
    home_theatre: (g, { B }) => { B(0.9, 0.35, 0.45, BLACK, 0, 0.18); B(0.5, 0.25, 0.4, 0x22252a, 0, 0.48); B(0.3, 0.04, 0.02, glow(0x4fc3ff), 0, 0.42, 0.23); [-0.75, 0.75].forEach((x) => { B(0.25, 1.4, 0.25, 0x15161a, x, 0.7); for (let i = 0; i < 4; i++) B(0.14, 0.14, 0.02, 0x3a3d44, x, 0.3 + i * 0.32, 0.13); }); return [1.8, 0.5]; },
    no_gaming: () => null,
    ps5_setup: (g, { B }) => { B(1.6, 0.45, 0.6, BLACK, 0, 0.23); B(1.4, 0.85, 0.05, BLACK, 0, 1.0, -0.2); B(1.32, 0.77, 0.02, 0x3fb950, 0, 1.0, -0.17); B(0.16, 0.45, 0.35, WHITE, 0.55, 0.68); B(0.04, 0.4, 0.3, 0x2f6fd8, 0.5, 0.68, 0); B(0.2, 0.06, 0.14, WHITE, -0.4, 0.49, 0.1); const ch = B(0.65, 0.12, 0.65, 0xc8162e, 0, 0.3, 0.75); void ch; B(0.65, 0.75, 0.12, BLACK, 0, 0.65, 1.08); return [1.7, 1.3]; },
    arcade_cabinet: (g, { B }) => { B(0.8, 1.9, 0.75, 0x2f2a6a, 0, 0.95); B(0.65, 0.45, 0.02, 0x22e0c8, 0, 1.45, 0.38); B(0.75, 0.12, 0.35, BLACK, 0, 1.05, 0.45); B(0.8, 0.28, 0.04, glow(0xff3dbb), 0, 1.85, 0.36); return [0.85, 0.9]; },
    no_gametable: () => null,
    ludo_table: (g, { B, legs }) => { B(0.9, 0.05, 0.9, LIGHTWOOD, 0, 0.72); legs(0.9, 0.9, 0.72, 0xc8a87a, 0.06); const cols = [0xd83a3a, 0x2f9b58, 0xe8c447, 0x2f6fd8]; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => B(0.3, 0.01, 0.3, cols[i], a * 0.2, 0.76, b * 0.2)); return [1.0, 1.0]; },
    table_football: (g, { B, C, legs }) => { B(1.4, 0.3, 0.8, 0x1f5f9a, 0, 0.85); B(1.3, 0.02, 0.7, 0x2f9b58, 0, 0.99); legs(1.4, 0.8, 0.72, 0x15161a, 0.08); for (let i = 0; i < 6; i++) { const r = C(0.02, 0.02, 1.2, STEEL, -0.55 + i * 0.22, 1.05, 0, 6); r.rotation.x = Math.PI / 2; } return [1.45, 1.2]; },
    snooker_table: (g, { B, S, legs }) => { B(2.6, 0.18, 1.5, 0x4a2e1e, 0, 0.78); B(2.4, 0.02, 1.3, 0x1f7a3a, 0, 0.88); legs(2.5, 1.4, 0.72, 0x3a2416, 0.12); const cols = [0xd83a3a, 0xe8c447, 0x2f6fd8, 0xffffff, 0xd83a3a, 0x111111]; cols.forEach((c, i) => S(0.045, c, 0.4 + (i % 3) * 0.1, 0.93, -0.2 + Math.floor(i / 3) * 0.1)); const cue = B(1.5, 0.025, 0.025, 0xd7b98e, -0.3, 0.92, 0.25); cue.rotation.y = 0.25; return [2.6, 1.5]; },
    // ------------------------------------------------ skills
    study_desk: (g, { B, legs }) => { B(1.3, 0.05, 0.6, LIGHTWOOD, 0, 0.76); legs(1.3, 0.6, 0.76, 0xa1785a, 0.05); B(0.4, 0.03, 0.28, 0x9e9e9e, 0, 0.8); B(0.4, 0.26, 0.02, 0x37474f, 0, 0.93, -0.13).rotation.x = -0.2; B(0.45, 0.04, 0.45, 0xa1785a, 0, 0.46, 0.6); return [1.35, 1.0]; },
    laptop_desk: (g, { B, C }) => { B(1.5, 0.05, 0.7, WHITE, 0, 0.76); [-0.7, 0.7].forEach((x) => B(0.05, 0.76, 0.65, WHITE, x, 0.38)); B(0.4, 0.03, 0.28, 0xbfc5ca, 0, 0.8); B(0.4, 0.27, 0.02, 0xbfc5ca, 0, 0.94, -0.13).rotation.x = -0.2; C(0.06, 0.06, 0.15, 0x2f9b58, 0.55, 0.86, -0.15, 10); C(0.28, 0.28, 0.08, 0x2a2a2e, 0, 0.5, 0.65, 16); B(0.5, 0.55, 0.08, 0x2a2a2e, 0, 0.8, 0.92); return [1.55, 1.2]; },
    content_studio: (g, { B, T, C }) => { B(1.3, 0.05, 0.6, WHITE, 0, 0.76); [-0.6, 0.6].forEach((x) => B(0.05, 0.76, 0.55, WHITE, x, 0.38)); B(1.6, 1.6, 0.04, 0xf2b8c8, 0, 1.6, -0.45); T(0.32, 0.04, glow(0xffffff), 0.7, 1.45, 0.1, 0); C(0.015, 0.015, 1.4, 0x222222, 0.7, 0.7, 0.1, 6); B(0.3, 0.2, 0.02, 0x37474f, 0, 0.9, -0.1); return [1.65, 0.8]; },
    gaming_pc: (g, { B }) => { B(1.6, 0.05, 0.75, BLACK, 0, 0.76); [-0.75, 0.75].forEach((x) => B(0.06, 0.76, 0.7, BLACK, x, 0.38)); B(1.6, 0.03, 0.03, glow(0xb04bff), 0, 0.73, 0.36); [-0.35, 0.35].forEach((x) => { B(0.6, 0.38, 0.03, 0x1a1a1e, x, 1.08, -0.2).rotation.y = x < 0 ? 0.2 : -0.2; B(0.56, 0.34, 0.01, 0x2a4fb0, x, 1.08, -0.18).rotation.y = x < 0 ? 0.2 : -0.2; }); B(0.25, 0.5, 0.5, 0x1a1a1e, 0.6, 1.04, -0.1); B(0.02, 0.45, 0.45, glow(0x4fc3ff), 0.47, 1.04, -0.1); B(0.6, 0.12, 0.6, 0x2a2a2e, 0, 0.5, 0.75); B(0.6, 0.8, 0.12, 0xc8162e, 0, 0.95, 1.05); return [1.65, 1.4]; },
    no_music: () => null,
    acoustic_guitar: (g, { C, B }) => { B(0.35, 0.05, 0.35, BLACK, 0, 0.03); const body = C(0.28, 0.28, 0.1, 0xc8843a, 0, 0.5, 0, 16); body.rotation.x = Math.PI / 2 - 0.15; C(0.08, 0.08, 0.11, BLACK, 0, 0.55, 0.02, 12).rotation.x = Math.PI / 2 - 0.15; B(0.07, 0.75, 0.04, DARK, 0, 1.05, -0.06).rotation.x = -0.15; return [0.6, 0.5]; },
    keyboard_piano: (g, { B }) => { B(1.3, 0.12, 0.35, BLACK, 0, 0.82); B(1.2, 0.02, 0.18, WHITE, 0, 0.89, 0.06); for (let i = 0; i < 12; i++) B(0.03, 0.03, 0.1, BLACK, -0.55 + i * 0.1, 0.91, 0.02); [[-0.5, -0.1], [0.5, -0.1], [-0.5, 0.1], [0.5, 0.1]].forEach(([x, z]) => { const l = B(0.03, 0.8, 0.03, 0x555555, x, 0.4, z); l.rotation.z = x < 0 ? 0.25 : -0.25; }); B(0.5, 0.05, 0.3, BLACK, 0, 0.48, 0.55); return [1.35, 0.8]; },
    dj_decks: (g, { B, C }) => { B(1.4, 0.95, 0.6, BLACK, 0, 0.48); B(1.42, 0.04, 0.62, 0x2a2a2e, 0, 0.97); [-0.4, 0.4].forEach((x) => C(0.2, 0.2, 0.03, 0x15161a, x, 1.0, 0, 20)); B(0.25, 0.04, 0.35, 0x3a3d44, 0, 1.0); B(1.4, 0.04, 0.04, glow(0xff3dbb), 0, 0.85, 0.31); return [1.45, 0.65]; },
    no_workout: () => null,
    dumbbells: (g, { B, C }) => { B(1.0, 0.6, 0.35, 0x2a2a2e, 0, 0.3); for (let i = 0; i < 4; i++) { const d = C(0.07, 0.07, 0.25, 0x111111, -0.36 + i * 0.24, 0.66, 0, 10); d.rotation.z = Math.PI / 2; } return [1.05, 0.4]; },
    treadmill: (g, { B }) => { B(0.8, 0.18, 1.8, 0x37474f, 0, 0.09); B(0.7, 0.02, 1.6, 0x111111, 0, 0.19, 0.05); [-0.38, 0.38].forEach((x) => B(0.05, 1.1, 0.05, 0x2a2f36, x, 0.7, -0.8)); B(0.8, 0.25, 0.25, 0x2a2f36, 0, 1.25, -0.8); B(0.3, 0.15, 0.02, glow(0x4fc3ff), 0, 1.3, -0.67); return [0.85, 1.9]; },
    home_gym: (g, { B, C }) => { B(0.4, 0.4, 1.2, 0x2a2a2e, 0, 0.4, 0.2); [-0.6, 0.6].forEach((x) => B(0.08, 2.0, 0.08, 0xc8162e, x, 1.0, -0.4)); B(1.3, 0.08, 0.08, 0xc8162e, 0, 2.0, -0.4); const bar = C(0.025, 0.025, 1.6, STEEL, 0, 1.35, -0.3, 8); bar.rotation.z = Math.PI / 2; [-0.7, 0.7].forEach((x) => { const p = C(0.2, 0.2, 0.06, 0x111111, x, 1.35, -0.3, 16); p.rotation.z = Math.PI / 2; }); return [1.4, 1.4]; },
    // ------------------------------------------------ light (built hanging from the ceiling at y 3.3)
    bare_bulb: (g, { C, S }) => { C(0.008, 0.008, 0.6, 0x333333, 0, 3.0, 0, 4); S(0.08, glow(0xfff1c8), 0, 2.66); return null; },
    rechargeable_lamp: (g, { C, B }) => { C(0.008, 0.008, 0.4, 0x333333, 0, 3.1, 0, 4); B(0.5, 0.08, 0.12, 0xffffff, 0, 2.86); B(0.44, 0.03, 0.08, glow(0xf0fbff), 0, 2.81); return null; },
    pendant_cluster: (g, { C }) => { [[-0.25, 0], [0.25, 0.1], [0, -0.25]].forEach(([x, z], i) => { C(0.008, 0.008, 0.7 + i * 0.2, 0x333333, x, 3.0 - i * 0.1, z, 4); C(0.08, 0.16, 0.2, BLACK, x, 2.55 - i * 0.2, z, 12); C(0.13, 0.13, 0.01, glow(0xffe6b0), x, 2.44 - i * 0.2, z, 12); }); return null; },
    ring_chandelier: (g, { T, C }) => { T(0.55, 0.035, glow(0xfff3dc), 0, 2.6, 0); T(0.35, 0.03, glow(0xfff3dc), 0, 2.4, 0); [-0.5, 0.5].forEach((x) => C(0.006, 0.006, 0.7, 0x555555, x, 2.95, 0, 4)); return null; },
    crystal_chandelier: (g, { C, S, T }) => { C(0.01, 0.01, 0.5, GOLD, 0, 3.05, 0, 4); T(0.4, 0.03, GOLD, 0, 2.6, 0); T(0.25, 0.03, GOLD, 0, 2.4, 0); for (let i = 0; i < 12; i++) S(0.04, glass(0xffffff, 0.8), Math.cos(i * 0.52) * 0.4, 2.48, Math.sin(i * 0.52) * 0.4); for (let i = 0; i < 6; i++) S(0.05, glow(0xfff1c8), Math.cos(i * 1.05) * 0.25, 2.33, Math.sin(i * 1.05) * 0.25); return null; },
    no_lamp: () => null,
    floor_lamp: (g, { C }) => { C(0.18, 0.2, 0.04, 0x2a2a2e, 0, 0.02); C(0.02, 0.02, 1.5, 0x2a2a2e, 0, 0.78, 0, 6); C(0.18, 0.25, 0.3, glow(0xffe6b8), 0, 1.6, 0, 14); return [0.45, 0.45]; },
    arc_lamp: (g, { C, B }) => { B(0.35, 0.12, 0.35, 0xf2f2f0, 0, 0.06); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.025, 6, 24, Math.PI * 0.75), lam(GOLD)); arc.position.set(0.6, 0.15, 0); arc.rotation.z = Math.PI * 0.12; g.add(arc); C(0.12, 0.25, 0.22, GOLD, 1.3, 1.0, 0, 14); C(0.2, 0.2, 0.01, glow(0xffe6b8), 1.3, 0.88, 0, 14); return [0.5, 0.5]; },
    neon_sign: (g) => { const c = document.createElement("canvas"); c.width = 256; c.height = 96; const x = c.getContext("2d"); x.fillStyle = "#14101c"; x.fillRect(0, 0, 256, 96); x.font = "700 40px Fredoka, system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.shadowColor = "#ff3dbb"; x.shadowBlur = 16; x.fillStyle = "#ffd6f3"; x.fillText("soft life ✨", 128, 50); const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.04), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })); mesh.position.y = 1.7; g.add(mesh); return null; },
    no_power: () => null,
    small_gen: (g, { B, C }) => { B(0.7, 0.45, 0.5, 0xd83a3a, 0, 0.3); B(0.75, 0.05, 0.55, 0x222222, 0, 0.08); C(0.06, 0.06, 0.12, 0x333333, 0.2, 0.6, 0, 8); B(0.2, 0.15, 0.02, 0x111111, -0.15, 0.32, 0.26); return [0.8, 0.6]; },
    big_gen: (g, { B }) => { B(1.2, 0.8, 0.7, 0x2e7d32, 0, 0.4); B(1.0, 0.5, 0.02, 0x1b5e20, 0, 0.42, 0.36); B(0.2, 0.1, 0.02, glow(0x37d67a), 0.4, 0.68, 0.36); return [1.25, 0.75]; },
    inverter_solar: (g, { B }) => { B(0.6, 0.9, 0.4, 0xeceff1, 0, 0.45); B(0.35, 0.15, 0.02, 0x263238, 0, 0.7, 0.21); B(0.08, 0.05, 0.02, glow(0x37d67a), 0.15, 0.55, 0.21); [0.25, 0.65].forEach((x) => B(0.35, 0.55, 0.3, 0x263238, x + 0.2, 0.28)); return [1.2, 0.45]; },
    // ------------------------------------------------ wall art (hangs on a wall, front faces +z)
    no_art: () => null,
    family_portrait: (g, { B }) => { B(0.9, 1.1, 0.05, 0x5a3a26, 0, 1.7); g.add(placed(new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.96), new THREE.MeshBasicMaterial({ map: artTex(["#c9a27a", "#3b2417", "#8d1b3d", "#2f6fd8"], "faces") })), 0, 1.7, 0.03)); return null; },
    ankara_art: (g) => { g.add(placed(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: artTex(["#ffb300", "#d84315", "#2e7d32", "#1565c0", "#6a1b9a"], "dots") })), 0, 1.7, 0.02)); return null; },
    gold_frame_art: (g, { B }) => { B(1.5, 1.1, 0.06, GOLD, 0, 1.75); g.add(placed(new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.92), new THREE.MeshBasicMaterial({ map: artTex(["#f4efe6", "#1c1c1e", "#d8a93b", "#b45cff"], "abstract") })), 0, 1.75, 0.035)); return null; },
  };
  // Anything not modelled yet becomes a neat crate.
  const placed = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  function flat(w, d, tex) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex })); o.rotation.x = -Math.PI / 2; o.position.y = 0.012; return o; }
  function rugTex(cols, kind) {
    const c = document.createElement("canvas"); c.width = 192; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = cols[0]; x.fillRect(0, 0, 192, 128);
    if (kind === "border") { x.strokeStyle = cols[1]; x.lineWidth = 8; x.strokeRect(10, 10, 172, 108); x.lineWidth = 2; x.strokeRect(22, 22, 148, 84); }
    else if (kind === "persian") { x.strokeStyle = cols[1]; x.lineWidth = 6; x.strokeRect(6, 6, 180, 116); x.fillStyle = cols[2]; x.beginPath(); x.ellipse(96, 64, 40, 28, 0, 0, 7); x.fill(); x.fillStyle = cols[1]; x.beginPath(); x.ellipse(96, 64, 18, 12, 0, 0, 7); x.fill(); }
    else for (let i = 0; i < 24; i++) { x.fillStyle = cols[1 + (i % (cols.length - 1))]; x.beginPath(); x.arc(16 + (i % 6) * 32, 16 + Math.floor(i / 6) * 32, 11, 0, 7); x.fill(); }
    return new THREE.CanvasTexture(c);
  }
  function artTex(cols, kind) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = cols[0]; x.fillRect(0, 0, 128, 128);
    if (kind === "faces") { [[40, 60], [88, 60], [64, 92]].forEach(([a, b], i) => { x.fillStyle = cols[1]; x.beginPath(); x.arc(a, b - 18, 14, 0, 7); x.fill(); x.fillStyle = cols[2 + (i % 2)]; x.fillRect(a - 18, b, 36, 34); }); }
    else if (kind === "abstract") { x.fillStyle = cols[1]; x.beginPath(); x.arc(44, 54, 30, 0, 7); x.fill(); x.fillStyle = cols[2]; x.fillRect(62, 30, 46, 70); x.strokeStyle = cols[3]; x.lineWidth = 6; x.beginPath(); x.moveTo(10, 110); x.quadraticCurveTo(64, 40, 120, 110); x.stroke(); }
    else for (let i = 0; i < 16; i++) { x.fillStyle = cols[1 + (i % (cols.length - 1))]; x.beginPath(); x.arc(16 + (i % 4) * 32, 16 + Math.floor(i / 4) * 32, 12, 0, 7); x.fill(); }
    return new THREE.CanvasTexture(c);
  }

  function build(id) {
    const g = new THREE.Group();
    const f = MODELS[id];
    let size = [1, 1];
    if (f) size = f(g, kit(g));
    else { kit(g).B(0.9, 0.9, 0.9, 0xc8a46a, 0, 0.45); size = [1, 1]; }
    g.userData.size = size === undefined ? [1, 1] : size;
    return g;
  }

  // ------------------------------------------------ catalogue pictures
  let thumbR = null, thumbScene, thumbCam;
  const thumbs = new Map();
  function thumb(id) {
    if (thumbs.has(id)) return thumbs.get(id);
    try {
      if (!thumbR) {
        thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        thumbR.setPixelRatio(1); thumbR.setSize(240, 180);
        thumbScene = new THREE.Scene();
        thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4b0, 0.85));
        const sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(3, 6, 5); thumbScene.add(sun);
        thumbCam = new THREE.PerspectiveCamera(30, 240 / 180, 0.05, 100);
      }
      const g = build(id);
      if (!g.children.length) { thumbs.set(id, ""); return ""; }
      thumbScene.add(g);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      const r = Math.max(sz.x, sz.y * 1.1, sz.z) * 0.5 + 0.05;
      const dist = r / Math.tan((thumbCam.fov * Math.PI) / 360) * 1.25;
      thumbCam.position.set(c.x + dist * 0.62, c.y + dist * 0.5, c.z + dist * 0.62);
      thumbCam.lookAt(c);
      thumbR.render(thumbScene, thumbCam);
      const url = thumbR.domElement.toDataURL("image/png");
      thumbScene.remove(g);
      thumbs.set(id, url);
      return url;
    } catch (e) { thumbs.set(id, ""); return ""; }
  }

  window.Furniture3D = { build, thumb, MODELS };
})();
