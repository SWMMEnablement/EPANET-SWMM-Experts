# First-Principles Deconstruction: EPANET → SWMM5 Modeler

## The Core Problem Statement

An EPANET modeler carries a **pressurized-pipe, demand-driven, quasi-steady-state** mental model into a domain that is **open-channel, rainfall-driven, fully unsteady, and nonlinear**. Nearly every inherited instinct is wrong or dangerously incomplete. This document strips away every inherited assumption, identifies bedrock physics, and rebuilds the correct mental model from scratch.

---

## PART 1: Inherited Assumptions — The Full Inventory

### Category A: The Pipe Itself

| # | Inherited Assumption | Source |
|---|---|---|
| A1 | Pipes are always full and pressurized | EPANET core assumption |
| A2 | Head loss is a simple algebraic function of Q (H-W or D-W) | Steady friction models |
| A3 | Pipes have no storage — flow in = flow out instantaneously | Steady-state mass balance |
| A4 | Flow direction is determined by the pressure gradient and is essentially fixed | Network topology + demands |
| A5 | A pipe is fully characterized by length, diameter, roughness | EPANET link model |
| A6 | There is no "depth" variable — just pressure head | Full-pipe hydraulics |

### Category B: The Node

| # | Inherited Assumption | Source |
|---|---|---|
| B1 | Nodes are dimensionless — zero storage, zero volume | Junction continuity: ΣQ_in = ΣQ_out |
| B2 | Demands are inputs; pressures are outputs | Demand-driven analysis (DDA) |
| B3 | A node's elevation is just a datum for HGL calculation | Energy reference |
| B4 | Tanks are the only elements with storage | EPANET tank model |
| B5 | Negative pressure means the model is broken | DDA framework |

### Category C: The Solver / Time

| # | Inherited Assumption | Source |
|---|---|---|
| C1 | The system reaches steady-state at each time step (EPS) | Extended Period Simulation |
| C2 | Time steps are long (minutes to hours) and benign | Quasi-steady assumption |
| C3 | The solver always converges if the model is "reasonable" | Todini-Pilati gradient method |
| C4 | Courant number, CFL condition — never heard of it | Irrelevant to steady-state |
| C5 | Mass balance is automatic and exact | Algebraic constraint |

### Category D: The System Boundary / Drivers

| # | Inherited Assumption | Source |
|---|---|---|
| D1 | The network IS the model — there's nothing "upstream" | EPANET scope |
| D2 | Water enters via reservoirs (infinite source) or tanks | Boundary conditions |
| D3 | Demands are known a priori (fixed or pattern-multiplied) | Design/operations paradigm |
| D4 | There is no concept of "runoff generation" or hydrology | Out of scope for EPANET |
| D5 | Water quality = tracer/reaction in a known, solved flow field | Decoupled WQ |

### Category E: Design Philosophy / Workflow

| # | Inherited Assumption | Source |
|---|---|---|
| E1 | Design = size pipes to meet pressure requirements at nodes | Engineering convention |
| E2 | The "answer" is pressure at demand nodes | DDA output |
| E3 | Calibration = match pressures and maybe tank levels | Monitoring data available |
| E4 | Model complexity scales linearly with network size | Well-behaved linear algebra |
| E5 | Failure mode = low pressure, not flooding | Pressurized system |

---

## PART 2: Bedrock Truths — What Is Actually, Provably True

### Physics Layer (Non-Negotiable)

**Truth 1: Conservation of Mass (Continuity)**
```
∂A/∂t + ∂Q/∂x = q_lateral
```
- In a conduit of cross-section A, flow Q, with possible lateral inflow q.
- EPANET sets ∂A/∂t = 0 (steady) and q = 0. Both are wrong for drainage.
- **In SWMM's world, ∂A/∂t is the entire game.** The pipe fills and drains. Water depth changes continuously. Lateral inflows from subcatchments are the primary driver.

