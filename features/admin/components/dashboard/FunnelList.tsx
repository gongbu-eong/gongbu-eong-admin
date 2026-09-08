import { FunnelItem } from "@/features/admin/data/dashboard";
import styles from "./FunnelList.module.css";

type FunnelListProps = {
  items: FunnelItem[];
};

export function FunnelList({ items }: FunnelListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2>AI 자소서 코칭 전환 퍼널</h2>
        <p>방문부터 결과 확인까지 유저의 이탈율을 봅니다.</p>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <div className={styles.item} key={item.step}>
            <div className={styles.top}>
              <span className={styles.step}>{item.step}</span>
              <strong>{item.label}</strong>
              {item.conversion ? (
                <span className={styles.conversion}>{item.conversion}</span>
              ) : null}
              {item.drop ? <span className={styles.drop}>{item.drop}</span> : null}
              <b>{item.value}</b>
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
