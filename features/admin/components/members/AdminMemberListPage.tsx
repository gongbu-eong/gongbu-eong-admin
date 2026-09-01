import Image from "next/image";
import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import {
  MemberChannelFilter,
  MemberListQuery,
  MemberStatusFilter,
  getMemberListData,
} from "@/features/admin/server/members.repository";
import styles from "./AdminMemberListPage.module.css";

const statusFilters: Array<{ label: string; value: MemberStatusFilter }> = [
  { label: "전체", value: "all" },
  { label: "활동중", value: "active" },
  { label: "유료", value: "paid" },
  { label: "정지", value: "blocked" },
  { label: "메모 있음", value: "memo" },
];

const channelFilters: Array<{ label: string; value: MemberChannelFilter }> = [
  { label: "유입 채널 전체", value: "all" },
  { label: "인스타그램", value: "instagram" },
  { label: "블로그", value: "blog" },
  { label: "스레드", value: "threads" },
  { label: "검색", value: "search" },
  { label: "직접유입", value: "direct" },
];

type AdminMemberListPageProps = {
  filters?: MemberListQuery;
};

function createQuery(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "" || value === "all") {
      continue;
    }

    query.set(key, String(value));
  }

  const queryString = query.toString();

  return queryString ? `/members?${queryString}` : "/members";
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function badgeClass(label: string) {
  if (label === "유료") return styles.paidBadge;
  if (label === "정지") return styles.blockedBadge;
  return styles.statusBadge;
}

