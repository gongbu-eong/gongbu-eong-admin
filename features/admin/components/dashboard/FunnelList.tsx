import { FunnelItem } from "@/features/admin/data/dashboard";
import styles from "./FunnelList.module.css";

type FunnelListProps = {
  items: FunnelItem[];
  title: string;
  description: string;
  productLabel: string;
};

const funnelHelpTemplates: Record<
  number,
  {
    title: string;
    description: (productLabel: string) => string;
  }
> = {
  1: {
    title: "방문",
    description: (productLabel) =>
      `${productLabel} 페이지에 방문한 사용자 수를 나타냅니다.`,
  },
  2: {
    title: "시작",
    description: (productLabel) =>
      `${productLabel}의 시작 버튼이나 요청 버튼을 눌러 실제 사용을 시작한 횟수를 나타냅니다.`,
  },
  3: {
    title: "완료",
    description: (productLabel) =>
      `${productLabel} 결과가 생성된 횟수를 나타냅니다.`,
  },
};

export function FunnelList({
  items,
  title,
  description,
  productLabel,
}: FunnelListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <div className={styles.item} key={item.step}>
            <div className={styles.top}>
              <span className={styles.step}>{item.step}</span>
              <span className={styles.labelCell}>
                <strong>{item.label}</strong>
                {funnelHelpTemplates[item.step] ? (
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
                      <b>{funnelHelpTemplates[item.step].title}</b>
                      <span>
                        {funnelHelpTemplates[item.step].description(
                          productLabel,
                        )}
                      </span>
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
