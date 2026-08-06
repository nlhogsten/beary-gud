"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "../StudioShell.module.css";
import {
  LOCAL_VERSION_STORAGE_KEY,
  createLocalVersion,
  createLocalVersionId,
  parseLocalVersions,
  versionsForScope,
  writeLocalVersions,
  type LocalVersionRecord,
} from "./core";

interface LocalVersionPanelProps {
  assetKey: string;
  documentJson: string;
  documentKind: string;
  engineId: string;
  engineVersion: string;
  schemaVersion: number;
  onRestore: (record: LocalVersionRecord) => void;
  renderPreview: (record: LocalVersionRecord) => ReactNode;
  compareSummary: (left: LocalVersionRecord, right: LocalVersionRecord) => string;
}

export function LocalVersionPanel(props: LocalVersionPanelProps) {
  const [records, setRecords] = useState<LocalVersionRecord[]>([]);
  const [name, setName] = useState("");
  const [activeVersionId, setActiveVersionId] = useState<string>();
  const [comparisonAId, setComparisonAId] = useState<string>();
  const [comparisonBId, setComparisonBId] = useState<string>();
  const [notice, setNotice] = useState("No named versions yet");
  const scope = useMemo(
    () => ({ engineId: props.engineId, assetKey: props.assetKey }),
    [props.assetKey, props.engineId],
  );
  const versions = useMemo(() => versionsForScope(records, scope), [records, scope]);
  const comparisonA = versions.find((version) => version.id === comparisonAId);
  const comparisonB = versions.find((version) => version.id === comparisonBId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = parseLocalVersions(window.localStorage.getItem(LOCAL_VERSION_STORAGE_KEY));
      const scoped = versionsForScope(loaded, scope);
      const latest = scoped.at(-1);
      setRecords(loaded);
      setActiveVersionId(latest?.id);
      setComparisonAId(scoped.at(-2)?.id ?? latest?.id);
      setComparisonBId(latest?.id);
      setNotice(scoped.length ? `${scoped.length} named version${scoped.length === 1 ? "" : "s"} loaded` : "No named versions yet");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scope]);

  function saveVersion() {
    try {
      const created = createLocalVersion(records, {
        ...scope,
        id: createLocalVersionId(),
        engineVersion: props.engineVersion,
        documentKind: props.documentKind,
        schemaVersion: props.schemaVersion,
        name,
        createdAt: new Date().toISOString(),
        ...(activeVersionId ? { parentVersionId: activeVersionId } : {}),
        operationSummary: activeVersionId ? "Saved local revision" : "Saved initial local version",
        documentJson: props.documentJson,
      });
      const saved = created.at(-1)!;
      writeLocalVersions(window.localStorage, created);
      setRecords(created);
      setActiveVersionId(saved.id);
      setComparisonAId((current) => current ?? saved.id);
      setComparisonBId(saved.id);
      setName("");
      setNotice(`Saved version ${saved.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Version could not be saved");
    }
  }

  function restoreVersion(record: LocalVersionRecord) {
    try {
      props.onRestore(record);
      setActiveVersionId(record.id);
      setNotice(`Restored ${record.name} as editable draft`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Version could not be restored");
    }
  }

  return (
    <section aria-label="Local versions" className={styles.versionPanel}>
      <div className={styles.versionHeading}>
        <span className={styles.eyebrow}>LOCAL VERSIONS</span>
        <span>{versions.length} / 25</span>
      </div>
      <p className={styles.versionHelp}>Named snapshots are immutable and stay in this browser.</p>
      <label className={styles.field}>
        Version name
        <input
          aria-label="Version name"
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Baseline"
          value={name}
        />
      </label>
      <button className={styles.primaryButton} onClick={saveVersion} type="button">
        Save version
      </button>
      <div className={styles.versionStatus} role="status">{notice}</div>

      {versions.length > 0 ? (
        <ol className={styles.versionList}>
          {versions.map((version, index) => (
            <li key={version.id}>
              <div>
                <strong>{version.name}</strong>
                <small>v{index + 1} · {version.operationSummary}</small>
              </div>
              <div className={styles.versionActions}>
                <button
                  aria-label={`Set ${version.name} as comparison A`}
                  className={styles.textButton}
                  onClick={() => setComparisonAId(version.id)}
                  type="button"
                >
                  Compare A
                </button>
                <button
                  aria-label={`Set ${version.name} as comparison B`}
                  className={styles.textButton}
                  onClick={() => setComparisonBId(version.id)}
                  type="button"
                >
                  Compare B
                </button>
                <button
                  aria-label={`Restore ${version.name}`}
                  className={styles.textButton}
                  onClick={() => restoreVersion(version)}
                  type="button"
                >
                  Restore
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.versionEmpty}>Save the current draft to begin a comparison.</p>
      )}

      {comparisonA && comparisonB ? (
        <section aria-label="Version comparison" className={styles.versionComparison}>
          <strong>Comparing {comparisonA.name} with {comparisonB.name}</strong>
          <span>{props.compareSummary(comparisonA, comparisonB)}</span>
          <div className={styles.versionPreviewGrid}>
            <figure>
              {props.renderPreview(comparisonA)}
              <figcaption>{comparisonA.name}</figcaption>
            </figure>
            <figure>
              {props.renderPreview(comparisonB)}
              <figcaption>{comparisonB.name}</figcaption>
            </figure>
          </div>
        </section>
      ) : null}
    </section>
  );
}
