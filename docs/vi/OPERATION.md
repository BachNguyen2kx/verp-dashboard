# Hướng dẫn Vận hành và Cấu trúc Thư mục Dự án

Tài liệu này cung cấp sơ đồ cấu trúc thư mục thực tế của dự án, hướng dẫn cài đặt môi trường, vận hành hệ thống và xử lý các sự cố thường gặp.

## Mục lục
1. [Sơ đồ cấu trúc thư mục thực tế](#sơ-đồ-cấu-trúc-thư-mục-thực-tế)
2. [Hướng dẫn cài đặt & vận hành](#hướng-dẫn-cài-đặt--vận-hành)
    *   [Bước 1: Chuẩn bị môi trường Python](#bước-1-chuẩn-bị-môi-trường-python)
    *   [Bước 2: Cài đặt các thư viện phụ thuộc](#bước-2-cài-đặt-các-thư-viện-phụ-thuộc)
    *   [Bước 3: Khởi chạy dự án](#bước-3-khởi-chạy-dự-án)
3. [Lưu ý quan trọng về dữ liệu](#lưu-ý-quan-trọng-về-dữ-liệu)
4. [Hướng dẫn xử lý sự cố (Troubleshooting)](#hướng-dẫn-xử-lý-sự-cố-troubleshooting)
    *   [A. Lỗi cổng dịch vụ 5000 bị chiếm dụng](#a-lỗi-cổng-dịch-vụ-5000-bị-chiếm-dụng)
    *   [B. Lỗi hiển thị sai ký tự tiếng Việt do mã hóa file CSV](#b-lỗi-hiển-thị-sai-ký-tự-tiếng-việt-do-mã-hóa-file-csv)

## Sơ đồ cấu trúc thư mục thực tế
Dưới đây là sơ đồ cấu trúc thư mục thực tế của dự án kèm theo toàn bộ 14 tệp tin cơ sở dữ liệu CSV đang sử dụng:

```text
erp-executive-dashboard/
│
├── backend/                        # Tầng xử lý logic Python (Flask Server)
│   ├── compute_business.py         # Tổng hợp số liệu Kinh doanh (Doanh số, đơn hàng, tồn kho thành phẩm)
│   ├── compute_finance.py          # Tổng hợp báo cáo P&L và Balance Sheet chuẩn từ số dư tài khoản
│   ├── compute_production.py       # Tính toán hiệu suất sản xuất và tiến độ xưởng
│   └── server.py                   # Flask App Routing, Caching API và serving static files
│
├── data/                           # Cơ sở dữ liệu dạng file phẳng CSV
│   ├── cau_hinh_he_thong.csv       # Tham số hệ thống, danh sách nhà xưởng, khách hàng metadata
│   │
│   ├── kinh_doanh/
│   │   ├── don_hang.csv            # Danh sách thông tin đầu phiếu đơn hàng
│   │   ├── chi_tiet_don_hang.csv   # Danh sách chi tiết các dòng mặt hàng của đơn hàng
│   │   └── ton_kho_thanh_pham_theo_thang.csv # Sổ chi tiết xuất nhập tồn kho thành phẩm theo tháng
│   │
│   ├── san_xuat/
│   │   ├── lenh_san_xuat.csv       # Các lệnh sản xuất ban hành xuống nhà xưởng
│   │   ├── nhat_ky_san_xuat.csv    # Nhật ký tiến độ chi tiết từng công đoạn sản xuất hàng ngày
│   │   ├── ke_hoach_san_xuat_hang_thang_2026.csv # Chỉ tiêu kế hoạch sản lượng, giá trị 12 tháng
│   │   ├── phieu_kho.csv           # Phiếu nhập kho, xuất kho nguyên vật liệu đầu phiếu
│   │   ├── chi_tiet_phieu_kho.csv  # Chi tiết dòng vật tư, giá trị và ngày lưu kho của phiếu kho
│   │   └── ton_kho_theo_thang.csv  # Báo cáo tổng hợp xuất nhập tồn kho nguyên vật liệu hàng tháng
│   │
│   └── ke_toan/
│       ├── danh_muc_can_doi_ke_toan.csv # Cấu trúc phân cấp tài khoản Balance Sheet
│       ├── so_nhat_ky_chung.csv    # Sổ nhật ký chung lưu bút toán nợ có phát sinh
│       ├── chi_phi_tai_san_chi_tiet.csv # Nhật ký kê khai chi tiết chi phí hoạt động daily
│       └── so_du_can_doi_ke_toan_thang.csv # Số dư chốt cuối ngày của các tài khoản cấp 2
│
├── docs/                           # Thư mục chứa tài liệu dự án
│   ├── vi/                         # Tài liệu tiếng Việt
│   │   ├── ARCHITECTURE.md
│   │   ├── DATABASE_SCHEMA.md
│   │   ├── CALCULATION_LOGIC.md
│   │   └── OPERATION.md
│   └── en/                         # Tài liệu tiếng Anh
│       ├── ARCHITECTURE.md
│       ├── DATABASE_SCHEMA.md
│       ├── CALCULATION_LOGIC.md
│       └── OPERATION.md
│
├── frontend/                       # Tầng giao diện người dùng (HTML, CSS, JS)
│   ├── css/
│   │   ├── variables.css           # Cấu hình màu sắc, kích thước và font chữ dùng chung
│   │   ├── layout.css              # Bố cục lưới, sidebar, topbar responsive
│   │   └── components.css          # Giao diện bảng biểu, biểu đồ, nút bấm
│   ├── js/
│   │   ├── app.js                  # Điểm khởi chạy của ứng dụng, nạp API
│   │   ├── model.js                # Quản lý trạng thái dữ liệu (State Management)
│   │   ├── view.js                 # Điều khiển vẽ lại các thẻ giao diện và đồ thị
│   │   ├── controller.js           # Điều phối sự kiện người dùng từ View sang Model
│   │   └── utils.js                # Hàm định dạng tiền, số, xu hướng
│   └── index.html                  # Giao diện chính của Dashboard
│
├── KHOI_DONG.bat                   # Tệp tin script chạy nhanh trên Windows
├── requirements.txt                # Danh sách thư viện Python cần cài đặt
├── README.md                       # File giới thiệu tiếng Anh
└── README_VI.md                    # File giới thiệu tiếng Việt
```

## Hướng dẫn Cài đặt & Vận hành

### Bước 1: Chuẩn bị môi trường Python
*   Đảm bảo máy tính đã cài đặt phiên bản **Python 3.10** hoặc cao hơn.
*   Khi cài đặt trên hệ điều hành Windows, hãy chọn **"Add Python to PATH"** trong trình cài đặt để có thể khởi chạy lệnh Python từ Terminal.

### Bước 2: Cài đặt các thư viện phụ thuộc
Mở ứng dụng Command Prompt hoặc PowerShell tại thư mục gốc của dự án và chạy lệnh cài đặt thư viện Flask:
```bash
pip install -r requirements.txt
```

### Bước 3: Khởi chạy dự án
*   **Chạy tự động (Windows)**: Kích đúp vào tệp tin [KHOI_DONG.bat](../../KHOI_DONG.bat). Script sẽ tự động kiểm tra Python, cài đặt các thư viện còn thiếu và khởi chạy trình duyệt web tại địa chỉ `http://localhost:5000`.
*   **Chạy thủ công qua dòng lệnh**:
    ```bash
    python backend/server.py
    ```
    Sau đó mở trình duyệt web và truy cập địa chỉ: `http://localhost:5000`

## Lưu ý quan trọng về dữ liệu
> [!WARNING]
> Toàn bộ các tập tin cơ sở dữ liệu trong thư mục `data/` là **dữ liệu giả lập kỹ thuật (Mock/Demo Data)** được tạo độc lập phục vụ mục đích kiểm thử hệ thống. Dự án tuyệt đối không chứa dữ liệu thực tế hay bảo mật của bất kỳ doanh nghiệp nào.

## Hướng dẫn xử lý sự cố (Troubleshooting)

### A. Lỗi cổng dịch vụ 5000 bị chiếm dụng
Khi khởi chạy Flask server, nếu gặp lỗi `OSError: [Errno 98] Address already in use` hoặc lỗi tương tự trên Windows chỉ ra cổng 5000 đang bị tiến trình khác chiếm đóng (thường là dịch vụ AirPlay Receiver trên Windows/macOS hoặc phiên bản server cũ chưa tắt hẳn):
*   **Cách 1: Tắt tiến trình đang chạy ẩn trên Windows**:
    1.  Mở CMD bằng quyền Administrator và chạy lệnh tìm PID (Process ID) đang chiếm cổng 5000:
        ```cmd
        netstat -ano | findstr 5000
        ```
    2.  Tắt tiến trình đó đi bằng lệnh:
        ```cmd
        taskkill /F /PID <Số_PID_tìm_được>
        ```
*   **Cách 2: Thay đổi cổng chạy của server**:
    Mở tệp [server.py](../../backend/server.py), tìm dòng cấu hình chạy ở cuối tệp:
    ```python
    app.run(host="0.0.0.0", port=5000, debug=DEBUG_MODE, ...)
    ```
    Sửa giá trị `port=5000` thành một cổng trống khác (ví dụ: `port=5080`) rồi tiến hành khởi chạy lại hệ thống.

### B. Lỗi hiển thị sai ký tự tiếng Việt do mã hóa file CSV
Backend Python sử dụng mã hóa `utf-8-sig` (UTF-8 có ký hiệu BOM) để đọc dữ liệu CSV nhằm hỗ trợ tiếng Việt có dấu. Nếu bạn chỉnh sửa dữ liệu thủ công bằng Microsoft Excel hoặc các phần mềm văn phòng khác và lưu lại dưới dạng CSV mặc định, cấu trúc mã hóa có thể bị thay đổi thành ANSI hoặc UTF-8 thông thường, dẫn tới lỗi sai ký tự trên Dashboard:
*   **Cách khắc phục**:
    Khi thực hiện lưu dữ liệu (Save As) trên Microsoft Excel, tại mục loại tệp (Save as type), bạn cần chọn đúng tùy chọn **"CSV UTF-8 (Comma delimited) (*.csv)"** thay vì cấu trúc CSV thông thường để Excel ghi nhận chính xác định dạng mã hóa tiếng Việt có dấu hỗ trợ cho server.
