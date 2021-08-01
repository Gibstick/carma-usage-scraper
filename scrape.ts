import assert from "assert";

import { chromium, Page } from "playwright-chromium";
import dotenv from "dotenv";
import * as asciichart from "asciichart";
import * as stats from "simple-statistics";
import AsciiTable from "ascii-table";

const START_URL =
  "http://www.carmasmartmetering.com/DirectConsumptionDev/login.aspx";
const DEFAULT_TIMEOUT = 90000; // things take forever to load
const SYMBOLS = [
  "┼",
  "┤",
  "╶",
  "╴",
  "─",
  "└",
  "┌",
  "┐",
  "┘",
  "│",
] as asciichart.PlotConfig["symbols"];

// getCredentials() reads credentials from environment variables.
const getCredentials = () => {
  assert.ok(process.env.CARMA_USERNAME);
  assert.ok(process.env.CARMA_PASSWORD);
  return {
    username: process.env.CARMA_USERNAME!,
    password: process.env.CARMA_PASSWORD!,
  };
};

// getConfig() parses config values from environment variables.
const getConfig = () => {
  return {
    executablePath: process.env.CARMA_CHROME_PATH,
  };
};

// getDateSeries() gets a series of dates from startDate going up nDays days ahead.
// @ts-ignore
const getDateSeries = (startDate: Date, nDays: number): Date[] => {
  return [...Array(nDays).keys()].map((n) => {
    const date = new Date(startDate);
    date.setDate(n);
    return date;
  });
};

const getUsageFromPage = async (page: Page): Promise<number[] | undefined> => {
  const usage: number[] | undefined = await page.evaluate(
    `chart1.series.find(x => x.name == "Daily Consumption")?.yData.filter(x => x > 0)`
  );
  return usage;
};

// doubleUp() repeats every element in the array, putting duplicates next to
// each other.
// @ts-ignore
const _doubleUp = <T>(arr: T[]): T[] => {
  return arr.flatMap((x) => [x, x]);
};

const scrape = async () => {
  const result = dotenv.config();
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  const config = getConfig();
  const credentials = getCredentials();

  const launchOptions = config.executablePath
    ? { ...config, channel: "stable" }
    : {};
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();

  page.setDefaultTimeout(DEFAULT_TIMEOUT);
  await page.goto(START_URL);

  await page.fill("#username_txt", credentials.username);
  await page.fill("#password_txt", credentials.password);
  await page.click("#login_btn");

  await page.click("#currMonth_btn");

  const lastUsage = await getUsageFromPage(page);
  if (lastUsage === undefined) {
    console.error("Unable to find last month's usage");
    process.exit(1);
  }

  await page.click("#nextMonth_btn");

  // "currentDate" is actually one day behind, because that's the latest data we can have in the chart.
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);

  const firstOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const currentMonthName = currentDate.toLocaleString("en-ca", {
    month: "long",
  });

  await page.waitForSelector(
    `.highcharts-title:has-text('Daily Consumption During ${currentMonthName}')`
  );

  console.log(`Daily Consumption During ${currentMonthName}`);

  let usage = await getUsageFromPage(page);

  await browser.close();

  if (usage === undefined) {
    console.error("Unable to find current month's usage");
    process.exit(1);
  }

  const isCurrent = usage.length == currentDate.getDate();

  const readingDate = new Date(firstOfMonth);
  readingDate.setDate(usage.length);
  console.log(
    `Reading as of ${readingDate.toLocaleDateString()}` +
      (isCurrent ? " (latest)" : "")
  );

  const last30Usage = [...lastUsage?.slice(30 - usage.length), ...usage];

  const mean = stats.mean(last30Usage);
  const meanSeries = Array(last30Usage.length).fill(mean);

  const plotMax = Math.max(...usage, 20);

  const plotConfig = {
    colors: [asciichart.lightcyan, asciichart.lightyellow],
    min: 0,
    symbols: SYMBOLS,
    height: 10,
    max: plotMax,
  };

  const plot = asciichart.plot([meanSeries, last30Usage], plotConfig);

  console.log(plot);

  const lastFive = last30Usage.slice(-5).reverse();
  const recentMean = stats.mean(lastFive);
  const max = stats.max(last30Usage);
  const min = stats.min(last30Usage);
  const stdDev = stats.standardDeviation(last30Usage);

  const table = new AsciiTable();
  table.removeBorder();
  table.addRow("latest", `${usage[usage.length - 1]}`);
  table.addRow("avg 5 days", recentMean.toFixed(2));
  table.addRow("avg 30 days", mean.toFixed(2));
  table.addRow("max", max.toFixed(2));
  table.addRow("min", min.toFixed(2));
  table.addRow("stddev", stdDev.toFixed(2));
  table.addRow("last 5", lastFive.map((x) => x.toFixed(2)).join(" "));

  console.log(table.toString());
};

(async () => {
  await scrape();
})();
