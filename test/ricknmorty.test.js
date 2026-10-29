// run with: npm test
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { Interpreter } = require("../src/interpreter");

// runs a snippet and gives back everything it printed
function run(source) {
  const lines = [];
  new Interpreter({ out: (s) => lines.push(s) }).run(source);
  return lines;
}

test("hello morty", () => {
  assert.deepStrictEqual(run('wubbaLubbaDubDub("Hello, Morty!")'), ["Hello, Morty!"]);
});

test("booleans and null print the schwifty way", () => {
  assert.deepStrictEqual(run("wubbaLubbaDubDub(schwifty, jerry, nobodyExists)"), ["schwifty jerry nobodyExists"]);
});

test("*burp* is ignored everywhere", () => {
  assert.deepStrictEqual(run("pickle x = 2 *burp* + *burp* 3\nwubbaLubbaDubDub(x)"), ["5"]);
});

test("math follows normal precedence", () => {
  assert.deepStrictEqual(run("wubbaLubbaDubDub(2 + 3 * 4, (2 + 3) * 4, 10 % 4, -2 * 3)"), ["14 20 2 -6"]);
});

test("if / else if / else", () => {
  const src = `
    meeseeks rate(n) {
      ohJeez (n > 10) { existenceIsPain "big" }
      orMaybeMorty (n > 5) { existenceIsPain "medium" }
      otherDimension { existenceIsPain "small" }
    }
    wubbaLubbaDubDub(rate(20), rate(7), rate(1))
  `;
  assert.deepStrictEqual(run(src), ["big medium small"]);
});

test("while loop with break and continue", () => {
  const src = `
    pickle i = 0
    pickle seen = []
    getSchwifty (schwifty) {
      i = i + 1
      ohJeez (i == 2) { riggity }
      ohJeez (i > 4) { wrecked }
      push(seen, i)
    }
    wubbaLubbaDubDub(seen)
  `;
  assert.deepStrictEqual(run(src), ["[1, 3, 4]"]);
});

test("portal for loop", () => {
  const src = `
    pickle total = 0
    portal (pickle i = 1; i <= 100; i = i + 1) { total = total + i }
    wubbaLubbaDubDub(total)
  `;
  assert.deepStrictEqual(run(src), ["5050"]);
});

test("recursion", () => {
  const src = `
    meeseeks fib(n) {
      ohJeez (n < 2) { existenceIsPain n }
      existenceIsPain fib(n - 1) + fib(n - 2)
    }
    wubbaLubbaDubDub(fib(15))
  `;
  assert.deepStrictEqual(run(src), ["610"]);
});

test("closures remember their own state", () => {
  const src = `
    meeseeks counter() {
      pickle c = 0
      existenceIsPain meeseeks() { c = c + 1  existenceIsPain c }
    }
    pickle a = counter()
    pickle b = counter()
    a() a()
    wubbaLubbaDubDub(a(), b())
  `;
  assert.deepStrictEqual(run(src), ["3 1"]);
});

test("lists: index, assign, len, push, pop", () => {
  const src = `
    pickle xs = [1, 2, 3]
    xs[0] = 10
    push(xs, 4)
    pickle last = pop(xs)
    wubbaLubbaDubDub(xs, len(xs), last, xs[2])
  `;
  assert.deepStrictEqual(run(src), ["[10, 2, 3] 3 4 3"]);
});

test("string + anything concatenates", () => {
  assert.deepStrictEqual(run('wubbaLubbaDubDub("dimension " + 137 + " " + schwifty)'), ["dimension 137 schwifty"]);
});

test("a meeseeks with no return gives back nobodyExists", () => {
  assert.deepStrictEqual(run("meeseeks nothing() { pickle x = 1 }\nwubbaLubbaDubDub(nothing())"), ["nobodyExists"]);
});

// ---- errors should be helpful (and a little rude) ----

function errorOf(source) {
  try {
    run(source);
  } catch (err) {
    return err;
  }
  assert.fail("expected an error but the code ran fine");
}

