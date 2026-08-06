import {
  SKIN_PARTS,
  SKIN_SIZE,
  convertSkinProfile,
  createBlankSkinPixels,
  detectSkinProfile,
  pixelRegion,
  renderSkinPreviewPixels,
  skinProfile,
  skinRegion,
  validateSkinPixels,
} from "./skin-editor-core.js";

const engineKey = "voxl-active-engine-v1";
const skinKey = "voxl-humanoid-skin-draft-v1";
const skinEngine = "voxl-humanoid-skin";
const motionEngine = "transparent-character";
const $ = (selector) => document.querySelector(selector);
let toastTimer;

function fillRegion(pixels, region, color, pattern) {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const next = pattern?.(x, y, color) ?? color;
      pixels.set(next, ((region.y + y) * SKIN_SIZE + region.x + x) * 4);
    }
  }
}

function createStarterPixels(profileId) {
  const pixels = createBlankSkinPixels(profileId, [195, 143, 105, 255]);
  const colors = {
    torso: [42, 90, 124, 255],
    "right-arm": [42, 90, 124, 255],
    "left-arm": [42, 90, 124, 255],
    "right-leg": [42, 47, 65, 255],
    "left-leg": [42, 47, 65, 255],
  };
  for (const region of skinProfile(profileId).regions) {
    if (region.layer !== "base" || !colors[region.part]) continue;
    fillRegion(pixels, region, colors[region.part], (x, y, color) => (
      (x + y) % 7 === 0 ? color.map((channel, index) => index < 3 ? Math.min(255, channel + 12) : channel) : color
    ));
  }
  const face = skinRegion(profileId, "head", "base", "front");
  for (const eyeX of [2, 5]) pixels.set([32, 39, 48, 255], ((face.y + 3) * SKIN_SIZE + face.x + eyeX) * 4);
  for (let x = 0; x < face.width; x += 1) pixels.set([76, 49, 35, 255], (face.y * SKIN_SIZE + face.x + x) * 4);
  const coat = [94, 179, 171, 178];
  for (const region of skinProfile(profileId).regions) {
    if (region.layer === "outer" && ["torso", "right-arm", "left-arm"].includes(region.part)) fillRegion(pixels, region, coat);
  }
  return pixels;
}

function initialState() {
  return {
    version: 1,
    profile: "wide-arm-64",
    pixels: Array.from(createStarterPixels("wide-arm-64")),
    color: "#5eb3ab",
    layers: { base: true, outer: true },
    parts: Object.fromEntries(SKIN_PARTS.map((part) => [part, true])),
  };
}

function normalizeState(value) {
  const fallback = initialState();
  if (!value || !["wide-arm-64", "slim-arm-64"].includes(value.profile)) return fallback;
  if (!Array.isArray(value.pixels) || value.pixels.length !== SKIN_SIZE * SKIN_SIZE * 4) return fallback;
  return {
    version: 1,
    profile: value.profile,
    pixels: value.pixels.map((item) => Math.max(0, Math.min(255, Number(item) || 0))),
    color: /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : fallback.color,
    layers: { ...fallback.layers, ...(value.layers ?? {}) },
    parts: { ...fallback.parts, ...(value.parts ?? {}) },
  };
}

function loadState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(skinKey))); } catch { return initialState(); }
}

let state = loadState();
let history = { past: [], future: [] };
let tool = "pencil";
let strokeBefore;
let pointerActive = false;

function pixels() { return new Uint8ClampedArray(state.pixels); }
function snapshot() { return { profile: state.profile, pixels: [...state.pixels] }; }
function snapshotsEqual(left, right) { return left.profile === right.profile && left.pixels.every((value, index) => value === right.pixels[index]); }

function save() {
  localStorage.setItem(skinKey, JSON.stringify(state));
  $("#skin-save-status").textContent = "● Saved locally";
}

function toast(message) {
  const node = $("#toast");
  clearTimeout(toastTimer);
  node.textContent = message;
  node.hidden = false;
  toastTimer = setTimeout(() => { node.hidden = true; }, 2600);
}

