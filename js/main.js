/**
 * main.js — Sales Simulator entry point
 * Owns game state. Connects engine actions to UI events.
 */

import {
  createInitialState, advanceDay, saveState, loadState, clearState,
  generateOpportunity, STAGES, ACTIONS_PER_DAY,
  actionScheduleDemo, actionHostDemo, actionSchedulePricing,
  actionBuildProposal, actionHostPricing, actionCloseCall, actionRebookCall, actionTouchBase,
  getActiveOpps, formatDate, dayNumberToDate, nextEmailId,
  BDR_ROSTER, getActiveBDR,
} from './engine.js';

import {
  renderHeader, renderCalendar, renderEmails, renderEmailBody,
  renderPhone, renderPipeline, renderStats, renderIdCard,
  showModal, closeModal,
} from './ui.js';

import {
  CLOSE_DIALOGUES, REBOOK_DIALOGUES, BUYER_PROFILES, SLIDES, SLIDE_REACTIONS,
} from './dialogues.js';

// ─── State ────────────────────────────────────────────────────────────────────

let state     = null;
let _phoneTab = 'contacts';

// ─── Full render ──────────────────────────────────────────────────────────────

function renderAll() {
  renderHeader(state);
  renderCalendar(state, handleCalendarEvent);
  renderEmails(state, handleEmailSelect);
  renderEmailBody(state, _currentEmailId, handleEmailAction);
  renderPhone(state, handleCallClick, handleContactClick, _phoneTab);
  renderPipeline(state, handleKanbanClick);
  renderStats(state);
  renderIdCard(state);
  // BDR button indicator: pulse when unlocked BDRs exist that aren't yet hired
  const bdrBtn = document.getElementById('bdr-btn');
  if (bdrBtn) {
    const hasUnhiredUnlocked = state.availableBDRs.some(id => id !== 'none' && id !== state.activeBDR);
    bdrBtn.classList.toggle('has-new', hasUnhiredUnlocked);
    bdrBtn.title = hasUnhiredUnlocked ? 'New BDR available!' : 'Manage your BDR';
  }
  saveState(state);
}

let _currentEmailId = null;

// ─── Email handlers ───────────────────────────────────────────────────────────

function handleEmailSelect(emailId) {
  _currentEmailId = emailId;
  const email = state.emails.find(e => e.id === emailId);
  if (email) email.read = true;

  // On mobile: show full-screen email view
  const panel = document.getElementById('panel-inbox');
  if (panel) panel.classList.add('mobile-email-open');

  renderEmails(state, handleEmailSelect);
  renderEmailBody(state, emailId, handleEmailAction);
  saveState(state);
}

function handleEmailAction(actionType, oppId) {
  if (actionType === 'schedule-demo') {
    const opp = state.opportunities.find(o => o.id === oppId);
    if (opp) showScheduleDemoModal(opp);
  }
}

// ─── Calendar event handler ───────────────────────────────────────────────────

function handleCalendarEvent(oppIdStr, eventType) {
  const oppId = parseInt(oppIdStr);
  const opp   = state.opportunities.find(o => o.id === oppId);
  if (!opp) return;

  if (eventType === 'demo') {
    if (opp.demoDay === state.dayNumber && opp.stage === STAGES.DEMO_SCHEDULED) {
      launchSlidePicker(opp);
    } else {
      showEventDetails(opp, 'demo');
    }
  } else if (eventType === 'pricing') {
    if (opp.stage === STAGES.PROPOSAL) {
      launchProposalBuilder(opp);
    } else if (opp.pricingDay === state.dayNumber && opp.stage === STAGES.PRICING_SCHEDULED) {
      launchDealOrNoDeal(opp);
    } else {
      showEventDetails(opp, 'pricing');
    }
  }
}

function showEventDetails(opp, type) {
  const isDemo    = type === 'demo';
  const dayNum    = isDemo ? opp.demoDay : opp.pricingDay;
  const dateStr   = dayNum !== null ? formatDate(dayNumberToDate(dayNum)) : '—';
  const today     = formatDate(dayNumberToDate(state.dayNumber));
  const isFuture  = dayNum > state.dayNumber;
  const showVal   = opp.demoHostedDay !== null;

  showModal(
    `${isDemo ? 'Demo' : 'Pricing'} — ${opp.company}`,
    `<div style="font-size:13px;color:var(--text2);line-height:1.7">
      <div><strong>${opp.name}</strong> · ${opp.company}</div>
      <div>${isDemo ? 'Demo' : 'Pricing meeting'}: <strong>${dateStr}</strong></div>
      ${isFuture ? `<div style="color:#EF9F27;font-size:12px;margin-top:6px">Scheduled for a future day. Come back on ${dateStr}.</div>` : ''}
      ${showVal ? `<div style="margin-top:8px">Value: $${opp.value.toLocaleString()} · Probability: ${opp.prob}%</div>` : `<div style="margin-top:8px;font-style:italic;color:var(--text3)">${opp.flavourNote || ''}</div>`}
    </div>`,
    [{ label: 'Close', onclick: 'window.closeModal()' }]
  );
}

// ─── Phone handler ────────────────────────────────────────────────────────────

window._setPhoneTab = function(tab) {
  _phoneTab = tab;
  renderPhone(state, handleCallClick, handleContactClick, _phoneTab);
};

function handleCallClick(oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp) return;
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">You\'ve used all your actions for today. Advance to the next day to continue.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }
  launchDialogueMatcher(opp);
}

