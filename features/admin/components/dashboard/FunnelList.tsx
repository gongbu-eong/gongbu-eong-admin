import { FunnelItem } from "@/features/admin/data/dashboard";
import styles from "./FunnelList.module.css";

type FunnelListProps = {
  items: FunnelItem[];
};

const funnelHelps: Record<
  number,
  {
    title: string;
    description: string;
  }
> = {
  1: {
    title: "방문",
    description:
      "모든 페이지에 방문한 횟수를 나타냅니다.",
  },
  2: {
    title: "코칭 시작",
    description:
      "AI NCS 자소서 코칭을 실제로 시작한 횟수를 나타냅니다.",
  },
  3: {
    title: "코칭 완료",
    description:
      "AI NCS 자소서 코칭 결과가 생성된 횟수를 나타냅니다.",
  },
  4: {
    title: "결과 확인",
    description:
      "사용자가 AI NCS 자소서 코칭 결과 화면을 확인한 횟수를 나타냅니다.",
  },
};

export function FunnelList({ items }: FunnelListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2>AI NCS 자소서 코칭 전환 퍼널</h2>
        <p>방문부터 결과 확인까지 유저의 이탈률을 봅니다.</p>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <div className={styles.item} key={item.step}>
            <div className={styles.top}>
              <span className={styles.step}>{item.step}</span>
              <span className={styles.labelCell}>
                <strong>{item.label}</strong>
                {funnelHelps[item.step] ? (
                  <span className={styles.helpWrap}>
                    <button
                      type="button"
                      className={styles.helpButton}
                      aria-label={`${item.label} 집계 기준`}
                      aria-describedby={`funnel-help-${item.step}`}
                    >
                      ?
                    </button>
                    <span
                      className={styles.tooltip}
                      id={`funnel-help-${item.step}`}
                      role="tooltip"
                    >
                      <b>{funnelHelps[item.step].title}</b>
                      <span>{funnelHelps[item.step].description}</span>
                    </span>
                  </span>
                ) : null}
              </span>
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
