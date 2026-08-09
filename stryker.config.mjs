export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  mutate: ['src/**/*.js', '!src/cli.js'],
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation.html' },
  thresholds: { high: 95, low: 90, break: 90 },
  tempDirName: '.stryker-tmp'
}
