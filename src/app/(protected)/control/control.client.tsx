"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { ControlDashboard } from "@/components/control";
import type { Overview, QuickLog, Actions } from "@/components/control/types";

export default function ControlClient({
  canWrite,
  overview,
  quicklog,
  actions,
}: {
  canWrite: boolean;
  overview: Overview;
  quicklog: QuickLog;
  actions: Actions;
}) {
  const router = useRouter();
  
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="p-6">
      <ControlDashboard
        canWrite={canWrite}
        overview={overview}
        quicklog={quicklog}
        actions={actions}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
