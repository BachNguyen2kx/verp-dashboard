"""
server.py — Flask backend cho ERP Dashboard
Nhiệm vụ: serve static FE files và cung cấp API endpoints tính toán từ CSV.
Tất cả computation logic nằm ở compute_*.py, server này chỉ làm routing và caching.
"""

import os, sys, csv, time, threading
from flask import Flask, jsonify, send_from_directory, send_file, make_response

# thêm backend/ vào path để import các module compute_*
THIS_DIR    = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR    = os.path.dirname(THIS_DIR)
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
DATA_DIR    = os.path.join(ROOT_DIR, "data")
sys.path.insert(0, THIS_DIR)

from compute_production import compute as compute_production
from compute_business   import compute as compute_business
from compute_finance    import compute as compute_finance


def read_metadata() -> dict:
    """Đọc cau_hinh_he_thong.csv → trả về dict metadata."""
    path = os.path.join(DATA_DIR, "cau_hinh_he_thong.csv")
    meta = {k: [] for k in ["factories","workshops","customers","periods","months","weeks"]}
    meta["company"] = {}

    # Ánh xạ category dạng số ít trong CSV sang số nhiều
    cat_map = {
        "factory": "factories",
        "workshop": "workshops",
        "customer": "customers",
        "period": "periods",
        "month": "months",
        "week": "weeks"
    }

    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            cat = (row.get("category") or "").strip()
            val = (row.get("value")    or "").strip()

            if cat.startswith("company_"):
                meta["company"][cat.replace("company_", "")] = val
            else:
                mapped_cat = cat_map.get(cat, cat)
                if mapped_cat in meta:
                    meta[mapped_cat].append(val)

    # Đảm bảo "Tất cả" luôn ở đầu
    for key in ["factories", "workshops", "customers"]:
        if "Tất cả" not in meta[key]:
            meta[key].insert(0, "Tất cả")

    return meta


# in-memory cache — tránh tính toán lại mỗi request
_cache: dict = {}
_cache_time: float = 0
DEBUG_MODE = True          # True = tự reload khi sửa .py, cache ngắn
CACHE_TTL  = 5 if DEBUG_MODE else 300   # debug: 5s; production: 5 phút
_lock = threading.Lock()


def get_all_data(force: bool = False) -> dict:
    global _cache, _cache_time
    with _lock:
        now = time.time()
        if _cache and not force and (now - _cache_time) < CACHE_TTL:
            return _cache

        print("Đang tính toán dữ liệu từ CSV...", flush=True)
        t0 = time.time()

        metadata = read_metadata()
        customer_labels = [c for c in metadata["customers"] if c != "Tất cả"]

        prod = compute_production()
        biz  = compute_business(customer_labels)
        fin  = compute_finance()

        # inventorySummaryTon tính ở compute_business, gắn vào production.monitor
        prod["monitor"]["inventorySummary"]["ton"] = biz.pop("inventorySummaryTon", [])

        _cache = {
            "metadata":   metadata,
            "production": prod,
            "business":   biz,
            "finance":    fin,
        }
        _cache_time = time.time()
        print(f"Tính xong trong {time.time()-t0:.1f}s", flush=True)
        return _cache


app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")


def json_resp(data):
    r = make_response(jsonify(data))
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Cache-Control"] = "no-cache"
    return r


@app.route("/")
def index():
    return send_file(os.path.join(FRONTEND_DIR, "index.html"))

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)

# API endpoints
@app.route("/api/metadata")
def api_metadata():
    return json_resp(get_all_data()["metadata"])

@app.route("/api/production")
def api_production():
    return json_resp(get_all_data()["production"])

@app.route("/api/business")
def api_business():
    return json_resp(get_all_data()["business"])

@app.route("/api/finance")
def api_finance():
    return json_resp(get_all_data()["finance"])

@app.route("/api/refresh", methods=["POST"])
def api_refresh():
    """Tính toán lại — gọi khi có CSV mới."""
    get_all_data(force=True)
    return json_resp({"status": "ok"})

@app.route("/api/status")
def api_status():
    return json_resp({
        "status":      "running",
        "cached":      bool(_cache),
        "cache_age_s": round(time.time() - _cache_time, 1) if _cache_time else None,
    })


if __name__ == "__main__":
    print(f"\n  ERP Dashboard — Flask Server")
    print(f"  Frontend: {FRONTEND_DIR}")
    print(f"  Data:     {DATA_DIR}\n")

    try:
        get_all_data()
    except Exception as e:
        print(f"Lỗi tải dữ liệu: {e}")

    print("  http://localhost:5000\n")
    print("  API: /api/metadata  /api/production  /api/business  /api/finance")
    print("  Ctrl+C để dừng\n")

    app.run(host="0.0.0.0", port=5000, debug=DEBUG_MODE,
            use_reloader=DEBUG_MODE, threaded=True)
