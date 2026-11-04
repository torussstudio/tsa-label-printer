// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";

// const LINKS = [
//   { href: "/", label: "Print" },
//   { href: "/lots", label: "Lots" },
//   { href: "/reports", label: "Reports" },
//   { href: "/products", label: "Products" },
// ] as const;

// /** Page header: title on the left, links between the pages on the right. */
// export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
//   const path = usePathname();
//   const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
//   return (
//     <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-0">
//       <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
//         {title} {subtitle && <span className="font-medium text-muted">· {subtitle}</span>}
//       </h1>
//       <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
//         {children}
//         <nav aria-label="Pages" className="flex rounded-xl border border-line bg-white p-0.5 text-sm">
//           {LINKS.map((l) => (
//             <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
//               className={`rounded-lg px-3 py-1.5 font-semibold transition ${
//                 active(l.href) ? "bg-ink text-white" : "text-muted hover:text-ink"
//               }`}>
//               {l.label}
//             </Link>
//           ))}
//         </nav>
//       </div>
//     </header>
//   );
// }



"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Print" },
  { href: "/lots", label: "Lots" },
  { href: "/reports", label: "Reports" },
  { href: "/products", label: "Products" },
] as const;

/** Page header: title on the left, links between the pages on the right. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-0">
      <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
        {title} {subtitle && <span className="font-medium text-muted">· {subtitle}</span>}
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {children}
        <nav aria-label="Pages" className="flex rounded-xl border border-line bg-white p-0.5 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                active(l.href) ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
