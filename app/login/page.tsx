import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { AdminLoginForm } from "./AdminLoginForm";
import styles from "./LoginPage.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="admin-login-title">
        <div className={styles.brand}>
          <Image
            src="/admin-assets/main-logo.png"
            width={118}
            height={52}
            alt="공부엉이"
            priority
            unoptimized
          />
          <span>관리자</span>
        </div>
        <AdminLoginForm />
      </section>
    </main>
  );
}