**Truth 2: Conservation of Momentum (St. Venant / Shallow Water)**
```
∂Q/∂t + ∂(Q²/A)/∂x + gA·∂y/∂x + gA·Sf - gA·S₀ = 0
```
Where:
- `∂Q/∂t` = local acceleration (absent in EPANET entirely)
- `∂(Q²/A)/∂x` = convective acceleration (absent in EPANET)
- `gA·∂y/∂x` = pressure gradient from depth variation
- `gA·Sf` = friction slope (the ONLY term EPANET uses, via H-W or D-W)
- `gA·S₀` = gravity (bed slope — the primary driver in open channels)

**This is the fundamental equation.** EPANET solves a degenerate, zero-inertia, full-pipe special case. SWMM5 dynamic wave solves the complete set (or an approximation of it).

**Truth 3: Free Surface Exists Until It Doesn't**
- Water in a gravity drain has a free surface. Depth varies in space and time.
- Cross-sectional area A = f(y) is nonlinear for circular pipes.
- When y → D (pipe diameter), the system transitions to pressurized (surcharge).
- This transition is **the single hardest numerical problem in computational hydraulics** — the Preissmann slot or similar artifice is required.
- EPANET never faces this because it starts and stays pressurized. SWMM5 modelers must live at this boundary.

**Truth 4: Gravity Is the Engine, Not Pumps**
- In drainage: S₀ (bed slope) provides the energy. Pumps are exceptions, not the rule.
- In EPANET: pumps and reservoir head provide the energy. Gravity is secondary.
- This inverts the entire energy mental model.

**Truth 5: The Catchment Is the Boundary Condition**
- Rainfall → infiltration → depression storage → overland flow → inlet → pipe
- This chain is the "reservoir" equivalent. It is nonlinear, hysteretic, spatially distributed, and time-varying.
- There is no equivalent in EPANET. You cannot skip it. It is not a "nice to have."

**Truth 6: Flow Can Reverse. Routinely.**
- Backwater from a downstream boundary (tailwater, tide, surcharge) propagates upstream.
- Flow direction in a link can change sign within a single event.
- EPANET's mental model of "flow goes from high pressure to low pressure in a fixed pattern" breaks completely.

**Truth 7: Dry Elements Are Normal**
- Pipes can be empty. Nodes can be dry. Zero depth, zero flow is a valid state.
- EPANET never deals with this. SWMM5 must handle wetting and drying fronts.
- This introduces discontinuities that wreck naïve solvers.

**Truth 8: Time Step Size Has Physical Meaning**
```
Courant Number: Cr = (V + c) · Δt / Δx ≤ 1
```
Where V = velocity, c = gravity wave speed √(gA/T), Δt = time step, Δx = conduit length.
- Violating this causes numerical instability or diffusion (smeared hydrographs).
- EPANET has no equivalent constraint. An EPANET modeler picking Δt = 5 min "because it worked before" can blow up a SWMM5 dynamic wave model or silently attenuate every peak.

### Mathematical Layer

**Truth 9: The System Is a DAE (Differential-Algebraic Equation), Not Just Algebraic**
- EPANET solves: `F(H, Q) = 0` — a system of nonlinear algebraic equations at each time step.
- SWMM5 dynamic wave solves: `dY/dt = G(Y, Q, t)` — a coupled system of ODEs for node depths and conduit flows, with algebraic constraints at boundaries.
- The solver character is fundamentally different. Newton-Raphson on an algebraic system vs. a time-marching scheme for a hyperbolic PDE system.

**Truth 10: Manning's n Is Not Hazen-Williams C**
- Manning: `Q = (1/n) · A · R^(2/3) · S^(1/2)` — applies to open channel and partially full pipe.
- Hazen-Williams: `V = k · C · R^0.63 · S^0.54` — empirical, pressurized pipe only, limited velocity range.
- Darcy-Weisbach is more fundamental than both, but Manning's is the lingua franca of open-channel hydraulics.
- The EPANET modeler's muscle memory of "C = 130 for new pipe" is useless. The equivalent instinct is "n = 0.013 for PVC, 0.024 for corrugated metal."

---

## PART 3: Rebuilt Mental Model — From Bedrock Up

### The Minimal Viable SWMM5 Mental Model

