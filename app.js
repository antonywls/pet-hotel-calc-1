const OpeningHour  = 10;
const ClosingHour  = 20;
const BufferTime   = 1;
const OvernightPivot = 3;

const dailyRate = { small: 700, medium: 800, large: 1000 };
const hourlyRate = { small: 100, medium: 120, large: 150 };

const sizeLabel = { small: "5公斤以下", medium: "6-10公斤", large: "11-15公斤" };

const state = {
  inputsValid: true,
  planType: "",
  dogSizes: ["small"],  // array of sizes per dog
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

// Combined rates (sum across all dogs)
function getCombinedRates() {
  let daily = 0, hourly = 0;
  for (const size of state.dogSizes) {
    if (size) { daily += dailyRate[size]; hourly += hourlyRate[size]; }
  }
  return { daily, hourly };
}

// DOM refs
const priceForm          = document.getElementById("priceForm");
const dogCountEl         = document.getElementById("dogCount");
const dogSizesContainer  = document.getElementById("dogSizesContainer");
const startDate          = document.getElementById("startDate");
const startTime          = document.getElementById("startTime");
const endDate            = document.getElementById("endDate");
const endTime            = document.getElementById("endTime");
const finalPriceEl       = document.getElementById("finalPrice");
const dateTimeSelection  = document.getElementById("dateTimeSelection");
const startTimeSelection = document.getElementById("startTimeSelection");
const endTimeSelection   = document.getElementById("endTimeSelection");
const breakdownEl        = document.getElementById("breakdown");

// Render dog size selectors
function renderDogSizeSelectors() {
  const count = parseInt(dogCountEl.value) || 1;
  // Preserve existing selections
  const prev = state.dogSizes.slice();
  state.dogSizes = Array.from({ length: count }, (_, i) => prev[i] || "small");

  dogSizesContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "dog-size-row";

    const label = document.createElement("label");
    label.setAttribute("for", `dogSize_${i}`);
    label.textContent = count === 1 ? "狗狗體重：" : `第 ${i + 1} 隻：`;

    const select = document.createElement("select");
    select.className = "dropDown";
    select.id = `dogSize_${i}`;
    select.name = `dogSize_${i}`;
    select.innerHTML = `
      <option value="small">5公斤以下</option>
      <option value="medium">6-10公斤</option>
      <option value="large">11-15公斤</option>
    `;
    select.value = state.dogSizes[i];

    row.appendChild(label);
    row.appendChild(select);
    dogSizesContainer.appendChild(row);
  }
}

function readDogSizes() {
  const count = parseInt(dogCountEl.value) || 1;
  state.dogSizes = [];
  for (let i = 0; i < count; i++) {
    const el = document.getElementById(`dogSize_${i}`);
    state.dogSizes.push(el ? el.value : "small");
  }
}

