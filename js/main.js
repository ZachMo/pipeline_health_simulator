/**
 * main.js — Sales Simulator entry point
 * Owns game state. Connects engine actions to UI events.
 */

import {
  createInitialState, advanceDay, saveState, loadState, clearState,
  generateOpportunity, STAGES, ACTIONS_PER_DAY,
  actionScheduleDemo, actionHostDemo, actionSchedulePricing,
  actionBuildProposal, actionHostPricing, actionCloseCall, actionRebookCall,
  actionTouchBase, actionBuyerWalkaway, actionSubmitForecast,
  getActiveOpps, formatDate, dayNumberToDate, nextEmailId,
  BDR_ROSTER, getActiveBDR, hasSkill, SKILL_TREE, BUYER_PERSONALITIES,
  getCurrentMonthRecord, TITLE_PROGRESSION,
  CLOSE_PERSONALITY_TYPES,
} from './engine.js';

import {
  renderHeader, renderCalendar, renderEmails, renderEmailBody,
  renderPhone, renderPipeline, renderStats, renderIdCard,
  showModal, closeModal,
} from './ui.js';

import { CLOSE_DIALOGUES, REBOOK_DIALOGUES } from './dialogues.js';
import { SLIDE_POOL, BUYER_PROFILES, scoreSlide } from './slides.js';

// ─── Call photo helpers ───────────────────────────────────────────────────────

const _FEMALE_FIRST_NAMES = new Set(['Sandra','Priya','Amy','Rachel','Diana','Elena','Fatima','Yuki','Claudia']);

function _nameHash(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return h;
}

const _MALE_PHOTOS   = ['male1.png','male2.png','male3.png','male5.png','male6.png','male7.png','male8.png'];
const _FEMALE_PHOTOS = ['female1.png','female2.png','female3.png','female4.png','female5.png'];

function _getCallPhoto(fullName) {
  const first = fullName.split(' ')[0];
  const h     = _nameHash(fullName);
  const pool  = _FEMALE_FIRST_NAMES.has(first) ? _FEMALE_PHOTOS : _MALE_PHOTOS;
  return pool[h % pool.length];
}

// ─── State ────────────────────────────────────────────────────────────────────

let state              = null;
let _phoneTab          = 'contacts';
let _expandedContactId = null;
let _pbTimerInterval   = null; // proposal builder timer handle

// ─── Full render ──────────────────────────────────────────────────────────────

function renderAll() {
  renderHeader(state);
  renderCalendar(state, handleCalendarEvent);
  renderEmails(state, handleEmailSelect);
  renderEmailBody(state, _currentEmailId, handleEmailAction);
  renderPhone(state, handleCallClick, handleContactCall, _phoneTab, _expandedContactId);
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
  } else if (actionType === 'schedule-pricing') {
    const opp = state.opportunities.find(o => o.id === oppId);
    if (opp) showSchedulePricingModal(opp);
  }
}

window._emailAction = function(actionType, oppId) {
  handleEmailAction(actionType, oppId);
};

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
  _phoneTab          = tab;
  _expandedContactId = null;
  renderPhone(state, handleCallClick, handleContactCall, _phoneTab, _expandedContactId);
};

window._onContactClick = function(oppId) {
  _expandedContactId = (_expandedContactId === oppId) ? null : oppId;
  renderPhone(state, handleCallClick, handleContactCall, _phoneTab, _expandedContactId);
};

function handleCallClick(oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp) return;
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">You\'ve used all your actions for today. Advance to the next day to continue.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }
  if (opp.stage === STAGES.LIVE_CALL) {
    showCloseCallChoiceModal(opp);
    return;
  }
  if (opp.stage === STAGES.FUTURE) {
    const daysSince = state.dayNumber - (opp.futureClosedDay || 0);
    if (daysSince < 10) {
      showModal(
        `Too early — ${opp.name}`,
        `<p style="font-size:13px;font-family:Arial,sans-serif;line-height:1.6">"Thank you for reaching out! We appreciated meeting with you and will consider reviewing your solution again in the future."</p>
         <p style="font-size:11px;color:#808080;font-family:Arial,sans-serif;margin-top:8px">Try again in ${10 - daysSince} day${10 - daysSince !== 1 ? 's' : ''}.</p>`,
        [{ label: 'OK', onclick: 'window.closeModal()' }],
        true
      );
      return;
    }
  }
  launchDialogueMatcher(opp);
}

function handleContactCall(oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp) return;
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }
  if (opp.stage === STAGES.LIVE_CALL) {
    showCloseCallChoiceModal(opp);
    return;
  }
  if (opp.stage === STAGES.FUTURE) {
    const daysSince = state.dayNumber - (opp.futureClosedDay || 0);
    if (daysSince < 10) {
      showModal(
        `Too early — ${opp.name}`,
        `<p style="font-size:13px;font-family:Arial,sans-serif;line-height:1.6">"Thank you for reaching out! We appreciated meeting with you and will consider reviewing your solution again in the future."</p>
         <p style="font-size:11px;color:#808080;font-family:Arial,sans-serif;margin-top:8px">Try again in ${10 - daysSince} day${10 - daysSince !== 1 ? 's' : ''}.</p>`,
        [{ label: 'OK', onclick: 'window.closeModal()' }],
        true
      );
      return;
    }
    launchDialogueMatcher(opp);
    return;
  }
  let msg;
  if (opp.stage === STAGES.PRE_DEMO || opp.stage === STAGES.DEMO_SCHEDULED) {
    const demoRef = opp.demoDay !== null
      ? `See you on ${formatDate(dayNumberToDate(opp.demoDay))}.`
      : 'No demo date confirmed yet.';
    const snippet = opp.flavourNote ? opp.flavourNote.split('.')[0] + '.' : 'They confirmed interest.';
    msg = `${opp.name} confirmed they're looking forward to the demo. They mentioned: "${snippet}" ${demoRef}`;
  } else {
    msg = `${opp.name} is aware of the upcoming pricing meeting. They asked that you come prepared with clear numbers.`;
  }
  const result = actionTouchBase(state, oppId);
  if (result.success) {
    result.apply(state);
    renderAll();
    showModal(`📞 Call — ${opp.name}`,
      `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#000000">${msg}</div>`,
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
  }
}

// Pipeline forecast submit
window._onForecastSubmit = function(emailId) {
  const activeOpps = state.opportunities.filter(o =>
    o.stage !== STAGES.WON && o.stage !== STAGES.LOST
  );
  const submissions = {};
  activeOpps.forEach(o => {
    const sel = document.getElementById(`fcst-${o.id}`);
    if (sel) submissions[o.id] = parseInt(sel.value);
  });
  const result = actionSubmitForecast(state, submissions);
  if (result.success) {
    result.apply(state);
    renderAll();
    if (_currentEmailId === emailId) renderEmailBody(state, emailId, handleEmailAction);
    showToast('Forecast submitted. Thanks, says Dave.');
  } else {
    showModal('No actions left', '<p style="font-size:13px">No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
  }
};

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

// ─── Proposal builder mini-game (maths challenge) ────────────────────────────

function _generateProblems(n) {
  return Array.from({ length: n }, (_, k) => {
    const level = k < 3 ? 'easy' : k < 7 ? 'medium' : 'hard';
    let a, b, answer, label, distOffsets;
    if (level === 'easy') {
      a = 15 + Math.floor(Math.random() * 35);
      b = 15 + Math.floor(Math.random() * 35);
      answer = a + b;
      label  = `${a} + ${b}`;
      distOffsets = [3, 5, 8, 10, 13, 16];
    } else if (level === 'medium') {
      a = 4 + Math.floor(Math.random() * 6);
      b = 12 + Math.floor(Math.random() * 15);
      answer = a * b;
      label  = `${a} × ${b}`;
      distOffsets = [a, b, a * 2, a + b, b * 2, a * 3];
    } else {
      a = 8 + Math.floor(Math.random() * 8);
      b = 8 + Math.floor(Math.random() * 8);
      answer = a * b;
      label  = `${a} × ${b}`;
      distOffsets = [a, b, a * 2, b * 2, a + b, a * 3];
    }
    const distractors = new Set();
    const shuffled = [...distOffsets].sort(() => Math.random() - 0.5);
    for (const off of shuffled) {
      if (distractors.size >= 3) break;
      const sign = Math.random() < 0.5 ? 1 : -1;
      const cand = answer + sign * off;
      if (cand > 0 && cand !== answer) distractors.add(cand);
    }
    let fb = 1;
    while (distractors.size < 3) { const c = answer + fb++; if (!distractors.has(c)) distractors.add(c); }
    const options = [answer, ...[...distractors]].sort(() => Math.random() - 0.5);
    return { label, answer, options };
  });
}

function launchProposalBuilder(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p style="font-size:13px">No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }

  const problems = _generateProblems(10);
  let qIdx     = 0;
  let pts      = 0;
  const timerSeconds = 10 + (hasSkill(state, 'proposalTimerExtend') ? 5 : 0);
  let timeLeft = timerSeconds;
  let answered = false;

  function renderQ() {
    if (_pbTimerInterval) { clearInterval(_pbTimerInterval); _pbTimerInterval = null; }
    const q = problems[qIdx];
    answered = false;
    timeLeft = timerSeconds;

    showModal(
      `Build proposal — ${opp.company}`,
      `<div style="font-family:Arial,sans-serif">
        <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Question ${qIdx + 1} of 10 &nbsp;·&nbsp; Score: ${Number.isInteger(pts) ? pts : pts.toFixed(1)} / ${qIdx}</div>
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:4px">
            <span>Time remaining</span><span id="pb-time-left">${timerSeconds}s</span>
          </div>
          <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">
            <div id="pb-timer-bar" style="height:100%;width:100%;background:#378ADD;border-radius:4px;transition:width .2s linear"></div>
          </div>
        </div>
        <div style="font-size:28px;font-weight:700;text-align:center;margin:20px 0;color:var(--text)">${q.label} = ?</div>
        <div id="pb-feedback" style="min-height:20px;text-align:center;font-size:12px;font-weight:bold;margin-bottom:10px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${q.options.map(opt => `
            <button class="btn" onclick="window._pbAnswer(${opt === q.answer}, ${q.answer}, this)"
              style="font-size:16px;font-weight:600;padding:14px 8px;min-height:52px">${opt}</button>`).join('')}
        </div>
      </div>`,
      [],
      true
    );

    _pbTimerInterval = setInterval(() => {
      timeLeft--;
      const bar    = document.getElementById('pb-timer-bar');
      const timeEl = document.getElementById('pb-time-left');
      if (bar)    { bar.style.width = `${(timeLeft / timerSeconds) * 100}%`; bar.style.background = timeLeft <= 3 ? '#E24B4A' : timeLeft <= 6 ? '#EF9F27' : '#378ADD'; }
      if (timeEl) timeEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(_pbTimerInterval); _pbTimerInterval = null;
        if (!answered) {
          answered = true;
          pts += 0.5;
          const fb = document.getElementById('pb-feedback');
          if (fb) { fb.style.color = '#EF9F27'; fb.textContent = `⏱ Time's up — half credit (answer: ${q.answer})`; }
          document.querySelectorAll('#modal-box button[onclick^="window._pbAnswer"]').forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });
          setTimeout(advanceQ, 1200);
        }
      }
    }, 1000);
  }

  window._pbAnswer = (isCorrect, correctAns, btnEl) => {
    if (answered) return;
    answered = true;
    clearInterval(_pbTimerInterval); _pbTimerInterval = null;
    document.querySelectorAll('#modal-box button[onclick^="window._pbAnswer"]').forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });
    const fb = document.getElementById('pb-feedback');
    if (isCorrect) {
      pts += 1;
      btnEl.style.cssText += ';background:#1D9E75;color:#fff;opacity:1';
      if (fb) { fb.style.color = '#1D9E75'; fb.textContent = '✓ Correct! +1 pt'; }
    } else {
      btnEl.style.cssText += ';background:#E24B4A;color:#fff;opacity:1';
      if (fb) { fb.style.color = '#E24B4A'; fb.textContent = `✗ Wrong — answer was ${correctAns}`; }
    }
    setTimeout(advanceQ, 900);
  };

  function advanceQ() {
    qIdx++;
    if (qIdx < problems.length) renderQ();
    else showProposalResult();
  }

  function showProposalResult() {
    clearInterval(_pbTimerInterval); _pbTimerInterval = null;
    const pct = Math.round((pts / 10) * 100);
    let mult, tierLabel, tierColor;
    if (pts >= 8)      { mult = 1.2;  tierLabel = 'Excellent'; tierColor = '#1D9E75'; }
    else if (pts >= 6) { mult = 1.0;  tierLabel = 'Good';      tierColor = '#378ADD'; }
    else if (pts >= 4) { mult = 0.85; tierLabel = 'Decent';    tierColor = '#EF9F27'; }
    else               { mult = 0.7;  tierLabel = 'Poor';      tierColor = '#E24B4A'; }
    const projValue = Math.round(opp.value * mult);

    showModal(
      `Proposal ready — ${opp.company}`,
      `<div style="text-align:center;padding:20px 0;font-family:Arial,sans-serif">
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Proposal quality</div>
        <div style="font-size:40px;font-weight:700;color:${tierColor};margin:4px 0">${tierLabel}</div>
        <div style="font-size:13px;color:var(--text2);margin:8px 0">Score: ${Number.isInteger(pts) ? pts : pts.toFixed(1)}/10 · Value multiplier: <strong style="color:${tierColor}">${mult}x</strong></div>
        <div style="font-size:18px;font-weight:600;color:var(--text);margin-top:16px">Projected deal: $${projValue.toLocaleString()}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Base: $${opp.value.toLocaleString()} × ${mult}</div>
      </div>`,
      [{ label: 'Submit Proposal', primary: true, onclick: `window._submitProposal(${opp.id}, ${pct}, ${mult})` }],
      true
    );

    window._submitProposal = (oppId, score, mult) => {
      const pctScore = score; // already 0-100
      const proposalScore = pctScore >= 90 ? 95 : pctScore >= 70 ? 80 : pctScore >= 50 ? 60 : 30;
      const result = actionBuildProposal(state, oppId, score, mult, proposalScore);
      if (result.success) { result.apply(state); closeModal(); renderAll(); }
      else alert(result.message);
    };
  }

  renderQ();
}

