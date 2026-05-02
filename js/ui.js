/**
 * ui.js — Sales Simulator UI renderer
 * Reads from game state, writes to DOM. No game logic here.
 */

import {
  STAGES, formatDate, formatDateShort, dayNumberToDate,
  getSeasonInfo, getActiveOpps, getPipelineSummary,
  ACTIONS_PER_DAY, getNextQuarterQuota,
} from './engine.js';

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
  bar.style.background = pct >= 80 ? '#1D9E75' : pct >= 50 ? '#378ADD' : '#EF9F27';
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
      const bg    = isComplete ? '#EAF3DE' : isMissed ? '#FCEBEB' : e.type === 'demo' ? '#EEEDFE' : '#E1F5EE';
      const color = isComplete ? '#27500A' : isMissed ? '#791F1F' : e.type === 'demo' ? '#3C3489' : '#085041';
      const label = (e.type === 'demo' ? 'Demo' : 'Pricing') + ': ' + company;
      const clickable = !isComplete && !isMissed;
      return `<div
        data-cal-event="${e.oppId}:${e.type}"
        style="font-size:10px;padding:4px 5px;border-radius:4px;background:${bg};color:${color};margin-bottom:2px;line-height:1.3;min-height:24px;cursor:${clickable ? 'pointer' : 'default'}${isMissed ? ';text-decoration:line-through' : ''}"
        ${clickable ? `onclick="window._onCalEvent('${e.oppId}','${e.type}')"` : ''}
      >${label}</div>`;
    }).join('');

    const borderStyle = isToday ? 'border:1.5px solid #378ADD;background:#E6F1FB;' : 'border:0.5px solid var(--border);';
    return `<div style="${borderStyle}border-radius:8px;min-height:72px;padding:6px;${isPast ? 'opacity:.55;' : ''}">
      <div style="font-size:10px;font-weight:500;color:${isToday ? '#0C447C' : 'var(--text2)'};margin-bottom:3px">
        D${date.day}${isToday ? ' ·today' : ''}
      </div>
      ${evHtml}
      ${events.length === 0 ? `<div style="font-size:10px;color:var(--text3);font-style:italic">Free</div>` : ''}
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
  badge.style.background = unread > 0 ? '#E6F1FB' : '#F1EFE8';
  badge.style.color      = unread > 0 ? '#0C447C' : '#888780';

  const sorted = [...state.emails].reverse();
  const list   = document.getElementById('inbox-list');

  list.innerHTML = sorted.map(e => {
    const isSelected = e.id === _selectedEmailId;
    const dotColor   = e.read ? 'transparent' : '#378ADD';
    const preview    = e.body.replace(/\n/g, ' ').substring(0, 55);
    return `<div
      class="inbox-list-item${isSelected ? ' selected' : ''}"
      onclick="window._onEmailSelect(${e.id})"
    >
      <div style="width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:4px"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:4px;align-items:baseline">
          <span style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">${e.from}</span>
          <span style="font-size:10px;color:var(--text3);white-space:nowrap;flex-shrink:0">${e.time}</span>
        </div>
        <div style="font-size:12px;${!e.read ? 'font-weight:600;' : ''}color:var(--text);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.subject}</div>
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
    body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-style:italic;font-size:13px">Select an email to read</div>`;
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
    <div style="padding:16px 18px;border-bottom:0.5px solid var(--border);flex-shrink:0">
      <button class="btn btn-sm mobile-back-btn" onclick="window._mobileEmailBack()" style="display:none;margin-bottom:10px">← Back</button>
      <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">${e.subject}</div>
      <div style="font-size:11px;color:var(--text2)">From: ${e.from} &nbsp;·&nbsp; ${e.time}</div>
    </div>
    <div style="padding:16px 18px;flex:1;overflow-y:auto">
      <div style="font-size:13px;line-height:1.75;white-space:pre-wrap;color:var(--text)">${bodyText}</div>
      ${actionBtn}
    </div>`;

  window._onEmailAction  = onEmailAction;
  window._mobileEmailBack = () => {
    document.getElementById('panel-inbox').classList.remove('mobile-email-open');
  };
}

// ─── Phone panel ──────────────────────────────────────────────────────────────

export function renderPhone(state, onCallClick) {
  const callables = getActiveOpps(state).filter(o =>
    o.stage === STAGES.LIVE_CALL || o.stage === STAGES.FUTURE
  );

  const list = document.getElementById('call-list');
  list.innerHTML = callables.length === 0
    ? `<div style="font-size:12px;color:var(--text3);font-style:italic;padding:6px 0">No calls queued right now</div>`
    : callables.map(o => {
        const dot       = URGENCY_COLORS[o.urgency];
        const isLive    = o.stage === STAGES.LIVE_CALL;
        const stageBg   = isLive ? '#FCEBEB' : '#F1EFE8';
        const stageText = isLive ? '#791F1F' : '#444441';
        const stageLabel = isLive ? 'Close' : 'Rebook';
        const hint = o.demoHostedDay !== null
          ? `$${(o.value/1000).toFixed(0)}k · ${o.prob}%`
          : o.flavourNote
            ? o.flavourNote.substring(0, 40) + '…'
            : o.company;
        return `<div
          onclick="window._onCallClick(${o.id})"
          class="call-item"
          style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border);cursor:pointer;min-height:44px"
        >
          <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500">${o.name}</div>
            <div style="font-size:11px;color:var(--text2)">${o.company} · ${hint}</div>
          </div>
          <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${stageBg};color:${stageText};white-space:nowrap;flex-shrink:0">${stageLabel}</span>
        </div>`;
      }).join('');

  window._onCallClick = onCallClick;
}

// ─── Pipeline — Kanban only ───────────────────────────────────────────────────

export function renderPipeline(state, onKanbanCardClick) {
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
        return `<div
          onclick="window._onKanbanClick(${o.id})"
          style="background:${sc.bg};border:0.5px solid ${sc.border};border-radius:6px;padding:7px 8px;margin-bottom:5px;cursor:pointer;position:relative"
        >
          <div style="font-size:11px;font-weight:600;color:${sc.text};margin-bottom:2px">${o.company}</div>
          <div style="font-size:10px;color:${sc.text};opacity:.8;line-height:1.4">${hint}</div>
          ${dot ? `<div style="width:7px;height:7px;border-radius:50%;background:${dot};position:absolute;top:7px;right:7px"></div>` : ''}
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

  _setStat('stat-won',    `$${Math.round(state.monthRevenue/1000)}k`);
  _setStat('stat-active', summary.total);
  _setStat('stat-urgent', summary.urgent, summary.urgent > 0 ? '#E24B4A' : null);
  _setStat('stat-pct',    pct + '%');
  _setStat('stat-quota',  `$${Math.round(state.quota/1000)}k`);
  _setStat('stat-nextq',  nextQText, nextQ > state.quota ? '#1D9E75' : null);
}

function _setStat(id, val, color = null) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  if (color) el.style.color = color;
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
