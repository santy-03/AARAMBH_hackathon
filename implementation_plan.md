# Implementation Plan: Before vs After Space-Debris Collision Avoidance Simulation

## 1. System Architecture & Existing Codebase Audit

### Current Capabilities & Working Modules
- **Frontend Framework**: React 19 + Vite 8 + TailwindCSS v4.
- **Physics Core (`src/physics/`)**:
  - `orbitEngine.js`: Analytical Keplerian propagation with $J_2$ secular drift (`keplerianToStateVectors`), Cartesian-to-Keplerian inversion (`stateVectorsToKeplerian`), RIC frame rotation triad (`getRICMatrix`), impulsive delta-V execution (`applyManeuverImpulse`), RK4 numerical integration (`propagateStateRK4`), and Tsiolkovsky propellant consumption (`calculatePropellantMass`).
  - `conjunction.js`: Coarse grid scan + Golden Section Search for Time of Closest Approach (TCA), relative miss vector, relative speed, RIC miss offsets, and trajectory series generation.
  - `riskModel.js`: Akella & Alfriend 2D collision probability ($P_c$) and composite risk scoring.
  - `avoidanceOptimizer.js`: 6-directional RIC grid search ($\pm$ Along-track, $\pm$ Radial, $\pm$ Cross-track) across multiple lead times with binary search for minimum safe $\Delta v$, secondary debris screening loop, and rejected candidates logging.
  - `scenarios.js`: 3 canonical test scenarios and synthetic background debris generator (250 objects).
  - `celestrakApi.js` & `apiResult.js`: Live CelesTrak TLE integration and standard Master Prompt JSON payload exporter.
- **3D Visualization & Dashboard (`src/components/`)**:
  - `SpaceMap3D.jsx`: Interactive Three.js scene featuring 3D Earth, orbit trails, satellite and debris meshes, and hazard indicators.
  - `DistanceGraph.jsx`: 2D Canvas plot of relative distance $d(t)$.
  - `AvoidanceOptimizerPanel.jsx`, `RiskAssessmentCard.jsx`, `DebrisMonitorPanel.jsx`, `HackathonAnswerPanel.jsx`.

### Key Deficiencies to Solve for "Before vs After" Requirement
1. **Lack of Side-by-Side Orbital Parameter Comparison**: Currently, orbital parameters ($a, e, i, \Omega, \omega, T, |v|$) before vs after the burn are not shown in a unified comparative table with exact physical deltas.
2. **Velocity Vector Decomposition**: Need explicit display of $\vec{v}_{\text{before}}$, $\Delta\vec{v}$, $\vec{v}_{\text{after}}$, and demonstration that $\Delta\text{speed} \neq |\Delta\vec{v}|$ due to vector geometry.
3. **Inclination Change Physics**: Need clear visualization and explanation showing how cross-track (normal/anti-normal) burns alter inclination, whereas along-track burns alter semi-major axis and speed.
4. **Enhanced Relative Distance Graph**: Needs explicit marker dots and callouts at $\text{TCA}_{\text{before}}$ ($d_{\min,\text{before}}$) and $\text{TCA}_{\text{after}}$ ($d_{\min,\text{after}}$).
5. **Zoomed-in Collision Encounter Visualization**: Encounter B-plane / relative motion view showing nominal vs maneuvered miss distance.
6. **Maneuver Mission Timeline**: Visual representation from $T-60\text{ min}$ (detection) $\rightarrow$ Burn point $\rightarrow$ TCA $\rightarrow$ $T+60\text{ min}$.
7. **Configurable Propulsion Parameters**: User inputs for satellite wet mass ($m_0$) and specific impulse ($I_{sp}$).
8. **3D Visualization Layer Toggles**: Checkboxes to toggle Before path, After path, Debris path, Velocity vectors, TCA point, and Burn point.

---

## 2. File Modification & Creation Strategy

### New Files to Create
1. **`src/components/BeforeAfterComparisonPanel.jsx`**:
   - Comprehensive comparative module containing:
     - Side-by-side Orbital Parameters Table ($a, e, i, \Omega, \omega, T, \text{altitude}, \text{speed}, \text{miss distance}, P_c, \text{fuel}$)
     - 3D Velocity Vector Breakdown ($\vec{v}_{\text{before}} + \Delta\vec{v} = \vec{v}_{\text{after}}$)
     - Inclination Delta Callout with physical orbital mechanics explanation
     - Prominent Main Result Card (`COLLISION AVOIDED` or `NO SAFE MANEUVER FOUND`)
     - Mission Maneuver Timeline ($T-60\text{ min} \rightarrow \text{Burn} \rightarrow \text{TCA} \rightarrow T+60\text{ min}$)
     - Candidate Optimization & Secondary Screening Summary Table
2. **`src/components/ZoomedEncounterView.jsx`**:
   - High-resolution encounter B-plane / relative RIC trajectory visualization showing debris path intersecting nominal satellite path vs diverged safe path.
3. **`test_collision_avoidance.js`**:
   - Complete Node.js integration test script that propagates orbits, verifies $\vec{v}_{\text{after}} = \vec{v}_{\text{before}} + \Delta\vec{v}$, computes exact Before vs After orbital parameters, tests secondary screening rejection, and prints verified numerical results.

### Existing Files to Modify
1. **`src/physics/orbitEngine.js`**:
   - Add helper `calculateOrbitalElementsComparison(stateBefore, stateAfter)` that extracts altitude, speed, semi-major axis, eccentricity, inclination, RAAN, argument of periapsis, and orbital period $T = 2\pi\sqrt{a^3/\mu}$.
2. **`src/physics/conjunction.js`**:
   - Enhance `calculateConjunction` to return explicit state vectors (position and velocity) at TCA for both satellite and debris to enable instant vector comparisons.
