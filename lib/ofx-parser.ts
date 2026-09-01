import type { ImportPreviewItem, TransactionType } from '@/types';

export interface ParsedOfxTransaction {
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  origem: string;
}

function normalizeDate(raw: string): string {
  const value = raw.trim();
  if (!value) return new Date().toISOString();

  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00`).toISOString();
  }

  const parsed = new Date(value.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})/, '$1-$2-$3'));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  return new Date().toISOString();
}

export function parseOfxContent(content: string): ParsedOfxTransaction[] {
  const regex = /<STMTTRN>[\s\S]*?<TRNAMT>([-+]?\d+(?:[.,]\d+)?)<\/TRNAMT>[\s\S]*?<DTPOSTED>(\d{8})<\/DTPOSTED>[\s\S]*?(?:<NAME>([\s\S]*?)<\/NAME>|<MEMO>([\s\S]*?)<\/MEMO>)/gi;
  const matches = Array.from(content.matchAll(regex));

  return matches.map((match) => {
    const rawValue = match[1].replace('.', '').replace(',', '.');
    const amount = Number.parseFloat(rawValue || '0');
    const description = (match[3] || match[4] || 'Transação importada').replace(/\s+/g, ' ').trim();

    return {
      data_transacao: normalizeDate(match[2]),
      descricao: description,
      valor: Math.abs(amount),
      tipo: amount >= 0 ? 'RECEITA' : 'DESPESA',
      origem: 'OFX',
    };
  });
}

export function parseCsvContent(content: string): ParsedOfxTransaction[] {
  const rows = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(1);

  return rows.map((row) => {
    const columns = row.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
    const [rawDate, rawDescription, rawValue] = columns;
    const date = normalizeDate(rawDate ?? new Date().toISOString());
    const value = Number.parseFloat((rawValue ?? '0').replace('.', '').replace(',', '.'));

    return {
      data_transacao: date,
      descricao: rawDescription ?? 'Transação importada',
      valor: Math.abs(value),
      tipo: value >= 0 ? 'RECEITA' : 'DESPESA',
      origem: 'CSV',
    };
  });
}

export async function parseBankStatement(file: File): Promise<ImportPreviewItem[]> {
  const content = await file.text();
  const parser = file.name.toLowerCase().endsWith('.ofx') ? parseOfxContent : parseCsvContent;
  const parsed = parser(content);

  return parsed.map((item, index) => ({
    id: `${file.name}-${index}-${Date.now()}`,
    data_transacao: item.data_transacao,
    descricao: item.descricao,
    valor: item.valor,
    tipo: item.tipo,
    status: 'PENDENTE',
    origem: item.origem,
  }));
}
