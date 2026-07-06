const models = {
  cdse: { label: "CdSe display dots", bulkGap: 1.74, confinementA: 4.7, confinementB: 0.12 },
  inp: { label: "InP display dots", bulkGap: 1.35, confinementA: 5.5, confinementB: 0.10 },
  perovskite: { label: "Perovskite dots", bulkGap: 1.85, confinementA: 3.9, confinementB: 0.08 },
};

const simState = {
  material: "cdse",
  diameter: 4.8,
  theme: localStorage.getItem("qd-theme") || "light",
  tick: 0,
};

const diameterLimits = {
  min: 2,
  max: 9,
};

const ui = {
  themeToggle: document.querySelector("#themeToggle"),
  themeLabel: document.querySelector("#themeLabel"),
  material: document.querySelector("#confMaterial"),
  diameter: document.querySelector("#confDiameter"),
  diameterNumber: document.querySelector("#confDiameterNumber"),
  diameterValue: document.querySelector("#confDiameterValue"),
  diameterWarning: document.querySelector("#confDiameterWarning"),
  energy: document.querySelector("#confEnergy"),
  wavelength: document.querySelector("#confWavelength"),
  shift: document.querySelector("#confShift"),
};

const canvas = document.querySelector("#confCanvas");
const ctx = canvas.getContext("2d");

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function predict(diameter, model) {
  const radius = diameter / 2;
  const confinementShift = model.confinementA / (diameter * diameter) - model.confinementB / radius;
  const energy = clamp(model.bulkGap + confinementShift, 1.72, 3.27);
  const wavelength = clamp(1240 / energy, 380, 720);
  return {
    energy,
    wavelength,
    rgb: wavelengthToRgb(wavelength),
    direction: `Toward ${wavelengthName(wavelength).toLowerCase()}`,
  };
}

function wavelengthName(wavelength) {
  if (wavelength < 430) return "violet";
  if (wavelength < 490) return "blue";
  if (wavelength < 565) return "green";
  if (wavelength < 590) return "yellow";
  if (wavelength < 625) return "orange";
  return "red";
}

function wavelengthToRgb(wavelength) {
  let red = 0;
  let green = 0;
  let blue = 0;

  if (wavelength >= 380 && wavelength < 440) {
    red = -(wavelength - 440) / 60;
    blue = 1;
  } else if (wavelength < 490) {
    green = (wavelength - 440) / 50;
    blue = 1;
  } else if (wavelength < 510) {
    green = 1;
    blue = -(wavelength - 510) / 20;
  } else if (wavelength < 580) {
    red = (wavelength - 510) / 70;
    green = 1;
  } else if (wavelength < 645) {
    red = 1;
    green = -(wavelength - 645) / 65;
  } else {
    red = 1;
  }

  const edgeFactor = wavelength < 420
    ? 0.3 + 0.7 * (wavelength - 380) / 40
    : wavelength > 700
      ? 0.3 + 0.7 * (720 - wavelength) / 20
      : 1;

  return {
    r: Math.round(255 * Math.pow(red * edgeFactor, 0.8)),
    g: Math.round(255 * Math.pow(green * edgeFactor, 0.8)),
    b: Math.round(255 * Math.pow(blue * edgeFactor, 0.8)),
  };
}

