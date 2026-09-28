import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./MemberCoachingResultShell.module.css";

export function MemberCoachingResultShell({ userId, tab, children }: {
  userId: string;
  tab: "diagnosis" | "resume-coaching" | "interview-coaching";
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.toolbar}>
        <Link href={`/members/${userId}?tab=${tab}`} aria-label="회원 정보 상세의 결과 목록으로 돌아가기" title="결과 목록으로 돌아가기">
          <span aria-hidden="true">&#8592;</span> 회원 정보 상세
        </Link>
        <span>관리자 결과 열람</span>
      </header>
      <div className={styles.surface}>{children}</div>
    </div>
  );
}
