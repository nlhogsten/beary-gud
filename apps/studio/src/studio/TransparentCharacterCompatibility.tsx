import styles from "./StudioShell.module.css";

export function TransparentCharacterCompatibility() {
  return (
    <section className={styles.compatibility} aria-labelledby="compatibility-title">
      <div className={styles.compatibilityNotice}>
        <div>
          <strong id="compatibility-title">Compatibility editor</strong>
          <span>The existing motion workflow remains available while it is migrated into React.</span>
        </div>
        <span className={styles.statusBadge}>Legacy UI</span>
      </div>
      <iframe
        className={styles.compatibilityFrame}
        src="/compatibility/index.html"
        title="Transparent character compatibility editor"
      />
    </section>
  );
}
