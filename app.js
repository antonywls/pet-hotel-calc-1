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

const planType = document.getElementsByName("planType");

planType.addEventListener("change", ()=>{
    
});

const helloBtn = document.getElementById("helloBtn");
const result = document.getElementById("result");

helloBtn.addEventListener("click", () => {
  const msg = "Hello world — JS is working.";
  //alert(msg);
  result.textContent = msg;
});

helloBtn.addEventListener("mouseenter", () => {
  result.textContent = "you are hovering";
});

helloBtn.addEventListener("mouseleave", () => {
  result.textContent = "";
});
