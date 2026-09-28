import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import styles from "./AdminLayout.module.css";

type AdminLayoutProps = {
  title: string;
  description: string;
  activeNav: string;
  activeSubNav?: string;
  headerActions?: React.ReactNode;
  headerFilters?: React.ReactNode;
  stickyHeader?: boolean;
  children: React.ReactNode;
};

export async function AdminLayout({
  title,
  description,
  activeNav,
  activeSubNav,
  headerActions,
  headerFilters,
  stickyHeader = false,
  children,
}: AdminLayoutProps) {
  await requireAdminSession();

  return (
    <div className={styles.shell}>
      <AdminSidebar activeNav={activeNav} activeSubNav={activeSubNav} />
      <main className={styles.main}>
        <header
          className={`${styles.header} ${
            headerActions || stickyHeader ? styles.headerSticky : ""
          } ${headerActions ? styles.headerWithActions : ""} ${headerFilters ? styles.headerWithFilters : ""}`}
        >
          <div className={styles.headerText}>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {headerActions ? (
            <div className={styles.headerActions}>{headerActions}</div>
          ) : null}
          {headerFilters ? <div className={styles.headerFilters}>{headerFilters}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
