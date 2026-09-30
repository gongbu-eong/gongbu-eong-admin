import type { BannerInput } from "@/features/admin/server/banner-management.repository";

export async function parseBannerFormData(request: Request): Promise<BannerInput> {
  const form = await request.formData();
  const imageEntry = form.get("image");
  let image: BannerInput["image"];

  if (imageEntry instanceof File && imageEntry.size > 0) {
    image = {
      data: Buffer.from(await imageEntry.arrayBuffer()),
      filename: imageEntry.name,
      mimeType: imageEntry.type,
    };
  }

  return {
    placement: String(form.get("placement") || ""),
    name: String(form.get("name") || ""),
    contentMarkup: String(form.get("contentMarkup") || ""),
    targetUrl: String(form.get("targetUrl") || ""),
    status: String(form.get("status") || "draft"),
    sortOrder: Number(form.get("sortOrder") || 0),
    image,
    removeImage: form.get("removeImage") === "true",
  };
}
