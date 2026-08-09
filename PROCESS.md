# Process and decisions

Why this solution looks the way it does, and how it was built.

## Decisions

### JavaScript, written functionally

JavaScript is the language I handle best, so it is where I can move fastest and judge quality most
reliably. The code is written in a functional style: small pure functions, values passed in and
returned, no classes and no inheritance. That keeps the boilerplate low, makes each piece readable on
its own, and makes testing trivial, since a function with no hidden state needs no setup to exercise.

### A CLI instead of a web application

A command line tool is the simplest thing to run, and it removes an entire layer of boilerplate: no
frontend, no build step, no framework, no rendering cycle. It is also the faster option, because
there is no user interface between the work and the result that could hurt performance.

### cheerio for parsing

I had not used cheerio before, since I had not needed to build this kind of scraper in JavaScript. A
quick round of research made it the clearest fit: it is fast, and it does exactly what this problem
needs and nothing more. Hacker News serves static HTML, so there is no need for a headless browser or
anything that executes JavaScript.

### commander for the command line

commander handles argument parsing, validation and help output, which makes the CLI nicer to use than
reading `process.argv` by hand.

### Vitest for tests

A modern test runner, Jest compatible, fast, and one I have experience with.

### Stryker for mutation testing

Coverage only proves that a line ran. Mutation testing proves that a test would notice if that line
were wrong. Stryker rewrites the source one small change at a time and reruns the suite: anything
that survives is a change no test objected to. It was added to confirm that the tests cover real
cases instead of merely walking through the code.

### Two AI assistants

- **ChatGPT (OpenAI)** for brainstorming: exploring approaches, comparing libraries and settling on a
  direction before any code existed.
- **Claude Code (Anthropic)** for building: first the spike, then the real implementation, driven in
  iterations.

## Workflow

### 1. Understand the problem before anything else

The first step is defining the scope, the goal, the constraints and the considerations. Only once
those were clear did I go to ChatGPT, explain everything I considered relevant, and ask for two or
three different approaches. What I gave it:

> **Problem to solve:** build a web crawler. It receives a specific URL, scrapes the data from that
> page, and then parses and processes what it returns.
>
> **Considerations:** this is a tool for one specific problem. It does not need large abstractions,
> over engineering, or mechanisms that support many cases unrelated to this one. The site serves
> static HTML. It will be written in JavaScript.
>
> **Constraints:** it has to be performant, easy to test, and use as few external libraries as
> possible.
>
> **Features:** extract the page data, parse the results, structure them, add two filtering options,
> and persist the data that needs to survive across runs.

### 2. Read the proposals, then spike

The next step is understanding what the AI actually gave back: the ideas, the architecture diagrams,
the approaches, and the reasoning behind each one. From there I picked one or two that looked viable
and matched what I was after, and built the first spikes.

For this challenge I built two: one using React and one as a CLI. The React one was discarded because
I did not consider it viable, so only the CLI lives in this repository.

### 3. Spike on a throwaway branch

I initialised the local repository, created a branch for the spike, and opened Claude Code with
explicit instructions that this was a spike: something quick and disposable, built only to validate
the idea.

The spike was working in thirty minutes, and it gave me everything I needed, so I decided to continue
with that approach.

### 4. Real implementation on main

Back on main, the real implementation started. I used Claude Code here as well, but because this is
the code that ends up in the repository, it needs stricter prompts and extra safeguards. The ones I
use:

- A concrete definition of the scope: what has to be done, and what must not.
- The programming style to follow.
- The kind of tests to write, in this case BDD.
- TDD throughout the whole implementation cycle.
- Mutation testing, to validate that the tests really cover real cases.
- Keep the code simple, without refactoring. Refactoring comes later.
- For critical or large features, Spec-Driven Development. It was not necessary for this challenge.

I never ask the AI to solve the whole problem. I tell it, part by part, what to do and how to do it.

### 5. Increment, validate, repeat

Once the first increment is done it gets validated, and only then does the next one start, until the
implementation is complete. Validation and refactoring happen as the code is built, not at the end.

### 6. Incremental commits

Commits are incremental and follow conventional commits. I use the AI to write a commit description
that explains the increment, the problems found and the important solutions.

That matters: a single read tells you what the commit does and what it adds, and it makes a rollback
or a cherry-pick far easier to perform.
