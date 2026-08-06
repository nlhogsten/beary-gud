"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "../StudioShell.module.css";
import { CuboidHumanoidRenderer } from "./CuboidHumanoidRenderer";
import {
  SKIN_PARTS,
  SKIN_PROFILE_IDS,
  SKIN_SIZE,
  convertProfile,
  createBlankPixels,
  detectProfile,
  pixelRegion,
  renderPreview,
  skinProfile,
  skinRegion,
  validatePixels,
  type SkinLayer,
  type SkinPart,
  type SkinProfileId,
  type SkinRegion,
} from "./core";

const DRAFT_STORAGE_KEY = "voxl-humanoid-skin-draft-v1";
const HISTORY_LIMIT = 50;

type Tool = "pencil" | "eraser" | "picker";

interface SkinDraft {
  version: 1;
  profile: SkinProfileId;
  pixels: Uint8ClampedArray;
  color: string;
  layers: Record<SkinLayer, boolean>;
  parts: Record<SkinPart, boolean>;
}

interface SkinSnapshot {
  profile: SkinProfileId;
  pixels: Uint8ClampedArray;
}

interface History {
  past: SkinSnapshot[];
  future: SkinSnapshot[];
}

function fillRegion(
  pixels: Uint8ClampedArray,
  region: SkinRegion,
  color: readonly number[],
) {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      pixels.set(color, ((region.y + y) * SKIN_SIZE + region.x + x) * 4);
    }
  }
}

function starterPixels(profileId: SkinProfileId): Uint8ClampedArray {
  const pixels = createBlankPixels(profileId, [195, 143, 105, 255]);
  const colors: Partial<Record<SkinPart, readonly number[]>> = {
    torso: [42, 90, 124, 255],
    "right-arm": [42, 90, 124, 255],
    "left-arm": [42, 90, 124, 255],
    "right-leg": [42, 47, 65, 255],
    "left-leg": [42, 47, 65, 255],
  };
  for (const region of skinProfile(profileId).regions) {
    const color = colors[region.part];
    if (region.layer === "base" && color) fillRegion(pixels, region, color);
    if (
      region.layer === "outer"
      && ["torso", "right-arm", "left-arm"].includes(region.part)
    ) {
      fillRegion(pixels, region, [94, 179, 171, 178]);
    }
  }
  const face = skinRegion(profileId, "head", "base", "front");
  for (let x = 0; x < face.width; x += 1) {
    pixels.set([76, 49, 35, 255], (face.y * SKIN_SIZE + face.x + x) * 4);
  }
  for (const eyeX of [2, 5]) {
    pixels.set([32, 39, 48, 255], ((face.y + 3) * SKIN_SIZE + face.x + eyeX) * 4);
  }
  return pixels;
}

function initialDraft(): SkinDraft {
  return {
    version: 1,
    profile: "wide-arm-64",
    pixels: starterPixels("wide-arm-64"),
    color: "#5eb3ab",
    layers: { base: true, outer: true },
    parts: Object.fromEntries(SKIN_PARTS.map((part) => [part, true])) as Record<SkinPart, boolean>,
  };
}

function isProfileId(value: unknown): value is SkinProfileId {
  return typeof value === "string" && (SKIN_PROFILE_IDS as readonly string[]).includes(value);
}

function normalizeDraft(value: unknown): SkinDraft {
  const fallback = initialDraft();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = value as Record<string, unknown>;
  if (!isProfileId(candidate.profile) || !Array.isArray(candidate.pixels)) return fallback;
  if (candidate.pixels.length !== SKIN_SIZE * SKIN_SIZE * 4) return fallback;
  const storedLayers = candidate.layers && typeof candidate.layers === "object"
    ? candidate.layers as Partial<Record<SkinLayer, boolean>>
    : {};
  const storedParts = candidate.parts && typeof candidate.parts === "object"
    ? candidate.parts as Partial<Record<SkinPart, boolean>>
    : {};
  return {
    version: 1,
    profile: candidate.profile,
    pixels: new Uint8ClampedArray(
      candidate.pixels.map((item) => Math.max(0, Math.min(255, Number(item) || 0))),
    ),
    color: typeof candidate.color === "string" && /^#[0-9a-f]{6}$/i.test(candidate.color)
      ? candidate.color
      : fallback.color,
    layers: {
      base: typeof storedLayers.base === "boolean" ? storedLayers.base : true,
      outer: typeof storedLayers.outer === "boolean" ? storedLayers.outer : true,
    },
    parts: Object.fromEntries(SKIN_PARTS.map((part) => [
      part,
      typeof storedParts[part] === "boolean" ? storedParts[part] : true,
    ])) as Record<SkinPart, boolean>,
  };
}

