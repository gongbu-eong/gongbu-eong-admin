import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import styles from "./AdminLayout.module.css";

type AdminLayoutProps = {
  title: string;
  description: string;
  activeNav: string;
  activeSubNav?: string;
  children: React.ReactNode;
};

export function AdminLayout({
  title,
  description,
  activeNav,
  activeSubNav,
  children,
}: AdminLayoutProps) {
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
