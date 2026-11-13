"use client";

import React from "react";

interface StepHeaderProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  maxUnlockedStep?: number;
}

export default function StepHeader({ currentStep, onStepClick, maxUnlockedStep }: StepHeaderProps) {
  const steps = [
    { num: 1, label: "Event Details" },
    { num: 2, label: "Settings" },
    { num: 3, label: "Sessions" },
  ];

  return (
    <div className="w-full bg-white border-b border-gray-200 px-6 pt-4 pb-0 font-sans sticky top-[68px] z-20">
      <div className="flex items-center gap-8 relative">
        {steps.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          const isLocked = maxUnlockedStep !== undefined && step.num > maxUnlockedStep;

          return (
            <button
              key={step.num}
              type="button"
              onClick={() => onStepClick(step.num)}
              title={isLocked ? "Complete required details on previous steps to unlock" : undefined}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative cursor-pointer ${
                isActive
                  ? "text-gray-900"
                  : isCompleted
                  ? "text-gray-700"
                  : isLocked
                  ? "text-gray-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {/* Checkmark or Circle Badge */}
              <div
                className={`size-[18px] rounded-full flex items-center justify-center shrink-0 text-white ${
                  isCompleted || isActive ? "bg-[#1A9242]" : "bg-[#A5A5A5]"
                }`}
              >
                {/* Figma 217:7725: every step carries a check badge, green once reached and grey before */}
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <span>{step.label}</span>

              {/* Active Orange Underline */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FF5B22] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
