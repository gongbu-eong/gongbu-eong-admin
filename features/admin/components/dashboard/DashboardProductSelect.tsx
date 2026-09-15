"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AdminSelect } from "@/features/admin/components/common/AdminSelect";
import type { DashboardProductOption } from "@/features/admin/data/dashboard";

type DashboardProductSelectProps = {
  options: DashboardProductOption[];
  selectedProduct: string;
  className?: string;
};

export function DashboardProductSelect({
  options,
  selectedProduct,
  className = "",
}: DashboardProductSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const changeProduct = (nextProduct: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextProduct === "diagnosis") {
      params.delete("product");
    } else {
      params.set("product", nextProduct);
    }

    const query = params.toString();
    router.push(query ? `/?${query}` : "/", { scroll: false });
  };

  return (
    <label className={className}>
      <span>분석 대상</span>
      <AdminSelect
        aria-label="대시보드 분석 대상"
        value={selectedProduct}
        onChange={(event) => changeProduct(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </AdminSelect>
    </label>
  );
}
