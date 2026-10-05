// DECEMBER WAHALA — low-poly 3D characters (three.js r128, global THREE).
// Avatar3D.mount(el) returns { update(look), dispose() }. Drag to spin.
/* global THREE, DATA, Avatar */
(function () {
  const D = window.DATA;
  const GOLD = 0xd8a93b;
  const DENIM = 0x86acd8;
  const DARK = 0x1b1d24;

  const hex = (h) => parseInt(String(h).replace("#", ""), 16);
  const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

  function fabricTexture(fabric, base) {
    if (!fabric || fabric === "plain") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const col = "#" + base.toString(16).padStart(6, "0");
    g.fillStyle = col;
    g.fillRect(0, 0, 128, 128);
    if (fabric === "ankara") {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const cx = x * 32 + 16, cy = y * 32 + 16;
        g.strokeStyle = "#d8a93b"; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(x * 32, y * 32, 5, 0, Math.PI * 2); g.fill();
      }
    } else if (fabric === "adire") {
      g.fillStyle = "rgba(0,0,40,.35)"; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = "rgba(240,244,255,.85)"; g.lineWidth = 3;
      for (let y = 8; y < 128; y += 22) { g.beginPath(); for (let x = 0; x <= 128; x += 4) g.lineTo(x, y + Math.sin(x / 8) * 5); g.stroke(); }
    } else if (fabric === "asooke") {
      for (let x = 0; x < 128; x += 12) { g.fillStyle = "rgba(216,169,59,.85)"; g.fillRect(x, 0, 3, 128); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x + 7, 0, 1.5, 128); }
    } else if (fabric === "sequin") {
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1.6, 0, Math.PI * 2); g.fill(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  }

  function lathe(points, mat, segments = 14) {
    const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
    return new THREE.Mesh(g, mat);
  }
  function cyl(rTop, rBot, h, mat, seg = 8) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  }
  // A limb from point a to point b.
  function limb(a, b, r, mat) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const m = cyl(r * 0.85, r, len, mat, 7); // +y points at b, so the far end is slimmer
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return m;
  }
  function sphere(r, mat, ws = 9, hs = 7) { return new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); }

  function build(look) {
    const root = new THREE.Group();
    const w = look.body === "woman";
    const fit = window.Avatar.outfitFor(look);
    const skinC = hex(D.SKIN[look.skin] || D.SKIN[3]);
    const hairC = hex((D.HAIR_COLOURS[look.hairColour] || D.HAIR_COLOURS.black).hex);
    const baseC = fit.forceColour ? hex(fit.forceColour) : hex(D.OUTFIT_COLOURS[look.colour] || D.OUTFIT_COLOURS[0]);
    const tex = fabricTexture(look.fabric, baseC);
    const skin = lambert(skinC);
    const hair = lambert(hairC);
    const main = lambert(tex ? 0xffffff : baseC, tex ? { map: tex, side: THREE.DoubleSide } : { side: THREE.DoubleSide });
    const bottomC = fit.bottomFill === "main" ? null : fit.bottomFill ? hex(fit.bottomFill) : null;
    const bottom = bottomC == null ? main : lambert(bottomC, { side: THREE.DoubleSide });
    const gold = lambert(GOLD);
    const dark = lambert(0x121214);
    const add = (m) => { root.add(m); return m; };

    // ---- legs and feet
    const pants = ["baggy", "trousers", "lowrise"].includes(fit.bottom);
    const legR = fit.bottom === "baggy" || fit.bottom === "lowrise" ? 0.078 : pants ? 0.066 : 0.058;
    [-1, 1].forEach((sd) => {
      const x = sd * 0.085;
      add(limb([x, 0.86, 0], [x * 1.05, 0.46, 0], legR, pants || fit.bottom === "shorts" ? bottom : skin));
      add(limb([x * 1.05, 0.46, 0], [x * 1.1, 0.07, 0.01], pants ? legR * 0.85 : 0.048, pants ? bottom : skin));
      add(sphere(pants ? legR * 0.85 : 0.048, pants ? bottom : skin, 7, 5)).position.set(x * 1.05, 0.46, 0);
      let shoe;
      if (fit.shoes === "boots") {
        shoe = limb([x * 1.1, 0.42, 0.01], [x * 1.1, 0.04, 0.02], 0.06, dark);
        add(shoe);
        shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.2), dark);
      } else {
        const col = { sneakers: 0xf4f4f2, heels: baseC, loafers: 0x5a3a22, sandals: 0x8a5a32 }[fit.shoes] || 0x333333;
        shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, fit.shoes === "sneakers" ? 0.08 : 0.05, 0.2), lambert(col));
      }
      shoe.position.set(x * 1.1, 0.035, 0.05);
      add(shoe);
    });

    // ---- hips and torso
    const lowerMat = fit.top === "crop" || fit.bottom === "lowrise" ? skin : (fit.top === "tee" || fit.top === "shirt" || fit.top === "blazer" || fit.top === "agbada") ? main : main;
    const pelvis = add(lathe([[0.001, 0.82], [0.15, 0.84], [0.16, 0.95]], pants || fit.bottom === "shorts" || fit.bottom === "skirt" ? bottom : main));
    pelvis.scale.z = 0.72;
    const torsoLow = w ? [[0.16, 0.95], [0.13, 1.1], [0.14, 1.2]] : [[0.16, 0.95], [0.165, 1.1], [0.175, 1.2]];
    const torsoHigh = w ? [[0.14, 1.2], [0.17, 1.3], [0.18, 1.38], [0.09, 1.46]] : [[0.175, 1.2], [0.2, 1.32], [0.21, 1.38], [0.09, 1.47]];
    const lo = add(lathe(torsoLow, fit.top === "crop" ? skin : lowerMat));
    const hi = add(lathe(torsoHigh, main));
    lo.scale.z = hi.scale.z = 0.72;
    if (fit.bottom === "lowrise") {
      const band = add(lathe([[0.155, 0.93], [0.16, 0.97]], gold));
      band.scale.z = 0.72;
    } else if (fit.belt) {
      const band = add(lathe([[0.165, 0.94], [0.165, 0.98]], gold));
      band.scale.z = 0.72;
    }

    // ---- skirts, dresses, robes
    const skirts = {
      skirt: [[0.155, 0.96], [0.2, 0.75], [0.25, 0.52]],
      minidress: [[0.155, 0.97], [0.2, 0.78], [0.23, 0.64]],
      midi: [[0.155, 0.97], [0.22, 0.62], [0.27, 0.36]],
      gown: [[0.155, 0.97], [0.22, 0.55], [0.32, 0.04]],
    };
    if (fit.bottom === "skirt") add(lathe(skirts.skirt, bottom)).scale.z = 0.8;
    if (skirts[fit.top]) add(lathe(skirts[fit.top], main)).scale.z = 0.8;
    if (fit.top === "agbada") {
      add(lathe([[0.17, 0.96], [0.21, 0.6], [0.24, 0.3]], lambert(Math.max(0, baseC - 0x111111), { side: THREE.DoubleSide }))).scale.z = 0.8;
      const robe = add(lathe([[0.1, 1.47], [0.28, 1.42], [0.38, 1.24], [0.4, 0.95], [0.36, 0.62]], main, 16));
      robe.scale.z = 0.55;
      const trim = add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 5, 14), gold));
      trim.position.set(0, 1.42, 0.03); trim.rotation.x = Math.PI / 2.4;
    }

    // ---- arms
    const sleeve = { tee: "elbow", shirt: "elbow", blazer: "full" }[fit.top];
    [-1, 1].forEach((sd) => {
      const sh = [sd * (w ? 0.19 : 0.215), 1.37, 0];
      const el = [sd * (w ? 0.24 : 0.27), 1.1, 0.01];
      const wr = [sd * (w ? 0.26 : 0.29), 0.86, 0.04];
      if (fit.top === "agbada") {
        add(sphere(0.042, skin)).position.set(sd * 0.36, 0.84, 0.06);
        return;
      }
      add(limb(sh, el, sleeve ? (fit.top === "tee" ? 0.07 : 0.058) : 0.048, sleeve ? main : skin));
      add(sphere(sleeve === "full" ? 0.05 : 0.041, sleeve === "full" ? main : skin, 7, 5)).position.set(...el);
      add(limb(el, wr, sleeve === "full" ? 0.052 : 0.042, sleeve === "full" ? main : skin));
      add(sphere(0.042, skin)).position.set(wr[0], wr[1] - 0.04, wr[2]);
      if (["corset", "minidress", "midi", "crop", "gown"].includes(fit.top)) {
        add(limb([sd * 0.08, 1.46, 0.03], [sd * 0.09, 1.33, 0.08], 0.008, main));
      }
    });

    // ---- neck and head
    add(cyl(0.05, 0.055, 0.12, skin, 8)).position.set(0, 1.5, 0);
    const head = add(sphere(0.115, skin, 12, 10));
    head.position.set(0, 1.64, 0);
    head.scale.set(0.95, 1.12, 1);
    [-1, 1].forEach((sd) => {
      add(sphere(0.024, skin, 6, 5)).position.set(sd * 0.11, 1.64, 0);
      add(sphere(0.013, dark, 6, 5)).position.set(sd * 0.042, 1.655, 0.1);
      const brow = add(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.01), lambert(0x1a1210)));
      brow.position.set(sd * 0.042, 1.69, 0.103);
      if (w) add(sphere(0.012, gold, 6, 5)).position.set(sd * 0.112, 1.6, 0.01);
    });
    const lips = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.014, 0.01), lambert(w ? 0x7a2e2e : 0x3a1d14)));
    lips.position.set(0, 1.585, 0.104);
    add(sphere(0.016, skin, 6, 5)).position.set(0, 1.625, 0.112);

    // ---- hair
    const H = 1.64;
    const cap = (phi = 0.55, r = 0.124, tilt = -0.3) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI * phi), hair);
      m.position.set(0, H + 0.01, -0.005);
      m.scale.set(0.97, 1.12, 1.02);
      m.rotation.x = tilt;
      return add(m);
    };
    const strands = (n, from, to, r, len, spread = 1) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const ang = Math.PI * (from + (to - from) * t);
        const x = Math.cos(ang) * 0.12 * spread, z = Math.sin(ang) * -0.11 * spread;
        add(limb([x, H + 0.05, z], [x * 1.25, H - len, z * 1.2 - 0.02], r, hair));
      }
    };
    if (!look.gele || !w) {
      switch (look.hair) {
        case "bonestraight":
        case "frontal": {
          cap(0.56, 0.126);
          const back = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.16, 0.5, 12, 1, true, Math.PI * 0.5, Math.PI), hair);
          back.position.set(0, H - 0.18, -0.02);
          add(back);
          [-1, 1].forEach((sd) => { const b = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, look.hair === "frontal" ? 0.36 : 0.32, 0.06), hair)); b.position.set(sd * 0.112, H - 0.12, 0.04); });
          break;
        }
        case "bodywave": {
          cap(0.56, 0.128);
          const back = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.48, 12, 3, true, Math.PI * 0.45, Math.PI * 1.1), hair);
          back.position.set(0, H - 0.17, -0.02);
          add(back);
          [-1, 1].forEach((sd) => { add(sphere(0.05, hair, 7, 6)).position.set(sd * 0.13, H - 0.2, 0.03); add(sphere(0.045, hair, 7, 6)).position.set(sd * 0.14, H - 0.32, 0.0); });
          break;
        }
        case "bob": {
          cap(0.56, 0.127);
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.142, 0.16, 12, 1, true, Math.PI * 0.75, Math.PI * 1.5), hair);
          b.position.set(0, H - 0.06, 0);
          add(b);
          break;
        }
        case "knotless": cap(0.55); strands(15, 0.05, 0.95, 0.011, 0.55); break;
        case "fulani":
          cap(0.55); strands(11, 0.15, 0.85, 0.012, 0.45);
          [-1, 1].forEach((sd) => { add(limb([sd * 0.1, H + 0.02, 0.05], [sd * 0.12, H - 0.22, 0.06], 0.012, hair)); add(sphere(0.016, gold, 6, 5)).position.set(sd * 0.12, H - 0.23, 0.06); });
          add(sphere(0.014, gold, 6, 5)).position.set(0, H + 0.1, 0.09);
          break;
        case "bun": cap(0.5, 0.121); add(sphere(0.06, hair, 9, 7)).position.set(0, H + 0.14, -0.04); break;
        case "afro": { const a = add(sphere(0.19, hair, 12, 9)); a.position.set(0, H + 0.05, -0.04); a.scale.set(1, 0.92, 0.95); cap(0.5, 0.124); break; }
        case "curly":
          cap(0.56, 0.127);
          [[-0.12, 0.02, -0.02], [0.12, 0.02, -0.02], [-0.13, -0.1, -0.03], [0.13, -0.1, -0.03], [-0.12, -0.22, -0.04], [0.12, -0.22, -0.04], [0, -0.05, -0.1], [-0.07, -0.18, -0.09], [0.07, -0.18, -0.09], [0, 0.1, -0.05]]
            .forEach(([x, y, z]) => add(sphere(0.06, hair, 7, 6)).position.set(x, H + y, z));
          break;
        case "lowfade": cap(0.42, 0.121, -0.35); break;
        case "buzz": cap(0.47, 0.119, -0.3); break;
        case "waves": {
          cap(0.45, 0.121, -0.3);
          for (let i = 0; i < 3; i++) { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.06 + i * 0.025, 0.004, 4, 16, Math.PI), lambert(hairC + 0x181818))); r.position.set(0, H + 0.115 - i * 0.012, 0.02 - i * 0.02); r.rotation.x = -1.2; }
          break;
        }
        case "curls":
          cap(0.45, 0.121, -0.3);
          for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; add(sphere(0.03, hair, 6, 5)).position.set(Math.cos(a) * 0.07, H + 0.11, Math.sin(a) * 0.07 - 0.01); }
          break;
        case "locs": cap(0.47, 0.122, -0.3); strands(10, -0.05, 1.05, 0.016, 0.3, 1.02); break;
        case "cornrows": {
          cap(0.47, 0.121, -0.3);
          for (let i = -2; i <= 2; i++) { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.006, 4, 16, Math.PI * 0.8), lambert(hairC + 0x202020))); r.position.set(i * 0.03, H + 0.01, -0.01); r.rotation.y = Math.PI / 2; r.rotation.z = Math.PI * 0.1; }
          break;
        }
        case "taper": { cap(0.45, 0.121, -0.3); const t = add(sphere(0.09, hair, 9, 6)); t.position.set(0, H + 0.1, 0); t.scale.set(1, 0.45, 1); break; }
        default: cap(0.45);
      }
    }
    if (!w && look.beard) {
      const bd = new THREE.Mesh(new THREE.SphereGeometry(0.118, 10, 6, 0, Math.PI, Math.PI * 0.55, Math.PI * 0.35), hair);
      bd.position.set(0, H - 0.005, 0.005);
      bd.rotation.y = -Math.PI / 2;
      bd.scale.set(1, 1.15, look.beard === "full" ? 1.06 : 1.0);
      add(bd);
    }

    // ---- headwear and accessories
    if (look.gele) {
      const gm = look.style === "tradfusion" ? main : gold;
      if (w) {
        const base = add(sphere(0.15, gm, 12, 8)); base.position.set(0, H + 0.08, -0.02); base.scale.set(1.15, 0.75, 1.05);
        const fan = add(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 10, 1, true), gm));
        fan.position.set(0, H + 0.2, -0.05); fan.rotation.x = Math.PI + 0.35; fan.scale.set(1, 1, 0.55);
        const knot = add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), gm)); knot.position.set(0.05, H + 0.22, 0.02); knot.rotation.set(0.3, 0.6, 0.4);
      } else {
        const fila = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.11, 12), gm)); fila.position.set(0, H + 0.11, -0.01); fila.rotation.z = -0.25;
        const fold = add(sphere(0.07, gm, 8, 6)); fold.position.set(0.1, H + 0.13, 0); fold.scale.set(1, 0.6, 1);
      }
    }
    if (look.shades) {
      const frame = lambert(0xf4f4f2);
      [-1, 1].forEach((sd) => {
        const lens = add(new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.036, 0.012), dark));
        lens.position.set(sd * 0.042, 1.656, 0.115);
        const rim = add(new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.042, 0.008), frame));
        rim.position.set(sd * 0.042, 1.656, 0.11);
      });
      add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.01), frame)).position.set(0, 1.664, 0.116);
    }
    if (look.chain) {
      const ch = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.007, 4, 18), gold));
      ch.position.set(0, 1.39, 0.06); ch.rotation.x = Math.PI / 2.3; ch.scale.set(1, 1.3, 1);
    }
    return root;
  }

  function mount(el) {
    if (!window.THREE) return null;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
    camera.position.set(0, 0.95, 4.6);
    camera.lookAt(0, 0.88, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    let model = null;
    let angle = 0.35, vel = 0, dragging = false, lastX = 0, idle = 0, raf = 0;
    const canvas = renderer.domElement;
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; idle = 0; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * 0.012; vel = dx * 0.012; });
    const up = () => { dragging = false; };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    function size() {
      const r = el.getBoundingClientRect();
      const wpx = Math.max(1, r.width), hpx = Math.max(1, r.height);
      renderer.setSize(wpx, hpx, false);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      camera.aspect = wpx / hpx;
      camera.position.z = camera.aspect < 0.6 ? 6.2 : 4.6;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(size);
    ro.observe(el);
    size();

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!dragging) {
        angle += vel; vel *= 0.92;
        idle++;
        if (!reduce && idle > 120 && Math.abs(vel) < 0.001) angle += 0.004;
      }
      if (model) { model.rotation.y = angle; model.position.y = reduce ? 0 : Math.sin(Date.now() / 900) * 0.006; }
      renderer.render(scene, camera);
    }
    tick();

    function disposeModel() {
      if (!model) return;
      scene.remove(model);
      model.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
      model = null;
    }
    return {
      update(look) { disposeModel(); model = build(look); scene.add(model); },
      dispose() { cancelAnimationFrame(raf); ro.disconnect(); disposeModel(); renderer.dispose(); canvas.remove(); },
    };
  }

  window.Avatar3D = { mount, build };
})();