function handleContactClick(oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp) return;

  if (opp.stage === STAGES.LIVE_CALL || opp.stage === STAGES.FUTURE) {
    handleCallClick(oppId);
    return;
  }

  const bdrTier = getActiveBDR(state).tier;
  const notes   = opp.bdrNotes || {};

  let demoLine = '';
  if (opp.demoDay !== null) {
    demoLine = `<div style="font-size:11px;font-family:Arial,sans-serif;color:#000080;margin-bottom:8px;padding:3px 6px;border:1px solid #000080;display:inline-block">
      See you on ${formatDate(dayNumberToDate(opp.demoDay))}
    </div>`;
  } else {
    demoLine = `<div style="font-size:11px;font-family:Arial,sans-serif;color:#808080;margin-bottom:8px">No demo scheduled yet</div>`;
  }

  let notesHtml = `<div style="background:#ffffff;border:2px solid;border-color:#808080 #ffffff #ffffff #808080;padding:8px;margin-bottom:10px">
    <div style="font-size:9px;font-family:Arial,sans-serif;font-weight:bold;color:#000080;letter-spacing:.05em;margin-bottom:4px">BUYER NOTES</div>
    <div style="font-size:11px;font-family:Arial,sans-serif;color:#404040;line-height:1.6;margin-bottom:4px">${opp.flavourNote || '—'}</div>`;
  if (bdrTier >= 1) {
    notesHtml += `<div style="font-size:10px;font-family:Arial,sans-serif;color:#808080;font-style:italic">Basic qualification complete.</div>`;
  }
  if (bdrTier >= 2 && notes.budget) {
    notesHtml += `<div style="margin-top:6px;font-size:10px;font-family:'Courier New',monospace;color:#000000;line-height:1.7">
      ${notes.budget}<br>${notes.timeline}<br>Key contact: ${notes.stakeholder}
    </div>`;
  }
  if (bdrTier >= 4 && notes.competitive) {
    notesHtml += `<div style="font-size:10px;font-family:'Courier New',monospace;color:#000000">Competitive: ${notes.competitive}</div>`;
  }
  notesHtml += `</div>`;

  const canTouch = state.actionsRemaining > 0;
  const buttons  = [
    canTouch
      ? { label: 'Touch base (1 action)', primary: true, onclick: `window._contactTouchBase(${opp.id})` }
      : { label: 'No actions left', onclick: 'window.closeModal()' },
    { label: 'Close', onclick: 'window.closeModal()' },
  ];

  showModal(
    `${opp.name} — ${opp.company}`,
    `${demoLine}${notesHtml}`,
    buttons
  );

  window._contactTouchBase = (id) => {
    const result = actionTouchBase(state, id);
    if (result.success) {
      result.apply(state);
      closeModal();
      renderAll();
      setTimeout(() => showToast(result.message), 200);
    } else {
      alert(result.message);
    }
  };
}

// ─── Kanban click handler ─────────────────────────────────────────────────────

function handleKanbanClick(oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp) return;

  if (opp.stage === STAGES.PRE_DEMO) {
    showScheduleDemoModal(opp);
  } else if (opp.stage === STAGES.DEMO_SCHEDULED) {
    if (opp.demoDay === state.dayNumber) {
      launchSlidePicker(opp);
    } else {
      showEventDetails(opp, 'demo');
    }
  } else if (opp.stage === STAGES.DEMO_HOSTED) {
    showSchedulePricingModal(opp);
  } else if (opp.stage === STAGES.PROPOSAL) {
    launchProposalBuilder(opp);
  } else if (opp.stage === STAGES.PRICING_SCHEDULED) {
    if (opp.pricingDay === state.dayNumber) {
      launchDealOrNoDeal(opp);
    } else {
      showEventDetails(opp, 'pricing');
    }
  } else if (opp.stage === STAGES.LIVE_CALL || opp.stage === STAGES.FUTURE) {
    handleCallClick(opp.id);
  }
}

// ─── Schedule demo modal ──────────────────────────────────────────────────────

function showScheduleDemoModal(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">You\'ve used all your actions today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }
  const options = [1,2,3,4,5].map(d => {
    const date = dayNumberToDate(state.dayNumber + d);
    return `<label style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:0.5px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:6px;min-height:44px">
      <input type="radio" name="demo-day" value="${d}" style="flex-shrink:0">
      <span style="font-size:13px">${formatDate(date)}</span>
    </label>`;
  }).join('');

  showModal(
    `Schedule demo — ${opp.company}`,
    `<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6">${opp.flavourNote || opp.company}</div>
     <div style="font-size:12px;font-weight:500;margin-bottom:8px">Choose a day (next 5 business days):</div>
     ${options}`,
    [
      { label: 'Schedule', primary: true, onclick: `window._confirmScheduleDemo(${opp.id})` },
      { label: 'Cancel', onclick: 'window.closeModal()' },
    ]
  );

  window._confirmScheduleDemo = (oppId) => {
    const sel = document.querySelector('input[name="demo-day"]:checked');
    if (!sel) { alert('Please choose a day.'); return; }
    const result = actionScheduleDemo(state, oppId, parseInt(sel.value));
    if (result.success) { result.apply(state); closeModal(); renderAll(); }
    else alert(result.message);
  };
}

// ─── Schedule pricing modal ───────────────────────────────────────────────────

function showSchedulePricingModal(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">You\'ve used all your actions today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }
  const options = [1,2,3,4,5].map(d => {
    const date = dayNumberToDate(state.dayNumber + d);
    return `<label style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:0.5px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:6px;min-height:44px">
      <input type="radio" name="pricing-day" value="${d}" style="flex-shrink:0">
      <span style="font-size:13px">${formatDate(date)}</span>
    </label>`;
  }).join('');

  showModal(
    `Schedule pricing — ${opp.company}`,
    `<div style="font-size:13px;color:var(--text2);margin-bottom:10px">
       $${opp.value.toLocaleString()} · ${opp.prob}% · ${opp.name}
     </div>
     <div style="color:#E24B4A;font-size:12px;margin-bottom:12px">Remember: you must build the proposal before the meeting date.</div>
     <div style="font-size:12px;font-weight:500;margin-bottom:8px">Choose a day:</div>
     ${options}`,
    [
      { label: 'Schedule', primary: true, onclick: `window._confirmSchedulePricing(${opp.id})` },
      { label: 'Cancel', onclick: 'window.closeModal()' },
    ]
  );

  window._confirmSchedulePricing = (oppId) => {
    const sel = document.querySelector('input[name="pricing-day"]:checked');
    if (!sel) { alert('Please choose a day.'); return; }
    const result = actionSchedulePricing(state, oppId, parseInt(sel.value));
    if (result.success) { result.apply(state); closeModal(); renderAll(); }
    else alert(result.message);
  };
}

