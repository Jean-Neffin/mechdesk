/* ============================================================
   Sortd — script.js
   App state, wizard flow, parsing, algorithm, drag-drop, UI
   ============================================================ */

'use strict';

/* ============================
   1. APP STATE
   ============================ */
const AppState = {
  currentStep: 1,
  maxVisitedStep: 1, // highest step reached — controls which steps are clickable
  theme: 'light',
  rawFile: null,
  rawRows: [],
  columnMap: { name: null, cgpa: null, uid: null, regNo: null },
  students: [],
  anomalies: [],
  lockedTeams: [],
  groupSize: 4,
  groups: [],
  // UI state
  previewPage: 1,
  m1Page: 1,
  m1Selected: new Set(),
  m2Selected: [],
  pendingGeminiMatch: [],
};

const ROWS_PER_PAGE = 20;
const M1_PER_PAGE   = 10;

const STEP_LABELS = ['', 'Upload', 'Preview & Validate', 'Pre-formed Teams', 'Configure Groups', 'Review & Download'];

/* ============================
   2. STEP NAVIGATION
   ============================ */
function showStep(n) {
  document.querySelectorAll('.step-container').forEach(el => {
    el.hidden = true;
  });
  const target = document.getElementById(`step-${n}`);
  target.hidden = false;
  // Re-trigger animation
  target.style.animation = 'none';
  requestAnimationFrame(() => { target.style.animation = ''; });

  document.getElementById('nav-step-label').textContent = `Step ${n} of 5 — ${STEP_LABELS[n]}`;

  document.querySelectorAll('.step-node').forEach(node => {
    const s = parseInt(node.dataset.step);
    node.classList.remove('is-complete', 'is-active', 'is-locked-active');
    if (s < n)  node.classList.add('is-complete');
    if (s === n) node.classList.add(n === 3 ? 'is-locked-active' : 'is-active');
  });

  // Update connector lines
  document.querySelectorAll('.step-connector').forEach((conn, i) => {
    const prevStep = i + 1;
    conn.style.background = prevStep < n ? 'var(--color-primary)' : 'var(--color-border)';
  });

  AppState.currentStep = n;
  if (n > AppState.maxVisitedStep) AppState.maxVisitedStep = n;

  // Update navbar progress bar
  const progress = (n / 5) * 100;
  document.documentElement.style.setProperty('--nav-progress', `${progress}%`);

  // Update clickability of step nodes
  document.querySelectorAll('.step-node').forEach(node => {
    const s = parseInt(node.dataset.step);
    node.style.cursor = s <= AppState.maxVisitedStep ? 'pointer' : 'default';
    node.title = s <= AppState.maxVisitedStep ? `Go to Step ${s}` : '';
  });

  // Show/hide download bar
  document.getElementById('download-bar').classList.toggle('visible', n === 5);

  // Step-specific init
  if (n === 2) initStep2UI();
  if (n === 3) initStep3UI();
  if (n === 4) initStep4UI();
}

/* ============================
   3. UTILITIES
   ============================ */
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.add('hidden');
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ============================
   4. THEME TOGGLE & API KEY
   ============================ */
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  AppState.theme = next;
});

document.getElementById('btn-api-key').addEventListener('click', () => {
  document.getElementById('api-key-input').value = AI.getKey();
  document.getElementById('api-modal').classList.remove('hidden');
});

/* ============================
   KEYBOARD SHORTCUTS & UNDO/REDO
   ============================ */

// ── Undo/Redo History ──
const History = (() => {
  const MAX = 50;
  let past   = []; // stack of snapshots before action
  let future = []; // stack of snapshots after undo

  function snapshot() {
    return {
      groups:      JSON.parse(JSON.stringify(AppState.groups)),
      lockedTeams: JSON.parse(JSON.stringify(AppState.lockedTeams)),
      students:    JSON.parse(JSON.stringify(AppState.students)),
    };
  }

  function push() {
    past.push(snapshot());
    if (past.length > MAX) past.shift();
    future = []; // clear redo stack on new action
  }

  function undo() {
    if (!past.length) return;
    future.push(snapshot());
    const prev = past.pop();
    AppState.groups      = prev.groups;
    AppState.lockedTeams = prev.lockedTeams;
    AppState.students    = prev.students;
    if (AppState.currentStep === 5) renderGroups();
    if (AppState.currentStep === 3) renderLockedTeamsList();
    showToastNotification('↩ Undo');
  }

  function redo() {
    if (!future.length) return;
    past.push(snapshot());
    const next = future.pop();
    AppState.groups      = next.groups;
    AppState.lockedTeams = next.lockedTeams;
    AppState.students    = next.students;
    if (AppState.currentStep === 5) renderGroups();
    if (AppState.currentStep === 3) renderLockedTeamsList();
    showToastNotification('↪ Redo');
  }

  function canUndo() { return past.length > 0; }
  function canRedo() { return future.length > 0; }

  return { push, undo, redo, canUndo, canRedo };
})();

// ── Toast notification (lightweight feedback for shortcuts) ──
function showToastNotification(msg) {
  let toast = document.getElementById('kb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kb-toast';
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:var(--color-text-primary); color:var(--color-text-inverse);
      padding:8px 20px; border-radius:20px; font-size:13px; font-family:var(--font-body);
      z-index:999; pointer-events:none; opacity:0;
      transition: opacity 200ms ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 1800);
}

