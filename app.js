//24-hour format (hours), ending and staring time for off business hours (and for zeroing overtime).
const OpeningHour   = 10;
const ClosingHour = 20;     //Must be before midnight.

const BufferTime = 1; //Number of hours after closing/before opening where single instead of double hourly rate is applied for off-business drop-off/pick-up.

const OvernightPivot = 3; //24-hour format (hours), if overtime extends over this time, it counts as an extra day.

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
    inputsValid:        true,

    planType:           "",     //"A" or "B"
    dogSize:            "",     //"small" | "medium" | "large"
    startDate:          "",     //"yyyy-mm-dd"
    startTime:          "",     //"hh:mm"
    endDate:            "",     //"yyyy-mm-dd"
    endTime:            "",     //"hh:mm"
    
    startHour:          null,   //24-hour format (hours), drop-off time of day
    endHour:            null,   //24-hour format (hours), pickup time of day

    days:               null,   //Integer number of days calculated depending on plan type.
    

    overtime: {
        countsAsExtraDay : false, //If true, overtime will be simplified to charging an extra day fee.
        base:           null,   //Total overtime in hours including zeroed
        zeroed:         null,   //Overtime in hours that overlap with off-business hours and are therefore zeroed.
        normal:         null,   //Chargeable overtime in hours that exclude the zeroed overtime.
    },

    offBusiness: {
        dropOff: {
            base:       null,
            buffer:     null,
            double:     null,
        },
        pickUp: {
            base:       null,
            buffer:     null,
            double:     null,
        },
        total:{
            base:       null,
            buffer:     null,
            double:     null
        }

    },

    finalPrice:     0,
}


const priceForm             = document.getElementById("priceForm");
const dogSize               = document.getElementById("dogSize");
const startDate             = document.getElementById("startDate");
const startTime             = document.getElementById("startTime");
const endDate               = document.getElementById("endDate");
const endTime               = document.getElementById("endTime");
const finalPrice            = document.getElementById("finalPrice");
const dateTimeSelection     = document.getElementById("dateTimeSelection");
const startTimeSelection    = document.getElementById("startTimeSelection");
const endTimeSelection      = document.getElementById("endTimeSelection");



function updateForm(){
    console.log("Updating form");
    updateState();
    state.finalPrice = calculateFinal();
    console.log("finalPrice: "+ state.finalPrice)
    renderFinal();
}

updateForm();

function updateState(){
    readInputs();
    calculateDuration();
}

