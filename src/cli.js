#!/usr/bin/env -S node --disable-warning=ExperimentalWarning

import { Command, Option } from 'commander'

import { createCrawler } from './application/crawl-hacker-news.js'
import { createRunRepository, openDatabase } from './adapters/run-repository.js'
import { fetchPage, HACKER_NEWS_URL } from './adapters/hacker-news-page.js'
import { parseEntries } from './adapters/hacker-news-parser.js'
import {
  formatEntries,
  formatHistory,
  formatRunStats,
  formatRunSummary
} from './adapters/entries-formatter.js'
import { toRunOption, toLimitOption } from './adapters/cli-options.js'
import { createPalette, colorsSupported } from './adapters/ansi.js'

const DEFAULT_DATABASE = 'crawler.db'
const RECENT_RUNS_SHOWN = 10

const outputFor = (stream) => ({
  palette: createPalette(colorsSupported({ isTTY: stream.isTTY, env: process.env })),
  width: stream.columns ?? Number.POSITIVE_INFINITY
})

const buildCrawler = ({ db }) =>
  createCrawler({
    fetchEntries: async () => parseEntries(await fetchPage(HACKER_NEWS_URL)),
    repository: createRunRepository(openDatabase(db)),
    clock: () => Date.now()
  })

const reportSummary = (stats) =>
  console.error(`${formatRunSummary({ stats, ...outputFor(process.stderr) })}\n`)

const crawl = async (options) => {
  const { stats, entries } = await buildCrawler(options).crawl(options)

  reportSummary(stats)

  return formatEntries({ entries, format: options.format, ...outputFor(process.stdout) })
}

const readHistory = ({ last, run, sort, format, db }) => {
  const crawler = buildCrawler({ db })
  const requested = last ? 'last' : run
  const output = { format, ...outputFor(process.stdout) }

  return requested === undefined
    ? formatHistory({
        runs: crawler.recentRuns({ count: RECENT_RUNS_SHOWN, order: sort }),
        ...output
      })
    : formatRunStats({ stats: crawler.runStats(requested), ...output })
}

const fail = (error) => {
  console.error(outputFor(process.stderr).palette.red(`web-crawler: ${error.message}`))
  process.exitCode = 1
}

const show = (produce) => async (options) => {
  try {
    console.log(await produce(options))
  } catch (error) {
    fail(error)
  }
}

const withOutputOptions = (command) =>
  command
    .addOption(
      new Option('--format <format>', 'how to render the output')
        .choices(['table', 'json'])
        .default('table')
    )
    .option('--db <path>', 'where the runs are stored', DEFAULT_DATABASE)

const program = withOutputOptions(
  new Command()
    .name('web-crawler')
    .description('Crawl the Hacker News front page, filter its entries and keep every run')
    .enablePositionalOptions()
)
  .addOption(
    new Option('--filter <filter>', 'keep only long or short titles').choices([
      'long-titles',
      'short-titles'
    ])
  )
  .option('--limit <amount>', 'render at most this amount of entries', toLimitOption)
  .option('--run <id>', 'read a stored run instead of fetching, or "last"', toRunOption)
  .action(show(crawl))

withOutputOptions(
  program.command('history').description(`show the statistics of the last ${RECENT_RUNS_SHOWN} runs`)
)
  .addOption(new Option('--last', 'show the statistics of the most recent run').conflicts('run'))
  .option('--run <id>', 'show the statistics of a single run', toRunOption)
  .addOption(
    new Option('--sort <order>', 'which run comes first')
      .choices(['newest', 'oldest'])
      .default('newest')
  )
  .action(show(readHistory))

program.parse()
