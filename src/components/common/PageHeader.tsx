import React from "react";
import UserNavDropdown from "./UserNavDropdown";

// Figma page header: white bar, 1px #E5E5E5 bottom border, 24px x 16px padding, 20px medium title.
export default function PageHeader({ title, icon, actions }: { title: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] px-4 sm:px-6 py-4 flex items-center gap-3 min-h-[64px]">
      {icon && <span className="shrink-0 text-[#FF5B22]">{icon}</span>}
      <h1 className="flex-1 min-w-0 truncate text-sm sm:text-xl font-medium text-black">{title}</h1>
      {actions}
      <UserNavDropdown />
    </header>
  );
}
