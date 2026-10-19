import { Suspense } from "react";
import type { Metadata } from "next";
import AccountOverview from "@/components/account/AccountOverview";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = {
  title: "My Sanctuary",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AccountOverview />
    </Suspense>
  );
}
