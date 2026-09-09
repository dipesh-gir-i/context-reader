import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { getApiKey, getSettings, saveSettings } from './lib/storage';
import type { AppSettings, ProviderId } from './types';

const providers: Record<ProviderId, { label: string; models: string[]; note: string }> = {
  dummy: { label: 'Dummy (development)', models: ['dummy-local'], note: 'Runs locally with deterministic sample answers. No API key or network request is required.' },
  gemini: { label: 'Google Gemini', models: ['gemini-3.6-flash'], note: 'Uses the Gemini generateContent endpoint.' },
  nvidia: { label: 'NVIDIA NIM', models: ['muse/glimmer-30b', 'moonshotai/kimi-k3', 'deepseek-ai/deepseek-v4-flash-0731'], note: 'Uses NVIDIA NIM’s OpenAI-compatible chat completions endpoint.' }
};

function Settings() {
  const [settings, setSettings] = useState<AppSettings>({ provider:'dummy',model:'dummy-local',rememberKey:false,theme:'system',panelOpen:true,panelWidth:360 });
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    Promise.all([getSettings(), getApiKey()]).then(([storedSettings, storedApiKey]) => {
      setSettings(storedSettings);
      if (storedApiKey) setApiKey(storedApiKey);
    });
  }, []);
  const provider = providers[settings.provider];
  const update = <K extends keyof AppSettings>(key:K,value:AppSettings[K]) => setSettings((s) => ({...s,[key]:value}));
  const test = async () => {
    const key = apiKey.trim();
    if (settings.provider !== 'dummy' && !key) { setMessage('Enter an API key first.'); return; }
    setTesting(true); setMessage('Testing connection…');
    chrome.runtime.sendMessage({ type:'TEST_API', provider:settings.provider, model:settings.model, apiKey: key }, (res) => {
      setTesting(false); setMessage(res?.ok ? 'Connection works. You are ready to read.' : (res?.error || 'Connection failed.'));
    });
  };
  const save = async () => { await saveSettings({...settings, apiKey: apiKey.trim() || undefined}); setMessage('Saved.'); };
  return <div className="page" style={{maxWidth:820}}><div className="eyebrow">Context Reader / Settings</div><h1 style={{marginTop:7}}>Set up your reading companion.</h1><p className="page-intro">Bring your own AI key. Context Reader sends only the selected word and nearby text to your configured provider. There is no Context Reader backend.</p>
    <div className="setting-card"><div className="setting-row"><div><div className="setting-label">AI provider</div><div className="setting-hint">Choose where contextual explanations are generated.</div></div><select className="control" value={settings.provider} onChange={(e)=>{const provider=e.target.value as ProviderId; update('provider',provider); update('model',providers[provider].models[0]);}}>{Object.entries(providers).map(([id,p])=><option value={id} key={id}>{p.label}</option>)}</select></div>
      <div className="setting-row"><div><div className="setting-label">Model</div><div className="setting-hint">A fast model keeps word lookups feeling instant.</div></div><select className="control" value={settings.model} onChange={(e)=>update('model',e.target.value)}>{provider.models.map(m=><option key={m}>{m}</option>)}</select></div>
      <div className="setting-row"><div><div className="setting-label">API key</div><div className="setting-hint">Stored only in the extension's storage. Chrome's local storage is not encrypted, so use a key you are comfortable managing locally.</div></div><div className="password-wrap"><input className="control" type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste your key"/><button className="icon-btn" onClick={()=>setShowKey(v=>!v)}>{showKey?'Hide':'Show'}</button></div></div>
      <div className="setting-row"><div><div className="setting-label">Remember key on this device</div><div className="setting-hint">Off keeps the key in session storage when possible. On persists it locally.</div></div><label className="toggle"><input type="checkbox" checked={settings.rememberKey} onChange={e=>update('rememberKey',e.target.checked)}/> Keep key</label></div>
      <div className="setting-row"><div><div className="setting-label">Context panel</div><div className="setting-hint">The AI panel stays beside the reader so the meaning remains connected to what you are reading.</div></div><label className="toggle"><input type="checkbox" checked={settings.panelOpen} onChange={e=>update('panelOpen',e.target.checked)}/> Open by default</label></div>
      <div className="setting-row"><div><div className="setting-label">Panel width</div><div className="setting-hint">Adjust the amount of reading space the Context AI panel occupies.</div></div><div className="range-control"><input className="control" type="range" min="320" max="460" step="10" value={settings.panelWidth} onChange={e=>update('panelWidth',Number(e.target.value))}/><output>{settings.panelWidth}px</output></div></div>
      <div style={{display:'flex',gap:8,paddingTop:15}}><button className="primary-btn" onClick={save}>Save settings</button><button className="ghost-btn" onClick={test} disabled={testing}>{testing?'Testing…':'Test connection'}</button></div>
      {message && <div className={`status ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? 'error' : message === 'Saved.' || message.includes('works') ? 'success' : ''}`} style={{marginTop:15}}>{message}</div>}
    </div>
    <div className="setting-card"><div className="setting-label">Provider notes</div><div className="notice">{provider.note}</div></div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Settings/>);
