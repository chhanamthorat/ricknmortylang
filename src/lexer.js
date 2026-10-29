const { syntaxError } = require("./errors");

// The keyword list. If you want to add your own, put it here AND teach the
// parser what to do with it (parser.js), otherwise it's just a fancy name.
const KEYWORDS = {
  pickle: "LET",               // I turned myself into a variable, Morty!
  meeseeks: "FUNCTION",        // summoned for one job, then gone
  existenceIsPain: "RETURN",   // a meeseeks is done once it returns
  ohJeez: "IF",
  orMaybeMorty: "ELSE_IF",
  otherDimension: "ELSE",
  getSchwifty: "WHILE",
  portal: "FOR",
  wrecked: "BREAK",            // riggity riggity wrecked, son
  riggity: "CONTINUE",
  schwifty: "TRUE",
  jerry: "FALSE",              // jerry is never right, so jerry = false
  nobodyExists: "NULL",        // nobody exists on purpose
  cronenberg: "THROW",         // things went horribly wrong. raise an error
  tryRick: "TRY",              // let Rick have a go at it
  fixItRick: "CATCH",          // ...and when it blows up, Rick fixes it
};

// order matters: longer operators first so "==" doesn't get read as "=" "="
const OPERATORS = [
  "==", "!=", "<=", ">=", "&&", "||",
  "+", "-", "*", "/", "%", "<", ">", "=", "!",
  "(", ")", "{", "}", "[", "]", ",", ";",
];

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;

  const push = (type, value) => tokens.push({ type, value, line });

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\n") {
      line++;
      i++;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      continue;
    }

    // *burp* is allowed anywhere and means absolutely nothing.
    // Rick burps mid-sentence, so you can too.
    if (source.startsWith("*burp*", i)) {
      i += "*burp*".length;
      continue;
    }

    // line comments
    if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (isDigit(ch)) {
      let start = i;
      while (isDigit(source[i])) i++;
      if (source[i] === "." && isDigit(source[i + 1])) {
        i++;
        while (isDigit(source[i])) i++;
      }
      push("NUMBER", Number(source.slice(start, i)));
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      i++;
      let str = "";
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\n") line++;
        if (source[i] === "\\") {
          i++;
          const esc = source[i];
          if (esc === "n") str += "\n";
          else if (esc === "t") str += "\t";
          else str += esc; // covers \\ \" \'
          i++;
          continue;
        }
        str += source[i];
        i++;
      }
      if (i >= source.length) {
        throw syntaxError("you started a string and never finished it, Morty", startLine);
      }
      i++; // closing quote
      tokens.push({ type: "STRING", value: str, line: startLine });
      continue;
    }

    if (isIdentStart(ch)) {
      let start = i;
      while (i < source.length && isIdentPart(source[i])) i++;
      const word = source.slice(start, i);
      if (Object.prototype.hasOwnProperty.call(KEYWORDS, word)) {
        push(KEYWORDS[word], word);
      } else {
        push("IDENT", word);
      }
      continue;
    }

    const op = OPERATORS.find((o) => source.startsWith(o, i));
    if (op) {
      push("OP", op);
      i += op.length;
      continue;
    }

    throw syntaxError(`what even is '${ch}'? that's not from this dimension`, line);
  }

  push("EOF", null);
  return tokens;
}

module.exports = { tokenize, KEYWORDS };