function parseDateTime(dateString, timeString = "00:00") {
  const [y, m, d] = dateString.split("-").map(Number);
  const [hh, mm] = timeString.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

function parseMinutes(timeString) {
  const [hh, mm] = timeString.split(":").map(Number);
  return hh * 60 + mm;
}

function parseHours(timeString) {
  if (!timeString) return 0;
  const [hh, mm] = timeString.split(":").map(Number);
  return hh + mm / 60;
}

function calculateOvertime() {
  const { daily, hourly } = getCombinedRates();
  let startMinutes = parseMinutes(state.startTime);
  let endMinutes   = parseMinutes(state.endTime);
  if (startMinutes > endMinutes) endMinutes += 24 * 60;

  const ov = (L, U) => Math.max(0, Math.min(endMinutes, U) - Math.max(startMinutes, L));

  const zeroedMinutes = ov(0, OpeningHour * 60)
    + ov(ClosingHour * 60, (OpeningHour + 24) * 60)
    + ov((ClosingHour + 24) * 60, 48 * 60);

  state.overtime.zeroed = Math.ceil(zeroedMinutes / 30) / 2;
  state.overtime.normal = Math.ceil((endMinutes - startMinutes - zeroedMinutes) / 30) / 2;
  state.overtime.base   = state.overtime.zeroed + state.overtime.normal;

  state.overtime.countsAsExtraDay =
    state.overtime.normal * hourly >= daily
    || (state.startHour > state.endHour && state.endHour >= OvernightPivot);
}

function calculateSingleOffBusiness(contactHour) {
  if (contactHour >= OpeningHour && contactHour <= ClosingHour)
    return { base: 0, buffer: 0, double: 0 };

  let adj = contactHour;
  if (adj < ClosingHour) adj += 24;
  const openAdj = OpeningHour + 24;
  const currentBase = Math.ceil(Math.min(openAdj - adj, adj - ClosingHour) * 2) / 2;
  return { base: currentBase, buffer: Math.min(currentBase, BufferTime), double: Math.max(currentBase - BufferTime, 0) };
}

function calculateOffBusiness() {
  state.offBusiness.dropOff = calculateSingleOffBusiness(state.startHour);
  state.offBusiness.pickUp  = calculateSingleOffBusiness(state.endHour);
  state.offBusiness.total   = {
    base:   state.offBusiness.dropOff.base   + state.offBusiness.pickUp.base,
    buffer: state.offBusiness.dropOff.buffer + state.offBusiness.pickUp.buffer,
    double: state.offBusiness.dropOff.double + state.offBusiness.pickUp.double,
  };
}

function calculateDuration() {
  const dayMs = 86400000;
  const startMidnight = parseDateTime(state.startDate);
  const endMidnight   = parseDateTime(state.endDate);

  if (startMidnight > endMidnight) state.inputsValid = false;

  if (state.planType === 'A' && state.startDate && state.endDate) {
    state.overtime = { countsAsExtraDay: false, base: 0, zeroed: 0, normal: 0 };
    const empty = { base: 0, buffer: 0, double: 0 };
    state.offBusiness = { dropOff: empty, pickUp: empty, total: empty };
    state.days = Math.max(0, Math.round((endMidnight - startMidnight) / dayMs) + 1);
  } else if (state.planType === 'B' && state.startDate && state.endDate && state.startTime && state.endTime) {
    const start = parseDateTime(state.startDate, state.startTime);
    const end   = parseDateTime(state.endDate, state.endTime);
    if (start > end) state.inputsValid = false;
    state.days = Math.floor(Math.max(0, end - start) / dayMs);
    calculateOvertime();
    calculateOffBusiness();
  }
}

function calculateFinal() {
  if (!state.planType || !state.dogSizes.every(s => s) || !state.startDate || !state.endDate || !state.inputsValid)
    return 0;

  const { daily, hourly } = getCombinedRates();

  if (state.planType === "A") return daily * state.days;

  if (state.planType === "B" && state.startTime && state.endTime) {
    let total = daily * state.days
      + state.offBusiness.total.buffer * hourly
      + state.offBusiness.total.double * hourly * 2;
    if (state.overtime.countsAsExtraDay) total += daily;
    else total += state.overtime.normal * hourly;
    return total;
  }
  return 0;
}

function fmt(n) { return `$${n.toFixed(0)}`; }

function renderBreakdown() {
  if (state.finalPrice === 0 || !state.inputsValid) {
    breakdownEl.classList.add("hidden");
    return;
  }

  const { daily, hourly } = getCombinedRates();
  const count = state.dogSizes.length;
  const rows = [];

  // Dog rate summary
  if (count > 1) {
    rows.push({ label: "住宿費率（合計）", value: `${fmt(daily)}/天　${fmt(hourly)}/時`, sub: false });
    for (let i = 0; i < count; i++) {
      const sz = state.dogSizes[i];
      rows.push({ label: `第 ${i + 1} 隻（${sizeLabel[sz]}）`, value: `${fmt(dailyRate[sz])}/天　${fmt(hourlyRate[sz])}/時`, sub: true });
    }
  } else {
    const sz = state.dogSizes[0];
    rows.push({ label: `狗狗體型（${sizeLabel[sz]}）`, value: `${fmt(daily)}/天　${fmt(hourly)}/時`, sub: false });
  }

  // Plan A
  if (state.planType === "A") {
    rows.push({ label: `住宿天數 × ${state.days} 天`, value: fmt(daily * state.days), sub: false });
  }

  // Plan B
  if (state.planType === "B") {
    rows.push({ label: `基本住宿 × ${state.days} 天`, value: fmt(daily * state.days), sub: false });

    if (state.overtime.countsAsExtraDay) {
      rows.push({ label: "超時費用（以加收一天計）", value: fmt(daily), sub: false });
    } else if (state.overtime.normal > 0) {
      rows.push({ label: `超時費用 × ${state.overtime.normal} 時`, value: fmt(state.overtime.normal * hourly), sub: false });
    }

    if (state.offBusiness.total.buffer > 0) {
      rows.push({ label: `非營業時間附加（單倍）× ${state.offBusiness.total.buffer} 時`, value: fmt(state.offBusiness.total.buffer * hourly), sub: false });
    }
    if (state.offBusiness.total.double > 0) {
      rows.push({ label: `非營業時間附加（雙倍）× ${state.offBusiness.total.double} 時`, value: fmt(state.offBusiness.total.double * hourly * 2), sub: false });
    }
  }

  rows.push({ label: "總計", value: fmt(state.finalPrice), total: true });

  breakdownEl.innerHTML = `<div class="breakdown-title">費用明細</div>` +
    rows.map(r => `<div class="breakdown-row${r.sub ? " sub" : ""}${r.total ? " total-row" : ""}">
      <span>${r.label}</span>
      <span class="breakdown-value">${r.value}</span>
    </div>`).join("");

  breakdownEl.classList.remove("hidden");
}

function readInputs() {
  state.inputsValid = true;
  state.overtime.countsAsExtraDay = false;
  state.planType = document.querySelector('input[name="planType"]:checked')?.value ?? "";
  readDogSizes();
  state.startDate = startDate.value;
  state.startTime = startTime.value;
  state.endDate   = endDate.value;
  state.endTime   = endTime.value;
  state.startHour = parseHours(state.startTime);
  state.endHour   = parseHours(state.endTime);
}

function updateForm() {
  readInputs();
  calculateDuration();
  state.finalPrice = calculateFinal();
  renderFinal();
}

function renderFinal() {
  if (state.planType) dateTimeSelection.classList.remove("hidden");
  else dateTimeSelection.classList.add("hidden");

  if (state.planType === "B") {
    startTimeSelection.classList.remove("hidden");
    endTimeSelection.classList.remove("hidden");
  } else {
    startTimeSelection.classList.add("hidden");
    endTimeSelection.classList.add("hidden");
  }

  if (state.finalPrice === 0 || !state.inputsValid) {
    finalPriceEl.textContent = "--";
  } else {
    finalPriceEl.textContent = `$${state.finalPrice.toFixed(0)}`;
  }

  renderBreakdown();
}

// Init dog size selectors
renderDogSizeSelectors();
updateForm();

dogCountEl.addEventListener("change", () => {
  renderDogSizeSelectors();
  updateForm();
});

priceForm.addEventListener("input", updateForm);
priceForm.addEventListener("change", updateForm);