// ── Pricing constants (edit here) ──────────────────────────────
const OpeningHour    = 10;
const ClosingHour    = 20;     // Must be before midnight
const BufferTime     = 1;      // Hours after closing / before opening with single (not double) rate
const OvernightPivot = 3;      // If overtime crosses this hour it counts as an extra day

const dailyRate  = { small: 700,  medium: 800,  large: 1000, xlarge: 1200, xxlarge: 1500 };
const hourlyRate = { small: 100,  medium: 120,  large: 150,  xlarge: 180,  xxlarge: 200  };

const walkPrice  = 100;   // Per walk, per dog
const sleepPrice = 500;   // Per night, per dog (companion sleep-over)
// ────────────────────────────────────────────────────────────────

const sizeLabel = { small: "5公斤以下", medium: "6-10公斤", large: "11-15公斤", xlarge: "16-20公斤", xxlarge: "21公斤以上" };

const state = {
  inputsValid: true,
  planType: "",
  dogs: [],          // [{ size, walks, sleeps }]
  startDate: "", startTime: "", endDate: "", endTime: "",
  startHour: null, endHour: null,
  days: null,
  overtime: { countsAsExtraDay: false, base: null, zeroed: null, normal: null },
  offBusiness: {
    dropOff: { base: null, buffer: null, double: null },
    pickUp:  { base: null, buffer: null, double: null },
    total:   { base: null, buffer: null, double: null },
  },
  finalPrice: 0,
};

// Combined base rates (sum across all dogs, excluding add-ons)
function getCombinedRates() {
  let daily = 0, hourly = 0;
  for (const d of state.dogs) {
    if (d.size) { daily += dailyRate[d.size]; hourly += hourlyRate[d.size]; }
  }
  return { daily, hourly };
}

// ── DOM refs ───────────────────────────────────────────────────
const priceForm          = document.getElementById("priceForm");
const dogCountEl         = document.getElementById("dogCount");
const dogSizesContainer  = document.getElementById("dogSizesContainer");
const startDateEl        = document.getElementById("startDate");
const startTimeEl        = document.getElementById("startTime");
const endDateEl          = document.getElementById("endDate");
const endTimeEl          = document.getElementById("endTime");
const finalPriceEl       = document.getElementById("finalPrice");
const dateTimeSelection  = document.getElementById("dateTimeSelection");
const startTimeSelection = document.getElementById("startTimeSelection");
const endTimeSelection   = document.getElementById("endTimeSelection");
const breakdownEl        = document.getElementById("breakdown");
const cardA              = document.getElementById("cardA");
const cardB              = document.getElementById("cardB");

// ── Dog cards renderer ─────────────────────────────────────────
function renderDogCards() {
  const count = parseInt(dogCountEl.value) || 1;
  const prev  = state.dogs.slice();
  state.dogs  = Array.from({ length: count }, (_, i) => ({
    size:   prev[i]?.size  ?? "small",
    walks:  prev[i]?.walks  ?? 0,
    sleeps: prev[i]?.sleeps ?? 0,
  }));

  dogSizesContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const dog  = state.dogs[i];
    const card = document.createElement("div");
    card.className = "dog-card";
    card.innerHTML = `
      <div class="dog-card-title">${count === 1 ? "🐶 狗狗資訊" : `🐶 第 ${i + 1} 隻`}</div>

      <div class="dog-card-row">
        <label for="dogSize_${i}">⚖️ 體重：</label>
        <select id="dogSize_${i}" name="dogSize_${i}">
          <option value="small"   ${dog.size==="small"   ? "selected" : ""}>5公斤以下</option>
          <option value="medium"  ${dog.size==="medium"  ? "selected" : ""}>6-10公斤</option>
          <option value="large"   ${dog.size==="large"   ? "selected" : ""}>11-15公斤</option>
          <option value="xlarge"  ${dog.size==="xlarge"  ? "selected" : ""}>16-20公斤</option>
          <option value="xxlarge" ${dog.size==="xxlarge" ? "selected" : ""}>21公斤以上</option>
        </select>
      </div>

      <div class="dog-card-row">
        <div class="addon-row">
          <span class="addon-label">
            🦮 散步
            <span class="addon-price-tag">+$${walkPrice}/次</span>
          </span>
          <div class="qty-control">
            <button type="button" class="qty-btn" data-dog="${i}" data-type="walks" data-delta="-1">−</button>
            <span class="qty-display" id="walks_${i}">${dog.walks}</span>
            <button type="button" class="qty-btn" data-dog="${i}" data-type="walks" data-delta="1">+</button>
          </div>
        </div>
      </div>

      <div class="dog-card-row">
        <div class="addon-row">
          <span class="addon-label">
            🌙 陪睡
            <span class="addon-price-tag">+$${sleepPrice}/晚</span>
          </span>
          <div class="qty-control">
            <button type="button" class="qty-btn" data-dog="${i}" data-type="sleeps" data-delta="-1">−</button>
            <span class="qty-display" id="sleeps_${i}">${dog.sleeps}</span>
            <button type="button" class="qty-btn" data-dog="${i}" data-type="sleeps" data-delta="1">+</button>
          </div>
        </div>
      </div>
    `;
    dogSizesContainer.appendChild(card);
  }
}

