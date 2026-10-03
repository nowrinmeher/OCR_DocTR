/**
 * DocTR AI OCR Studio - Client Application Controller
 * Handles interactive word detection boxes, hover tooltips, zoom/pan viewport,
 * search filtering, real-time transcription syncing, and export tools.
 */

// Application State
const state = {
  currentOcrData: null,
  currentPageIndex: 0,
  zoomLevel: 1.0,
  minConfidence: 0.0,
  boxMode: 'hover-only',
  boxColor: 'cyan',
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  panX: 0,
  panY: 0,
  activeWordId: null,
  searchQuery: '',
  theme: 'dark'
};

// DOM Elements Cache
const elements = {
  // Navigation & Status
  systemStatusBadge: document.getElementById('systemStatusBadge'),
  deviceStatusText: document.getElementById('deviceStatusText'),
  specDeviceText: document.getElementById('specDeviceText'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  sampleInvoiceBtn: document.getElementById('sampleInvoiceBtn'),
  sampleReceiptBtn: document.getElementById('sampleReceiptBtn'),
  
  // File Upload
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
  browseBtn: document.getElementById('browseBtn'),
  uploadLabel: document.getElementById('uploadLabel'),
  processingOverlay: document.getElementById('processingOverlay'),
  loaderTitle: document.getElementById('loaderTitle'),
  loaderDesc: document.getElementById('loaderDesc'),
  
  // Canvas Viewport & Controls
  canvasStageWrapper: document.getElementById('canvasStageWrapper'),
  documentContainer: document.getElementById('documentContainer'),
  documentInner: document.getElementById('documentInner'),
  documentImage: document.getElementById('documentImage'),
  overlayLayer: document.getElementById('overlayLayer'),
  wordHoverTooltip: document.getElementById('wordHoverTooltip'),
  tooltipWordValue: document.getElementById('tooltipWordValue'),
  tooltipConf: document.getElementById('tooltipConf'),
  tooltipCoords: document.getElementById('tooltipCoords'),
  
  // Zoom & View Controls
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomFitBtn: document.getElementById('zoomFitBtn'),
  zoomResetBtn: document.getElementById('zoomResetBtn'),
  zoomLevelDisplay: document.getElementById('zoomLevelDisplay'),
  boxModeSelect: document.getElementById('boxModeSelect'),
  colorDots: document.querySelectorAll('.color-dot'),
  confSlider: document.getElementById('confSlider'),
  confSliderVal: document.getElementById('confSliderVal'),
  
  // Pagination & HUD
  paginationWrapper: document.getElementById('paginationWrapper'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  pageIndicator: document.getElementById('pageIndicator'),
  metricsHud: document.getElementById('metricsHud'),
  hudWordCount: document.getElementById('hudWordCount'),
  hudAvgConf: document.getElementById('hudAvgConf'),
  hudLatency: document.getElementById('hudLatency'),
  
  // Search Bar
  wordSearchInput: document.getElementById('wordSearchInput'),
  searchMatchCount: document.getElementById('searchMatchCount'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  
  // Inspector Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  tabWordsCount: document.getElementById('tabWordsCount'),
  transcriptionFlow: document.getElementById('transcriptionFlow'),
  wordsCardList: document.getElementById('wordsCardList'),
  filterWordListInput: document.getElementById('filterWordListInput'),
  sortWordsBtn: document.getElementById('sortWordsBtn'),
  jsonCodeView: document.getElementById('jsonCodeView'),
  
  // Action Buttons
  copyTextBtn: document.getElementById('copyTextBtn'),
  downloadTxtBtn: document.getElementById('downloadTxtBtn'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// Initialization & Lifecycle
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSystemStatus();
  setupEventListeners();
  setupCanvasPanZoom();
  setupDragAndDrop();
});

// Fetch backend status and model details
async function initSystemStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.status === 'online') {
      const isCuda = data.cuda_available;
      elements.deviceStatusText.innerHTML = `<i class="fa-solid fa-${isCuda ? 'bolt' : 'microchip'}"></i> ${isCuda ? 'CUDA GPU Active' : 'CPU Mode'}`;
      if (elements.specDeviceText) {
        elements.specDeviceText.textContent = `${data.gpu_name} (PyTorch ${isCuda ? 'CUDA' : 'CPU'})`;
      }
    }
  } catch (err) {
    console.warn('Status check failed:', err);
    elements.deviceStatusText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Offline';
  }
}

