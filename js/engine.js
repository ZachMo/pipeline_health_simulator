/**
 * engine.js — Sales Simulator core game engine
 * All game state lives here. UI modules import from this file only.
 * No DOM references. Pure logic.
 */

export const VERSION = '0.5.0';

export const TITLE_PROGRESSION = [
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
  'Senior Executive Sales Rep of Global Operations',
];

// ─── Constants ────────────────────────────────────────────────────────────────

export const ACTIONS_PER_DAY         = 5;
export const DEMO_SCHEDULE_DEADLINE  = 2;   // days to act on scheduling after booking arrives (3 days including arrival day)
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

// ─── BDR Roster ───────────────────────────────────────────────────────────────

// ─── Meeting interruption events ──────────────────────────────────────────────

export const MEETING_EVENTS = [
  { subject: 'Synergy Alignment Session', desc: "45 minutes discussing what 'synergy' actually means. No conclusion reached. A follow-up meeting was scheduled." },
  { subject: 'Pipeline Hygiene Review', desc: "Dave pulled up your CRM and asked why three accounts have been 'In Progress' since February. You had no answer." },
  { subject: 'All-Hands Culture Update', desc: "The CEO announced a new core value: Radical Candour. Nobody practised it. Nobody asked questions." },
  { subject: 'Mandatory Unconscious Bias Training', desc: "You scored 4/10 on the quiz. The pass mark was 5. You have been automatically re-enrolled." },
  { subject: 'Q3 Kickoff Pre-Planning Pre-Meeting', desc: "A meeting to plan the agenda for the meeting about Q3 planning. A third meeting may be required." },
  { subject: 'Lunch & Learn: Effective Email Habits', desc: "The presenter sent a 47-slide deck by email at 8am. Nobody opened it. The irony was not addressed." },
  { subject: 'CRM Data Quality Task Force', desc: "It was decided that everyone should update their CRM notes. This meeting was not added to the CRM." },
  { subject: 'Brand Refresh Feedback Session', desc: "The new logo is the same as the old logo but slightly rounder. You spent 40 minutes discussing it." },
  { subject: 'Sales Process Optimisation Workshop', desc: "A consultant explained your own job back to you using a framework he invented. You smiled and nodded." },
  { subject: 'End of Quarter Lessons Learned', desc: "Everyone agreed last quarter was challenging. No lessons were recorded. Same time next quarter." },
  { subject: 'Welcome Lunch for New Team Member', desc: "Dave hired someone. You spent an hour learning their name and immediately forgot it." },
  { subject: 'Territory Alignment Review', desc: "Your accounts were reorganised. Two of your best leads are now someone else's. Dave called it an opportunity." },
  { subject: 'Quarterly Business Review Prep', desc: "You were asked to prepare 12 slides by tomorrow. This meeting was to tell you that." },
  { subject: 'IT Security Awareness Training', desc: "You were informed not to click suspicious emails. The training was delivered by email." },
  { subject: 'Sales Methodology Refresher: MEDDIC', desc: "You have been through this training four times. The acronym changes slightly each year." },
  { subject: 'Office Snack Policy Update', desc: "The healthy snack initiative has been extended. The biscuits are gone. Morale is low." },
  { subject: 'Voice of the Customer Readout', desc: "Customers want faster response times and better pricing. Dave said this was very insightful." },
  { subject: 'Competitive Intelligence Briefing', desc: "The competitor released a new feature. Your product team said they have been working on it for months. No ETA." },
  { subject: 'Benefits Enrolment Reminder Session', desc: "HR explained the dental plan using a flowchart with 14 decision points. You chose the same plan as last year." },
  { subject: 'Team Building: Virtual Escape Room', desc: "You did not escape. Nobody knows whose fault it was. Dave said it was still a great team exercise." },
  { subject: 'New Expense Policy Walkthrough', desc: "Receipts must now be submitted within 48 hours. The new portal does not work on Safari." },
  { subject: 'Go-To-Market Strategy Alignment', desc: "Marketing and Sales disagreed on the ICP for the third consecutive quarter. A working group was formed." },
  { subject: 'Forecast Call', desc: "Dave asked everyone to be more conservative and more aggressive at the same time. You wrote nothing down." },
  { subject: 'Customer Advisory Board Debrief', desc: "Customers gave feedback. The feedback was described as directional. No action items were assigned." },
  { subject: 'Celebrating 40 Years of Widget Wonders', desc: "There was cake. It was good. This was the only productive part of your day." },
];

export const BDR_ROSTER = [
  {
    id: 'none', name: 'No BDR assigned', title: '', tier: 0,
    cost: 'You are on your own.',
    benefits: ['You are on your own. Good luck.'],
    closeRateModifier: 0, autoActions: [],
  },
  {
    id: 'basic', name: 'Casey Park', title: 'Entry Level BDR', tier: 1,
    unlockCondition: 'Available after Week 1',
    cost: '-2% close rate on all deals (they make small mistakes)',
    benefits: [
      'Pre-demo emails include basic buyer notes (industry and stated need)',
      'Daily task reminder popup each Monday morning',
    ],
    closeRateModifier: -0.02,
    autoActions: ['dailyReminder', 'basicNotes'],
  },
  {
    id: 'standard', name: 'Alex Chen', title: 'Junior BDR', tier: 2,
    unlockCondition: 'Available after Month 1',
    cost: '+0% close rate impact (neutral)',
    benefits: [
      'Pre-demo emails include richer notes: budget range, decision timeline, stakeholders',
      'Daily task reminder popup with urgency sorting',
      'Flags at-risk opportunities in the kanban with a warning icon',
    ],
    closeRateModifier: 0,
    autoActions: ['dailyReminder', 'richNotes', 'riskFlags'],
  },
  {
    id: 'senior', name: 'Jordan Mills', title: 'Senior BDR', tier: 3,
    unlockCondition: 'Available after completing Q1 above quota',
    cost: '+5% close rate on all deals',
    benefits: [
      'All benefits of Alex Chen',
      'Automatically schedules one unbooked demo per week (highest value opp)',
      'Sends a prep email before each demo with buyer research',
      'Proactively calls one future opportunity per week (costs no player action)',
    ],
    closeRateModifier: 0.05,
    autoActions: ['dailyReminder', 'richNotes', 'riskFlags', 'autoBookDemo', 'prepEmails', 'autoFutureCall'],
  },
  {
    id: 'elite', name: 'Sam Rivera', title: 'Elite BDR', tier: 4,
    unlockCondition: 'Available after completing Q2 above quota',
    cost: '+12% close rate on all deals',
    benefits: [
      'All benefits of Jordan Mills',
      'Automatically books AND schedules demos for top 2 opps per week',
      'Provides full competitive intel in pre-demo notes',
      'Auto-sends follow-up email after every hosted demo',
      'Alerts player when a future opp is about to expire 5 days early',
    ],
    closeRateModifier: 0.12,
    autoActions: ['dailyReminder', 'richNotes', 'riskFlags', 'autoBookDemo', 'prepEmails', 'autoFutureCall', 'autoBookTop2', 'competitiveIntel', 'autoFollowUp', 'earlyExpiryAlert'],
  },
];

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
  SUSPENDED:         'suspended',
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

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function formatDate(date) {
  // Returns "Week 3 · Wednesday"
  const weekInGame = (date.quarter - 1) * 12 + (date.month - 1) * 4 + date.week;
  return `Week ${weekInGame} · ${DAY_NAMES[date.day - 1]}`;
}

export function formatDateShort(date) {
  // Returns "Wk3 · Mon"
  const weekInGame = (date.quarter - 1) * 12 + (date.month - 1) * 4 + date.week;
  return `Wk${weekInGame} · ${DAY_SHORT[date.day - 1]}`;
}

