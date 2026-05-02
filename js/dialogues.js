/**
 * dialogues.js — Dialogue sequences for the call mini-game (Mini-game 3)
 * Each sequence has 4 rounds. Each round has 3 options, exactly one correct.
 * Buyer tone is embedded in the statement text; players must read to identify it.
 */

// ─── Close call dialogues (live opportunity, trying to close) ─────────────────

export const CLOSE_DIALOGUES = [
  {
    id: 'close-1',
    buyerOpener: "We've done our research. I need to know if this is actually going to work for a team like ours before I put it in front of my board.",
    rounds: [
      {
        buyerStatement: "Look, we've had vendors promise the world before and it didn't pan out. I just need specifics — how long does onboarding realistically take for a 200-person team?",
        options: [
          { style: 'Consultative', text: "That's a fair concern. For a team your size, most customers are fully onboarded in 4–6 weeks. Can I walk you through what that looks like step-by-step?", correct: true },
          { style: 'Assertive',   text: "Four to six weeks. We've done hundreds of rollouts this size. You have my word it'll be smooth.", correct: false },
          { style: 'Empathetic',  text: "I completely understand — getting let down by a vendor is really frustrating. I'm sorry you've had that experience.", correct: false },
        ]
      },
      {
        buyerStatement: "What I really need is references. Not case studies — actual customers I can call who've been through this.",
        options: [
          { style: 'Consultative', text: "Absolutely. What industry or use case would be most relevant for you? I'll connect you with two or three customers who match your profile.", correct: true },
          { style: 'Assertive',   text: "I can get you five references today. What's your email?", correct: false },
          { style: 'Empathetic',  text: "Of course — you want to make sure you're making the right call. I'd want that too.", correct: false },
        ]
      },
      {
        buyerStatement: "The price is higher than the other two options we're looking at. You'd need to help me make the case internally.",
        options: [
          { style: 'Consultative', text: "Let's build that case together. What metrics does your board care about most — cost reduction, time savings, or risk mitigation?", correct: true },
          { style: 'Assertive',   text: "We're not the cheapest option, but we're consistently the highest-ROI. Once you run the numbers, it's clear.", correct: false },
          { style: 'Empathetic',  text: "I hear you — budget conversations are always tough. What kind of pushback are you expecting?", correct: false },
        ]
      },
      {
        buyerStatement: "I want to move forward, but I need a signed pilot agreement — not a full contract — so I can test without committing the whole budget.",
        options: [
          { style: 'Consultative', text: "A pilot makes a lot of sense given what you've shared. I can structure a 30-day paid pilot scoped around your top two use cases. Want me to put that together?", correct: true },
          { style: 'Assertive',   text: "A pilot adds delay and complexity. Let me push for a short-term contract instead — same flexibility, faster start.", correct: false },
          { style: 'Empathetic',  text: "That's totally reasonable. I'll do whatever you need to make you feel comfortable.", correct: false },
        ]
      },
    ]
  },

  {
    id: 'close-2',
    buyerOpener: "I like what I saw in the demo. The timing might just be the problem — we're mid-cycle on a few other initiatives.",
    rounds: [
      {
        buyerStatement: "We're stretched thin right now. Honestly, the team doesn't have capacity to onboard anything new this quarter.",
        options: [
          { style: 'Consultative', text: "That's worth unpacking. Would a phased rollout — starting with just your core team over the next 3 weeks — reduce that capacity concern?", correct: true },
          { style: 'Assertive',   text: "Our implementation team handles 90% of the heavy lifting. Your team's involvement is minimal.", correct: false },
          { style: 'Empathetic',  text: "I completely get it — when your team is stretched, adding anything new feels impossible.", correct: false },
        ]
      },
      {
        buyerStatement: "We're probably looking at next quarter. I'd rather wait until we've closed out what we're working on.",
        options: [
          { style: 'Consultative', text: "Let me ask — if we could start on a read-only basis now so your team gets familiar, would a full rollout next quarter work better for you?", correct: true },
          { style: 'Assertive',   text: "Waiting a quarter means another quarter of the same problems. What's the cost of doing nothing?", correct: false },
          { style: 'Empathetic',  text: "I understand — there's never a perfect time. I just want to make sure you don't feel rushed.", correct: false },
        ]
      },
      {
        buyerStatement: "What kind of pricing flexibility do you have if we lock in now but start next quarter?",
        options: [
          { style: 'Consultative', text: "Good question. I can typically offer current pricing locked in with a delayed start date — let me confirm the specifics with my team and come back to you today.", correct: true },
          { style: 'Assertive',   text: "Sign today and I'll hold pricing. After this week I can't guarantee the rates.", correct: false },
          { style: 'Empathetic',  text: "I appreciate you being upfront about timing. I'll do my best to make it work for you.", correct: false },
        ]
      },
      {
        buyerStatement: "Alright. What does the path to signing actually look like from here?",
        options: [
          { style: 'Consultative', text: "Simple: I send a pilot agreement today, you review by end of week, we align on start date, procurement does their check. Three steps. Want me to map it out in writing?", correct: true },
          { style: 'Assertive',   text: "I'll send the contract this afternoon. Get your legal team on it and we can close by Friday.", correct: false },
          { style: 'Empathetic',  text: "I just want to make sure you're fully comfortable before we do anything. Take your time.", correct: false },
        ]
      },
    ]
  },

  {
    id: 'close-3',
    buyerOpener: "We're definitely serious about this. I have a few final questions before I can recommend sign-off to the CEO.",
    rounds: [
      {
        buyerStatement: "What happens to our data if we decide to leave? I need to know the exit path before we sign anything.",
        options: [
          { style: 'Consultative', text: "Fair question — it's the right thing to ask. You get a full data export in standard CSV/JSON formats at any time. We can add a contractual SLA on export turnaround if that helps.", correct: true },
          { style: 'Assertive',   text: "Your data is yours. You can export it any time. This isn't something to worry about.", correct: false },
          { style: 'Empathetic',  text: "I think it's really smart that you're thinking about this. A lot of buyers forget to ask.", correct: false },
        ]
      },
      {
        buyerStatement: "My CEO is going to ask about the security posture. Can you tell me what certifications you hold?",
        options: [
          { style: 'Consultative', text: "We're SOC 2 Type II certified and GDPR compliant. I can send the full security whitepaper and compliance documentation — is there a specific certification your CEO needs to see?", correct: true },
          { style: 'Assertive',   text: "SOC 2 Type II, GDPR, ISO 27001 in progress. We're as secure as anyone in the market.", correct: false },
          { style: 'Empathetic',  text: "That's a totally legitimate concern — security is non-negotiable. I'll do whatever it takes to reassure them.", correct: false },
        ]
      },
      {
        buyerStatement: "We'll need multi-year pricing. Is there any movement on the annual rate for a 3-year commitment?",
        options: [
          { style: 'Consultative', text: "Yes — multi-year deals typically come with a 10–15% discount on year two and three. Let me pull the exact numbers for your contract size and send a comparison tonight.", correct: true },
          { style: 'Assertive',   text: "Commit to 3 years and I'll get you 15% off. That's the best I can do.", correct: false },
          { style: 'Empathetic',  text: "I understand you're trying to get the best deal for your company. I'll try my hardest to get you something.", correct: false },
        ]
      },
      {
        buyerStatement: "Assuming the security docs and pricing check out — what's your expected close timeline from your side?",
        options: [
          { style: 'Consultative', text: "From my side: I can have docs and pricing to you by tomorrow morning. If your CEO has what they need by mid-week, we can typically execute within 48 hours. Does that timeline fit your planning?", correct: true },
          { style: 'Assertive',   text: "We can close this week if you move fast on the review.", correct: false },
          { style: 'Empathetic',  text: "There's no pressure at all — take whatever time you need.", correct: false },
        ]
      },
    ]
  },
];

