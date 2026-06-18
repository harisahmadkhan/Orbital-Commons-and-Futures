# Orbital Compute Futures Simulator — Planning Document

A speculative, interactive simulation modeling the shift from ground-based to orbital data centers — energy, thermal, and bandwidth flows, scenario-based futures, and the structural tensions the shift introduces.

---

## 1. Core Premise

Ground data centers face three simultaneous constraints: energy (grid draw, intermittent renewables), thermal (active cooling, water consumption), and physical footprint (land, permitting). Orbital data centers remove two of these almost entirely — solar power is constant and unfiltered by atmosphere, and waste heat radiates passively into the 2.7K background of space with no water required.

**The bottleneck doesn't disappear — it relocates.** Orbital compute is unconstrained on energy and cooling, but constrained on bandwidth: getting data up and down is limited by link budget, ground station coverage windows, and orbital geometry. The simulation's job is to make this relocation of constraint visible and felt, not just explain it.

**The actual near-term use case isn't "ground compute moved to orbit."** It's processing satellite-generated data in orbit so raw data never needs to be downlinked at all — only compressed insights. This reframes the bandwidth constraint as the core value proposition in some workloads, and a hard limit in others. The simulation should distinguish these cases explicitly (see Workload Types, Section 5).

---

## 2. Simulation Mechanics

### Three particle flows, rendered simultaneously
- **Energy flow** — photons → solar panels (orbital, gold) vs. grid mix particles (ground, color-coded by source: coal, gas, solar, wind)
- **Thermal flow** — heat particles → radiator panels and passive IR emission (orbital, fades into nothing) vs. water cooling loop and cooling tower steam (ground, continuous resource draw)
- **Data flow** — request/result particles traveling Earth ↔ orbit via laser uplink/downlink; visualizes orbital mechanics directly (see below)

### Orbital mechanics
- Platform follows a calculated arc (`angle = (time * orbitalSpeed) % 2π`) across the canvas
- Coverage window to each ground station updates live; downlink beam width narrows as the platform approaches the horizon
- Orbit type toggle: **LEO** (fast pass, low latency, narrow windows) / **MEO** / **GEO** (permanent coverage, ~550ms latency)
- Eclipse periods (Earth shadow) briefly interrupt solar input