// ─── Mini-game 1: Slide Picker ────────────────────────────────────────────────

const PROFILE_BRIEFS = {
  cfo:         { label: 'CFO',              interests: 'ROI, cost reduction, speed to value, financial risk',   avoid: 'Technical architecture, roadmap, feature lists' },
  cto:         { label: 'CTO',              interests: 'Architecture, security, integrations, scalability',     avoid: 'Business cases, pricing comparisons, market slides' },
  operations:  { label: 'Operations Lead',  interests: 'Ease of use, support, fast implementation, automation', avoid: 'Technical specs, market comparisons' },
  procurement: { label: 'Procurement Lead', interests: 'Transparent pricing, trust, security, vendor risk',     avoid: 'Product roadmap, feature walkthroughs' },
  finance:     { label: 'Finance Lead',     interests: 'ROI, cost reduction, speed to value, financial risk',   avoid: 'Technical architecture, roadmap, feature lists' },
  technical:   { label: 'Technical Lead',   interests: 'Architecture, security, integrations, scalability',     avoid: 'Business cases, pricing comparisons, market slides' },
};

const TIER_REACTIONS = {
  high:    ["Directly relevant to us.", "This is exactly what we needed to hear.", "Strong pick for this audience.", "Hits our key concern.", "Good — this matters to us."],
  neutral: ["Interesting, but not our top priority.", "OK, useful context.", "Sure — not our main concern though.", "Moderately relevant."],
  low:     ["Doesn't apply to us.", "We don't care about this.", "Wrong audience.", "Missed the mark.", "Not relevant to our decision."],
  bad:     ["Checks phone mid-slide.", "Visibly loses interest. Starts looking at their watch.", "Interrupts to ask when you'll get to the pricing.", "Starts typing on their laptop.", "Politely asks if you can move on."],
};

function launchSlidePicker(opp) {
  if (state.actionsRemaining <= 0) {
    showModal('No actions left', '<p>No actions remaining today.</p>',
      [{ label: 'OK', onclick: 'window.closeModal()' }]);
    return;
  }

  const brief    = PROFILE_BRIEFS[opp.buyerProfile] || PROFILE_BRIEFS.operations;
  const pool12   = [...SLIDE_POOL].sort(() => Math.random() - 0.5).slice(0, 12);
  const selected = [];
  const MAX_PICKS = 5;

  // Mark hint slides for slidePicker2Hints skill
  let hintSlideIndices = new Set();
  if (hasSkill(state, 'slidePicker2Hints')) {
    const scored = pool12.map((s, i) => ({ i, raw: (s.tags || []).reduce((sum, tag) => sum + ((BUYER_PROFILES[opp.buyerProfile] || {})[tag] || 0), 0) }));
    scored.sort((a, b) => b.raw - a.raw);
    hintSlideIndices = new Set(scored.slice(0, 2).map(x => x.i));
  }

  function renderGame() {
    showModal(
      `Demo — ${opp.company}`,
      `<div class="slide-picker-wrap">
        <div class="buyer-brief">
          <div class="buyer-brief-role">${brief.label}</div>
          <div class="buyer-brief-desc" style="font-size:12px;color:var(--text2);margin-top:4px">${opp.flavourNote || opp.company}</div>
          <div style="margin-top:8px;font-size:11px">
            <div style="margin-bottom:4px"><strong style="color:#1D9E75">Cares about:</strong> ${brief.interests}</div>
            <div><strong style="color:#E24B4A">Less important:</strong> ${brief.avoid}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin:14px 0 8px">
          Pick <strong>5 slides</strong> for your deck — choose based on what this buyer cares about.
          <span style="float:right;font-weight:600">${selected.length}/5 selected</span>
        </div>
        <div class="slide-grid">
          ${pool12.map((s, i) => {
            const idx      = selected.indexOf(i);
            const isPicked = idx !== -1;
            const numBadge = isPicked ? `<div class="slide-badge">${idx + 1}</div>` : '';
            const starHint = hintSlideIndices.has(i) ? `<div style="position:absolute;top:2px;right:4px;font-size:10px;color:#EF9F27">★</div>` : '';
            return `<div class="slide-card${isPicked ? ' picked' : ''}" onclick="window._slidePickerToggle(${i})" style="position:relative">
              ${numBadge}
              ${starHint}
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
      true
    );
  }

  window._slidePickerToggle = (idx) => {
    const pos = selected.indexOf(idx);
    if (pos !== -1) selected.splice(pos, 1);
    else if (selected.length < MAX_PICKS) selected.push(idx);
    renderGame();
  };

  window._slidePickerSubmit = (oppId) => {
    const weeklyMods = state.weeklySlideModifiers || {};
    const scores     = selected.map(i => { const { pts, tier } = scoreSlide(pool12[i], opp.buyerProfile, weeklyMods); return { slide: pool12[i], pts, tier }; });
    const totalPoints = scores.reduce((s, r) => s + r.pts, 0);
    const score       = Math.max(0, Math.round(((totalPoints + 15) / (5 * 19 + 15)) * 100));
    showSlideResults(opp, scores, score);
  };

  renderGame();
}

