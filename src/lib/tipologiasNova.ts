// Tipologias da linha Nova (Alukler / Vilux) com as MEDIDAS DE CORTE do catálogo (seção "Nudos", págs. 55–61).
// L = largura do vão (mm), H = altura do vão (mm), E = "Eje" (altura do travessão central, mm) nas portas de abrir.
// As fórmulas seguem o catálogo; onde o catálogo é ambíguo há um aviso em `avisos`.

export type Params = { L: number; H: number; E: number };

export type PecaPerfil = {
  codigo: string;
  formula: (p: Params) => number;
  qtd: number;
  corte: "|-|" | "\\-/" | "\\-|" | "|-/"; // reto, 45° nas duas pontas, 45° numa ponta
  nota?: string;
};

export type PecaVidro = {
  rotulo?: string;
  largura: (p: Params) => number;
  altura: (p: Params) => number;
  qtd: number;
};

export type Tipologia = {
  id: string;
  grupo: "Janelas" | "Portas";
  nome: string;
  pagina: number; // página do catálogo (PDF)
  vidro: "dvh" | "templado" | "livre";
  usaEixo?: boolean;
  perfis: PecaPerfil[];
  vidros: PecaVidro[];
  avisos: string[];
};

const R = "|-|" as const;
const D = "\\-/" as const;

export const LINHAS = [{ id: "nova", nome: "Línea Nova (Alukler / Vilux)" }] as const;

