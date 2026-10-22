// Acesso ao armazenamento do navegador sem quebrar a tela quando ele está bloqueado
// (modo privado, cookies desativados) ou quando o conteúdo salvo está corrompido.

function parseSeguro<T>(texto: string, padrao: T): T {
  try {
    return JSON.parse(texto) as T;
  } catch {
    return padrao;
  }
}

export function lerJSON<T>(chave: string, padrao: T): T {
  if (typeof window === "undefined") return padrao;
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto === null ? padrao : parseSeguro(bruto, padrao);
  } catch {
    return padrao;
  }
}

/** Retorna false quando não foi possível gravar (o sistema continua funcionando). */
export function gravarJSON(chave: string, valor: unknown): boolean {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}
