"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 mb-1">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="1" y="1" width="26" height="26" stroke="#E0954C" strokeWidth="2" />
              <line x1="14" y1="1" x2="14" y2="27" stroke="#E0954C" strokeWidth="2" />
              <line x1="1" y1="14" x2="27" y2="14" stroke="#E0954C" strokeWidth="2" />
            </svg>
            <span className="text-white text-lg font-semibold tracking-tight">
              Sistema de Esquadrias
            </span>
          </div>
          <p className="text-white/50 text-sm">Orçamento e produção</p>
        </div>

        <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
          <div>
            <label className="label-field" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="voce@empresa.com.br"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="text-status-danger text-sm border border-status-danger/30 bg-status-danger/5 px-3 py-2">
              {erro}
            </p>
          )}

          <button type="submit" disabled={carregando} className="btn-primary w-full">
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