3. **`src/physics/avoidanceOptimizer.js`**:
   - Support configurable satellite mass ($m_0$) and $I_{sp}$.
   - Ensure comprehensive secondary screening logs total checked objects, flagged hazards, and rejected maneuvers.
4. **`src/components/DistanceGraph.jsx`**:
   - Add explicit point markers at $\text{TCA}_{\text{before}}$ and $\text{TCA}_{\text{after}}$ with dashed drop lines and distance labels.
5. **`src/components/SpaceMap3D.jsx`**:
   - Add burn point 3D marker with beacon pulse.
   - Add velocity vector directional arrows (Three.js `ArrowHelper`).
   - Add visual layer toggle controls (Before trajectory, After trajectory, Debris trajectory, Velocity vectors, TCA point, Burn point).
6. **`src/App.jsx`**:
   - Integrate `BeforeAfterComparisonPanel.jsx` and `ZoomedEncounterView.jsx`.
   - Provide user state for configurable propulsion parameters (wet mass, $I_{sp}$, safety threshold).
   - Wire up action buttons: `[Run Before Simulation]`, `[Generate Avoidance Maneuvers]`, `[Run After Simulation]`, `[Compare Before vs After]`.

---

## 3. Strict Physics & Mathematical Formulations

### Orbit Propagation & State Definitions
- **Gravitational Parameter**: $\mu_{\text{Earth}} = 398600.4418 \text{ km}^3/\text{s}^2$
- **Earth Radius**: $R_{\text{Earth}} = 6378.137 \text{ km}$
- **Oblateness Factor**: $J_2 = 1.08263 \times 10^{-3}$
- **Specific Energy & Semi-major Axis**:
  $$\varepsilon = \frac{v^2}{2} - \frac{\mu}{r}, \quad a = -\frac{\mu}{2\varepsilon}$$
- **Eccentricity Vector**:
  $$\vec{e} = \frac{1}{\mu} \left[ \left( v^2 - \frac{\mu}{r} \right) \vec{r} - (\vec{r} \cdot \vec{v})\vec{v} \right], \quad e = |\vec{e}|$$
- **Inclination**:
  $$\vec{h} = \vec{r} \times \vec{v}, \quad i = \arccos\left(\frac{h_z}{|\vec{h}|}\right)$$
- **Orbital Period**:
  $$T = 2\pi \sqrt{\frac{a^3}{\mu}}$$

### RIC Maneuver Application
- Radial unit vector: $\hat{R} = \frac{\vec{r}}{|\vec{r}|}$
- Cross-track / Normal unit vector: $\vec{H} = \vec{r} \times \vec{v}, \quad \hat{N} = \frac{\vec{H}}{|\vec{H}|}$
- Along-track / In-track unit vector: $\hat{T} = \hat{N} \times \hat{R}$
- Delta-V impulse in ECI:
  $$\Delta\vec{v}_{\text{ECI}} = \Delta v_R \hat{R} + \Delta v_T \hat{T} + \Delta v_N \hat{N}$$
- Post-burn velocity:
  $$\vec{v}_{\text{after}} = \vec{v}_{\text{before}} + \Delta\vec{v}_{\text{ECI}}$$
- Actual speed change:
  $$\Delta\text{speed} = |\vec{v}_{\text{after}}| - |\vec{v}_{\text{before}}| \neq |\Delta\vec{v}|$$

### Tsiolkovsky Propellant Consumption
- Standard gravity: $g_0 = 9.80665 \text{ m/s}^2$
- Final mass: $m_f = \frac{m_0}{\exp\left(\frac{\Delta v}{I_{sp} \cdot g_0}\right)}$
- Propellant mass consumed: $\Delta m = m_0 - m_f$

---

## 4. Phase-by-Phase Development Roadmap

| Phase | Milestone | Actions |
| :--- | :--- | :--- |
| **Phase 1** | Inspect & Baseline | Audit existing code, verify dev server, ensure no breaking changes to active features. |
| **Phase 2** | Orbital Parameter Engine | Implement `calculateOrbitalElementsComparison` in `orbitEngine.js` for exact physical comparison. |
| **Phase 3** | Before Trajectory Baseline | Verify unmaneuvered nominal trajectory, baseline TCA, baseline miss distance, and initial threat tier. |
| **Phase 4** | Maneuver Optimization & Generation | Ensure grid search evaluates all 6 RIC directions with binary search for minimum safe $\Delta v$. |
| **Phase 5** | After Trajectory Simulation | Propagate post-burn state $\vec{v}_{\text{after}} = \vec{v}_{\text{before}} + \Delta\vec{v}$ through conjunction to compute new TCA and miss distance. |
| **Phase 6** | Before vs After Comparison Panel | Build `BeforeAfterComparisonPanel.jsx` with full parameter table, velocity vectors, inclination physics, and timeline. |
| **Phase 7** | Enhanced Relative Distance Graph | Update `DistanceGraph.jsx` with dual curves, TCA before/after point markers, and safety threshold annotations. |
| **Phase 8** | 3D Visualization Enhancements | Update `SpaceMap3D.jsx` with burn marker, vector arrows, and layer toggles. Create `ZoomedEncounterView.jsx`. |
| **Phase 9** | Propellant & Fuel Modeling | Wire configurable $m_0$ and $I_{sp}$ into UI and optimizer calculations. |
| **Phase 10** | Secondary Debris Screening | Screen post-burn trajectory against background catalog; log checked count and reject conflicting burns. |
| **Phase 11** | UI/UX & Mission Story Integration | Integrate all components seamlessly into `App.jsx` with step-by-step workflow buttons. |
| **Phase 12** | Complete Integration Testing | Run `node test_collision_avoidance.js`, verify numerical outputs, test UI in browser, and report final results. |
