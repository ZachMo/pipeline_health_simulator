/**
 * slides.js — Slide pool and buyer profile weights for the demo mini-game.
 * 40 slides total. Each has id, icon, title, desc, and tags (2 strings).
 * Tags are scored against BUYER_PROFILES tag weights to grade slide selection.
 */

// ─── Slide pool (40 slides) ───────────────────────────────────────────────────

export const SLIDE_POOL = [
  // Original 12
  { id: 'roi',          icon: '📊', title: 'ROI Calculator',          desc: 'Quantify returns based on customer-specific inputs',              tags: ['roi', 'cost'] },
  { id: 'tco',          icon: '💰', title: 'Total Cost of Ownership',  desc: 'Full cost comparison over 3 years including hidden costs',        tags: ['cost', 'roi'] },
  { id: 'time-value',   icon: '⚡', title: 'Time to Value',            desc: 'How quickly customers see measurable results',                    tags: ['speed', 'roi'] },
  { id: 'ease-impl',    icon: '🔧', title: 'Ease of Implementation',   desc: 'What onboarding looks like: timeline, effort, support',           tags: ['ease', 'support'] },
  { id: 'integrations', icon: '🔗', title: 'Integrations Overview',    desc: 'Pre-built connectors and API capabilities',                      tags: ['technical', 'integration'] },
  { id: 'security',     icon: '🔒', title: 'Security & Compliance',    desc: 'Certifications, data handling, and compliance posture',           tags: ['security', 'trust'] },
  { id: 'roadmap',      icon: '🗺️', title: 'Product Roadmap',          desc: 'Where the product is going over the next 12–18 months',          tags: ['roadmap', 'features'] },
  { id: 'architecture', icon: '🏗️', title: 'Technical Architecture',   desc: 'Infrastructure, scalability, and deployment options',             tags: ['technical', 'scale'] },
  { id: 'stories',      icon: '💬', title: 'Customer Stories',         desc: 'Case studies and references from similar customers',              tags: ['social', 'trust'] },
  { id: 'cs-model',     icon: '🤝', title: 'Customer Success Model',   desc: 'How we support you post-sale',                                   tags: ['support', 'ease'] },
  { id: 'features',     icon: '🖥️', title: 'Feature Walkthrough',      desc: 'Detailed product feature overview',                              tags: ['features', 'ease'] },
  { id: 'market',       icon: '🏆', title: 'Market Position',          desc: 'How we compare to the competition',                              tags: ['market', 'social'] },
  // New 28
  { id: 'competitive',         icon: '⚔️',  title: 'Competitive Battlecard',       desc: 'How we win against the top 3 alternatives',                     tags: ['social', 'market'] },
  { id: 'pricing-transparency',icon: '🏷️',  title: 'Pricing Transparency',         desc: 'Clear predictable pricing with no hidden fees',                  tags: ['cost', 'trust'] },
  { id: 'data-migration',      icon: '📦',  title: 'Data Migration Guide',         desc: 'How we move your existing data in under 2 weeks',                tags: ['ease', 'speed'] },
  { id: 'exec-dashboard',      icon: '📋',  title: 'Executive Dashboard',          desc: 'Board-ready reporting in one click',                             tags: ['roi', 'ease'] },
  { id: 'api-docs',            icon: '🔌',  title: 'API Documentation Overview',   desc: 'Full REST API with 200+ endpoints',                              tags: ['technical', 'integration'] },
  { id: 'gdpr',                icon: '🛡️',  title: 'GDPR & Data Residency',        desc: 'Where your data lives and who can see it',                       tags: ['security', 'trust'] },
  { id: 'uptime',              icon: '📡',  title: 'Uptime & SLA',                 desc: '99.9% uptime guarantee contractually backed',                    tags: ['trust', 'support'] },
  { id: 'mobile',              icon: '📱',  title: 'Mobile App Demo',              desc: 'Full functionality on iOS and Android',                          tags: ['ease', 'features'] },
  { id: 'automation',          icon: '⚙️',  title: 'Workflow Automation',          desc: 'Eliminate 5 hours of manual work per week per user',             tags: ['roi', 'ease'] },
  { id: 'change-mgmt',         icon: '📚',  title: 'Change Management Kit',        desc: 'Training playbooks and rollout templates included',              tags: ['ease', 'support'] },
  { id: 'references',          icon: '🤝',  title: 'Reference Customers',          desc: 'Speak directly with 3 customers in your industry',               tags: ['social', 'trust'] },
  { id: 'pilot',               icon: '🚀',  title: 'Pilot Programme',              desc: 'Prove value in 30 days before full commitment',                  tags: ['trust', 'speed'] },
  { id: 'savings',             icon: '💵',  title: 'Total Addressable Savings',    desc: 'Where every dollar of value comes from',                         tags: ['roi', 'cost'] },
  { id: 'adoption',            icon: '📈',  title: 'User Adoption Stats',          desc: 'Average 94% DAU/MAU ratio across our customer base',             tags: ['social', 'ease'] },
  { id: 'vendor-risk',         icon: '📝',  title: 'Vendor Risk Assessment',       desc: 'How to justify us to your procurement team',                     tags: ['security', 'trust'] },
  { id: 'it-fit',              icon: '🖥️',  title: 'IT Infrastructure Fit',        desc: 'Works with your existing stack — no rip and replace',            tags: ['technical', 'integration'] },
  { id: 'headcount',           icon: '👥',  title: 'Headcount Impact',             desc: 'How one platform replaces three manual roles',                   tags: ['cost', 'roi'] },
  { id: 'benchmarks',          icon: '📊',  title: 'Industry Benchmarks',          desc: 'How top performers in your sector use us',                       tags: ['social', 'market'] },
  { id: 'impl-timeline',       icon: '📅',  title: 'Implementation Timeline',      desc: 'Week by week rollout plan for your team size',                   tags: ['speed', 'ease'] },
  { id: 'finance-workflow',    icon: '💼',  title: 'Finance Team Workflow',        desc: 'Built for the way finance teams actually work',                  tags: ['roi', 'ease'] },
  { id: 'legal-pack',          icon: '📄',  title: 'Legal & Procurement Pack',     desc: 'MSA, DPA, and security questionnaire pre-filled',                tags: ['security', 'trust'] },
  { id: 'multi-entity',        icon: '🏢',  title: 'Multi-Entity Support',         desc: 'Manage 50+ legal entities from one login',                       tags: ['features', 'scale'] },
  { id: 'audit',               icon: '🔍',  title: 'Audit Trail',                  desc: 'Every change logged, timestamped, and exportable',               tags: ['security', 'trust'] },
  { id: 'partners',            icon: '🌐',  title: 'Partner Ecosystem',            desc: '150+ certified implementation partners globally',                 tags: ['support', 'trust'] },
  { id: 'renewal',             icon: '🔄',  title: 'Renewal & Expansion Model',    desc: 'How customers grow with us over time',                           tags: ['roadmap', 'trust'] },
  { id: 'demo-env',            icon: '🖱️',  title: 'Demo Environment',             desc: 'Try it yourself with live credentials today',                    tags: ['ease', 'features'] },
  { id: 'cost-nothing',        icon: '⏱️',  title: 'Cost of Doing Nothing',        desc: 'What inaction costs your team per quarter',                      tags: ['roi', 'cost'] },
  { id: 'fast-track',          icon: '✍️',  title: 'Procurement Fast-Track',       desc: 'How to get this signed in under 3 weeks',                        tags: ['speed', 'cost'] },
];

