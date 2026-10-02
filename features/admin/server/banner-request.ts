import type { BannerInput } from "@/features/admin/server/banner-management.repository";

export async function parseBannerFormData(request: Request): Promise<BannerInput> {
  const form = await request.formData();
  const imageEntry = form.get("image");
  const mobileImageEntry = form.get("mobileImage");
  let image: BannerInput["image"];
  let mobileImage: BannerInput["mobileImage"];

  if (imageEntry instanceof File && imageEntry.size > 0) {
    image = {
      data: Buffer.from(await imageEntry.arrayBuffer()),
      filename: imageEntry.name,
      mimeType: imageEntry.type,
    };
  }
  if (mobileImageEntry instanceof File && mobileImageEntry.size > 0) {
    mobileImage = {
      data: Buffer.from(await mobileImageEntry.arrayBuffer()),
      filename: mobileImageEntry.name,
      mimeType: mobileImageEntry.type,
    };
  }

  return {
    placement: String(form.get("placement") || ""),
    name: String(form.get("name") || ""),
    targetUrl: String(form.get("targetUrl") || ""),
    status: String(form.get("status") || "draft"),
    sortOrder: Number(form.get("sortOrder") || 0),
    startsAt: String(form.get("startsAt") || ""),
    endsAt: String(form.get("endsAt") || ""),
    image,
    removeImage: form.get("removeImage") === "true",
    mobileImage,
    removeMobileImage: form.get("removeMobileImage") === "true",
  };
}