export function formatQuarterMonth(date) {
  // Returns "Q2 · Month 3" — used in header only
  const monthLabels = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const gmLabel = monthLabels[(date.gameMonth - 1) % 12] || `Month ${date.gameMonth}`;
  return `Q${date.quarter} · ${gmLabel}`;
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

// ─── BDR note pools ───────────────────────────────────────────────────────────

const TIMELINES = [
  'Targeting a decision within 30 days',
  'Hoping to deploy before end of Q2',
  'Evaluating options over the next 60 days',
  'Needs to be live before year-end',
  'Decision expected by end of next month',
  'Fast-track evaluation — 3-week window',
  'No hard deadline but wants to move this quarter',
  'Replacement decision — existing contract ends in 90 days',
];

const STAKEHOLDERS = {
  finance:     ['CFO has final sign-off', 'Finance director holds the budget', 'Managing partner is the decision-maker'],
  technical:   ['CTO is the decision-maker', 'VP Engineering co-signs all vendor decisions', 'Head of IT is the main contact'],
  operations:  ['COO is championing internally', 'VP Ops is driving the evaluation', 'Operations director is the sponsor'],
  procurement: ['Procurement lead runs the process', 'Vendor management team is evaluating', 'Procurement committee must approve (3 members)'],
};

const COMPETITORS = ['Zenith Solutions', 'CoreTech', 'BlueSky Platform', 'NexusOps', 'AlphaStream',
  'Prismatic', 'Vantage Suite', 'ClearPath', 'Momentum CRM', 'Nextera Analytics'];

function buildBdrNotes(value, buyerProfile) {
  const budgetLow  = Math.round(value * 0.75 / 1000);
  const budgetHigh = Math.round(value * 1.25 / 1000);
  const stakePool  = STAKEHOLDERS[buyerProfile] || STAKEHOLDERS.operations;
  const comp1      = randomFrom(COMPETITORS);
  let comp2;
  do { comp2 = randomFrom(COMPETITORS); } while (comp2 === comp1);
  return {
    budget:      `Budget range: $${budgetLow}k–$${budgetHigh}k (based on initial scoping call)`,
    timeline:    randomFrom(TIMELINES),
    stakeholder: randomFrom(stakePool),
    competitive: `Also evaluating ${comp1} and ${comp2}`,
  };
}

export function buildBookingEmailBody(opp, bdrTier, bdrName) {
  if (bdrTier === 0) {
    return `${opp.company} has requested a product demo.\n\nWe'd love to see a demo. Availability is flexible.\n\nBest,\n${opp.name}\n${opp.company}`;
  }
  let body = `${opp.flavourNote}\n\nWe'd love to see a demo. Availability is flexible.\n\nBest,\n${opp.name}\n${opp.company}`;
  body += `\n\n--- ${bdrName}'s Notes ---`;
  if (bdrTier === 1) {
    body += `\nBasic qualification complete. Industry interest and general need confirmed.`;
  }
  if (bdrTier >= 2) {
    const n = opp.bdrNotes || {};
    if (n.budget)      body += `\n${n.budget}`;
    if (n.timeline)    body += `\n${n.timeline}`;
    if (n.stakeholder) body += `\nKey contact: ${n.stakeholder}`;
  }
  if (bdrTier >= 4) {
    const n = opp.bdrNotes || {};
    if (n.competitive) body += `\nCompetitive intel: ${n.competitive}`;
  }
  if (bdrTier >= 1) {
    const pers = BUYER_PERSONALITIES[opp.personalityType];
    if (pers && pers.bdrHints) {
      const hintKey = `tier${bdrTier}`;
      if (pers.bdrHints[hintKey]) {
        body += `\n\nPersonality note: ${pers.bdrHints[hintKey]}`;
      }
    }
  }
  return body;
}

// ─── Urgency ──────────────────────────────────────────────────────────────────

export function calcUrgency(opp, dayNumber) {
  if (opp.stage === STAGES.SUSPENDED) return 'green'; // suspended opps never show urgency
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
  { from: 'newsletter@salesbuzz.io', subject: '7 closing techniques top reps swear by', body: 'Hi there,\n\nAre your reps struggling to hit quota? Download our 47-page closing guide. Includes frameworks used by top earners across SaaS, manufacturing, and logistics.' },
  { from: 'events@salesworld.com',   subject: 'You\'re invited: SalesWorld Summit', body: 'Join 10,000 sales professionals at SalesWorld Summit! Early bird tickets just $899. Three days of keynotes, workshops, and networking.' },
  { from: 'noreply@linkedinmail.com', subject: 'Marcus Brennan viewed your profile', body: 'Your profile was viewed 3 times this week. Upgrade to Premium to see who viewed your profile and reach out directly.' },
  { from: 'coaching@closemoredeals.biz', subject: 'Your pipeline is leaking revenue', body: 'Studies show 73% of reps lose deals due to poor follow-up. Our AI follow-up tool identifies at-risk deals before they go cold. Try it free for 30 days.' },
  { from: 'hr@company-internal.com', subject: 'Action required: update your emergency contacts', body: 'Please log in to the HR portal and verify your emergency contact information before the end of this month. This is required for all staff.' },
];

// ── DATA SECTION ──────────────────────────────────────────────────────────────

export const BUYER_PERSONALITIES = {
  analytical: {
    label: 'Analytical', icon: '📊',
    traits: 'Data-driven, methodical, penalises fluff, rewards specificity',
    slideWeightModifiers: { roi: 2, cost: 2, technical: 2, social: -2, market: -2, roadmap: -1 },
    temperatureDecayRate: 0.8,
    callBonusMultiplier: 1.0,
    bdrHints: {
      tier1: 'Comes across as thorough. Asks a lot of detailed questions.',
      tier2: 'Analytical buyer. Likely CFO or finance background. Will want data not stories.',
      tier3: 'Confirmed analytical profile. Lead with ROI and TCO slides. Avoid market positioning entirely.',
      tier4: 'Analytical CFO-type. Evaluating 2 other vendors on price. A detailed TCO comparison will win this.'
    }
  },
  relationshipBuilder: {
    label: 'Relationship Builder', icon: '🤝',
    traits: 'Warms up with contact, rewards pre-demo calls, cools if ignored between steps',
    slideWeightModifiers: { social: 2, support: 2, trust: 2, technical: -1, market: -1 },
    temperatureDecayRate: 1.5,
    callBonusMultiplier: 1.3,
    bdrHints: {
      tier1: 'Very friendly on the phone. Easy to talk to.',
      tier2: 'Relationship-driven buyer. Will respond well to being contacted before the demo.',
      tier3: 'Strong relationship buyer. Call them before every meeting — it matters to them.',
      tier4: 'Relationship Builder. Their last vendor lost them because of poor post-sale support.'
    }
  },
  impatient: {
    label: 'Impatient', icon: '⚡',
    traits: 'Faster deadlines, decides quickly when ready, penalised by delays',
    slideWeightModifiers: { speed: 3, ease: 2, roi: 1, roadmap: -3, technical: -2 },
    temperatureDecayRate: 2.0,
    callBonusMultiplier: 0.8,
    deadlineModifier: 0.7,
    bdrHints: {
      tier1: 'Short emails. Gets to the point fast.',
      tier2: 'Impatient buyer type. Do not let steps drag. They notice delays.',
      tier3: 'Impatient profile. Their live call window is shorter than usual. Lead with time-to-value.',
      tier4: 'Impatient ops director. Has a board deadline in 6 weeks. Move fast or lose them.'
    }
  },
  skeptic: {
    label: 'Skeptic', icon: '🔍',
    traits: 'Low base probability but high reward for correct dialogue',
    slideWeightModifiers: { trust: 3, social: 3, security: 2, market: -3, features: -2, roadmap: -2 },
    temperatureDecayRate: 1.0,
    callBonusMultiplier: 1.2,
    baseProbModifier: -15,
    bdrHints: {
      tier1: 'Seems a bit guarded. Hard to read.',
      tier2: 'Skeptical buyer. Will push back on claims. Come prepared with evidence.',
      tier3: 'Confirmed skeptic. Do not use superlatives. Lead with references, trust, and security slides.',
      tier4: 'Skeptic who was burned by a vendor 2 years ago. A reference call with a similar company will unlock this deal.'
    }
  },
  champion: {
    label: 'Champion', icon: '🏆',
    traits: 'Enthusiastic but low authority — identify the real decision maker',
    slideWeightModifiers: { social: 2, ease: 2, features: 2, cost: -1 },
    temperatureDecayRate: 0.7,
    callBonusMultiplier: 1.5,
    hiddenStakeholder: true,
    bdrHints: {
      tier1: 'Very enthusiastic. Loves the product already.',
      tier2: 'Champion buyer — they want this but may not have final authority. Find out who signs.',
      tier3: 'Champion profile. Their enthusiasm is real but the CFO or VP makes the final call.',
      tier4: 'Champion in Procurement. Real decision maker is their CFO, Marcus Webb.'
    }
  }
};

const PERSONALITY_WEIGHTS = [
  { type: 'analytical',         weight: 20 },
  { type: 'relationshipBuilder',weight: 20 },
  { type: 'impatient',          weight: 15 },
  { type: 'skeptic',            weight: 25 },
  { type: 'champion',           weight: 20 },
];

function pickPersonality() {
  const total = PERSONALITY_WEIGHTS.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of PERSONALITY_WEIGHTS) { r -= p.weight; if (r <= 0) return p.type; }
  return 'skeptic';
}

// ─── Close personality types (communication style for close call dialogue) ────

export const CLOSE_PERSONALITY_TYPES = {
  analytical:      { label: 'Analytical',      icon: '🔬', hint: 'Responds to data, structured questions, and logical reasoning.' },
  direct:          { label: 'Direct',          icon: '🎯', hint: 'Wants brevity and concrete next steps. Skip the preamble.' },
  confrontational: { label: 'Confrontational', icon: '🔥', hint: 'Pushes back hard. Respond with confidence — don\'t back down.' },
  passive:         { label: 'Passive',         icon: '🌿', hint: 'Needs reassurance. Low-pressure approaches win here.' },
};

const CLOSE_PERSONALITY_KEYS = Object.keys(CLOSE_PERSONALITY_TYPES);

export const MARKET_EVENTS = [
  { id: 'award_win',          subject: 'Good news — Widget Wonders takes home the industry award',
    daveText: 'Team, Widget Wonders just won the Manufacturing Innovation Award for the third consecutive year. Buyers are noticing. Expect some goodwill this week.',
    effect: 'allOppsCloseProbBoost', magnitude: 5, duration: 5 },
  { id: 'economic_uncertainty', subject: 'Heads up — market conditions looking choppy',
    daveText: 'Finance teams across our target sectors are being told to tighten budgets. Expect some resistance this week. Push your strongest value cases.',
    effect: 'randomOppsCloseProbDrop', magnitude: 10, affectedCount: 2 },
  { id: 'competitor_launch',   subject: 'Competitor alert — Acme Widgets launched something new',
    daveText: 'Acme dropped a new product yesterday. Early reviews are mixed but expect buyers to bring it up. The technical slides are going to matter more this week.',
    effect: 'slideWeightShift', affectedTags: ['technical', 'security'], magnitude: 2 },
  { id: 'acquisition',         subject: 'One of your accounts may have just been acquired',
    daveText: 'There are rumours of consolidation in the sector. Check your pipeline — if any of your buyers work for a company that just changed ownership, expect a pause.',
    effect: 'randomOppSuspended', affectedCount: 1, suspendDays: 20 },
  { id: 'referral_incoming',   subject: 'Warm lead incoming — a happy customer sent someone your way',
    daveText: 'Great news. One of our existing accounts referred a contact. I have forwarded their details to the CRM. Should be a friendly one.',
    effect: 'bonusOppGenerated', probBonus: 20, valueBonus: 1.2 },
  { id: 'quarter_end_flush',   subject: 'End of quarter — buyers are spending',
    daveText: 'It is that time. Finance teams are burning remaining budget before quarter close. Any deal in your live call stage should be your absolute priority this week.',
    effect: 'liveCallOppsBoost', magnitude: 15, duration: 5 },
  { id: 'trade_show',          subject: 'Widget World Expo this week — buyers are in learning mode',
    daveText: 'The annual expo is running. Buyers are in research mode and open to conversations. Demo requests tend to spike. Stay sharp.',
    effect: 'inboundRateBoost', magnitude: 1.5, duration: 5 },
  { id: 'press_coverage',      subject: 'We made the trade press — positive coverage',
    daveText: 'Widget Wonders got a write-up in Manufacturing Weekly. Three of our customer stories were featured. Skeptical buyers may be more receptive this week.',
    effect: 'skepticOppsBoost', magnitude: 10 },
  { id: 'slow_news',           subject: 'Quiet week out there',
    daveText: 'Not much happening in the market this week. No news is good news I suppose. Focus on the pipeline and make progress on your relationships.',
    effect: 'none' },
  { id: 'budget_season',       subject: 'Budget planning season — decision timelines shifting',
    daveText: 'A lot of our buyers are in annual budget planning mode. Expect slower responses but bigger decisions.',
    effect: 'futureOppsValueBoost', magnitude: 1.15 },
  { id: 'staffing_changes',    subject: 'Heads up — leadership changes at several accounts',
    daveText: 'Heard from a few contacts that there have been some VP-level changes. Champions may have lost their sponsor.',
    effect: 'championOppsTemperatureDrop', magnitude: 15 },
  { id: 'widget_shortage',     subject: 'Supply chain news — actually works in our favour',
    daveText: 'Widget supply issues in the market are pushing companies to get their operations in order. Good week to push on operational pain points.',
    effect: 'operationsBuyerBoost', magnitude: 8 },
];

