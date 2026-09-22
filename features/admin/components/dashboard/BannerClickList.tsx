import Link from "next/link";
import { BannerClickItem } from "@/features/admin/data/dashboard";
import { DashboardNote } from "./DashboardNote";
import styles from "./BannerClickList.module.css";

type BannerClickListProps = {
  items: BannerClickItem[];
  total: string;
  periodLabel: string;
};

export function BannerClickList({ items, total, periodLabel }: BannerClickListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>배너·버튼 클릭 상세</h2>
          <DashboardNote>{periodLabel}에 배너와 버튼을 누른 횟수입니다. 총 {total}건</DashboardNote>
        </div>
      </header>

      {items.length ? (
        <div className={styles.list}>
          {items.map((item) => {
            const content = (
              <>
                <div className={styles.top}>
                  <strong>{item.label}</strong>
                  {item.href ? (
                    <Link className={styles.countLink} href={item.href}>
                      {item.count}
                    </Link>
                  ) : (
                    <b>{item.count}</b>
                  )}
                </div>
                <p>일별 중복 제거 클릭자 합산 {item.uniqueCount}</p>
                <div className={styles.track}>
                  <i style={{ width: `${item.fill}%` }} />
                </div>
              </>
            );

            return <div className={styles.item} key={item.key}>{content}</div>;
          })}
        </div>
      ) : (
        <div className={styles.empty}>조회 기간에 기록된 클릭이 없습니다.</div>
      )}
    </section>
  );
}
