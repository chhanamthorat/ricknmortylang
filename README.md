# RickNMortyLang

A tiny programming language where you `pickle` your variables, summon a `meeseeks` when you need a function, and `getSchwifty` when you want to loop.

```
meeseeks greet(name) {
  existenceIsPain "I'm Mr. Meeseeks! Hi " + name + "!"
}

wubbaLubbaDubDub(greet("Morty"))
```

```
$ node ricknmorty.js hello.schwifty
I'm Mr. Meeseeks! Hi Morty!
```

## Why does this exist

Honestly? Because I love Rick and Morty way too much.

I've rewatched the whole show more times than I want to admit, and at some point I caught myself thinking "a Meeseeks is basically just a function call". You summon it, it does one job, it hands back the result and stops existing. That thought would not leave my head.

Then I came across [GenZLang](https://github.com/wahabzai/genzlang) (which was itself inspired by [BhaiLang](https://bhailang.js.org/)) and it clicked. Joke languages are a great excuse to actually learn how a lexer, a parser and an interpreter fit together, and it's way more fun when the language makes you laugh while you write it. So I built one for the show I love.

It's a toy. Please don't write your startup's backend in it. But it does work, it has real error messages, and it has tests.

## Try it in your browser

No install needed: **[chhanamthorat.github.io/ricknmortylang](https://chhanamthorat.github.io/ricknmortylang/)**

It's a little playground with an editor, all the examples, and a big portal-shaped Run button. Whatever you type is saved in your browser so it's still there next time.

## Getting started

You just need [Node.js](https://nodejs.org) 18 or newer. There are no dependencies.

```bash
git clone https://github.com/chhanamthorat/ricknmortylang.git
cd ricknmortylang

# run a file
node ricknmorty.js examples/01_hello_morty.schwifty

# or open the REPL and mess around
node ricknmorty.js
```

Run every example at once with `npm run examples`, and the tests with `npm test`.

If you want a `ricknmorty` command available everywhere, run `npm link` inside the folder and then just do `ricknmorty myfile.schwifty`.

## The language

| What it does | RickNMortyLang | Why |
|---|---|---|
| declare a variable | `pickle x = 5` | the pickle episode. obviously |
| print | `wubbaLubbaDubDub(x)` | long on purpose, you should feel it |
| if | `ohJeez (cond) { }` | Morty's reaction to every decision |
| else if | `orMaybeMorty (cond) { }` | |
| else | `otherDimension { }` | when this reality didn't work out |
| while loop | `getSchwifty (cond) { }` | |
| for loop | `portal (pickle i = 0; i < 5; i = i + 1) { }` | |
| break | `wrecked` | riggity riggity wrecked |
| continue | `riggity` | skip to the next one |
| function | `meeseeks name(a, b) { }` | summoned for one job |
| return | `existenceIsPain value` | the job's done, it can go now |
| true | `schwifty` | |
| false | `jerry` | Jerry is never right |
| null | `nobodyExists` | nobody exists on purpose |
| raise an error | `cronenberg "message"` | when everything goes horribly, irreversibly wrong |
| try | `tryRick { }` | let Rick have a go at the risky stuff |
| catch | `fixItRick (oops) { }` | it blew up, Rick fixes it |
| comment | `// like this` | |
| burp | `*burp*` | ignored by the interpreter. put it anywhere |

Semicolons are optional. Operators are what you'd expect: `+ - * / %`, `== != < <= > >=`, `&& || !`.

### Variables

```
pickle name = "Rick"
pickle age = 70
age = age + 1          // no pickle needed when changing it
pickle fluid = 100 *burp* - 25
```

`pickle` creates a variable. Trying to pickle the same name twice in the same scope is an error, because that's almost always a typo.

### Conditions

```
pickle portalFluid = 15

ohJeez (portalFluid > 50) {
  wubbaLubbaDubDub("plenty of fluid")
} orMaybeMorty (portalFluid > 10) {
  wubbaLubbaDubDub("one more adventure, tops")
} otherDimension {
  wubbaLubbaDubDub("we're stuck here")
}
```

`jerry`, `nobodyExists`, `0` and `""` count as false. Everything else is schwifty.

### Loops

```
pickle shots = 3
getSchwifty (shots > 0) {
  wubbaLubbaDubDub("charge:", shots)
  shots = shots - 1
}

portal (pickle i = 1; i <= 10; i = i + 1) {
  ohJeez (i % 2 == 0) { riggity }   // skip evens
  ohJeez (i > 7) { wrecked }        // stop
  wubbaLubbaDubDub("dimension", i)
}
```

### Meeseeks (functions)

```
meeseeks factorial(n) {
  ohJeez (n <= 1) { existenceIsPain 1 }
  existenceIsPain n * factorial(n - 1)
}

// they can be anonymous and passed around too
pickle double = meeseeks(x) { existenceIsPain x * 2 }
```

Meeseeks remember the scope they were made in (closures), so things like counters work. Have a look at `examples/07_closures.schwifty`.

If you recurse too deep the interpreter stops you with "too many meeseeks at once" instead of letting Node crash. Anyone who's seen the episode knows why.

### Raising errors with cronenberg

Sometimes things are so broken there's no point carrying on. That's what `cronenberg` is for. It stops the program right there and prints your message along with the line number:

```
meeseeks usePortalGun(fluid) {
  ohJeez (fluid < 10) {
    cronenberg "not enough portal fluid for another jump, we're stuck here"
  }
  existenceIsPain fluid - 10
}
```

```
Cronenberged! (line 3): not enough portal fluid for another jump, we're stuck here
```

The message can be any value (`cronenberg "bad input: " + x` works fine).

### Catching errors with tryRick / fixItRick

If you'd rather not let a cronenberg (or any other error) end the program, wrap the risky code in `tryRick` and handle it in `fixItRick`:

```
tryRick {
  fluid = usePortalGun(fluid)
} fixItRick (oops) {
  wubbaLubbaDubDub("rick caught it:", oops)
  fluid = 100
}
```

- `oops` is whatever you passed to `cronenberg`. For normal errors (dividing by zero, a variable that doesn't exist, etc.) it's the error message as a string.
- The `(oops)` part is optional. `fixItRick { ... }` works if you don't care what went wrong.
- You can `cronenberg` again inside `fixItRick` and the next `tryRick` up will catch it.
- Syntax errors can't be caught, because the program never starts running.

Full example in `examples/09_try_rick.schwifty`.

### Lists

```
pickle family = ["Rick", "Morty", "Summer", "Beth"]
push(family, "Jerry")
wubbaLubbaDubDub(family[0], len(family))
pickle leftBehind = pop(family)
```

### Built-in stuff

| function | does |
|---|---|
| `wubbaLubbaDubDub(a, b, ...)` | prints everything with spaces in between |
| `len(x)` | length of a list or string |
| `push(list, item)` / `pop(list)` | add to / take from the end of a list |
| `str(x)` / `num(x)` | convert to string / number |
| `floor(x)` | rounds down |
| `randomDimension(max)` | random whole number from 0 to max - 1 |
| `type(x)` | `"number"`, `"string"`, `"boolean"`, `"list"`, `"meeseeks"` or `"nobodyExists"` |

## Error messages

I put a bit of effort in here, because nothing kills the fun faster than a useless error. Every error tells you the line, and they sound like they came from the show:

```
Aw geez, syntax error (line 2): a '{' was opened here and never closed. classic Jerry move
*burp* Runtime error (line 1): 'portalGun' doesn't exist. did you forget to pickle it?
*burp* Runtime error (line 4): dividing by zero? that's how you get Cronenbergs
```

Syntax problems sound like Morty panicking, runtime problems sound like Rick being annoyed, and the ones you raise yourself with `cronenberg` start with `Cronenberged!`.

## How it works

No `eval()`. Everything is hand-written so the code is easy to read if you're learning how languages work:

```
ricknmorty.js        the command line + REPL
src/lexer.js         turns source code into tokens (and throws away *burp*)
src/parser.js        recursive descent parser, tokens -> syntax tree
src/interpreter.js   walks the tree and runs it
src/errors.js        all the error flavour text
examples/            a bunch of .schwifty programs, start with 01
test/                tests, run with npm test
docs/                the web playground (GitHub Pages serves this)
scripts/build-web.js bundles src/ + examples into docs/ricknmortylang.js
```

If you change anything in `src/` or `examples/`, run `npm run build:web` so the playground picks it up.

Adding your own keyword is pretty much: add it to the `KEYWORDS` map in `lexer.js`, handle it in `parser.js`, then run it in `interpreter.js`.

## Stuff I'd like to add

- a `plumbus` keyword. no idea what it would do yet. nobody knows what a plumbus does
- objects / dictionaries
- reading user input
- syntax highlighting for VS Code

If you have an idea, open an issue or a PR. Bonus points if the keyword name makes me laugh.

## Credits

- Inspired by [GenZLang](https://github.com/wahabzai/genzlang) and [BhaiLang](https://bhailang.js.org/)
- Rick and Morty belongs to Adult Swim and its creators. This is just a fan project made out of love for the show, it isn't affiliated with them in any way.

## License

MIT. Fork it, break it, make it schwiftier.
