"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import styles from "../StudioShell.module.css";
import {
  FRAME_COUNT,
  TRANSPARENT_DRAFT_STORAGE_KEY,
  TRANSPARENT_HISTORY_STORAGE_KEY,
  addActivity,
  blankCharacter,
  canvasBlob,
  colorFor,
  commitTransparentEdit,
  createCharacterCanvas,
  currentCharacter,
  initialTransparentState,
  makeAnimatedPng,
  makeSpriteSheet,
  nextPaletteSymbol,
  normalizeTransparentHistory,
  normalizeTransparentState,
  paintCharacterPixel,
  pixelIsHidden,
  redoTransparentEdit,
  replaceCurrentCharacter,
  slugifyCharacter,
  undoTransparentEdit,
  type EffectId,
  type ExportMode,
  type TransparentStudioHistory,
  type TransparentStudioState,
} from "./core";

function loadJson(key: string): unknown {
  const value = window.localStorage.getItem(key);
  return value ? JSON.parse(value) : undefined;
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.download = filename;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TransparentCharacterEditor() {
  const [state, setState] = useState<TransparentStudioState>(initialTransparentState);
  const [history, setHistory] = useState<TransparentStudioHistory>({ past: [], future: [] });
  const [selected, setSelected] = useState("0");
  const [frame, setFrame] = useState(0);
  const [pickerMode, setPickerMode] = useState(false);
  const [customColor, setCustomColor] = useState("#8b5cf6");
  const [notice, setNotice] = useState("Draft saved locally");
  const [exporting, setExporting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  const historyRef = useRef(history);

  const updateState = useCallback((next: TransparentStudioState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const updateHistory = useCallback((next: TransparentStudioHistory) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        updateState(normalizeTransparentState(loadJson(TRANSPARENT_DRAFT_STORAGE_KEY)));
        updateHistory(normalizeTransparentHistory(loadJson(TRANSPARENT_HISTORY_STORAGE_KEY)));
      } catch {
        setNotice("Stored motion draft was unreadable; opened the safe starter character");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [updateHistory, updateState]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(TRANSPARENT_DRAFT_STORAGE_KEY, JSON.stringify(state));
    window.localStorage.setItem(TRANSPARENT_HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history, hydrated, state]);

  const character = useMemo(() => currentCharacter(state), [state]);

  useEffect(() => {
    if (selected !== "0" && !character.palette[selected]) setSelected("0");
  }, [character.palette, selected]);

  const commit = useCallback((label: string, mutate: (draft: TransparentStudioState) => TransparentStudioState) => {
    const result = commitTransparentEdit(stateRef.current, historyRef.current, label, mutate);
    if (!result.changed) return false;
    updateState(result.state);
    updateHistory(result.history);
    setNotice(label);
    return true;
  }, [updateHistory, updateState]);

  const undo = useCallback(() => {
    const result = undoTransparentEdit(stateRef.current, historyRef.current);
    if (!result.label) return;
    updateState(result.state);
    updateHistory(result.history);
    setSelected("0");
    setPickerMode(false);
    setNotice(`Undid: ${result.label}`);
  }, [updateHistory, updateState]);

  const redo = useCallback(() => {
    const result = redoTransparentEdit(stateRef.current, historyRef.current);
    if (!result.label) return;
    updateState(result.state);
    updateHistory(result.history);
    setSelected("0");
    setPickerMode(false);
    setNotice(`Redid: ${result.label}`);
  }, [updateHistory, updateState]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
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
      if (event.key.toLowerCase() === "e") {
        setSelected("0");
        setPickerMode(false);
      }
      if (event.key.toLowerCase() === "i") setPickerMode((value) => !value);
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [redo, undo]);

  function chooseSymbol(symbol: string) {
    setSelected(symbol);
    setPickerMode(false);
  }

  function paintPixel(x: number, y: number, symbol: string) {
    const before = character.lines[y]?.[x];
    if (before === symbol) return;
    const verb = symbol === "0" ? "Erased" : "Painted";
    commit(`${verb} pixel ${x + 1},${y + 1}`, (draft) => replaceCurrentCharacter(
      draft,
      (item) => paintCharacterPixel(item, x, y, symbol),
    ));
  }

  function handlePixel(x: number, y: number, symbol: string) {
    if (pickerMode) {
      if (symbol === "0") {
        setNotice("That pixel is transparent—pick a colored pixel");
        return;
      }
      setSelected(symbol);
      setPickerMode(false);
      setNotice(`Picked ${character.palette[symbol] ?? symbol}`);
      return;
    }
    paintPixel(x, y, selected);
  }

  function createCharacter() {
    const clean = window.prompt("Name your new character:", "New character")?.trim();
    if (!clean) return;
    if (stateRef.current.characters.some((item) => item.name === clean)) {
      setNotice("That character already exists");
      return;
    }
    commit(`Created ${clean}`, (draft) => ({
      ...draft,
      current: clean,
      characters: [...draft.characters, blankCharacter(clean)],
    }));
    setSelected("0");
    setPickerMode(false);
    setFrame(0);
  }

  function selectCharacter(name: string) {
    updateState({ ...stateRef.current, current: name });
    setSelected("0");
    setPickerMode(false);
    setFrame(0);
    setNotice(`Opened ${name}`);
  }

  function changeNumber(field: "scale" | "fps", value: number) {
    const normalized = Math.max(1, Math.min(60, Number(value) || (field === "scale" ? 10 : 12)));
    const label = field === "scale"
      ? `Changed pixel scale to ${normalized}`
      : `Changed frame rate to ${normalized} fps`;
    commit(label, (draft) => replaceCurrentCharacter(draft, (item) => ({ ...item, [field]: normalized })));
  }

  function toggleEffect(effect: EffectId) {
    const enabled = character.effects[effect];
    commit(`${enabled ? "Disabled" : "Enabled"} ${effect} effect`, (draft) => replaceCurrentCharacter(
      draft,
      (item) => ({ ...item, effects: { ...item.effects, [effect]: !item.effects[effect] } }),
    ));
  }

  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    const mode = event.target.value as ExportMode;
    commit(`Selected ${mode} export`, (draft) => ({ ...draft, mode }));
  }

  function addCustomColor() {
    const value = customColor.toLowerCase();
    const existing = Object.entries(character.palette).find(([, color]) => color.toLowerCase() === value);
    if (existing) {
      chooseSymbol(existing[0]);
      setNotice(`${value} is already in the palette`);
      return;
    }
    const symbol = nextPaletteSymbol(character.palette);
    if (!symbol) {
      setNotice("This palette has reached its color limit");
      return;
    }
    commit(`Added custom color ${value}`, (draft) => replaceCurrentCharacter(
      draft,
      (item) => ({ ...item, palette: { ...item.palette, [symbol]: value } }),
    ));
    chooseSymbol(symbol);
  }

  function recordExport(message: string) {
    updateState(addActivity(stateRef.current, message));
    setNotice(message);
  }

  async function exportCurrentFrame() {
    try {
      downloadBlob(
        await canvasBlob(createCharacterCanvas(character, frame)),
        `${slugifyCharacter(character.name)}-frame-${String(frame).padStart(3, "0")}.png`,
      );
      recordExport(`Exported frame ${frame + 1} as PNG`);
    } catch (error) {
      recordExport(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function exportAnimation() {
    setExporting(true);
    try {
      if (state.mode === "Sprite sheet") {
        downloadBlob(await makeSpriteSheet(character), `${slugifyCharacter(character.name)}-sprite-sheet.png`);
        recordExport("Exported sprite sheet");
      } else {
        downloadBlob(await makeAnimatedPng(character), `${slugifyCharacter(character.name)}-animation.png`);
        recordExport("Exported animated PNG");
      }
    } catch (error) {
      recordExport(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExporting(false);
    }
  }

  function downloadActivity() {
    const body = `${state.activity.map((entry) => `${entry.time}\t${entry.message}`).join("\n")}\n`;
    downloadBlob(
      new Blob([body], { type: "text/plain" }),
      `character-studio-activity-${new Date().toISOString().slice(0, 10)}.log`,
    );
    setNotice("Activity log downloaded");
  }

  const drift = character.effects.drift ? [0, -2, -4, -2][frame] ?? 0 : 0;
  const recentActivity = state.activity.slice(-5).reverse();

  return (
    <section className={styles.motionLayout}>
      <aside className={styles.assetLibrary}>
        <div className={styles.assetLibraryHeading}>
          <strong>Characters</strong>
          <button className={styles.squareButton} onClick={createCharacter} title="Create a character" type="button">+</button>
        </div>
        <div className={styles.characterList}>
          {state.characters.map((item) => (
            <button
              className={styles.characterButton}
              data-active={item.name === state.current}
              key={item.name}
              onClick={() => selectCharacter(item.name)}
              type="button"
            >
              <span className={styles.characterAvatar}>▟</span>
              <span><strong>{item.name}</strong><small>{FRAME_COUNT} preview frames · {item.fps} fps</small></span>
            </button>
          ))}
        </div>
        <div className={styles.localNote}>
          <strong>Local-first editor</strong>
          <span>Drafts, palettes, and edit history stay in this browser.</span>
        </div>
      </aside>

      <div className={styles.motionEditor}>
        <div className={styles.motionBar}>
          <span>{slugifyCharacter(character.name)} / preview / <strong>{String(frame).padStart(3, "0")}</strong></span>
          <div>
            <button className={styles.squareButton} disabled={!history.past.length} onClick={undo} title="Undo" type="button">↶</button>
            <button className={styles.squareButton} disabled={!history.future.length} onClick={redo} title="Redo" type="button">↷</button>
            <span className={styles.saved}>● Saved locally</span>
          </div>
        </div>

        <div className={styles.motionStageWrap}>
          <div className={styles.motionStage}>
            <div
              aria-label="Pixel canvas"
              className={styles.pixelGrid}
              data-picker={pickerMode}
              style={{
                gridTemplateColumns: `repeat(50, ${character.scale}px)`,
                transform: `translateY(${drift}px)`,
              }}
            >
              {character.lines.flatMap((row, y) => [...row].map((symbol, x) => {
                const color = colorFor(symbol, frame, character);
                const transparent = !color || pixelIsHidden(symbol, x, frame, character);
                return (
                  <button
                    aria-label={`Pixel ${x + 1}, ${y + 1}${symbol === "0" ? ", transparent" : `, ${character.palette[symbol] ?? symbol}`}`}
                    className={styles.pixel}
                    key={`${x}:${y}`}
                    onClick={() => handlePixel(x, y, symbol)}
                    style={{
                      width: character.scale,
                      height: character.scale,
                      background: transparent ? "transparent" : color,
                    }}
                    type="button"
                  />
                );
              }))}
            </div>
          </div>
        </div>

        <div className={styles.motionTools} aria-label="Paint tools">
          <span>Paint</span>
          <button className={styles.button} data-selected={selected === "0" && !pickerMode} onClick={() => chooseSymbol("0")} type="button">⌫ Erase</button>
          <button className={styles.button} data-selected={pickerMode} onClick={() => setPickerMode((value) => !value)} type="button">⌾ Pick</button>
          <span className={styles.toolDivider} />
          <div className={styles.swatches}>
            {Object.entries(character.palette).map(([symbol, color]) => (
              <button
                aria-label={`Paint ${color}`}
                className={styles.swatch}
                data-selected={selected === symbol && !pickerMode}
                key={symbol}
                onClick={() => chooseSymbol(symbol)}
                style={{ background: color }}
                title={`${color} (${symbol})`}
                type="button"
              />
            ))}
          </div>
          <input aria-label="Custom color" className={styles.colorInput} onChange={(event) => setCustomColor(event.target.value)} type="color" value={customColor} />
          <button className={styles.button} onClick={addCustomColor} type="button">+ Add color</button>
        </div>

        <div className={styles.timeline}>
          <div className={styles.timelineHeading}>
            <strong>Animation preview</strong>
            <select aria-label="Export format" onChange={changeMode} value={state.mode}>
              <option>Animated PNG</option>
              <option>Sprite sheet</option>
            </select>
          </div>
          <div className={styles.track}>
            <strong>{character.name}</strong>
            <div className={styles.ticks}>
              {Array.from({ length: 12 }, (_, index) => (
                <button className={styles.frameKey} data-active={index % FRAME_COUNT === frame} key={index} onClick={() => setFrame(index % FRAME_COUNT)} type="button">
                  {index % FRAME_COUNT + 1}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.track}>
            <strong>Effects</strong>
            <div className={styles.effectLine} />
          </div>
        </div>
      </div>

      <aside className={styles.motionInspector}>
        <span className={styles.eyebrow}>INSPECTOR</span>
        <h2>{character.name}</h2>
        <label className={styles.field}>Pixel scale<input min="1" max="60" onChange={(event) => changeNumber("scale", Number(event.target.value))} type="number" value={character.scale} /></label>
        <label className={styles.field}>Frame rate<input min="1" max="60" onChange={(event) => changeNumber("fps", Number(event.target.value))} type="number" value={character.fps} /></label>

        <div className={styles.section}>
          <span className={styles.eyebrow}>EFFECTS</span>
          {(["smoke", "cycle", "drift"] as const).map((effect) => (
            <button className={styles.effectButton} data-enabled={character.effects[effect]} key={effect} onClick={() => toggleEffect(effect)} type="button">
              <span>{effect === "smoke" ? "◌ Alternating smoke" : effect === "cycle" ? "✦ Palette cycle" : "↗ Drift"}</span>
              <strong>{character.effects[effect] ? (effect === "drift" ? "+4 px" : "ON") : "OFF"}</strong>
            </button>
          ))}
        </div>

        <div className={styles.exportCard}>
          <strong>{state.mode}</strong>
          <small>{state.mode === "Animated PNG" ? "Transparent animation that loops" : "Four transparent frames in one PNG"}</small>
          <button className={styles.primaryButton} disabled={exporting} onClick={exportAnimation} type="button">{exporting ? "Preparing…" : "Export animation"}</button>
          <button className={styles.button} disabled={exporting} onClick={exportCurrentFrame} type="button">Export current frame</button>
        </div>

        <div className={styles.activitySection}>
          <div className={styles.activityHeading}>
            <span className={styles.eyebrow}>ACTIVITY</span>
            <button className={styles.textButton} onClick={downloadActivity} type="button">Download log</button>
          </div>
          <ol className={styles.activityList}>
            {recentActivity.length ? recentActivity.map((entry) => (
              <li key={`${entry.time}:${entry.message}`}><span>{entry.message}</span><time dateTime={entry.time}>{new Date(entry.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></li>
            )) : <li>No edits yet</li>}
          </ol>
        </div>
        <div className={styles.motionNotice} role="status">{notice}</div>
      </aside>
    </section>
  );
}