// ── Global keyboard handler ──
document.addEventListener('keydown', (e) => {
  const step = AppState.currentStep;
  const tag  = document.activeElement?.tagName?.toLowerCase();
  const isTyping = ['input','textarea','select'].includes(tag);
  const isMod = e.ctrlKey || e.metaKey;

  // Ctrl+Z — Undo
  if (isMod && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    History.undo();
    return;
  }

  // Ctrl+Shift+Z or Ctrl+Y — Redo
  if ((isMod && e.shiftKey && e.key === 'z') || (isMod && e.key === 'y')) {
    e.preventDefault();
    History.redo();
    return;
  }

  // Skip remaining shortcuts if user is typing in an input
  if (isTyping) return;

  // Escape — close modal / cancel rename
  if (e.key === 'Escape') {
    document.getElementById('api-modal')?.classList.add('hidden');
    // Commit any active rename input
    document.querySelectorAll('.group-rename-input').forEach(input => input.blur());
    return;
  }

  // Ctrl+Enter — Next step
  if (isMod && e.key === 'Enter') {
    e.preventDefault();
    const nextBtns = {
      1: 'btn-next-1', 2: 'btn-next-2', 3: 'btn-next-3', 4: 'btn-generate',
    };
    const btnId = nextBtns[step];
    if (btnId) {
      const btn = document.getElementById(btnId);
      if (btn && !btn.disabled) { btn.click(); showToastNotification('⏩ Next step'); }
    }
    return;
  }

  // Ctrl+G — Generate groups (Step 4)
  if (isMod && e.key === 'g' && step === 4) {
    e.preventDefault();
    const btn = document.getElementById('btn-generate');
    if (btn && !btn.disabled) { btn.click(); showToastNotification('⚡ Generating groups...'); }
    return;
  }

  // Ctrl+S — Save session (Step 5)
  if (isMod && e.key === 's' && step === 5) {
    e.preventDefault();
    document.getElementById('btn-save-session')?.click();
    showToastNotification('💾 Session saved');
    return;
  }

  // Ctrl+D — Download PDF (Step 5)
  if (isMod && e.key === 'd' && step === 5) {
    e.preventDefault();
    document.getElementById('btn-pdf')?.click();
    showToastNotification('📄 Downloading PDF...');
    return;
  }

  // Backspace / Delete — go back a step (not on step 1)
  if ((e.key === 'Backspace' || e.key === 'Delete') && step > 1 && step < 5) {
    e.preventDefault();
    const backBtns = { 2:'btn-back-2', 3:'btn-back-3', 4:'btn-back-4' };
    document.getElementById(backBtns[step])?.click();
    return;
  }

  // ? key — show shortcut cheatsheet
  if (e.key === '?') {
    showShortcutCheatsheet();
    return;
  }

  // Number keys 1-5 — jump to visited step directly
  const num = parseInt(e.key);
  if (num >= 1 && num <= 5 && !isMod) {
    if (num <= AppState.maxVisitedStep && num !== AppState.currentStep) {
      e.preventDefault();
      if (num === 2 && AppState.rawRows.length > 0) buildAndValidateStudents();
      showStep(num);
      showToastNotification(`Step ${num}`);
    }
    return;
  }

  // Arrow keys — navigate between group cards on Step 5
  // Only intercept if not inside a select/input (let browser handle those natively)
  if (step === 5 && !isTyping && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const cards = [...document.querySelectorAll('.group-card')];
    if (!cards.length) return;
    const focused = document.querySelector('.group-card.kb-focused');
    let idx = focused ? cards.indexOf(focused) : -1;
    const cols = window.innerWidth > 1100 ? 4 : window.innerWidth > 800 ? 3 : window.innerWidth > 520 ? 2 : 1;
    if (e.key === 'ArrowRight') idx = Math.min(idx + 1, cards.length - 1);
    if (e.key === 'ArrowLeft')  idx = Math.max(idx - 1, 0);
    if (e.key === 'ArrowDown')  idx = Math.min(idx + cols, cards.length - 1);
    if (e.key === 'ArrowUp')    idx = Math.max(idx - cols, 0);
    if (idx < 0) idx = 0;
    cards.forEach(c => c.classList.remove('kb-focused'));
    cards[idx].classList.add('kb-focused');
    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
});

// ── Shortcut cheatsheet modal ──
function showShortcutCheatsheet() {
  let modal = document.getElementById('shortcut-modal');
  if (modal) { modal.remove(); return; } // toggle

  modal = document.createElement('div');
  modal.id = 'shortcut-modal';
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:500;
    display:flex; align-items:center; justify-content:center;
    backdrop-filter:blur(4px);
  `;
  modal.innerHTML = `
    <div style="background:var(--color-bg-surface); border-radius:var(--radius-lg);
      padding:32px; max-width:420px; width:90%; box-shadow:var(--shadow-elevated);">
      <div style="font-family:var(--font-display);font-size:20px;margin-bottom:20px;">
        ⌨️ Keyboard Shortcuts
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tbody>
          ${[
            ['Ctrl+Z',         'Undo last action'],
            ['Ctrl+Shift+Z',   'Redo'],
            ['Ctrl+Enter',     'Next step'],
            ['1 – 5',          'Jump to any visited step'],
            ['Ctrl+G',         'Generate groups (Step 4)'],
            ['Ctrl+S',         'Save session (Step 5)'],
            ['Ctrl+D',         'Download PDF (Step 5)'],
            ['Backspace',      'Go back a step'],
            ['Escape',         'Close modal / cancel rename'],
            ['?',              'Show / hide this cheatsheet'],
          ].map(([key, desc]) => `
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:8px 12px 8px 0;">
                <kbd style="background:var(--color-bg-subtle);border:1px solid var(--color-border);
                  border-radius:4px;padding:2px 8px;font-family:var(--font-mono);font-size:11px;">
                  ${key}
                </kbd>
              </td>
              <td style="padding:8px 0;color:var(--color-text-secondary);">${desc}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <button onclick="document.getElementById('shortcut-modal').remove()"
        style="margin-top:20px;width:100%;" class="btn btn-primary">Close</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

document.getElementById('btn-api-cancel').addEventListener('click', () => {
  document.getElementById('api-modal').classList.add('hidden');
});

document.getElementById('btn-api-save').addEventListener('click', () => {
  const key = document.getElementById('api-key-input').value.trim();
  AI.setKey(key);
  document.getElementById('api-modal').classList.add('hidden');
});

/* ============================
   5. STEP 1 — UPLOAD
   ============================ */
const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
const btnBrowse  = document.getElementById('btn-browse');
const btnNext1   = document.getElementById('btn-next-1');

btnBrowse.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click',  () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

btnNext1.addEventListener('click', () => showStep(2));

function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    alert('Please upload a .csv or .xlsx file.');
    return;
  }
  AppState.rawFile = file;

  const fileBadgeWrap = document.getElementById('file-badge-wrap');
  document.getElementById('file-name').textContent = `${file.name} (${formatBytes(file.size)})`;
  fileBadgeWrap.classList.remove('hidden');
  btnNext1.disabled = true; // keep disabled until parsing completes
  // Nudge progress bar to show file is being processed
  document.documentElement.style.setProperty('--nav-progress', '30%');

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const wb   = XLSX.read(data, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];

    // Parse as raw 2D array
    const rawArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find best header row — highest score of label-like string cells
    let headerRowIndex = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(10, rawArray.length); i++) {
      const row = rawArray[i];
      const stringCells = row.filter(c =>
        typeof c === 'string' && c.trim().length > 0 && c.trim().length < 40
      );
      const labelLike = stringCells.filter(c => c.trim().split(' ').length <= 3);
      const score = labelLike.length * 2 + stringCells.length;
      if (score > bestScore && stringCells.length >= 2) {
        bestScore = score;
        headerRowIndex = i;
      }
    }

    const headers = rawArray[headerRowIndex].map((h, i) =>
      (h !== '' && h !== null && h !== undefined) ? String(h).trim() : 'Column_' + (i + 1)
    );

    // Data rows start after header row
    const rows = rawArray.slice(headerRowIndex + 1)
      .filter(row => row.some(c => c !== '' && c !== null && c !== undefined))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      });

    AppState.rawRows = rows;
    AppState._detectedHeaders = headers;
    AppState._step2Initialised = false; // reset so Step 2 re-inits with new file
    AppState._step3Initialised = false;

    // File is fully parsed — now enable the Next button
    btnNext1.disabled = false;
  };
  reader.readAsArrayBuffer(file);
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ============================
   6. STEP 2 — PREVIEW & VALIDATE
   ============================ */
function initStep2UI() {
  // Only initialise once per file upload — prevent re-running on back/next
  if (AppState._step2Initialised) return;
  AppState._step2Initialised = true;

  const rows    = AppState.rawRows;
  const headers = AppState._detectedHeaders || (rows.length ? Object.keys(rows[0]) : []);

  // Populate dropdowns with all detected headers
  ['name','cgpa','uid','regNo'].forEach(field => {
    const sel = document.getElementById(`map-${field}`);
    sel.innerHTML = '<option value="">— select column —</option>';
    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h; opt.textContent = h;
      sel.appendChild(opt);
    });
  });

  // Show loading state on dropdowns while AI works
  showMappingLoadingState(true);

  // Student count badge
  document.getElementById('student-count-badge').textContent = `${rows.length} students`;

  // Show skeleton banner while AI runs
  const banner = document.getElementById('ai-validation-banner');
  banner.className = 'banner-skeleton skeleton mb-16';
  banner.innerHTML = '';

  // No pagination — table scrolls internally
  initSortableHeaders();

  // Wire up manual override dropdowns
  ['name','cgpa','uid','regNo'].forEach(field => {
    const sel = document.getElementById(`map-${field}`);
    const fresh = sel.cloneNode(true);
    sel.parentNode.replaceChild(fresh, sel);
    document.getElementById(`map-${field}`).addEventListener('change', (e) => {
      AppState.columnMap[field] = e.target.value || null;
      buildAndValidateStudents();
    });
  });

  // Step 1: local quick-detect as a temporary starting point (shown while AI loads)
  const localMap = autoDetectColumns(headers);
  applyColumnMap(localMap, false);

  // Render table immediately with local map so teacher sees data right away
  AppState.previewPage = 1;
  buildAndValidateStudents();

  // Step 2: AI mapping — async, overrides local map when ready
  if (AI.hasKey()) {
    runAIColumnMapping(headers, rows);
  } else {
    showMappingLoadingState(false);
    renderValidationBanner([]);
  }
}

function showMappingLoadingState(loading) {
  ['name','cgpa','uid','regNo'].forEach(field => {
    const sel = document.getElementById(`map-${field}`);
    if (sel) sel.style.opacity = loading ? '0.5' : '1';
  });
}

function applyColumnMap(map, isAI) {
  ['name','cgpa','uid','regNo'].forEach(field => {
    if (map[field]) {
      const sel = document.getElementById(`map-${field}`);
      if (sel) {
        // Find option that matches exactly, or case-insensitively
        const options = [...sel.options];
        const exact = options.find(o => o.value === map[field]);
        const loose = options.find(o => o.value.toLowerCase().trim() === String(map[field]).toLowerCase().trim());
        const match = exact || loose;
        if (match) {
          sel.value = match.value;
          AppState.columnMap[field] = match.value;
        }
      }
      if (isAI) {
        document.getElementById(`ai-chip-${field}`)?.classList.remove('hidden');
      }
    }
  });
}

function autoDetectColumns(headers) {
  const HINTS = {
    name:  ['studentname','fullname','name','student'],
    cgpa:  ['cgpa','gpa','pointer','cumulativegpa'],
    uid:   ['uid','admissionno','admno','studentid'],
    regNo: ['retno','regno','rollno','registration','roll','regnumber','retnumber'],
  };
  const map = { name: null, cgpa: null, uid: null, regNo: null };

  // Score each header against each field — pick best match
  for (const [field, hints] of Object.entries(HINTS)) {
    let bestHeader = null;
    let bestScore  = -1;
    for (const h of headers) {
      const n = h.toLowerCase().replace(/[\s_\-\.]/g,'');
      const score = hints.findIndex(hint => n.includes(hint));
      if (score !== -1 && (bestScore === -1 || score < bestScore)) {
        bestHeader = h;
        bestScore  = score;
      }
    }
    if (bestHeader) map[field] = bestHeader;
  }

  // Extra check: if cgpa mapped column has no decimal values in sample data, clear it
  // (prevents mapping backlog count columns that happen to match "score" etc.)
  return map;
}

async function runAIColumnMapping(headers, rows) {
  const result = await AI.mapColumns(headers, rows);
  showMappingLoadingState(false);

  if (result) {
    // AI result overrides everything
    applyColumnMap(result, true);
  }

  // Build students with whatever mapping we have now
  buildAndValidateStudents();

  // Run anomaly validation as separate step
  if (AppState.students.length > 0) {
    runAIValidation();
  } else {
    renderValidationBanner([]);
  }
}

function buildAndValidateStudents() {
  const { columnMap, rawRows } = AppState;

  // Guard: if rawRows is empty, nothing to do
  if (!rawRows || rawRows.length === 0) {
    document.getElementById('student-count-badge').textContent = '0 students';
    renderPreviewTable();
    return;
  }

  AppState.students = rawRows
    .map((row, i) => ({
      id:       uuid(),
      name:     columnMap.name  ? String(row[columnMap.name]  ?? '').trim() : '',
      cgpa:     columnMap.cgpa  ? parseFloat(row[columnMap.cgpa]) || 0      : 0,
      uid:      columnMap.uid   ? String(row[columnMap.uid]   ?? '').trim() : '',
      regNo:    columnMap.regNo ? String(row[columnMap.regNo] ?? '').trim() : '',
      lockedTeamId: null,
      _row: i + 1,
    }))
    .filter(s => s.name !== '');

  document.getElementById('student-count-badge').textContent =
    `${AppState.students.length} students`;
  renderPreviewTable();
}

async function runAIValidation() {
  // Snapshot students before async call — don't rebuild after
  const studentSnapshot = [...AppState.students];
  if (studentSnapshot.length === 0) return;

  const banner = document.getElementById('ai-validation-banner');
  banner.className = 'banner-skeleton skeleton mb-16';
  banner.innerHTML = '';

  const anomalies = await AI.validateData(studentSnapshot);
  AppState.anomalies = Array.isArray(anomalies) ? anomalies : [];

  // Only update banner and highlight rows — do NOT rebuild students
  renderValidationBanner(AppState.anomalies);
  renderPreviewTable();
}

function renderValidationBanner(anomalies) {
  const el = document.getElementById('ai-validation-banner');
  if (!anomalies.length) {
    el.className = 'banner banner-success mb-16';
    el.innerHTML = `<div class="banner-header">✅ All data looks valid${AI.hasKey() ? ' — Gemini found no anomalies.' : '.'}</div>`;
    return;
  }
  el.className = 'banner banner-warning mb-16';
  const items = anomalies.map(a =>
    `<li>Row ${a.rowIndex}: <strong>${a.field}</strong> — ${esc(a.message)}</li>`
  ).join('');
  el.innerHTML = `
    <div class="banner-header">
      ⚠️ Gemini found ${anomalies.length} anomaly${anomalies.length > 1 ? 'ies' : ''}
      <button class="banner-toggle" id="banner-toggle-btn">▲ Hide</button>
    </div>
    <div class="banner-body" id="banner-body">
      <ul>${items}</ul>
      <p style="margin-top:8px;font-size:12px;color:var(--color-text-secondary);">
        Tip: Fix these in your original file and re-upload, or proceed and adjust manually.
      </p>
    </div>`;

  document.getElementById('banner-toggle-btn')?.addEventListener('click', function() {
    const body = document.getElementById('banner-body');
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? '' : 'none';
    this.textContent = hidden ? '▲ Hide' : '▼ Show';
  });
}

// Sort state for preview table
const PreviewSort = { field: null, dir: 1 }; // dir: 1=asc, -1=desc

function initSortableHeaders() {
  const fields = [
    { id: 'th-name',  key: 'name',  type: 'str' },
    { id: 'th-cgpa',  key: 'cgpa',  type: 'num' },
    { id: 'th-uid',   key: 'uid',   type: 'str' },
    { id: 'th-regno', key: 'regNo', type: 'str' },
  ];
  fields.forEach(({ id, key, type }) => {
    const th = document.getElementById(id);
    if (!th) return;
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';
    th.addEventListener('click', () => {
      if (PreviewSort.field === key) {
        PreviewSort.dir *= -1;
      } else {
        PreviewSort.field = key;
        PreviewSort.dir = key === 'cgpa' ? -1 : 1; // CGPA defaults desc, others asc
      }
      // Update arrow indicators
      fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        el.querySelector('.sort-arrow')?.remove();
        if (f.key === PreviewSort.field) {
          const arrow = document.createElement('span');
          arrow.className = 'sort-arrow';
          arrow.textContent = PreviewSort.dir === 1 ? ' ↑' : ' ↓';
          arrow.style.color = 'var(--color-primary)';
          arrow.style.fontSize = '11px';
          el.appendChild(arrow);
        }
      });
      renderPreviewTable();
    });
    // Hover style
    th.addEventListener('mouseenter', () => th.style.color = 'var(--color-primary)');
    th.addEventListener('mouseleave', () => th.style.color = '');
  });
}

function getSortedStudents() {
  const { students } = AppState;
  if (!PreviewSort.field) return students;
  return [...students].sort((a, b) => {
    const av = a[PreviewSort.field];
    const bv = b[PreviewSort.field];
    if (typeof av === 'number') return (av - bv) * PreviewSort.dir;
    return String(av).localeCompare(String(bv)) * PreviewSort.dir;
  });
}

function renderPreviewTable() {
  const tbody = document.getElementById('preview-tbody');
  const { anomalies } = AppState;
  const anomalyRows = new Set(anomalies.map(a => a.rowIndex));
  const sorted = getSortedStudents();

  document.getElementById('table-range-label').textContent =
    `${sorted.length} students`;

  tbody.innerHTML = sorted.map(s => {
    const isAnomaly = anomalyRows.has(s._row);
    return `<tr class="${isAnomaly ? 'row-anomaly' : ''}">
      <td class="mono muted">${s._row}</td>
      <td>${esc(s.name)}</td>
      <td class="mono">${s.cgpa}</td>
      <td class="mono">${esc(s.uid)}</td>
      <td class="mono">${esc(s.regNo)}</td>
    </tr>`;
  }).join('');
}

document.getElementById('btn-back-2').addEventListener('click', () => showStep(1));
document.getElementById('btn-next-2').addEventListener('click', () => {
  if (!AppState.columnMap.name || !AppState.columnMap.cgpa) {
    alert('Please map at least the Name and CGPA columns before continuing.');
    return;
  }
  // Rebuild students with current map in case AI finished after initial build
  buildAndValidateStudents();
  if (AppState.students.length === 0) {
    alert('No students found. Please check your column mapping.');
    return;
  }
  showStep(3);
});

/* ============================
   7. STEP 3 — PRE-FORMED TEAMS
   ============================ */
function initStep3UI() {
  // Reset selections on each visit
  AppState.m1Selected = new Set();
  AppState.m2Selected = [];

  renderM1Table();
  renderM2Pills();
  renderLockedTeamsList();

  // Guard against stacking duplicate event listeners
  if (AppState._step3Initialised) return;
  AppState._step3Initialised = true;

  // M1 search
  document.getElementById('m1-search').addEventListener('input', () => {
    renderM1Table();
  });
  // No pagination — table scrolls internally

  // M2 search autocomplete
  const m2Input = document.getElementById('m2-search');
  const m2AC    = document.getElementById('m2-autocomplete');
  let m2ACIndex = -1; // tracks keyboard-highlighted item

  function renderM2Autocomplete(q) {
    if (!q) { m2AC.style.display = 'none'; m2ACIndex = -1; return; }
    const matches = AppState.students
      .filter(s => !s.lockedTeamId &&
        !AppState.m2Selected.find(x => x.id === s.id) &&
        (s.name.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q)))
      .slice(0, 8);
    if (!matches.length) { m2AC.style.display = 'none'; m2ACIndex = -1; return; }
    m2AC.innerHTML = matches.map((s, i) =>
      `<div class="autocomplete-item" data-id="${s.id}" data-index="${i}"
        style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
        ${esc(s.name)} <span style="font-family:var(--font-mono);font-size:11px;color:var(--color-text-secondary);">${esc(s.uid)}</span>
      </div>`
    ).join('');
    m2AC.style.display = 'block';
    m2ACIndex = -1;

    m2AC.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        m2AC.querySelectorAll('.autocomplete-item').forEach(i => i.style.background = '');
        item.style.background = 'var(--color-primary-soft)';
        m2ACIndex = parseInt(item.dataset.index);
      });
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('click', () => selectM2Item(item.dataset.id));
    });
  }

  function selectM2Item(id) {
    const student = AppState.students.find(s => s.id === id);
    if (student && AppState.m2Selected.length < 3) {
      AppState.m2Selected.push(student);
      renderM2Pills();
      m2Input.value = '';
      m2AC.style.display = 'none';
      m2ACIndex = -1;
      hideError('m2-error');
      m2Input.focus();
    }
  }

  function highlightM2Item(index) {
    const items = m2AC.querySelectorAll('.autocomplete-item');
    items.forEach(i => i.style.background = '');
    if (index >= 0 && index < items.length) {
      items[index].style.background = 'var(--color-primary-soft)';
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  m2Input.addEventListener('input', () => {
    renderM2Autocomplete(m2Input.value.toLowerCase().trim());
  });

  m2Input.addEventListener('keydown', (e) => {
    const items = m2AC.querySelectorAll('.autocomplete-item');
    if (!items.length || m2AC.style.display === 'none') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      m2ACIndex = Math.min(m2ACIndex + 1, items.length - 1);
      highlightM2Item(m2ACIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      m2ACIndex = Math.max(m2ACIndex - 1, 0);
      highlightM2Item(m2ACIndex);
    } else if (e.key === 'Enter' && m2ACIndex >= 0) {
      e.preventDefault();
      const item = items[m2ACIndex];
      if (item) selectM2Item(item.dataset.id);
    } else if (e.key === 'Escape') {
      m2AC.style.display = 'none';
      m2ACIndex = -1;
    }
  });
  document.addEventListener('click', (e) => {
    if (!m2Input.contains(e.target)) m2AC.style.display = 'none';
  });
}

function getM1Filtered() {
  const q = document.getElementById('m1-search').value.toLowerCase().trim();
  return AppState.students.filter(s =>
    !q || s.name.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q)
  );
}

function renderM1Table() {
  const filtered = getM1Filtered();

  document.getElementById('m1-tbody').innerHTML = filtered.map(s => {
    const locked  = !!s.lockedTeamId;
    const checked = AppState.m1Selected.has(s.id);
    return `<tr class="${locked ? 'row-locked' : ''}">
      <td style="padding:8px 10px;">
        ${locked
          ? '🔒'
          : `<input type="checkbox" data-id="${s.id}" ${checked ? 'checked' : ''} />`}
      </td>
      <td>${esc(s.name)}</td>
      <td class="mono">${s.cgpa}</td>
      <td class="mono">${esc(s.uid)}</td>
    </tr>`;
  }).join('');

  // Attach checkbox events
  document.querySelectorAll('#m1-tbody input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (AppState.m1Selected.size >= 3) {
          cb.checked = false;
          showError('m1-error', 'Max 3 students per team.');
          return;
        }
        AppState.m1Selected.add(cb.dataset.id);
      } else {
        AppState.m1Selected.delete(cb.dataset.id);
      }
      hideError('m1-error');
      document.getElementById('m1-count').textContent = `${AppState.m1Selected.size} selected`;
    });
  });

  document.getElementById('m1-count').textContent = `${AppState.m1Selected.size} selected`;
}

function renderM2Pills() {
  const list = document.getElementById('m2-pills');
  list.innerHTML = AppState.m2Selected.map(s =>
    `<span class="student-pill">
      ${esc(s.name)}
      <button data-id="${s.id}" aria-label="Remove">×</button>
    </span>`
  ).join('');
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.m2Selected = AppState.m2Selected.filter(s => s.id !== btn.dataset.id);
      renderM2Pills();
    });
  });
}

// Lock from M1
document.getElementById('btn-lock-m1').addEventListener('click', () => {
  hideError('m1-error');
  const ids = [...AppState.m1Selected];
  if (ids.length < 2) { showError('m1-error', 'Select at least 2 students.'); return; }
  if (ids.length > 3) { showError('m1-error', 'Maximum 3 students per team.'); return; }
  lockTeam(ids);
  AppState.m1Selected.clear();
  renderM1Table();
});

// Lock from M2
document.getElementById('btn-lock-m2').addEventListener('click', () => {
  hideError('m2-error');
  const ids = AppState.m2Selected.map(s => s.id);
  if (ids.length < 2) { showError('m2-error', 'Add at least 2 students.'); return; }
  if (ids.length > 3) { showError('m2-error', 'Maximum 3 students per team.'); return; }
  lockTeam(ids);
  AppState.m2Selected = [];
  renderM2Pills();
});





/* ---- Lock/Unlock Team ---- */
function lockTeam(studentIds) {
  History.push();
  // Validate no double-locking
  for (const id of studentIds) {
    const s = AppState.students.find(st => st.id === id);
    if (s?.lockedTeamId) {
      const existing = AppState.lockedTeams.find(t => t.id === s.lockedTeamId);
      alert(`${s.name} is already in ${existing?.label ?? 'another team'}.`);
      return;
    }
  }
  const members = studentIds.map(id => AppState.students.find(s => s.id === id));
  const avg = members.reduce((sum, s) => sum + (s?.cgpa ?? 0), 0) / members.length;

  const team = {
    id: uuid(),
    label: `Team ${AppState.lockedTeams.length + 1}`,
    memberIds: studentIds,
    avgCgpa: parseFloat(avg.toFixed(2)),
  };
  AppState.lockedTeams.push(team);
  studentIds.forEach(id => {
    const s = AppState.students.find(st => st.id === id);
    if (s) s.lockedTeamId = team.id;
  });
  renderLockedTeamsList();
}

function unlockTeam(teamId) {
  History.push();
  AppState.lockedTeams = AppState.lockedTeams.filter(t => t.id !== teamId);
  AppState.students.forEach(s => {
    if (s.lockedTeamId === teamId) s.lockedTeamId = null;
  });
  AppState.lockedTeams.forEach((t, i) => t.label = `Team ${i + 1}`);
  renderLockedTeamsList();
  renderM1Table(); // re-render to unlock rows
}

function renderLockedTeamsList() {
  const section = document.getElementById('locked-teams-section');
  const list    = document.getElementById('locked-teams-list');
  const count   = AppState.lockedTeams.length;

  document.getElementById('locked-teams-count').textContent = count;
  section.classList.toggle('hidden', count === 0);

  list.innerHTML = AppState.lockedTeams.map(team => {
    const members = team.memberIds.map(id => AppState.students.find(s => s.id === id)).filter(Boolean);
    const memberStr = members.map(s =>
      `${esc(s.name)} <span>(${s.cgpa})</span>`
    ).join(' · ');
    return `<div class="locked-team-row">
      <span class="locked-team-icon">🔒</span>
      <span class="locked-team-label">${esc(team.label)}</span>
      <span class="locked-team-members">${memberStr}</span>
      <button class="locked-team-remove" data-team-id="${team.id}" aria-label="Remove team">×</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.locked-team-remove').forEach(btn => {
    btn.addEventListener('click', () => unlockTeam(btn.dataset.teamId));
  });
}

document.getElementById('btn-skip-3').addEventListener('click', () => showStep(4));
document.getElementById('btn-back-3').addEventListener('click', () => showStep(2));
document.getElementById('btn-next-3').addEventListener('click', () => showStep(4));

/* ============================
   8. STEP 4 — CONFIGURE
   ============================ */
function initStep4UI() {
  document.getElementById('cfg-student-count').textContent = AppState.students.length;
  document.getElementById('input-group-size').value = AppState.groupSize;

  const lockedCount = AppState.lockedTeams.length;
  const cfgLockedRow = document.getElementById('cfg-locked-row');
  cfgLockedRow.style.display = lockedCount > 0 ? 'flex' : 'none';
  document.getElementById('cfg-locked-count').textContent = lockedCount;

  updateGroupingPreview();
}

function updateGroupingPreview() {
  const n         = AppState.students.length;
  const gs        = AppState.groupSize;
  const sizes     = computeGroupSizes(n, gs);
  const lockedCount = AppState.lockedTeams.length;

  // Count how many of each size exist — fully dynamic
  const sizeCounts = {};
  sizes.forEach(s => { sizeCounts[s] = (sizeCounts[s] || 0) + 1; });

  // Build rows for each unique size, sorted
  const uniqueSizes = Object.keys(sizeCounts).map(Number).sort((a,b) => a - b);
  let html = uniqueSizes.map(s => {
    const count = sizeCounts[s];
    const isWarn = s > gs;   // larger than target = warn
    const isOk   = s === gs; // exactly target = neutral
    return `<div class="preview-row ${isWarn ? 'preview-row-warn' : ''}">
      <span>Groups of ${s}</span>
      <span class="text-mono">${count}</span>
    </div>`;
  }).join('');

  // Groups of 5 check (never allowed)
  const has5 = sizes.some(s => s === 5);
  const hasOver5 = sizes.some(s => s > 5);
  html += `<div class="preview-row ${has5 || hasOver5 ? 'preview-row-warn' : 'preview-row-ok'}">
    <span>Groups of 5+</span>
    <span class="text-mono">${sizes.filter(s => s >= 5).length} ${!has5 && !hasOver5 ? '✓' : '⚠️'}</span>
  </div>`;

  html += `<div class="preview-row" style="margin-top:8px;border-top:1px solid var(--color-border);padding-top:8px;">
    <span>Total groups</span>
    <span class="text-mono">${sizes.length}</span>
  </div>`;

  if (lockedCount > 0) {
    html += `<div class="preview-row preview-row-locked">
      <span>Pre-formed teams 🔒</span>
      <span class="text-mono">${lockedCount}</span>
    </div>`;
  }

  document.getElementById('preview-rows').innerHTML = html;
}

function computeGroupSizes(n, gs) {
  if (n <= 0 || gs <= 1) return n > 0 ? [n] : [];
  const numGroups = Math.ceil(n / gs);
  const numLarge  = n - numGroups * (gs - 1); // groups of gs
  const numSmall  = numGroups - numLarge;      // groups of gs-1
  return [
    ...new Array(numLarge).fill(gs),
    ...new Array(numSmall).fill(gs - 1),
  ].filter(s => s > 0);
}

// Step 4 controls — wired once via flag
(function wireStep4Controls() {
  let wired = false;
  const origInit = window._step4ControlsWired;
  if (origInit) return;
  window._step4ControlsWired = true;

  document.getElementById('btn-size-dec').addEventListener('click', () => {
    const input = document.getElementById('input-group-size');
    const val = parseInt(input.value);
    if (val > 2) { input.value = val - 1; AppState.groupSize = val - 1; updateGroupingPreview(); }
  });
  document.getElementById('btn-size-inc').addEventListener('click', () => {
    const input = document.getElementById('input-group-size');
    const val = parseInt(input.value);
    input.value = val + 1; AppState.groupSize = val + 1; updateGroupingPreview();
  });
  document.getElementById('input-group-size').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (val >= 2) { AppState.groupSize = val; updateGroupingPreview(); }
  });
})();

