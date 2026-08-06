const starter = [
  "0000000000000000000000000000000000000MMMMMMMMM0000",
  "0000000000000000000000000000000000MMMMMMMMMMMM0000",
  "00000000000000000000000000000000BBBBBMMMMMMM000000",
  "000001100000000000000000000000BBBBBBBBBB0000000000",
  "0000111100000000000000000000CCCCCCCCBBBB0000000000",
  "0001121100000000000000000CCCCCCCCCCCCC000000000000",
  "00011155200000000000000GGGGGGGGGGGGCCC000000000000",
  "00001555334RRRRRYYYYYGGGGGGGGGGGGGG000000000000000",
  "000011510000000RRRRRYYYYYYYYYYYYGGG000000000000000",
  "000115511000000000RRRRRRYYYYYYYY000000000000000000",
  "0011155511000000000000RRRRR00000000000000000000000",
  "01115555510000000000000000000000000000000000000000",
  "11115555511000000000000000000000000000000000000000",
  "11115555511000000000000000000000000000000000000000",
  "01111555110000000000000000000000000000000000000000",
  "00111111100000000000000000000000000000000000000000",
  "00110001100000000000000000000000000000000000000000",
  "00110001100000000000000000000000000000000000000000",
  "01110011100000000000000000000000000000000000000000",
];

const defaultPalette = {
  1: "#af5f00",
  5: "#af875f",
  2: "#171717",
  3: "#f7f7f7",
  4: "#ff3b30",
  R: "#ff4d45",
  Y: "#ffd449",
  G: "#5de38c",
  C: "#63d9ff",
  B: "#6988ff",
  M: "#f178ff",
};

const stateKey = "transparent-character-studio-drafts-v1";
const historyKey = "transparent-character-studio-history-v1";
const animationSymbols = ["R", "Y", "G", "C", "B", "M"];
const blankLine = "0".repeat(50);
const clone = (value) => JSON.parse(JSON.stringify(value));

function initialState() {
  return {
    version: 2,
    current: "Rainbow Bear",
    characters: [{
      name: "Rainbow Bear",
      lines: [...starter],
      scale: 10,
      fps: 12,
      palette: { ...defaultPalette },
      effects: { smoke: true, cycle: true, drift: false },
    }],
    mode: "Animated PNG",
    activity: [{ time: new Date().toISOString(), message: "Studio opened" }],
  };
}

function normalizeState(value) {
  if (!value || !Array.isArray(value.characters) || value.characters.length === 0) return initialState();
  value.version = 2;
  value.mode = value.mode === "Sprite sheet" || value.mode === "Compact sprite" ? "Sprite sheet" : "Animated PNG";
  value.activity = Array.isArray(value.activity) ? value.activity.slice(-100) : [];
  value.characters = value.characters.filter((item) => item && Array.isArray(item.lines) && item.lines.length).map((item) => ({
    ...item,
    scale: Math.max(1, Math.min(60, Number(item.scale) || 10)),
    fps: Math.max(1, Math.min(60, Number(item.fps) || 12)),
    palette: { ...defaultPalette, ...(item.palette ?? {}) },
    effects: { smoke: false, cycle: false, drift: false, ...(item.effects ?? {}) },
  }));
  if (value.characters.length === 0) return initialState();
  if (!value.characters.some((item) => item.name === value.current)) value.current = value.characters[0].name;
  return value;
}

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

let state = normalizeState(loadJson(stateKey, initialState()));
let history = loadJson(historyKey, { past: [], future: [] });
if (!Array.isArray(history.past) || !Array.isArray(history.future)) history = { past: [], future: [] };
let selected = "0";
let frame = 0;
let pickerMode = false;
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const character = () => state.characters.find((item) => item.name === state.current);

function save() {
  localStorage.setItem(stateKey, JSON.stringify(state));
  localStorage.setItem(historyKey, JSON.stringify(history));
  $("#save-status").textContent = "● Saved locally";
}

function addActivity(message) {
  state.activity.push({ time: new Date().toISOString(), message });
  state.activity = state.activity.slice(-100);
}