export const SKILL_TREE = {
  bronze: [
    { id: 'closer_instinct',  label: 'Closer Instinct',  icon: '🎯', desc: 'Close call dialogue scores carry a permanent +5 probability bonus on all future close calls.', effect: 'closeCallProbBonus', magnitude: 5 },
    { id: 'quick_scheduler',  label: 'Quick Scheduler',  icon: '📅', desc: 'Scheduling a demo or pricing meeting costs 0 actions instead of 1.', effect: 'schedulingFree' },
    { id: 'thick_skin',       label: 'Thick Skin',       icon: '🛡️', desc: 'Lost deals no longer reduce your win streak.', effect: 'streakProtection' },
    { id: 'speed_reader',     label: 'Speed Reader',     icon: '⚡', desc: 'The maths proposal mini-game timer extends to 15 seconds instead of 10.', effect: 'proposalTimerExtend', magnitude: 5 },
  ],
  silver: [
    { id: 'slide_master',         label: 'Slide Master',        icon: '🃏', desc: 'Two slides per demo show a star hint indicating good picks for this buyer.', effect: 'slidePicker2Hints' },
    { id: 'relationship_player',  label: 'Relationship Player', icon: '🤝', desc: 'Pre-demo and pre-pricing calls cost 0 actions. Temperature boosts doubled.', effect: 'callsAreFree' },
    { id: 'pattern_recognition',  label: 'Pattern Recognition', icon: '🔎', desc: 'Buyer personality type is revealed on the kanban card after the demo is hosted.', effect: 'personalityRevealPostDemo' },
    { id: 'confident_opener',     label: 'Confident Opener',    icon: '📞', desc: 'The first dialogue round of every call is automatically scored as correct.', effect: 'autoCorrectRound1' },
  ],
  gold: [
    { id: 'deal_anchor',    label: 'Deal Anchor',    icon: '⚓', desc: 'Buyer walkaway risk in Deal or No Deal starts 20% lower.', effect: 'walkawayRiskReduction', magnitude: 20 },
    { id: 'market_reader',  label: 'Market Reader',  icon: '📰', desc: "Dave's weekly market email now includes the mechanical effect description.", effect: 'marketEventTransparency' },
    { id: 'elite_closer',   label: 'Elite Closer',   icon: '💼', desc: 'Win rate on fully completed opportunities increases.', effect: 'winRateBoost', magnitude: 0.07 },
    { id: 'time_lord',      label: 'Time Lord',      icon: '⏱️', desc: 'Gain 1 bonus action every Monday.', effect: 'mondayBonusAction' },
  ],
};

export const COLLEAGUE_COMMENTS = [
  { from: 'Marcus Webb', subject: 'Nice work', body: "Heard you closed one — nice work. Buy you a coffee sometime?" },
  { from: 'Diana Park', subject: 'Big deal', body: "That last one was a big deal. Well done." },
  { from: 'Kevin Okafor', subject: 'You\'re making us look bad', body: "Saw the CRM update. Three closes this month — you're making the rest of us look bad." },
  { from: 'Elena Johansson', subject: 'Quick question', body: "Quick one — how did you handle that last objection? Want to steal your approach." },
  { from: 'Patrick Ali', subject: 'Leaderboard', body: "Just saw the leaderboard. You've moved up. Impressive." },
  { from: 'Fatima Brennan', subject: 'Dave mentioned you', body: "Nice work on the numbers. Dave mentioned you in the all-hands." },
  { from: 'George Schmidt', subject: 'How did you crack them?', body: "Tried to call that account last month and got nowhere. How did you do it?" },
  { from: 'Yuki Martin', subject: 'Bonus structure', body: "Heard the bonus structure is changing. If your streak keeps up you should do well." },
  { from: 'Marcus Webb', subject: 'Talk of the floor', body: "You're the talk of the floor. Keep it up." },
  { from: 'Diana Park', subject: 'Legend', body: "Legend. That's all." },
];

const FAREWELL_TEMPLATES = {
  won: {
    analytical: (name) => `${name} here. The numbers checked out. Looking forward to getting started. Please send the onboarding documentation.`,
    relationshipBuilder: (name) => `Really glad we got to work together on this. Your team made the process easy. See you at kick-off.`,
    impatient: (name) => `Done. Contract signed. Let's get moving — when can we start implementation?`,
    skeptic: (name) => `I'll be honest — I was not sure at first. But you addressed my concerns directly. That mattered.`,
    champion: (name) => `I have been pushing for this internally for weeks. So glad it finally happened. The team is excited.`,
  },
  lost: {
    analytical: (name) => `We went with a vendor whose TCO model was more detailed. Nothing personal.`,
    relationshipBuilder: (name) => `I really enjoyed our conversations. The timing just wasn't right. I'll keep you in mind.`,
    impatient: (name) => `We needed to move faster. We've signed elsewhere. Good luck.`,
    skeptic: (name) => `Couldn't get comfortable with the risk. May revisit in future.`,
    champion: (name) => `My VP went a different direction. Out of my hands. Sorry.`,
  },
  nad: {
    _all: (name) => `${name}: Appreciate your time. Not the right moment for us. I'll be in touch if that changes.`,
  },
};

// ─── Opportunity generation ───────────────────────────────────────────────────

let _oppIdCounter = 100;

export function generateOpportunity(gameState) {
  const gm        = gameState.date.gameMonth;
  const baseValue = gm >= 10 ? 38000 : gm <= 2 ? 20000 : 26000;
  const value     = Math.round((baseValue + (Math.random() - 0.5) * baseValue * 0.6) / 1000) * 1000;
  const prob      = Math.round(35 + Math.random() * 50); // 35–85%

  const flavour   = randomFrom(FLAVOUR_NOTES);

  const opp = {
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
    futureClosedDay:     null,

    bdrNotes: buildBdrNotes(value, flavour.buyerProfile),

    urgency: 'green',
    log: [`${formatDate(gameState.date)}: Inbound booking received`],

    // Sprint 4
    personalityType:     pickPersonality(),
    personalityRevealed: false,
    temperature:         75,
    temperatureHistory:  [],
    probBoost:           0,
    proposalMultiplier:  1.0,

    // Sprint 5 — close call communication style
    closePersonalityType:     CLOSE_PERSONALITY_KEYS[Math.floor(Math.random() * CLOSE_PERSONALITY_KEYS.length)],
    closePersonalityRevealed: false,
  };

  // Apply personality modifiers
  const pers = BUYER_PERSONALITIES[opp.personalityType];
  if (pers) {
    if (pers.baseProbModifier) opp.prob = Math.max(10, opp.prob + pers.baseProbModifier);
    if (pers.deadlineModifier) opp.scheduleBy = Math.max(1, Math.floor(DEMO_SCHEDULE_DEADLINE * pers.deadlineModifier) + gameState.dayNumber);
  }
  return opp;
}

// ─── Leaderboard builder ──────────────────────────────────────────────────────