document.getElementById('btn-back-4').addEventListener('click', () => showStep(3));
document.getElementById('btn-generate').addEventListener('click', generateGroups);

/* ============================
   9. GROUP GENERATION ALGORITHM
   ============================ */
function generateGroups() {
  const btn = document.getElementById('btn-generate');
  btn.disabled = true; btn.textContent = '⏳ Generating...';

  setTimeout(() => { // Small delay for UI feedback
    try {
      _runGeneration();
    } finally {
      btn.disabled = false; btn.textContent = 'Generate Groups →';
    }
  }, 50);
}

function _runGeneration() {
  const allStudents = AppState.students;
  const lockedTeams = AppState.lockedTeams;
  let   pool        = allStudents.filter(s => !s.lockedTeamId)
                                 .sort((a, b) => b.cgpa - a.cgpa);

  // ── Step 1: Class average ──
  const classAvg  = allStudents.reduce((s, x) => s + x.cgpa, 0) / allStudents.length;
  const target3   = classAvg + 0.5; // 3-member groups should be ~0.5 above class avg

  // ── Step 2: Categorise locked teams ──
  const teams2 = lockedTeams.filter(t => t.memberIds.length === 2); // → become groups of 4
  const teams3 = lockedTeams.filter(t => t.memberIds.length === 3); // → fixed groups of 3

  // ── Step 3: Fill 2-member locked team groups ──
  // Find the best-balancing pair from pool for each
  const team2Groups = teams2.map((team, i) => {
    const members    = team.memberIds.map(id => allStudents.find(s => s.id === id));
    const teamSum    = members.reduce((s, x) => s + x.cgpa, 0);
    const idealSum   = classAvg * 4 - teamSum; // ideal sum of 2 added students
    let bestPair = [pool[0], pool[1]];
    let bestDiff = Infinity;
    // Search full pool — not just top 20 — to find the truly best-balancing pair
    for (let a = 0; a < pool.length; a++) {
      for (let b = a + 1; b < pool.length; b++) {
        const diff = Math.abs(pool[a].cgpa + pool[b].cgpa - idealSum);
        if (diff < bestDiff) { bestDiff = diff; bestPair = [pool[a], pool[b]]; }
      }
    }
    bestPair.forEach(s => { pool = pool.filter(x => x.id !== s.id); });
    return {
      id: uuid(), label: '', memberIds: [...team.memberIds, ...bestPair.map(s => s.id)],
      lockedTeamId: team.id, _target: 4, avgCgpa: 0,
    };
  });

  // ── Step 4: Fixed 3-member locked team groups ──
  const team3Groups = teams3.map(team => ({
    id: uuid(), label: '', memberIds: [...team.memberIds],
    lockedTeamId: team.id, _target: 3, avgCgpa: 0,
  }));

  // ── Step 5: Build free-student group slots ──
  const freeSizes  = pool.length > 0 ? computeGroupSizes(pool.length, 4) : [];
  const num3       = freeSizes.filter(s => s === 3).length;
  const num4       = freeSizes.filter(s => s === 4).length;
  const totalFree  = num3 + num4;

  // Spread 3-member groups evenly among 4-member groups (not all at start/end)
  const allSizes   = new Array(totalFree).fill(4);
  if (num3 > 0) {
    const step = Math.floor(totalFree / (num3 + 1));
    for (let i = 0; i < num3; i++) {
      allSizes[step * (i + 1) - 1] = 3;
    }
  }

  const freeGroups = allSizes.map(size => ({
    id: uuid(), label: '', memberIds: [], lockedTeamId: null,
    _target: size, avgCgpa: 0,
  }));

  // ── Step 6: Round-robin zigzag fill (one student per group per round) ──
  let roundNum = 0;
  const remaining = [...pool];
  while (remaining.length > 0) {
    const order = roundNum % 2 === 0
      ? freeGroups.map((_, i) => i)
      : freeGroups.map((_, i) => freeGroups.length - 1 - i);
    for (const gi of order) {
      if (remaining.length === 0) break;
      if (freeGroups[gi].memberIds.length < freeGroups[gi]._target) {
        freeGroups[gi].memberIds.push(remaining.shift().id);
      }
    }
    roundNum++;
  }

  // ── Step 7: Targeted swap — nudge 3-member groups toward target3 ──
  const three = freeGroups.filter(g => g._target === 3);
  const four  = freeGroups.filter(g => g._target === 4);

  function grpAvg(g) {
    const members = g.memberIds.map(id => allStudents.find(s => s.id === id));
    return members.reduce((s, x) => s + (x?.cgpa ?? 0), 0) / members.length;
  }

  for (const g3 of three) {
    for (let pass = 0; pass < 10; pass++) {
      if (grpAvg(g3) >= target3) break;
      let bestGain = 0, bestSwap = null;
      for (const g4 of four) {
        for (let i = 0; i < g3.memberIds.length; i++) {
          for (let j = 0; j < g4.memberIds.length; j++) {
            const s3 = allStudents.find(s => s.id === g3.memberIds[i]);
            const s4 = allStudents.find(s => s.id === g4.memberIds[j]);
            if (!s3 || !s4 || s4.cgpa <= s3.cgpa) continue;
            const new3 = (g3.memberIds.map(id => allStudents.find(s=>s.id===id)?.cgpa??0)
                            .reduce((a,b)=>a+b,0) - s3.cgpa + s4.cgpa) / 3;
            const new4 = (g4.memberIds.map(id => allStudents.find(s=>s.id===id)?.cgpa??0)
                            .reduce((a,b)=>a+b,0) - s4.cgpa + s3.cgpa) / 4;
            const gain = new3 - grpAvg(g3);
            if (gain > bestGain && new4 >= classAvg - 0.4) {
              bestGain = gain;
              bestSwap = { g3, i, g4, j };
            }
          }
        }
      }
      if (bestSwap) {
        const { g3: g3_, i: i_, g4: g4_, j: j_ } = bestSwap;
        [g3_.memberIds[i_], g4_.memberIds[j_]] = [g4_.memberIds[j_], g3_.memberIds[i_]];
      } else break;
    }
  }

  // ── Step 8: Combine — put 3-member groups last, label, compute averages ──
  const fourPlusGroups = [...team2Groups, ...freeGroups.filter(g => g._target >= 4)];
  const threeGroups    = [...team3Groups, ...freeGroups.filter(g => g._target < 4)];
  const allGroups      = [...fourPlusGroups, ...threeGroups];
  allGroups.forEach((g, i) => { g.label = `Group ${i + 1}`; });
  allGroups.forEach(g => recomputeAvg(g));

  AppState.groups = allGroups;
  renderGroups();
  showStep(5);

  // Auto-focus first card so arrow keys work immediately
  setTimeout(() => {
    const first = document.querySelector('.group-card');
    if (first) first.classList.add('kb-focused');
  }, 100);

  if (AI.hasKey()) {
    runAIFeedback();
  } else {
    const banner = document.getElementById('ai-feedback-banner');
    banner.className = 'hidden';
    banner.innerHTML = '';
  }
}

