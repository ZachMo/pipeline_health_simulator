/**
 * engine.js — Sales Simulator core game engine
 * All game state lives here. UI modules import from this file only.
 * No DOM references. Pure logic.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const ACTIONS_PER_DAY         = 5;
export const DEMO_SCHEDULE_DEADLINE  = 1;   // days to act on scheduling after booking arrives
export const DEMO_SCHEDULE_WINDOW    = 5;   // business days ahead player may pick for demo
export const PRICING_WINDOW          = 5;   // business days to book pricing after demo
export const LIVE_CALL_DEADLINE      = 7;   // days after pricing to call or lose
export const FUTURE_REBOOK_WINDOW    = 90;  // days to rebook a future opp
export const WIN_RATE                = 0.40;
export const LOSS_RATE               = 0.25;
export const NAD_RATE                = 0.35; // "not at this time" → future opp

export const QUOTA_START             = 80000;
export const QUOTA_MAX               = 250000;
export const QUOTA_INCREASE_PCT      = 1.15;

export const STAGES = {
  PRE_DEMO:          'pre-demo',
  DEMO_SCHEDULED:    'demo-scheduled',
  DEMO_HOSTED:       'demo-hosted',
  PROPOSAL:          'proposal',
  PRICING_SCHEDULED: 'pricing-scheduled',
  LIVE_CALL:         'live-call',
  FUTURE:            'future',
  WON:               'won',
  LOST:              'lost',
};

// Booking rates (expected new opps per 5-day game week), by game-month 1–12
const BOOKING_RATES = {
  1: 2.0,  2: 2.5,  3: 3.0,   // Q1 — slow ramp
  4: 3.0,  5: 3.5,  6: 3.0,   // Q2 — solid
  7: 2.0,  8: 2.0,  9: 3.0,   // Q3 — summer lull then recovery
  10: 4.0, 11: 4.5, 12: 3.5,  // Q4 — strong push
};

// ─── Abstract game calendar ───────────────────────────────────────────────────
// Day 0 = Q1·M1·W1·D1
// Quarter = 60 days (3 months × 4 weeks × 5 days)
// Month   = 20 days (4 weeks × 5 days)
// Week    =  5 days

export function dayNumberToDate(dayNum) {
  const quarter   = Math.floor(dayNum / 60) + 1;
  const dayInQ    = dayNum % 60;
  const month     = Math.floor(dayInQ / 20) + 1; // 1–3 within quarter
  const dayInM    = dayInQ % 20;
  const week      = Math.floor(dayInM / 5) + 1;  // 1–4
  const day       = (dayInM % 5) + 1;             // 1–5
  const gameMonth = (quarter - 1) * 3 + month;   // 1–12 equivalent
  return { quarter, month, week, day, gameMonth };
}

export function formatDate(date) {
  return `Q${date.quarter}·M${date.month}·W${date.week}·D${date.day}`;
}

export function formatDateShort(date) {
  return `W${date.week}D${date.day}`;
}

export function getSeasonInfo(gameMonth) {
  const LABELS = {
    1: 'Start of year — build your pipeline',
    2: 'Pipeline building',
    3: 'Q1 closing time',
    4: 'New quarter — fresh start',
    5: 'Mid-year push',
    6: 'Q2 closing time',
    7: 'Summer lull',
    8: 'Summer lull',
    9: 'Back to business',
    10: 'Q4 sprint',
    11: 'Q4 sprint — close everything',
    12: 'Year-end — close it all',
  };
  const quarter = Math.ceil(gameMonth / 3);
  const isSlow  = gameMonth <= 2 || gameMonth === 7 || gameMonth === 8;
  return {
    quarter: `Q${quarter}`,
    label:   LABELS[gameMonth] || '',
    isSlow,
    bookingRate: BOOKING_RATES[gameMonth] || 3.0,
  };
}

// ─── Opportunity name / company pools ─────────────────────────────────────────

const FIRST_NAMES = ['Sandra','Tom','Priya','James','Amy','Carlos','Rachel','Marcus',
  'Diana','Kevin','Elena','Patrick','Fatima','George','Yuki','Ben','Claudia','Nate'];
const LAST_NAMES  = ['Reyes','Okafor','Nair','Wu','Chen','Diaz','Kim','Taylor',
  'Ortega','Park','Brennan','Huang','Johansson','Patel','Schmidt','Ali','Martin'];
const COMPANIES   = ['Meridian Mfg','BluePath SaaS','Nexgen Health','Castleton Retail',
  'Vertex Analytics','Orion Logistics','Summit Pharma','Ironclad Finance','Beacon Media',
  'Crestview Energy','Halcyon Tech','Solaris Group','Northgate Systems','Redwood Capital',
  'Arktis Systems','Celero Health','Dunmore Group','Fluxion Labs','Goldmere Partners'];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Flavour notes (20+ company-type × buyer-signal combos) ──────────────────

const FLAVOUR_NOTES = [
  // Finance / CFO buyer
  { note: 'A fast-growing logistics firm looking to cut reporting time. Their CFO seems motivated.', buyerProfile: 'finance' },
  { note: 'Mid-size manufacturer under pressure to reduce operational costs. The finance team is leading the evaluation.', buyerProfile: 'finance' },
  { note: 'A regional bank digitising its back office — the CFO has a hard deadline tied to an audit.', buyerProfile: 'finance' },
  { note: 'A healthcare group renegotiating vendor contracts. The finance director wants ROI numbers fast.', buyerProfile: 'finance' },
  { note: 'A retail chain expanding into e-commerce. Their finance lead is focused on reducing cost-per-transaction.', buyerProfile: 'finance' },
  { note: 'A professional services firm with shrinking margins. The managing partner is focused on efficiency gains.', buyerProfile: 'finance' },
  // Technical / CTO buyer
  { note: 'A cloud-native startup whose CTO needs something that plugs into their existing stack.', buyerProfile: 'technical' },
  { note: 'An enterprise software company migrating off legacy infrastructure. CTO has final sign-off.', buyerProfile: 'technical' },
  { note: 'A cybersecurity firm evaluating vendors carefully — their technical team is detail-oriented.', buyerProfile: 'technical' },
  { note: 'A fintech scale-up concerned about data residency and API reliability. CTO is the decision-maker.', buyerProfile: 'technical' },
  { note: 'A media company rebuilding their content platform. The engineering lead wants to see architecture docs.', buyerProfile: 'technical' },
  { note: 'A gaming studio scaling its data platform. Their head of engineering will push hard on integration depth.', buyerProfile: 'technical' },
  // Operations buyer
  { note: 'An operations-heavy distributor trying to reduce manual handoffs. Their Ops Director is the champion.', buyerProfile: 'operations' },
  { note: 'A pharma company automating compliance workflows. Their ops team has been burned by bad rollouts before.', buyerProfile: 'operations' },
  { note: 'A logistics provider with a new COO mandating process changes before year end.', buyerProfile: 'operations' },
  { note: 'An energy company streamlining field service ops. Their Ops lead needs something that doesn\'t require heavy IT.', buyerProfile: 'operations' },
  { note: 'A high-growth e-commerce brand that just raised Series B. Their VP Ops wants to move fast.', buyerProfile: 'operations' },
  { note: 'Early stage interest from a healthcare group — they\'re evaluating three vendors.', buyerProfile: 'operations' },
  // Procurement buyer
  { note: 'A large retailer running a formal vendor selection. Procurement has three solutions shortlisted.', buyerProfile: 'procurement' },
  { note: 'A government contractor evaluating solutions against a compliance checklist. Procurement leads the process.', buyerProfile: 'procurement' },
  { note: 'An insurance group with a lengthy procurement cycle — but their internal champion is pushing for a fast track.', buyerProfile: 'procurement' },
  { note: 'A university system evaluating platforms for a multi-year contract. Procurement wants detailed case studies.', buyerProfile: 'procurement' },
  { note: 'A multinational with centralised vendor sourcing. Procurement has the budget sign-off but needs IT to co-sign.', buyerProfile: 'procurement' },
];

// ─── Urgency ──────────────────────────────────────────────────────────────────

export function calcUrgency(opp, dayNumber) {
  if (opp.stage === STAGES.PRE_DEMO) {
    const d = opp.scheduleBy - dayNumber;
    return d <= 0 ? 'red' : d === 1 ? 'amber' : 'green';
  }
  if (opp.stage === STAGES.DEMO_SCHEDULED) {
    const d = opp.demoDay - dayNumber;
    return d <= 0 ? 'red' : d <= 1 ? 'amber' : 'green';
  }
  if (opp.stage === STAGES.DEMO_HOSTED) {
    const d = opp.pricingScheduleBy - dayNumber;
    return d <= 1 ? 'red' : d <= 2 ? 'amber' : 'green';
  }
  if (opp.stage === STAGES.PROPOSAL || opp.stage === STAGES.PRICING_SCHEDULED) {
    const d = opp.pricingDay - dayNumber;
    return d <= 0 ? 'red' : d <= 1 ? 'amber' : 'green';
  }
  if (opp.stage === STAGES.LIVE_CALL) {
    const d = opp.liveCallBy - dayNumber;
    return d <= 1 ? 'red' : d <= 3 ? 'amber' : 'green';
  }
  if (opp.stage === STAGES.FUTURE) {
    const d = opp.futureExpiry - dayNumber;
    return d <= 10 ? 'red' : d <= 30 ? 'amber' : 'green';
  }
  return 'green';
}

// ─── Email factory ────────────────────────────────────────────────────────────

let _emailId = 10; // start above manually-assigned IDs in initGame

export function nextEmailId() { return ++_emailId; }

function makeEmail(overrides) {
  return { id: ++_emailId, read: false, time: '', oppId: null, actionType: null, ...overrides };
}

const SPAM_POOL = [
  { from: 'newsletter@salesbuzz.io', subject: '7 closing techniques top reps swear by', body: 'Hi there,\n\nAre your reps struggling to hit quota? Download our 47-page closing guide.\n\n[SPAM — you can safely ignore this]' },
  { from: 'events@salesworld.com',   subject: 'You\'re invited: SalesWorld Summit', body: 'Join 10,000 sales professionals at SalesWorld Summit! Early bird tickets just $899.\n\n[SPAM — ignore]' },
  { from: 'noreply@linkedinmail.com', subject: 'Marcus Brennan viewed your profile', body: 'Your profile was viewed 3 times this week. Upgrade to Premium to see who!\n\n[SPAM — ignore]' },
  { from: 'coaching@closemoredeals.biz', subject: 'Your pipeline is leaking revenue', body: 'Studies show 73% of reps lose deals due to poor follow-up. Our AI tool fixes that.\n\n[SPAM — ignore]' },
  { from: 'hr@company-internal.com', subject: 'Action required: update your emergency contacts', body: 'Please log in to the HR portal and verify your emergency contact information.\n\n[LOW PRIORITY]' },
];

// ─── Opportunity generation ───────────────────────────────────────────────────

let _oppIdCounter = 100;

export function generateOpportunity(gameState) {
  const gm        = gameState.date.gameMonth;
  const baseValue = gm >= 10 ? 38000 : gm <= 2 ? 20000 : 26000;
  const value     = Math.round((baseValue + (Math.random() - 0.5) * baseValue * 0.6) / 1000) * 1000;
  const prob      = Math.round(35 + Math.random() * 50); // 35–85%

  const flavour   = randomFrom(FLAVOUR_NOTES);

  return {
    id:             ++_oppIdCounter,
    name:           randomFrom(FIRST_NAMES) + ' ' + randomFrom(LAST_NAMES),
    company:        randomFrom(COMPANIES),
    value,
    prob,
    flavourNote:    flavour.note,
    buyerProfile:   flavour.buyerProfile,
    stage:          STAGES.PRE_DEMO,

    scheduleBy:          gameState.dayNumber + DEMO_SCHEDULE_DEADLINE,
    demoDay:             null,
    demoHostedDay:       null,
    pricingScheduleBy:   null,
    pricingDay:          null,
    proposalBuiltDay:    null,
    pricingHostedDay:    null,
    liveCallBy:          null,
    liveCalledDay:       null,
    futureExpiry:        null,

    urgency: 'green',
    log: [`${formatDate(gameState.date)}: Inbound booking received`],
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialState() {
  return {
    dayNumber:          0,
    date:               dayNumberToDate(0),  // Q1·M1·W1·D1

    actionsRemaining:   ACTIONS_PER_DAY,
    actionsUsedToday:   0,

    quota:              QUOTA_START,
    won:                0,                  // cumulative all-time
    monthRevenue:       0,                  // won this game month
    quarterMonthHits:   [false, false, false],
    wonDeals:           [],

    opportunities:      [],
    calendarEvents:     [],
    emails:             [],
    spamSent:           [],
    log:                [],

    gameOver:           false,
    gameOverReason:     null,
  };
}

// ─── Action handlers ──────────────────────────────────────────────────────────

export function actionScheduleDemo(state, oppId, chosenDayOffset) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                            return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.PRE_DEMO)   return { success: false, message: 'Wrong stage.' };
  if (state.actionsRemaining <= 0)     return { success: false, message: 'No actions remaining today.' };
  if (chosenDayOffset < 1 || chosenDayOffset > DEMO_SCHEDULE_WINDOW)
    return { success: false, message: 'Choose a day 1–5 business days ahead.' };

  const demoDay = state.dayNumber + chosenDayOffset;

  return {
    success: true,
    message: `Demo scheduled with ${opp.name} on ${formatDate(dayNumberToDate(demoDay))}.`,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.stage   = STAGES.DEMO_SCHEDULED;
      o.demoDay = demoDay;
      o.log.push(`${formatDate(draft.date)}: Demo scheduled for ${formatDate(dayNumberToDate(demoDay))}`);
      draft.calendarEvents.push({ day: demoDay, oppId, type: 'demo' });
      draft.actionsRemaining--;
      draft.actionsUsedToday++;
      draft.emails.push(makeEmail({
        from: 'CRM System',
        subject: `Demo confirmed — ${opp.company}`,
        body: `Your demo with ${opp.name} at ${opp.company} is confirmed for ${formatDate(dayNumberToDate(demoDay))}.\n\nRemember: you must host this demo on the day it's scheduled or the opportunity will be lost.`,
        time: formatDate(draft.date),
        type: 'confirm',
        oppId,
      }));
    }
  };
}

export function actionHostDemo(state, oppId, miniGameScore) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                                  return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.DEMO_SCHEDULED)   return { success: false, message: 'Demo not yet scheduled.' };
  if (opp.demoDay !== state.dayNumber)       return { success: false, message: 'Today is not the demo day.' };
  if (state.actionsRemaining <= 0)           return { success: false, message: 'No actions remaining today.' };

  // Grade-based prob adjustment: A+15, B+8, C0, D-8
  const probAdjust = miniGameScore >= 80 ? 15 : miniGameScore >= 60 ? 8 : miniGameScore >= 40 ? 0 : -8;
  const grade      = miniGameScore >= 80 ? 'A' : miniGameScore >= 60 ? 'B' : miniGameScore >= 40 ? 'C' : 'D';

  return {
    success: true,
    message: `Demo hosted! Grade ${grade}. Probability adjusted by ${probAdjust >= 0 ? '+' : ''}${probAdjust}%.`,
    grade,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.stage             = STAGES.DEMO_HOSTED;
      o.demoHostedDay     = draft.dayNumber;
      o.pricingScheduleBy = draft.dayNumber + PRICING_WINDOW;
      o.prob              = Math.max(5, Math.min(95, o.prob + probAdjust));
      o.log.push(`${formatDate(draft.date)}: Demo hosted. Grade ${grade}. Prob → ${o.prob}%`);
      draft.actionsRemaining--;
      draft.actionsUsedToday++;
      draft.emails.push(makeEmail({
        from: 'CRM System',
        subject: `Demo complete — schedule pricing for ${opp.company}`,
        body: `Well done hosting your demo with ${opp.name} at ${opp.company}!\n\nDeal details now unlocked:\nValue: $${o.value.toLocaleString()} · Close probability: ${o.prob}%\n\nNext step: schedule a pricing meeting within ${PRICING_WINDOW} business days (by ${formatDate(dayNumberToDate(o.pricingScheduleBy))}).`,
        time: formatDate(draft.date),
        type: 'task',
        oppId,
      }));
    }
  };
}

export function actionSchedulePricing(state, oppId, chosenDayOffset) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                               return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.DEMO_HOSTED)   return { success: false, message: 'Demo not yet hosted.' };
  if (state.actionsRemaining <= 0)        return { success: false, message: 'No actions remaining today.' };

  const pricingDay = state.dayNumber + chosenDayOffset;

  return {
    success: true,
    message: `Pricing meeting scheduled with ${opp.name} on ${formatDate(dayNumberToDate(pricingDay))}.`,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.stage      = STAGES.PROPOSAL;
      o.pricingDay = pricingDay;
      o.log.push(`${formatDate(draft.date)}: Pricing meeting scheduled for ${formatDate(dayNumberToDate(pricingDay))}`);
      draft.calendarEvents.push({ day: pricingDay, oppId, type: 'pricing' });
      draft.actionsRemaining--;
      draft.actionsUsedToday++;
      draft.emails.push(makeEmail({
        from: 'CRM System',
        subject: `Pricing meeting set — ${opp.company}`,
        body: `Pricing meeting with ${opp.name} confirmed for ${formatDate(dayNumberToDate(pricingDay))}.\n\nIMPORTANT: You must build the proposal before this meeting or the opportunity will be lost.`,
        time: formatDate(draft.date),
        type: 'confirm',
        oppId,
      }));
    }
  };
}

export function actionBuildProposal(state, oppId, miniGameScore) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                              return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.PROPOSAL)     return { success: false, message: 'Not in proposal stage.' };
  if (state.actionsRemaining <= 0)       return { success: false, message: 'No actions remaining today.' };

  const probAdjust = miniGameScore >= 70 ? 5 : miniGameScore >= 50 ? 0 : -5;

  return {
    success: true,
    message: `Proposal built! Score ${miniGameScore}/100.`,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.stage              = STAGES.PRICING_SCHEDULED;
      o.proposalBuiltDay   = draft.dayNumber;
      o.prob               = Math.max(5, Math.min(95, o.prob + probAdjust));
      o.log.push(`${formatDate(draft.date)}: Proposal built. Score ${miniGameScore}. Prob → ${o.prob}%`);
      draft.actionsRemaining--;
      draft.actionsUsedToday++;
    }
  };
}

export function actionHostPricing(state, oppId, miniGameScore, finalValue = null) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                                       return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.PRICING_SCHEDULED)     return { success: false, message: 'Proposal not built yet.' };
  if (opp.pricingDay !== state.dayNumber)         return { success: false, message: 'Today is not the pricing day.' };
  if (state.actionsRemaining <= 0)                return { success: false, message: 'No actions remaining today.' };

  const probAdjust = miniGameScore >= 80 ? 10 : miniGameScore >= 60 ? 5 : miniGameScore >= 40 ? 0 : -8;

  return {
    success: true,
    message: `Pricing meeting hosted! Score ${miniGameScore}/100.`,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      if (finalValue !== null) o.value = finalValue;
      o.stage            = STAGES.LIVE_CALL;
      o.pricingHostedDay = draft.dayNumber;
      o.liveCallBy       = draft.dayNumber + LIVE_CALL_DEADLINE;
      o.prob             = Math.max(5, Math.min(95, o.prob + probAdjust));
      o.log.push(`${formatDate(draft.date)}: Pricing hosted. Score ${miniGameScore}. Prob → ${o.prob}%`);
      draft.actionsRemaining--;
      draft.actionsUsedToday++;
      draft.emails.push(makeEmail({
        from: 'CRM System',
        subject: `Call ${opp.name} within 7 days to close`,
        body: `Pricing meeting complete with ${o.name} at ${o.company}.\n\nFinal deal value: $${o.value.toLocaleString()}\nClose probability: ${o.prob}%\n\nCall them by ${formatDate(dayNumberToDate(o.liveCallBy))} or this opportunity will be marked lost.`,
        time: formatDate(draft.date),
        type: 'task',
        oppId,
      }));
    }
  };
}

export function actionCloseCall(state, oppId, miniGameScore) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                              return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.LIVE_CALL)    return { success: false, message: 'Not in live call stage.' };
  if (state.actionsRemaining <= 0)       return { success: false, message: 'No actions remaining today.' };

  const probAdjust = miniGameScore >= 80 ? 15 : miniGameScore >= 50 ? 5 : -10;
  const finalProb  = Math.max(5, Math.min(95, opp.prob + probAdjust));
  const roll       = Math.random() * 100;

  let outcome;
  if (roll < finalProb * WIN_RATE)                          outcome = 'won';
  else if (roll < finalProb * (WIN_RATE + LOSS_RATE))       outcome = 'lost';
  else                                                       outcome = 'nad';

  return {
    success: true,
    message: `Call complete. Outcome: ${outcome}.`,
    outcome,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.liveCalledDay = draft.dayNumber;
      o.prob          = finalProb;
      o.log.push(`${formatDate(draft.date)}: Close call. Score ${miniGameScore}. Roll → ${outcome}`);
      draft.actionsRemaining--;
      draft.actionsUsedToday++;

      if (outcome === 'won') {
        o.stage = STAGES.WON;
        draft.won          += o.value;
        draft.monthRevenue += o.value;
        draft.wonDeals.push({ oppId, value: o.value, day: draft.dayNumber, name: o.name, company: o.company });
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `Won! ${o.company} signed — $${o.value.toLocaleString()}`,
          body: `Congratulations! ${o.name} at ${o.company} has signed.\n\n$${o.value.toLocaleString()} added to your total.\n\nYou're now at $${draft.won.toLocaleString()} total won this quarter.`,
          time: formatDate(draft.date), type: 'win', oppId,
        }));
      } else if (outcome === 'lost') {
        o.stage = STAGES.LOST;
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `Lost — ${o.company} went with a competitor`,
          body: `${o.name} at ${o.company} has decided to go with another solution.\n\nDeal value lost: $${o.value.toLocaleString()}.`,
          time: formatDate(draft.date), type: 'loss', oppId,
        }));
      } else {
        o.stage        = STAGES.FUTURE;
        o.futureExpiry = draft.dayNumber + FUTURE_REBOOK_WINDOW;
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `No decision — ${o.company} moved to futures`,
          body: `${o.name} at ${o.company} is not ready to move forward right now.\n\nAdded to your futures book. You have ${FUTURE_REBOOK_WINDOW} days to rebook.`,
          time: formatDate(draft.date), type: 'info', oppId,
        }));
      }
    }
  };
}

export function actionRebookCall(state, oppId, miniGameScore) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                           return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.FUTURE)    return { success: false, message: 'Not a future opportunity.' };
  if (state.actionsRemaining <= 0)    return { success: false, message: 'No actions remaining today.' };

  const rebooked = miniGameScore >= 60;

  return {
    success: true,
    message: rebooked ? `Rebooked! ${opp.name} wants a new demo.` : `${opp.name} not ready yet.`,
    rebooked,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      draft.actionsRemaining--;
      draft.actionsUsedToday++;
      o.log.push(`${formatDate(draft.date)}: Rebook call. Score ${miniGameScore}. Rebooked: ${rebooked}`);

      if (rebooked) {
        o.stage              = STAGES.PRE_DEMO;
        o.scheduleBy         = draft.dayNumber + DEMO_SCHEDULE_DEADLINE;
        o.demoDay            = null;
        o.demoHostedDay      = null;
        o.pricingScheduleBy  = null;
        o.pricingDay         = null;
        o.proposalBuiltDay   = null;
        o.pricingHostedDay   = null;
        o.liveCallBy         = null;
        o.liveCalledDay      = null;
        o.futureExpiry       = null;
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `Rebooked — ${o.company} wants a new demo`,
          body: `${o.name} at ${o.company} is back in the pipeline!\n\nSchedule their demo within 1 business day.`,
          time: formatDate(draft.date), type: 'task', oppId,
          actionType: 'schedule-demo',
        }));
      }
    }
  };
}

// ─── Day advance ──────────────────────────────────────────────────────────────

export function advanceDay(state) {
  const draft    = deepCopy(state);
  const prevDate = draft.date;
  draft.dayNumber++;
  draft.date             = dayNumberToDate(draft.dayNumber);
  draft.actionsRemaining = ACTIONS_PER_DAY;
  draft.actionsUsedToday = 0;

  const today = draft.dayNumber;
  const { gameMonth, month: monthInQ, quarter } = draft.date;

  // ── Month / quarter transition ──
  if (gameMonth !== prevDate.gameMonth) {
    const prevMonthIdx = prevDate.month - 1; // 0-indexed within quarter
    draft.quarterMonthHits[prevMonthIdx] = (draft.monthRevenue >= draft.quota);
    draft.monthRevenue = 0;

    if (quarter !== prevDate.quarter) {
      // New quarter: evaluate quota scaling
      if (draft.quarterMonthHits.every(Boolean)) {
        draft.quota = Math.min(QUOTA_MAX, Math.round(draft.quota * QUOTA_INCREASE_PCT));
        draft.emails.push(makeEmail({
          from: 'Manager — Dave H.',
          subject: `Quota increase — you hit it in Q${prevDate.quarter}!`,
          body: `You hit quota all 3 months of Q${prevDate.quarter}. Your monthly quota for Q${quarter} has increased to $${draft.quota.toLocaleString()}.\n\nKeep it up!\n\nDave`,
          time: formatDate(draft.date), type: 'manager',
        }));
      }
      draft.quarterMonthHits = [false, false, false];
    }
  }

  // ── Update urgency ──
  draft.opportunities.forEach(o => {
    if (![STAGES.WON, STAGES.LOST].includes(o.stage)) o.urgency = calcUrgency(o, today);
  });

  // ── Expire overdue opps ──
  draft.opportunities.forEach(o => {
    if (o.stage === STAGES.PRE_DEMO && today > o.scheduleBy) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — failed to schedule demo in time`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Lost — failed to schedule demo for ${o.company}`,
        body: `You did not schedule the demo for ${o.name} at ${o.company} within the required timeframe. This opportunity has been marked lost.`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
    if (o.stage === STAGES.DEMO_SCHEDULED && today > o.demoDay) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — missed scheduled demo`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Lost — missed demo with ${o.company}`,
        body: `Your scheduled demo with ${o.name} at ${o.company} was not hosted. Opportunity marked lost.`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
    if (o.stage === STAGES.DEMO_HOSTED && today > o.pricingScheduleBy) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — failed to schedule pricing`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Lost — pricing not scheduled for ${o.company}`,
        body: `You did not schedule a pricing meeting with ${o.name} at ${o.company} within ${PRICING_WINDOW} days of the demo. Deal value: $${o.value.toLocaleString()}`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
    if (o.stage === STAGES.PROPOSAL && today > o.pricingDay) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — pricing arrived without proposal`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Lost — no proposal built for ${o.company}`,
        body: `The pricing meeting with ${o.name} arrived but no proposal was built. Opportunity lost.`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
    if (o.stage === STAGES.PRICING_SCHEDULED && today > o.pricingDay) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — missed pricing meeting`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Lost — missed pricing meeting with ${o.company}`,
        body: `Your pricing meeting with ${o.name} at ${o.company} was not hosted. Opportunity lost.`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
    if (o.stage === STAGES.LIVE_CALL && today > o.liveCallBy) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — did not call within deadline`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Lost — ${o.company} went cold`,
        body: `You did not call ${o.name} at ${o.company} within ${LIVE_CALL_DEADLINE} days of the pricing meeting. Deal lost.`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
    if (o.stage === STAGES.FUTURE && today > o.futureExpiry) {
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — future opportunity expired`);
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Future opp expired — ${o.company}`,
        body: `${o.name} at ${o.company} has been in futures too long without a rebook call. Removed from pipeline.`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id }));
    }
  });

  // ── At-risk warnings ──
  draft.opportunities.forEach(o => {
    if (o.stage === STAGES.LIVE_CALL && (o.liveCallBy - today) === 2 && !o._warnedLive) {
      o._warnedLive = true;
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `At risk: ${o.company} — 2 days left to call`,
        body: `${o.name} at ${o.company} must be called within 2 days or this deal is lost.\n\nDeal value at stake: $${o.value.toLocaleString()}`,
        time: formatDate(draft.date), type: 'risk', oppId: o.id }));
    }
    if (o.stage === STAGES.FUTURE && (o.futureExpiry - today) === 14 && !o._warnedFuture) {
      o._warnedFuture = true;
      draft.emails.push(makeEmail({ from: 'CRM System',
        subject: `Future opp expiring soon — ${o.company}`,
        body: `${o.name} at ${o.company} will expire from your futures book in 14 days (${formatDate(dayNumberToDate(o.futureExpiry))}).\n\nMake a rebook call soon.`,
        time: formatDate(draft.date), type: 'risk', oppId: o.id }));
    }
  });

  // ── New inbound bookings ──
  const rate         = BOOKING_RATES[gameMonth] || 3.0;
  const dailyChance  = rate / 5;
  const roll1        = Math.random();
  const newBookings  = roll1 < dailyChance ? (Math.random() < 0.25 ? 2 : 1) : 0;

  for (let i = 0; i < newBookings; i++) {
    const opp = generateOpportunity(draft);
    draft.opportunities.push(opp);
    draft.emails.push(makeEmail({
      from:       opp.name + ' — ' + opp.company,
      subject:    `New demo request — ${opp.company}`,
      body:       `Hi,\n\n${opp.flavourNote}\n\nWe'd love to see a demo. We have availability over the next few days.\n\nBest,\n${opp.name}\n${opp.company}`,
      time:       formatDate(draft.date),
      type:       'task',
      oppId:      opp.id,
      actionType: 'schedule-demo',
    }));
    draft.log.push(`${formatDate(draft.date)}: New inbound — ${opp.name} at ${opp.company}`);
  }

  // ── Weekly manager email (start of each week) ──
  if (draft.date.day === 1) {
    const pct     = Math.round((draft.monthRevenue / draft.quota) * 100);
    const weekNum = Math.floor(draft.dayNumber / 5) + 1;
    const season  = getSeasonInfo(gameMonth);
    let msg;
    if (pct < 20)   msg = `We're only at ${pct}% of monthly quota. Let's talk urgently — pipeline needs work.`;
    else if (pct < 50) msg = `At ${pct}% of monthly quota. ${season.isSlow ? 'Slow period — keep loading futures.' : 'Good progress, keep pushing.'}`;
    else if (pct < 80) msg = `${pct}% of monthly quota — solid. Let's close what's in the pipeline.`;
    else               msg = `${pct}% of monthly quota — excellent! One or two more closes and we're there.`;

    draft.emails.push(makeEmail({
      from:    'Manager — Dave H.',
      subject: `Week ${weekNum} check-in: ${pct}% of monthly quota`,
      body:    `Hey,\n\n${msg}\n\nActive opps: ${draft.opportunities.filter(o => ![STAGES.WON, STAGES.LOST].includes(o.stage)).length}\nWon this month: $${draft.monthRevenue.toLocaleString()} of $${draft.quota.toLocaleString()}\n\nTalk soon,\nDave`,
      time:    formatDate(draft.date), type: 'manager',
    }));
  }

  // ── Occasional spam (~every 3 days) ──
  if (Math.random() < 0.33) {
    const unsent = SPAM_POOL.filter(s => !draft.spamSent.includes(s.subject));
    if (unsent.length > 0) {
      const spam = randomFrom(unsent);
      draft.spamSent.push(spam.subject);
      draft.emails.push(makeEmail({ ...spam, time: formatDate(draft.date), type: 'spam' }));
    }
  }

  return draft;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export function saveState(state) {
  try { localStorage.setItem('salesSim_state', JSON.stringify(state)); return true; }
  catch (e) { console.error('Save failed:', e); return false; }
}

export function loadState() {
  try { const r = localStorage.getItem('salesSim_state'); return r ? JSON.parse(r) : null; }
  catch (e) { console.error('Load failed:', e); return null; }
}

export function clearState() {
  localStorage.removeItem('salesSim_state');
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

export function getActiveOpps(state) {
  return state.opportunities.filter(o => ![STAGES.WON, STAGES.LOST].includes(o.stage));
}

export function getUrgentOpps(state) {
  return getActiveOpps(state).filter(o => o.urgency === 'red');
}

export function getPipelineSummary(state) {
  const active = getActiveOpps(state);
  return {
    total:          active.length,
    urgent:         active.filter(o => o.urgency === 'red').length,
    byStage:        Object.values(STAGES).reduce((acc, s) => { acc[s] = active.filter(o => o.stage === s).length; return acc; }, {}),
    projectedValue: active.filter(o => o.demoHostedDay !== null).reduce((sum, o) => sum + Math.round(o.value * o.prob / 100), 0),
  };
}

export function getNextQuarterQuota(state) {
  const { quarter, month } = state.date; // month = 1-3 within quarter
  const completedHits = state.quarterMonthHits.slice(0, month - 1).every(Boolean);
  const currentHit    = state.monthRevenue >= state.quota;
  const allOnTrack    = (month === 1 ? currentHit : (completedHits && currentHit));
  const allPrevHit    = month > 1 ? state.quarterMonthHits.slice(0, month - 1).every(Boolean) : true;
  const projecting    = allPrevHit && currentHit;
  return projecting ? Math.min(QUOTA_MAX, Math.round(state.quota * QUOTA_INCREASE_PCT)) : state.quota;
}
