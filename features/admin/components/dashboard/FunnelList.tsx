import Link from "next/link";
import { FunnelItem } from "@/features/admin/data/dashboard";
import styles from "./FunnelList.module.css";

type FunnelListProps = {
  items: FunnelItem[];
  title: string;
  description: string;
  productLabel: string;
};

const funnelHelpTemplates: Record<
  string,
  {
    title: string;
    description: (productLabel: string) => string;
  }
> = {
  visit: {
    title: "방문",
    description: (productLabel) =>
      `${productLabel} 페이지의 브라우저 익명 ID별 일일 방문 인원 합계입니다. 시작 기록과 별도로 집계합니다.`,
  },
  start: {
    title: "시작",
    description: (productLabel) =>
      `${productLabel} 사용을 시작한 브라우저 익명 ID별 일일 인원 합계입니다. 같은 날 여러 번 시작해도 1명입니다.`,
  },
  complete: {
    title: "완료",
    description: (productLabel) =>
      `${productLabel} 시작 인원 중 현재까지 결과가 확인된 인원입니다. 결과 생성일이 아닌 시작일에 집계합니다.`,
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
        {items.map((item) => {
          const helpTemplate =
            item.label === "진단 시작"
              ? {
                  title: "진단 시작",
                  description: (productLabel: string) =>
                    `${productLabel} Q1 문항 화면에 진입한 사용자 수를 나타냅니다.`,
                }
              : funnelHelpTemplates[item.label.includes("완료") ? "complete" : item.label.includes("시작") ? "start" : "visit"];
          const content = (
            <>
              <div className={styles.top}>
                <span className={styles.step}>{item.step}</span>
                <span className={styles.labelCell}>
                  <strong>{item.label}</strong>
                  {helpTemplate ? (
                    <span className={styles.helpWrap}>
                      <span
                        className={styles.helpButton}
                        aria-describedby={`funnel-help-${item.step}`}
                        aria-label={`${item.label} 집계 기준`}
                        role="button"
                        tabIndex={0}
                      >
                        ?
                      </span>
                      <span
                        className={styles.tooltip}
                        id={`funnel-help-${item.step}`}
                        role="tooltip"
                      >
                        <b>{helpTemplate.title}</b>
                        <span>
                          {helpTemplate.description(productLabel)}
                        </span>
                      </span>
                    </span>
                  ) : null}
                </span>
                {item.conversion ? (
                  <span className={styles.conversion}>{item.conversion}</span>
                ) : null}
                {item.drop ? (
                  <span className={styles.drop}>{item.drop}</span>
                ) : null}
                <b>{item.value}</b>
              </div>
              <div className={styles.track}>
                <i style={{ width: `${item.fill}%` }} />
              </div>
            </>
          );

          return (
            <div className={styles.item} key={item.step}>
              {item.href ? (
                <Link className={styles.itemLink} href={item.href}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