function _buildLeaderboard() {
  const names = ['Marcus Webb','Diana Park','Kevin Okafor','Elena Johansson','Patrick Ali','Fatima Brennan','George Schmidt','Yuki Martin'];
  return names.map(name => ({ name, attainment: 0, dealsWon: 0, revenue: 0 }));
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialState() {
  return {
    dayNumber:          0,
    date:               dayNumberToDate(0),  // Q1·M1·W1·D1

    actionsRemaining:   ACTIONS_PER_DAY,

    quota:              QUOTA_START,
    won:                0,                  // cumulative all-time
    monthRevenue:       0,                  // won this game month
    quarterMonthHits:   [false, false, false],
    wonDeals:           [],

    opportunities:      [],
    calendarEvents:     [],
    emails:             [],
    spamSent:           [],

    employeeId:         String(Math.floor(100000 + Math.random() * 900000)),
    avatarIndex:        0,

    activeBDR:          null,
    availableBDRs:      ['none'],
    q1AboveQuota:       false,
    q2AboveQuota:       false,
    pendingBDRReminder: false,

    // Meeting interruptions
    pendingMeeting:     null,

    // Pipeline review
    pipelineReviewIgnoreCount: 0,
    pipelineReviewSentWeek:    -1,
    pipelineReviewSubmitted:   false,
    pipelineReviewEmailId:     null,
    forecastSubmissions:       {},
    pendingFired:              false,

    // Sprint 4
    playerSkills:            [],
    currentWinStreak:        0,
    winStreakPeak:            0,
    winCount:                0,
    colleagueCommentsSent:   [],
    activeMarketEffects:     [],
    weeklySlideModifiers:    {},
    pendingQuarterlyReview:  false,
    leaderboard:             _buildLeaderboard(),
    pendingWinBanner:        null,

    // Sprint 5 — performance tracking
    performanceHistory:      [],
    currentMonthRevenue:     0,
    currentQuarterRevenue:   0,
    currentYearRevenue:      0,
    monthlyQuota:            80000,
    projectedYearlyQuota:    Array(12).fill(80000),
    territoryLevel:          0,
    titleProgress:           0,
    birthdayFiredThisMonth:  false,
    gameCompleted:           false,
    dealsWonThisMonth:       0,
    dealsLostThisMonth:      0,
    dealsNADThisMonth:       0,
    consecutiveDaysNoDemoBooking: 0,
    waterCoolerFired:        false,
    pendingWaterCooler:      false,
  };
}

// ─── Skill helper ─────────────────────────────────────────────────────────────

export function hasSkill(state, skillId) {
  return Array.isArray(state.playerSkills) && state.playerSkills.includes(skillId);
}

// ─── getCurrentMonthRecord helper ────────────────────────────────────────────

export function getCurrentMonthRecord(state) {
  return {
    quarter: state.date.quarter,
    month: state.date.gameMonth,
    monthInQuarter: state.date.month,
    quota: state.monthlyQuota || state.quota || 80000,
    revenue: state.currentMonthRevenue || 0,
    attainment: Math.round(((state.currentMonthRevenue || 0) / (state.monthlyQuota || state.quota || 80000)) * 100),
    dealsWon: state.dealsWonThisMonth || 0,
    dealsLost: state.dealsLostThisMonth || 0,
    dealsNAD: state.dealsNADThisMonth || 0,
    hitQuota: (state.currentMonthRevenue || 0) >= (state.monthlyQuota || state.quota || 80000),
    inProgress: true,
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
      if (!hasSkill(draft, 'schedulingFree')) { draft.actionsRemaining--; }
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
      // Personality reveal after demo (pattern_recognition skill)
      if (hasSkill(draft, 'personalityRevealPostDemo')) o.personalityRevealed = true;
      // Temperature boost for hosting demo on time
      if (o.demoDay !== null && draft.dayNumber <= o.demoDay) {
        o.temperature = Math.min(100, (o.temperature || 75) + 5);
      }
      // Store demo score on opp
      o.demoScore = grade === 'A' ? 90 : grade === 'B' ? 70 : grade === 'C' ? 50 : 25;
      // Champion: stakeholder flag
      if (o.personalityType === 'champion' && !o._championStakeholderSent) {
        o._championStakeholderSent = true;
      }
      {
        const gradeReaction = grade === 'A'
          ? 'The buyer was engaged throughout and asked detailed follow-up questions.'
          : grade === 'B'
          ? 'The buyer responded positively to most of the presentation with a few questions outstanding.'
          : grade === 'C'
          ? 'Interest levels were mixed — the buyer seemed distracted for portions of the presentation.'
          : 'The buyer appeared disengaged. Several slides did not land as intended.';
        const tempLabel = (o.temperature || 75) >= 75 ? 'Hot' : (o.temperature || 75) >= 50 ? 'Warm' : (o.temperature || 75) >= 25 ? 'Cooling' : 'Cold';
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `Demo Complete — ${opp.company} — Grade ${grade}`,
          body: `Your demo with ${opp.name} at ${opp.company} is complete.\n\nDEMO GRADE: ${grade}\nBUYER REACTION: ${gradeReaction}\n\nDEAL INTELLIGENCE:\nEstimated deal value: $${o.value.toLocaleString()}\nLikelihood to close: ${o.prob}%\nBuyer temperature: ${tempLabel}\n\nNEXT STEP: Schedule a pricing meeting within 5 business days.`,
          time: formatDate(draft.date),
          type: 'task',
          oppId,
          actionType: 'schedule-pricing',
        }));
      }
      // BDR auto follow-up
      const followBdr = getActiveBDR(draft);
      if (followBdr.autoActions.includes('autoFollowUp')) {
        draft.emails.push(makeEmail({
          from: `BDR — ${followBdr.name}`,
          subject: `Follow-up sent to ${opp.company}`,
          body: `I've sent a recap email to ${opp.name} at ${opp.company} covering key demo takeaways and asking about next steps.\n\n— ${followBdr.name}`,
          time: formatDate(draft.date), type: 'bdr', oppId,
        }));
      }
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
      if (!hasSkill(draft, 'schedulingFree')) { draft.actionsRemaining--; }
      // Champion: stakeholder email
      if (o.personalityType === 'champion' && !o._championStakeholderSent) {
        o._championStakeholderSent = true;
        draft.emails.push(makeEmail({
          from: 'CRM System', subject: `Note — ${o.company} may have additional decision makers`,
          body: `${o.name} mentioned they need to loop in a colleague before the pricing meeting. You may be presenting to more than one person.`,
          time: formatDate(draft.date), type: 'info', oppId: o.id,
        }));
      }
    }
  };
}

export function actionBuildProposal(state, oppId, miniGameScore, valueMultiplier = 1.0, proposalScore) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                              return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.PROPOSAL)     return { success: false, message: 'Not in proposal stage.' };
  if (state.actionsRemaining <= 0)       return { success: false, message: 'No actions remaining today.' };

  const probAdjust = miniGameScore >= 90 ? 15 : miniGameScore >= 70 ? 8 : miniGameScore >= 50 ? 0 : -5;

  return {
    success: true,
    message: `Proposal built! Score ${miniGameScore}/100.`,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.stage              = STAGES.PRICING_SCHEDULED;
      o.proposalBuiltDay   = draft.dayNumber;
      o.proposalMultiplier = valueMultiplier;
      o.prob               = Math.max(5, Math.min(95, o.prob + probAdjust));
      o.proposalScore      = proposalScore !== undefined ? proposalScore : 50;
      o.log.push(`${formatDate(draft.date)}: Proposal built. Score ${miniGameScore}. Mult ${valueMultiplier}. Prob → ${o.prob}%`);
      draft.actionsRemaining--;
    }
  };
}

export function actionHostPricing(state, oppId, miniGameScore, finalValue = null, pricingScore) {
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
      o.pricingScore     = pricingScore !== undefined ? pricingScore : 50;
      o.log.push(`${formatDate(draft.date)}: Pricing hosted. Score ${miniGameScore}. Prob → ${o.prob}%`);
      draft.actionsRemaining--;
      draft.emails.push(makeEmail({
        from: 'CRM System',
        subject: `Pricing complete — ${opp.company} — call to close`,
        body: `Pricing meeting complete with ${o.name} at ${o.company}.\n\nFinal deal value: $${o.value.toLocaleString()}\nClose probability: ${o.prob}%\n\nCall them by ${formatDate(dayNumberToDate(o.liveCallBy))} or this opportunity will be marked lost.`,
        time: formatDate(draft.date),
        type: 'task',
        oppId,
      }));
    }
  };
}

export function actionBuyerWalkaway(state, oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp) return { success: false, message: 'Opportunity not found.' };
  return {
    success: true,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.stage = STAGES.LOST;
      o.log.push(`${formatDate(draft.date)}: LOST — buyer walked away during pricing meeting`);
      draft.actionsRemaining = Math.max(0, draft.actionsRemaining - 1);
      draft.emails.push(makeEmail({
        from: 'CRM System',
        subject: `Lost — ${o.company} walked away`,
        body: `${o.name} at ${o.company} withdrew during the pricing meeting.\n\nThey had seen enough. Deal lost.\n\nDeal value lost: $${o.value.toLocaleString()}`,
        time: formatDate(draft.date), type: 'loss', oppId: o.id,
      }));
    }
  };
}