// ─── Buyer profile tag weights ────────────────────────────────────────────────

const _profiles = {
  cfo:         { roi:3, cost:3, speed:2, ease:1, trust:2, security:1, social:1, market:-1, technical:-2, roadmap:-1, features:-1, scale:1,  support:0, integration:0 },
  cto:         { technical:3, security:3, integration:3, trust:1, roadmap:1, ease:1, roi:-1, market:-1, cost:0, social:0, features:2, scale:2, support:0, speed:0 },
  operations:  { ease:3, support:3, speed:2, roi:2, trust:1, social:1, cost:1, technical:-1, roadmap:-1, market:-2, features:0, scale:1, security:0, integration:1 },
  procurement: { cost:3, security:3, trust:3, social:2, ease:1, support:1, roi:1, features:-1, market:-2, roadmap:-1, technical:0, scale:0, speed:0, integration:0 },
};
// Legacy aliases for saves that used old profile keys
_profiles.finance   = _profiles.cfo;
_profiles.technical = _profiles.cto;

export const BUYER_PROFILES = _profiles;

// ─── Score a slide against a buyer profile ────────────────────────────────────

export function scoreSlide(slide, profileKey, weeklyModifiers = {}) {
  const profile = BUYER_PROFILES[profileKey] || BUYER_PROFILES.operations;
  const raw = (slide.tags || []).reduce((sum, tag) => {
    return sum + (profile[tag] || 0) + (weeklyModifiers[tag] || 0);
  }, 0);

  // Bad slide threshold: raw score ≤ -3
  if (raw <= -3) {
    return { pts: -15, tier: 'bad' };
  }

  const tier = raw >= 4 ? 'high' : raw >= 0 ? 'neutral' : 'low';
  let pts;
  if (tier === 'high')    pts = 16 + Math.floor(Math.random() * 4);  // 16-19
  else if (tier === 'neutral') pts = 8  + Math.floor(Math.random() * 6);  // 8-13
  else                    pts = 0  + Math.floor(Math.random() * 5);  // 0-4
  return { pts, tier };
}
