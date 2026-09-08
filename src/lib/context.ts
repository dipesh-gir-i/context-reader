export interface TextPage {
  page: number;
  text: string;
}

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').replace(/[\u2010-\u2015]/g, '-').trim();
}

function findBoundary(text: string, index: number, direction: -1 | 1) {
  const stops = /[.!?。！？](?:\s|$)/g;
  if (direction === -1) {
    const left = text.slice(0, index);
    let last = 0;
    for (const match of left.matchAll(stops)) last = (match.index ?? 0) + match[0].length;
    return last;
  }
  const right = text.slice(index);
  const match = stops.exec(right);
  return match ? index + match.index! + match[0].length : text.length;
}

export function extractContext(pageText: string, selected: string) {
  const text = normalize(pageText);
  const needle = normalize(selected);
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) {
    return { sentence: text.slice(0, 420), paragraph: text.slice(0, 900) };
  }
  const start = findBoundary(text, index, -1);
  const end = findBoundary(text, index + needle.length, 1);
  const sentence = text.slice(start, end).trim();
  const paragraphStart = Math.max(0, text.lastIndexOf('\n', index));
  const paragraph = text.slice(paragraphStart || Math.max(0, start - 260), Math.min(text.length, end + 500)).trim();
  return { sentence: sentence || text.slice(Math.max(0, index - 120), index + 320), paragraph: paragraph || text.slice(Math.max(0, index - 300), index + 700) };
}

export function cleanSelectedWord(text: string) {
  const cleaned = normalize(text).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’-]+$/gu, '');
  return cleaned.split(/\s+/)[0] || '';
}
