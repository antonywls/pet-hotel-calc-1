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
    days:           null,   // number
    overtime:       null,   // number (hours)
}

let finalPrice = 0;

const priceForm = document.getElementById("priceForm");
const dogSize   = document.getElementById("dogSize");
const startDate = document.getElementById("startDate");
const startTime = document.getElementById("startTime");
const endDate   = document.getElementById("endDate");
const endTime   = document.getElementById("endTime");

function updateForm(){
    console.log("Updating form");
    updateState(state);
    finalPrice = calculateFinal(state);
    renderFinal(state);
}

function updateState(state){
    readInputs(state);
    calculateDuration(state);
}

function readInputs(state){
    console.log("Reading inputs/Updating state");

    state.inputsValid = true;

    const planType = document.querySelector('input[name="planType"]:checked')?.value ?? "";
    state.planType = planType;
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

function calculateDuration(state){
    const dayMs = 86400000;
    const hourMs = 3600000;
    
    const startMidnight = parseDateTime(state.startDate);
    const endMidnight   = parseDateTime(state.endDate);
    
    if(state.planType === 'A' && state.startDate != "" && state.endDate != ""){
        state.overtime = 0;
        state.days =  Math.max(0, Math.round((endMidnight-startMidnight)/dayMs)+1);
    }
    
    else if(state.planType === 'B' && state.startDate != "" && state.endDate != "" && state.startTime != "" && state.endTime != ""){
        const start = parseDateTime(state.startDate, state.startTime);
        const end   = parseDateTime(state.endDate, state.endTime);
        const diffMS = end - start;
        const state.days = Math.floor

    }

    console.log("   days: " + state.days);
    console.log("   overtime: " + state.overtime);
}

function calculateFinal(state) {
    if(state.planType === "A"){
        
        return dailyRate[state.dogSize] * state.days;

    } else if (state.planType === "B"){
        
        return (dailyRate[state.dogSize] * state.days)
                + hourlyRate[state.dogSize] * state.overtime;

    } else {
        return null;
    }
}

function renderFinal(state){

}

priceForm.addEventListener("input", updateForm);
priceForm.addEventListener("change", updateForm);

