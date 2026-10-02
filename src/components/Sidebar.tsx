"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SidebarFooter from "./sidebar/SidebarFooter";
import { getActiveItemFromPathname } from "./sidebar/sidebarUtils";
import { NavEntry, WebRole, navForRole } from "./sidebar/navConfig";
import NavIcon from "./sidebar/NavIcon";


function NavGroup({ entry, activeItem, onNavigate }: { entry: NavEntry; activeItem: string; onNavigate: () => void }) {
  const children = entry.children || [];
  const groupActive = children.some((c) => c.key === activeItem);
  const [open, setOpen] = useState(groupActive || entry.key === "event");
  const expanded = open || groupActive;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !(v || groupActive))}
        aria-expanded={expanded}
        className={`w-full flex items-center gap-2 py-2 text-base font-medium cursor-pointer transition-colors ${
          groupActive ? "text-[#FF651D]" : "text-[#DEE2E5] hover:text-white"
        }`}
      >
        <NavIcon name={entry.icon} />
        <span className="flex-1 text-left">{entry.label}</span>
        <NavIcon name="chevron" className={`size-6 transition-transform ${expanded ? "" : "-rotate-90"}`} />
      </button>
      {expanded && (
        <ul className="pl-6">
          {children.map((c) => {
            const active = c.key === activeItem;
            return (
              <li key={c.key}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center h-10 pl-2.5 border-l-[1.5px] text-sm font-medium transition-colors ${
                    active ? "border-[#FF651D] text-[#FF651D]" : "border-[#3A4045] text-white hover:text-[#FFB08A]"
                  }`}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NavList({ role, activeItem, onNavigate }: { role: WebRole; activeItem: string; onNavigate: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1.5">
      {navForRole(role).map((entry) =>
        entry.children ? (
          <NavGroup key={entry.key} entry={entry} activeItem={activeItem} onNavigate={onNavigate} />
        ) : (
          <Link
            key={entry.key}
            href={entry.href!}
            onClick={onNavigate}
            aria-current={activeItem === entry.key ? "page" : undefined}
            className={`flex items-center gap-2 py-2 text-base font-medium transition-colors ${
              activeItem === entry.key ? "text-[#FF651D]" : "text-[#DEE2E5] hover:text-white"
            }`}
          >
            <NavIcon name={entry.icon} />
            <span>{entry.label}</span>
          </Link>
        )
      )}
    </nav>
  );
}

function AddEventButton({ active, onNavigate }: { active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href="/events/add"
      onClick={onNavigate}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-base font-semibold text-white transition-colors ${
        active ? "bg-[#FF651D] hover:bg-[#E5520F]" : "bg-[#262A2D] hover:bg-[#30353A]"
      }`}
    >
      <NavIcon name="add" />
      Add Event
    </Link>
  );
}

function Logo() {
  return (
    <div className="flex justify-center">
      <Link href="/dashboard" className="inline-block">
        <Image src="/images/navbar/Nav_logo.webp" alt="LGPSM" width={202} height={67} priority className="h-[38px] w-auto object-contain" />
      </Link>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const activeItem = getActiveItemFromPathname(pathname);
  const role: WebRole = user?.role === "ADMIN" ? "ADMIN" : "ORGANIZER";
  const close = () => setIsMobileOpen(false);

  const navigation = (
    <div className="flex flex-col gap-6">
      <AddEventButton active={activeItem === "add-event"} onNavigate={close} />
      <NavList role={role} activeItem={activeItem} onNavigate={close} />
    </div>
  );
  const footer = <SidebarFooter activeItem={activeItem} onNavigate={close} />;

  return (
    <>
      {/* Mobile top bar (< md) */}
      <div className="flex md:hidden items-center justify-between bg-[#15191C] px-4 py-3 sticky top-0 z-30 shrink-0 w-full">
        <Logo />
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-[#DEE2E5] hover:text-white rounded-md cursor-pointer"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="fixed inset-0 bg-black/60" onClick={close} />
          <div className="relative w-[271px] max-w-[85vw] bg-[#15191C] h-full p-6 flex flex-col gap-8 justify-between overflow-y-auto overscroll-contain animate-drawer">
            <div className="flex items-center justify-between">
              <Logo />
              <button type="button" onClick={close} className="p-1 text-[#DEE2E5] hover:text-white cursor-pointer" aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {navigation}
            {footer}
          </div>
        </div>
      )}

      {/* Desktop sidebar (>= md) — Figma: 271px, #15191C, 24px padding */}
      <aside className="hidden md:flex w-[240px] lg:w-[271px] shrink-0 h-screen sticky top-0 bg-[#15191C] flex-col gap-8 justify-between p-6 overflow-y-auto overscroll-contain no-scrollbar select-none z-30">
        <div className="flex flex-col gap-8">
          <Logo />
          {navigation}
        </div>
        {footer}
      </aside>
    </>
  );
}
