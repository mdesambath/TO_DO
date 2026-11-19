/* =========================================================
   Taskline — task logic
   ========================================================= */

(() => {
  'use strict';

  const STORAGE_KEY = 'taskline.tasks.v1';
  const THEME_KEY = 'taskline.theme';
  const API_URL = '/api/tasks';
  const TEAMS_API = '/api/teams';
  const AUTH_API = '/api/auth';

  const STATUS = {
    todo: { label: 'Yet to start', className: 'status-todo' },
    inprogress: { label: 'In progress', className: 'status-inprogress' },
    hold: { label: 'On hold', className: 'status-hold' },
    complete: { label: 'Complete', className: 'status-complete' },
  };

  const PRIORITIES = {
    high: { label: 'High', className: 'priority-high' },
    medium: { label: 'Medium', className: 'priority-medium' },
    low: { label: 'Low', className: 'priority-low' },
  };

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  const ICONS = {
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  };

  const els = {
    form: document.getElementById('taskForm'),
    title: document.getElementById('taskTitle'),
    date: document.getElementById('taskDate'),
    status: document.getElementById('taskStatus'),
    priority: document.getElementById('taskPriority'),
    notes: document.getElementById('taskNotes'),
    scopeButtons: Array.from(document.querySelectorAll('[data-scope]')),
    teamPickerWrap: document.getElementById('teamPickerWrap'),
    assigneePickerWrap: document.getElementById('assigneePickerWrap'),
    taskTeam: document.getElementById('taskTeam'),
    taskAssignee: document.getElementById('taskAssignee'),
    composerTeamsBtn: document.getElementById('composerTeamsBtn'),
    detailsRow: document.getElementById('detailsRow'),
    detailsToggle: document.getElementById('detailsToggle'),
    stats: document.getElementById('stats'),
    taskList: document.getElementById('taskList'),
    tabs: Array.from(document.querySelectorAll('.tab')),
    activeCount: document.getElementById('activeCount'),
    archivedCount: document.getElementById('archivedCount'),
    search: document.getElementById('search'),
    statusFilter: document.getElementById('statusFilter'),
    statusFilterWrap: document.getElementById('statusFilterWrap'),
    scopeFilter: document.getElementById('scopeFilter'),
    themeToggle: document.getElementById('themeToggle'),
    editDialog: document.getElementById('editDialog'),
    editForm: document.getElementById('editForm'),
    editTitle: document.getElementById('editTitle'),
    editDate: document.getElementById('editDate'),
    editStatus: document.getElementById('editStatus'),
    editPriority: document.getElementById('editPriority'),
    editNotes: document.getElementById('editNotes'),
    editSharing: document.getElementById('editSharing'),
    editTeamName: document.getElementById('editTeamName'),
    editAssignee: document.getElementById('editAssignee'),
    editError: document.getElementById('editError'),
    confirmDialog: document.getElementById('confirmDialog'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastAction: document.getElementById('toastAction'),
    toastClose: document.getElementById('toastClose'),
    storageLine: document.getElementById('storageLine'),
    storageText: document.getElementById('storageText'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    authView: document.getElementById('authView'),
    appShell: document.getElementById('appShell'),
    authTabs: Array.from(document.querySelectorAll('[data-auth-tab]')),
    authNotice: document.getElementById('authNotice'),
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    forgotBtn: document.getElementById('forgotBtn'),
    registerForm: document.getElementById('registerForm'),
    registerName: document.getElementById('registerName'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirm: document.getElementById('registerConfirm'),
    registerMaiden: document.getElementById('registerMaiden'),
    registerError: document.getElementById('registerError'),
    account: document.getElementById('account'),
    accountBtn: document.getElementById('accountBtn'),
    accountMenu: document.getElementById('accountMenu'),
    accountInitial: document.getElementById('accountInitial'),
    accountEmail: document.getElementById('accountEmail'),
    accountMenuName: document.getElementById('accountMenuName'),
    accountMenuEmail: document.getElementById('accountMenuEmail'),
    manageTeamsBtn: document.getElementById('manageTeamsBtn'),
    changePasswordBtn: document.getElementById('changePasswordBtn'),
    signOutBtn: document.getElementById('signOutBtn'),
    passwordDialog: document.getElementById('passwordDialog'),
    passwordForm: document.getElementById('passwordForm'),
    pwCurrent: document.getElementById('pwCurrent'),
    pwMaiden: document.getElementById('pwMaiden'),
    pwNew: document.getElementById('pwNew'),
    pwConfirm: document.getElementById('pwConfirm'),
    pwError: document.getElementById('pwError'),
    resetDialog: document.getElementById('resetDialog'),
    resetForm: document.getElementById('resetForm'),
    resetStepOne: document.getElementById('resetStepOne'),
    resetStepTwo: document.getElementById('resetStepTwo'),
    resetEmail: document.getElementById('resetEmail'),
    resetMaiden: document.getElementById('resetMaiden'),
    resetErrorOne: document.getElementById('resetErrorOne'),
    resetErrorTwo: document.getElementById('resetErrorTwo'),
    resetNote: document.getElementById('resetNote'),
    resetCodeWrap: document.getElementById('resetCodeWrap'),
    resetCode: document.getElementById('resetCode'),
    viewMailBtn: document.getElementById('viewMailBtn'),
    resetMailPreview: document.getElementById('resetMailPreview'),
    resetNew: document.getElementById('resetNew'),
    resetConfirm: document.getElementById('resetConfirm'),
    resetFootOne: document.getElementById('resetFootOne'),
    resetFootTwo: document.getElementById('resetFootTwo'),
    resetBackBtn: document.getElementById('resetBackBtn'),
    teamsDialog: document.getElementById('teamsDialog'),
    teamCreateForm: document.getElementById('teamCreateForm'),
    teamName: document.getElementById('teamName'),
    teamMembers: document.getElementById('teamMembers'),
    teamCreateError: document.getElementById('teamCreateError'),
    teamList: document.getElementById('teamList'),
  };

  let tasks = [];
  let teams = [];
  let currentUser = null;
  let authTab = 'login';
  let storageMode = 'local';
  let saveChain = Promise.resolve();
  let saveSequence = 0;
  let view = 'tasks';
  let searchQuery = '';
  let statusFilter = 'all';
  let scopeFilter = 'all';
  let taskScope = 'personal';
  let editingId = null;
  let confirmAction = null;
  let toastTimer = null;
  let toastUndo = null;
  let resetState = { step: 1, email: '', resetToken: null, devMode: false };

  /* ---------------- Helpers ---------------- */

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      try {
        return window.crypto.randomUUID();
      } catch (error) {
        /* fall through */
      }
    }
    return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function localDateStr(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateStr(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(dateStr, amount) {
    const date = parseDateStr(dateStr);
    date.setDate(date.getDate() + amount);
    return localDateStr(date);
  }

  function isCurrentYear(dateStr) {
    return parseDateStr(dateStr).getFullYear() === new Date().getFullYear();
  }

  function formatFullDate(dateStr) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    if (!isCurrentYear(dateStr)) options.year = 'numeric';
    return parseDateStr(dateStr).toLocaleDateString(undefined, options);
  }

  function formatGroupDate(dateStr) {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    if (!isCurrentYear(dateStr)) options.year = 'numeric';
    return parseDateStr(dateStr).toLocaleDateString(undefined, options);
  }

  function groupTitle(dateStr) {
    const today = localDateStr();
    if (dateStr === today) return 'Today';
    if (dateStr === addDays(today, 1)) return 'Tomorrow';
    if (dateStr === addDays(today, -1)) return 'Yesterday';
    return parseDateStr(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) return '';
    const minutes = Math.round((Date.now() - time) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  function icon(name, size = 16) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function statusOptions(selected) {
    return Object.entries(STATUS)
      .map(([value, meta]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${meta.label}</option>`)
      .join('');
  }

  function priorityOptions(selected) {
    return Object.entries(PRIORITIES)
      .map(([value, meta]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${meta.label}</option>`)
      .join('');
  }

  /* ---------------- Storage ---------------- */

  function normalizeTask(raw) {
    const now = new Date().toISOString();
    const status = STATUS[raw.status] ? raw.status : 'todo';
    const archived = Boolean(raw.archived) || status === 'complete';
    const scope = raw.scope === 'team' ? 'team' : 'personal';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      title: String(raw.title || '').slice(0, 140),
      notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 500) : '',
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : localDateStr(),
      status,
      priority: PRIORITIES[raw.priority] ? raw.priority : 'medium',
      archived,
      archivedAt: archived ? (raw.archivedAt || raw.updatedAt || now) : null,
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || raw.createdAt || now,
      scope,
      teamId: scope === 'team' ? (raw.teamId || null) : null,
      teamName: scope === 'team' ? (raw.teamName || '') : '',
      assigneeId: scope === 'team' ? (raw.assigneeId || null) : null,
      assigneeName: scope === 'team' ? (raw.assigneeName || '') : '',
      assigneeEmail: scope === 'team' ? (raw.assigneeEmail || '') : '',
      createdBy: raw.createdBy || null,
      createdByName: raw.createdByName || '',
      canDelete: raw.canDelete !== false,
    };
  }

  function cacheKey() {
    return currentUser ? `${STORAGE_KEY}.${currentUser.id}` : null;
  }

  function loadCachedTasks() {
    const key = cacheKey();
    if (!key) return [];
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((task) => task && typeof task.title === 'string')
        .map(normalizeTask);
    } catch (error) {
      return [];
    }
  }

  function cacheTasks() {
    const key = cacheKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(tasks));
    } catch (error) {
      /* Ignore quota errors; the account store still holds the task. */
    }
  }

  function clearCachedTasks(userId) {
    try {
      localStorage.removeItem(`${STORAGE_KEY}.${userId}`);
    } catch (error) {
      /* ignore */
    }
  }

  async function apiRequest(url, options = {}) {
    const backend = window.TasklineBackend;
    if (!backend) {
      const missing = new Error('backend.js did not load, so accounts and tasks are unavailable.');
      missing.code = 'missing_backend';
      throw missing;
    }

    let payload;
    if (options.body) {
      try {
        payload = JSON.parse(options.body);
      } catch (error) {
        payload = null;
      }
    }

    return backend.request(options.method || 'GET', url, payload);
  }

  async function fetchTasks() {
    const data = await apiRequest(API_URL);
    if (!Array.isArray(data)) throw new Error('The server did not return a task array.');
    return data
      .filter((task) => task && typeof task.title === 'string')
      .map(normalizeTask);
  }

  async function fetchTeams() {
    const data = await apiRequest(TEAMS_API);
    return Array.isArray(data) ? data : [];
  }

  async function createTaskRequest(task) {
    const data = await apiRequest(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return normalizeTask(data);
  }

  async function updateTaskRequest(task) {
    const data = await apiRequest(`${API_URL}/${encodeURIComponent(task.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return normalizeTask(data);
  }

  async function deleteTaskRequest(id) {
    await apiRequest(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async function createTeamRequest(name, memberEmails) {
    return apiRequest(TEAMS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, memberEmails }),
    });
  }

  async function updateTeamRequest(teamId, payload) {
    return apiRequest(`${TEAMS_API}/${encodeURIComponent(teamId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async function deleteTeamRequest(teamId) {
    await apiRequest(`${TEAMS_API}/${encodeURIComponent(teamId)}`, { method: 'DELETE' });
  }

  function queueWrite(operation, successText = 'Saved in this browser') {
    if (!currentUser) return;

    if (storageMode !== 'account') {
      setStorageStatus('local', 'Sign in to save your changes');
      return;
    }

    const sequence = ++saveSequence;
    setStorageStatus('saving', 'Saving…');

    saveChain = saveChain
      .catch(() => {})
      .then(operation)
      .then(() => {
        if (sequence === saveSequence) {
          setStorageStatus('account', successText);
        }
      })
      .catch((error) => {
        if (error.status === 401) {
          handleSessionExpired();
          return;
        }
        if (sequence === saveSequence) {
          setStorageStatus('error', 'Could not save to this browser');
        }
        showToast(`Could not save (${error.message}).`);
        if (error.status === 403 || error.status === 404) {
          void loadTasksForUser();
        }
      });
  }

  function persistNewTask(task) {
    cacheTasks();
    queueWrite(async () => {
      const saved = await createTaskRequest(task);
      const index = tasks.findIndex((item) => item.id === task.id);
      if (index !== -1) {
        tasks[index] = saved;
        cacheTasks();
        render();
      }
    }, 'Saved in this browser');
  }

  function persistTask(task) {
    cacheTasks();
    queueWrite(() => updateTaskRequest(task));
  }

  function persistDelete(task) {
    cacheTasks();
    queueWrite(() => deleteTaskRequest(task.id));
  }

  function save() {
    if (!currentUser) return;

    // Keep a browser copy so the list renders instantly on reload.
    cacheTasks();

    if (storageMode !== 'account') {
      setStorageStatus('local', 'Saved in this browser');
    }
  }

  function setStorageStatus(state, text) {
    if (!els.storageLine) return;
    els.storageLine.dataset.state = state;
    els.storageText.textContent = text;
    els.storageLine.title = text;
  }

  /* ---------------- Filtering / sorting ---------------- */

  function getVisibleTasks() {
    const query = searchQuery.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      if (view === 'tasks' ? task.archived : !task.archived) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (scopeFilter !== 'all' && task.scope !== scopeFilter) return false;
      if (query) {
        const haystack = `${task.title} ${task.notes} ${task.teamName || ''} ${task.assigneeName || ''} ${task.assigneeEmail || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return filtered.sort(view === 'archive' ? compareArchived : compareActive);
  }

  function compareActive(a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priority !== 0) return priority;
    return a.createdAt.localeCompare(b.createdAt);
  }

  function compareArchived(a, b) {
    return (b.archivedAt || '').localeCompare(a.archivedAt || '');
  }

  function groupByDate(items) {
    const groups = new Map();
    items.forEach((task) => {
      if (!groups.has(task.date)) groups.set(task.date, []);
      groups.get(task.date).push(task);
    });
    return groups;
  }

  /* ---------------- Rendering ---------------- */

  function render() {
    renderStats();
    renderTabs();
    renderTaskList();
    els.statusFilter.value = statusFilter;
    els.scopeFilter.value = scopeFilter;
  }

  function renderStats() {
    const today = localDateStr();
    const active = tasks.filter((task) => !task.archived);
    const overdue = active.filter((task) => task.date < today).length;
    const dueToday = active.filter((task) => task.date === today).length;
    const inProgress = active.filter((task) => task.status === 'inprogress').length;
    const onHold = active.filter((task) => task.status === 'hold').length;
    const archived = tasks.filter((task) => task.archived).length;

    els.stats.innerHTML = `
      <div class="stat">
        <span class="stat-label">Active tasks</span>
        <span class="stat-value">${active.length}</span>
        <span class="stat-hint">${overdue ? `${overdue} overdue` : 'Nothing overdue'}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Due today</span>
        <span class="stat-value">${dueToday}</span>
        <span class="stat-hint">${inProgress} in progress</span>
      </div>
      <div class="stat${onHold ? ' stat-hold' : ''}">
        <span class="stat-label">On hold</span>
        <span class="stat-value">${onHold}</span>
        <span class="stat-hint">${onHold ? 'Needs attention' : 'Nothing paused'}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Archived</span>
        <span class="stat-value">${archived}</span>
        <span class="stat-hint">Completed &amp; stored</span>
      </div>`;
  }

  function renderTabs() {
    const active = tasks.filter((task) => !task.archived).length;
    const archived = tasks.filter((task) => task.archived).length;
    els.activeCount.textContent = active;
    els.archivedCount.textContent = archived;

    els.tabs.forEach((tab) => {
      const isActive = tab.dataset.view === view;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    els.statusFilterWrap.hidden = view === 'archive';
    els.taskList.setAttribute('aria-labelledby', view === 'tasks' ? 'tabTasks' : 'tabArchive');
  }

  function renderTaskList() {
    const items = getVisibleTasks();

    if (!items.length) {
      els.taskList.innerHTML = emptyState();
      return;
    }

    if (view === 'archive') {
      els.taskList.innerHTML = `
        <section class="date-group">
          <header class="group-header">
            <h2 class="group-title">Archive</h2>
            <span class="group-date">Completed tasks</span>
            <span class="group-count">${items.length} ${items.length === 1 ? 'task' : 'tasks'}</span>
          </header>
          <div class="task-list">${items.map(taskRow).join('')}</div>
        </section>`;
      return;
    }

    const groups = groupByDate(items);
    const today = localDateStr();

    els.taskList.innerHTML = Array.from(groups, ([date, list]) => {
      const overdue = date < today;
      return `
        <section class="date-group">
          <header class="group-header">
            <h2 class="group-title">${groupTitle(date)}${overdue ? ' <span class="chip chip-overdue">Overdue</span>' : ''}</h2>
            <span class="group-date">${formatGroupDate(date)}</span>
            <span class="group-count">${list.length} ${list.length === 1 ? 'task' : 'tasks'}</span>
          </header>
          <div class="task-list">${list.map(taskRow).join('')}</div>
        </section>`;
    }).join('');
  }

  function taskRow(task) {
    const status = STATUS[task.status] || STATUS.todo;
    const priority = PRIORITIES[task.priority] || PRIORITIES.medium;
    const overdue = !task.archived && task.date < localDateStr();
    const classes = ['task'];
    if (task.archived) classes.push('is-archived');
    if (task.status === 'hold') classes.push('is-hold');
    if (overdue) classes.push('is-overdue');

    const title = escapeHtml(task.title);
    const checkboxAction = task.archived ? 'restore' : 'complete';
    const scopeBadge = task.scope === 'team'
      ? `<span class="chip chip-team">${icon('users', 12)} ${escapeHtml(task.teamName || 'Team')}</span>`
      : '<span class="chip chip-personal">Personal</span>';
    const assigneeBadge = task.scope === 'team'
      ? (task.assigneeName
        ? `<span class="chip chip-assignee">${escapeHtml(task.assigneeName)}</span>`
        : '<span class="chip chip-unassigned">Unassigned</span>')
      : '';

    return `
      <article class="${classes.join(' ')}" data-id="${escapeHtml(task.id)}">
        <button type="button" class="check${task.archived ? ' is-checked' : ''}"
          data-action="${checkboxAction}" role="checkbox" aria-checked="${task.archived}"
          aria-label="${task.archived ? 'Restore task: ' : 'Complete and archive task: '}${title}"
          title="${task.archived ? 'Restore task' : 'Mark complete & archive'}">
          ${icon('check', 14)}
        </button>

        <div class="task-main">
          <div class="task-head">
            <h3 class="task-title">${title}</h3>
            ${scopeBadge}
            ${assigneeBadge}
            <span class="chip ${status.className}">${status.label}</span>
            <span class="chip ${priority.className}">${priority.label}</span>
            ${overdue ? '<span class="chip chip-overdue">Overdue</span>' : ''}
          </div>

          ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ''}

          <div class="task-meta">
            <span class="meta-item">${icon('calendar', 14)} ${formatFullDate(task.date)}</span>
            <span class="meta-item">${task.archived ? 'Archived' : 'Added'} ${relativeTime(task.archived ? task.archivedAt : task.createdAt)}</span>
            ${task.scope === 'team' && task.createdByName ? `<span class="meta-item">${icon('users', 14)} Shared by ${escapeHtml(task.createdByName)}</span>` : ''}
          </div>

          ${task.status === 'hold' ? `<div class="hold-note">${icon('pause', 14)} <span><strong>On hold</strong> — update the status when you're ready to resume.</span></div>` : ''}
        </div>

        <div class="task-side">
          <label class="sr-only" for="status-${escapeHtml(task.id)}">Status for ${title}</label>
          <select id="status-${escapeHtml(task.id)}" class="status-select ${status.className}" data-action="status">
            ${statusOptions(task.status)}
          </select>

          <div class="row-actions">
            ${task.archived ? `<button type="button" class="icon-btn" data-action="restore" aria-label="Restore task" title="Restore">${icon('restore')}</button>` : ''}
            <button type="button" class="icon-btn" data-action="edit" aria-label="Edit task" title="Edit">${icon('pencil')}</button>
            ${task.canDelete === false ? '' : `<button type="button" class="icon-btn icon-btn-danger" data-action="delete" aria-label="Delete task" title="Delete">${icon('trash')}</button>`}
          </div>
        </div>
      </article>`;
  }

  function emptyState() {
    const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== 'all' || scopeFilter !== 'all';

    if (view === 'archive') {
      return `
        <div class="empty">
          <div class="empty-icon" aria-hidden="true">🗂️</div>
          <h3>Archive is empty</h3>
          <p>Tick a task's checkbox to complete it, and it will be stored here.</p>
        </div>`;
    }

    if (hasFilters) {
      return `
        <div class="empty">
          <div class="empty-icon" aria-hidden="true">🔍</div>
          <h3>No tasks match your filters</h3>
          <p>Try a different search term or status.</p>
          <button type="button" class="btn btn-ghost" data-clear-filters>Clear filters</button>
        </div>`;
    }

    return `
      <div class="empty">
        <div class="empty-icon" aria-hidden="true">🗓️</div>
        <h3>Your plan is empty</h3>
        <p>Add your first task above, or load a few sample tasks to explore how Taskline works.</p>
        <button type="button" class="btn btn-ghost" data-load-samples>Load sample tasks</button>
      </div>`;
  }

  /* ---------------- Task actions ---------------- */

  function archiveTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task || task.archived) return;

    const previous = {
      status: task.status,
      archived: task.archived,
      archivedAt: task.archivedAt,
    };

    task.status = 'complete';
    task.archived = true;
    task.archivedAt = new Date().toISOString();
    task.updatedAt = task.archivedAt;
    persistTask(task);
    render();

    showToast(`“${truncate(task.title, 42)}” archived`, () => {
      Object.assign(task, previous);
      task.updatedAt = new Date().toISOString();
      persistTask(task);
      render();
    });
  }

  function restoreTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !task.archived) return;

    task.archived = false;
    task.archivedAt = null;
    if (task.status === 'complete') task.status = 'todo';
    task.updatedAt = new Date().toISOString();
    persistTask(task);
    render();
    showToast('Task restored to active tasks');
  }

  function setStatus(id, status) {
    if (!STATUS[status]) return;
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    if (status === 'complete') {
      if (task.archived) {
        task.status = 'complete';
        task.updatedAt = new Date().toISOString();
        persistTask(task);
        render();
      } else {
        archiveTask(id);
      }
      return;
    }

    const wasArchived = task.archived;
    task.status = status;
    task.archived = false;
    task.archivedAt = null;
    task.updatedAt = new Date().toISOString();
    persistTask(task);
    render();

    if (wasArchived) {
      showToast('Task restored to active tasks');
    } else if (status === 'hold') {
      showToast('Task moved to On hold — needs attention');
    }
  }

  function requestDelete(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    openConfirm({
      title: 'Delete task?',
      message: `“${truncate(task.title, 90)}” will be permanently removed.`,
      confirmLabel: 'Delete task',
      onConfirm: () => {
        const index = tasks.findIndex((item) => item.id === id);
        if (index === -1) return;
        const [removed] = tasks.splice(index, 1);
        persistDelete(removed);
        render();
        showToast('Task deleted', () => {
          tasks.push(removed);
          persistNewTask(removed);
          render();
        });
      },
    });
  }

  function openEdit(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    editingId = id;
    els.editTitle.value = task.title;
    els.editDate.value = task.date;
    els.editStatus.value = task.status;
    els.editPriority.value = task.priority;
    els.editNotes.value = task.notes || '';
    els.editError.hidden = true;

    const isTeam = task.scope === 'team';
    els.editSharing.hidden = !isTeam;
    if (isTeam) {
      els.editTeamName.value = task.teamName || 'Team';
      const team = teams.find((item) => item.id === task.teamId);
      const members = team ? team.members : [];
      els.editAssignee.innerHTML = '<option value="">Unassigned</option>' + members
        .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} (${escapeHtml(member.email)})</option>`)
        .join('');
      if (task.assigneeId && !members.some((member) => member.id === task.assigneeId)) {
        const option = document.createElement('option');
        option.value = task.assigneeId;
        option.textContent = task.assigneeName || 'Former member';
        els.editAssignee.appendChild(option);
      }
      els.editAssignee.value = task.assigneeId || '';
    }

    els.editDialog.showModal();
    els.editTitle.focus();
    els.editTitle.select();
  }

  function setView(nextView) {
    if (view === nextView) return;
    view = nextView;
    statusFilter = 'all';
    els.statusFilter.value = 'all';
    render();
  }

  function clearFilters() {
    searchQuery = '';
    statusFilter = 'all';
    scopeFilter = 'all';
    els.search.value = '';
    els.statusFilter.value = 'all';
    els.scopeFilter.value = 'all';
    render();
  }

  /* ---------------- Dialogs & toast ---------------- */

  function openConfirm({ title, message, confirmLabel, onConfirm }) {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmDeleteBtn.textContent = confirmLabel;
    confirmAction = onConfirm;
    els.confirmDialog.showModal();
  }

  function showToast(message, undo) {
    clearTimeout(toastTimer);
    els.toastMessage.textContent = message;
    toastUndo = typeof undo === 'function' ? undo : null;
    els.toastAction.hidden = !toastUndo;
    els.toast.hidden = false;
    toastTimer = setTimeout(hideToast, 6500);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toastTimer = null;
    toastUndo = null;
    els.toast.hidden = true;
  }

  function applyTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      /* ignore */
    }
    const label = nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }

  function initTheme() {
    let theme = document.documentElement.dataset.theme;
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);

    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    });
  }

  /* ---------------- Teams & task sharing ---------------- */

  function selectedTeam() {
    return teams.find((team) => team.id === els.taskTeam.value) || teams[0] || null;
  }

  function renderAssigneePicker() {
    const team = selectedTeam();
    const current = els.taskAssignee.value;
    if (!team) {
      els.taskAssignee.innerHTML = '<option value="">Unassigned</option>';
      els.taskAssignee.disabled = true;
      return;
    }
    els.taskAssignee.disabled = false;
    els.taskAssignee.innerHTML = '<option value="">Unassigned</option>' + team.members
      .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} (${escapeHtml(member.email)})</option>`)
      .join('');
    if (team.members.some((member) => member.id === current)) {
      els.taskAssignee.value = current;
    }
  }

  function renderTeamPicker() {
    const current = els.taskTeam.value;
    if (!teams.length) {
      els.taskTeam.innerHTML = '<option value="">No teams yet</option>';
      els.taskTeam.disabled = true;
      els.taskAssignee.innerHTML = '<option value="">Unassigned</option>';
      els.taskAssignee.disabled = true;
      return;
    }
    els.taskTeam.disabled = false;
    els.taskTeam.innerHTML = teams
      .map((team) => `<option value="${escapeHtml(team.id)}">${escapeHtml(team.name)}</option>`)
      .join('');
    if (teams.some((team) => team.id === current)) {
      els.taskTeam.value = current;
    }
    renderAssigneePicker();
  }

  function setTaskScope(scope) {
    if (scope === 'team' && !teams.length) {
      taskScope = 'personal';
      openTeamsDialog();
      showToast('Create a team first, then you can share tasks with it.');
      return;
    }

    taskScope = scope === 'team' ? 'team' : 'personal';
    els.scopeButtons.forEach((button) => {
      const active = button.dataset.scope === taskScope;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const isTeam = taskScope === 'team';
    els.teamPickerWrap.hidden = !isTeam;
    els.assigneePickerWrap.hidden = !isTeam;
    if (isTeam) renderTeamPicker();
  }

  async function loadTeamsForUser() {
    if (!currentUser) return;
    try {
      teams = await fetchTeams();
    } catch (error) {
      if (error.status === 401) {
        handleSessionExpired();
        return;
      }
      teams = [];
    }
    renderTeamPicker();
    renderTeamsDialog();
    if (taskScope === 'team' && !teams.length) setTaskScope('personal');
  }

  function renderTeamsDialog() {
    if (!els.teamList) return;

    if (!teams.length) {
      els.teamList.innerHTML = '<p class="empty-inline">You are not in any teams yet. Create one above, then share tasks with it.</p>';
      return;
    }

    els.teamList.innerHTML = teams.map((team) => {
      const memberLabel = `${team.members.length} member${team.members.length === 1 ? '' : 's'}`;
      const members = team.members.map((member) => `
        <span class="member-chip">
          <span class="member-name">${escapeHtml(member.name)} <small>${escapeHtml(member.email)}</small></span>
          ${team.isOwner && member.id !== team.ownerId ? `<button type="button" class="member-remove" data-team-action="remove-member" data-team-id="${escapeHtml(team.id)}" data-member-email="${escapeHtml(member.email)}" aria-label="Remove ${escapeHtml(member.name)}" title="Remove member">×</button>` : ''}
        </span>`).join('');

      return `
        <article class="team-card" data-team-id="${escapeHtml(team.id)}">
          <header class="team-card-head">
            <div class="team-title-wrap">
              ${team.isOwner
                ? `<input class="team-name-input" data-team-name value="${escapeHtml(team.name)}" maxlength="80" aria-label="Team name">`
                : `<h3 class="team-name">${escapeHtml(team.name)}</h3>`}
              <p class="team-sub">${memberLabel}${team.isOwner ? ' · You own this team' : ` · Owner: ${escapeHtml(team.ownerName)}`}</p>
            </div>
            ${team.isOwner ? `<div class="row-actions">
              <button type="button" class="icon-btn" data-team-action="rename" data-team-id="${escapeHtml(team.id)}" aria-label="Save team name" title="Save team name">${icon('check')}</button>
              <button type="button" class="icon-btn icon-btn-danger" data-team-action="delete" data-team-id="${escapeHtml(team.id)}" aria-label="Delete team" title="Delete team">${icon('trash')}</button>
            </div>` : ''}
          </header>
          <div class="team-members">${members}</div>
          ${team.isOwner ? `<div class="team-add-member">
            <input type="email" class="team-member-input" data-member-input maxlength="254" placeholder="member@example.com" aria-label="Member email">
            <button type="button" class="btn btn-ghost btn-sm" data-team-action="add-member" data-team-id="${escapeHtml(team.id)}">Add member</button>
          </div>` : ''}
        </article>`;
    }).join('');
  }

  function openTeamsDialog() {
    showFieldError(els.teamCreateError, '');
    renderTeamsDialog();
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
    if (!els.teamsDialog.open) els.teamsDialog.showModal();
  }

  async function refreshTeamsAndTasks() {
    await loadTeamsForUser();
    await loadTasksForUser();
    renderTeamsDialog();
  }

  async function submitTeamCreate(event) {
    event.preventDefault();
    showFieldError(els.teamCreateError, '');

    const name = els.teamName.value.trim();
    if (!name) {
      showFieldError(els.teamCreateError, 'Enter a team name.');
      return;
    }

    const memberEmails = els.teamMembers.value
      .split(/[,;\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      await createTeamRequest(name, memberEmails);
      els.teamCreateForm.reset();
      await refreshTeamsAndTasks();
      showToast(`Team “${name}” created`);
    } catch (error) {
      const unknown = error.data && Array.isArray(error.data.unknown) ? error.data.unknown : [];
      showFieldError(
        els.teamCreateError,
        unknown.length ? `No account found for: ${unknown.join(', ')}` : error.message
      );
    }
  }

  async function renameTeam(teamId, name) {
    if (!name) {
      showToast('Enter a team name first.');
      return;
    }
    try {
      await updateTeamRequest(teamId, { name });
      await refreshTeamsAndTasks();
      showToast('Team name updated');
    } catch (error) {
      showToast(error.message);
    }
  }

  async function addTeamMember(teamId, email) {
    if (!email) {
      showToast('Enter the email of a registered user.');
      return;
    }
    try {
      await updateTeamRequest(teamId, { addEmails: [email] });
      await refreshTeamsAndTasks();
      showToast('Team member added');
    } catch (error) {
      showToast(error.message);
    }
  }

  async function removeTeamMember(teamId, email) {
    try {
      await updateTeamRequest(teamId, { removeEmails: [email] });
      await refreshTeamsAndTasks();
      showToast('Team member removed');
    } catch (error) {
      showToast(error.message);
    }
  }

  async function deleteTeam(teamId) {
    try {
      await deleteTeamRequest(teamId);
      await refreshTeamsAndTasks();
      showToast('Team deleted');
    } catch (error) {
      showToast(error.message);
    }
  }

  /* ---------------- JSON import / export ---------------- */

  function exportJson() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `taskline-${localDateStr()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Tasks exported as JSON');
  }

  function importJsonFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      showToast('That JSON file is too large (maximum 5 MB).');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const list = Array.isArray(parsed)
          ? parsed
          : (parsed && Array.isArray(parsed.tasks) ? parsed.tasks : null);

        if (!list) throw new Error('expected a JSON array of tasks');

        const imported = list
          .filter((task) => task && typeof task.title === 'string')
          .map(normalizeTask);

        if (!imported.length) throw new Error('no tasks found in that file');

        openConfirm({
          title: 'Import tasks?',
          message: `This adds ${imported.length} task(s) from “${file.name}”. Team tasks are added to a matching team you belong to when possible; otherwise they become personal tasks.`,
          confirmLabel: 'Import tasks',
          onConfirm: () => {
            const now = new Date().toISOString();
            let added = 0;

            imported.forEach((task) => {
              let scope = 'personal';
              let teamId = null;
              let assigneeId = null;

              if (task.scope === 'team') {
                const team = teams.find((item) => item.id === task.teamId)
                  || teams.find((item) => item.name === task.teamName);
                if (team) {
                  scope = 'team';
                  teamId = team.id;
                  if (task.assigneeId && team.members.some((member) => member.id === task.assigneeId)) {
                    assigneeId = task.assigneeId;
                  }
                }
              }

              const nextTask = normalizeTask({
                ...task,
                id: uid(),
                scope,
                teamId,
                assigneeId,
                createdBy: currentUser ? currentUser.id : null,
                createdAt: now,
                updatedAt: now,
                archivedAt: task.archived ? (task.archivedAt || now) : null,
              });

              tasks.push(nextTask);
              persistNewTask(nextTask);
              added += 1;
            });

            render();
            showToast(`Imported ${added} task(s) from JSON`);
          },
        });
      } catch (error) {
        showToast(`Could not import JSON: ${error.message}`);
      }
    };

    reader.onerror = () => showToast('Could not read that file');
    reader.readAsText(file);
  }

  /* ---------------- Authentication ---------------- */

  function showFieldError(element, message) {
    if (!element) return;
    element.textContent = message || '';
    element.hidden = !message;
  }

  function setAuthNotice(message) {
    els.authNotice.textContent = message || '';
    els.authNotice.hidden = !message;
  }

  function setAuthTab(tab) {
    authTab = tab === 'register' ? 'register' : 'login';
    els.authTabs.forEach((button) => {
      const active = button.dataset.authTab === authTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    els.loginForm.hidden = authTab !== 'login';
    els.registerForm.hidden = authTab !== 'register';
    showFieldError(els.loginError, '');
    showFieldError(els.registerError, '');
  }

  function showAuth(tab = 'login', notice = '') {
    els.appShell.hidden = true;
    els.authView.hidden = false;
    setAuthTab(tab);
    setAuthNotice(notice);
    document.title = 'Sign in — Taskline';
  }

  function renderAccount() {
    if (!currentUser) return;
    const email = currentUser.email || '';
    const name = currentUser.name || email.split('@')[0] || 'Account';
    els.accountEmail.textContent = name;
    els.accountMenuName.textContent = name;
    els.accountMenuEmail.textContent = email;
    els.accountInitial.textContent = (name.charAt(0) || email.charAt(0) || '?').toUpperCase();
  }

  function enterApp(user) {
    currentUser = user;
    storageMode = 'account';
    teams = [];
    els.authView.hidden = true;
    els.appShell.hidden = false;
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
    setAuthNotice('');
    renderAccount();
    setTaskScope('personal');
    renderTeamPicker();
    document.title = 'Taskline — Daily tasks';
  }

  function endSession(notice = '') {
    if (currentUser) clearCachedTasks(currentUser.id);
    currentUser = null;
    tasks = [];
    teams = [];
    storageMode = 'local';
    saveSequence += 1;
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
    if (els.passwordDialog.open) els.passwordDialog.close();
    if (els.resetDialog.open) els.resetDialog.close();
    if (els.teamsDialog.open) els.teamsDialog.close();
    els.loginForm.reset();
    els.loginPassword.value = '';
    setTaskScope('personal');
    renderTeamPicker();
    renderTeamsDialog();
    showAuth('login', notice);
  }

  function handleSessionExpired() {
    endSession('Your session has expired. Please sign in again.');
  }

  async function loadTasksForUser() {
    try {
      const serverTasks = await fetchTasks();
      storageMode = 'account';
      tasks = serverTasks;
      cacheTasks();
      render();
      setStorageStatus('account', 'Saved in this browser');
    } catch (error) {
      if (error.status === 401) {
        handleSessionExpired();
        return;
      }
      storageMode = 'local';
      render();
      setStorageStatus(
        'local',
        tasks.length
          ? 'Showing the last saved copy from this browser'
          : 'Nothing saved yet'
      );
    }
  }

  async function startSession(user, notice) {
    enterApp(user);
    tasks = loadCachedTasks();
    render();
    setStorageStatus('checking', 'Loading your tasks…');
    if (notice) showToast(notice);
    await loadTeamsForUser();
    await loadTasksForUser();
  }

  async function submitLogin(event) {
    event.preventDefault();
    showFieldError(els.loginError, '');

    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (!email || !password) {
      showFieldError(els.loginError, 'Enter your email and password.');
      return;
    }

    try {
      const data = await apiRequest(`${AUTH_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      els.loginForm.reset();
      await startSession(data.user, 'Signed in');
    } catch (error) {
      showFieldError(els.loginError, error.message);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    showFieldError(els.registerError, '');

    const name = els.registerName.value.trim();
    const email = els.registerEmail.value.trim();
    const password = els.registerPassword.value;
    const confirm = els.registerConfirm.value;
    const maidenName = els.registerMaiden.value.trim();

    if (!name || !email || !password || !maidenName) {
      showFieldError(els.registerError, 'Fill in your name, email, password, and mother\'s maiden name.');
      return;
    }
    if (name.length < 2) {
      showFieldError(els.registerError, 'Enter your name (at least 2 characters).');
      return;
    }
    if (password.length < 8) {
      showFieldError(els.registerError, 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      showFieldError(els.registerError, 'The two passwords do not match.');
      return;
    }
    if (maidenName.length < 2) {
      showFieldError(els.registerError, 'Enter your mother\'s maiden name (at least 2 characters).');
      return;
    }

    try {
      const data = await apiRequest(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, maidenName }),
      });
      els.registerForm.reset();
      await startSession(data.user, 'Account created');
    } catch (error) {
      showFieldError(els.registerError, error.message);
    }
  }

  async function signOut() {
    try {
      await apiRequest(`${AUTH_API}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch (error) {
      /* Clear the local session even if the request fails. */
    }
    endSession('You have been signed out.');
  }

  /* ---------------- Change password ---------------- */

  function openPasswordDialog() {
    els.passwordForm.reset();
    showFieldError(els.pwError, '');
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
    els.passwordDialog.showModal();
    els.pwCurrent.focus();
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    showFieldError(els.pwError, '');

    const currentPassword = els.pwCurrent.value;
    const maidenName = els.pwMaiden.value.trim();
    const newPassword = els.pwNew.value;
    const confirm = els.pwConfirm.value;

    if (!currentPassword || !maidenName) {
      showFieldError(els.pwError, 'Enter your current password and your mother\'s maiden name.');
      return;
    }
    if (newPassword.length < 8) {
      showFieldError(els.pwError, 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      showFieldError(els.pwError, 'The two new passwords do not match.');
      return;
    }

    try {
      const data = await apiRequest(`${AUTH_API}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, maidenName, newPassword }),
      });
      els.passwordDialog.close();
      endSession(data.message || 'Password updated. Please sign in again.');
    } catch (error) {
      if (error.code === 'maiden_mismatch') {
        els.passwordDialog.close();
        openResetDialog({
          email: (error.data && error.data.email) || (currentUser && currentUser.email) || '',
          step: 2,
          devMode: Boolean(error.data && error.data.devMode),
          note: error.message,
          requireCode: true,
        });
        return;
      }
      showFieldError(els.pwError, error.message);
    }
  }

  /* ---------------- Forgot / reset password ---------------- */

  function resetShowStep(step) {
    resetState.step = step;
    const one = step === 1;
    els.resetStepOne.hidden = !one;
    els.resetStepTwo.hidden = one;
    els.resetFootOne.hidden = !one;
    els.resetFootTwo.hidden = one;
    showFieldError(els.resetErrorOne, '');
    showFieldError(els.resetErrorTwo, '');
  }

  function openResetDialog(options = {}) {
    resetState = {
      step: 1,
      email: options.email || '',
      resetToken: options.resetToken || null,
      devMode: Boolean(options.devMode),
    };

    els.resetForm.reset();
    els.resetEmail.value = resetState.email;
    els.resetMailPreview.hidden = true;
    els.resetMailPreview.textContent = '';

    if (options.step === 2) {
      resetShowStep(2);
      const requireCode = options.requireCode !== false;
      els.resetCodeWrap.hidden = !requireCode;
      els.viewMailBtn.hidden = !(requireCode && resetState.devMode);
      els.resetNote.classList.toggle('is-success', !requireCode);
      els.resetNote.textContent = options.note
        || (requireCode ? 'Enter the verification code from your email.' : 'Identity confirmed. Choose a new password.');
    } else {
      resetShowStep(1);
    }

    els.resetDialog.showModal();
  }

  async function requestReset() {
    showFieldError(els.resetErrorOne, '');
    const email = els.resetEmail.value.trim();
    const maidenName = els.resetMaiden.value.trim();

    if (!email) {
      showFieldError(els.resetErrorOne, 'Enter the email for your account.');
      return;
    }

    try {
      const data = await apiRequest(`${AUTH_API}/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, maidenName }),
      });

      resetState.email = data.email || email;

      if (data.verifiedBy === 'maiden') {
        resetState.resetToken = data.resetToken;
        resetShowStep(2);
        els.resetCodeWrap.hidden = true;
        els.resetNote.classList.add('is-success');
        els.resetNote.textContent = data.message || 'Maiden name verified. Choose a new password.';
      } else {
        resetState.resetToken = null;
        resetState.devMode = Boolean(data.devMode);
        resetShowStep(2);
        els.resetCodeWrap.hidden = false;
        els.viewMailBtn.hidden = !resetState.devMode;
        els.resetNote.classList.remove('is-success');
        els.resetNote.textContent = data.message || 'Check your email for a verification code.';
      }

      els.resetNew.focus();
    } catch (error) {
      showFieldError(els.resetErrorOne, error.message);
    }
  }

  async function completeReset() {
    showFieldError(els.resetErrorTwo, '');
    const newPassword = els.resetNew.value;
    const confirm = els.resetConfirm.value;

    if (newPassword.length < 8) {
      showFieldError(els.resetErrorTwo, 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      showFieldError(els.resetErrorTwo, 'The two new passwords do not match.');
      return;
    }

    const body = { email: resetState.email, newPassword };
    if (resetState.resetToken) {
      body.resetToken = resetState.resetToken;
    } else {
      const code = els.resetCode.value.trim();
      if (!code) {
        showFieldError(els.resetErrorTwo, 'Enter the verification code from your email.');
        return;
      }
      body.code = code;
    }

    try {
      const data = await apiRequest(`${AUTH_API}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      els.resetDialog.close();
      endSession(data.message || 'Password updated. Please sign in again.');
    } catch (error) {
      showFieldError(els.resetErrorTwo, error.message);
    }
  }

  async function viewLocalMail() {
    try {
      const data = await apiRequest(`/api/dev/last-mail?email=${encodeURIComponent(resetState.email)}`);
      els.resetMailPreview.textContent = `To: ${data.to}\nSubject: ${data.subject}\n\n${data.body}`;
      els.resetMailPreview.hidden = false;
    } catch (error) {
      els.resetMailPreview.textContent = error.message;
      els.resetMailPreview.hidden = false;
    }
  }

  /* ---------------- Loading ---------------- */

  async function boot() {
    try {
      const data = await apiRequest(`${AUTH_API}/me`);
      if (data && data.user) {
        enterApp(data.user);
        tasks = loadCachedTasks();
        render();
        setStorageStatus('checking', 'Loading your tasks…');
        await loadTeamsForUser();
        await loadTasksForUser();
        return;
      }
    } catch (error) {
      if (error.status === 401) {
        showAuth('login');
        return;
      }
      showAuth('login', error.message);
      return;
    }
    showAuth('login');
  }

  /* ---------------- Sample data ---------------- */

  function loadSamples() {
    const today = localDateStr();
    const base = Date.now();
    const samples = [
      {
        title: 'Review sprint board and plan the day',
        notes: 'Focus on the two blocked tickets first.',
        date: today,
        status: 'inprogress',
        priority: 'high',
      },
      {
        title: 'Prepare quarterly report outline',
        notes: 'Waiting on the finance numbers from Priya.',
        date: today,
        status: 'hold',
        priority: 'high',
      },
      {
        title: 'Reply to client emails',
        notes: '',
        date: today,
        status: 'todo',
        priority: 'medium',
      },
      {
        title: 'Book dentist appointment',
        notes: '',
        date: addDays(today, -1),
        status: 'todo',
        priority: 'low',
      },
      {
        title: 'Gym — leg day',
        notes: '',
        date: addDays(today, 1),
        status: 'todo',
        priority: 'low',
      },
      {
        title: 'Send invoice to Acme Corp',
        notes: '',
        date: today,
        status: 'complete',
        priority: 'medium',
      },
    ];

    const createdTasks = samples.map((sample, index) => {
      const created = new Date(base - index * 60 * 1000).toISOString();
      return normalizeTask({
        ...sample,
        id: uid(),
        scope: 'personal',
        createdBy: currentUser ? currentUser.id : null,
        createdAt: created,
        updatedAt: created,
        archived: sample.status === 'complete',
        archivedAt: sample.status === 'complete' ? created : null,
      });
    });

    createdTasks.forEach((task) => {
      tasks.push(task);
      persistNewTask(task);
    });

    render();
    showToast('Sample tasks loaded — explore and edit freely');
  }

  /* ---------------- Auth events ---------------- */

  function bindAuthEvents() {
    els.authTabs.forEach((button) => {
      button.addEventListener('click', () => setAuthTab(button.dataset.authTab));
    });

    els.loginForm.addEventListener('submit', submitLogin);
    els.registerForm.addEventListener('submit', submitRegister);

    els.forgotBtn.addEventListener('click', () => {
      openResetDialog({ email: els.loginEmail.value.trim() });
    });

    els.accountBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = els.accountMenu.hidden;
      els.accountMenu.hidden = !willOpen;
      els.accountBtn.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (event) => {
      if (!els.accountMenu.hidden && !els.account.contains(event.target)) {
        els.accountMenu.hidden = true;
        els.accountBtn.setAttribute('aria-expanded', 'false');
      }
    });

    els.changePasswordBtn.addEventListener('click', openPasswordDialog);
    els.signOutBtn.addEventListener('click', signOut);

    els.passwordForm.addEventListener('submit', submitPasswordChange);

    els.resetForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (resetState.step === 1) {
        void requestReset();
      } else {
        void completeReset();
      }
    });

    els.resetBackBtn.addEventListener('click', () => {
      resetShowStep(1);
      els.resetMailPreview.hidden = true;
    });

    els.viewMailBtn.addEventListener('click', viewLocalMail);

    [els.loginError, els.registerError, els.pwError, els.resetErrorOne, els.resetErrorTwo].forEach((element) => {
      if (!element) return;
      element.hidden = true;
    });
  }

  /* ---------------- Events ---------------- */

  function bindEvents() {
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();

      const title = els.title.value.trim();
      if (!title) {
        els.title.focus();
        return;
      }

      const date = els.date.value || localDateStr();
      const status = STATUS[els.status.value] ? els.status.value : 'todo';
      const now = new Date().toISOString();
      const scope = taskScope;
      let teamId = null;
      let teamName = '';
      let assigneeId = null;
      let assigneeName = '';
      let assigneeEmail = '';

      if (scope === 'team') {
        const team = selectedTeam();
        if (!team) {
          showToast('Create a team first, then share a task with it.');
          openTeamsDialog();
          return;
        }
        teamId = team.id;
        teamName = team.name;
        assigneeId = els.taskAssignee.value || null;
        const member = team.members.find((item) => item.id === assigneeId);
        assigneeName = member ? member.name : '';
        assigneeEmail = member ? member.email : '';
      }

      const task = normalizeTask({
        id: uid(),
        title,
        notes: els.notes.value.trim(),
        date,
        status,
        priority: els.priority.value,
        archived: status === 'complete',
        archivedAt: status === 'complete' ? now : null,
        createdAt: now,
        updatedAt: now,
        scope,
        teamId,
        teamName,
        assigneeId,
        assigneeName,
        assigneeEmail,
        createdBy: currentUser ? currentUser.id : null,
        createdByName: currentUser ? currentUser.name : '',
        canDelete: true,
      });

      tasks.push(task);
      persistNewTask(task);

      els.title.value = '';
      els.notes.value = '';
      els.status.value = 'todo';
      els.priority.value = 'medium';
      els.title.focus();
      render();

      if (status === 'complete') {
        showToast(scope === 'team' ? `Task added to ${teamName} and archived` : 'Task added and archived');
      } else if (scope === 'team') {
        showToast(`Task shared with ${teamName}`);
      } else {
        const label = groupTitle(date);
        const when = ['Today', 'Tomorrow', 'Yesterday'].includes(label) ? ` for ${label.toLowerCase()}` : '';
        showToast(`Task added${when}`);
      }
    });

    els.detailsToggle.addEventListener('click', () => {
      const isHidden = els.detailsRow.hasAttribute('hidden');
      if (isHidden) {
        els.detailsRow.removeAttribute('hidden');
        els.detailsToggle.textContent = '− Notes';
        els.notes.focus();
      } else {
        els.detailsRow.setAttribute('hidden', '');
        els.detailsToggle.textContent = '+ Notes';
      }
      els.detailsToggle.setAttribute('aria-expanded', String(isHidden));
    });

    document.querySelectorAll('[data-set-date]').forEach((button) => {
      button.addEventListener('click', () => {
        els.date.value = button.dataset.setDate === 'tomorrow'
          ? addDays(localDateStr(), 1)
          : localDateStr();
        els.date.focus();
      });
    });

    els.taskList.addEventListener('click', (event) => {
      if (event.target.closest('[data-clear-filters]')) {
        clearFilters();
        return;
      }

      if (event.target.closest('[data-load-samples]')) {
        loadSamples();
        return;
      }

      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const article = button.closest('[data-id]');
      if (!article) return;

      const id = article.dataset.id;
      switch (button.dataset.action) {
        case 'complete':
          archiveTask(id);
          break;
        case 'restore':
          restoreTask(id);
          break;
        case 'edit':
          openEdit(id);
          break;
        case 'delete':
          requestDelete(id);
          break;
        default:
          break;
      }
    });

    els.taskList.addEventListener('change', (event) => {
      const select = event.target.closest('select[data-action="status"]');
      if (!select) return;

      const article = select.closest('[data-id]');
      if (!article) return;

      setStatus(article.dataset.id, select.value);
    });

    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => setView(tab.dataset.view));
    });

    els.search.addEventListener('input', () => {
      searchQuery = els.search.value;
      renderTaskList();
    });

    els.statusFilter.addEventListener('change', () => {
      statusFilter = els.statusFilter.value;
      if (statusFilter === 'complete' && view !== 'archive') {
        view = 'archive';
      }
      render();
    });

    els.scopeFilter.addEventListener('change', () => {
      scopeFilter = els.scopeFilter.value;
      render();
    });

    els.scopeButtons.forEach((button) => {
      button.addEventListener('click', () => setTaskScope(button.dataset.scope));
    });

    els.taskTeam.addEventListener('change', renderAssigneePicker);
    els.composerTeamsBtn.addEventListener('click', openTeamsDialog);
    els.manageTeamsBtn.addEventListener('click', openTeamsDialog);

    els.teamCreateForm.addEventListener('submit', submitTeamCreate);

    els.teamList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-team-action]');
      if (!button) return;

      const teamId = button.dataset.teamId;
      const team = teams.find((item) => item.id === teamId);
      if (!team) return;

      switch (button.dataset.teamAction) {
        case 'rename': {
          const card = button.closest('[data-team-id]');
          const input = card ? card.querySelector('[data-team-name]') : null;
          if (input) void renameTeam(teamId, input.value.trim());
          break;
        }
        case 'delete':
          openConfirm({
            title: 'Delete team?',
            message: `“${team.name}” and all tasks shared with it will be permanently removed.`,
            confirmLabel: 'Delete team',
            onConfirm: () => void deleteTeam(teamId),
          });
          break;
        case 'add-member': {
          const card = button.closest('[data-team-id]');
          const input = card ? card.querySelector('[data-member-input]') : null;
          if (input) void addTeamMember(teamId, input.value.trim());
          break;
        }
        case 'remove-member':
          void removeTeamMember(teamId, button.dataset.memberEmail || '');
          break;
        default:
          break;
      }
    });

    els.teamList.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      const memberInput = event.target.closest('[data-member-input]');
      if (memberInput) {
        event.preventDefault();
        const card = memberInput.closest('[data-team-id]');
        if (card) void addTeamMember(card.dataset.teamId, memberInput.value.trim());
        return;
      }

      const nameInput = event.target.closest('[data-team-name]');
      if (nameInput) {
        event.preventDefault();
        const card = nameInput.closest('[data-team-id]');
        if (card) void renameTeam(card.dataset.teamId, nameInput.value.trim());
      }
    });

    els.editTitle.addEventListener('input', () => {
      if (!els.editError.hidden) els.editError.hidden = true;
    });

    els.editForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const task = tasks.find((item) => item.id === editingId);
      if (!task) return;

      const title = els.editTitle.value.trim();
      if (!title) {
        els.editError.hidden = false;
        els.editTitle.focus();
        return;
      }

      const status = STATUS[els.editStatus.value] ? els.editStatus.value : task.status;
      const date = els.editDate.value || task.date;

      task.title = title;
      task.date = date;
      task.status = status;
      task.priority = els.editPriority.value;
      task.notes = els.editNotes.value.trim();

      if (task.scope === 'team') {
        task.assigneeId = els.editAssignee.value || null;
        const team = teams.find((item) => item.id === task.teamId);
        const member = team ? team.members.find((item) => item.id === task.assigneeId) : null;
        task.assigneeName = member ? member.name : '';
        task.assigneeEmail = member ? member.email : '';
      }

      if (status === 'complete') {
        if (!task.archived) {
          task.archived = true;
          task.archivedAt = new Date().toISOString();
        }
      } else if (task.archived) {
        task.archived = false;
        task.archivedAt = null;
      }

      task.updatedAt = new Date().toISOString();
      persistTask(task);
      els.editDialog.close();
      render();

      showToast(status === 'complete' ? 'Task updated and archived' : 'Task updated');
    });

    document.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => {
        const dialog = button.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    });

    els.editDialog.addEventListener('close', () => {
      editingId = null;
    });

    els.confirmDeleteBtn.addEventListener('click', () => {
      const action = confirmAction;
      confirmAction = null;
      els.confirmDialog.close();
      if (action) action();
    });

    els.confirmDialog.addEventListener('close', () => {
      confirmAction = null;
    });

    els.toastAction.addEventListener('click', () => {
      const undo = toastUndo;
      hideToast();
      if (undo) undo();
    });

    els.toastClose.addEventListener('click', hideToast);

    els.exportBtn.addEventListener('click', exportJson);

    els.importBtn.addEventListener('click', () => els.importFile.click());

    els.importFile.addEventListener('change', () => {
      const file = els.importFile.files && els.importFile.files[0];
      els.importFile.value = '';
      if (file) importJsonFile(file);
    });

    document.addEventListener('keydown', (event) => {
      if (document.querySelector('dialog[open]')) return;
      if (!currentUser || els.appShell.hidden) return;

      const target = event.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === '/') {
        event.preventDefault();
        els.search.focus();
      } else if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        els.title.focus();
      }
    });
  }

  /* ---------------- Init ---------------- */

  function init() {
    els.date.value = localDateStr();
    els.status.innerHTML = statusOptions('todo');
    els.priority.innerHTML = priorityOptions('medium');
    els.editStatus.innerHTML = statusOptions('todo');
    els.editPriority.innerHTML = priorityOptions('medium');
    els.statusFilter.innerHTML = '<option value="all">All statuses</option>' + statusOptions('todo');
    els.statusFilter.value = 'all';
    els.scopeFilter.value = 'all';

    initTheme();
    bindAuthEvents();
    bindEvents();
    renderTeamPicker();
    renderTeamsDialog();

    void boot();
  }

  init();
})();
