# POLY TANK // ARENA 3D

A fast-paced, single-player 3D tactical tank combat game built with **Three.js**, **HTML5/CSS3**, and the **Web Audio API**. Pilot an armored battle tank through a 10-sector campaign featuring ricochet physics, destructible cover, tactical power-ups, difficulty presets, and multi-phase boss encounters.

---

## Key Features

- **10-Sector Tactical Campaign:** Battle across 10 unique arena layouts—from open crossfires to ricochet labyrinths and twin chokepoints—with escalating enemy AI and elite armor tiers.
- **Boss Encounters (Sectors 05 & 10):**
  - **Sector 05 — Iron Juggernaut:** A heavy siege tank armed with triple-spread cannons and escort units.
  - **Sector 10 — Omega Overlord:** A dreadnought command tank alternating between 5-shell fan barrages and rapid dual-shot bursts, triggering an **Aegis Shield + speed/fire-rate enrage** at 50% hull integrity.
- **Ricochet Ballistics & Destructible Cover:** Shells bounce up to twice off steel walls and destructible crates, allowing you to bank shots around corners and blast open enemy cover to uncover supply drops.
- **Difficulty Presets:**
  - **Recruit:** `125 HP`, lighter enemy damage, slower AI movement/reload (`0.85x` score multiplier).
  - **Veteran:** `100 HP`, balanced standard combat (`1.0x` score multiplier).
  - **Ace:** `80 HP`, lethal enemy damage, faster AI movement/reload (`1.5x` score multiplier).
- **3-Lives Respawn System:** Deploy with 3 units. Losing a hull respawns you at the south drop zone with a temporary 3-second **Aegis Shield** without resetting your sector progress.
- **Tactical Supply Drops:** Collect **Rapid Fire**, **Triple Shot**, **Aegis Shield**, and **Hull Repair** crates dropped by destroyed enemies and cover blocks.
- **Procedural Web Audio:** Zero external audio assets required—all cannon blasts, metallic ricochets, shield deflections, and explosions are synthesized in real time.

---

## Controls

| Input | Action |
| :--- | :--- |
| **`W` `A` `S` `D`** or **Arrow Keys** | Drive forward/reverse and steer hull |
| **Mouse Cursor** | Aim independent turret & laser sight |
| **Left Click** or **`Space`** | Fire ricochet shell |
| **`Esc`** or **`P`** | Toggle Tactical Pause menu |

---

## Project Structure

```text
├── index.html   # Main UI overlays (Title Screen, HUD, Pause Menu, Sector Banner)
├── style.css    # Sci-fi tactical styling, HUD telemetry, and responsive overlays
├── game.js      # Three.js 3D scene, tank physics, AI, boss logic, and campaign loop
├── audio.js     # Procedural Web Audio API sound effects synthesizer
└── README.md    # Project documentation
```

---

## Getting Started

Because `game.js` uses ES modules (`import * as THREE from 'three'`), serve the project over a local HTTP server rather than opening `index.html` directly via `file://`.

### Option 1: Using Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 2: Using Node.js (`npx serve`)
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click `index.html` in VS Code and select **Open with Live Server**.

---

## Pushing to GitHub

```bash
git add .
git commit -m "Add README and finalize 10-sector single-player campaign"
git push origin main
```