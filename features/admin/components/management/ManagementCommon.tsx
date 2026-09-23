import Link from "next/link";
import styles from "./Management.module.css";

export function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: number; note: string }> }) {
  return (
    <section className={styles.metrics} aria-label="주요 지표">
      {metrics.map((metric) => (
        <article className={styles.metric} key={metric.label}>
          <p className={styles.metricLabel}>{metric.label}</p>
          <p className={styles.metricValue}>{metric.value.toLocaleString("ko-KR")}</p>
          <p className={styles.metricNote}>{metric.note}</p>
        </article>
      ))}
    </section>
  );
}

export function StatusBadge({ tone = "default", children }: { tone?: "default" | "success" | "warning" | "danger" | "muted" | "blue"; children: React.ReactNode }) {
  const className = {
    default: styles.badge,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    muted: styles.badgeMuted,
    blue: styles.badgeBlue,
  }[tone];
  return <span className={className}>{children}</span>;
}

export function ManagementPagination({ page, totalPages, createHref }: { page: number; totalPages: number; createHref: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return (
    <nav className={styles.pagination} aria-label="페이지 이동">
      <Link className={`${styles.pageLink} ${page <= 1 ? styles.pageDisabled : ""}`} href={createHref(Math.max(1, page - 1))} aria-label="이전 페이지">‹</Link>
      {pages.map((item) => (
        <Link className={`${styles.pageLink} ${item === page ? styles.pageActive : ""}`} href={createHref(item)} key={item}>{item}</Link>
      ))}
      <Link className={`${styles.pageLink} ${page >= totalPages ? styles.pageDisabled : ""}`} href={createHref(Math.min(totalPages, page + 1))} aria-label="다음 페이지">›</Link>
    </nav>
  );
}

export function formatAdminDate(value: string | null, includeTime = false) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(value));
}
