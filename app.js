/* ==========================================================================
   70.3 · Dawn Patrol — training plan viewer
   Data: PLAN_DAYS (259 days) + PLAN_META, from data.js
   ========================================================================== */
(function () {
  "use strict";

  const DAYS = PLAN_DAYS;
  const META = PLAN_META;
  const RACE = "2027-03-21";
  const START = DAYS[0].date;
  const END = DAYS[DAYS.length - 1].date;

  // index days by date for O(1) lookup
  const byDate = {};
  DAYS.forEach((d, i) => { d._i = i; byDate[d.date] = d; });

  // group weeks
  const weeks = {};
  DAYS.forEach(d => { (weeks[d.week] = weeks[d.week] || []).push(d); });
  const weekNums = Object.keys(weeks).map(Number).sort((a, b) => a - b);

  // per-week aggregates for insight context
  Object.values(weeks).forEach(wd => {
    const total = wd.reduce((s, d) => s + d.hours, 0);
    let key = wd[0];
    wd.forEach(d => { if (d.hours > key.hours) key = d; });
    wd.forEach(d => { d._weekTotal = total; d._isKey = (d === key && d.hours >= 1); });
  });

  /* ---------- date helpers ---------- */
  function todayISO() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  function parseISO(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function prettyDate(s) { const d = parseISO(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
  function prettyShort(s) { const d = parseISO(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; }

  // which plan date should be "today"
  function resolveToday() {
    const t = todayISO();
    if (t < START) return { date: START, before: true };
    if (t > END) return { date: END, after: true };
    return byDate[t] ? { date: t } : { date: START };
  }

  /* ---------- sport visuals ---------- */
  const SPORT = {
    Swim: { c: "var(--swim)", icon: '<path d="M2 15c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M2 19c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="6" r="2" fill="currentColor"/><path d="M6 12l4-2 4 1 3-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
    Bike: { c: "var(--bike)", icon: '<circle cx="5.5" cy="16.5" r="3.3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18.5" cy="16.5" r="3.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 16.5l4-8h5l-3.5 8m3.5-8l3.5 8M9 8.5h-2m8 0h2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14.5" cy="5.5" r="1.2" fill="currentColor"/>' },
    Run: { c: "var(--run)", icon: '<circle cx="15" cy="4.5" r="2" fill="currentColor"/><path d="M13 8l-3.5 2.5 2.5 2 1 4m-1-4l3.5 1.5 2 3M11.5 10l-2.5 4-3 1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
    Strength: { c: "var(--strength)", icon: '<path d="M4 9v6M6.5 7.5v9M17.5 7.5v9M20 9v6M6.5 12h11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' },
    Rest: { c: "var(--rest)", icon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
    Race: { c: "var(--race)", icon: '<path d="M6 3v18M6 4h11l-2 3 2 3H6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' }
  };
  function sportInfo(name) { return SPORT[name.split("/")[0]] || SPORT.Rest; }

  const EFFORT = {
    rest: { c: "var(--rest)", label: "Rest", bg: "rgba(107,118,136,.14)", bd: "rgba(107,118,136,.4)" },
    easy: { c: "var(--z2)", label: "Easy · aerobic", bg: "rgba(55,196,168,.13)", bd: "rgba(55,196,168,.4)" },
    moderate: { c: "var(--z3)", label: "Moderate · quality", bg: "rgba(255,176,58,.14)", bd: "rgba(255,176,58,.4)" },
    hard: { c: "var(--z5)", label: "Hard · intensity", bg: "rgba(255,77,97,.13)", bd: "rgba(255,77,97,.4)" },
    race: { c: "var(--race)", label: "Race day", bg: "rgba(255,209,92,.16)", bd: "rgba(255,209,92,.5)" }
  };

  /* ---------- duration humanizer ---------- */
  function humanDur(hm) {
    if (!hm || hm === "0:00") return "0 min";
    const [h, m] = hm.split(":").map(Number);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  function hoursToHM(hoursFloat) {
    const total = Math.round(hoursFloat * 60);
    const h = Math.floor(total / 60), m = total % 60;
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
  }
  function durMinutes(hm) { const [h, m] = hm.split(":").map(Number); return h * 60 + m; }
  function fmtClock(minFloat) {
    let m = Math.floor(minFloat), s = Math.round((minFloat - m) * 60);
    if (s === 60) { m++; s = 0; }
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  // implied target pace for a segment, derived from its prescribed distance ÷ duration
  function computePace(s) {
    if (!s.dist) return null;
    const min = durMinutes(s.dur);
    if (!min) return null;
    const num = (s.dist.replace(/,/g, "").match(/[\d.]+/) || [])[0];
    if (!num) return null;
    const v = parseFloat(num);
    if (s.sport === "Swim" && /yd/.test(s.dist)) return { val: fmtClock(min / (v / 100)), unit: "/100yd" };
    if (s.sport === "Run" && /mi/.test(s.dist)) return { val: fmtClock(min / v), unit: "/mi" };
    if (s.sport === "Bike" && /mi/.test(s.dist)) return { val: (v / (min / 60)).toFixed(1), unit: "mph" };
    return null;
  }

  /* ==========================================================================
     THE COACH — natural-language insight for a given day
     ========================================================================== */
  function buildInsight(d) {
    const dayName = d.day;
    if (d.effort === "race") {
      return {
        head: "Everything has led here",
        text: `<span class="lead">Race day.</span> Thirty-seven weeks fold into this one morning — <em>70.3 miles</em>: a 1.2-mile swim, 56 on the bike, then a half-marathon to close. Pace by heart rate, not adrenaline. Fuel early and keep fueling. Trust the durability you've built and let the plan run. Target <em>6:15</em> — but a controlled finish is the real win.`
      };
    }
    if (d.effort === "rest") {
      const note = d.notes.join(" ") || d.purpose;
      return {
        head: "A day to absorb the work",
        text: `<span class="lead">Rest day.</span> Nothing to chase — this is where the training actually turns into fitness. ${note ? note + " " : ""}Prioritise sleep, eat well, move gently if you feel like it. Showing up recovered on ${nextTrainingDay(d)} matters more than anything you could do today.`
      };
    }

    // training day — compose from parts
    const sports = d.segments.map(s => s.sport.split("/")[0]);
    const uniqueSports = [...new Set(sports)];
    const isBrick = /brick/i.test(d.title) || (uniqueSports.includes("Bike") && uniqueSports.includes("Run") && d.hours >= 2);
    const isLong = d.hours >= 2 || /long/i.test(d.title);
    const isTest = /test|lthr|benchmark/i.test(d.title + " " + d.zones) || (d.effort === "hard" && /test/i.test(d.purpose));
    const mins = Math.round(d.hours * 60);

    // 1) opening — role in the week
    let open;
    if (d._isKey && isLong) open = `This is the anchor of your week`;
    else if (d._isKey) open = `Today's the standout session of the week`;
    else if (mins <= 35) open = `A short, easy touch`;
    else if (d.effort === "easy") open = `A steady aerobic day`;
    else if (d.effort === "moderate") open = `A quality day with real purpose`;
    else open = `An intensity day`;

    // 2) what you'll do
    const parts = d.segments.map(s => {
      const dist = s.dist ? ` (${s.dist})` : "";
      return `a ${humanDur(s.dur)} ${s.sport.toLowerCase()}${dist}`;
    });
    let doing;
    if (parts.length === 1) doing = `${parts[0]}`;
    else if (parts.length === 2) doing = `${parts[0]} paired with ${parts[1]}`;
    else doing = parts.slice(0, -1).join(", ") + `, and ${parts[parts.length - 1]}`;

    // 3) how it should feel
    let feel;
    if (d.effort === "easy") feel = `Keep it in <em>Zone 1–2</em> the whole way — conversational, low, unhurried. You should finish feeling like you could turn round and do it again.`;
    else if (d.effort === "moderate") feel = `There's controlled quality in here — around <em>70.3 race effort</em>. Work, but never gasping: hold the top of Zone 2 into Zone 3 and keep your form tidy.`;
    else feel = `This one bites — <em>threshold or test-level</em> work. Warm up properly, hit the hard part with control, and resist the urge to turn the easy portions into more hard portions.`;

    // 4) special cues
    const cues = [];
    if (isTest) cues.push(`It's a benchmark — only test if you're rested; a tired test tells you nothing.`);
    if (isBrick) cues.push(`Running straight off the bike is the whole point — your legs will feel strange for the first mile, and that's exactly the adaptation.`);
    if (mins >= 90 && (uniqueSports.includes("Bike") || uniqueSports.includes("Run"))) cues.push(`Long enough to practise fuelling: <em>60–90 g of carbs per hour</em>, and drink to thirst.`);
    if (d.weekType && /recovery|taper/i.test(d.weekType)) cues.push(`This is a ${/taper/i.test(d.weekType) ? "taper" : "recovery"} week — resist adding extra; less is the plan.`);

    const purposeLine = d.purpose ? ` The goal: ${d.purpose.charAt(0).toLowerCase() + d.purpose.slice(1)}.` : "";

    let text = `<span class="lead">${open}</span> — ${doing}. ${feel}`;
    if (cues.length) text += " " + cues[0];
    text += purposeLine;

    const heads = {
      easy: "Keep it light and repeatable",
      moderate: "Controlled quality today",
      hard: "Sharp edges — handle with care"
    };
    return { head: isBrick ? "Bike-to-run, the race rehearsal" : (isTest ? "A checkpoint on your fitness" : heads[d.effort]), text };
  }

  function nextTrainingDay(d) {
    for (let i = d._i + 1; i < DAYS.length; i++) if (DAYS[i].effort !== "rest") return DAYS[i].day + "'s session";
    return "your next session";
  }

  /* ==========================================================================
     RENDER — focus card
     ========================================================================== */
  let selected = resolveToday().date;
  const TODAY = resolveToday();

  function isDone(date) { return localStorage.getItem("done:" + date) === "1"; }
  function setDone(date, v) { v ? localStorage.setItem("done:" + date, "1") : localStorage.removeItem("done:" + date); }

  function renderFocus() {
    const d = byDate[selected];
    const eff = EFFORT[d.effort];
    const ins = buildInsight(d);
    const done = isDone(d.date);
    const isToday = d.date === TODAY.date && !TODAY.before && !TODAY.after;

    const chips = d.sports.map(s => {
      const si = sportInfo(s);
      return `<span class="chip" style="color:${si.c}"><svg viewBox="0 0 24 24">${si.icon}</svg><span style="color:var(--text)">${s}</span></span>`;
    }).join("");

    let metrics = "";
    if (d.effort !== "rest") {
      metrics += mCell(hoursToHM(d.hours), "total time");
      if (d.distance) metrics += mCell(distMain(d.distance), distUnit(d.distance));
    } else {
      metrics += mCell("Rest", "recovery");
    }
    metrics += mCell(d.segments.length || "—", d.segments.length === 1 ? "session" : "sessions");
    metrics += mCell("W" + d.week, "of 37");

    let segs = "";
    if (d.segments.length) {
      segs = `<div class="segs"><div class="segs-lab">The session</div>` + d.segments.map(s => {
        const si = sportInfo(s.sport);
        const zone = s.zone ? `<span class="seg-zone">${zoneShort(s.zone)}</span>` : "";
        const dist = s.dist ? `<span class="seg-dist">${s.dist}</span>` : "";
        const p = computePace(s);
        const pace = p ? `<span class="seg-pace" title="Target pace — implied by the prescribed distance over this duration"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="7"/><path d="M12 13l3-3M12 3h0M9 3h6"/></svg>${p.val}<em>${p.unit}</em></span>` : "";
        return `<div class="seg">
          <div class="seg-icon" style="background:${hexA(si.c, .16)};color:${si.c}"><svg viewBox="0 0 24 24">${si.icon}</svg></div>
          <div class="seg-main">
            <div class="seg-head"><span class="seg-sport">${s.label || s.sport}</span><span class="seg-dur">${humanDur(s.dur)}</span>${dist}${pace}${zone}</div>
            <div class="seg-desc">${s.desc}</div>
          </div>
        </div>`;
      }).join("") + `</div>`;
    } else if (d.notes.length) {
      segs = `<div class="segs"><div class="segs-lab">Notes</div><div class="seg"><div class="seg-main"><div class="seg-desc">${d.notes.join("<br>")}</div></div></div></div>`;
    }

    const focus = document.getElementById("focus");
    focus.innerHTML = `
      <article class="focus-card ${done ? "is-done" : ""} ${d.effort === "rest" ? "is-rest" : ""}">
        <div class="focus-top">
          <div class="focus-datewrap">
            <span class="focus-eyebrow">${isToday ? "● Today" : (TODAY.before && d.date === START ? "Plan begins" : d.day)}</span>
            <span class="focus-day">${d.day}</span>
            <span class="focus-datefull">${prettyDate(d.date)}</span>
          </div>
          <div class="focus-nav">
            <button id="fPrev" aria-label="Previous day">‹</button>
            <div class="focus-weekchip">WEEK <b>${d.week}</b> / 37<br>${d.phase}</div>
            <button id="fNext" aria-label="Next day">›</button>
          </div>
        </div>
        <div class="focus-body">
          <h2 class="focus-title">${d.title}<span class="effort-tag" style="background:${eff.bg};border:1px solid ${eff.bd};color:${eff.c}"><span class="effort-dot" style="background:${eff.c}"></span>${eff.label}</span></h2>
          <div class="chips">${chips}</div>
          <div class="metrics">${metrics}</div>
          ${vacationBanner(d)}
          <div class="insight">
            <div class="insight-lab">◆ What today will feel like</div>
            <div class="insight-text">${ins.text}</div>
          </div>
          ${segs}
          ${d.effort !== "rest" ? `<div class="done-toggle"><button id="doneBtn" class="${done ? "done" : ""}"><span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 12l5 5L20 6"/></svg></span>${done ? "Completed" : "Mark complete"}</button></div>` : ""}
        </div>
      </article>`;

    document.getElementById("fPrev").onclick = () => step(-1);
    document.getElementById("fNext").onclick = () => step(1);
    const db = document.getElementById("doneBtn");
    if (db) db.onclick = () => { setDone(d.date, !isDone(d.date)); renderFocus(); renderWeek(); };

    // topbar phase
    document.getElementById("phasePill").textContent = d.phase;
  }

  function mCell(val, lab) { return `<div class="metric"><span class="m-val">${val}</span><span class="m-lab">${lab}</span></div>`; }

  // vacation-window notice, shown for days affected by the schedule adjustment
  const PLANE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M21 15.5l-8.5-2.2V6.2a1.7 1.7 0 00-3.4 0v7.1L1 15.5v2l7.1-1.5v3.3l-2 1.3v1.4l3.7-1 3.7 1v-1.4l-2-1.3v-3.3L21 17.5z"/></svg>';
  function vacationState(date) {
    const v = META.vacation; if (!v) return null;
    if (date >= v.window && date <= v.windowEnd) return "on";
    if (date > v.windowEnd && date <= "2026-08-16") return "reentry";
    return null;
  }
  function vacationBanner(d) {
    const st = vacationState(d.date);
    if (!st) return "";
    const v = META.vacation;
    if (st === "reentry") {
      return `<div class="vac-banner reentry"><span class="vac-ic">${PLANE}</span><div><span class="vac-lab">Post-vacation re-entry</span><span class="vac-txt">${v.reentry}</span></div></div>`;
    }
    return `<div class="vac-banner"><span class="vac-ic">${PLANE}</span><div><span class="vac-lab">Vacation · run-only block (Jul 23 – Aug 8)</span><span class="vac-txt">${v.constraint} ${v.safety}</span></div></div>`;
  }
  function distMain(s) { return s.split(";")[0].trim().split(" ")[0]; }
  function distUnit(s) {
    const first = s.split(";")[0].trim();
    const m = first.match(/(yd|mi|km|m)\b/);
    return m ? (m[1] === "mi" ? "miles" : m[1] === "yd" ? "yards" : m[1]) : "distance";
  }
  function zoneShort(z) {
    const m = z.match(/Z\d(?:-Z\d)?/);
    return m ? m[0] : (z.length > 16 ? z.slice(0, 15) + "…" : z);
  }

  function step(n) {
    const cur = byDate[selected]._i;
    const nx = Math.min(DAYS.length - 1, Math.max(0, cur + n));
    selected = DAYS[nx].date;
    render();
  }

  /* ==========================================================================
     RENDER — week strip
     ========================================================================== */
  function renderWeek() {
    const wk = byDate[selected].week;
    const wd = weeks[wk];
    const strip = document.getElementById("weekstrip");
    strip.innerHTML = wd.map(d => {
      const eff = EFFORT[d.effort];
      const dots = d.sports.map(s => `<span class="dt-dot" style="background:${sportInfo(s).c}"></span>`).join("");
      const isToday = d.date === TODAY.date && !TODAY.before && !TODAY.after;
      const cls = [
        "daytile",
        isToday ? "is-today" : "",
        d.date === selected ? "is-selected" : "",
        isDone(d.date) ? "done" : ""
      ].join(" ");
      return `<button class="${cls}" data-date="${d.date}">
        ${isToday ? '<span class="dt-today-flag">TODAY</span>' : ""}
        <svg class="dt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 12l5 5L20 6"/></svg>
        <div class="dt-top"><span class="dt-day">${d.day.slice(0, 3)}</span><span class="dt-date">${parseISO(d.date).getDate()}</span></div>
        <div class="dt-dots">${dots}</div>
        <div class="dt-title ${d.effort === "rest" ? "rest" : ""}">${d.title}</div>
        <div class="dt-foot"><span class="dt-hours">${d.hours > 0 ? hoursToHM(d.hours) : "—"}</span><span class="dt-effort" style="background:${eff.c}"></span></div>
      </button>`;
    }).join("");
    strip.querySelectorAll(".daytile").forEach(el => {
      el.onclick = () => { selected = el.dataset.date; render(); };
    });

    // week header
    const total = wd[0]._weekTotal;
    const kicker = wk === byDate[TODAY.date].week && !TODAY.before ? "THIS WEEK" : "WEEK IN VIEW";
    document.getElementById("wkKicker").textContent = kicker;
    document.getElementById("wkTitle").textContent = `Week ${wk} · ${wd[0].phase}`;
    document.getElementById("wkMeta").textContent = `${prettyShort(wd[0].date)} – ${prettyShort(wd[6].date)}  ·  ${hoursToHM(total)} planned  ·  ${wd[0].weekType}`;
  }

  document.getElementById("wkPrev").onclick = () => jumpWeek(-1);
  document.getElementById("wkNext").onclick = () => jumpWeek(1);
  function jumpWeek(n) {
    const wk = byDate[selected].week;
    const idx = weekNums.indexOf(wk);
    const nw = Math.min(weekNums.length - 1, Math.max(0, idx + n));
    selected = weeks[weekNums[nw]][0].date;
    render();
  }

  /* ==========================================================================
     RENDER — load chart
     ========================================================================== */
  const PHASE_COLORS = {};
  function phaseColor(phase) {
    const order = [...new Set(DAYS.map(d => d.phase))];
    const hues = ["#4d9dff", "#37c4a8", "#ffb03a", "#ff8a3d", "#ff6a3d", "#ff4d61"];
    const i = order.indexOf(phase);
    return hues[i % hues.length];
  }
  function renderLoad() {
    const totals = weekNums.map(w => {
      const wd = weeks[w];
      return { w, hours: wd[0]._weekTotal, phase: wd[0].phase, taper: /recovery|taper/i.test(wd[0].weekType) };
    });
    const max = Math.max(...totals.map(t => t.hours));
    const curWk = byDate[selected].week;
    const chart = document.getElementById("loadchart");
    chart.innerHTML = totals.map(t => {
      const h = Math.max(4, (t.hours / max) * 100);
      const col = phaseColor(t.phase);
      return `<div class="bar ${t.w === curWk ? "current" : ""}" data-week="${t.w}"
        style="height:${h}%;background:linear-gradient(180deg,${col},${hexA(col, .45)});${t.taper ? "outline:1px dashed rgba(255,255,255,.35);outline-offset:-2px;" : ""}">
        <span class="tip">Wk ${t.w} · <b>${hoursToHM(t.hours)}</b><br>${t.phase}${t.taper ? " · taper" : ""}</span>
      </div>`;
    }).join("");
    chart.querySelectorAll(".bar").forEach(b => {
      b.onclick = () => { selected = weeks[Number(b.dataset.week)][0].date; render(); document.getElementById("focus").scrollIntoView({ behavior: "smooth" }); };
    });

    // legend
    const order = [...new Set(DAYS.map(d => d.phase))];
    document.getElementById("phaseLegend").innerHTML = order.map(p =>
      `<span class="leg"><span class="leg-sw" style="background:${phaseColor(p)}"></span>${p}</span>`
    ).join("") + `<span class="leg"><span class="leg-sw" style="background:transparent;border:1px dashed rgba(255,255,255,.5)"></span>Recovery / taper</span>`;
  }

  /* ==========================================================================
     RENDER — reference tables (static)
     ========================================================================== */
  function renderReference() {
    const zColors = { "Z1": "var(--z1)", "Z2": "var(--z2)", "Z3": "var(--z3)", "Z4": "var(--z4)", "Z5": "var(--z5)" };
    document.getElementById("zonesTable").innerHTML = META.hrZones.filter(r => /^Z\d/.test(r[0])).map(r => {
      const zkey = r[0].match(/Z\d/)[0];
      const col = zColors[zkey] || "var(--z2)";
      return `<div class="zrow">
        <span class="zbadge" style="background:${col}">${zkey}</span>
        <div><div class="zname">${r[0].replace(/Z\d\s*/, "")}</div><div class="zuse">${r[2] || ""}</div></div>
        <span class="zrange">${r[1]}</span>
      </div>`;
    }).join("");

    // 6:15 target — rows 2..8 are components incl total
    const tgt = META.target;
    const compColors = { Swim: "var(--swim)", Bike: "var(--bike)", Run: "var(--run)", T1: "var(--rest)", T2: "var(--rest)", Total: "var(--race)" };
    let rows = "";
    for (let i = 2; i <= 8 && i < tgt.length; i++) {
      const r = tgt[i];
      if (!r || !r[0]) continue;
      const isTotal = /total/i.test(r[0]);
      const col = compColors[r[0]] || "var(--muted)";
      rows += `<div class="trow ${isTotal ? "total" : ""}">
        <span class="t-comp"><span class="cd" style="background:${col}"></span>${r[0]}${r[2] && r[2] !== "—" ? ` <span style="color:var(--faint);font-weight:400;font-family:var(--font-mono);font-size:11px">${r[2]}</span>` : ""}</span>
        <span class="t-time">${r[1]}</span>
        <span class="t-pace">${r[3] && r[3] !== "—" ? r[3] : ""}</span>
      </div>`;
    }
    document.getElementById("targetTable").innerHTML = rows;
  }

  /* ---------- countdown ---------- */
  function renderCountdown() {
    const t = todayISO();
    const el = document.getElementById("countdown");
    if (t < START) {
      el.innerHTML = `Plan starts in <b>${daysBetween(t, START)}</b> days`;
    } else if (t > RACE) {
      el.innerHTML = `<b>Race complete</b> · 70.3 done`;
    } else {
      el.innerHTML = `<b>${daysBetween(t, RACE)}</b> days to race day`;
    }
  }

  /* ---------- utils ---------- */
  function hexA(varOrHex, a) {
    // accept hex like #ff6a3d; for CSS var() fall back to a translucent overlay via color-mix-ish
    if (varOrHex.startsWith("#")) {
      const n = parseInt(varOrHex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    // var(--x): use color-mix if supported, else the var itself
    return `color-mix(in srgb, ${varOrHex} ${Math.round(a * 100)}%, transparent)`;
  }

  /* ---------- master render ---------- */
  function render() {
    renderFocus();
    renderWeek();
    renderLoad();
  }

  document.getElementById("btnToday").onclick = () => { selected = resolveToday().date; render(); document.getElementById("focus").scrollIntoView({ behavior: "smooth" }); };

  // keyboard nav
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "ArrowLeft") { step(-1); }
    if (e.key === "ArrowRight") { step(1); }
  });

  // init
  renderCountdown();
  renderReference();
  render();
})();