function rgbString(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function formatDiameter(value) {
  return Number(value).toFixed(1);
}

function setDiameterWarning(message) {
  ui.diameterWarning.textContent = message;
  ui.diameterNumber.closest(".diameter-input-row").classList.toggle("is-invalid", Boolean(message));
}

function applyDiameter(value, { syncInput = true } = {}) {
  const roundedValue = Number(clamp(value, diameterLimits.min, diameterLimits.max).toFixed(1));
  simState.diameter = roundedValue;
  ui.diameter.value = String(roundedValue);
  if (syncInput) {
    ui.diameterNumber.value = formatDiameter(roundedValue);
  }
  setDiameterWarning("");
  update({ syncDiameterInput: syncInput });
}

function handleDiameterTyping(rawValue) {
  const trimmedValue = rawValue.trim();
  if (trimmedValue === "") {
    setDiameterWarning(`Enter a value from ${diameterLimits.min.toFixed(1)} nm to ${diameterLimits.max.toFixed(1)} nm.`);
    return;
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isFinite(numericValue)) {
    setDiameterWarning(`Enter a value from ${diameterLimits.min.toFixed(1)} nm to ${diameterLimits.max.toFixed(1)} nm.`);
    return;
  }

  if (numericValue < diameterLimits.min) {
    setDiameterWarning(`Minimum allowed diameter is ${diameterLimits.min.toFixed(1)} nm.`);
    return;
  }

  if (numericValue > diameterLimits.max) {
    setDiameterWarning(`Maximum allowed diameter is ${diameterLimits.max.toFixed(1)} nm.`);
    return;
  }

  applyDiameter(numericValue, { syncInput: false });
}

function commitDiameterInput() {
  const rawValue = ui.diameterNumber.value.trim();
  if (rawValue === "" || !Number.isFinite(Number(rawValue))) {
    ui.diameterNumber.value = formatDiameter(simState.diameter);
    setDiameterWarning("");
    return;
  }

  const numericValue = Number(rawValue);
  if (numericValue < diameterLimits.min) {
    applyDiameter(diameterLimits.min);
    setDiameterWarning(`Minimum allowed diameter is ${diameterLimits.min.toFixed(1)} nm. Using ${diameterLimits.min.toFixed(1)} nm.`);
    return;
  }

  if (numericValue > diameterLimits.max) {
    applyDiameter(diameterLimits.max);
    setDiameterWarning(`Maximum allowed diameter is ${diameterLimits.max.toFixed(1)} nm. Using ${diameterLimits.max.toFixed(1)} nm.`);
    return;
  }

  applyDiameter(numericValue);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.round(rect.width * ratio));
  const height = Math.max(260, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  return { width: rect.width, height: rect.height };
}

function applyTheme() {
  document.documentElement.dataset.theme = simState.theme;
  ui.themeLabel.textContent = simState.theme === "dark" ? "Light" : "Dark";
  ui.themeToggle.setAttribute(
    "aria-label",
    simState.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
  localStorage.setItem("qd-theme", simState.theme);
}

function draw() {
  const { width, height } = resizeCanvas();
  const result = predict(simState.diameter, models[simState.material]);
  const color = rgbString(result.rgb);
  const ink = cssVar("--ink") || "#edf8f4";
  const muted = cssVar("--muted") || "#aec1ba";
  const accent = cssVar("--accent") || "#4dd8bd";
  const radius = 38 + simState.diameter * 9;
  const centerX = width * 0.24;
  const centerY = height * 0.52;
  const gapHeight = 74 + (result.energy - 1.72) / (3.27 - 1.72) * 132;

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#080808");
  bg.addColorStop(0.55, "#151515");
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 44;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 160; i += 1) {
    const t = i / 160;
    const x = centerX - radius * 0.72 + t * radius * 1.44;
    const y = centerY + Math.sin(t * Math.PI * 4 + simState.tick * 0.035) * radius * 0.22;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${simState.diameter.toFixed(1)} nm dot`, centerX, centerY + radius + 28);

  const bandX = width * 0.54;
  const bandWidth = width * 0.32;
  const midY = height * 0.52;
  const conductionY = midY - gapHeight / 2;
  const valenceY = midY + gapHeight / 2;

  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.moveTo(bandX, conductionY);
  ctx.lineTo(bandX + bandWidth, conductionY);
  ctx.stroke();

  ctx.strokeStyle = "#f2f2f2";
  ctx.beginPath();
  ctx.moveTo(bandX, valenceY);
  ctx.lineTo(bandX + bandWidth, valenceY);
  ctx.stroke();

  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.moveTo(bandX + bandWidth + 24, conductionY);
  ctx.lineTo(bandX + bandWidth + 24, valenceY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = ink;
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Conduction band", bandX, conductionY - 18);
  ctx.fillText("Valence band", bandX, valenceY + 30);
  ctx.fillStyle = muted;
  ctx.fillText(`${result.energy.toFixed(2)} eV gap`, bandX + bandWidth + 34, midY + 5);

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bandX - 30, midY);
  ctx.lineTo(centerX + radius + 68, centerY);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(centerX + radius + 75, centerY);
  ctx.lineTo(centerX + radius + 55, centerY - 10);
  ctx.lineTo(centerX + radius + 55, centerY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(result.wavelength)} nm photon`, (bandX + centerX + radius + 36) / 2, midY - 18);
}

function update({ syncDiameterInput = true } = {}) {
  const result = predict(simState.diameter, models[simState.material]);
  ui.diameter.value = String(simState.diameter);
  if (syncDiameterInput) {
    ui.diameterNumber.value = formatDiameter(simState.diameter);
  }
  ui.diameterValue.value = `${simState.diameter.toFixed(1)} nm`;
  ui.energy.textContent = `${result.energy.toFixed(2)} eV`;
  ui.wavelength.textContent = `${Math.round(result.wavelength)} nm`;
  ui.shift.textContent = result.direction;
  draw();
}

ui.themeToggle.addEventListener("click", () => {
  simState.theme = simState.theme === "dark" ? "light" : "dark";
  applyTheme();
  draw();
});

ui.material.addEventListener("change", (event) => {
  simState.material = event.target.value;
  update();
});

ui.diameter.addEventListener("input", (event) => {
  applyDiameter(Number(event.target.value));
});

ui.diameterNumber.addEventListener("input", (event) => {
  handleDiameterTyping(event.target.value);
});

ui.diameterNumber.addEventListener("blur", commitDiameterInput);

ui.diameterNumber.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    commitDiameterInput();
    ui.diameterNumber.blur();
  }
});

window.addEventListener("resize", update);

function animate() {
  simState.tick += 1;
  draw();
  requestAnimationFrame(animate);
}

applyTheme();
update();
requestAnimationFrame(animate);
