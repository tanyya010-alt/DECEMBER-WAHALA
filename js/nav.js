// DECEMBER WAHALA — street navigation: a graph of road intersections and
// doors, with A* paths. Used by people walking around and by auto-walk.
/* global module, require */
(function (root) {
  const W = typeof module !== "undefined" ? require("./world-data.js") : root.WORLD;

  function key(x, z) { return `${x},${z}`; }

  // Lagos has a lagoon that only the bridges cross; Abuja's middle band is a park.
  function build(city) {
    const G = W.GRID;
    const places = W.buildPlaces(city);
    const nodes = {};
    const add = (id, x, z) => { if (!nodes[id]) nodes[id] = { id, x, z, edges: new Set() }; return nodes[id]; };
    const link = (a, b) => { nodes[a].edges.add(b); nodes[b].edges.add(a); };
    const crossesWater = (z1, z2) => city === "lagos" && Math.min(z1, z2) < G.water.band[0] && Math.max(z1, z2) > G.water.band[1];

    for (const x of G.vRoads) for (const z of G.hRoads) add(key(x, z), x, z);
    // Horizontal streets.
    for (const z of G.hRoads) for (let i = 0; i < G.vRoads.length - 1; i++) link(key(G.vRoads[i], z), key(G.vRoads[i + 1], z));
    // Vertical streets (and bridges).
    for (const x of G.vRoads) for (let j = 0; j < G.hRoads.length - 1; j++) {
      const z1 = G.hRoads[j], z2 = G.hRoads[j + 1];
      if (crossesWater(z1, z2) && !G.water.bridges.includes(x)) continue;
      link(key(x, z1), key(x, z2));
    }
    // Doors connect to the street in front of them.
    for (const p of Object.values(places)) {
      if (p.remote) continue;
      const roadZ = p.side === "S" ? (p.id === "beach" || p.id === "photo" ? 48 : p.z + 10) : (p.id === "beach" || p.id === "photo" ? 48 : p.z - 10);
      const rz = G.hRoads.reduce((best, z) => (Math.abs(z - roadZ) < Math.abs(best - roadZ) ? z : best), G.hRoads[0]);
      const xa = [...G.vRoads].reverse().find((x) => x <= p.door.x) ?? G.vRoads[0];
      const xb = G.vRoads.find((x) => x >= p.door.x) ?? G.vRoads[G.vRoads.length - 1];
      const rp = add("road:" + p.id, p.door.x, rz);
      add("door:" + p.id, p.door.x, p.door.z);
      link("door:" + p.id, rp.id);
      link(rp.id, key(xa, rz));
      if (xb !== xa) link(rp.id, key(xb, rz));
    }
    return { city, nodes, places };
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  function nearestNode(nav, x, z) {
    let best = null, bd = Infinity;
    for (const n of Object.values(nav.nodes)) {
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // A* between two node ids. Returns a list of {x, z} points.
  function path(nav, fromId, toId) {
    const N = nav.nodes;
    if (!N[fromId] || !N[toId]) return [];
    const open = new Set([fromId]);
    const came = {};
    const g = { [fromId]: 0 };
    const f = { [fromId]: dist(N[fromId], N[toId]) };
    while (open.size) {
      let cur = null;
      for (const id of open) if (cur === null || f[id] < f[cur]) cur = id;
      if (cur === toId) {
        const out = [N[cur]];
        while (came[cur]) { cur = came[cur]; out.unshift(N[cur]); }
        return out.map((n) => ({ x: n.x, z: n.z }));
      }
      open.delete(cur);
      for (const nb of N[cur].edges) {
        const t = g[cur] + dist(N[cur], N[nb]);
        if (g[nb] === undefined || t < g[nb]) {
          came[nb] = cur; g[nb] = t; f[nb] = t + dist(N[nb], N[toId]);
          open.add(nb);
        }
      }
    }
    return [];
  }

  function placePath(nav, from, to) { return path(nav, "door:" + from, "door:" + to); }
  // From any point on the street to a place's door.
  function pathFromPoint(nav, x, z, to) {
    const start = nearestNode(nav, x, z);
    const p = path(nav, start.id, "door:" + to);
    return [{ x, z }, ...p];
  }
  function length(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }
  // Point at distance d along the path, plus heading.
  function pointAt(pts, d) {
    if (!pts.length) return { x: 0, z: 0, heading: 0 };
    for (let i = 1; i < pts.length; i++) {
      const seg = dist(pts[i - 1], pts[i]);
      if (d <= seg || i === pts.length - 1) {
        const k = seg ? Math.min(1, Math.max(0, d / seg)) : 1;
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * k, heading: Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z) };
      }
      d -= seg;
    }
    const last = pts[pts.length - 1];
    return { x: last.x, z: last.z, heading: 0 };
  }

  const cache = {};
  function get(city) { return cache[city] || (cache[city] = build(city)); }

  const api = { build, get, path, placePath, pathFromPoint, nearestNode, length, pointAt, dist };
  if (typeof module !== "undefined") module.exports = api;
  else root.NAV = api;
})(typeof window !== "undefined" ? window : globalThis);
