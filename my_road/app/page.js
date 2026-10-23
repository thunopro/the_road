'use client';

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';

const MOTIVATION_QUOTE = "Chẳng có gì xảy ra, cho đến khi bạn bắt đầu.";

// Memoized leaf components to isolate animations and avoid re-rendering entire dashboard
const TargetLockDisplay = memo(function TargetLockDisplay({ solvedCount, targetGoal }) {
  const [displayCount, setDisplayCount] = useState(0);
  const [glitchActive, setGlitchActive] = useState(true);
  const countRef = useRef(0);

  useEffect(() => {
    let startTime = performance.now();
    let initial = countRef.current;
    let timer = setTimeout(() => setGlitchActive(false), 700);
    let rafId;

    const animate = (now) => {
      let progress = Math.min(1, (now - startTime) / 1600);
      let eased = initial + (solvedCount - initial) * (1 - Math.pow(1 - progress, 3));
      setDisplayCount(eased);
      countRef.current = eased;
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [solvedCount]);

  const percentage = Math.min(100, (displayCount / targetGoal) * 100);

  return (
    <div className="tgt">
      <div className="tgt-head">
        <span className="dim">&gt; target_lock</span>
        <span className="tgt-count glitch">
          {glitchActive
            ? String(Math.floor(Math.random() * 9000 + 1000)).padStart(4, '0')
            : String(Math.round(displayCount)).padStart(4, '0')}
        </span>
        <span className="dim">/ {targetGoal} problems</span>
        <span className="tgt-pct">{percentage.toFixed(2)}%</span>
      </div>

      <div 
        className="tbar" 
        role="progressbar" 
        aria-valuenow={Math.round(displayCount)} 
        aria-valuemin={0} 
        aria-valuemax={targetGoal}
        aria-label="Universal Cup solved progress"
      >
        <div className="tbar-fill" style={{ width: `${percentage}%` }}></div>
        {[25, 50, 75].map(tick => (
          <i 
            key={tick} 
            className="tbar-tick" 
            style={{ left: `${tick}%` }}
            data-label={Math.round((targetGoal * tick) / 100)}
          />
        ))}
      </div>
    </div>
  );
});

const TypewriterQuote = memo(function TypewriterQuote() {
  const [quoteChars, setQuoteChars] = useState(0);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index++;
      setQuoteChars(index);
      if (index >= MOTIVATION_QUOTE.length) {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tgt-foot">
      <span className="tgt-quote">{MOTIVATION_QUOTE.slice(0, quoteChars)}</span>
      <span className="cursor"></span>
    </div>
  );
});

export default function MyRoadPage() {
  // Left Column State: Universal Cup / World Finals Road
  const [ucupData, setUcupData] = useState(null);
  const [ucupLoading, setUcupLoading] = useState(true);
  const [ucupError, setUcupError] = useState(null);

  // Right Column State: The World Daily Writing
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleContent, setArticleContent] = useState('');
  const [worldLoading, setWorldLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [articlesError, setArticlesError] = useState(null);
  const [syncingWorld, setSyncingWorld] = useState(false);
  const [worldSearch, setWorldSearch] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [crtEnabled, setCrtEnabled] = useState(false);

  const activeArticleRef = useRef(null);
  const syncTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch Universal Cup data
  const fetchUcup = async () => {
    setUcupLoading(true);
    setUcupError(null);
    try {
      const res = await fetch('/api/ucup?token=nguyenkhacthu');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUcupData(data);
    } catch (err) {
      console.error('UCUP fetch error:', err);
      setUcupError(err.message || 'Telemetry offline');
    } finally {
      setUcupLoading(false);
    }
  };

  // Fetch The World articles
  const fetchWorldArticles = async () => {
    setWorldLoading(true);
    setArticlesError(null);
    try {
      const res = await fetch('/api/articles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data.articles || [];
      setArticles(list);
      if (list.length > 0 && !selectedArticle) {
        loadWorldContent(list[0]);
      }
    } catch (err) {
      console.error('Error fetching world articles:', err);
      setArticlesError(err.message);
    } finally {
      setWorldLoading(false);
    }
  };

  const loadWorldContent = async (article) => {
    if (!article) return;
    setSelectedArticle(article);
    activeArticleRef.current = article.id;
    setContentLoading(true);
    try {
      const res = await fetch(`/api/articles?id=${encodeURIComponent(article.id)}`);
      const data = await res.json();
      if (activeArticleRef.current === article.id) {
        setArticleContent(res.ok ? data.content : `[Error] ${data.error || 'Failed to read file'}`);
      }
    } catch (e) {
      if (activeArticleRef.current === article.id) {
        setArticleContent(`[Error] Failed to read file: ${e.message}`);
      }
    } finally {
      if (activeArticleRef.current === article.id) {
        setContentLoading(false);
      }
    }
  };

  const syncWritingFolder = async () => {
    setSyncingWorld(true);
    setSyncMsg('Syncing writing...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMsg(`Synced ${data.count} file(s)`);
        setArticles(data.articles || []);
        if (selectedArticle) {
          const updated = data.articles?.find(a => a.id === selectedArticle.id);
          if (updated) {
            loadWorldContent(updated);
          } else if (data.articles?.length > 0) {
            loadWorldContent(data.articles[0]);
          } else {
            setSelectedArticle(null);
            setArticleContent('');
          }
        }
      } else {
        setSyncMsg(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      setSyncMsg(`Sync error: ${e.message}`);
    } finally {
      setSyncingWorld(false);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchUcup();
    fetchWorldArticles();
  }, []);

  const solvedCount = ucupData?.totalSolved ?? 0;
  const targetGoal = ucupData?.target || 1000;

  const filteredArticles = useMemo(() => {
    const q = worldSearch.toLowerCase();
    return (articles || []).filter(a =>
      (a?.name || '').toLowerCase().includes(q) ||
      (a?.title || '').toLowerCase().includes(q)
    );
  }, [articles, worldSearch]);

  return (
    <div className={`app-wrapper ${crtEnabled ? 'crt-mode' : ''}`}>
      {/* Universal Top Header */}
      <header className="global-header">
        <div className="header-brand">
          <span className="terminal-prompt">nguyenkhacthu@road<span className="dim">:~$</span></span>
          <span className="badge-wf">ROAD TO WORLD FINAL 2026</span>
          <span className="badge-eng">DAILY ENGLISH ESSAYS</span>
        </div>
        <div className="header-stats">
          <button 
            className="crt-toggle-btn"
            onClick={() => setCrtEnabled(prev => !prev)}
            aria-label="Toggle CRT Scanline Effect"
          >
            {crtEnabled ? '[ CRT: ON ]' : '[ CRT: OFF ]'}
          </button>
          <span className="stat-pill">
            <span className="dim">AC:</span> <strong className="hi">{solvedCount}</strong>
          </span>
          <span className="stat-pill">
            <span className="dim">ESSAYS:</span> <strong className="hi">{articles.length}</strong>
          </span>
          <span className="stat-pill">
            <span className="dim">STATUS:</span> 
            {ucupError ? (
              <span className="warn" style={{ marginLeft: 4 }}>OFFLINE</span>
            ) : (
              <><span className="active-dot"></span> LIVE</>
            )}
          </span>
        </div>
      </header>

      {/* Split Screen 50 / 50 Container */}
      <div className="split-view">
        {/* ================= LEFT COLUMN: UNIVERSAL CUP WORLD FINALS JOURNEY ================= */}
        <section className="column-pane left-column">
          <div className="box double">
            <span className="legend">UNIVERSAL CUP — JOURNEY TO WORLD FINAL</span>
            
            {/* Header sub info */}
            <div className="header-sub">
              <span>{ucupData?.lastSync ? `last sync ${new Date(ucupData.lastSync).toLocaleDateString()}` : 'active tracking telemetry'}</span>
              <button 
                className="linkish-btn" 
                onClick={fetchUcup} 
                disabled={ucupLoading}
                aria-label="Refresh telemetry"
              >
                {ucupLoading ? '[refreshing...]' : '[refresh]'}
              </button>
            </div>

            {/* Target Lock Section (Isolated component) */}
            <TargetLockDisplay solvedCount={solvedCount} targetGoal={targetGoal} />

            {/* Motivation Quote typewriter */}
            <TypewriterQuote />

            {/* Recent Solved Problem Feed */}
            <div className="recent-ac-section">
              <div className="section-title">
                <span className="dim">&gt; recent_submissions</span>
                <span className="dim-count">({ucupData?.items?.length || 0} verified ACs)</span>
              </div>

              {ucupError ? (
                <div className="empty-state error-banner">
                  [!] Failed to connect to Universal Cup telemetry ({ucupError}).
                  <button className="linkish-btn" onClick={fetchUcup} style={{ display: 'block', marginTop: '6px' }}>
                    [click to retry connection]
                  </button>
                </div>
              ) : (ucupData?.items || []).length === 0 && !ucupLoading ? (
                <div className="empty-state">No solved submissions recorded yet.</div>
              ) : (
                <div className="ac-list-scroll">
                  {(ucupData?.items || []).slice(0, 20).map((item, idx) => (
                    <div key={item.submission || idx} className="ac-item-row">
                      <div className="ac-badge">AC</div>
                      <div className="ac-info">
                        <div className="ac-title">
                          <span className="ac-problem-id">[{item.problemId || `#${item.problem}`}]</span> {item.title || 'Contest Problem'}
                        </div>
                        <div className="ac-subtext">
                          Judge: <span className="dim">{item.judge || 'qoj'}</span> · Contest: <span className="dim">{item.contestId || item.contest}</span> · Sub: <span className="dim">#{item.submission}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: THE WORLD DAILY WRITING ================= */}
        <section className="column-pane right-column">
          <div className="box double world-box">
            <span className="legend">THE_WORLD — DAILY WRITING & GREAT MINDS</span>

            <div className="header-sub">
              <span>Sync with: <code>other/writing/the_world</code></span>
              <div className="right-actions">
                {syncMsg && <span className="sync-status-text" role="status" aria-live="polite">{syncMsg}</span>}
                <button 
                  className="linkish-btn highlight"
                  onClick={syncWritingFolder}
                  disabled={syncingWorld}
                  aria-label="Synchronize folder"
                >
                  {syncingWorld ? '[syncing...]' : '[sync folder]'}
                </button>
              </div>
            </div>

            {/* Split layout inside the right column: List of essays + Original text preview */}
            <div className="world-inner-layout">
              {/* File list */}
              <div className="world-file-browser">
                <div className="browser-header">
                  <span className="dim">&gt; essays ({filteredArticles.length})</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="search [/]..."
                    className="world-search-input"
                    value={worldSearch}
                    onChange={(e) => setWorldSearch(e.target.value)}
                    aria-label="Filter essays"
                  />
                </div>

                <div className="world-file-list" role="listbox" aria-label="Essays">
                  {worldLoading ? (
                    <div className="empty-state">Loading essays...</div>
                  ) : articlesError ? (
                    <div className="empty-state" style={{ color: 'var(--err)' }}>
                      Failed to load essays.
                    </div>
                  ) : filteredArticles.length === 0 ? (
                    <div className="empty-state">No matching files found. Click [sync folder].</div>
                  ) : (
                    filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        onClick={() => loadWorldContent(article)}
                        className={`essay-item ${selectedArticle?.id === article.id ? 'active' : ''}`}
                        role="option"
                        aria-selected={selectedArticle?.id === article.id}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            loadWorldContent(article);
                          }
                        }}
                      >
                        <div className="essay-name">{article.name}</div>
                        <div className="essay-stat">
                          {article.wordCount} words · txt
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Exact Unaltered Content View */}
              <div className="world-content-viewer">
                {selectedArticle ? (
                  <>
                    <div className="viewer-top">
                      <span className="file-badge">SOURCE: RAW TEXT</span>
                      <span className="selected-filename">{selectedArticle.name}</span>
                    </div>
                    <div className="viewer-scroll-body">
                      {contentLoading ? (
                        <div className="dim loading-text">Loading essay content<span className="cursor"></span></div>
                      ) : (
                        <div className="essay-reader-container">
                          <pre className="essay-raw-text">
                            {articleContent}
                          </pre>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-viewer">
                    <p className="dim">No essay selected.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        :root {
          --bg: #020602;
          --panel: rgba(10, 30, 12, 0.55);
          --fg: #3dff7a;
          --hi: #b8ffcf;
          --dim: #34d36f;
          --faint: #238636;
          --line: #145c28;
          --warn: #ffb000;
          --err: #ff5555;
          --info: #5ce1ff;
          --glow-rgb: 61, 255, 122;
          --font-vt: 'VT323', monospace;
          --font-plex: 'IBM Plex Mono', monospace;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background-color: var(--bg);
          color: var(--fg);
          font-family: var(--font-plex);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .app-wrapper {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 12px 16px;
          position: relative;
        }

        .app-wrapper.crt-mode:before {
          content: "";
          pointer-events: none;
          z-index: 50;
          background: repeating-linear-gradient(rgba(0, 0, 0, 0) 0 2px, rgba(0, 0, 0, 0.15) 2px 3px);
          position: fixed;
          inset: 0;
        }

        /* Top global navigation bar */
        .global-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px dashed var(--line);
          padding-bottom: 10px;
          margin-bottom: 12px;
          flex-shrink: 0;
          gap: 16px;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .terminal-prompt {
          font-family: var(--font-vt);
          font-size: clamp(20px, 4vw, 26px);
          color: var(--hi);
        }

        .dim {
          color: var(--dim);
        }

        .hi {
          color: var(--hi);
        }

        .badge-wf {
          font-family: var(--font-vt);
          font-size: 15px;
          color: var(--warn);
          border: 1px solid var(--warn);
          padding: 1px 7px;
          letter-spacing: 1px;
        }

        .badge-eng {
          font-family: var(--font-vt);
          font-size: 15px;
          color: var(--info);
          border: 1px solid var(--info);
          padding: 1px 7px;
          letter-spacing: 1px;
        }

        .header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .crt-toggle-btn {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--dim);
          font-family: var(--font-plex);
          font-size: 11px;
          padding: 3px 8px;
          cursor: pointer;
        }

        .crt-toggle-btn:hover {
          color: var(--hi);
          border-color: var(--fg);
        }

        .stat-pill {
          font-size: 12px;
          background: rgba(10, 30, 12, 0.8);
          border: 1px solid var(--line);
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .active-dot {
          width: 8px;
          height: 8px;
          background: #3dff7a;
          border-radius: 50%;
          box-shadow: 0 0 8px #3dff7a;
          display: inline-block;
        }

        /* Split Screen 50 / 50 */
        .split-view {
          display: flex;
          flex: 1;
          gap: 14px;
          min-height: 0;
        }

        .column-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100%;
        }

        .box {
          border: 1px solid var(--line);
          background: var(--panel);
          position: relative;
          padding: 18px 16px 14px;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .box.double {
          border: 2px solid var(--line);
          box-shadow: inset 0 0 16px rgba(10, 30, 12, 0.9);
        }

        .legend {
          background: var(--bg);
          font-family: var(--font-vt);
          color: var(--hi);
          padding: 0 8px;
          font-size: 22px;
          line-height: 24px;
          position: absolute;
          top: -13px;
          left: 14px;
          text-shadow: 0 0 8px rgba(var(--glow-rgb), 0.6);
        }

        .header-sub {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--dim);
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px dashed rgba(20, 92, 40, 0.5);
        }

        .linkish-btn {
          background: transparent;
          border: none;
          color: var(--dim);
          font-family: var(--font-plex);
          font-size: 12px;
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .linkish-btn:hover:not(:disabled) {
          color: var(--hi);
          text-shadow: 0 0 6px var(--fg);
        }

        .linkish-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .linkish-btn.highlight {
          color: var(--fg);
          font-weight: 600;
        }

        .sync-status-text {
          font-size: 11px;
          color: var(--warn);
          margin-right: 8px;
        }

        /* Target Lock CRT */
        .tgt {
          margin-top: 4px;
          margin-bottom: 10px;
        }

        .tgt-head {
          font-family: var(--font-vt);
          display: flex;
          align-items: baseline;
          gap: 10px;
          font-size: 24px;
        }

        .tgt-count {
          color: var(--hi);
          font-size: 32px;
          letter-spacing: 2px;
          text-shadow: 0 0 12px rgba(var(--glow-rgb), 0.8);
        }

        .tgt-pct {
          color: var(--warn);
          margin-left: auto;
          font-size: 20px;
        }

        .tbar {
          border: 1px solid var(--line);
          background: repeating-linear-gradient(90deg, rgba(var(--glow-rgb), 0.08) 0 7px, transparent 7px 9px);
          height: 24px;
          margin: 10px 0 12px;
          position: relative;
          overflow: visible;
        }

        .tbar-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(61, 255, 122, 0.4), rgba(61, 255, 122, 0.9));
          box-shadow: 0 0 14px rgba(var(--glow-rgb), 0.7);
          transition: width 0.3s ease;
        }

        .tbar-tick {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 1px;
          background: var(--warn);
        }

        .tgt-foot {
          font-size: 13px;
          color: var(--hi);
          display: flex;
          align-items: center;
          min-height: 20px;
          margin-bottom: 12px;
        }

        .cursor {
          background: var(--fg);
          vertical-align: text-bottom;
          width: 0.55em;
          height: 1.1em;
          box-shadow: 0 0 8px rgba(var(--glow-rgb), 0.8);
          animation: 1s step-end infinite blink;
          display: inline-block;
          margin-left: 4px;
        }

        @keyframes blink {
          50% { opacity: 0; }
        }

        .recent-ac-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          border-top: 1px dashed var(--line);
          padding-top: 10px;
        }

        .section-title {
          font-size: 12px;
          font-family: var(--font-vt);
          font-size: 18px;
          color: var(--hi);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dim-count {
          font-size: 12px;
          color: var(--dim);
          font-family: var(--font-plex);
        }

        .ac-list-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 4px;
        }

        .ac-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(20, 92, 40, 0.4);
          padding: 8px 12px;
          transition: border-color 0.15s ease;
        }

        .ac-item-row:hover {
          border-color: var(--line);
          background: rgba(61, 255, 122, 0.05);
        }

        .ac-badge {
          font-family: var(--font-vt);
          font-size: 16px;
          color: var(--bg);
          background: var(--fg);
          padding: 1px 6px;
          border-radius: 2px;
          font-weight: bold;
        }

        .ac-info {
          flex: 1;
          min-width: 0;
        }

        .ac-title {
          color: var(--hi);
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ac-problem-id {
          color: var(--warn);
        }

        .ac-subtext {
          font-size: 11px;
          color: var(--dim);
          margin-top: 2px;
        }

        /* Right column: The World layout */
        .world-inner-layout {
          display: flex;
          flex: 1;
          gap: 12px;
          min-height: 0;
        }

        .world-file-browser {
          width: 220px;
          min-width: 180px;
          border: 1px solid var(--line);
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
        }

        .browser-header {
          padding: 8px;
          border-bottom: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
        }

        .world-search-input {
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid var(--line);
          color: var(--hi);
          font-family: var(--font-plex);
          font-size: 11px;
          padding: 4px 6px;
          outline: none;
        }

        .world-search-input:focus {
          border-color: var(--fg);
        }

        .world-file-list {
          flex: 1;
          overflow-y: auto;
        }

        .empty-state {
          padding: 16px;
          color: var(--dim);
          font-size: 12px;
          text-align: center;
        }

        .empty-state.error-banner {
          color: var(--warn);
          border: 1px dashed var(--warn);
          background: rgba(255, 176, 0, 0.05);
          margin-top: 10px;
        }

        .essay-item {
          padding: 8px 10px;
          border-bottom: 1px solid rgba(20, 92, 40, 0.3);
          cursor: pointer;
          transition: background 0.15s ease;
          outline: none;
        }

        .essay-item:hover,
        .essay-item:focus-visible {
          background: rgba(61, 255, 122, 0.1);
          outline: 1px solid var(--hi);
        }

        .essay-item.active {
          background: rgba(61, 255, 122, 0.18);
          border-left: 3px solid var(--fg);
        }

        .essay-name {
          color: var(--hi);
          font-size: 12px;
          font-weight: 500;
          word-break: break-all;
        }

        .essay-stat {
          font-size: 10px;
          color: var(--dim);
          margin-top: 2px;
        }

        .world-content-viewer {
          flex: 1;
          border: 1px solid var(--line);
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .viewer-top {
          padding: 8px 12px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.5);
        }

        .file-badge {
          font-family: var(--font-vt);
          font-size: 15px;
          color: var(--warn);
        }

        .selected-filename {
          color: var(--hi);
          font-size: 12px;
          font-weight: 600;
        }

        .viewer-scroll-body {
          flex: 1;
          padding: 16px 20px;
          overflow-y: auto;
        }

        .essay-reader-container {
          max-width: 74ch;
          margin: 0 auto;
        }

        .essay-raw-text {
          font-family: var(--font-plex);
          font-size: 14px;
          line-height: 1.75;
          color: #d1ffd9;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .empty-viewer {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px;
        }

        /* Custom scrollbars */
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--line);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--dim);
        }

        @media (max-width: 1050px) {
          .split-view {
            flex-direction: column;
            height: auto;
          }
          .app-wrapper {
            height: auto;
          }
          .column-pane {
            min-height: 550px;
          }
        }

        @media (max-width: 680px) {
          .world-inner-layout {
            flex-direction: column;
          }
          .world-file-browser {
            width: 100%;
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}
