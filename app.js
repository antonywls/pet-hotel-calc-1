//24-hour format (hours), starting and ending time for double time rates at hourly overtime.
const DoubleRateEndHour   = 9;
const DoubleRateStartHour = 21;

const dailyRate = {
    small :     700,
    medium :    800,
    large :     1000
}

const hourlyRate = {
    small :     100,
    medium :    120,
    large :     150
}

const state = {
    inputsValid:    true,
    planType:       "",     //"A" or "B"
    dogSize:        "",     //"small" | "medium" | "large"
    startDate:      "",
    startTime:      "",
    endDate:        "",
    endTime:        "",
    days:           null,   // number days
    overtime:       null,   // number hours
    normalOvertime: null,   // number hours
    doubleOvertime: null,   // number hours
    finalPrice:     0,
}


const priceForm         = document.getElementById("priceForm");
const dogSize           = document.getElementById("dogSize");
const startDate         = document.getElementById("startDate");
const startTime         = document.getElementById("startTime");
const endDate           = document.getElementById("endDate");
const endTime           = document.getElementById("endTime");
const finalPrice        = document.getElementById("finalPrice");
const dateTimeSelection = document.getElementById("dateTimeSelection");
const startTimeSelection     = document.getElementById("startTimeSelection");
const endTimeSelection     = document.getElementById("endTimeSelection");



function updateForm(){
    console.log("Updating form");
    updateState(state);
    state.finalPrice = calculateFinal(state);
    console.log("finalPrice: "+ state.finalPrice)
    renderFinal();
}

updateForm();

function updateState(state){
    readInputs(state);
    calculateDuration(state);
}

function readInputs(state){
    console.log("Reading inputs/Updating state");

    state.inputsValid = true;

    const planType = document.querySelector('input[name="planType"]:checked')?.value ?? "";
    state.planType = planType;
    if(planType) dateTimeSelection.classList.remove("hidden");
    else dateTimeSelection.classList.add("hidden");
    if(planType === "B") {
        startTimeSelection.classList.remove("hidden");
        endTimeSelection.classList.remove("hidden");
    }
    else {
        startTimeSelection.classList.add("hidden");
        endTimeSelection.classList.add("hidden");
    }
    console.log("   planType: " + state.planType);
    state.dogSize = dogSize.value;
    console.log("   dogSize: " + state.dogSize);
    state.startDate = startDate.value;
    console.log("   startDate: " + state.startDate);
    state.startTime = startTime.value;
    console.log("   startTime: " + state.startTime);
    state.endDate = endDate.value;
    console.log("   endDate: " + state.endDate);
    state.endTime = endTime.value;
    console.log("   endTime:" + state.endTime);

}

function parseDateTime(dateString, timeString = "00:00"){
    const [y, m, d] = dateString.split("-").map(Number);
    const [hh, mm] = timeString.split(":").map(Number);
    return new Date(y, m-1, d, hh || 0, mm || 0, 0, 0);
}

function parseMinutes(timeString){
    const [hh, mm] = timeString.split(":").map(Number);
    return hh * 60 + mm;
}

function calculateOvertime(state){
    let startMinutes = parseMinutes(state.startTime);
    let endMinutes   = parseMinutes(state.endTime);

    if (startMinutes>endMinutes) endMinutes += 24*60;

    const ov = (L, U) => Math.max(0, Math.min(endMinutes, U) - Math.max(startMinutes,L));

    const doubleTimeMinutes = ov(0, DoubleRateEndHour*60) 
         + ov(DoubleRateStartHour*60, (DoubleRateEndHour+24)*60)
         + ov((DoubleRateStartHour+24)*60, 48*60);

    state.doubleOvertime = Math.ceil(doubleTimeMinutes/30) / 2;
    
    state.overtime = Math.ceil((endMinutes-startMinutes)/30) / 2;
    
    state.normalOvertime = state.overtime-state.doubleOvertime;
    
    console.log("   overtime:" + state.overtime);
    console.log("   normalOvertime:" + state.normalOvertime);
    console.log("   doubleOvertime:" + state.doubleOvertime);


}

function calculateDuration(state){
    const dayMs = 86400000;
    
    const startMidnight = parseDateTime(state.startDate);
    const endMidnight   = parseDateTime(state.endDate);

    if(startMidnight>endMidnight) state.inputsValid = false;

    if(state.planType === 'A' && state.startDate != "" && state.endDate != ""){
        state.overtime       = 0;
        state.normalOvertime = 0;
        state.doubleOvertime = 0;
        state.days =  Math.max(0, Math.round((endMidnight-startMidnight)/dayMs)+1);
    }
    
    else if(state.planType === 'B' && state.startDate != "" && state.endDate != "" && state.startTime != "" && state.endTime != ""){
        const start = parseDateTime(state.startDate, state.startTime);
        const end   = parseDateTime(state.endDate, state.endTime);
        if(start>end) state.inputsValid = false;

        const diffMs = Math.max(0, end - start);
        state.days = Math.floor(diffMs / dayMs);
        calculateOvertime(state);
    }

    console.log("   days: " + state.days);
    console.log("   overtime: " + state.overtime);
    console.log("   normalOvertime: " + state.normalOvertime);
    console.log("   doubleOvertime: " + state.doubleOvertime);
}

function calculateFinal(state) {
    
    if(!state.planType || !state.dogSize || !state.startDate || !state.endDate){
        return 0;
    }

    if(state.planType === "A"){
        return dailyRate[state.dogSize] * state.days;
    }

    if (state.planType === "B" && state.startTime && state.endTime){
        return (dailyRate[state.dogSize] * state.days)
            + Math.min(dailyRate[state.dogSize],hourlyRate[state.dogSize] * state.normalOvertime
            + hourlyRate[state.dogSize] * 2 * state.doubleOvertime);
    } 
    
    return 0;
}

function renderFinal(){
    if(state.finalPrice == 0 || !state.inputsValid){
        finalPrice.textContent = "--";
    } else {
        finalPrice.textContent = `$${state.finalPrice.toFixed(0)}`;
    }
}

priceForm.addEventListener("input", updateForm);
priceForm.addEventListener("change", updateForm);