function zigzagPlace(groups, items, assignFn, sizeFn) {
  let dir = 1;
  let gi  = 0;

  for (const item of items) {
    // Skip groups that are full
    let attempts = 0;
    while (
      groups[gi].memberIds.length + sizeFn(item) > groups[gi]._target
      && attempts < groups.length * 3
    ) {
      gi += dir;
      if (gi >= groups.length) { dir = -1; gi = groups.length - 2; }
      if (gi < 0)               { dir =  1; gi = 1; }
      attempts++;
    }

    assignFn(groups[gi], item);

    gi += dir;
    if (gi >= groups.length) { dir = -1; gi = groups.length - 2; }
    if (gi < 0)               { dir =  1; gi = 1; }
  }
}

function recomputeAvg(group) {
  const members = group.memberIds
    .map(id => AppState.students.find(s => s.id === id))
    .filter(Boolean);
  group.avgCgpa = members.length
    ? parseFloat((members.reduce((sum, s) => sum + s.cgpa, 0) / members.length).toFixed(2))
    : 0;
}

/* ============================
   10. STEP 5 — RENDER GROUPS
   ============================ */
function initStep5Stats() {
  const { groups, students, lockedTeams } = AppState;
  const totalAvg = groups.length
    ? (groups.reduce((sum, g) => sum + g.avgCgpa, 0) / groups.length).toFixed(2)
    : 0;
  const lockedCount = lockedTeams.length;

  document.getElementById('groups-stats-row').innerHTML = `
    <div class="stat-item"><strong>${groups.length}</strong> groups</div>
    <div class="stat-item"><strong>${students.length}</strong> students</div>
    <div class="stat-item">Overall avg CGPA: <strong>${totalAvg}</strong></div>
    ${lockedCount > 0 ? `<div class="stat-item" style="color:var(--color-locked);">🔒 <strong>${lockedCount}</strong> locked teams honoured</div>` : ''}
  `;
}

