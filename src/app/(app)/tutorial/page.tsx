"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

type Etapa = {
  id: string;
  titulo: string;
  o_que: string;
  como: string[];
  href: string;
  botao: string;
};

const ETAPAS: Etapa[] = [
  {
    id: "materiais-perfis",
    titulo: "1. Cadastrar os perfis de alumínio",
    o_que: "Os perfis são as barras de alumínio. O sistema calcula quantos metros de cada um cada janela consome.",
    como: [
      "Abra Materiais.",
      "No painel “Preço dos perfis de alumínio”, clique em “Carregar perfis do catálogo Línea Nova”.",
      "Escolha como o fornecedor cobra: por kg (padrão) ou por barra.",
      "Digite o preço e clique em “Aplicar a todos os perfis”.",
    ],
    href: "/materiais",
    botao: "Ir para Materiais",
  },
  {
    id: "materiais-vidros",
    titulo: "2. Cadastrar os vidros com preço",
    o_que: "O vidro é cobrado por metro quadrado. Cada espessura e cor tem um preço.",
    como: [
      "Em Materiais, no painel “Preços dos vidros”, clique em “Carregar tabela padrão de vidros”.",
      "Clique numa espessura para abrir a lista.",
      "Digite o preço por m² direto na linha e aperte Enter.",
    ],
    href: "/materiais",
    botao: "Ir para Materiais",
  },
  {
    id: "clientes",
    titulo: "3. Cadastrar o cliente",
    o_que: "Toda obra pertence a um cliente.",
    como: ["Abra Clientes e clique em “+ Novo cliente”.", "Preencha nome, telefone e endereço e salve."],
    href: "/clientes",
    botao: "Ir para Clientes",
  },
  {
    id: "modelos",
    titulo: "4. Criar os modelos de esquadria",
    o_que: "Um modelo é a “receita” de uma janela ou porta: quais perfis ela leva. Você cria uma vez e usa em todas as obras.",
    como: [
      "Abra Modelos de esquadria e clique em “+ Novo modelo”.",
      "Dê um nome (por exemplo, “Janela de correr 2 folhas”) e escolha o tipo.",
      "Adicione os componentes: material, tipo de consumo e fator.",
      "Antes de usar num orçamento real, confira com uma peça que você já fabricou.",
    ],
    href: "/modelos",
    botao: "Ir para Modelos",
  },
  {
    id: "obra",
    titulo: "5. Criar a obra",
    o_que: "A obra é o projeto de um cliente: a casa ou o prédio onde as janelas e portas vão.",
    como: [
      "Abra Obras e clique em “+ Nova obra”.",
      "Escolha o cliente, dê um nome (por exemplo, “Reforma sala — Sr. João”) e o endereço.",
      "Clique em “Criar obra” e abra a obra.",
    ],
    href: "/obras",
    botao: "Ir para Obras",
  },
  {
    id: "orcamento",
    titulo: "6. Montar o orçamento",
    o_que: "Dentro da obra você lança cada janela ou porta com a medida. O sistema calcula custo e preço de venda.",
    como: [
      "Na obra, em “Configurar item”, escolha o modelo.",
      "Digite a largura e a altura em milímetros (por exemplo, 1200 e 1000).",
      "Informe a quantidade, o vidro e a margem de venda.",
      "Clique em “Adicionar item à obra”. Repita para cada janela ou porta.",
    ],
    href: "/obras",
    botao: "Ir para Obras",
  },
  {
    id: "fabrica",
    titulo: "7. Gerar o pedido à fábrica",
    o_que: "Quando precisar só do corte e dos vidros, sem montar a obra inteira, use o pedido à fábrica.",
    como: [
      "Abra Pedido à fábrica.",
      "Escolha o modelo (por exemplo, janela de correr 4 folhas) e digite a medida como 1200x1000.",
      "Clique em “Adicionar ao pedido”. A tabela de vidros e a lista de corte aparecem na hora.",
      "Use “Copiar pedido (texto)” para enviar ao fornecedor ou “Imprimir / salvar PDF”.",
    ],
    href: "/pedido-fabrica",
    botao: "Ir para Pedido à fábrica",
  },
  {
    id: "compras",
    titulo: "8. Ver o que comprar",
    o_que: "Para uma obra inteira, o sistema diz quantas barras de perfil e quantos metros de vidro comprar.",
    como: [
      "Abra Compras e corte e escolha a obra.",
      "Clique em “Calcular”.",
      "Confira a lista de compras e o plano de corte antes de passar ao fornecedor.",
    ],
    href: "/compras",
    botao: "Ir para Compras e corte",
  },
];

