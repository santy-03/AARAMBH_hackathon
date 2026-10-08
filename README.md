# 🛰️ AstroGuard 3D — Space Debris Tracking & Minimum-Energy Avoidance System

> **AARAMBH Hackathon Submission Guide & Team Documentation**  
> *A comprehensive, beginner-friendly guide for teammates & judges explaining how our Orbital Mechanics, Real-Time Conjunction Assessment, Collision Risk Evaluator, and Minimum-Energy Avoidance Optimizer work.*

---

## 📌 1. Project Overview & Hackathon Problem Statement Explained

### What is the Problem?
Orbital space debris poses a catastrophic threat to satellites, space stations, and LEO constellations. Every collision creates thousands of hypervelocity fragments in a dangerous domino effect known as the **Kessler Syndrome**.

### The Hackathon Problem Statement Broken Down:
> *"Develop a system that tracks simulated space-debris trajectories, predicts potential intersections with a satellite's path, calculates collision risk, and determines an appropriate avoidance maneuver while minimizing energy."*

Our software **AstroGuard 3D** provides a direct 4-step solution engine matching this exact problem statement:

```
           ┌──────────────────────────────────────────────┐
           │ 1. TRACK SATELLITE & SPACE DEBRIS (3D ECI)   │
           └──────────────────────┬───────────────────────┘
                                  │
                                  ▼
           ┌──────────────────────────────────────────────┐
           │ 2. PREDICT CLOSEST APPROACH (TCA & DISTANCE) │
           └──────────────────────┬───────────────────────┘
                                  │
                                  ▼
           ┌──────────────────────────────────────────────┐
           │ 3. CALCULATE COLLISION RISK SCORE (0 - 100)  │
           └──────────────────────┬───────────────────────┘
                                  │
                                  ▼
           ┌──────────────────────────────────────────────┐
           │ 4. OPTIMIZE MINIMUM-ENERGY AVOIDANCE BURN    │
           │    (Find smallest ΔV m/s saving 85%+ fuel!) │
           └──────────────────────────────────────────────┘
```

---

## 📋 2. Direct Problem Statement Answer Panel & State Vector Inputs

AstroGuard 3D includes a dedicated **Hackathon Answer Panel** (`HackathonAnswerPanel.jsx`) displayed prominently at the top of the main screen:

1. **Direct Output Format**:
   - **Tracked Trajectories**: Satellite & Debris names, NORAD catalog numbers.
   - **Closest Approach (TCA)**: Time to closest approach in minutes, miss distance ($d_{\text{min}}$ in km), relative velocity ($v_{\text{rel}}$ in km/s).
   - **Collision Risk Score**: Risk score (0–100), Probability of Collision ($P_c$), and Threat Tier (Nominal, Monitor, Warning, Critical).
   - **Min-Energy Avoidance Burn**: Optimal velocity impulse ($\Delta v$ in m/s), burn direction (Prograde $+T$), expected safe distance (km), and propellant saved (%).
2. **Cartesian State Vector Calculator $(x, y, z, v_x, v_y, v_z)$**:
   - Allows users/judges to input custom 3D Position vectors $(x, y, z)$ in km and Velocity vectors $(v_x, v_y, v_z)$ in km/s for any hypothetical satellite and debris encounter!

---

## 📂 3. File Architecture & Codebase Map (For Teammates)

Here is what every file in `src/` does in plain English:

```
d:\AARAMBH_hackathon\src\
├── physics/
│   ├── constants.js          # Core aerospace numbers (Earth radius 6371 km, MU = 398600, safe threshold 5 km)
│   ├── orbitEngine.js        # Mathematical orbit propagator: moves satellites & debris around Earth in 3D
│   ├── conjunction.js        # Calculates exact Time of Closest Approach (TCA) and miss distance
│   ├── riskModel.js          # Calculates Risk Score (0-100) and Probability of Collision (Pc)
│   ├── avoidanceOptimizer.js # AI solver that tests burn directions to find the lowest energy (ΔV m/s)
│   ├── celestrakApi.js       # Fetches LIVE real-world satellites (ISS, Hubble, Starlink) from NORAD API
│   └── scenarios.js          # Hackathon scenario presets (LEO high risk, Cosmos ASAT swarm, GEO drift)
├── components/
│   ├── HackathonAnswerPanel.jsx # Top banner printing direct problem statement answers & vector inputs
│   ├── SpaceMap3D.jsx        # Three.js WebGL canvas: renders 3D Earth, orbit lines, zoom controls & beacons
│   ├── HackathonPitchGuide.jsx# Pitch guidance bar with 1-click pitch burn button & CelesTrak picker
│   ├── Header.jsx            # Top bar with live UTC clock, scenario selector, and risk status badge
│   ├── TimeControls.jsx      # Time scrubber bar: Play/Pause, 1x-300x speed, Step + Jump to TCA
│   ├── DebrisMonitorPanel.jsx# Catalog list of 250+ tracked debris items with "Detect New Debris" button
│   ├── RiskAssessmentCard.jsx# Detailed risk score gauge, Pc probability & RIC separation breakdown
│   ├── AvoidanceOptimizerPanel.jsx # Recommended burn card, candidate matrix table & Thruster Sandbox
│   ├── DistanceGraph.jsx     # Canvas graph showing distance curve d(t) before vs after avoidance burn
│   ├── MissionReportModal.jsx# Generates exportable JSON mission collision & avoidance certificates
│   └── AddDebrisModal.jsx    # Modal for simulating real-time radar discovery of newly detected debris
├── utils/
│   └── audio.js              # Web Audio synthesizer for space telemetry sounds & thruster burn rumble
├── App.jsx                   # Main React dashboard controller connecting all physics & components
└── main.jsx / index.css      # App entry point & Tailwind CSS dark aerospace styling
```

