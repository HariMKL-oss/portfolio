// LaTeX Resume Studio Frontend Application
document.addEventListener('DOMContentLoaded', () => {
  // State
  let editor = null;
  let currentConfig = { outputDirectory: '', defaultEngine: 'pdflatex' };
  let currentDocName = 'My_Resume';
  let activePdfUrl = null;
  let isCompiling = false;

  // DOM Elements
  const codeEditorEl = document.getElementById('code-editor');
  const docFilenameInput = document.getElementById('doc-filename');
  const engineSelect = document.getElementById('engine-select');
  const folderPathLabel = document.getElementById('current-folder-path');
  const btnChangeFolder = document.getElementById('btn-change-folder');
  const btnOpenExplorer = document.getElementById('btn-open-explorer');
  const btnCompile = document.getElementById('btn-compile');
  const btnDownloadFolder = document.getElementById('btn-download-folder');
  const btnEmptyRun = document.getElementById('btn-empty-run');
  const btnMoreOptions = document.getElementById('btn-more-options');
  const moreDropdown = document.getElementById('more-dropdown');
  const btnDownloadBrowser = document.getElementById('btn-download-browser');
  const btnExportTex = document.getElementById('btn-export-tex');
  const btnOpenSystemPdf = document.getElementById('btn-open-system-pdf');
  const btnSystemView = document.getElementById('btn-system-view');
  const btnToggleSavedDrawer = document.getElementById('btn-toggle-saved-drawer');
  const btnClearCode = document.getElementById('btn-clear-code');
  const btnRefreshPreview = document.getElementById('btn-refresh-preview');
  const btnCopyLogs = document.getElementById('btn-copy-logs');
  const btnViewErrorLogs = document.getElementById('btn-view-error-logs');
  const btnFontDecrease = document.getElementById('btn-font-decrease');
  const btnFontIncrease = document.getElementById('btn-font-increase');
  const fontSizeLabel = document.getElementById('font-size-label');
  const errorBar = document.getElementById('error-bar');
  const errorBarText = document.getElementById('error-bar-text');
  const logErrorBadge = document.getElementById('log-error-badge');
  const logStatusText = document.getElementById('log-status-text');
  const logsContent = document.getElementById('logs-content');
  const emptyPreview = document.getElementById('empty-preview');
  const pdfContainer = document.getElementById('pdf-container');
  const pdfFrame = document.getElementById('pdf-frame');
  const charCountEl = document.getElementById('editor-char-count');
  const compilerStatusEl = document.getElementById('compiler-status');

  // Modals & Drawers
  const folderModal = document.getElementById('folder-modal');
  const inputFolderPath = document.getElementById('input-folder-path');
  const btnCloseFolderModal = document.getElementById('btn-close-folder-modal');
  const btnCancelFolder = document.getElementById('btn-cancel-folder');
  const btnSaveFolder = document.getElementById('btn-save-folder');
  const historyDrawerOverlay = document.getElementById('history-drawer-overlay');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const historyList = document.getElementById('history-list');
  const btnDrawerOpenFolder = document.getElementById('btn-drawer-open-folder');

  // Editor Font Size Management
  let currentFontSize = parseInt(localStorage.getItem('latex_editor_font_size') || '14', 10);

  function applyFontSize(size) {
    currentFontSize = Math.max(10, Math.min(26, size));
    document.documentElement.style.setProperty('--editor-font-size', `${currentFontSize}px`);
    fontSizeLabel.textContent = `${currentFontSize}px`;
    localStorage.setItem('latex_editor_font_size', currentFontSize.toString());
    if (editor) editor.refresh();
  }

  // 1. Initialize CodeMirror LaTeX Editor
  function initEditor() {
    applyFontSize(currentFontSize);

    editor = CodeMirror.fromTextArea(codeEditorEl, {
      mode: 'stex',
      theme: 'dracula',
      lineNumbers: true,
      lineWrapping: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      extraKeys: {
        'Ctrl-Enter': () => compileDocument(),
        'Cmd-Enter': () => compileDocument(),
        'Ctrl-=': () => applyFontSize(currentFontSize + 1),
        'Ctrl-+': () => applyFontSize(currentFontSize + 1),
        'Ctrl--': () => applyFontSize(currentFontSize - 1),
        'Ctrl-S': (cm) => {
          localStorage.setItem('latex_resume_draft', cm.getValue());
          showToast('Draft saved to browser storage!', 'success');
          compileDocument();
        },
      },
    });

    editor.on('change', () => {
      const text = editor.getValue();
      charCountEl.textContent = `${text.length} chars`;
      localStorage.setItem('latex_resume_draft', text);
    });
  }

  // 2. Fetch Initial Config
  async function initApp() {
    initEditor();

    // Fetch config
    try {
      const cfgRes = await fetch('/api/config');
      currentConfig = await cfgRes.json();
      updateFolderDisplay(currentConfig.outputDirectory);
      if (currentConfig.defaultEngine) {
        engineSelect.value = currentConfig.defaultEngine;
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }

    // Load saved draft if present
    const savedDraft = localStorage.getItem('latex_resume_draft');
    if (savedDraft && savedDraft.trim().length > 0) {
      editor.setValue(savedDraft);
    }
  }

  // 3. Update Folder Path Display
  function updateFolderDisplay(folderPath) {
    if (!folderPath) return;
    folderPathLabel.textContent = folderPath;
    folderPathLabel.title = `Current Download Destination:\n${folderPath}`;
    inputFolderPath.value = folderPath;
  }

  // 4. Compilation Function
  async function compileDocument() {
    if (isCompiling) return;
    const code = editor.getValue();
    if (!code || !code.trim()) {
      showToast('LaTeX editor is empty. Paste some code first!', 'error');
      return;
    }

    const docName = (docFilenameInput.value || 'Resume').trim();
    const engine = engineSelect.value;

    isCompiling = true;
    updateStatus(true);
    btnCompile.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Compiling...</span>';
    btnDownloadFolder.disabled = true;

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          filename: docName,
          engine,
          customFolder: currentConfig.outputDirectory,
        }),
      });

      const result = await res.json();
      logsContent.textContent = result.logs || result.stderr || 'No compiler output.';

      if (result.success) {
        // Success
        activePdfUrl = result.previewUrl;
        currentDocName = result.filename;
        renderPdfPreview(result.previewUrl);
        hideErrorBar();
        logErrorBadge.classList.add('hidden');
        logStatusText.textContent = `Compiled successfully (${new Date().toLocaleTimeString()})`;

        showToast(`Saved & Downloaded: ${result.filename} in ${currentConfig.outputDirectory}`, 'success');
      } else {
        // Errors occurred
        showErrorBar(result.message || 'Compilation failed. View logs.');
        logErrorBadge.classList.remove('hidden');
        logStatusText.textContent = `Compilation Error: ${result.errors?.length || 1} issue(s) detected`;

        // Highlight line if available
        if (result.errors && result.errors.length > 0 && result.errors[0].line) {
          const errLine = result.errors[0].line - 1;
          editor.setCursor(errLine, 0);
          editor.addLineClass(errLine, 'background', 'line-error-highlight');
          setTimeout(() => {
            editor.removeLineClass(errLine, 'background', 'line-error-highlight');
          }, 6000);
        }

        showToast('Compilation failed! Click "View Full Log" for details.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(`Compilation error: ${err.message}`, 'error');
      logsContent.textContent = `Network / Server Error: ${err.message}`;
    } finally {
      isCompiling = false;
      updateStatus(false);
      btnCompile.innerHTML = '<i class="fa-solid fa-play"></i> <span>Run & Save</span> <kbd>Ctrl+↵</kbd>';
      btnDownloadFolder.disabled = false;
    }
  }

  // 5. Render Live PDF Preview
  function renderPdfPreview(url) {
    if (!url) return;
    emptyPreview.classList.add('hidden');
    pdfContainer.classList.remove('hidden');
    // Using standard PDF viewer with zoom & toolbar
    pdfFrame.src = `${url}#toolbar=1&navpanes=0&view=FitH`;
  }

  // 6. Direct Save / Download to Local Folder
  async function handleDownloadToFolder() {
    if (!activePdfUrl && (!editor.getValue() || editor.getValue().trim() === '')) {
      showToast('Please compile your resume first!', 'error');
      return;
    }
    // Re-compile or ensure saved
    await compileDocument();
  }

  // 7. Open Windows Explorer
  async function openFolderInExplorer() {
    try {
      const docName = (docFilenameInput.value || 'Resume').trim() + '.pdf';
      const res = await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: currentConfig.outputDirectory,
          filename: currentDocName || docName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Opened Windows File Explorer!', 'success');
      } else {
        showToast(`Could not open folder: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast(`Error opening explorer: ${e.message}`, 'error');
    }
  }

  // 8. Open PDF in Windows Default App
  async function openInSystemViewer() {
    const filename = currentDocName || ((docFilenameInput.value || 'Resume').trim() + '.pdf');
    try {
      const res = await fetch('/api/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Opened PDF in Windows default viewer!', 'success');
      } else {
        showToast(`File not found yet. Compile first.`, 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // 9. Browser Download Fallback
  function downloadInBrowser() {
    const filename = currentDocName || ((docFilenameInput.value || 'Resume').trim() + '.pdf');
    const a = document.createElement('a');
    a.href = `/api/download/${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${filename} to your browser...`, 'success');
  }

  // 10. Export .tex Source File
  function exportTexFile() {
    const code = editor.getValue();
    const docName = (docFilenameInput.value || 'Resume').trim();
    const blob = new Blob([code], { type: 'text/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${docName}.tex`, 'success');
  }

  // 11. Load Resume History Drawer
  async function loadHistory() {
    historyList.innerHTML = '<p class="empty-list-msg"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>';
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      const docs = data.documents || [];

      if (docs.length === 0) {
        historyList.innerHTML = `<p class="empty-list-msg">No resumes in <code>${data.folder}</code> yet. Run compilation to create one!</p>`;
        return;
      }

      historyList.innerHTML = '';
      docs.forEach((doc) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const dateStr = new Date(doc.modifiedAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        item.innerHTML = `
          <div class="history-item-info">
            <span class="history-item-name" title="Click to preview">${doc.name}</span>
            <span class="history-item-meta">${doc.sizeFormatted} • ${dateStr}</span>
          </div>
          <div class="history-item-actions">
            <button class="icon-btn btn-hist-open" title="Open in Windows Reader"><i class="fa-regular fa-window-restore"></i></button>
            <button class="icon-btn btn-hist-del" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        `;

        item.querySelector('.history-item-name').addEventListener('click', () => {
          currentDocName = doc.name;
          docFilenameInput.value = doc.name.replace('.pdf', '');
          renderPdfPreview(doc.previewUrl);
          switchTab('preview-tab');
          historyDrawerOverlay.classList.add('hidden');
        });

        item.querySelector('.btn-hist-open').addEventListener('click', () => {
          fetch('/api/open-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: doc.name }),
          });
        });

        item.querySelector('.btn-hist-del').addEventListener('click', async () => {
          if (confirm(`Delete ${doc.name} from folder?`)) {
            await fetch(`/api/documents/${encodeURIComponent(doc.name)}`, { method: 'DELETE' });
            loadHistory();
          }
        });

        historyList.appendChild(item);
      });
    } catch (e) {
      historyList.innerHTML = `<p class="empty-list-msg">Error loading history: ${e.message}</p>`;
    }
  }

  // 12. Helper UI Functions
  function updateStatus(compiling) {
    const dot = compilerStatusEl.querySelector('.dot');
    if (compiling) {
      dot.className = 'dot compiling';
      compilerStatusEl.childNodes[1].nodeValue = ' Compiling...';
    } else {
      dot.className = 'dot online';
      compilerStatusEl.childNodes[1].nodeValue = ' Ready';
    }
  }

  function showErrorBar(msg) {
    errorBarText.textContent = msg;
    errorBar.classList.remove('hidden');
  }

  function hideErrorBar() {
    errorBar.classList.add('hidden');
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    const targetTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (targetTab) targetTab.classList.add('active');
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');
  }

  function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const msgEl = toast.querySelector('.toast-msg');

    msgEl.textContent = msg;
    if (type === 'error') {
      toast.classList.add('toast-error');
      icon.className = 'toast-icon fa-solid fa-circle-exclamation';
    } else {
      toast.classList.remove('toast-error');
      icon.className = 'toast-icon fa-solid fa-circle-check';
    }

    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4500);
  }

  // Preset Folders Handler
  function getPresetPath(preset) {
    const userHome = navigator.userAgent.includes('Windows') ? 'C:\\Users\\Hariprasad' : '';
    switch (preset) {
      case 'workspace':
        return currentConfig.defaultOutputDir;
      case 'documents':
        return `${userHome}\\Documents\\Resumes`;
      case 'desktop':
        return `${userHome}\\Desktop\\Resumes`;
      case 'downloads':
        return `${userHome}\\Downloads`;
      default:
        return currentConfig.outputDirectory;
    }
  }

  // Font size buttons
  btnFontDecrease.addEventListener('click', () => applyFontSize(currentFontSize - 1));
  btnFontIncrease.addEventListener('click', () => applyFontSize(currentFontSize + 1));

  // Event Listeners
  btnCompile.addEventListener('click', compileDocument);
  btnDownloadFolder.addEventListener('click', handleDownloadToFolder);
  btnEmptyRun.addEventListener('click', compileDocument);
  btnOpenExplorer.addEventListener('click', openFolderInExplorer);
  btnOpenSystemPdf.addEventListener('click', openInSystemViewer);
  btnSystemView.addEventListener('click', openInSystemViewer);
  btnDownloadBrowser.addEventListener('click', downloadInBrowser);
  btnExportTex.addEventListener('click', exportTexFile);
  // Clear code
  btnClearCode.addEventListener('click', () => {
    if (confirm('Clear the code editor?')) {
      editor.setValue('');
      editor.focus();
    }
  });

  // Refresh preview
  btnRefreshPreview.addEventListener('click', () => {
    if (activePdfUrl) {
      pdfFrame.src = `${activePdfUrl}&r=${Date.now()}`;
      showToast('Preview refreshed', 'success');
    }
  });

  // Copy Logs
  btnCopyLogs.addEventListener('click', () => {
    navigator.clipboard.writeText(logsContent.textContent);
    showToast('Logs copied to clipboard!', 'success');
  });

  // Tabs switching
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  btnViewErrorLogs.addEventListener('click', () => {
    switchTab('logs-tab');
  });

  // More options dropdown
  btnMoreOptions.addEventListener('click', (e) => {
    e.stopPropagation();
    moreDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    moreDropdown.classList.remove('show');
  });

  // Folder modal
  btnChangeFolder.addEventListener('click', () => {
    inputFolderPath.value = currentConfig.outputDirectory;
    folderModal.classList.remove('hidden');
  });

  btnCloseFolderModal.addEventListener('click', () => folderModal.classList.add('hidden'));
  btnCancelFolder.addEventListener('click', () => folderModal.classList.add('hidden'));

  document.querySelectorAll('.preset-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputFolderPath.value = getPresetPath(btn.dataset.preset);
    });
  });

  btnSaveFolder.addEventListener('click', async () => {
    const newPath = inputFolderPath.value.trim();
    if (!newPath) return;

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDirectory: newPath }),
      });
      const data = await res.json();
      if (data.success) {
        currentConfig.outputDirectory = data.config.outputDirectory;
        updateFolderDisplay(data.config.outputDirectory);
        folderModal.classList.add('hidden');
        showToast(`Target folder updated to: ${data.config.outputDirectory}`, 'success');
      } else {
        showToast(`Failed to update folder: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // History Drawer
  btnToggleSavedDrawer.addEventListener('click', () => {
    historyDrawerOverlay.classList.remove('hidden');
    loadHistory();
  });

  btnCloseDrawer.addEventListener('click', () => historyDrawerOverlay.classList.add('hidden'));
  historyDrawerOverlay.addEventListener('click', (e) => {
    if (e.target === historyDrawerOverlay) {
      historyDrawerOverlay.classList.add('hidden');
    }
  });
  btnDrawerOpenFolder.addEventListener('click', openFolderInExplorer);

  // Resizable Split Panes
  const paneResizer = document.getElementById('pane-resizer');
  const paneEditor = document.getElementById('pane-editor');
  let isResizing = false;

  paneResizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    paneResizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerWidth = document.querySelector('.main-container').offsetWidth;
    const newEditorWidth = Math.max(300, Math.min(containerWidth - 300, e.clientX));
    paneEditor.style.flex = `0 0 ${newEditorWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      paneResizer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (editor) editor.refresh();
    }
  });

  // Start the application
  initApp();
});