// ─── Proposal builder mini-modal ──────────────────────────────────────────────

function launchProposalBuilder(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }

  const daysLeft = opp.pricingDay - state.dayNumber;
  const sections = [
    { id: 'exec',     label: '📋 Executive Summary',     hint: 'High-level overview for decision-makers',  pts: 2 },
    { id: 'roi',      label: '📊 ROI Analysis',           hint: 'Quantified business case',                  pts: 3 },
    { id: 'impl',     label: '🔧 Implementation Plan',    hint: 'Rollout timeline and resource requirements', pts: 2 },
    { id: 'cases',    label: '💬 Customer References',    hint: 'Comparable customer case studies',           pts: 2 },
    { id: 'pricing',  label: '💰 Pricing & Terms',        hint: 'Commercial options and contract terms',      pts: 3 },
    { id: 'security', label: '🔒 Security & Compliance',  hint: 'Certifications and data handling',           pts: 1 },
  ];

  showModal(
    `Build proposal — ${opp.company}`,
    `<div style="font-size:13px;color:var(--text2);margin-bottom:4px">${opp.name} · Pricing meeting: ${formatDate(dayNumberToDate(opp.pricingDay))}</div>
     <div style="font-size:12px;color:${daysLeft <= 1 ? '#E24B4A' : '#EF9F27'};margin-bottom:14px">
       ${daysLeft <= 0 ? 'OVERDUE' : daysLeft === 1 ? '⚠ Due tomorrow' : `${daysLeft} days until meeting`}
     </div>
     <div style="font-size:12px;font-weight:500;margin-bottom:10px">Select sections to include (more = better quality):</div>
     ${sections.map(s => `
       <label style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border:0.5px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:6px;min-height:44px">
         <input type="checkbox" name="proposal-section" value="${s.pts}" id="ps-${s.id}" style="flex-shrink:0;margin-top:2px">
         <div>
           <div style="font-size:13px;font-weight:500">${s.label}</div>
           <div style="font-size:11px;color:var(--text2)">${s.hint}</div>
         </div>
       </label>`).join('')}`,
    [
      { label: 'Submit proposal', primary: true, onclick: `window._submitProposal(${opp.id})` },
      { label: 'Cancel', onclick: 'window.closeModal()' },
    ]
  );

  window._submitProposal = (oppId) => {
    const checked = document.querySelectorAll('input[name="proposal-section"]:checked');
    const totalPts = Array.from(checked).reduce((s, c) => s + parseInt(c.value), 0);
    const maxPts   = sections.reduce((s, sec) => s + sec.pts, 0);
    const score    = Math.round((totalPts / maxPts) * 100);
    const result   = actionBuildProposal(state, oppId, score);
    if (result.success) { result.apply(state); closeModal(); renderAll(); }
    else alert(result.message);
  };
}

// ─── Mini-game 1: Slide Picker ────────────────────────────────────────────────