function showSlideResults(opp, scores, score) {
  const totalPoints = scores.reduce((s, r) => s + r.pts, 0);
  const grade      = totalPoints >= 40 ? 'A' : totalPoints >= 25 ? 'B' : totalPoints >= 10 ? 'C' : 'D';
  const gradeColor = grade === 'A' ? '#1D9E75' : grade === 'B' ? '#378ADD' : grade === 'C' ? '#EF9F27' : '#E24B4A';
  const gradeAdj   = grade === 'A' ? '+15%' : grade === 'B' ? '+8%' : grade === 'C' ? '0%' : '-8%';

  const pickReaction = (tier) => { const arr = TIER_REACTIONS[tier] || TIER_REACTIONS.low; return arr[Math.floor(Math.random() * arr.length)]; };

  const rows = scores.map((r, j) => {
    const isBad = r.tier === 'bad';
    const barColor = isBad ? '#E24B4A' : r.tier === 'high' ? '#1D9E75' : r.tier === 'low' ? '#EF9F27' : '#378ADD';
    const barWidthPct = isBad ? 0 : Math.round((r.pts / 19) * 100);
    const badBar = isBad ? `<div style="height:100%;width:30%;background:#E24B4A;margin-left:auto;border-radius:3px;transition:width .5s"></div>` : '';
    const reactionColor = isBad ? '#E24B4A' : 'var(--text3)';
    const ptsLabel = isBad ? '-15' : `${r.pts}/19`;
    return `<div class="slide-result-row" id="slide-res-${j}" style="opacity:0;transition:opacity .3s">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:14px">${r.slide.icon}</span>
        <span style="font-size:12px;font-weight:500;flex:1">${r.slide.title}</span>
        <span style="font-size:11px;color:${reactionColor}">${ptsLabel}</span>
      </div>
      <div style="font-size:11px;color:${reactionColor};font-style:italic;margin-bottom:5px">"${pickReaction(r.tier)}"</div>
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;display:flex">
        ${isBad ? badBar : `<div style="height:100%;width:${barWidthPct}%;background:${barColor};border-radius:3px;transition:width .5s"></div>`}
      </div>
    </div>`;
  }).join('');

  // Summary sections for bad and good slides
  const badSlides  = scores.filter(r => r.tier === 'bad');
  const goodSlides = scores.filter(r => r.tier === 'high').slice(0, 2);
  let summaryHtml = '';
  if (badSlides.length > 0) {
    summaryHtml += `<div style="margin-top:14px;padding:10px;background:#fde8e8;border-radius:6px">
      <div style="font-size:11px;font-weight:bold;color:#E24B4A;margin-bottom:4px">SLIDES THAT HURT YOU:</div>
      ${badSlides.map(r => `<div style="font-size:11px;color:#E24B4A">• ${r.slide.title}</div>`).join('')}
    </div>`;
  }
  if (goodSlides.length > 0) {
    summaryHtml += `<div style="margin-top:8px;padding:10px;background:#e8f5e9;border-radius:6px">
      <div style="font-size:11px;font-weight:bold;color:#1D9E75;margin-bottom:4px">SLIDES THAT HELPED YOU:</div>
      ${goodSlides.map(r => `<div style="font-size:11px;color:#1D9E75">• ${r.slide.title}</div>`).join('')}
    </div>`;
  }

  showModal(
    `Demo results — ${opp.company}`,
    `<div>${rows}</div>
     <div id="slide-final-grade" style="display:none;text-align:center;margin-top:20px;padding:16px;background:var(--bg2);border-radius:8px">
       <div style="font-size:36px;font-weight:700;color:${gradeColor}">${grade}</div>
       <div style="font-size:13px;color:var(--text2);margin-top:4px">Score: ${score}/100 · Probability adjusted: ${gradeAdj}</div>
     </div>
     ${summaryHtml}`,
    [{ label: 'Continue', primary: true, onclick: `window._slidePickerComplete(${opp.id}, ${score})` }],
    true
  );

  scores.forEach((_, j) => {
    setTimeout(() => {
      const row = document.getElementById(`slide-res-${j}`);
      if (row) row.style.opacity = '1';
      if (j === scores.length - 1) setTimeout(() => { const g = document.getElementById('slide-final-grade'); if (g) g.style.display = 'block'; }, 400);
    }, j * 450);
  });

  window._slidePickerComplete = (oppId, score) => {
    const result = actionHostDemo(state, oppId, score);
    if (result.success) {
      result.apply(state);
      closeModal();
      renderAll();
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

  const baseValue = Math.round(opp.value * (opp.proposalMultiplier || 1.0));
  const shuffled  = [...MULTIPLIERS].sort(() => Math.random() - 0.5);
  const cases     = shuffled.map((m, i) => ({ num: i + 1, multiplier: m, open: false }));

  let keptCase    = null;
  let opened      = [];
  let phase       = 'pick';
  let bankerOffer = null;
  let confidence  = 65;
  const walkawayBonus = hasSkill(state, 'walkawayRiskReduction') ? 20 : 0;
  let walkedAway  = false;

  function remainingMultipliers() {
    return cases.filter((c, i) => i !== keptCase && !c.open).map(c => c.multiplier);
  }

  function calcBankerOffer() {
    const rem = remainingMultipliers();
    if (!rem.length) return 0;
    return Math.round(baseValue * (rem.reduce((s, m) => s + m, 0) / rem.length));
  }

  function renderGame() {
    const confColor = confidence >= 60 ? '#1D9E75' : confidence >= 35 ? '#EF9F27' : '#E24B4A';
    const confLabel = confidence >= 60 ? 'Interested' : confidence >= 35 ? 'Wavering' : 'Cold';
    let instruction = '';
    if (phase === 'pick')    instruction = '<strong>Pick a case</strong> — this will be your proposed deal.';
    else if (phase === 'open')   instruction = `<strong>Open a case</strong> to eliminate it. (${3 - (opened.length % 3)} more before banker calls)`;
    else if (phase === 'banker') instruction = `<strong>Banker offer: $${bankerOffer.toLocaleString()}</strong> — accept or keep opening?`;

    showModal(
      `Pricing meeting — ${opp.company}`,
      `<div class="dond-wrap">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text2);margin-bottom:3px">Buyer confidence</div>
            <div style="height:10px;background:var(--bg3);border-radius:5px;overflow:hidden">
              <div style="height:100%;width:${confidence}%;background:${confColor};border-radius:5px;transition:width .4s"></div>
            </div>
            <div style="font-size:10px;color:${confColor};font-weight:bold;margin-top:3px">${confLabel} (${confidence}%)</div>
          </div>
          ${keptCase !== null ? `<div style="font-size:12px;color:var(--text2)">Your case: <strong>#${cases[keptCase].num}</strong></div>` : ''}
        </div>
        <div style="margin:10px 0;font-size:13px;padding:10px 12px;background:var(--bg2);border-radius:8px">${instruction}</div>
        ${phase === 'banker' ? `
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <button class="btn btn-primary" onclick="window._dondAccept()">Accept $${bankerOffer.toLocaleString()}</button>
            <button class="btn" onclick="window._dondContinue()">Continue opening</button>
          </div>` : ''}
        <div class="dond-grid">
          ${cases.map((c, i) => {
            const isKept  = i === keptCase;
            const isOpen  = c.open;
            const canPick = phase === 'pick' && !isOpen;
            const canOpen = phase === 'open' && i !== keptCase && !isOpen;
            const bg      = isKept ? '#E6F1FB' : isOpen ? 'var(--bg3)' : 'var(--bg2)';
            const border  = isKept ? '1.5px solid #378ADD' : '0.5px solid var(--border)';
            const cursor  = (canPick || canOpen) ? 'pointer' : 'default';
            const label   = isOpen
              ? `<span style="font-size:12px;font-weight:600;color:${c.multiplier >= 1 ? '#1D9E75' : c.multiplier >= 0.8 ? '#378ADD' : '#E24B4A'}">${c.multiplier}x</span>`
              : isKept ? `<span style="font-size:11px;font-weight:600;color:#378ADD">YOUR<br>DEAL</span>`
              : `<span style="font-size:16px;font-weight:700;color:var(--text)">${c.num}</span>`;
            const onclick = canPick ? `window._dondPickCase(${i})` : canOpen ? `window._dondOpenCase(${i})` : '';
            return `<div class="dond-case" style="background:${bg};border:${border};border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:${cursor};text-align:center;padding:4px;min-height:44px" ${onclick ? `onclick="${onclick}"` : ''}>${label}</div>`;
          }).join('')}
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)">
          ${opened.length > 0 ? 'Eliminated: ' + opened.map(i => `${cases[i].multiplier}x`).join(', ') : ''}
        </div>
      </div>`,
      [],
      true
    );
  }

  function handleWalkaway() {
    const result = actionBuyerWalkaway(state, opp.id);
    if (result.success) result.apply(state);
    renderAll();
    showModal(
      `Deal lost — ${opp.company}`,
      `<div style="text-align:center;padding:24px 0;font-family:Arial,sans-serif">
        <div style="font-size:36px;margin-bottom:12px">📴</div>
        <div style="font-size:16px;font-weight:bold;color:#E24B4A;margin-bottom:10px">The buyer walked away.</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;max-width:280px;margin:0 auto">
          ${opp.name} ended the call. The deal no longer seemed worth pursuing at this price point.
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:14px">Buyer confidence had fallen to ${confidence}%</div>
      </div>`,
      [{ label: 'OK', onclick: 'window.closeModal()' }],
      true
    );
  }

  window._dondPickCase = (idx) => {
    keptCase = idx;
    phase    = 'open';
    renderGame();
  };

  window._dondOpenCase = (idx) => {
    if (walkedAway) return;
    cases[idx].open = true;
    opened.push(idx);
    // Update buyer confidence based on what was revealed
    const mult = cases[idx].multiplier;
    if (mult >= 1.0)      confidence = Math.max(10, confidence - 10);
    else if (mult >= 0.8) confidence = Math.max(10, confidence - 3);
    else if (mult < 0.65) confidence = Math.min(90, confidence + 8);
    else                  confidence = Math.min(90, confidence + 3);
    // Walkaway check (after 3+ opened, open phase only)
    if (opened.length >= 3 && phase === 'open') {
      const walkawayChance = Math.max(0, 65 - confidence - walkawayBonus);
      if (Math.random() * 100 < walkawayChance) {
        walkedAway = true;
        handleWalkaway();
        return;
      }
    }
    // Banker offer every 3 opened
    const inRound = opened.length % 3;
    if (inRound === 0 && remainingMultipliers().length > 0) {
      phase       = 'banker';
      bankerOffer = calcBankerOffer();
    }
    // Auto-reveal when no openable cases remain
    if (phase === 'open' && remainingMultipliers().length === 0) {
      const kept = cases[keptCase];
      _completeDealOrNoDeal(opp, Math.round(baseValue * kept.multiplier), baseValue,
        Math.round(Math.min(100, (kept.multiplier / 1.1) * 100)), 'kept');
      return;
    }
    renderGame();
  };

  window._dondAccept = () => {
    const score = Math.round(Math.min(100, (bankerOffer / (baseValue * 1.1)) * 100));
    _completeDealOrNoDeal(opp, bankerOffer, baseValue, score, 'banker');
  };

  window._dondContinue = () => {
    phase = 'open';
    renderGame();
  };

  renderGame();
}

function _completeDealOrNoDeal(opp, finalValue, baseValue, score, source) {
  const label        = source === 'banker' ? 'Banker offer accepted' : 'Your case revealed';
  const proposalMult = opp.proposalMultiplier || 1.0;
  showModal(
    `Deal finalised — ${opp.company}`,
    `<div style="text-align:center;padding:24px 0;font-family:Arial,sans-serif">
      <div style="font-size:13px;color:var(--text2);margin-bottom:6px">${label}</div>
      <div style="font-size:42px;font-weight:700;color:#1D9E75;margin:12px 0">$${finalValue.toLocaleString()}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Base estimate: $${opp.value.toLocaleString()}</div>
      <div style="font-size:11px;color:var(--text3)">Proposal multiplier: ${proposalMult}x · Adjusted base: $${baseValue.toLocaleString()}</div>
    </div>`,
    [{ label: 'Continue', primary: true, onclick: `window._dondComplete(${opp.id}, ${finalValue}, ${score})` }],
    true
  );
  window._dondComplete = (oppId, fv, sc) => {
    // Compute pricingScore from the multiplier/score
    // sc is score = Math.round(Math.min(100, (finalValue / (baseValue * 1.1)) * 100))
    // Approximate: if sc >= 91 → multiplier ≥ 1.0, etc.
    const finalMult = fv / (Math.round(opp.value * (opp.proposalMultiplier || 1.0)) || 1);
    const pricingScore = source === 'walkaway' ? 0
      : finalMult >= 1.0 ? 90
      : finalMult >= 0.85 ? 75
      : finalMult >= 0.70 ? 60
      : finalMult >= 0.55 ? 40
      : 20;
    const result = actionHostPricing(state, oppId, sc, fv, pricingScore);
    if (result.success) {
      result.apply(state);
      if (state.pendingWinBanner) {
        const banner = state.pendingWinBanner;
        state.pendingWinBanner = null;
        closeModal();
        renderAll();
        showWinBanner(banner.company, banner.value);
      } else {
        closeModal();
        renderAll();
      }
    } else alert(result.message);
  };
}

// ─── Close call choice modal ──────────────────────────────────────────────────

function showCloseCallChoiceModal(opp) {
  // Enforce 1-day gap after pricing meeting
  if (opp.pricingHostedDay === state.dayNumber) {
    showModal(
      `Too soon — ${opp.name}`,
      `<p style="font-size:13px;font-family:Arial,sans-serif;line-height:1.6">You just had the pricing meeting today. Give them at least one day to review before calling to close.</p>`,
      [{ label: 'OK', onclick: 'window.closeModal()' }],
      true
    );
    return;
  }

  const revealed = opp.closePersonalityRevealed;
  const cp       = CLOSE_PERSONALITY_TYPES[opp.closePersonalityType] || {};

  const personalityHtml = revealed
    ? `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff;background:#e8e8ff;margin-bottom:14px">
        <div style="font-size:28px;line-height:1">${cp.icon || '?'}</div>
        <div>
          <div style="font-size:12px;font-weight:bold;color:#000080;font-family:Arial,sans-serif">Communication style: ${cp.label || opp.closePersonalityType}</div>
          <div style="font-size:11px;color:#404040;font-family:Arial,sans-serif;margin-top:2px">${cp.hint || ''}</div>
        </div>
      </div>`
    : `<div style="padding:10px 12px;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff;background:#f0f0f0;margin-bottom:14px;font-family:Arial,sans-serif">
        <div style="font-size:12px;font-weight:bold;color:#808080">Communication style: Unknown</div>
        <div style="font-size:11px;color:#808080;margin-top:2px">Call the buyer before reaching close stage to reveal their communication style.</div>
      </div>`;

  const callPhoto = _getCallPhoto(opp.name);
  showModal(
    `Close — ${opp.name}`,
    `<div style="font-family:Arial,sans-serif">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <img src="${callPhoto}" style="width:48px;height:48px;object-fit:cover;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff;flex-shrink:0" alt="${opp.name}" onerror="this.style.display='none'">
        <div>
          <div style="font-size:13px;font-weight:bold;color:#000000">${opp.name}</div>
          <div style="font-size:11px;color:#808080">${opp.company}</div>
        </div>
      </div>
      ${personalityHtml}
      <p style="font-size:12px;color:#404040;margin:0">Match your responses to the buyer's communication style to score higher on the call.</p>
    </div>`,
    [
      { label: 'Start close call', primary: true, onclick: `window._startCloseCall(${opp.id})` },
      { label: 'Cancel', onclick: 'window.closeModal()' },
    ],
    true
  );

  window._startCloseCall = function(oppId) {
    const o = state.opportunities.find(x => x.id === oppId);
    if (o) launchDialogueMatcher(o);
  };
}

// ─── Mini-game 3: Dialogue Matcher ───────────────────────────────────────────

function launchDialogueMatcher(opp) {
  const isLive = opp.stage === STAGES.LIVE_CALL;
  const pool   = isLive ? CLOSE_DIALOGUES : REBOOK_DIALOGUES;
  let seq      = pool[Math.floor(Math.random() * pool.length)];

  // Shuffle options per round so correct answer position varies
  seq = JSON.parse(JSON.stringify(seq)); // deep copy to avoid mutating the imported constant
  seq.rounds.forEach(round => {
    round.options = round.options.sort(() => Math.random() - 0.5);
  });

  const cpKey      = opp.closePersonalityType;
  const cpRevealed = opp.closePersonalityRevealed;
  const cpInfo     = CLOSE_PERSONALITY_TYPES[cpKey] || {};

  let roundIdx   = 0;
  let totalScore = 0;

  // Personality badge shown above buyer avatar when style is known
  const personalityBadge = cpRevealed
    ? `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border:1px solid #808080;background:#e8e8ff;font-size:10px;font-family:Arial,sans-serif;margin-bottom:6px">
        ${cpInfo.icon || ''} ${cpInfo.label || cpKey}
      </div>`
    : '';

  function renderRound() {
    // Auto-correct first round (confident_opener skill)
    if (roundIdx === 0 && hasSkill(state, 'autoCorrectRound1')) {
      totalScore += 25;
      roundIdx++;
      if (roundIdx < seq.rounds.length) { renderRound(); return; }
      else { showDialogueResult(opp, isLive, totalScore); return; }
    }

    const round = seq.rounds[roundIdx];

    const dialoguePhoto = _getCallPhoto(opp.name);
    showModal(
      `${isLive ? 'Close call' : 'Rebook call'} — ${opp.name}`,
      `<div class="dialogue-wrap">
        ${personalityBadge}
        <div class="dialogue-buyer-header">
          <img src="${dialoguePhoto}" style="width:30px;height:30px;object-fit:cover;flex-shrink:0;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff" alt="${opp.name}" onerror="this.outerHTML='<div class=\\'dialogue-avatar\\'>${opp.name[0]}</div>'">
          <div>
            <div style="font-size:13px;font-weight:600">${opp.name}</div>
            <div style="font-size:11px;color:var(--text2)">${opp.company}</div>
          </div>
          <div style="margin-left:auto;font-size:13px;font-weight:600;color:#378ADD">Score: ${totalScore}</div>
        </div>
        <div class="dialogue-bubble buyer" style="margin-top:8px">${round.buyerStatement}</div>
        <div style="margin-top:14px;font-size:11px;color:var(--text2);margin-bottom:8px">Round ${roundIdx + 1} of ${seq.rounds.length} — choose your response:</div>
        <div class="dialogue-options">
          ${round.options.map((opt, i) => `
            <div class="dialogue-opt" onclick="window._dialogueChoose(${i})" style="min-height:44px">
              <div style="font-size:13px">${opt.text}</div>
            </div>`).join('')}
        </div>
      </div>`,
      [],
      true
    );

    window._dialogueChoose = (optIdx) => {
      window._dialogueChoose = () => {}; // prevent double-tap
      const opt    = round.options[optIdx];
      const isMatch = opt.personality === cpKey;
      if (isMatch) totalScore += 25;

      // Highlight chosen option, fade others; always reveal correct/wrong
      document.querySelectorAll('.dialogue-opt').forEach((el, i) => {
        el.onclick = null;
        const thisOpt = round.options[i];
        const thisMatch = thisOpt.personality === cpKey;
        if (i === optIdx) {
          el.style.opacity   = '1';
          el.style.background = isMatch ? '#e8f5e9' : '#fde8e8';
        } else {
          el.style.opacity = thisMatch ? '0.7' : '0.35';
        }
      });

      // Append "..." typing indicator
      const wrap = document.querySelector('.dialogue-wrap');
      const typing = document.createElement('div');
      typing.className  = 'dialogue-bubble buyer';
      typing.style.cssText = 'margin-top:10px;font-style:italic;color:var(--text3)';
      typing.textContent = '...';
      if (wrap) wrap.appendChild(typing);

      // 500ms later: replace with reaction text
      setTimeout(() => {
        typing.style.color     = 'var(--text2)';
        typing.textContent     = `"${opt.reaction}"`;
        // 900ms later: advance to next round
        setTimeout(() => {
          roundIdx++;
          if (roundIdx < seq.rounds.length) renderRound();
          else showDialogueResult(opp, isLive, totalScore);
        }, 900);
      }, 500);
    };
  }

  renderRound();
}

function showDialogueResult(opp, isLive, totalScore) {
  let pctAdj, outcome, color;
  if (totalScore >= 100)     { pctAdj = '+15%'; outcome = 'Exceptional — matched every cue.';          color = '#1D9E75'; }
  else if (totalScore >= 75) { pctAdj = '+8%';  outcome = 'Strong call — you read the room well.';     color = '#1D9E75'; }
  else if (totalScore >= 50) { pctAdj = '+3%';  outcome = 'Decent call — a few misses.';               color = '#378ADD'; }
  else if (totalScore >= 25) { pctAdj = '-5%';  outcome = 'Rough call — tone missed the mark.';        color = '#EF9F27'; }
  else                       { pctAdj = '-15%'; outcome = "Poor call — the buyer wasn't impressed.";    color = '#E24B4A'; }

  showModal(
    `Call complete — ${opp.name}`,
    `<div style="text-align:center;padding:16px 0;font-family:Arial,sans-serif">
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
      // Check for win banner
      if (state.pendingWinBanner) {
        const banner = state.pendingWinBanner;
        state.pendingWinBanner = null;
        closeModal();
        renderAll();
        showWinBanner(banner.company, banner.value);
      } else {
        closeModal();
        renderAll();
      }
      if (result.outcome) {
        const msgs = { won: 'Deal won!', lost: 'Deal lost.', nad: 'No decision — moved to futures.' };
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

function showWinBanner(company, value) {
  const banner = document.createElement('div');
  banner.className = 'win-banner';
  banner.innerHTML = `<strong>DEAL CLOSED</strong> — ${company} — $${value.toLocaleString()}`;
  document.body.appendChild(banner);
  // Flash kanban
  const kanban = document.getElementById('panel-pipeline');
  if (kanban) {
    kanban.classList.add('win-flash');
    setTimeout(() => kanban.classList.remove('win-flash'), 800);
  }
  setTimeout(() => banner.remove(), 2500);
}

// ─── Day navigation ───────────────────────────────────────────────────────────

function _processPostAdvance() {
  if (state.pendingYearEnd) {
    state.pendingYearEnd = false;
    state.gameCompleted  = true;
    saveState(state);
    setTimeout(showYearEndScreen, 300);
    return;
  }
  if (state.pendingFired) {
    state.pendingFired = false;
    saveState(state);
    setTimeout(showFiredScreen, 200);
    return;
  }
  if (state.pendingMeeting) {
    const meeting = state.pendingMeeting;
    state.pendingMeeting = null;
    saveState(state);
    setTimeout(() => showMeetingInterruptionCard(meeting), 200);
    return;
  }
  if (state.pendingQuarterlyReview) {
    state.pendingQuarterlyReview = false;
    saveState(state);
    setTimeout(showQuarterlyReview, 300);
    return;
  }
  if (state.pendingWaterCooler) {
    state.pendingWaterCooler = false;
    saveState(state);
    setTimeout(showWaterCoolerModal, 250);
    return;
  }
  if (state.pendingBDRReminder) {
    state.pendingBDRReminder = false;
    saveState(state);
    setTimeout(showBDRReminder, 150);
  }
  if (state.pendingBirthday) {
    const firstName = state.pendingBirthday;
    const fav = state.pendingBirthdayFav;
    state.pendingBirthday    = null;
    state.pendingBirthdayFav = null;
    saveState(state);
    setTimeout(() => showBirthdayModal(firstName, fav), 400);
  }
}

window.nextDay = function() {
  if (_pbTimerInterval) { clearInterval(_pbTimerInterval); _pbTimerInterval = null; }

  // Golf event: check BEFORE advancing (last day of Q, within $20k of quarterly goal)
  const isLastDayOfQ = state.date.month === 3 && state.date.week === 4 && state.date.day === 5;
  if (isLastDayOfQ) {
    const qRev   = (state.currentQuarterRevenue || 0) + (state.currentMonthRevenue || 0);
    const qQuota = (state.monthlyQuota || 80000) * 3;
    const gap    = qQuota - qRev;
    if (gap >= 0 && gap <= 20000) {
      const activeOpps = state.opportunities.filter(o => ![STAGES.WON, STAGES.LOST].includes(o.stage));
      const largest    = [...activeOpps].sort((a, b) => b.value - a.value)[0];
      let golfWon = null;
      if (largest) {
        const winValue = Math.max(largest.value, 20000);
        largest.stage            = STAGES.WON;
        state.won                = (state.won || 0) + winValue;
        state.currentMonthRevenue = (state.currentMonthRevenue || 0) + winValue;
        if (!state.wonDeals) state.wonDeals = [];
        state.wonDeals.push({ id: largest.id, name: largest.name, company: largest.company, value: winValue, day: state.dayNumber });
        golfWon = { name: largest.name, company: largest.company, value: winValue };
        saveState(state);
        renderAll();
      }
      showGolfModal(golfWon, () => {
        state = advanceDay(state);
        _currentEmailId    = null;
        _expandedContactId = null;
        renderAll();
        _processPostAdvance();
      });
      return;
    }
  }

  state = advanceDay(state);
  _currentEmailId    = null;
  _expandedContactId = null;
  renderAll();
  _processPostAdvance();
};

// ─── New game / load ──────────────────────────────────────────────────────────

window.newGame = function() {
  if (!confirm('Start a new game? This will erase your current save.')) return;
  clearState();
  initGame();
};

window.closeModal = closeModal;

function _buildLeaderboardMigration() {
  const names = ['Marcus Webb','Diana Park','Kevin Okafor','Elena Johansson','Patrick Ali','Fatima Brennan','George Schmidt','Yuki Martin'];
  return names.map(name => ({ name, attainment: 0, dealsWon: 0, revenue: 0 }));
}

// ─── Player profile ───────────────────────────────────────────────────────────

const PROFILE_KEY = 'phs_playerProfile';
function loadPlayerProfile() { try { const r = localStorage.getItem(PROFILE_KEY); return r ? JSON.parse(r) : null; } catch(e) { return null; } }
function savePlayerProfile(p) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e) {} }

function applyProfileToState(profile) {
  if (!profile) return;
  if (profile.playerAvatar === 'avatar2') state.avatarIndex = 1;
  else state.avatarIndex = 0;
  state.playerDisplayName = profile.playerDisplayName;
  state.playerFirstName   = profile.playerFirstName;
  state.playerBirthMonth  = profile.playerBirthMonth;
  saveState(state);
}

function showHRForm() {
  const body = `
    <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.8">
      <div style="margin-bottom:8px;color:var(--text2);font-size:12px">Please complete all fields before your first day.</div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-weight:600;margin-bottom:4px">Full Name *</label>
        <input id="hr-name" type="text" placeholder="First Last" style="width:100%;padding:6px;border:2px solid;font-size:13px;box-sizing:border-box" maxlength="50">
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-weight:600;margin-bottom:4px">Salary Requirements *</label>
        <label style="display:block;margin-bottom:4px"><input type="radio" name="hr-diff" value="easy"> $100,000 (Easy)</label>
        <label style="display:block;margin-bottom:4px"><input type="radio" name="hr-diff" value="moderate"> $250,000 (Moderate)</label>
        <label style="display:block"><input type="radio" name="hr-diff" value="hard"> $500,000 (Hard)</label>
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-weight:600;margin-bottom:4px">Sex *</label>
        <label style="display:block;margin-bottom:4px"><input type="radio" name="hr-sex" value="man"> Man</label>
        <label style="display:block;margin-bottom:4px"><input type="radio" name="hr-sex" value="woman"> Woman</label>
        <label style="display:block"><input type="radio" name="hr-sex" value="yes"> Yes</label>
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-weight:600;margin-bottom:4px">Date of Birth *</label>
        <input id="hr-dob" type="date" style="width:100%;padding:6px;border:2px solid;font-size:13px;box-sizing:border-box">
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;font-weight:600;margin-bottom:4px">Favourite Thing *</label>
        <input id="hr-fav" type="text" placeholder="e.g. Pizza" style="width:100%;padding:6px;border:2px solid;font-size:13px;box-sizing:border-box" maxlength="20">
        <div id="hr-fav-count" style="font-size:11px;color:var(--text3);margin-top:2px">0 / 20 characters</div>
      </div>
      <div id="hr-error" style="color:#E24B4A;font-size:12px;margin-bottom:8px;display:none">Please complete all required fields.</div>
    </div>
  `;
  showModal('WIDGET WONDERS HR DEPARTMENT — NEW HIRE ONBOARDING FORM', body, [
    { label: 'Report for Duty', primary: true, onclick: 'window._hrSubmit()' }
  ], true);

  setTimeout(() => {
    const favInput = document.getElementById('hr-fav');
    const counter  = document.getElementById('hr-fav-count');
    if (favInput && counter) {
      favInput.addEventListener('input', () => { counter.textContent = `${favInput.value.length} / 20 characters`; });
    }
  }, 50);

  window._hrSubmit = function() {
    const nameEl  = document.getElementById('hr-name');
    const dobEl   = document.getElementById('hr-dob');
    const favEl   = document.getElementById('hr-fav');
    const diffVal = document.querySelector('input[name="hr-diff"]:checked')?.value;
    const sexVal  = document.querySelector('input[name="hr-sex"]:checked')?.value;
    const name = nameEl?.value?.trim();
    const dob  = dobEl?.value;
    const fav  = favEl?.value?.trim();
    [nameEl, dobEl, favEl].forEach(el => { if (el) el.style.borderColor = ''; });
    let valid = true;
    if (!name)    { if (nameEl) nameEl.style.borderColor = '#E24B4A'; valid = false; }
    if (!diffVal) { valid = false; }
    if (!sexVal)  { valid = false; }
    if (!dob)     { if (dobEl) dobEl.style.borderColor = '#E24B4A'; valid = false; }
    if (!fav)     { if (favEl) favEl.style.borderColor = '#E24B4A'; valid = false; }
    if (!valid) {
      const errEl = document.getElementById('hr-error');
      if (errEl) errEl.style.display = 'block';
      return;
    }
    const parts = name.split(' ');
    const lastName  = parts[parts.length - 1].toUpperCase();
    const firstName = parts.slice(0, -1).join(' ').toUpperCase() || lastName;
    const displayName = parts.length > 1 ? `${lastName}, ${parts.slice(0,-1).join(' ').toUpperCase()}` : lastName;
    const dobMonth = dob ? parseInt(dob.split('-')[1]) : 1;
    const avatar = sexVal === 'woman' ? 'avatar2' : 'avatar1';
    const profile = {
      playerFullName: name,
      playerDisplayName: displayName,
      playerFirstName: firstName,
      playerDifficulty: diffVal,
      playerSex: sexVal,
      playerAvatar: avatar,
      playerDOB: dob,
      playerBirthMonth: dobMonth,
      playerFavouriteThing: fav,
    };
    savePlayerProfile(profile);
    closeModal();
    applyProfileToState(profile);
    renderAll();
  };
}

function showBirthdayModal(firstName, fav) {
  showModal(
    'HAPPY BIRTHDAY FROM WIDGET WONDERS',
    `<div style="text-align:center;font-family:Arial,sans-serif">
      <img src="opening.png" style="width:100%;max-width:300px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto">
      <p style="font-size:13px;line-height:1.7">Happy Birthday Month, ${firstName}! We know your favourite thing is <strong>${fav}</strong>, so we made you a cake with it. Enjoy — you've earned it. Now get back to work.</p>
    </div>`,
    [{ label: 'Thanks Dave', onclick: 'window.closeModal()' }]
  );
}

function showYearEndScreen() {
  const yearQuota   = (state.projectedYearlyQuota || Array(12).fill(80000)).reduce((a,b) => a+b, 0);
  const yearRevenue = state.currentYearRevenue || 0;
  const yearAtt     = yearQuota > 0 ? Math.round(yearRevenue / yearQuota * 100) : 0;
  const profile     = loadPlayerProfile();
  const firstName   = profile?.playerFirstName || state.playerFirstName || 'there';
  const isWin       = yearAtt >= 90;

  if (isWin) {
    showModal(
      'WIDGET WONDERS — ANNUAL PERFORMANCE REVIEW',
      `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.8">
        <img src="win.png" style="width:100%;display:block;margin-bottom:16px">
        <p><strong>CONGRATULATIONS, ${firstName}.</strong></p>
        <p>After a remarkable year at Widget Wonders, the board has made a decision. Your performance this year — $${yearRevenue.toLocaleString()} against a $${yearQuota.toLocaleString()} target — speaks for itself.</p>
        <p>Effective immediately, you have been promoted to Sales Manager.</p>
        <p>You are no longer responsible for your own pipeline. You are now responsible for the pipelines of all 12 members of your team. Their quota is your quota. Their losses are your losses.</p>
        <p>Welcome to the Sales Manager Sim. We hope you're ready.</p>
        <p style="font-size:11px;color:var(--text2)">Your final title: Senior Executive Sales Rep of Global Operations</p>
      </div>`,
      [{ label: 'Accept Promotion', primary: true, onclick: 'window._yearEndAccept()' }],
      true
    );
  } else {
    showModal(
      'WIDGET WONDERS HR DEPARTMENT — NOTICE OF EMPLOYMENT STATUS',
      `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.8">
        <img src="lose.png" style="width:100%;display:block;margin-bottom:16px">
        <p>Dear ${firstName},</p>
        <p>After careful review of your annual performance — $${yearRevenue.toLocaleString()} against a $${yearQuota.toLocaleString()} target (${yearAtt}% attainment) — Widget Wonders has made the difficult decision not to continue your employment.</p>
        <p>The fast-paced world of widget sales requires a certain level of pipeline discipline that, unfortunately, was not demonstrated consistently this year.</p>
        <p>You are welcome to reapply in the future once you have had an opportunity to study the fundamentals of pipeline management.</p>
        <p>We wish you the best.</p>
        <p>HR Department<br>Widget Wonders</p>
      </div>`,
      [{ label: 'Try Again', primary: true, onclick: 'window._yearEndRetry()' }],
      true
    );
  }

  window._yearEndAccept = function() { clearState(); window.location.reload(); };
  window._yearEndRetry  = function() { clearState(); window.location.reload(); };
}

function initGame() {
  const saved   = loadState();
  const profile = loadPlayerProfile();

  if (saved) {
    state = saved;
    // Migrate old saves: ensure new fields exist
    if (state.monthRevenue === undefined) state.monthRevenue = 0;
    if (!state.quarterMonthHits) state.quarterMonthHits = [false, false, false];
    if (state.employeeId === undefined) state.employeeId = String(Math.floor(100000 + Math.random() * 900000));
    if (state.avatarIndex === undefined) state.avatarIndex = 0;
    if (state.activeBDR === undefined) state.activeBDR = null;
    if (!state.availableBDRs) state.availableBDRs = ['none'];
    if (state.q1AboveQuota === undefined) state.q1AboveQuota = false;
    if (state.q2AboveQuota === undefined) state.q2AboveQuota = false;
    if (state.pendingBDRReminder === undefined) state.pendingBDRReminder = false;
    // Sprint 3D state migrations
    if (state.pendingMeeting === undefined)            state.pendingMeeting            = null;
    if (state.pipelineReviewIgnoreCount === undefined) state.pipelineReviewIgnoreCount = 0;
    if (state.pipelineReviewSentWeek === undefined)    state.pipelineReviewSentWeek    = -1;
    if (state.pipelineReviewSubmitted === undefined)   state.pipelineReviewSubmitted   = false;
    if (state.pipelineReviewEmailId === undefined)     state.pipelineReviewEmailId     = null;
    if (!state.forecastSubmissions)                    state.forecastSubmissions       = {};
    if (state.pendingFired === undefined)              state.pendingFired              = false;
    // Sprint 4 state migrations
    if (!state.playerSkills)               state.playerSkills            = [];
    if (state.currentWinStreak === undefined) state.currentWinStreak    = 0;
    if (state.winStreakPeak === undefined)  state.winStreakPeak          = 0;
    if (state.winCount === undefined)      state.winCount               = 0;
    if (!state.colleagueCommentsSent)      state.colleagueCommentsSent  = [];
    if (!state.activeMarketEffects)        state.activeMarketEffects    = [];
    if (!state.weeklySlideModifiers)       state.weeklySlideModifiers   = {};
    if (state.pendingQuarterlyReview === undefined) state.pendingQuarterlyReview = false;
    if (!state.leaderboard || state.leaderboard.some(c => c.attainment > 100)) state.leaderboard = _buildLeaderboardMigration();
    if (state.pendingWinBanner === undefined)       state.pendingWinBanner = null;
    // Sprint 5 state migrations
    if (state.performanceHistory === undefined)    state.performanceHistory    = [];
    if (state.currentMonthRevenue === undefined)   state.currentMonthRevenue   = state.monthRevenue || 0;
    if (state.currentQuarterRevenue === undefined) state.currentQuarterRevenue = 0;
    if (state.currentYearRevenue === undefined)    state.currentYearRevenue    = 0;
    if (state.monthlyQuota === undefined)          state.monthlyQuota          = state.quota || 80000;
    if (!state.projectedYearlyQuota)               state.projectedYearlyQuota  = Array(12).fill(state.monthlyQuota);
    if (state.territoryLevel === undefined)        state.territoryLevel        = 0;
    if (state.titleProgress === undefined)         state.titleProgress         = 0;
    if (state.birthdayFiredThisMonth === undefined) state.birthdayFiredThisMonth = false;
    if (state.gameCompleted === undefined)         state.gameCompleted         = false;
    if (state.dealsWonThisMonth === undefined)     state.dealsWonThisMonth     = 0;
    if (state.dealsLostThisMonth === undefined)    state.dealsLostThisMonth    = 0;
    if (state.dealsNADThisMonth === undefined)     state.dealsNADThisMonth     = 0;
    if (state.consecutiveDaysNoDemoBooking === undefined) state.consecutiveDaysNoDemoBooking = 0;
    if (state.waterCoolerFired === undefined)      state.waterCoolerFired      = false;
    if (state.pendingWaterCooler === undefined)    state.pendingWaterCooler    = false;
    // Per-opp score fields
    state.opportunities.forEach(o => {
      if (o.demoScore === undefined)     o.demoScore     = 50;
      if (o.proposalScore === undefined) o.proposalScore = 50;
      if (o.pricingScore === undefined)  o.pricingScore  = 50;
    });
    // Add personality fields to existing opps missing them
    const _cpKeys = Object.keys(CLOSE_PERSONALITY_TYPES);
    state.opportunities.forEach(o => {
      if (!o.personalityType)       o.personalityType     = 'analytical';
      if (!o.personalityRevealed)   o.personalityRevealed = false;
      if (o.temperature === undefined) o.temperature      = 75;
      if (!o.temperatureHistory)    o.temperatureHistory  = [];
      if (o.probBoost === undefined) o.probBoost          = 0;
      if (!o.proposalMultiplier)    o.proposalMultiplier  = 1.0;
      // Close personality fields
      if (!o.closePersonalityType)
        o.closePersonalityType = _cpKeys[Math.floor(Math.random() * _cpKeys.length)];
      if (o.closePersonalityRevealed === undefined)
        o.closePersonalityRevealed = false;
      // futureClosedDay — estimate from futureExpiry for old saves
      if (o.futureClosedDay === undefined)
        o.futureClosedDay = (o.stage === STAGES.FUTURE && o.futureExpiry != null)
          ? o.futureExpiry - 90
          : null;
    });
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
      opp.scheduleBy = state.dayNumber + 2 + i; // 3-day window (days 0,1,2), staggered by 1 day each
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
        from: 'CRM System',
        subject: `New Demo Request — ${opp.company}`,
        body: `A new demo has been requested by ${opp.name} at ${opp.company}.\n\n${opp.flavourNote}`,
        time: formatDate(state.date),
        type: 'task',
        read: false,
        oppId: opp.id,
        actionType: 'schedule-demo',
      });
    });
    saveState(state);
  }

  // Check for game completed
  if (state.gameCompleted) {
    renderAll();
    setTimeout(() => showYearEndScreen(), 200);
    return;
  }

  if (profile) {
    applyProfileToState(profile);
  }

  renderAll();

  if (!profile) {
    if (!localStorage.getItem('hasSeenIntro')) {
      setTimeout(() => showOnboardingModal(() => showHRForm()), 120);
    } else {
      setTimeout(showHRForm, 120);
    }
  } else if (!localStorage.getItem('hasSeenIntro')) {
    setTimeout(() => showOnboardingModal(), 120);
  }
}

