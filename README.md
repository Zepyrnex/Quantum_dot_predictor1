# Quantum Dot Display Color Simulator

Static prototype web app for the project "Quantum Dot-Based Display Color Simulation".

## Features

- Quantum dot diameter input in nanometers
- Material model presets for CdSe, InP, and perovskite dots
- Emission wavelength prediction
- RGB color output
- Band gap energy and confinement shift estimates
- Visible spectrum marker
- Size vs wavelength graph
- Display pixel and nanocrystal visualization
- Detailed color name, RGB, and HEX output in the input panel
- Light/dark mode toggle with sun and moon icons
- Quick blue, green, and red presets
- Reset and copy-result controls
- Feature suggestion popup saved in local browser storage
- Separate quantum confinement simulation page

## Run on your laptop

Open a terminal in this folder and run one of these:

```powershell
node server.mjs
```

or, if you prefer Python:

```powershell
python -m http.server 8080 --bind 0.0.0.0
```

Then open:

```text
http://localhost:8080
```
To view from another device on the same Wi-Fi, replace `localhost` with your laptop's local IP address.
## Project note
The prediction model is a prototype trend model for demonstrating quantum confinement. It is useful for visualization and learning, not a lab-grade material design calculator.

