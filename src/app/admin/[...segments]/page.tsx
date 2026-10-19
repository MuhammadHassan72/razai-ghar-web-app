import { Suspense } from "react";
import type { Metadata } from "next";
import AdminOverview from "@/components/admin/AdminOverview";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = {
  title: "Admin CMS · QA",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminOverview />
    </Suspense>
  );
}
