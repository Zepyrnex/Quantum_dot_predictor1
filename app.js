const materialModels = {
  cdse: {
    label: "CdSe display dots",
    bulkGap: 1.74,
    minDiameter: 2,
    maxDiameter: 9,
    baseWavelength: 700,
    confinementA: 4.7,
    confinementB: 0.12,
  },
  inp: {
    label: "InP display dots",
    bulkGap: 1.35,
    minDiameter: 2,
    maxDiameter: 9,
    baseWavelength: 720,
    confinementA: 5.5,
    confinementB: 0.10,
  },
  perovskite: {
    label: "Perovskite dots",
    bulkGap: 1.85,
    minDiameter: 2,
    maxDiameter: 9,
    baseWavelength: 680,
    confinementA: 3.9,
    confinementB: 0.08,
  },
};

const state = {
  material: "cdse",
  diameter: 4.8,
  spread: 8,
  compareWhite: true,
  showDistribution: true,
  theme: localStorage.getItem("qd-theme") || "light",
  tick: 0,
};

const presetTargets = {
  blue: { label: "Blue", wavelength: 465 },
  green: { label: "Green", wavelength: 535 },
  red: { label: "Red", wavelength: 655 },
};

const diameterLimits = {
  min: 2,
  max: 9,
};

const controls = {
  themeToggle: document.querySelector("#themeToggle"),
  themeLabel: document.querySelector("#themeLabel"),
  material: document.querySelector("#material"),
  diameter: document.querySelector("#diameter"),
  diameterNumber: document.querySelector("#diameterNumber"),
  diameterValue: document.querySelector("#diameterValue"),
  diameterWarning: document.querySelector("#diameterWarning"),
  spread: document.querySelector("#spread"),
  spreadValue: document.querySelector("#spreadValue"),
  compareWhite: document.querySelector("#compareWhite"),
  showDistribution: document.querySelector("#showDistribution"),
  resetButton: document.querySelector("#resetButton"),
  copyButton: document.querySelector("#copyButton"),
  copyStatus: document.querySelector("#copyStatus"),
  presets: document.querySelectorAll(".preset-button"),
  openFeedback: document.querySelector("#openFeedback"),
  feedbackDialog: document.querySelector("#feedbackDialog"),
  feedbackForm: document.querySelector(".feedback-form"),
  closeFeedback: document.querySelector("#closeFeedback"),
  cancelFeedback: document.querySelector("#cancelFeedback"),
  feedbackStatus: document.querySelector("#feedbackStatus"),
  featureName: document.querySelector("#featureName"),
  featureDetails: document.querySelector("#featureDetails"),
};

const output = {
  wavelengthMetric: document.querySelector("#wavelengthMetric"),
  rgbMetric: document.querySelector("#rgbMetric"),
  energyMetric: document.querySelector("#energyMetric"),
  shiftMetric: document.querySelector("#shiftMetric"),
  colorName: document.querySelector("#colorName"),
  detailedColorName: document.querySelector("#detailedColorName"),
  hexMetric: document.querySelector("#hexMetric"),
  inputRgbMetric: document.querySelector("#inputRgbMetric"),
  inputColorSwatch: document.querySelector("#inputColorSwatch"),
  spectrumMarker: document.querySelector("#spectrumMarker"),
};

const dotCanvas = document.querySelector("#dotCanvas");
const dotCtx = dotCanvas.getContext("2d");
const curveCanvas = document.querySelector("#curveCanvas");
const curveCtx = curveCanvas.getContext("2d");

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function predictFromDiameter(diameter, model) {
  const radius = diameter / 2;
  const confinementShift = model.confinementA / (diameter * diameter) - model.confinementB / radius;
  const energy = clamp(model.bulkGap + confinementShift, 1.72, 3.27);
  const wavelength = clamp(1240 / energy, 380, 720);
  return {
    energy,
    confinementShift,
    wavelength,
    rgb: wavelengthToRgb(wavelength),
    name: wavelengthName(wavelength),
  };
}

