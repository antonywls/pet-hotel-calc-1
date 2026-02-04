const helloBtn = document.getElementById("helloBtn");
const result = document.getElementById("result");

helloBtn.addEventListener("click", () => {
  const msg = "Hello world — JS is working.";
  alert(msg);
  result.textContent = msg;
});