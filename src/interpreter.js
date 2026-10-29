const { tokenize } = require("./lexer");
const { parse } = require("./parser");
const { SchwiftyError, runtimeError, raisedError } = require("./errors");

// Tree-walking interpreter. No eval() anywhere, so running someone else's
// .schwifty file can't wreck your machine (it can still loop forever though,
// that's on you).

// A meeseeks will only put up with so much. Past this depth we bail out
// instead of letting Node blow its own stack.
const MAX_CALL_DEPTH = 1000;

// control flow is done with thrown signals. not the fastest thing in the
// multiverse but it keeps the code short.
class BreakSignal {}
class ContinueSignal {}
class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

class Scope {
  constructor(parent = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  declare(name, value, line) {
    if (this.vars.has(name)) {
      throw runtimeError(`'${name}' already exists in this dimension. use ${name} = ... to change it`, line);
    }
    this.vars.set(name, value);
  }

  find(name) {
    let scope = this;
    while (scope) {
      if (scope.vars.has(name)) return scope;
      scope = scope.parent;
    }
    return null;
  }

  get(name, line) {
    const scope = this.find(name);
    if (!scope) throw runtimeError(`'${name}' doesn't exist. did you forget to pickle it?`, line);
    return scope.vars.get(name);
  }

  set(name, value, line) {
    const scope = this.find(name);
    if (!scope) throw runtimeError(`can't change '${name}', it was never pickled`, line);
    scope.vars.set(name, value);
  }
}

class Meeseeks {
  constructor(name, params, body, closure) {
    this.name = name || "anonymous";
    this.params = params;
    this.body = body;
    this.closure = closure;
  }
}

class Builtin {
  constructor(name, fn) {
    this.name = name;
    this.fn = fn;
  }
}

// how values look when printed
function show(value) {
  if (value === true) return "schwifty";
  if (value === false) return "jerry";
  if (value === null || value === undefined) return "nobodyExists";
  if (Array.isArray(value)) return "[" + value.map(showInList).join(", ") + "]";
  if (value instanceof Meeseeks) return `<meeseeks ${value.name}>`;
  if (value instanceof Builtin) return `<built-in ${value.name}>`;
  return String(value);
}

function showInList(value) {
  return typeof value === "string" ? JSON.stringify(value) : show(value);
}

function truthy(value) {
  return !(value === false || value === null || value === undefined || value === 0 || value === "");
}

function typeName(value) {
  if (value === null || value === undefined) return "nobodyExists";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "list";
  if (value instanceof Meeseeks || value instanceof Builtin) return "meeseeks";
  return typeof value;
}

class Interpreter {
  // maxLoops is mostly for the web playground, so a getSchwifty (schwifty)
  // doesn't freeze someone's browser tab forever
  constructor({ out = (s) => process.stdout.write(s + "\n"), maxLoops = Infinity } = {}) {
    this.out = out;
    this.maxLoops = maxLoops;
    this.loops = 0;
    this.globals = new Scope();
    this.depth = 0;
    this.installBuiltins();
  }

  installBuiltins() {
    const def = (name, fn) => this.globals.declare(name, new Builtin(name, fn));

    // the print. it's long on purpose, you should feel it every time.
    def("wubbaLubbaDubDub", (args) => {
      this.out(args.map(show).join(" "));
      return null;
    });

    def("len", ([x], line) => {
      if (typeof x === "string" || Array.isArray(x)) return x.length;
      throw runtimeError(`len() wants a string or a list, not ${typeName(x)}`, line);
    });

    def("push", ([list, item], line) => {
      if (!Array.isArray(list)) throw runtimeError("push() needs a list first", line);
      list.push(item);
      return list.length;
    });

    def("pop", ([list], line) => {
      if (!Array.isArray(list)) throw runtimeError("pop() needs a list", line);
      return list.length ? list.pop() : null;
    });

    def("str", ([x]) => show(x));

    def("num", ([x], line) => {
      const n = Number(x);
      if (Number.isNaN(n)) throw runtimeError(`'${show(x)}' isn't a number in any dimension`, line);
      return n;
    });

    def("floor", ([x]) => Math.floor(x));

    // random whole number from 0 up to (but not including) max
    def("randomDimension", ([max = 10]) => Math.floor(Math.random() * max));

    def("type", ([x]) => typeName(x));
  }

