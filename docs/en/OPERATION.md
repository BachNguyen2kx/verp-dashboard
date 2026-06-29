# Operations Guide & Project Directory Structure

This document provides the actual folder layout, environment setup instructions, application run steps, and operations troubleshooting guides.

## Table of Contents
1. [Actual Project Directory Structure](#actual-project-directory-structure)
2. [Setup & Execution Instructions](#setup--execution-instructions)
    *   [Step 1: Environment Setup](#step-1-environment-setup)
    *   [Step 2: Dependency Installation](#step-2-dependency-installation)
    *   [Step 3: Run the Application](#step-3-run-the-application)
3. [Important Data Disclaimer](#important-data-disclaimer)
4. [Operations Troubleshooting](#operations-troubleshooting)
    *   [A. Port 5000 Already in Use](#a-port-5000-already-in-use)
    *   [B. CSV Encoding Issues (Vietnamese Accents)](#b-csv-encoding-issues-vietnamese-accents)

## Actual Project Directory Structure
Below is the directory tree mapping showing all 14 database CSV files currently used in the project:

```text
erp-executive-dashboard/
│
├── backend/                        # Backend logical engine (Flask Server)
│   ├── compute_business.py         # Aggregates Sales data, client metrics, finished goods stock
│   ├── compute_finance.py          # Aggregates VAS-compliant P&L and Balance Sheet reports
│   ├── compute_production.py       # Computes workshop throughput, plan vs actual metrics
│   └── server.py                   # API routing, in-memory caching, and static file hosting
│
├── data/                           # CSV Flat-File database folder
│   ├── cau_hinh_he_thong.csv       # Global configuration, workshop master lookups, customer metadata
│   │
│   ├── kinh_doanh/
│   │   ├── don_hang.csv            # Sales order header vouchers list
│   │   ├── chi_tiet_don_hang.csv   # Itemized line-items for wood furniture sales
│   │   └── ton_kho_thanh_pham_theo_thang.csv # Monthly Finished Goods inventory flow ledger
│   │
│   ├── san_xuat/
│   │   ├── lenh_san_xuat.csv       # Production orders assigned to factories
│   │   ├── nhat_ky_san_xuat.csv    # Daily stage-by-stage shop floor operations log
│   │   ├── ke_hoach_san_xuat_hang_thang_2026.csv # 12-month performance planning targets
│   │   ├── phieu_kho.csv           # Raw material & Component invoice headers
│   │   ├── chi_tiet_phieu_kho.csv  # Invoice detail metrics containing material unit values and ages
│   │   └── ton_kho_theo_thang.csv  # Monthly aggregated inventory reports for raw materials
│   │
│   └── ke_toan/
│       ├── danh_muc_can_doi_ke_toan.csv # Balance Sheet tree structure hierarchy lookups
│       ├── so_nhat_ky_chung.csv    # General Ledger containing double-entry records
│       ├── chi_phi_tai_san_chi_tiet.csv # Daily detailed operational expenditures log
│       └── so_du_can_doi_ke_toan_thang.csv # Daily closing balances of Level-2 sub-ledger accounts
│
├── docs/                           # Documentation folder
│   ├── vi/                         # Vietnamese documentation
│   │   ├── ARCHITECTURE.md
│   │   ├── DATABASE_SCHEMA.md
│   │   ├── CALCULATION_LOGIC.md
│   │   └── OPERATION.md
│   └── en/                         # English documentation
│       ├── ARCHITECTURE.md
│       ├── DATABASE_SCHEMA.md
│       ├── CALCULATION_LOGIC.md
│       └── OPERATION.md
│
├── frontend/                       # Client web interface (HTML, CSS, JS)
│   ├── css/
│   │   ├── variables.css           # Global colors, typography, layout variables
│   │   ├── layout.css              # Grid structures, sidebars, responsive classes
│   │   └── components.css          # Tables, charts, and buttons styling
│   ├── js/
│   │   ├── app.js                  # Entry point, concurrency API fetches
│   │   ├── model.js                # State management and filtering parameters
│   │   ├── view.js                 # Controls DOM updates and chart drawings
│   │   ├── controller.js           # Coordinates event bindings from View to Model
│   │   └── utils.js                # Helper functions for currency, number, and trend formatting
│   └── index.html                  # Dashboard primary markup interface
│
├── KHOI_DONG.bat                   # Batch script for quick run on Windows
├── requirements.txt                # Python library dependency requirements
├── README.md                       # English project readme
└── README_VI.md                    # Vietnamese project readme
```

## Setup & Execution Instructions

### Step 1: Environment Setup
*   Ensure **Python 3.10** or a higher version is installed on your workstation.
*   During Windows installation, select the **"Add Python to PATH"** checkbox to enable command terminal operations.

### Step 2: Dependency Installation
Open Command Prompt or PowerShell in the root project folder and execute the library installer:
```bash
pip install -r requirements.txt
```

### Step 3: Run the Application
*   **Automated Run (Windows)**: Double-click [KHOI_DONG.bat](../../KHOI_DONG.bat) in the root workspace folder. The script checks dependencies, auto-installs requirements, starts Flask, and loads the dashboard in your default browser.
*   **Manual Start via Terminal**:
    ```bash
    python backend/server.py
    ```
    Then open your browser and navigate to: `http://localhost:5000`

## Important Data Disclaimer
> [!WARNING]
> Database CSV files located in `data/` are **fictional mock datasets** generated independently for system testing. No proprietary or confidential corporate records are contained in this workspace.

## Operations Troubleshooting

### A. Port 5000 Already in Use
If the Flask server crashes with `OSError: [Errno 98] Address already in use` or a similar error, the port 5000 is occupied by another process (often AirPlay Receiver on macOS/Windows, or a previous instance of the server):
*   **Option 1: Terminate the active process on Windows**:
    1.  Open CMD with Administrator permissions and locate the PID (Process ID) utilizing port 5000:
        ```cmd
        netstat -ano | findstr 5000
        ```
    2.  Terminate the target process:
        ```cmd
        taskkill /F /PID <Target_PID_Found>
        ```
*   **Option 2: Change the server run port**:
    Open [server.py](../../backend/server.py), find the startup execution code at the bottom of the script:
    ```python
    app.run(host="0.0.0.0", port=5000, debug=DEBUG_MODE, ...)
    ```
    Change the `port=5000` argument to a vacant port value (e.g., `port=5080`) and restart the execution.

### B. CSV Encoding Issues (Vietnamese Accents)
The backend engine parses data using `utf-8-sig` encoding (UTF-8 with a BOM signature) to support Vietnamese characters. If you edit CSV files using Microsoft Excel or other office applications and save them under default settings, the file encoding might change to ANSI or standard UTF-8, causing character distortions:
*   **How to resolve**:
    When choosing "Save As" in Microsoft Excel, ensure you select **"CSV UTF-8 (Comma delimited) (*.csv)"** from the file type dropdown instead of standard CSV formats to enforce the correct UTF-8 BOM encoding.
