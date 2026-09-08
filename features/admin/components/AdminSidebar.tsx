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
      <Link className={styles.logo} href="/" aria-label="공부엉이 관리자 홈">
        <Image
          src="/admin-assets/main-logo.png"
          width={59}
          height={26}
          alt="공부엉이"
          priority
          unoptimized
        />
      </Link>
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
      <form className={styles.logoutForm} action="/logout" method="post">
        <button type="submit">로그아웃</button>
      </form>
    </aside>
  );
}