---

## 🧮 4. Easy Physics & Math Guide (How the Algorithms Work)

### A. What is $\Delta v$ (Delta-V) and Energy Minimization?
- **$\Delta v$ (Delta-V)** is the change in velocity required to change a satellite's orbit.
- **Why minimize $\Delta v$?** Rocket propellant on a satellite is strictly limited. Making a large maneuver ($\Delta v = 20\text{ m/s}$) uses up years of operational fuel. Our optimizer searches for the **smallest possible burn** ($\Delta v = 1.4\text{ m/s}$) executed at the optimal time (e.g., 0.5 orbit prior), saving **85%+ fuel** while still maintaining a safe separation distance ($d \ge 5.0\text{ km}$)!

### B. What is Orbit Propagation & $J_2$ Perturbation?
- Standard orbits follow **Keplerian 2-body laws** ($\vec{F} = -\frac{G M m}{r^2} \hat{r}$).
- Earth is not a perfect sphere; it bulges at the equator. This oblateness is modeled mathematically by the **$J_2$ perturbation factor**, causing the orbit plane to slowly rotate in space over time ($\dot{\Omega}$ and $\dot{\omega}$).

### C. What is the RIC Orbital Frame?
When describing relative position between satellite and debris, we use the **RIC (Radial, In-track, Cross-track)** frame:
- **Radial ($\Delta R$)**: Distance pointing directly away from Earth center.
- **In-Track ($\Delta I$)**: Distance pointing along the satellite's forward motion vector.
- **Cross-Track ($\Delta C$)**: Distance pointing out of the orbital plane (North/South).

---

## 🗣️ 5. 3-Minute Hackathon Presentation Script (Read this to Judges!)

Follow this exact 5-step script when presenting our demo to hackathon judges:

1. **Introduce the Problem (15 seconds)**:
   > *"Judges, space debris is a critical threat in LEO. Even a 2 cm paint fleck travelling at 14 km/s can destroy an operational satellite. Our project, AstroGuard 3D, automates collision prediction and calculates minimum-energy avoidance maneuvers."*

2. **Demonstrate Live Satellite Data (30 seconds)**:
   > *"Notice our top bar connects directly to the CelesTrak NORAD API. We can track live real-world satellites like the International Space Station (NORAD 25544) or Hubble Space Telescope in real time."*

3. **Highlight Conjunction Hazard & Risk (45 seconds)**:
   > *"Our propagator continuously scans future positions. Here, our system detects an incoming fragment of Fengyun-1C debris with a closest approach of just 0.48 km in 24 minutes. The system automatically assigns a Critical Hazard Risk Score of 96/100."*

4. **Execute 1-Click Minimum-Energy Avoidance (60 seconds)**:
   > *"Instead of making a huge, fuel-wasting emergency burn, our Min-Energy Optimizer tests orbital burn directions and lead times. By executing a tiny 1.45 m/s tangential burn 35 minutes prior, we increase miss distance to 14.2 km while saving 88% fuel propellant! Let me click 'Solve & Execute Burn' — notice the trajectory turns neon green and the hazard is mitigated!"*

5. **Show Certificate & Custom Vector Input (30 seconds)**:
   > *"Finally, we can input custom position/velocity vectors (X,Y,Z) for any scenario or export a verified JSON telemetry certificate for mission logs."*

---

## 💻 6. How to Run & Use the Application

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

### 🎮 Global Keyboard Shortcuts:
- **`Space`** — Play / Pause simulation clock
- **`Key M`** — Execute 1-Click Minimum-Energy Avoidance Burn
- **`Key D`** — Open Detect New Debris Modal
- **`Key R`** — Reset satellite trajectory back to original orbit
