import type { ContextAnswer, LookupContext, ProviderId } from '../types';

const systemPrompt = `You explain what a word means in the exact context where a reader encountered it.\n\nReturn ONLY valid JSON with these fields:\nword, meaning, simplerExplanation, whyItMatters, confidence.\n\nRules:\n- Prefer the contextual sense over a generic dictionary sense.\n- Use plain, concise language.\n- meaning: one sentence, ideally under 24 words.\n- simplerExplanation: one short sentence a learner could understand.\n- whyItMatters: briefly connect the meaning to the surrounding sentence.\n- confidence: number from 0 to 1.\n- If context is ambiguous, say so briefly instead of inventing certainty.\n- Never discuss your own process.`;

function payload(c: LookupContext) {
  return `${systemPrompt}\n\nContext:\n${JSON.stringify(c)}`;
}

function parseAnswer(raw: string, fallbackWord: string): ContextAnswer {
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  const json = JSON.parse(clean.slice(start >= 0 ? start : 0, end >= 0 ? end + 1 : undefined));
  return {
    word: String(json.word ?? fallbackWord),
    meaning: String(json.meaning ?? ''),
    simplerExplanation: String(json.simplerExplanation ?? ''),
    whyItMatters: String(json.whyItMatters ?? ''),
    confidence: Math.max(0, Math.min(1, Number(json.confidence ?? 0.5)))
  };
}

function explainWithDummy(context: LookupContext): ContextAnswer {
  return {
    word: context.word,
    meaning: `A development answer for “${context.word}” based on this passage.`,
    simplerExplanation: `In simple terms, “${context.word}” is being used as part of the idea in this sentence.`,
    whyItMatters: `The word appears in: “${context.sentence}”`,
    confidence: 0.5
  };
}

async function providerError(response: Response): Promise<Error> {
  let detail = '';
  try {
    const body = await response.json() as { error?: { message?: string } | string };
    detail = typeof body.error === 'string' ? body.error : body.error?.message ?? '';
  } catch {
    detail = await response.text().catch(() => '');
  }
  return new Error(`AI provider error (${response.status})${detail ? `: ${detail}` : ''}`);
}

export async function explainViaProvider(provider: ProviderId, model: string, apiKey: string, context: LookupContext): Promise<ContextAnswer> {
  if (provider === 'dummy') return explainWithDummy(context);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: payload(context) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } })
  });
  if (!response.ok) throw await providerError(response);
  const data = await response.json();
  return parseAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '', context.word);
}
