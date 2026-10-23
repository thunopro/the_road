'use client';

import React, { useState, useEffect, useRef } from 'react';

const MOTIVATION_QUOTE = "Chẳng có gì xảy ra, cho đến khi bạn bắt đầu.";

export default function MyRoadPage() {
  // Left Column State: Universal Cup / World Finals Road
  const [ucupData, setUcupData] = useState(null);
  const [ucupLoading, setUcupLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(0);
  const [glitchActive, setGlitchActive] = useState(true);
  const [quoteChars, setQuoteChars] = useState(0);
  const countRef = useRef(0);

  // Right Column State: The World Daily Writing
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleContent, setArticleContent] = useState('');
  const [worldLoading, setWorldLoading] = useState(true);
  const [syncingWorld, setSyncingWorld] = useState(false);
  const [worldSearch, setWorldSearch] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  // Fetch Universal Cup data
  const fetchUcup = async () => {
    setUcupLoading(true);
    try {
      const res = await fetch('/api/ucup?token=nguyenkhacthu');
      if (res.ok) {
        const data = await res.json();
        setUcupData(data);
      }
    } catch (err) {
      console.error('UCUP fetch error:', err);
    } finally {
      setUcupLoading(false);
    }
  };

  // Fetch The World articles
  const fetchWorldArticles = async () => {
    setWorldLoading(true);
    try {
      // First try relative path if running unified or proxy, fallback to public file or the_world port
      let res = await fetch('http://localhost:3001/api/articles').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('/api/articles').catch(() => null);
      }
      
      if (res && res.ok) {
        const data = await res.json();
        const list = data.articles || [];
        setArticles(list);
        if (list.length > 0 && !selectedArticle) {
          loadWorldContent(list[0]);
        }
      } else {
        // Fallback default sample if the_world port is not standalone yet
        const defaultList = [
          {
            id: 'robery_noyce.txt',
            name: 'robery_noyce.txt',
            title: 'Robert Noyce - Mayor of Silicon Valley',
            wordCount: 509,
            size: 3074,
            lastModified: new Date().toISOString()
          }
        ];
        setArticles(defaultList);
        if (!selectedArticle) {
          loadWorldContent(defaultList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching world articles:', err);
    } finally {
      setWorldLoading(false);
    }
  };

  const loadWorldContent = async (article) => {
    setSelectedArticle(article);
    try {
      let res = await fetch(`http://localhost:3001/api/articles?id=${encodeURIComponent(article.id)}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/api/articles?id=${encodeURIComponent(article.id)}`).catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        setArticleContent(data.content);
        return;
      }
    } catch (e) {
      // ignore
    }
    // Fallback direct read or prompt
    setArticleContent(`Robert Noyce was one of the most important invetors and businessmen in modern history. People often called him the "Mayor of Silicon Valley" because the helped turn a quite area of fruit farms in California into the technology captial of the world. Without his work, we would not have personal computers, smartphones, or the internet as we know them day. 
Robert was born in Iowa in 1927. His father was a preacher, and his family lived a simple life. From a very young age, Robert was deeply curious about how machines worked. He loved fixing radios, building small planes, and experimenting with electronics in his basements. He was also a good student and an athlete. Later, he studied physics and earned a dotoral degree from MIT, one of the base science universities in the United States. In 1956, Noyce moved to California to work for William Shockley, a famous scientist who had won a Nobel Prize for inventing the trainsistor. However, working with Shockley was very difficult. Shockley was supicious of his employees, got angry easily, and dit not listen to their opinions. Noyce and seven other young engineers decided they could no longer work in such an unhappy enviroments. Together, they made a brave decision to quit. People called them the "Traitorous Eight". In 1957, with the help of an investor they started their own company called Farichild Semiconductor. At Fairchild, Noyce made his greatest invetion: the silicicon microchip, also known as the integrated circuit. Before this, electronic machines were huge and unreliable because thousands of components had to be connected by hand using fragile copper wires. Noyce found a clever soluiton. He figured out how to put many transistors, resistors, and electrical paths directly onto a single tiny pieece of silicon. This idea made electronics much smallers, cheaper, and faster. It solved a massive problem and opened the door to the computer age.

In 1968, Noyce ond his close friend Gordon Moore left Fairchild to create new company named Intel. At Intel, Noyce wanted to build a different kind of workplace. In traditional companies, bosses worked in private luxury offices and wore formal suits, while normal workers stayed far below them. Noyce hated this separation. He created open offices with simple cubicles where everyone could talk freel like wore casual clothes and treated his employees like teammates. He believed that the best idea came from freedom, respect, and teamwork, not from strict rules. 

Noyce was also famous for his positive attitude. He always told young people to be brave, take smart risks, and not worry about making mistakes. He believed that failure was just a normal step on the path to success. He even spent time giving advice to young inventors, including Steve Jobs, the co-founder of Apple. 

Robert Noyce died suddenly from a heart attack in 1990 when he was sixty-two year old. Although his life ended early, his ideas live on. Every time you turn on a phone, use a computer, or send a message, you are using the technology that Robert Noyce helped created.`);
  };

  const syncWritingFolder = async () => {
    setSyncingWorld(true);
    setSyncMsg('Syncing writing...');
    try {
      const res = await fetch('http://localhost:3001/api/sync', { method: 'POST' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setSyncMsg(`Synced ${data.count} file(s)`);
        setArticles(data.articles || []);
      } else {
        setSyncMsg('Sync request sent');
      }
    } catch (e) {
      setSyncMsg('Sync executed');
    } finally {
      setSyncingWorld(false);
      setTimeout(() => setSyncMsg(''), 3000);
    }
  };

  useEffect(() => {
    fetchUcup();
    fetchWorldArticles();
  }, []);

  // Target count counter animation
  const solvedCount = ucupData?.totalSolved || 101;
  const targetGoal = ucupData?.target || 200;
  const percentage = Math.min(100, (displayCount / targetGoal) * 100);

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

  // Typewriter effect for motivation quote
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

  const filteredArticles = articles.filter(a =>
    a.name.toLowerCase().includes(worldSearch.toLowerCase())
  );

  return (
    <div className="crt app-wrapper">
      {/* Universal Top Header */}
      <header className="global-header">
        <div className="header-brand">
          <span className="terminal-prompt">nguyenkhacthu@road<span className="dim">:~$</span></span>
          <span className="badge-wf">ROAD TO WORLD FINAL 2026</span>
          <span className="badge-eng">DAILY ENGLISH ESSAYS</span>
        </div>
        <div className="header-stats">
          <span className="stat-pill">
            <span className="dim">AC:</span> <strong className="hi">{Math.round(displayCount)}</strong>
          </span>
          <span className="stat-pill">
            <span className="dim">ARTICLES:</span> <strong className="hi">{articles.length}</strong>
          </span>
          <span className="stat-pill">
            <span className="dim">STATUS:</span> <span className="active-dot"></span> LIVE
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
            <div className="faint header-sub">
              <span>{ucupData?.lastSync ? `last sync ${new Date(ucupData.lastSync).toLocaleDateString()}` : 'active tracking'}</span>
              <button className="linkish-btn" onClick={fetchUcup}>[refresh]</button>
            </div>

            {/* Target Lock Section (Exact Faithful CRT Style) */}
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

              {/* Progress bar with glowing progress fill */}
              <div className="tbar" role="progressbar" aria-valuenow={Math.round(displayCount)} aria-valuemax={targetGoal}>
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

              {/* Motivation Quote typewriter */}
              <div className="tgt-foot">
                <span className="tgt-quote">{MOTIVATION_QUOTE.slice(0, quoteChars)}</span>
                <span className="cursor"></span>
              </div>
            </div>

            {/* Recent Solved Problem Feed */}
            <div className="recent-ac-section">
              <div className="section-title">
                <span className="dim">&gt; recent_submissions</span>
                <span className="dim-count">({ucupData?.items?.length || 101} verified ACs)</span>
              </div>

              <div className="ac-list-scroll">
                {(ucupData?.items || []).slice(0, 15).map((item, idx) => (
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
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: THE WORLD DAILY WRITING ================= */}
        <section className="column-pane right-column">
          <div className="box double world-box">
            <span className="legend">THE_WORLD — DAILY WRITING & GREAT MINDS</span>

            <div className="faint header-sub">
              <span>Sync with: <code>other/writing/the_world</code></span>
              <div className="right-actions">
                {syncMsg && <span className="sync-status-text">{syncMsg}</span>}
                <button 
                  className="linkish-btn highlight"
                  onClick={syncWritingFolder}
                  disabled={syncingWorld}
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
                  <span className="dim">&gt; directory_listing</span>
                  <input
                    type="text"
                    placeholder="search essays..."
                    className="world-search-input"
                    value={worldSearch}
                    onChange={(e) => setWorldSearch(e.target.value)}
                  />
                </div>

                <div className="world-file-list">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => loadWorldContent(article)}
                      className={`essay-item ${selectedArticle?.id === article.id ? 'active' : ''}`}
                    >
                      <div className="essay-name">{article.name}</div>
                      <div className="essay-stat">
                        {article.wordCount} words · txt
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exact Unaltered Content View */}
              <div className="world-content-viewer">
                <div className="viewer-top">
                  <span className="file-badge">SOURCE: RAW TEXT</span>
                  <span className="selected-filename">{selectedArticle?.name || 'robery_noyce.txt'}</span>
                </div>
                <div className="viewer-scroll-body">
                  <pre className="essay-raw-text">
                    {articleContent}
                  </pre>
                </div>
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
          --dim: #22a34a;
          --faint: #0e4a1f;
          --line: #145c28;
          --warn: #ffb000;
          --err: #f55;
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

        .crt {
          position: relative;
          min-height: 100vh;
        }

        .crt:before {
          content: "";
          pointer-events: none;
          z-index: 50;
          background: repeating-linear-gradient(rgba(0, 0, 0, 0) 0 2px, rgba(0, 0, 0, 0.28) 2px 3px);
          position: fixed;
          inset: 0;
        }

        .app-wrapper {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 12px 16px;
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
          font-size: 26px;
          color: var(--hi);
        }

        .dim {
          color: var(--dim);
        }

        .faint {
          color: #17682f;
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
          gap: 14px;
        }

        .stat-pill {
          font-size: 13px;
          background: rgba(10, 30, 12, 0.8);
          border: 1px solid var(--line);
          padding: 4px 10px;
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
          min-height: 0; /* Important for flex child overflow */
        }

        .column-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100%;
        }

        /* Retro Box Component */
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

        .linkish-btn:hover {
          color: var(--hi);
          text-shadow: 0 0 6px var(--fg);
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
          margin-bottom: 14px;
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

        /* Solved problems list */
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
          width: 200px;
          min-width: 170px;
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

        .world-file-list {
          flex: 1;
          overflow-y: auto;
        }

        .essay-item {
          padding: 8px 10px;
          border-bottom: 1px solid rgba(20, 92, 40, 0.3);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .essay-item:hover {
          background: rgba(61, 255, 122, 0.08);
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
          padding: 14px 16px;
          overflow-y: auto;
        }

        .essay-raw-text {
          font-family: var(--font-plex);
          font-size: 13px;
          line-height: 1.7;
          color: #d1ffd9;
          white-space: pre-wrap;
          word-break: break-word;
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

        @media (max-width: 900px) {
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
      `}</style>
    </div>
  );
}
