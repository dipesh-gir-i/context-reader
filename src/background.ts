import { explainViaProvider } from './lib/ai';
import { getApiKey, getSettings } from './lib/storage';
import type { LookupContext } from './types';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('settings').then((result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: { provider: 'dummy', model: 'dummy-local', rememberKey: false, theme: 'system', panelOpen: true, panelWidth: 360 } });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'EXPLAIN_WORD') {
    (async () => {
      const settings = await getSettings();
      const apiKey = await getApiKey();
      if (settings.provider !== 'dummy' && !apiKey) throw new Error('AI is not configured yet. Add an API key in Settings.');
      const answer = await explainViaProvider(settings.provider, settings.model, apiKey ?? '', message.context as LookupContext);
      return answer;
    })().then((answer) => sendResponse({ ok: true, answer })).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }));
    return true;
  }
  if (message?.type === 'TEST_API') {
    (async () => {
      const context = { word: 'intricate', sentence: 'The intricate apparatus took hours to assemble.', paragraph: 'The team built a delicate device. The intricate apparatus took hours to assemble.', page: 1, documentTitle: 'Connection test', mode: 'contextual_meaning' as const };
      const answer = await explainViaProvider(message.provider, message.model, message.apiKey, context);
      return answer;
    })().then((answer) => sendResponse({ ok: true, answer })).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Connection failed' }));
    return true;
  }
});