function pushHistory(before) {
  const after = snapshot();
  if (snapshotsEqual(before, after)) return false;
  history.past.push(before);
  history.past = history.past.slice(-50);
  history.future = [];
  save();
  render();
  return true;
}

function commit(mutate) {
  const before = snapshot();
  mutate();
  return pushHistory(before);
}

function restore(next) {
  state.profile = next.profile;
  state.pixels = [...next.pixels];
  save();
  render();
}

function undo() {
  const previous = history.past.pop();
  if (!previous) return;
  history.future.push(snapshot());
  restore(previous);
}

function redo() {
  const next = history.future.pop();
  if (!next) return;
  history.past.push(snapshot());
  restore(next);
}

function visiblePixels() {
  const output = pixels();
  for (const region of skinProfile(state.profile).regions) {
    if (state.layers[region.layer] && state.parts[region.part]) continue;
    for (let y = region.y; y < region.y + region.height; y += 1) {
      for (let x = region.x; x < region.x + region.width; x += 1) output.fill(0, (y * SKIN_SIZE + x) * 4, (y * SKIN_SIZE + x) * 4 + 4);
    }
  }
  return output;
}

function putPixels(canvas, rgba, width, height) {
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
}

function renderValidation() {
  const result = validateSkinPixels(state.profile, pixels());
  const errors = result.issues.filter(({ severity }) => severity === "error");
  const warnings = result.issues.filter(({ severity }) => severity === "warning");
  const pill = $("#skin-validation-summary");
  pill.className = `validation-pill${errors.length ? " error" : warnings.length ? " warning" : ""}`;
  pill.textContent = errors.length ? `${errors.length} blocking issue${errors.length === 1 ? "" : "s"}` : warnings.length ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : "Valid profile";
  const list = $("#skin-issues");
  list.className = `skin-issues${result.issues.length ? "" : " ok-list"}`;
  list.replaceChildren();
  for (const issue of result.issues.length ? result.issues : [{ message: "No errors" }]) {
    const item = document.createElement("li");
    item.textContent = issue.message;
    list.append(item);
  }
  return result;
}

function render() {
  putPixels($("#skin-atlas"), visiblePixels(), SKIN_SIZE, SKIN_SIZE);
  const enabledLayers = ["base", "outer"].filter((layer) => state.layers[layer]);
  const enabledParts = SKIN_PARTS.filter((part) => state.parts[part]);
  for (const view of ["front", "back"]) {
    const preview = renderSkinPreviewPixels(state.profile, pixels(), { view, layers: enabledLayers, parts: enabledParts });
    putPixels($(`#skin-${view}`), preview.pixels, preview.width, preview.height);
  }
  $("#skin-profile").value = state.profile;
  $("#skin-path").innerHTML = `local-skin / <b>${state.profile}</b>`;
  $("#skin-export-description").textContent = `64×64 RGBA · ${state.profile}`;
  $("#skin-color").value = state.color;
  $("#skin-show-base").checked = state.layers.base;
  $("#skin-show-outer").checked = state.layers.outer;
  document.querySelectorAll("[data-skin-part]").forEach((input) => { input.checked = state.parts[input.dataset.skinPart]; });
  $("#skin-undo").disabled = history.past.length === 0;
  $("#skin-redo").disabled = history.future.length === 0;
  for (const [id, name] of [["#skin-pencil", "pencil"], ["#skin-eraser", "eraser"], ["#skin-picker", "picker"]]) $(id).classList.toggle("selected", tool === name);
  renderValidation();
}

