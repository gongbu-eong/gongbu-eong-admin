import { getAdminSession } from "@/features/admin/server/auth.repository";
import { getManagedBannerImage } from "@/features/admin/server/banner-management.repository";

export const runtime = "nodejs";

type Context = { params: Promise<{ bannerId: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { bannerId } = await params;
  const image = await getManagedBannerImage(bannerId);
  if (!image?.image_data || !image.image_mime_type) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.image_data), {
    headers: {
      "Content-Type": image.image_mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(image.image_filename || "banner")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
