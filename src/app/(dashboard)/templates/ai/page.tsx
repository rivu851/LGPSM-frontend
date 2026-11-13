"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import AiTemplateStudio from "@/components/templates/AiTemplateStudio";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

// Organizers and admins design a template from a description; it becomes a normal template they can use for events.
function AiTemplateContent() {
  const edit = useSearchParams().get("edit");
  return <AiTemplateStudio editTemplateId={edit && /^[0-9a-fA-F]{24}$/.test(edit) ? edit : undefined} />;
}

export default function AiTemplatePage() {
  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader
        title="Design with AI"
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
        actions={<Link href="/templates" className="hidden sm:inline-block text-sm text-gray-700 hover:text-[#A83800] mr-2">All templates</Link>}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
        {/* "Design with AI" is switched off for now: the studio below is commented out, uncomment it (and remove the notice) to bring it back
        <Suspense fallback={<SkeletonRegion label="Loading" className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40" /><Skeleton className="h-12 w-40" /></SkeletonRegion>}>
          <AiTemplateContent />
        </Suspense>
        */}
        <div role="status" className="max-w-xl rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Design with AI is temporarily unavailable.</p>
          <p className="mt-1">Please choose one of the existing templates for now.</p>
          <Link href="/templates" className="mt-3 inline-block text-[#C44200] underline">Go to templates</Link>
        </div>
      </div>
    </div>
  );
}
