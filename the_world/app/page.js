'use client';

import React, { useState, useEffect } from 'react';

export default function TheWorldPage() {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        if (data.articles && data.articles.length > 0 && !selectedArticle) {
          selectArticle(data.articles[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    }
  };

  const selectArticle = async (article) => {
    setSelectedArticle(article);
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/articles?id=${encodeURIComponent(article.id)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      } else {
        setFileContent('Error loading article content.');
      }
    } catch (err) {
      setFileContent(`Failed to read file: ${err.message}`);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('Syncing with folder...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(`Synced ${data.count} file(s)`);
        setArticles(data.articles || []);
        if (selectedArticle) {
          const updated = data.articles.find(a => a.id === selectedArticle.id);
          if (updated) {
            selectArticle(updated);
          }
        }
      } else {
        setSyncStatus(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="terminal-container">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="prompt">guest@the-world<span className="dim">:~/essays$</span></span>
          <span className="tag world-tag">THE WORLD ARCHIVE</span>
        </div>
        <div className="topbar-right">
          {syncStatus && <span className="sync-msg">{syncStatus}</span>}
          <button 
            className="action-btn"
            onClick={handleSync}
            disabled={syncing}
            aria-label="Synchronize folder"
          >
            {syncing ? '⟳ SYNCING...' : '[ ⟳ SYNC FOLDER ]'}
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="main-content">
        {/* Sidebar list of articles */}
        <aside className="sidebar-pane">
          <div className="pane-header">
            <span className="legend-tag">ESSAYS ({filteredArticles.length})</span>
            <input 
              type="text" 
              placeholder="filter files..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter essays"
            />
          </div>

          <div className="file-list">
            {filteredArticles.length === 0 ? (
              <div className="empty-state">No matching files found. Click [SYNC FOLDER] to load.</div>
            ) : (
              filteredArticles.map(article => (
                <div 
                  key={article.id}
                  onClick={() => selectArticle(article)}
                  className={`file-item ${selectedArticle?.id === article.id ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectArticle(article);
                    }
                  }}
                >
                  <div className="file-icon">📄</div>
                  <div className="file-meta">
                    <div className="file-name">{article.name}</div>
                    <div className="file-details">
                      {article.wordCount} words · {(article.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Content Viewer: Pure, raw text */}
        <main className="viewer-pane">
          {selectedArticle ? (
            <div className="viewer-container">
              <div className="viewer-header">
                <span className="raw-badge">RAW FILE VIEW</span>
                <span className="viewer-filename">{selectedArticle.name}</span>
                <span className="viewer-meta">
                  Modified: {new Date(selectedArticle.lastModified).toLocaleString()}
                </span>
              </div>
              <div className="viewer-body">
                {loadingContent ? (
                  <div className="dim loading-text">Reading file stream<span className="cursor"></span></div>
                ) : (
                  <pre className="raw-text-content">{fileContent}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-viewer">
              <p className="dim">Select an essay from the list to view original raw content.</p>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        :root {
          --bg: #020602;
          --panel: rgba(10, 30, 12, 0.45);
          --fg: #3dff7a;
          --hi: #b8ffcf;
          --dim: #22a34a;
          --faint: #0e4a1f;
          --line: #145c28;
          --warn: #ffb000;
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
          font-size: 14px;
          line-height: 1.5;
        }

        .terminal-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 16px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px dashed var(--line);
          padding-bottom: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .prompt {
          font-family: var(--font-vt);
          font-size: 26px;
          color: var(--hi);
        }

        .dim {
          color: var(--dim);
        }

        .world-tag {
          font-family: var(--font-vt);
          font-size: 16px;
          color: var(--warn);
          border: 1px solid var(--warn);
          padding: 2px 8px;
          border-radius: 2px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sync-msg {
          font-size: 13px;
          color: var(--hi);
        }

        .action-btn {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--fg);
          font-family: var(--font-vt);
          font-size: 18px;
          padding: 4px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover:not(:disabled) {
          border-color: var(--hi);
          background: rgba(61, 255, 122, 0.1);
          color: var(--hi);
          box-shadow: 0 0 10px rgba(var(--glow-rgb), 0.4);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .main-content {
          display: flex;
          gap: 16px;
          flex: 1;
          min-height: calc(100vh - 80px);
        }

        .sidebar-pane {
          width: 320px;
          min-width: 280px;
          border: 1px solid var(--line);
          background: var(--panel);
          display: flex;
          flex-direction: column;
        }

        .pane-header {
          padding: 12px;
          border-bottom: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .legend-tag {
          font-family: var(--font-vt);
          font-size: 20px;
          color: var(--hi);
        }

        .search-input {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid var(--line);
          color: var(--hi);
          font-family: var(--font-plex);
          font-size: 12px;
          padding: 6px 10px;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--fg);
        }

        .file-list {
          overflow-y: auto;
          flex: 1;
        }

        .empty-state {
          padding: 20px;
          color: var(--dim);
          font-size: 12px;
          text-align: center;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(20, 92, 40, 0.4);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .file-item:hover {
          background: rgba(61, 255, 122, 0.08);
        }

        .file-item.active {
          background: rgba(61, 255, 122, 0.15);
          border-left: 3px solid var(--fg);
        }

        .file-name {
          color: var(--hi);
          font-weight: 500;
          font-size: 13px;
        }

        .file-details {
          font-size: 11px;
          color: var(--dim);
          margin-top: 2px;
        }

        .viewer-pane {
          flex: 1;
          border: 1px solid var(--line);
          background: var(--panel);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .viewer-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .viewer-header {
          padding: 10px 16px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.3);
        }

        .raw-badge {
          font-family: var(--font-vt);
          font-size: 16px;
          color: var(--warn);
          letter-spacing: 1px;
        }

        .viewer-filename {
          color: var(--hi);
          font-weight: 600;
        }

        .viewer-meta {
          margin-left: auto;
          color: var(--dim);
        }

        .viewer-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.4);
        }

        .raw-text-content {
          font-family: var(--font-plex);
          font-size: 14px;
          line-height: 1.7;
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

        .cursor {
          display: inline-block;
          width: 0.6em;
          height: 1.1em;
          background: var(--fg);
          margin-left: 4px;
          vertical-align: text-bottom;
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          50% { opacity: 0; }
        }

        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }
          .sidebar-pane {
            width: 100%;
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
