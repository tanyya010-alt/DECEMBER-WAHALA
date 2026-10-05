// DECEMBER WAHALA — browser UI. Renders engine state and forwards player input.
/* global DATA, Game, naira */
(function () {
  const D = DATA;
  const SAVE_KEY = "december-wahala-save-v1";
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const AVATARS = ["🧑🏾", "👩🏾", "👨🏾", "🧑🏿", "👩🏿‍🦱", "👨🏿‍🦲", "🧕🏾", "👳🏾‍♂️", "👩🏽‍🦳", "🧔🏾‍♂️"];
  const create = { avatar: AVATARS[0], city: "lagos", role: "ijgb" };
  let game = null;
  let transport = "danfo";
  let lastLogLen = 0;

  // ---------- storage ----------
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ s: game.s, avatar: create.avatar })); } catch (e) { /* storage unavailable */ }
  }
  function loadSave() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
    window.scrollTo(0, 0);
  }

  function initTitle() {
    const saved = loadSave();
    $("btn-continue").hidden = !(saved && saved.s && !saved.s.over);
  }

  function renderCreate() {
    $("pick-avatar").innerHTML = AVATARS.map((a) => `<button type="button" class="${a === create.avatar ? "sel" : ""}" data-a="${a}">${a}</button>`).join("");
    $("pick-city").innerHTML = Object.entries(D.CITIES).map(([k, c]) =>
      `<button type="button" class="card ${k === create.city ? "sel" : ""}" data-city="${k}">
        <span class="ic">${k === "lagos" ? "🌉" : "🏛️"}</span><b>${c.name}</b>
        <small>${esc(c.tagline)}<br>Traffic: ${c.trafficChance > 0.3 ? "Wicked 🚦🚦🚦" : "Manageable 🚦"}</small>
      </button>`).join("");
    $("pick-role").innerHTML = Object.entries(D.ROLES).map(([k, r]) =>
      `<button type="button" class="card ${k === create.role ? "sel" : ""}" data-role="${k}">
        <span class="ic">${r.icon}</span><b>${r.name}</b><small>${esc(r.blurb)}</small>
        <small>💰 ${naira(r.naira)}${r.usd ? ` + $${r.usd}` : ""} · 🧠 Street ${r.street}</small>
      </button>`).join("");
  }

  // ---------- game render ----------
  function render() {
    const s = game.s;
    if (s.over) { renderEnd(); return; }
    const places = D.CITIES[s.city].places;
    const place = places[s.place];

    // top bar
    $("date-day").textContent = `${D.weekday(s.day)}, ${s.day} Dec`;
    $("date-slots").innerHTML = D.SLOTS.map((n, i) =>
      `<span class="${i === s.slot ? "now" : i < s.slot ? "past" : ""}">${D.SLOT_ICONS[i]} ${n}</span>`).join("");
    const left = 31 - s.day;
    $("countdown").textContent = left > 0 ? `🎆 ${left} day${left > 1 ? "s" : ""} to crossover` : "🎆 CROSSOVER NIGHT!";
    $("m-naira").textContent = naira(s.naira);
    $("m-naira").classList.toggle("neg", s.naira < 0);
    $("m-usd").textContent = "$" + s.usd.toLocaleString();
    $("m-fx").textContent = naira(s.fx);

    // scene
    const scene = $("scene");
    scene.dataset.place = s.place;
    scene.dataset.icon = place.icon;
    scene.classList.toggle("night", s.slot >= 2);
    $("scene-place").textContent = `${place.icon} ${place.name}`;
    $("scene-sub").textContent = `${D.CITIES[s.city].name} · ${D.SLOTS[s.slot]} · ${D.ROLES[s.role].name}`;
    $("sim-avatar").textContent = create.avatar;
    $("sim-name").textContent = s.name;
    const mood = game.mood();
    $("plumbob").className = "plumbob " + (mood >= 55 ? "" : mood >= 30 ? "mid" : "low");
    $("moodlets").innerHTML = moodlets(s).map(([t, c]) => `<span class="moodlet ${c}">${t}</span>`).join("");

    // power
    $("power").textContent = s.light ? "💡 NEPA dey" : s.genSlots > 0 ? `⛽ Gen on (${s.genSlots} slots)` : "🔌 No light";

    // actions
    $("actions").innerHTML = game.actionsHere().filter((o) => o.a.special !== "bdc").map(({ a, why }) => {
      const meta = [];
      meta.push(a.special === "sleep" ? "⏭ till morning" : `⏱ ${a.slots} slot${a.slots > 1 ? "s" : ""}`);
      if (a.cost) meta.push(`<span class="cost">${naira(a.cost)}</span>`);
      if (a.pay) meta.push(`<span class="cost">+~${naira(a.pay)}</span>`);
      if (a.fx) meta.push(Object.entries(a.fx).map(([k, v]) => `${D.NEEDS[k].icon}${v > 0 ? "+" : ""}${v}`).join(" "));
      return `<button class="action" data-act="${a.id}" ${why ? "disabled" : ""}>
        <span class="a-top"><span class="a-ic">${a.icon}</span>${a.name}</span>
        <span class="a-meta">${meta.join(" · ")}</span>
        ${a.desc ? `<span class="a-desc">${esc(a.desc)}</span>` : ""}
        ${why ? `<span class="a-why">${esc(why)}</span>` : ""}
      </button>`;
    }).join("");
    $("bdc").hidden = s.place !== "mall";
    $("bdc").querySelectorAll("button").forEach((b) => {
      const v = b.dataset.usd === "all" ? s.usd : +b.dataset.usd;
      b.disabled = v <= 0 || v > s.usd;
    });

    // travel
    $("transport").innerHTML = Object.entries(D.TRANSPORT).map(([k, t]) =>
      `<button class="${k === transport ? "sel" : ""}" data-mode="${k}" title="${t.name}">${t.icon} ${t.cost ? naira(t.cost) : "Free"}</button>`).join("");
    const pending = D.pendingArrivals(s).length;
    $("places").innerHTML = Object.entries(places).map(([k, p]) => {
      const badge = k === "airport" && pending ? `<span class="badge">${pending} waiting</span>`
        : k === "venue" && D.isConcertDay(s.day) ? `<span class="badge">LIVE</span>` : "";
      return `<button class="place ${k === s.place ? "here" : ""}" data-place="${k}" ${k === s.place ? "disabled" : ""}>
        <span class="p-ic">${p.icon}</span><span>${p.name}</span>${badge}</button>`;
    }).join("");

    renderTabs(s);
    renderFeed(s);
    renderEvent(s);
    save();
  }

  function moodlets(s) {
    const n = s.needs, out = [];
    if (n.vibes >= 75) out.push(["🔥 Feeling Detty", "good"]);
    if (n.belle < 25) out.push(["🍛 Belle dey shout", "bad"]);
    if (n.energy < 25) out.push(["🥱 Tired die", "bad"]);
    if (n.peace < 25) out.push(["😤 Wahala overload", "bad"]);
    if (n.social < 25) out.push(["😶 Lonely", "bad"]);
    if (n.peace >= 75) out.push(["😌 Soft life", "good"]);
    if (!s.light && s.genSlots <= 0) out.push(["🔌 No light", "bad"]);
    if (D.arrivedCount(s) > 0) out.push([`🧳 ${D.arrivedCount(s)} family in town`, "good"]);
    if (D.isConcertDay(s.day)) out.push(["🎤 Concert day!", "good"]);
    if (s.day >= 20) out.push(["🎄 Festive", "good"]);
    return out;
  }

  function bar(v) {
    const cls = v >= 55 ? "hi" : v >= 30 ? "mid" : "lo";
    return `<div class="bar ${cls}"><i style="width:${Math.round(v)}%"></i></div>`;
  }

  function renderTabs(s) {
    $("tab-needs").innerHTML = Object.entries(D.NEEDS).map(([k, n]) =>
      `<div class="need"><div class="need-top"><span>${n.icon} ${n.label}</span><span>${Math.round(s.needs[k])}</span></div>${bar(s.needs[k])}</div>`).join("");

    $("tab-people").innerHTML = D.PEOPLE.map((p) => {
      const st = s.people[p.id];
      let status;
      if (!p.from) status = "In town";
      else if (st.arrived) status = `Landed from ${p.from}${st.missed ? " · still vexed 😒" : ""}`;
      else if (p.arrives <= s.day) status = "✈️ Waiting at the airport!";
      else status = `Arriving ${p.arrives} Dec from ${p.from}`;
      return `<div class="person"><span class="pic">${p.icon}</span><div class="info">
        <b>${p.name}</b><small>${status}</small><small>${esc(p.note)}</small>${st.arrived ? bar(st.rel) : ""}</div></div>`;
    }).join("");

    const stats = [
      ["👑 Family respect", Math.round(s.respect)],
      ["📱 Clout", Math.round(s.clout)],
      ["🧠 Street sense", Math.round(s.street)],
      ["📸 Memories", s.memories.length],
      ["🍲 Jollof cooked", s.flags.jollof],
      ["🎊 Owambes", s.flags.owambes],
    ];
    $("tab-stats").innerHTML = `<div class="stat-grid">${stats.map(([l, v]) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`).join("")}</div>
      <div class="ach-grid">${achGrid(s)}</div>`;

    $("tab-memories").innerHTML = s.memories.length
      ? `<ul class="mem-list">${s.memories.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
      : `<p class="muted">No memories yet. Go and enjoy yourself! Owambes, concerts, airport pickups and dates all count.</p>`;
  }

  function achGrid(s) {
    return Object.entries(D.ACHIEVEMENTS).map(([k, a]) =>
      `<div class="ach ${s.achievements.includes(k) ? "" : "locked"}" title="${esc(a.desc)}"><span class="ai">${a.icon}</span>${a.name}</div>`).join("");
  }

  function renderFeed(s) {
    const fresh = Math.max(0, s.log.length - lastLogLen);
    $("feed").innerHTML = s.log.slice(0, 40).map((l, i) =>
      `<li class="${l.type} ${i < fresh && lastLogLen ? "fresh" : ""}"><span class="when">${l.day} Dec · ${D.SLOTS[l.slot]}</span>${esc(l.text)}</li>`).join("");
    if (lastLogLen && fresh) {
      const ach = s.log.slice(0, fresh).find((l) => l.type === "achieve");
      if (ach) toast(ach.text);
    }
    lastLogLen = s.log.length;
  }

  function renderEvent(s) {
    const ev = s.event;
    $("modal").hidden = !ev;
    if (!ev) return;
    $("ev-icon").textContent = ev.icon;
    $("ev-title").textContent = ev.title;
    $("ev-text").textContent = ev.text;
    $("ev-choices").innerHTML = ev.choices.map((c, i) => {
      const bits = [];
      if (c.cost) bits.push(`−${naira(c.cost)}`);
      if (c.fx) bits.push(Object.entries(c.fx).map(([k, v]) => `${D.NEEDS[k].icon}${v > 0 ? "+" : ""}${v}`).join(" "));
      if (c.respect) bits.push(`👑${c.respect > 0 ? "+" : ""}${c.respect}`);
      if (c.clout) bits.push(`📱+${c.clout}`);
      const ok = game.canChoose(c);
      return `<button class="btn" data-choice="${i}" ${ok ? "" : "disabled"}>${esc(c.label)}${bits.length ? `<small>${bits.join(" · ")}${ok ? "" : " · can't afford"}</small>` : ""}</button>`;
    }).join("");
  }

  function renderEnd() {
    const s = game.s, e = s.ending;
    clearSave();
    $("modal").hidden = true;
    $("end-year").textContent = D.YEAR + 1;
    $("end-title").textContent = e.title;
    $("end-scene").textContent = e.scene;
    $("end-blurb").textContent = e.blurb;
    $("end-score").textContent = e.score;
    const labels = { memories: "📸 Memories", respect: "👑 Respect", clout: "📱 Clout", family: "❤️ Family", mood: "😊 Mood", money: "💰 Money", achievements: "🏆 Badges" };
    $("end-parts").innerHTML = Object.entries(e.parts).map(([k, v]) => `<div class="stat"><span>${labels[k]}</span><b>${v}</b></div>`).join("");
    $("end-ach").innerHTML = achGrid(s);
    $("end-mem").innerHTML = s.memories.length ? s.memories.map((m) => `<li>${esc(m)}</li>`).join("") : "<li>You no make any memory this December. Wahala!</li>";
    show("screen-end");
  }

  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- wiring ----------
  function startGame(g) {
    game = g;
    lastLogLen = 0;
    show("screen-game");
    render();
  }

  $("btn-new").onclick = () => { renderCreate(); show("screen-create"); $("in-name").focus(); };
  $("btn-continue").onclick = () => {
    const saved = loadSave();
    if (!saved) return;
    create.avatar = saved.avatar || create.avatar;
    startGame(new Game(saved.s));
  };
  $("btn-back").onclick = () => show("screen-title");
  $("screen-create").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.a) create.avatar = b.dataset.a;
    if (b.dataset.city) create.city = b.dataset.city;
    if (b.dataset.role) create.role = b.dataset.role;
    if (b.dataset.a || b.dataset.city || b.dataset.role) renderCreate();
  });
  $("btn-start").onclick = () => {
    const name = $("in-name").value.trim() || "Ada";
    startGame(Game.create({ name, city: create.city, role: create.role }));
  };

  $("actions").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (b && !b.disabled) { game.doAction(b.dataset.act); render(); }
  });
  $("bdc").addEventListener("click", (e) => {
    const b = e.target.closest("[data-usd]");
    if (!b) return;
    game.exchange(b.dataset.usd === "all" ? game.s.usd : +b.dataset.usd);
    render();
  });
  $("transport").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (b) { transport = b.dataset.mode; render(); }
  });
  $("places").addEventListener("click", (e) => {
    const b = e.target.closest("[data-place]");
    if (b && !b.disabled) { game.travel(b.dataset.place, transport); render(); }
  });
  $("ev-choices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-choice]");
    if (b && !b.disabled) { game.choose(+b.dataset.choice); render(); }
  });
  document.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === b));
    document.querySelectorAll(".tab-body").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
  });

  $("btn-menu").onclick = () => { $("menu").hidden = false; };
  $("btn-resume").onclick = () => { $("menu").hidden = true; };
  $("btn-help").onclick = () => { $("menu").hidden = true; $("help").hidden = false; };
  $("btn-help-close").onclick = () => { $("help").hidden = true; };
  $("btn-quit").onclick = () => { $("menu").hidden = true; initTitle(); show("screen-title"); };
  $("btn-again").onclick = () => { initTitle(); show("screen-title"); };

  initTitle();
})();