export const TIPOLOGIAS_NOVA: Tipologia[] = [
  {
    id: "jc4-dvh",
    grupo: "Janelas",
    nome: "Janela de correr 4 folhas — vidro DVH",
    pagina: 55,
    vidro: "dvh",
    perfis: [
      { codigo: "IN012", formula: ({ L }) => L - 30, qtd: 1, corte: R },
      { codigo: "IN013", formula: ({ L }) => L - 30, qtd: 1, corte: R },
      { codigo: "IN003", formula: ({ H }) => H, qtd: 2, corte: R },
      { codigo: "IN128", formula: ({ L }) => (L - 204.4) / 4, qtd: 8, corte: R },
      { codigo: "IN130", formula: ({ H }) => H - 48, qtd: 4, corte: R },
      { codigo: "IN037", formula: ({ H }) => H - 48, qtd: 1, corte: R },
      { codigo: "IN132", formula: ({ H }) => H - 48, qtd: 2, corte: R },
      { codigo: "RM021", formula: ({ L }) => L + 55, qtd: 2, corte: D },
      { codigo: "RM019", formula: ({ H }) => H + 53, qtd: 2, corte: D },
    ],
    vidros: [{ largura: ({ L }) => (L - 228) / 4, altura: ({ H }) => H - 162, qtd: 4 }],
    avisos: [
      "O catálogo imprime o IN128 como (L-204,4) com 8 peças. Aqui foi usado (L-204,4)/4, pela lógica das 4 folhas e do vidro. Confirme com o fornecedor.",
    ],
  },
  {
    id: "pc3-templado",
    grupo: "Portas",
    nome: "Porta de correr 3 folhas — vidro temperado (semi-reforçada)",
    pagina: 56,
    vidro: "templado",
    perfis: [
      { codigo: "IN021", formula: ({ L }) => L - 30, qtd: 1, corte: R },
      { codigo: "IN052", formula: ({ L }) => L - 30, qtd: 1, corte: R },
      { codigo: "IN005", formula: ({ L }) => (L - 200) / 3, qtd: 6, corte: R },
      { codigo: "IN102", formula: ({ H }) => H, qtd: 2, corte: R },
      { codigo: "IN037", formula: ({ H }) => H, qtd: 2, corte: "\\-|", nota: "ajustar na obra" },
      { codigo: "IN079", formula: ({ H }) => H - 46, qtd: 2, corte: R },
      { codigo: "IN007", formula: ({ H }) => H - 46, qtd: 1, corte: R },
      { codigo: "IN010", formula: ({ H }) => H - 46, qtd: 1, corte: R },
      { codigo: "IN008", formula: ({ H }) => H - 46, qtd: 1, corte: R },
      { codigo: "IN009", formula: ({ H }) => H - 46, qtd: 1, corte: R },
      { codigo: "IN017", formula: ({ L }) => (L - 200) / 3, qtd: 6, corte: R },
      { codigo: "IN018", formula: ({ H }) => H - 246, qtd: 6, corte: R },
      { codigo: "RM021", formula: ({ L }) => L + 55, qtd: 2, corte: D },
      { codigo: "RM019", formula: ({ H }) => H + 53, qtd: 2, corte: D },
    ],
    vidros: [{ largura: ({ L }) => (L - 218) / 3, altura: ({ H }) => H - 228, qtd: 3 }],
    avisos: ["O catálogo indica o IN037 como \"H (ajustar)\": confira o comprimento na montagem."],
  },
  {
    id: "pc3-dvh",
    grupo: "Portas",
    nome: "Porta de correr 3 folhas — vidro DVH (semi-reforçada)",
    pagina: 57,
    vidro: "dvh",
    perfis: [
      { codigo: "IN021", formula: ({ L }) => L - 30, qtd: 1, corte: R },
      { codigo: "IN052", formula: ({ L }) => L - 30, qtd: 1, corte: R },
      { codigo: "IN129", formula: ({ L }) => (L - 148) / 3, qtd: 6, corte: R },
      { codigo: "IN102", formula: ({ H }) => H, qtd: 2, corte: R },
      { codigo: "IN037", formula: ({ H }) => H, qtd: 2, corte: "\\-|", nota: "ajustar na obra" },
      { codigo: "IN139", formula: ({ H }) => H - 46, qtd: 2, corte: R },
      { codigo: "IN132", formula: ({ H }) => H - 46, qtd: 2, corte: R },
      { codigo: "IN131", formula: ({ H }) => H - 46, qtd: 2, corte: R },
      { codigo: "RM021", formula: ({ L }) => L + 55, qtd: 2, corte: D },
      { codigo: "RM019", formula: ({ H }) => H + 53, qtd: 2, corte: D },
    ],
    vidros: [{ largura: ({ L }) => (L - 166) / 3, altura: ({ H }) => H - 224, qtd: 3 }],
    avisos: ["O catálogo indica o IN037 como \"H (ajustar)\": confira o comprimento na montagem."],
  },
  {
    id: "jp-45",
    grupo: "Janelas",
    nome: "Janela projetante — corte a 45°",
    pagina: 58,
    vidro: "livre",
    perfis: [
      { codigo: "IN056", formula: ({ L }) => L, qtd: 2, corte: D },
      { codigo: "IN056", formula: ({ H }) => H, qtd: 2, corte: D },
      { codigo: "IN058", formula: ({ L }) => L - 57, qtd: 1, corte: D },
      { codigo: "IN061", formula: ({ L }) => L - 26, qtd: 1, corte: D },
      { codigo: "IN061", formula: ({ H }) => H - 26, qtd: 2, corte: D },
      { codigo: "IN055", formula: ({ L }) => L, qtd: 1, corte: R },
      { codigo: "IN017", formula: ({ L }) => L - 96, qtd: 2, corte: R },
      { codigo: "IN018", formula: ({ H }) => H - 120, qtd: 2, corte: R },
      { codigo: "RM019", formula: ({ L }) => L + 55, qtd: 2, corte: D },
      { codigo: "RM019", formula: ({ H }) => H + 55, qtd: 2, corte: D },
    ],
    vidros: [{ largura: ({ L }) => L - 102, altura: ({ H }) => H - 102, qtd: 2 }],
    avisos: [
      "O catálogo indica 2 vidros, mas os contravidros (IN017 ×2 e IN018 ×2) cobrem só 1 vidro. Confirme a quantidade com o fornecedor antes de pedir.",
    ],
  },
  {
    id: "jp-reto",
    grupo: "Janelas",
    nome: "Janela projetante — corte reto",
    pagina: 59,
    vidro: "livre",
    perfis: [
      { codigo: "IN056", formula: ({ L }) => L, qtd: 2, corte: D },
      { codigo: "IN056", formula: ({ H }) => H, qtd: 2, corte: D },
      { codigo: "IN057", formula: ({ L }) => L - 96, qtd: 1, corte: R },
      { codigo: "IN060", formula: ({ L }) => L - 96, qtd: 1, corte: R },
      { codigo: "IN061", formula: ({ H }) => H - 44.7, qtd: 2, corte: R },
      { codigo: "IN055", formula: ({ L }) => L, qtd: 1, corte: R },
      { codigo: "IN017", formula: ({ L }) => L - 96, qtd: 2, corte: R },
      { codigo: "IN018", formula: ({ H }) => H - 120, qtd: 2, corte: R },
      { codigo: "RM019", formula: ({ L }) => L + 55, qtd: 2, corte: D },
      { codigo: "RM019", formula: ({ H }) => H + 55, qtd: 2, corte: D },
    ],
    vidros: [{ largura: ({ L }) => L - 102, altura: ({ H }) => H - 102, qtd: 2 }],
    avisos: [
      "O catálogo indica 2 vidros, mas os contravidros (IN017 ×2 e IN018 ×2) cobrem só 1 vidro. Confirme a quantidade com o fornecedor antes de pedir.",
    ],
  },
  {
    id: "pa1",
    grupo: "Portas",
    nome: "Porta de abrir 1 folha (batente simples)",
    pagina: 60,
    vidro: "livre",
    usaEixo: true,
    perfis: [
      { codigo: "IN065", formula: ({ L }) => L, qtd: 1, corte: D },
      { codigo: "IN065", formula: ({ H }) => H, qtd: 1, corte: "\\-|" },
      { codigo: "IN065", formula: ({ H }) => H, qtd: 1, corte: "|-/" },
      { codigo: "IN066", formula: ({ H }) => H - 40, qtd: 2, corte: R },
      { codigo: "IN005", formula: ({ L }) => L - 162, qtd: 1, corte: R },
      { codigo: "IN004", formula: ({ L }) => L - 162, qtd: 1, corte: R },
      { codigo: "IN015", formula: ({ L }) => L - 162, qtd: 1, corte: R },
      { codigo: "IN017", formula: ({ L }) => L - 162, qtd: 4, corte: R },
      { codigo: "IN018", formula: ({ E }) => E - 138, qtd: 2, corte: R, nota: "Ma" },
      { codigo: "IN018", formula: ({ H, E }) => H - E - 109, qtd: 2, corte: R, nota: "Mb" },
      { codigo: "RM019", formula: ({ L }) => L + 55, qtd: 1, corte: D },
      { codigo: "RM019", formula: ({ H }) => H + 27.5, qtd: 1, corte: "\\-|" },
      { codigo: "RM019", formula: ({ H }) => H + 27.5, qtd: 1, corte: "|-/" },
    ],
    vidros: [
      { rotulo: "Va (parte de baixo)", largura: ({ L }) => L - 168, altura: ({ E }) => E - 120, qtd: 1 },
      { rotulo: "Vb (parte de cima)", largura: ({ L }) => L - 168, altura: ({ H, E }) => H - E - 91, qtd: 1 },
    ],
    avisos: [
      "\"Eje\" é a altura do travessão central. Informe o valor do projeto; o campo vem preenchido com a metade da altura só como sugestão.",
    ],
  },
  {
    id: "pa2",
    grupo: "Portas",
    nome: "Porta de abrir 2 folhas (batente duplo)",
    pagina: 61,
    vidro: "livre",
    usaEixo: true,
    perfis: [
      { codigo: "IN065", formula: ({ L }) => L, qtd: 1, corte: D },
      { codigo: "IN065", formula: ({ H }) => H, qtd: 1, corte: "\\-|" },
      { codigo: "IN065", formula: ({ H }) => H, qtd: 1, corte: "|-/" },
      { codigo: "IN066", formula: ({ H }) => H - 40, qtd: 4, corte: R },
      { codigo: "IN203", formula: ({ H }) => H - 40, qtd: 1, corte: R },
      { codigo: "IN005", formula: ({ L }) => (L - 270) / 2, qtd: 2, corte: R },
      { codigo: "IN004", formula: ({ L }) => (L - 270) / 2, qtd: 2, corte: R },
      { codigo: "IN015", formula: ({ L }) => (L - 270) / 2, qtd: 2, corte: R },
      { codigo: "IN017", formula: ({ L }) => (L - 270) / 2, qtd: 8, corte: R },
      { codigo: "IN018", formula: ({ E }) => E - 138, qtd: 4, corte: R, nota: "Ma" },
      { codigo: "IN018", formula: ({ H, E }) => H - E - 109, qtd: 4, corte: R, nota: "Mb" },
      { codigo: "RM025", formula: ({ L }) => L + 57, qtd: 1, corte: D },
      { codigo: "RM025", formula: ({ H }) => H + 27.5, qtd: 1, corte: "\\-|" },
      { codigo: "RM025", formula: ({ H }) => H + 27.5, qtd: 1, corte: "|-/" },
      { codigo: "IN049", formula: ({ L }) => (L - 64) / 2, qtd: 2, corte: R },
    ],
    vidros: [
      { rotulo: "Va (parte de baixo)", largura: ({ L }) => (L - 282) / 2, altura: ({ E }) => E - 120, qtd: 2 },
      { rotulo: "Vb (parte de cima)", largura: ({ L }) => (L - 282) / 2, altura: ({ H, E }) => H - E - 91, qtd: 2 },
    ],
    avisos: [
      "\"Eje\" é a altura do travessão central. Informe o valor do projeto; o campo vem preenchido com a metade da altura só como sugestão.",
    ],
  },
];

export const DESCRICAO_CORTE: Record<string, string> = {
  "|-|": "reto",
  "\\-/": "45° nas 2 pontas",
  "\\-|": "45° numa ponta",
  "|-/": "45° numa ponta",
};