// ==========================================================================
// Event Listeners Configuration
// ==========================================================================
function setupEventListeners() {
  // File Upload Handlers
  elements.fileInput.addEventListener('change', handleFileSelect);
  elements.browseBtn.addEventListener('click', () => elements.fileInput.click());
  
  // Sample Document Loaders
  elements.sampleInvoiceBtn.addEventListener('click', () => loadSampleDocument('sample_invoice'));
  elements.sampleReceiptBtn.addEventListener('click', () => loadSampleDocument('sample_receipt'));
  
  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Fullscreen Toggle
  elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
  
  // Overlay Mode Selector
  elements.boxModeSelect.addEventListener('change', (e) => {
    state.boxMode = e.target.value;
    updateBoxDisplayMode();
  });
  
  // Box Color Selector
  elements.colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      elements.colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const color = dot.dataset.color;
      state.boxColor = color;
      applyBoxColor(color);
    });
  });
  
  // Confidence Slider
  elements.confSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.minConfidence = val / 100.0;
    elements.confSliderVal.textContent = `${val}%`;
    filterBoxesByConfidence();
  });
  
  // Multi-page Pagination
  elements.prevPageBtn.addEventListener('click', () => {
    if (state.currentPageIndex > 0) {
      state.currentPageIndex--;
      renderCurrentPage();
    }
  });
  elements.nextPageBtn.addEventListener('click', () => {
    if (state.currentOcrData && state.currentPageIndex < state.currentOcrData.pages.length - 1) {
      state.currentPageIndex++;
      renderCurrentPage();
    }
  });
  
  // Search Filtering
  elements.wordSearchInput.addEventListener('input', handleWordSearch);
  elements.clearSearchBtn.addEventListener('click', clearWordSearch);
  
  // Inspector Tabs
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Word Card Filtering
  if (elements.filterWordListInput) {
    elements.filterWordListInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const cards = elements.wordsCardList.querySelectorAll('.word-row-card');
      cards.forEach(card => {
        const text = card.dataset.text.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }
  
  // Copy & Export Handlers
  elements.copyTextBtn.addEventListener('click', copyTranscribedText);
  elements.downloadTxtBtn.addEventListener('click', downloadTextFile);
  elements.copyJsonBtn.addEventListener('click', copyJsonData);
  elements.downloadJsonBtn.addEventListener('click', downloadJsonFile);
}

// ==========================================================================
// File Upload & OCR API Invocation
// ==========================================================================
async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  await processDocumentFile(file);
}

