"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./AdminMemberDetailPage.module.css";

type AdminMemberActionsProps = {
  userId: string;
  statusLabel: string;
};

export function AdminMemberActions({
  userId,
  statusLabel,
}: AdminMemberActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<
    "active" | "blocked" | "withdrawn" | null
  >(null);
  const isWithdrawn = statusLabel === "탈퇴";
  const isBlocked = statusLabel === "정지";

  const getDurationDays = (nextStatus: "blocked" | "withdrawn") => {
    const message =
      nextStatus === "blocked"
        ? "정지 기간(일)을 입력해 주세요."
        : "재가입 제한 기간(일)을 입력해 주세요. 예: 365, 364635";
    const value = window.prompt(message, nextStatus === "blocked" ? "7" : "365");

    if (value === null) return null;

    const days = Number(value.trim());
    if (!Number.isInteger(days) || days < 1 || days > 365000) {
      window.alert("기간은 1일부터 365000일 사이 숫자로 입력해 주세요.");
      return null;
    }

    return days;
  };

  const changeStatus = async (nextStatus: "active" | "blocked" | "withdrawn") => {
    const label =
      nextStatus === "active"
        ? "계정 복구"
        : nextStatus === "blocked"
          ? "계정정지"
          : "강제 탈퇴";
    const confirmed = window.confirm(`해당 계정을 "${label}" 시키시겠습니까?`);

    if (!confirmed) return;

    const days =
      nextStatus === "active" ? undefined : getDurationDays(nextStatus);
    if (nextStatus !== "active" && !days) return;

    setPendingAction(nextStatus);

    try {
      const response = await fetch(`/members/${userId}/status`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus, days }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message || "회원 상태 변경에 실패했습니다.");
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "회원 상태 변경에 실패했습니다.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className={styles.actions}>
      <button
        className={styles.pauseButton}
        type="button"
        disabled={isWithdrawn || pendingAction !== null}
        onClick={() => changeStatus(isBlocked ? "active" : "blocked")}
      >
        {pendingAction === "blocked" || (isBlocked && pendingAction === "active")
          ? "처리 중"
          : isBlocked
            ? "계정 복구"
            : "계정 정지"}
      </button>
      <button
        className={styles.withdrawButton}
        type="button"
        disabled={pendingAction !== null}
        onClick={() => changeStatus(isWithdrawn ? "active" : "withdrawn")}
      >
        {pendingAction === "withdrawn" || (isWithdrawn && pendingAction === "active")
          ? "처리 중"
          : isWithdrawn
            ? "계정 복구"
            : "강제 탈퇴"}
      </button>
    </div>
  );
}