// ─── BDR Panel ────────────────────────────────────────────────────────────────

const BDR_AVATAR_COLORS = { none: '#808080', basic: '#808080', standard: '#008080', senior: '#000080', elite: '#5a0000' };
const BDR_TIER_LABELS   = ['', 'TIER 1', 'TIER 2', 'TIER 3', 'TIER 4'];
const BDR_PHOTOS        = { basic: 'caseypark.png', standard: 'alexchen.png', senior: 'jordanmills.png', elite: 'samrivera.png' };

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

  const bdrPhoto = BDR_PHOTOS[bdr.id];
  const avatarHtml = bdrPhoto && isUnlocked
    ? `<img src="${bdrPhoto}" style="width:36px;height:36px;object-fit:cover;flex-shrink:0;border:1px solid #808080" alt="${bdr.name}">`
    : `<div style="width:36px;height:36px;background:${avColor};color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #808080">${bdrInitials(bdr)}</div>`;

  return `<div style="border:2px solid;border-color:${isUnlocked ? '#ffffff #808080 #808080 #ffffff' : '#808080 #ffffff #ffffff #808080'};padding:8px;margin-bottom:6px;background:${isActive ? '#e0e0ff' : isUnlocked ? '#d4d0c8' : '#c0c0c0'};display:flex;gap:10px;align-items:flex-start">
    ${avatarHtml}
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

// ─── Golf event modal ─────────────────────────────────────────────────────────

function showGolfModal(wonOpp, onContinue) {
  const wonLine = wonOpp
    ? `<p style="font-size:12px;font-family:Arial,sans-serif;line-height:1.6"><strong>${wonOpp.name}</strong> at <strong>${wonOpp.company}</strong> committed to a deal worth <strong>$${wonOpp.value.toLocaleString()}</strong> after your round. The deal is closed.</p>`
    : `<p style="font-size:12px;font-family:Arial,sans-serif;line-height:1.6">No active opportunities to close — but it was still a nice round.</p>`;

  showModal(
    'Quarterly Golf Outing',
    `<div style="margin:-12px -14px 14px -14px">
       <img src="golfing.png" style="width:100%;display:block;border-bottom:2px solid #808080" alt="Golf" onerror="this.style.display='none'">
     </div>
     <div style="font-family:Arial,sans-serif">
       <p style="font-size:12px;line-height:1.6;margin-bottom:10px">Your manager Dave invited you to the company golf outing on the last day of the quarter. A prospect you've been warming up joins your foursome.</p>
       ${wonLine}
     </div>`,
    [{ label: 'Not bad for a Tuesday', primary: true, onclick: 'window._golfContinue()' }],
    true
  );
  window._golfContinue = () => { closeModal(); if (onContinue) onContinue(); };
}

// ─── Water cooler event modal ─────────────────────────────────────────────────

function showWaterCoolerModal() {
  showModal(
    'Water Cooler Moment',
    `<div style="margin:-12px -14px 14px -14px">
       <img src="water_cooler.png" style="width:100%;display:block;border-bottom:2px solid #808080" alt="Water Cooler" onerror="this.style.display='none'">
     </div>
     <div style="font-family:Arial,sans-serif">
       <p style="font-size:12px;line-height:1.7">Rumor has it John and Sally have been working late together...</p>
       <p style="font-size:12px;line-height:1.7">Your colleague leans in and whispers — apparently there's a whole list of companies that HR flagged as "high interest" but never followed up on. What do you do?</p>
     </div>`,
    [
      { label: 'Tell HR', primary: true, onclick: 'window._waterCoolerHR()' },
      { label: 'Say Nothing', onclick: 'window._waterCoolerNothing()' },
    ],
    true
  );

  window._waterCoolerHR = () => {
    closeModal();
    for (let i = 0; i < 3; i++) {
      const opp = generateOpportunity(state);
      state.opportunities.push(opp);
      state.emails.push({
        id: nextEmailId(),
        from: 'HR System',
        subject: `Warm Lead Referral — ${opp.company}`,
        body: `HR has flagged ${opp.name} at ${opp.company} as a high-interest prospect.\n\nThey've requested more information about Widget Wonders solutions. Demo window is open.\n\nHR System`,
        time: formatDate(state.date),
        type: 'task',
        read: false,
        oppId: opp.id,
        actionType: 'schedule-demo',
      });
    }
    saveState(state);
    renderAll();
    showModal(
      'HR Notified',
      `<p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.6">HR dug into the files. Three warm leads have been added to your pipeline — companies that expressed interest but fell through the cracks.</p>`,
      [{ label: 'Time to dial', primary: true, onclick: 'window.closeModal()' }],
      true
    );
  };

  window._waterCoolerNothing = () => {
    closeModal();
    state.emails.push({
      id: nextEmailId(),
      from: 'HR — Janet M.',
      subject: 'RE: Workplace Conduct Policy Reminder',
      body: `Hi,\n\nIt has come to our attention that certain inter-departmental information may have been shared informally.\n\nAs a reminder, all lead referrals must go through the CRM intake process. Circumventing established workflows — even with good intentions — is a violation of our information governance policy.\n\nPlease review the attached policy document (attached).\n\nBest,\nJanet M.\nHR Business Partner`,
      time: formatDate(state.date),
      type: 'manager',
      read: false,
    });
    saveState(state);
    renderAll();
  };
}

