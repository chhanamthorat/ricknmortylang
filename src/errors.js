// Every error in RickNMortyLang goes through here so they all sound like
// they came from somewhere in the multiverse. Morty panics, Rick is rude.

class SchwiftyError extends Error {
  // detail = the message without the "kind (line N):" bit in front
  // value  = what fixItRick hands you when it catches this error
  constructor(kind, detail, line, value = detail) {
    const where = line ? ` (line ${line})` : "";
    super(`${kind}${where}: ${detail}`);
    this.name = "SchwiftyError";
    this.kind = kind;
    this.detail = detail;
    this.line = line;
    this.value = value;
  }
}

// lexer / parser problems -> Morty is confused
function syntaxError(message, line) {
  return new SchwiftyError("Aw geez, syntax error", message, line);
}

// runtime problems -> Rick is annoyed
function runtimeError(message, line) {
  return new SchwiftyError("*burp* Runtime error", message, line);
}

// errors raised on purpose with the `cronenberg` keyword.
// the original value is kept so fixItRick gets back exactly what you threw
function raisedError(message, line, value) {
  return new SchwiftyError("Cronenberged!", message, line, value);
}

module.exports = { SchwiftyError, syntaxError, runtimeError, raisedError };
