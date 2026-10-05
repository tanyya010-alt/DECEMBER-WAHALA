// DECEMBER WAHALA — flat illustrated characters drawn as SVG from a "look".
// look = { body, skin, hair, hairColour, style, colour, fabric, shades, chain, gele, beard }
/* global DATA */
(function (root) {
  const D = typeof module !== "undefined" ? require("./data.js") : root.DATA;
  let uid = 0;

  const DENIM = "#86acd8";
  const DARK = "#1b1d24";
  const GOLD = "#d8a93b";

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function pattern(id, fabric, base) {
    const hi = shade(base, 0.35), lo = shade(base, -0.25);
    switch (fabric) {
      case "ankara":
        return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${base}"/><circle cx="8" cy="8" r="5" fill="none" stroke="${GOLD}" stroke-width="2"/><circle cx="8" cy="8" r="1.8" fill="${hi}"/><circle cx="0" cy="0" r="2.2" fill="${lo}"/><circle cx="16" cy="16" r="2.2" fill="${lo}"/></pattern>`;
      case "adire":
        return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${lo}"/><path d="M0 9 Q4.5 3 9 9 T18 9" fill="none" stroke="#eef2ff" stroke-width="1.6" opacity=".8"/><circle cx="9" cy="2" r="1.4" fill="#eef2ff" opacity=".8"/></pattern>`;
      case "asooke":
        return `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${base}"/><rect x="0" width="2" height="8" fill="${GOLD}" opacity=".75"/><rect x="5" width="1" height="8" fill="${hi}" opacity=".7"/></pattern>`;
      case "sequin":
        return `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${base}"/><circle cx="2" cy="2" r="1.3" fill="#fff" opacity=".55"/><circle cx="5.5" cy="5" r="1" fill="${hi}" opacity=".8"/></pattern>`;
      default:
        return "";
    }
  }

  // Which garments each style is made of, per body.
  function outfitFor(look) {
    const w = look.body === "woman";
    const s = look.style;
    const map = {
      streetwear: { top: "tee", bottom: "baggy", bottomFill: DENIM, shoes: "sneakers" },
      afrochic: w ? { top: "corset", bottom: "skirt", bottomFill: "main", shoes: "heels" } : { top: "shirt", bottom: "trousers", bottomFill: DARK, shoes: "loafers" },
      glam: w ? { top: "minidress", bottom: null, shoes: "heels" } : { top: "blazer", bottom: "trousers", bottomFill: DARK, shoes: "loafers" },
      oldmoney: w ? { top: "midi", bottom: null, shoes: "heels" } : { top: "blazer", bottom: "trousers", bottomFill: "main", shoes: "loafers" },
      y2k: w ? { top: "crop", bottom: "lowrise", bottomFill: DENIM, shoes: "sneakers", belt: true } : { top: "shirt", bottom: "baggy", bottomFill: DENIM, shoes: "sneakers", belt: true },
      allblack: w ? { top: "minidress", bottom: null, shoes: "boots", forceColour: "#17181d" } : { top: "shirt", bottom: "trousers", bottomFill: "#101114", shoes: "boots", forceColour: "#17181d" },
      resort: w ? { top: "shirt", bottom: "shorts", bottomFill: "main", shoes: "sandals" } : { top: "shirt", bottom: "shorts", bottomFill: "#e7dcc6", shoes: "sandals" },
      tradfusion: w ? { top: "gown", bottom: null, shoes: "heels" } : { top: "agbada", bottom: "trousers", bottomFill: "main", shoes: "loafers" },
    };
    return map[s] || map.streetwear;
  }

  const TOPS = {
    tee: "M56,104 Q100,94 144,104 L156,152 L138,158 L134,142 L136,214 L64,214 L66,142 L62,158 L44,152 Z",
    shirt: "M62,104 Q100,96 138,104 L150,148 L134,152 L132,208 L68,208 L66,152 L50,148 Z",
    corset: "M74,112 Q100,118 126,112 L126,150 Q120,176 124,200 L76,200 Q80,176 74,150 Z",
    crop: "M70,106 Q100,100 130,106 L128,160 L72,160 Z",
    minidress: "M74,110 Q100,116 126,110 L126,150 Q120,176 124,200 L138,282 L62,282 L76,200 Q80,176 74,150 Z",
    midi: "M72,106 Q100,100 128,106 L127,150 Q121,176 125,200 L142,326 L58,326 L75,200 Q79,176 73,150 Z",
    gown: "M70,106 Q100,98 130,106 L128,150 Q121,176 125,200 L150,372 L50,372 L75,200 Q79,176 72,150 Z",
    blazer: "M62,104 Q100,96 138,104 L136,216 L64,216 Z",
    agbada: "M34,112 Q100,90 166,112 L176,252 L150,306 L50,306 L24,252 Z",
  };
  const BOTTOMS = {
    baggy: "M68,196 L132,196 L136,374 L104,374 L100,252 L96,374 L64,374 Z",
    trousers: "M72,198 L128,198 L124,374 L104,374 L100,240 L96,374 L76,374 Z",
    lowrise: "M70,214 L130,214 L136,374 L104,374 L100,262 L96,374 L64,374 Z",
    skirt: "M74,196 L126,196 L140,304 L60,304 Z",
    shorts: "M70,198 L130,198 L132,264 L104,264 L100,236 L96,264 L68,264 Z",
  };

  function hairBack(look, H) {
    const lines = (from, to, step, y1, y2, w, sway = 0) => {
      let out = "";
      for (let x = from; x <= to; x += step) {
        const dx = (x - 100) * 0.25 + sway;
        out += `<path d="M${x},${y1} Q${x + dx * 0.5},${(y1 + y2) / 2} ${x + dx},${y2}" stroke="${H}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
      }
      return out;
    };
    switch (look.hair) {
      case "bonestraight": return `<path d="M72,52 Q100,22 128,52 L132,178 L68,178 Z" fill="${H}"/>`;
      case "frontal": return `<path d="M70,52 Q100,20 130,52 L136,192 L64,192 Z" fill="${H}"/>`;
      case "bodywave": return `<path d="M70,52 Q100,20 130,52 Q140,90 132,120 Q142,150 134,182 Q100,192 66,182 Q58,150 68,120 Q60,90 70,52 Z" fill="${H}"/>`;
      case "bob": return `<path d="M72,50 Q100,24 128,50 L130,98 Q100,106 70,98 Z" fill="${H}"/>`;
      case "knotless": return lines(70, 130, 4, 48, 206, 3.6);
      case "fulani": return lines(76, 124, 6, 50, 176, 3.4) + [80, 120].map((x) => `<circle cx="${x + (x < 100 ? -6 : 6)}" cy="150" r="3" fill="${GOLD}"/>`).join("");
      case "afro": return `<circle cx="100" cy="52" r="42" fill="${H}"/>`;
      case "curly": {
        let out = "";
        [[78, 50], [122, 50], [72, 76], [128, 76], [70, 102], [130, 102], [74, 128], [126, 128], [80, 150], [120, 150], [100, 32], [86, 36], [114, 36]].forEach(([x, y]) => { out += `<circle cx="${x}" cy="${y}" r="14" fill="${H}"/>`; });
        return out;
      }
      case "locs": return lines(80, 120, 8, 44, 128, 6.5);
      default: return "";
    }
  }

  function hairFront(look, H) {
    const cap = `<path d="M77,66 Q75,33 100,32 Q125,33 123,66 Q118,47 100,45 Q82,47 77,66 Z" fill="${H}"/>`;
    const tight = `<path d="M79,58 Q80,36 100,35 Q120,36 121,58 Q111,47 100,47 Q89,47 79,58 Z" fill="${H}"/>`;
    const hi = shade(H, 0.18);
    switch (look.hair) {
      case "bonestraight":
        return cap + `<rect x="73" y="56" width="9" height="104" rx="4" fill="${H}"/><rect x="118" y="56" width="9" height="104" rx="4" fill="${H}"/><path d="M100,33 L100,45" stroke="${hi}" stroke-width="1.2"/>`;
      case "frontal":
        return `<path d="M76,70 Q72,30 106,31 Q127,34 124,66 Q114,44 92,46 Q80,52 76,70 Z" fill="${H}"/><rect x="72" y="58" width="10" height="120" rx="5" fill="${H}"/><rect x="118" y="56" width="10" height="120" rx="5" fill="${H}"/>`;
      case "bodywave":
        return cap + `<path d="M74,58 Q70,90 78,112 Q70,132 78,152" stroke="${H}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M126,58 Q130,90 122,112 Q130,132 122,152" stroke="${H}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
      case "bob":
        return `<path d="M76,74 Q74,32 100,32 Q126,32 124,74 Q116,50 100,50 Q84,50 76,74 Z" fill="${H}"/><rect x="73" y="58" width="9" height="40" rx="4" fill="${H}"/><rect x="118" y="58" width="9" height="40" rx="4" fill="${H}"/>`;
      case "knotless":
      case "fulani": {
        let rows = "";
        for (let x = 84; x <= 116; x += 8) rows += `<path d="M${x},46 Q${x + (x - 100) * 0.2},38 ${100 + (x - 100) * 0.6},33" stroke="${hi}" stroke-width="1.1" fill="none"/>`;
        const beads = look.hair === "fulani" ? `<path d="M100,33 L100,52" stroke="${H}" stroke-width="4"/><circle cx="100" cy="52" r="2.6" fill="${GOLD}"/>` : "";
        return cap + rows + beads;
      }
      case "bun":
        return `<circle cx="100" cy="28" r="12" fill="${H}"/>` + tight;
      case "afro":
        return `<path d="M76,64 Q74,30 100,28 Q126,30 124,64 Q116,44 100,44 Q84,44 76,64 Z" fill="${H}"/>`;
      case "curly":
        return cap + `<circle cx="80" cy="50" r="9" fill="${H}"/><circle cx="120" cy="50" r="9" fill="${H}"/>`;
      case "lowfade":
        return tight + `<path d="M78,60 Q78,70 80,74" stroke="${H}" stroke-width="2" opacity=".45" fill="none"/><path d="M122,60 Q122,70 120,74" stroke="${H}" stroke-width="2" opacity=".45" fill="none"/>`;
      case "buzz":
        return `<path d="M78,62 Q78,36 100,35 Q122,36 122,62 Q112,50 100,50 Q88,50 78,62 Z" fill="${H}" opacity=".85"/>`;
      case "waves": {
        let arcs = "";
        for (let y = 39; y <= 49; y += 4) arcs += `<path d="M86,${y + 3} Q100,${y - 3} 114,${y + 3}" stroke="${hi}" stroke-width="1.2" fill="none"/>`;
        return tight + arcs;
      }
      case "curls": {
        let c = "";
        [[86, 40], [94, 36], [102, 35], [110, 37], [117, 42], [82, 48], [120, 50]].forEach(([x, y]) => { c += `<circle cx="${x}" cy="${y}" r="5" fill="${H}"/>`; });
        return tight + c;
      }
      case "locs": {
        let l = "";
        for (let x = 80; x <= 120; x += 8) l += `<path d="M${x},40 Q${x + (x - 100) * 0.3},60 ${x + (x - 100) * 0.5},${x === 80 || x === 120 ? 126 : 54}" stroke="${H}" stroke-width="6.5" stroke-linecap="round" fill="none"/>`;
        return tight + l;
      }
      case "cornrows": {
        let r = "";
        for (let x = 86; x <= 114; x += 7) r += `<path d="M${x},50 Q${x},40 ${100 + (x - 100) * 0.5},34" stroke="${hi}" stroke-width="1.4" fill="none"/>`;
        return tight + r;
      }
      case "taper":
        return `<path d="M79,60 Q78,30 100,29 Q122,30 121,60 Q112,46 100,46 Q88,46 79,60 Z" fill="${H}"/>`;
      default:
        return tight;
    }
  }

  function shoes(type, colour) {
    const pair = (fn) => fn(86) + fn(114);
    switch (type) {
      case "sneakers": return pair((x) => `<rect x="${x - 14}" y="368" width="26" height="14" rx="6" fill="#f4f4f2" stroke="#d6d6d6"/>`);
      case "heels": return pair((x) => `<path d="M${x - 9},372 L${x + 9},372 L${x + 8},384 L${x - 8},384 Z" fill="${shade(colour, -0.15)}"/>`);
      case "boots": return pair((x) => `<rect x="${x - 11}" y="320" width="22" height="64" rx="5" fill="#0f1013"/>`);
      case "loafers": return pair((x) => `<rect x="${x - 12}" y="370" width="22" height="12" rx="5" fill="#5a3a22"/>`);
      case "sandals": return pair((x) => `<path d="M${x - 10},376 L${x + 10},376" stroke="#8a5a32" stroke-width="3"/><rect x="${x - 11}" y="380" width="22" height="4" rx="2" fill="#8a5a32"/>`);
      default: return "";
    }
  }

  function svg(look, opts = {}) {
    const id = "av" + (++uid);
    const skin = D.SKIN[look.skin] || D.SKIN[3];
    const H = (D.HAIR_COLOURS[look.hairColour] || D.HAIR_COLOURS.black).hex;
    const fit = outfitFor(look);
    const base = fit.forceColour || D.OUTFIT_COLOURS[look.colour] || D.OUTFIT_COLOURS[0];
    const fabric = look.fabric || "plain";
    const pat = pattern(id + "p", fabric, base);
    const main = pat ? `url(#${id}p)` : base;
    const w = look.body === "woman";
    const skinDark = shade(skin, -0.12);

    const torso = w
      ? "M70,104 Q100,96 130,104 L128,150 Q120,176 124,200 L76,200 Q80,176 72,150 Z"
      : "M66,104 Q100,96 134,104 L130,200 L70,200 Z";
    const hips = w ? "M76,198 L124,198 Q133,220 130,238 L70,238 Q67,220 76,198 Z" : "M70,198 L130,198 L130,238 L70,238 Z";

    let body = "";
    body += `<path d="M78,236 L98,236 L96,376 L82,376 Z" fill="${skin}"/><path d="M102,236 L122,236 L118,376 L104,376 Z" fill="${skin}"/>`;
    body += `<path d="${hips}" fill="${skin}"/><path d="${torso}" fill="${skin}"/>`;
    body += `<path d="M${w ? 72 : 68},108 Q${w ? 60 : 56},160 ${w ? 62 : 58},226" stroke="${skin}" stroke-width="${w ? 12 : 14}" stroke-linecap="round" fill="none"/>`;
    body += `<path d="M${w ? 128 : 132},108 Q${w ? 140 : 144},160 ${w ? 138 : 142},226" stroke="${skin}" stroke-width="${w ? 12 : 14}" stroke-linecap="round" fill="none"/>`;
    body += `<circle cx="${w ? 62 : 58}" cy="228" r="7" fill="${skinDark}"/><circle cx="${w ? 138 : 142}" cy="228" r="7" fill="${skinDark}"/>`;
    body += `<rect x="92" y="80" width="16" height="24" rx="5" fill="${skinDark}"/>`;

    let clothes = "";
    if (fit.bottom) {
      const bf = fit.bottomFill === "main" ? main : fit.bottomFill;
      clothes += `<path d="${BOTTOMS[fit.bottom]}" fill="${bf}"/>`;
      if (fit.bottom === "baggy" || fit.bottom === "lowrise") clothes += `<path d="M100,${fit.bottom === "lowrise" ? 262 : 252} L100,374" stroke="${shade(DENIM, -0.2)}" stroke-width="1.5"/>`;
      if (fit.belt) clothes += `<rect x="${fit.bottom === "lowrise" ? 70 : 68}" y="${fit.bottom === "lowrise" ? 212 : 196}" width="${fit.bottom === "lowrise" ? 60 : 64}" height="6" rx="2" fill="${GOLD}"/>`;
    }
    if (fit.top === "blazer") {
      clothes += `<path d="${TOPS.blazer}" fill="${main}"/>`;
      clothes += `<path d="M68,110 Q58,160 60,222" stroke="${main}" stroke-width="17" stroke-linecap="round" fill="none"/><path d="M132,110 Q142,160 140,222" stroke="${main}" stroke-width="17" stroke-linecap="round" fill="none"/>`;
      clothes += `<path d="M90,100 L100,150 L110,100 Z" fill="${look.style === "glam" ? "#15161a" : "#f2efe8"}"/><path d="M86,102 L100,152 M114,102 L100,152" stroke="${shade(base, -0.3)}" stroke-width="2.5"/>`;
    } else if (fit.top === "agbada") {
      clothes += `<path d="M68,104 Q100,96 132,104 L136,300 L64,300 Z" fill="${shade(base, -0.12)}"/>`;
      clothes += `<path d="${TOPS.agbada}" fill="${main}" opacity=".96"/>`;
      clothes += `<path d="M86,100 Q100,128 114,100" stroke="${GOLD}" stroke-width="3" fill="none"/><path d="M92,112 L92,150 M108,112 L108,150" stroke="${GOLD}" stroke-width="1.5"/>`;
    } else {
      clothes += `<path d="${TOPS[fit.top]}" fill="${main}"/>`;
      if (["corset", "minidress", "midi", "crop", "gown"].includes(fit.top)) {
        clothes += `<path d="M80,112 L82,100 M120,112 L118,100" stroke="${main}" stroke-width="3"/>`;
      }
      if (fit.top === "corset") clothes += `<path d="M100,118 L100,198" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="4 4"/>`;
      if (fit.top === "shirt") clothes += `<path d="M90,100 L100,118 L110,100" stroke="${shade(base, -0.3)}" stroke-width="2" fill="none"/><circle cx="100" cy="132" r="1.6" fill="${shade(base, -0.35)}"/><circle cx="100" cy="152" r="1.6" fill="${shade(base, -0.35)}"/><circle cx="100" cy="172" r="1.6" fill="${shade(base, -0.35)}"/>`;
      if (fit.top === "gown") clothes += `<path d="M66,108 Q60,118 66,130 L78,124 Z M134,108 Q140,118 134,130 L122,124 Z" fill="${main}"/>`;
    }
    clothes += shoes(fit.shoes, base);

    const face = `<ellipse cx="100" cy="62" rx="22" ry="26" fill="${skin}"/>`
      + `<ellipse cx="78" cy="64" rx="3.5" ry="6" fill="${skinDark}"/><ellipse cx="122" cy="64" rx="3.5" ry="6" fill="${skinDark}"/>`
      + `<ellipse cx="91.5" cy="63" rx="2.4" ry="3" fill="#1a1210"/><ellipse cx="108.5" cy="63" rx="2.4" ry="3" fill="#1a1210"/>`
      + `<path d="M87,56 Q91.5,54 96,56 M104,56 Q108.5,54 113,56" stroke="#1a1210" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      + `<path d="M98,68 Q100,72 102,68" stroke="${shade(skin, -0.25)}" stroke-width="1.4" fill="none"/>`
      + `<path d="M93,76 Q100,${w ? 81 : 80} 107,76" stroke="${w ? "#7a2e2e" : "#3a1d14"}" stroke-width="${w ? 3 : 2}" fill="none" stroke-linecap="round"/>`
      + (w ? `<circle cx="78" cy="74" r="2.6" fill="${GOLD}"/><circle cx="122" cy="74" r="2.6" fill="${GOLD}"/>` : "");

    let beard = "";
    if (!w && look.beard) {
      beard = look.beard === "full"
        ? `<path d="M78,64 Q80,96 100,92 Q120,96 122,64 Q120,84 100,84 Q80,84 78,64 Z" fill="${H}"/>`
        : `<path d="M80,70 Q86,90 100,90 Q114,90 120,70" stroke="${H}" stroke-width="3" fill="none"/><path d="M92,76 Q100,73 108,76" stroke="${H}" stroke-width="2.5" fill="none"/>`;
    }

    let extras = "";
    if (look.chain) extras += `<path d="M88,100 Q100,${fit.top === "agbada" || fit.top === "blazer" ? 122 : 128} 112,100" stroke="${GOLD}" stroke-width="2.4" fill="none"/>`;
    if (look.shades) extras += `<rect x="83" y="57" width="15" height="11" rx="4" fill="#0e0f12" stroke="#f4f4f2" stroke-width="1.6"/><rect x="102" y="57" width="15" height="11" rx="4" fill="#0e0f12" stroke="#f4f4f2" stroke-width="1.6"/><path d="M98,61 L102,61" stroke="#f4f4f2" stroke-width="1.6"/>`;

    let head = "";
    if (look.gele) {
      const g = look.style === "tradfusion" ? main : GOLD;
      head = w
        ? `<path d="M66,50 Q60,18 84,12 Q100,2 116,12 Q142,16 136,50 Q124,34 100,36 Q78,34 66,50 Z" fill="${g}"/><path d="M74,38 Q100,8 128,38 M84,24 Q100,14 118,24" stroke="${shade(base, -0.25)}" stroke-width="1.6" fill="none"/>`
        : `<path d="M76,50 Q74,28 100,26 Q126,28 124,50 Q112,42 100,42 Q88,42 76,50 Z" fill="${g}"/><path d="M118,30 Q134,34 128,48" fill="${g}" stroke="${shade(base, -0.25)}" stroke-width="1"/>`;
    }

    const back = look.gele && look.body === "woman" ? "" : hairBack(look, H);
    const front = look.gele ? "" : hairFront(look, H);
    const ground = opts.noGround ? "" : `<ellipse cx="100" cy="386" rx="62" ry="10" fill="#000" opacity=".12"/>`;

    return `<svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.label || "Character"}">`
      + (pat ? `<defs>${pat}</defs>` : "")
      + ground + back + body + clothes + face + beard + front + head + extras
      + `</svg>`;
  }

  // Small head-and-shoulders bubble for map pins and people lists.
  function bust(look) {
    return svg(look, { noGround: true }).replace('viewBox="0 0 200 400"', 'viewBox="50 8 100 100"');
  }

  const api = { svg, bust, outfitFor };
  if (typeof module !== "undefined") module.exports = api;
  else root.Avatar = api;
})(typeof window !== "undefined" ? window : globalThis);
