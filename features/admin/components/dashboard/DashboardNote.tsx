import type { ReactNode } from "react";
import styles from "./DashboardNote.module.css";

export function DashboardNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

export function DashboardGuide({ items }: { items: string[] }) {
  return (
    <section className={styles.guide} aria-label="집계 기준">
      <strong>집계 기준</strong>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