function launchSlidePicker(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p>No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }

  const profile   = BUYER_PROFILES[opp.buyerProfile] || BUYER_PROFILES.operations;
  const selected  = [];
  const MAX_PICKS = 5;

  function renderGame() {
    showModal(
      `Demo — ${opp.company}`,
      `<div class="slide-picker-wrap">
        <div class="buyer-brief">
          <div class="buyer-brief-role">${profile.label}</div>
          <div class="buyer-brief-desc">${profile.description}</div>
          <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
            <div class="buyer-brief-col">
              <div class="buyer-brief-label">Pain points</div>
              ${profile.painPoints.map(p => `<div class="buyer-brief-item">• ${p}</div>`).join('')}
              <div class="buyer-brief-label" style="margin-top:8px">Priorities</div>
              ${profile.priorities.map(p => `<div class="buyer-brief-item">• ${p}</div>`).join('')}
            </div>
            <div class="buyer-brief-col">
              <div class="buyer-brief-label">Less important</div>
              ${profile.dontCare.map(d => `<div class="buyer-brief-item" style="color:var(--text3)">• ${d}</div>`).join('')}
            </div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin:14px 0 8px">
          Pick <strong>5 slides</strong> for your deck — choose based on what this buyer cares about.
          <span style="float:right;font-weight:600">${selected.length}/5 selected</span>
        </div>
        <div class="slide-grid">
          ${SLIDES.map((s, i) => {
            const idx     = selected.indexOf(i);
            const isPicked = idx !== -1;
            const numBadge = isPicked ? `<div class="slide-badge">${idx + 1}</div>` : '';
            return `<div
              class="slide-card${isPicked ? ' picked' : ''}"
              onclick="window._slidePickerToggle(${i})"
            >
              ${numBadge}
              <div class="slide-icon">${s.icon}</div>
              <div class="slide-title">${s.title}</div>
              <div class="slide-desc">${s.desc}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`,
      selected.length === MAX_PICKS
        ? [{ label: 'Present slides', primary: true, onclick: `window._slidePickerSubmit(${opp.id})` }]
        : [],
      true // mini = large modal
    );
  }

  window._slidePickerToggle = (idx) => {
    const pos = selected.indexOf(idx);
    if (pos !== -1) {
      selected.splice(pos, 1);
    } else if (selected.length < MAX_PICKS) {
      selected.push(idx);
    }
    renderGame();
  };

  window._slidePickerSubmit = (oppId) => {
    const scores  = selected.map(i => {
      const p = BUYER_PROFILES[opp.buyerProfile] || BUYER_PROFILES.operations;
      if (p.high.includes(i)) return { i, pts: 18 + Math.floor(Math.random() * 3), tier: 'high' };
      if (p.low.includes(i))  return { i, pts: Math.floor(Math.random() * 4),      tier: 'low'  };
      return                          { i, pts: 12 + Math.floor(Math.random() * 5), tier: 'neutral' };
    });
    const total = scores.reduce((s, r) => s + r.pts, 0);
    const maxPossible = 5 * 20;
    const score = Math.round((total / maxPossible) * 100);
    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
    showSlideResults(opp, scores, score, grade);
  };

  renderGame();
}

function showSlideResults(opp, scores, score, grade) {
  const gradeColor  = grade === 'A' ? '#1D9E75' : grade === 'B' ? '#378ADD' : grade === 'C' ? '#EF9F27' : '#E24B4A';
  const gradeAdj    = grade === 'A' ? '+15%' : grade === 'B' ? '+8%' : grade === 'C' ? '0%' : '-8%';
  const reactionPick = (tier) => {
    const arr = SLIDE_REACTIONS[tier];
    return arr[Math.floor(Math.random() * arr.length)];
  };

  let revealedCount = 0;
  const rows = scores.map((r, j) => {
    const slide      = SLIDES[r.i];
    const barColor   = r.tier === 'high' ? '#1D9E75' : r.tier === 'low' ? '#E24B4A' : '#378ADD';
    const barWidth   = Math.round((r.pts / 20) * 100);
    const reaction   = reactionPick(r.tier);
    return `<div class="slide-result-row" id="slide-res-${j}" style="opacity:0;transition:opacity .3s">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:14px">${slide.icon}</span>
        <span style="font-size:12px;font-weight:500;flex:1">${slide.title}</span>
        <span style="font-size:11px;color:var(--text2)">${r.pts}/20</span>
      </div>
      <div style="font-size:11px;color:var(--text3);font-style:italic;margin-bottom:5px">"${reaction}"</div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${barWidth}%;background:${barColor};border-radius:3px;transition:width .5s"></div>
      </div>
    </div>`;
  }).join('');

  showModal(
    `Demo results — ${opp.company}`,
    `<div>${rows}</div>
     <div id="slide-final-grade" style="display:none;text-align:center;margin-top:20px;padding:16px;background:var(--bg2);border-radius:8px">
       <div style="font-size:36px;font-weight:700;color:${gradeColor}">${grade}</div>
       <div style="font-size:13px;color:var(--text2);margin-top:4px">Score: ${score}/100 · Probability adjusted: ${gradeAdj}</div>
     </div>`,
    [{ label: 'Continue', primary: true, onclick: `window._slidePickerComplete(${opp.id}, ${score})` }],
    true
  );

  // Reveal rows one by one
  scores.forEach((_, j) => {
    setTimeout(() => {
      const row = document.getElementById(`slide-res-${j}`);
      if (row) row.style.opacity = '1';
      if (j === scores.length - 1) {
        setTimeout(() => {
          const g = document.getElementById('slide-final-grade');
          if (g) g.style.display = 'block';
        }, 400);
      }
    }, j * 450);
  });

  window._slidePickerComplete = (oppId, score) => {
    const result = actionHostDemo(state, oppId, score);
    if (result.success) {
      result.apply(state);
      closeModal();
      renderAll();
      const o = state.opportunities.find(x => x.id === oppId);
      if (o) setTimeout(() => showSchedulePricingModal(o), 350);
    } else {
      alert(result.message);
    }
  };
}

// ─── Mini-game 2: Deal or No Deal ─────────────────────────────────────────────

const MULTIPLIERS = [0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1];

function launchDealOrNoDeal(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p>No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }

  // Shuffle multipliers into cases
  const shuffled = [...MULTIPLIERS].sort(() => Math.random() - 0.5);
  const cases    = shuffled.map((m, i) => ({ num: i + 1, multiplier: m, open: false }));

  let keptCase   = null;  // index into cases
  let opened     = [];    // indices of opened cases
  let phase      = 'pick'; // 'pick' | 'open' | 'banker' | 'done'
  let bankerOffer = null;
  const baseValue = opp.value;
  const ROUNDS    = [3, 3, 3]; // open 3, offer, open 3, offer, open 3, final

  function remainingMultipliers() {
    return cases
      .filter((c, i) => i !== keptCase && !c.open)
      .map(c => c.multiplier);
  }

  function calcBankerOffer() {
    const rem = remainingMultipliers();
    if (rem.length === 0) return 0;
    return Math.round(baseValue * (rem.reduce((s, m) => s + m, 0) / rem.length));
  }

  function openedThisRound() {
    const totalOpened = opened.length;
    const roundIdx    = Math.floor(totalOpened / 3);
    const inRound     = totalOpened % 3;
    return inRound;
  }

  function renderGame() {
    const allOpen = cases.filter((_, i) => i !== keptCase && !cases[i].open);
    const totalOpenable = cases.length - (keptCase !== null ? 1 : 0);
    const openedCount   = opened.length;

    let instruction = '';
    if (phase === 'pick')   instruction = '<strong>Pick a case</strong> — this will be your deal.';
    else if (phase === 'open')  instruction = `<strong>Open a case</strong> to eliminate it. (${3 - (openedCount % 3)} more before banker calls)`;
    else if (phase === 'banker') instruction = `<strong>Banker offer: $${bankerOffer.toLocaleString()}</strong> — accept or keep opening?`;
    else if (phase === 'done')  instruction = 'Reveal complete.';

    showModal(
      `Pricing meeting — ${opp.company}`,
      `<div class="dond-wrap">
        <div class="dond-info">
          <div style="font-size:13px;color:var(--text2)">Your deal value won't be revealed until the end. Open cases to gather information.</div>
          ${keptCase !== null ? `<div style="margin-top:8px;font-size:13px">Your case: <strong>#${cases[keptCase].num}</strong></div>` : ''}
        </div>
        <div style="margin:12px 0;font-size:13px;padding:10px 12px;background:var(--bg2);border-radius:8px">${instruction}</div>
        ${phase === 'banker' ? `
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <button class="btn btn-primary" onclick="window._dondAccept()">Accept $${bankerOffer.toLocaleString()}</button>
            <button class="btn" onclick="window._dondContinue()">Continue opening</button>
          </div>` : ''}
        <div class="dond-grid">
          ${cases.map((c, i) => {
            const isKept   = i === keptCase;
            const isOpen   = c.open;
            const canPick  = phase === 'pick' && !isOpen;
            const canOpen  = phase === 'open' && i !== keptCase && !isOpen;
            const bg = isKept ? '#E6F1FB' : isOpen ? 'var(--bg3)' : 'var(--bg2)';
            const border = isKept ? '1.5px solid #378ADD' : '0.5px solid var(--border)';
            const cursor = (canPick || canOpen) ? 'pointer' : 'default';
            const label = isOpen
              ? `<span style="font-size:12px;font-weight:600;color:${c.multiplier >= 1 ? '#1D9E75' : c.multiplier >= 0.8 ? '#378ADD' : '#E24B4A'}">${c.multiplier}x</span>`
              : isKept ? `<span style="font-size:11px;font-weight:600;color:#378ADD">YOUR<br>DEAL</span>`
              : `<span style="font-size:16px;font-weight:700;color:var(--text)">${c.num}</span>`;
            const onclick = canPick ? `window._dondPickCase(${i})` : canOpen ? `window._dondOpenCase(${i})` : '';
            return `<div
              class="dond-case"
              style="background:${bg};border:${border};border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:${cursor};text-align:center;padding:4px;min-height:44px"
              ${onclick ? `onclick="${onclick}"` : ''}
            >${label}</div>`;
          }).join('')}
        </div>
        <div class="dond-opened" style="margin-top:10px;font-size:11px;color:var(--text3)">
          ${opened.length > 0 ? 'Eliminated: ' + opened.map(i => `${cases[i].multiplier}x`).join(', ') : ''}
        </div>
      </div>`,
      [],
      true
    );
  }

  window._dondPickCase = (idx) => {
    keptCase = idx;
    phase    = 'open';
    renderGame();
  };

  window._dondOpenCase = (idx) => {
    cases[idx].open = true;
    opened.push(idx);
    const inRound = opened.length % 3;
    if (inRound === 0 && remainingMultipliers().length > 0) {
      // Time for banker offer
      phase       = 'banker';
      bankerOffer = calcBankerOffer();
    }
    renderGame();
  };

  window._dondAccept = () => {
    const finalValue = bankerOffer;
    const finalMult  = finalValue / baseValue;
    const score      = Math.round((finalMult / 1.1) * 100);
    _completeDealOrNoDeal(opp, finalValue, score, 'banker');
  };

  window._dondContinue = () => {
    phase = 'open';
    renderGame();
  };

  // If no more cases to open, auto-reveal
  function checkAutoReveal() {
    if (phase === 'open' && remainingMultipliers().length === 0) {
      const kept = cases[keptCase];
      _completeDealOrNoDeal(opp, Math.round(baseValue * kept.multiplier),
        Math.round((kept.multiplier / 1.1) * 100), 'kept');
    }
  }

  const origOpen  = window._dondOpenCase;
  window._dondOpenCase = (idx) => { origOpen(idx); checkAutoReveal(); };

  renderGame();
}

function _completeDealOrNoDeal(opp, finalValue, score, source) {
  const label = source === 'banker' ? 'Banker offer accepted' : 'Your case revealed';
  showModal(
    `Deal finalised — ${opp.company}`,
    `<div style="text-align:center;padding:24px 0">
      <div style="font-size:13px;color:var(--text2);margin-bottom:6px">${label}</div>
      <div style="font-size:42px;font-weight:700;color:#1D9E75;margin:12px 0">$${finalValue.toLocaleString()}</div>
      <div style="font-size:12px;color:var(--text2)">Original estimate: $${opp.value.toLocaleString()}</div>
    </div>`,
    [{ label: 'Continue', primary: true, onclick: `window._dondComplete(${opp.id}, ${finalValue}, ${score})` }],
    true
  );
  window._dondComplete = (oppId, fv, sc) => {
    const result = actionHostPricing(state, oppId, sc, fv);
    if (result.success) { result.apply(state); closeModal(); renderAll(); }
    else alert(result.message);
  };
}

// ─── Mini-game 3: Dialogue Matcher ───────────────────────────────────────────

function launchDialogueMatcher(opp) {
  const isLive = opp.stage === STAGES.LIVE_CALL;
  const pool   = isLive ? CLOSE_DIALOGUES : REBOOK_DIALOGUES;
  const seq    = pool[Math.floor(Math.random() * pool.length)];

  let roundIdx  = 0;
  let totalScore = 0;
  let lastResult = null; // 'correct' | 'wrong' | null

  function renderRound() {
    const round   = seq.rounds[roundIdx];
    const isLast  = roundIdx === seq.rounds.length - 1;

    showModal(
      `${isLive ? 'Close call' : 'Rebook call'} — ${opp.name}`,
      `<div class="dialogue-wrap">
        <div class="dialogue-buyer-header">
          <div class="dialogue-avatar">${opp.name[0]}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${opp.name}</div>
            <div style="font-size:11px;color:var(--text2)">${opp.company}</div>
          </div>
          <div style="margin-left:auto;font-size:13px;font-weight:600;color:#378ADD">Score: ${totalScore}</div>
        </div>

        ${roundIdx === 0 ? `<div class="dialogue-bubble opener">${seq.buyerOpener}</div>` : ''}

        <div class="dialogue-bubble buyer" style="margin-top:8px">${round.buyerStatement}</div>

        ${lastResult ? `<div class="dialogue-feedback ${lastResult}" style="margin:8px 0">
          ${lastResult === 'correct' ? '✓ Good match +25' : '✗ Wrong tone — 0 pts'}
        </div>` : ''}

        <div style="margin-top:14px;font-size:11px;color:var(--text2);margin-bottom:8px">Round ${roundIdx + 1} of ${seq.rounds.length} — choose your response:</div>
        <div class="dialogue-options">
          ${round.options.map((opt, i) => `
            <div class="dialogue-opt" onclick="window._dialogueChoose(${i})" style="min-height:44px">
              <div style="font-size:11px;color:var(--text3);margin-bottom:2px">${opt.style}</div>
              <div style="font-size:13px">${opt.text}</div>
            </div>`).join('')}
        </div>
      </div>`,
      [],
      true
    );

    window._dialogueChoose = (optIdx) => {
      const opt = round.options[optIdx];
      if (opt.correct) { totalScore += 25; lastResult = 'correct'; }
      else { lastResult = 'wrong'; }
      roundIdx++;
      if (roundIdx < seq.rounds.length) {
        renderRound();
      } else {
        showDialogueResult(opp, isLive, totalScore);
      }
    };
  }

  renderRound();
}

function showDialogueResult(opp, isLive, totalScore) {
  const pctAdj  = totalScore >= 80 ? '+15%' : totalScore >= 50 ? '+5%' : '-10%';
  const adjNum  = totalScore >= 80 ? 15 : totalScore >= 50 ? 5 : -10;
  const outcome = totalScore >= 80 ? 'Strong call — you matched their tone throughout.' :
                  totalScore >= 50 ? 'Decent call — a few miscues but you kept it together.' :
                  'Rough call — your tone missed the mark.';
  const color   = totalScore >= 80 ? '#1D9E75' : totalScore >= 50 ? '#378ADD' : '#E24B4A';

  showModal(
    `Call complete — ${opp.name}`,
    `<div style="text-align:center;padding:16px 0">
      <div style="font-size:42px;font-weight:700;color:${color}">${totalScore}</div>
      <div style="font-size:13px;color:var(--text2);margin:8px 0">${outcome}</div>
      <div style="font-size:12px;color:var(--text3)">Probability adjustment: <strong style="color:${color}">${pctAdj}</strong></div>
    </div>`,
    [{ label: 'Continue', primary: true, onclick: `window._dialogueComplete(${opp.id}, ${totalScore}, ${isLive})` }],
    true
  );

  window._dialogueComplete = (oppId, score, live) => {
    const result = live
      ? actionCloseCall(state, oppId, score)
      : actionRebookCall(state, oppId, score);
    if (result.success) {
      result.apply(state);
      closeModal();
      renderAll();
      if (result.outcome) {
        const msgs = { won: 'Deal won! 🎉', lost: 'Deal lost.', nad: 'No decision — moved to futures.' };
        setTimeout(() => showToast(msgs[result.outcome] || result.outcome), 300);
      } else if (result.rebooked !== undefined) {
        setTimeout(() => showToast(result.rebooked ? 'Rebooked! Schedule their demo.' : 'Not ready yet — try again later.'), 300);
      }
    } else {
      alert(result.message);
    }
  };
}

// ─── Toast notification ───────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
}

// ─── Day navigation ───────────────────────────────────────────────────────────

window.switchAvatar = function() {
  state.avatarIndex = state.avatarIndex === 0 ? 1 : 0;
  renderIdCard(state);
  saveState(state);
};

window.nextDay = function() {
  state = advanceDay(state);
  _currentEmailId = null;
  renderAll();
  if (state.pendingBDRReminder) {
    state.pendingBDRReminder = false;
    saveState(state);
    setTimeout(showBDRReminder, 150);
  }
};

window.prevDay = function() {
  showToast("You can't go back — advance with End Day →");
};

// ─── New game / load ──────────────────────────────────────────────────────────

window.newGame = function() {
  if (!confirm('Start a new game? This will erase your current save.')) return;
  clearState();
  initGame();
};

window.closeModal = closeModal;

function initGame() {
  const saved = loadState();
  if (saved) {
    state = saved;
    // Migrate old saves: ensure new fields exist
    if (state.monthRevenue === undefined) state.monthRevenue = 0;
    if (!state.quarterMonthHits) state.quarterMonthHits = [false, false, false];
    if (state.employeeId === undefined) state.employeeId = String(Math.floor(100000 + Math.random() * 900000));
    if (state.avatarIndex === undefined) state.avatarIndex = 0;
    if (state.activeBDR === undefined) state.activeBDR = null;
    if (!state.availableBDRs) state.availableBDRs = ['none'];
    if (!state.bdrUnlockLog) state.bdrUnlockLog = [];
    if (state.q1AboveQuota === undefined) state.q1AboveQuota = false;
    if (state.q2AboveQuota === undefined) state.q2AboveQuota = false;
    if (state.pendingBDRReminder === undefined) state.pendingBDRReminder = false;
    // Retroactively unlock BDRs for old saves
    if (state.dayNumber >= 5 && !state.availableBDRs.includes('basic'))    state.availableBDRs.push('basic');
    if (state.dayNumber >= 20 && !state.availableBDRs.includes('standard')) state.availableBDRs.push('standard');
    // Ensure all opps have bdrNotes
    state.opportunities.forEach(o => {
      if (!o.bdrNotes) o.bdrNotes = { budget: 'Unknown', timeline: 'Unknown', stakeholder: 'Unknown', competitive: 'Unknown' };
    });
  } else {
    state = createInitialState();
    // Seed with 3 starting opps at staggered deadlines
    for (let i = 0; i < 3; i++) {
      const opp = generateOpportunity(state);
      opp.scheduleBy = i + 1;
      state.opportunities.push(opp);
    }
    // Welcome email
    state.emails.push({
      id: nextEmailId(),
      from: 'Manager — Dave H.',
      subject: "Welcome to Q1 — here's your target",
      body: "Hey,\n\nWelcome to the new quarter. Your monthly quota is $80,000.\n\nYou have 3 new demo bookings waiting in your inbox. Schedule them today — you only have 1 day per booking before the opportunity is lost.\n\nUse the calendar, inbox, phone, and pipeline to manage your deals. Nobody will prompt you — you need to find and act on everything yourself.\n\nGood luck,\nDave",
      time: formatDate(state.date),
      type: 'manager',
      read: false,
      oppId: null,
      actionType: null,
    });
    // Add booking emails for the seeded opps
    state.opportunities.forEach(opp => {
      state.emails.push({
        id: nextEmailId(),
        from: opp.name + ' — ' + opp.company,
        subject: `New demo request — ${opp.company}`,
        body: `Hi,\n\n${opp.flavourNote}\n\nWe'd love to see a demo. Availability is flexible.\n\nBest,\n${opp.name}`,
        time: formatDate(state.date),
        type: 'task',
        read: false,
        oppId: opp.id,
        actionType: 'schedule-demo',
      });
    });
    saveState(state);
  }
  renderAll();
  if (!localStorage.getItem('hasSeenIntro')) {
    setTimeout(showOnboardingModal, 120);
  }
}