function commit(label, mutate) {
  const before = clone(state);
  mutate();
  if (JSON.stringify(before) === JSON.stringify(state)) return false;
  history.past.push({ state: before, label });
  history.past = history.past.slice(-50);
  history.future = [];
  addActivity(label);
  save();
  render();
  return true;
}

function undo() {
  const entry = history.past.pop();
  if (!entry) return;
  history.future.push({ state: clone(state), label: entry.label });
  state = normalizeState(entry.state);
  addActivity(`Undid: ${entry.label}`);
  selected = "0";
  pickerMode = false;
  save();
  render();
  toast(`Undid: ${entry.label}`);
}

function redo() {
  const entry = history.future.pop();
  if (!entry) return;
  history.past.push({ state: clone(state), label: entry.label });
  state = normalizeState(entry.state);
  addActivity(`Redid: ${entry.label}`);
  selected = "0";
  pickerMode = false;
  save();
  render();
  toast(`Redid: ${entry.label}`);
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2600);
}

function slug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "character";
}

function colorFor(symbol, currentFrame, currentCharacter) {
  if (symbol === "0") return null;
  let paletteSymbol = symbol;
  if (currentCharacter.effects.cycle) {
    const index = animationSymbols.indexOf(symbol);
    if (index >= 0) paletteSymbol = animationSymbols[(index + currentFrame) % animationSymbols.length];
  }
  return currentCharacter.palette[paletteSymbol] ?? currentCharacter.palette[symbol] ?? null;
}

function isHidden(symbol, x, currentFrame, currentCharacter) {
  return currentCharacter.effects.smoke && animationSymbols.includes(symbol) && (x + currentFrame) % 2 === 0;
}

function setSelected(symbol) {
  selected = symbol;
  pickerMode = false;
  renderTools();
}

function drawLibrary() {
  const box = $("#characters");
  box.replaceChildren();
  state.characters.forEach((item) => {
    const button = document.createElement("button");
    button.className = `character ${item.name === state.current ? "active" : ""}`;
    button.innerHTML = '<span class="avatar">▟</span><span><b></b><small></small></span>';
    button.querySelector("b").textContent = item.name;
    button.querySelector("small").textContent = `4 preview frames · ${item.fps} fps`;
    button.addEventListener("click", () => {
      state.current = item.name;
      selected = "0";
      pickerMode = false;
      frame = 0;
      save();
      render();
    });
    box.append(button);
  });
}

function paintPixel(x, y, symbol) {
  const currentCharacter = character();
  const oldSymbol = currentCharacter.lines[y][x];
  if (symbol === oldSymbol) return;
  const verb = symbol === "0" ? "Erased" : "Painted";
  commit(`${verb} pixel ${x + 1},${y + 1}`, () => {
    const row = character().lines[y];
    character().lines[y] = `${row.slice(0, x)}${symbol}${row.slice(x + 1)}`;
  });
}

function drawGrid() {
  const currentCharacter = character();
  const grid = $("#grid");
  const width = currentCharacter.lines[0].length;
  grid.style.gridTemplateColumns = `repeat(${width}, ${currentCharacter.scale}px)`;
  const drift = currentCharacter.effects.drift ? [0, -2, -4, -2][frame] : 0;
  grid.style.transform = `translateY(${drift}px)`;
  grid.classList.toggle("pick-mode", pickerMode);
  grid.replaceChildren();

  currentCharacter.lines.forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      const pixel = document.createElement("button");
      const color = colorFor(symbol, frame, currentCharacter);
      pixel.className = "pixel";
      pixel.style.width = `${currentCharacter.scale}px`;
      pixel.style.height = `${currentCharacter.scale}px`;
      pixel.style.background = !color || isHidden(symbol, x, frame, currentCharacter) ? "transparent" : color;
      pixel.setAttribute("aria-label", `Pixel ${x + 1}, ${y + 1}${symbol === "0" ? ", transparent" : `, ${currentCharacter.palette[symbol]}`}`);
      pixel.addEventListener("click", () => {
        if (pickerMode) {
          if (symbol === "0") {
            toast("That pixel is transparent—pick a colored pixel.");
            return;
          }
          selected = symbol;
          pickerMode = false;
          renderTools();
          toast(`Picked ${currentCharacter.palette[symbol]}`);
          return;
        }
        paintPixel(x, y, selected);
      });
      grid.append(pixel);
    });
  });
}

