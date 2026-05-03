/**
 * dialogues.js — Dialogue sequences for the call mini-game.
 * Each sequence has 4 rounds. Each round has 3 options — one correct.
 * Each option has a reaction string (buyer's internal thought after the player speaks).
 * partialCredit: true marks the "closer but still wrong" option per round.
 */

// ─── Close call dialogues ─────────────────────────────────────────────────────

export const CLOSE_DIALOGUES = [
  {
    id: 'close-1',
    name: 'The Hesitant CFO',
    rounds: [
      {
        buyerStatement: "Look, I'll be honest with you — the pricing is higher than we budgeted for.",
        options: [
          { text: "I completely understand. Let me see what I can do on the price.", correct: false, partialCredit: true, reaction: "Hmm. They seem too eager to discount. That's a red flag." },
          { text: "That's fair feedback. Can you help me understand what the budget ceiling looks like?", correct: true,  reaction: "Good question. That's someone who listens." },
          { text: "Our pricing is actually very competitive compared to alternatives.", correct: false, reaction: "I didn't ask about alternatives. This rep isn't hearing me." },
        ],
      },
      {
        buyerStatement: "We've been burned before by software that looked great in demos but fell apart in implementation.",
        options: [
          { text: "I hear that. What would give you confidence that our implementation is different?", correct: true,  reaction: "Finally someone who gets it. This is the right question." },
          { text: "Our implementation team is world class. We have a 98% success rate.", correct: false, partialCredit: true, reaction: "Stats don't reassure me. I've heard this before." },
          { text: "We could offer a pilot programme to reduce your risk.", correct: false, reaction: "Jumping to solutions before understanding the problem. Classic." },
        ],
      },
      {
        buyerStatement: "I need to bring this to the board before we can move forward. That could take six weeks.",
        options: [
          { text: "Six weeks is a long time — is there any way to fast-track this?", correct: false, reaction: "They're pushing me. This feels like pressure." },
          { text: "Understood. What would the board need to see to feel confident approving this?", correct: true,  reaction: "Now we're talking. They want to help me, not rush me." },
          { text: "We have other clients interested in this pricing. I can't hold it for six weeks.", correct: false, partialCredit: true, reaction: "Was that a threat? I'm not signing anything under pressure." },
        ],
      },
      {
        buyerStatement: "If the numbers work out I think we could be a good fit. But I'm not ready to commit today.",
        options: [
          { text: "What would need to happen for you to feel ready to commit?", correct: true,  reaction: "Perfect. They're asking the right question instead of pushing." },
          { text: "I understand. I'll follow up next week.", correct: false, partialCredit: true, reaction: "Passive. No next step defined. This will go cold." },
          { text: "What if we offered a 10% discount to close this week?", correct: false, reaction: "Discounting already? This rep has no confidence in the value." },
        ],
      },
    ],
  },

  {
    id: 'close-2',
    name: 'The Enthusiastic Champion',
    rounds: [
      {
        buyerStatement: "Honestly I love the product. My team is really excited. I just need to get sign-off from my VP.",
        options: [
          { text: "That's great to hear! Let me know when you have the sign-off.", correct: false, partialCredit: true, reaction: "They're just waiting around. That's not helping me." },
          { text: "Fantastic. What does your VP care most about — is it cost, risk, or speed to value?", correct: true,  reaction: "Smart. They're helping me build the internal case." },
          { text: "Would it help if I sent you a one-pager you could share with your VP?", correct: false, reaction: "A one-pager? I need a conversation, not a PDF." },
        ],
      },
      {
        buyerStatement: "My VP always asks about what happens if it doesn't work out. He's very risk averse.",
        options: [
          { text: "We have contractual SLAs and a full money-back guarantee period.", correct: false, partialCredit: true, reaction: "Rattling off contract terms isn't what I need right now." },
          { text: "Would it help to have a direct conversation between your VP and our customer success lead?", correct: true,  reaction: "Yes. Exactly. Peer to peer. That would help a lot." },
          { text: "Risk averse VPs are actually our best customers once they see the data.", correct: false, reaction: "That feels patronising. My VP isn't a type." },
        ],
      },
      {
        buyerStatement: "He also wants to know what the exit strategy is if we need to move off the platform in two years.",
        options: [
          { text: "Our platform is designed for long-term partnerships. Churn is very low.", correct: false, reaction: "That doesn't answer the question at all." },
          { text: "Honestly that's a fair question. Let me walk you through our data export and transition support.", correct: true,  reaction: "Straight answer. I respect that." },
          { text: "Most customers who ask that question end up staying for five or more years.", correct: false, partialCredit: true, reaction: "Deflecting with statistics. Not what I asked." },
        ],
      },
      {
        buyerStatement: "If you can get me something in writing by Thursday I think I can get it on the agenda for Friday's exec meeting.",
        options: [
          { text: "Thursday works. I'll have a full proposal with references and an exec summary to you by noon.", correct: true,  reaction: "Specific, committed, and realistic. This is someone I can work with." },
          { text: "I'll do my best to get something to you by Thursday.", correct: false, partialCredit: true, reaction: "Best effort isn't a commitment. I needed a yes." },
          { text: "Let me check with my team and get back to you on timing.", correct: false, reaction: "They're going to check with their team? On a Thursday deadline? We're done." },
        ],
      },
    ],
  },

  {
    id: 'close-3',
    name: 'The Skeptical Evaluator',
    rounds: [
      {
        buyerStatement: "We're talking to three other vendors. I want to be upfront about that.",
        options: [
          { text: "I appreciate the transparency. What criteria are you using to evaluate us?", correct: true,  reaction: "Good. They want to understand the scorecard rather than just pitch." },
          { text: "We're confident we'll come out ahead in any fair comparison.", correct: false, partialCredit: true, reaction: "Confident and empty. I've heard this from every vendor." },
          { text: "Who else are you evaluating? I'd love to address any comparisons directly.", correct: false, reaction: "Why do they need to know who I'm talking to? That feels off." },
        ],
      },
      {
        buyerStatement: "One of the other vendors is significantly cheaper. Like 40% cheaper.",
        options: [
          { text: "Price isn't everything. Our total cost of ownership is much lower over three years.", correct: false, partialCredit: true, reaction: "They went straight to defensive mode. Classic." },
          { text: "That's worth understanding. Is price the primary factor in your decision?", correct: true,  reaction: "Good. They're not panicking. They're getting clarity." },
          { text: "Can you share who it is? I might be able to explain the difference.", correct: false, reaction: "I'm not here to do competitive intelligence for them." },
        ],
      },
      {
        buyerStatement: "I want to see a reference from a company in our exact industry before I move forward.",
        options: [
          { text: "Absolutely. I can connect you with two customers in your sector this week.", correct: true,  reaction: "Fast and specific. That's what I was hoping for." },
          { text: "We have hundreds of customers across all industries. Happy to share case studies.", correct: false, partialCredit: true, reaction: "Case studies aren't references. I said I want to talk to someone." },
          { text: "Our NPS score is 72 which is top quartile in the market.", correct: false, reaction: "NPS means nothing to me. I want a phone call." },
        ],
      },
      {
        buyerStatement: "Assuming the reference checks out — what does the contract process look like?",
        options: [
          { text: "Standard MSA, DPA, and order form. Legal review usually takes one to two weeks on our end.", correct: true,  reaction: "Clear and honest about timing. That's helpful." },
          { text: "Our contracts are very straightforward. Usually signed within a few days.", correct: false, partialCredit: true, reaction: "That sounds unrealistic. Now I'm suspicious." },
          { text: "Let me introduce you to our legal team and they can walk you through it.", correct: false, reaction: "I don't want to meet another person. I wanted a simple answer." },
        ],
      },
    ],
  },
];