function serializeDraft(draft: SkinDraft) {
  return JSON.stringify({ ...draft, pixels: Array.from(draft.pixels) });
}

function snapshot(draft: SkinDraft): SkinSnapshot {
  return { profile: draft.profile, pixels: new Uint8ClampedArray(draft.pixels) };
}

function snapshotMatches(left: SkinSnapshot, right: SkinSnapshot): boolean {
  if (left.profile !== right.profile || left.pixels.length !== right.pixels.length) return false;
  return left.pixels.every((value, index) => value === right.pixels[index]);
}

function visibleAtlas(draft: SkinDraft): Uint8ClampedArray {
  const output = new Uint8ClampedArray(draft.pixels);
  for (const region of skinProfile(draft.profile).regions) {
    if (draft.layers[region.layer] && draft.parts[region.part]) continue;
    for (let y = region.y; y < region.y + region.height; y += 1) {
      for (let x = region.x; x < region.x + region.width; x += 1) {
        output.fill(0, (y * SKIN_SIZE + x) * 4, (y * SKIN_SIZE + x) * 4 + 4);
      }
    }
  }
  return output;
}

function drawPixels(
  canvas: HTMLCanvasElement | null,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const context = canvas?.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
}

function hexRgba(hex: string): readonly [number, number, number, number] {
  const channels = hex.match(/[0-9a-f]{2}/gi)?.map((value) => Number.parseInt(value, 16));
  return [channels?.[0] ?? 0, channels?.[1] ?? 0, channels?.[2] ?? 0, 255];
}

