import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import styles from "./AdminLayout.module.css";

type AdminLayoutProps = {
  title: string;
  description: string;
  activeNav: string;
  activeSubNav?: string;
  children: React.ReactNode;
};

export async function AdminLayout({
  title,
  description,
  activeNav,
  activeSubNav,
  children,
}: AdminLayoutProps) {
  await requireAdminSession();

  return (
    <div className={styles.shell}>
      <AdminSidebar activeNav={activeNav} activeSubNav={activeSubNav} />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </main>
    </div>
  );
}
