"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SidebarFooter from "./sidebar/SidebarFooter";
import { getActiveItemFromPathname } from "./sidebar/sidebarUtils";
import { NavEntry, WebRole, navForRole } from "./sidebar/navConfig";
import NavIcon from "./sidebar/NavIcon";


// Figma differs per role: the Super Admin sidebar (423:13942) has flush items, 40px sub-rows and an
// orange group label when a child is active, and its sub-menu is a separate block 22px below the
// group row; the Organiser sidebar (217:22528) pads items 16px, uses 60px sub-rows directly under the
// group row and keeps the group label grey. Both space items 22px apart; chevrons always point down.
const ROLE_STYLE: Record<WebRole, { itemPad: string; childRow: string; childList: string; highlightGroup: boolean }> = {
  ADMIN: { itemPad: "", childRow: "h-10", childList: "mt-[22px]", highlightGroup: true },
  ORGANIZER: { itemPad: "px-4", childRow: "h-[60px]", childList: "", highlightGroup: false },
};

// Clicking the link of the page you are already on does nothing (it used to re-request the whole page for no change)
const isCurrentPage = (href: string) => typeof window !== "undefined" && window.location.pathname + window.location.search === href;
const onLinkClick = (href: string, onNavigate: () => void) => (e: React.MouseEvent) => {
  if (isCurrentPage(href)) e.preventDefault();
  onNavigate();
};

function NavGroup({ entry, role, activeItem, onNavigate }: { entry: NavEntry; role: WebRole; activeItem: string; onNavigate: () => void }) {
  const children = entry.children || [];
  const groupActive = children.some((c) => c.key === activeItem);
  const [open, setOpen] = useState(groupActive);
  const style = ROLE_STYLE[role];

  const prevGroupActiveRef = useRef(groupActive);
  useEffect(() => {
    if (groupActive && !prevGroupActiveRef.current) {
      setOpen(true);
    }
    prevGroupActiveRef.current = groupActive;
  }, [groupActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 py-2 ${style.itemPad} text-base font-medium cursor-pointer transition-colors ${
          groupActive && style.highlightGroup ? "text-[#FF651D]" : "text-[#DEE2E5] hover:text-white"
        }`}
      >
        <NavIcon name={entry.icon} />
        <span className="flex-1 text-left">{entry.label}</span>
        <NavIcon name="chevron" />
      </button>
      {open && (
        <ul className={`px-6 ${style.childList}`}>
          {children.map((c) => {
            const active = c.key === activeItem;
            return (
              <li key={c.key}>
                <Link
                  href={c.href}
                  onClick={onLinkClick(c.href, onNavigate)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center ${style.childRow} pl-2.5 border-l-[1.5px] text-sm font-medium transition-colors ${
                    active ? "border-[#FF651D] text-[#FF651D]" : "border-[#2C3135] text-white hover:text-[#FFB08A]"
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
  const { itemPad } = ROLE_STYLE[role];
  return (
    <nav aria-label="Main" className="flex flex-col gap-[22px]">
      {navForRole(role).map((entry) =>
        entry.children ? (
          <NavGroup key={entry.key} entry={entry} role={role} activeItem={activeItem} onNavigate={onNavigate} />
        ) : (
          <Link
            key={entry.key}
            href={entry.href!}
            onClick={onLinkClick(entry.href!, onNavigate)}
            aria-current={activeItem === entry.key ? "page" : undefined}
            className={`flex items-center gap-2 py-2 ${itemPad} text-base font-medium transition-colors ${
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
      onClick={onLinkClick("/events/add", onNavigate)}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-base font-semibold text-white transition-colors ${
        active ? "bg-[#C65318] hover:bg-[#A83800]" : "bg-[#262A2D] hover:bg-[#30353A]"
      }`}
    >
      <NavIcon name="add" />
      Add Event
    </Link>
  );
}

// Figma logo slot: 202 x 34, left-aligned (same artwork as the auth pages' SVG)
function Logo() {
  return (
    <Link href="/dashboard" className="inline-block shrink-0">
      <Image src="/images/branding/lgpsm-logo.svg" alt="LGPSM" width={202} height={34} priority className="h-[34px] w-[202px] max-w-full object-contain object-left" />
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const role: WebRole = user?.role === "ADMIN" ? "ADMIN" : "ORGANIZER";
  const activeItem = getActiveItemFromPathname(pathname, role);
  const close = () => setIsMobileOpen(false);

  const navigation = (
    <div className="flex flex-col gap-[22px]">
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
          <div
            className={`relative ${role === "ADMIN" ? "w-[271px]" : "w-[284px]"} max-w-[85vw] bg-[#15191C] h-full p-6 flex flex-col gap-8 justify-between overflow-y-auto overscroll-contain animate-drawer`}
          >
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

      {/* Desktop sidebar (>= md) — Figma: 271px for ADMIN (Super Admin design), 284px for ORGANIZER (Admin design), #15191C, 24px padding */}
      <aside
        className={`hidden md:flex w-[240px] ${role === "ADMIN" ? "lg:w-[271px]" : "lg:w-[284px]"} shrink-0 h-screen sticky top-0 bg-[#15191C] flex-col gap-8 justify-between p-6 overflow-y-auto overscroll-contain no-scrollbar select-none z-30`}
      >
        <div className="flex flex-col gap-8">
          <Logo />
          {navigation}
        </div>
        {footer}
      </aside>
    </>
  );
}
