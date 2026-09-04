"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";

type Obra = {
  id: string;
  nome: string;
  endereco: string | null;
  status: string;
  client_id: string;
  clients?: { nome: string };
};
type Cliente = { id: string; nome: string };

function ObrasContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const clienteFiltro = searchParams.get("cliente");

  const [obras, setObras] = useState<Obra[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [criando, setCriando] = useState<{ nome: string; endereco: string; client_id: string } | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    let query = supabase.from("works").select("*, clients(nome)").order("created_at", { ascending: false });
    if (clienteFiltro) query = query.eq("client_id", clienteFiltro);
    const [{ data: w }, { data: c }] = await Promise.all([
      query,
      supabase.from("clients").select("id, nome").order("nome"),
    ]);
    setObras((w as Obra[]) ?? []);
    setClientes((c as Cliente[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [clienteFiltro]);

  async function salvar() {
    if (!criando || !criando.nome || !criando.client_id) return;
    await supabase.from("works").insert(criando);
    setCriando(null);
    carregar();
  }

  return (
    <div>
      <PageHeader
        title="Obras"
        subtitle={clienteFiltro ? "Obras deste cliente" : "Todas as obras cadastradas"}
        actions={<button className="btn-accent" onClick={() => setCriando({ nome: "", endereco: "", client_id: clienteFiltro ?? "" })}>+ Nova obra</button>}
      />

      <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {carregando && <p className="text-text-faint text-sm">Carregando...</p>}
        {!carregando && obras.length === 0 && <p className="text-text-faint text-sm">Nenhuma obra cadastrada.</p>}
        {obras.map((o) => (
          <Link key={o.id} href={`/obras/${o.id}`} className="panel p-4 block hover:border-ink transition-colors">
            <p className="text-xs text-text-muted uppercase tracking-wide">{statusLabel(o.status)}</p>
            <p className="font-medium mb-1">{o.nome}</p>
            <p className="text-sm text-text-muted">{o.clients?.nome}</p>
          </Link>
        ))}
      </div>

      {criando && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-panel border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border"><h2 className="font-semibold">Nova obra</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-field">Cliente</label>
                <select className="input-field" value={criando.client_id} onChange={(e) => setCriando({ ...criando, client_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><label className="label-field">Nome da obra</label><input className="input-field" value={criando.nome} onChange={(e) => setCriando({ ...criando, nome: e.target.value })} /></div>
              <div><label className="label-field">Endereço</label><input className="input-field" value={criando.endereco} onChange={(e) => setCriando({ ...criando, endereco: e.target.value })} /></div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setCriando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}>Criar obra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: string) {
  const mapa: Record<string, string> = { orcamento: "Em orçamento", aprovada: "Aprovada", producao: "Em produção", entregue: "Entregue", cancelada: "Cancelada" };
  return mapa[s] ?? s;
}

export default function ObrasPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8 text-text-faint text-sm">Carregando...</div>}>
      <ObrasContent />
    </Suspense>
  );
}