```
┌─────────────────────────────────────────────────────────────┐
│                    ATMOSPHERE (Rain, Evap)                   │
│                         ↓ rainfall                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SUBCATCHMENT LAYER                      │    │
│  │  Rainfall → Losses(infiltration, depression) →       │    │
│  │     Overland flow (nonlinear reservoir) → Q_runoff   │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         ↓ lateral inflow                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              NODE LAYER (Junctions, Outfalls)        │    │
│  │  Nodes HAVE STORAGE: dV/dt = ΣQ_in - ΣQ_out         │    │
│  │  Head = f(stored volume, node geometry)              │    │
│  │  Can pond. Can flood. Can go dry.                    │    │
│  └──────────┬───────────────────────────┬──────────────┘    │
│             ↓ ΔH drives Q              ↑ Q delivers/removes│
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LINK LAYER (Conduits, Pumps, Weirs)     │    │
│  │  St. Venant: ∂Q/∂t + ... = 0                        │    │
│  │  A = f(depth), depth = f(upstream/downstream heads)  │    │
│  │  Flow CAN REVERSE. Pipes CAN surcharge or go dry.   │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓                                   │
│              OUTFALL BOUNDARY CONDITION                      │
│              (free, fixed, tidal, time series)               │
└─────────────────────────────────────────────────────────────┘
```

### Key Invariants of the Rebuilt Model

1. **The subcatchment is not optional.** It is the equivalent of EPANET's reservoir + demand pattern, but it computes inflow from first principles (rainfall, infiltration, routing).

2. **Nodes have volume.** Every junction has a depth, a surface area (even if implicit from connected conduit geometry), and stores water. `dH/dt = (ΣQ_in - ΣQ_out) / A_surface`. This is the state variable the solver marches forward.

3. **Links have inertia.** `dQ/dt ≠ 0`. Flow does not instantly adjust. Transient waves propagate. This is why dynamic wave routing exists and why kinematic wave is a lossy approximation (no backwater).

4. **The flow regime can change within a single conduit.** Subcritical → critical → supercritical → hydraulic jump → surcharge. All in one pipe, one time step. The EPANET modeler's world has no equivalent.

5. **The system clock is physics, not convenience.** Δt is constrained by Courant, not by "how often do I want output." Routing Δt and reporting Δt are decoupled. The SWMM5 default wet-weather Δt of 30 seconds exists for a reason.

6. **Boundary conditions define the problem.** The outfall condition (free discharge, tidal, fixed stage) propagates upstream through the entire system via backwater. An EPANET modeler setting a "free outfall" and expecting no consequences is making a physics choice, not an administrative one.

### Necessary Trade-offs

| Trade-off | EPANET Modeler Expectation | SWMM5 Reality |
|---|---|---|
| Speed vs. accuracy | Seconds to solve | Minutes to hours for dynamic wave; Courant-limited Δt |
| Simplicity vs. physics | One equation type | Three coupled layers (hydrology + hydraulics + WQ) |
| Determinism vs. sensitivity | Change a demand, get proportional result | Change imperviousness by 5%, get nonlinear cascade |
| Convergence reliability | Almost always converges | Surcharging, ponding, dry nodes → solver stress |
| Debugging | Check pressures at nodes | Check depths, velocities, Froude numbers, continuity errors, CFL everywhere |

---

## PART 4: What Changes, What Breaks, What Becomes Possible

### What the Rebuilt Model Changes

| Inherited Idea | Rebuilt Understanding |
|---|---|
| "Pipe = just L, D, C" | Pipe = L, D, n, slope, upstream invert, downstream invert, cross-section shape, initial depth |
| "Node = dimensionless" | Node = invert elevation + maximum depth + surcharge depth + ponded area + surface area curve |
| "Demand drives flow" | Rainfall → subcatchment hydrology drives flow. There are no "demands." |
| "Pressure is the answer" | **Depth** (and whether it exceeds pipe crown or ground surface) is the answer |
| "Head loss = H-W or D-W" | Friction = Manning's for open channel; Preissmann slot for surcharge transition |
| "Steady-state per time step" | Fully unsteady. Every time step is a transient. |
| "Model the network, done" | Model the **watershed** (subcatchments + conveyance + boundaries) |
| "Calibrate to pressure" | Calibrate to **flow and depth hydrographs** at monitoring points |