function setEngine(engineId) {
  const selected = engineId === skinEngine ? skinEngine : motionEngine;
  document.body.dataset.engine = selected;
  localStorage.setItem(engineKey, selected);
  document.querySelectorAll("[data-engine-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.engineTab === selected)));
  document.querySelectorAll("[data-engine-panel]").forEach((panel) => { panel.hidden = panel.dataset.enginePanel !== selected; });
  document.querySelectorAll("[data-engine-inspector]").forEach((panel) => { panel.hidden = panel.dataset.engineInspector !== selected; });
  document.querySelectorAll("[data-engine-assets]").forEach((panel) => { panel.hidden = panel.dataset.engineAssets !== selected; });
  const skinSelected = selected === skinEngine;
  $("#studio-eyebrow").textContent = skinSelected ? "LOCAL VOXL SKIN STUDIO" : "LOCAL VOXL STUDIO";
  $("#studio-heading").innerHTML = skinSelected ? "Paint the <em>atlas</em>, keep every pixel." : "Character <em>motion</em>, clean alpha.";
  $("#asset-title").textContent = skinSelected ? "Skin drafts" : "Characters";
  $("#new-character").hidden = skinSelected;
  $("#export-animation").textContent = skinSelected ? "Download skin" : "Export animation";
  $("#local-note").innerHTML = skinSelected ? "<b>Open-ended pixels</b><br>Every mapped pixel is editable. The profile defines geometry and UV placement, not visual themes." : "<b>Local-first editor</b><br>Drafts, palette changes, and activity history stay in this browser.";
  $("#footer-help").innerHTML = skinSelected ? "<b>Shortcuts:</b> <code>⌘/Ctrl+Z</code> undo · <code>Shift+⌘/Ctrl+Z</code> redo · <code>E</code> erase · <code>I</code> pick" : "<b>Shortcuts:</b> <code>⌘/Ctrl+Z</code> undo · <code>Shift+⌘/Ctrl+Z</code> redo · <code>E</code> erase · <code>I</code> pick";
  $("#footer-status").textContent = skinSelected ? "64×64 RGBA draft + history saved locally" : "Drafts + edit history saved locally";
  if (skinSelected) render();
  window.dispatchEvent(new CustomEvent("voxl:engine-change", { detail: { engineId: selected } }));
}

function pointerPixel(event) {
  const canvas = $("#skin-atlas");
  const bounds = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(63, Math.floor((event.clientX - bounds.left) * SKIN_SIZE / bounds.width))),
    y: Math.max(0, Math.min(63, Math.floor((event.clientY - bounds.top) * SKIN_SIZE / bounds.height))),
  };
}

function hexRgba(hex) { return [...hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16)), 255]; }
function rgbaHex(rgba) { return `#${rgba.slice(0, 3).map((value) => value.toString(16).padStart(2, "0")).join("")}`; }

function paint(event) {
  const { x, y } = pointerPixel(event);
  const region = pixelRegion(state.profile, x, y);
  $("#skin-coordinate").textContent = region ? `${x}, ${y}` : `${x}, ${y} · unused`;
  $("#skin-region-label").textContent = region ? `${region.part} / ${region.layer} / ${region.face}` : "Outside mapped UV regions";
  if (!pointerActive || !region) return;
  const offset = (y * SKIN_SIZE + x) * 4;
  if (tool === "picker") {
    const rgba = state.pixels.slice(offset, offset + 4);
    if (rgba[3]) state.color = rgbaHex(rgba);
    tool = "pencil";
    pointerActive = false;
    render();
    return;
  }
  const color = tool === "eraser" ? [0, 0, 0, 0] : hexRgba(state.color);
  if (color.every((value, index) => value === state.pixels[offset + index])) return;
  state.pixels.splice(offset, 4, ...color);
  putPixels($("#skin-atlas"), visiblePixels(), SKIN_SIZE, SKIN_SIZE);
  const enabledLayers = ["base", "outer"].filter((layer) => state.layers[layer]);
  const enabledParts = SKIN_PARTS.filter((part) => state.parts[part]);
  for (const view of ["front", "back"]) {
    const preview = renderSkinPreviewPixels(state.profile, pixels(), { view, layers: enabledLayers, parts: enabledParts });
    putPixels($(`#skin-${view}`), preview.pixels, preview.width, preview.height);
  }
}