// ─── BDR Panel ────────────────────────────────────────────────────────────────

const BDR_AVATAR_COLORS = { none: '#808080', basic: '#808080', standard: '#008080', senior: '#000080', elite: '#5a0000' };
const BDR_TIER_LABELS   = ['', 'TIER 1', 'TIER 2', 'TIER 3', 'TIER 4'];

function bdrInitials(bdr) {
  if (bdr.id === 'none') return '—';
  return bdr.name.split(' ').map(w => w[0]).join('').substring(0, 2);
}

function renderBDRCard(bdr, isActive, isUnlocked) {
  const avColor  = BDR_AVATAR_COLORS[bdr.id] || '#808080';
  const tierLabel = bdr.tier > 0 ? BDR_TIER_LABELS[bdr.tier] : '';
  const costColor = bdr.closeRateModifier > 0 ? '#00aa00' : bdr.closeRateModifier < 0 ? '#ff0000' : '#000000';

  const benefitsList = bdr.benefits.map(b =>
    `<div style="font-size:10px;font-family:Arial,sans-serif;color:${isUnlocked ? '#000000' : '#808080'};padding:1px 0">&#9632; ${b}</div>`
  ).join('');

  const actionBtn = isActive
    ? `<span style="font-size:10px;font-family:Arial,sans-serif;padding:2px 8px;background:#000080;color:#ffffff;border:1px solid #000040">ACTIVE</span>`
    : isUnlocked
      ? `<button class="btn btn-sm" onclick="window._hireBDR('${bdr.id}')" style="font-size:10px">Hire</button>`
      : `<span style="font-size:10px;font-family:Arial,sans-serif;color:#808080;font-style:italic">${bdr.unlockCondition || ''}</span>`;

  return `<div style="border:2px solid;border-color:${isUnlocked ? '#ffffff #808080 #808080 #ffffff' : '#808080 #ffffff #ffffff #808080'};padding:8px;margin-bottom:6px;background:${isActive ? '#e0e0ff' : isUnlocked ? '#d4d0c8' : '#c0c0c0'};display:flex;gap:10px;align-items:flex-start">
    <div style="width:36px;height:36px;background:${avColor};color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #808080">${bdrInitials(bdr)}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;flex-wrap:wrap">
        <span style="font-size:12px;font-family:Arial,sans-serif;font-weight:bold;color:${isUnlocked ? '#000000' : '#808080'}">${bdr.name}</span>
        ${tierLabel ? `<span style="font-size:9px;font-family:Arial,sans-serif;font-weight:bold;padding:1px 5px;background:${avColor};color:#ffffff">${tierLabel}</span>` : ''}
        ${bdr.title ? `<span style="font-size:10px;font-family:Arial,sans-serif;color:#808080">— ${bdr.title}</span>` : ''}
      </div>
      <div style="font-size:10px;font-family:'Courier New',monospace;color:${costColor};margin-bottom:4px">${bdr.cost}</div>
      <div style="margin-bottom:6px">${benefitsList}</div>
      ${actionBtn}
    </div>
  </div>`;
}

