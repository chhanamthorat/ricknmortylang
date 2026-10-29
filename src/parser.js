const { syntaxError } = require("./errors");

// Plain recursive descent parser. Nothing clever, I wanted something I
// could actually read at 2am after a Rick and Morty binge.
//
// Precedence, lowest to highest:
//   assignment  =
//   or          ||
//   and         &&
//   equality    == !=
//   comparison  < <= > >=
//   term        + -
//   factor      * / %
//   unary       ! -
//   call/index  f(x)  arr[i]
//   primary     numbers, strings, names, [arrays], (groups)

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  // ---------- little helpers ----------

  peek() {
    return this.tokens[this.pos];
  }

  next() {
    return this.tokens[this.pos++];
  }

  check(type, value) {
    const t = this.peek();
    if (t.type !== type) return false;
    return value === undefined || t.value === value;
  }

  match(type, value) {
    if (this.check(type, value)) return this.next();
    return null;
  }

  expect(type, value, what) {
    const t = this.peek();
    if (this.check(type, value)) return this.next();
    const got = t.type === "EOF" ? "the end of the file" : `'${t.value}'`;
    throw syntaxError(`expected ${what || value || type} but got ${got}`, t.line);
  }

  // semicolons are optional, I kept forgetting them myself
  skipSemis() {
    while (this.match("OP", ";"));
  }

  // ---------- statements ----------

  parseProgram() {
    const body = [];
    this.skipSemis();
    while (!this.check("EOF")) {
      body.push(this.statement());
      this.skipSemis();
    }
    return { type: "Program", body };
  }

  statement() {
    const t = this.peek();
    switch (t.type) {
      case "LET":
        return this.letStatement();
      case "FUNCTION":
        return this.functionStatement();
      case "RETURN":
        return this.returnStatement();
      case "IF":
        return this.ifStatement();
      case "WHILE":
        return this.whileStatement();
      case "FOR":
        return this.forStatement();
      case "BREAK":
        this.next();
        return { type: "Break", line: t.line };
      case "CONTINUE":
        this.next();
        return { type: "Continue", line: t.line };
      case "TRY":
        return this.tryStatement();
      case "CATCH":
        throw syntaxError("fixItRick without a tryRick before it. what is Rick supposed to fix?", t.line);
      case "THROW": {
        this.next();
        // cronenberg always needs something to say, otherwise what went wrong?
        const t2 = this.peek();
        if (t2.type === "EOF" || t2.line !== t.line || (t2.type === "OP" && (t2.value === "}" || t2.value === ";"))) {
          throw syntaxError("cronenberg needs a message, like: cronenberg \"portal fluid ran out\"", t.line);
        }
        return { type: "Throw", value: this.expression(), line: t.line };
      }
      default:
        if (this.check("OP", "{")) return this.block();
        return { type: "ExprStmt", expr: this.expression(), line: t.line };
    }
  }

  block() {
    const open = this.expect("OP", "{", "'{'");
    const body = [];
    this.skipSemis();
    while (!this.check("OP", "}")) {
      if (this.check("EOF")) {
        throw syntaxError("a '{' was opened here and never closed. classic Jerry move", open.line);
      }
      body.push(this.statement());
      this.skipSemis();
    }
    this.next(); // }
    return { type: "Block", body, line: open.line };
  }

  letStatement() {
    const kw = this.next(); // pickle
    const name = this.expect("IDENT", undefined, "a variable name after 'pickle'");
    let init = { type: "Literal", value: null };
    if (this.match("OP", "=")) init = this.expression();
    return { type: "Let", name: name.value, init, line: kw.line };
  }

  functionStatement() {
    const kw = this.next(); // meeseeks
    const name = this.expect("IDENT", undefined, "a name for your meeseeks");
    const params = this.paramList();
    const body = this.block();
    return { type: "Function", name: name.value, params, body, line: kw.line };
  }

  paramList() {
    this.expect("OP", "(", "'('");
    const params = [];
    if (!this.check("OP", ")")) {
      do {
        params.push(this.expect("IDENT", undefined, "a parameter name").value);
      } while (this.match("OP", ","));
    }
    this.expect("OP", ")", "')'");
    return params;
  }

  returnStatement() {
    const kw = this.next();
    // bare `existenceIsPain` returns nothing. we only read a value if the
    // next token is on the same line and isn't closing the block.
    let value = null;
    const t = this.peek();
    const endsHere = t.type === "EOF" || (t.type === "OP" && (t.value === "}" || t.value === ";"));
    if (!endsHere && t.line === kw.line) value = this.expression();
    return { type: "Return", value, line: kw.line };
  }

  ifStatement() {
    const kw = this.next(); // ohJeez
    const test = this.condition();
    const consequent = this.block();
    let alternate = null;

    if (this.check("ELSE_IF")) {
      alternate = this.ifStatement(); // orMaybeMorty is just a nested if
    } else if (this.match("ELSE")) {
      alternate = this.check("IF") ? this.ifStatement() : this.block();
    }
    return { type: "If", test, consequent, alternate, line: kw.line };
  }

  whileStatement() {
    const kw = this.next();
    const test = this.condition();
    const body = this.block();
    return { type: "While", test, body, line: kw.line };
  }

  // portal (pickle i = 0; i < 10; i = i + 1) { ... }
  forStatement() {
    const kw = this.next();
    this.expect("OP", "(", "'(' after portal");

    let init = null;
    if (!this.check("OP", ";")) {
      init = this.check("LET")
        ? this.letStatement()
        : { type: "ExprStmt", expr: this.expression(), line: kw.line };
    }
    this.expect("OP", ";", "';' in the portal loop");

    const test = this.check("OP", ";") ? null : this.expression();
    this.expect("OP", ";", "a second ';' in the portal loop");

    const update = this.check("OP", ")") ? null : this.expression();
    this.expect("OP", ")", "')'");

    const body = this.block();
    return { type: "For", init, test, update, body, line: kw.line };
  }

  // tryRick { ... } fixItRick (oops) { ... }
  // the (oops) part is optional if you don't care what went wrong
  tryStatement() {
    const kw = this.next();
    const body = this.block();
    this.expect("CATCH", undefined, "'fixItRick' after the tryRick block");
    let param = null;
    if (this.match("OP", "(")) {
      param = this.expect("IDENT", undefined, "a name for the error").value;
      this.expect("OP", ")", "')'");
    }
    const handler = this.block();
    return { type: "Try", body, param, handler, line: kw.line };
  }

  condition() {
    this.expect("OP", "(", "'(' before the condition");
    const expr = this.expression();
    this.expect("OP", ")", "')' after the condition");
    return expr;
  }

  // ---------- expressions ----------

  expression() {
    return this.assignment();
  }

  assignment() {
    const left = this.or();
    if (this.check("OP", "=")) {
      const eq = this.next();
      const value = this.assignment(); // right associative: a = b = 3
      if (left.type === "Identifier" || left.type === "Index") {
        return { type: "Assign", target: left, value, line: eq.line };
      }
      throw syntaxError("you can't assign to that. nice try though", eq.line);
    }
    return left;
  }

  binaryLevel(nextFn, ops) {
    let left = nextFn.call(this);
    while (this.peek().type === "OP" && ops.includes(this.peek().value)) {
      const op = this.next();
      const right = nextFn.call(this);
      left = { type: "Binary", op: op.value, left, right, line: op.line };
    }
    return left;
  }

  or() {
    let left = this.and();
    while (this.check("OP", "||")) {
      const op = this.next();
      left = { type: "Logical", op: "||", left, right: this.and(), line: op.line };
    }
    return left;
  }

  and() {
    let left = this.equality();
    while (this.check("OP", "&&")) {
      const op = this.next();
      left = { type: "Logical", op: "&&", left, right: this.equality(), line: op.line };
    }
    return left;
  }

  equality() {
    return this.binaryLevel(this.comparison, ["==", "!="]);
  }

  comparison() {
    return this.binaryLevel(this.term, ["<", "<=", ">", ">="]);
  }

  term() {
    return this.binaryLevel(this.factor, ["+", "-"]);
  }

  factor() {
    return this.binaryLevel(this.unary, ["*", "/", "%"]);
  }

  unary() {
    if (this.check("OP", "!") || this.check("OP", "-")) {
      const op = this.next();
      return { type: "Unary", op: op.value, arg: this.unary(), line: op.line };
    }
    return this.postfix();
  }

  postfix() {
    let expr = this.primary();
    for (;;) {
      if (this.check("OP", "(")) {
        const open = this.next();
        const args = [];
        if (!this.check("OP", ")")) {
          do {
            args.push(this.expression());
          } while (this.match("OP", ","));
        }
        this.expect("OP", ")", "')' to close the call");
        expr = { type: "Call", callee: expr, args, line: open.line };
      } else if (this.check("OP", "[")) {
        const open = this.next();
        const index = this.expression();
        this.expect("OP", "]", "']'");
        expr = { type: "Index", object: expr, index, line: open.line };
      } else {
        return expr;
      }
    }
  }

  primary() {
    const t = this.next();
    switch (t.type) {
      case "NUMBER":
      case "STRING":
        return { type: "Literal", value: t.value, line: t.line };
      case "TRUE":
        return { type: "Literal", value: true, line: t.line };
      case "FALSE":
        return { type: "Literal", value: false, line: t.line };
      case "NULL":
        return { type: "Literal", value: null, line: t.line };
      case "IDENT":
        return { type: "Identifier", name: t.value, line: t.line };
      case "FUNCTION": {
        // anonymous meeseeks: pickle add = meeseeks(a, b) { existenceIsPain a + b }
        const params = this.paramList();
        const body = this.block();
        return { type: "FunctionExpr", name: null, params, body, line: t.line };
      }
      case "OP":
        if (t.value === "(") {
          const expr = this.expression();
          this.expect("OP", ")", "')'");
          return expr;
        }
        if (t.value === "[") {
          const items = [];
          if (!this.check("OP", "]")) {
            do {
              items.push(this.expression());
            } while (this.match("OP", ","));
          }
          this.expect("OP", "]", "']' to close the list");
          return { type: "Array", items, line: t.line };
        }
        break;
      case "EOF":
        throw syntaxError("the file ended in the middle of something, Morty", t.line);
    }
    throw syntaxError(`didn't expect '${t.value}' here`, t.line);
  }
}

function parse(tokens) {
  return new Parser(tokens).parseProgram();
}

module.exports = { parse };