// ─── Rebook call dialogues (future opportunity, trying to re-engage) ──────────

export const REBOOK_DIALOGUES = [
  {
    id: 'rebook-1',
    buyerOpener: "Oh — yes, we spoke a few months back. Things got a bit hectic on our end. Where did we leave it?",
    rounds: [
      {
        buyerStatement: "Right, the timing just wasn't great. We were going through a reorganisation and everything kind of froze.",
        options: [
          { style: 'Empathetic',   text: "That sounds like it was a challenging period. Is things have settled, or are you still navigating changes?", correct: true },
          { style: 'Consultative', text: "Understood. A lot changes in a restructure — has the original problem we discussed shifted at all?", correct: false },
          { style: 'Assertive',   text: "Makes sense. Now that things have stabilised, the urgency around solving this hasn't gone away.", correct: false },
        ]
      },
      {
        buyerStatement: "Honestly, the problem we talked about hasn't gone away. It's actually gotten worse. But I'm not sure I have the internal buy-in to move on it right now.",
        options: [
          { style: 'Consultative', text: "Let's focus on that buy-in question. Who else in your org needs to be part of this conversation, and what do they need to see?", correct: true },
          { style: 'Assertive',   text: "If the problem has gotten worse, that's exactly the argument you need to make the case internally. I can help you put it together.", correct: false },
          { style: 'Empathetic',  text: "I'm sorry to hear it's gotten worse — that's really frustrating when you know something needs to change.", correct: false },
        ]
      },
      {
        buyerStatement: "What would a re-engagement look like? I don't want to go through the whole sales process again.",
        options: [
          { style: 'Consultative', text: "Fair enough. I'd suggest a focused 30-minute session — no pitch, just map your current situation to where we left off and see what's changed. Does that work?", correct: true },
          { style: 'Assertive',   text: "We can skip straight to a commercial proposal if that's easier. I'll have something to you by tomorrow.", correct: false },
          { style: 'Empathetic',  text: "I completely understand — going through the whole process again is exhausting. I'll keep it as painless as possible.", correct: false },
        ]
      },
      {
        buyerStatement: "Okay, I'm open to it. But I need you to know — if the pricing has changed significantly, it's a non-starter.",
        options: [
          { style: 'Consultative', text: "Appreciate the transparency. Pricing hasn't moved for your segment, but let me confirm the exact figure from our last proposal and verify nothing's changed before we book time.", correct: true },
          { style: 'Assertive',   text: "Pricing is the same. Book the call and let's not let that be the obstacle.", correct: false },
          { style: 'Empathetic',  text: "That's completely fair — price sensitivity is real and I respect that.", correct: false },
        ]
      },
    ]
  },

  {
    id: 'rebook-2',
    buyerOpener: "I remember you. We had a good demo but we had to put everything on hold. Budget freeze.",
    rounds: [
      {
        buyerStatement: "The freeze has lifted but the budget is smaller than it was. I'm working with less than I had before.",
        options: [
          { style: 'Consultative', text: "Let's figure out what fits. What's the use case you'd want to solve first if you had to prioritise one? That might help us find a scope that works within what you have.", correct: true },
          { style: 'Empathetic',  text: "I'm sorry to hear that — working with a reduced budget is really tough, especially when you know what you need.", correct: false },
          { style: 'Assertive',   text: "We can work with smaller budgets. Let me show you a stripped-down version that still solves the core problem.", correct: false },
        ]
      },
      {
        buyerStatement: "The team that was going to use this has changed as well. Half of them are new hires.",
        options: [
          { style: 'Consultative', text: "That actually might be an advantage — onboarding new team members onto a platform from day one is often easier than migrating an established team. How soon are these hires starting?", correct: true },
          { style: 'Empathetic',  text: "Team transitions are always disruptive — I understand why this makes the decision harder.", correct: false },
          { style: 'Assertive',   text: "New hires are easy to train. That shouldn't be a barrier.", correct: false },
        ]
      },
      {
        buyerStatement: "I need to be honest — there's another vendor we've been talking to who came in while you were off the radar.",
        options: [
          { style: 'Consultative', text: "Good to know. What's driving the conversation with them — is there something specific they're offering that you're not sure we can match?", correct: true },
          { style: 'Assertive',   text: "I'd ask them about X and Y — those are usually where the cracks show up in a side-by-side comparison.", correct: false },
          { style: 'Empathetic',  text: "I completely understand — you had to keep evaluating options while we were out of the picture.", correct: false },
        ]
      },
      {
        buyerStatement: "If you can show me something this week, I'll put you back into the running.",
        options: [
          { style: 'Consultative', text: "I can do a focused session Thursday or Friday — 45 minutes, tailored to the use cases that matter most to you now. What's your availability?", correct: true },
          { style: 'Assertive',   text: "Thursday at 2pm. I'll send a calendar invite right now.", correct: false },
          { style: 'Empathetic',  text: "Thank you for giving us another shot — that really means a lot. I'll make sure it's worth your time.", correct: false },
        ]
      },
    ]
  },

  {
    id: 'rebook-3',
    buyerOpener: "Hi — yes, I know we've been hard to reach. Things have been moving at a million miles an hour here.",
    rounds: [
      {
        buyerStatement: "We've actually been dealing with a system failure on our end that's made everything take a back seat.",
        options: [
          { style: 'Empathetic',   text: "That sounds really stressful — system failures always create a cascade of other problems. Is the immediate situation under control now?", correct: true },
          { style: 'Consultative', text: "I'd be curious whether the problem you were trying to solve with us is connected to the failure in any way.", correct: false },
          { style: 'Assertive',   text: "A lot of our customers came to us after exactly that kind of event. Once things settle, that urgency is a good lever.", correct: false },
        ]
      },
      {
        buyerStatement: "That incident has actually made the case for what we were discussing much stronger internally. People are now open to it who weren't before.",
        options: [
          { style: 'Consultative', text: "That's a meaningful shift. What would be the most valuable thing to show the new stakeholders — a live demo, a business case document, or both?", correct: true },
          { style: 'Assertive',   text: "Great. Strike while the iron is hot — let's get something on the calendar this week before the momentum fades.", correct: false },
          { style: 'Empathetic',  text: "I'm glad something positive came out of a difficult situation for your team.", correct: false },
        ]
      },
      {
        buyerStatement: "My main concern now is implementation risk. We can't afford another disruption.",
        options: [
          { style: 'Consultative', text: "Implementation risk is exactly the right thing to focus on. Would it help to talk through how we've handled similar rollouts — specifically how we minimise downtime and what a parallel-run approach looks like?", correct: true },
          { style: 'Empathetic',  text: "After what you've been through, that concern makes complete sense. I want to help you feel safe about this decision.", correct: false },
          { style: 'Assertive',   text: "Our implementation track record is strong. I'll send you our uptime and rollout success stats.", correct: false },
        ]
      },
      {
        buyerStatement: "What I need is a clear implementation plan before I'll agree to anything. Can you provide that up front?",
        options: [
          { style: 'Consultative', text: "Absolutely. I can provide a draft implementation plan scoped to your environment — I'll need about 30 minutes with your technical lead to make it accurate. Can we set that up this week?", correct: true },
          { style: 'Assertive',   text: "I'll have a plan in your inbox by tomorrow morning. That's my commitment.", correct: false },
          { style: 'Empathetic',  text: "Of course — you've been through enough uncertainty. I'll make sure you have everything you need before you commit.", correct: false },
        ]
      },
    ]
  },
];

