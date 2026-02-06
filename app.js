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
    planType:   "",
    dogSize:    "",
    startDate:  "",
    startTime:  "",
    endDate:    "",
    endTime:    "",
    nights:     null,
    hours:      null,

}


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
