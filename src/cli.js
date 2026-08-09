#!/usr/bin/env node
import { Command } from 'commander';
import { scrape, TARGET_URL } from './scraper.js';
import { applyFilter, FILTER_IDS, FILTERS } from './filters.js';
import { openDb, saveRun, listRuns } from './db.js';

const program = new Command();

program
  .name('hn-crawler')
  .description('Scrapes Hacker News, filters the entries and tracks every run')
  .version('0.0.0');

program
  .command('crawl', { isDefault: true })
  .description('Scrape the front page, apply a filter and persist the run')
  .option('-f, --filter <id>', `filter to apply (${FILTER_IDS.join(' | ')})`, 'long')
  .option('-n, --limit <number>', 'entries to scrape before filtering', '10')
  .option('-u, --url <url>', 'source url', TARGET_URL)
  .option('-d, --db <path>', 'sqlite file', './crawler.db')
  .option('--json', 'print raw json instead of a table', false)
  .action(async (options) => {
    const startedAt = new Date().toISOString();
    const command = process.argv.slice(2).join(' ') || 'crawl';
    const limit = Number(options.limit);
    const db = openDb(options.db);

    const base = {
      started_at: startedAt,
      command,
      filter_id: options.filter,
      filter_label: FILTERS[options.filter]?.description ?? null,
      limit_n: limit,
      source_url: options.url,
      node_version: process.version,
    };

    try {
      const result = await scrape({ url: options.url, limit });
      const { filter, entries } = applyFilter(options.filter, result.entries);

      saveRun(
        db,
        {
          ...base,
          outcome: 'ok',
          error_message: null,
          filter_label: filter.description,
          http_status: result.status,
          duration_ms: result.durationMs,
          bytes: result.bytes,
          total_found: result.totalFound,
          scraped_count: result.entries.length,
          filtered_count: entries.length,
        },
        entries,
      );

      if (options.json) {
        console.log(JSON.stringify({ startedAt, filter: filter.id, entries }, null, 2));
        return;
      }

      console.log(`\n${startedAt} — filter: ${filter.id} (${filter.description})`);
      console.log(`scraped ${result.entries.length} of ${result.totalFound} in ${result.durationMs}ms\n`);
      console.table(
        entries.map((e) => ({
          '#': e.rank,
          title: e.title.length > 60 ? `${e.title.slice(0, 57)}...` : e.title,
          words: e.wordCount,
          points: e.points,
          comments: e.comments,
        })),
      );
    } catch (error) {
      saveRun(db, {
        ...base,
        outcome: 'error',
        error_message: error.message,
        http_status: error.status ?? null,
        duration_ms: error.durationMs ?? null,
        bytes: null,
        total_found: null,
        scraped_count: null,
        filtered_count: null,
      });
      console.error(`crawl failed: ${error.message}`);
      process.exitCode = 1;
    } finally {
      db.close();
    }
  });

program
  .command('history')
  .description('Show the last runs recorded in the database')
  .option('-n, --limit <number>', 'runs to show', '10')
  .option('-d, --db <path>', 'sqlite file', './crawler.db')
  .action((options) => {
    const db = openDb(options.db);
    console.table(listRuns(db, Number(options.limit)));
    db.close();
  });

program.parse();
