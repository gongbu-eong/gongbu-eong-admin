import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { BannerManagementPage } from "@/features/admin/components/banners/BannerManagementPage";
import {
  BANNER_PLACEMENTS,
  listManagedBanners,
} from "@/features/admin/server/banner-management.repository";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const banners = await listManagedBanners();
  return (
    <AdminLayout
      activeNav="banners"
      title="배너 관리"
      description="고정된 노출 위치별로 이미지, 내용 코드, 이동 URL을 관리합니다."
      stickyHeader
    >
      <BannerManagementPage placements={BANNER_PLACEMENTS} initialBanners={banners} />
    </AdminLayout>
  );
}