export function actionCloseCall(state, oppId, miniGameScore) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                              return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.LIVE_CALL)    return { success: false, message: 'Not in live call stage.' };
  if (opp.pricingHostedDay === state.dayNumber)
    return { success: false, message: 'You just had the pricing meeting today. Give them at least one day before calling to close.' };
  if (state.actionsRemaining <= 0)       return { success: false, message: 'No actions remaining today.' };

  // Cumulative scoring system
  const demoScore     = opp.demoScore     || 50;
  const proposalScore = opp.proposalScore || 50;
  const pricingScore  = opp.pricingScore  || 50;
  const dialogueScore = miniGameScore;

  const cumulative = Math.round(
    demoScore     * 0.3 +
    proposalScore * 0.3 +
    pricingScore  * 0.2 +
    dialogueScore * 0.2
  );

  // Base win/loss rates from cumulative score (NAD always fills remainder to ~50%)
  let baseWin, baseLoss;
  if      (cumulative >= 90) { baseWin = 40; baseLoss = 10; }
  else if (cumulative >= 75) { baseWin = 32; baseLoss = 18; }
  else if (cumulative >= 60) { baseWin = 25; baseLoss = 25; }
  else if (cumulative >= 40) { baseWin = 15; baseLoss = 35; }
  else                       { baseWin =  8; baseLoss = 42; }

  // Temperature modifier
  const temp = opp.temperature || 50;
  const tempWinMod  = temp >= 75 ? 8 : temp >= 50 ? 0 : temp >= 25 ? -8 : -15;
  const tempLossMod = temp >= 75 ? -8 : temp >= 50 ? 0 : temp >= 25 ? 8 : 15;

  // Skills
  const closeBonus = hasSkill(state, 'closeCallProbBonus') ? 5 : 0;
  const winBoost   = hasSkill(state, 'winRateBoost') ? 7 : 0;

  // Market effects
  let marketWinMod = 0;
  (state.activeMarketEffects || []).forEach(e => {
    if (e.type === 'allOppsCloseProbBoost')    marketWinMod += 10;
    if (e.type === 'allOppsCloseProbPenalty')  marketWinMod -= 10;
  });

  // Personality modifier
  const persData = BUYER_PERSONALITIES[opp.personalityType];
  const persWinMod = (persData && persData.baseProbModifier) ? Math.round(persData.baseProbModifier / 3) : 0;

  let adjWin  = baseWin  + tempWinMod  + closeBonus + winBoost + marketWinMod + persWinMod;
  let adjLoss = baseLoss + tempLossMod - closeBonus - winBoost - marketWinMod - persWinMod;

  adjWin  = Math.max(0, Math.min(90, adjWin));
  adjLoss = Math.max(0, Math.min(90, adjLoss));
  const total = adjWin + adjLoss;
  if (total > 50) {
    const factor = 50 / total;
    adjWin  = Math.round(adjWin  * factor);
    adjLoss = Math.round(adjLoss * factor);
  }

  const roll = Math.random() * 100;
  let outcome;
  if      (roll < adjWin)            outcome = 'won';
  else if (roll < adjWin + adjLoss)  outcome = 'lost';
  else                               outcome = 'nad';

  return {
    success: true,
    message: `Call complete. Outcome: ${outcome}.`,
    outcome,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.liveCalledDay = draft.dayNumber;
      o.log.push(`${formatDate(draft.date)}: Close call. Score ${miniGameScore}. Roll → ${outcome}`);
      draft.actionsRemaining--;

      if (outcome === 'won') {
        o.stage = STAGES.WON;
        draft.won                  += o.value;
        draft.monthRevenue         += o.value;
        draft.currentMonthRevenue   = (draft.currentMonthRevenue || 0) + o.value;
        draft.currentYearRevenue    = (draft.currentYearRevenue || 0) + o.value;
        draft.dealsWonThisMonth     = (draft.dealsWonThisMonth || 0) + 1;
        draft.wonDeals.push({ oppId, value: o.value, day: draft.dayNumber, name: o.name, company: o.company });
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `Won! ${o.company} signed — $${o.value.toLocaleString()}`,
          body: `Congratulations! ${o.name} at ${o.company} has signed.\n\n$${o.value.toLocaleString()} added to your total.\n\nYou're now at $${draft.won.toLocaleString()} total won this quarter.`,
          time: formatDate(draft.date), type: 'win', oppId,
        }));
        // Win streak tracking
        draft.currentWinStreak = (draft.currentWinStreak || 0) + 1;
        draft.winCount = (draft.winCount || 0) + 1;
        if (draft.currentWinStreak > (draft.winStreakPeak || 0)) draft.winStreakPeak = draft.currentWinStreak;
        // Update leaderboard player attainment
        draft._leaderboardPlayerAttainment = Math.round((draft.won / draft.quota) * 100);
        // 5-streak Dave email
        if (draft.currentWinStreak === 5) {
          draft.emails.push(makeEmail({
            from: 'Manager — Dave H.', subject: 'Sales rep of the month looking very possible',
            body: 'Whatever you are doing, keep doing it. That is a five-deal streak. Sales rep of the month is looking very possible.\n\nDave',
            time: formatDate(draft.date), type: 'manager',
          }));
        }
        // Colleague comment every 3rd win
        if (draft.winCount % 3 === 0) {
          const unsent = COLLEAGUE_COMMENTS.filter((_, i) => !(draft.colleagueCommentsSent || []).includes(i));
          if (unsent.length > 0) {
            const idx = COLLEAGUE_COMMENTS.indexOf(unsent[0]);
            const cc = unsent[0];
            draft.emails.push(makeEmail({
              from: cc.from, subject: cc.subject, body: cc.body,
              time: formatDate(draft.date), type: 'colleague',
            }));
            (draft.colleagueCommentsSent = draft.colleagueCommentsSent || []).push(idx);
          }
        }
        // Farewell email from buyer (won)
        const wonPers = o.personalityType || 'analytical';
        const wonFarewellFn = (FAREWELL_TEMPLATES.won[wonPers] || FAREWELL_TEMPLATES.won.analytical);
        draft.emails.push(makeEmail({
          from: `${o.name} — ${o.company}`, subject: `Re: Next steps`,
          body: wonFarewellFn(o.name.split(' ')[0]),
          time: formatDate(draft.date), type: 'win', oppId,
        }));
        // Trigger win banner
        draft.pendingWinBanner = { company: o.company, value: o.value };
      } else if (outcome === 'lost') {
        o.stage = STAGES.LOST;
        draft.dealsLostThisMonth = (draft.dealsLostThisMonth || 0) + 1;
        // Win streak reset (unless thick_skin skill)
        if (!hasSkill(draft, 'streakProtection')) draft.currentWinStreak = 0;
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `Lost — ${o.company} went with a competitor`,
          body: `${o.name} at ${o.company} has decided to go with another solution.\n\nDeal value lost: $${o.value.toLocaleString()}.`,
          time: formatDate(draft.date), type: 'loss', oppId,
        }));
        // Farewell email (lost)
        const lostPers = o.personalityType || 'analytical';
        const lostFarewellFn = (FAREWELL_TEMPLATES.lost[lostPers] || FAREWELL_TEMPLATES.lost.analytical);
        draft.emails.push(makeEmail({
          from: `${o.name} — ${o.company}`, subject: `Re: Our evaluation`,
          body: lostFarewellFn(o.name.split(' ')[0]),
          time: formatDate(draft.date), type: 'loss', oppId,
        }));
      } else {
        o.stage          = STAGES.FUTURE;
        o.futureExpiry   = draft.dayNumber + FUTURE_REBOOK_WINDOW;
        o.futureClosedDay = draft.dayNumber;
        draft.dealsNADThisMonth = (draft.dealsNADThisMonth || 0) + 1;
        draft.emails.push(makeEmail({
          from: 'CRM System',
          subject: `No decision — ${o.company} moved to futures`,
          body: `${o.name} at ${o.company} is not ready to move forward right now.\n\nAdded to your futures book. You have ${FUTURE_REBOOK_WINDOW} days to rebook.`,
          time: formatDate(draft.date), type: 'info', oppId,
        }));
        // NAD farewell email
        draft.emails.push(makeEmail({
          from: `${o.name} — ${o.company}`, subject: `Re: Our conversation`,
          body: FAREWELL_TEMPLATES.nad._all(o.name.split(' ')[0]),
          time: formatDate(draft.date), type: 'info', oppId,
        }));
      }
    }
  };
}

export function actionTouchBase(state, oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                           return { success: false, message: 'Opportunity not found.' };
  if (state.actionsRemaining <= 0)    return { success: false, message: 'No actions remaining today.' };

  const messages = [
    `Left a voicemail for ${opp.name}. They sounded engaged.`,
    `Sent a quick check-in to ${opp.name}. Waiting to hear back.`,
    `Had a brief chat with ${opp.name} — everything still on track.`,
    `Touched base with ${opp.name} at ${opp.company}. They're looking forward to it.`,
    `Brief conversation with ${opp.name}. Confirmed interest.`,
    `${opp.name} confirmed they're still evaluating. Good to stay top of mind.`,
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return {
    success: true,
    message: msg,
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      const tbPers = BUYER_PERSONALITIES[o.personalityType];
      const tbMult = tbPers ? (tbPers.callBonusMultiplier || 1.0) : 1.0;
      const tbBonus = Math.round(10 * tbMult);
      const tbFree  = hasSkill(draft, 'callsAreFree');
      o.temperature = Math.min(100, (o.temperature || 75) + (tbFree ? tbBonus * 2 : tbBonus));
      (o.temperatureHistory = o.temperatureHistory || []).push({ day: draft.dayNumber, delta: tbFree ? tbBonus * 2 : tbBonus, reason: 'touch-base' });
      o.log.push(`${formatDate(draft.date)}: Touch base call`);
      if (!o.closePersonalityRevealed) o.closePersonalityRevealed = true;
      if (!tbFree) { draft.actionsRemaining--; }
    }
  };
}

export function actionPrepCloseCall(state, oppId) {
  const opp = state.opportunities.find(o => o.id === oppId);
  if (!opp)                           return { success: false, message: 'Opportunity not found.' };
  if (opp.stage !== STAGES.LIVE_CALL) return { success: false, message: 'Opportunity is not in the closing stage.' };
  if (state.actionsRemaining <= 0)    return { success: false, message: 'No actions remaining today.' };
  const cp = CLOSE_PERSONALITY_TYPES[opp.closePersonalityType] || {};
  return {
    success: true,
    revealed: !opp.closePersonalityRevealed,
    closePersonalityType:  opp.closePersonalityType,
    closePersonalityLabel: cp.label || opp.closePersonalityType,
    closePersonalityIcon:  cp.icon  || '?',
    closePersonalityHint:  cp.hint  || '',
    apply(draft) {
      const o = draft.opportunities.find(x => x.id === oppId);
      o.closePersonalityRevealed = true;
      o.log.push(`${formatDate(draft.date)}: Pre-close prep call — communication style identified`);
      draft.actionsRemaining--;
    }
  };
}

