"use strict";

/**
 * TuftSheetSolCore — deliberately small, deterministic, 2-D research toy.
 *
 * phi = slowly changing local hidden-rule belief (a diffusive context sheet).
 * u,v = independent excitable activator / slow recovery field.
 *
 * Important: this is NOT a cortical spreading depolarization simulator and
 * does NOT make a claim about consciousness or clinical visual phenomena.
 */
class TuftSheetSolCore {
  constructor(opts = {}) {
    this.width = opts.width ?? 48;
    this.height = opts.height ?? 24;
    this.n = this.width * this.height;
    this.rng = (opts.seed ?? 20261117) >>> 0;
    if (!this.rng) this.rng = 1;
    this.tick = 0;
    this.samplesPerTick = opts.samplesPerTick ?? 32;
    // A known geometric division is supplied, NOT learned.
    this.boundaryConductance = opts.boundaryConductance ?? 0.05;
    this.contextSpread = opts.contextSpread ?? 0.14;
    this.contextLeak = opts.contextLeak ?? 0.0015;
    this.evidenceRate = opts.evidenceRate ?? 0.31;
    this.coupling = opts.coupling ?? 1;
    this.leftRule = 1;
    this.rightRule = -1;
    this.phi = new Float64Array(this.n);
    this.u = new Float64Array(this.n);
    this.v = new Float64Array(this.n);
    this.pulseCount = 0;
    this.lastObservations = [];
  }

  random() {
    let x = this.rng;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.rng = x >>> 0;
    return this.rng / 4294967296;
  }

  index(x, y) { return y * this.width + x; }
  clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  trueRule(x) { return x < this.width / 2 ? this.leftRule : this.rightRule; }

  flip(side) {
    if (side === "left") this.leftRule *= -1;
    else if (side === "right") this.rightRule *= -1;
    else throw new Error("Unknown region: " + side);
  }

  lesionAt(i) {
    return this.clamp(0.80 * Math.max(0, this.u[i]) +
                      0.60 * Math.max(0, this.v[i]), 0, 1);
  }

  // The context belief is not rewritten by the physiological perturbation.
  // Only its readout and subsequent sensor updates are affected.
  readoutAt(i) {
    const belief = Math.tanh(this.phi[i]);
    const impairment = this.coupling * this.lesionAt(i);
    const spontaneous = this.coupling * 0.55 * Math.max(0, this.u[i] - 0.12);
    return this.clamp(belief * (1 - 0.95 * impairment) + spontaneous, -1, 1);
  }

  seedDisturbance(x, y, radius = 2, amplitude = 1.13) {
    for (let yy = 0; yy < this.height; yy++) {
      for (let xx = 0; xx < this.width; xx++) {
        if ((xx-x)**2 + (yy-y)**2 <= radius*radius)
          this.u[this.index(xx, yy)] = amplitude;
      }
    }
    this.pulseCount++;
  }

  advance() {
    const w = this.width, h = this.height, n = this.n;
    const p = this.phi, after = new Float64Array(n);
    const observed = [];

    // Local bottom-up evidence; each column compares a sensory observation
    // against its own tuft-conditioned prediction (residue).
    for (let k = 0; k < this.samplesPerTick; k++) {
      const x = Math.floor(this.random()*w);
      const y = Math.floor(this.random()*h);
      const i = this.index(x, y);
      const cue = this.random() < 0.5 ? -1 : 1;
      const noise = this.random() < 0.1 ? -1 : 1;
      const real = this.trueRule(x) * cue * noise;
      const predicted = cue * Math.tanh(p[i]);
      const sensoryGate = 1 - 0.85 * this.coupling * this.lesionAt(i);
      p[i] = this.clamp(p[i] +
          this.evidenceRate * sensoryGate * cue * (real-predicted), -4, 4);
      observed.push({x, y, cue, real, predicted});
    }

    // One diffusion step: horizontally shared local context, not a wave.
    // The reduced midpoint link is SUPPLIED and must not be called learned.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = this.index(x,y);
      let lap = 0;
      if (x > 0) lap += (x === w/2 ? this.boundaryConductance : 1) *
          (p[i-1] - p[i]);
      if (x < w-1) lap += (x === w/2-1 ? this.boundaryConductance : 1) *
          (p[i+1] - p[i]);
      if (y > 0) lap += p[i-w] - p[i];
      if (y < h-1) lap += p[i+w] - p[i];
      after[i] = this.clamp(p[i] + this.contextSpread*lap -
                               this.contextLeak*p[i], -4, 4);
    }
    this.phi = after;

    // Generic activator / slow recovery reaction-diffusion system.
    // Its time and spatial units are SIMULATION UNITS, not mm or seconds.
    const dt = 0.14, diffusion = 1.02, reaction = 3.1;
    const threshold = 0.17, eps = 0.042, recovery = 0.92;
    for (let sub = 0; sub < 5; sub++) {
      const uu = new Float64Array(n), vv = new Float64Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = this.index(x,y), val = this.u[i], rec = this.v[i];
        let lap = 0;
        if (x > 0) lap += this.u[i-1] - val;
        if (x < w-1) lap += this.u[i+1] - val;
        if (y > 0) lap += this.u[i-w] - val;
        if (y < h-1) lap += this.u[i+w] - val;
        const f = reaction*val*(1-val)*(val-threshold);
        uu[i] = this.clamp(val + dt*(diffusion*lap + f - rec), -0.25, 1.4);
        vv[i] = this.clamp(rec + dt*eps*(val-recovery*rec), 0, 1.5);
      }
      this.u = uu;
      this.v = vv;
    }

    this.lastObservations = observed;
    this.tick++;
  }

  stats() {
    let ctxErr=0, readErr=0, ctxAcc=0, readAcc=0, energy=0, injury=0;
    for (let i=0; i<this.n; i++) {
      const truth = (i % this.width) < this.width/2 ?
          this.leftRule : this.rightRule;
      const belief = Math.tanh(this.phi[i]);
      const read = this.readoutAt(i);
      ctxErr += (belief-truth)**2;
      readErr += (read-truth)**2;
      ctxAcc += Number(Math.sign(belief) === truth);
      readAcc += Number(Math.sign(read) === truth);
      energy += Math.max(0, this.u[i]);
      injury += this.lesionAt(i);
    }
    return {
      tick:this.tick,
      contextMSE:ctxErr/this.n,
      readoutMSE:readErr/this.n,
      contextAccuracy:ctxAcc/this.n,
      readoutAccuracy:readAcc/this.n,
      excitation:energy/this.n,
      injury:injury/this.n
    };
  }
}

if (typeof module !== "undefined" && module.exports)
  module.exports = TuftSheetSolCore;
if (typeof window !== "undefined")
  window.TuftSheetSolCore = TuftSheetSolCore;
