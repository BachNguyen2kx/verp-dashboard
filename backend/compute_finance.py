"""
compute_finance.py — Tính toán dữ liệu trang Tài chính
Đọc so_nhat_ky_chung.csv → lọc account code 511 vs 632 → tính P&L + Balance Sheet.
"""

import csv, os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")


def read_csv(rel_path):
    rows = []
    with open(os.path.join(DATA_DIR, rel_path), encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            parsed = {}
            for k, v in row.items():
                if k is None or v is None or isinstance(v, list):
                    continue
                v = v.strip()
                if v == "":
                    parsed[k] = None
                else:
                    try:
                        parsed[k] = float(v) if "." in v else int(v)
                    except (ValueError, TypeError):
                        parsed[k] = v
            rows.append(parsed)
    return rows


def compute() -> dict:
    nhat_ky = read_csv("ke_toan/so_nhat_ky_chung.csv")
    chi_phi_details = read_csv("ke_toan/chi_phi_tai_san_chi_tiet.csv")

    monthly_rev_kt = [0.0] * 12
    monthly_cogs_kt = [0.0] * 12
    monthly_sgna_kt = [0.0] * 12
    monthly_sell_kt = [0.0] * 12
    monthly_tax_kt = [0.0] * 12

    # Đọc sổ nhật ký chung theo từng tháng
    for row in nhat_ky:
        date_str = str(row.get("date") or "")
        if not date_str:
            continue
        try:
            m = int(date_str.split("-")[1]) - 1
        except (IndexError, ValueError):
            continue
        
        if 0 <= m < 12:
            code = str(row.get("account_code") or "")
            if code.startswith("511"):
                monthly_rev_kt[m] += row.get("credit") or 0.0
            elif code.startswith("632"):
                monthly_cogs_kt[m] += row.get("debit") or 0.0

    # Đọc chi phí kế toán phân bổ chi tiết hàng ngày
    for row in chi_phi_details:
        date_str = str(row.get("date") or "")
        if not date_str:
            continue
        try:
            m = int(date_str.split("-")[1]) - 1
        except (IndexError, ValueError):
            continue
        
        if 0 <= m < 12:
            cat_id = row.get("category_id")
            amt = row.get("amount_usd") or 0.0
            if cat_id == "EXP_SGNA":
                monthly_sgna_kt[m] += amt
            elif cat_id == "EXP_SELL":
                monthly_sell_kt[m] += amt
            elif cat_id == "TAX":
                monthly_tax_kt[m] += amt

    # Tính lũy kế thực tế cho 6 tháng đầu năm (T1 -> T6)
    revenue = sum(monthly_rev_kt[:6])
    cogs = sum(monthly_cogs_kt[:6])
    sgna_total = sum(monthly_sgna_kt[:6])
    sell_total = sum(monthly_sell_kt[:6])
    tax_total = sum(monthly_tax_kt[:6])

    # Tạo bảng P&L chi tiết cho từng tháng 1->12
    monthly_pl = {}
    for m in range(12):
        r = monthly_rev_kt[m]
        c = monthly_cogs_kt[m]
        sg = monthly_sgna_kt[m]
        sl = monthly_sell_kt[m]
        tx = monthly_tax_kt[m]
        
        m_fin_rev = 1250.0 if r > 0 else 0.0
        m_fin_exp = 1000.0 if r > 0 else 0.0
        
        gp = r - c
        op = gp + m_fin_rev - m_fin_exp - sl - sg
        np = op - tx
        
        monthly_pl[m+1] = {
            "revenue": r,
            "cogs": c,
            "gross_profit": gp,
            "fin_rev": m_fin_rev,
            "fin_exp": m_fin_exp,
            "interest_exp": 666.0 if r > 0 else 0.0,
            "sell_expense": sl,
            "sgna_expense": sg,
            "operating_profit": op,
            "tax": tx,
            "net_profit": np
        }

    # Tính toán các chỉ tiêu P&L lũy kế
    fin_rev = 15000.0
    fin_exp = 12000.0
    interest_exp = 8000.0
    
    gross_profit = revenue - cogs
    operating_profit = gross_profit + fin_rev - fin_exp - sell_total - sgna_total
    profit_before_tax = operating_profit  # Lợi nhuận khác = 0
    net_profit = profit_before_tax - tax_total
    eps_current = net_profit / 1000000.0
    eps_prior = (net_profit * 0.91) / 1000000.0

    kpis = [
        {"label":"Doanh thu hoạt động SXKD",   "value":round(revenue),"unit":"$","icon":"dollar"},
        {"label":"Lợi nhuận trước thuế",         "value":round(profit_before_tax), "unit":"$","icon":"briefcase"},
        {"label":"Chi phí thuế TNDN hoãn lại",  "value":round(tax_total),"unit":"$","icon":"alert"},
    ]

    pl_table = [
        {"name":"Doanh thu bán hàng và cung cấp dịch vụ",                    "current":round(revenue),      "prior":round(revenue*0.94), "highlight":False, "indent":0},
        {"name":"Các khoản giảm trừ doanh thu",                               "current":0,                   "prior":0,                   "highlight":False, "indent":1},
        {"name":"Doanh thu thuần về bán hàng và cung cấp dịch vụ",            "current":round(revenue),      "prior":round(revenue*0.94), "highlight":True, "indent":0},
        {"name":"Giá vốn hàng bán",                                           "current":round(cogs),         "prior":round(cogs*0.95),    "highlight":False, "indent":1},
        {"name":"Lợi nhuận gộp về bán hàng và cung cấp dịch vụ",             "current":round(gross_profit), "prior":round(gross_profit*0.93), "highlight":True, "indent":0},
        {"name":"Doanh thu hoạt động tài chính",                             "current":round(fin_rev),      "prior":round(fin_rev*0.93), "highlight":False, "indent":1},
        {"name":"Chi phí tài chính",                                          "current":round(fin_exp),      "prior":round(fin_exp*0.94), "highlight":False, "indent":1},
        {"name":"- Trong đó: Chi phí lãi vay",                                "current":round(interest_exp), "prior":round(interest_exp*0.94), "highlight":False, "indent":2},
        {"name":"Chi phí bán hàng",                                           "current":round(sell_total),   "prior":round(sell_total*0.94), "highlight":False, "indent":1},
        {"name":"Chi phí quản lý doanh nghiệp",                               "current":round(sgna_total),   "prior":round(sgna_total*0.95), "highlight":False, "indent":1},
        {"name":"Lợi nhuận thuần từ hoạt động kinh doanh",                    "current":round(operating_profit), "prior":round(operating_profit*0.92), "highlight":True, "indent":0},
        {"name":"Thu nhập khác",                                              "current":0,                   "prior":0,                   "highlight":False, "indent":1},
        {"name":"Chi phí khác",                                               "current":0,                   "prior":0,                   "highlight":False, "indent":1},
        {"name":"Lợi nhuận khác",                                             "current":0,                   "prior":0,                   "highlight":True, "indent":0},
        {"name":"Tổng lợi nhuận kế toán trước thuế",                         "current":round(profit_before_tax), "prior":round(profit_before_tax*0.92), "highlight":True, "indent":0},
        {"name":"Chi phí thuế thu nhập doanh nghiệp hiện hành",              "current":round(tax_total),    "prior":round(tax_total*0.95), "highlight":False, "indent":1},
        {"name":"Chi phí thuế thu nhập doanh nghiệp hoãn lại",              "current":0,                   "prior":0,                   "highlight":False, "indent":1},
        {"name":"Lợi nhuận sau thuế thu nhập doanh nghiệp",                  "current":round(net_profit),   "prior":round(net_profit*0.91), "highlight":True, "indent":0},
        {"name":"Lãi cơ bản trên cổ phiếu",                                   "current":eps_current,         "prior":eps_prior,           "highlight":False, "indent":0, "isEPS":True},
    ]

    # Đọc danh mục và số dư Cân đối kế toán daily
    danh_muc = read_csv("ke_toan/danh_muc_can_doi_ke_toan.csv")
    so_du_rows = read_csv("ke_toan/so_du_can_doi_ke_toan_thang.csv")

    # Ánh xạ tài khoản chi tiết cấp 2 về chỉ tiêu mẹ
    accounts_map = {
        "tien_mat_quy": "tien", "tien_gui_vcb": "tien", "tien_gui_tcb": "tien",
        "tuong_duong_tien": "tuong_duong_tien",
        "ck_kinh_doanh": "ck_kinh_doanh",
        "dt_dao_han": "dt_dao_han",
        "phai_thu_kh_le": "phai_thu_kh", "phai_thu_kh_dn": "phai_thu_kh",
        "phai_thu_ngan_han_khac": "phai_thu_ngan_han_khac",
        "ton_kho_nvl": "hang_ton_kho", "ton_kho_tp": "hang_ton_kho",
        "phai_thu_dh_kh": "phai_thu_dh_kh",
        "tscd_hh_nguyen_gia": "tscd_hh_nguyen_gia",
        "tscd_hh_hao_mon": "tscd_hh_hao_mon",
        "tra_ncc_go": "tra_nguoi_ban_nh", "tra_ncc_son": "tra_nguoi_ban_nh",
        "nguoi_mua_tra_tien_truoc_nh": "nguoi_mua_tra_tien_truoc_nh",
        "thue_phai_nop_nh": "thue_phai_nop_nh",
        "tra_nguoi_lao_dong": "tra_nguoi_lao_dong",
        "vay_ngan_han_vcb": "vay_nh", "vay_ngan_han_bidv": "vay_nh",
        "tra_nguoi_ban_dh": "tra_nguoi_ban_dh",
        "cp_pho_thong": "cp_pho_thong",
        "thang_du_von": "thang_du_von",
        "ln_chua_pp_luy_ke": "ln_chua_pp_luy_ke",
        "ln_chua_pp_ky_nay": "ln_chua_pp_ky_nay"
    }

    # Gom các dòng dữ liệu theo ngày
    daily_data = {}
    for r in so_du_rows:
        date_str = r.get("date")
        if date_str:
            if date_str not in daily_data:
                daily_data[date_str] = {}
            daily_data[date_str][r.get("item_id")] = r.get("amount_usd") or 0.0

    # Tìm ngày cuối cùng của từng tháng (từ tháng 1 đến tháng 12 năm 2026)
    months_str = [f"2026-{str(i).zfill(2)}" for i in range(1, 13)]
    monthly_balances = {}
    
    for m in months_str:
        # Lọc các ngày thuộc tháng m
        days_in_m = [d for d in daily_data.keys() if d.startswith(m)]
        monthly_balances[m] = {item.get("item_id"): 0.0 for item in danh_muc}
        
        if days_in_m:
            # Lấy ngày cuối cùng của tháng đó
            last_day = max(days_in_m)
            day_balances = daily_data[last_day]
            
            # Ánh xạ từ tài khoản chi tiết cấp 2 về chỉ tiêu mẹ
            for acc_id, amt in day_balances.items():
                parent_id = accounts_map.get(acc_id)
                if parent_id and parent_id in monthly_balances[m]:
                    monthly_balances[m][parent_id] += amt

    # Thực hiện roll-up từ cấp dưới lên cấp trên (cấp 4 lùi về cấp 1)
    for m in months_str:
        for lv in [4, 3, 2, 1]:
            for item in danh_muc:
                if item.get("level") == lv:
                    item_id = item.get("item_id")
                    parent_id = item.get("parent_id")
                    if parent_id and parent_id in monthly_balances[m]:
                        monthly_balances[m][parent_id] += monthly_balances[m][item_id]
        
        # Gán các chỉ tiêu tổng cộng đặc biệt
        if "tai_san" in monthly_balances[m]:
            monthly_balances[m]["tong_tai_san"] = monthly_balances[m]["tai_san"]
        if "nguon_von" in monthly_balances[m]:
            monthly_balances[m]["tong_nguon_von"] = monthly_balances[m]["nguon_von"]

    # Tạo balanceTable mặc định tại Tháng 6/2026
    default_month = "2026-06"
    prior_month = "2026-05"
    
    balance_table = []
    for item in danh_muc:
        item_id = item.get("item_id")
        name = item.get("name")
        level = item.get("level")
        highlight = item.get("highlight") == "True" or item.get("highlight") == True
        is_parent = item.get("is_parent") == "True" or item.get("is_parent") == True
        
        cur_val = monthly_balances.get(default_month, {}).get(item_id, 0.0)
        pri_val = monthly_balances.get(prior_month, {}).get(item_id, 0.0)
        
        balance_table.append({
            "id": item_id,
            "parentId": item.get("parent_id") or None,
            "name": name,
            "current": round(cur_val),
            "prior": round(pri_val),
            "isParent": is_parent,
            "level": level,
            "highlight": highlight
        })

    return {
        "pl":      {"kpis": kpis, "plTable": pl_table, "monthlyPl": monthly_pl},
        "balance": {"balanceTable": balance_table, "monthlyBalance": monthly_balances},
    }


if __name__ == "__main__":
    import json
    r = compute()
    print(json.dumps(r["pl"]["kpis"], ensure_ascii=False, indent=2))
    print("\nOK")