### Visual language
- Near-black canvas (#0F0F0F), gradient atmosphere transition rather than a hard Earth/space line
- Particle color encodes meaning: gold (solar), amber (grid), blue (water), red-orange (waste heat), cyan (data up), dim cyan (data down), white-hot (compute), faint pink (radiative dispersal)
- Metrics panel: kWh drawn vs. harvested, liters of water/hour, carbon per teraflop, latency, downlink bandwidth fill bar — DM Mono, compact

---

## 3. Data Pipeline

### Tier 1 — Live APIs (progressive enhancement, not dependencies)
| Source | Use | Notes |
|---|---|---|
| Electricity Maps (free tier / Carbon Intensity Level API) | Ground grid carbon signal | Free tier now limited to one zone for exact gCO2/kWh; the Carbon Intensity Level API (high/med/low) is free for all global zones — sufficient for a speculative tool |
| Celestrak | Real TLE data for Starcloud's actual satellite | Free, no key, daily refresh |
| N2YO | Real-time satellite tracking | Free tier available |
| NASA POWER API | Solar irradiance reference | Free, no key |

### Tier 2 — Semi-static reference data (baked in, refreshed periodically)
- IEA *Data Centres and Data Transmission Networks* report — global electricity consumption, PUE benchmarks
- Uptime Institute Annual Global Data Center Survey
- Starcloud whitepaper cost figures: 40MW cluster, 10-year cost — $8.2M orbital vs. $167M terrestrial (~20x gap)
- ASCEND feasibility study (Thales Alenia Space / EU Horizon): environmental and economic comparison, sovereignty rationale

### Tier 3 — Actor map (hand-curated, structured JSON)
Initial entries, each with: orbit type, altitude, planned/actual launch date, compute capacity, use case focus, funding status, source.

| Actor | Orbit | Status | Use Case |
|---|---|---|---|
| Starcloud (f.k.a. Lumen Orbit) | LEO, ~315km, sun-synchronous | First satellite (H100 GPU) launched Nov 2, 2025; second satellite Oct 2026 | AI processing, edge inference for satellite data |
| Axiom Space (ODC nodes) | LEO, ISS-adjacent / commercial station | First two nodes planned by end of 2025 | Secure cloud compute/storage for gov & commercial |
| Blue Origin (Blue Ring) | GEO | In development | Large-scale geosynchronous compute |
| Lonestar Data Holdings | Lunar orbit | $120M contract, 6 satellites, 2027–2030 | Cold/archival data storage |
| NTT / SKY Perfect JSAT | LEO | Planned | Compute and storage satellites |
| ASCEND (Thales Alenia Space, EU) | ~1,400km | Proof of concept 2031; first DC 2036; 1GW by 2050 | EU digital sovereignty + net-zero |

---

## 4. Scenario Framework

### Two master uncertainties (the axes that generate differentiated futures)
1. **Launch economics** — does Starship-class reusable launch bring cost from ~$2,700/kg toward ~$100/kg, or stall?
2. **Ground grid decarbonization speed** — do terrestrial grids clean up faster than orbital can compete on environmental grounds, or stay carbon-intensive?

### Six scenarios

**1. Orbital Proliferation (2030–2035)** — Launch costs fall, ground grids stay carbon-intensive. Fast orbital expansion; bandwidth (not energy) becomes the binding constraint; ground station ownership becomes the new chokepoint.
*Informed by: Starcloud cost projections, Starship trajectory, IEA grid-decarbonization-lag data.*

**2. The Grid Transition Trap (2030–2035)** — Launch costs fall, but ground grids decarbonize fast (EU, parts of East Asia). Orbital's environmental case weakens in clean-grid regions; niches into satellite-data processing rather than general cloud.
*Informed by: ASCEND lifecycle-emissions findings, IEA renewables trajectory, hyperscaler PPA strategy, Nordic hydropower-cooled DC precedent.*

**3. Compute Sovereignty Wars (2030–2040)** — Geopolitical fragmentation produces parallel constellations (US-commercial, EU-sovereign, China state-backed) with no cross-constellation data flow. Spectrum and ground-station rights become diplomatic terrain.
*Informed by: ASCEND's explicit data-sovereignty mandate, EU AI Act/localization trends, NTT/SKY Perfect JSAT's state-linked posture.*

**4. The Bandwidth Ceiling (2028–2032)** — Orbital compute scales faster than ground-station laser infrastructure. Satellite-data-processing model holds; general cloud via orbital stalls. Ground station landing rights become the monopoly point.
*Informed by: Starcloud's "process onboard, downlink only insights" model, NASA TBIRD demo limits, Kepler Communications relay network scope.*

**5. The Debris Break (2028–2032)** — A high-profile LEO collision triggers an insurance/regulatory freeze on orbital DC expansion for 18–24 months. GEO and lunar assets (above the debris band) become relatively more attractive.
*Informed by: ESA Space Debris Office statistics, Cosmos 2251–Iridium 33 precedent, LeoLabs tracking data, Lonestar's lunar positioning.*

**6. The In-Orbit Economy (2027–2030)** — The least speculative scenario. Onboard processing of satellite-generated data (EO imagery, climate monitoring, maritime tracking) becomes mainstream; raw data rarely touches the ground.
*Informed by: Starcloud's stated business model, HPE Spaceborne Computer precedent, ESA Φ-sat, Planet Labs/Satellogic onboard ML roadmaps.*

---

## 5. Scenario-Making Components

- **Scenario selector** — six named cards (not a dropdown), each showing its position on the two master uncertainty axes, dominant use case, and time horizon
- **Year horizon slider** — 2025–2040, populates the actor timeline as real/projected launches occur
- **Five independent uncertainty levers** — launch cost ($/kg), grid carbon intensity (gCO2/kWh), AI compute demand growth (%/yr), bandwidth capacity (Gbps), geopolitical cooperation index. Moving any lever breaks the named scenario into a labeled "Custom configuration"
- **Disruption event triggers** (one-click, not sliders): Solar storm, Kessler cascade, Laser interference, Starship delay, Grid blackout
- **Workload type toggle** — Satellite data processing / AI training (batch) / Real-time inference / Cold archival — physically rearranges particle flow per type
- **Three Horizons overlay** — H1 (to ~2027, experimental) / H2 (2027–2033, transition) / H3 (2033+, orbital compute material share, new governance questions)
- **CLA annotation panel** — collapsible, four-level reading of any visible metric: surface readout → systemic cause → worldview assumption → underlying metaphor

---

## 6. Design Principle: Avoid Clutter (Progressive Disclosure)

**Default state must be radically simple**: simulation running, one scenario active, compact metrics readout. Nothing else visible by default.

**All scenario-making complexity lives behind a single unified control surface**, collapsed by default — not five separate competing panels. One expand/collapse rhythm, not five.

Treat it like a synthesizer: front panel shows performance controls; the patch bay (levers, disruption triggers, CLA layer, actor timeline) is underneath, available on demand. This principle applies from Phase 1 onward — it is not a polish pass added later.

---

## 7. Costing — Target: $0/month

| Component | Choice | Cost |
|---|---|---|
| Hosting | Cloudflare Pages (unlimited bandwidth, no commercial restriction, built-in analytics) | $0 |
| Code hosting | GitHub public repo | $0 |
| Live grid signal | Electricity Maps Carbon Intensity Level API | $0 |
| Satellite position | Celestrak TLE | $0 |
| Solar irradiance | NASA POWER API | $0 |
| Build tooling | Vite + React (local) | $0 |
| **Optional** | Custom domain (.space/.xyz) | ~$2–8/yr |

**Resilience rule:** all scenario data, actor map, and reference benchmarks live as flat JSON in the repo. Live APIs are progressive enhancement, never a dependency — the tool must work fully if every external API goes down.

---

## 8. Build Phases

**Phase 0 — Architecture & data (1–2 days)**
Finalize actor map JSON schema and scenario parameter schema (lever values, year range, description, CLA framing). Decide API keys needed. Sketch component hierarchy: Simulation, ControlPanel, ScenarioSelector, MetricsReadout, DisruptionPanel, HorizonOverlay, CLALayer, ActorTimeline.

**Phase 1 — Simulation core (3–5 days, artifact-first)**
Build in a Claude artifact for fast iteration. Canvas 2D, `requestAnimationFrame` loop, three particle pools. Ground/orbital split layout. Orbital arc with live position. Basic metrics panel. **Build the default minimal state first** — this is the baseline the clutter-prevention principle protects.

**Phase 2 — Scenario infrastructure (2–3 days)**
Scenario selector, year slider, parameter-responsive simulation. URL state encoding for shareable configurations. **Controls built as one collapsed unified surface, not multiple panels.**

**Phase 3 — Actor timeline & live data (2–3 days)**
Populate actor map JSON, render actors on the orbital arc by year. Wire Celestrak TLE for Starcloud's real position. Wire Electricity Maps level signal. Add the five disruption triggers.

**Phase 4 — Futures framing layer (1–2 days)**
CLA annotation panel, Three Horizons overlay, six scenario descriptions with CLA framing, expandable "what informs this" source list per scenario.

**Phase 5 — Deploy & position (1 day)**
GitHub → Cloudflare Pages. `index.html` meta block (title, description, OG image, Twitter card). One-screen methodology note: framework, sources, explicit scope limits.

**Realistic total: 3–4 weeks alongside other commitments.**

---

## 9. Handoff Notes for Claude Code

- Repo scaffolding: Vite + React, single `Simulation.jsx` component holding the canvas + RAF loop, surrounding components for UI per the hierarchy above
- `/data/actors.json`, `/data/scenarios.json` as the source of truth — no hardcoded values in components
- Particle system as a self-contained class/module (`ParticleSystem.js`) independent of React render cycle — React only mounts/unmounts the canvas and passes config props
- URL state via `URLSearchParams`, synced on lever/scenario change, read on mount
- No localStorage/sessionStorage — config lives in URL only
- Start with Phase 1 default-state build before touching any scenario logic
