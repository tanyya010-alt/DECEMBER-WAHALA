// DECEMBER WAHALA — Luxury Zone mini-games, drawn over the 3D world.
//  • DJ booth: a four-lane rhythm game. Hit the notes on the line to keep the
//    crowd hyped; accuracy sets the zone multiplier.
//  • Celebrity selfie / Reel: a quick-time event. Snap while the marker is in
//    the green zone before the celeb loses interest.
(function () {
  const LANES = [
    { key: ["d", "arrowleft"], label: "D", col: "#ff4fa3" },
    { key: ["f", "arrowdown"], label: "F", col: "#ffd23b" },
    { key: ["j", "arrowup"], label: "J", col: "#4fe0ff" },
    { key: ["k", "arrowright"], label: "K", col: "#7cff6b" },
  ];
  const BPM = 104, BEAT = 60 / BPM, TRAVEL = 1.45, LEAD = 3, LENGTH = 26;
  let cur = null;

  function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function close() {
    if (!cur) return;
    cancelAnimationFrame(cur.raf);
    clearInterval(cur.timer);
    window.removeEventListener("keydown", cur.onKey, true);
    cur.root.remove();
    cur = null;
  }

  // ------------------------------------------------------------ DJ booth
  function dj(ctx, done, cancel) {
    const R = rng(ctx.seed || 7);
    const notes = [];
    let last = -1;
    for (let t = LEAD; t < LEAD + LENGTH; t += BEAT) {
      const busy = (t - LEAD) / LENGTH; // gets busier as the set builds
      if (R() < 0.82) { let l = Math.floor(R() * 4); if (l === last && R() < 0.6) l = (l + 1 + Math.floor(R() * 3)) % 4; notes.push({ t, lane: l }); last = l; }
      if (R() < 0.18 + busy * 0.3) notes.push({ t: t + BEAT / 2, lane: Math.floor(R() * 4) });
    }
    const root = el(`<div class="mg" role="dialog" aria-label="DJ booth">
      <div class="mg-card mg-dj">
        <div class="mg-head"><b>🎛️ DJ Booth · ${ctx.place}</b><button class="mg-x" aria-label="Quit">✕</button></div>
        <div class="mg-hype"><span>Crowd hype</span><i><b></b></i><em>×1.0</em></div>
        <div class="mg-crowd"></div>
        <canvas></canvas>
        <div class="mg-pads">${LANES.map((l, i) => `<button data-lane="${i}" style="--c:${l.col}">${l.label}</button>`).join("")}</div>
        <p class="mg-tip">Tap the pads (or press D F J K) as notes cross the line.</p>
      </div></div>`);
    document.body.appendChild(root);
    const cv = root.querySelector("canvas"), g = cv.getContext("2d");
    const hypeBar = root.querySelector(".mg-hype b"), hypeTxt = root.querySelector(".mg-hype em"), crowd = root.querySelector(".mg-crowd");
    const fit = () => { const w = Math.min(420, root.querySelector(".mg-card").clientWidth - 24); cv.width = w * devicePixelRatio; cv.height = Math.min(380, window.innerHeight * 0.42) * devicePixelRatio; cv.style.width = w + "px"; cv.style.height = cv.height / devicePixelRatio + "px"; };
    fit();
    const people = ["💃🏾", "🕺🏾", "🙌🏾", "💃🏽", "🕺🏿", "🙌🏿", "💃🏿", "🥳"];
    crowd.innerHTML = people.map((p) => `<span>${p}</span>`).join("");
    const st = { t0: performance.now() / 1000, hype: 50, combo: 0, best: 0, score: 0, judged: 0, flashes: [], over: false };
    const now = () => performance.now() / 1000 - st.t0;
    const judge = (n, q, label) => {
      n.done = true; st.judged++; st.score += q;
      if (q > 0) { st.combo++; st.best = Math.max(st.best, st.combo); st.hype = Math.min(100, st.hype + (q >= 1 ? 5 : q >= 0.7 ? 3 : 1)); }
      else { st.combo = 0; st.hype = Math.max(0, st.hype - 6); }
      st.flashes.push({ lane: n.lane, label, q, t: now() });
    };
    const hit = (lane) => {
      if (st.over) return;
      const t = now();
      const pad = root.querySelector(`[data-lane="${lane}"]`); pad.classList.add("on"); setTimeout(() => pad.classList.remove("on"), 90);
      let best = null;
      for (const n of notes) if (!n.done && n.lane === lane && Math.abs(n.t - t) < 0.2 && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n;
      if (!best) { st.hype = Math.max(0, st.hype - 1); return; }
      const d = Math.abs(best.t - t);
      judge(best, d < 0.07 ? 1 : d < 0.13 ? 0.7 : 0.4, d < 0.07 ? "PERFECT" : d < 0.13 ? "GOOD" : "OK");
    };
    const finish = () => {
      st.over = true;
      const acc = notes.length ? st.score / notes.length : 0;
      const tier = acc >= 0.85 ? ["🔥 YOU SHUT IT DOWN", "Zone multiplier ×2 for 3 hours"] : acc >= 0.6 ? ["🎉 Solid set", "Zone multiplier ×1.5 for 2 hours"] : ["🦗 The floor emptied", "The resident DJ wants the decks back"];
      const res = el(`<div class="mg-result"><h3>${tier[0]}</h3><p>Accuracy <b>${Math.round(acc * 100)}%</b> · best combo <b>${st.best}</b></p><p class="muted-sm">${tier[1]}</p><button class="btn primary">Collect</button></div>`);
      root.querySelector(".mg-card").appendChild(res);
      res.querySelector("button").onclick = () => { close(); done(acc, st.best); };
    };
    const draw = () => {
      const t = now(), W = cv.width, H = cv.height, dpr = devicePixelRatio, lw = W / 4, hitY = H - 46 * dpr;
      g.clearRect(0, 0, W, H);
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#14092b"); grd.addColorStop(1, "#2a0f45"); g.fillStyle = grd; g.fillRect(0, 0, W, H);
      LANES.forEach((l, i) => {
        g.fillStyle = i % 2 ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.06)"; g.fillRect(i * lw, 0, lw, H);
        g.strokeStyle = l.col; g.globalAlpha = 0.9; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(i * lw + lw / 2, hitY, 17 * dpr, 0, 7); g.stroke(); g.globalAlpha = 1;
      });
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, hitY - 1 * dpr, W, 2 * dpr);
      // Beat pulse on the line.
      const pulse = 1 - ((t - LEAD) / BEAT % 1 + 1) % 1;
      g.fillStyle = `rgba(255,210,59,${0.15 * pulse})`; g.fillRect(0, hitY - 20 * dpr, W, 40 * dpr);
      for (const n of notes) {
        if (n.done) continue;
        if (t - n.t > 0.2) { judge(n, 0, "MISS"); continue; }
        const y = hitY - ((n.t - t) / TRAVEL) * hitY;
        if (y < -20 * dpr) continue;
        const x = n.lane * lw + lw / 2;
        g.fillStyle = LANES[n.lane].col; g.shadowColor = LANES[n.lane].col; g.shadowBlur = 14 * dpr;
        g.beginPath(); g.arc(x, y, 14 * dpr, 0, 7); g.fill(); g.shadowBlur = 0;
        g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(x - 4 * dpr, y - 4 * dpr, 4 * dpr, 0, 7); g.fill();
      }
      st.flashes = st.flashes.filter((f) => t - f.t < 0.5);
      g.textAlign = "center"; g.font = `800 ${13 * dpr}px Fredoka, system-ui, sans-serif`;
      st.flashes.forEach((f) => { g.globalAlpha = 1 - (t - f.t) / 0.5; g.fillStyle = f.q >= 1 ? "#ffd23b" : f.q > 0 ? "#ffffff" : "#ff5a6f"; g.fillText(f.label, f.lane * lw + lw / 2, hitY - 30 * dpr - (t - f.t) * 40 * dpr); g.globalAlpha = 1; });
      if (t < LEAD) { g.fillStyle = "#fff"; g.font = `800 ${46 * dpr}px Fredoka, system-ui, sans-serif`; g.fillText(String(Math.ceil(LEAD - t)), W / 2, H / 2); }
      else if (st.combo >= 5) { g.fillStyle = "#ffd23b"; g.font = `800 ${16 * dpr}px Fredoka, system-ui, sans-serif`; g.fillText(`${st.combo} COMBO`, W / 2, 26 * dpr); }
      hypeBar.style.width = st.hype + "%";
      hypeTxt.textContent = st.hype >= 80 ? "🔥 ON FIRE" : st.hype >= 50 ? "🎉 Vibing" : st.hype >= 25 ? "😐 Meh" : "🦗 Dead";
      crowd.style.setProperty("--b", (st.hype / 100).toFixed(2));
      crowd.classList.toggle("wild", st.hype >= 80);
      crowd.classList.toggle("dead", st.hype < 25);
      if (!st.over && t > LEAD + LENGTH + 0.6) finish();
      if (cur) cur.raf = requestAnimationFrame(draw);
    };
    root.querySelectorAll("[data-lane]").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(Number(b.dataset.lane)); }));
    root.querySelector(".mg-x").onclick = () => { close(); cancel(); };
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const lane = LANES.findIndex((l) => l.key.includes(k));
      if (lane >= 0) { if (!e.repeat) hit(lane); }
      else if (k === "escape") { close(); cancel(); }
      else if ((k === "enter" || k === " ") && st.over) root.querySelector(".mg-result button").click();
      else if (!["w", "a", "s", "e", " "].includes(k)) return;
      e.preventDefault(); e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    cur = { root, onKey, raf: requestAnimationFrame(draw) };
  }

  // ------------------------------------------------------------ selfie / Reel QTE
  function qte(ctx, done, cancel) {
    const reel = ctx.kind === "reel";
    const shots = reel ? 3 : 1;
    const zone = Math.min(0.3, 0.17 + (ctx.skill || 0) * 0.012);
    const root = el(`<div class="mg" role="dialog" aria-label="Celebrity ${reel ? "Reel" : "selfie"}">
      <div class="mg-card mg-qte">
        <div class="mg-head"><b>${reel ? "🎥 Record a Reel" : "🤳🏾 Selfie"} with ${ctx.celebName}</b><button class="mg-x" aria-label="Give up">✕</button></div>
        <div class="mg-cam"><div class="mg-faces">${ctx.meFace || ""}${ctx.celebFace || ""}</div><div class="mg-rec">${reel ? "● REC" : ""}</div><div class="mg-flash"></div><div class="mg-patience"><i></i></div></div>
        <div class="mg-bar"><div class="mg-zone"></div><div class="mg-cursor"></div></div>
        <p class="mg-shots"></p>
        <button class="btn primary big mg-snap">📸 SNAP</button>
        <p class="mg-tip">${ctx.celebTitle} · tap SNAP (or Space) when the marker is in the green. Don't keep them waiting!</p>
      </div></div>`);
    document.body.appendChild(root);
    const cursor = root.querySelector(".mg-cursor"), zoneEl = root.querySelector(".mg-zone"), shotsEl = root.querySelector(".mg-shots"), flash = root.querySelector(".mg-flash"), pat = root.querySelector(".mg-patience i");
    const R = rng(ctx.seed || 11);
    const st = { shot: 0, scores: [], center: 0, t0: performance.now(), shotT: performance.now(), over: false };
    const newShot = () => { st.center = zone / 2 + 0.05 + R() * (0.9 - zone); zoneEl.style.left = (st.center - zone / 2) * 100 + "%"; zoneEl.style.width = zone * 100 + "%"; st.shotT = performance.now(); shotsEl.textContent = shots > 1 ? `Take ${st.shot + 1} of ${shots}` : "One shot. Make it count."; };
    newShot();
    const period = () => (reel ? [1.5, 1.2, 0.95][st.shot] : 1.55) * 1000;
    const pos = () => { const ph = ((performance.now() - st.t0) / period()) % 2; return ph < 1 ? ph : 2 - ph; };
    const end = () => {
      st.over = true;
      const q = st.scores.reduce((a, b) => a + b, 0) / shots;
      const tag = q >= 0.8 ? "🔥 Perfect shot. This one's going viral." : q >= 0.34 ? "👍🏾 Good enough to post!" : "😬 Blurry. The bodyguard steps in.";
      const res = el(`<div class="mg-result"><h3>${tag}</h3><p>Shot quality <b>${Math.round(q * 100)}%</b></p><button class="btn primary">${q >= 0.34 ? "Post it" : "Walk away"}</button></div>`);
      root.querySelector(".mg-card").appendChild(res);
      res.querySelector("button").onclick = () => { close(); done(q); };
    };
    const snap = () => {
      if (st.over) return;
      const p = pos(), d = Math.abs(p - st.center);
      const sc = d <= zone / 2 ? 1 - (d / (zone / 2)) * 0.35 : Math.max(0, 0.6 - (d - zone / 2) * 3);
      st.scores.push(sc);
      flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
      st.shot++;
      if (st.shot >= shots) end(); else newShot();
    };
    const tick = () => {
      if (!cur) return;
      if (!st.over) {
        cursor.style.left = pos() * 100 + "%";
        const waited = (performance.now() - st.shotT) / 1000, lim = 6.5;
        pat.style.width = Math.max(0, 100 - (waited / lim) * 100) + "%";
        if (waited > lim) { st.scores.push(0); st.shot++; shotsEl.textContent = "⏳ They looked away…"; if (st.shot >= shots) end(); else newShot(); }
      }
      cur.raf = requestAnimationFrame(tick);
    };
    root.querySelector(".mg-snap").addEventListener("pointerdown", (e) => { e.preventDefault(); snap(); });
    root.querySelector(".mg-bar").addEventListener("pointerdown", (e) => { e.preventDefault(); snap(); });
    root.querySelector(".mg-x").onclick = () => { close(); cancel(); };
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "enter") { if (st.over) root.querySelector(".mg-result button").click(); else snap(); }
      else if (k === "escape") { close(); cancel(); }
      else if (!["w", "a", "s", "d", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) return;
      e.preventDefault(); e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    cur = { root, onKey, raf: requestAnimationFrame(tick) };
  }

  function open(kind, ctx, done, cancel) {
    close();
    if (kind === "dj") dj(ctx, done, cancel); else qte({ ...ctx, kind }, done, cancel);
  }
  window.Minigames = { open, close, isOpen: () => !!cur };
})();