window.openBDRPanel = function() {
  const activeBdr = getActiveBDR(state);
  const currentSection = `
    <div style="margin-bottom:10px">
      <div style="font-size:10px;font-family:Arial,sans-serif;font-weight:bold;background:#000080;color:#ffffff;padding:2px 6px;margin-bottom:4px">CURRENT ASSIGNMENT</div>
      ${renderBDRCard(activeBdr, true, true)}
      ${activeBdr.id !== 'none'
        ? `<button class="btn" onclick="window._fireBDR()" style="font-size:11px;margin-top:2px">Fire ${activeBdr.name.split(' ')[0]}</button>`
        : ''}
    </div>
    <div style="font-size:10px;font-family:Arial,sans-serif;font-weight:bold;background:#000080;color:#ffffff;padding:2px 6px;margin-bottom:6px">AVAILABLE BDRs</div>
    ${BDR_ROSTER.filter(b => b.id !== 'none').map(b => {
      const isAct  = b.id === state.activeBDR;
      const isUnlk = state.availableBDRs.includes(b.id);
      return renderBDRCard(b, isAct, isUnlk);
    }).join('')}`;

  showModal('BDR Management', currentSection, [], true);
};

window._hireBDR = function(bdrId) {
  const bdr = BDR_ROSTER.find(b => b.id === bdrId);
  if (!bdr || !state.availableBDRs.includes(bdrId)) return;
  const current = getActiveBDR(state);
  if (current.id !== 'none') {
    if (!confirm(`This will replace ${current.name}. Continue?`)) return;
  }
  state.activeBDR = bdrId;
  saveState(state);
  window.openBDRPanel();
  renderAll();
};

