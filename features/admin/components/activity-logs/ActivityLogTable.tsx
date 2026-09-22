import type { ReactNode } from "react";
import type { ActivityLogRow } from "@/features/admin/server/activity-log.repository";
import styles from "@/features/admin/components/traffic/TrafficLogsPage.module.css";

type ActivityLogTableProps = {
  rows: ActivityLogRow[];
  emptyMessage: string;
  renderIp?: (row: ActivityLogRow) => ReactNode;
};

export function ActivityLogTable({ rows, emptyMessage, renderIp }: ActivityLogTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>접속일시</th><th>이벤트</th><th>주체</th><th>식별 정보</th><th>IP</th>
            <th>기기</th><th>유입 경로</th><th>화면</th><th>대상</th><th>상세</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id}>
              <td>{row.eventAt}</td>
              <td>{row.event}</td>
              <td><span className={styles.userCell}><strong>{row.userName}</strong><em>{row.userEmail || "비회원"}</em></span></td>
              <td className={styles.pathCell} title={row.identity}>{row.identity}</td>
              <td>{renderIp ? renderIp(row) : row.ipAddress}</td>
              <td><span className={`${styles.deviceBadge} ${row.device === "모바일" ? styles.deviceMobile : row.device === "웹" ? styles.deviceWeb : styles.deviceUnknown}`}>{row.device}</span></td>
              <td>{row.channel}</td>
              <td>{row.screen}</td>
              <td className={styles.pathCell} title={row.path}>{row.path}</td>
              <td className={styles.pathCell} title={row.detail}>{row.detail}</td>
            </tr>
          )) : <tr><td className={styles.emptyCell} colSpan={10}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
