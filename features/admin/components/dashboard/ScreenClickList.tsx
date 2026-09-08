import { ScreenInflowItem } from "@/features/admin/data/dashboard";
import styles from "./ScreenClickList.module.css";

type ScreenClickListProps = {
  items: ScreenInflowItem[];
  total: string;
  channelLabel: string;
};

export function ScreenClickList({
  items,
  total,
  channelLabel,
}: ScreenClickListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>화면별 유입</h2>
          <p>{channelLabel} 기준 · 총 {total}건</p>
        </div>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <div className={styles.item} key={item.key}>
            <div className={styles.top}>
              <strong>{item.label}</strong>
              <b>{item.count}</b>
            </div>
            <div className={styles.track}>
              <i style={{ width: `${item.fill}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