// ─── Meeting interruption card ───────────────────────────────────────────────

function showMeetingInterruptionCard(meeting) {
  const overlay = document.createElement('div');
  overlay.className = 'meeting-overlay';
  overlay.id = 'meeting-overlay';
  overlay.innerHTML = `
    <div class="meeting-card">
      <div class="meeting-card-header">MEETING INVITE — ACCEPTED AUTOMATICALLY</div>
      <div class="meeting-card-body">
        <img src="meeting.png" style="width:100%;display:block;border-bottom:2px solid #808080;margin-bottom:10px" alt="Meeting" onerror="this.style.display='none'">
        <div style="font-size:13px;font-weight:bold;font-family:Arial,sans-serif;color:#000000;margin-bottom:6px">${meeting.subject}</div>
        <div style="font-size:12px;font-family:Arial,sans-serif;color:#404040;line-height:1.6;margin-bottom:6px">${meeting.desc}</div>
        <div style="font-size:10px;font-family:'Courier New',monospace;color:#808080">This costs 1 action.</div>
        <button class="meeting-dismiss-btn" onclick="window._dismissMeeting()">Noted. There goes an hour.</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  window._dismissMeeting = () => {
    state.actionsRemaining = Math.max(0, state.actionsRemaining - 1);
    saveState(state);
    renderAll();
    const el = document.getElementById('meeting-overlay');
    if (el) el.remove();
  };
}

// ─── Fired screen ─────────────────────────────────────────────────────────────

function showFiredScreen() {
  showModal(
    'TERMINATION NOTICE — PIPELINE HEALTH SIM HR DEPARTMENT',
    `<div style="text-align:center;padding:30px 20px;background:#000080;color:#ffffff;margin:-12px -14px">
      <div style="font-size:48px;font-weight:900;font-family:Arial,sans-serif;letter-spacing:.05em;margin-bottom:16px">YOU'RE FIRED.</div>
      <div style="font-size:14px;font-family:Arial,sans-serif;line-height:1.7;margin-bottom:24px">
        Dave H. has terminated your employment effective immediately.<br>
        Submitting your pipeline forecast is a non-negotiable requirement of this role.<br>
        Your access has been revoked. Please return your ID badge.
      </div>
    </div>`,
    [{ label: 'Try Again', primary: true, onclick: 'window._tryAgainFired()' }],
    true
  );
  // Override modal close button to do nothing
  const closeBtn = document.querySelector('#modal-box .modal-header .btn');
  if (closeBtn) closeBtn.style.display = 'none';

  window._tryAgainFired = () => {
    clearState();
    localStorage.removeItem('hasSeenIntro');
    closeModal();
    initGame();
  };
}

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

function showOnboardingModal(onDone) {
  showModal(
    'Welcome to Pipeline Health Sim',
    `<div style="margin:-12px -14px 14px -14px">
       <img src="opening.png" style="width:100%;display:block;border-bottom:2px solid #808080" alt="Pipeline Health Sim">
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
    if (onDone) onDone();
  };
}

