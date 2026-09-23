import type { ReactNode } from "react";
import type { ActivityLogRow } from "@/features/admin/server/activity-log.repository";
import styles from "@/features/admin/components/traffic/TrafficLogsPage.module.css";

type ActivityLogTableProps = {
  rows: ActivityLogRow[];
  emptyMessage: string;
  renderIp?: (row: ActivityLogRow) => ReactNode;
  renderIdentity?: (row: ActivityLogRow) => ReactNode;
};

export function ActivityLogTable({ rows, emptyMessage, renderIp, renderIdentity }: ActivityLogTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>접속일시</th><th>주체</th><th>식별 정보</th><th>IP</th>
            <th>기기</th><th>유입 경로</th><th>화면</th><th>대상</th><th>상세</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id}>
              <td data-label="접속일시">{row.eventAt}</td>
              <td data-label="주체"><span className={styles.userCell}><strong>{row.userName}</strong><em>{row.userEmail || "비회원"}</em></span></td>
              <td data-label="식별 정보" className={styles.pathCell} title={row.identity}>{renderIdentity ? renderIdentity(row) : row.identity}</td>
              <td data-label="IP">{renderIp ? renderIp(row) : row.ipAddress}</td>
              <td data-label="기기"><span className={`${styles.deviceBadge} ${row.device === "모바일" ? styles.deviceMobile : row.device === "웹" ? styles.deviceWeb : styles.deviceUnknown}`}>{row.device}</span></td>
              <td data-label="유입 경로">{row.channel}</td>
              <td data-label="화면">{row.screen}</td>
              <td data-label="대상" className={styles.pathCell} title={row.path}>{row.path}</td>
              <td data-label="상세" className={styles.pathCell} title={row.detail}>{row.detail}</td>
            </tr>
          )) : <tr><td className={styles.emptyCell} colSpan={9}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
