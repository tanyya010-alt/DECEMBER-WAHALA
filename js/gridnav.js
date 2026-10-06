// DECEMBER WAHALA — grid pathfinding for click-to-move. A walk grid is built
// from the same collision boxes the player bumps into, then A* finds a route
// and string-pulling straightens it so walking looks natural.
/* global module */
(function (root) {
  class GridNav {
    constructor(x0, z0, x1, z1, res) {
      this.x0 = x0; this.z0 = z0; this.res = res;
      this.nx = Math.ceil((x1 - x0) / res);
      this.nz = Math.ceil((z1 - z0) / res);
      this.b = new Uint8Array(this.nx * this.nz);
    }
    // Mark every cell whose centre is inside the box (grown by pad) as blocked.
    block(c, pad) {
      const r = this.res;
      const i0 = Math.max(0, Math.floor((c.x0 - pad - this.x0) / r)), i1 = Math.min(this.nx - 1, Math.ceil((c.x1 + pad - this.x0) / r));
      const j0 = Math.max(0, Math.floor((c.z0 - pad - this.z0) / r)), j1 = Math.min(this.nz - 1, Math.ceil((c.z1 + pad - this.z0) / r));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = this.x0 + (i + 0.5) * r, z = this.z0 + (j + 0.5) * r;
        if (x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad) this.b[j * this.nx + i] = 1;
      }
    }
    ci(x) { return Math.floor((x - this.x0) / this.res); }
    cj(z) { return Math.floor((z - this.z0) / this.res); }
    inside(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz; }
    free(i, j) { return this.inside(i, j) && !this.b[j * this.nx + i]; }
    freeAt(x, z) { return this.free(this.ci(x), this.cj(z)); }
    cx(i) { return this.x0 + (i + 0.5) * this.res; }
    cz(j) { return this.z0 + (j + 0.5) * this.res; }
    nearestFree(i, j, maxR = 12) {
      if (this.free(i, j)) return [i, j];
      for (let r = 1; r <= maxR; r++) {
        let best = null, bd = Infinity;
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !this.free(i + di, j + dj)) continue;
          const d = di * di + dj * dj;
          if (d < bd) { bd = d; best = [i + di, j + dj]; }
        }
        if (best) return best;
      }
      return null;
    }
    // Nearest walkable point to (x, z).
    snap(x, z) { const c = this.nearestFree(this.ci(x), this.cj(z)); return c ? { x: this.cx(c[0]), z: this.cz(c[1]) } : null; }
    // Straight line clear of obstacles?
    los(ax, az, bx, bz) {
      const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (this.res * 0.5));
      for (let k = 1; k < n; k++) { const t = k / n; if (!this.freeAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
      return true;
    }
    // A* from a to b. Returns a list of points (excluding the start) or null.
    find(ax, az, bx, bz, maxNodes = 60000) {
      const s = this.nearestFree(this.ci(ax), this.cj(az), 4);
      const g = this.nearestFree(this.ci(bx), this.cj(bz));
      if (!s || !g) return null;
      const end = this.free(this.ci(bx), this.cj(bz)) ? { x: bx, z: bz } : { x: this.cx(g[0]), z: this.cz(g[1]) };
      if (this.los(ax, az, end.x, end.z)) return [end];
      const nx = this.nx, start = s[1] * nx + s[0], goal = g[1] * nx + g[0];
      const gs = new Float32Array(this.nx * this.nz).fill(Infinity);
      const from = new Int32Array(this.nx * this.nz).fill(-1);
      const closed = new Uint8Array(this.nx * this.nz);
      const heap = [];
      const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
      const h = (n) => { const dx = Math.abs((n % nx) - g[0]), dz = Math.abs(Math.floor(n / nx) - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
      gs[start] = 0; push(start, h(start));
      let count = 0;
      while (heap.length && count++ < maxNodes) {
        const n = pop();
        if (n === goal) break;
        if (closed[n]) continue;
        closed[n] = 1;
        const i = n % nx, j = Math.floor(n / nx);
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ii = i + di, jj = j + dj;
          if (!this.free(ii, jj)) continue;
          if (di && dj && (!this.free(i + di, j) || !this.free(i, j + dj))) continue; // no corner cutting
          const m = jj * nx + ii;
          const ng = gs[n] + (di && dj ? 1.414 : 1);
          if (ng < gs[m]) { gs[m] = ng; from[m] = n; push(m, ng + h(m)); }
        }
      }
      if (from[goal] === -1 && goal !== start) return null;
      const cells = [];
      for (let n = goal; n !== -1 && n !== start; n = from[n]) cells.push(n);
      cells.reverse();
      const pts = cells.map((n) => ({ x: this.cx(n % nx), z: this.cz(Math.floor(n / nx)) }));
      pts[pts.length - 1] = end;
      // String-pull: skip points we can see past.
      const out = [];
      let cur = { x: ax, z: az }, k = 0;
      while (k < pts.length) {
        let far = k;
        for (let q = pts.length - 1; q > k; q--) if (this.los(cur.x, cur.z, pts[q].x, pts[q].z)) { far = q; break; }
        out.push(pts[far]);
        cur = pts[far];
        k = far + 1;
      }
      return out;
    }
  }
  if (typeof module !== "undefined") module.exports = GridNav;
  else root.GridNav = GridNav;
})(typeof window !== "undefined" ? window : globalThis);
