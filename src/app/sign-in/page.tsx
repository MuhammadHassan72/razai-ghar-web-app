import { Suspense } from "react";
import type { Metadata } from "next";
import AuthScreen from "@/components/account/AuthScreen";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = {
  title: "sign in",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthScreen mode="sign-in" />
    </Suspense>
  );
}
