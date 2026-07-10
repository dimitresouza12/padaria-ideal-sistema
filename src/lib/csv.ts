/** Gera um CSV simples (separador ";", padrão de planilha PT-BR) e dispara o download. */
export function baixarCSV(nomeArquivo: string, colunas: string[], linhas: (string | number)[][]): void {
  const escapar = (v: string | number): string => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [colunas, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\n');
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
