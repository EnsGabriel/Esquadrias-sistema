"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Moeda base do banco de dados: guaraníes (PYG). A tela converte para R$ quando escolhido.
export type Moeda = "PYG" | "BRL";
export const TAXA_PADRAO = 1145; // guaraníes por 1 real
const CHAVE = "esquadrias:moeda";

type Ctx = {
  moeda: Moeda;
  setMoeda: (m: Moeda) => void;
  taxa: number; // Gs por R$
  setTaxa: (t: number) => void;
  simbolo: string; // "Gs" | "R$"
  /** valor guardado (Gs) -> texto formatado na moeda escolhida */
  fmt: (valorPYG: number) => string;
  /** valor guardado (Gs) -> número na moeda escolhida */
  paraExibicao: (valorPYG: number) => number;
  /** número digitado na moeda escolhida -> valor para guardar (Gs, inteiro) */
  paraBanco: (valorExibido: number) => number;
  /** texto digitado (ex.: "179.081" ou "156,40") -> número, conforme a moeda escolhida */
  lerNumero: (texto: string) => number | null;
  /** número guardado -> texto para preencher um campo de edição */
  textoEdicao: (valorPYG: number) => string;
};

const MoedaContext = createContext<Ctx | null>(null);

function milhares(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function MoedaProvider({ children }: { children: React.ReactNode }) {
  const [moeda, setMoedaState] = useState<Moeda>("PYG");
  const [taxa, setTaxaState] = useState<number>(TAXA_PADRAO);

  // carrega a preferência salva neste navegador
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
      if (salvo?.moeda === "PYG" || salvo?.moeda === "BRL") setMoedaState(salvo.moeda);
      if (typeof salvo?.taxa === "number" && salvo.taxa > 0) setTaxaState(salvo.taxa);
    } catch {}
  }, []);

  function persistir(m: Moeda, t: number) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ moeda: m, taxa: t }));
    } catch {}
  }

  const valor = useMemo<Ctx>(() => {
    const brl = moeda === "BRL";
    return {
      moeda,
      taxa,
      setMoeda: (m) => {
        setMoedaState(m);
        persistir(m, taxa);
      },
      setTaxa: (t) => {
        if (!(t > 0)) return;
        setTaxaState(t);
        persistir(moeda, t);
      },
      simbolo: brl ? "R$" : "Gs",
      fmt: (v) =>
        brl
          ? (v / taxa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : `Gs ${milhares(v)}`,
      paraExibicao: (v) => (brl ? v / taxa : v),
      paraBanco: (x) => Math.round(brl ? x * taxa : x),
      lerNumero: (texto) => {
        const limpo = texto.trim().replace(/[^\d.,-]/g, "");
        if (!limpo) return null;
        // Gs não tem centavos: "179.081" = 179081. R$: "1.234,56" = 1234,56
        const normal = brl
          ? limpo.includes(",")
            ? limpo.replace(/\./g, "").replace(",", ".")
            : limpo
          : limpo.replace(/[.,]/g, "");
        const n = Number(normal);
        return isNaN(n) ? null : n;
      },
      textoEdicao: (v) =>
        brl ? (Math.round((v / taxa) * 100) / 100).toString().replace(".", ",") : String(Math.round(v)),
    };
  }, [moeda, taxa]);

  return <MoedaContext.Provider value={valor}>{children}</MoedaContext.Provider>;
}

export function useMoeda(): Ctx {
  const ctx = useContext(MoedaContext);
  if (!ctx) throw new Error("useMoeda precisa estar dentro de <MoedaProvider>");
  return ctx;
}

/** Mostra um valor (guardado em Gs) na moeda escolhida. Use em qualquer lugar da tela. */
export function Dinheiro({ valor }: { valor: number }) {
  const { fmt } = useMoeda();
  return <>{fmt(valor)}</>;
}

/** Seletor de moeda + cotação. Fica no menu lateral. */
export function SeletorMoeda() {
  const { moeda, setMoeda, taxa, setTaxa } = useMoeda();
  const [txt, setTxt] = useState<string | null>(null);

  return (
    <div className="px-5 py-4 border-t border-white/10 shrink-0">
      <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Moeda</p>
      <div className="flex gap-1.5">
        {(["PYG", "BRL"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoeda(m)}
            aria-pressed={moeda === m}
            className={`flex-1 px-2 py-1.5 text-xs border transition-colors ${
              moeda === m
                ? "bg-accent border-accent text-white font-medium"
                : "border-white/20 text-white/60 hover:text-white hover:border-white/40"
            }`}
          >
            {m === "PYG" ? "Guaraníes (Gs)" : "Reais (R$)"}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 mt-3 text-xs text-white/50">
        <span className="shrink-0">1 R$ =</span>
        <input
          inputMode="numeric"
          aria-label="Cotação: guaraníes por real"
          className="w-full bg-white/10 border border-white/20 px-2 py-1 text-white text-xs text-right outline-none focus:border-accent"
          value={txt ?? String(taxa)}
          onFocus={(e) => {
            setTxt(String(taxa));
            e.currentTarget.select();
          }}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={() => {
            const n = Number((txt ?? "").replace(",", "."));
            if (n > 0) setTaxa(n);
            setTxt(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="shrink-0">Gs</span>
      </label>
    </div>
  );
}
