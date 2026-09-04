import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { loginAdmin } from "./actions";
import styles from "./LoginPage.module.css";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAdminSession();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;

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
        <form className={styles.form} action={loginAdmin}>
          {params.error === "invalid" ? (
            <p className={styles.error} role="alert">
              아이디 또는 비밀번호를 확인해 주세요.
            </p>
          ) : null}
          <label>
            <span>아이디</span>
            <input
              name="loginId"
              type="text"
              autoComplete="username"
              placeholder="아이디"
              required
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              required
            />
          </label>
          <button type="submit">로그인</button>
        </form>
      </section>
    </main>
  );
}
