"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";

type Material = { id: string; nome: string; tipo: string };
type Componente = {
  id?: string;
  material_id: string;
  tipo_consumo: "perimetro" | "travessa_h" | "travessa_v" | "unidade";
  fator: number;
  quantidade_fixa: number | null;
};
type Modelo = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  perfil_material_id: string | null;
  aceita_vidro: boolean;
  ativo: boolean;
};

export default function ModelosPage() {
  const supabase = createClient();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const [{ data: m }, { data: mat }] = await Promise.all([
      supabase.from("esquadria_models").select("*").order("nome"),
      supabase.from("materials").select("id, nome, tipo").eq("ativo", true).order("nome"),
    ]);
    setModelos((m as Modelo[]) ?? []);
    setMateriais((mat as Material[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function abrirEdicao(modelo: Modelo | null) {
    if (modelo) {
      const { data } = await supabase
        .from("esquadria_model_components")
        .select("*")
        .eq("model_id", modelo.id);
      setComponentes((data as Componente[]) ?? []);
      setEditando(modelo);
    } else {
      setComponentes([]);
      setEditando({
        id: "",
        nome: "",
        tipo: "janela_correr",
        descricao: "",
        perfil_material_id: null,
        aceita_vidro: true,
        ativo: true,
      });
    }
  }

  async function salvar() {
    if (!editando) return;
    let modelId = editando.id;

    if (modelId) {
      await supabase
        .from("esquadria_models")
        .update({
          nome: editando.nome,
          tipo: editando.tipo,
          descricao: editando.descricao,
          perfil_material_id: editando.perfil_material_id,
          aceita_vidro: editando.aceita_vidro,
          ativo: editando.ativo,
        })
        .eq("id", modelId);
    } else {
      const { data, error } = await supabase
        .from("esquadria_models")
        .insert({
          nome: editando.nome,
          tipo: editando.tipo,
          descricao: editando.descricao,
          perfil_material_id: editando.perfil_material_id,
          aceita_vidro: editando.aceita_vidro,
          ativo: editando.ativo,
        })
        .select()
        .single();
      if (error || !data) return;
      modelId = data.id;
    }

    // substitui os componentes
    await supabase.from("esquadria_model_components").delete().eq("model_id", modelId);
    if (componentes.length > 0) {
      await supabase.from("esquadria_model_components").insert(
        componentes.map((c) => ({
          model_id: modelId,
          material_id: c.material_id,
          tipo_consumo: c.tipo_consumo,
          fator: c.fator,
          quantidade_fixa: c.quantidade_fixa,
        }))
      );
    }

    setEditando(null);
    carregar();
  }

  async function remover(id: string) {
    if (!confirm("Remover este modelo?")) return;
    await supabase.from("esquadria_models").delete().eq("id", id);
    carregar();
  }

  function addComponente() {
    setComponentes([
      ...componentes,
      { material_id: "", tipo_consumo: "perimetro", fator: 1, quantidade_fixa: null },
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Modelos de esquadria"
        subtitle="Catálogo de referência com a composição de material de cada modelo"
        actions={<button className="btn-accent" onClick={() => abrirEdicao(null)}>+ Novo modelo</button>}
      />

      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {carregando && <p className="text-text-faint text-sm">Carregando...</p>}
        {!carregando && modelos.length === 0 && (
          <p className="text-text-faint text-sm">Nenhum modelo cadastrado ainda.</p>
        )}
        {modelos.map((m) => (
          <div key={m.id} className="panel p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">{rotuloTipo(m.tipo)}</p>
            <p className="font-medium mb-1">{m.nome}</p>
            <p className="text-sm text-text-muted mb-3 line-clamp-2">{m.descricao || "Sem descrição."}</p>
            <div className="flex gap-3">
              <button className="text-xs text-ink hover:underline" onClick={() => abrirEdicao(m)}>Editar</button>
              <button className="text-xs text-status-danger hover:underline" onClick={() => remover(m.id)}>Remover</button>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-panel border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">{editando.id ? "Editar modelo" : "Novo modelo"}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Nome</label>
                  <input className="input-field" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Tipo</label>
                  <select className="input-field" value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value })}>
                    <option value="janela_correr">Janela de correr</option>
                    <option value="janela_maxim_ar">Janela maxim-ar</option>
                    <option value="porta_correr">Porta de correr</option>
                    <option value="porta_abrir">Porta de abrir</option>
                    <option value="fixo">Vidro fixo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field">Descrição</label>
                <textarea className="input-field" rows={2} value={editando.descricao ?? ""} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="aceita_vidro"
                  checked={editando.aceita_vidro}
                  onChange={(e) => setEditando({ ...editando, aceita_vidro: e.target.checked })}
                />
                <label htmlFor="aceita_vidro" className="text-sm">Este modelo leva vidro</label>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Composição de material</h3>
                  <button className="text-xs text-ink hover:underline" onClick={addComponente}>+ Adicionar componente</button>
                </div>
                <p className="text-xs text-text-muted mb-3">
                  Para perfis: "perímetro" soma 2×largura + 2×altura; "travessa horizontal/vertical" soma só a largura ou altura. Para ferragens: use "quantidade fixa por esquadria".
                </p>

                <div className="space-y-2">
                  {componentes.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        className="input-field col-span-4"
                        value={c.material_id}
                        onChange={(e) => {
                          const novo = [...componentes];
                          novo[idx].material_id = e.target.value;
                          setComponentes(novo);
                        }}
                      >
                        <option value="">Selecione o material...</option>
                        {materiais.map((mat) => (
                          <option key={mat.id} value={mat.id}>{mat.nome} ({mat.tipo})</option>
                        ))}
                      </select>
                      <select
                        className="input-field col-span-3"
                        value={c.tipo_consumo}
                        onChange={(e) => {
                          const novo = [...componentes];
                          novo[idx].tipo_consumo = e.target.value as Componente["tipo_consumo"];
                          setComponentes(novo);
                        }}
                      >
                        <option value="perimetro">Perímetro</option>
                        <option value="travessa_h">Travessa horizontal</option>
                        <option value="travessa_v">Travessa vertical</option>
                        <option value="unidade">Qtd. fixa (ferragem)</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        placeholder={c.tipo_consumo === "unidade" ? "qtd." : "fator"}
                        className="input-field col-span-2"
                        value={c.tipo_consumo === "unidade" ? c.quantidade_fixa ?? "" : c.fator}
                        onChange={(e) => {
                          const novo = [...componentes];
                          if (c.tipo_consumo === "unidade") novo[idx].quantidade_fixa = Number(e.target.value);
                          else novo[idx].fator = Number(e.target.value);
                          setComponentes(novo);
                        }}
                      />
                      <button
                        className="col-span-1 text-status-danger text-xs"
                        onClick={() => setComponentes(componentes.filter((_, i) => i !== idx))}
                      >
                        remover
                      </button>
                    </div>
                  ))}
                  {componentes.length === 0 && (
                    <p className="text-xs text-text-faint">Nenhum componente adicionado.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function rotuloTipo(t: string) {
  const mapa: Record<string, string> = {
    janela_correr: "Janela de correr",
    janela_maxim_ar: "Janela maxim-ar",
    porta_correr: "Porta de correr",
    porta_abrir: "Porta de abrir",
    fixo: "Vidro fixo",
  };
  return mapa[t] ?? t;
}
