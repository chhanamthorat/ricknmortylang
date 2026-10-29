// glue for the playground page. the actual language lives in ricknmortylang.js
// (built from src/ with `npm run build:web`)

(function () {
  const { Interpreter, SchwiftyError, examples } = window.RickNMortyLang;

  const code = document.getElementById("code");
  const gutter = document.getElementById("gutter");
  const output = document.getElementById("output");
  const runBtn = document.getElementById("run");
  const clearBtn = document.getElementById("clear");
  const picker = document.getElementById("example-picker");

  const SAVE_KEY = "ricknmortylang:code";

  // localStorage can throw in private windows etc, so wrap it
  function load() {
    try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
  }
  function save(text) {
    try { localStorage.setItem(SAVE_KEY, text); } catch { /* fine, just won't remember */ }
  }

  // "05_meeseeks.schwifty" -> "meeseeks"
  function prettyName(file) {
    return file.replace(/\.schwifty$/, "").replace(/^\d+_/, "").replace(/_/g, " ");
  }

  examples.forEach((ex, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = prettyName(ex.file);
    picker.appendChild(opt);
  });

  function updateGutter() {
    const lines = code.value.split("\n").length;
    let nums = "";
    for (let i = 1; i <= lines; i++) nums += i + "\n";
    gutter.textContent = nums;
    gutter.scrollTop = code.scrollTop;
  }

  function setCode(text) {
    code.value = text;
    updateGutter();
    save(text);
  }

  function addLine(text, cls) {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text + "\n";
    output.appendChild(span);
  }

  function run() {
    output.textContent = "";
    runBtn.classList.add("jumping");
    setTimeout(() => runBtn.classList.remove("jumping"), 350);

    let printed = 0;
    const interp = new Interpreter({
      out: (line) => { printed++; addLine(line); },
      // stops getSchwifty (schwifty) { } from freezing the tab
      maxLoops: 1000000,
    });

    try {
      interp.run(code.value);
      if (printed === 0) addLine("(ran fine, but nothing was printed. try wubbaLubbaDubDub)", "muted");
    } catch (err) {
      if (err instanceof SchwiftyError) addLine(err.message, "err");
      else addLine("something broke inside the interpreter itself: " + err.message, "err");
    }
  }

  // ---------- events ----------

  runBtn.addEventListener("click", run);

  clearBtn.addEventListener("click", () => {
    output.innerHTML = "";
  });

  picker.addEventListener("change", () => {
    setCode(examples[Number(picker.value)].code);
    output.innerHTML = "";
    code.focus();
  });

  code.addEventListener("input", () => {
    updateGutter();
    save(code.value);
  });

  code.addEventListener("scroll", () => {
    gutter.scrollTop = code.scrollTop;
  });

  code.addEventListener("keydown", (e) => {
    // ctrl/cmd + enter runs
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
      return;
    }
    // tab inserts two spaces instead of leaving the editor
    // (shift+tab still moves focus, so keyboard users aren't trapped)
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const start = code.selectionStart;
      code.setRangeText("  ", start, code.selectionEnd, "end");
      updateGutter();
      save(code.value);
    }
  });

  // start with whatever you were writing last time, or the meeseeks example
  const saved = load();
  const startIndex = Math.max(0, examples.findIndex((ex) => ex.file.startsWith("05_")));
  if (saved && saved.trim()) {
    setCode(saved);
  } else {
    picker.value = String(startIndex);
    setCode(examples[startIndex].code);
  }
})();
