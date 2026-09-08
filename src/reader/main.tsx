import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import '../styles.css';
import { Icon } from '../components/Icon';
import { cleanSelectedWord, extractContext } from '../lib/context';
import { getDocuments, getLookups, getSavedWords, getSettings, saveDocument, saveLookup, saveWord } from '../lib/storage';
import type { AppSettings, ContextAnswer, DocumentRecord, LookupContext, Lookup, SavedWord } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

type PageData = { text: string; width: number; height: number };

function App() {
  const [settings, setSettings] = useState<AppSettings>({ provider: 'dummy', model: 'dummy-local', rememberKey: false, theme: 'system', panelOpen: true, panelWidth: 360 });
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [documentTitle, setDocumentTitle] = useState('No document');
  const [documentId, setDocumentId] = useState('');
  const [answer, setAnswer] = useState<ContextAnswer | null>(null);
  const [selection, setSelection] = useState('');
  const [context, setContext] = useState<LookupContext | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [statusText, setStatusText] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<'reader' | 'saved' | 'history'>('reader');
  const [saved, setSaved] = useState<SavedWord[]>([]);
  const [history, setHistory] = useState<Lookup[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<any>(null);
  const pdfDataRef = useRef<ArrayBuffer | null>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const textSpansRef = useRef<HTMLSpanElement[]>([]);
  const pageTextRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const [settingsValue, savedWords, lookups, documentRecords] = await Promise.all([getSettings(), getSavedWords(), getLookups(), getDocuments()]);
      if (cancelled) return;
      setSettings(settingsValue); setPanelOpen(settingsValue.panelOpen);
      setSaved(savedWords); setHistory(lookups); setDocuments(documentRecords);

      const recentDocument = documentRecords.find((document) => document.pdfData);
      if (!recentDocument?.pdfData) return;
      const storedPdfData = recentDocument.pdfData.slice(0);
      const doc = await pdfjsLib.getDocument({ data: storedPdfData }).promise;
      if (cancelled) return;
      const restoredPage = Math.min(Math.max(recentDocument.currentPage ?? 1, 1), doc.numPages);
      pdfRef.current = doc;
      pdfDataRef.current = recentDocument.pdfData;
      setDocumentId(recentDocument.id); setDocumentTitle(recentDocument.name); setPageCount(doc.numPages); setPageNum(restoredPage); setPageInput(String(restoredPage));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!cancelled) await renderPage(doc, restoredPage);
    };
    initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const raw = sel.toString().trim();
      if (!raw) return;
      const anchor = sel.anchorNode;
      if (!pageContainerRef.current?.contains(anchor ?? null)) return;
      const word = cleanSelectedWord(raw);
      if (!word) return;
      const { sentence, paragraph } = extractContext(pageTextRef.current, raw);
      const lookupContext: LookupContext = { word, sentence, paragraph, page: pageNum, documentTitle, mode: 'contextual_meaning' };
      setSelection(word);
      setContext(lookupContext);
      setAnswer(null);
      setStatus('loading');
      setStatusText('Analyzing context…');
      setPanelOpen(true);
      chrome.runtime.sendMessage({ type: 'EXPLAIN_WORD', context: lookupContext }, (response) => {
        if (chrome.runtime.lastError) { setStatus('error'); setStatusText(chrome.runtime.lastError.message || 'Extension error'); return; }
        if (!response?.ok) { setStatus('error'); setStatusText(response?.error || 'Could not explain this word.'); return; }
        setAnswer(response.answer as ContextAnswer);
        setStatus('success');
        setStatusText('Explained from the surrounding context.');
        const lookup: Lookup = { id: crypto.randomUUID(), word, documentId, documentTitle, page: pageNum, sentence, context: paragraph, explanation: response.answer, createdAt: Date.now() };
        saveLookup(lookup).then(() => getLookups().then(setHistory));
      });
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [documentId, documentTitle, pageNum]);

  const openFile = async (file: File) => {
    setView('reader');
    setStatus('loading'); setStatusText('Opening PDF…');
    setDocumentTitle(file.name); setAnswer(null); setSelection('');
    const buffer = await file.arrayBuffer();
    const storedPdfData = buffer.slice(0);
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    pdfRef.current = doc;
    pdfDataRef.current = storedPdfData;
    const id = crypto.randomUUID();
    setDocumentId(id); setPageCount(doc.numPages); setPageNum(1); setPageInput('1'); setZoomLevel(1);
    await saveDocument({ id, name: file.name, pageCount: doc.numPages, currentPage: 1, pdfData: pdfDataRef.current, createdAt: Date.now() });
    setDocuments(await getDocuments());
    await renderPage(doc, 1);
    setStatus('idle'); setStatusText('');
  };

  const renderPage = async (doc: any, number: number, requestedZoom = zoomLevel) => {
    const page = await doc.getPage(number);
    const fitScale = Math.min(1.5, Math.max(1.05, (window.innerWidth - (panelOpen ? settings.panelWidth : 0) - 320) / 760));
    const scale = Math.min(4, Math.max(.5, fitScale * requestedZoom));
    const viewport = page.getViewport({ scale });
    const canvas = document.querySelector<HTMLCanvasElement>('#pdf-canvas');
    const layer = document.querySelector<HTMLDivElement>('#text-layer');
    if (!canvas || !layer) return;
    canvas.width = Math.floor(viewport.width * devicePixelRatio);
    canvas.height = Math.floor(viewport.height * devicePixelRatio);
    canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const textContent = await page.getTextContent();
    pageTextRef.current = textContent.items.map((i: any) => i.str).join(' ');
    layer.innerHTML = '';
    textSpansRef.current = [];
    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.max(5, Math.hypot(tx[2], tx[3]));
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.left = `${tx[4]}px`;
      span.style.top = `${tx[5] - fontHeight}px`;
      span.style.fontSize = `${fontHeight}px`;
      span.style.height = `${fontHeight}px`;
      span.style.transform = `scaleX(${Math.max(.6, Math.abs(tx[0]) / (fontHeight || 1))})`;
      layer.appendChild(span);
      textSpansRef.current.push(span);
    }
    setPageData({ text: pageTextRef.current, width: viewport.width, height: viewport.height });
  };

  const goToPage = async (next: number) => {
    if (!pdfRef.current || next < 1 || next > pageCount) return;
    setPageNum(next); setPageInput(String(next)); setAnswer(null); setSelection(''); setContext(null); setStatus('idle');
    if (documentId && pdfDataRef.current) {
      void saveDocument({ id: documentId, name: documentTitle, pageCount, currentPage: next, pdfData: pdfDataRef.current, createdAt: Date.now() });
    }
    await renderPage(pdfRef.current, next);
    pageContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitPageInput = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageInput, 10);
    if (Number.isInteger(requestedPage)) goToPage(requestedPage);
    else setPageInput(String(pageNum));
  };

  const changeZoom = async (delta: number) => {
    if (!pdfRef.current) return;
    const nextZoom = Math.min(2.5, Math.max(.5, Number((zoomLevel + delta).toFixed(2))));
    if (nextZoom === zoomLevel) return;
    setZoomLevel(nextZoom);
    await renderPage(pdfRef.current, pageNum, nextZoom);
  };

  const saveCurrent = async () => {
    if (!answer || !context || !documentId) return;
    const item: SavedWord = { id: crypto.randomUUID(), word: context.word, documentId, documentTitle, page: pageNum, sentence: context.sentence, explanation: answer, createdAt: Date.now() };
    await saveWord(item); setSaved(await getSavedWords()); setStatus('success'); setStatusText('Saved to your reading memory.');
  };

  const selectRecent = async (item: SavedWord | Lookup) => {
    const doc = documents.find((d) => d.id === item.documentId);
    if (!doc) { setStatus('error'); setStatusText('This document is no longer open in this session.'); return; }
    setStatus('error'); setStatusText('Reopen the PDF to jump back to this saved location.');
    setView('reader');
  };

  const openSettings = () => window.open(chrome.runtime.getURL('settings.html'), '_blank');

  const nav = useMemo(() => [
    { id: 'reader', label: 'Reader', icon: 'book' },
    { id: 'saved', label: 'Saved words', icon: 'bookmark' },
    { id: 'history', label: 'History', icon: 'history' }
  ] as const, []);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">CR</div><div><div className="brand-name">Context Reader</div><div className="sidebar-sub">Read. Notice. Understand.</div></div></div>
      <div className="section-label">Workspace</div>
      <nav className="nav">{nav.map((n) => <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>
      <div className="section-label">Document</div>
      <nav className="nav"><button onClick={() => inputRef.current?.click()}><Icon name="upload"/><span>Open PDF</span></button><button onClick={openSettings}><Icon name="settings"/><span>Settings</span></button></nav>
      <div className="sidebar-footer">Local-first by design. Your PDF stays in this browser. Only the selected word and nearby context are sent to your configured AI provider.</div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="top-title"><div className="eyebrow">{view === 'reader' ? 'Reader' : view === 'saved' ? 'Reading memory' : 'Recent lookups'}</div><div className="title">{view === 'reader' ? documentTitle : view === 'saved' ? 'Saved words' : 'History'}</div></div>
        <div className="toolbar">{view === 'reader' && <><button className="ghost-btn" onClick={() => inputRef.current?.click()}><Icon name="upload" size={14}/> Open PDF</button><button className="icon-btn mobile-only" onClick={() => setPanelOpen((v) => !v)} title="Toggle AI panel"><Icon name="panel"/></button></>}<button className="icon-btn" onClick={openSettings} title="Settings"><Icon name="settings"/></button></div>
      </header>
      <input ref={inputRef} className="hidden-input" type="file" accept="application/pdf,.pdf" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])}/>
      {view === 'reader' ? <div className="content">
        <section className="reader-pane">
          {pageCount === 0 ? <div className="reader-empty"><div className="drop"><div className="brand-mark" style={{margin:'0 auto 18px'}}>CR</div><h2>A quieter way to read.</h2><p>Select an unfamiliar word and Context Reader will explain what it means <em>here</em>, using the sentence and nearby context instead of a generic dictionary definition.</p><div className="drop-actions"><button className="primary-btn" onClick={() => inputRef.current?.click()}><Icon name="upload" size={15}/> Open a PDF</button><button className="ghost-btn" onClick={openSettings}>Configure AI</button></div></div></div> : <>
            <div className="reader-toolbar"><button className="icon-btn" onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1}><Icon name="chevronLeft"/></button><form className="page-jump" onSubmit={submitPageInput}><label htmlFor="page-input">page</label><input id="page-input" className="page-input" type="number" min="1" max={pageCount} value={pageInput} onChange={(event) => setPageInput(event.target.value)} aria-label={`Page number, ${pageCount} pages total`}/><span>/ {pageCount}</span></form><button className="icon-btn" onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= pageCount}><Icon name="chevronRight"/></button><span style={{width:1,height:18,background:'var(--line)',margin:'0 4px'}}></span><button className="icon-btn" onClick={() => changeZoom(-.1)} disabled={zoomLevel <= .5} title="Zoom out"><Icon name="minus"/></button><span className="zoom-label">{Math.round(zoomLevel * 100)}%</span><button className="icon-btn" onClick={() => changeZoom(.1)} disabled={zoomLevel >= 2.5} title="Zoom in"><Icon name="plus"/></button><button className="icon-btn" onClick={() => setPanelOpen((v) => !v)} title="Toggle Context AI"><Icon name="panel"/></button></div>
            <div className="reader-scroll"><div className="page-wrap"><div ref={pageContainerRef} className="pdf-page" style={{width:pageData?.width ?? 800,height:pageData?.height ?? 1100}}><canvas id="pdf-canvas"/><div id="text-layer" className="text-layer"/><div className="page-number">{pageNum}</div></div></div></div>
          </>}
        </section>
        <aside className={`panel ${panelOpen ? '' : 'hidden'}`} style={{width:settings.panelWidth}}>
          <div className="panel-head"><div><div className="panel-label">Context AI</div><div style={{fontWeight:700,marginTop:3}}>{selection || 'Select a word'}</div></div><button className="icon-btn" onClick={() => setPanelOpen(false)}><Icon name="x"/></button></div>
          <div className="panel-body">
            {!context && !answer && <div className="lookup-empty"><div className="empty-box"><div className="empty-title">Your reading companion is waiting.</div><div>Highlight a word in the PDF. Context Reader will look at the surrounding sentence and explain the sense that makes the most sense here.</div></div></div>}
            {context && <div className="word-card">
              <div className="word-head"><div className="word">{selection}</div><div className="badge">{status === 'loading' ? 'ANALYZING CONTEXT' : 'IN THIS PASSAGE'}</div></div>
              {status === 'loading' && <div className="field loading"><div className="field-label">Meaning</div><div className="field-copy">Reading the sentence…</div></div>}
              {answer && <><div className="field"><div className="field-label">Meaning in this passage</div><div className="field-copy">{answer.meaning}</div></div><div className="field"><div className="field-label">Same idea, simpler</div><div className="field-copy">{answer.simplerExplanation}</div></div><div className="field"><div className="field-label">Why it matters here</div><div className="field-copy">{answer.whyItMatters}</div></div></>}
              <div className="field"><div className="field-label">Sentence</div><div className="quote">“{context.sentence}”</div></div>
              <div className="actions"><button className="action-btn primary" onClick={saveCurrent} disabled={!answer}><Icon name="bookmark" size={13}/> Save</button><button className="action-btn" onClick={() => { if (context) setStatusText(`Page ${context.page} • ${context.documentTitle}`); }}>Ask about sentence</button></div>
              {statusText && <div className={`status ${status === 'error' ? 'error' : status === 'success' ? 'success' : ''}`}>{statusText}</div>}
            </div>}
          </div>
        </aside>
      </div> : <div className="library"><div className="page"><h1>{view === 'saved' ? 'Saved words' : 'History'}</h1><p className="page-intro">{view === 'saved' ? 'A lightweight memory of the words worth carrying forward.' : 'Your recent contextual lookups, kept locally in this browser.'}</p>{(view === 'saved' ? saved : history).length === 0 ? <div className="setting-card">Nothing here yet. Open a PDF and select a word.</div> : <div className="library-grid">{(view === 'saved' ? saved : history).map((item) => <button key={item.id} className="library-card" onClick={() => selectRecent(item)}><div className="card-title">{item.word}</div><div className="card-meta">{item.documentTitle} · p. {item.page}</div><p className="field-copy" style={{margin:'12px 0 0'}}>{item.explanation.meaning}</p></button>)}</div>}</div></div>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
