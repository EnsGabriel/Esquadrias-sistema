"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SeletorMoeda } from "@/lib/moeda";

type Role = "admin" | "vendedor" | "cliente";

const NAV = [
  { href: "/dashboard", label: "Painel", roles: ["admin", "vendedor", "cliente"] as Role[] },
  { href: "/obras", label: "Obras", roles: ["admin", "vendedor", "cliente"] as Role[] },
  { href: "/clientes", label: "Clientes", roles: ["admin", "vendedor"] as Role[] },
  { href: "/modelos", label: "Modelos de esquadria", roles: ["admin", "vendedor"] as Role[] },
  { href: "/materiais", label: "Materiais", roles: ["admin", "vendedor"] as Role[] },
  { href: "/compras", label: "Compras e corte", roles: ["admin", "vendedor"] as Role[] },
  { href: "/pedido-fabrica", label: "Pedido à fábrica", roles: ["admin", "vendedor"] as Role[] },
];

export default function Sidebar({
  nome,
  role,
  onNavigate,
}: {
  nome: string;
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 sm:w-60 shrink-0 bg-ink text-white flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect x="1" y="1" width="26" height="26" stroke="#E0954C" strokeWidth="2" />
          <line x1="14" y1="1" x2="14" y2="27" stroke="#E0954C" strokeWidth="2" />
          <line x1="1" y1="14" x2="27" y2="14" stroke="#E0954C" strokeWidth="2" />
        </svg>
        <span className="text-sm font-semibold tracking-tight leading-tight">
          Sistema de<br />Esquadrias
        </span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block px-5 py-2.5 text-sm border-l-2 transition-colors ${
                active
                  ? "border-accent bg-white/5 text-white font-medium"
                  : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <SeletorMoeda />

      <div className="px-5 py-4 border-t border-white/10 shrink-0">
        <p className="text-sm text-white truncate">{nome}</p>
        <p className="text-xs text-white/40 uppercase tracking-wide mb-2">{roleLabel(role)}</p>
        <button
          onClick={handleLogout}
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

function roleLabel(role: Role) {
  if (role === "admin") return "Administrador";
  if (role === "vendedor") return "Vendedor";
  return "Cliente";
}
