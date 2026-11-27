"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowUpRight, Menu, X, Zap } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"] });
const H = display.className;

const NAV = [
  { href: "#platform", label: "Platform" },
  { href: "#architecture", label: "Architecture" },
  { href: "#analytics-preview", label: "ROI Simulator" },
  { href: "#roles-rbac", label: "Roles & RBAC" },
];

export default function HomeNavbar({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const navHref = (href: string) => (isHomePage ? href : `/${href}`);
  const alternateAuthHref = isLoginPage ? "/register" : "/login";
  const alternateAuthLabel = isLoginPage ? "Create account" : "Sign In";
  const primaryHref = loggedIn ? "/dashboard" : isHomePage ? "/login" : "/";
  const primaryLabel = loggedIn ? "Open Dashboard" : isHomePage ? "Launch Dashboard" : "Home";
  const showPrimaryCta = loggedIn || isHomePage;

  return (
    <header className="hm-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/#top" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-volt/40 bg-volt/15 shadow-[0_0_24px_rgba(16,185,129,0.28)] transition-transform group-hover:scale-105">
            <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-volt opacity-25" />
            <Zap size={20} className="relative z-10 text-volt" />
          </div>
          <div>
            <span className={`${H} text-xl font-extrabold tracking-tight`}>WattWise</span>
            <p className="hidden font-mono text-[10px] text-alabaster/50 sm:block">
              SMART ENERGY INTELLIGENCE
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-xs font-semibold tracking-wide text-alabaster/70 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={navHref(item.href)}
              className="transition-colors hover:text-volt"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {!loggedIn && (
            <Link
              href={isHomePage ? "/login" : alternateAuthHref}
              className="rounded-xl border border-alabaster/20 px-3.5 py-2 text-xs font-semibold transition-all hover:border-volt hover:text-volt sm:px-4"
            >
              {isHomePage ? "Sign In" : alternateAuthLabel}
            </Link>
          )}
          {showPrimaryCta && (
            <Link
              href={primaryHref}
              className={`hm-shimmer flex items-center gap-1.5 rounded-xl bg-volt px-4 py-2 text-xs font-bold tracking-wide text-midnight shadow-[0_0_24px_rgba(16,185,129,0.38)] transition-all hover:brightness-105 active:scale-[0.98] sm:px-5 ${H}`}
            >
              <span>{primaryLabel}</span>
              <ArrowUpRight size={14} />
            </Link>
          )}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-xl border border-alabaster/10 bg-alabaster/5 p-2 text-alabaster hover:border-volt lg:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <ThemeToggle className="border-alabaster/20 bg-alabaster/5 text-alabaster hover:border-volt hover:text-volt" />
        </div>
      </div>

      {menuOpen && (
        <div className="space-y-3 border-t border-alabaster/10 bg-midnight/95 px-6 py-4 text-sm font-medium text-alabaster/80 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={navHref(item.href)}
              onClick={() => setMenuOpen(false)}
              className="block py-1.5 hover:text-volt"
            >
              {item.label}
            </Link>
          ))}
          {!loggedIn && (
            <Link
              href={isHomePage || isLoginPage ? "/register" : "/login"}
              onClick={() => setMenuOpen(false)}
              className="block py-1.5 text-volt"
            >
              {isHomePage ? "Provision Organization" : isRegisterPage ? "Sign In" : "Create account"}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