const CHAVE = "esquadrias:tutorial";

export default function TutorialPage() {
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [aberta, setAberta] = useState<string | null>(ETAPAS[0].id);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    try {
      setFeitos(JSON.parse(localStorage.getItem(CHAVE) ?? "{}"));
    } catch {}
    setPronto(true);
  }, []);

  function alternar(id: string) {
    const novo = { ...feitos, [id]: !feitos[id] };
    setFeitos(novo);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novo));
    } catch {}
  }

  const total = ETAPAS.length;
  const concluidas = ETAPAS.filter((e) => feitos[e.id]).length;
  const percentual = Math.round((concluidas / total) * 100);

  return (
    <div>
      <PageHeader
        title="Tutorial"
        subtitle="Passo a passo, do cadastro ao pedido. Marque cada etapa quando terminar."
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
        {/* progresso */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Seu progresso</p>
            <p className="text-sm num text-text-muted">{pronto ? `${concluidas} de ${total} etapas` : " "}</p>
          </div>
          <div className="h-2 bg-surface-sunken overflow-hidden">
            <div className="h-full bg-status-ok transition-all" style={{ width: `${pronto ? percentual : 0}%` }} />
          </div>
        </div>

        {/* etapas */}
        <div className="panel divide-y divide-border">
          {ETAPAS.map((e) => {
            const aberto = aberta === e.id;
            const feito = Boolean(feitos[e.id]);
            return (
              <div key={e.id}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Marcar ${e.titulo} como feita`}
                    checked={feito}
                    onChange={() => alternar(e.id)}
                    className="w-4 h-4 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => setAberta(aberto ? null : e.id)}
                    aria-expanded={aberto}
                    className="flex-1 text-left flex items-center justify-between gap-3"
                  >
                    <span className={`text-sm font-medium ${feito ? "text-text-muted line-through" : ""}`}>{e.titulo}</span>
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
                </div>

                {aberto && (
                  <div className="px-5 pb-5 pl-12 space-y-3">
                    <p className="text-sm text-text-muted">{e.o_que}</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      {e.como.map((passo, i) => (
                        <li key={i}>{passo}</li>
                      ))}
                    </ol>
                    <Link href={e.href} className="btn-primary inline-block">
                      {e.botao}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* dúvidas */}
        <div className="panel p-5 space-y-4">
          <h2 className="font-semibold text-sm">Dúvidas comuns</h2>
          <Duvida p="O orçamento está com custo zero." r="Falta o preço do perfil ou do vidro. Abra Materiais e defina os preços (etapas 1 e 2)." />
          <Duvida p="O vidro aparece “sem preço”." r="Digite o preço por m² na linha da espessura, em Materiais." />
          <Duvida p="Os valores ficaram estranhos." r="Confira a moeda e a cotação no menu lateral. O sistema guarda tudo em guaraníes e converte na tela." />
          <Duvida p="Não encontro um modelo de janela." r="Crie o modelo em Modelos de esquadria. Depois de salvo, ele aparece na lista de modelos do orçamento." />
          <Duvida p="Apareceu aviso amarelo no pedido à fábrica." r="Leia o aviso. Ele indica pontos em que o catálogo é ambíguo; confirme com o fornecedor antes de fechar." />
        </div>

        <p className="text-xs text-text-faint">
          Suas marcações ficam salvas neste navegador. Para zerar o progresso, desmarque as etapas.
        </p>
      </div>
    </div>
  );
}

function Duvida({ p, r }: { p: string; r: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{p}</p>
      <p className="text-sm text-text-muted mt-0.5">{r}</p>
    </div>
  );
}
