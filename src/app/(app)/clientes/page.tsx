"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";

type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
};

const VAZIO: Omit<Cliente, "id"> = { nome: "", documento: "", telefone: "", email: "", endereco: "" };

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("clients").select("*").order("nome");
    setClientes((data as Cliente[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar() {
    const payload = { ...editando };
    const id = payload.id;
    delete payload.id;
    if (id) await supabase.from("clients").update(payload).eq("id", id);
    else await supabase.from("clients").insert(payload);
    setEditando(null);
    carregar();
  }

  async function remover(id: string) {
    if (!confirm("Remover este cliente? As obras vinculadas também serão removidas.")) return;
    await supabase.from("clients").delete().eq("id", id);
    carregar();
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes da vidraçaria"
        actions={<button className="btn-accent" onClick={() => setEditando(VAZIO)}>+ Novo cliente</button>}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="panel overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Nome</th><th>Documento</th><th>Telefone</th><th>E-mail</th><th></th></tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={5} className="text-center text-text-faint py-6">Carregando...</td></tr>}
              {!carregando && clientes.length === 0 && (
                <tr><td colSpan={5} className="text-center text-text-faint py-6">Nenhum cliente cadastrado.</td></tr>
              )}
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <Link href={`/obras?cliente=${c.id}`} className="hover:text-ink hover:underline">{c.nome}</Link>
                  </td>
                  <td>{c.documento || "—"}</td>
                  <td>{c.telefone || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>
                    <button onClick={() => setEditando(c)} className="text-xs text-ink hover:underline mr-3">Editar</button>
                    <button onClick={() => remover(c.id)} className="text-xs text-status-danger hover:underline">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-panel border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">{editando.id ? "Editar cliente" : "Novo cliente"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="label-field">Nome</label><input className="input-field" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div>
              <div><label className="label-field">CPF/CNPJ</label><input className="input-field" value={editando.documento ?? ""} onChange={(e) => setEditando({ ...editando, documento: e.target.value })} /></div>
              <div><label className="label-field">Telefone</label><input className="input-field" value={editando.telefone ?? ""} onChange={(e) => setEditando({ ...editando, telefone: e.target.value })} /></div>
              <div><label className="label-field">E-mail</label><input className="input-field" value={editando.email ?? ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })} /></div>
              <div><label className="label-field">Endereço</label><input className="input-field" value={editando.endereco ?? ""} onChange={(e) => setEditando({ ...editando, endereco: e.target.value })} /></div>
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
