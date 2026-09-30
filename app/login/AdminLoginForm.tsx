"use client";

import { useActionState, useState } from "react";
import { loginAdmin, type LoginAdminState } from "./actions";
import styles from "./LoginPage.module.css";

const initialLoginAdminState: LoginAdminState = {
  error: null,
  loginId: "",
  attempt: 0,
};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAdmin,
    initialLoginAdminState,
  );
  const [loginId, setLoginId] = useState("");

  return (
    <form className={styles.form} action={formAction}>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error === "locked" ? (
            <>
              로그인 시도 횟수를 초과했습니다.
              <br />
              관리자에게 잠금 해제를 요청해 주세요.
            </>
          ) : (
            "아이디 또는 비밀번호를 확인해 주세요."
          )}
        </p>
      ) : null}

      <label>
        <span>아이디</span>
        <input
          name="loginId"
          type="text"
          autoComplete="username"
          placeholder="아이디"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          required
        />
      </label>
      <label>
        <span>비밀번호</span>
        <input
          key={state.attempt}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          required
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