window._fireBDR = function() {
  const current = getActiveBDR(state);
  if (current.id === 'none') return;
  if (!confirm(`Are you sure you want to let ${current.name} go?`)) return;
  state.activeBDR = null;
  saveState(state);
  window.openBDRPanel();
  renderAll();
};

// ─── BDR Monday Reminder ──────────────────────────────────────────────────────

function getOppNextDeadline(o, today) {
  if (o.stage === STAGES.PRE_DEMO)          return o.scheduleBy;
  if (o.stage === STAGES.DEMO_SCHEDULED)    return o.demoDay;
  if (o.stage === STAGES.DEMO_HOSTED)       return o.pricingScheduleBy;
  if (o.stage === STAGES.PROPOSAL)          return o.pricingDay;
  if (o.stage === STAGES.PRICING_SCHEDULED) return o.pricingDay;
  if (o.stage === STAGES.LIVE_CALL)         return o.liveCallBy;
  if (o.stage === STAGES.FUTURE)            return o.futureExpiry;
  return null;
}

function showBDRReminder() {
  const bdr     = getActiveBDR(state);
  const today   = state.dayNumber;
  const active  = getActiveOpps(state);

  const expiring = active
    .map(o => ({ o, dl: getOppNextDeadline(o, today) }))
    .filter(({ dl }) => dl !== null && dl >= today && dl <= today + 5)
    .sort((a, b) => a.dl - b.dl);

  const unscheduled = active.filter(o => o.stage === STAGES.PRE_DEMO);
  const unbuilt     = active.filter(o => o.stage === STAGES.PROPOSAL);

  const makeRow = (label, items, urgentFn) => {
    if (items.length === 0) return '';
    const rows = items.map(item => {
      const o  = item.o || item;
      const dl = item.dl || getOppNextDeadline(o, today);
      const daysLeft = dl !== null ? dl - today : null;
      const tag = daysLeft !== null && daysLeft <= 1 ? ' <span style="color:#ff0000;font-weight:bold">[URGENT]</span>' : '';
      return `<div style="font-family:'Courier New',monospace;font-size:11px;padding:2px 4px;border-bottom:1px solid #c0c0c0">${o.company} — ${o.name}${tag}</div>`;
    }).join('');
    return `<div style="margin-bottom:8px">
      <div style="font-size:10px;font-family:Arial,sans-serif;font-weight:bold;color:#000080;margin-bottom:2px">${label}</div>
      <div style="border:2px solid;border-color:#808080 #ffffff #ffffff #808080;background:#ffffff">${rows}</div>
    </div>`;
  };

  const body = `<div style="font-size:11px;font-family:Arial,sans-serif;color:#404040;margin-bottom:10px">
    Good morning. Here's your weekly brief from <strong>${bdr.name}</strong>.
  </div>
  ${expiring.length > 0 ? makeRow('DEADLINES THIS WEEK', expiring) : '<div style="font-size:11px;font-family:Arial,sans-serif;color:#808080;margin-bottom:8px">No critical deadlines this week.</div>'}
  ${makeRow('UNSCHEDULED DEMOS', unscheduled)}
  ${makeRow('PROPOSALS NOT YET BUILT', unbuilt)}
  ${expiring.length === 0 && unscheduled.length === 0 && unbuilt.length === 0
    ? '<div style="font-size:11px;font-family:Arial,sans-serif;color:#00aa00">Pipeline looks clean. Keep it up.</div>' : ''}`;

  showModal(`${bdr.name}'s Monday Brief`, body,
    [{ label: 'Dismiss', onclick: 'window.closeModal()' }]);
}