async function loadSampleDocument(sampleId) {
  showLoader('Loading Sample Document...', 'Executing OCR inference pipeline');
  try {
    const res = await fetch(`/api/ocr-sample/${sampleId}`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    handleOcrSuccess(data);
    showToast(`Loaded ${data.filename} successfully!`, 'success');
  } catch (err) {
    console.error('Error loading sample:', err);
    showToast(`Failed to load sample: ${err.message}`, 'error');
  } finally {
    hideLoader();
  }
}

async function processDocumentFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  showLoader('Analyzing Document...', `Detecting & recognizing words in ${file.name}`);
  
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'OCR Processing Error' }));
      throw new Error(errData.detail || 'Failed to process document');
    }
    
    const data = await res.json();
    handleOcrSuccess(data);
    showToast(`Successfully extracted ${data.total_words} words in ${data.inference_time_ms}ms`, 'success');
  } catch (err) {
    console.error('OCR Error:', err);
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

function handleOcrSuccess(data) {
  state.currentOcrData = data;
  state.currentPageIndex = 0;
  
  // Update HUD Metrics
  elements.hudWordCount.textContent = data.total_words;
  elements.hudAvgConf.textContent = `${Math.round(data.avg_confidence * 100)}%`;
  elements.hudLatency.textContent = `${data.inference_time_ms}ms`;
  elements.metricsHud.style.display = 'flex';
  
  // Multi-page Pagination Controls
  if (data.pages.length > 1) {
    elements.paginationWrapper.style.display = 'flex';
  } else {
    elements.paginationWrapper.style.display = 'none';
  }
  
  // Switch Views
  elements.dropZone.style.display = 'none';
  elements.documentContainer.style.display = 'inline-block';
  
  // Render Current Page
  renderCurrentPage();
  
  // Populate JSON Viewer
  elements.jsonCodeView.textContent = JSON.stringify(data, null, 2);
}

// ==========================================================================
// Page Rendering & Interactive Bounding Boxes
// ==========================================================================
function renderCurrentPage() {
  if (!state.currentOcrData) return;
  
  const page = state.currentOcrData.pages[state.currentPageIndex];
  if (!page) return;
  
  // Update Pagination Indicator
  elements.pageIndicator.textContent = `Page ${page.page_number} / ${state.currentOcrData.pages.length}`;
  elements.prevPageBtn.disabled = state.currentPageIndex === 0;
  elements.nextPageBtn.disabled = state.currentPageIndex === state.currentOcrData.pages.length - 1;
  
  // Load Document Base Image
  elements.documentImage.src = page.image_data;
  
  // Clean Overlay Layer
  elements.overlayLayer.innerHTML = '';
  
  // Wait for image dimensions
  elements.documentImage.onload = () => {
    buildInteractiveBoxes(page);
    buildTranscribedText(page);
    buildWordsCardList(page);
    fitToViewport();
  };
  
  if (elements.documentImage.complete) {
    buildInteractiveBoxes(page);
    buildTranscribedText(page);
    buildWordsCardList(page);
  }
}

// Build SVG/HTML bounding box overlays for words
function buildInteractiveBoxes(page) {
  elements.overlayLayer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  
  page.words.forEach(word => {
    const box = document.createElement('div');
    box.className = 'ocr-word-box';
    box.id = `box_${word.id}`;
    box.dataset.id = word.id;
    box.dataset.value = word.value;
    box.dataset.confidence = word.confidence;
    
    // Geometry percentages
    const g = word.geometry;
    const left = g.xmin * 100;
    const top = g.ymin * 100;
    const width = (g.xmax - g.xmin) * 100;
    const height = (g.ymax - g.ymin) * 100;
    
    box.style.left = `${left}%`;
    box.style.top = `${top}%`;
    box.style.width = `${width}%`;
    box.style.height = `${height}%`;
    
    // Mini Tag (For Compact mode)
    const miniTag = document.createElement('span');
    miniTag.className = 'box-mini-tag';
    miniTag.textContent = word.value;
    box.appendChild(miniTag);
    
    // Hover Events for Floating Tooltip
    box.addEventListener('mouseenter', (e) => showWordTooltip(e, word, box));
    box.addEventListener('mousemove', (e) => positionWordTooltip(e));
    box.addEventListener('mouseleave', hideWordTooltip);
    
    // Click Event to Copy & Highlight
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      copyWordToClipboard(word.value);
      highlightActiveWord(word.id);
    });
    
    fragment.appendChild(box);
  });
  
  elements.overlayLayer.appendChild(fragment);
  updateBoxDisplayMode();
  filterBoxesByConfidence();
}

