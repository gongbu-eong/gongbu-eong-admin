import styles from "./AdminTable.module.css";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
};

export function AdminPagination({ page, totalPages }: AdminPaginationProps) {
  return (
    <nav className={styles.pagination} aria-label="페이지네이션">
      <button type="button" disabled={page <= 1}>
        &lt;
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
        <button
          type="button"
          className={item === page ? styles.activePage : ""}
          key={item}
        >
          {item}
        </button>
      ))}
      <button type="button" disabled={page >= totalPages}>
        &gt;
      </button>
    </nav>
  );
}