// ── Qty buttons (event delegation) ────────────────────────────
dogSizesContainer.addEventListener("click", e => {
  const btn = e.target.closest(".qty-btn");
  if (!btn) return;
  const i     = parseInt(btn.dataset.dog);
  const type  = btn.dataset.type;   // "walks" | "sleeps"
  const delta = parseInt(btn.dataset.delta);
  state.dogs[i][type] = Math.max(0, state.dogs[i][type] + delta);
  document.getElementById(`${type}_${i}`).textContent = state.dogs[i][type];
  recalcAndRender();
});

// ── Read size dropdowns into state ────────────────────────────
function readDogSizes() {
  for (let i = 0; i < state.dogs.length; i++) {
    const el = document.getElementById(`dogSize_${i}`);
    if (el) state.dogs[i].size = el.value;
  }
}

// ── Helpers ───────────────────────────────────────────────────
function parseDateTime(dateStr, timeStr = "00:00") {
  const [y, m, d]   = dateStr.split("-").map(Number);
  const [hh, mm]    = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}
function parseMinutes(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}
function parseHours(t) {
  if (!t) return 0;
  const [hh, mm] = t.split(":").map(Number);
  return hh + mm / 60;
}

// ── Calculation helpers ───────────────────────────────────────
function calculateOvertime() {
  const { daily, hourly } = getCombinedRates();
  let sm = parseMinutes(state.startTime);
  let em = parseMinutes(state.endTime);
  if (sm > em) em += 24 * 60;

  const ov = (L, U) => Math.max(0, Math.min(em, U) - Math.max(sm, L));
  const zeroedMin = ov(0, OpeningHour * 60)
    + ov(ClosingHour * 60, (OpeningHour + 24) * 60)
    + ov((ClosingHour + 24) * 60, 48 * 60);

  state.overtime.zeroed = Math.ceil(zeroedMin / 30) / 2;
  state.overtime.normal = Math.ceil((em - sm) / 30) / 2;
  state.overtime.base   = state.overtime.normal;
  state.overtime.countsAsExtraDay =
    state.overtime.normal * hourly >= daily
    || (state.startHour > state.endHour && state.endHour >= OvernightPivot);
}

function calcSingleOffBusiness(h) {
  if (h >= OpeningHour && h <= ClosingHour) return { base: 0, buffer: 0, double: 0 };
  let adj = h; if (adj < ClosingHour) adj += 24;
  const openAdj = OpeningHour + 24;
  const base = Math.ceil(Math.min(openAdj - adj, adj - ClosingHour) * 2) / 2;
  return { base, buffer: Math.min(base, BufferTime), double: Math.max(base - BufferTime, 0) };
}

function calculateOffBusiness() {
  state.offBusiness.dropOff = calcSingleOffBusiness(state.startHour);
  state.offBusiness.pickUp  = calcSingleOffBusiness(state.endHour);
  state.offBusiness.total   = {
    base:   state.offBusiness.dropOff.base   + state.offBusiness.pickUp.base,
    buffer: state.offBusiness.dropOff.buffer + state.offBusiness.pickUp.buffer,
    double: state.offBusiness.dropOff.double + state.offBusiness.pickUp.double,
  };
}

