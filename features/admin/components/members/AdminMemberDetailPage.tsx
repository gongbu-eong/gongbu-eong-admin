import Image from "next/image";
import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import {
  MemberDetailTab,
  getMemberDetailData,
  normalizeMemberTab,
} from "@/features/admin/server/members.repository";
import { AdminMemberActions } from "./AdminMemberActions";
import styles from "./AdminMemberDetailPage.module.css";

const tabs: Array<{ label: string; value: MemberDetailTab }> = [
  { label: "개요", value: "overview" },
  { label: "구매 · 쿠폰", value: "purchases" },
  { label: "진단 이력", value: "diagnosis" },
  { label: "자소서 코칭", value: "resume-coaching" },
  { label: "커뮤니티", value: "community" },
  { label: "메모", value: "memo" },
  { label: "열람 로그", value: "logs" },
];

type AdminMemberDetailPageProps = {
  userId?: string | null;
  activeTab?: string | null;
};

function badgeClass(label: string) {
  if (label === "유료") return styles.paidBadge;
  if (label === "정지") return styles.blockedBadge;
  return styles.statusBadge;
}

export async function AdminMemberDetailPage({
  userId,
  activeTab,
}: AdminMemberDetailPageProps) {
  const data = await getMemberDetailData(userId);
  const tab = normalizeMemberTab(activeTab);
  const member = data.member;

  return (
    <AdminLayout
      activeNav="members"
      title="회원 정보 상세"
      description="회원의 정보 상세 페이지입니다."
    >
      {member ? (
        <>
          <section className={styles.profileCard}>
            <div
              className={styles.avatar}
              style={{ backgroundColor: member.backgroundColor }}
            >
              <Image
                src={member.avatarSrc}
                width={64}
                height={64}
                alt=""
                unoptimized
              />
            </div>
            <div className={styles.memberInfo}>
              <div className={styles.nameRow}>
                <strong>{member.name}</strong>
                <span className={styles.paidBadge}>{member.paidLabel}</span>
                <span className={badgeClass(member.statusLabel)}>
                  {member.statusLabel}
                </span>
                <span className={styles.providerBadge}>{member.provider}</span>
              </div>
              <p>
                {member.gender} · {member.ageGroup} · {member.source} ·{" "}
                {member.campaign} · 가입 {member.joinedAt}
              </p>
            </div>
            <AdminMemberActions
              userId={member.id}
              statusLabel={member.statusLabel}
            />
          </section>

          <nav className={styles.tabs} aria-label="회원 상세 탭">
            {tabs.map((item) => (
              <Link
                className={item.value === tab ? styles.activeTab : ""}
                href={
                  item.value === "overview"
                    ? `/members/${member.id}`
                    : `/members/${member.id}?tab=${item.value}`
                }
                key={item.value}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {tab === "overview" ? (
            <section className={styles.overviewCard}>
              <div className={styles.statGrid}>
                <StatItem
                  label="남은 쿠폰"
                  value={`${member.remainingCredits.toLocaleString("ko-KR")}개`}
                />
                <StatItem
                  label="구매 횟수"
                  value={`${member.purchaseCount.toLocaleString("ko-KR")}회`}
                />
                <StatItem
                  label="진단 이력"
                  value={`${member.diagnosisCount.toLocaleString("ko-KR")}회`}
                />
                <StatItem
                  label="커뮤니티 활동"
                  value={`${(member.postCount + member.commentCount).toLocaleString(
                    "ko-KR",
                  )}건`}
                />
              </div>
              <h2>기본 정보 ({member.provider} 제공)</h2>
              <div className={styles.infoGrid}>
                <InfoRow label="닉네임" value={member.name} />
                <InfoRow label="연령대" value={member.ageGroup} />
                <InfoRow label="이메일" value={member.maskedEmail} />
                <InfoRow label="유입 경로" value={`${member.source} · ${member.campaign}`} />
                <InfoRow label="성별" value={member.gender} />
                <InfoRow
                  label="상태"
                  value={`${member.statusLabel} / ${member.paidLabel}`}
                />
                {member.blockedUntil !== "-" ? (
                  <InfoRow label="정지 만료일" value={member.blockedUntil} />
                ) : null}
                {member.rejoinBlockedUntil !== "-" ? (
                  <InfoRow
                    label="재가입 제한일"
                    value={member.rejoinBlockedUntil}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {tab === "purchases" ? (
            <section className={styles.tableCard}>
              <div className={styles.statGridThree}>
                <StatItem
                  label="총 구매 횟수"
                  value={`${member.purchaseCount.toLocaleString("ko-KR")}회`}
                />
                <StatItem
                  label="총 결제 금액"
                  value={`${member.paymentTotal.toLocaleString("ko-KR")}원`}
                />
                <StatItem
                  label="현재 남은 쿠폰"
                  value={`${member.remainingCredits.toLocaleString("ko-KR")}개`}
                />
              </div>
              <h2>구매 내역</h2>
              <DataTable
                columns={["날짜", "상품", "수량", "금액", "지급 쿠폰"]}
                rows={data.purchases.map((item) => [
                  item.date,
                  item.product,
                  item.quantity,
                  item.amount,
                  item.credit,
                ])}
              />
            </section>
          ) : null}

          {tab === "diagnosis" ? (
            <section className={styles.tableCard}>
              <h2>진단 이력</h2>
              <DataTable
                columns={["날짜", "제목", "결과"]}
                rows={data.diagnosis.map((item) => [
                  item.date,
                  item.title,
                  item.result,
                ])}
              />
            </section>
          ) : null}

          {tab === "resume-coaching" ? (
            <section className={styles.tableCard}>
              <h2>자소서 코칭</h2>
              <DataTable
                columns={["날짜", "제목", "결과"]}
                rows={data.resumeCoachings.map((item) => [
                  item.date,
                  item.title,
                  item.result,
                ])}
              />
            </section>
          ) : null}

          {tab === "community" ? (
            <section className={styles.tableCard}>
              <h2>커뮤니티</h2>
              <DataTable
                columns={["날짜", "구분", "대상", "상태"]}
                rows={data.community.map((item) => [
                  item.date,
                  item.kind,
                  item.title,
                  item.status,
                ])}
              />
            </section>
          ) : null}

          {tab === "memo" ? (
            <section className={styles.tableCard}>
              <h2>메모</h2>
              {data.memoTableAvailable ? (
                <DataTable
                  columns={["관리자", "메모", "등록일"]}
                  rows={data.memos.map((item) => [
                    item.adminName,
                    item.memo,
                    item.createdAt,
                  ])}
                />
              ) : (
                <div className={styles.emptyState}>
                  메모 테이블 migration 적용 후 표시됩니다.
                </div>
              )}
            </section>
          ) : null}

          {tab === "logs" ? (
            <section className={styles.tableCard}>
              <h2>열람 로그</h2>
              <DataTable
                columns={["관리자", "구분", "대상", "시간"]}
                rows={data.logs.map((item) => [
                  item.actor,
                  item.kind,
                  item.target,
                  item.occurredAt,
                ])}
              />
            </section>
          ) : null}

          <Link className={styles.backLink} href="/members">
            회원 목록으로 →
          </Link>
        </>
      ) : (
        <section className={styles.emptyCard}>표시할 회원 데이터가 없습니다.</section>
      )}
    </AdminLayout>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.statItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>표시할 데이터가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className={styles.pagination}>
        <button type="button" disabled>
          &lt;
        </button>
        <button className={styles.currentPage} type="button">
          1
        </button>
        <button type="button" disabled>
          &gt;
        </button>
      </div>
    </>
  );
}
