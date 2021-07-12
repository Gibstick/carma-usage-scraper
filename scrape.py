#!/usr/bin/env python3

import csv
import datetime

from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

START_URL = "http://www.carmasmartmetering.com/DirectConsumptionDev/login.aspx"
TIMEOUT = 90000  # things take forever to load


def main(username, password) -> None:
    with sync_playwright() as p:

        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_default_timeout(TIMEOUT)
        page.goto(START_URL)
        print(page.title())

        page.fill("#username_txt", username)
        page.fill("#password_txt", password)
        page.click("#login_btn")

        page.click("#currMonth_btn")
        page.click("#nextMonth_btn")

        current_month = datetime.datetime.today().replace(day=1)
        current_month_text = current_month.strftime("%B")
        page.wait_for_selector(
            f".highcharts-title:has-text('Daily Consumption During {current_month_text}')"
        )
        title = page.query_selector(".highcharts-title")
        title_text = title.text_content()
        print(title_text)

        subtitle = page.query_selector(".highcharts-subtitle")
        subtitle_text = subtitle.text_content()
        print(subtitle_text)

        usage = page.evaluate(
            """chart1.series.find(x => x.name == "Daily Consumption")?.yData.filter(x => x > 0)"""
        )
        browser.close()

        dates = [
            current_month + datetime.timedelta(days=days)
            for days in range(len(usage))
        ]

        series = tuple(
            (date.strftime("%Y-%m-%d"), amount)
            for date, amount in zip(dates, usage)
        )

        out_filename = f"{current_month_text}_usage.tsv"
        with open(out_filename, "w", newline="") as output_file:
            writer = csv.writer(output_file, delimiter="\t")
            writer.writerows(series)

        print(f"Usage data written to {out_filename}")


if __name__ == "__main__":
    config = dotenv_values(".env")

    main(
        username=config["USERNAME"],
        password=config["PASSWORD"],
    )
