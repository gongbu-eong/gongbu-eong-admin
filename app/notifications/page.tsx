import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { NotificationManagementPage } from "@/features/admin/components/notifications/NotificationManagementPage";
import { getNotificationRecipientData } from "@/features/admin/server/notification-management.repository";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function NotificationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getNotificationRecipientData({
    page: Number(params?.page || 1),
    keyword: params?.keyword || "",
    age: params?.age || "all",
    eligibility: params?.eligibility || "all",
  });

  return (
    <AdminLayout
      activeNav="notifications"
      title="알림 발송 관리"
      description="수신 동의 회원을 선택해 연령대별 카카오 알림톡을 발송합니다."
      stickyHeader
    >
      <NotificationManagementPage data={data} />
    </AdminLayout>
  );
}