test("using a variable that was never pickled", () => {
  const err = errorOf("wubbaLubbaDubDub(portalGun)");
  assert.match(err.message, /portalGun.*doesn't exist/);
  assert.strictEqual(err.line, 1);
});

test("pickling the same name twice", () => {
  assert.match(errorOf("pickle x = 1\npickle x = 2").message, /already exists/);
});

test("divide by zero", () => {
  assert.match(errorOf("wubbaLubbaDubDub(1 / 0)").message, /Cronenberg/);
});

test("unclosed block reports where it opened", () => {
  const err = errorOf("pickle x = 1\nohJeez (x) {\n  wubbaLubbaDubDub(x)\n");
  assert.match(err.message, /never closed/);
  assert.strictEqual(err.line, 2);
});

test("wrong number of arguments", () => {
  assert.match(errorOf("meeseeks f(a, b) { existenceIsPain a }\nf(1)").message, /wants 2 argument/);
});

test("runaway recursion is caught instead of crashing node", () => {
  assert.match(errorOf("meeseeks forever(n) { existenceIsPain forever(n + 1) }\nforever(0)").message, /too many meeseeks/);
});

test("return outside of a meeseeks", () => {
  assert.match(errorOf("existenceIsPain 5").message, /only works inside a meeseeks/);
});

// ---- cronenberg (raising errors on purpose) ----

test("cronenberg raises your message with the line number", () => {
  const err = errorOf('pickle x = 1\ncronenberg "the citadel found us"');
  assert.match(err.message, /^Cronenberged! \(line 2\): the citadel found us$/);
});

test("cronenberg inside a meeseeks stops everything", () => {
  const lines = [];
  const src = `
    meeseeks check(n) {
      ohJeez (n < 0) { cronenberg "negative " + n }
      existenceIsPain n
    }
    wubbaLubbaDubDub(check(3))
    wubbaLubbaDubDub(check(-1))
    wubbaLubbaDubDub("never printed")
  `;
  assert.throws(() => new Interpreter({ out: (s) => lines.push(s) }).run(src), /negative -1/);
  assert.deepStrictEqual(lines, ["3"]);
});

test("cronenberg with no message is a syntax error", () => {
  assert.match(errorOf("cronenberg").message, /needs a message/);
});

// ---- every example file should at least run without blowing up ----

const examplesDir = path.join(__dirname, "..", "examples");
for (const file of fs.readdirSync(examplesDir).filter((f) => f.endsWith(".schwifty"))) {
  const source = fs.readFileSync(path.join(examplesDir, file), "utf8");

  // this one is supposed to blow up, that's the whole point of it
  if (file === "08_cronenberg.schwifty") {
    test(`example ${file} raises on purpose`, () => {
      assert.match(errorOf(source).message, /Cronenberged!/);
    });
    continue;
  }

  test(`example ${file} runs`, () => {
    assert.ok(run(source).length > 0);
  });
}

// ---- tryRick / fixItRick ----

test("fixItRick catches a cronenberg and gets the original value", () => {
  const src = `
    tryRick {
      cronenberg [1, 2]
      wubbaLubbaDubDub("skipped")
    } fixItRick (oops) {
      wubbaLubbaDubDub("caught", oops, len(oops))
    }
    wubbaLubbaDubDub("still alive")
  `;
  assert.deepStrictEqual(run(src), ["caught [1, 2] 2", "still alive"]);
});

test("fixItRick catches runtime errors as a plain message", () => {
  const src = `
    tryRick { pickle x = 1 / 0 } fixItRick (oops) { wubbaLubbaDubDub(oops) }
  `;
  assert.deepStrictEqual(run(src), ["dividing by zero? that's how you get Cronenbergs"]);
});

test("errors thrown deep inside meeseeks still get caught", () => {
  const src = `
    meeseeks deep(n) {
      ohJeez (n == 0) { cronenberg "bottom" }
      existenceIsPain deep(n - 1)
    }
    tryRick { deep(50) } fixItRick (e) { wubbaLubbaDubDub("caught", e) }
    wubbaLubbaDubDub(deep == deep)
  `;
  assert.deepStrictEqual(run(src), ["caught bottom", "schwifty"]);
});

test("return / break inside tryRick still work", () => {
  const src = `
    meeseeks first(xs) {
      tryRick {
        portal (pickle i = 0; i < len(xs); i = i + 1) {
          ohJeez (xs[i] > 2) { existenceIsPain xs[i] }
        }
      } fixItRick { existenceIsPain -1 }
      existenceIsPain 0
    }
    wubbaLubbaDubDub(first([1, 5, 9]), first([1]))
  `;
  assert.deepStrictEqual(run(src), ["5 0"]);
});

test("cronenberg inside fixItRick goes up to the next tryRick", () => {
  const src = `
    tryRick {
      tryRick { cronenberg "inner" } fixItRick (e) { cronenberg "rethrown " + e }
    } fixItRick (e) { wubbaLubbaDubDub(e) }
  `;
  assert.deepStrictEqual(run(src), ["rethrown inner"]);
});

test("tryRick without fixItRick is a syntax error", () => {
  assert.match(errorOf("tryRick { pickle x = 1 }").message, /fixItRick/);
});

test("fixItRick on its own is a syntax error", () => {
  assert.match(errorOf("fixItRick { }").message, /without a tryRick/);
});

test("maxLoops stops runaway loops", () => {
  assert.throws(
    () => new Interpreter({ out: () => {}, maxLoops: 1000 }).run("getSchwifty (schwifty) { }"),
    /pulled the plug/
  );
});
