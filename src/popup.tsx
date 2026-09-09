import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Icon } from './components/Icon';
import { getSettings } from './lib/storage';
import { applyTheme, watchSystemTheme } from './lib/theme';

function Popup() {
  React.useEffect(() => {
    let cleanup = () => {};
    getSettings().then(({ theme }) => { applyTheme(theme); cleanup = watchSystemTheme(theme); });
    return () => cleanup();
  }, []);
  const openReader = () => { chrome.tabs.create({ url: chrome.runtime.getURL('reader.html') }); window.close(); };
  const openSettings = () => { chrome.runtime.openOptionsPage(); window.close(); };
  return <div style={{width:320,padding:18,background:'var(--surface)'}}><div className="brand" style={{padding:'0 0 14px'}}><img className="brand-logo" src="images/logo.png" alt="Context Reader logo"/><div><div className="brand-name">Context Reader</div><div className="sidebar-sub" style={{color:'var(--muted)'}}>Read. Notice. Understand.</div></div></div><p style={{fontSize:13,lineHeight:1.5,color:'var(--muted)',margin:'4px 0 17px'}}>Open a PDF in the reader, then highlight any word to get its meaning in context.</p><button className="primary-btn" style={{width:'100%',marginBottom:8}} onClick={openReader}><Icon name="book" size={15}/> Open Reader</button><button className="ghost-btn" style={{width:'100%'}} onClick={openSettings}><Icon name="settings" size={14}/> Settings & API key</button></div>;
}
createRoot(document.getElementById('root')!).render(<Popup/>);