export async function AdminMemberListPage({ filters }: AdminMemberListPageProps) {
  const data = await getMemberListData(filters);
  const selected = data.selectedMember;

  return (
    <AdminLayout
      activeNav="members"
      title="회원 관리"
      description="회원을 클릭하면 회원 정보 상세 페이지로 이동해요."
    >
      <section className={styles.page} aria-label="회원 관리">
        <section className={styles.metrics} aria-label="회원 주요 지표">
          {data.metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.label}>
              <h2>{metric.label}</h2>
              <p className={styles.metricValue}>
                <strong>{metric.value}</strong>
                <span>{metric.unit}</span>
              </p>
              <p className={styles.metricNote}>{metric.note}</p>
            </article>
          ))}
        </section>

        <section className={styles.listCard}>
          <h2>회원 정보</h2>
          <form className={styles.filters} action="/members">
            <label className={styles.searchBox}>
              <span aria-hidden="true" />
              <input
                name="keyword"
                placeholder="닉네임 · 이메일로 검색"
                defaultValue={data.keyword}
              />
            </label>
            <input name="page" type="hidden" value="1" />
            <div className={styles.segmented}>
              {statusFilters.map((filter) => (
                <Link
                  className={filter.value === data.status ? styles.activeSegment : ""}
                  href={createQuery({
                    keyword: data.keyword,
                    status: filter.value,
                    channel: data.channel,
                  })}
                  key={filter.value}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <label className={styles.channelSelect}>
              <select name="channel" defaultValue={data.channel}>
                {channelFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </label>
            <button className={styles.submitButton} type="submit">
              검색
            </button>
          </form>

          <div className={styles.table} role="table">
            <div className={styles.tableHeader} role="row">
              <span>회원</span>
              <span>성별 · 연령</span>
              <span>유입 경로</span>
              <span>{selected ? "남은쿠폰" : "진단"}</span>
              <span>{selected ? "구매내역" : "구매"}</span>
              <span>상태</span>
              <span>가입일</span>
              <span />
            </div>
            {data.members.length > 0 ? (
              data.members.map((member) => (
                <Link
                  className={`${styles.tableRow} ${
                    selected?.id === member.id ? styles.selectedRow : ""
                  }`}
                  href={createQuery({
                    keyword: data.keyword,
                    status: data.status,
                    channel: data.channel,
                    page: data.page,
                    selectedId: member.id,
                  })}
                  key={member.id}
                  role="row"
                >
                  <span className={styles.memberCell}>
                    <span
                      className={styles.listAvatar}
                      style={{ backgroundColor: member.backgroundColor }}
                    >
                      <Image
                        src={member.avatarSrc}
                        width={48}
                        height={48}
                        alt=""
                        unoptimized
                      />
                    </span>
                    <span>
                      <strong>{member.name}</strong>
                      <em>{member.maskedEmail}</em>
                    </span>
                  </span>
                  <span>
                    {member.gender} · {member.ageGroup}
                  </span>
                  <span>
                    {member.source} · {member.campaign}
                  </span>
                  <span>
                    {selected
                      ? `${member.remainingCredits.toLocaleString("ko-KR")}개`
                      : `${member.diagnosisCount.toLocaleString("ko-KR")}회`}
                  </span>
                  <span>
                    <i className={styles.paidBadge}>{member.paidLabel}</i>
                  </span>
                  <span>
                    <i className={badgeClass(member.statusLabel)}>
                      {member.statusLabel}
                    </i>
                  </span>
                  <span>{member.joinedAtShort}</span>
                  <span className={styles.arrow}>&gt;</span>
                </Link>
              ))
            ) : (
              <div className={styles.emptyRow}>표시할 회원 데이터가 없습니다.</div>
            )}
          </div>

          <nav className={styles.pagination} aria-label="회원 목록 페이지">
            <Link
              className={data.page <= 1 ? styles.disabledPage : ""}
              href={createQuery({
                keyword: data.keyword,
                status: data.status,
                channel: data.channel,
                page: Math.max(1, data.page - 1),
              })}
            >
              &lt;
            </Link>
            {Array.from({ length: Math.min(data.totalPages, 8) }, (_, index) => index + 1).map(
              (page) => (
                <Link
                  className={page === data.page ? styles.activePage : ""}
                  href={createQuery({
                    keyword: data.keyword,
                    status: data.status,
                    channel: data.channel,
                    page,
                  })}
                  key={page}
                >
                  {page}
                </Link>
              ),
            )}
            <Link
              className={data.page >= data.totalPages ? styles.disabledPage : ""}
              href={createQuery({
                keyword: data.keyword,
                status: data.status,
                channel: data.channel,
                page: Math.min(data.totalPages, data.page + 1),
              })}
            >
              &gt;
            </Link>
          </nav>
        </section>

        {selected ? (
          <aside className={styles.previewCard} aria-label="선택 회원 요약">
            <div className={styles.previewProfile}>
              <span
                className={styles.previewAvatar}
                style={{ backgroundColor: selected.backgroundColor }}
              >
                <Image
                  src={selected.avatarSrc}
                  width={64}
                  height={64}
                  alt=""
                  unoptimized
                />
              </span>
              <strong>{selected.name}</strong>
              <span className={styles.previewBadges}>
                <i className={styles.paidBadge}>{selected.paidLabel}</i>
                <i className={badgeClass(selected.statusLabel)}>
                  {selected.statusLabel}
                </i>
              </span>
            </div>
            <div className={styles.divider} />
            <PreviewSection
              title={`${selected.provider} 제공 정보`}
              rows={[
                ["닉네임", selected.name],
                ["이메일", selected.maskedEmail],
                ["성별", selected.gender],
                ["연령대", selected.ageGroup],
              ]}
            />
            <PreviewSection
              title="유입 정보"
              rows={[
                ["가입일", selected.joinedAtShort],
                ["유입 경로", `${selected.source} · ${selected.campaign}`],
                ["마지막 로그인", selected.lastLoginAt],
              ]}
            />
            <PreviewSection
              title="쿠폰·구매"
              rows={[
                ["남은 쿠폰", `${selected.remainingCredits.toLocaleString("ko-KR")}개`],
                ["총 구매 횟수", `${selected.purchaseCount.toLocaleString("ko-KR")}회`],
                ["총 결제 금액", formatWon(selected.paymentTotal)],
              ]}
            />
            <PreviewSection
              title="활동 요약"
              rows={[
                ["진단 이력", `${selected.diagnosisCount.toLocaleString("ko-KR")}회`],
                ["자소서 코칭", `${selected.resumeCoachingCount.toLocaleString("ko-KR")}회`],
              ]}
            />
            <PreviewSection
              title="커뮤니티 활동"
              rows={[
                ["작성한 글", `${selected.postCount.toLocaleString("ko-KR")}개`],
                ["작성한 댓글", `${selected.commentCount.toLocaleString("ko-KR")}개`],
              ]}
            />
            <Link className={styles.detailButton} href={`/members/${selected.id}`}>
              상세 정보 보기 →
            </Link>
          </aside>
        ) : (
          <aside className={styles.selectHintCard} aria-label="회원 선택 안내">
            <div>
              <strong>←</strong>
              <p>
                회원을 선택하면
                <br />
                상세 정보가 여기에 표시돼요
              </p>
            </div>
          </aside>
        )}
      </section>
    </AdminLayout>
  );
}

function PreviewSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className={styles.previewSection}>
      <h3>{title}</h3>
      {rows.map(([label, value]) => (
        <p key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </p>
      ))}
    </section>
  );
}
