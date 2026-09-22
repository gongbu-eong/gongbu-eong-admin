import Link from "next/link";
import type { ReactNode } from "react";
import type { BehaviorPatternItem } from "@/features/admin/data/dashboard";
import { DashboardGuide, DashboardNote } from "./DashboardNote";
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
          <DashboardNote>{periodLabel}에 공고 상세를 본 사람들의 이후 행동을 보여줍니다.</DashboardNote>
        </div>
      </header>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>유입 경로</span>
          <span>공고 상세 방문자</span>
          <span>후속 행동한 사람</span>
          <span>지원 버튼 클릭</span>
          <span>재방문자</span>
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
              <em>다른 화면 이동 {item.pageMove}</em>
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
              <em>다른 화면 이동 {totals.pageMove.toLocaleString("ko-KR")}건</em>
            </span>
            <strong>{totals.apply.toLocaleString("ko-KR")}건</strong>
            <strong>{totals.revisit.toLocaleString("ko-KR")}명</strong>
          </div>
        ) : null}
      </div>
      {!items.length ? (
        <div className={styles.empty}>공고 상세 유입 기록이 없습니다.</div>
      ) : null}
      <DashboardGuide items={[
        "사람 수는 같은 날 여러 번 방문해도 한 명으로 셉니다.",
        "후속 행동·지원·재방문은 같은 사람에게 함께 발생할 수 있어 더하지 않습니다.",
        "후속 행동은 다른 화면 이동 또는 버튼 클릭입니다. 공고 상세 재조회는 제외합니다.",
        "지원 버튼 클릭은 같은 사람이 여러 번 누르면 모두 셉니다.",
        "재방문자는 30분 이상 뒤에 다시 방문한 사람입니다.",
      ]} />
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
