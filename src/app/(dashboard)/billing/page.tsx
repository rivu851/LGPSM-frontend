"use client";

import React from "react";
import PageHeader from "@/components/common/PageHeader";

// Organizer billing. Online payments are not integrated yet, so this page deliberately shows no
// balances, invoices or transactions instead of inventing them.
export default function BillingPage() {
  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Billing" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
        <section className="border border-[#E0E0E0] rounded-lg p-6 sm:p-8 text-center bg-[#FAFAFA]">
          <div className="mx-auto mb-4 size-12 rounded-full bg-[#FFE3D7] text-[#FF651D] flex items-center justify-center">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900">Payment integration not yet available</h2>
          <p className="mt-2 text-sm text-[#4B4F52] max-w-xl mx-auto">
            Online billing and payments for LGPSM are still being set up. No charges, invoices or balances are recorded for your
            account yet. Once payments go live, your invoices and payment history will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
