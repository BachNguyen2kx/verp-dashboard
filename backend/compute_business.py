"""
compute_business.py — Tính toán dữ liệu trang Kinh doanh
Đọc don_hang vs chi_tiet_don_hang vs phieu_kho → tính KPIs, doanh thu, top products, tồn kho.
"""

import csv, os
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

CATEGORIES = ["Bàn gỗ","Ghế gỗ","Tủ kệ","Sofa","Đồ trang trí"]

SUPPLIERS = [
    "Công ty Lâm sản Đồng Nai", "Nhà máy Kính xây dựng Việt Nhật",
    "Nhà máy Hóa chất Sơn Hà", "Tổng kho Phụ kiện Blum Thành Đạt",
    "Công ty Bao bì Carton Hải Phòng", "Công ty Cung ứng Gỗ tự nhiên Gia Lai",
    "Công ty Sơn PU Đại Việt", "Nhà máy Kim khí & Bản lề DTC",
    "Lâm sản xuất khẩu Bình Dương", "Nhà cung cấp Vải da Luxury Đô Thành",
    "Công ty Nhựa & Màng PE Thăng Long", "Tổng kho Kim khí Hafele Hà Nội",
    "Công ty Giấy & Văn phòng phẩm Hồng Hà", "Nhà máy Sản xuất Đèn led Rạng Đông",
    "Công ty Cung cấp Keo dán sữa Vina", "Công ty Hóa chất Dung môi Petrolimex",
    "Nhà cung ứng Ván ép công nghiệp MDF", "Công ty TNHH Mây tre đan xuất khẩu",
    "Công ty Dệt thảm trải sàn Sài Gòn", "Tổng kho Thiết bị Nhà bếp Malloca",
]