### What Becomes Optional or Obsolete

1. **The "loop equation" mental model.** EPANET solves energy loops (Kirchhoff's voltage law analog). SWMM5 dynamic wave doesn't use loop equations at all — it solves node continuity + link momentum as a coupled marching system. The Hardy Cross / gradient algorithm heritage is irrelevant.

2. **Demand patterns as a primary concept.** There is no demand. There is rainfall, and there is dry weather flow (DWF), which is conceptually similar but mechanically different (diurnal patterns on base flow, not pressure-dependent demand).

3. **The idea that negative pressure = model error.** In SWMM5, negative depth is the error condition. But "surcharging" (pressure > atmospheric in a pipe) is a normal, expected, physically correct state. The EPANET modeler's instinct to treat pressurized flow as the norm and anything else as an anomaly is exactly backwards.

4. **Pipe sizing by pressure requirement.** In drainage, pipe sizing is by: (a) capacity at design flow (Manning's at some target d/D ratio, often 0.8), (b) minimum/maximum velocity, (c) minimum slope, (d) downstream invert connectivity. Pressure is not a design variable.

5. **The assumption that model complexity scales linearly.** SWMM5 nonlinearity means adding one surcharging pipe or one undersized inlet can cause cascading instability in the solver. EPANET's well-conditioned Jacobian has no equivalent failure mode.

### Surprising New Capabilities

1. **You can model flooding explicitly.** When the system surcharges beyond the ground surface, SWMM5 can pond water above the node (with a surface area), route it back into the system when capacity returns, or lose it as surface flooding. EPANET has no concept of this — overflow from a tank is about as close as it gets.

2. **You can model storage at any scale.** Detention ponds, bioretention cells, green roofs, permeable pavement — all are "storage nodes" or "LID controls" in SWMM5. The EPANET tank is a pale shadow of this.

3. **You can model the rainfall-to-outfall chain in a single model.** No need for a separate hydrology model feeding flows to a separate hydraulic model. SWMM5 integrates Horton/Green-Ampt/CN infiltration, NRCS/SCS unit hydrograph or nonlinear reservoir routing, and St. Venant conduit routing in one executable. This vertical integration is SWMM5's greatest architectural advantage.

4. **Kinematic wave as a deliberate simplification.** SWMM5 offers KW routing as a *choice* — dropping the ∂Q/∂t and backwater terms for speed. An EPANET modeler wouldn't even know what was being dropped. The SWMM5 modeler can consciously choose their physics fidelity level.

5. **Real-time control (RTC).** SWMM5 can model gates, weirs, pumps, and orifices with control rules that respond to simulated depths, flows, or times. This makes it a dynamic process simulator, not just a design checker. EPANET has simple controls, but SWMM5's rule-based control with PID is far more powerful for CSO/SSO management.

6. **LID/GI/SUDS process chains.** Low Impact Development controls (green roofs, rain gardens, permeable pavement, rain barrels, bioretention, infiltration trenches, rooftop disconnection, vegetative swales) can be modeled as multi-layer soil column processes within subcatchments. This is an entire subdomain that has no EPANET counterpart.

---

## PART 5: The Translation Table — Sacred vs. Arbitrary

### Genuinely Fundamental (Keep These)

| Principle | Why It's Bedrock |
|---|---|
| Conservation of mass | Continuity equation — universal |
| Conservation of momentum | Newton's 2nd law applied to fluid — universal |
| Energy dissipation through friction | 2nd law of thermodynamics — entropy production |
| Manning's equation for open-channel friction | Empirical, but validated over 150+ years for turbulent open-channel flow |
| The Courant condition for explicit schemes | Mathematical stability requirement for hyperbolic PDEs — provable |
| Nonlinear A(y) for partially full pipes | Geometry — the circle's area as a function of depth is what it is |

### Sacred But Actually Arbitrary (Question These)

| Convention | Why It's Arbitrary | What Could Replace It |
|---|---|---|
| Subcatchment = single nonlinear reservoir | SWMM's 1971 choice. No physical law mandates it. | Multi-reservoir cascades, distributed grid cells, HNRA hybrid approaches |
| Horton / Green-Ampt / Curve Number as the only infiltration options | Historical convenience. All are simplifications of Richards' equation. | Direct Richards' equation solve (computationally expensive but increasingly feasible) |
| Preissmann slot for surcharge transition | Numerical convenience to avoid equation switching | Shock-capturing Godunov schemes, TPA (Two-component Pressure Approach), finite volume methods (SWMM5+ direction) |
| Node storage as a lumped volume | Discretization convenience | Distributed storage along conduit lengths (Saint-Venant already contains this implicitly) |
| Separate hydrology and hydraulic time steps | Software architecture choice | Adaptive time stepping with unified solver |
| Manning's n as a single constant per conduit | Simplification. n varies with depth, velocity, and Re in reality. | Depth-dependent roughness, Colebrook-White for surcharge transition |
| The .INP file format | 1990s text format. No schema, no validation, fragile parsing. | JSON/YAML/protobuf with schema validation. The .INP format is legacy debt, not physics. |

### The Deepest Trap: Treating SWMM5 as "EPANET with Rain"

This is the single most dangerous inherited assumption. It leads to:

- **Setting routing Δt too large** (because EPANET trained you that Δt doesn't matter)
- **Ignoring subcatchment parameterization** (because EPANET had no equivalent, so it "seems like input, not model")
- **Expecting instant convergence** (because EPANET spoiled you)
- **Not checking Froude numbers or flow regime** (because EPANET has no concept of supercritical flow)
- **Missing surcharge/flooding** (because you're looking for "pressure" output that doesn't exist)
- **Underestimating calibration difficulty** (because EPANET calibration is comparatively trivial)

**SWMM5 is not EPANET with rain. It is a rainfall-runoff + unsteady open-channel flow + water quality simulator.** EPANET is a steady-state pressurized network solver. They share the word "pipe" and approximately nothing else at the physics level.

---

## PART 6: The Cleanest Expression

If you had to tattoo the mental model transition onto one page:

```
EPANET World                          SWMM5 World
─────────────                         ───────────
Pressure-driven          →            Gravity-driven
Full pipes               →            Partially full pipes (mostly)
Steady-state             →            Fully unsteady
Demands = inputs         →            Rainfall = input, runoff = computed
Nodes = dimensionless    →            Nodes = storage elements
Pipes = resistance only  →            Pipes = resistance + inertia + storage
Solver = algebraic NR    →            Solver = time-marching ODE/PDE
Δt = convenience         →            Δt = physics (Courant)
Output = pressure        →            Output = depth, flow, velocity, flooding
Failure = low pressure   →            Failure = flooding, surcharging, CSO
Design = size for P      →            Design = size for Q at target d/D
No hydrology             →            Hydrology IS the model driver
Simple WQ (tracer)       →            WQ = buildup, washoff, treatment, transport
```

### The One Equation That Captures Everything

EPANET's world:
```
H_i - H_j = f(Q) · L / D     [algebraic, per link, per time step]
```

SWMM5's world:
```
∂Q/∂t + ∂(Q²/A)/∂x + gA·∂y/∂x = gA·(S₀ - Sf)     [PDE, continuous in x and t]
```
coupled with:
```
∂A/∂t + ∂Q/∂x = q(x,t)     [continuity with lateral inflow from catchments]
```

**Everything** — the unsteadiness, the free surface, the surcharge transition, the backwater, the reverse flow, the Courant constraint, the solver complexity — follows from the difference between these two mathematical statements.

The EPANET equation is a special case (steady, full, no lateral inflow, no inertia, no wave propagation) of the SWMM5 equations. Not the other way around.

---

*The transition is not about learning new software buttons. It is about replacing an algebraic, pressurized, demand-driven worldview with a differential, open-channel, rainfall-driven worldview. The physics doesn't care which tool you learned first.*
