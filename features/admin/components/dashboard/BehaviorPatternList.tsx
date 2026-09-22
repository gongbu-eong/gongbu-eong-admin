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
      apply: sum.apply + numberFrom(item.apply),
      move: sum.move + numberFrom(item.move),
      exit: sum.exit + numberFrom(item.exit),
      pending: sum.pending + numberFrom(item.pending),
      revisit: sum.revisit + numberFrom(item.revisit),
    }),
    { visitors: 0, apply: 0, move: 0, exit: 0, pending: 0, revisit: 0 },
  );
  const outcomeTotal = totals.apply + totals.move + totals.exit + totals.pending;

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>공고 상세 첫 유입 후 행동 상세</h2>
          <DashboardNote>{periodLabel} · 공고 상세로 시작한 방문이 이후 어디로 이어졌는지 보여줍니다.</DashboardNote>
        </div>
      </header>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>유입 경로</span>
          <span>공고 상세 첫 유입</span>
          <span>지원</span>
          <span>다른 화면 이동</span>
          <span>이탈</span>
          <span>판정 대기</span>
        </div>
        {items.map((item) => (
          <div className={styles.tableRow} key={item.key}>
            <span className={styles.channelCell}>
              <strong>{item.channelLabel}</strong>
            </span>
            <MetricLink href={item.visitorHref} className={styles.metricCell}>
              <strong>{item.visitors}</strong>
              <em>
                30일 내 재방문 {item.revisit} ({item.revisitRate})
              </em>
            </MetricLink>
            <MetricLink href={item.applyHref} className={styles.metricCell}>
              <b>{item.apply}</b>
              <em>{item.applyRate}</em>
            </MetricLink>
            <MetricLink href={item.moveHref} className={styles.metricCell}>
              <b>{item.move}</b>
              <em>{item.moveRate}</em>
            </MetricLink>
            <MetricLink href={item.exitHref} className={styles.metricCell}>
              <b>{item.exit}</b>
              <em>{item.exitRate}</em>
            </MetricLink>
            <MetricLink href={item.pendingHref} className={styles.metricCell}>
              <b>{item.pending}</b>
              <em>{item.pendingRate}</em>
            </MetricLink>
          </div>
        ))}
        {items.length ? (
          <div className={styles.tableFooter}>
            <strong>총계</strong>
            <strong>{totals.visitors.toLocaleString("ko-KR")}명</strong>
            <strong>{totals.apply.toLocaleString("ko-KR")}명</strong>
            <strong>{totals.move.toLocaleString("ko-KR")}명</strong>
            <strong>{totals.exit.toLocaleString("ko-KR")}명</strong>
            <strong>{totals.pending.toLocaleString("ko-KR")}명</strong>
          </div>
        ) : null}
      </div>
      {!items.length ? (
        <div className={styles.empty}>공고 상세 유입 기록이 없습니다.</div>
      ) : null}
      {items.length && outcomeTotal !== totals.visitors ? (
        <p className={styles.integrityError} role="alert">
          집계 오류: 첫 결과 합계({outcomeTotal.toLocaleString("ko-KR")}명)가 첫 유입 방문자({totals.visitors.toLocaleString("ko-KR")}명)와 다릅니다.
        </p>
      ) : null}
      <DashboardGuide items={[
        "세션의 첫 화면이 공고 상세인 방문자만 집계합니다.",
        "한 사람은 하루 한 번만 집계하며, 그날 첫 공고 상세 유입 세션을 기준으로 봅니다.",
        "같은 세션의 첫 결과를 지원·다른 화면 이동·이탈·판정 대기 중 하나로 분류하므로 결과 합계는 첫 유입 방문자와 같습니다.",
        "이탈은 지원 버튼을 누르거나 다른 화면으로 이동하지 않은 채 30분 세션이 끝난 경우입니다.",
        "판정 대기는 마지막 활동 후 30분이 지나지 않아 아직 이탈 여부를 확정할 수 없는 방문자입니다.",
        "30일 내 재방문은 결과 분류와 별도인 참고 정보입니다.",
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
