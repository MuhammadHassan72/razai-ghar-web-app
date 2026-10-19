import { Suspense } from "react";
import type { Metadata } from "next";
import AuthScreen from "@/components/account/AuthScreen";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = {
  title: "reset password",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthScreen mode="reset-password" />
    </Suspense>
  );
}
