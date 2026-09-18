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
            {periodLabel} 기준 · 방문자별 30분 내 후속 행동 / 30일 내 재방문
          </p>
        </div>
      </header>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>유입 경로</span>
          <span>방문자</span>
          <span>이탈</span>
          <span>30일 재방문</span>
          <span>찜</span>
          <span>지원</span>
          <span>다른 페이지</span>
          <span>확인불가</span>
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
              <b>{item.bounce}</b>
              <em>{item.bounceRate}</em>
            </span>
            <span>
              <b>{item.revisit}</b>
              <em>{item.revisitRate}</em>
            </span>
            <span>
              <b>{item.bookmark}</b>
              <em>{item.bookmarkRate}</em>
            </span>
            <span>
              <b>{item.apply}</b>
              <em>{item.applyRate}</em>
            </span>
            <span>
              <b>{item.pageMove}</b>
              <em>{item.pageMoveRate}</em>
            </span>
            <span>
              <b>{item.unknown}</b>
              <em>{item.unknownRate}</em>
            </span>
          </div>
        ))}
      </div>
      {!items.length ? (
        <div className={styles.empty}>공고 상세 유입 기록이 없습니다.</div>
      ) : null}
      <div className={styles.legend}>
        <span>이탈: 30분 내 다음 페이지/클릭 없음</span>
        <span>찜·지원: 버튼 클릭 횟수</span>
        <span>다른 페이지: 공고 상세 외 화면으로 이동</span>
        <span>확인불가: 이탈·다른 페이지로 분류되지 않은 후속 행동</span>
      </div>
    </section>
  );
}