// ─── Onboarding popup (first launch only) ────────────────────────────────────

function showOnboardingModal() {
  showModal(
    'Welcome to Widget Wonders',
    `<div style="margin:-12px -14px 14px -14px">
       <img src="opening.png" style="width:100%;display:block;border-bottom:2px solid #808080" alt="Widget Wonders">
     </div>
     <div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.75;color:#000000">
       The Senior Executive Sales Rep of Global Operations has retired after 40 years of service, and
       <strong>Widget Wonders</strong> — the leader in widget manufacturing — has hired you to fill their shoes.
       Widget Wonders has been the gold standard in widgets for over 40 years.
       <br><br>
       Your job: build your book of business from scratch. You'll book demos, host presentations,
       schedule pricing meetings, present proposals, and close deals — all while managing a growing
       pipeline and keeping your manager happy.
       <br><br>
       Hit your quota every month, build your team, and climb the ranks. The corner office awaits.
       <br><br>
       <strong>Good luck, Rep. You're going to need it.</strong>
     </div>`,
    [{ label: "Let's get to work", primary: true, onclick: 'window._dismissOnboarding()' }],
    true
  );
  window._dismissOnboarding = () => {
    localStorage.setItem('hasSeenIntro', '1');
    closeModal();
  };
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

initGame();
