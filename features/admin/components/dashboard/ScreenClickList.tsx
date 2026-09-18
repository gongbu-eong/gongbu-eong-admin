import Link from "next/link";
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
          <h2>화면별 순 방문자</h2>
          <p>{channelLabel} 기준 · 같은 화면 중복 제외 {total}명</p>
        </div>
      </header>
      <div className={styles.list}>
        {items.map((item) => {
          const content = (
            <>
              <div className={styles.top}>
                <strong>{item.label}</strong>
                <b>{item.count}</b>
              </div>
              <div className={styles.track}>
                <i style={{ width: `${item.fill}%` }} />
              </div>
            </>
          );

          return item.href ? (
            <Link className={styles.item} href={item.href} key={item.key}>
              {content}
            </Link>
          ) : (
            <div className={styles.item} key={item.key}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
