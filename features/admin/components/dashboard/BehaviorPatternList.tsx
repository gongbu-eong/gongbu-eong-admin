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
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>공고 상세 방문 후 행동 상세</h2>
          <p>
            {periodLabel} 기준 · 공고 상세 방문자별 후속 행동 방문자 / 지원 클릭 / 재방문자
          </p>
        </div>
      </header>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>유입 경로</span>
          <span>방문자</span>
          <span>후속 행동 방문자</span>
          <span>다른 페이지</span>
          <span>지원</span>
          <span>재방문자</span>
        </div>
        {items.map((item) => (
          <div className={styles.tableRow} key={item.key}>
            <span className={styles.channelCell}>
              <strong>{item.channelLabel}</strong>
              <i>
                <b style={{ width: `${item.fill}%` }} />
              </i>
            </span>
            <strong>{item.visitors}</strong>
            <span>
              <b>{item.activity}</b>
              <em>{item.activityRate}</em>
            </span>
            <span>
              <b>{item.pageMove}</b>
              <em>{item.pageMoveRate}</em>
            </span>
            <span>
              <b>{item.apply}</b>
              <em>{item.applyRate}</em>
            </span>
            <span>
              <b>{item.revisit}</b>
              <em>{item.revisitRate}</em>
            </span>
          </div>
        ))}
      </div>
      {!items.length ? (
        <div className={styles.empty}>공고 상세 유입 기록이 없습니다.</div>
      ) : null}
      <div className={styles.legend}>
        <span>후속 행동 방문자: 공고 상세 이후 30분 내 다른 페이지 이동 또는 지원 클릭이 발생한 방문자</span>
        <span>다른 페이지: 공고 상세 외 화면으로 이동한 횟수</span>
        <span>지원: 공고 상세 방문 이후 지원 버튼 클릭 횟수</span>
        <span>재방문자: 동일 식별자가 30분 세션 경계를 넘어 공고 상세 방문 후 30일 이내 다시 방문한 경우</span>
      </div>
    </section>
  );
}