function finishStroke() {
  if (!pointerActive && !strokeBefore) return;
  pointerActive = false;
  if (strokeBefore) pushHistory(strokeBefore);
  strokeBefore = undefined;
}

async function importPng(file) {
  if (!file) return;
  const bitmap = await createImageBitmap(file);
  if (bitmap.width !== SKIN_SIZE || bitmap.height !== SKIN_SIZE) {
    bitmap.close();
    throw new Error("Import must be a 64×64 PNG.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = SKIN_SIZE;
  canvas.height = SKIN_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imported = context.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE).data;
  const selectedProfile = detectSkinProfile(imported);
  const validation = validateSkinPixels(selectedProfile, imported);
  if (!validation.ok) throw new Error(validation.issues.find(({ severity }) => severity === "error").message);
  commit(() => {
    state.profile = selectedProfile;
    state.pixels = Array.from(imported);
  });
  toast(`Imported ${file.name} as ${selectedProfile}`);
}

function downloadSkin() {
  const validation = renderValidation();
  if (!validation.ok) {
    toast("Fix blocking validation issues before export.");
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = SKIN_SIZE;
  canvas.height = SKIN_SIZE;
  putPixels(canvas, pixels(), SKIN_SIZE, SKIN_SIZE);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `voxl-humanoid-skin-${state.profile}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    toast("Profile-valid skin PNG downloaded");
  }, "image/png");
}

document.querySelectorAll("[data-engine-tab]").forEach((button) => button.addEventListener("click", () => setEngine(button.dataset.engineTab)));
$("#skin-pencil").addEventListener("click", () => { tool = "pencil"; render(); });
$("#skin-eraser").addEventListener("click", () => { tool = "eraser"; render(); });
$("#skin-picker").addEventListener("click", () => { tool = "picker"; render(); });
$("#skin-color").addEventListener("input", (event) => { state.color = event.target.value; tool = "pencil"; save(); render(); });
$("#skin-undo").addEventListener("click", undo);
$("#skin-redo").addEventListener("click", redo);
$("#skin-profile").addEventListener("change", (event) => {
  const nextProfile = event.target.value;
  commit(() => {
    state.pixels = Array.from(convertSkinProfile(pixels(), nextProfile));
    state.profile = nextProfile;
  });
  toast(`Converted draft to ${nextProfile}`);
});
for (const layer of ["base", "outer"]) $("#skin-show-" + layer).addEventListener("change", (event) => { state.layers[layer] = event.target.checked; save(); render(); });
document.querySelectorAll("[data-skin-part]").forEach((input) => input.addEventListener("change", (event) => { state.parts[event.target.dataset.skinPart] = event.target.checked; save(); render(); }));
$("#skin-import").addEventListener("click", () => $("#skin-import-file").click());
$("#skin-import-file").addEventListener("change", async (event) => {
  try { await importPng(event.target.files?.[0]); } catch (error) { toast(error.message); }
  event.target.value = "";
});
$("#skin-export").addEventListener("click", downloadSkin);
window.addEventListener("voxl:skin-export", downloadSkin);

const atlas = $("#skin-atlas");
atlas.addEventListener("pointerdown", (event) => {
  strokeBefore = snapshot();
  pointerActive = true;
  atlas.setPointerCapture(event.pointerId);
  paint(event);
});
atlas.addEventListener("pointermove", paint);
atlas.addEventListener("pointerup", finishStroke);
atlas.addEventListener("pointercancel", finishStroke);
atlas.addEventListener("pointerleave", () => {
  $("#skin-coordinate").textContent = "64 × 64";
  $("#skin-region-label").textContent = "Move over the atlas to inspect a UV region";
});

document.addEventListener("keydown", (event) => {
  if (document.body.dataset.engine !== skinEngine) return;
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === "e") { tool = "eraser"; render(); }
  if (event.key.toLowerCase() === "i") { tool = "picker"; render(); }
});

save();
render();
setEngine(localStorage.getItem(engineKey) ?? motionEngine);