function readInputs(){
    console.log("Reading inputs/Updating state");

    state.inputsValid = true;
    state.overtime.countsAsExtraDay = false;

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
    console.log("   endTime: " + state.endTime);

    state.startHour = parseHours(state.startTime);
    console.log("   startHour: " + state.startHour);
    state.endHour = parseHours(state.endTime);
    console.log("   endHour: " + state.endHour);

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

function parseHours(timeString){
    if(!timeString) return 0;
    const [hh, mm] = timeString.split(":").map(Number);
    return hh + (mm/60);
}

function calculateOvertime(){
    let startMinutes = parseMinutes(state.startTime);
    let endMinutes   = parseMinutes(state.endTime);

    if (startMinutes>endMinutes) endMinutes += 24*60;

    const ov = (L, U) => Math.max(0, Math.min(endMinutes, U) - Math.max(startMinutes,L));

    const zeroedMinutes = ov(0, OpeningHour*60) 
         + ov(ClosingHour*60, (OpeningHour+24)*60)
         + ov((ClosingHour+24)*60, 48*60);

    
    state.overtime.zeroed = Math.ceil(zeroedMinutes/30) / 2;
    
    state.overtime.normal = Math.ceil((endMinutes-startMinutes-zeroedMinutes)/30) / 2;
    
    state.overtime.base = state.overtime.zeroed + state.overtime.normal;


    if(state.overtime.normal * hourlyRate[state.dogSize] >= dailyRate[state.dogSize] 
    || (state.startHour > state.endHour && state.endHour >= OvernightPivot)){
        state.overtime.countsAsExtraDay = true;
    } else {state.overtime.countsAsExtraDay = false;}

    

}

function calculateSingleOffBusiness(contactHour){
    if(contactHour>=OpeningHour && contactHour <=ClosingHour){
        return{base: 0, buffer: 0, double: 0};
    }

    let contactHourAdjusted = contactHour;
    if(contactHourAdjusted < ClosingHour) contactHourAdjusted += 24;
    let openingHourAdjusted = OpeningHour + 24;

    let currentBase = Math.ceil(Math.min(openingHourAdjusted - contactHourAdjusted, contactHourAdjusted - ClosingHour)*2) /2;

    return{
        base:   currentBase,
        buffer: Math.min(currentBase, BufferTime),
        double: Math.max(currentBase-BufferTime, 0),
    }

}

function calculateOffBusiness(){
    state.offBusiness.dropOff = calculateSingleOffBusiness(state.startHour);
    state.offBusiness.pickUp = calculateSingleOffBusiness(state.endHour);

    state.offBusiness.total = {
        base:   state.offBusiness.dropOff.base + state.offBusiness.pickUp.base,
        buffer: state.offBusiness.dropOff.buffer + state.offBusiness.pickUp.buffer,
        double: state.offBusiness.dropOff.double + state.offBusiness.pickUp.double,
    }

}

function calculateDuration(){
    const dayMs = 86400000;
    
    const startMidnight = parseDateTime(state.startDate);
    const endMidnight   = parseDateTime(state.endDate);

    if(startMidnight>endMidnight) state.inputsValid = false;

    if(state.planType === 'A' && state.startDate != "" && state.endDate != ""){
        state.overtime.base   = 0;
        state.overtime.normal = 0;
        state.overtime.zeroed = 0;

        let tempOffBusiness = {base: 0, buffer: 0, double: 0};
        state.offBusiness.dropOff = tempOffBusiness;
        state.offBusiness.pickUp  = tempOffBusiness;
        state.offBusiness.total   = tempOffBusiness;

        state.days =  Math.max(0, Math.round((endMidnight-startMidnight)/dayMs)+1);
    }
    
    else if(state.planType === 'B' && state.startDate != "" && state.endDate != "" && state.startTime != "" && state.endTime != ""){
        const start = parseDateTime(state.startDate, state.startTime);
        const end   = parseDateTime(state.endDate, state.endTime);
        
        if(start>end) state.inputsValid = false;

        const diffMs = Math.max(0, end - start);
        state.days = Math.floor(diffMs / dayMs);
        calculateOvertime();
        calculateOffBusiness();
    }

    console.log("   days: " + state.days);
    console.log("   overtime.base: " + state.overtime.base);
    console.log("   overtime.normal: " + state.overtime.normal);
    console.log("   overtime.zeroed: " + state.overtime.zeroed);
    console.log("   overtime.countsAsExtraDay: " + state.overtime.countsAsExtraDay);

    console.log("   offBusiness.dropOff: ", state.offBusiness.dropOff);
    console.log("   offBusiness.pickUp: ", state.offBusiness.pickUp);
    console.log("   offBusiness.total: ", state.offBusiness.total);

}

function calculateFinal() {
    
    if(!state.planType || !state.dogSize || !state.startDate || !state.endDate || !state.inputsValid){
        return 0;
    }

    if(state.planType === "A"){
        return dailyRate[state.dogSize] * state.days;
    }

    if (state.planType === "B" && state.startTime && state.endTime){
        let tempFinal = dailyRate[state.dogSize] * state.days 
        + state.offBusiness.total.buffer * hourlyRate[state.dogSize]
        + state.offBusiness.total.double * hourlyRate[state.dogSize] * 2;

        if(state.overtime.countsAsExtraDay) tempFinal += dailyRate[state.dogSize];
        else tempFinal += state.overtime.normal * hourlyRate[state.dogSize];
        
        return tempFinal;
    } 
    
    return 0;
}

function renderFinal(){
    if(state.planType) dateTimeSelection.classList.remove("hidden");
    else dateTimeSelection.classList.add("hidden");
    if(state.planType === "B") {
        startTimeSelection.classList.remove("hidden");
        endTimeSelection.classList.remove("hidden");
    }
    else {
        startTimeSelection.classList.add("hidden");
        endTimeSelection.classList.add("hidden");
    }

    if(state.finalPrice == 0 || !state.inputsValid){
        finalPrice.textContent = "--";
    } else {
        finalPrice.textContent = `$${state.finalPrice.toFixed(0)}`;
    }
}

priceForm.addEventListener("input", updateForm);
priceForm.addEventListener("change", updateForm);

