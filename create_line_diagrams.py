#!/usr/bin/env python3
"""
Script to create 3 line diagram CSV files from Bereinigte_Daten_2026_06_24.csv
Each file contains time series data with:
- y-axis: cases, deaths, or recoveries
- x-axis: date (from 2020-01-01 to present day)
"""

import csv
from datetime import datetime
from collections import defaultdict
import os

# Configuration
INPUT_FILE = "Bereinigte_Daten_2026_06_24.csv"

# Column indices in the input CSV
DATE_IDX = 3      # Refdatum
CASES_IDX = 4     # AnzahlFall
DEATHS_IDX = 5    # AnzahlTodesfall
RECOVERIES_IDX = 6  # AnzahlGenesen

# Output file names
CASES_FILE = "line_diagram_cases.csv"
DEATHS_FILE = "line_diagram_deaths.csv"
RECOVERIES_FILE = "line_diagram_recoveries.csv"


def create_line_diagram_files():
    """Create 3 line diagram CSV files from the cleaned data."""
    
    # Read the input CSV and aggregate by date
    print(f"Reading {INPUT_FILE}...")
    
    # Dictionaries to store aggregated data
    cases_by_date = defaultdict(int)
    deaths_by_date = defaultdict(int)
    recoveries_by_date = defaultdict(int)
    
    start_date = datetime(2020, 1, 1).date()
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Skip header
        
        for row in reader:
            # Parse date
            date_str = row[DATE_IDX]
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                continue
            
            # Only include dates from 2020-01-01 onwards
            if date < start_date:
                continue
            
            # Aggregate values
            cases_by_date[date] += int(row[CASES_IDX])
            deaths_by_date[date] += int(row[DEATHS_IDX])
            recoveries_by_date[date] += int(row[RECOVERIES_IDX])
    
    print("Aggregating data by date...")
    
    # Get all unique dates and sort them
    all_dates = set(cases_by_date.keys()) | set(deaths_by_date.keys()) | set(recoveries_by_date.keys())
    sorted_dates = sorted(all_dates)
    
    # Save cases file
    print(f"Saving {CASES_FILE}...")
    with open(CASES_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'cases'])
        for date in sorted_dates:
            writer.writerow([date.strftime('%Y-%m-%d'), cases_by_date.get(date, 0)])
    
    # Save deaths file
    print(f"Saving {DEATHS_FILE}...")
    with open(DEATHS_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'deaths'])
        for date in sorted_dates:
            writer.writerow([date.strftime('%Y-%m-%d'), deaths_by_date.get(date, 0)])
    
    # Save recoveries file
    print(f"Saving {RECOVERIES_FILE}...")
    with open(RECOVERIES_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'recoveries'])
        for date in sorted_dates:
            writer.writerow([date.strftime('%Y-%m-%d'), recoveries_by_date.get(date, 0)])
    
    print(f"\nDone! Created 3 line diagram files:")
    print(f"  - {CASES_FILE}: date vs cases")
    print(f"  - {DEATHS_FILE}: date vs deaths")
    print(f"  - {RECOVERIES_FILE}: date vs recoveries")
    
    # Print summary statistics
    print(f"\nSummary:")
    print(f"  Date range: {min(sorted_dates).strftime('%Y-%m-%d')} to {max(sorted_dates).strftime('%Y-%m-%d')}")
    print(f"  Total cases: {sum(cases_by_date.values()):,}")
    print(f"  Total deaths: {sum(deaths_by_date.values()):,}")
    print(f"  Total recoveries: {sum(recoveries_by_date.values()):,}")


if __name__ == "__main__":
    # Change to the script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    create_line_diagram_files()
