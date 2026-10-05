// DECEMBER WAHALA — the city map (SVG). Places are pills you tap; people stand on them.
/* global DATA, Avatar */
(function () {
  const D = window.DATA;
  const W = 1000, H = 640;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ART = {
    lagos: `
      <rect width="${W}" height="${H}" fill="var(--land)"/>
      <path d="M0,318 C190,292 330,345 470,325 S770,362 1000,340 L1000,402 C810,420 640,392 470,404 S180,384 0,404 Z" fill="var(--water)"/>
      <path d="M560,404 C600,380 640,366 700,368 L700,400 C650,396 610,402 560,412 Z" fill="var(--water)"/>
      <path d="M0,598 C250,580 500,612 760,592 S950,582 1000,588 L1000,640 L0,640 Z" fill="var(--sea)"/>
      <g fill="none" stroke="var(--road)" stroke-linecap="round">
        <path d="M60,40 L980,40" stroke-width="7"/>
        <path d="M150,40 C190,170 250,250 320,300 C360,340 400,380 430,420" stroke-width="9"/>
        <path d="M470,150 L520,300 L540,420" stroke-width="6"/>
        <path d="M60,200 L600,210" stroke-width="5"/>
        <path d="M380,430 C520,470 640,470 780,480 S940,500 1000,505" stroke-width="9"/>
        <path d="M600,360 L640,430" stroke-width="5"/>
        <path d="M430,430 L560,560" stroke-width="5"/>
      </g>
      <g fill="var(--tree)">${trees(41)}</g>
      <g fill="var(--block)">${blocks(7)}</g>
      <g class="map-label">
        <text x="770" y="388">LAGOS LAGOON</text>
        <text x="500" y="628">ATLANTIC OCEAN</text>
        <text x="60" y="180">MAINLAND</text>
        <text x="400" y="505">ISLAND</text>
        <text x="880" y="560">LEKKI</text>
        <text x="333" y="372" class="map-road">THIRD MAINLAND BRIDGE</text>
      </g>`,
    abuja: `
      <rect width="${W}" height="${H}" fill="var(--land)"/>
      <path d="M840,30 C880,10 940,20 980,60 C1000,90 990,140 950,150 C900,160 860,130 840,100 C826,76 826,46 840,30 Z" fill="var(--rock)"/>
      <ellipse cx="250" cy="372" rx="120" ry="58" fill="var(--water)"/>
      <path d="M760,250 C820,230 900,240 920,290 C900,330 820,330 770,310 Z" fill="var(--park)"/>
      <g fill="none" stroke="var(--road)" stroke-linecap="round">
        <path d="M40,40 C300,180 600,300 980,420" stroke-width="9"/>
        <path d="M120,620 C300,500 500,420 700,300 C780,250 860,200 960,180" stroke-width="9"/>
        <path d="M60,200 L940,560" stroke-width="5"/>
        <path d="M400,40 L560,620" stroke-width="5"/>
        <path d="M640,40 L700,620" stroke-width="5"/>
        <path d="M0,90 L240,140" stroke-width="7"/>
      </g>
      <g fill="var(--tree)">${trees(17)}</g>
      <g fill="var(--block)">${blocks(3)}</g>
      <g class="map-label">
        <text x="905" y="95">ASO ROCK</text>
        <text x="250" y="380">JABI LAKE</text>
        <text x="560" y="470">CENTRAL AREA</text>
        <text x="60" y="40">KUBWA EXPRESSWAY</text>
      </g>`,
  };

  function rng(seed) { let t = seed; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; }
  function trees(seed) {
    const r = rng(seed); let out = "";
    for (let i = 0; i < 70; i++) out += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 580).toFixed(0)}" r="${(4 + r() * 5).toFixed(1)}"/>`;
    return out;
  }
  function blocks(seed) {
    const r = rng(seed); let out = "";
    for (let i = 0; i < 46; i++) out += `<rect x="${(r() * W).toFixed(0)}" y="${(r() * 580).toFixed(0)}" width="${(14 + r() * 22).toFixed(0)}" height="${(10 + r() * 14).toFixed(0)}" rx="3"/>`;
    return out;
  }

  function pillWidth(text) { return Math.round(text.length * 7.9 + 48); }

  function person(p, x, y, size) {
    const bust = Avatar.bust(p.look).replace("<svg ", `<svg x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" `);
    const ring = p.kind === "me" ? "var(--mint)" : p.kind === "player" ? (p.online ? "var(--sky-ink)" : "#b8c2d1") : "var(--gold)";
    let out = `<g class="map-person" data-person="${esc(p.key)}"><title>${esc(p.label)}</title>`;
    out += `<circle cx="${x}" cy="${y}" r="${size / 2 + 3}" fill="#fff" stroke="${ring}" stroke-width="3"/>`;
    out += `<clipPath id="cp-${esc(p.key)}"><circle cx="${x}" cy="${y}" r="${size / 2}"/></clipPath><g clip-path="url(#cp-${esc(p.key)})"><rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="#e8f1fb"/>${bust}</g>`;
    if (p.kind === "me") out += `<path class="map-plumbob" d="M${x},${y - size / 2 - 26} l7,10 l-7,10 l-7,-10 z" fill="var(--mint)"/>`;
    out += `</g>`;
    return out;
  }

  // opts: { city, area, place, people: [{key, look, label, place, kind, online, homeArea}], badges: {place: text} }
  function render(opts) {
    const c = D.CITIES[opts.city];
    const places = { ...c.places };
    const area = D.AREAS[opts.city][opts.area];
    if (area) places.home = { ...places.home, name: `Home · ${area.name}`, x: area.x, y: area.y };
    if (!opts.area) delete places.home;

    // Group people by where they stand.
    const spots = {};
    (opts.people || []).forEach((p) => {
      let key = p.place, x, y;
      if (p.place === "home" && p.kind !== "me") {
        const a = D.AREAS[opts.city][p.homeArea];
        if (!a) return;
        key = "home-" + p.homeArea; x = a.x; y = a.y;
      } else if (places[p.place]) { x = places[p.place].x; y = places[p.place].y; }
      else return;
      (spots[key] = spots[key] || { x, y, list: [] }).list.push(p);
    });

    let pins = "";
    for (const [k, p] of Object.entries(places)) {
      const label = `${p.icon} ${p.name}`;
      const w = pillWidth(p.name);
      const here = k === opts.place;
      const badge = opts.badges && opts.badges[k];
      pins += `<g class="map-pin${here ? " here" : ""}" data-place="${k}" tabindex="0" role="button" aria-label="${esc(p.name)}">`
        + `<rect x="${p.x - w / 2}" y="${p.y - 17}" width="${w}" height="34" rx="17"/>`
        + `<text x="${p.x}" y="${p.y + 5}">${esc(label)}</text>`
        + (badge ? `<g class="map-badge"><rect x="${p.x + w / 2 - 30}" y="${p.y - 30}" width="${badge.length * 7 + 14}" height="20" rx="10"/><text x="${p.x + w / 2 - 23 + badge.length * 3.5}" y="${p.y - 16}">${esc(badge)}</text></g>` : "")
        + `</g>`;
    }

    let people = "";
    for (const s of Object.values(spots)) {
      const list = s.list.sort((a, b) => (a.kind === "me" ? -1 : b.kind === "me" ? 1 : 0));
      const show = list.slice(0, 5);
      const size = 36, gap = 6;
      const total = show.length * size + (show.length - 1) * gap;
      show.forEach((p, i) => {
        const x = s.x - total / 2 + size / 2 + i * (size + gap);
        people += person(p, x, s.y - 46, p.kind === "me" ? 40 : size);
      });
      if (list.length > 5) people += `<g class="map-more"><rect x="${s.x + total / 2 + 4}" y="${s.y - 58}" width="30" height="22" rx="11"/><text x="${s.x + total / 2 + 19}" y="${s.y - 43}">+${list.length - 5}</text></g>`;
    }

    return `<svg class="city-map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of ${c.name}">`
      + ART[opts.city] + `<g class="pins">${pins}</g><g class="people">${people}</g></svg>`;
  }

  window.CityMap = { render };
})();