// ─── Rebook call dialogues ────────────────────────────────────────────────────

export const REBOOK_DIALOGUES = [
  {
    id: 'rebook-1',
    name: 'The Stalled Decision',
    rounds: [
      {
        buyerStatement: "Oh hi. Honestly things got really busy internally and this kind of fell off our radar.",
        options: [
          { text: "I completely understand. These things happen. Shall we find a new time?", correct: false, partialCredit: true, reaction: "Too eager. No curiosity about what actually happened." },
          { text: "That happens. What was it that got in the way — was it budget, timing, or something else?", correct: true,  reaction: "Good question. They actually want to understand, not just rebook." },
          { text: "I've been trying to reach you for a few weeks. I wanted to make sure you hadn't forgotten us.", correct: false, reaction: "That comes across as a guilt trip. Not a great restart." },
        ],
      },
      {
        buyerStatement: "We had a reorg and my manager who was championing this has moved to a different department.",
        options: [
          { text: "I'm sorry to hear that. Who has taken over their responsibilities?", correct: true,  reaction: "Exactly the right response. Empathy and forward motion." },
          { text: "Reorgs are tough. Hopefully things settle down soon.", correct: false, partialCredit: true, reaction: "That's a dead-end comment. Nothing useful came from that." },
          { text: "Is there any chance your old manager can still influence the decision?", correct: false, reaction: "They're chasing a ghost. My old manager has no power here." },
        ],
      },
      {
        buyerStatement: "I'm not sure the new stakeholder has any context on what we were evaluating.",
        options: [
          { text: "Would it make sense to start fresh with a new demo for them — I can keep it short and focused.", correct: true,  reaction: "Yes. Start fresh. That's the right read." },
          { text: "I could send over the materials from the original evaluation for them to review.", correct: false, partialCredit: true, reaction: "Nobody reads materials sent cold. That's a dead end." },
          { text: "Could you brief them on what we discussed and then set up a call?", correct: false, reaction: "I'm not doing their job for them. That's a no." },
        ],
      },
      {
        buyerStatement: "If we do this again I need it to be worth their time. They're very senior.",
        options: [
          { text: "Understood. Before we book anything — what are the top two things they care most about?", correct: true,  reaction: "Perfect. Research before scheduling. That's a pro move." },
          { text: "I'll put together a tailored agenda focused on executive-level outcomes.", correct: false, partialCredit: true, reaction: "They don't know what I care about yet. How can they tailor anything?" },
          { text: "We have a short executive briefing format that works really well for senior stakeholders.", correct: false, reaction: "A format pitch before understanding the person. That's backwards." },
        ],
      },
    ],
  },

  {
    id: 'rebook-2',
    name: 'The Budget Freeze',
    rounds: [
      {
        buyerStatement: "We had a budget freeze at the end of the quarter. Everything non-essential got paused.",
        options: [
          { text: "That's really common right now. Is the freeze still in effect or is there a review coming up?", correct: true,  reaction: "Good. They want to understand the timeline, not just commiserate." },
          { text: "I'm sorry to hear that. Please keep us in mind when things open up.", correct: false, reaction: "That's a graceful way to lose the deal. No urgency, no follow-through." },
          { text: "We do have some flexible payment options that might help with budget constraints.", correct: false, partialCredit: true, reaction: "I didn't ask for a workaround. I said there was a freeze." },
        ],
      },
      {
        buyerStatement: "The business case was there but leadership wants to wait until Q3 to revisit big spend decisions.",
        options: [
          { text: "That makes sense. Would it be useful to have something ready to go the moment Q3 opens?", correct: true,  reaction: "Yes. Get in the queue early. That's smart." },
          { text: "Is there any discretionary budget you could use to get started with a smaller pilot?", correct: false, reaction: "I just told them leadership made the call. A pilot isn't in my hands." },
          { text: "What would need to change between now and Q3 for this to become a priority?", correct: false, partialCredit: true, reaction: "Nothing needs to change. The timeline was set above my head." },
        ],
      },
      {
        buyerStatement: "I'd hate to go through the whole evaluation process again from scratch.",
        options: [
          { text: "You won't have to. Everything we built together is still here — we just need a short refresh call.", correct: true,  reaction: "That's reassuring. Low friction restart. I like that." },
          { text: "I completely understand. We can pick up right where we left off.", correct: false, partialCredit: true, reaction: "Vague. What does 'pick up where we left off' actually mean?" },
          { text: "The good news is our product has improved since we last spoke.", correct: false, reaction: "I don't want a product update. I want to know it'll be easy." },
        ],
      },
      {
        buyerStatement: "If I go back to my team with this in Q3 I need to show something has changed to justify reopening it.",
        options: [
          { text: "What would be most compelling — new customer results, pricing options, or an updated ROI model?", correct: true,  reaction: "Options. They're giving me something to choose from. That's useful." },
          { text: "We've had several new customers join since we spoke who I think you'd find very relevant.", correct: false, partialCredit: true, reaction: "New customers aren't my problem to solve. I need internal ammo." },
          { text: "Let me put together a summary of what's changed since we last spoke.", correct: false, reaction: "A summary I didn't ask for. Another PDF nobody will read." },
        ],
      },
    ],
  },

  {
    id: 'rebook-3',
    name: 'The Competitive Loss Follow-up',
    rounds: [
      {
        buyerStatement: "We actually went with another vendor. I thought someone would have updated you.",
        options: [
          { text: "I appreciate you telling me. Can I ask what ended up being the deciding factor?", correct: true,  reaction: "Graceful and curious. I respect that. I'll actually answer." },
          { text: "Oh I didn't know that. I'm sorry to hear it — I really thought we had a good fit.", correct: false, partialCredit: true, reaction: "The sympathy feels off. And now I feel awkward." },
          { text: "Was it a price decision or something else?", correct: false, reaction: "Leading with price assumes they're shallow. That's not right." },
        ],
      },
      {
        buyerStatement: "Honestly it came down to implementation support. They had a dedicated team on-site for the first 90 days.",
        options: [
          { text: "That's really helpful to know. Is that something that would have changed the outcome if we had offered it?", correct: true,  reaction: "Good. They're not being defensive. They want to learn." },
          { text: "We actually have on-site implementation options. I wish that had come up earlier.", correct: false, partialCredit: true, reaction: "Now they tell me. A little late and a little defensive." },
          { text: "A lot of companies find that remote implementation works just as well in practice.", correct: false, reaction: "I literally just told them why we chose the other vendor. Stop arguing." },
        ],
      },
      {
        buyerStatement: "We're locked in for 12 months. But I'll be honest — I'm not 100% sure it was the right call.",
        options: [
          { text: "I appreciate you saying that. Would it be worth staying in touch so you have an option when the contract is up?", correct: true,  reaction: "Yes. Low pressure. They're playing a long game. I respect that." },
          { text: "If things don't work out with them you know where to find us.", correct: false, reaction: "That sounds like they're hoping for failure. Bad taste." },
          { text: "What makes you feel like it might not have been the right call?", correct: false, partialCredit: true, reaction: "Too probing. I'm not ready to dissect my own decision with a vendor." },
        ],
      },
      {
        buyerStatement: "I wouldn't mind staying in touch but I don't want to be bombarded with emails.",
        options: [
          { text: "Understood. How about I reach out once at the six-month mark — just a check-in, no pitch?", correct: true,  reaction: "Perfect. Specific, respectful, low commitment. I can agree to that." },
          { text: "Of course. I'll just add you to our newsletter so you stay in the loop on product updates.", correct: false, reaction: "A newsletter is exactly the bombardment I just asked to avoid." },
          { text: "I'll keep it minimal. Maybe just a quick note every month or so?", correct: false, partialCredit: true, reaction: "Monthly is not minimal. That's not listening." },
        ],
      },
    ],
  },
];