function renderGroups() {
  initStep5Stats();
  const grid = document.getElementById('groups-grid');
  grid.innerHTML = '';
  AppState.groups.forEach(group => {
    grid.appendChild(buildGroupCard(group));
  });
}

function buildGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.dataset.groupId = group.id;

  // Border class
  if (group.memberIds.length < 3) card.classList.add('warn-low');
  else if (group.memberIds.length > 5) card.classList.add('warn-high');
  if (group.lockedTeamId) card.classList.add('has-lock');

  const team = group.lockedTeamId
    ? AppState.lockedTeams.find(t => t.id === group.lockedTeamId)
    : null;

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'group-card-header';
  hdr.innerHTML = `
    <div>
      <span class="group-label" data-group-id="${group.id}">${esc(group.label)}</span>
      ${team ? `<span class="group-lock-caption" title="${esc(team?.label ?? '')} — members have tinted background">&#128274; ${esc(team.label)}</span>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span class="badge ${group.memberIds.length < 3 ? 'badge-danger' : group.memberIds.length > 5 ? 'badge-warning' : 'badge-primary'}">
        ${group.memberIds.length}
      </span>
    </div>`;
  card.appendChild(hdr);
  enableGroupRename(hdr.querySelector('.group-label'));

  // Body
  const body = document.createElement('div');
  body.className = 'group-card-body';
  body.dataset.groupId = group.id;
  attachDropListeners(body, group.id);

  // If has locked team, make the card body itself draggable for the block
  // No visible handle bar — just tinted member rows + tooltip on hover
  if (team) {
    body.draggable = true;
    body.title = 'Drag to move the locked team as a block';
    attachBlockDragListeners(body, team.id, group.id);
  }

  // Render member rows
  const members = group.memberIds.map(id => AppState.students.find(s => s.id === id)).filter(Boolean);
  if (members.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card-empty';
    empty.textContent = 'Drop a student here';
    body.appendChild(empty);
  } else {
    members.forEach(student => {
      body.appendChild(buildStudentRow(student, group.id));
    });
  }
  card.appendChild(body);

  // Click to focus for arrow key navigation
  card.addEventListener('click', () => {
    document.querySelectorAll('.group-card.kb-focused').forEach(c => c.classList.remove('kb-focused'));
    card.classList.add('kb-focused');
  });

  // Footer
  const footer = document.createElement('div');
  footer.className = 'group-card-footer';
  footer.innerHTML = `<span class="cgpa-badge" data-group-id="${group.id}">Avg CGPA: ${group.avgCgpa}</span>`;
  card.appendChild(footer);

  return card;
}

function buildStudentRow(student, groupId) {
  const row = document.createElement('div');
  const isLocked = !!student.lockedTeamId;
  row.className = `student-row ${isLocked ? 'is-locked' : ''}`;
  row.dataset.studentId = student.id;
  row.dataset.groupId   = groupId;

  row.innerHTML = `
    ${isLocked
      ? ''
      : '<span class="drag-handle" aria-hidden="true">⠿</span>'}
    <div class="student-info">
      <div class="student-name">${esc(student.name)}</div>
      <div class="student-meta">${esc(student.uid)} · ${esc(student.regNo)}</div>
    </div>
    <span class="student-cgpa">${student.cgpa.toFixed(1)}</span>`;

  if (!isLocked) {
    row.draggable = true;
    attachStudentDragListeners(row, student.id, groupId);
  } else {
    row.addEventListener('dragstart', (e) => {
      e.preventDefault();
      row.classList.add('shake');
      setTimeout(() => row.classList.remove('shake'), 300);
    });
  }

  return row;
}

/* ============================
   11. DRAG AND DROP
   ============================ */
let _dragPayload = null;

function attachStudentDragListeners(rowEl, studentId, groupId) {
  rowEl.addEventListener('dragstart', (e) => {
    _dragPayload = { type: 'student', studentId, sourceGroupId: groupId };
    e.dataTransfer.effectAllowed = 'move';
    rowEl.style.opacity = '0.5';
  });
  rowEl.addEventListener('dragend', () => {
    rowEl.style.opacity = '';
    _dragPayload = null;
    clearDropHighlights();
  });
}

function attachBlockDragListeners(handleEl, teamId, sourceGroupId) {
  handleEl.addEventListener('dragstart', (e) => {
    _dragPayload = { type: 'block', teamId, sourceGroupId };
    e.dataTransfer.effectAllowed = 'move';
  });
  handleEl.addEventListener('dragend', () => {
    _dragPayload = null;
    clearDropHighlights();
  });
}

function attachDropListeners(cardBodyEl, targetGroupId) {
  cardBodyEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cardBodyEl.classList.add('drop-highlight');
    cardBodyEl.closest('.group-card').classList.add('drop-highlight');
  });
  cardBodyEl.addEventListener('dragleave', (e) => {
    if (!cardBodyEl.contains(e.relatedTarget)) {
      cardBodyEl.classList.remove('drop-highlight');
      cardBodyEl.closest('.group-card').classList.remove('drop-highlight');
    }
  });
  cardBodyEl.addEventListener('drop', (e) => {
    e.preventDefault();
    cardBodyEl.classList.remove('drop-highlight');
    cardBodyEl.closest('.group-card').classList.remove('drop-highlight');
    if (!_dragPayload) return;
    if (_dragPayload.type === 'student') {
      moveStudent(_dragPayload.studentId, _dragPayload.sourceGroupId, targetGroupId);
    } else if (_dragPayload.type === 'block') {
      moveBlock(_dragPayload.teamId, _dragPayload.sourceGroupId, targetGroupId);
    }
    _dragPayload = null;
  });
}

function clearDropHighlights() {
  document.querySelectorAll('.drop-highlight').forEach(el => el.classList.remove('drop-highlight'));
}

function moveStudent(studentId, fromId, toId) {
  if (fromId === toId) return;
  History.push();
  const from = AppState.groups.find(g => g.id === fromId);
  const to   = AppState.groups.find(g => g.id === toId);
  if (!from || !to) return;
  from.memberIds = from.memberIds.filter(id => id !== studentId);
  to.memberIds.push(studentId);
  afterMove(fromId, toId);
}

function moveBlock(teamId, fromId, toId) {
  if (fromId === toId) return;
  History.push();
  const team = AppState.lockedTeams.find(t => t.id === teamId);
  const from = AppState.groups.find(g => g.id === fromId);
  const to   = AppState.groups.find(g => g.id === toId);
  if (!team || !from || !to) return;
  from.memberIds = from.memberIds.filter(id => !team.memberIds.includes(id));
  from.lockedTeamId = null;
  to.memberIds.push(...team.memberIds);
  to.lockedTeamId = teamId;
  afterMove(fromId, toId);
}

function afterMove(fromId, toId) {
  [fromId, toId].forEach(id => {
    const g = AppState.groups.find(g => g.id === id);
    if (g) recomputeAvg(g);
  });
  renderGroups();
}

/* ============================
   12. GROUP RENAME
   ============================ */
function enableGroupRename(labelEl) {
  if (!labelEl) return;
  labelEl.addEventListener('click', () => {
    const groupId = labelEl.dataset.groupId;
    const group   = AppState.groups.find(g => g.id === groupId);
    if (!group) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'group-rename-input';
    input.value = group.label;
    labelEl.replaceWith(input);
    input.focus(); input.select();

    function commit() {
      const val = input.value.trim() || group.label;
      if (val !== group.label) History.push();
      group.label = val;
      const newLabel = document.createElement('span');
      newLabel.className = 'group-label';
      newLabel.dataset.groupId = groupId;
      newLabel.textContent = val;
      input.replaceWith(newLabel);
      enableGroupRename(newLabel);
    }

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { commit(); }
    });
  });
}

/* ============================
   13. AI FEEDBACK (STEP 5)
   ============================ */
async function runAIFeedback() {
  const banner = document.getElementById('ai-feedback-banner');
  banner.className = 'banner-skeleton skeleton mb-16';
  banner.innerHTML = '';

  const feedback = await AI.groupFeedback(AppState.groups, AppState.students);
  if (!feedback) {
    banner.className = 'hidden';
    return;
  }

  banner.className = 'banner banner-ai mb-16';
  banner.innerHTML = `
    <div class="banner-header">
      ✨ <span class="badge badge-ai">Gemini</span> Group Quality Feedback
      <button class="banner-toggle" id="ai-banner-toggle">▲ Hide</button>
    </div>
    <div class="banner-body" id="ai-banner-body">${esc(feedback)}</div>`;

  document.getElementById('ai-banner-toggle')?.addEventListener('click', function() {
    const body = document.getElementById('ai-banner-body');
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? '' : 'none';
    this.textContent = hidden ? '▲ Hide' : '▼ Show';
  });
}

document.getElementById('btn-back-5').addEventListener('click', () => showStep(4));

/* ============================
   14. DOWNLOADS
   ============================ */
document.getElementById('btn-csv').addEventListener('click', () => {
  Exports.downloadCSV(AppState.groups, AppState.students, AppState.lockedTeams);
});
document.getElementById('btn-excel').addEventListener('click', async () => {
  await Exports.downloadExcel(AppState.groups, AppState.students, AppState.lockedTeams);
});
document.getElementById('btn-pdf').addEventListener('click', () => {
  Exports.downloadPDF(AppState.groups, AppState.students, AppState.lockedTeams);
});
document.getElementById('btn-save-session').addEventListener('click', () => {
  Exports.saveSession(AppState);
});
document.getElementById('load-session-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  Exports.loadSession(file, (err, snapshot) => {
    if (err) { alert('Could not load session: ' + err.message); return; }
    AppState.students    = snapshot.students    ?? [];
    AppState.lockedTeams = snapshot.lockedTeams ?? [];
    AppState.groupSize   = snapshot.groupSize   ?? 4;
    AppState.groups      = snapshot.groups      ?? [];
    AppState.columnMap   = snapshot.columnMap   ?? AppState.columnMap;
    renderGroups();
    showStep(5);
  });
  e.target.value = '';
});

/* ============================
   15. INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  showStep(1);

  // Make progress step nodes clickable for already-visited steps
  document.querySelectorAll('.step-node').forEach(node => {
    node.addEventListener('click', () => {
      const s = parseInt(node.dataset.step);
      if (s <= AppState.maxVisitedStep && s !== AppState.currentStep) {
        // Validate before jumping back — rebuild students if jumping to step 2
        if (s === 2 && AppState.rawRows.length > 0) {
          buildAndValidateStudents();
        }
        showStep(s);
      }
    });
  });
});