function rgbaHex(rgba: Uint8ClampedArray): string {
  return `#${Array.from(rgba.slice(0, 3))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function HumanoidSkinEditor() {
  const [draft, setDraft] = useState<SkinDraft>(initialDraft);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const [tool, setTool] = useState<Tool>("pencil");
  const [coordinate, setCoordinate] = useState("64 × 64");
  const [regionLabel, setRegionLabel] = useState("Move over the atlas to inspect a UV region");
  const [notice, setNotice] = useState("Draft saved locally");
  const [hydrated, setHydrated] = useState(false);
  const atlasRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  const historyRef = useRef(history);
  const pointerActiveRef = useRef(false);
  const strokeBeforeRef = useRef<SkinSnapshot | undefined>(undefined);

  const updateDraft = useCallback((next: SkinDraft) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const updateHistory = useCallback((next: History) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
        if (stored) updateDraft(normalizeDraft(JSON.parse(stored)));
      } catch {
        setNotice("Stored draft was unreadable; opened a safe starter draft");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [updateDraft]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft));
  }, [draft, hydrated]);

  useEffect(() => {
    drawPixels(atlasRef.current, visibleAtlas(draft), SKIN_SIZE, SKIN_SIZE);
    const layers = (["base", "outer"] as const).filter((layer) => draft.layers[layer]);
    const parts = SKIN_PARTS.filter((part) => draft.parts[part]);
    drawPixels(
      frontRef.current,
      renderPreview(draft.profile, draft.pixels, "front", layers, parts),
      16,
      32,
    );
    drawPixels(
      backRef.current,
      renderPreview(draft.profile, draft.pixels, "back", layers, parts),
      16,
      32,
    );
  }, [draft]);

  const validation = useMemo(
    () => validatePixels(draft.profile, draft.pixels),
    [draft.profile, draft.pixels],
  );

  const recordSnapshot = useCallback((before: SkinSnapshot) => {
    const after = snapshot(draftRef.current);
    if (snapshotMatches(before, after)) return;
    updateHistory({
      past: [...historyRef.current.past, before].slice(-HISTORY_LIMIT),
      future: [],
    });
  }, [updateHistory]);

  const commitDraft = useCallback((next: SkinDraft, message: string) => {
    const before = snapshot(draftRef.current);
    updateDraft(next);
    recordSnapshot(before);
    setNotice(message);
  }, [recordSnapshot, updateDraft]);

  const undo = useCallback(() => {
    const currentHistory = historyRef.current;
    const previous = currentHistory.past.at(-1);
    if (!previous) return;
    const current = draftRef.current;
    updateHistory({
      past: currentHistory.past.slice(0, -1),
      future: [...currentHistory.future, snapshot(current)],
    });
    updateDraft({
      ...current,
      profile: previous.profile,
      pixels: new Uint8ClampedArray(previous.pixels),
    });
    setNotice("Undid skin edit");
  }, [updateDraft, updateHistory]);

  const redo = useCallback(() => {
    const currentHistory = historyRef.current;
    const next = currentHistory.future.at(-1);
    if (!next) return;
    const current = draftRef.current;
    updateHistory({
      past: [...currentHistory.past, snapshot(current)].slice(-HISTORY_LIMIT),
      future: currentHistory.future.slice(0, -1),
    });
    updateDraft({
      ...current,
      profile: next.profile,
      pixels: new Uint8ClampedArray(next.pixels),
    });
    setNotice("Redid skin edit");
  }, [updateDraft, updateHistory]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target;
      const typing = target instanceof HTMLInputElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLTextAreaElement;
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
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "e") setTool("eraser");
      if (event.key.toLowerCase() === "i") setTool("picker");
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [redo, undo]);

  function pointerPixel(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(63, Math.floor((event.clientX - bounds.left) * SKIN_SIZE / bounds.width))),
      y: Math.max(0, Math.min(63, Math.floor((event.clientY - bounds.top) * SKIN_SIZE / bounds.height))),
    };
  }

  function inspectAndPaint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPixel(event);
    const current = draftRef.current;
    const region = pixelRegion(current.profile, x, y);
    setCoordinate(region ? `${x}, ${y}` : `${x}, ${y} · unused`);
    setRegionLabel(
      region ? `${region.part} / ${region.layer} / ${region.face}` : "Outside mapped UV regions",
    );
    if (!pointerActiveRef.current || !region) return;
    const offset = (y * SKIN_SIZE + x) * 4;
    const color = tool === "eraser" ? [0, 0, 0, 0] as const : hexRgba(current.color);
    if (color.every((value, index) => value === current.pixels[offset + index])) return;
    const nextPixels = new Uint8ClampedArray(current.pixels);
    nextPixels.set(color, offset);
    updateDraft({ ...current, pixels: nextPixels });
  }

  function startStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPixel(event);
    const current = draftRef.current;
    const region = pixelRegion(current.profile, x, y);
    setCoordinate(region ? `${x}, ${y}` : `${x}, ${y} · unused`);
    setRegionLabel(
      region ? `${region.part} / ${region.layer} / ${region.face}` : "Outside mapped UV regions",
    );
    if (!region) return;
    const offset = (y * SKIN_SIZE + x) * 4;
    if (tool === "picker") {
      const rgba = current.pixels.slice(offset, offset + 4);
      if (rgba[3]) {
        updateDraft({ ...current, color: rgbaHex(rgba) });
        setNotice(`Picked ${rgbaHex(rgba)}`);
      }
      setTool("pencil");
      return;
    }
    strokeBeforeRef.current = snapshot(current);
    pointerActiveRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    inspectAndPaint(event);
  }

  function finishStroke() {
    pointerActiveRef.current = false;
    const before = strokeBeforeRef.current;
    strokeBeforeRef.current = undefined;
    if (!before) return;
    recordSnapshot(before);
    setNotice(tool === "eraser" ? "Erased skin pixel" : "Painted skin pixel");
  }

  function paintFromThreeDimensions(x: number, y: number) {
    const current = draftRef.current;
    const offset = (y * SKIN_SIZE + x) * 4;
    if (tool === "picker") {
      const rgba = current.pixels.slice(offset, offset + 4);
      if (rgba[3]) {
        updateDraft({ ...current, color: rgbaHex(rgba) });
        setNotice(`Picked ${rgbaHex(rgba)} from 3D preview`);
      }
      setTool("pencil");
      return;
    }
    const color = tool === "eraser" ? [0, 0, 0, 0] as const : hexRgba(current.color);
    if (color.every((value, index) => value === current.pixels[offset + index])) return;
    const before = snapshot(current);
    const pixels = new Uint8ClampedArray(current.pixels);
    pixels.set(color, offset);
    updateDraft({ ...current, pixels });
    recordSnapshot(before);
    setNotice(tool === "eraser" ? "Erased skin pixel in 3D" : "Painted skin pixel in 3D");
  }

  function setProfile(nextProfile: SkinProfileId) {
    const current = draftRef.current;
    if (nextProfile === current.profile) return;
    commitDraft({
      ...current,
      profile: nextProfile,
      pixels: convertProfile(current.pixels, current.profile, nextProfile),
    }, `Converted draft to ${nextProfile}`);
  }

  function setLayer(layer: SkinLayer, visible: boolean) {
    const current = draftRef.current;
    updateDraft({ ...current, layers: { ...current.layers, [layer]: visible } });
  }

  function setPart(part: SkinPart, visible: boolean) {
    const current = draftRef.current;
    updateDraft({ ...current, parts: { ...current.parts, [part]: visible } });
  }

  async function importPng(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width !== SKIN_SIZE || bitmap.height !== SKIN_SIZE) {
        bitmap.close();
        throw new Error("Import must be a 64×64 PNG.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = SKIN_SIZE;
      canvas.height = SKIN_SIZE;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("The browser could not read this image.");
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const pixels = context.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE).data;
      const profile = detectProfile(pixels);
      const importedValidation = validatePixels(profile, pixels);
      const blockingIssue = importedValidation.issues.find((issue) => issue.severity === "error");
      if (blockingIssue) throw new Error(blockingIssue.message);
      const current = draftRef.current;
      commitDraft({ ...current, profile, pixels }, `Imported ${file.name} as ${profile}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PNG import failed");
    }
  }

  function exportPng() {
    const current = draftRef.current;
    const result = validatePixels(current.profile, current.pixels);
    if (!result.ok) {
      setNotice("Fix blocking validation issues before export");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = SKIN_SIZE;
    canvas.height = SKIN_SIZE;
    drawPixels(canvas, current.pixels, SKIN_SIZE, SKIN_SIZE);
    canvas.toBlob((blob) => {
      if (!blob) {
        setNotice("PNG export failed");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voxl-humanoid-skin-${current.profile}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice("Profile-valid PNG downloaded");
    }, "image/png");
  }

  const errors = validation.issues.filter((issue) => issue.severity === "error");
  const warnings = validation.issues.filter((issue) => issue.severity === "warning");
  const validationSeverity = errors.length ? "error" : warnings.length ? "warning" : "valid";
  const validationLabel = errors.length
    ? `${errors.length} blocking issue${errors.length === 1 ? "" : "s"}`
    : warnings.length
      ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
      : "Valid profile";

  return (
    <div className={styles.editorLayout}>
      <section className={styles.editorMain} aria-label="Humanoid skin editor">
        <div className={styles.toolbar}>
          <button
            className={styles.button}
            data-selected={tool === "pencil"}
            onClick={() => setTool("pencil")}
            type="button"
          >
            Pencil
          </button>
          <button
            className={styles.button}
            data-selected={tool === "eraser"}
            onClick={() => setTool("eraser")}
            type="button"
          >
            Erase
          </button>
          <button
            className={styles.button}
            data-selected={tool === "picker"}
            onClick={() => setTool("picker")}
            type="button"
          >
            Pick
          </button>
          <label>
            Color
            <input
              aria-label="Paint color"
              onChange={(event) => {
                const current = draftRef.current;
                updateDraft({ ...current, color: event.target.value });
                setTool("pencil");
              }}
              type="color"
              value={draft.color}
            />
          </label>
          <button className={styles.button} disabled={!history.past.length} onClick={undo} type="button">
            Undo
          </button>
          <button className={styles.button} disabled={!history.future.length} onClick={redo} type="button">
            Redo
          </button>
        </div>

        <div className={styles.canvasArea}>
          <section className={styles.canvasPanel}>
            <div className={styles.panelHeading}>
              <strong>2D texture atlas</strong>
              <span>{coordinate}</span>
            </div>
            <div className={styles.canvasFrame}>
              <canvas
                aria-label="Editable 64 by 64 humanoid skin atlas"
                className={styles.atlas}
                height={SKIN_SIZE}
                onPointerCancel={finishStroke}
                onPointerDown={startStroke}
                onPointerLeave={() => {
                  setCoordinate("64 × 64");
                  setRegionLabel("Move over the atlas to inspect a UV region");
                }}
                onPointerMove={inspectAndPaint}
                onPointerUp={finishStroke}
                ref={atlasRef}
                width={SKIN_SIZE}
              />
            </div>
          </section>

          <section className={styles.previewPanel}>
            <div className={styles.panelHeading}>
              <strong>3D character preview</strong>
              <span>Drag to rotate · click to paint</span>
            </div>
            <div className={styles.previewStack}>
              <CuboidHumanoidRenderer
                layers={draft.layers}
                onInspect={(region, x, y) => {
                  setCoordinate(`${x}, ${y}`);
                  setRegionLabel(`${region.part} / ${region.layer} / ${region.face}`);
                }}
                onPaint={paintFromThreeDimensions}
                parts={draft.parts}
                pixels={draft.pixels}
                profile={draft.profile}
              />
              <div className={styles.miniPreviews}>
                <figure>
                  <canvas aria-label="Front skin preview" height={32} ref={frontRef} width={16} />
                  <figcaption>Front</figcaption>
                </figure>
                <figure>
                  <canvas aria-label="Back skin preview" height={32} ref={backRef} width={16} />
                  <figcaption>Back</figcaption>
                </figure>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.statusBar}>
          <span>{regionLabel}</span>
          <span>{notice}</span>
        </div>
      </section>

      <aside className={styles.inspector}>
        <span className={styles.eyebrow}>SKIN INSPECTOR</span>
        <h2>Local skin</h2>
        <label className={styles.field}>
          Export profile
          <select
            onChange={(event) => setProfile(event.target.value as SkinProfileId)}
            value={draft.profile}
          >
            <option value="wide-arm-64">Wide arm · 64</option>
            <option value="slim-arm-64">Slim arm · 64</option>
          </select>
        </label>

        <section className={styles.section}>
          <span className={styles.eyebrow}>VISIBLE LAYERS</span>
          {(["base", "outer"] as const).map((layer) => (
            <label className={styles.checkRow} key={layer}>
              <input
                checked={draft.layers[layer]}
                onChange={(event) => setLayer(layer, event.target.checked)}
                type="checkbox"
              />
              {layer === "base" ? "Base layer" : "Outer layer"}
            </label>
          ))}
        </section>

        <section className={styles.section}>
          <span className={styles.eyebrow}>BODY PARTS</span>
          <div className={styles.partGrid}>
            {SKIN_PARTS.map((part) => (
              <label className={styles.checkRow} key={part}>
                <input
                  checked={draft.parts[part]}
                  onChange={(event) => setPart(part, event.target.checked)}
                  type="checkbox"
                />
                {part.replace("-", " ")}
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span
            className={styles.validationBadge}
            data-severity={validationSeverity}
          >
            {validationLabel}
          </span>
          <ul className={styles.issueList}>
            {(validation.issues.length ? validation.issues : [{ message: "No errors" }]).map((issue) => (
              <li key={"code" in issue ? issue.code : issue.message}>{issue.message}</li>
            ))}
          </ul>
        </section>

        <section className={`${styles.section} ${styles.actionStack}`}>
          <button className={styles.primaryButton} onClick={exportPng} type="button">
            Download PNG
          </button>
          <button className={styles.button} onClick={() => importRef.current?.click()} type="button">
            Import PNG
          </button>
          <input
            accept="image/png"
            className={styles.hiddenInput}
            onChange={importPng}
            ref={importRef}
            type="file"
          />
        </section>
      </aside>
    </div>
  );
}
