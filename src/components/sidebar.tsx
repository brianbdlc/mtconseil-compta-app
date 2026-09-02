"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/fournisseurs", label: "Fournisseurs" },
  { href: "/clients", label: "Clients" },
  { href: "/grand-livre", label: "Grand livre" },
  { href: "/taxes", label: "Taxes" },
  { href: "/etats", label: "États financiers" },
  { href: "/cloture", label: "Clôture" },
  { href: "/export", label: "Export" },
  { href: "/parametres", label: "Paramètres" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-surface">
      <div className="border-b border-neutral-200 px-5 py-4">
        <span className="font-display text-[19px] font-semibold text-ink">
          MT Conseil
        </span>
      </div>
      <ul className="flex flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-ink-tint font-medium text-ink"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
