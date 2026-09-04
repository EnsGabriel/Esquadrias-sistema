import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  const nome = profile?.nome ?? user.email ?? "Usuário";
  const role = (profile?.role as "admin" | "vendedor" | "cliente") ?? "vendedor";

  return (
    <AppShell nome={nome} role={role}>
      {children}
    </AppShell>
  );
}
