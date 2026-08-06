"use client";

import { Suspense, useEffect, useState } from "react";
import { ENGINE_UI_REGISTRY, engineUi, type EngineUiId } from "./engine-ui-registry";
import styles from "./StudioShell.module.css";

const ENGINE_STORAGE_KEY = "voxl-active-engine-v1";

function isEngineId(value: string | null): value is EngineUiId {
  return ENGINE_UI_REGISTRY.some((engine) => engine.id === value);
}

export function StudioShell() {
  const [activeEngineId, setActiveEngineId] = useState<EngineUiId>("voxl-humanoid-skin");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(ENGINE_STORAGE_KEY);
      if (isEngineId(stored)) setActiveEngineId(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function selectEngine(engineId: EngineUiId) {
    window.localStorage.setItem(ENGINE_STORAGE_KEY, engineId);
    setActiveEngineId(engineId);
  }

  const activeEngine = engineUi(activeEngineId);
  const ActiveEditor = activeEngine.Editor;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span>VOXL STUDIO</span>
          <strong>Open-ended visual assets</strong>
        </div>
        <nav className={styles.engineSwitcher} aria-label="Visual engine">
          {ENGINE_UI_REGISTRY.map((engine) => (
            <button
              className={styles.engineTab}
              data-active={engine.id === activeEngineId}
              key={engine.id}
              onClick={() => selectEngine(engine.id)}
              type="button"
            >
              <span>{engine.label}</span>
              <small>{engine.description}</small>
            </button>
          ))}
        </nav>
        <div className={styles.engineStatus}>
          <span className={styles.statusBadge} data-status={activeEngine.status}>
            React editor
          </span>
        </div>
      </header>
      <Suspense fallback={<div className={styles.editorLoading}>Loading editor…</div>}>
        <ActiveEditor />
      </Suspense>
    </main>
  );
}
