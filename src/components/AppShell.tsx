"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

type Role = "admin" | "vendedor" | "cliente";

export default function AppShell({
  nome,
  role,
  children,
}: {
  nome: string;
  role: Role;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixa - desktop (md e acima) */}
      <div className="hidden md:block md:sticky md:top-0 md:h-screen">
        <Sidebar nome={nome} role={role} />
      </div>

      {/* Sidebar em gaveta - mobile/tablet */}
      {aberto && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setAberto(false)}
            aria-hidden="true"
          />
          <div className="relative h-full animate-[slideIn_0.2s_ease-out]">
            <Sidebar nome={nome} role={role} onNavigate={() => setAberto(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior - só aparece em mobile/tablet */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-ink text-white px-4 py-3 border-b border-white/10">
          <button
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            className="p-1.5 -ml-1.5 hover:bg-white/10 rounded"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold">Sistema de Esquadrias</span>
        </div>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