  run(source) {
    const ast = parse(tokenize(source));
    let last = null;
    for (const stmt of ast.body) {
      last = this.exec(stmt, this.globals);
    }
    return last;
  }

  // ---------- statements ----------

  execBlock(statements, scope) {
    for (const stmt of statements) this.exec(stmt, scope);
  }

  exec(node, scope) {
    switch (node.type) {
      case "Let":
        scope.declare(node.name, this.eval(node.init, scope), node.line);
        return null;

      case "Function":
        scope.declare(node.name, new Meeseeks(node.name, node.params, node.body, scope), node.line);
        return null;

      case "ExprStmt":
        return this.eval(node.expr, scope);

      case "Block":
        this.execBlock(node.body, new Scope(scope));
        return null;

      case "If":
        if (truthy(this.eval(node.test, scope))) {
          this.exec(node.consequent, scope);
        } else if (node.alternate) {
          this.exec(node.alternate, scope);
        }
        return null;

      case "While":
        while (truthy(this.eval(node.test, scope))) {
          if (this.loopBody(node.body, scope) === "break") break;
        }
        return null;

      case "For": {
        const loopScope = new Scope(scope);
        if (node.init) this.exec(node.init, loopScope);
        while (node.test === null || truthy(this.eval(node.test, loopScope))) {
          if (this.loopBody(node.body, loopScope) === "break") break;
          if (node.update) this.eval(node.update, loopScope);
        }
        return null;
      }

      case "Break":
        throw new BreakSignal();

      case "Continue":
        throw new ContinueSignal();

      case "Return":
        if (this.depth === 0) {
          throw runtimeError("existenceIsPain only works inside a meeseeks", node.line);
        }
        throw new ReturnSignal(node.value ? this.eval(node.value, scope) : null);

      case "Throw": {
        // stops the program with your message, unless a tryRick catches it
        const value = this.eval(node.value, scope);
        throw raisedError(show(value), node.line, value);
      }

      case "Try":
        try {
          this.exec(node.body, scope);
        } catch (err) {
          // only our own errors get caught. return / break / continue are
          // also thrown under the hood and those have to keep going up
          if (!(err instanceof SchwiftyError)) throw err;
          const fixScope = new Scope(scope);
          if (node.param) fixScope.declare(node.param, err.value, node.line);
          this.execBlock(node.handler.body, fixScope);
        }
        return null;

      default:
        throw runtimeError(`don't know how to run a ${node.type}. that's a bug, sorry`, node.line);
    }
  }

  loopBody(body, scope) {
    if (++this.loops > this.maxLoops) {
      throw runtimeError("this loop has been going for way too long, I pulled the plug", body.line);
    }
    try {
      this.exec(body, scope);
    } catch (signal) {
      if (signal instanceof BreakSignal) return "break";
      if (signal instanceof ContinueSignal) return "continue";
      throw signal;
    }
    return null;
  }

  // ---------- expressions ----------

