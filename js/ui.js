/**
 * ui.js — Sales Simulator UI renderer
 * Reads from game state, writes to DOM. No game logic here.
 */

import {
  STAGES, formatDate, formatDateShort, formatQuarterMonth, dayNumberToDate,
  getSeasonInfo, getActiveOpps, getPipelineSummary,
  ACTIONS_PER_DAY, getNextQuarterQuota, BDR_ROSTER, TITLE_PROGRESSION,
  CLOSE_PERSONALITY_TYPES,
} from './engine.js';

const PERSONALITY_ICONS = { analytical: '📊', relationshipBuilder: '🤝', impatient: '⚡', skeptic: '🔍', champion: '🏆' };

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
  { key: 'awaiting-demo',           label: 'Awaiting Demo',   stages: [STAGES.PRE_DEMO, STAGES.DEMO_SCHEDULED] },
  { key: STAGES.DEMO_HOSTED,        label: 'Demo Done',       stages: [STAGES.DEMO_HOSTED] },
  { key: STAGES.PROPOSAL,           label: 'Pricing Prep',    stages: [STAGES.PROPOSAL] },
  { key: STAGES.PRICING_SCHEDULED,  label: 'Pricing Booked',  stages: [STAGES.PRICING_SCHEDULED] },
  { key: STAGES.LIVE_CALL,          label: 'Closing',         stages: [STAGES.LIVE_CALL] },
  { key: STAGES.FUTURE,             label: 'Futures',         stages: [STAGES.FUTURE] },
];

const URGENCY_COLORS = { red: '#E24B4A', amber: '#EF9F27', green: '#1D9E75' };

// ─── Header ───────────────────────────────────────────────────────────────────

