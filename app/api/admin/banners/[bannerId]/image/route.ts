import { getAdminSession } from "@/features/admin/server/auth.repository";
import { getManagedBannerImage } from "@/features/admin/server/banner-management.repository";

export const runtime = "nodejs";

type Context = { params: Promise<{ bannerId: string }> };

export async function GET(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return new Response("Unauthorized", { status: 401 });
  const { bannerId } = await params;
  const variant = new URL(request.url).searchParams.get("variant") === "mobile" ? "mobile" : "desktop";
  const image = await getManagedBannerImage(bannerId, variant);
  if (!image?.image_data || !image.image_mime_type) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.image_data), {
    headers: {
      "Content-Type": image.image_mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(image.image_filename || "banner")}`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
