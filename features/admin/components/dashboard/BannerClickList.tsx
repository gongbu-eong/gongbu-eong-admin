import Link from "next/link";
import { BannerClickItem } from "@/features/admin/data/dashboard";
import styles from "./BannerClickList.module.css";

type BannerClickListProps = {
  items: BannerClickItem[];
  total: string;
};

export function BannerClickList({ items, total }: BannerClickListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>배너 클릭</h2>
          <p>오늘 클릭 기준 · 총 {total}건</p>
        </div>
        <Link href="/traffic/banner-clicks">전체보기 &gt;</Link>
      </header>

      {items.length ? (
        <div className={styles.list}>
          {items.map((item) => (
            <div className={styles.item} key={item.key}>
              <div className={styles.top}>
                <strong>{item.label}</strong>
                <b>{item.count}</b>
              </div>
              <p>고유 클릭 {item.uniqueCount}</p>
              <div className={styles.track}>
                <i style={{ width: `${item.fill}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>오늘 기록된 배너 클릭이 없습니다.</div>
      )}
    </section>
  );
}
