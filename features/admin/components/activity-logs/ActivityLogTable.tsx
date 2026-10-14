import type { ReactNode } from "react";
import type { ActivityLogRow } from "@/features/admin/server/activity-log.repository";
import { maskEmail, maskPersonalText } from "@/features/admin/privacy-mask";
import styles from "@/features/admin/components/traffic/TrafficLogsPage.module.css";

type ActivityLogTableProps = {
  rows: ActivityLogRow[];
  emptyMessage: string;
  renderIp?: (row: ActivityLogRow, displayIp: string) => ReactNode;
  renderIdentity?: (row: ActivityLogRow, displayIdentity: string) => ReactNode;
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
          {rows.length ? rows.map((row) => {
            const displayIdentity = row.identity;
            const displayIp = row.ipAddress;
            const maskedPath = maskPersonalText(row.path);
            const maskedDetail = maskPersonalText(row.detail);

            return (
            <tr key={row.id}>
              <td data-label="접속일시">{row.eventAt}</td>
              <td data-label="주체"><span className={styles.userCell}><strong>{row.userName}</strong><em>{row.userEmail ? maskEmail(row.userEmail) : (row.userId ? "이메일 없음" : "비회원")}</em></span></td>
              <td data-label="식별 정보" className={styles.pathCell} title={displayIdentity}>{renderIdentity ? renderIdentity(row, displayIdentity) : displayIdentity}</td>
              <td data-label="IP">{renderIp ? renderIp(row, displayIp) : displayIp}</td>
              <td data-label="기기"><span className={`${styles.deviceBadge} ${row.device === "모바일" ? styles.deviceMobile : row.device === "웹" ? styles.deviceWeb : styles.deviceUnknown}`}>{row.device}</span></td>
              <td data-label="유입 경로">{row.channel}</td>
              <td data-label="화면">{row.screen}</td>
              <td data-label="대상" className={styles.pathCell} title={maskedPath}>{maskedPath}</td>
              <td data-label="상세" className={styles.pathCell} title={maskedDetail}>{maskedDetail}</td>
            </tr>
            );
          }) : <tr><td className={styles.emptyCell} colSpan={9}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
