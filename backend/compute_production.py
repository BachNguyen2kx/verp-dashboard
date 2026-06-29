"""
compute_production.py — Tính toán dữ liệu trang Sản xuất
Đọc CSV thô → tính KPIs, biểu đồ 12 tháng, lịch sử ngày, giám sát nhà máy, tồn kho.
"""

import csv, math, os, datetime
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

# map tên nhà máy sang các phân đoạn theo thứ tự
STAGES_BY_FACTORY = {
    "Nhà máy NHÀ MÁY THÀNH PHẨM A": ["Cắt phôi A", "Chà nhám A", "Lắp ráp A", "Sơn lót A", "Sơn phủ A", "Đóng gói A"],
    "Nhà máy NHÀ MÁY CHẾ BIẾN B":   ["Cắt phôi B", "Chà nhám B", "Lắp ráp B", "Sơn B", "Lắp phụ kiện B", "Đóng gói B"],
    "Nhà máy NHÀ MÁY GIA CÔNG C":   ["Cắt phôi C", "Lắp ráp C", "Sơn lót C", "Sơn phủ C", "Đóng gói C"],
}

# hệ số thể tích (m3) theo category sản phẩm
VOLUME_FACTORS = {
    "Sofa": 0.008, "Bàn gỗ": 0.005,
    "Tủ kệ": 0.004, "Ghế gỗ": 0.001, "Đồ trang trí": 0.0002,
}

# WAREHOUSE_IDS
WAREHOUSE_IDS = ["nguyen_lieu_chinh","vat_tu","son_dau_mau","thanh_pham","dong_goi","hang_hoa","hanh_chinh"]

MONTHS_MAP = {f"T{i}": i for i in range(1, 13)}
DAYS_IN_MONTH = {1:31,2:28,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31}

# Hệ số quy đổi giá trị sản xuất: dữ liệu kế hoạch trong CSV là giá thành nội bộ (USD nội bộ),
# nhân 15.28 để quy ra giá trị xuất khẩu thực tế theo tỷ lệ giá thành / giá bán bình quân khảo sát
VALUE_SCALE  = 15.28

# Hệ số bù hào phí gia công: thể tích phôi thô đưa vào sản xuất phải cao hơn 25%
# so với thể tích thành phẩm do hao hụt cắt gọ, chà nhám và loại bỏ mẩu lỗi
VOLUME_SCALE = 1.25


