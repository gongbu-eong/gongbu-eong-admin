import Link from "next/link";
import type { ReactNode } from "react";
import type { BehaviorPatternItem } from "@/features/admin/data/dashboard";
import styles from "./BehaviorPatternList.module.css";

type BehaviorPatternListProps = {
  items: BehaviorPatternItem[];
  periodLabel: string;
};

export function BehaviorPatternList({
  items,
  periodLabel,
}: BehaviorPatternListProps) {
  const numberFrom = (value: string) => Number(value.replace(/[^0-9]/g, "")) || 0;
  const totals = items.reduce(
    (sum, item) => ({
      visitors: sum.visitors + numberFrom(item.visitors),
      activity: sum.activity + numberFrom(item.activity),
      pageMove: sum.pageMove + numberFrom(item.pageMove),
      apply: sum.apply + numberFrom(item.apply),
      revisit: sum.revisit + numberFrom(item.revisit),
    }),
    { visitors: 0, activity: 0, pageMove: 0, apply: 0, revisit: 0 },
  );

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>공고 상세 방문 후 행동 상세</h2>
          <p>
            {periodLabel} 기준 · 방문자는 명, 지원 클릭은 건으로 집계합니다.
          </p>
        </div>
      </header>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>유입 경로</span>
          <span>방문자 (명)</span>
          <span>후속 행동 방문자 (명)</span>
          <span>지원 클릭 (건)</span>
          <span>재방문자 (명)</span>
        </div>
        {items.map((item) => (
          <div className={styles.tableRow} key={item.key}>
            <span className={styles.channelCell}>
              <strong>{item.channelLabel}</strong>
            </span>
            <MetricLink href={item.visitorHref} className={styles.metricCell}>
              <strong>{item.visitors}</strong>
            </MetricLink>
            <MetricLink href={item.activityHref} className={styles.metricCell}>
              <b>{item.activity}</b>
              <em>{item.activityRate}</em>
              <em>페이지 이동 {item.pageMove}</em>
            </MetricLink>
            <MetricLink href={item.applyHref} className={styles.metricCell}>
              <b>{item.apply}</b>
            </MetricLink>
            <MetricLink href={item.revisitHref} className={styles.metricCell}>
              <b>{item.revisit}</b>
              <em>{item.revisitRate}</em>
            </MetricLink>
          </div>
        ))}
        {items.length ? (
          <div className={styles.tableFooter}>
            <strong>총계</strong>
            <strong>{totals.visitors.toLocaleString("ko-KR")}명</strong>
            <span>
              <strong>{totals.activity.toLocaleString("ko-KR")}명</strong>
              <em>페이지 이동 {totals.pageMove.toLocaleString("ko-KR")}건</em>
            </span>
            <strong>{totals.apply.toLocaleString("ko-KR")}건</strong>
            <strong>{totals.revisit.toLocaleString("ko-KR")}명</strong>
          </div>
        ) : null}
      </div>
      {!items.length ? (
        <div className={styles.empty}>공고 상세 유입 기록이 없습니다.</div>
      ) : null}
      <div className={styles.legend}>
        <span>방문자·후속 행동 방문자·재방문자: 브라우저 익명 ID 기준 일별 중복 제거 후 합산한 명수입니다. 서로 겹칠 수 있습니다.</span>
        <span>후속 행동 방문자: 공고 상세 이후 같은 세션에서 다른 화면 이동 또는 클릭·진단·코칭을 진행한 사람입니다. 아래 페이지 이동은 실제 방문 로그 건수입니다.</span>
        <span>지원 클릭: 실제 지원·이메일 지원 버튼을 누른 로그 건수입니다.</span>
        <span>재방문자: 30분 이상 활동이 없어 새 세션이 시작되고, 이전 30일 이내 방문 이력이 있는 사람입니다.</span>
      </div>
    </section>
  );
}

function MetricLink({
  href,
  className,
  children,
}: {
  href?: string;
  className: string;
  children: ReactNode;
}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}
