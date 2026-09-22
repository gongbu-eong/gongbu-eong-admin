import Link from "next/link";
import { ScreenInflowItem } from "@/features/admin/data/dashboard";
import { DashboardNote } from "./DashboardNote";
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
          <h2>
            화면별 방문 건수
            <span className={styles.titleNote}>(동일 방문자의 반복 방문 포함)</span>
          </h2>
          <DashboardNote>{channelLabel}에서 각 화면을 연 횟수입니다. 같은 사람이 반복해서 열면 모두 포함됩니다. 총 {total}건</DashboardNote>
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