function findDiameterForWavelength(model, targetWavelength) {
  let low = model.minDiameter;
  let high = model.maxDiameter;
  for (let i = 0; i < 32; i += 1) {
    const mid = (low + high) / 2;
    const prediction = predictFromDiameter(mid, model);
    if (prediction.wavelength < targetWavelength) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return clamp((low + high) / 2, model.minDiameter, model.maxDiameter);
}

function wavelengthToRgb(wavelength) {
  let red = 0;
  let green = 0;
  let blue = 0;

  if (wavelength >= 380 && wavelength < 440) {
    red = -(wavelength - 440) / (440 - 380);
    blue = 1;
  } else if (wavelength < 490) {
    green = (wavelength - 440) / (490 - 440);
    blue = 1;
  } else if (wavelength < 510) {
    green = 1;
    blue = -(wavelength - 510) / (510 - 490);
  } else if (wavelength < 580) {
    red = (wavelength - 510) / (580 - 510);
    green = 1;
  } else if (wavelength < 645) {
    red = 1;
    green = -(wavelength - 645) / (645 - 580);
  } else if (wavelength <= 720) {
    red = 1;
  }

  let factor = 1;
  if (wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength > 700) {
    factor = 0.3 + 0.7 * (720 - wavelength) / (720 - 700);
  }

  return {
    r: Math.round(255 * Math.pow(red * factor, 0.8)),
    g: Math.round(255 * Math.pow(green * factor, 0.8)),
    b: Math.round(255 * Math.pow(blue * factor, 0.8)),
  };
}

function wavelengthName(wavelength) {
  if (wavelength < 430) return "Violet";
  if (wavelength < 490) return "Blue";
  if (wavelength < 565) return "Green";
  if (wavelength < 590) return "Yellow";
  if (wavelength < 625) return "Orange";
  return "Red";
}

function detailedWavelengthName(wavelength) {
  if (wavelength < 410) return "Deep violet";
  if (wavelength < 435) return "Electric violet";
  if (wavelength < 465) return "Royal blue";
  if (wavelength < 490) return "Cyan blue";
  if (wavelength < 525) return "Blue green";
  if (wavelength < 555) return "Emerald green";
  if (wavelength < 575) return "Lime green";
  if (wavelength < 590) return "Golden yellow";
  if (wavelength < 610) return "Amber orange";
  if (wavelength < 635) return "Vermilion red";
  if (wavelength < 675) return "Deep red";
  return "Crimson red";
}

function rgbString(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function rgbToHex(rgb) {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function formatDiameter(value) {
  return Number(value).toFixed(1);
}

function setDiameterWarning(message) {
  controls.diameterWarning.textContent = message;
  controls.diameterNumber.closest(".diameter-input-row").classList.toggle("is-invalid", Boolean(message));
}

function applyDiameter(value, { syncInput = true } = {}) {
  const roundedValue = Number(clamp(value, diameterLimits.min, diameterLimits.max).toFixed(1));
  state.diameter = roundedValue;
  controls.diameter.value = String(roundedValue);
  if (syncInput) {
    controls.diameterNumber.value = formatDiameter(roundedValue);
  }
  setDiameterWarning("");
  updateOutput({ syncDiameterInput: syncInput });
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
  const rawValue = controls.diameterNumber.value.trim();
  if (rawValue === "" || !Number.isFinite(Number(rawValue))) {
    controls.diameterNumber.value = formatDiameter(state.diameter);
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

function resizeCanvas(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.round(rect.width * ratio));
  const height = Math.max(240, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  return { width: rect.width, height: rect.height };
}

function drawDotScene(prediction) {
  const { width, height } = resizeCanvas(dotCanvas, dotCtx);
  dotCtx.clearRect(0, 0, width, height);

  const rgb = prediction.rgb;
  const color = rgbString(rgb);
  const glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.36)`;
  const panelGradient = dotCtx.createLinearGradient(0, 0, width, height);
  panelGradient.addColorStop(0, "#0c0c0c");
  panelGradient.addColorStop(0.55, "#181818");
  panelGradient.addColorStop(1, "#050505");
  dotCtx.fillStyle = panelGradient;
  dotCtx.fillRect(0, 0, width, height);

  drawPixelMatrix(width, height, color, glow);
  drawNanocrystal(width, height, color, glow);
  drawPhotonRays(width, height, color);
}

function drawPixelMatrix(width, height, color, glow) {
  const cell = Math.max(22, Math.min(38, width / 19));
  const startX = width * 0.08;
  const startY = height * 0.12;
  const cols = Math.floor((width * 0.54) / cell);
  const rows = Math.floor((height * 0.72) / cell);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = startX + col * cell;
      const y = startY + row * cell;
      const phase = Math.sin((row + col) * 0.8 + state.tick * 0.03);
      const alpha = state.compareWhite ? 0.22 + phase * 0.04 : 0.08;
      dotCtx.fillStyle = state.compareWhite ? `rgba(255,255,255,${alpha})` : "rgba(255,255,255,0.05)";
      dotCtx.fillRect(x, y, cell - 5, cell - 5);
      dotCtx.fillStyle = color;
      dotCtx.globalAlpha = 0.68 + phase * 0.14;
      dotCtx.fillRect(x + 4, y + 4, cell - 13, cell - 13);
      dotCtx.globalAlpha = 1;
    }
  }

  dotCtx.shadowColor = glow;
  dotCtx.shadowBlur = 24;
  dotCtx.strokeStyle = color;
  dotCtx.lineWidth = 2;
  dotCtx.strokeRect(startX - 10, startY - 10, cols * cell + 3, rows * cell + 3);
  dotCtx.shadowBlur = 0;
}

function drawNanocrystal(width, height, color, glow) {
  const centerX = width * 0.76;
  const centerY = height * 0.48;
  const radius = 26 + state.diameter * 7.2;

  dotCtx.save();
  dotCtx.shadowColor = glow;
  dotCtx.shadowBlur = 42;
  dotCtx.beginPath();
  dotCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  dotCtx.fillStyle = color;
  dotCtx.fill();
  dotCtx.shadowBlur = 0;
  dotCtx.lineWidth = 2;
  dotCtx.strokeStyle = "rgba(255,255,255,0.78)";
  dotCtx.stroke();

  for (let i = 0; i < 13; i += 1) {
    const angle = i * 2.399 + state.tick * 0.008;
    const r = radius * (0.22 + (i % 5) * 0.13);
    dotCtx.beginPath();
    dotCtx.arc(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, Math.max(3, radius * 0.055), 0, Math.PI * 2);
    dotCtx.fillStyle = "rgba(255,255,255,0.55)";
    dotCtx.fill();
  }

  dotCtx.fillStyle = "rgba(255,255,255,0.82)";
  dotCtx.font = "800 13px system-ui, sans-serif";
  dotCtx.textAlign = "center";
  dotCtx.fillText(`${state.diameter.toFixed(1)} nm`, centerX, centerY + radius + 28);
  dotCtx.restore();
}

function drawPhotonRays(width, height, color) {
  const originX = width * 0.73;
  const originY = height * 0.48;
  dotCtx.save();
  dotCtx.strokeStyle = color;
  dotCtx.lineWidth = 2;
  dotCtx.globalAlpha = 0.72;
  for (let i = -2; i <= 2; i += 1) {
    const y = originY + i * 28;
    dotCtx.beginPath();
    dotCtx.moveTo(originX - 46, y);
    dotCtx.bezierCurveTo(originX - 110, y - 20, originX - 155, y + 20, originX - 220, y);
    dotCtx.stroke();
  }
  dotCtx.restore();
}

function drawCurve(prediction) {
  const { width, height } = resizeCanvas(curveCanvas, curveCtx);
  curveCtx.clearRect(0, 0, width, height);
  const padding = { left: 58, right: 24, top: 26, bottom: 48 };
  const model = materialModels[state.material];
  const minD = model.minDiameter;
  const maxD = model.maxDiameter;
  const minW = 380;
  const maxW = 720;

  function xScale(diameter) {
    return padding.left + (diameter - minD) / (maxD - minD) * (width - padding.left - padding.right);
  }

  function yScale(wavelength) {
    return padding.top + (maxW - wavelength) / (maxW - minW) * (height - padding.top - padding.bottom);
  }

  curveCtx.fillStyle = cssVar("--canvas-bg") || "#fbfdfc";
  curveCtx.fillRect(0, 0, width, height);
  curveCtx.strokeStyle = cssVar("--line") || "#d9e2dd";
  curveCtx.lineWidth = 1;

  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + i / 5 * (height - padding.top - padding.bottom);
    curveCtx.beginPath();
    curveCtx.moveTo(padding.left, y);
    curveCtx.lineTo(width - padding.right, y);
    curveCtx.stroke();
  }

  curveCtx.strokeStyle = cssVar("--ink") || "#17201c";
  curveCtx.lineWidth = 2;
  curveCtx.beginPath();
  curveCtx.moveTo(padding.left, padding.top);
  curveCtx.lineTo(padding.left, height - padding.bottom);
  curveCtx.lineTo(width - padding.right, height - padding.bottom);
  curveCtx.stroke();

  curveCtx.beginPath();
  for (let i = 0; i <= 110; i += 1) {
    const d = minD + (maxD - minD) * i / 110;
    const p = predictFromDiameter(d, model);
    const x = xScale(d);
    const y = yScale(p.wavelength);
    if (i === 0) curveCtx.moveTo(x, y);
    else curveCtx.lineTo(x, y);
  }
  curveCtx.strokeStyle = cssVar("--accent") || "#006b5b";
  curveCtx.lineWidth = 4;
  curveCtx.stroke();

  if (state.showDistribution) {
    const spreadNm = state.diameter * state.spread / 100;
    const left = xScale(clamp(state.diameter - spreadNm, minD, maxD));
    const right = xScale(clamp(state.diameter + spreadNm, minD, maxD));
    curveCtx.fillStyle = state.theme === "dark" ? "rgba(143,184,255,0.16)" : "rgba(33,87,163,0.12)";
    curveCtx.fillRect(left, padding.top, Math.max(2, right - left), height - padding.top - padding.bottom);
  }

  const px = xScale(state.diameter);
  const py = yScale(prediction.wavelength);
  curveCtx.fillStyle = rgbString(prediction.rgb);
  curveCtx.strokeStyle = cssVar("--ink") || "#17201c";
  curveCtx.lineWidth = 3;
  curveCtx.beginPath();
  curveCtx.arc(px, py, 8, 0, Math.PI * 2);
  curveCtx.fill();
  curveCtx.stroke();

  curveCtx.fillStyle = cssVar("--ink") || "#17201c";
  curveCtx.font = "700 12px system-ui, sans-serif";
  curveCtx.textAlign = "center";
  curveCtx.fillText("Quantum dot diameter (nm)", width / 2, height - 14);
  curveCtx.save();
  curveCtx.translate(16, height / 2);
  curveCtx.rotate(-Math.PI / 2);
  curveCtx.fillText("Emission wavelength (nm)", 0, 0);
  curveCtx.restore();

  curveCtx.textAlign = "right";
  curveCtx.fillStyle = cssVar("--muted") || "#5d6a64";
  [400, 500, 600, 700].forEach((value) => {
    curveCtx.fillText(String(value), padding.left - 10, yScale(value) + 4);
  });
  curveCtx.textAlign = "center";
  [2, 4, 6, 8].forEach((value) => {
    curveCtx.fillText(String(value), xScale(value), height - padding.bottom + 22);
  });
}

function syncControls() {
  controls.material.value = state.material;
  controls.diameter.value = String(state.diameter);
  controls.diameterNumber.value = formatDiameter(state.diameter);
  controls.spread.value = String(state.spread);
  controls.compareWhite.checked = state.compareWhite;
  controls.showDistribution.checked = state.showDistribution;
  setDiameterWarning("");
}

function syncPresetButtons() {
  const model = materialModels[state.material];
  controls.presets.forEach((button) => {
    const preset = presetTargets[button.dataset.preset];
    if (!preset) return;
    const diameter = findDiameterForWavelength(model, preset.wavelength);
    button.dataset.diameter = diameter.toFixed(1);
    button.title = `${preset.label} preset: ${diameter.toFixed(1)} nm`;
    button.setAttribute("aria-label", `${preset.label} preset, ${diameter.toFixed(1)} nanometers`);
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  controls.themeLabel.textContent = state.theme === "dark" ? "Light" : "Dark";
  controls.themeToggle.setAttribute(
    "aria-label",
    state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
  localStorage.setItem("qd-theme", state.theme);
}

function updateOutput({ syncDiameterInput = true } = {}) {
  const model = materialModels[state.material];
  const prediction = predictFromDiameter(state.diameter, model);
  const rgb = prediction.rgb;
  const wavelength = Math.round(prediction.wavelength);
  const hex = rgbToHex(rgb);
  const detailedName = detailedWavelengthName(prediction.wavelength);

  syncPresetButtons();
  controls.diameter.value = String(state.diameter);
  if (syncDiameterInput) {
    controls.diameterNumber.value = formatDiameter(state.diameter);
  }
  controls.diameterValue.value = `${state.diameter.toFixed(1)} nm`;
  controls.spreadValue.value = `${state.spread}%`;
  output.wavelengthMetric.textContent = `${wavelength} nm`;
  output.rgbMetric.textContent = rgbString(rgb);
  output.energyMetric.textContent = `${prediction.energy.toFixed(2)} eV`;
  output.shiftMetric.textContent = `${prediction.confinementShift >= 0 ? "+" : ""}${prediction.confinementShift.toFixed(2)} eV`;
  output.colorName.textContent = prediction.name;
  output.detailedColorName.textContent = detailedName;
  output.hexMetric.textContent = hex;
  output.inputRgbMetric.textContent = rgbString(rgb);
  output.inputColorSwatch.style.background = hex;
  output.spectrumMarker.style.left = `${clamp((prediction.wavelength - 380) / (700 - 380) * 100, 0, 100)}%`;
  document.documentElement.style.setProperty("--live-color", rgbString(rgb));

  drawDotScene(prediction);
  drawCurve(prediction);
}

function resetSimulation() {
  state.material = "cdse";
  state.diameter = 4.8;
  state.spread = 8;
  state.compareWhite = true;
  state.showDistribution = true;
  syncControls();
  updateOutput();
}

async function copyResult() {
  const model = materialModels[state.material];
  const prediction = predictFromDiameter(state.diameter, model);
  const hex = rgbToHex(prediction.rgb);
  const detailedName = detailedWavelengthName(prediction.wavelength);
  const summary = [
    "Quantum Dot Display Color Simulator Result",
    `Material: ${model.label}`,
    `Diameter: ${state.diameter.toFixed(1)} nm`,
    `Emission wavelength: ${Math.round(prediction.wavelength)} nm`,
    `Detailed color: ${detailedName}`,
    `HEX output: ${hex}`,
    `RGB output: ${rgbString(prediction.rgb)}`,
    `Band gap energy: ${prediction.energy.toFixed(2)} eV`,
    `Confinement shift: ${prediction.confinementShift >= 0 ? "+" : ""}${prediction.confinementShift.toFixed(2)} eV`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    controls.copyStatus.textContent = "Copied result summary.";
  } catch {
    controls.copyStatus.textContent = summary;
  }

  window.setTimeout(() => {
    if (controls.copyStatus.textContent === "Copied result summary.") {
      controls.copyStatus.textContent = "";
    }
  }, 2200);
}

function openFeedbackDialog() {
  controls.feedbackStatus.textContent = "";
  if (typeof controls.feedbackDialog.showModal === "function") {
    controls.feedbackDialog.showModal();
  } else {
    controls.feedbackDialog.setAttribute("open", "");
  }
  controls.featureName.focus();
}

function closeFeedbackDialog() {
  controls.feedbackDialog.close();
}

function saveFeedbackIdea(event) {
  event.preventDefault();
  const name = controls.featureName.value.trim();
  const details = controls.featureDetails.value.trim();
  if (!name && !details) {
    controls.feedbackStatus.textContent = "Add a feature name or short description.";
    return;
  }

  const ideas = JSON.parse(localStorage.getItem("qd-feature-ideas") || "[]");
  ideas.push({
    name: name || "Untitled feature",
    details,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("qd-feature-ideas", JSON.stringify(ideas));
  controls.feedbackStatus.textContent = "Saved. Thanks for the idea.";
  controls.featureName.value = "";
  controls.featureDetails.value = "";
  window.setTimeout(closeFeedbackDialog, 900);
}

function animate() {
  state.tick += 1;
  const prediction = predictFromDiameter(state.diameter, materialModels[state.material]);
  drawDotScene(prediction);
  requestAnimationFrame(animate);
}

controls.material.addEventListener("change", (event) => {
  state.material = event.target.value;
  updateOutput();
});

controls.diameter.addEventListener("input", (event) => {
  applyDiameter(Number(event.target.value));
});

controls.diameterNumber.addEventListener("input", (event) => {
  handleDiameterTyping(event.target.value);
});

controls.diameterNumber.addEventListener("blur", commitDiameterInput);

controls.diameterNumber.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    commitDiameterInput();
    controls.diameterNumber.blur();
  }
});

controls.spread.addEventListener("input", (event) => {
  state.spread = Number(event.target.value);
  updateOutput();
});

controls.compareWhite.addEventListener("change", (event) => {
  state.compareWhite = event.target.checked;
  updateOutput();
});

controls.showDistribution.addEventListener("change", (event) => {
  state.showDistribution = event.target.checked;
  updateOutput();
});

controls.themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  updateOutput();
});

controls.presets.forEach((button) => {
  button.addEventListener("click", () => {
    const preset = presetTargets[button.dataset.preset];
    if (!preset) return;
    applyDiameter(findDiameterForWavelength(materialModels[state.material], preset.wavelength));
  });
});

controls.resetButton.addEventListener("click", resetSimulation);
controls.copyButton.addEventListener("click", copyResult);
controls.openFeedback.addEventListener("click", openFeedbackDialog);
controls.closeFeedback.addEventListener("click", closeFeedbackDialog);
controls.cancelFeedback.addEventListener("click", closeFeedbackDialog);
controls.feedbackForm.addEventListener("submit", saveFeedbackIdea);

document.querySelectorAll("[data-open-tab]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.open(link.href, "_blank", "noopener");
  });
});

window.addEventListener("resize", updateOutput);

applyTheme();
syncControls();
updateOutput();
requestAnimationFrame(animate);