// ─── Quarterly Review ────────────────────────────────────────────────────────

function showQuarterlyReview() {
  const hits = state.quarterMonthHits.filter(Boolean).length;
  const tier = hits >= 3 ? 'gold' : hits >= 2 ? 'silver' : 'bronze';
  const tierSkills = (SKILL_TREE[tier] || []).filter(s => !state.playerSkills.includes(s.id));

  const shuffled = [...tierSkills].sort(() => Math.random() - 0.5).slice(0, 2);
  if (shuffled.length === 0) {
    showModal('QUARTERLY PERFORMANCE REVIEW',
      `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.8">You have already unlocked all available ${tier.toUpperCase()} skills. Keep building your pipeline.\n\nMonths on quota this quarter: ${hits}/3</div>`,
      [{ label: 'Continue', primary: true, onclick: 'window.closeModal()' }], true);
    return;
  }

  let selectedSkillId = null;

  const skillCards = shuffled.map((skill, i) => `
    <div id="skill-card-${i}" class="skill-card" onclick="window._selectSkill('${skill.id}', ${i})"
      style="flex:1;border:2px solid var(--border);border-radius:8px;padding:12px;cursor:pointer;min-height:44px;background:var(--bg2)">
      <div style="font-size:22px;margin-bottom:6px">${skill.icon}</div>
      <div style="font-size:13px;font-weight:bold;margin-bottom:4px">${skill.label}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.5">${skill.desc}</div>
    </div>`).join('');

  showModal(
    'QUARTERLY PERFORMANCE REVIEW',
    `<div style="font-family:Arial,sans-serif">
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">
        Months on quota: ${hits}/3 · Tier earned: <strong>${tier.toUpperCase()}</strong>
      </div>
      <div style="font-size:12px;margin-bottom:14px">Select one upgrade for next quarter:</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${skillCards}</div>
      <div id="skill-selection-note" style="font-size:12px;color:var(--text2);margin-top:10px;min-height:20px"></div>
    </div>`,
    [{ label: 'Confirm Upgrade', primary: true, onclick: 'window._confirmSkill()' }],
    true
  );

  window._selectSkill = (skillId, cardIdx) => {
    selectedSkillId = skillId;
    document.querySelectorAll('.skill-card').forEach((el, i) => {
      el.style.border = i === cardIdx ? '2px solid #378ADD' : '2px solid var(--border)';
      el.style.background = i === cardIdx ? '#E6F1FB' : 'var(--bg2)';
    });
    const skill = shuffled.find(s => s.id === skillId);
    const note = document.getElementById('skill-selection-note');
    if (note && skill) note.textContent = `Selected: ${skill.label}`;
  };

  window._confirmSkill = () => {
    if (!selectedSkillId) { alert('Please select an upgrade first.'); return; }
    if (!state.playerSkills.includes(selectedSkillId)) state.playerSkills.push(selectedSkillId);
    saveState(state);
    closeModal();
    showToast(`Skill unlocked: ${shuffled.find(s => s.id === selectedSkillId)?.label}`);
  };
}

