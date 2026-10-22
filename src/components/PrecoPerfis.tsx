"use client";

import { useState } from "react";
import { useMoeda } from "@/lib/moeda";

type Base = "kg" | "barra";

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-text-muted transition-transform ${aberto ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Define de uma vez como o fornecedor cobra os perfis (por kg ou por barra)
 * e o preço. Útil quando a empresa não tem o preço de cada barra.
 */
export default function PrecoPerfis({
  total,
  semPreco,
  porKg,
  porBarra,
  onAplicar,
  onCarregarNova,
}: {
  total: number;
  semPreco: number;
  porKg: number;
  porBarra: number;
  onAplicar: (base: Base, precoPYG: number) => Promise<void>;
  onCarregarNova: () => void;
}) {
  const { simbolo, lerNumero, paraBanco } = useMoeda();
  const [aberto, setAberto] = useState(true);
  const [base, setBase] = useState<Base>("kg");
  const [preco, setPreco] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function aplicar() {
    const n = lerNumero(preco);
    if (n === null || n < 0) {
      setMsg("Digite um preço válido.");
      return;
    }
    if (
      !confirm(
        `Aplicar a TODOS os ${total} perfis: cobrança ${base === "kg" ? "por kg" : "por barra"} a ${simbolo} ${preco}?\nIsso substitui o preço e a forma de cobrança atuais dos perfis.`
      )
    )
      return;
    await onAplicar(base, paraBanco(n));
    setMsg("Aplicado.");
    setTimeout(() => setMsg(null), 2000);
  }

  return (
    <div className="panel">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold text-sm">Preço dos perfis de alumínio</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {total} perfis · {porKg} cobrados por kg · {porBarra} por barra
            {semPreco > 0 && <span className="text-status-warn"> · {semPreco} sem preço</span>}
          </p>
        </div>
        <Chevron aberto={aberto} />
      </button>

      {aberto && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <p className="text-sm text-text-muted">
            Sem o preço da barra? Cobre <strong>por kg</strong>: o sistema já tem o peso (kg/m) de cada perfil e
            calcula o peso de cada obra. Se o fornecedor passar o preço por barra, escolha “por barra”. Você pode
            ajustar perfil por perfil depois, em Editar.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="label-field">Como o fornecedor cobra</label>
              <select className="input-field" value={base} onChange={(e) => setBase(e.target.value as Base)}>
                <option value="kg">Por kg (peso)</option>
                <option value="barra">Por barra</option>
              </select>
            </div>
            <div>
              <label className="label-field">
                Preço por {base === "kg" ? "kg" : "barra"} ({simbolo})
              </label>
              <input
                inputMode="decimal"
                className="input-field num"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="0"
              />
            </div>
            <button type="button" className="btn-primary" onClick={aplicar} disabled={total === 0}>
              Aplicar a todos os perfis
            </button>
          </div>
          {msg && <p className="text-xs text-text-muted">{msg}</p>}

          <div className="pt-3 border-t border-border">
            <button type="button" onClick={onCarregarNova} className="text-xs text-ink hover:underline">
              Carregar perfis do catálogo Línea Nova (72 perfis, com peso kg/m)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
