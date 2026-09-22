import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import styles from "./AdminLayout.module.css";

type AdminLayoutProps = {
  title: string;
  description: string;
  activeNav: string;
  activeSubNav?: string;
  headerActions?: React.ReactNode;
  stickyHeader?: boolean;
  children: React.ReactNode;
};

export async function AdminLayout({
  title,
  description,
  activeNav,
  activeSubNav,
  headerActions,
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
          } ${headerActions ? styles.headerWithActions : ""}`}
        >
          <div className={styles.headerText}>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {headerActions ? (
            <div className={styles.headerActions}>{headerActions}</div>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
