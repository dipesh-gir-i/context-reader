import type { ContextAnswer, LookupContext, ProviderId } from '../types';

const systemPrompt = `You are an AI reading assistant inside a PDF reader.

Your task is to explain the meaning of a selected word or phrase **based primarily on the context in which it appears**.

### Selected word
{{word}}

### Surrounding context
{{context}}

Analyze the selected word using the surrounding sentence and nearby paragraph. Do not rely on a generic dictionary definition if the context indicates a more specific meaning.

Return your answer as valid JSON with exactly these fields:

{
  "meaning": "A concise definition of what the word means in this specific context.",
  "explanation": "Explain how the surrounding context leads to this meaning. Keep it understandable and concise.",
  "example": "Give one short example sentence using the word with the same meaning."
}

Rules:

- Identify the meaning intended by the author in this specific passage.
- Prefer the contextual meaning over the most common dictionary meaning.
- Consider the grammatical role and surrounding words.
- If the word has multiple possible meanings, select the one best supported by the context.
- Do not invent facts that are not present or implied by the context.
- Do not repeat the entire passage.
- Keep the explanation concise and useful to someone reading the PDF.
- If the context is insufficient to determine the meaning confidently, say so rather than guessing.
- Preserve the original meaning of the word; do not unnecessarily simplify it into an inaccurate synonym.
- The example should demonstrate the same sense of the word, not a different meaning.
- Return JSON only. Do not include Markdown, code fences, or additional text.`;

function payload(c: LookupContext) {
  const context = `Sentence: ${c.sentence}\nParagraph: ${c.paragraph}`;
  return systemPrompt.replace('{{word}}', c.word).replace('{{context}}', context);
}

function parseAnswer(raw: string): ContextAnswer {
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  const json = JSON.parse(clean.slice(start >= 0 ? start : 0, end >= 0 ? end + 1 : undefined));
  return {
    meaning: String(json.meaning ?? ''),
    explanation: String(json.explanation ?? ''),
    example: String(json.example ?? '')
  };
}

function explainWithDummy(context: LookupContext): ContextAnswer {
  return {
    meaning: `A development answer for “${context.word}” based on this passage.`,
    explanation: `The surrounding sentence uses “${context.word}” in this specific sense.`,
    example: `The same idea appears when someone says, “${context.sentence}”`
  };
}

async function providerError(response: Response): Promise<Error> {
  let detail = '';
  try {
    const body = await response.json() as { error?: { message?: string } | string; detail?: string; message?: string; title?: string };
    detail = typeof body.error === 'string' ? body.error : body.error?.message ?? body.detail ?? body.message ?? body.title ?? '';
  } catch {
    detail = await response.text().catch(() => '');
  }
  return new Error(`AI provider error (${response.status})${detail ? `: ${detail}` : ''}`);
}

export async function explainViaProvider(provider: ProviderId, model: string, apiKey: string, context: LookupContext): Promise<ContextAnswer> {
  if (provider === 'dummy') return explainWithDummy(context);
  if (provider === 'openai' || provider === 'nvidia') {
    const endpoint = provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://integrate.api.nvidia.com/v1/chat/completions';
    const requestBody = { model, messages: [{ role: 'user', content: payload(context) }], ...(provider === 'nvidia' ? { temperature: 0.2, max_tokens: 512, stream: false } : /^o\d/.test(model) ? {} : { temperature: 0.2 }) };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw await providerError(response);
    const data = await response.json();
    return parseAnswer(data.choices?.[0]?.message?.content ?? '');
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: payload(context) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } })
  });
  if (!response.ok) throw await providerError(response);
  const data = await response.json();
  return parseAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}
