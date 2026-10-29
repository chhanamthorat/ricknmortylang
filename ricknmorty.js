#!/usr/bin/env node
// Entry point.
//   node ricknmorty.js file.schwifty   -> runs the file
//   node ricknmorty.js                 -> drops you into the REPL

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Interpreter, show } = require("./src/interpreter");
const { SchwiftyError } = require("./src/errors");

function runFile(file) {
  let source;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch {
    console.error(`couldn't find '${file}'. wrong dimension maybe?`);
    process.exit(1);
  }

  if (path.extname(file) !== ".schwifty") {
    console.error("(heads up: that's not a .schwifty file, running it anyway)");
  }

  try {
    new Interpreter().run(source);
  } catch (err) {
    if (err instanceof SchwiftyError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

function repl() {
  console.log("RickNMortyLang REPL. type .exit (or ctrl+c) to leave.");
  console.log("tip: wubbaLubbaDubDub(\"hi\") prints stuff\n");

  const interp = new Interpreter();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "schwifty> " });
  let buffer = "";

  rl.prompt();
  rl.on("line", (line) => {
    if (line.trim() === ".exit") return rl.close();

    buffer += line + "\n";

    // keep reading lines until the braces balance, so you can type
    // multi-line meeseeks into the repl
    const opens = (buffer.match(/{/g) || []).length;
    const closes = (buffer.match(/}/g) || []).length;
    if (opens > closes) {
      rl.setPrompt("     ...> ");
      return rl.prompt();
    }

    try {
      const result = interp.run(buffer);
      if (result !== null && result !== undefined) console.log(show(result));
    } catch (err) {
      if (err instanceof SchwiftyError) console.error(err.message);
      else throw err;
    }
    buffer = "";
    rl.setPrompt("schwifty> ");
    rl.prompt();
  });
  rl.on("close", () => {
    console.log("\npeace among worlds.");
    process.exit(0);
  });
}

const file = process.argv[2];
if (file === "-h" || file === "--help") {
  console.log("usage: ricknmorty <file.schwifty>   (no file = REPL)");
} else if (file) {
  runFile(file);
} else {
  repl();
}
