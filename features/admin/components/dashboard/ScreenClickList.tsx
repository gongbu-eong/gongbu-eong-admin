import { ScreenClickItem } from "@/features/admin/data/dashboard";
import styles from "./ScreenClickList.module.css";

type ScreenClickListProps = {
  items: ScreenClickItem[];
  total: string;
};

export function ScreenClickList({ items, total }: ScreenClickListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>화면별 클릭</h2>
          <p>오늘 클릭 기준 · 총 {total}건</p>
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