// ==========================================================================
// Floating Tooltip Positioning & Content
// ==========================================================================
function showWordTooltip(e, word, boxEl) {
  elements.tooltipWordValue.textContent = word.value;
  const confPercent = Math.round(word.confidence * 100);
  elements.tooltipConf.textContent = `${confPercent}%`;
  
  // Style confidence badge
  elements.tooltipConf.className = 'tooltip-conf-badge';
  if (confPercent >= 90) elements.tooltipConf.classList.add('conf-high');
  else if (confPercent >= 70) elements.tooltipConf.classList.add('conf-medium');
  else elements.tooltipConf.classList.add('conf-low');
  
  const pg = word.pixel_geometry;
  elements.tooltipCoords.textContent = `X: ${pg.xmin}, Y: ${pg.ymin} | W: ${pg.width}px, H: ${pg.height}px`;
  
  elements.wordHoverTooltip.style.display = 'block';
  positionWordTooltip(e);
  
  // Highlight corresponding span in text tab
  const span = document.getElementById(`span_${word.id}`);
  if (span) span.classList.add('span-active');
  
  // Highlight card in words tab
  const card = document.getElementById(`card_${word.id}`);
  if (card) {
    card.classList.add('card-active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function positionWordTooltip(e) {
  const tooltip = elements.wordHoverTooltip;
  const x = e.clientX;
  const y = e.clientY;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideWordTooltip() {
  elements.wordHoverTooltip.style.display = 'none';
  document.querySelectorAll('.span-active').forEach(s => s.classList.remove('span-active'));
  document.querySelectorAll('.card-active').forEach(c => c.classList.remove('card-active'));
}

// ==========================================================================
// Inspector Section Builders (Transcriptions, Cards)
// ==========================================================================
function buildTranscribedText(page) {
  elements.transcriptionFlow.innerHTML = '';
  
  if (!page.lines || page.lines.length === 0) {
    elements.transcriptionFlow.innerHTML = `
      <div class="empty-tab-state">
        <i class="fa-regular fa-face-frown"></i>
        <p>No text detected on this page.</p>
      </div>`;
    return;
  }
  
  const fragment = document.createDocumentFragment();
  
  page.lines.forEach(line => {
    const lineCard = document.createElement('div');
    lineCard.className = 'text-line-card';
    lineCard.id = `line_${line.id}`;
    
    line.words.forEach(word => {
      const span = document.createElement('span');
      span.className = 'text-word-span';
      span.id = `span_${word.id}`;
      span.textContent = word.value;
      
      span.addEventListener('mouseenter', () => {
        const box = document.getElementById(`box_${word.id}`);
        if (box) box.classList.add('box-active');
      });
      
      span.addEventListener('mouseleave', () => {
        const box = document.getElementById(`box_${word.id}`);
        if (box) box.classList.remove('box-active');
      });
      
      span.addEventListener('click', () => {
        copyWordToClipboard(word.value);
        highlightActiveWord(word.id);
      });
      
      lineCard.appendChild(span);
    });
    
    fragment.appendChild(lineCard);
  });
  
  elements.transcriptionFlow.appendChild(fragment);
}

function buildWordsCardList(page) {
  elements.wordsCardList.innerHTML = '';
  elements.tabWordsCount.textContent = page.words.length;
  
  const fragment = document.createDocumentFragment();
  
  page.words.forEach(word => {
    const card = document.createElement('div');
    card.className = 'word-row-card';
    card.id = `card_${word.id}`;
    card.dataset.id = word.id;
    card.dataset.text = word.value;
    
    const conf = Math.round(word.confidence * 100);
    const pg = word.pixel_geometry;
    
    card.innerHTML = `
      <div class="word-val-col">
        <span class="word-main-text">${escapeHtml(word.value)}</span>
        <span class="word-meta-text">[${pg.xmin}, ${pg.ymin}] ${pg.width}×${pg.height}px</span>
      </div>
      <div class="word-conf-col">
        <div class="conf-bar-mini" title="Confidence: ${conf}%">
          <div class="conf-bar-fill" style="width: ${conf}%;"></div>
        </div>
        <span class="tooltip-conf-badge ${conf >= 90 ? '' : conf >= 70 ? 'conf-medium' : 'conf-low'}">${conf}%</span>
      </div>
    `;
    
    card.addEventListener('mouseenter', () => {
      const box = document.getElementById(`box_${word.id}`);
      if (box) box.classList.add('box-active');
    });
    
    card.addEventListener('mouseleave', () => {
      const box = document.getElementById(`box_${word.id}`);
      if (box) box.classList.remove('box-active');
    });
    
    card.addEventListener('click', () => {
      copyWordToClipboard(word.value);
      highlightActiveWord(word.id);
    });
    
    fragment.appendChild(card);
  });
  
  elements.wordsCardList.appendChild(fragment);
}

function highlightActiveWord(wordId) {
  document.querySelectorAll('.box-active').forEach(b => b.classList.remove('box-active'));
  const box = document.getElementById(`box_${wordId}`);
  if (box) {
    box.classList.add('box-active');
    box.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

// ==========================================================================
// Word Search & Real-Time Highlight
// ==========================================================================
function handleWordSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  state.searchQuery = query;
  
  const boxes = elements.overlayLayer.querySelectorAll('.ocr-word-box');
  let matchCount = 0;
  
  if (!query) {
    boxes.forEach(b => b.classList.remove('box-highlighted'));
    elements.searchMatchCount.textContent = '';
    elements.clearSearchBtn.style.display = 'none';
    return;
  }
  
  elements.clearSearchBtn.style.display = 'block';
  
  boxes.forEach(box => {
    const val = box.dataset.value.toLowerCase();
    if (val.includes(query)) {
      box.classList.add('box-highlighted');
      matchCount++;
    } else {
      box.classList.remove('box-highlighted');
    }
  });
  
  elements.searchMatchCount.textContent = matchCount > 0 ? `${matchCount} found` : '0 found';
}

function clearWordSearch() {
  elements.wordSearchInput.value = '';
  state.searchQuery = '';
  elements.searchMatchCount.textContent = '';
  elements.clearSearchBtn.style.display = 'none';
  elements.overlayLayer.querySelectorAll('.box-highlighted').forEach(b => b.classList.remove('box-highlighted'));
}

// ==========================================================================
// Canvas Pan & Zoom Controller
// ==========================================================================
function setupCanvasPanZoom() {
  // Zoom In / Out Buttons
  elements.zoomInBtn.addEventListener('click', () => applyZoom(state.zoomLevel + 0.15));
  elements.zoomOutBtn.addEventListener('click', () => applyZoom(state.zoomLevel - 0.15));
  elements.zoomResetBtn.addEventListener('click', () => {
    state.panX = 0;
    state.panY = 0;
    applyZoom(1.0);
  });
  elements.zoomFitBtn.addEventListener('click', fitToViewport);
  
  // Mouse Wheel Zoom
  elements.canvasStageWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey || elements.documentContainer.style.display !== 'none') {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      applyZoom(state.zoomLevel + delta);
    }
  }, { passive: false });
}

function applyZoom(newZoom) {
  state.zoomLevel = Math.max(0.2, Math.min(4.0, newZoom));
  elements.zoomLevelDisplay.textContent = `${Math.round(state.zoomLevel * 100)}%`;
  elements.documentContainer.style.transform = `scale(${state.zoomLevel})`;
}

function fitToViewport() {
  if (!elements.documentImage.naturalWidth) return;
  const stage = elements.canvasStageWrapper;
  const stageW = stage.clientWidth - 80;
  const stageH = stage.clientHeight - 80;
  
  const imgW = elements.documentImage.naturalWidth;
  const imgH = elements.documentImage.naturalHeight;
  
  const scale = Math.min(stageW / imgW, stageH / imgH, 1.0);
  applyZoom(scale);
}

// ==========================================================================
// Drag & Drop Configuration
// ==========================================================================
function setupDragAndDrop() {
  const dropZone = elements.dropZone;
  const stage = elements.canvasStageWrapper;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evtName => {
    stage.addEventListener(evtName, preventDefaults, false);
    dropZone.addEventListener(evtName, preventDefaults, false);
  });
  
  ['dragenter', 'dragover'].forEach(evtName => {
    stage.addEventListener(evtName, () => dropZone.classList.add('drag-over'), false);
  });
  
  ['dragleave', 'drop'].forEach(evtName => {
    stage.addEventListener(evtName, () => dropZone.classList.remove('drag-over'), false);
  });
  
  stage.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    processDocumentFile(files[0]);
  }
}

