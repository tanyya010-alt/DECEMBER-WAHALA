// DECEMBER WAHALA — browser UI: landing, accounts, creator, game, shared city.
/* global DATA, Game, naira, Avatar, Avatar3D, CityMap */
(function () {
  const D = window.DATA;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const GUEST_KEY = "december-wahala-guest-v2";
  const STEPS = ["Look", "Vibe", "Goal", "Who You Be", "Where You Stay"];
  const HEADLINES = [
    "🛬 Arrivals at the airport up 300% as IJGBs land",
    "⛽ Fuel queues spotted on three major roads",
    "🎊 Seventeen owambes scheduled for Saturday. In one street.",
    "💱 Dollar rate moves again. Aunties are watching closely.",
    "🎤 Detty Fest lineup confirmed for the 20th and 26th–28th",
    "🔌 NEPA promises steady light this Christmas. Nobody believes them.",
  ];

  const app = {
    online: false, user: null, game: null,
    city: { people: [], feed: [], online: 0, players: 0 },
    landingCity: "lagos", transport: "danfo", tab: "here",
    stage: null, step: 0, draft: null, saveTimer: null, pollTimer: null, lastTop: null, busy: false,
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
    if (id !== "screen-game") stopPolling();
  }
  function openModal(id) { $(id).hidden = false; }
  function closeModals() { document.querySelectorAll(".modal").forEach((m) => { if (m.id !== "m-event") m.hidden = true; }); }
  function toast(text) {
    document.querySelectorAll(".toast").forEach((n) => n.remove());
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ------------------------------------------------------------------ boot
  async function boot() {
    const r = await api("GET", "me");
    app.online = r.ok && r.data && "user" in r.data;
    if (app.online && r.data.user) {
      app.user = r.data.user;
      if (r.data.save) return startGame(r.data.save);
      return openCreator();
    }
    showLanding();
  }

  // ------------------------------------------------------------------ landing
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
    let people;
    if (app.online && app.city.people.length) {
      people = app.city.people.map((p) => ({ key: "p-" + p.username, look: p.look, label: "@" + p.username, place: p.place, homeArea: p.area, kind: "player", online: p.online }));
    } else {
      people = D.NPCS.filter((n) => !n.from).map((n, i) => ({ key: "n-" + n.id, look: n.look, label: n.name, place: n.places[i % n.places.length], kind: "npc" }));
    }
    $("landing-map").innerHTML = CityMap.render({ city, area: null, place: null, people });
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
  function openAuth(mode) {
    authMode = mode;
    show("screen-auth");
    renderAuth();
    setTimeout(() => (mode === "signup" ? $("f-name") : $("f-username")).focus(), 50);
  }
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
    app.busy = true;
    $("f-submit").disabled = true;
    const r = await api("POST", authMode, body);
    app.busy = false;
    $("f-submit").disabled = false;
    if (!r.ok) return err(r.data.error || "Something went wrong. Try again.");
    app.user = r.data.user;
    $("f-password").value = "";
    if (r.data.save) startGame(r.data.save); else openCreator();
  }

  // ------------------------------------------------------------------ creator
  function defaultLook() {
    return { body: "woman", skin: 3, hair: "knotless", hairColour: "black", style: "glam", colour: 0, fabric: "plain", shades: false, chain: true, gele: false, beard: null };
  }
  function openCreator(prev) {
    app.step = 0;
    app.draft = {
      name: app.user ? app.user.name : (prev && prev.name) || "",
      look: prev && prev.look ? { ...prev.look } : defaultLook(),
      traits: [], goal: null, city: (prev && prev.city) || "lagos", area: (prev && prev.area) || "yaba",
    };
    show("screen-create");
    const stageEl = $("c-stage");
    stageEl.querySelectorAll("canvas, svg").forEach((n) => n.remove());
    app.stage = window.THREE ? Avatar3D.mount(stageEl) : null;
    renderCreate();
  }
  function persona() { return D.personaFor(app.draft.traits, app.draft.goal); }
  function stepReady() {
    const d = app.draft;
    if (app.step === 0) return !!(app.user || d.name.trim());
    if (app.step === 1) return d.traits.length === 2;
    if (app.step === 2) return !!d.goal;
    return true;
  }
  function renderStage() {
    if (app.stage) app.stage.update(app.draft.look);
    else {
      const el = $("c-stage");
      el.querySelectorAll("svg").forEach((n) => n.remove());
      el.insertAdjacentHTML("afterbegin", Avatar.svg(app.draft.look, { label: "Your character" }));
    }
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
      html += `<div class="group"><h4>Hairstyle</h4>${chips("hair", Object.entries(D.HAIR[L.body]), L.hair)}</div>`;
      html += `<div class="group"><h4>Hair colour</h4>${swatches("hairColour", Object.entries(D.HAIR_COLOURS).map(([k, h]) => [k, h.hex, h.name]), L.hairColour)}</div>`;
      html += `<div class="group"><h4>Skin tone</h4>${swatches("skin", D.SKIN.map((h, i) => [i, h, "Skin tone " + (i + 1)]), L.skin)}</div>`;
      html += `<div class="group"><h4>Outfit</h4>${chips("style", Object.entries(D.STYLES).map(([k, s]) => [k, `${s.icon} ${s.name}`]), L.style)}<small class="muted-sm">${esc(D.STYLES[L.style].blurb)}</small></div>`;
      html += `<div class="group"><h4>Fabric</h4>${chips("fabric", Object.entries(D.FABRICS), L.fabric)}</div>`;
      html += `<div class="group"><h4>Outfit colour</h4>${L.style === "allblack" ? `<small class="muted-sm">All-black is always black. That's the point.</small>` : swatches("colour", D.OUTFIT_COLOURS.map((h, i) => [i, h, "Colour " + (i + 1)]), L.colour)}</div>`;
      const extras = [["shades", "🕶️ Shades"], ["chain", "📿 Chain"], ["gele", L.body === "woman" ? "🎀 Gele" : "🧢 Fila"]];
      html += `<div class="group"><h4>Extras</h4><div class="chips" data-toggle>${extras.map(([k, l]) => `<button type="button" data-k="${k}" class="${L[k] ? "sel" : ""}">${l}</button>`).join("")}</div></div>`;
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
      const id = persona(), P = D.PERSONAS[id];
      const st = P.start;
      const money = [naira(st.naira), st.usd ? `$${st.usd.toLocaleString()}` : null].filter(Boolean).join(" + ");
      html += `<div class="reveal"><div class="reveal-tile">${P.icon}</div><h3>${P.name}</h3><p>${esc(P.tagline)}</p></div>`;
      html += `<div class="rows">
        <div class="row"><span class="ri">💰</span><div><b>Starts with</b>${money} · 📱 ${st.clout} clout · 🔗 ${st.conn} connections</div></div>
        <div class="row"><span class="ri">${P.resource.icon}</span><div><b>Unique resource</b>${P.resource.label}</div></div>
        <div class="row"><span class="ri">✨</span><div><b>Superpower</b>${esc(P.good)}</div></div>
        <div class="row"><span class="ri">😬</span><div><b>Weakness</b>${esc(P.bad)}</div></div>
        <div class="row"><span class="ri">🎯</span><div><b>How to win</b>${esc(P.win)}</div></div>
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
    $("c-continue").disabled = !ready;
    $("c-next").disabled = !ready;
    $("c-continue").textContent = step === 1 && left ? `Choose ${left} more` : step === 2 && !d.goal ? "Pick a goal" : step === 3 ? "Choose where to stay" : step === 4 ? "Start my December 🎄" : "Continue";
    renderStage();
  }
  function shuffle() {
    const d = app.draft, pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (app.step === 0) {
      const body = pick(["woman", "man"]);
      d.look = {
        body, skin: Math.floor(Math.random() * 7), hair: pick(Object.keys(D.HAIR[body])), hairColour: pick(Object.keys(D.HAIR_COLOURS)),
        style: pick(Object.keys(D.STYLES)), colour: Math.floor(Math.random() * D.OUTFIT_COLOURS.length), fabric: pick(Object.keys(D.FABRICS)),
        shades: Math.random() < 0.4, chain: Math.random() < 0.5, gele: Math.random() < 0.2, beard: body === "man" ? pick([null, "shaped", "full"]) : null,
      };
    } else if (app.step === 1) {
      const ids = Object.keys(D.TRAITS).sort(() => Math.random() - 0.5);
      d.traits = ids.slice(0, 2);
    } else if (app.step === 2) d.goal = pick(Object.keys(D.GOALS));
    else if (app.step === 4) d.area = pick(Object.keys(D.AREAS[d.city]));
    renderCreate();
  }
  async function nextStep() {
    if (!stepReady()) return;
    if (app.step < 4) { app.step++; renderCreate(); $("c-panel").scrollTop = 0; return; }
    const d = app.draft;
    const g = Game.create({ name: app.user ? app.user.name : d.name.trim(), look: d.look, traits: d.traits, goal: d.goal, persona: persona(), city: d.city, area: d.area });
    app.game = g;
    if (app.online && app.user) {
      const r = await api("PUT", "save", { state: g.s, news: g.takeNews() });
      if (!r.ok) { toast(r.data.error || "Couldn't save your game."); return; }
    } else { g.takeNews(); store.set(GUEST_KEY, g.s); }
    startGame(g.s);
  }

  // ------------------------------------------------------------------ game
  function startGame(state) {
    app.game = new Game(state);
    app.lastTop = null;
    app.tab = "here";
    show(state.over ? "screen-end" : "screen-game");
    if (state.over) { renderEnd(); return; }
    render();
    if (app.online && app.user) { refreshCity(state.city).then(render); pollInbox(); startPolling(); }
  }
  function startPolling() {
    stopPolling();
    app.pollTimer = setInterval(async () => {
      if (document.hidden || !app.game) return;
      await refreshCity(app.game.s.city);
      await pollInbox();
      render(true);
    }, 20000);
  }
  function stopPolling() { if (app.pollTimer) clearInterval(app.pollTimer); app.pollTimer = null; }
  async function pollInbox() {
    const r = await api("GET", "inbox");
    if (r.status === 401) return sessionLost();
    if (!r.ok || !r.data.items.length) return;
    app.game.applyInbox(r.data.items);
    await api("POST", "inbox", { upTo: Math.max(...r.data.items.map((i) => i.id)) });
    persist();
  }
  function sessionLost() {
    toast("You've been logged out. Log in again to keep playing.");
    app.user = null;
    showLanding();
  }
  function persist() {
    const g = app.game;
    if (!g) return;
    if (!(app.online && app.user)) { g.takeNews(); store.set(GUEST_KEY, g.s); return; }
    clearTimeout(app.saveTimer);
    app.saveTimer = setTimeout(async () => {
      const news = g.takeNews();
      const r = await api("PUT", "save", { state: g.s, news });
      if (r.status === 401) return sessionLost();
      if (!r.ok) { (g.s.news = g.s.news || []).push(...news); toast(r.data.error || "Couldn't save. We'll try again."); }
    }, 700);
  }

  function render(quiet) {
    const g = app.game, s = g.s;
    if (s.over) { persist(); show("screen-end"); renderEnd(); return; }
    $("g-date").textContent = `${D.weekday(s.day)}, ${s.day} Dec`;
    $("g-slots").innerHTML = D.SLOTS.map((n, i) => `<span class="${i === s.slot ? "now" : i < s.slot ? "past" : ""}">${D.SLOT_ICONS[i]} ${n}</span>`).join("");
    $("g-naira").textContent = naira(s.naira);
    $("g-naira").classList.toggle("neg", s.naira < 0);
    $("g-usd").textContent = "$" + Math.round(s.usd).toLocaleString();
    $("g-fx").textContent = naira(s.fx);
    $("g-live").hidden = !app.online || !app.user;
    $("g-online").textContent = app.city.online.toLocaleString();
    const left = 31 - s.day;
    $("g-countdown").textContent = left > 0 ? `🎆 ${left} day${left > 1 ? "s" : ""} to crossover` : "🎆 Crossover night!";
    setTicker($("g-ticker"), app.online && app.user && app.city.feed.length ? app.city.feed.map((f) => f.text) : HEADLINES);

    // Map
    const people = [{ key: "me", look: s.look, label: "You", place: s.place, kind: "me" }];
    D.NPCS.forEach((n, i) => { const p = g.npcPlace(n, i); if (p) people.push({ key: "n-" + n.id, look: n.look, label: n.name, place: p, kind: "npc" }); });
    if (app.online && app.user) app.city.people.forEach((p) => people.push({ key: "p-" + p.username, look: p.look, label: "@" + p.username, place: p.place, homeArea: p.area, kind: "player", online: p.online }));
    const badges = {};
    const pending = D.pendingArrivals(s).length;
    if (pending) badges.airport = `${pending} waiting`;
    if (D.isConcertDay(s.day)) badges.venue = "LIVE";
    $("g-map").innerHTML = CityMap.render({ city: s.city, area: s.area, place: s.place, people, badges });
    const area = D.AREAS[s.city][s.area];
    $("g-transport").innerHTML = Object.entries(D.TRANSPORT).map(([k, t]) => {
      const cost = Math.round(t.cost * area.travel / 100) * 100;
      return `<button data-mode="${k}" class="${k === app.transport ? "sel" : ""}" title="${t.name}">${t.icon} ${cost ? naira(cost) : "Free"}</button>`;
    }).join("");

    renderTab();
    renderEvent();
    if (!quiet) announce();
    persist();
  }

  function announce() {
    const log = app.game.s.log;
    if (!log.length) return;
    const top = JSON.stringify(log[0]);
    if (app.lastTop) {
      const i = log.findIndex((l) => JSON.stringify(l) === app.lastTop);
      const fresh = i === -1 ? log.slice(0, 3) : log.slice(0, i);
      const ach = fresh.find((l) => l.type === "achieve");
      if (ach) toast(ach.text);
      else if (fresh[0] && fresh[0].type !== "day") toast(fresh[0].text.length > 140 ? fresh[0].text.slice(0, 137) + "…" : fresh[0].text);
    }
    app.lastTop = top;
  }

  function fxSummary(o) {
    const bits = [];
    if (o.cost) bits.push(`−${naira(o.cost)}`);
    if (o.usd) bits.push(`−$${o.usd}`);
    if (o.fx) bits.push(Object.entries(o.fx).map(([k, v]) => `${D.NEEDS[k].icon}${v > 0 ? "+" : ""}${v}`).join(" "));
    [["clout", "📱"], ["rep", "🤝🏾"], ["conn", "🔗"]].forEach(([k, i]) => { if (o[k]) bits.push(`${i}${o[k] > 0 ? "+" : ""}${o[k]}`); });
    if (o.slots) bits.push(`⏱ ${o.slots} slot${o.slots > 1 ? "s" : ""}`);
    if (o.note) bits.push(o.note);
    return bits.join(" · ");
  }

  function bar(v, cls = "") {
    const c = cls || (v >= 55 ? "" : v >= 30 ? "mid" : "lo");
    return `<div class="bar ${c}"><i style="width:${Math.max(0, Math.min(100, Math.round(v)))}%"></i></div>`;
  }

  function renderTab() {
    document.querySelectorAll("#g-tabs button").forEach((b) => b.classList.toggle("sel", b.dataset.tab === app.tab));
    ["here", "me", "wardrobe", "diary"].forEach((t) => { $("tab-" + t).hidden = t !== app.tab; });
    ({ here: renderHere, me: renderMe, wardrobe: renderWardrobe, diary: renderDiary })[app.tab]();
  }

  function renderHere() {
    const g = app.game, s = g.s;
    const placeIcon = s.place === "home" ? "🏠" : D.CITIES[s.city].places[s.place].icon;
    let html = `<div class="here-head"><span class="pi">${placeIcon}</span><div><h3>${esc(g.placeName())}</h3><small class="muted">${D.CITIES[s.city].name} · ${D.SLOTS[s.slot]} · ${s.light || s.genSlots ? "💡 Light dey" : "🔌 No light"}</small></div></div>`;
    html += `<p class="section-title">What will you do?</p><div class="actions">`;
    g.actionsHere().filter((o) => o.a.special !== "bdc").forEach(({ a, why, cost }) => {
      const meta = [a.special === "sleep" ? "⏭ till morning" : a.slots ? `⏱ ${a.slots}` : "instant"];
      if (cost) meta.push(`<span class="cost">${naira(cost)}</span>`);
      if (a.gig) meta.push(`<span class="cost">earn ~${naira(a.gig)}</span>`);
      if (a.fx) meta.push(Object.entries(a.fx).map(([k, v]) => `${D.NEEDS[k].icon}${v > 0 ? "+" : ""}${v}`).join(" "));
      html += `<button class="act${a.premium ? " premium" : ""}" data-act="${a.id}" ${why ? "disabled" : ""}><span class="at-top"><span class="at-ic">${a.icon}</span>${esc(a.name)}</span><span class="meta">${meta.join(" · ")}</span>${why ? `<span class="why">${esc(why)}</span>` : ""}</button>`;
    });
    html += `</div>`;
    if (s.place === "mall") {
      html += `<div class="bdc"><span class="muted-sm">💱 Change dollars at ${naira(s.fx)}/$:</span>${[50, 100, 500].map((v) => `<button class="btn sm" data-usd="${v}" ${s.usd < v ? "disabled" : ""}>$${v}</button>`).join("")}<button class="btn sm" data-usd="all" ${s.usd < 1 ? "disabled" : ""}>All</button></div>`;
    }

    const npcs = g.peopleHere();
    const players = app.online && app.user && s.place !== "home" ? app.city.people.filter((p) => p.place === s.place) : [];
    html += `<p class="section-title">People here</p>`;
    if (!npcs.length && !players.length) html += `<p class="muted-sm" style="margin:0">Nobody you know is here right now. Check the map — faces show where people are.</p>`;
    html += `<div class="people">`;
    npcs.forEach((n) => {
      const st = s.npcs[n.id];
      const shown = st.secret >= 100 ? D.PERSONAS[n.persona] : D.PERSONAS[n.persona === "wannabe" ? "ijgb" : n.persona];
      const status = st.state === "exposed" ? `<span class="tag bad">Exposed</span>` : st.state === "protected" ? `<span class="tag good">Secret kept</span>` : "";
      html += `<div class="pcard"><div class="pc-top"><div class="pc-face">${Avatar.bust(n.look)}</div><div><b>${esc(n.name)} <span class="tag">${shown.icon} ${shown.name}</span>${status}</b><small>${esc(n.note)}</small></div></div>`;
      html += `<div class="know"><span>Relationship</span>${bar(st.rel)}<span>What you know about them · ${Math.round(st.secret)}%</span>${bar(st.secret, "secret")}</div>`;
      if (st.secret >= 100) html += `<div class="truth">🕵🏾 ${esc(n.secret)}</div>`;
      html += `<div class="pc-btns">${g.npcActions(n.id).map((o) => `<button class="btn sm" data-npc="${n.id}" data-do="${o.id}" ${o.why ? `disabled title="${esc(o.why)}"` : ""}>${o.icon} ${o.label}${o.cost ? ` · ${naira(o.cost)}` : ""}</button>`).join("")}</div></div>`;
    });
    players.forEach((p) => {
      const P = D.PERSONAS[p.persona];
      const status = p.state === "exposed" ? `<span class="tag bad">You exposed them</span>` : p.state === "protected" ? `<span class="tag good">You kept their secret</span>` : p.exposed ? `<span class="tag bad">Exposed</span>` : "";
      html += `<div class="pcard"><div class="pc-top"><div class="pc-face">${Avatar.bust(p.look)}</div><div><b>@${esc(p.username)} <span class="tag real">Real player</span>${status}</b><small>${esc(p.name)} · says they're a ${P.icon} ${P.name} · Day ${p.day} · 📱 ${p.clout}${p.online ? " · 🟢 online" : ""}</small></div></div>`;
      html += `<div class="know"><span>What you know about them · ${p.progress}%</span>${bar(p.progress, "secret")}</div>`;
      if (p.truth) html += `<div class="truth">🕵🏾 Really a ${D.PERSONAS[p.truth.persona].name}. "${esc(p.truth.secret)}"</div>`;
      const btns = [["gist", "💬 Gist"]];
      if (p.progress < 100) btns.push(["investigate", "🕵🏾 Investigate"]);
      if (p.progress >= 100 && !p.state) btns.push(["protect", "🤐 Keep their secret"], ["expose", "📣 Expose them"]);
      html += `<div class="pc-btns">${btns.map(([a, l]) => `<button class="btn sm" data-player="${esc(p.username)}" data-do="${a}">${l}</button>`).join("")}</div></div>`;
    });
    html += `</div>`;
    $("tab-here").innerHTML = html;
  }

  function renderMe() {
    const g = app.game, s = g.s, P = g.P;
    const goal = D.GOALS[s.goal];
    const why = g.abilityBlocked();
    let html = `<div class="me-head"><div class="me-face">${Avatar.svg(s.look)}</div><div><h3>${esc(s.name)}</h3><div class="muted-sm">${P.icon} ${P.name} · ${esc(D.AREAS[s.city][s.area].name)}, ${D.CITIES[s.city].name}</div><div class="muted-sm">${s.traits.map((t) => `${D.TRAITS[t].icon} ${D.TRAITS[t].name}`).join(" · ")}</div><div class="muted-sm">🎯 ${goal.icon} ${goal.name}: ${esc(goal.desc)}</div></div></div>`;
    html += `<div class="ability"><b>${P.ability.icon} ${P.ability.name}</b><p>${esc(P.ability.desc)} (${P.ability.perDay}× a day)</p><button class="btn primary" id="btn-ability" ${why ? "disabled" : ""}>${why ? esc(why) : "Use it"}</button></div>`;
    html += Object.entries(D.NEEDS).map(([k, n]) => `<div class="meter"><div class="meter-top"><span>${n.icon} ${n.label}</span><span>${Math.round(s.needs[k])}</span></div>${bar(s.needs[k])}</div>`).join("");
    html += `<div class="stats3">${Object.entries(D.STATS).map(([k, st]) => `<div class="stat" title="${esc(st.desc)}"><small>${st.icon} ${st.label}</small><b>${Math.round(s[k])}</b></div>`).join("")}</div>`;
    const rk = g.resKey();
    const rv = rk === "usd" ? `$${Math.round(s.usd).toLocaleString()}` : rk === "gossip" ? `${s.gossip} pieces` : `${Math.round(s.res)} / 100`;
    html += `<div class="meter"><div class="meter-top"><span>${P.resource.icon} ${P.resource.label}</span><span>${rv}</span></div>${rk === "res" ? bar(s.res) : ""}</div>`;
    if (s.persona === "hustler") {
      html += `<div class="secretbox"><b>🤫 Your secret</b><p>${esc(P.secret)}</p><p>${s.flags.bigbreak ? "🚀 You landed it." : `Build 70+ hustle and 55+ connections after the 15th, and it will find you. Hustle ${Math.round(s.res)}/70 · Connections ${Math.round(s.conn)}/55.`}</p></div>`;
    } else {
      const status = s.exposed ? "😱 Exposed. Everybody knows." : s.confessed ? "🫣 You came clean. Nobody can expose you now." : `Risk of being exposed: ${Math.round(s.exposure)}%`;
      html += `<div class="secretbox"><b>🤫 Your secret</b><p>${esc(P.secret)}</p><div class="meter"><div class="meter-top"><span>${status}</span></div>${s.exposed || s.confessed ? "" : bar(s.exposure, "secret")}</div></div>`;
    }
    $("tab-me").innerHTML = html;
  }

  function renderWardrobe() {
    const s = app.game.s;
    const atHome = s.place === "home";
    let html = `<p class="muted-sm" style="margin:0">${atHome ? "Pick a fit to change into." : "Go home to change your fit."} Each style eats in certain places: matching your fit to where you are gives a clout and vibes bonus.</p><div class="wardrobe">`;
    Object.entries(D.STYLES).forEach(([k, st]) => {
      const owned = s.wardrobe.includes(k);
      const on = s.look.style === k;
      const shines = st.shines.map((p) => D.CITIES[s.city].places[p].icon).join(" ");
      html += `<button class="wcard ${on ? "on" : ""}" data-wear="${k}" ${!owned || on || !atHome ? "disabled" : ""}>${Avatar.svg({ ...s.look, style: k }, { noGround: true })}<b>${st.icon} ${st.name}</b><small>${on ? "Wearing" : owned ? (atHome ? "Wear this" : "In your wardrobe") : "Buy at the mall" + (k === "tradfusion" || k === "afrochic" ? " or market" : "")}</small><small>Eats at ${shines}</small></button>`;
    });
    html += `</div>`;
    $("tab-wardrobe").innerHTML = html;
  }

  function renderDiary() {
    const s = app.game.s;
    let html = `<p class="section-title">Memories</p>`;
    html += s.memories.length ? `<ul class="memories">${s.memories.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : `<p class="muted-sm" style="margin:0">No memories yet. Owambes, concerts, airport pickups and dates all count.</p>`;
    html += `<p class="section-title">Badges</p><div class="badges">${Object.entries(D.ACHIEVEMENTS).map(([k, a]) => `<div class="badge ${s.achievements.includes(k) ? "" : "locked"}" title="${esc(a.desc)}"><i>${a.icon}</i>${a.name}</div>`).join("")}</div>`;
    html += `<p class="section-title">Gist feed</p><ul class="feed">${s.log.slice(0, 50).map((l) => `<li class="${l.type}"><span class="when">${l.day} Dec · ${D.SLOTS[l.slot]}</span>${esc(l.text)}</li>`).join("")}</ul>`;
    $("tab-diary").innerHTML = html;
  }

  function renderEvent() {
    const g = app.game, ev = g.s.event;
    $("m-event").hidden = !ev;
    if (!ev) return;
    $("ev-icon").textContent = ev.icon;
    $("ev-title").textContent = ev.title;
    $("ev-text").textContent = ev.text;
    $("ev-choices").innerHTML = ev.choices.map((c, i) => {
      const ok = g.canChoose(c);
      const sum = fxSummary(c);
      return `<button class="btn" data-choice="${i}" ${ok ? "" : "disabled"}>${esc(c.label)}${sum || !ok ? `<small>${esc(sum)}${ok ? "" : " · can't afford"}</small>` : ""}</button>`;
    }).join("");
  }

  function renderEnd() {
    const s = app.game.s, e = s.ending;
    stopPolling();
    $("m-event").hidden = true;
    if (!(app.online && app.user)) store.set(GUEST_KEY, s);
    $("e-year").textContent = D.YEAR + 1;
    $("e-title").textContent = e.title;
    $("e-scene").textContent = e.scene;
    $("e-blurb").textContent = e.blurb;
    $("e-score").textContent = e.score.toLocaleString();
    const labels = { vibes: "🔥 Vibes", clout: "📱 Clout", rep: "🤝🏾 Reputation", conn: "🔗 Connections", money: "💰 Money", memories: "📸 Memories", goal: "🎯 Goal", secrets: "🕵🏾 Secrets found", secret: "🤫 Your secret", persona: `${D.PERSONAS[s.persona].icon} ${D.PERSONAS[s.persona].resource.label}`, achievements: "🏆 Badges" };
    $("e-parts").innerHTML = Object.entries(e.parts).map(([k, v]) => `<div class="stat"><small>${labels[k]}</small><b>${v}</b></div>`).join("");
    const P = D.PERSONAS[s.persona];
    let truths = `<div class="row secret"><span class="ri">${P.icon}</span><div><b>You — ${P.name}</b>${esc(P.secret)} <i>${esc(e.secretText)}</i></div></div>`;
    truths += `<div class="row"><span class="ri">🎯</span><div><b>${D.GOALS[s.goal].name}</b>${e.goalMet ? "Achieved! +150" : "Not this time."}</div></div>`;
    D.NPCS.forEach((n) => {
      const st = s.npcs[n.id];
      const known = st.secret >= 100;
      truths += `<div class="row"><span class="ri">${known ? D.PERSONAS[n.persona].icon : "❓"}</span><div><b>${esc(n.name)}${known ? " — " + D.PERSONAS[n.persona].name : ""}</b>${known ? esc(n.secret) : "You never found out."}</div></div>`;
    });
    $("e-truths").innerHTML = truths;
    $("e-badges").innerHTML = Object.entries(D.ACHIEVEMENTS).map(([k, a]) => `<div class="badge ${s.achievements.includes(k) ? "" : "locked"}"><i>${a.icon}</i>${a.name}</div>`).join("");
    $("e-mem").innerHTML = s.memories.length ? s.memories.map((m) => `<li>${esc(m)}</li>`).join("") : "<li>No memories this December. Wahala!</li>";
  }

  async function restart() {
    const prev = app.game ? app.game.s : null;
    if (app.online && app.user) {
      const r = await api("DELETE", "save", {});
      if (!r.ok) { toast(r.data.error || "Couldn't start over. Try again."); return; }
    } else store.del(GUEST_KEY);
    closeModals();
    $("m-event").hidden = true;
    app.game = null;
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });

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
    if (saved && saved.version === 2 && !saved.over) startGame(saved);
    else openCreator(saved);
  });

  document.querySelector("#auth-form .tabs2").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (b) { authMode = b.dataset.mode; renderAuth(); }
  });
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
      else if (f === "beard") L.beard = v || null;
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
  $("c-panel").addEventListener("input", (e) => {
    if (e.target.id === "c-name") { app.draft.name = e.target.value; const ok = stepReady(); $("c-continue").disabled = !ok; $("c-next").disabled = !ok; }
  });
  $("c-continue").addEventListener("click", nextStep);
  $("c-next").addEventListener("click", nextStep);
  $("c-shuffle").addEventListener("click", shuffle);
  $("c-back").addEventListener("click", () => {
    if (app.step > 0) { app.step--; renderCreate(); return; }
    if (!app.user) showLanding();
  });

  // Game interactions
  function act(fn) { if (!app.game || app.game.s.over) return; fn(app.game); render(); }
  $("g-map").addEventListener("click", (e) => {
    const pin = e.target.closest("[data-place]");
    if (!pin) return;
    if (pin.dataset.place === app.game.s.place) { app.tab = "here"; render(true); return; }
    act((g) => g.travel(pin.dataset.place, app.transport));
    app.tab = "here";
    renderTab();
  });
  $("g-map").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const pin = e.target.closest("[data-place]");
    if (pin) { e.preventDefault(); pin.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  $("g-transport").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (b) { app.transport = b.dataset.mode; render(true); }
  });
  $("g-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) { app.tab = b.dataset.tab; renderTab(); }
  });
  $("screen-game").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.act) act((g) => g.doAction(b.dataset.act));
    else if (b.dataset.usd) act((g) => g.exchange(b.dataset.usd === "all" ? g.s.usd : Number(b.dataset.usd)));
    else if (b.dataset.npc) act((g) => g.interact(b.dataset.npc, b.dataset.do));
    else if (b.dataset.wear) act((g) => g.wear(b.dataset.wear));
    else if (b.id === "btn-ability") act((g) => g.useAbility());
    else if (b.dataset.player) {
      if (app.busy || app.game.s.event) return;
      app.busy = true;
      b.disabled = true;
      const r = await api("POST", "interact", { target: b.dataset.player, action: b.dataset.do });
      app.busy = false;
      if (r.status === 401) return sessionLost();
      if (!r.ok) { toast(r.data.error || "That didn't work. Try again."); render(true); return; }
      app.game.remoteAction(r.data);
      await refreshCity(app.game.s.city);
      render();
    }
  });
  $("ev-choices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-choice]");
    if (b && !b.disabled) act((g) => g.choose(Number(b.dataset.choice)));
  });
  $("g-menu").addEventListener("click", () => {
    $("menu-who").textContent = app.online && app.user ? `Signed in as @${app.user.username}. Your game saves to your account after every move.` : "Playing offline as a guest. Your game saves on this device.";
    $("btn-logout").textContent = app.online && app.user ? "Log out" : "Back to the city";
    openModal("m-menu");
  });
  $("btn-restart").addEventListener("click", () => { closeModals(); openModal("m-confirm"); });
  $("btn-restart-yes").addEventListener("click", restart);
  $("btn-logout").addEventListener("click", async () => {
    closeModals();
    if (app.online && app.user) { clearTimeout(app.saveTimer); await api("PUT", "save", { state: app.game.s, news: app.game.takeNews() }); await api("POST", "logout", {}); }
    app.user = null; app.game = null;
    showLanding();
  });
  $("e-again").addEventListener("click", restart);

  boot();
})();
