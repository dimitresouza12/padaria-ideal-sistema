import ExcelJS from 'exceljs';

export interface ColunaXLSX {
  titulo: string;
  chave: string;
  largura?: number;
  formato?: string; // number format do Excel, ex: '#,##0.00'
}

/**
 * Gera um .xlsx estilizado (cabeçalho escuro com texto branco em negrito,
 * mesmo padrão visual usado nas planilhas de referência do cliente) e
 * dispara o download no navegador.
 */
export async function baixarXLSX(
  nomeArquivo: string,
  nomeAba: string,
  colunas: ColunaXLSX[],
  linhas: Record<string, string | number>[],
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nomeAba, { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = colunas.map((c) => ({
    header: c.titulo,
    key: c.chave,
    width: c.largura ?? Math.max(12, c.titulo.length + 4),
    style: c.formato ? { numFmt: c.formato } : undefined,
  }));

  const header = ws.getRow(1);
  header.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6F4C2A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  linhas.forEach((linha) => {
    const row = ws.addRow(linha);
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10 };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
