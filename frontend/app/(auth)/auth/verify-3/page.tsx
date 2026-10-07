import VerifySuccessPage from "@/components/auth/verify/VerifySuccessPage";
import { Suspense } from "react";

export default function Verify3Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifySuccessPage />
    </Suspense>
  );
}
