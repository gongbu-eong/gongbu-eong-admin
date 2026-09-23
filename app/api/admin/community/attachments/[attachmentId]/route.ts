import { getAdminSession } from "@/features/admin/server/auth.repository";
import { getCommunityAttachment } from "@/features/admin/server/community-management.repository";

type Context = { params: Promise<{ attachmentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { attachmentId } = await params;
  const file = await getCommunityAttachment(attachmentId);
  if (!file) return new Response("Not found", { status: 404 });
  const match = file.file_data_url.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return new Response("Invalid attachment", { status: 422 });
  const bytes = Buffer.from(match[2], "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": file.mime_type || match[1] || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
