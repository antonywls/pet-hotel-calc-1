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