export function renderHeader(state) {
  const season       = getSeasonInfo(state.date.gameMonth);
  const curMonRev    = state.currentMonthRevenue !== undefined ? state.currentMonthRevenue : (state.monthRevenue || 0);
  const curQuota     = state.monthlyQuota || state.quota || 80000;
  const pct          = Math.min(100, Math.round((curMonRev / curQuota) * 100));

  document.getElementById('header-date').textContent = formatDate(state.date);
  document.getElementById('header-season').textContent =
    formatQuarterMonth(state.date) + (season.isSlow ? ' · Slow season' : '');
  document.getElementById('quota-pct').textContent =
    `$${Math.round(curMonRev / 1000)}k / $${Math.round(curQuota / 1000)}k`;
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

    const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const dayName   = DAY_NAMES[date.day - 1];
    const borderStyle = isToday
      ? 'border:2px solid #000080;'
      : 'border:2px solid;border-color:#808080 #ffffff #ffffff #808080;';
    const todayHeader = isToday
      ? `<div style="background:#000080;color:#ffffff;padding:1px 4px;margin:-5px -5px 4px -5px;font-size:10px;font-family:Arial,sans-serif;font-weight:bold">${dayName} — TODAY</div>`
      : `<div style="font-size:10px;font-family:Arial,sans-serif;color:#404040;margin-bottom:3px">${dayName}</div>`;
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
let _emailsShown     = 12;
const _EMAIL_PAGE    = 12;

export function clearEmailSelection() {
  _selectedEmailId = null;
  _emailsShown     = _EMAIL_PAGE;
}

export function renderEmails(state, onEmailSelect) {
  const unread = state.emails.filter(e => !e.read).length;
  const badge  = document.getElementById('email-unread-badge');
  badge.textContent  = unread + ' unread';
  badge.style.background = unread > 0 ? '#ff0000' : '#d4d0c8';
  badge.style.color      = unread > 0 ? '#ffffff' : '#808080';

  // Mark all as read button — inject into panel header if not present
  const panelHeader = document.querySelector('#panel-inbox .panel-header');
  if (panelHeader && !panelHeader.querySelector('.mark-all-read-btn')) {
    const markBtn = document.createElement('button');
    markBtn.className = 'btn btn-sm mark-all-read-btn';
    markBtn.textContent = 'Mark all read';
    markBtn.style.cssText = 'font-size:10px;padding:1px 5px;border:1px solid #808080;cursor:pointer;background:var(--bg);color:#ffffff;margin-left:auto;';
    markBtn.onclick = () => window._markAllRead && window._markAllRead();
    panelHeader.appendChild(markBtn);
  }

  const sorted  = [...state.emails].reverse();
  const visible = sorted.slice(0, _emailsShown);
  const extra   = sorted.length - _emailsShown;
  const list    = document.getElementById('inbox-list');

  const olderEl = document.getElementById('inbox-older');
  if (olderEl) {
    if (extra > 0) {
      const loadCount = Math.min(extra, _EMAIL_PAGE);
      olderEl.textContent = `Load ${loadCount} older email${loadCount !== 1 ? 's' : ''} (${extra} remaining)`;
      olderEl.style.display  = '';
      olderEl.style.cursor   = 'pointer';
      olderEl.style.color    = '#000080';
      olderEl.style.textDecoration = 'underline';
      olderEl.onclick = () => {
        _emailsShown += _EMAIL_PAGE;
        renderEmails(state, onEmailSelect);
      };
    } else {
      olderEl.style.display = 'none';
      olderEl.onclick = null;
    }
  }

  // Set global handler before rendering so onclick="window._onEmailSelect(n)" is always valid
  window._onEmailSelect = function(id) {
    _selectedEmailId = id;
    onEmailSelect(id);
  };

  list.onclick = null; // clear any previous delegated listener

  const prevTop = list.scrollTop;
  list.innerHTML = visible.map(e => {
    const isSelected = e.id === _selectedEmailId;
    const newLabel   = e.read ? '' : `<span style="color:#00aa00;font-weight:bold;font-size:10px;font-family:Arial,sans-serif;flex-shrink:0;margin-top:2px;white-space:nowrap;pointer-events:none">[NEW]</span>`;
    const preview    = e.body.replace(/\n/g, ' ').substring(0, 55);
    return `<div
      class="inbox-list-item${isSelected ? ' selected' : ''}"
      onclick="window._onEmailSelect(${e.id})"
      style="cursor:pointer"
    >
      ${newLabel}
      <div style="flex:1;min-width:0;pointer-events:none">
        <div style="display:flex;justify-content:space-between;gap:4px;align-items:baseline">
          <span style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px">${e.from}</span>
          <span style="font-size:10px;color:var(--text3);white-space:nowrap;flex-shrink:0">${e.time}</span>
        </div>
        <div style="font-size:12px;${!e.read ? 'font-weight:bold;' : ''}color:var(--text);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.subject}</div>
        <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${preview}…</div>
      </div>
    </div>`;
  }).join('');

  // Restore scroll so selecting an email doesn't jump the list.
  // On a new day (_selectedEmailId not in visible list), reset to top so newest show first.
  const selectedStillVisible = _selectedEmailId && visible.some(e => e.id === _selectedEmailId);
  list.scrollTop = selectedStillVisible ? prevTop : 0;
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
        <button class="btn btn-primary" data-action="schedule-demo" data-opp-id="${e.oppId}" onclick="window._emailAction(this.dataset.action, parseInt(this.dataset.oppId))">
          Schedule demo
        </button>
      </div>`;
    }
  } else if (e.actionType === 'schedule-pricing' && e.oppId) {
    const opp = state.opportunities.find(o => o.id === e.oppId);
    if (opp && opp.stage === STAGES.DEMO_HOSTED) {
      actionBtn = `<div style="margin-top:16px">
        <button class="btn btn-primary" data-action="schedule-pricing" data-opp-id="${e.oppId}" onclick="window._emailAction(this.dataset.action, parseInt(this.dataset.oppId))">
          Schedule pricing meeting
        </button>
      </div>`;
    }
  }

  // Pipeline review inline form
  if (e.type === 'pipeline-review' && !e.submitted) {
    const activeOpps = state.opportunities.filter(o =>
      o.stage !== STAGES.WON && o.stage !== STAGES.LOST
    );
    if (activeOpps.length > 0) {
      const rows = activeOpps.map(o =>
        `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #c0c0c0;gap:8px">
          <span style="font-size:11px;font-family:Arial,sans-serif;color:#000000">${o.company}</span>
          <select id="fcst-${o.id}" style="font-size:11px;font-family:'Courier New',monospace;border:2px solid;border-color:#808080 #ffffff #ffffff #808080;background:#ffffff;min-height:22px;padding:0 4px">
            ${[10,20,30,40,50,60,70,80,90].map(p => `<option value="${p}"${p === Math.round(o.prob/10)*10 ? ' selected' : ''}>${p}%</option>`).join('')}
          </select>
        </div>`
      ).join('');
      actionBtn = `<div style="margin-top:14px;border:2px solid;border-color:#808080 #ffffff #ffffff #808080;background:#d4d0c8;padding:8px">
        <div style="font-size:10px;font-family:Arial,sans-serif;font-weight:bold;color:#000080;margin-bottom:6px">PIPELINE FORECAST FORM</div>
        ${rows}
        <button class="btn btn-primary" onclick="window._onForecastSubmit(${e.id})" style="margin-top:8px;font-size:11px">Submit Forecast</button>
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

export function renderPhone(state, onCallClick, onContactCallClick, activeTab, expandedContactId) {
  const container = document.getElementById('phone-body');
  if (!container) return;

  const allActive  = getActiveOpps(state).slice().sort((a, b) => b.id - a.id);
  const callables  = allActive.filter(o => o.stage === STAGES.LIVE_CALL || o.stage === STAGES.FUTURE);
  const tab        = activeTab || 'contacts';

  const avatarSrc  = (state.avatarIndex === 1) ? 'player_avatar2.png' : 'player_avatar1.png';
  const empName    = state.playerDisplayName || 'EMPLOYEE';
  const empId      = state.employeeId || '000000';
  const position   = TITLE_PROGRESSION[Math.min(state.titleProgress || 0, 11)];

  const profileHtml = `<div class="phone-profile">
    <img src="${avatarSrc}" class="phone-profile-avatar" alt="Employee photo" onerror="this.style.display='none'">
    <div class="phone-profile-info">
      <div class="phone-profile-name">${empName}</div>
      <div class="phone-profile-title">${position}</div>
      <div class="phone-profile-id">EMP-${empId}</div>
    </div>
    <div class="phone-profile-dept">SALES DEPT</div>
    <div class="phone-profile-barcode"></div>
  </div>`;

  const tabsHtml = `<div class="phone-tabs">
    <button class="phone-tab${tab === 'contacts' ? ' active' : ''}" onclick="window._setPhoneTab('contacts')">Contacts (${allActive.length})</button>
    <button class="phone-tab${tab === 'calls' ? ' active' : ''}" onclick="window._setPhoneTab('calls')">Calls (${callables.length})</button>
  </div>`;

  let listHtml = '';
  if (tab === 'contacts') {
    const bdrTier = (state.activeBDR
      ? (BDR_ROSTER.find(b => b.id === state.activeBDR) || BDR_ROSTER[0]).tier
      : 0);

    listHtml = allActive.length === 0
      ? `<div style="font-size:12px;color:var(--text3);font-style:italic;padding:6px 0">No active contacts</div>`
      : allActive.map(o => {
          const dot        = URGENCY_COLORS[o.urgency];
          const stageLabel = STAGE_SHORT[o.stage] || o.stage;
          const isLive     = o.stage === STAGES.LIVE_CALL || o.stage === STAGES.FUTURE;
          const stageBg    = (o.stage === STAGES.LIVE_CALL) ? '#000080' : '#d4d0c8';
          const stageColor = (o.stage === STAGES.LIVE_CALL) ? '#ffffff' : '#000000';
          const isExpanded = o.id === expandedContactId;

          // Notes block (tier-dependent, shown when expanded)
          let notesHtml = '';
          if (isExpanded) {
            const n = o.bdrNotes || {};
            notesHtml = `<div style="margin:4px 0 6px 14px;background:#ffffff;border:2px solid;border-color:#808080 #ffffff #ffffff #808080;padding:6px 8px;font-family:Arial,sans-serif">`;
            notesHtml += `<div style="font-size:10px;color:#808080;font-weight:bold;margin-bottom:3px">BUYER NOTES</div>`;
            if (bdrTier === 0) {
              notesHtml += `<div style="font-size:10px;color:#404040">No BDR assigned — no additional information available.</div>`;
            } else {
              notesHtml += `<div style="font-size:10px;color:#404040;line-height:1.6">${o.flavourNote || '—'}</div>`;
              if (bdrTier >= 1) notesHtml += `<div style="font-size:10px;color:#808080;font-style:italic;margin-top:2px">Basic qualification complete.</div>`;
              if (bdrTier >= 2 && n.budget) {
                notesHtml += `<div style="font-size:10px;font-family:'Courier New',monospace;color:#000000;margin-top:4px;line-height:1.6">${n.budget}<br>${n.timeline}<br>Key contact: ${n.stakeholder}</div>`;
              }
              if (bdrTier >= 4 && n.competitive) {
                notesHtml += `<div style="font-size:10px;font-family:'Courier New',monospace;color:#000000">Competitive: ${n.competitive}</div>`;
              }
            }
            notesHtml += `<button class="btn btn-primary" onclick="event.stopPropagation();window._onContactCall(${o.id})" style="font-size:10px;margin-top:6px;min-height:28px">Call</button>`;
            notesHtml += `</div>`;
          }

          return `<div>
            <div onclick="window._onContactClick(${o.id})" class="contact-item" style="background:${isExpanded ? '#e8e8ff' : ''}">
              <div style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:3px"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:${isExpanded ? 'bold' : '500'}">${o.name}</div>
                <div style="font-size:11px;color:var(--text2)">${o.company}</div>
              </div>
              <span style="font-size:10px;padding:1px 5px;border:1px solid #808080;background:${stageBg};color:${stageColor};white-space:nowrap;flex-shrink:0;font-family:Arial,sans-serif">${stageLabel}</span>
            </div>
            ${notesHtml}
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

  container.innerHTML = `<div class="phone-layout">
    ${profileHtml}
    <div class="phone-right">
      ${tabsHtml}
      <div class="phone-list-scroll">${listHtml}</div>
    </div>
  </div>`;
  window._onCallClick    = onCallClick;
  window._onContactCall  = onContactCallClick;
}

// ─── Pipeline — Kanban only ───────────────────────────────────────────────────

export function renderPipeline(state, onKanbanCardClick) {
  const bdrId        = state.activeBDR || 'none';
  const bdrEntry     = BDR_ROSTER.find(b => b.id === bdrId) || BDR_ROSTER[0];
  const hasRiskFlags = bdrEntry.autoActions.includes('riskFlags');

  const el = document.getElementById('pipe-kanban');
  const allActive = getActiveOpps(state);

  const colsHtml = KANBAN_COLUMNS.map(col => {
    const opps = allActive.filter(o => col.stages.includes(o.stage));

    const cards = opps.map(o => {
      const dot         = o.urgency === 'red' ? '#E24B4A' : o.urgency === 'amber' ? '#EF9F27' : null;
      const demoRevealed = o.demoHostedDay !== null;

      // Temperature icon
      const temp      = o.temperature || 75;
      const tempColor = temp >= 76 ? '#1D9E75' : temp >= 51 ? '#EF9F27' : temp >= 26 ? '#378ADD' : '#808080';
      const tempLabel = temp >= 76 ? 'Hot' : temp >= 51 ? 'Warm' : temp >= 26 ? 'Cooling' : 'Cold';
      const tempIcon  = `<span title="Relationship: ${tempLabel}" style="cursor:help;color:${tempColor};font-size:11px">🌡️</span>`;

      // Personality icon only if revealed
      const persIcon = o.personalityRevealed && PERSONALITY_ICONS[o.personalityType]
        ? `<span title="${o.personalityType}" style="font-size:11px">${PERSONALITY_ICONS[o.personalityType]}</span>`
        : '';

      // Close personality badge — shown on LIVE_CALL cards when revealed
      const closeCP    = CLOSE_PERSONALITY_TYPES[o.closePersonalityType] || {};
      const closeCPBadge = (o.closePersonalityRevealed && o.stage === STAGES.LIVE_CALL)
        ? `<span title="Close style: ${closeCP.label || o.closePersonalityType} — ${closeCP.hint || ''}" style="display:inline-flex;align-items:center;gap:2px;font-size:10px;padding:1px 5px;border:1px solid #808080;background:#e8e8ff;font-family:Arial,sans-serif;cursor:help">${closeCP.icon || '?'} ${closeCP.label || o.closePersonalityType}</span>`
        : '';

      // Risk warning
      const riskWarn = (hasRiskFlags && o.urgency === 'red')
        ? `<span style="position:absolute;top:4px;right:${dot ? '18px' : '6px'};font-size:11px;line-height:1" title="At risk">⚠</span>`
        : '';

      let infoHtml;
      if (demoRevealed) {
        // After demo: show buyer name, deal value, close probability
        infoHtml = `
          <div style="font-size:10px;color:#404040;font-family:'Courier New',monospace">${o.name}</div>
          <div style="font-size:10px;color:#404040;font-family:'Courier New',monospace">$${(o.value/1000).toFixed(0)}k · ${o.prob}%</div>`;
        // FUTURE: show days since closed and call eligibility
        if (o.stage === STAGES.FUTURE && o.futureClosedDay != null) {
          const daysSince   = state.dayNumber - o.futureClosedDay;
          const eligible    = daysSince >= 10;
          const eligColor   = eligible ? '#1D9E75' : '#EF9F27';
          const eligText    = eligible ? 'Call eligible' : `Call eligible in ${10 - daysSince}d`;
          infoHtml += `<div style="font-size:10px;font-family:'Courier New',monospace;color:#808080">Closed: ${daysSince}d ago</div>`;
          infoHtml += `<div style="font-size:10px;font-family:'Courier New',monospace;color:${eligColor}">${eligText}</div>`;
        }
      } else {
        // Before demo: company name only + icons
        infoHtml = `<div style="font-size:10px;color:#808080;font-family:'Courier New',monospace;font-style:italic">Demo pending</div>`;
      }

      return `<div style="background:#fffef0;border:1px solid #808080;padding:5px 7px;margin-bottom:4px;position:relative">
        <div style="font-size:11px;font-weight:bold;color:#000000;margin-bottom:1px;font-family:Arial,sans-serif">${o.company}</div>
        ${infoHtml}
        <div style="margin-top:2px">${tempIcon}${persIcon}</div>
        ${closeCPBadge ? `<div style="margin-top:3px">${closeCPBadge}</div>` : ''}
        ${riskWarn}
        ${dot ? `<div style="width:7px;height:7px;border-radius:50%;background:${dot};position:absolute;top:6px;right:6px"></div>` : ''}
      </div>`;
    }).join('');

    return `<div class="kanban-col">
      <div class="kanban-col-header">${col.label}</div>
      ${cards || `<div style="font-size:10px;color:var(--text3);font-style:italic">—</div>`}
    </div>`;
  }).join('');

  // ── SUSPENDED column ──
  const suspendedOpps  = state.opportunities.filter(o => o.stage === STAGES.SUSPENDED);
  const suspendedCards = suspendedOpps.map(o => {
    const resumeIn = o.resumeDay ? Math.max(0, o.resumeDay - state.dayNumber) : '?';
    return `<div style="background:#e8e8e8;border:1px solid #808080;padding:5px 7px;margin-bottom:4px;opacity:0.8">
      <div style="font-size:11px;font-weight:bold;color:#808080;font-family:Arial,sans-serif">⏸ ${o.company}</div>
      <div style="font-size:10px;color:#808080;font-family:'Courier New',monospace">Resumes in ${resumeIn} days</div>
    </div>`;
  }).join('');

  const suspendedCol = suspendedOpps.length > 0 ? `<div class="kanban-col kanban-suspended">
    <div class="kanban-col-header" style="color:#808080">Suspended</div>
    ${suspendedCards}
  </div>` : '';

  el.innerHTML = `<div class="kanban-scroll"><div class="kanban-board">${colsHtml}${suspendedCol}</div></div>`;

  window._onKanbanClick = onKanbanCardClick;
}

// ─── Stats footer ─────────────────────────────────────────────────────────────

export function renderStats(state) {
  const summary      = getPipelineSummary(state);
  const curMonRev    = state.currentMonthRevenue !== undefined ? state.currentMonthRevenue : (state.monthRevenue || 0);
  const curQuota     = state.monthlyQuota || state.quota || 80000;
  const pct          = Math.min(100, Math.round((curMonRev / curQuota) * 100));
  const nextQ        = getNextQuarterQuota(state);
  const nextQText    = nextQ > state.quota
    ? `$${Math.round(nextQ/1000)}k ↑`
    : `$${Math.round(nextQ/1000)}k`;

  _setStat('stat-won',    `$${Math.round(curMonRev/1000)}k`, '#00aa00');
  _setStat('stat-active', summary.total);
  _setStat('stat-urgent', summary.urgent, summary.urgent > 0 ? '#ff0000' : null);
  _setStat('stat-pct',    pct + '%');
  _setStat('stat-quota',  `$${Math.round(curQuota/1000)}k`);
  _setStat('stat-nextq',  nextQText, nextQ > state.quota ? '#00aa00' : null);

  // Leaderboard panel
  const lbEl = document.getElementById('stat-leaderboard');
  if (lbEl && state.leaderboard) {
    const playerAtt = Math.round((curMonRev / curQuota) * 100);
    const allEntries = [
      { name: 'You', attainment: playerAtt, isPlayer: true },
      ...state.leaderboard
    ].sort((a, b) => b.attainment - a.attainment);
    const top3 = allEntries.slice(0, 3);
    const playerRank = allEntries.findIndex(e => e.isPlayer) + 1;
    lbEl.innerHTML = top3.map((e, i) => {
      const style = e.isPlayer ? 'font-weight:bold;color:#000080;' : '';
      return `<span style="font-size:10px;font-family:Arial,sans-serif;${style}">${i+1}. ${e.name} ${e.attainment}%</span>`;
    }).join('<br>') + (playerRank > 3 ? `<br><span style="font-size:10px;font-family:Arial,sans-serif;font-weight:bold;color:#000080">${playerRank}. You ${playerAtt}%</span>` : '');
    lbEl.title = 'Click to see full leaderboard';
    lbEl.style.cursor = 'pointer';
    lbEl.onclick = () => window._openLeaderboardModal && window._openLeaderboardModal();
  }
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

  const isFemale  = state.avatarIndex === 1;
  const avatarSrc = isFemale ? 'player_avatar2.png' : 'player_avatar1.png';
  const name      = state.playerDisplayName || (isFemale ? 'EMPLOYEE' : 'EMPLOYEE');
  const empId     = state.employeeId || '000000';
  const position  = TITLE_PROGRESSION[Math.min(state.titleProgress || 0, 11)];

  card.innerHTML = `
    <div class="id-card-stripe">&#9632; PIPELINE HEALTH SIM &#9632;</div>
    <div class="id-card-body">
      <img src="${avatarSrc}" class="id-card-avatar" alt="Employee photo">
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

function _makeDraggable(box) {
  const header = box.querySelector('.modal-header');
  if (!header) return;

  let offsetX = 0, offsetY = 0;
  let startX, startY;
  let isDragging = false;

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const newX = offsetX + (e.clientX - startX);
    const newY = offsetY + (e.clientY - startY);
    box.style.transform = `translate(${newX}px, ${newY}px)`;
  };

  const onMouseUp = (e) => {
    if (!isDragging) return;
    offsetX += e.clientX - startX;
    offsetY += e.clientY - startY;
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  const onMouseDown = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    e.preventDefault();
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (header._dragHandler) header.removeEventListener('mousedown', header._dragHandler);
  header._dragHandler = onMouseDown;
  header.addEventListener('mousedown', onMouseDown);
}

export function showModal(title, bodyHtml, buttons = [], mini = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML    = bodyHtml;
  document.getElementById('modal-buttons').innerHTML = buttons.map(b =>
    `<button class="btn${b.primary ? ' btn-primary' : ''}" onclick="${b.onclick}">${b.label}</button>`
  ).join('');
  const box = document.getElementById('modal-box');
  box.className = mini ? 'modal-box modal-mini' : 'modal-box';
  box.style.transform = '';
  document.getElementById('modal-wrap').style.display = 'flex';
  _makeDraggable(box);
}

export function closeModal() {
  document.getElementById('modal-wrap').style.display = 'none';
  const box = document.getElementById('modal-box');
  if (box) box.style.transform = '';
}
