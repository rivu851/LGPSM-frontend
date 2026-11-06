import React from "react";
import UserNavDropdown from "./UserNavDropdown";
import NotificationBell from "./NotificationBell";

// Figma page header (222:34642): white bar, 1px #E5E5E5 bottom border, 24px x 16px padding, 68px tall,
// 20px medium black title and no leading icon on any Admin or Organiser frame. `icon` is still accepted
// so existing callers compile, but it is not drawn.
export default function PageHeader({ title, actions }: { title: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E5E5E5] px-4 sm:px-6 py-4 flex items-center gap-2.5 min-h-[68px]">
      <h1 className="flex-1 min-w-0 truncate text-sm sm:text-xl font-medium text-black">{title}</h1>
      {actions}
      <NotificationBell />
      <UserNavDropdown />
    </header>
  );
}
