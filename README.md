# Sales Rep Simulator

A browser-based sales simulation game. Built with vanilla HTML, CSS, and ES Modules (no build tools needed).

## Project structure

```
sales-sim/
├── index.html          # Main game UI shell
├── css/
│   └── styles.css      # All styles
└── js/
    ├── engine.js       # Game logic, state, rules (no DOM)
    ├── ui.js           # DOM rendering (reads state, writes DOM)
    └── main.js         # Entry point — wires engine + UI together
```

## Running locally

Because the game uses ES Modules (`import`/`export`), you need a local web server.
Opening `index.html` directly as a file:// URL will not work.

### Option 1 — Python (easiest, no install needed)

Open Terminal, navigate to the project folder, and run:

```bash
cd /path/to/sales-sim
python3 -m http.server 3000
```

Then open: http://localhost:3000

### Option 2 — Node.js (if you have Node installed)

```bash
npx serve .
```

Then open the URL it gives you (usually http://localhost:3000).

### Option 3 — VS Code Live Server extension

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

---

## How to play

- **5 actions per day.** Each action uses 1 pip.
- **Green action buttons** in the top bar show what you can do today.
- **End day →** advances to the next business day (triggers new bookings, deadlines, manager emails).
- **Inbox** tracks all notifications — read them to stay on top of at-risk deals.
- **Phone** lets you call live or future opportunities (uses 1 action).
- **Pipeline** shows all active opportunities across Kanban, Funnel, and List views.

## Opportunity flow

```
Inbound booking → Schedule demo (1 day) → Host demo → Schedule pricing (5 days)
→ Build proposal → Host pricing → Call to close (7 days) → Won / Lost / Future
```

Future opportunities can be rebooked within 90 days.

## Seasonality

- **Jan–Feb:** Slow (0.6–0.8 bookings/week)
- **Apr–Jun:** Busy (2.0–2.5/week)
- **Oct–Nov:** Sprint (2.8–3.2/week)
- **Dec:** Wind-down

---

## Next steps (to build)

- [ ] Slide-picker mini-game (demo hosting)
- [ ] Deal or No Deal mini-game (pricing)
- [ ] Dialogue mini-game (close calls)
- [ ] End-of-month scoring screen
- [ ] Capacitor wrapper for iOS
