// DECEMBER WAHALA — the app: landing, accounts, creator, and the in-world HUD
// (clock, quests, needs, place panels, conversations, phone, map, bag).
/* global DATA, WORLD, SIM, NAV, Avatar, Avatar3D, World3D */
(function () {
  const D = window.DATA, W = window.WORLD, S = window.SIM;
  const SIMS = W.SIMS;
  const NEEDS = SIMS.NEEDS;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const naira = S.naira;
  // Character drawings are cached so panels don't redraw every frame.
  const AVB = (l) => Avatar.bust(l), AVS = (l, o) => Avatar.svg(l, o);
  const svgCache = new Map();
  const memo = (kind, look, opts) => {
    const k = kind + JSON.stringify(look) + JSON.stringify(opts || {});
    if (!svgCache.has(k)) { if (svgCache.size > 300) svgCache.clear(); svgCache.set(k, kind === "bust" ? AVB(look) : AVS(look, opts)); }
    return svgCache.get(k);
  };
  const GUEST_KEY = "december-wahala-guest-v3";
  const STEPS = ["Look", "Vibe", "Goal", "Who You Be", "Where You Stay"];
  const HEADLINES = [
    "🛬 Arrivals up 300% as IJGBs land in matching tracksuits",
    "⛽ Fuel queues spotted on three major roads",
    "🎊 Seventeen owambes scheduled for Saturday. On one street.",
    "💱 The dollar moved again. Aunties are watching closely.",
    "🎤 Detty Fest: 20th and 26th–28th December",
    "🔌 NEPA promises steady light this Christmas. Nobody believes them.",
  ];

  const app = {
    online: false, user: null, sim: null, world: null,
    city: { people: [], feed: [], online: 0, players: 0 },
    landingCity: "lagos", panel: null, phoneApp: null, mapSel: null, playerTalk: null, pie: null, queue: [], qCur: null, rideWas: false,
    step: 0, draft: null, stage: null, raf: 0, last: 0, hudT: 0, saveT: 0, pollT: 0, busy: false, lastTop: null,
  };

  // ------------------------------------------------------------------ server
  async function api(method, path, body) {
    try {
      const opts = { method, credentials: "same-origin", headers: {} };
      if (method !== "GET") { opts.headers["content-type"] = "application/json"; opts.body = JSON.stringify(body || {}); }
      const r = await fetch("/api/" + path, opts);
      let data = {};
      try { data = await r.json(); } catch (e) { data = {}; }
      return { ok: r.ok, status: r.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: { error: "Can't reach the server. Check your connection and try again." } };
    }
  }
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
  };

  // ------------------------------------------------------------------ screens
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
    window.scrollTo(0, 0);
    if (id !== "screen-create" && app.stage) { app.stage.dispose(); app.stage = null; }
    if (id !== "screen-game") stopGame();
  }
  function openModal(id) { $(id).hidden = false; }
  function closeModals() { document.querySelectorAll(".modal").forEach((m) => { if (m.id !== "m-event") m.hidden = true; }); }
  function toast(text, kind) {
    document.querySelectorAll(".toast").forEach((n) => n.remove());
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  // ------------------------------------------------------------------ minimap
  // A top-down SVG of the city drawn from the same street grid as the 3D world.
  function minimap(city, opts = {}) {
    const G = W.GRID;
    const places = W.buildPlaces(city);
    const X = (x) => (x + 72) * 5, Z = (z) => (z + 58) * 5;
    const lagos = city === "lagos";
    let svg = `<svg class="minimap" viewBox="0 0 720 640" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of ${city}">`;
    svg += `<rect width="720" height="640" fill="${lagos ? "#d6e4b5" : "#cfe3b0"}"/>`;
    svg += `<rect x="0" y="${Z(G.beach[0])}" width="720" height="${(G.beach[1] - G.beach[0]) * 5}" fill="${lagos ? "#f1dda2" : "#c9e2a6"}"/>`;
    svg += `<rect x="0" y="${Z(G.beach[1])}" width="720" height="200" fill="${lagos ? "#3d97cf" : "#5cb2d6"}"/>`;
    svg += `<rect x="0" y="${Z(G.water.band[0])}" width="720" height="${(G.water.band[1] - G.water.band[0]) * 5}" fill="${lagos ? "#4fa9d6" : "#a9d68e"}"/>`;
    for (const z of G.hRoads) svg += `<rect x="${X(-68)}" y="${Z(z) - 15}" width="${136 * 5}" height="30" fill="#5a606a"/>`;
    for (const x of G.vRoads) for (let j = 0; j < G.hRoads.length - 1; j++) {
      const z1 = G.hRoads[j], z2 = G.hRoads[j + 1];
      if (lagos && z1 < G.water.band[0] && z2 > G.water.band[1] && !G.water.bridges.includes(x)) continue;
      svg += `<rect x="${X(x) - 15}" y="${Z(z1)}" width="30" height="${(z2 - z1) * 5}" fill="#5a606a"/>`;
    }
    for (const p of Object.values(places)) if (!p.remote && p.kind === "building") svg += `<rect x="${X(p.x - p.w / 2 + 0.5)}" y="${Z(p.z - p.d / 2 + 0.5)}" width="${(p.w - 1) * 5}" height="${(p.d - 1) * 5}" rx="6" fill="${W.TYPES[p.type].color}" stroke="rgba(0,0,0,.12)"/>`;
    svg += `<text x="${X(30)}" y="${Z(-0.6)}" class="mm-water">${lagos ? "LAGOS LAGOON" : "RING ROAD PARK"}</text>`;
    svg += `<text x="360" y="${Z(G.beach[1]) + 40}" class="mm-water">${lagos ? "ATLANTIC OCEAN" : "JABI LAKE"}</text>`;
    (opts.people || []).forEach((p) => { svg += `<circle cx="${X(p.x)}" cy="${Z(p.z)}" r="7" fill="${p.color}" stroke="#fff" stroke-width="2"><title>${esc(p.label)}</title></circle>`; });
    for (const p of Object.values(places)) {
      if (p.remote) continue;
      const sel = opts.sel === p.id;
      const x = X(p.door.x), y = Z(p.door.z);
      const full = p.id === "home" ? "Your Flat" : p.name;
      const label = full.length > 16 ? full.slice(0, 15) + "…" : full;
      const w = label.length * 7.4 + 30;
      svg += `<g class="mm-pin${sel ? " sel" : ""}${opts.here === p.id ? " here" : ""}" data-place="${p.id}" tabindex="0" role="button" aria-label="${esc(label)}">`;
      svg += `<rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="26" rx="13"/><text x="${x}" y="${y + 4}">${p.icon} ${esc(label)}</text></g>`;
    }
    if (opts.me) svg += `<g class="mm-me"><circle cx="${X(opts.me.x)}" cy="${Z(opts.me.z)}" r="11" fill="#20b46e" stroke="#fff" stroke-width="3"/><text x="${X(opts.me.x)}" y="${Z(opts.me.z) - 18}">You</text></g>`;
    return svg + "</svg>";
  }

  // ------------------------------------------------------------------ boot and landing
  async function boot() {
    const r = await api("GET", "me");
    app.online = r.ok && r.data && "user" in r.data;
    if (app.online && r.data.user) {
      app.user = r.data.user;
      if (r.data.save && r.data.save.version === 3) return startGame(r.data.save);
      return openCreator();
    }
    showLanding();
  }
  async function showLanding() {
    show("screen-landing");
    $("offline-note").hidden = app.online;
    document.querySelectorAll('#screen-landing [data-go="signup"], #screen-landing [data-go="login"]').forEach((b) => { b.hidden = !app.online; });
    $("btn-guest").textContent = app.online ? "or play offline as a guest" : "Play offline as a guest";
    $("btn-guest").className = app.online ? "linkbtn" : "btn primary big";
    if (app.online) await refreshCity(app.landingCity);
    renderLanding();
  }
  function renderLanding() {
    const city = app.landingCity;
    const places = W.buildPlaces(city);
    const people = app.online ? app.city.people.filter((p) => places[p.place]).map((p, i) => ({ x: places[p.place].spot.x + (i % 3), z: places[p.place].spot.z, color: p.online ? "#2f7de1" : "#9aa7b8", label: "@" + p.username })) : [];
    $("landing-map").innerHTML = minimap(city, { people });
    $("l-online").textContent = app.online ? app.city.online.toLocaleString() : "–";
    $("l-players").textContent = app.online ? app.city.players.toLocaleString() : "–";
    document.querySelectorAll("#l-city button").forEach((b) => b.classList.toggle("sel", b.dataset.city === city));
    setTicker($("l-ticker"), app.online && app.city.feed.length ? app.city.feed.map((f) => f.text) : HEADLINES);
    $("l-ticker").hidden = false;
  }
  function setTicker(el, items) {
    const track = el.querySelector(".ticker-track");
    const html = items.map((t) => `<span>${esc(t)}</span>`).join("");
    if (track.dataset.html !== html) { track.innerHTML = html; track.dataset.html = html; }
  }
  async function refreshCity(city) {
    if (!app.online) return;
    const r = await api("GET", "city?city=" + city);
    if (r.ok) app.city = r.data;
  }

  // ------------------------------------------------------------------ auth
  let authMode = "signup";
  function openAuth(mode) { authMode = mode; show("screen-auth"); renderAuth(); setTimeout(() => (mode === "signup" ? $("f-name") : $("f-username")).focus(), 50); }
  function renderAuth() {
    const signup = authMode === "signup";
    $("auth-form").classList.toggle("login", !signup);
    document.querySelectorAll("#auth-form .tabs2 button").forEach((b) => b.classList.toggle("sel", b.dataset.mode === authMode));
    $("f-submit").textContent = signup ? "Sign up · it's free" : "Log in";
    $("f-password").autocomplete = signup ? "new-password" : "current-password";
    $("f-error").hidden = true;
  }
  async function submitAuth(e) {
    e.preventDefault();
    if (app.busy) return;
    const err = (m) => { $("f-error").textContent = m; $("f-error").hidden = false; };
    const username = $("f-username").value.trim().replace(/^@/, "").toLowerCase();
    const password = $("f-password").value;
    let body;
    if (authMode === "signup") {
      body = { name: $("f-name").value.trim(), username, password, email: $("f-email").value.trim(), adult: $("f-adult").checked };
      if (!body.name) return err("Enter your name.");
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return err("Usernames are 3–20 characters: lowercase letters, numbers and _.");
      if (password.length < 6) return err("Passwords need at least 6 characters.");
      if (!body.adult) return err("Tick the box to confirm you're 18 or older and accept the terms.");
    } else {
      body = { username, password };
      if (!username || !password) return err("Enter your username and password.");
    }
    app.busy = true; $("f-submit").disabled = true;
    const r = await api("POST", authMode, body);
    app.busy = false; $("f-submit").disabled = false;
    if (!r.ok) return err(r.data.error || "Something went wrong. Try again.");
    app.user = r.data.user;
    $("f-password").value = "";
    if (r.data.save && r.data.save.version === 3) startGame(r.data.save); else openCreator();
  }

  // ------------------------------------------------------------------ creator
  function defaultLook() {
    return { body: "woman", build: "regular", skin: 3, hair: "knotless", hairColour: "black", style: "glam", colour: 0, fabric: "plain", shades: false, chain: true, gele: false, beard: null, shoes: "heels", bag: "tiny_bag", watch: false };
  }
  function openCreator(prev) {
    app.step = 0;
    app.draft = {
      name: app.user ? app.user.name : (prev && prev.name) || "",
      look: prev && prev.look ? { ...defaultLook(), ...prev.look } : defaultLook(),
      traits: [], goal: null, city: (prev && prev.city) || "lagos", area: (prev && prev.area) || "yaba",
    };
    show("screen-create");
    const stageEl = $("c-stage");
    stageEl.querySelectorAll("canvas, svg").forEach((n) => n.remove());
    app.stage = window.THREE ? Avatar3D.mount(stageEl) : null;
    renderCreate();
  }
  const persona = () => D.personaFor(app.draft.traits, app.draft.goal);
  function stepReady() {
    const d = app.draft;
    if (app.step === 0) return !!(app.user || d.name.trim());
    if (app.step === 1) return d.traits.length === 2;
    if (app.step === 2) return !!d.goal;
    return true;
  }
  function renderStage() {
    if (app.stage) app.stage.update(app.draft.look);
    else { const el = $("c-stage"); el.querySelectorAll("svg").forEach((n) => n.remove()); el.insertAdjacentHTML("afterbegin", AVS(app.draft.look, { label: "Your character" })); }
  }
  function chips(name, options, current, cls = "") {
    return `<div class="chips ${cls}" data-field="${name}">${options.map(([v, label]) => `<button type="button" data-v="${esc(v)}" class="${String(v) === String(current) ? "sel" : ""}">${label}</button>`).join("")}</div>`;
  }
  function swatches(name, colours, current) {
    return `<div class="swatches" data-field="${name}">${colours.map(([v, hex, label]) => `<button type="button" data-v="${esc(v)}" class="${String(v) === String(current) ? "sel" : ""}" style="background:${hex}" aria-label="${esc(label)}" title="${esc(label)}"></button>`).join("")}</div>`;
  }
  function renderCreate() {
    const d = app.draft, L = d.look, step = app.step;
    $("c-title").textContent = STEPS[step];
    $("c-dashes").innerHTML = STEPS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("");
    $("c-back").style.visibility = step === 0 && app.user ? "hidden" : "visible";
    let html = "";
    if (step === 0) {
      html += app.user
        ? `<div class="namebox"><b>@${esc(app.user.username)}</b><small>your Sim's name</small></div>`
        : `<label class="namebox"><input id="c-name" maxlength="16" placeholder="Your Sim's name" value="${esc(d.name)}"><small>your Sim's name</small></label>`;
      html += `<div class="group"><h4>Body</h4>${chips("body", [["woman", "Woman"], ["man", "Man"]], L.body, "two")}</div>`;
      html += `<div class="group"><h4>Body type</h4>${chips("build", [["slim", "Slim"], ["regular", "Regular"], ["curvy", L.body === "woman" ? "Curvy" : "Broad"]], L.build)}</div>`;
      html += `<div class="group"><h4>Hairstyle</h4>${chips("hair", Object.entries(D.HAIR[L.body]), L.hair)}</div>`;
      html += `<div class="group"><h4>Hair colour</h4>${swatches("hairColour", Object.entries(D.HAIR_COLOURS).map(([k, h]) => [k, h.hex, h.name]), L.hairColour)}</div>`;
      html += `<div class="group"><h4>Skin tone</h4>${swatches("skin", D.SKIN.map((h, i) => [i, h, "Skin tone " + (i + 1)]), L.skin)}</div>`;
      html += `<div class="group"><h4>Outfit</h4>${chips("style", Object.entries(D.STYLES).map(([k, s]) => [k, `${s.icon} ${s.name}`]), L.style)}<small class="muted-sm">${esc(D.STYLES[L.style].blurb)}</small></div>`;
      html += `<div class="group"><h4>Fabric</h4>${chips("fabric", Object.entries(D.FABRICS), L.fabric)}</div>`;
      html += `<div class="group"><h4>Outfit colour</h4>${["allblack", "christmas"].includes(L.style) ? `<small class="muted-sm">This style comes in its own colours.</small>` : swatches("colour", D.OUTFIT_COLOURS.map((h, i) => [i, h, "Colour " + (i + 1)]), L.colour)}</div>`;
      html += `<div class="group"><h4>Shoes</h4>${chips("shoes", [["slippers", "🩴 Slippers"], ["sneakers", "👟 Sneakers"], ["heels", "👠 Heels"], ["loafers", "🥿 Loafers"], ["boots", "🥾 Boots"]], L.shoes)}<small class="muted-sm">Club bouncers don't let slippers in.</small></div>`;
      html += `<div class="group"><h4>Bag</h4>${chips("bag", [["", "None"], ["tiny_bag", "👛 Tiny bag"], ["designer_bag", "👜 Designer-looking"]], L.bag || "")}</div>`;
      const extras = [["shades", "🕶️ Shades"], ["chain", "📿 Chain"], ["watch", "⌚ Gold watch"], ["gele", L.body === "woman" ? "🎀 Gele" : "🧢 Fila"]];
      html += `<div class="group"><h4>Jewellery &amp; extras</h4><div class="chips" data-toggle>${extras.map(([k, l]) => `<button type="button" data-k="${k}" class="${L[k] ? "sel" : ""}">${l}</button>`).join("")}</div></div>`;
      if (L.body === "man") html += `<div class="group"><h4>Beard</h4>${chips("beard", [["", "None"], ["shaped", "Shaped"], ["full", "Full"]], L.beard || "")}</div>`;
    } else if (step === 1) {
      html += `<p class="muted" style="margin:0">Choose 2 traits for ${esc(app.user ? app.user.username : d.name || "your Sim")}.</p><div class="traits">`;
      html += Object.entries(D.TRAITS).map(([k, t]) => `<button type="button" class="tcard ${d.traits.includes(k) ? "sel" : ""}" data-trait="${k}"><span class="ti">${t.icon}</span><b>${t.name}</b><small>${esc(t.desc)}</small></button>`).join("");
      html += `</div>`;
    } else if (step === 2) {
      html += `<p class="muted" style="margin:0">What does a perfect December look like?</p><div class="goals">`;
      html += Object.entries(D.GOALS).map(([k, g]) => `<button type="button" class="tcard ${d.goal === k ? "sel" : ""}" data-goal="${k}"><span class="ti">${g.icon}</span><b>${g.name}</b><small>${esc(g.desc)}</small></button>`).join("");
      html += `</div>`;
    } else if (step === 3) {
      const id = persona(), P = D.PERSONAS[id], st = P.start, M = W.MISSIONS[id];
      const money = [naira(st.naira), st.usd ? `$${st.usd.toLocaleString()}` : null].filter(Boolean).join(" + ");
      html += `<div class="reveal"><div class="reveal-tile">${P.icon}</div><h3>${P.name}</h3><p>${esc(P.tagline)}</p></div>`;
      html += `<div class="rows">
        <div class="row"><span class="ri">💰</span><div><b>Starts with</b>${money} · 📱 ${st.clout} clout · 🔗 ${st.conn} connections</div></div>
        <div class="row"><span class="ri">${P.resource.icon}</span><div><b>Unique resource</b>${P.resource.label}</div></div>
        <div class="row"><span class="ri">✨</span><div><b>Unusually good at</b>${esc(P.good)}</div></div>
        <div class="row"><span class="ri">😬</span><div><b>Struggles with</b>${esc(P.bad)}</div></div>
        <div class="row"><span class="ri">${M.icon}</span><div><b>Your mission</b>${esc(M.name)} — ${esc(M.desc)}</div></div>
        <div class="row secret"><span class="ri">🤫</span><div><b>Your secret (only you can see this)</b>${esc(P.secret)}</div></div>
        <div class="row"><span class="ri">🧬</span><div><b>Why you</b>${d.traits.map((t) => D.TRAITS[t].name).join(" + ")} and the dream of ${D.GOALS[d.goal].name}.</div></div>
      </div>`;
    } else {
      const P = D.PERSONAS[persona()];
      html += `<div class="group"><h4>City</h4>${chips("city", [["lagos", "🌉 Lagos"], ["abuja", "🏛️ Abuja"]], d.city, "two")}<small class="muted-sm">${esc(D.CITIES[d.city].tagline)}</small></div>`;
      html += `<div class="group"><h4>Area</h4><div class="areas">`;
      html += Object.entries(D.AREAS[d.city]).map(([k, a]) => `<button type="button" class="tcard ${d.area === k ? "sel" : ""}" data-area="${k}"><b>${a.name}</b><em>${P.visitor ? naira(a.stay) + " stay" : "You live here"}</em><small>${esc(a.blurb)}</small><small>${a.traffic > 0.1 ? "🚦🚦🚦 Heavy traffic" : a.traffic > 0 ? "🚦🚦 Some traffic" : "🚦 Light traffic"}${a.clout ? ` · ${a.clout > 0 ? "+" : ""}${a.clout} clout` : ""}</small></button>`).join("");
      html += `</div></div>`;
    }
    $("c-panel").innerHTML = html;
    const ready = stepReady();
    const left = step === 1 ? 2 - d.traits.length : 0;
    $("c-continue").disabled = !ready; $("c-next").disabled = !ready;
    $("c-continue").textContent = step === 1 && left ? `Choose ${left} more` : step === 2 && !d.goal ? "Pick a goal" : step === 3 ? "Choose where to stay" : step === 4 ? "Start my December 🎄" : "Continue";
    renderStage();
  }
  function shuffle() {
    const d = app.draft, pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (app.step === 0) {
      const body = pick(["woman", "man"]);
      d.look = {
        body, build: pick(["slim", "regular", "curvy"]), skin: Math.floor(Math.random() * 7), hair: pick(Object.keys(D.HAIR[body])), hairColour: pick(Object.keys(D.HAIR_COLOURS)),
        style: pick(Object.keys(D.STYLES)), colour: Math.floor(Math.random() * D.OUTFIT_COLOURS.length), fabric: pick(Object.keys(D.FABRICS)),
        shades: Math.random() < 0.4, chain: Math.random() < 0.5, watch: Math.random() < 0.3, gele: Math.random() < 0.15, beard: body === "man" ? pick([null, "shaped", "full"]) : null,
        shoes: pick(body === "woman" ? ["heels", "sneakers", "boots"] : ["sneakers", "loafers", "boots"]), bag: pick([null, "tiny_bag", "designer_bag"]),
      };
    } else if (app.step === 1) d.traits = Object.keys(D.TRAITS).sort(() => Math.random() - 0.5).slice(0, 2);
    else if (app.step === 2) d.goal = pick(Object.keys(D.GOALS));
    else if (app.step === 4) d.area = pick(Object.keys(D.AREAS[d.city]));
    renderCreate();
  }
  async function nextStep() {
    if (!stepReady()) return;
    if (app.step < 4) { app.step++; renderCreate(); $("c-panel").scrollTop = 0; return; }
    const d = app.draft;
    const L = d.look;
    const look = { body: L.body, build: L.build, skin: L.skin, hair: L.hair, hairColour: L.hairColour, style: L.style, colour: L.colour, fabric: L.fabric, shades: L.shades, chain: L.chain, gele: L.gele, beard: L.beard };
    const sim = S.Sim.create({ name: app.user ? app.user.name : d.name.trim(), look, traits: d.traits, goal: d.goal, persona: persona(), city: d.city, area: d.area });
    const s = sim.s;
    s.inventory[L.shoes] = 1; s.equip.shoes = L.shoes;
    if (L.bag) { s.inventory[L.bag] = 1; s.equip.bag = L.bag; }
    if (L.watch) { s.inventory.gold_watch = 1; s.equip.jewelry = "gold_watch"; } else if (L.chain) { s.inventory.chain = 1; s.equip.jewelry = "chain"; }
    if (app.online && app.user) {
      const r = await api("PUT", "save", { state: s, news: sim.takeNews() });
      if (!r.ok) { toast(r.data.error || "Couldn't save your game."); return; }
    } else { sim.takeNews(); store.set(GUEST_KEY, s); }
    startGame(s);
  }

  // ------------------------------------------------------------------ the game
  function startGame(state) {
    show(state.over ? "screen-end" : "screen-game");
    app.sim = new S.Sim(state);
    if (state.over) { renderEnd(); return; }
    app.panel = null; app.phoneApp = null; app.playerTalk = null; app.lastTop = null; app.queue = []; app.qCur = null; app.pie = null;
    if (app.world) app.world.dispose();
    app.world = new World3D($("world"), app.sim, {
      onInteractKey: interact,
      onPick,
      onCancel: () => { clearQueue(); renderHud(true); },
      onArrive: (id) => { const p = app.sim.places[id]; if (p.kind === "building") enterPlace(id); else toast(`📍 ${p.name}. Click it for things to do.`); },
      onRoom: () => { closePie(); renderHud(true); },
      remotePlayers: () => (app.online && app.user ? app.city.people.filter((p) => p.place) : []),
    });
    const coarse = matchMedia("(pointer: coarse)").matches;
    $("h-joy").hidden = !coarse;
    $("hud").classList.toggle("touch", coarse);
    app.last = performance.now();
    cancelAnimationFrame(app.raf);
    app.raf = requestAnimationFrame(loop);
    renderHud(true);
    if (app.online && app.user) { refreshCity(state.city); pollInbox(); }
  }
  function stopGame() {
    cancelAnimationFrame(app.raf);
    if (app.world) { app.world.dispose(); app.world = null; }
  }
  function loop(now) {
    app.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - app.last) / 1000);
    app.last = now;
    const sim = app.sim;
    if (!sim || !app.world) return;
    const paused = app.playerTalk || !$("m-menu").hidden || !$("m-help").hidden || !$("m-confirm").hidden;
    if (!paused) sim.tick(dt);
    app.world.update(dt, dt);
    // Arriving by ride takes you straight inside.
    if (app.rideWas && !sim.s.ride && sim.s.place) { const p = sim.places[sim.s.place]; if (p && p.kind === "building") enterPlace(sim.s.place, true); }
    app.rideWas = !!sim.s.ride;
    runQueue();
    app.hudT += dt; app.saveT += dt; app.pollT += dt;
    if (app.hudT > 0.2) { app.hudT = 0; renderHud(); }
    if (app.saveT > 15) { app.saveT = 0; persist(); }
    if (app.pollT > 20 && app.online && app.user) { app.pollT = 0; refreshCity(sim.s.city); pollInbox(); }
    if (sim.s.over) { persist(true); show("screen-end"); renderEnd(); }
  }
  async function persist(now) {
    const sim = app.sim;
    if (!sim) return;
    if (!(app.online && app.user)) { sim.takeNews(); store.set(GUEST_KEY, sim.s); return; }
    const news = sim.takeNews();
    const r = await api("PUT", "save", { state: sim.s, news });
    if (r.status === 401) return sessionLost();
    if (!r.ok && news.length) (sim.s.news = sim.s.news || []).push(...news);
    void now;
  }
  async function pollInbox() {
    const r = await api("GET", "inbox");
    if (r.status === 401) return sessionLost();
    if (!r.ok || !r.data.items.length || !app.sim) return;
    app.sim.applyInbox(r.data.items);
    await api("POST", "inbox", { upTo: Math.max(...r.data.items.map((i) => i.id)) });
  }
  function sessionLost() { toast("You've been logged out. Log in again to keep playing."); app.user = null; showLanding(); }

  // ------------------------------------------------------------------ interaction queue
  // Like The Sims: what you pick goes in a queue; your Sim walks over and does
  // each thing in turn. Tapping a queued item cancels it.
  function enqueue(item) {
    if (app.queue.length >= 6) { toast("Your queue is full. Let your Sim finish first."); return; }
    app.queue.push(item);
    runQueue();
    renderQueue();
  }
  function clearQueue() { app.queue = []; app.qCur = null; }
  function runQueue() {
    const sim = app.sim, w = app.world;
    if (!sim || !w) return;
    const s = sim.s;
    if (app.qCur || !app.queue.length || s.activity || s.event || s.convo || s.ride || s.over || app.playerTalk) return;
    const it = app.queue.shift();
    app.qCur = it;
    const done = () => { if (app.qCur === it) app.qCur = null; renderHud(true); };
    try {
      it.go(done);
      if (w.walk) w.walk.onCancel = done;
    } catch (e) { console.error(e); done(); }
    renderQueue();
  }
  function lastLog() { return app.sim.s.log[0] ? app.sim.s.log[0].text : "Not right now."; }
  function startAction(id) {
    const sim = app.sim;
    if (id === "wardrobe") { openPanel("bag"); return; }
    if (id === "exit") { app.world.exitRoom(); return; }
    if (id === "buymode") { openPanel("buy"); return; }
    const before = sim.s.log[0];
    if (!sim.start(id) && sim.s.log[0] !== before) toast(lastLog(), "bad");
  }
  // Use something: walk to the object that offers it, then do it.
  function queueAction(id, obj) {
    const sim = app.sim, w = app.world, a = sim.actionDef(id) || { name: id === "exit" ? "Leave" : id === "wardrobe" ? "Change outfit" : id, icon: id === "exit" ? "🚪" : "👗" };
    const s = sim.s;
    if (w.interior && w.room && !obj) obj = w.room.objects.find((o) => o.act.includes(id));
    const label = a.name;
    if (obj) { enqueue({ icon: a.icon, label, go: (done) => w.walkToObject(obj, () => { startAction(id); done(); }) }); return; }
    const pl = s.place && sim.places[s.place];
    if (pl && pl.kind === "open" && !w.interior) {
      enqueue({ icon: a.icon, label, go: (done) => {
        const p = w.player.position;
        const go = () => { if (!(s.place === pl.id && s.inside)) sim.enter(pl.id); startAction(id); done(); };
        if (Math.hypot(p.x - pl.spot.x, p.z - pl.spot.z) > 6) w.goTo(pl.spot.x, pl.spot.z, go, { run: true }); else go();
      } });
      return;
    }
    enqueue({ icon: a.icon, label, go: (done) => { startAction(id); done(); } });
  }
  function queueSocial(pid, sid) {
    const sim = app.sim, w = app.world;
    const so = sid === "ask" ? { name: "Deep talk", icon: "🎲" } : SIMS.SOCIALS[sid];
    const who = sim.who(pid);
    enqueue({ icon: so.icon, label: `${so.name} · ${who ? who.name : ""}`, go: (done) => w.walkToPerson(pid, (ok) => {
      if (!ok) { toast(`${who ? who.name : "They"} moved away.`); done(); return; }
      const before = sim.s.log[0];
      if (!sim.startSocial(pid, sid) && sim.s.log[0] !== before) toast(lastLog(), "bad");
      done();
    }) });
  }
  function queueVisit(id) {
    const p = app.sim.places[id];
    enqueue({ icon: p.icon, label: p.kind === "building" ? `Go into ${p.id === "home" ? "your flat" : p.name}` : `Go to ${p.name}`, go: (done) => app.world.walkTo(id, () => { if (p.kind === "building") enterPlace(id); else { app.sim.enter(id); toast(`${p.icon} ${p.name}. Click it for things to do.`); } done(); }) });
  }
  function enterPlace(id, quiet) {
    const sim = app.sim;
    if (!sim.enter(id)) { renderHud(true); toast(lastLog(), "bad"); return false; }
    const p = sim.places[id];
    if (p.kind === "building") {
      app.world.enterRoom(id);
      if (!quiet) toast(id === "home" ? "🏠 Home sweet home. Click your bed, kitchen, TV, mirror or desk. Use 🛋️ Buy to upgrade." : `${p.icon} ${p.name}. Click people and things to interact.`);
    }
    renderHud(true);
    return true;
  }
  // E key and the ✋ button open the menu for whatever is closest.
  function interact() {
    const sim = app.sim, world = app.world;
    if (!sim || !world || sim.s.event || sim.s.convo || app.playerTalk) return;
    if (app.pie) { closePie(); return; }
    const t = world.target;
    if (!t) return;
    const sp = world.screenOf(t.x, 2.2, t.z);
    const pick = t.kind === "object" ? { kind: "object", obj: t.obj } : t.kind === "player" ? { kind: "player", id: t.id } : { kind: t.kind, id: t.id };
    openPie(pick, sp.x, sp.y);
  }
  function onPick(pick, x, y) {
    const sim = app.sim, w = app.world, s = sim.s;
    if (s.event || s.convo || app.playerTalk || s.over) return;
    if (app.pie) { closePie(); return; }
    if (pick.kind === "ground") {
      if (s.ride) return;
      if (s.activity && s.activity.id === "sleep") { toast("😴 You're asleep. Tap Stop to wake up."); return; }
      clearQueue();
      if (s.activity) sim.cancelActivity();
      w.goTo(pick.x, pick.z, null);
      renderHud(true);
      return;
    }
    openPie(pick, x, y);
  }

  // ------------------------------------------------------------------ pie menus
  function objectActions(obj) {
    const sim = app.sim, s = sim.s, placeId = s.place;
    const here = placeId ? sim.actionsAt(placeId).map((x) => x.id) : [];
    return obj.act.filter((id) => {
      if (["exit", "wardrobe"].includes(id)) return true;
      if (["christmas_lunch", "confess", "crossover"].includes(id)) return here.includes(id);
      return !!sim.actionDef(id);
    }).map((id) => {
      if (id === "exit") return { id, icon: "🚪", label: "Leave", why: null };
      if (id === "wardrobe") return { id, icon: "👗", label: "Change outfit", why: null };
      const a = sim.actionDef(id);
      let why = placeId ? sim.blocked(id, placeId) : "Go inside first";
      if (id === "sleep" && placeId === "hotel" && s.flags.hotelNight !== sim.day()) why = "Book a night at reception";
      if (why === "You're busy") why = null; // it will wait in the queue
      const cost = placeId ? sim.actionCost(id, placeId) : 0;
      const bits = [];
      if (cost) bits.push(naira(cost));
      if (a.gig) bits.push(`earn ~${naira(a.gig)}`);
      if (id === "sleep") bits.push("until rested"); else if (a.mins) bits.push(S.fmtMins(a.mins));
      return { id, icon: a.icon, label: a.name, why, note: bits.join(" · ") };
    });
  }
  function openPie(pick, x, y) {
    const sim = app.sim, s = sim.s, w = app.world;
    let title = "", sub = "", head = "", items = [];
    if (pick.kind === "person") {
      const who = sim.who(pick.id), st = sim.whoState(pick.id);
      if (!who || !st) return;
      title = who.name;
      const romanceable = !!(sim.npcDef(pick.id) && who.romance && !who.family);
      sub = `${who.role ? who.role + " · " : ""}${sim.relLevel(pick.id)}${st.mood && st.mood.until > s.t ? " · 😠 upset" : ""}`;
      head = `<div class="pie-bars"><span>❤️</span><i class="bar"><b style="width:${Math.round(st.rel)}%"></b></i>${romanceable ? `<span>💞</span><i class="bar pink"><b style="width:${Math.round(st.romance || 0)}%"></b></i>` : ""}</div>`;
      const opts = sim.socialOptions(pick.id);
      const cats = [...new Set(opts.map((o) => o.cat))];
      items = cats.map((c) => ({ icon: SIMS.SOCIAL_CATS[c].icon, label: SIMS.SOCIAL_CATS[c].name, cat: c, sub: opts.filter((o) => o.cat === c).map((o) => ({ icon: o.icon, label: o.name, why: o.why, run: () => queueSocial(pick.id, o.sid) })) }));
      const face = memo("bust", who.look);
      head = `<div class="pie-face">${face}</div>` + head;
    } else if (pick.kind === "player") {
      title = "@" + pick.id; sub = "Real player";
      items = [{ icon: "💬", label: "Talk", run: () => enqueue({ icon: "💬", label: `Talk to @${pick.id}`, go: (done) => w.walkToPerson("p:" + pick.id, () => { openPlayer(pick.id); done(); }) }) }];
    } else if (pick.kind === "object") {
      const o = pick.obj;
      title = `${o.icon || ""} ${o.label || ""}`.trim();
      if (o.furniture && sim.s.place === "home") { const t = sim.furnitureTier(o.furniture); sub = t >= 0 ? SIMS.FURNITURE[o.furniture].tiers[t].name : ""; }
      items = objectActions(o).map((a) => ({ icon: a.icon, label: a.label, why: a.why, note: a.note, run: () => queueAction(a.id, o) }));
      if (o.furniture && sim.s.place === "home") items.push({ icon: "🛋️", label: "Upgrade (Buy mode)", run: () => openPanel("buy") });
    } else if (pick.kind === "place") {
      const p = sim.places[pick.id];
      if (!p) return;
      const T = W.TYPES[p.type];
      const open = W.isOpen(p.type, s.t) || T.hours === null;
      title = `${p.icon} ${p.id === "home" ? "Your Flat" : p.name}`;
      sub = T.hours ? `${open ? "🟢 Open" : "🔴 Closed"} · ${S.clock(T.hours[0]).label}–${S.clock(T.hours[1] % 1440).label}` : "Open 24 hours";
      if (p.kind === "building") {
        items.push({ icon: p.id === "home" ? "🏠" : "🚪", label: p.id === "home" ? "Go home" : "Go inside", run: () => queueVisit(p.id) });
      } else {
        const outdoor = (SIMS.OUTDOOR[p.type] || []).flatMap((o) => o.act);
        const here = sim.actionsAt(p.id).map((x) => x.id);
        [...new Set([...outdoor.filter((id) => id !== "crossover" || here.includes("crossover"))])].forEach((id) => {
          const a = sim.actionDef(id);
          if (!a) return;
          let why = sim.blocked(id, p.id);
          if (why === "You're busy") why = null;
          const cost = sim.actionCost(id, p.id);
          items.push({ icon: a.icon, label: a.name, why, note: [cost ? naira(cost) : "", a.gig ? `earn ~${naira(a.gig)}` : "", a.mins ? S.fmtMins(a.mins) : ""].filter(Boolean).join(" · "), run: () => {
            enqueue({ icon: a.icon, label: a.name, go: (done) => w.walkTo(p.id, () => { if (!(s.place === p.id && s.inside)) sim.enter(p.id); startAction(id); done(); }) });
          } });
        });
      }
      items.push({ icon: "🚶🏾", label: "Walk here", run: () => { clearQueue(); w.walkTo(p.id, () => { if (p.kind !== "building") sim.enter(p.id); }); } });
    } else if (pick.kind === "self") {
      title = s.name; const e = sim.emotion(); sub = `${e.icon} ${e.intensity}${e.name}`;
      const canChange = s.place === "home" || ["hotel", "fashion", "mall", "family"].includes(sim.places[s.place] && sim.places[s.place].type);
      items.push({ icon: "📸", label: "Take a selfie and post", why: s.activity || s.ride ? "Busy" : null, run: () => { sim.log("📸" + sim.post(s.place || "home"), "good"); renderHud(true); } });
      items.push({ icon: "📱", label: "Check phone", run: () => openPanel("phone") });
      items.push({ icon: "👗", label: "Change outfit", why: canChange ? null : "At home, a hotel or a store", run: () => openPanel("bag") });
      const P = sim.P, ab = sim.abilityBlocked();
      items.push({ icon: P.ability.icon, label: P.ability.name, why: ab, run: () => { sim.useAbility(); renderHud(true); } });
      Object.entries(s.inventory).filter(([k, n]) => n > 0 && W.ITEMS[k] && W.ITEMS[k].kind === "food").slice(0, 2).forEach(([k]) => items.push({ icon: W.ITEMS[k].icon, label: `Eat ${W.ITEMS[k].name.toLowerCase()}`, run: () => { sim.equipItem(k); renderHud(true); } }));
      items.push({ icon: "👤", label: "My Sim", run: () => openPanel("me") });
      if (s.place === "home" && s.inside) items.push({ icon: "🛋️", label: "Buy mode", run: () => openPanel("buy") });
    }
    if (!items.length) return;
    app.pie = { pick, x, y, title, sub, head, items, cat: null };
    renderPie();
  }
  function closePie() { app.pie = null; const el = $("pie"); el.hidden = true; el.innerHTML = ""; }
  function renderPie() {
    const pie = app.pie, el = $("pie");
    if (!pie) { closePie(); return; }
    const list = pie.cat ? pie.items.find((i) => i.cat === pie.cat).sub : pie.items;
    const n = list.length + (pie.cat ? 1 : 0);
    const vw = window.innerWidth, vh = window.innerHeight;
    const narrow = vw < 560;
    const r = narrow ? Math.min(118, 82 + n * 5) : Math.min(170, 100 + n * 8);
    const cx = Math.max(r + (narrow ? 70 : 100), Math.min(vw - r - (narrow ? 70 : 100), pie.x));
    const cy = Math.max(r + (narrow ? 70 : 105), Math.min(vh - r - (narrow ? 90 : 70), pie.y));
    let html = `<div class="pie-back" data-pie="close"></div><div class="pie-wheel" style="left:${cx}px;top:${cy}px">`;
    html += `<div class="pie-center">${pie.cat ? "" : pie.head || ""}<b>${esc(pie.cat ? SIMS.SOCIAL_CATS[pie.cat].icon + " " + SIMS.SOCIAL_CATS[pie.cat].name : pie.title)}</b>${pie.sub && !pie.cat ? `<small>${esc(pie.sub)}</small>` : ""}</div>`;
    const all = pie.cat ? [{ icon: "‹", label: "Back", back: true }, ...list] : list;
    all.forEach((it, i) => {
      const ang = -Math.PI / 2 + (i / all.length) * Math.PI * 2;
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r * (narrow ? 1.12 : 0.92);
      html += `<button class="pie-item${it.back ? " back" : ""}${it.cat ? " cat" : ""}" data-pi="${i}" ${it.why ? `aria-disabled="true" title="${esc(it.why)}"` : ""} style="transform:translate(calc(${x.toFixed(1)}px - 50%), calc(${y.toFixed(1)}px - 50%))"><span class="pie-ic">${it.icon}</span><span class="pie-l">${esc(it.label)}${it.why ? `<small class="why">${esc(it.why)}</small>` : it.note ? `<small>${esc(it.note)}</small>` : ""}</span></button>`;
    });
    html += `</div>`;
    el.innerHTML = html;
    el.hidden = false;
    el.dataset.n = all.length;
  }
  function pieClick(e) {
    const pie = app.pie;
    if (!pie) return;
    const b = e.target.closest("[data-pi], [data-pie]");
    if (!b) return;
    if (b.dataset.pie === "close") { closePie(); return; }
    const list = pie.cat ? [{ back: true }, ...pie.items.find((i) => i.cat === pie.cat).sub] : pie.items;
    const it = list[Number(b.dataset.pi)];
    if (!it) return;
    if (it.back) { pie.cat = null; renderPie(); return; }
    if (it.cat) { pie.cat = it.cat; renderPie(); return; }
    if (it.why) { toast(it.why, "bad"); return; }
    closePie();
    it.run();
    renderHud(true);
  }

  // ------------------------------------------------------------------ HUD
  function needBar(k, v) {
    const n = NEEDS[k];
    const cls = v >= 55 ? "" : v >= 30 ? "mid" : "lo";
    return `<div class="need" title="${n.label} ${Math.round(v)}"><span>${n.icon}</span><div class="bar ${cls}"><i style="width:${Math.round(v)}%"></i></div></div>`;
  }
  function fxSummary(o) {
    const bits = [];
    if (o.cost) bits.push(`−${naira(o.cost)}`);
    if (o.usd) bits.push(`−$${o.usd}`);
    if (o.fx) bits.push(Object.entries(o.fx).map(([k, v]) => `${(NEEDS[k] || D.NEEDS[k]).icon}${v > 0 ? "+" : ""}${v}`).join(" "));
    [["clout", "📱"], ["rep", "🤝🏾"], ["conn", "🔗"], ["followers", "👥"]].forEach(([k, i]) => { if (o[k]) bits.push(`${i}${o[k] > 0 ? "+" : ""}${o[k]}`); });
    if (o.mins) bits.push(`⏱ ${S.fmtMins(o.mins)}`);
    if (o.note) bits.push(o.note);
    return bits.join(" · ");
  }
  function renderHud(force) {
    const sim = app.sim;
    if (!sim) return;
    const s = sim.s, c = sim.clock();
    $("h-sun").textContent = c.night ? "🌙" : c.hh < 8 ? "🌅" : "☀️";
    $("h-time").textContent = `${c.weekday.slice(0, 3)} ${c.day} Dec · ${c.label}`;
    document.querySelectorAll("#h-speed button").forEach((b) => b.classList.toggle("sel", Number(b.dataset.speed) === s.speed && !s.activity && !s.ride));
    const emo = sim.emotion();
    $("h-mood").innerHTML = `${emo.icon} <b>${emo.intensity}${emo.name}</b>`;
    $("h-mood").className = "hud-mood";
    $("h-mood").style.color = emo.color;
    $("h-emo").textContent = emo.icon;
    $("h-emo").style.background = emo.color;
    $("h-live").hidden = !(app.online && app.user);
    $("h-online").textContent = app.city.online.toLocaleString();
    $("h-naira").textContent = naira(s.naira);
    $("h-naira").classList.toggle("neg", s.naira < 0);
    $("h-usd").textContent = s.usd ? ` · $${Math.round(s.usd).toLocaleString()}` : "";
    setTicker($("h-ticker"), app.online && app.user && app.city.feed.length ? app.city.feed.map((f) => f.text) : [W.phase(c.day).name + ": " + W.phase(c.day).blurb, ...HEADLINES]);
    const qhtml = sim.quests().map((q) => `<div class="quest${q.done ? " done" : ""}"><span class="qi">${q.icon}</span><div><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></div></div>`).join("");
    if ($("h-quests").dataset.html !== qhtml) { $("h-quests").innerHTML = qhtml; $("h-quests").dataset.html = qhtml; }
    // Me corner.
    const faceKey = JSON.stringify(s.look);
    if ($("h-face").dataset.k !== faceKey) { $("h-face-svg").innerHTML = memo("bust", s.look); $("h-face").dataset.k = faceKey; }
    $("h-face").style.setProperty("--ring", sim.mood() >= 55 ? "var(--mint)" : sim.mood() >= 30 ? "var(--gold)" : "var(--coral)");
    const nh = Object.keys(NEEDS).map((k) => needBar(k, s.needs[k])).join("");
    if ($("h-needs").dataset.html !== nh) { $("h-needs").innerHTML = nh; $("h-needs").dataset.html = nh; }
    const mls = sim.moodlets().sort((a, b) => b.w - a.w).slice(0, 7);
    const mh = mls.map((m) => `<span class="ml" style="--c:${SIMS.EMOTIONS[m.emotion].color}" title="${esc(m.label)} · ${esc(SIMS.EMOTIONS[m.emotion].name)} +${m.w}${m.until ? ` · ${S.fmtMins(Math.max(1, Math.round(m.until - s.t)))} left` : ""}">${m.icon}</span>`).join("") + `<span class="mini-stats"><span title="Clout">📱 ${Math.round(s.clout)}</span><span title="Reputation">🤝🏾 ${Math.round(s.rep)}</span><span title="Connections">🔗 ${Math.round(s.conn)}</span><span title="Followers">👥 ${compact(s.followers)}</span></span>`;
    if ($("h-moodlets").dataset.html !== mh) { $("h-moodlets").innerHTML = mh; $("h-moodlets").dataset.html = mh; }
    const pl = s.place && sim.places[s.place];
    $("h-here").hidden = !(pl && (s.inside || pl.kind === "open") && !s.ride);
    $("h-buy").hidden = !(s.place === "home" && s.inside);
    const P = sim.P, why = sim.abilityBlocked();
    $("h-ability").textContent = `${P.ability.icon} ${P.ability.name}`;
    $("h-ability").disabled = !!why;
    $("h-ability").title = why || P.ability.desc;
    // Next event.
    const nx = sim.nextEvent();
    $("h-next").innerHTML = nx ? `<span class="ni">${W.TYPES[nx.place].icon}</span><div><small>Next: ${esc(nx.name)}</small><b>${esc(nx.label)}</b></div>` : "";
    $("h-next").hidden = !nx;
    // Phone badge.
    const unread = s.phone.unread;
    [$("h-unread"), $("h-unread2")].forEach((b) => { b.hidden = !unread; b.textContent = unread > 9 ? "9+" : unread; });
    // Activity or ride progress.
    const a = s.activity || s.ride;
    $("h-activity").hidden = !a || (!!app.panel && window.innerWidth < 640);
    if (a) {
      const total = a.end - a.start, done = Math.max(0, s.t - a.start);
      $("act-icon").textContent = a.icon;
      $("act-label").textContent = s.ride ? `${a.name} to ${sim.placeName(a.to)}` : `${a.label}…`;
      $("act-fill").style.width = `${Math.min(100, (done / total) * 100)}%`;
      $("act-left").textContent = `${S.fmtMins(Math.max(1, Math.ceil(a.end - s.t)))} left`;
      $("act-stop").hidden = !!s.ride;
    }
    // Interact button.
    const t = app.world && app.world.target;
    $("h-interact").hidden = !t || !$("hud").classList.contains("touch");
    renderQueue();
    // Announce new log lines.
    announce();
    renderEvent();
    renderDialog();
    if (force || app.panel === "place" || app.panel === "me" || app.panel === "buy") refreshPanel();
  }
  // The action queue, top to bottom: what you're doing, walking to, then next.
  function renderQueue() {
    const sim = app.sim;
    if (!sim || app.pressing) return;
    const s = sim.s;
    const parts = [];
    if (s.activity) {
      const pct = Math.min(100, Math.max(0, ((s.t - s.activity.start) / Math.max(1, s.activity.end - s.activity.start)) * 100));
      parts.push(`<button class="qi now" data-q="act" title="${esc(s.activity.label)} · tap to stop" style="--p:${pct.toFixed(0)}%"><span>${s.activity.icon}</span></button>`);
    }
    if (app.qCur) parts.push(`<button class="qi walk" data-q="cur" title="${esc(app.qCur.label)} · tap to cancel"><span>${app.qCur.icon}</span><i>🚶🏾</i></button>`);
    app.queue.forEach((it, i) => parts.push(`<button class="qi" data-q="${i}" title="${esc(it.label)} · tap to cancel"><span>${it.icon}</span></button>`));
    const html = parts.join("");
    const el = $("h-queue");
    el.hidden = !html;
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
  }
  function compact(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + "m" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n)); }
  function announce() {
    const log = app.sim.s.log;
    if (!log.length) return;
    const top = log[0].t + "|" + log[0].text;
    if (app.lastTop && app.lastTop !== top) {
      const i = log.findIndex((l) => l.t + "|" + l.text === app.lastTop);
      const fresh = i === -1 ? log.slice(0, 2) : log.slice(0, i);
      const pick = fresh.find((l) => l.type === "achieve") || fresh.find((l) => l.type !== "day" && l.type !== "info") || fresh[0];
      if (pick) toast(pick.text.length > 160 ? pick.text.slice(0, 157) + "…" : pick.text, pick.type);
    }
    app.lastTop = top;
  }

  // ------------------------------------------------------------------ events and dialogue
  function renderEvent() {
    if (app.pressing) return;
    const sim = app.sim, ev = sim.s.event;
    const showIt = !!ev && !sim.s.convo;
    $("m-event").hidden = !showIt;
    if (!showIt) { $("m-event").dataset.k = ""; return; }
    const key = ev.title + ev.text + ev.choices.length;
    if ($("m-event").dataset.k === key) return;
    $("m-event").dataset.k = key;
    $("ev-icon").textContent = ev.icon;
    $("ev-title").textContent = ev.title;
    $("ev-text").textContent = ev.text;
    $("ev-choices").innerHTML = ev.choices.map((c, i) => {
      const ok = sim.canChoose(c);
      const sum = fxSummary(c);
      return `<button class="btn" data-choice="${i}" ${ok ? "" : "disabled"}>${esc(c.label)}${sum || !ok ? `<small>${esc(sum)}${ok ? "" : " · can't afford"}</small>` : ""}</button>`;
    }).join("");
  }
  function renderDialog() {
    if (app.pressing) return;
    const sim = app.sim, c = sim.s.convo, pt = app.playerTalk;
    $("dialog").hidden = !c && !pt;
    if (!c && !pt) { $("dialog").dataset.k = ""; return; }
    let key, face, name, rel, text, opts;
    if (pt) {
      const p = pt.info;
      key = "p" + pt.username + pt.text + p.progress + p.state + pt.busy;
      face = memo("bust", p.look); name = "@" + p.username;
      rel = `Real player · says they're a ${D.PERSONAS[p.persona].name} · ${p.online ? "🟢 online" : "away"}`;
      text = pt.text;
      opts = [{ id: "gist", label: "💬 Gist" }];
      if (p.progress < 100) opts.push({ id: "investigate", label: `🕵🏾 Dig into their story (${p.progress}%)` });
      if (p.progress >= 100 && !p.state) opts.push({ id: "protect", label: "🤐 Keep their secret" }, { id: "expose", label: "📣 Expose them" });
      opts.push({ id: "bye", label: "👋 Bye" });
      opts = opts.map((o) => ({ ...o, why: pt.busy && o.id !== "bye" ? "…" : null }));
    } else {
      const who = sim.who(c.id), st = sim.whoState(c.id);
      key = c.id + c.text + c.node + JSON.stringify(sim.convoOptions().map((o) => o.id));
      face = memo("bust", who.look);
      name = who.name;
      const known = who.secret && st.secret >= 100 ? " · 🕵🏾 you know their secret" : who.secret && st.secret > 0 ? ` · 🕵🏾 ${Math.round(st.secret)}%` : "";
      rel = `${who.role ? who.role + " · " : ""}${sim.relLevel(c.id)} · ❤️ ${Math.round(st.rel)}${st.romance ? ` · 💞 ${Math.round(st.romance)}` : ""}${known}`;
      text = c.text;
      opts = sim.convoOptions();
    }
    if ($("dialog").dataset.k === key) return;
    $("dialog").dataset.k = key;
    $("dlg-face").innerHTML = face;
    $("dlg-name").textContent = name;
    $("dlg-rel").textContent = rel;
    $("dlg-text").textContent = text;
    $("dlg-opts").innerHTML = opts.map((o) => `<button class="btn sm" data-say="${esc(o.id)}" ${o.why ? `disabled title="${esc(o.why)}"` : ""}>${esc(o.label)}</button>`).join("");
  }
  function openPlayer(username) {
    const info = app.city.people.find((p) => p.username === username);
    if (!info) return;
    app.playerTalk = { username, info, text: `@${username} is here. They look like they're having the perfect December.` };
    renderDialog();
  }
  async function playerSay(action) {
    const pt = app.playerTalk;
    if (!pt) return;
    if (action === "bye") { app.playerTalk = null; renderDialog(); return; }
    pt.busy = true; renderDialog();
    const r = await api("POST", "interact", { target: pt.username, action });
    pt.busy = false;
    if (r.status === 401) return sessionLost();
    if (!r.ok) { pt.text = r.data.error || "That didn't work."; renderDialog(); return; }
    app.sim.remoteAction(r.data);
    pt.info = { ...pt.info, progress: r.data.progress, state: r.data.state, truth: r.data.truth };
    pt.text = r.data.revealed ? `You found out: they're really a ${r.data.truth.personaName}. "${r.data.truth.secret}"` : action === "gist" ? "You gisted for a while. They seem nice… or they're good at hiding things." : action === "investigate" ? `You asked around. You now know ${r.data.progress}% of their story.` : action === "expose" ? "It's out. The whole city knows." : "You promised to keep it between you.";
    refreshCity(app.sim.s.city);
    renderDialog();
    persist();
  }

  // ------------------------------------------------------------------ panels
  function openPanel(name) { const changed = app.panel !== name; app.panel = name; if (name !== "phone") app.phoneApp = null; if (changed) { $("sheet-body").dataset.html = ""; $("sheet-body").scrollTop = 0; } refreshPanel(); if (changed) $("sheet-body").scrollTop = 0; }
  function closeSheet() { app.panel = null; $("sheet").hidden = true; }
  function refreshPanel() {
    const p = app.panel;
    // Never swap the panel's buttons out from under a press in progress.
    if (app.pressing && p && !$("sheet").hidden) return;
    $("sheet").hidden = !p;
    document.querySelectorAll("#h-nav button").forEach((b) => b.classList.toggle("sel", b.dataset.panel === p));
    if (!p) return;
    const fn = { place: panelPlace, me: panelMe, bag: panelBag, map: panelMap, phone: panelPhone, buy: panelBuy }[p];
    const [title, html] = fn();
    $("sheet-title").textContent = title;
    if ($("sheet-body").dataset.html !== html) {
      const sc = $("sheet-body").scrollTop;
      $("sheet-body").innerHTML = html;
      $("sheet-body").dataset.html = html;
      $("sheet-body").scrollTop = sc;
    }
  }

  function panelPlace() {
    const sim = app.sim, s = sim.s;
    const id = s.place;
    if (!id || !sim.places[id]) { app.panel = null; return ["", ""]; }
    const p = sim.places[id], T = W.TYPES[p.type];
    const open = W.isOpen(p.type, s.t);
    const hours = T.hours ? `${S.clock(T.hours[0]).label}–${S.clock(T.hours[1] % 1440).label}` : "Open 24 hours";
    let html = `<div class="place-head"><span class="pi">${p.icon}</span><div><b>${esc(sim.placeName(id))}</b><small>${open ? "🟢 Open" : "🔴 Closed"} · ${hours}${T.days ? " · weekdays" : ""}${T.eventOnly ? " · concert days only" : ""}</small></div></div>`;
    const here = sim.peopleAt(id);
    const players = app.online && app.user ? app.city.people.filter((x) => x.place === id) : [];
    if (here.length || players.length) {
      html += `<p class="section-title">People here</p><div class="people-row">`;
      here.forEach((pid) => {
        const who = sim.who(pid), st = sim.whoState(pid);
        html += `<button class="person-chip" data-talk="${pid}"><span class="pc-face">${memo("bust", who.look)}</span><span><b>${esc(who.name)}</b><small>${st.met ? sim.relLevel(pid) : who.role || "Stranger"}</small></span></button>`;
      });
      players.forEach((pl) => { html += `<button class="person-chip real" data-player="${esc(pl.username)}"><span class="pc-face">${memo("bust", pl.look)}</span><span><b>@${esc(pl.username)}</b><small>Real player</small></span></button>`; });
      html += `</div>`;
    }
    html += `<p class="section-title">What will you do?</p><p class="muted-sm" style="margin:0">Or click things in the room. Your Sim walks over and does it.</p><div class="actions">`;
    const list = sim.actionsAt(id);
    const w = app.world;
    if (w && w.interior && w.room && w.interiorPlace === id) {
      const have = new Set(list.map((x) => x.id));
      w.room.objects.forEach((o) => o.act.forEach((aid) => { if (!have.has(aid) && W.ACTIONS[aid] && !["christmas_lunch", "confess", "crossover"].includes(aid)) { have.add(aid); list.push({ id: aid, a: sim.actionDef(aid), why: sim.blocked(aid, id), cost: sim.actionCost(aid, id) }); } }));
    }
    list.forEach(({ id: aid, a, why, cost }) => {
      if (why === "You're busy") why = null;
      const meta = [aid === "sleep" ? "⏭ until rested" : a.mins ? `⏱ ${S.fmtMins(a.mins)}` : "instant"];
      if (cost) meta.push(`<span class="cost">${naira(cost)}</span>`);
      if (a.gig) meta.push(`<span class="cost">earn ~${naira(a.gig)}</span>`);
      if (a.fx) meta.push(Object.entries(a.fx).map(([k, v]) => `${(NEEDS[k] || D.NEEDS[k]).icon}${v > 0 ? "+" : ""}${v}`).join(" "));
      html += `<button class="act${a.premium ? " premium" : ""}" data-act="${aid}" ${why ? "disabled" : ""}><span class="at-top"><span class="at-ic">${a.icon}</span>${esc(a.name)}</span><span class="meta">${meta.join(" · ")}</span>${a.desc ? `<span class="meta">${esc(a.desc)}</span>` : ""}${why ? `<span class="why">${esc(why)}</span>` : ""}</button>`;
    });
    html += `</div>${p.kind === "building" ? `<button class="btn wide" data-leave>🚪 Leave ${esc(p.id === "home" ? "your flat" : p.name)}</button>` : ""}`;
    return [p.id === "home" ? "Your Flat" : p.name, html];
  }

  function panelMe() {
    const sim = app.sim, s = sim.s, P = sim.P;
    const ident = sim.identity();
    const goal = D.GOALS[s.goal];
    let html = `<div class="me-head"><div class="me-face">${memo("svg", s.look)}</div><div><h3>${esc(s.name)}</h3><div class="muted-sm">${P.icon} ${P.name} · ${esc(D.AREAS[s.city][s.area].name)}, ${D.CITIES[s.city].name}</div><div class="ident">${ident.icon} ${ident.name}</div><div class="muted-sm">${s.traits.map((t) => `${D.TRAITS[t].icon} ${D.TRAITS[t].name}`).join(" · ")}</div></div></div>`;
    const emo = sim.emotion();
    const mls = sim.moodlets().sort((a, b) => b.w - a.w);
    html += `<div class="emo-box" style="--c:${emo.color}"><span class="emo-big">${emo.icon}</span><div><b>${emo.intensity}${emo.name}</b><small>${esc(emoHint(emo.id))}</small></div></div>`;
    html += `<div class="moodlet-list">${mls.map((m) => `<div class="mlr" style="--c:${SIMS.EMOTIONS[m.emotion].color}"><span>${m.icon}</span><div><b>${esc(m.label)}</b><small>${SIMS.EMOTIONS[m.emotion].name} +${m.w}${m.until ? ` · ${S.fmtMins(Math.max(1, Math.round(m.until - s.t)))} left` : ""}</small></div></div>`).join("") || `<p class="muted-sm">No moodlets right now.</p>`}</div>`;
    html += `<p class="section-title">Needs</p><div class="needs-grid">${Object.keys(NEEDS).map((k) => `<div class="need-row"><span>${NEEDS[k].icon} ${NEEDS[k].label}</span><div class="bar ${s.needs[k] >= 55 ? "" : s.needs[k] >= 30 ? "mid" : "lo"}"><i style="width:${Math.round(s.needs[k])}%"></i></div></div>`).join("")}</div>`;
    html += `<p class="section-title">Skills</p><div class="skills">${Object.entries(SIMS.SKILLS).map(([k, sk]) => { const lv = sim.skill(k); return `<div class="skill" title="${esc(sk.desc)}"><span class="sk-ic">${sk.icon}</span><div><b>${sk.name} <em>Lv ${lv}</em></b><div class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < lv ? "on" : i === lv ? "part" : ""}" ${i === lv ? `style="--p:${Math.round(sim.skillProgress(k) * 100)}%"` : ""}></i>`).join("")}</div><small>${esc(sk.desc)}</small></div></div>`; }).join("")}</div>`;
    const why = sim.abilityBlocked();
    html += `<div class="ability"><b>${P.ability.icon} ${P.ability.name}</b><p>${esc(P.good)}</p><p class="muted-sm">${esc(P.bad)}</p><button class="btn primary" data-ability ${why ? "disabled" : ""}>${why ? esc(why) : "Use it"}</button></div>`;
    html += `<div class="stats4">${[["📱", "Clout", s.clout], ["🤝🏾", "Reputation", s.rep], ["🔗", "Connections", s.conn], ["👥", "Followers", compact(s.followers)]].map(([i, l, v]) => `<div class="stat"><small>${i} ${l}</small><b>${typeof v === "number" ? Math.round(v) : v}</b></div>`).join("")}</div>`;
    const rk = sim.s.persona === "ijgb" ? `$${Math.round(s.usd)}` : sim.s.persona === "aunty" ? `${s.gossip} pieces` : `${Math.round(s.res)} / 100`;
    html += `<div class="meter"><div class="meter-top"><span>${P.resource.icon} ${P.resource.label}</span><span>${rk}</span></div></div>`;
    if (s.persona === "hustler") html += `<div class="secretbox"><b>🤫 Your secret</b><p>${esc(P.secret)}</p><p class="muted-sm">${s.flags.bigbreak ? "🚀 You landed it." : `Build 70+ hustle and 55+ connections after the 15th. Hustle ${Math.round(s.res)}/70 · Connections ${Math.round(s.conn)}/55.`}</p></div>`;
    else {
      const status = s.exposed ? "😱 Exposed. Everybody knows." : s.confessed ? "🫣 You came clean. Nobody can expose you now." : `Risk of being exposed: ${Math.round(s.exposure)}%`;
      html += `<div class="secretbox"><b>🤫 Your secret</b><p>${esc(P.secret)}</p><div class="meter"><div class="meter-top"><span>${status}</span></div>${s.exposed || s.confessed ? "" : `<div class="bar secret"><i style="width:${Math.round(s.exposure)}%"></i></div>`}</div>${!s.exposed && !s.confessed && s.exposure >= 20 ? `<p class="muted-sm">You can come clean at the family house before someone else tells it.</p>` : ""}</div>`;
    }
    html += `<p class="section-title">🎯 ${goal.icon} ${goal.name}</p><p class="muted-sm" style="margin:0">${esc(goal.desc)}</p>`;
    // People.
    html += `<p class="section-title">People you know</p><div class="rel-list">`;
    W.NPCS.filter((n) => s.npcs[n.id].met).forEach((n) => {
      const st = s.npcs[n.id];
      const mem = st.memory.length ? st.memory[st.memory.length - 1].tag : null;
      const memLabel = { helped: "you helped them", lied: "you lied to them", exposed: "you exposed them", gaveMoney: "you gave them money", embarrassed: "you embarrassed them", flirted: "you flirted", ignored: "you ignored them", attended: "you showed up for them", revealedSecret: "you spread their secret", blackmailed: "you blackmailed them", protected: "you kept their secret", gifted: "you gave a gift" }[mem];
      const rom = n.romance && !n.family;
      html += `<div class="rel-row"><span class="pc-face">${memo("bust", n.look)}</span><div><b>${esc(n.name)}</b> <small>${sim.relLevel(n.id)}${memLabel ? " · remembers " + memLabel : ""}</small><div class="relbars"><span title="Friendship">❤️</span><div class="bar"><i style="width:${Math.round(st.rel)}%"></i></div>${rom ? `<span title="Romance">💞</span><div class="bar pink"><i style="width:${Math.round(st.romance)}%"></i></div>` : ""}</div>${n.secret ? `<small>${st.secret >= 100 ? "🕵🏾 " + esc(n.secret) : `What you know: ${Math.round(st.secret)}%`}</small>` : ""}</div></div>`;
    });
    const friends = s.strangers.filter((x) => x.met).sort((a, b) => b.rel - a.rel).slice(0, 8);
    friends.forEach((x) => { html += `<div class="rel-row"><span class="pc-face">${memo("bust", x.look)}</span><div><b>${esc(x.name)}</b> <small>${sim.relLevel(x.id)} · met around town</small><div class="relbars"><span>❤️</span><div class="bar"><i style="width:${Math.round(x.rel)}%"></i></div></div></div></div>`; });
    html += `</div>`;
    // Groups.
    html += `<p class="section-title">Friendship groups</p><div class="groups">`;
    Object.entries(W.GROUPS).forEach(([gid, g]) => {
      const mem = W.NPCS.filter((n) => n.group.includes(gid));
      const avg = mem.length ? mem.reduce((a, n) => a + (s.npcs[n.id].met ? s.npcs[n.id].rel : 0), 0) / mem.length : 0;
      const ok = avg >= 50;
      html += `<div class="grp ${ok ? "in" : ""}">${g.icon} ${g.name}<small>${ok ? "They accept you" : `${Math.round(avg)}/50`}</small></div>`;
    });
    html += `</div>`;
    return ["Your Sim", html];
  }

  function emoHint(id) {
    return {
      fine: "Steady. Nothing special going on.", happy: "Things land a bit better. Skills grow a little faster.", confident: "Socials succeed more often and your posts travel further.",
      flirty: "Romantic socials work much better.", energized: "Fitness and dancing skills grow faster.", playful: "Jokes and mischief land better.", focused: "Gigs pay more; hustle grows faster.",
      inspired: "Photography grows faster and posts do numbers.", tense: "Socials are harder; you're more likely to snap.", sad: "Socials, especially romance, are harder.",
      angry: "Friendly and romantic socials fail more. Mean ones hit harder.", embarrassed: "Socials are harder until it passes.", uncomfortable: "Fix your needs: socials and skills suffer.", bored: "Do something fun. Skills grow slower.",
    }[id] || "";
  }
  // Buy mode: upgrade your flat. Furniture shows up in your room right away.
  function panelBuy() {
    const sim = app.sim, s = sim.s;
    const atHome = s.place === "home" && s.inside;
    let html = `<p class="muted-sm" style="margin:0">${atHome ? "Upgrades are delivered instantly and show up in your flat." : "Go home to shop for your flat."} You have <b>${naira(s.naira)}</b>${s.usd ? ` and $${Math.round(s.usd)}` : ""}.</p>`;
    Object.entries(SIMS.FURNITURE).forEach(([k, F]) => {
      const cur = sim.furnitureTier(k);
      html += `<div class="buy-row"><div class="buy-head"><span class="bi">${F.icon}</span><div><b>${F.name}</b><small>${cur >= 0 ? "You have: " + esc(F.tiers[cur].name) : "You don't have one"}</small></div></div><div class="buy-tiers">`;
      F.tiers.forEach((t, i) => {
        const owned = i <= cur;
        const afford = sim.canAfford(t.price);
        html += `<button class="buy-tier${owned ? " owned" : ""}" data-buy="${k}" data-tier="${i}" ${owned || !atHome || !afford ? "disabled" : ""}><b>${esc(t.name)}</b><small>${esc(t.note)}</small><em>${owned ? "✓ Owned" : t.price ? naira(t.price) : "Free"}</em></button>`;
      });
      html += `</div></div>`;
    });
    return ["🛋️ Buy Mode", html];
  }

  function panelBag() {
    const sim = app.sim, s = sim.s;
    const canChange = s.place === "home" || ["hotel", "fashion", "mall", "family"].includes(sim.places[s.place] && sim.places[s.place].type) || app.world.interior;
    let html = `<p class="section-title">Wardrobe</p><p class="muted-sm" style="margin:0">${canChange ? "Pick a fit to change into." : "Change at home, the family house, a hotel or a fashion store."} Each style eats in certain places.</p><div class="wardrobe">`;
    Object.entries(D.STYLES).forEach(([k, st]) => {
      const owned = s.wardrobe.includes(k), on = s.look.style === k;
      const shines = st.shines.map((p) => W.TYPES[p] ? W.TYPES[p].icon : "").join(" ");
      html += `<button class="wcard ${on ? "on" : ""}" data-wear="${k}" ${!owned || on || !canChange ? "disabled" : ""}>${memo("svg", { ...s.look, style: k }, { noGround: true })}<b>${st.icon} ${st.name}</b><small>${on ? "Wearing" : owned ? (canChange ? "Wear this" : "Owned") : "Buy at a fashion store"}</small><small>Eats at ${shines}</small></button>`;
    });
    html += `</div><p class="section-title">Inventory</p><div class="inv">`;
    Object.entries(s.inventory).filter(([, n]) => n > 0).forEach(([k, n]) => {
      const it = W.ITEMS[k];
      if (!it) return;
      const equipped = s.equip.shoes === k || s.equip.bag === k || s.equip.jewelry === k;
      const verb = it.kind === "food" ? "Eat" : ["shoes", "bag", "jewelry"].includes(it.kind) ? (equipped ? (it.kind === "shoes" ? "Wearing" : "Take off") : "Wear") : it.kind === "business" ? "Sell" : null;
      html += `<div class="inv-item"><span class="ii">${it.icon}</span><div><b>${esc(it.name)}${n > 1 ? ` ×${n}` : ""}</b><small>${{ gift: "Give it in a conversation", ticket: "Opens the door", collectible: "A December keepsake", gear: "Messages, posts, rides", food: "Eat it anywhere", shoes: equipped ? "On your feet" : "", bag: "", jewelry: "", business: "Sell at the concert grounds or beach" }[it.kind] || ""}${it.clout ? ` · ${it.clout > 0 ? "+" : ""}${it.clout} clout` : ""}</small></div>${verb ? `<button class="btn sm" data-use="${k}" ${verb === "Wearing" ? "disabled" : ""}>${verb}</button>` : ""}</div>`;
    });
    html += `</div>`;
    return ["Bag", html];
  }

  function panelMap() {
    const sim = app.sim, s = sim.s;
    const pos = s.pos || sim.places[s.place || "home"].spot;
    const friends = W.NPCS.filter((n) => s.npcs[n.id].met && !n.vendor);
    const pp = sim.peoplePositions().filter((p) => friends.some((f) => f.id === p.id)).map((p) => ({ x: p.x, z: p.z, color: "#f2b632", label: sim.who(p.id).name }));
    let html = `<div class="map-wrap">${minimap(s.city, { me: app.world && !app.world.interior ? { x: app.world.player.position.x, z: app.world.player.position.z } : pos, sel: app.mapSel, here: s.place, people: pp })}</div>`;
    html += `<p class="muted-sm" style="margin:6px 0 0">🚦 Traffic now: <b>${sim.trafficLabel()}</b> · 🟡 friends you've met</p>`;
    const remote = ["airport"];
    html += `<div class="chips small-chips">${remote.map((id) => `<button data-mapsel="${id}" class="${app.mapSel === id ? "sel" : ""}">${sim.places[id].icon} ${esc(sim.places[id].name)}</button>`).join("")}</div>`;
    if (app.mapSel) {
      const p = sim.places[app.mapSel];
      const opts = sim.travelOptions(app.mapSel);
      html += `<p class="section-title">${p.icon} ${esc(sim.placeName(app.mapSel))} ${W.isOpen(p.type, s.t) ? "· 🟢 open" : "· 🔴 closed now"}</p><div class="rides">`;
      opts.forEach((o) => {
        const slow = o.mins > o.base * 1.4;
        html += `<button class="ride" data-ride="${o.mode}" ${o.why ? "disabled" : ""}><span class="ri">${o.icon}</span><b>${o.name}</b><small>${slow ? `<s>${o.base} min</s> ` : ""}${o.mins} min${o.cost ? ` · ${naira(o.cost)}` : o.mode === "walk" ? " · free" : ""}${o.risky ? " · risky" : ""}</small>${o.why ? `<small class="why">${esc(o.why)}</small>` : ""}</button>`;
      });
      html += `</div>`;
    } else html += `<p class="muted-sm">Tap a place to see how to get there.</p>`;
    return ["Map", html];
  }

  function panelPhone() {
    const sim = app.sim, s = sim.s;
    const a = app.phoneApp;
    if (!a) {
      const apps = [["chats", "💬", "WhatsApp", s.phone.unread], ["gram", "📸", "Gram"], ["bank", "🏦", "Bank"], ["ride", "🚗", "Ride"], ["calendar", "📅", "Calendar"], ["missions", "🎯", "Missions"]];
      return ["Phone", `<div class="apps">${apps.map(([id, i, n, b]) => `<button class="app-icon" data-app="${id}"><span>${i}</span>${n}${b ? `<i class="badge">${b}</i>` : ""}</button>`).join("")}</div><p class="section-title">Latest</p>${s.log.slice(0, 6).map((l) => `<p class="feed-line ${l.type}"><small>${l.day} Dec · ${l.time}</small>${esc(l.text)}</p>`).join("")}`];
    }
    const back = `<button class="linkbtn" data-app="">‹ Apps</button>`;
    if (a === "chats") {
      sim.readAll();
      const threads = {};
      s.phone.messages.forEach((m) => { (threads[m.from] = threads[m.from] || []).push(m); });
      let html = back + `<div class="threads">`;
      Object.entries(threads).forEach(([from, ms]) => {
        const pending = ms.some((m) => m.choices && !m.done);
        const n = sim.npcDef(from);
        html += `<button class="thread" data-app="thread:${esc(from)}"><span class="pc-face">${n ? memo("bust", n.look) : "💬"}</span><span><b>${esc(sim.senderName(from))}</b><small>${esc(ms[0].text.slice(0, 70))}</small></span>${pending ? `<i class="badge">!</i>` : ""}</button>`;
      });
      if (!s.phone.messages.length) html += `<p class="muted-sm">No messages yet. Make friends — they'll text.</p>`;
      return ["WhatsApp", html + `</div>`];
    }
    if (a.startsWith("thread:")) {
      const from = a.slice(7);
      const ms = s.phone.messages.filter((m) => m.from === from).slice().reverse();
      let html = `<button class="linkbtn" data-app="chats">‹ Chats</button><div class="bubbles">`;
      ms.forEach((m) => {
        html += `<div class="bubble"><small>${S.clock(m.t).day} Dec · ${S.clock(m.t).label}</small>${esc(m.text)}</div>`;
        if (m.choices && !m.done) html += `<div class="replies">${m.choices.map((c, i) => `<button class="btn sm" data-reply="${m.id}" data-i="${i}" ${sim.canChoose(c) ? "" : "disabled"}>${esc(c.label)}${c.cost ? ` (−${naira(c.cost)})` : ""}</button>`).join("")}</div>`;
        if (m.done) html += `<div class="bubble mine">${esc(m.done)}</div>`;
      });
      return [sim.senderName(from), html + `</div>`];
    }
    if (a === "gram") {
      const busy = s.activity || s.ride || s.event;
      let html = back + `<div class="gram-head"><div class="pc-face big">${memo("bust", s.look)}</div><div><b>@${esc((app.user && app.user.username) || s.name.toLowerCase())}</b><small>${compact(s.followers)} followers · ${s.stats.posts} posts</small></div></div>`;
      html += `<button class="btn primary wide" data-post ${busy ? "disabled" : ""}>📸 Post from ${esc(sim.placeName(s.place || "home"))}</button>`;
      html += s.phone.posts.map((p) => `<div class="post"><b>${p.icon} ${esc(p.place)}</b><small>${S.clock(p.t).day} Dec · ❤️ ${p.likes.toLocaleString()} · +${p.gain} followers</small>${p.comments.map((c) => `<p class="${p.drama && c === p.comments[p.comments.length - 1] ? "drama" : ""}">💬 ${esc(c)}</p>`).join("")}</div>`).join("") || `<p class="muted-sm">No posts yet. The Detty Wall, the club and concerts get the most likes.</p>`;
      return ["Gram", html];
    }
    if (a === "bank") {
      let html = back + `<div class="stats4"><div class="stat"><small>Naira</small><b>${naira(s.naira)}</b></div><div class="stat"><small>Dollars</small><b>$${Math.round(s.usd).toLocaleString()}</b></div><div class="stat"><small>Today's rate</small><b>${naira(s.fx)}</b></div><div class="stat"><small>Earned</small><b>${naira(s.stats.earned)}</b></div></div>`;
      html += s.flags.loan ? `<p class="secretbox">📝 Loan due before you leave December: <b>${naira(s.flags.loan)}</b>. Repay at the bank.</p>` : "";
      html += `<p class="muted-sm">Change dollars at ${esc(sim.places.bdc.name)} (best rate) or the mall desk. ${s.persona === "ijgb" ? "As an IJGB, you can also pay in dollars anywhere when your naira runs out." : ""}</p>`;
      return ["Bank", html];
    }
    if (a === "ride") { app.panel = "map"; return panelMap(); }
    if (a === "calendar") {
      const c = sim.clock();
      let html = back + `<div class="cal">`;
      for (let d = 1; d <= 31; d++) {
        const ev = W.eventsOn(d);
        const icons = ev.map((e) => ({ concert: "🎤", owambe: "🎊", beachparty: "🏖️", christmas: "🎄", crossover: "🎆" }[e])).join("");
        html += `<div class="cal-day${d === c.day ? " today" : ""}${d < c.day ? " past" : ""}"><small>${W.WEEKDAYS[W.weekday(d)].slice(0, 2)}</small><b>${d}</b><span>${icons}</span></div>`;
      }
      html += `</div><p class="section-title">${esc(W.phase(c.day).name)}</p><p class="muted-sm">${esc(W.phase(c.day).blurb)}</p>`;
      const plans = s.plans.filter((p) => p.status === "pending");
      if (plans.length) html += `<p class="section-title">Your plans</p>` + plans.map((p) => `<p class="feed-line">📅 ${esc(sim.placeName(p.place))} · ${S.clock(p.start).weekday} ${S.clock(p.start).label}${p.npc ? " with " + esc(sim.who(p.npc).name) : ""}</p>`).join("");
      return ["Calendar", html];
    }
    if (a === "missions") {
      let html = back + sim.quests().map((q) => `<div class="quest big${q.done ? " done" : ""}"><span class="qi">${q.icon}</span><div><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></div></div>`).join("");
      const ident = sim.identity();
      html += `<p class="section-title">December reputation</p><p class="ident big">${ident.icon} ${ident.name}</p>`;
      html += `<p class="section-title">Achievements</p><div class="badges">${Object.entries(W.ACHIEVEMENTS).map(([k, a2]) => `<div class="badge ${s.achievements.includes(k) ? "" : "locked"}" title="${esc(a2.desc)}"><i>${a2.icon}</i>${a2.name}</div>`).join("")}</div>`;
      html += `<p class="section-title">Memories</p><ul class="memories">${s.memories.map((m) => `<li>${esc(m)}</li>`).join("") || "<li>None yet.</li>"}</ul>`;
      return ["Missions", html];
    }
    return ["Phone", back];
  }

  // ------------------------------------------------------------------ ending
  function renderEnd() {
    const sim = app.sim, s = sim.s, e = s.ending;
    if (!(app.online && app.user)) store.set(GUEST_KEY, s);
    $("m-event").hidden = true;
    $("e-year").textContent = D.YEAR + 1;
    $("e-name").textContent = `${(app.user ? app.user.username : s.name).toUpperCase()}'S DECEMBER`;
    $("e-ident").textContent = `December reputation: ${e.identity.icon} ${e.identity.name}`;
    $("e-title").textContent = e.title;
    $("e-scene").textContent = e.scene;
    const b = e.bio;
    $("e-bio").innerHTML = [["💰 Started", naira(b.started)], ["💰 Finished", naira(b.finished)], ["🎉 Parties attended", b.parties], ["❤️ Relationships", b.relationships], ["🤝🏾 Friends made", b.friends], ["🕵🏾 Secrets discovered", b.secrets], ["🚨 Wahalas survived", b.wahalas], ["👥 Followers", compact(b.followers)]].map(([l, v]) => `<div class="stat"><small>${l}</small><b>${v}</b></div>`).join("");
    $("e-verdict").textContent = e.verdict;
    $("e-score").textContent = e.score.toLocaleString();
    const labels = { vibes: "🔥 Vibes", clout: "📱 Clout", rep: "🤝🏾 Reputation", conn: "🔗 Connections", money: "💰 Money", memories: "📸 Memories", goal: "🎯 Goal", mission: "⭐ Mission", secrets: "🕵🏾 Secrets found", secret: "🤫 Your secret", friends: "🤝🏾 Friends", achievements: "🏆 Badges" };
    $("e-parts").innerHTML = Object.entries(e.parts).map(([k, v]) => `<div class="stat"><small>${labels[k]}</small><b>${v}</b></div>`).join("");
    const P = D.PERSONAS[s.persona];
    let truths = `<div class="row secret"><span class="ri">${P.icon}</span><div><b>You — ${P.name}</b>${esc(P.secret)} <i>${esc(e.secretText)}</i></div></div>`;
    truths += `<div class="row"><span class="ri">${W.MISSIONS[s.persona].icon}</span><div><b>${W.MISSIONS[s.persona].name}</b>${e.missionMet ? "Mission complete! +120" : "Mission not complete."}</div></div>`;
    truths += `<div class="row"><span class="ri">🎯</span><div><b>${D.GOALS[s.goal].name}</b>${e.goalMet ? "Achieved! +120" : "Not this time."}</div></div>`;
    W.NPCS.filter((n) => n.secret).forEach((n) => {
      const known = s.npcs[n.id].secret >= 100;
      truths += `<div class="row"><span class="ri">${known ? D.PERSONAS[n.persona].icon : "❓"}</span><div><b>${esc(n.name)}${known ? " — " + D.PERSONAS[n.persona].name : ""}</b>${known ? esc(n.secret) : "You never found out."}</div></div>`;
    });
    $("e-truths").innerHTML = truths;
    $("e-badges").innerHTML = Object.entries(W.ACHIEVEMENTS).map(([k, a]) => `<div class="badge ${s.achievements.includes(k) ? "" : "locked"}" title="${esc(a.desc)}"><i>${a.icon}</i>${a.name}</div>`).join("");
    $("e-mem").innerHTML = s.memories.length ? s.memories.map((m) => `<li>${esc(m)}</li>`).join("") : "<li>No memories this December. Wahala!</li>";
  }
  function biographyText() {
    const s = app.sim.s, e = s.ending, b = e.bio;
    return `${(app.user ? app.user.username : s.name).toUpperCase()}'S DECEMBER 🎄\n💰 Started: ${naira(b.started)}\n💰 Finished: ${naira(b.finished)}\n🎉 Parties attended: ${b.parties}\n❤️ Relationships: ${b.relationships}\n🤝 Friends made: ${b.friends}\n🕵️ Secrets discovered: ${b.secrets}\n🚨 Wahalas survived: ${b.wahalas}\nDecember reputation: ${e.identity.icon} ${e.identity.name}\nFinal verdict: ${e.verdict}\n— December Wahala`;
  }
  async function restart() {
    const prev = app.sim ? app.sim.s : null;
    if (app.online && app.user) {
      const r = await api("DELETE", "save", {});
      if (!r.ok) { toast(r.data.error || "Couldn't start over. Try again."); return; }
    } else store.del(GUEST_KEY);
    closeModals();
    $("m-event").hidden = true;
    app.sim = null;
    openCreator(prev);
  }

  // ------------------------------------------------------------------ wiring
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { const t = go.dataset.go; if (t === "landing") showLanding(); else openAuth(t); return; }
    const m = e.target.closest("[data-modal]");
    if (m) { closeModals(); openModal("m-" + m.dataset.modal); return; }
    if (e.target.closest("[data-close]")) { closeModals(); return; }
  });
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m && m.id !== "m-event") m.hidden = true; }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModals(); if (app.pie) closePie(); else if (app.panel) { closeSheet(); renderHud(true); } }
    if (!app.sim || !document.getElementById("screen-game").classList.contains("active") || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "m") { app.panel === "map" ? closeSheet() : openPanel("map"); }
    if (k === "p") { app.panel === "phone" ? closeSheet() : openPanel("phone"); }
    if (k === "b" || k === "i") { app.panel === "bag" ? closeSheet() : openPanel("bag"); }
    if (k === " " && !e.repeat) { e.preventDefault(); if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); app.sim.s.speed = app.sim.s.speed ? 0 : 1; renderHud(); }
    if (["1", "2", "3"].includes(k)) app.sim.s.speed = Number(k);
  });

  $("l-city").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-city]");
    if (!b) return;
    app.landingCity = b.dataset.city;
    await refreshCity(app.landingCity);
    renderLanding();
  });
  $("btn-guest").addEventListener("click", () => {
    app.user = null;
    const saved = store.get(GUEST_KEY);
    if (saved && saved.version === 3 && !saved.over) startGame(saved);
    else openCreator(saved);
  });
  document.querySelector("#auth-form .tabs2").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) { authMode = b.dataset.mode; renderAuth(); } });
  $("auth-form").addEventListener("submit", submitAuth);
  $("f-eye").addEventListener("click", () => { const i = $("f-password"); i.type = i.type === "password" ? "text" : "password"; });
  $("f-username").addEventListener("input", (e) => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""); });

  $("c-panel").addEventListener("click", (e) => {
    const d = app.draft, L = d.look;
    const b = e.target.closest("button");
    if (!b) return;
    const field = b.closest("[data-field]");
    if (field) {
      const f = field.dataset.field, v = b.dataset.v;
      if (f === "body") { L.body = v; L.hair = Object.keys(D.HAIR[v])[0]; if (v === "woman") L.beard = null; }
      else if (f === "skin" || f === "colour") L[f] = Number(v);
      else if (f === "beard" || f === "bag") L[f] = v || null;
      else if (f === "city") { d.city = v; d.area = Object.keys(D.AREAS[v])[0]; }
      else L[f] = v;
    } else if (b.closest("[data-toggle]")) L[b.dataset.k] = !L[b.dataset.k];
    else if (b.dataset.trait) {
      const t = b.dataset.trait;
      if (d.traits.includes(t)) d.traits = d.traits.filter((x) => x !== t);
      else if (d.traits.length < 2) d.traits.push(t);
      else d.traits = [d.traits[1], t];
    } else if (b.dataset.goal) d.goal = b.dataset.goal;
    else if (b.dataset.area) d.area = b.dataset.area;
    else return;
    const scroll = $("c-panel").scrollTop;
    renderCreate();
    $("c-panel").scrollTop = scroll;
  });
  $("c-panel").addEventListener("input", (e) => { if (e.target.id === "c-name") { app.draft.name = e.target.value; const ok = stepReady(); $("c-continue").disabled = !ok; $("c-next").disabled = !ok; } });
  $("c-continue").addEventListener("click", nextStep);
  $("c-next").addEventListener("click", nextStep);
  $("c-shuffle").addEventListener("click", shuffle);
  $("c-back").addEventListener("click", () => { if (app.step > 0) { app.step--; renderCreate(); return; } if (!app.user) showLanding(); });

  // HUD controls.
  $("h-speed").addEventListener("click", (e) => { const b = e.target.closest("[data-speed]"); if (b && app.sim) { app.sim.s.speed = Number(b.dataset.speed); renderHud(); } });
  $("h-nav").addEventListener("click", (e) => { const b = e.target.closest("[data-panel]"); if (!b) return; if (app.panel === b.dataset.panel) closeSheet(); else openPanel(b.dataset.panel); renderHud(true); });
  $("h-phone-btn").addEventListener("click", () => { openPanel("phone"); app.phoneApp = "chats"; refreshPanel(); renderHud(true); });
  $("h-face").addEventListener("click", () => { openPanel("me"); renderHud(true); });
  $("h-ability").addEventListener("click", () => { app.sim.useAbility(); renderHud(true); });
  $("h-clean").addEventListener("click", () => { $("hud").classList.toggle("clean"); $("h-clean").textContent = $("hud").classList.contains("clean") ? "⌄ Show HUD" : "⌃ Clean screen"; });
  $("h-menu").addEventListener("click", () => {
    $("menu-who").textContent = app.online && app.user ? `Signed in as @${app.user.username}. Your game saves to your account automatically.` : "Playing offline as a guest. Your game saves on this device.";
    $("btn-logout").textContent = app.online && app.user ? "Log out" : "Back to the city";
    openModal("m-menu");
  });
  $("act-stop").addEventListener("click", () => { app.sim.cancelActivity(); clearQueue(); renderHud(true); });
  $("h-interact").addEventListener("click", interact);
  $("sheet-close").addEventListener("click", () => { closeSheet(); renderHud(true); });
  $("ev-choices").addEventListener("click", (e) => { const b = e.target.closest("[data-choice]"); if (b && !b.disabled) { app.sim.choose(Number(b.dataset.choice)); $("m-event").dataset.k = ""; renderHud(true); } });
  $("dlg-opts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-say]");
    if (!b || b.disabled) return;
    if (app.playerTalk) { playerSay(b.dataset.say); return; }
    app.sim.convoSay(b.dataset.say);
    $("dialog").dataset.k = "";
    renderHud(true);
  });
  $("sheet-body").addEventListener("click", (e) => {
    const sim = app.sim;
    const b = e.target.closest("button, [data-place]");
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.act) { queueAction(d.act); if (window.innerWidth < 900) closeSheet(); renderHud(true); return; }
    if (d.leave !== undefined) {
      closeSheet();
      const w = app.world;
      if (w.interior && w.room) queueAction("exit", w.room.objects.find((o) => o.k === "door"));
      else sim.leave();
      renderHud(true);
      return;
    }
    if (d.buy) { if (sim.buyFurniture(d.buy, Number(d.tier))) toast(lastLog(), "good"); refreshPanel(); renderHud(true); return; }
    if (d.talk) { closeSheet(); openPie({ kind: "person", id: d.talk }, window.innerWidth / 2, window.innerHeight / 2); return; }
    if (d.player) { openPlayer(d.player); return; }
    if (d.ability !== undefined) { sim.useAbility(); renderHud(true); return; }
    if (d.wear) { sim.wear(d.wear); refreshPanel(); return; }
    if (d.use) { sim.equipItem(d.use); refreshPanel(); renderHud(true); return; }
    if (d.place || d.mapsel) { app.mapSel = d.place || d.mapsel; refreshPanel(); return; }
    if (d.ride) {
      const to = app.mapSel;
      if (d.ride === "walk") { clearQueue(); queueVisit(to); closeSheet(); toast(`🚶🏾 Walking to ${sim.placeName(to)}…`); }
      else if (sim.travel(to, d.ride)) { app.world.leaveInterior(); closeSheet(); }
      renderHud(true);
      return;
    }
    if (d.app !== undefined) { app.phoneApp = d.app || null; if (d.app === "ride") { app.panel = "map"; } refreshPanel(); return; }
    if (d.reply) { sim.reply(d.reply, Number(d.i)); refreshPanel(); renderHud(true); return; }
    if (d.post !== undefined) { sim.log("📸" + sim.post(sim.s.place || "home"), "good"); refreshPanel(); renderHud(true); }
  });
  $("sheet-body").addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.place) { e.preventDefault(); app.mapSel = e.target.dataset.place; refreshPanel(); } });

  $("pie").addEventListener("click", pieClick);
  $("h-queue").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (!b || !app.sim) return;
    const q = b.dataset.q;
    if (q === "act") app.sim.cancelActivity();
    else if (q === "cur") { app.world.cancelWalk(); app.qCur = null; }
    else app.queue.splice(Number(q), 1);
    renderHud(true);
  });
  ["sheet", "dialog", "m-event", "pie", "h-queue"].forEach((id) => {
    $(id).addEventListener("pointerdown", () => { app.pressing = true; });
  });
  window.addEventListener("pointerup", () => { setTimeout(() => { app.pressing = false; }, 0); });
  window.addEventListener("pointercancel", () => { app.pressing = false; });

  // Joystick for touch screens.
  (function joystick() {
    const el = $("h-joy"), knob = el.querySelector(".joy-knob");
    let id = null;
    const move = (t) => {
      const r = el.getBoundingClientRect();
      let x = t.clientX - (r.left + r.width / 2), y = t.clientY - (r.top + r.height / 2);
      const m = Math.hypot(x, y), max = r.width / 2 - 10;
      if (m > max) { x = (x / m) * max; y = (y / m) * max; }
      knob.style.transform = `translate(${x}px, ${y}px)`;
      if (app.world) app.world.setJoystick(x / max, y / max);
    };
    el.addEventListener("pointerdown", (e) => { id = e.pointerId; el.setPointerCapture(id); move(e); });
    el.addEventListener("pointermove", (e) => { if (e.pointerId === id) move(e); });
    const end = () => { id = null; knob.style.transform = ""; if (app.world) app.world.setJoystick(0, 0); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  })();

  $("btn-restart").addEventListener("click", () => { closeModals(); openModal("m-confirm"); });
  $("btn-restart-yes").addEventListener("click", restart);
  $("btn-logout").addEventListener("click", async () => {
    closeModals();
    if (app.online && app.user) { await persist(true); await api("POST", "logout", {}); }
    else persist(true);
    app.user = null; app.sim = null;
    showLanding();
  });
  $("e-again").addEventListener("click", restart);
  $("e-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(biographyText()); toast("Copied! Paste it on WhatsApp or Instagram."); }
    catch (e) { toast("Couldn't copy automatically. Select the text and copy it."); }
  });
  window.addEventListener("beforeunload", () => { if (app.sim && !(app.online && app.user)) store.set(GUEST_KEY, app.sim.s); });

  if (/[?&]debug/.test(location.search)) window.__dw = app;
  boot();
})();