export function actionSubmitForecast(state, submissions) {
  if (state.actionsRemaining <= 0) return { success: false, message: 'No actions remaining today.' };
  return {
    success: true,
    apply(draft) {
      draft.forecastSubmissions   = { ...draft.forecastSubmissions, ...submissions };
      draft.pipelineReviewSubmitted = true;
      draft.pipelineReviewIgnoreCount = 0;
      draft.actionsRemaining = Math.max(0, draft.actionsRemaining - 1);
      // Update the pipeline review email body with confirmation
      if (draft.pipelineReviewEmailId) {
        const email = draft.emails.find(e => e.id === draft.pipelineReviewEmailId);
        if (email) {
          email.body += '\n\n—\nForecast submitted. Thanks.\n— CRM System';
          email.submitted = true;
        }
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

// ─── Market event helpers ─────────────────────────────────────────────────────

function _applyMarketEvent(draft, event, today) {
  const activeOpps = draft.opportunities.filter(o => ![STAGES.WON, STAGES.LOST, STAGES.SUSPENDED].includes(o.stage));
  switch (event.effect) {
    case 'allOppsCloseProbBoost':
      activeOpps.forEach(o => { o.probBoost = (o.probBoost || 0) + event.magnitude; });
      draft.activeMarketEffects.push({ type: event.effect, expiryDay: today + (event.duration || 5) });
      break;
    case 'randomOppsCloseProbDrop': {
      const picks = [...activeOpps].sort(() => Math.random() - 0.5).slice(0, event.affectedCount || 2);
      picks.forEach(o => { o.prob = Math.max(5, o.prob - event.magnitude); });
      break;
    }
    case 'slideWeightShift':
      draft.activeMarketEffects.push({ type: 'slideWeightShift', tags: event.affectedTags, magnitude: event.magnitude, expiryDay: today + 5 });
      break;
    case 'randomOppSuspended': {
      const suspendable = activeOpps.filter(o => ![STAGES.LIVE_CALL].includes(o.stage));
      if (suspendable.length > 0) {
        const target = suspendable[Math.floor(Math.random() * suspendable.length)];
        target.previousStage = target.stage;
        target.stage = STAGES.SUSPENDED;
        target.resumeDay = today + (event.suspendDays || 20);
        draft.emails.push(makeEmail({
          from: 'CRM System', subject: `Account suspended — ${target.company}`,
          body: `${target.name} at ${target.company} is undergoing an acquisition review. Their evaluation has been paused for approximately ${event.suspendDays || 20} days. The deal will reactivate automatically.`,
          time: formatDate(draft.date), type: 'info', oppId: target.id,
        }));
      }
      break;
    }
    case 'bonusOppGenerated': {
      const bonusOpp = generateOpportunity(draft);
      bonusOpp.prob = Math.min(95, bonusOpp.prob + (event.probBonus || 0));
      bonusOpp.value = Math.round(bonusOpp.value * (event.valueBonus || 1.0));
      draft.opportunities.push(bonusOpp);
      const bdrRef = getActiveBDR(draft);
      draft.emails.push(makeEmail({
        from: bonusOpp.name + ' — ' + bonusOpp.company,
        subject: `New demo request — ${bonusOpp.company} (referral)`,
        body: `Hi,\n\nI was referred to you by one of your existing customers. ${bonusOpp.flavourNote}\n\nLooking forward to a demo.\n\nBest,\n${bonusOpp.name}`,
        time: formatDate(draft.date), type: 'task', oppId: bonusOpp.id, actionType: 'schedule-demo',
      }));
      break;
    }
    case 'liveCallOppsBoost':
      activeOpps.filter(o => o.stage === STAGES.LIVE_CALL).forEach(o => { o.probBoost = (o.probBoost || 0) + event.magnitude; });
      draft.activeMarketEffects.push({ type: event.effect, expiryDay: today + (event.duration || 5) });
      break;
    case 'skepticOppsBoost':
      activeOpps.filter(o => o.personalityType === 'skeptic').forEach(o => { o.prob = Math.min(95, o.prob + event.magnitude); });
      break;
    case 'championOppsTemperatureDrop':
      activeOpps.filter(o => o.personalityType === 'champion').forEach(o => { o.temperature = Math.max(0, (o.temperature || 75) - event.magnitude); });
      break;
    case 'operationsBuyerBoost':
      activeOpps.filter(o => o.buyerProfile === 'operations').forEach(o => { o.prob = Math.min(95, o.prob + event.magnitude); });
      break;
    case 'none':
    default:
      break;
  }
}

function _marketEffectDesc(event) {
  const descs = {
    allOppsCloseProbBoost: `+${event.magnitude}% probability boost to all active deals for ${event.duration} days`,
    randomOppsCloseProbDrop: `${event.affectedCount} random active deals lose ${event.magnitude}% probability`,
    slideWeightShift: `${(event.affectedTags||[]).join(', ')} slide tags score +${event.magnitude} in demos this week`,
    randomOppSuspended: `One active deal will be suspended for ${event.suspendDays} days`,
    bonusOppGenerated: `A bonus inbound opportunity has been added with +${event.probBonus}% probability`,
    liveCallOppsBoost: `Live call stage deals get +${event.magnitude}% probability for ${event.duration} days`,
    skepticOppsBoost: `Skeptic personality buyers get +${event.magnitude}% probability`,
    championOppsTemperatureDrop: `Champion personality buyers lose ${event.magnitude} relationship temperature`,
    operationsBuyerBoost: `Operations-profile buyers get +${event.magnitude}% probability`,
    none: 'No mechanical effect this week',
  };
  return descs[event.effect] || 'Unknown effect';
}

// ─── Day advance ──────────────────────────────────────────────────────────────

export function advanceDay(state) {
  const draft    = deepCopy(state);
  const prevDate = draft.date;
  draft.dayNumber++;
  draft.date             = dayNumberToDate(draft.dayNumber);
  draft.actionsRemaining = ACTIONS_PER_DAY;

  const today = draft.dayNumber;
  const { gameMonth, month: monthInQ, quarter } = draft.date;

  // ── Year-end detection (day 240 = start of non-existent year 2) ──
  if (draft.dayNumber === 240) {
    draft.pendingYearEnd = true;
    draft.gameCompleted  = true;
    return draft;
  }

  // ── Month / quarter transition ──
  if (gameMonth !== prevDate.gameMonth) {
    const prevMonthIdx = prevDate.month - 1; // 0-indexed within quarter
    const monthQuota   = draft.monthlyQuota || draft.quota || 80000;
    const monthRev     = draft.currentMonthRevenue || 0;
    const hitQuota     = monthRev >= monthQuota;
    const attainment   = monthQuota > 0 ? Math.round((monthRev / monthQuota) * 100) : 0;

    // Finalise current month record
    const finalisedRecord = {
      quarter: prevDate.quarter,
      month: prevDate.gameMonth,
      monthInQuarter: prevDate.month,
      quota: monthQuota,
      revenue: monthRev,
      attainment,
      dealsWon: draft.dealsWonThisMonth || 0,
      dealsLost: draft.dealsLostThisMonth || 0,
      dealsNAD: draft.dealsNADThisMonth || 0,
      hitQuota,
    };
    draft.performanceHistory.push(finalisedRecord);

    // Update titleProgress
    if (hitQuota) draft.titleProgress = (draft.titleProgress || 0) + 1;

    // Track quarter month hits (legacy compat)
    draft.quarterMonthHits[prevMonthIdx] = hitQuota;
    draft.monthRevenue = 0;

    const isQuarterEnd = (quarter !== prevDate.quarter);

    if (isQuarterEnd) {
      // Quarterly email
      const qStart = (prevDate.quarter - 1) * 3;
      const qRecords = draft.performanceHistory.slice(qStart, qStart + 3);
      const qRevenue = qRecords.reduce((a, m) => a + m.revenue, 0);
      const qQuota   = qRecords.reduce((a, m) => a + m.quota, 0);
      const quarterAttainment = qQuota > 0 ? Math.round((qRevenue / qQuota) * 100) : 0;
      const allHit   = qRecords.every(m => m.hitQuota);
      const anyHit   = qRecords.some(m => m.hitQuota);

      // Quota scaling
      if (allHit) {
        draft.quota       = Math.min(QUOTA_MAX, Math.round(draft.quota * QUOTA_INCREASE_PCT));
        draft.monthlyQuota = draft.quota;
        draft.territoryLevel = (draft.territoryLevel || 0) + 1;
      } else {
        draft.territoryLevel = Math.max(0, (draft.territoryLevel || 0) - 1);
      }

      const newMonthlyQuota = draft.monthlyQuota || draft.quota || 80000;

      let qBody;
      if (allHit) {
        qBody = `Q${prevDate.quarter} is in the books and you delivered. $${qRevenue.toLocaleString()} against a $${qQuota.toLocaleString()} quarterly target. Well done. I've been talking to regional about your territory and they've agreed to expand your patch. You'll start seeing more inbound bookings from next week — higher value accounts too. Don't let the pipeline get away from you. Quota goes up next quarter to $${newMonthlyQuota.toLocaleString()}/month. You earned it.`;
      } else if (anyHit) {
        qBody = `Mixed quarter. You had some good months and some that fell short. $${qRevenue.toLocaleString()} against $${qQuota.toLocaleString()}. Quota stays the same next quarter at $${newMonthlyQuota.toLocaleString()}/month. The territory stays as is. Focus on consistency — one good month doesn't make a quarter.`;
      } else {
        qBody = `Q${prevDate.quarter} was not good enough. $${qRevenue.toLocaleString()} against $${qQuota.toLocaleString()}. I've spoken with regional and they've asked us to pull back on some of the inbound volume until activity improves. Quota holds at $${newMonthlyQuota.toLocaleString()} but you'll notice fewer bookings coming through. Prove you can handle what you have before we expand your territory.`;
      }

      draft.emails.push(makeEmail({
        from: 'Manager — Dave H.',
        subject: `Q${prevDate.quarter} Wrap-Up — ${quarterAttainment}% — ${allHit ? 'Hit' : 'Missed'} Quota`,
        body: qBody,
        time: formatDate(draft.date), type: 'manager',
      }));

      // BDR unlocks on full quota completion
      if (allHit) {
        if (prevDate.quarter === 1 && !draft.availableBDRs.includes('senior')) {
          draft.q1AboveQuota = true;
          draft.availableBDRs.push('senior');
          draft.emails.push(makeEmail({
            from: 'HR System',
            subject: 'New BDR available — Q1 quota bonus',
            body: `Congratulations on hitting all 3 months of Q1!\n\nJordan Mills (Senior BDR) is now available for your territory. Visit the BDR panel to upgrade your team.\n\nHR System`,
            time: formatDate(draft.date), type: 'manager',
          }));
        }
        if (prevDate.quarter === 2 && !draft.availableBDRs.includes('elite')) {
          draft.q2AboveQuota = true;
          draft.availableBDRs.push('elite');
          draft.emails.push(makeEmail({
            from: 'HR System',
            subject: 'New BDR available — Q2 quota bonus',
            body: `Outstanding — Q2 quota hit all 3 months!\n\nSam Rivera (Elite BDR) is now available for your territory. Visit the BDR panel.\n\nHR System`,
            time: formatDate(draft.date), type: 'manager',
          }));
        }
      }

      draft.quarterMonthHits = [false, false, false];
      draft.pendingQuarterlyReview = true;
    } else {
      // Monthly wrap-up email (not month 3 of quarter — that's handled by quarterly email)
      let monthBody;
      if (attainment >= 100) {
        monthBody = `Strong month. You hit quota and then some. $${monthRev.toLocaleString()} against a $${monthQuota.toLocaleString()} target. Keep that energy going into Month ${prevDate.gameMonth + 1}. The pipeline is looking healthy.`;
      } else if (attainment >= 80) {
        monthBody = `Close but not quite. $${monthRev.toLocaleString()} against $${monthQuota.toLocaleString()}. You left some on the table. What's sitting in the pipeline that could have closed? Let's talk about it.`;
      } else if (attainment >= 60) {
        monthBody = `Below quota again. $${monthRev.toLocaleString()} against $${monthQuota.toLocaleString()}. I need to see more urgency. Your pipeline has deals in it — they need to move.`;
      } else {
        monthBody = `This is a problem. $${monthRev.toLocaleString()} against $${monthQuota.toLocaleString()}. I'm not going to sugarcoat it. We need a serious conversation about your activity levels. See me Monday.`;
      }
      draft.emails.push(makeEmail({
        from: 'Manager — Dave H.',
        subject: `Month ${prevDate.gameMonth} Wrap-Up — ${attainment}% to Goal`,
        body: monthBody,
        time: formatDate(draft.date), type: 'manager',
      }));
    }

    // Reset month trackers
    draft.currentMonthRevenue  = 0;
    draft.dealsWonThisMonth    = 0;
    draft.dealsLostThisMonth   = 0;
    draft.dealsNADThisMonth    = 0;
    draft.birthdayFiredThisMonth = false;

    // Leaderboard reset for new month
    if (draft.leaderboard) {
      draft.leaderboard.forEach(c => { c.attainment = 0; c.dealsWon = 0; c.revenue = 0; });
    }

    // Recalculate projectedYearlyQuota
    const completedMonths = draft.performanceHistory.length;
    draft.projectedYearlyQuota = (draft.projectedYearlyQuota || Array(12).fill(draft.monthlyQuota)).map((v, i) =>
      i < completedMonths ? draft.performanceHistory[i].quota : (draft.monthlyQuota || draft.quota || 80000)
    );
  }

  // ── Birthday check ──
  {
    const bProfile = (() => { try { const r = localStorage.getItem('phs_playerProfile'); return r ? JSON.parse(r) : null; } catch(e) { return null; } })();
    if (bProfile && bProfile.playerBirthMonth && draft.date.gameMonth === bProfile.playerBirthMonth && !draft.birthdayFiredThisMonth) {
      draft.birthdayFiredThisMonth = true;
      draft.pendingBirthday = bProfile.playerFirstName || 'there';
      draft.pendingBirthdayFav = bProfile.playerFavouriteThing || 'something';
    }
  }

  // ── Temperature decay ──
  draft.opportunities.forEach(o => {
    if ([STAGES.WON, STAGES.LOST, STAGES.SUSPENDED].includes(o.stage)) return;
    const pers = BUYER_PERSONALITIES[o.personalityType];
    const decayRate = pers ? (pers.temperatureDecayRate || 1.0) : 1.0;
    const dailyDecay = Math.round(2 * decayRate);
    o.temperature = Math.max(0, (o.temperature || 75) - dailyDecay);
  });

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

  // ── Resume suspended opps ──
  draft.opportunities.forEach(o => {
    if (o.stage === STAGES.SUSPENDED && o.resumeDay && today >= o.resumeDay) {
      o.stage = o.previousStage || STAGES.PRE_DEMO;
      delete o.resumeDay; delete o.previousStage;
      draft.emails.push(makeEmail({
        from: 'CRM System', subject: `Deal reactivated — ${o.company}`,
        body: `${o.name} at ${o.company}'s acquisition review is complete. Their evaluation has resumed.`,
        time: formatDate(draft.date), type: 'task', oppId: o.id,
      }));
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
    // BDR early expiry alert (5 days — Sam Rivera only)
    if (o.stage === STAGES.FUTURE && (o.futureExpiry - today) === 5 && !o._earlyAlertSent) {
      const earlyBdr = getActiveBDR(draft);
      if (earlyBdr.autoActions.includes('earlyExpiryAlert')) {
        o._earlyAlertSent = true;
        draft.emails.push(makeEmail({ from: `BDR — ${earlyBdr.name}`,
          subject: `[5 DAYS] ${o.company} expires soon`,
          body: `${o.name} at ${o.company} will fall out of your futures book in just 5 days.\n\nI'd recommend making your rebook call today.\n\n— ${earlyBdr.name}`,
          time: formatDate(draft.date), type: 'bdr', oppId: o.id }));
      }
    }
  });

  // ── Pipeline review ignore check (on Monday) ──
  const weekNum = Math.floor(today / 5);
  if (draft.date.day === 1) {
    const prevWeek = weekNum - 1;
    if (draft.pipelineReviewSentWeek >= 0 && draft.pipelineReviewSentWeek === prevWeek && !draft.pipelineReviewSubmitted) {
      draft.pipelineReviewIgnoreCount++;
      if (draft.pipelineReviewIgnoreCount >= 3) {
        draft.pendingFired = true;
      }
    }
    draft.pipelineReviewSubmitted = false;
  }

  // ── Pipeline review email (Monday, 40% chance) ──
  let pipelineReviewFired = false;
  if (draft.date.day === 1 && Math.random() < 0.40 && !draft.pendingFired) {
    pipelineReviewFired = true;
    const ic = draft.pipelineReviewIgnoreCount;
    let subject, body;
    if (ic === 0) {
      subject = 'Pipeline Review — I Need Your Numbers';
      body = "Hey, quick one. I need you to submit your close probability estimates for your active pipeline before end of week. Use the form below. This takes two minutes and helps me with forecasting. Don't make me ask twice.\n\n— Dave";
    } else if (ic === 1) {
      subject = 'Pipeline Review — You Didn\'t Respond Last Week';
      body = "I noticed you didn't respond to my pipeline review request last week. I need these numbers. This is not optional. Complete the form below before Friday or we will need to have a different conversation.\n\n— Dave";
    } else {
      subject = 'FINAL WARNING — Pipeline Forecast Required';
      body = "This is your final warning. I have asked you twice for your pipeline forecast. Submit it now using the form below. If I do not receive it by end of this week there will be consequences. I am not joking.\n\n— Dave";
    }
    const prEmail = makeEmail({
      from: 'Manager — Dave H.',
      subject,
      body,
      time: formatDate(draft.date),
      type: 'pipeline-review',
    });
    draft.emails.push(prEmail);
    draft.pipelineReviewSentWeek = weekNum;
    draft.pipelineReviewEmailId  = prEmail.id;
  }

  // ── Meeting interruption (non-Monday, 25% chance) ──
  draft.pendingMeeting = null;
  if (draft.date.day !== 1 && !pipelineReviewFired && Math.random() < 0.25) {
    draft.pendingMeeting = MEETING_EVENTS[Math.floor(Math.random() * MEETING_EVENTS.length)];
  }

  // ── Market event (Monday) ──
  if (draft.date.day === 1 && !draft.pendingFired) {
    const event = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    _applyMarketEvent(draft, event, today);
    const hasTransparency = hasSkill(draft, 'marketEventTransparency');
    let mktBody = `Hey,\n\n${event.daveText}`;
    if (hasTransparency) mktBody += `\n\n[Effect: ${_marketEffectDesc(event)}]`;
    mktBody += '\n\nDave';
    const weekInGame = (draft.date.quarter - 1) * 12 + (draft.date.month - 1) * 4 + draft.date.week;
    draft.emails.push(makeEmail({
      from: 'Manager — Dave H.',
      subject: `Q${draft.date.quarter} · M${draft.date.month} · Week ${weekInGame} — Market Update`,
      body: mktBody,
      time: formatDate(draft.date), type: 'manager',
    }));
  }

  // ── Clear expired market effects ──
  draft.activeMarketEffects = (draft.activeMarketEffects || []).filter(e => !e.expiryDay || today < e.expiryDay);
  // Recompute weeklySlideModifiers from active effects
  draft.weeklySlideModifiers = {};
  draft.activeMarketEffects.forEach(e => {
    if (e.type === 'slideWeightShift' && e.tags) {
      e.tags.forEach(tag => { draft.weeklySlideModifiers[tag] = (draft.weeklySlideModifiers[tag] || 0) + e.magnitude; });
    }
  });

  // ── New inbound bookings ──
  const rate                 = BOOKING_RATES[gameMonth] || 3.0;
  const bookingRateMultiplier = 1.0 + ((draft.territoryLevel || 0) * 0.2);
  const adjustedRate         = rate * bookingRateMultiplier;
  const dailyChance          = adjustedRate / 5;
  const roll1                = Math.random();
  const newBookings          = roll1 < dailyChance ? (Math.random() < 0.25 ? 2 : 1) : 0;

  function _sendBookingEmail(newOpp) {
    const bkBdr   = getActiveBDR(draft);
    const bdrTier = bkBdr.tier || 0;
    let bookingBody = `A new demo has been requested by ${newOpp.name} at ${newOpp.company}.`;
    if (bdrTier >= 1) bookingBody += `\n\n${newOpp.flavourNote}`;
    if (bdrTier >= 2) {
      const pers = BUYER_PERSONALITIES[newOpp.personalityType];
      const hintKey = `tier${Math.min(bdrTier, 4)}`;
      if (pers && pers.bdrHints && pers.bdrHints[hintKey]) {
        bookingBody += `\n\nBuyer Intelligence: ${pers.bdrHints[hintKey]}`;
      }
    }
    if (bdrTier >= 3) {
      // Jordan (tier 3) and Sam (tier 4) profile close communication style
      newOpp.closePersonalityRevealed = true;
      const cp = CLOSE_PERSONALITY_TYPES[newOpp.closePersonalityType];
      if (cp) bookingBody += `\n\nClose Style (${bkBdr.name}): ${cp.icon} ${cp.label} — ${cp.hint}`;
    }
    draft.emails.push(makeEmail({
      from:       'CRM System',
      subject:    `New Demo Request — ${newOpp.company}`,
      body:       bookingBody,
      time:       formatDate(draft.date),
      type:       'task',
      oppId:      newOpp.id,
      actionType: 'schedule-demo',
    }));
  }

  for (let i = 0; i < newBookings; i++) {
    const opp = generateOpportunity(draft);
    draft.opportunities.push(opp);
    _sendBookingEmail(opp);
  }

  // High-value opps on Monday if territoryLevel > 0
  if (draft.date.day === 1 && (draft.territoryLevel || 0) > 0) {
    for (let t = 0; t < draft.territoryLevel; t++) {
      const hvOpp   = generateOpportunity(draft);
      const hvValue = 40000 + (draft.territoryLevel - 1) * 15000;
      hvOpp.value     = hvValue;
      hvOpp.highValue = true;
      hvOpp.flavourNote = `${hvOpp.name} reached out directly after a referral from an existing account. They're evaluating solutions for a significant rollout and have executive sponsorship in place.`;
      draft.opportunities.push(hvOpp);
      _sendBookingEmail(hvOpp);
    }
  }

  // ── Water cooler event tracking ──
  draft.pendingWaterCooler = false;
  if (newBookings > 0) {
    draft.consecutiveDaysNoDemoBooking = 0;
  } else {
    draft.consecutiveDaysNoDemoBooking = (draft.consecutiveDaysNoDemoBooking || 0) + 1;
    if (draft.consecutiveDaysNoDemoBooking >= 3 && !draft.waterCoolerFired) {
      draft.pendingWaterCooler = true;
      draft.waterCoolerFired   = true;
      draft.consecutiveDaysNoDemoBooking = 0;
    }
  }

  // ── Weekly manager email (start of each week) ──
  if (draft.date.day === 1) {
    const curMonRev = draft.currentMonthRevenue || draft.monthRevenue || 0;
    const curQuota  = draft.monthlyQuota || draft.quota || 80000;
    const pct       = Math.round((curMonRev / curQuota) * 100);
    const weekNum   = Math.floor(draft.dayNumber / 5) + 1;
    const season    = getSeasonInfo(gameMonth);
    let msg;
    if (pct < 20)      msg = `We're only at ${pct}% of monthly quota. Let's talk urgently — pipeline needs work.`;
    else if (pct < 50) msg = `At ${pct}% of monthly quota. ${season.isSlow ? 'Slow period — keep loading futures.' : 'Good progress, keep pushing.'}`;
    else if (pct < 80) msg = `${pct}% of monthly quota — solid. Let's close what's in the pipeline.`;
    else               msg = `${pct}% of monthly quota — excellent! One or two more closes and we're there.`;

    draft.emails.push(makeEmail({
      from:    'Manager — Dave H.',
      subject: `Week ${weekNum} check-in: ${pct}% of monthly quota`,
      body:    `Hey,\n\n${msg}\n\nActive opps: ${draft.opportunities.filter(o => ![STAGES.WON, STAGES.LOST].includes(o.stage)).length}\nWon this month: $${curMonRev.toLocaleString()} of $${curQuota.toLocaleString()}\n\nTalk soon,\nDave`,
      time:    formatDate(draft.date), type: 'manager',
    }));
  }

  // ── BDR day-based unlock checks ──
  if (today === 5 && !draft.availableBDRs.includes('basic')) {
    draft.availableBDRs.push('basic');
    draft.emails.push(makeEmail({
      from: 'HR System',
      subject: 'A BDR has been assigned to your territory',
      body: `A Business Development Rep has been assigned to your territory.\n\nVisit the BDR panel in the header to get started. You can review available reps, check their benefits, and assign one to your account.\n\nHR System`,
      time: formatDate(draft.date), type: 'manager',
    }));
  }
  if (today === 20 && !draft.availableBDRs.includes('standard')) {
    draft.availableBDRs.push('standard');
    draft.emails.push(makeEmail({
      from: 'HR System',
      subject: 'Alex Chen is now available for hire',
      body: `Month 1 complete! Alex Chen (Junior BDR) is now available for your territory.\n\nAlex is a step up from Casey — neutral close rate impact and richer buyer intel.\n\nVisit the BDR panel to hire.\n\nHR System`,
      time: formatDate(draft.date), type: 'manager',
    }));
  }

  // ── BDR Monday actions ──
  if (draft.date.day === 1) {
    const mondayBdr = getActiveBDR(draft);
    const bdrActs   = mondayBdr.autoActions;

    // Daily reminder flag (consumed in main.js)
    if (bdrActs.includes('dailyReminder')) {
      draft.pendingBDRReminder = true;
    }

    // Monday bonus action (Time Lord skill)
    if (hasSkill(draft, 'mondayBonusAction')) {
      draft.actionsRemaining++;
    }

    // Auto-book demos (Jordan: top 1, Sam: top 2)
    if (bdrActs.includes('autoBookDemo')) {
      const limit    = bdrActs.includes('autoBookTop2') ? 2 : 1;
      const toBook   = draft.opportunities
        .filter(o => o.stage === STAGES.PRE_DEMO && o.scheduleBy >= today)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
      toBook.forEach(o => {
        const demoDay = today + 3;
        o.stage   = STAGES.DEMO_SCHEDULED;
        o.demoDay = demoDay;
        o.log.push(`${formatDate(draft.date)}: Demo auto-booked by ${mondayBdr.name} for ${formatDate(dayNumberToDate(demoDay))}`);
        draft.calendarEvents.push({ day: demoDay, oppId: o.id, type: 'demo' });
        draft.emails.push(makeEmail({
          from: `BDR — ${mondayBdr.name}`,
          subject: `Demo booked — ${o.company}`,
          body: `I've booked a demo with ${o.name} at ${o.company} for ${formatDate(dayNumberToDate(demoDay))}.\n\nI'll make sure they come prepared.\n\n— ${mondayBdr.name}`,
          time: formatDate(draft.date), type: 'bdr', oppId: o.id,
        }));
      });
    }

    // Auto future call (Jordan+)
    if (bdrActs.includes('autoFutureCall')) {
      const futureOpp = draft.opportunities.find(o => o.stage === STAGES.FUTURE && today <= o.futureExpiry);
      if (futureOpp) {
        futureOpp.futureExpiry = Math.min(futureOpp.futureExpiry + 5, today + FUTURE_REBOOK_WINDOW);
        draft.emails.push(makeEmail({
          from: `BDR — ${mondayBdr.name}`,
          subject: `Checked in with ${futureOpp.company}`,
          body: `I called ${futureOpp.name} at ${futureOpp.company} to keep the relationship warm. They're still interested — I extended their window by 5 days.\n\n— ${mondayBdr.name}`,
          time: formatDate(draft.date), type: 'bdr', oppId: futureOpp.id,
        }));
      }
    }
  }

  // ── BDR prep emails (1 day before scheduled demos) ──
  {
    const prepBdr = getActiveBDR(draft);
    if (prepBdr.autoActions.includes('prepEmails')) {
      draft.opportunities
        .filter(o => o.stage === STAGES.DEMO_SCHEDULED && o.demoDay === today + 1 && !o._prepSent)
        .forEach(o => {
          o._prepSent = true;
          let prepBody = `Demo with ${o.name} at ${o.company} is tomorrow (${formatDate(dayNumberToDate(o.demoDay))}).\n\nBuyer profile: ${o.buyerProfile}\n${o.flavourNote}`;
          if (prepBdr.tier >= 2 && o.bdrNotes) {
            prepBody += `\n\nAdditional intel:\n${o.bdrNotes.budget}\n${o.bdrNotes.timeline}\nKey contact: ${o.bdrNotes.stakeholder}`;
          }
          if (prepBdr.tier >= 4 && o.bdrNotes) {
            prepBody += `\nCompetitive: ${o.bdrNotes.competitive}`;
          }
          prepBody += `\n\nGood luck!\n— ${prepBdr.name}`;
          draft.emails.push(makeEmail({
            from: `BDR — ${prepBdr.name}`,
            subject: `Demo prep — ${o.company} (tomorrow)`,
            body: prepBody,
            time: formatDate(draft.date), type: 'bdr', oppId: o.id,
          }));
        });
    }
  }

  // ── Leaderboard daily drift ──
  if (draft.leaderboard) {
    draft.leaderboard.forEach(c => {
      c.attainment = Math.min(150, c.attainment + Math.floor(Math.random() * 10) + 1);
    });
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
  try { localStorage.setItem('phs_gameState', JSON.stringify(state)); return true; }
  catch (e) { console.error('Save failed:', e); return false; }
}

export function loadState() {
  try {
    let r = localStorage.getItem('phs_gameState');
    if (!r) {
      // Migration: check old key
      const old = localStorage.getItem('salesSim_state');
      if (old) {
        localStorage.setItem('phs_gameState', old);
        localStorage.removeItem('salesSim_state');
        r = old;
      }
    }
    return r ? JSON.parse(r) : null;
  }
  catch (e) { console.error('Load failed:', e); return null; }
}

export function clearState() {
  localStorage.removeItem('phs_gameState');
  // also clear old key if present
  localStorage.removeItem('salesSim_state');
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }

export function getActiveOpps(state) {
  return state.opportunities.filter(o => ![STAGES.WON, STAGES.LOST, STAGES.SUSPENDED].includes(o.stage));
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

export function getActiveBDR(state) {
  const id = state.activeBDR || 'none';
  return BDR_ROSTER.find(b => b.id === id) || BDR_ROSTER[0];
}

export function getBDRTier(state) {
  return getActiveBDR(state).tier;
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
