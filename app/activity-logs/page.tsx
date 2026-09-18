import { ActivityLogsPage } from "@/features/admin/components/activity-logs/ActivityLogsPage";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  return <ActivityLogsPage filters={await searchParams} />;
}