function calculateDuration() {
  const dayMs = 86400000;
  const sm = parseDateTime(state.startDate);
  const em = parseDateTime(state.endDate);
  if (sm > em) state.inputsValid = false;

  if (state.planType === 'A' && state.startDate && state.endDate) {
    state.overtime = { countsAsExtraDay: false, base: 0, zeroed: 0, normal: 0 };
    const z = { base: 0, buffer: 0, double: 0 };
    state.offBusiness = { dropOff: z, pickUp: z, total: z };
    state.days = Math.max(0, Math.round((em - sm) / dayMs) + 1);
  } else if (state.planType === 'B' && state.startDate && state.endDate && state.startTime && state.endTime) {
    const s = parseDateTime(state.startDate, state.startTime);
    const e = parseDateTime(state.endDate, state.endTime);
    if (s > e) state.inputsValid = false;
    state.days = Math.floor(Math.max(0, e - s) / dayMs);
    calculateOvertime();
    calculateOffBusiness();
  }
}

// Add-on totals
function getAddonTotals() {
  let totalWalks = 0, totalSleeps = 0;
  for (const d of state.dogs) { totalWalks += d.walks; totalSleeps += d.sleeps; }
  return { totalWalks, totalSleeps };
}

function calculateFinal() {
  if (!state.planType || !state.dogs.every(d => d.size) || !state.startDate || !state.endDate || !state.inputsValid)
    return 0;

  const { daily, hourly } = getCombinedRates();
  const { totalWalks, totalSleeps } = getAddonTotals();
  const addonCost = totalWalks * walkPrice + totalSleeps * sleepPrice;

  if (state.planType === "A") {
    return daily * state.days + addonCost;
  }
  if (state.planType === "B" && state.startTime && state.endTime) {
    let total = daily * state.days
      + state.offBusiness.total.buffer * hourly
      + state.offBusiness.total.double * hourly * 2;
    if (state.overtime.countsAsExtraDay) total += daily;
    else total += state.overtime.normal * hourly;
    return total + addonCost;
  }
  return 0;
}

// ── Breakdown renderer ─────────────────────────────────────────
function fmt(n) { return `$${n.toFixed(0)}`; }

