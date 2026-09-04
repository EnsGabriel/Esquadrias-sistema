"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";

type Material = {
  id: string;
  tipo: "perfil" | "vidro" | "ferragem";
  nome: string;
  linha: string | null;
  cor_acabamento: string | null;
  unidade: string;
  kg_por_metro: number | null;
  comprimento_barra_m: number | null;
  kg_por_m2: number | null;
  espessura_mm: number | null;
  largura_chapa_m: number | null;
  altura_chapa_m: number | null;
  custo_unitario: number;
  ativo: boolean;
};

const VAZIO: Omit<Material, "id"> = {
  tipo: "perfil",
  nome: "",
  linha: "",
  cor_acabamento: "",
  unidade: "barra",
  kg_por_metro: null,
  comprimento_barra_m: 6,
  kg_por_m2: null,
  espessura_mm: null,
  largura_chapa_m: null,
  altura_chapa_m: null,
  custo_unitario: 0,
  ativo: true,
};

export default function MateriaisPage() {
  const supabase = createClient();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "perfil" | "vidro" | "ferragem">("todos");
  const [editando, setEditando] = useState<Material | (Omit<Material, "id"> & { id?: string }) | null>(
    null
  );
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("materials").select("*").order("tipo").order("nome");
    setMateriais((data as Material[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!editando) return;
    const payload = { ...editando };
    delete (payload as any).id;

    if ("id" in editando && editando.id) {
      await supabase.from("materials").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("materials").insert(payload);
    }
    setEditando(null);
    carregar();
  }

  async function remover(id: string) {
    if (!confirm("Remover este material? Modelos que o usam ficarão sem referência.")) return;
    await supabase.from("materials").delete().eq("id", id);
    carregar();
  }

  const lista = materiais.filter((m) => filtro === "todos" || m.tipo === filtro);

  return (
    <div>
      <PageHeader
        title="Materiais"
        subtitle="Perfis de alumínio, vidros e ferragens — base real de peso e custo"
        actions={
          <button className="btn-accent" onClick={() => setEditando(VAZIO)}>
            + Novo material
          </button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 pt-5 flex gap-2 overflow-x-auto">
        {(["todos", "perfil", "vidro", "ferragem"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={`px-3 py-1.5 text-sm border ${
              filtro === t
                ? "bg-ink text-white border-ink"
                : "bg-surface-panel text-text-muted border-border hover:text-text"
            }`}
          >
            {t === "todos" ? "Todos" : rotuloTipo(t)}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 lg:p-8 pt-4">
        <div className="panel overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nome</th>
                <th>Cor/Acabamento</th>
                <th>Unidade</th>
                <th>Peso</th>
                <th>Dimensão padrão</th>
                <th>Custo unitário</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr><td colSpan={8} className="text-center text-text-faint py-6">Carregando...</td></tr>
              )}
              {!carregando && lista.length === 0 && (
                <tr><td colSpan={8} className="text-center text-text-faint py-6">Nenhum material cadastrado.</td></tr>
              )}
              {lista.map((m) => (
                <tr key={m.id}>
                  <td>{rotuloTipo(m.tipo)}</td>
                  <td className="font-medium">{m.nome}{m.linha ? ` — ${m.linha}` : ""}</td>
                  <td>{m.cor_acabamento || "—"}</td>
                  <td>{m.unidade}</td>
                  <td className="num">
                    {m.tipo === "perfil" && m.kg_por_metro ? `${m.kg_por_metro} kg/m` : ""}
                    {m.tipo === "vidro" && m.kg_por_m2 ? `${m.kg_por_m2} kg/m²` : ""}
                    {m.tipo === "ferragem" ? "—" : ""}
                  </td>
                  <td className="num">
                    {m.tipo === "perfil" && m.comprimento_barra_m ? `barra ${m.comprimento_barra_m}m` : ""}
                    {m.tipo === "vidro" && m.largura_chapa_m ? `${m.largura_chapa_m}×${m.altura_chapa_m}m` : ""}
                    {m.tipo === "ferragem" ? "—" : ""}
                  </td>
                  <td className="num">
                    {m.custo_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td>
                    <button onClick={() => setEditando(m)} className="text-xs text-ink hover:underline mr-3">
                      Editar
                    </button>
                    <button onClick={() => remover(m.id)} className="text-xs text-status-danger hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <ModalMaterial
          material={editando}
          onChange={setEditando}
          onCancel={() => setEditando(null)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}

function rotuloTipo(t: string) {
  if (t === "perfil") return "Perfil";
  if (t === "vidro") return "Vidro";
  return "Ferragem";
}

function ModalMaterial({
  material,
  onChange,
  onCancel,
  onSalvar,
}: {
  material: Material | (Omit<Material, "id"> & { id?: string });
  onChange: (m: any) => void;
  onCancel: () => void;
  onSalvar: () => void;
}) {
  function set(field: string, value: any) {
    onChange({ ...material, [field]: value });
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-panel border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{"id" in material && material.id ? "Editar material" : "Novo material"}</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Tipo</label>
            <select
              className="input-field"
              value={material.tipo}
              onChange={(e) => set("tipo", e.target.value)}
            >
              <option value="perfil">Perfil de alumínio</option>
              <option value="vidro">Vidro</option>
              <option value="ferragem">Ferragem</option>
            </select>
          </div>

          <div>
            <label className="label-field">Nome</label>
            <input className="input-field" value={material.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>

          {material.tipo === "perfil" && (
            <>
              <div>
                <label className="label-field">Linha</label>
                <input className="input-field" value={material.linha ?? ""} onChange={(e) => set("linha", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Peso (kg/m)</label>
                  <input type="number" step="0.001" className="input-field" value={material.kg_por_metro ?? ""} onChange={(e) => set("kg_por_metro", Number(e.target.value))} />
                </div>
                <div>
                  <label className="label-field">Comprimento da barra (m)</label>
                  <input type="number" step="0.1" className="input-field" value={material.comprimento_barra_m ?? ""} onChange={(e) => set("comprimento_barra_m", Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          {material.tipo === "vidro" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Espessura (mm)</label>
                  <input type="number" step="0.5" className="input-field" value={material.espessura_mm ?? ""} onChange={(e) => set("espessura_mm", Number(e.target.value))} />
                </div>
                <div>
                  <label className="label-field">Peso (kg/m²)</label>
                  <input type="number" step="0.01" className="input-field" value={material.kg_por_m2 ?? ""} onChange={(e) => set("kg_por_m2", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Largura da chapa (m)</label>
                  <input type="number" step="0.01" className="input-field" value={material.largura_chapa_m ?? ""} onChange={(e) => set("largura_chapa_m", Number(e.target.value))} />
                </div>
                <div>
                  <label className="label-field">Altura da chapa (m)</label>
                  <input type="number" step="0.01" className="input-field" value={material.altura_chapa_m ?? ""} onChange={(e) => set("altura_chapa_m", Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="label-field">Cor / acabamento</label>
            <input className="input-field" value={material.cor_acabamento ?? ""} onChange={(e) => set("cor_acabamento", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Unidade de compra</label>
              <select className="input-field" value={material.unidade} onChange={(e) => set("unidade", e.target.value)}>
                <option value="barra">Barra</option>
                <option value="kg">Kg</option>
                <option value="m2">M²</option>
                <option value="un">Unidade</option>
              </select>
            </div>
            <div>
              <label className="label-field">Custo unitário (R$)</label>
              <input type="number" step="0.01" className="input-field" value={material.custo_unitario} onChange={(e) => set("custo_unitario", Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={onSalvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