function renderTools() {
  const currentCharacter = character();
  if (selected !== "0" && !currentCharacter.palette[selected]) selected = "0";
  $("#eraser").classList.toggle("selected", selected === "0" && !pickerMode);
  $("#eyedropper").classList.toggle("selected", pickerMode);
  $("#grid").classList.toggle("pick-mode", pickerMode);
  const swatches = $("#swatches");
  swatches.replaceChildren();
  Object.entries(currentCharacter.palette).forEach(([symbol, color]) => {
    const button = document.createElement("button");
    button.className = `swatch ${selected === symbol && !pickerMode ? "selected" : ""}`;
    button.style.background = color;
    button.setAttribute("aria-label", `Paint ${color}`);
    button.title = `${color} (${symbol})`;
    button.addEventListener("click", () => setSelected(symbol));
    swatches.append(button);
  });
}

function renderActivity() {
  const list = $("#activity");
  list.replaceChildren();
  const entries = state.activity.slice(-5).reverse();
  if (!entries.length) {
    const item = document.createElement("li");
    item.className = "empty-activity";
    item.textContent = "No edits yet";
    list.append(item);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement("li");
    const message = document.createElement("span");
    const time = document.createElement("time");
    message.textContent = entry.message;
    time.dateTime = entry.time;
    time.textContent = new Date(entry.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    item.append(message, time);
    list.append(item);
  });
}

function render() {
  const currentCharacter = character();
  $("#path").innerHTML = `${slug(currentCharacter.name)} / preview / <b>${String(frame).padStart(3, "0")}</b>`;
  $("#track-name").textContent = currentCharacter.name;
  $("#inspector-name").textContent = currentCharacter.name;
  $("#pixel-scale").value = currentCharacter.scale;
  $("#frame-rate").value = currentCharacter.fps;
  $("#scene-mode").value = state.mode;
  $("#export-type").textContent = state.mode;
  $("#export-description").textContent = state.mode === "Animated PNG" ? "Transparent animation that loops" : "Four transparent frames in one PNG";
  $("#undo").disabled = history.past.length === 0;
  $("#redo").disabled = history.future.length === 0;

  drawGrid();
  drawLibrary();
  renderTools();
  renderActivity();

  document.querySelectorAll("[data-effect]").forEach((button) => {
    const on = currentCharacter.effects[button.dataset.effect];
    button.classList.toggle("off", !on);
    button.querySelector("span").textContent = on ? (button.dataset.effect === "drift" ? "+4 px" : "ON") : "OFF";
  });
  document.querySelectorAll(".key").forEach((button, index) => button.classList.toggle("active", index % 4 === frame));
}

function nextPaletteSymbol(palette) {
  return [..."6789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"].find((symbol) => !palette[symbol]);
}

function addCustomColor() {
  const value = $("#custom-color").value.toLowerCase();
  const existing = Object.entries(character().palette).find(([, color]) => color.toLowerCase() === value);
  if (existing) {
    setSelected(existing[0]);
    toast(`${value} is already in the palette.`);
    return;
  }
  const symbol = nextPaletteSymbol(character().palette);
  if (!symbol) {
    toast("This palette has reached its color limit.");
    return;
  }
  commit(`Added custom color ${value}`, () => { character().palette[symbol] = value; });
  selected = symbol;
  renderTools();
  toast(`Added ${value}`);
}

