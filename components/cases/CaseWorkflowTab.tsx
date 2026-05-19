"use client";

import { useState } from "react";
import { WorkflowEngine } from "@/components/cases/WorkflowEngine";
import { CaseDeadlines } from "@/components/cases/CaseDeadlines";
import { AddDeadlineModalStandalone } from "@/components/cases/AddDeadlineModalStandalone";

interface Props {
  caseId: string;
  visaSubclass: string;
}

export function CaseWorkflowTab({ caseId, visaSubclass }: Props) {
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineKey, setDeadlineKey] = useState(0); // bump to re-fetch

  return (
    <div className="space-y-6">
      <WorkflowEngine caseId={caseId} visaSubclass={visaSubclass} />

      <CaseDeadlines
        key={deadlineKey}
        caseId={caseId}
        onAddDeadline={() => setDeadlineModalOpen(true)}
      />

      {deadlineModalOpen && (
        <AddDeadlineModalStandalone
          caseId={caseId}
          onClose={() => setDeadlineModalOpen(false)}
          onSuccess={() => {
            setDeadlineKey((k) => k + 1); // re-fetch deadlines list
          }}
        />
      )}
    </div>
  );
}