// ─── Buyer brief templates for the slide picker (mini-game 1) ─────────────────

export const BUYER_PROFILES = {
  finance: {
    label:        'CFO / Finance Buyer',
    description:  'Focused on measurable return, cost justification, and budget risk. Gets impatient with technical detail.',
    painPoints:   ['Lack of visibility into ROI on software spend', 'Too long to see value from new platforms'],
    priorities:   ['Clear payback period', 'Reducing total cost of ownership'],
    dontCare:     ['Technical architecture', 'Product roadmap'],
    high:         [0, 1, 2],    // ROI Calculator, TCO, Time to Value
    low:          [7, 6],       // Technical Architecture, Product Roadmap
  },
  technical: {
    label:        'CTO / Technical Buyer',
    description:  'Evaluates integration depth, security posture, and technical scalability. Mistrustful of sales claims without evidence.',
    painPoints:   ['Integration fragility with existing stack', 'Security and compliance gaps'],
    priorities:   ['Proven architecture', 'Enterprise-grade security'],
    dontCare:     ['ROI slides', 'Market positioning'],
    high:         [7, 5, 4],    // Technical Architecture, Security, Integrations
    low:          [0, 11],      // ROI Calculator, Market Position
  },
  operations: {
    label:        'Operations / COO Buyer',
    description:  'Cares about practical rollout, ease of adoption, and post-sale support. Skeptical of complex implementations.',
    painPoints:   ['Manual processes slowing the team down', 'Previous rollouts that failed to stick'],
    priorities:   ['Ease of implementation', 'Strong customer success model'],
    dontCare:     ['Long-term roadmap', 'Deep technical specs'],
    high:         [3, 9, 2],    // Ease of Implementation, Customer Success, Time to Value
    low:          [6, 7],       // Product Roadmap, Technical Architecture
  },
  procurement: {
    label:        'Procurement / Vendor Management Buyer',
    description:  'Runs a structured process. Needs evidence, references, and verifiable compliance. Resistant to pressure.',
    painPoints:   ['Difficulty comparing vendors on equivalent criteria', 'Risk of signing with wrong partner'],
    priorities:   ['Validated customer references', 'Full cost transparency'],
    dontCare:     ['Feature demos', 'Market share claims'],
    high:         [1, 5, 8],    // TCO, Security, Customer Stories
    low:          [10, 11],     // Feature Walkthrough, Market Position
  },
};

