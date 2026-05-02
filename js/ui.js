/**
 * ui.js — Sales Simulator UI renderer
 * Reads from game state, writes to DOM. No game logic here.
 */

import {
  STAGES, formatDate, formatDateShort, dayNumberToDate,
  getSeasonInfo, getActiveOpps, getPipelineSummary,
  ACTIONS_PER_DAY, getNextQuarterQuota, BDR_ROSTER,
} from './engine.js';

const POSITIONS = [
  'Jr Sales Rep',
  'Jr Senior Sales Rep',
  'Jr Mid-Market Sales Rep',
  'Mid Market Sales Rep',
  'Sr Mid Market Sales Rep',
  'Sr Sales Rep',
  'Jr Enterprise Sales Rep',
  'Enterprise Sales Rep',
  'Sr Enterprise Sales Rep',
  'Executive Enterprise Sales Rep',
  'Lead Sales Rep of Global Operations',
  'Sr Executive Sales Rep of Global Ops',
];

const STAGE_SHORT = {
  [STAGES.PRE_DEMO]:          'Sch. Demo',
  [STAGES.DEMO_SCHEDULED]:    'Demo set',
  [STAGES.DEMO_HOSTED]:       'Sch. Pricing',
  [STAGES.PROPOSAL]:          'Proposal',
  [STAGES.PRICING_SCHEDULED]: 'Pricing set',
  [STAGES.LIVE_CALL]:         'Call to close',
  [STAGES.FUTURE]:            'Futures',
};

const STAGE_LABELS = {
  [STAGES.PRE_DEMO]:          'Schedule Demo',
  [STAGES.DEMO_SCHEDULED]:    'Demo Booked',
  [STAGES.DEMO_HOSTED]:       'Demo Booked',
  [STAGES.PROPOSAL]:          'Build Proposal',
  [STAGES.PRICING_SCHEDULED]: 'Pricing Booked',
  [STAGES.LIVE_CALL]:         'Call to Close',
  [STAGES.FUTURE]:            'Futures',
  [STAGES.WON]:               'Won',
  [STAGES.LOST]:              'Lost',
};

const KANBAN_COLUMNS = [
  { key: STAGES.PRE_DEMO,          label: 'Schedule Demo'  },
  { key: STAGES.DEMO_SCHEDULED,    label: 'Demo Booked'    },
  { key: STAGES.PROPOSAL,          label: 'Build Proposal' },
  { key: STAGES.PRICING_SCHEDULED, label: 'Pricing Booked' },
  { key: STAGES.LIVE_CALL,         label: 'Call to Close'  },
  { key: STAGES.FUTURE,            label: 'Futures'        },
];

