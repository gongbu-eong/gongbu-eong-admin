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
          <span>지원 클릭</span>
          <span>재방문자</span>
        </div>
        {items.map((item) => (
          <div className={styles.tableRow} key={item.key}>
            <span className={styles.channelCell}>
              <strong>{item.channelLabel}</strong>
            </span>
            <strong>{item.visitors}</strong>
            <span>
              <b>{item.activity}</b>
              <em>{item.activityRate}</em>
              <em>페이지 이동 {item.pageMove}</em>
            </span>
            <span>
              <b>{item.apply}</b>
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
        <span>방문자·후속 행동 방문자·재방문자는 브라우저 익명 ID 기준 일별 중복 제거 후 합산합니다. 각 항목은 서로 겹칠 수 있습니다.</span>
        <span>후속 행동 방문자: 공고 상세 이후 같은 세션에서 페이지 재방문·이동 또는 클릭·진단·코칭을 진행한 방문자. 페이지 이동은 실제 방문 횟수입니다.</span>
        <span>지원 클릭: 클릭 발생일 기준 실제 지원·이메일 지원 횟수. 방문 기록과 연결되지 않는 클릭도 제외하지 않으며, 유입 경로가 없으면 식별 불가로 표시합니다.</span>
        <span>재방문자: 30분 이상 활동이 없어 새 세션이 시작될 때, 같은 브라우저 익명 ID의 이전 방문이 지난 30일 안에 있는 공고 상세 방문자입니다. 방문 이후 30일 동안 돌아올 사람을 뜻하지 않습니다.</span>
      </div>
    </section>
  );
}
