import { Suspense } from "react";
import type { Metadata } from "next";
import AccountOverview from "@/components/account/AccountOverview";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = { title: "My Sanctuary" };
export default function AccountPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AccountOverview />
    </Suspense>
  );
}