// ─── Mark all read ───────────────────────────────────────────────────────────

window._markAllRead = function() {
  state.emails.forEach(e => e.read = true);
  renderEmails(state, handleEmailSelect);
  renderEmailBody(state, _currentEmailId, handleEmailAction);
  saveState(state);
};

// ─── Performance Dashboard Modal ─────────────────────────────────────────────

window._openPerformanceModal = function() {
  const cur       = getCurrentMonthRecord(state);
  const hist      = state.performanceHistory || [];
  const pYQ       = state.projectedYearlyQuota || Array(12).fill(state.monthlyQuota || 80000);
  const yearQuota = pYQ.reduce((a,b) => a+b, 0);
  const yearRevenue = (state.currentYearRevenue || 0) + cur.revenue;
  const yearAtt   = yearQuota > 0 ? Math.round(yearRevenue / yearQuota * 100) : 0;

  const qStart   = (state.date.quarter - 1) * 3;
  const qMonths  = hist.slice(qStart);
  const qRevenue = qMonths.reduce((a, m) => a + m.revenue, 0) + cur.revenue;
  const qQuota   = (state.monthlyQuota || 80000) * 3;
  const qAtt     = Math.round(qRevenue / qQuota * 100);

  function bar(att) {
    const color = att >= 100 ? '#1D9E75' : att >= 70 ? '#EF9F27' : '#E24B4A';
    return `<div style="height:10px;background:#ddd;border:1px solid #999;margin-top:4px"><div style="height:100%;width:${Math.min(att,100)}%;background:${color}"></div></div>`;
  }

  let histRows = '';
  let lastQuarter = 0;
  for (const m of hist) {
    if (m.quarter !== lastQuarter) {
      if (lastQuarter !== 0) {
        const qMons = hist.filter(x => x.quarter === lastQuarter);
        const qRev  = qMons.reduce((a,x) => a+x.revenue, 0);
        const qQ    = qMons.reduce((a,x) => a+x.quota, 0);
        histRows += `<tr style="background:#f0f0f0;font-weight:600"><td colspan="4" style="padding:3px 6px;font-size:11px">Q${lastQuarter} Subtotal</td><td style="padding:3px 6px;font-size:11px">$${qRev.toLocaleString()} / $${qQ.toLocaleString()}</td><td></td><td></td></tr>`;
      }
      lastQuarter = m.quarter;
    }
    const attColor = m.attainment >= 100 ? '#1D9E75' : m.attainment >= 70 ? '#EF9F27' : '#E24B4A';
    histRows += `<tr><td style="padding:3px 6px;font-size:12px">M${m.month}</td><td style="padding:3px 6px;font-size:12px">Q${m.quarter}</td><td style="padding:3px 6px;font-size:12px">$${m.quota.toLocaleString()}</td><td style="padding:3px 6px;font-size:12px">$${m.revenue.toLocaleString()}</td><td style="padding:3px 6px;font-size:12px;color:${attColor}">${m.attainment}%</td><td style="padding:3px 6px;font-size:12px">${m.hitQuota ? '✓' : '✗'}</td></tr>`;
  }
  const curColor = cur.attainment >= 100 ? '#1D9E75' : cur.attainment >= 70 ? '#EF9F27' : '#E24B4A';
  histRows += `<tr style="background:#fff8dc"><td style="padding:3px 6px;font-size:12px">M${cur.month} (now)</td><td style="padding:3px 6px;font-size:12px">Q${cur.quarter}</td><td style="padding:3px 6px;font-size:12px">$${cur.quota.toLocaleString()}</td><td style="padding:3px 6px;font-size:12px">$${cur.revenue.toLocaleString()}</td><td style="padding:3px 6px;font-size:12px;color:${curColor}">${cur.attainment}%</td><td style="padding:3px 6px;font-size:12px;font-style:italic">—</td></tr>`;

  let chartBars = '';
  for (let i = 0; i < 12; i++) {
    const m  = hist[i];
    const qv = pYQ[i];
    if (m) {
      const attPct  = Math.min(100, Math.round(m.revenue / m.quota * 100));
      const barColor = attPct >= 100 ? '#1D9E75' : attPct >= 70 ? '#EF9F27' : '#E24B4A';
      chartBars += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="height:60px;width:100%;background:#ddd;border:1px solid #999;position:relative"><div style="position:absolute;bottom:0;left:0;right:0;height:${attPct}%;background:${barColor}"></div></div><div style="font-size:9px;color:var(--text3)">M${i+1}</div></div>`;
    } else if (i === hist.length) {
      chartBars += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="height:60px;width:100%;background:#fff8dc;border:2px solid #EF9F27;position:relative"></div><div style="font-size:9px;color:#EF9F27">M${i+1}</div></div>`;
    } else {
      chartBars += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="height:60px;width:100%;background:#f5f5f5;border:1px dashed #ccc"></div><div style="font-size:9px;color:var(--text3)">M${i+1}</div></div>`;
    }
  }

  // Leaderboard section
  const monthlyQuota     = state.monthlyQuota || state.quota || 80000;
  const playerAttainment = Math.round(((state.currentMonthRevenue || 0) / monthlyQuota) * 100);
  const lbEntries = [
    { name: 'You', attainment: playerAttainment, revenue: state.won || 0, dealsWon: (state.wonDeals || []).length, isPlayer: true },
    ...(state.leaderboard || []).map(c => ({ ...c, isPlayer: false }))
  ].sort((a, b) => b.attainment - a.attainment);
  const lbRows = lbEntries.map((e, i) => {
    const bg   = e.isPlayer ? 'background:#000080;color:#ffffff;' : (i % 2 === 0 ? 'background:#f5f5f5;' : '');
    const bold = e.isPlayer ? 'font-weight:bold;' : '';
    return `<tr style="${bg}${bold}">
      <td style="padding:3px 6px;font-size:11px">${i + 1}</td>
      <td style="padding:3px 6px;font-size:11px">${e.name}</td>
      <td style="padding:3px 6px;font-size:11px;text-align:right">${e.attainment}%</td>
      <td style="padding:3px 6px;font-size:11px;text-align:right">$${(e.revenue || 0).toLocaleString()}</td>
      <td style="padding:3px 6px;font-size:11px;text-align:right">${e.dealsWon || 0}</td>
    </tr>`;
  }).join('');

  const body = `<div style="font-family:Arial,sans-serif;font-size:13px;max-width:600px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px" class="perf-grid">
      <div style="border:2px solid;padding:10px">
        <div style="font-weight:600;margin-bottom:6px">This Month</div>
        <div>$${cur.revenue.toLocaleString()} of $${cur.quota.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--text2)">${cur.attainment}% attainment</div>
        ${bar(cur.attainment)}
      </div>
      <div style="border:2px solid;padding:10px">
        <div style="font-weight:600;margin-bottom:6px">This Quarter</div>
        <div>$${qRevenue.toLocaleString()} of $${qQuota.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--text2)">${qAtt}% attainment</div>
        ${bar(qAtt)}
      </div>
      <div style="border:2px solid;padding:10px">
        <div style="font-weight:600;margin-bottom:6px">This Year</div>
        <div>$${yearRevenue.toLocaleString()} of $${yearQuota.toLocaleString()}</div>
        <div style="font-size:12px;color:var(--text2)">${yearAtt}% attainment</div>
        ${bar(yearAtt)}
      </div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:8px">Monthly History</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#ddd"><th style="padding:4px 6px;text-align:left">Month</th><th style="padding:4px 6px;text-align:left">Q</th><th style="padding:4px 6px;text-align:left">Goal</th><th style="padding:4px 6px;text-align:left">Revenue</th><th style="padding:4px 6px;text-align:left">Attain.</th><th style="padding:4px 6px;text-align:left">Result</th></tr></thead>
          <tbody>${histRows}</tbody>
        </table>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:8px">Year Overview</div>
      <div style="display:flex;gap:4px;height:80px;align-items:flex-end">${chartBars}</div>
      <div style="margin-top:8px;font-size:12px;color:var(--text2)">Year Goal: $${yearQuota.toLocaleString()} | Won to Date: $${yearRevenue.toLocaleString()} | Remaining: $${Math.max(0, yearQuota - yearRevenue).toLocaleString()}</div>
    </div>
    <div>
      <div style="font-weight:600;margin-bottom:8px">Leaderboard — This Quarter</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#ddd">
            <th style="padding:4px 6px;text-align:left">#</th>
            <th style="padding:4px 6px;text-align:left">Rep</th>
            <th style="padding:4px 6px;text-align:right">Attainment</th>
            <th style="padding:4px 6px;text-align:right">Revenue</th>
            <th style="padding:4px 6px;text-align:right">Deals</th>
          </tr></thead>
          <tbody>${lbRows}</tbody>
        </table>
      </div>
    </div>
  </div>`;

  showModal('PERFORMANCE DASHBOARD — PIPELINE HEALTH SIM', body, [{ label: 'Close', onclick: 'window.closeModal()' }]);
};

// ─── Leaderboard Modal ───────────────────────────────────────────────────────

window._openLeaderboardModal = function() {
  const monthlyQuota     = state.monthlyQuota || state.quota || 80000;
  const playerAttainment = Math.round(((state.currentMonthRevenue || state.monthRevenue || 0) / monthlyQuota) * 100);
  const allEntries = [
    { name: 'You', attainment: playerAttainment, isPlayer: true, revenue: state.won, dealsWon: state.wonDeals.length },
    ...(state.leaderboard || []).map(c => ({ ...c, isPlayer: false }))
  ].sort((a, b) => b.attainment - a.attainment);

  const rows = allEntries.map((e, i) => {
    const bg = e.isPlayer ? 'background:#000080;color:#ffffff;' : '';
    const bold = e.isPlayer ? 'font-weight:bold;' : '';
    return `<tr style="${bg}${bold}">
      <td style="padding:4px 8px;font-size:12px">${i + 1}</td>
      <td style="padding:4px 8px;font-size:12px">${e.name}</td>
      <td style="padding:4px 8px;font-size:12px;text-align:right">${e.attainment}%</td>
      <td style="padding:4px 8px;font-size:12px;text-align:right">$${(e.revenue || 0).toLocaleString()}</td>
      <td style="padding:4px 8px;font-size:12px;text-align:right">${e.dealsWon || 0}</td>
    </tr>`;
  }).join('');

  showModal('SALES LEADERBOARD — THIS QUARTER',
    `<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif">
      <thead><tr style="background:var(--bg3)">
        <th style="padding:4px 8px;font-size:11px;text-align:left">#</th>
        <th style="padding:4px 8px;font-size:11px;text-align:left">Rep</th>
        <th style="padding:4px 8px;font-size:11px;text-align:right">Attainment</th>
        <th style="padding:4px 8px;font-size:11px;text-align:right">Revenue</th>
        <th style="padding:4px 8px;font-size:11px;text-align:right">Deals</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`,
    [{ label: 'Close', onclick: 'window.closeModal()' }], true);
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

initGame();
