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
    planType:   "",     //"A" or "B"
    dogSize:    "",     //"small" | "medium" | "large"
    startDate:  "",
    startTime:  "",
    endDate:    "",
    endTime:    "",
    days:       null,   // number
    overtime:   null,   // number (hours)
}

const priceForm = document.getElementById("priceForm");
const dogSize = document.getElementById("dogSize");



function updateForm(){
    console.log("Updating form");
    readState(state);
    calculateFinal(state);
    renderFinal(state);
}

function readState(state){
    console.log("Reading/Updating state");

    const planType = document.querySelector('input[name="planType"]:checked')?.value ?? "";
    state.planType = planType;
    console.log("   planType: " + state.planType);
    state.dogSize = dogSize.value;
    console.log("   dogSize: " + state.dogSize);
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

