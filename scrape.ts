import assert from "assert";

import { chromium } from "playwright";
import dotenv from "dotenv";
import * as asciichart from "asciichart";
import * as stats from "simple-statistics";

const START_URL =
  "http://www.carmasmartmetering.com/DirectConsumptionDev/login.aspx";
const DEFAULT_TIMEOUT = 90000; // things take forever to load
const DAYS_IN_MONTH = [
  31,
  28, // This is just used for padding so it's ok
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
] as const;
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

// getCredentials() reads the .env file for credentials.
const getCredentials = () => {
  const result = dotenv.config();
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  assert.ok(process.env.USERNAME);
  assert.ok(process.env.PASSWORD);
  return {
    username: process.env.USERNAME!,
    password: process.env.PASSWORD!,
  };
};

// getDateSeries() gets a series of dates from startDate going up nDays days ahead.
const getDateSeries = (startDate: Date, nDays: number): Date[] => {
  return [...Array(nDays).keys()].map((n) => {
    const date = new Date(startDate);
    date.setDate(n);
    return date;
  });
};

// doubleUp() repeats every element in the array, putting duplicates next to
// each other.
// @ts-ignore
const _doubleUp = <T>(arr: T[]): T[] => {
  return arr.flatMap((x) => [x, x]);
};

const scrape = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const credentials = getCredentials();

  page.setDefaultTimeout(DEFAULT_TIMEOUT);
  await page.goto(START_URL);

  await page.fill("#username_txt", credentials.username);
  await page.fill("#password_txt", credentials.password);
  await page.click("#login_btn");

  await page.click("#currMonth_btn");
  await page.click("#nextMonth_btn");

  const currentDate = new Date();
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

  let usage: number[] | undefined = await page.evaluate(
    `chart1.series.find(x => x.name == "Daily Consumption")?.yData.filter(x => x > 0)`
  );

  await browser.close();

  if (usage === undefined) {
    process.exit(1);
  }

  const readingDate = new Date(firstOfMonth);
  readingDate.setDate(usage.length);
  console.log(`Reading as of ${readingDate.toLocaleDateString()}`);

  // Pad out the array with zeroes
  const paddedUsage = Array.from({
    ...usage,
    length: DAYS_IN_MONTH[firstOfMonth.getMonth()],
  }).fill(0, usage.length);

  const dates = getDateSeries(firstOfMonth, paddedUsage.length);

  const series: [string, number][] = Array(dates.length);

  for (let i = 0; i < series.length; ++i) {
    series[i] = [dates[i].toISOString(), usage[i]];
  }

  const meanSeries = Array(usage.length).fill(stats.mean(usage));

  const plotMax = Math.max(...usage, 20);

  const config = {
    colors: [asciichart.lightcyan, asciichart.lightyellow],
    min: 0,
    symbols: SYMBOLS,
    height: 10,
    max: plotMax,
  };

  const plot = asciichart.plot([meanSeries, paddedUsage], config);

  console.log(plot);
};

(async () => {
  await scrape();
})();