function createCanvas(currentCharacter, currentFrame, scale = currentCharacter.scale) {
  const canvas = document.createElement("canvas");
  const driftPadding = currentCharacter.effects.drift ? 4 : 0;
  canvas.width = currentCharacter.lines[0].length * scale;
  canvas.height = (currentCharacter.lines.length + driftPadding) * scale;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const drift = currentCharacter.effects.drift ? [4, 2, 0, 2][currentFrame] : 0;
  currentCharacter.lines.forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      const color = colorFor(symbol, currentFrame, currentCharacter);
      if (!color || isHidden(symbol, x, currentFrame, currentCharacter)) return;
      context.fillStyle = color;
      context.fillRect(x * scale, (y + drift) * scale, scale, scale);
    });
  });
  return canvas;
}

function download(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png"));
}

async function exportCurrentFrame() {
  const currentCharacter = character();
  const blob = await canvasBlob(createCanvas(currentCharacter, frame));
  download(blob, `${slug(currentCharacter.name)}-frame-${String(frame).padStart(3, "0")}.png`);
  addActivity(`Exported frame ${frame + 1} as PNG`);
  save();
  renderActivity();
  toast("Transparent PNG downloaded");
}

function concatBytes(...arrays) {
  const length = arrays.reduce((sum, array) => sum + array.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  arrays.forEach((array) => { output.set(array, offset); offset += array.length; });
  return output;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatBytes(typeBytes, data);
  return concatBytes(uint32(data.length), body, uint32(crc32(body)));
}

function pngParts(bytes) {
  const parts = { ihdr: null, idat: [] };
  let offset = 8;
  while (offset < bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") parts.ihdr = data;
    if (type === "IDAT") parts.idat.push(data);
    offset += length + 12;
  }
  return parts;
}

function frameControl(width, height, fps, sequence) {
  const data = new Uint8Array(26);
  const view = new DataView(data.buffer);
  view.setUint32(0, sequence);
  view.setUint32(4, width);
  view.setUint32(8, height);
  view.setUint32(12, 0);
  view.setUint32(16, 0);
  view.setUint16(20, 1);
  view.setUint16(22, fps);
  data[24] = 0;
  data[25] = 0;
  return data;
}

async function makeAnimatedPng(currentCharacter) {
  const encoded = [];
  for (let currentFrame = 0; currentFrame < 4; currentFrame += 1) {
    const blob = await canvasBlob(createCanvas(currentCharacter, currentFrame));
    encoded.push(pngParts(new Uint8Array(await blob.arrayBuffer())));
  }
  const width = new DataView(encoded[0].ihdr.buffer, encoded[0].ihdr.byteOffset, 8).getUint32(0);
  const height = new DataView(encoded[0].ihdr.buffer, encoded[0].ihdr.byteOffset, 8).getUint32(4);
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [signature, pngChunk("IHDR", encoded[0].ihdr), pngChunk("acTL", concatBytes(uint32(encoded.length), uint32(0)))];
  let sequence = 0;
  encoded.forEach((parts, index) => {
    chunks.push(pngChunk("fcTL", frameControl(width, height, currentCharacter.fps, sequence++)));
    parts.idat.forEach((data) => {
      if (index === 0) chunks.push(pngChunk("IDAT", data));
      else chunks.push(pngChunk("fdAT", concatBytes(uint32(sequence++), data)));
    });
  });
  chunks.push(pngChunk("IEND", new Uint8Array()));
  return new Blob(chunks, { type: "image/apng" });
}

async function makeSpriteSheet(currentCharacter) {
  const frames = [0, 1, 2, 3].map((currentFrame) => createCanvas(currentCharacter, currentFrame));
  const sheet = document.createElement("canvas");
  sheet.width = frames[0].width * frames.length;
  sheet.height = frames[0].height;
  const context = sheet.getContext("2d");
  context.imageSmoothingEnabled = false;
  frames.forEach((canvas, index) => context.drawImage(canvas, index * canvas.width, 0));
  return canvasBlob(sheet);
}

async function exportAnimation() {
  const button = $("#export-animation");
  const currentCharacter = character();
  button.disabled = true;
  button.textContent = "Preparing…";
  try {
    if (state.mode === "Sprite sheet") {
      download(await makeSpriteSheet(currentCharacter), `${slug(currentCharacter.name)}-sprite-sheet.png`);
      addActivity("Exported sprite sheet");
      toast("Transparent sprite sheet downloaded");
    } else {
      download(await makeAnimatedPng(currentCharacter), `${slug(currentCharacter.name)}-animation.png`);
      addActivity("Exported animated PNG");
      toast("Transparent animated PNG downloaded");
    }
    save();
    renderActivity();
  } catch (error) {
    addActivity(`Export failed: ${error.message}`);
    save();
    renderActivity();
    toast("Export failed; the error was preserved in Activity.");
  } finally {
    button.disabled = false;
    button.textContent = "Export animation";
  }
}

function downloadActivityLog() {
  const body = `${state.activity.map((entry) => `${entry.time}\t${entry.message}`).join("\n")}\n`;
  download(new Blob([body], { type: "text/plain" }), `character-studio-activity-${new Date().toISOString().slice(0, 10)}.log`);
  toast("Activity log downloaded");
}

for (let index = 0; index < 12; index += 1) {
  const button = document.createElement("button");
  button.className = "key";
  button.textContent = String(index % 4 + 1);
  button.addEventListener("click", () => { frame = index % 4; render(); });
  $("#ticks").append(button);
}

$("#new-character").addEventListener("click", () => {
  const name = prompt("Name your new character:", "New character");
  const clean = name?.trim();
  if (!clean) return;
  if (state.characters.some((item) => item.name === clean)) {
    toast("That character already exists.");
    return;
  }
  commit(`Created ${clean}`, () => {
    state.characters.push({ name: clean, lines: Array.from({ length: 19 }, () => blankLine), scale: 10, fps: 12, palette: { ...defaultPalette }, effects: { smoke: false, cycle: false, drift: false } });
    state.current = clean;
  });
  toast(`Created ${clean}`);
});

$("#undo").addEventListener("click", undo);
$("#redo").addEventListener("click", redo);
$("#eraser").addEventListener("click", () => setSelected("0"));
$("#eyedropper").addEventListener("click", () => { pickerMode = !pickerMode; renderTools(); toast(pickerMode ? "Click a colored pixel to pick it." : "Eyedropper canceled."); });
$("#add-color").addEventListener("click", addCustomColor);
$("#pixel-scale").addEventListener("change", (event) => {
  const value = Math.max(1, Math.min(60, Number(event.target.value) || 10));
  commit(`Changed pixel scale to ${value}`, () => { character().scale = value; });
});
$("#frame-rate").addEventListener("change", (event) => {
  const value = Math.max(1, Math.min(60, Number(event.target.value) || 12));
  commit(`Changed frame rate to ${value} fps`, () => { character().fps = value; });
});
$("#scene-mode").addEventListener("change", (event) => commit(`Selected ${event.target.value} export`, () => { state.mode = event.target.value; }));
document.querySelectorAll("[data-effect]").forEach((button) => button.addEventListener("click", () => {
  const effect = button.dataset.effect;
  commit(`${character().effects[effect] ? "Disabled" : "Enabled"} ${effect} effect`, () => { character().effects[effect] = !character().effects[effect]; });
}));
$("#add-effect").addEventListener("click", () => {
  if (character().effects.drift) {
    toast("Drift is already enabled.");
    return;
  }
  commit("Enabled drift effect", () => { character().effects.drift = true; });
  toast("Drift preview enabled");
});
$("#export-animation").addEventListener("click", exportAnimation);
$("#export-current").addEventListener("click", exportCurrentFrame);
$("#download-log").addEventListener("click", downloadActivityLog);
$("#docs").addEventListener("click", () => { $("#modal").hidden = false; });
$("#close-docs").addEventListener("click", () => { $("#modal").hidden = true; });
$("#modal").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.hidden = true; });

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
    return;
  }
  if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === "e") setSelected("0");
  if (event.key.toLowerCase() === "i") { pickerMode = !pickerMode; renderTools(); }
});

save();
render();