  eval(node, scope) {
    switch (node.type) {
      case "Literal":
        return node.value;

      case "Identifier":
        return scope.get(node.name, node.line);

      case "Array":
        return node.items.map((item) => this.eval(item, scope));

      case "FunctionExpr":
        return new Meeseeks(null, node.params, node.body, scope);

      case "Assign":
        return this.assign(node, scope);

      case "Unary": {
        const v = this.eval(node.arg, scope);
        if (node.op === "!") return !truthy(v);
        if (typeof v !== "number") throw runtimeError(`can't make ${typeName(v)} negative`, node.line);
        return -v;
      }

      case "Logical": {
        const left = this.eval(node.left, scope);
        if (node.op === "&&") return truthy(left) ? this.eval(node.right, scope) : left;
        return truthy(left) ? left : this.eval(node.right, scope);
      }

      case "Binary":
        return this.binary(node, scope);

      case "Index": {
        const obj = this.eval(node.object, scope);
        const idx = this.eval(node.index, scope);
        if (!Array.isArray(obj) && typeof obj !== "string") {
          throw runtimeError(`you can only use [ ] on lists and strings, not ${typeName(obj)}`, node.line);
        }
        if (!Number.isInteger(idx) || idx < 0 || idx >= obj.length) {
          throw runtimeError(`index ${show(idx)} is out of bounds (length is ${obj.length})`, node.line);
        }
        return obj[idx];
      }

      case "Call":
        return this.call(node, scope);

      default:
        throw runtimeError(`don't know how to evaluate a ${node.type}. that's a bug, sorry`, node.line);
    }
  }

  assign(node, scope) {
    const value = this.eval(node.value, scope);
    const target = node.target;
    if (target.type === "Identifier") {
      scope.set(target.name, value, node.line);
      return value;
    }
    // list[i] = value
    const list = this.eval(target.object, scope);
    const idx = this.eval(target.index, scope);
    if (!Array.isArray(list)) throw runtimeError("you can only assign into a list with [ ]", node.line);
    if (!Number.isInteger(idx) || idx < 0 || idx > list.length) {
      throw runtimeError(`index ${show(idx)} is out of bounds (length is ${list.length})`, node.line);
    }
    list[idx] = value;
    return value;
  }

  binary(node, scope) {
    const a = this.eval(node.left, scope);
    const b = this.eval(node.right, scope);
    const line = node.line;

    switch (node.op) {
      case "==":
        return a === b;
      case "!=":
        return a !== b;
      case "+":
        if (typeof a === "string" || typeof b === "string") return show(a) + show(b);
        if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
        break;
    }

    if (typeof a !== "number" || typeof b !== "number") {
      throw runtimeError(`can't do ${typeName(a)} ${node.op} ${typeName(b)}`, line);
    }

    switch (node.op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        if (b === 0) throw runtimeError("dividing by zero? that's how you get Cronenbergs", line);
        return a / b;
      case "%":
        if (b === 0) throw runtimeError("modulo by zero, absolutely not", line);
        return a % b;
      case "<":
        return a < b;
      case "<=":
        return a <= b;
      case ">":
        return a > b;
      case ">=":
        return a >= b;
    }
    throw runtimeError(`unknown operator ${node.op}`, line);
  }

  call(node, scope) {
    const fn = this.eval(node.callee, scope);
    const args = node.args.map((arg) => this.eval(arg, scope));

    if (fn instanceof Builtin) return fn.fn(args, node.line);

    if (!(fn instanceof Meeseeks)) {
      throw runtimeError(`${show(fn)} is not a meeseeks, you can't call it`, node.line);
    }
    if (args.length !== fn.params.length) {
      throw runtimeError(
        `meeseeks '${fn.name}' wants ${fn.params.length} argument(s), you gave ${args.length}`,
        node.line
      );
    }
    if (this.depth >= MAX_CALL_DEPTH) {
      throw runtimeError("too many meeseeks at once. this is how it gets ugly. (recursion too deep)", node.line);
    }

    const local = new Scope(fn.closure);
    fn.params.forEach((p, i) => local.declare(p, args[i], node.line));

    this.depth++;
    try {
      this.execBlock(fn.body.body, local);
      return null; // no existenceIsPain = returns nobodyExists
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      if (signal instanceof BreakSignal || signal instanceof ContinueSignal) {
        throw runtimeError("wrecked / riggity used outside of a loop", node.line);
      }
      throw signal;
    } finally {
      this.depth--;
    }
  }
}

module.exports = { Interpreter, show };
