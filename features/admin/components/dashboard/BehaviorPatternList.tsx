import Link from "next/link";
import type { ReactNode } from "react";
import type { BehaviorPatternItem } from "@/features/admin/data/dashboard";
import { DashboardNote } from "./DashboardNote";
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
  const totalRate = (value: number) => {
    if (!totals.visitors) return "0%";
    const rate = (value / totals.visitors) * 100;
    return `${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(1)}%`;
  };

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>공고 상세 시작 방문 후 행동 상세</h2>
          <DashboardNote>{periodLabel} · 공고 상세로 시작한 방문이 이후 어디로 이어졌는지 보여줍니다.</DashboardNote>
        </div>
      </header>
      <dl className={styles.glossary} aria-label="공고 상세 유입 후 행동 지표 설명">
        <div>
          <dt><i className={styles.entryDot} />공고 상세 시작 방문</dt>
          <dd>세션의 첫 화면으로 공고 상세에 들어온 방문자입니다. 다른 화면을 먼저 본 뒤 이동한 방문은 포함하지 않으며, 한 사람은 하루 한 번만 셉니다.</dd>
        </div>
        <div>
          <dt><i className={styles.applyDot} />지원</dt>
          <dd>같은 세션에서 다른 화면으로 이동하기 전에 지원하기 또는 이메일 지원하기를 누른 방문자입니다.</dd>
        </div>
        <div>
          <dt><i className={styles.moveDot} />다른 화면 이동</dt>
          <dd>같은 세션에서 지원 버튼을 누르기 전에 공부엉이의 다른 화면으로 이동한 방문자입니다.</dd>
        </div>
        <div>
          <dt><i className={styles.exitDot} />이탈</dt>
          <dd>지원하거나 다른 화면으로 이동하지 않고, 마지막 활동 후 30분이 지나 세션이 끝난 방문자입니다.</dd>
        </div>
        <div>
          <dt><i className={styles.pendingDot} />판정 대기</dt>
          <dd>마지막 활동 후 30분이 지나지 않아 지원·이동·이탈 중 어느 결과인지 아직 확정할 수 없는 방문자입니다.</dd>
        </div>
        <div>
          <dt><i className={styles.revisitDot} />30일 내 재방문</dt>
          <dd>공고 상세 시작 방문자 중 해당 방문일 이전 30일 안에도 방문 기록이 있는 사람입니다. 첫 결과와는 별도로 집계합니다.</dd>
        </div>
      </dl>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>유입 경로</span>
          <span>공고 상세 시작 방문</span>
          <span>지원</span>
          <span>다른 화면 이동</span>
          <span>이탈</span>
          <span>판정 대기</span>
          <span>30일 내 재방문</span>
        </div>
        {items.map((item) => (
          <div className={styles.tableRow} key={item.key}>
            <span className={styles.channelCell}>
              <strong>{item.channelLabel}</strong>
            </span>
            <span className={styles.metricCell}>
              {item.visitorHref ? (
                <Link className={styles.metricValueLink} href={item.visitorHref}>
                  <strong>{item.visitors}</strong>
                </Link>
              ) : <strong>{item.visitors}</strong>}
            </span>
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
            <span><strong>{totals.apply.toLocaleString("ko-KR")}명</strong><em>{totalRate(totals.apply)}</em></span>
            <span><strong>{totals.move.toLocaleString("ko-KR")}명</strong><em>{totalRate(totals.move)}</em></span>
            <span><strong>{totals.exit.toLocaleString("ko-KR")}명</strong><em>{totalRate(totals.exit)}</em></span>
            <span><strong>{totals.pending.toLocaleString("ko-KR")}명</strong><em>{totalRate(totals.pending)}</em></span>
            <span><strong>{totals.revisit.toLocaleString("ko-KR")}명</strong><em>{totalRate(totals.revisit)}</em></span>
          </div>
        ) : null}
      </div>
      {!items.length ? (
        <div className={styles.empty}>공고 상세 유입 기록이 없습니다.</div>
      ) : null}
      {items.length && outcomeTotal !== totals.visitors ? (
        <p className={styles.integrityError} role="alert">
          집계 오류: 첫 결과 합계({outcomeTotal.toLocaleString("ko-KR")}명)가 공고 상세 시작 방문자({totals.visitors.toLocaleString("ko-KR")}명)와 다릅니다.
        </p>
      ) : null}
      <p className={styles.ruleNote}>
        지원·다른 화면 이동·이탈·판정 대기는 서로 겹치지 않으며, 네 항목의 합은 공고 상세 시작 방문자와 같습니다. 30일 내 재방문은 결과 분류와 별도입니다.
      </p>
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
