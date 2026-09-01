import Image from "next/image";
import Link from "next/link";
import { navItems } from "@/features/admin/data/dashboard";
import styles from "./AdminLayout.module.css";

type AdminSidebarProps = {
  activeNav: string;
  activeSubNav?: string;
};

export function AdminSidebar({ activeNav, activeSubNav }: AdminSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo} aria-label="공부엉이 관리자">
        <span>공</span>
        부엉이
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = item.key === activeNav;

          return (
            <div className={styles.navGroup} key={item.label}>
              <Link
                className={`${styles.navItem} ${
                  isActive && !item.children ? styles.navItemActive : ""
                } ${isActive && item.children ? styles.navItemExpanded : ""}`}
                href={item.href}
              >
                <span className={styles.navIcon}>
                  <Image src={item.icon} width={18} height={18} alt="" />
                </span>
                <span>{item.label}</span>
                {item.expandable ? <span className={styles.navArrow}>▾</span> : null}
              </Link>
              {isActive && item.children ? (
                <div className={styles.subNav}>
                  {item.children.map((child) => (
                    <Link
                      className={`${styles.subNavItem} ${
                        child.key === activeSubNav ? styles.subNavItemActive : ""
                      }`}
                      href={child.href}
                      key={child.key}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
