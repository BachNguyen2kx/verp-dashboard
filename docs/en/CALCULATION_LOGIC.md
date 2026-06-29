# Management Accounting Calculation Logic & Formulas

This document explains the mathematical formulas, business rules, and multi-level data aggregation (roll-up) methodologies used to process raw CSV files and generate executive dashboard metrics.

## Table of Contents
1. [Income Statement (P&L) Module](#income-statement-pl-module)
    *   [A. Data Sources](#a-data-sources)
    *   [B. P&L Indicator Formulas](#b-pl-indicator-formulas)
2. [Balance Sheet Module](#balance-sheet-module)
    *   [A. Point-in-Time Balance Logic](#a-point-in-time-balance-logic)
    *   [B. Multi-Level Roll-Up Hierarchy](#b-multi-level-roll-up-hierarchy)
3. [Inventory & Storage Metrics](#inventory--storage-metrics)
4. [Period-over-Period Variance Calculations](#period-over-period-variance-calculations)

## Income Statement (P&L) Module

### A. Data Sources
The P&L statement aggregates cumulative activity during the selected month M from two main datasets:
1.  **General Ledger (so_nhat_ky_chung.csv)**: Filters transaction rows within the month to compute Sales Revenue and Cost of Goods Sold (COGS).
2.  **Operational Expenditures (chi_phi_tai_san_chi_tiet.csv)**: Aggregates selling costs, general & administrative expenses (SG&A), and taxes.

### B. P&L Indicator Formulas

1.  **Sales Revenue (Account 511):**
    ```text
    Revenue = Total Credit entries for Account 511 in the month
    ```
    Filtered from ledger entries where the account code starts with `511`.
2.  **Cost of Goods Sold (Account 632):**
    ```text
    COGS = Total Debit entries for Account 632 in the month
    ```
    Filtered from ledger entries where the account code starts with `632`.
3.  **Gross Profit:**
    ```text
    Gross Profit = Revenue - COGS
    ```
4.  **Financial Income:**
    ```text
    Financial Income = 1,250 USD (if Revenue > 0)
    ```
    (A static value representing monthly recurring bank deposits interest).
5.  **Financial Expenses / Interest Paid:**
    ```text
    Financial Expenses = 1,000 USD (of which Interest Paid is fixed at 666 USD)
    ```
6.  **Selling Expenses (group code EXP_SELL):**
    ```text
    Selling Expenses = Total amount_usd where category_id = "EXP_SELL" in the month
    ```
7.  **General & Administrative Expenses (group code EXP_SGNA):**
    ```text
    SG&A Expenses = Total amount_usd where category_id = "EXP_SGNA" in the month
    ```
8.  **Operating Profit:**
    ```text
    Operating Profit = Gross Profit + Financial Income - Financial Expenses - Selling Expenses - SG&A Expenses
    ```
9.  **Income Taxes (group code TAX):**
    ```text
    Income Taxes = Total amount_usd where category_id = "TAX" in the month
    ```
10. **Net Profit:**
    ```text
    Net Profit = Operating Profit - Income Taxes
    ```
11. **Earnings Per Share (EPS):**
    ```text
    EPS = Net Profit / 1,000,000
    ```
    (Assumes a stable volume of 1,000,000 outstanding common shares).

## Balance Sheet Module
The balance sheet uses a closing snapshot methodology to verify the fundamental accounting equation:
```text
Total Assets = Total Liabilities + Owner's Equity
```

### A. Point-in-Time Balance Logic
Unlike P&L metrics which aggregate performance over time, Balance Sheet items represent a point-in-time financial state at a specific date:
1.  The system identifies all logged days within the target month M (e.g., from `2026-05-01` to `2026-05-31`).
2.  The **last date containing records** is isolated (usually the 30th or 31st day).
3.  Ledger records matching this date are retrieved from `so_du_can_doi_ke_toan_thang.csv` to serve as the closing balances.

### B. Multi-Level Roll-Up Hierarchy
The Balance Sheet displays a 5-level node tree (Level 0 to Level 4) calculated via a bottom-up summation process:
1.  **Base Mapping**: Level-2 detail accounts are mapped to their parent nodes in the hierarchy using `accounts_map` in the code.
    *   Example: Balances for `tien_mat_quy` (cash in hand) and `tien_gui_vcb` (bank deposits) are aggregated into the parent node `tien` (Cash and cash equivalents).
2.  **Hierarchical Roll-Up**: The system runs a bottom-up loop from the deepest leaf node levels to the highest section headers (from Level 4 -> Level 3 -> Level 2 -> Level 1 -> Level 0).
    ```text
    Parent Node Balance = Sum of Direct Child Balances
    ```
3.  **Grand Totals Assignment**:
    *   `tong_tai_san` = `tai_san` (Level 0)
    *   `tong_nguon_von` = `nguon_von` (Level 0) = `no_phai_tra` (Liabilities) + `von_chu_so_huu` (Equity).

## Inventory & Storage Metrics
Material and finished goods inventory levels are tracked using a basic balance equation:
```text
Ending Stock = Beginning Stock + Inward - Outward
```

The system calculates inventory storage age metrics to identify turnover efficiencies:
*   **Item Batch Age (days_in_stock)**: Logged in warehouse receipt detail files, representing the actual storage duration in days between receipt entry and warehouse issuance.
*   **Monthly Mean Storage Duration (cumulative days_in_stock)**:
    ```text
    Cumulative Days in Stock = Sum (Days in Stock * Quantity) / Sum (Quantity)
    ```
    This average metric highlights slow-moving stocks that may require production changes or sales clearance.

## Period-over-Period Variance Calculations
Percentage fluctuations of any indicator between the Current Period (denoted as C) and the Prior Period (denoted as P) are calculated as follows:
*   If C is not 0 and P is not 0:
    ```text
    % Variance = ((C - P) / P) * 100%
    ```
*   If C is not 0 and P is 0:
    ```text
    % Variance = +100.0%
    ```
*   If C is 0 and P is 0:
    ```text
    % Variance = 0.0% (Rendered on screen as a dash "-" to signify no change)
    ```
*   If C is 0 and P is not 0:
    ```text
    % Variance = -100.0%
    ```
*   If P is less than 0 (e.g., asset depreciation values which carry negative signs), the system uses the absolute value of P as the denominator to ensure the direction of variance matches real-world trends.
