# Web Crawler - Hacker News - Stack Builders Interview

A CLI that crawls the [Hacker News](https://news.ycombinator.com/) front page, filters its entries and keeps every run in SQLite.

## Requirements

- Node.js 22 or newer.

> Persistence uses the built-in `node:sqlite` module, still flagged as experimental in Node 22, so the CLI starts with `--disable-warning=ExperimentalWarning`. The test runner passes the same flag to its workers through `vitest.config.js`.

## Install

```sh
npm install
```

## Usage

```sh
node src/cli.js [options]
```

> `npm start` works too, but npm needs `--` before the flags so they reach the CLI instead of npm:
> `npm start -- --filter=short-titles --limit=10`.

| Option | Description |
| --- | --- |
| `--filter <filter>` | `long-titles` (more than five words, ordered by comments) or `short-titles` (five words or fewer, ordered by points) |
| `--format <format>` | `table` (default) or `json` |
| `--limit <amount>` | Render at most this amount of entries, applied after filtering |
| `--run <id>` | Read a stored run instead of fetching, or `last` for the most recent one |
| `--db <path>` | Where the runs are stored, `crawler.db` by default |

Every crawl against the network stores a run, along with how long the fetch took and which filter and limit were requested. Reading a stored run stores nothing.

### The history command

```sh
node src/cli.js history [options]
```

| Option | Description |
| --- | --- |
| _none_ | Statistics of the last ten runs |
| `--last` | Statistics of the most recent run alone |
| `--run <id>` | Statistics of a single run |
| `--sort <order>` | `newest` first (default) or `oldest` first |
| `--format <format>` | `table` (default) or `json` |
| `--db <path>` | Where the runs are stored, `crawler.db` by default |

`--last` and `--run` cannot be combined. Statistics report the timestamp, the duration, the filter and limit that were requested, how many entries the run fetched, and how many survived that filter.
The surviving count is not stored: it is recomputed by replaying the stored filter over the stored entries, so filtering stays a rule applied on read.

### Output

Every crawl prints a summary panel first, reporting the run identifier, the filter that was applied, how long the fetch took and how many entries survived the filter.

Colors are written only when the destination is an interactive terminal, and never when `NO_COLOR` is set or `TERM` is `dumb`.
Redirecting or piping the output therefore yields plain text, and `json` output is never colored.

The summary goes to stderr and the rendered output goes to stdout, so the output stays pipeable:

```sh
node src/cli.js --format=json | jq '.[] | .title'
```

### Examples

```sh
node src/cli.js                                  # fetch, store and render the 30 entries
node src/cli.js --filter=long-titles             # more than five words, most commented first
node src/cli.js --filter=short-titles --limit=10 # five words or fewer, highest scoring first
node src/cli.js --run=last --filter=short-titles # re-filter the last run without network access
node src/cli.js history                          # statistics of the last ten runs
node src/cli.js history --last                   # statistics of the most recent run
node src/cli.js history --run=3 --format=json    # statistics of a specific run, as json
node src/cli.js history --sort=oldest            # oldest run first
```

## Filtering rules

A title's word count splits on whitespace and ignores any symbol, so `This is - a self-explained example` counts as 5 words: the standalone `-` is not a word.

Runs are stored unfiltered. Filtering is a domain rule applied on read, never frozen into the database.

## Architecture

```
src/
  domain/                     pure rules, no I/O and no dependencies
    count-words.js
    filters.js
  adapters/                   everything that talks to the outside world
    hacker-news-page.js       fetches the page
    hacker-news-parser.js     turns html into entries
    run-repository.js         stores and reads runs in SQLite, migrating the schema on open
    table.js                  draws bordered tables that fit a given width
    ansi.js                   color palette and terminal color support
    entries-formatter.js      column definitions for entries and runs
    cli-options.js            parses and validates command line values
  application/
    crawl-hacker-news.js      orchestrates the use case over injected ports
  cli.js                      wires the adapters and defines the command
```

## Tests

Written with [Vitest](https://vitest.dev/), one `describe` per behaviour and `given …` blocks for context, following the BDD practices.

```sh
npm test          # single run
npm run test:watch
```

Test fixtures are built inside `it` bodies, never in a `describe` body or at module level. Work that runs at collection time turns a failure into a file-level load error instead of a failing test, which hides it from both the reporter and the mutation runner.

Nothing is **mocked**:

- The parser runs against two real Hacker News pages saved as fixtures: the front page, and the jobs page, whose submissions carry no score and no comments.
- The repository runs against a real in-memory SQLite database.
- The page fetcher runs against a real HTTP server started by the test.
- The use case test wires the real parser, the real filters and a real database, and replaces only the network with the saved fixture. To prove that reading a stored run never touches the network, it injects a fetcher that throws when called.
- The table renderer is checked against its exact rendered output, and a test asserts that stripping the escape codes from a colored table yields the plain table byte for byte, so coloring can never break the alignment.
- The command line itself is tested by running `src/cli.js` as a real subprocess against a temporary database seeded through the repository. Option wiring cannot be checked any other way: a shadowed option parses fine in isolation and still reaches the wrong command.

## Schema migrations

The database carries its schema version in `pragma user_version`. Opening a repository applies every migration the database has not seen yet, so an existing `crawler.db` keeps its runs when new columns appear. `create table if not exists` alone would silently skip an outdated table and fail on the first insert.

## Mutation testing

```sh
npm run test:mutation
```

[Stryker](https://stryker-mutator.io/) rewrites the source one small change at a time — flipping a comparison, emptying a string, dropping a call — and reruns the suite.
A mutant that survives is a change no test objected to, which means that line is not really covered no matter what a coverage report says.
The run fails below a score of 90 and writes `reports/mutation.html`.

Current score: **97%**, with the domain filters, the use case, the palette and the option parser at 100%.

`src/cli.js` is excluded. Stryker activates one mutant per run through a global in its own process, and the command line is tested by spawning `node src/cli.js` as a child process, which never sees that global.
Every mutant there would be reported as surviving regardless of the tests.

