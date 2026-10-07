import VerifyOwnershipPage from "@/components/auth/verify/VerifyOwnershipPage";

import { Suspense } from "react";

export default function Verify2Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOwnershipPage />
    </Suspense>
  );
}