// ─── Slide definitions for mini-game 1 ───────────────────────────────────────

export const SLIDES = [
  { title: 'ROI Calculator',         icon: '📊', desc: 'Quantify returns based on customer-specific inputs' },
  { title: 'Total Cost of Ownership',icon: '💰', desc: 'Full cost comparison over 3 years including hidden costs' },
  { title: 'Time to Value',          icon: '⚡', desc: 'How quickly customers see measurable results' },
  { title: 'Ease of Implementation', icon: '🔧', desc: 'What onboarding looks like: timeline, effort, support' },
  { title: 'Integrations Overview',  icon: '🔗', desc: 'Pre-built connectors and API capabilities' },
  { title: 'Security & Compliance',  icon: '🔒', desc: 'Certifications, data handling, and compliance posture' },
  { title: 'Product Roadmap',        icon: '🗺️', desc: 'Where the product is going over the next 12–18 months' },
  { title: 'Technical Architecture', icon: '🏗️', desc: 'Infrastructure, scalability, and deployment options' },
  { title: 'Customer Stories',       icon: '💬', desc: 'Case studies and references from similar customers' },
  { title: 'Customer Success Model', icon: '🤝', desc: 'How we support you post-sale' },
  { title: 'Feature Walkthrough',    icon: '🖥️', desc: 'Detailed product feature overview' },
  { title: 'Market Position',        icon: '🏆', desc: 'How we compare to the competition' },
];

// Buyer reactions for slide scoring
export const SLIDE_REACTIONS = {
  high:    ['Exactly what I needed to see.', 'This is very relevant to us.', 'Strong — this addresses my main concern.', 'Great inclusion.'],
  neutral: ['Useful context.', 'Good to have.', 'Fair enough.', 'I can work with that.'],
  low:     ['Not really relevant to me.', "I didn't need this.", 'We can skip over this.', 'This doesn\'t move the needle for me.'],
};
