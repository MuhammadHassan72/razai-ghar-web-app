import type { Metadata } from "next";
import { Suspense } from "react";
import PageLoading from "@/components/ui/PageLoading";
import AdminOverview from "@/components/admin/AdminOverview";
export const metadata: Metadata = { title: "Admin CMS · QA" };
export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminOverview />
    </Suspense>
  );
}