function renderBreakdown() {
  if (state.finalPrice === 0 || !state.inputsValid) {
    breakdownEl.classList.add("hidden"); return;
  }

  const { daily, hourly } = getCombinedRates();
  const count   = state.dogs.length;
  const isPlanB = state.planType === "B";
  const rows    = [];

  // Rate summary — type:'rate' rows render with separate daily/hourly value columns
  if (count > 1) {
    rows.push({ type: "rate", label: "住宿費率（合計）", daily: fmt(daily), hourly: fmt(hourly) });
    for (let i = 0; i < count; i++) {
      const sz = state.dogs[i].size;
      rows.push({ type: "rate", label: `第 ${i+1} 隻（${sizeLabel[sz]}）`, daily: fmt(dailyRate[sz]), hourly: fmt(hourlyRate[sz]), sub: true });
    }
  } else {
    const sz = state.dogs[0].size;
    rows.push({ type: "rate", label: `狗狗體型（${sizeLabel[sz]}）`, daily: fmt(daily), hourly: fmt(hourly) });
  }

  // Plan A
  if (state.planType === "A") {
    rows.push({ label: `基本住宿 × ${state.days} 天`, value: fmt(daily * state.days) });
  }

  // Plan B
  if (state.planType === "B") {
    rows.push({ label: `基本住宿 × ${state.days} 晚`, value: fmt(daily * state.days) });

    const hasHourly = state.overtime.countsAsExtraDay
      || state.overtime.normal > 0
      || state.offBusiness.total.buffer > 0
      || state.offBusiness.total.double > 0;

    if (hasHourly) {
      rows.push({ label: "安親", sectionHead: true });
      if (state.overtime.countsAsExtraDay) {
        rows.push({ label: "超時費用（以加收一天計）", value: fmt(daily) });
      } else if (state.overtime.normal > 0) {
        rows.push({ label: `超時費用 × ${state.overtime.normal} 時`, value: fmt(state.overtime.normal * hourly) });
      }
      if (state.offBusiness.total.buffer > 0)
        rows.push({ label: `非營業附加（單倍）× ${state.offBusiness.total.buffer} 時`, value: fmt(state.offBusiness.total.buffer * hourly) });
      if (state.offBusiness.total.double > 0)
        rows.push({ label: `非營業附加（雙倍）× ${state.offBusiness.total.double} 時`, value: fmt(state.offBusiness.total.double * hourly * 2) });
    }
  }

  // Add-ons per dog
  const hasAddons = state.dogs.some(d => d.walks > 0 || d.sleeps > 0);
  if (hasAddons) {
    rows.push({ label: "加購服務", sectionHead: true });
    for (let i = 0; i < count; i++) {
      const d = state.dogs[i];
      const label = count === 1 ? "" : `第 ${i+1} 隻　`;
      if (d.walks > 0)
        rows.push({ label: `${label}🦮 散步 × ${d.walks} 次`, value: fmt(d.walks * walkPrice), sub: true });
      if (d.sleeps > 0)
        rows.push({ label: `${label}🌙 陪睡 × ${d.sleeps} 晚`, value: fmt(d.sleeps * sleepPrice), sub: true });
    }
  }

  rows.push({ label: "總計", value: fmt(state.finalPrice), total: true });

  // Title row: column headers sit above the rate value columns
  const colHeaders = isPlanB
    ? `<div class="breakdown-col-headers"><span>寄宿費用</span><span>安親</span></div>`
    : `<div class="breakdown-col-headers single"><span>寄宿費用</span></div>`;

  const titleHtml = `<div class="breakdown-title-row">
    <span class="breakdown-title">費用明細</span>
    ${colHeaders}
  </div>`;

  breakdownEl.innerHTML = titleHtml + rows.map(r => {
    if (r.sectionHead) return `<div class="breakdown-section-head">${r.label}</div>`;

    if (r.type === "rate") {
      // Two-column rate row aligned with column headers above
      const hourlyHtml = isPlanB
        ? `<span class="breakdown-value">${r.hourly}/時</span>`
        : "";
      return `<div class="breakdown-row${r.sub ? " sub" : ""}">
        <span>${r.label}</span>
        <div class="rate-values${isPlanB ? "" : " single"}">
          <span class="breakdown-value">${r.daily}/天</span>
          ${hourlyHtml}
        </div>
      </div>`;
    }

    return `<div class="breakdown-row${r.sub ? " sub" : ""}${r.total ? " total-row" : ""}">
      <span>${r.label}</span>${r.value ? `<span class="breakdown-value">${r.value}</span>` : ""}
    </div>`;
  }).join("");

  breakdownEl.classList.remove("hidden");
}

// ── Plan card highlight ────────────────────────────────────────
function updatePlanCards() {
  cardA.classList.toggle("selected", state.planType === "A");
  cardB.classList.toggle("selected", state.planType === "B");
}

// ── Main update ───────────────────────────────────────────────
function readInputs() {
  state.inputsValid = true;
  state.overtime.countsAsExtraDay = false;
  state.planType  = document.querySelector('input[name="planType"]:checked')?.value ?? "";
  readDogSizes();
  state.startDate = startDateEl.value;
  state.startTime = startTimeEl.value;
  state.endDate   = endDateEl.value;
  state.endTime   = endTimeEl.value;
  state.startHour = parseHours(state.startTime);
  state.endHour   = parseHours(state.endTime);
}

function recalcAndRender() {
  calculateDuration();
  state.finalPrice = calculateFinal();
  renderFinal();
}

function updateForm() {
  readInputs();
  recalcAndRender();
}

function renderFinal() {
  updatePlanCards();

  if (state.planType) dateTimeSelection.classList.remove("hidden");
  else dateTimeSelection.classList.add("hidden");

  if (state.planType === "B") {
    startTimeSelection.classList.remove("hidden");
    endTimeSelection.classList.remove("hidden");
  } else {
    startTimeSelection.classList.add("hidden");
    endTimeSelection.classList.add("hidden");
  }

  finalPriceEl.textContent = (state.finalPrice > 0 && state.inputsValid)
    ? `$${state.finalPrice.toFixed(0)}`
    : "--";

  renderBreakdown();
}



// ── Init ──────────────────────────────────────────────────────
renderDogCards();
updateForm();

dogCountEl.addEventListener("change", () => {
  renderDogCards();
  updateForm();
});

priceForm.addEventListener("input",  updateForm);
priceForm.addEventListener("change", updateForm);