# TuftSheetSol — protocol and evidence boundary

## Question

Can an independently propagating physical disturbance selectively disrupt readout from a distributed context model while its stored context stays intact?

This is a numerical research toy about the separation of representation from its medium. It is NOT a mechanistic model of migraine aura, cortical spreading depolarization, or consciousness.

## Design

- 40×20 grid for the numerical batch; 48×24 default interactive viewer.
- At every site, local context phi predicts the sign of a noisy ±1 cue/outcome rule. The true left/right rules are opposite and stay fixed during confirmation.
- Shared context diffuses. Midpoint conductance is KNOWN AND SUPPLIED, not learned. The failed boundary-learning T6 of TuftSheet is not resolved by supplying a boundary here.
- A second sheet has a fast activator u and a slow refractory v, following a generic activator/recovery reaction-diffusion recurrence.
- A seed at (9,10) excites only the physical medium. It does not change the external world, the stored rule, or phi directly.
- When coupling is on, excitation and recovery suppress perception/readout and add a phenomenological positive spontaneous-output term. This coupling rule is deliberately HAND-WRITTEN, not an emergent biological finding.

## Controls

Train 650 ticks with 32 observations/tick and 10% response noise. During all subsequent perturbation evaluations, switch observations OFF to isolate physical readout from learning changes.

1. Coupled + seeded: physical disturbance affects perceptual readout.
2. Uncoupled + seeded: same disturbance, but no effect on readout.
3. Coupled + sham: no disturbance.

All three have identical initial context states and unchanged true worlds.

## Development and confirmation

Seed 17 was used as a development pilot to choose constants. It is NOT pre-registered confirmation evidence. The following criteria are set before evaluating the 32 held seeds (90001..90032). If they fail, retain the failure.

| Gate | Required per body |
| --- | --- |
| C1 | context accuracy > 0.95 and context MSE < 0.25 at 650 ticks |
| C2 | coupled readout MSE exceeds uncoupled by > 0.10 at +50 ticks |
| C3 | active front (u > 0.18) travels > 13 cells from the seed by +50 ticks |
| C4 | uncoupled readout and its context are identical within 1e-12 |
| C5 | both seeded systems' stored context MSEs are identical within 1e-12 |
| C6 | at +160 ticks, coupled readout MSE exceeds sham by less than 0.08 |

Each gate must pass in at least 28 of 32 held seeds. These gates demonstrate only a synthetic numerical behavior.

## Run

- Node.js 18+ (no dependencies)
- Tests: node --test tests/model.test.js
- Held batch: node experiments/confirm.js
- Export evidence: node experiments/confirm.js results.json
- Browser: open index.html directly, no server required

## Scientific limits

The model has no cortical anatomy, ion transport, glia, metabolic constraints, cortical folding, retinotopy, or real-world calibrated units. False-positive activity is produced by a written coupling rule. Passing the gates is not evidence of migraine pathology, actual visual perception, or synthetic phenomenal qualia.

A future discriminating experiment should test whether the readout failure emerges without a prescribed impairment coupling and whether improved world-model persistence has a measured trade-off with spontaneous instability.