// ==========================================================================
// View Display Modes & Styles
// ==========================================================================
function updateBoxDisplayMode() {
  const wrapper = elements.documentContainer;
  wrapper.classList.remove('box-mode-compact', 'box-mode-clean', 'box-mode-always');
  
  if (state.boxMode === 'compact') {
    wrapper.classList.add('box-mode-compact');
  } else if (state.boxMode === 'clean') {
    wrapper.classList.add('box-mode-clean');
  } else if (state.boxMode === 'always-boxes') {
    wrapper.classList.add('box-mode-always');
  }
}

function applyBoxColor(colorName) {
  const colors = {
    cyan: { stroke: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', hover: 'rgba(6, 182, 212, 0.35)', glow: '0 0 12px rgba(6, 182, 212, 0.6)' },
    emerald: { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', hover: 'rgba(16, 185, 129, 0.35)', glow: '0 0 12px rgba(16, 185, 129, 0.6)' },
    violet: { stroke: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', hover: 'rgba(168, 85, 247, 0.35)', glow: '0 0 12px rgba(168, 85, 247, 0.6)' },
    amber: { stroke: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', hover: 'rgba(245, 158, 11, 0.35)', glow: '0 0 12px rgba(245, 158, 11, 0.6)' }
  };
  
  const c = colors[colorName] || colors.cyan;
  document.documentElement.style.setProperty('--box-stroke', c.stroke);
  document.documentElement.style.setProperty('--box-bg', c.bg);
  document.documentElement.style.setProperty('--box-hover-bg', c.hover);
  document.documentElement.style.setProperty('--box-glow', c.glow);
}

function filterBoxesByConfidence() {
  const boxes = elements.overlayLayer.querySelectorAll('.ocr-word-box');
  boxes.forEach(box => {
    const conf = parseFloat(box.dataset.confidence);
    box.style.display = conf >= state.minConfidence ? 'block' : 'none';
  });
}

// ==========================================================================
// Export & Copy Handlers
// ==========================================================================
async function copyWordToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied "${text}" to clipboard`, 'info');
  } catch (err) {
    showToast(`Copied: ${text}`, 'info');
  }
}

async function copyTranscribedText() {
  if (!state.currentOcrData) return;
  const page = state.currentOcrData.pages[state.currentPageIndex];
  if (!page || !page.raw_text) {
    showToast('No text to copy', 'error');
    return;
  }
  await navigator.clipboard.writeText(page.raw_text);
  showToast('Copied full document text to clipboard!', 'success');
}

function downloadTextFile() {
  if (!state.currentOcrData) return;
  const page = state.currentOcrData.pages[state.currentPageIndex];
  if (!page) return;
  
  const blob = new Blob([page.raw_text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OCR_Transcription_Page_${page.page_number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded text transcription (.txt)', 'success');
}

async function copyJsonData() {
  if (!state.currentOcrData) return;
  const jsonStr = JSON.stringify(state.currentOcrData, null, 2);
  await navigator.clipboard.writeText(jsonStr);
  showToast('Copied docTR JSON data to clipboard!', 'success');
}

function downloadJsonFile() {
  if (!state.currentOcrData) return;
  const jsonStr = JSON.stringify(state.currentOcrData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DocTR_OCR_Results.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded docTR JSON file', 'success');
}

// ==========================================================================
// Theme & Utility Helpers
// ==========================================================================
function toggleTheme() {
  const html = document.documentElement;
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    html.classList.add('light');
    elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    state.theme = 'light';
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    elements.themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    state.theme = 'dark';
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    elements.fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
  } else {
    document.exitFullscreen().catch(() => {});
    elements.fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
  }
}

function showLoader(title, desc) {
  if (title) elements.loaderTitle.textContent = title;
  if (desc) elements.loaderDesc.textContent = desc;
  elements.processingOverlay.style.display = 'flex';
}

function hideLoader() {
  elements.processingOverlay.style.display = 'none';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(0.95)';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
