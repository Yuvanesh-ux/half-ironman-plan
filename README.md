# 70.3 · Dawn Patrol

A calm, telemetry-styled web view of your Half-Ironman (70.3) training plan, built for race day **21 Mar 2027**.

It answers two questions at a glance:

- **What do I train today, and this week?** — a big focus card plus a 7-day strip you can click through.
- **What will today actually feel like?** — a plain-English coaching insight generated from each session's sport mix, duration, HR zones, and place in the week.

Plus: the full 37-week load chart (click any bar to jump), heart-rate zones, and the 6:15 target splits.

## Use it

Everything is static — no build step. Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

- **← / →** move day by day. The week arrows jump week to week.
- **Mark complete** on any session is saved in your browser (localStorage).
- Before the plan starts (or after race day) it clamps to the nearest real session.

## Host on GitHub Pages

1. Put these files in a repo (e.g. push this `half-ironman-plan` folder as the repo root).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose `main` / `/ (root)` and save. Your plan is live at `https://<user>.github.io/<repo>/`.

## Files

| file | what it is |
|------|-----------|
| `index.html` | page shell |
| `styles.css` | the "dawn telemetry" theme |
| `app.js`     | rendering + the natural-language insight generator |
| `data.js`    | the plan itself — 259 days + reference tables, exported from the spreadsheet |

### Updating the plan

`data.js` is generated from the source `.xlsx`. To refresh it, re-export the
`Calendar Plan`, `Weekly Load`, `HR Zones`, and `6:15 Target` sheets into the
`PLAN_DAYS` / `PLAN_META` shape already in the file.