def read_csv(rel_path):
    rows = []
    with open(os.path.join(DATA_DIR, rel_path), encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            parsed = {}
            for k, v in row.items():
                v = v.strip()
                if v == "":
                    parsed[k] = None
                else:
                    try:
                        parsed[k] = float(v) if "." in v else int(v)
                    except ValueError:
                        parsed[k] = v
            rows.append(parsed)
    return rows


def compute(customer_labels: list) -> dict:
    don_hang     = read_csv("kinh_doanh/don_hang.csv")
    ct_don_hang  = read_csv("kinh_doanh/chi_tiet_don_hang.csv")
    ct_phieu_kho = read_csv("san_xuat/chi_tiet_phieu_kho.csv")

    order_map = {o["order_id"]: o for o in don_hang}

    total_orders  = len(don_hang)
    total_revenue = sum(i.get("total_amount") or 0 for i in ct_don_hang)
    avg_order_val = round(total_revenue / total_orders) if total_orders else 0

    kpis = [
        {"label":"Tổng số đơn hàng",   "value":total_orders,           "unit":"Đơn","icon":"container"},
        {"label":"Tổng doanh thu",      "value":total_revenue,          "unit":"$",  "icon":"revenue"},
        {"label":"Lợi nhuận gộp",       "value":round(total_revenue*0.35),"unit":"$","icon":"gross"},
        {"label":"Giá trị đơn hàng TB", "value":avg_order_val,          "unit":"$",  "icon":"profit"},
    ]

    # Doanh thu theo từng customer
    cust_rev = {c: 0.0 for c in customer_labels}
    for item in ct_don_hang:
        o = order_map.get(item.get("order_id"))
        if o and o.get("customer_name") in cust_rev:
            cust_rev[o["customer_name"]] += item.get("total_amount") or 0

    biz_actual = [round(cust_rev.get(c, 0) / 1_000_000, 2) for c in customer_labels]
    revenue_by_customer = {
        "labels": customer_labels,
        "actual": biz_actual,
        "plan":   [round(v * 1.05, 2) for v in biz_actual],
        "cumulative": [round(v * 1.12, 2) for v in biz_actual],
    }

    # Xu hướng doanh thu theo tháng bên Kế toán
    monthly_rev_kt = [0.0] * 12
    monthly_cogs_kt = [0.0] * 12
    monthly_sgna_kt = [0.0] * 12
    monthly_sell_kt = [0.0] * 12
    monthly_tax_kt = [0.0] * 12

    # Đọc sổ nhật ký chung
    nhat_ky = read_csv("ke_toan/so_nhat_ky_chung.csv")
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
    chi_phi_details = read_csv("ke_toan/chi_phi_tai_san_chi_tiet.csv")
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

    trend_r = [None] * 12
    trend_g = [None] * 12
    trend_n = [None] * 12
    trend_gm = [None] * 12
    trend_nm = [None] * 12

    for i in range(12):
        if monthly_rev_kt[i] > 0:
            r_vnd = round(monthly_rev_kt[i] * 24 / 1_000_000, 1)
            cogs_vnd = round(monthly_cogs_kt[i] * 24 / 1_000_000, 1)
            sgna_vnd = round(monthly_sgna_kt[i] * 24 / 1_000_000, 1)
            sell_vnd = round(monthly_sell_kt[i] * 24 / 1_000_000, 1)
            tax_vnd = round(monthly_tax_kt[i] * 24 / 1_000_000, 1)
            
            gross_vnd = round(r_vnd - cogs_vnd, 1)
            net_vnd = round(gross_vnd - sgna_vnd - sell_vnd - tax_vnd, 1)
            
            trend_r[i] = r_vnd
            trend_g[i] = gross_vnd
            trend_n[i] = net_vnd
            trend_gm[i] = round((gross_vnd / r_vnd) * 100) if r_vnd > 0 else 0
            trend_nm[i] = round((net_vnd / r_vnd) * 100) if r_vnd > 0 else 0

    revenue_over_time = {
        "labels": [f"T{i}" for i in range(1, 13)],
        "revenue": trend_r, "grossProfit": trend_g, "netProfit": trend_n,
        "grossMargin": trend_gm, "netMargin": trend_nm,
    }

    # Tổng hợp theo category
    cat_qty = {c: 0 for c in CATEGORIES}
    cat_amt = {c: 0.0 for c in CATEGORIES}
    for item in ct_don_hang:
        cat = item.get("category")
        if cat in cat_qty:
            cat_qty[cat] += item.get("qty") or 0
            cat_amt[cat] += item.get("total_amount") or 0

    inventory_by_category = {
        "labels":  CATEGORIES,
        "values":  [cat_qty[c] for c in CATEGORIES],
        "amounts": [round(cat_amt[c] / 1000) for c in CATEGORIES],
    }

    # Top sản phẩm theo doanh thu
    prod_sales = {}
    for item in ct_don_hang:
        code = item.get("product_code")
        if not code:
            continue
        if code not in prod_sales:
            prod_sales[code] = {"name": item.get("product_name",""), "code": code, "revenue": 0.0, "qty": 0}
        prod_sales[code]["revenue"] += item.get("total_amount") or 0
        prod_sales[code]["qty"] += item.get("qty") or 0

    sorted_prods = sorted(prod_sales.values(), key=lambda x: x["revenue"], reverse=True)
    top_products = [
        {
            "name": p["name"], "code": p["code"], "trend": "up",
            "revenue": round(p["revenue"] / 1000),
            "share":   round(p["revenue"] / total_revenue * 100, 1) if total_revenue else 0,
        }
        for p in sorted_prods[:5]
    ]

    # Sắp xếp khách hàng theo doanh thu
    sorted_custs = sorted(
        [{"name": c, "revenue": round(cust_rev.get(c,0)/1_000_000, 2),
          "share": round(cust_rev.get(c,0)/total_revenue*100, 1) if total_revenue else 0}
         for c in customer_labels],
        key=lambda x: x["revenue"], reverse=True,
    )
    market_map = {0: "Thị trường Mỹ", 1: "Thị trường Châu Âu"}
    customer_share_list = [
        {"name": c["name"], "sub": market_map.get(i,"Thị trường Nội địa"),
          "revenue": c["revenue"], "share": c["share"],
          "color": "success" if i==0 else "warning" if i==1 else "neutral"}
        for i, c in enumerate(sorted_custs[:5])
    ]
    revenue_table = [
        {"customer": c["name"], "plan": round(c["revenue"]*0.95,1),
         "actual": c["revenue"], "cumulative": round(c["revenue"]*1.05,1)}
        for c in sorted_custs[:5]
    ]

    # Top mặt hàng luân chuyển kho nhanh
    item_days = {}
    for item in ct_phieu_kho:
        code = item.get("item_code")
        if not code:
            continue
        if code not in item_days:
            item_days[code] = {"code": item.get("item_name", code), "s": 0, "n": 0}
        item_days[code]["s"] += item.get("days_in_stock") or 0
        item_days[code]["n"] += 1

    top_turnover = sorted(
        [{"code": v["code"], "days": round(v["s"]/v["n"])} for v in item_days.values() if v["n"]],
        key=lambda x: x["days"], reverse=True,
    )[:700]

    # Suppliers — dùng hash của item_code để ánh xạ sang supplier name
    sup_purchases = defaultdict(float)
    for item in ct_phieu_kho:
        code = item.get("item_code")
        if code:
            h = sum(ord(c) for c in code)
            sup_purchases[SUPPLIERS[h % len(SUPPLIERS)]] += item.get("value_usd") or 0

    top_suppliers = sorted(
        [{"name": n, "sales": round(s*24000)} for n, s in sup_purchases.items()],
        key=lambda x: x["sales"], reverse=True,
    )[:700]

    # Đọc sổ phụ nhập xuất tồn thành phẩm theo tháng từ CSV
    ton_kho_tp = read_csv("kinh_doanh/ton_kho_thanh_pham_theo_thang.csv")
    
    # Cấu trúc: month -> type -> customer_name -> products
    inventory_summary_by_month = {}
    for m in range(1, 8):
        inventory_summary_by_month[m] = {
            "ton": defaultdict(list),
            "nhap": defaultdict(list),
            "xuat": defaultdict(list),
            "cuoi": defaultdict(list)
        }
        
    for row in ton_kho_tp:
        m = int(row["month"])
        cname = row["customer_name"]
        pcode = row["product_code"]
        pname = row["product_name"]
        
        for t in ["ton", "nhap", "xuat", "cuoi"]:
            qty = float(row[f"{t}_qty"] or 0)
            vol = float(row[f"{t}_vol"] or 0)
            vnd = float(row[f"{t}_vnd"] or 0)
            usd = float(row[f"{t}_usd"] or 0)
            
            inventory_summary_by_month[m][t][cname].append({
                "code": pcode,
                "name": pname,
                "qty": qty,
                "vol": vol,
                "vnd": vnd,
                "usd": usd
            })
            
    # Chuyển đổi sang cấu trúc danh sách kèm tổng cộng cho từng nhóm
    final_summary_by_month = {}
    for m in range(1, 8):
        final_summary_by_month[m] = {}
        for t in ["ton", "nhap", "xuat", "cuoi"]:
            final_summary_by_month[m][t] = []
            for cname in customer_labels:
                prods = inventory_summary_by_month[m][t].get(cname, [])
                total_qty = sum(p["qty"] for p in prods)
                total_vol = round(sum(p["vol"] for p in prods), 5)
                total_vnd = sum(p["vnd"] for p in prods)
                total_usd = sum(p["usd"] for p in prods)
                
                final_summary_by_month[m][t].append({
                    "group": cname,
                    "total": {
                        "qty": total_qty,
                        "vol": total_vol,
                        "vnd": total_vnd,
                        "usd": total_usd
                    },
                    "products": prods
                })
 
    inventory_summary_ton = final_summary_by_month[6]["ton"]
 
    return {
        "kpis":              kpis,
        "revenueByCustomer": revenue_by_customer,
        "revenueOverTime":   revenue_over_time,
        "inventoryByCategory": inventory_by_category,
        "topProducts":       top_products,
        "customerShareList": customer_share_list,
        "revenueTable":      revenue_table,
        "topTurnoverItems":  top_turnover,
        "topProductsSales":  [{"code":p["code"],"sales":p["revenue"] * 24000, "qty": p["qty"]} for p in sorted_prods[:700]],
        "topCustomersSales": [{"name":c["name"],"sales":cust_rev.get(c["name"], 0) * 24000} for c in sorted_custs[:700]],
        "topSuppliers":      top_suppliers,
        "inventorySummaryTon": inventory_summary_ton,
        "inventorySummaryByMonth": final_summary_by_month,
    }


if __name__ == "__main__":
    import json
    r = compute(["KH-A","KH-B"])
    print(json.dumps(r["kpis"], ensure_ascii=False, indent=2))
    print("\nOK")
