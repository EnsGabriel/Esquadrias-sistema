"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMoeda } from "@/lib/moeda";

export type VidroOpcao = {
  id: string;
  nome: string;
  cor_acabamento: string | null;
  espessura_mm: number | null;
  custo_unitario: number; // por m², guardado em guaraníes
};

function rotuloEspessura(e: number | null) {
  return e ? `${String(e).replace(".", ",")} mm` : "Sem espessura definida";
}

/**
 * Seletor de vidro: ao clicar, expande uma lista agrupada por espessura,
 * mostrando o preço por m² de cada vidro. Com `areaM2`, mostra o custo
 * estimado do vidro para o vão atual.
 */
export default function VidroSelect({
  vidros,
  value,
  onChange,
  areaM2,
}: {
  vidros: VidroOpcao[];
  value: string;
  onChange: (id: string) => void;
  areaM2?: number;
}) {
  const { fmt: fmtMoeda } = useMoeda();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const raiz = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const selecionado = vidros.find((v) => v.id === value) ?? null;

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = vidros.filter(
      (v) =>
        !termo ||
        v.nome.toLowerCase().includes(termo) ||
        (v.cor_acabamento ?? "").toLowerCase().includes(termo) ||
        String(v.espessura_mm ?? "").includes(termo)
    );
    const mapa = new Map<number, VidroOpcao[]>();
    for (const v of filtrados) {
      const chave = v.espessura_mm ?? 0;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(v);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : a[0] - b[0]))
      .map(([espessura, itens]) => ({
        espessura: espessura === 0 ? null : espessura,
        itens: itens.sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
  }, [vidros, busca]);

  function escolher(id: string) {
    onChange(id);
    setAberto(false);
    setBusca("");
  }

  const custoEstimado = selecionado && areaM2 ? areaM2 * selecionado.custo_unitario : null;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        onClick={() => setAberto((a) => !a)}
        className="input-field w-full flex items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          {selecionado ? (
            <>
              <span className="block truncate">
                {selecionado.nome}
                {selecionado.cor_acabamento ? ` — ${selecionado.cor_acabamento}` : ""}
              </span>
              <span className="block text-xs text-text-muted num">
                {selecionado.espessura_mm ? `${selecionado.espessura_mm} mm · ` : ""}
                {fmtMoeda(selecionado.custo_unitario)} / m²
              </span>
            </>
          ) : (
            <span className="text-text-muted">Sem vidro</span>
          )}
        </span>
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
      </button>

      {aberto && (
        <div className="absolute z-30 mt-1 w-full bg-surface-panel border border-border-strong shadow-panel">
          {vidros.length > 6 && (
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                className="input-field w-full"
                placeholder="Buscar vidro (nome, cor, espessura)…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          )}

          <ul role="listbox" className="max-h-72 overflow-y-auto">
            <li
              role="option"
              aria-selected={!value}
              onClick={() => escolher("")}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-surface-sunken ${
                !value ? "bg-surface-sunken font-medium" : ""
              }`}
            >
              Sem vidro
            </li>

            {vidros.length === 0 && (
              <li className="px-3 py-3 text-sm text-text-faint">
                Nenhum vidro cadastrado. Cadastre em Materiais → Vidro.
              </li>
            )}

            {grupos.map((g) => (
              <li key={g.espessura ?? "sem"} role="presentation">
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-text-muted bg-surface-sunken border-y border-border sticky top-0">
                  {rotuloEspessura(g.espessura)}
                </div>
                <ul role="presentation">
                  {g.itens.map((v) => (
                    <li
                      key={v.id}
                      role="option"
                      aria-selected={v.id === value}
                      onClick={() => escolher(v.id)}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-3 hover:bg-surface-sunken ${
                        v.id === value ? "bg-surface-sunken font-medium" : ""
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {v.nome}
                        {v.cor_acabamento ? ` — ${v.cor_acabamento}` : ""}
                      </span>
                      {v.custo_unitario > 0 ? (
                        <span className="num text-text-muted shrink-0">{fmtMoeda(v.custo_unitario)}/m²</span>
                      ) : (
                        <span className="text-xs text-status-warn shrink-0">sem preço</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            {vidros.length > 0 && grupos.length === 0 && (
              <li className="px-3 py-3 text-sm text-text-faint">Nada encontrado para “{busca}”.</li>
            )}
          </ul>
        </div>
      )}

      {selecionado && selecionado.custo_unitario === 0 && (
        <p className="text-xs text-status-warn mt-1">
          Este vidro está sem preço — o orçamento vai sair sem o custo do vidro. Defina o valor em Materiais.
        </p>
      )}
      {custoEstimado !== null && selecionado && selecionado.custo_unitario > 0 && (
        <p className="text-xs text-text-muted mt-1 num">
          {(areaM2 ?? 0).toFixed(2).replace(".", ",")} m² × {fmtMoeda(selecionado.custo_unitario)} ={" "}
          <span className="text-text font-medium">{fmtMoeda(custoEstimado)}</span> por unidade
        </p>
      )}
    </div>
  );
}