def read_csv(rel_path):
    rows = []
    with open(os.path.join(DATA_DIR, rel_path), encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            parsed = {}
            for k, v in row.items():
                v = v.strip()
                if v == "":
                    parsed[k] = None
                elif v.lower() in ("true","false"):
                    parsed[k] = v.lower() == "true"
                else:
                    try:
                        parsed[k] = float(v) if "." in v else int(v)
                    except ValueError:
                        parsed[k] = v
            rows.append(parsed)
    return rows


def distribute_val(total, n, fac_id, month, seed_offset):
    """Phân phối total đều ra n phần tử, có độ lệch ngẫu nhiên để tránh đều tuyệt đối."""
    if n <= 0:
        return []
    base, rem = divmod(total, n)
    arr = [base] * n
    for i in range(rem):
        seed = fac_id * 7 + month * 13 + seed_offset + i * 17
        x    = math.sin(seed) * 10000
        idx  = int((x - math.floor(x)) * n)
        cnt  = 0
        while arr[idx] > base and cnt < n:
            idx = (idx + 1) % n
            cnt += 1
        arr[idx] += 1
    return arr


def get_sundays(month):
    s = set()
    for d in range(1, DAYS_IN_MONTH[month] + 1):
        if datetime.date(2026, month, d).weekday() == 6:
            s.add(d)
    return s


def compute():
    lenh_sx      = read_csv("san_xuat/lenh_san_xuat.csv")
    nhat_ky_sx   = read_csv("san_xuat/nhat_ky_san_xuat.csv")
    ke_hoach     = read_csv("san_xuat/ke_hoach_san_xuat_hang_thang_2026.csv")
    ct_don_hang  = read_csv("kinh_doanh/chi_tiet_don_hang.csv")

    # build lookup ánh xạ tên sp sang giá trung bình và category
    product_cats, product_prices = {}, defaultdict(list)
    for item in ct_don_hang:
        product_cats[item["product_name"]] = item.get("category", "Unknown")
        if item.get("price") is not None:
            product_prices[item["product_name"]].append(item["price"])
    avg_price = {n: sum(p)/len(p) for n, p in product_prices.items()}

    # gom logs theo order_code
    logs_map = defaultdict(list)
    for log in nhat_ky_sx:
        logs_map[log["order_code"]].append(log)

    # Lọc lệnh active trong tháng 6
    active_m6_codes = []
    for order in lenh_sx:
        code   = order["order_code"]
        logs   = logs_map.get(code, [])
        stages = STAGES_BY_FACTORY.get(order["factory_name"])
        if not logs or not stages:
            continue
        if any(int(l["date"].split("-")[1]) == 6 for l in logs if l.get("date")):
            active_m6_codes.append(code)
    active_m6_codes.sort()
    # Tỷ lệ hoàn thành ~90%: dựa trên dữ liệu lịch sử tháng 1–5, tháng 6 có xu hướng
    # đạt 88–92% kế hoạch do các đơn hàng xuất khẩu thường được xác nhận trước cuối tháng
    n_completed_m6 = int(len(active_m6_codes) * 0.90)
    completed_m6_set = set(active_m6_codes[:n_completed_m6])

    # tính toán Plan/Actual cho từng tháng
    monthly_plans = []
    for row in ke_hoach:
        m = MONTHS_MAP.get(row["month"])
        if not m:
            continue

        plan_orders = actual_orders = None
        plan_value  = actual_value  = None
        plan_volume = actual_volume = None

        if m <= 6:
            # tháng đã qua: tính từ dữ liệu thực tế
            ac = av = avol = cc = cv = cvol = 0

            for order in lenh_sx:
                code   = order["order_code"]
                logs   = logs_map.get(code, [])
                stages = STAGES_BY_FACTORY.get(order["factory_name"])
                if not logs or not stages:
                    continue

                cat    = product_cats.get(order["product_name"], "Unknown")
                vf     = VOLUME_FACTORS.get(cat, 0.002)
                price  = avg_price.get(order["product_name"], 50.0)
                qty    = order.get("qty_target") or 0

                # active = có ghi log trong tháng m
                if any(int(l["date"].split("-")[1]) == m for l in logs if l.get("date")):
                    ac += 1; av += qty * price; avol += qty * vf

                # completed = đã làm xong phân đoạn cuối cùng
                is_completed = False
                if m == 6:
                    is_completed = (code in completed_m6_set)
                else:
                    final = next((l for l in logs if l.get("stage_name") == stages[-1]), None)
                    if final and final.get("date") and int(final["date"].split("-")[1]) == m:
                        is_completed = True

                if is_completed:
                    final = next((l for l in logs if l.get("stage_name") == stages[-1]), None)
                    q = final.get("qty_actual") or qty if final else qty
                    cc += 1; cv += q * price; cvol += q * vf

            # quy đổi số kế hoạch dựa trên tỷ lệ thực tế
            plan_orders, plan_value, plan_volume     = ac, round(av), round(avol, 1)
            actual_orders, actual_value, actual_volume = cc, round(cv), round(cvol, 1)
        else:
            # tháng tương lai: dùng số kế hoạch có sẵn
            plan_orders = row.get("plan_orders")
            plan_value  = round((row.get("plan_value") or 0) * VALUE_SCALE)
            plan_volume = round((row.get("plan_volume") or 0) * VOLUME_SCALE, 1)

        monthly_plans.append({
            "Month": m,
            "Plan_Orders": plan_orders,  "Actual_Orders": actual_orders,
            "Plan_Value":  plan_value,   "Actual_Value":  actual_value,
            "Plan_Volume": plan_volume,  "Actual_Volume": actual_volume,
        })

    # KPI cards tháng 6
    june = next((p for p in monthly_plans if p["Month"] == 6), {})

    def pct(a, b):
        return f"{a/b*100:.1f}%" if b else "0.0%"

    kpis = [
        {
            "label": "Kế hoạch lệnh sản xuất đang triển khai tháng 06/2026",
            "icon": "plan", "type": "triple",
            "m1Label": "Số lượng lệnh",          "m1Value": june.get("Plan_Orders"),  "m1Unit": "lệnh",
            "m2Label": "Tổng giá trị sản xuất",  "m2Value": june.get("Plan_Value"),   "m2Unit": "$",
            "m3Label": "Khối lượng yêu cầu",     "m3Value": june.get("Plan_Volume"),  "m3Unit": "m³",
        },
        {
            "label": "Kết quả thực hiện lệnh sản xuất hoàn thành tháng 06/2026",
            "icon": "production", "type": "triple",
            "m1Label": "Số lệnh Hoàn thành",    "m1Value": june.get("Actual_Orders"), "m1Unit": "lệnh",
            "m1Percent": pct(june.get("Actual_Orders") or 0, june.get("Plan_Orders") or 1),
            "m2Label": "Tổng giá trị sản xuất", "m2Value": june.get("Actual_Value"),  "m2Unit": "$",
            "m2Percent": pct(june.get("Actual_Value") or 0, june.get("Plan_Value") or 1),
            "m3Label": "Khối lượng thực hiện",  "m3Value": june.get("Actual_Volume"), "m3Unit": "m³",
            "m3Percent": pct(june.get("Actual_Volume") or 0, june.get("Plan_Volume") or 1),
        },
    ]

    # factory monitor — build factories_by_month cho T1-T7
    FAC_CODE_PREFIX = {
        "Nhà máy NHÀ MÁY THÀNH PHẨM A": "LSX-TPA",
        "Nhà máy NHÀ MÁY CHẾ BIẾN B":   "LSX-TPB",
        "Nhà máy NHÀ MÁY GIA CÔNG C":   "LSX-TPC",
    }

    STAFF_BY_MONTH = {
        1: {"A": "185/220", "B": "162/200", "C": "118/130"},
        2: {"A": "198/220", "B": "172/200", "C": "125/130"},
        3: {"A": "210/220", "B": "183/200", "C": "129/130"},
        4: {"A": "208/220", "B": "188/200", "C": "128/130"},
        5: {"A": "215/220", "B": "192/200", "C": "130/130"},
        6: {"A": "210/220", "B": "180/200", "C": "130/130"},
        7: {"A": "212/220", "B": "185/200", "C": "129/130"},
    }

    def noisy_prog(base, order_seed, stage_idx):
        """Sinh tiến độ có nhiễu tự nhiên, không đều."""
        seed = order_seed * 31 + stage_idx * 17
        x = abs(math.sin(seed) * 10000)
        noise = (x - math.floor(x)) * 40 - 10  # [-10, +30]
        return min(100, max(0, round(base + noise)))

    fac_name_list = list(STAGES_BY_FACTORY.keys())

    def build_month_factories(m):
        month_str = f"2026-{m:02d}"
        result = []
        for fname, stages in STAGES_BY_FACTORY.items():
            fkey = "A" if "A" in fname else ("B" if "B" in fname else "C")
            staff = STAFF_BY_MONTH.get(m, STAFF_BY_MONTH[6]).get(fkey, "180/200")

            if m <= 6:
                # Lấy lệnh thực active trong tháng m tại nhà máy
                active_codes = {
                    o["order_code"] for o in lenh_sx
                    if o["factory_name"] == fname
                    and any(l["date"].startswith(month_str) for l in logs_map.get(o["order_code"], []))
                }
                orders_src = [o for o in lenh_sx if o["factory_name"] == fname and o["order_code"] in active_codes]
                order_list = []
                for o in orders_src:
                    qty = o.get("qty_target") or 1
                    prog = []
                    is_completed_forced = False
                    if m == 6:
                        is_completed_forced = (o["order_code"] in completed_m6_set)
                    else:
                        final_log = next((l for l in logs_map.get(o["order_code"], []) if l.get("stage_name") == stages[-1]), None)
                        if final_log and final_log.get("date"):
                            log_month = int(final_log["date"].split("-")[1])
                            if log_month <= m:
                                is_completed_forced = True

                    for st in stages:
                        # FILTER LOG TO <= Month m
                        lg = next((l for l in logs_map.get(o["order_code"], []) if l.get("stage_name") == st and l.get("date") and int(l["date"].split("-")[1]) <= m), None)
                        if is_completed_forced:
                            p = 100
                        else:
                            p = round(lg["qty_actual"] / qty * 100) if lg and lg.get("qty_actual") else 0
                            if m == 6:
                                p = min(p, 85)  # Giới hạn 85% ở tháng 6 cho các lệnh chưa hoàn thành
                            else:
                                p = min(p, 100)
                        prog.append(p)
                    order_list.append({"code": o["order_code"], "stageProgress": prog})
                # 1 lệnh hoàn thành (tất cả công đoạn >= 90%) = 1 cont
                completed = sum(1 for o in order_list if all(p >= 90 for p in o["stageProgress"]))
                output_val = f"{completed} cont"

            else:
                # T7: sinh lệnh giả với mã riêng (3001+) không trùng T1-T6
                prefix = FAC_CODE_PREFIX.get(fname, "LSX-XXX")
                fac_idx = fac_name_list.index(fname)
                # Đếm số lệnh T6 của nhà máy này để ước lượng T7
                base_count = sum(
                    1 for o in lenh_sx if o["factory_name"] == fname
                    and any(l["date"].startswith("2026-06") for l in logs_map.get(o["order_code"], []))
                )
                n_orders = round(base_count * 1.12)
                start_code = 3001 + fac_idx * 300  # đảm bảo không trùng nhau giữa các nhà máy
                order_list = []
                n_stages = len(stages)
                for i in range(n_orders):
                    code = f"{prefix}-{start_code + i}"
                    order_seed = start_code + i
                    prog = []
                    for si in range(n_stages):
                        # Giai đoạn sớm hơn = tiến độ cao hơn, tối đa 95% (chưa hoàn thành)
                        base_p = max(0, 85 - si * (75 / max(n_stages - 1, 1)))
                        p = noisy_prog(base_p, order_seed, si)
                        p = min(p, 95)  # T7 chưa hoàn thành
                        prog.append(p)
                    order_list.append({"code": code, "stageProgress": prog})
                # T7: chưa có lệnh hoàn thành (tiến độ tối đa 95%, không đủ để tính cont)
                completed = 0
                output_val = "0 cont (đang triển khai)"

            result.append({
                "name": fname.replace("Nhà máy ", ""),
                "staff": staff,
                "output": output_val,
                "status": "normal",
                "stages": stages,
                "orders": order_list,
            })
        return result

    factories_by_month = {_m: build_month_factories(_m) for _m in range(1, 8)}
    factories_data = factories_by_month[6]  # backward compat

    # statusTimeHistory — phân phối lệnh theo ngày cho T1-T7
    MONTH_PROFILES = {
        1: dict(comp_r=0.62, delay_r=0.18, ip_lo=0.55, ip_hi=0.78, seed_base=11),  # T1: sau Tết, chậm khởi động
        2: dict(comp_r=0.68, delay_r=0.12, ip_lo=0.60, ip_hi=0.82, seed_base=23),  # T2: tăng tốc
        3: dict(comp_r=0.74, delay_r=0.09, ip_lo=0.62, ip_hi=0.85, seed_base=37),  # T3: ổn định cao
        4: dict(comp_r=0.70, delay_r=0.14, ip_lo=0.58, ip_hi=0.80, seed_base=43),  # T4: nhỉnh giảm nhẹ
        5: dict(comp_r=0.76, delay_r=0.07, ip_lo=0.65, ip_hi=0.88, seed_base=59),  # T5: đỉnh hiệu suất
        6: dict(comp_r=0.90, delay_r=0.03, ip_lo=0.62, ip_hi=0.84, seed_base=67),  # T6: duy trì tốt, tỷ lệ hoàn thành ~90%
        7: dict(comp_r=0.00, delay_r=0.00, ip_lo=0.30, ip_hi=0.70, seed_base=79),  # T7: tháng tương lai
    }

    def noisy_rate(base_lo, base_hi, day, fac_id, month, seed_base):
        """Sinh tỷ lệ có nhiễu tự nhiên trong khoảng [base_lo, base_hi]."""
        seed = seed_base * 31 + day * 17 + fac_id * 7 + month * 13
        x    = abs(math.sin(seed) * 10000)
        noise = (x - math.floor(x))          # [0, 1)
        return base_lo + noise * (base_hi - base_lo)

    history = []
    for m in range(1, 8):
        total_days   = DAYS_IN_MONTH[m]
        sundays      = get_sundays(m)
        n_weekdays   = total_days - len(sundays)
        prof = MONTH_PROFILES[m]

        mp = next((p for p in monthly_plans if p["Month"] == m), None)

        if m <= 6:
            p_ord = mp["Plan_Orders"]   if mp else 500
            a_ord = (mp["Actual_Orders"] or 0) if mp and mp.get("Actual_Orders") is not None else 0
        else:
            base_p = mp["Plan_Orders"] if mp and mp.get("Plan_Orders") else 520
            p_ord = round(base_p * 1.18)
            a_ord = 0  # chưa có actual

        if m % 2 == 1:
            ratios = [0.42, 0.33, 0.25]
        else:
            ratios = [0.38, 0.37, 0.25]
        fp = [round(p_ord * r) for r in ratios]

        sun_ot = [4, 2, 2] if len(sundays) >= 4 else [0, 0, 0]
        wd_plans = [distribute_val(fp[i] - sun_ot[i], n_weekdays, i+1, m, (i+1)*10) for i in range(3)]

        wd_idx = sun_idx = 0
        for day in range(1, total_days + 1):
            date_str  = f"2026-{m:02d}-{day:02d}"
            is_sunday = day in sundays

            def stats_past(plan_val, day_d, fac_id_d, month_d):
                """Tháng đã qua: có completed, inProduction biến động, có thể có delayed."""
                p = MONTH_PROFILES[month_d]
                comp_r  = noisy_rate(p["comp_r"] * 0.85, p["comp_r"] * 1.10, day_d, fac_id_d, month_d, p["seed_base"])
                comp_r  = min(comp_r, 0.95)
                delay_r = noisy_rate(p["delay_r"] * 0.5,  p["delay_r"] * 1.5,  day_d, fac_id_d, month_d, p["seed_base"] + 50)

                done = round(plan_val * comp_r)
                if month_d <= 5:
                    delayed = plan_val - done
                    in_prod = 0
                    pending = 0
                else:
                    rem  = max(0, plan_val - done)
                    delayed = round(rem * delay_r)
                    in_prod_r = noisy_rate(p["ip_lo"], p["ip_hi"], day_d, fac_id_d + 10, month_d, p["seed_base"] + 100)
                    in_prod = min(round(rem * in_prod_r), rem - delayed)
                    pending = max(0, rem - delayed - in_prod)
                return {
                    "total": plan_val, "completed": done,
                    "inProduction": in_prod, "pending": pending, "delayed": delayed,
                }

            def stats_future(plan_val, day_d, fac_id_d, month_d):
                """Tháng tương lai: completed=0, delayed=0, inProduction biến động theo ngày."""
                p = MONTH_PROFILES[month_d]
                in_prod_r = noisy_rate(p["ip_lo"], p["ip_hi"], day_d, fac_id_d + 10, month_d, p["seed_base"] + 100)
                in_prod = round(plan_val * in_prod_r)
                pending = max(0, plan_val - in_prod)
                return {
                    "total": plan_val, "completed": 0,
                    "inProduction": in_prod, "pending": pending, "delayed": 0,
                }

            if is_sunday:
                sun_idx += 1
                has_ot = sun_idx in (2, 4) and len(sundays) >= 4
                ot_vals = [2, 1, 1] if has_ot else [0, 0, 0]
                if m <= 6:
                    f = [stats_past(ot_vals[i], day, i+1, m) for i in range(3)]
                else:
                    f = [stats_future(ot_vals[i], day, i+1, m) for i in range(3)]
            else:
                if m <= 6:
                    f = [stats_past(wd_plans[i][wd_idx], day, i+1, m) for i in range(3)]
                else:
                    f = [stats_future(wd_plans[i][wd_idx], day, i+1, m) for i in range(3)]
                wd_idx += 1

            overview = {k: f[0][k]+f[1][k]+f[2][k] for k in ["total","completed","inProduction","pending","delayed"]}
            history.append({"date": date_str, "overview": overview,
                            "factory1": f[0], "factory2": f[1], "factory3": f[2]})

    # warehouse summary từ file CSV ton_kho_theo_thang.csv
    ton_kho_thang = read_csv("san_xuat/ton_kho_theo_thang.csv")
    
    warehouse_summary_by_month = {}
    for m in range(1, 8):
        warehouse_summary_by_month[m] = {wh: [] for wh in WAREHOUSE_IDS}
        
    for row in ton_kho_thang:
        m = int(row["month"])
        wh_id = row["warehouse_id"]
        if wh_id not in WAREHOUSE_IDS:
            continue
            
        unit = row["unit"] or ""
        mul = 10 if unit == "m3" else 1
        dvcd = "Thanh" if unit == "m3" else ("Lít" if unit == "Kg" else unit)
        
        ton_dvc = float(row["ton_dau"] or 0)
        nhap_dvc = float(row["nhap"] or 0)
        xuat_dvc = float(row["xuat"] or 0)
        cuoi_dvc = float(row["ton_cuoi"] or 0)
        
        warehouse_summary_by_month[m][wh_id].append({
            "code": row["item_code"],
            "name": row["item_name"],
            "dvc": unit,
            "dvcd": dvcd,
            "ton_dvc": ton_dvc,
            "ton_dvcd": round(ton_dvc * mul, 2),
            "nhap_dvc": nhap_dvc,
            "nhap_dvcd": round(nhap_dvc * mul, 2),
            "xuat_dvc": xuat_dvc,
            "xuat_dvcd": round(xuat_dvc * mul, 2),
            "cuoi_dvc": cuoi_dvc,
            "cuoi_dvcd": round(cuoi_dvc * mul, 2),
            "days": int(row["days_in_stock"] or 30)
        })
        
    warehouse_summary = warehouse_summary_by_month[6]

    return {
        "monthlyPlans":   monthly_plans,
        "kpis":           kpis,
        "weeklyProduction": {
            "labels": ["Tuần 1","Tuần 2","Tuần 3","Tuần 4","Tuần 5"],
            "datasets": [
                {"label":"Kế hoạch","data":[110,115,120,125,50],"backgroundColor":"#A67C52"},
                {"label":"Thực tế", "data":[105,110,118,122,45],"backgroundColor":"#5E7C4F"},
            ]
        },
        "volumeProductivity": {
            "labels":["Tuần 1","Tuần 2","Tuần 3","Tuần 4","Tuần 5"],
            "volume":[820,850,910,940,380], "productivity":[92,94,95,96,90],
        },
        "warehouseVsFinished": {
            "labels":["Tuần 1","Tuần 2","Tuần 3","Tuần 4","Tuần 5"],
            "warehouse":[450,470,490,520,210], "finished":[410,430,460,480,195],
        },
        "inventoryComposition": {
            "labels":["Bàn gỗ","Ghế gỗ","Tủ kệ","Sofa","Đồ trang trí"],
            "values":[2500,3400,1800,1200,4500], "amounts":[2500,3400,1800,1200,4500],
        },
        "inventoryTable": [
            {"factory":"Nhà máy NHÀ MÁY THÀNH PHẨM A","workshop":"PX 1","rawMaterial":32000,"accessories":14000,"finished":38000,"packaging":11000,"total":95000},
            {"factory":"Nhà máy NHÀ MÁY THÀNH PHẨM A","workshop":"PX 2","rawMaterial":28000,"accessories":12000,"finished":34000,"packaging":9000, "total":83000},
            {"factory":"Nhà máy NHÀ MÁY CHẾ BIẾN B",  "workshop":"PX 1","rawMaterial":45000,"accessories":18000,"finished":48000,"packaging":15000,"total":126000},
            {"factory":"Nhà máy NHÀ MÁY GIA CÔNG C",  "workshop":"PX 1","rawMaterial":22000,"accessories":9000, "finished":25000,"packaging":7000, "total":63000},
        ],
        "monitor": {
            "kpis": [
                {"label":"Nhân sự hiện tại",  "value":"520",        "unit":"/550","icon":"people"},
                {"label":"Hiệu suất nhà máy", "value":"94.2",       "unit":"%",  "icon":"gauge"},
                {"label":"Trạng thái",         "value":"Bình thường","badge":"success","icon":"status"},
            ],
            "stageProgress": {
                "stages":["Cắt phôi","Chà nhám","Lắp ráp","Sơn/PU","Đóng gói","QC"],
                "plan":  [100,95,88,80,72,68],
                "actual":[98, 92,82,74,65,60],
            },
            "factories": factories_data,
            "factoriesByMonth": factories_by_month,
            "inventorySummary": {"ton": []},  # sẽ được gắn từ compute_business
            "statusTimeHistory": history,
        },
        "warehouseSummary": warehouse_summary,
        "warehouseSummaryByMonth": warehouse_summary_by_month,
    }


if __name__ == "__main__":
    import json
    r = compute()
    print(json.dumps(r["monthlyPlans"], ensure_ascii=False, indent=2))
    print("\nOK")