const STAGE_COLORS = {
  [STAGES.PRE_DEMO]:          { bg: '#FAEEDA', text: '#633806', border: '#EF9F27' },
  [STAGES.DEMO_SCHEDULED]:    { bg: '#EEEDFE', text: '#3C3489', border: '#7F77DD' },
  [STAGES.DEMO_HOSTED]:       { bg: '#EEEDFE', text: '#3C3489', border: '#7F77DD' },
  [STAGES.PROPOSAL]:          { bg: '#E6F1FB', text: '#0C447C', border: '#378ADD' },
  [STAGES.PRICING_SCHEDULED]: { bg: '#E1F5EE', text: '#085041', border: '#1D9E75' },
  [STAGES.LIVE_CALL]:         { bg: '#FCEBEB', text: '#791F1F', border: '#E24B4A' },
  [STAGES.FUTURE]:            { bg: '#F1EFE8', text: '#444441', border: '#888780' },
  [STAGES.WON]:               { bg: '#EAF3DE', text: '#27500A', border: '#639922' },
  [STAGES.LOST]:              { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
};

const URGENCY_COLORS = { red: '#E24B4A', amber: '#EF9F27', green: '#1D9E75' };

// ─── Header ───────────────────────────────────────────────────────────────────

export function renderHeader(state) {
  const season  = getSeasonInfo(state.date.gameMonth);
  const pct     = Math.min(100, Math.round((state.monthRevenue / state.quota) * 100));
  const weekNum = Math.floor(state.dayNumber / 5) + 1;

  document.getElementById('header-date').textContent = formatDate(state.date);
  document.getElementById('header-season').textContent =
    `Q${state.date.quarter} · M${state.date.month} · W${state.date.week}${season.isSlow ? ' · Slow season' : ''}`;
  document.getElementById('quota-pct').textContent =
    `$${Math.round(state.monthRevenue / 1000)}k / $${Math.round(state.quota / 1000)}k`;
  const bar = document.getElementById('quota-bar');
  bar.style.width      = pct + '%';
  bar.style.background = pct >= 80 ? '#00aa00' : pct >= 50 ? '#008080' : '#ff0000';
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export function renderCalendar(state, onCalendarEventClick) {
  const weekStart = Math.floor(state.dayNumber / 5) * 5;
  const grid      = document.getElementById('cal-grid');

  grid.innerHTML = Array.from({ length: 5 }, (_, i) => {
    const dayNum  = weekStart + i;
    const date    = dayNumberToDate(dayNum);
    const isToday = dayNum === state.dayNumber;
    const isPast  = dayNum < state.dayNumber;

    const events  = state.calendarEvents.filter(e => e.day === dayNum);
    const evHtml  = events.map(e => {
      const opp = state.opportunities.find(o => o.id === e.oppId);
      if (!opp) return '';
      const company    = opp.company.split(' ')[0];
      const isComplete = (e.type === 'demo' && opp.demoHostedDay !== null) ||
                         (e.type === 'pricing' && opp.pricingHostedDay !== null);
      const isMissed   = opp.stage === STAGES.LOST && !isComplete;
      const bg    = isComplete ? '#d4d0c8' : isMissed ? '#d4d0c8' : e.type === 'demo' ? '#000080' : '#008080';
      const color = isComplete ? '#00aa00' : isMissed ? '#ff0000' : '#ffffff';
      const label = (e.type === 'demo' ? 'Demo' : 'Pricing') + ': ' + company;
      const clickable = !isComplete && !isMissed;
      return `<div
        data-cal-event="${e.oppId}:${e.type}"
        style="font-size:10px;padding:3px 5px;border:1px solid #808080;background:${bg};color:${color};margin-bottom:2px;line-height:1.3;min-height:22px;cursor:${clickable ? 'pointer' : 'default'};font-family:Arial,sans-serif${isMissed ? ';text-decoration:line-through' : ''}"
        ${clickable ? `onclick="window._onCalEvent('${e.oppId}','${e.type}')"` : ''}
      >${label}</div>`;
    }).join('');

    const borderStyle = isToday
      ? 'border:2px solid #000080;'
      : 'border:2px solid;border-color:#808080 #ffffff #ffffff #808080;';
    const todayHeader = isToday
      ? `<div style="background:#000080;color:#ffffff;padding:1px 4px;margin:-5px -5px 4px -5px;font-size:10px;font-family:Arial,sans-serif;font-weight:bold">D${date.day} TODAY</div>`
      : `<div style="font-size:10px;font-family:Arial,sans-serif;color:#404040;margin-bottom:3px">D${date.day}</div>`;
    return `<div style="${borderStyle}min-height:72px;padding:5px;${isPast ? 'opacity:.55;' : ''}background:#d4d0c8;">
      ${todayHeader}
      ${evHtml}
      ${events.length === 0 ? `<div style="font-size:10px;color:#808080;font-style:italic;font-family:Arial,sans-serif">—</div>` : ''}
    </div>`;
  }).join('');

  const startDate = dayNumberToDate(weekStart);
  document.getElementById('cal-week-label').textContent =
    `Q${startDate.quarter}·M${startDate.month}·W${startDate.week}`;

  window._onCalEvent = onCalendarEventClick;
}

// ─── Email — Outlook split panel ──────────────────────────────────────────────

let _selectedEmailId = null;

export function renderEmails(state, onEmailSelect) {
  const unread = state.emails.filter(e => !e.read).length;
  const badge  = document.getElementById('email-unread-badge');
  badge.textContent  = unread + ' unread';
  badge.style.background = unread > 0 ? '#ff0000' : '#d4d0c8';
  badge.style.color      = unread > 0 ? '#ffffff' : '#808080';

  const sorted = [...state.emails].reverse();
  const list   = document.getElementById('inbox-list');

  const olderEl = document.getElementById('inbox-older');
  if (olderEl) {
    const extra = sorted.length - 5;
    if (extra > 0) {
      olderEl.textContent = `↑ ${extra} older email${extra > 1 ? 's' : ''}`;
      olderEl.style.display = '';
    } else {
      olderEl.style.display = 'none';
    }
  }

  list.innerHTML = sorted.map(e => {
    const isSelected = e.id === _selectedEmailId;
    const newLabel   = e.read ? '' : `<span style="color:#00aa00;font-weight:bold;font-size:10px;font-family:Arial,sans-serif;flex-shrink:0;margin-top:2px;white-space:nowrap">[NEW]</span>`;
    const preview    = e.body.replace(/\n/g, ' ').substring(0, 55);
    return `<div
      class="inbox-list-item${isSelected ? ' selected' : ''}"
      onclick="window._onEmailSelect(${e.id})"
    >
      ${newLabel}
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:4px;align-items:baseline">
          <span style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">${e.from}</span>
          <span style="font-size:10px;color:var(--text3);white-space:nowrap;flex-shrink:0">${e.time}</span>
        </div>
        <div style="font-size:12px;${!e.read ? 'font-weight:bold;' : ''}color:var(--text);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.subject}</div>
        <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${preview}…</div>
      </div>
    </div>`;
  }).join('');

  window._onEmailSelect = (id) => {
    _selectedEmailId = id;
    onEmailSelect(id);
  };
}

export function renderEmailBody(state, emailId, onEmailAction) {
  const e    = state.emails.find(x => x.id === emailId);
  const body = document.getElementById('inbox-body');

  if (!e) {
    body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#808080;font-style:italic;font-size:11px;font-family:Arial,sans-serif;background:#ffffff">[ Select an email to read ]</div>`;
    return;
  }

  const bodyText = e.body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let actionBtn = '';
  if (e.actionType === 'schedule-demo' && e.oppId) {
    const opp = state.opportunities.find(o => o.id === e.oppId);
    if (opp && opp.stage === STAGES.PRE_DEMO) {
      actionBtn = `<div style="margin-top:16px">
        <button class="btn btn-primary" onclick="window._onEmailAction('schedule-demo',${e.oppId})">
          Schedule demo
        </button>
      </div>`;
    }
  }

  body.innerHTML = `
    <div style="padding:8px 10px;border-bottom:1px solid #808080;flex-shrink:0;background:#d4d0c8;">
      <button class="btn btn-sm mobile-back-btn" onclick="window._mobileEmailBack()" style="display:none;margin-bottom:8px">← Back</button>
      <div style="font-size:12px;font-weight:bold;color:#000000;margin-bottom:3px;font-family:Arial,sans-serif">${e.subject}</div>
      <div style="font-size:10px;color:#404040;font-family:Arial,sans-serif">From: ${e.from} &nbsp;&middot;&nbsp; ${e.time}</div>
    </div>
    <div style="padding:10px 12px;flex:1;overflow-y:auto;background:#ffffff;">
      <div style="font-size:12px;line-height:1.7;white-space:pre-wrap;color:#000000;font-family:'Courier New',monospace">${bodyText}</div>
      ${actionBtn}
    </div>`;

  window._onEmailAction  = onEmailAction;
  window._mobileEmailBack = () => {
    document.getElementById('panel-inbox').classList.remove('mobile-email-open');
  };
}

// ─── Phone panel ──────────────────────────────────────────────────────────────

export function renderPhone(state, onCallClick, onContactClick, activeTab) {
  const container = document.getElementById('phone-body');
  if (!container) return;

  const allActive  = getActiveOpps(state).slice().sort((a, b) => b.id - a.id);
  const callables  = allActive.filter(o => o.stage === STAGES.LIVE_CALL || o.stage === STAGES.FUTURE);
  const tab        = activeTab || 'contacts';

  const tabsHtml = `<div class="phone-tabs">
    <button class="phone-tab${tab === 'contacts' ? ' active' : ''}" onclick="window._setPhoneTab('contacts')">Contacts (${allActive.length})</button>
    <button class="phone-tab${tab === 'calls' ? ' active' : ''}" onclick="window._setPhoneTab('calls')">Calls (${callables.length})</button>
  </div>`;

  let listHtml = '';
  if (tab === 'contacts') {
    listHtml = allActive.length === 0
      ? `<div style="font-size:12px;color:var(--text3);font-style:italic;padding:6px 0">No active contacts</div>`
      : allActive.map(o => {
          const isCallable  = o.stage === STAGES.LIVE_CALL || o.stage === STAGES.FUTURE;
          const dot         = URGENCY_COLORS[o.urgency];
          const stageLabel  = STAGE_SHORT[o.stage] || o.stage;
          const stageBg     = (isCallable && o.stage === STAGES.LIVE_CALL) ? '#000080' : '#d4d0c8';
          const stageColor  = (isCallable && o.stage === STAGES.LIVE_CALL) ? '#ffffff' : '#000000';
          return `<div onclick="window._onContactClick(${o.id})" class="contact-item">
            <div style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:3px"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500">${o.name}</div>
              <div style="font-size:11px;color:var(--text2)">${o.company}</div>
            </div>
            <span style="font-size:10px;padding:1px 5px;border:1px solid #808080;background:${stageBg};color:${stageColor};white-space:nowrap;flex-shrink:0;font-family:Arial,sans-serif">${stageLabel}</span>
          </div>`;
        }).join('');
  } else {
    listHtml = callables.length === 0
      ? `<div style="font-size:12px;color:var(--text3);font-style:italic;padding:6px 0">No calls queued right now</div>`
      : callables.map(o => {
          const dot        = URGENCY_COLORS[o.urgency];
          const isLive     = o.stage === STAGES.LIVE_CALL;
          const stageBg    = isLive ? '#000080' : '#d4d0c8';
          const stageText  = isLive ? '#ffffff' : '#000000';
          const stageLabel = isLive ? 'Close' : 'Rebook';
          const hint = o.demoHostedDay !== null
            ? `$${(o.value/1000).toFixed(0)}k · ${o.prob}%`
            : o.flavourNote ? o.flavourNote.substring(0, 40) + '…' : o.company;
          return `<div onclick="window._onCallClick(${o.id})" class="call-item"
            style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border);cursor:pointer;min-height:44px">
            <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500">${o.name}</div>
              <div style="font-size:11px;color:var(--text2)">${o.company} · ${hint}</div>
            </div>
            <span style="font-size:10px;padding:1px 6px;border:1px solid #808080;background:${stageBg};color:${stageText};white-space:nowrap;flex-shrink:0;font-family:Arial,sans-serif">${stageLabel}</span>
          </div>`;
        }).join('');
  }

  container.innerHTML = tabsHtml + `<div class="phone-list-scroll">${listHtml}</div>`;
  window._onCallClick    = onCallClick;
  window._onContactClick = onContactClick;
}

// ─── Pipeline — Kanban only ───────────────────────────────────────────────────

export function renderPipeline(state, onKanbanCardClick) {
  const bdrId       = state.activeBDR || 'none';
  const bdrEntry    = BDR_ROSTER.find(b => b.id === bdrId) || BDR_ROSTER[0];
  const hasRiskFlags = bdrEntry.autoActions.includes('riskFlags');

  const el = document.getElementById('pipe-kanban');
  el.innerHTML = `<div class="kanban-scroll"><div class="kanban-board">` +
    KANBAN_COLUMNS.map(col => {
      // Demo Booked column shows both DEMO_SCHEDULED and DEMO_HOSTED
      const opps = getActiveOpps(state).filter(o =>
        o.stage === col.key ||
        (col.key === STAGES.DEMO_SCHEDULED && o.stage === STAGES.DEMO_HOSTED)
      );
      const sc = STAGE_COLORS[col.key];
      const cards = opps.map(o => {
        const dot     = o.urgency === 'red' ? '#E24B4A' : o.urgency === 'amber' ? '#EF9F27' : null;
        const showVal = o.demoHostedDay !== null;
        const hint    = showVal
          ? `$${(o.value/1000).toFixed(0)}k · ${o.prob}%`
          : o.flavourNote
            ? o.flavourNote.substring(0, 48) + '…'
            : '';
        const riskWarn = (hasRiskFlags && o.urgency === 'red')
          ? `<span style="position:absolute;top:4px;right:${dot ? '18px' : '6px'};font-size:11px;line-height:1" title="At risk">⚠</span>`
          : '';
        return `<div
          onclick="window._onKanbanClick(${o.id})"
          style="background:#fffef0;border:1px solid #808080;border-radius:0;padding:5px 7px;margin-bottom:4px;cursor:pointer;position:relative"
        >
          <div style="font-size:11px;font-weight:bold;color:#000000;margin-bottom:1px;font-family:Arial,sans-serif">${o.company}</div>
          <div style="font-size:10px;color:#404040;line-height:1.4;font-family:'Courier New',monospace">${hint}</div>
          ${riskWarn}
          ${dot ? `<div style="width:7px;height:7px;border-radius:50%;background:${dot};position:absolute;top:6px;right:6px"></div>` : ''}
        </div>`;
      }).join('');

      return `<div class="kanban-col">
        <div class="kanban-col-header">${col.label}</div>
        ${cards || `<div style="font-size:10px;color:var(--text3);font-style:italic">—</div>`}
      </div>`;
    }).join('') + '</div></div>';

  window._onKanbanClick = onKanbanCardClick;
}

// ─── Stats footer ─────────────────────────────────────────────────────────────

export function renderStats(state) {
  const summary   = getPipelineSummary(state);
  const pct       = Math.min(100, Math.round((state.monthRevenue / state.quota) * 100));
  const nextQ     = getNextQuarterQuota(state);
  const nextQText = nextQ > state.quota
    ? `$${Math.round(nextQ/1000)}k ↑`
    : `$${Math.round(nextQ/1000)}k`;

  _setStat('stat-won',    `$${Math.round(state.monthRevenue/1000)}k`, '#00aa00');
  _setStat('stat-active', summary.total);
  _setStat('stat-urgent', summary.urgent, summary.urgent > 0 ? '#ff0000' : null);
  _setStat('stat-pct',    pct + '%');
  _setStat('stat-quota',  `$${Math.round(state.quota/1000)}k`);
  _setStat('stat-nextq',  nextQText, nextQ > state.quota ? '#00aa00' : null);
}

function _setStat(id, val, color = null) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  if (color) el.style.color = color;
}

// ─── Employee ID Card ─────────────────────────────────────────────────────────

export function renderIdCard(state) {
  const card = document.getElementById('id-card');
  if (!card) return;

  const isFemale   = state.avatarIndex === 1;
  const avatarSrc  = isFemale ? 'player_avatar2.png' : 'player_avatar1.png';
  const name       = isFemale ? 'SALLY, MARY' : 'DANIEL, JOHN';
  const empId      = state.employeeId || '000000';
  const qIdx       = Math.min((state.date.quarter || 1) - 1, POSITIONS.length - 1);
  const position   = POSITIONS[qIdx];

  card.innerHTML = `
    <div class="id-card-stripe">&#9632; WIDGET WONDERS INC. &#9632;</div>
    <div class="id-card-body">
      <img src="${avatarSrc}" class="id-card-avatar" alt="Employee photo">
      <button class="id-card-switch" onclick="window.switchAvatar()">Switch</button>
      <div class="id-card-divider"></div>
      <div class="id-card-name">${name}</div>
      <div class="id-card-fields">
        <div class="id-card-field"><span class="id-card-field-key">ID</span>&nbsp;&nbsp;EMP-${empId}</div>
        <div class="id-card-field"><span class="id-card-field-key">DEPT</span>&nbsp;SALES</div>
        <div class="id-card-field" style="white-space:normal;line-height:1.3"><span class="id-card-field-key">TITLE</span>&nbsp;${position}</div>
      </div>
      <div class="id-card-barcode"></div>
    </div>`;
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

export function showModal(title, bodyHtml, buttons = [], mini = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = bodyHtml;
  document.getElementById('modal-buttons').innerHTML = buttons.map(b =>
    `<button class="btn${b.primary ? ' btn-primary' : ''}" onclick="${b.onclick}">${b.label}</button>`
  ).join('');
  const box = document.getElementById('modal-box');
  box.className = mini ? 'modal-box modal-mini' : 'modal-box';
  document.getElementById('modal-wrap').style.display = 'flex';
}

export function closeModal() {
  document.getElementById('modal-wrap').style.display = 'none';
}
