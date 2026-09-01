import type { ImportPreviewItem, TransactionType } from '@/types';

export interface ParsedOfxTransaction {
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  origem: string;
}

/**
 * Converte números em formato brasileiro ("1.234,56") ou internacional
 * ("1,234.56" / "1234.56"). A heurística usa a posição do último separador.
 */
export function parseAmount(raw: string): number {
  const cleaned = (raw ?? '').replace(/[^\d.,+-]/g, '').trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized: string;
  if (lastComma > lastDot) {
    // Vírgula é o separador decimal: remove os pontos de milhar.
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Ponto é o separador decimal: remove as vírgulas de milhar.
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

/** Aceita AAAAMMDD (OFX), ISO, dd/mm/aaaa e dd-mm-aaaa. */
export function normalizeDate(raw: string): string {
  const value = (raw ?? '').trim();
  if (!value) return new Date().toISOString();

  const ofx = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) {
    const [, year, month, day] = ofx;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const brazilian = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brazilian) {
    const [, day, month, rawYear] = brazilian;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    const parsed = new Date(year, Number(month) - 1, Number(day));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString();

  return new Date().toISOString();
}

/** Extrai um campo simples de um bloco OFX (tags não fechadas incluídas). */
function ofxField(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
  return match?.[1]?.trim() || undefined;
}

export function parseOfxContent(content: string): ParsedOfxTransaction[] {
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];

  return blocks
    .map((block) => {
      const amount = parseAmount(ofxField(block, 'TRNAMT') ?? '0');
      const description = (ofxField(block, 'NAME') ?? ofxField(block, 'MEMO') ?? 'Transação importada')
        .replace(/\s+/g, ' ')
        .trim();
      const tipoOfx = ofxField(block, 'TRNTYPE')?.toUpperCase();

      // TRNAMT já vem sinalizado; TRNTYPE serve de reforço quando o sinal falta.
      const isCredit = amount > 0 || (amount === 0 && tipoOfx === 'CREDIT');

      return {
        data_transacao: normalizeDate(ofxField(block, 'DTPOSTED') ?? ''),
        descricao: description,
        valor: Math.abs(amount),
        tipo: (isCredit ? 'RECEITA' : 'DESPESA') as TransactionType,
        origem: 'OFX',
      };
    })
    .filter((item) => item.valor > 0);
}

function detectDelimiter(line: string): string {
  const candidates = [';', ',', '\t', '|'];
  return candidates.reduce((best, candidate) => {
    const count = line.split(candidate).length;
    return count > line.split(best).length ? candidate : best;
  }, ';');
}

function splitRow(row: string, delimiter: string): string[] {
  // Divide respeitando campos entre aspas duplas.
  const result: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];

    if (char === '"') {
      if (quoted && row[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseCsvContent(content: string): ParsedOfxTransaction[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];

  const delimiter = detectDelimiter(lines[0]);
  const header = splitRow(lines[0], delimiter).map((value) => value.toLowerCase());

  const hasHeader = header.some((cell) => /data|date|descri|valor|amount|hist/.test(cell));
  const rows = hasHeader ? lines.slice(1) : lines;

  const indexOf = (candidates: string[], fallback: number) => {
    if (!hasHeader) return fallback;
    const found = header.findIndex((cell) => candidates.some((candidate) => cell.includes(candidate)));
    return found >= 0 ? found : fallback;
  };

  const dateIndex = indexOf(['data', 'date'], 0);
  const descriptionIndex = indexOf(['descri', 'hist', 'memo', 'lanç', 'lanc'], 1);
  const amountIndex = indexOf(['valor', 'amount', 'montante'], 2);

  return rows
    .map((row) => {
      const columns = splitRow(row, delimiter);
      const amount = parseAmount(columns[amountIndex] ?? '0');

      return {
        data_transacao: normalizeDate(columns[dateIndex] ?? ''),
        descricao: (columns[descriptionIndex] || 'Transação importada').replace(/\s+/g, ' ').trim(),
        valor: Math.abs(amount),
        tipo: (amount >= 0 ? 'RECEITA' : 'DESPESA') as TransactionType,
        origem: 'CSV',
      };
    })
    .filter((item) => item.valor > 0);
}

export async function parseBankStatement(file: File): Promise<ImportPreviewItem[]> {
  const content = await file.text();
  const parser = file.name.toLowerCase().endsWith('.ofx') ? parseOfxContent : parseCsvContent;
  const parsed = parser(content);

  return parsed.map((item, index) => ({
    id: `${file.name}-${index}`,
    data_transacao: item.data_transacao,
    descricao: item.descricao,
    valor: item.valor,
    tipo: item.tipo,
    status: 'PENDENTE',
    origem: item.origem,
  }));
}
