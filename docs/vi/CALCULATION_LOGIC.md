# Logic Tính toán và Công thức Kế toán Quản trị

Tài liệu này giải thích chi tiết các công thức toán học, logic nghiệp vụ tài chính, kế toán quản trị và quy tắc kết chuyển, cộng dồn số liệu từ các tập tin CSV thô lên giao diện Dashboard.

## Mục lục
1. [Phân hệ Kết quả hoạt động SXKD (P&L)](#phân-hệ-kết-quả-hoạt-động-sxkd-pl)
    *   [A. Nguồn dữ liệu hạch toán](#a-nguồn-dữ-liệu-hạch-toán)
    *   [B. Công thức tính toán các chỉ tiêu P&L](#b-công-thức-tính-toán-các-chỉ-tiêu-pl)
2. [Phân hệ Bảng Cân đối kế toán (Balance Sheet)](#phân-hệ-bảng-cân-đối-kế-toán-balance-sheet)
    *   [A. Logic chốt số dư theo thời điểm (Point-in-Time Balance)](#a-logic-chốt-số-dư-theo-thời-điểm-point-in-time-balance)
    *   [B. Logic cộng dồn đa cấp (Roll-up Hierarchy)](#b-logic-cộng-dồn-đa-cấp-roll-up-hierarchy)
3. [Logic tính toán tồn kho và ngày lưu kho (Inventory Metrics)](#logic-tính-toán-tồn-kho-và-ngày-lưu-kho-inventory-metrics)
4. [Logic tính toán tỷ lệ so sánh giữa hai kỳ](#logic-tính-toán-tỷ-lệ-so-sánh-giữa-hai-kỳ)

## Phân hệ Kết quả hoạt động SXKD (P&L)

### A. Nguồn dữ liệu hạch toán
Bảng Kết quả hoạt động SXKD tổng hợp phát sinh lũy kế trong khoảng thời gian được chọn (thông thường chốt theo tháng M) từ hai nguồn:
1.  **Sổ nhật ký chung (so_nhat_ky_chung.csv)**: Lọc toàn bộ bút toán phát sinh trong tháng để tính Doanh thu và Giá vốn.
2.  **Chi tiết chi phí hoạt động (chi_phi_tai_san_chi_tiet.csv)**: Lọc toàn bộ dòng phát sinh chi phí thực tế trong tháng để tính chi phí bán hàng, quản lý và thuế.

### B. Công thức tính toán các chỉ tiêu P&L

1.  **Doanh thu bán hàng và cung cấp dịch vụ (Tài khoản 511):**
    ```text
    Doanh thu = Tổng phát sinh Có của tài khoản 511 trong tháng
    ```
    Được trích lọc từ tất cả bút toán phát sinh trong tháng có mã tài khoản kế toán bắt đầu bằng `511`.
2.  **Giá vốn hàng bán (Tài khoản 632):**
    ```text
    Giá vốn = Tổng phát sinh Nợ của tài khoản 632 trong tháng
    ```
    Được trích lọc từ tất cả bút toán phát sinh trong tháng có mã tài khoản kế toán bắt đầu bằng `632`.
3.  **Lợi nhuận gộp về bán hàng và cung cấp dịch vụ:**
    ```text
    Lợi nhuận gộp = Doanh thu - Giá vốn
    ```
4.  **Doanh thu hoạt động tài chính:**
    ```text
    Doanh thu tài chính = 1,250 USD (nếu Doanh thu phát sinh > 0)
    ```
    (Giá trị cố định đại diện cho lãi tiền gửi phát sinh trong tháng).
5.  **Chi phí tài chính / Chi phí lãi vay:**
    ```text
    Chi phí tài chính = 1,000 USD (Trong đó chi phí lãi vay cố định là 666 USD)
    ```
6.  **Chi phí bán hàng (mã nhóm EXP_SELL):**
    ```text
    Chi phí bán hàng = Tổng cộng cột amount_usd của các bản ghi có category_id = "EXP_SELL" trong tháng
    ```
7.  **Chi phí quản lý doanh nghiệp (mã nhóm EXP_SGNA):**
    ```text
    Chi phí quản lý = Tổng cộng cột amount_usd của các bản ghi có category_id = "EXP_SGNA" trong tháng
    ```
8.  **Lợi nhuận thuần từ hoạt động kinh doanh:**
    ```text
    Lợi nhuận kinh doanh = Lợi nhuận gộp + Doanh thu tài chính - Chi phí tài chính - Chi phí bán hàng - Chi phí quản lý
    ```
9.  **Chi phí thuế thu nhập doanh nghiệp hiện hành (mã nhóm TAX):**
    ```text
    Chi phí thuế = Tổng cộng cột amount_usd của các bản ghi có category_id = "TAX" trong tháng
    ```
10. **Lợi nhuận sau thuế thu nhập doanh nghiệp:**
    ```text
    Lợi nhuận sau thuế = Lợi nhuận kinh doanh - Chi phí thuế
    ```
11. **Lãi cơ bản trên cổ phiếu (EPS):**
    ```text
    EPS = Lợi nhuận sau thuế / 1,000,000
    ```
    (Giả định số lượng cổ phiếu đang lưu hành ổn định là 1,000,000 cổ phiếu).

## Phân hệ Bảng Cân đối kế toán (Balance Sheet)
Cơ chế xử lý số dư Cân đối kế toán đảm bảo tính cân đối tuyệt đối của phương trình kế toán cơ bản:
```text
Tổng cộng Tài sản = Tổng cộng Nguồn vốn
```

### A. Logic chốt số dư theo thời điểm (Point-in-Time Balance)
Không giống như báo cáo P&L cộng dồn phát sinh, số dư Cân đối kế toán phản ánh trạng thái tài sản tại một thời điểm cuối ngày của kỳ báo cáo:
1.  Hệ thống lọc toàn bộ các ngày có dữ liệu hạch toán trong tháng M được chọn (ví dụ: các ngày từ `2026-05-01` đến `2026-05-31`).
2.  Xác định **ngày cuối cùng có dữ liệu trong tháng** (ngày lớn nhất thực tế có số dư, thường là ngày 30 hoặc 31 của tháng).
3.  Truy xuất toàn bộ số dư của các tài khoản chi tiết cấp 2 tại ngày cuối cùng này trong tệp `so_du_can_doi_ke_toan_thang.csv` làm điểm chốt dữ liệu báo cáo.

### B. Logic cộng dồn đa cấp (Roll-up Hierarchy)
Bảng Cân đối kế toán gồm 5 cấp độ (từ level 0 đến level 4) được kế toán hạch toán ngược lên như sau:
1.  **Ánh xạ cấp cơ sở (Base Mapping)**: Số dư các tài khoản chi tiết cấp 2 được quy về các chỉ tiêu mẹ trực thuộc dựa trên bảng ánh xạ `accounts_map` trong mã nguồn.
    *   Ví dụ: Số dư tài khoản `tien_mat_quy` và `tien_gui_vcb` được cộng dồn về chỉ tiêu mẹ `tien` (Tiền và các khoản tương đương tiền).
2.  **Cộng dồn đa cấp (Hierarchical Roll-up)**: Chạy vòng lặp từ cấp sâu nhất lên cấp cao nhất (từ Level 4 -> Level 3 -> Level 2 -> Level 1 -> Level 0).
    ```text
    Số dư chỉ tiêu cha = Tổng số dư các chỉ tiêu con trực tiếp
    ```
3.  **Gán chỉ tiêu tổng kết**:
    *   `tong_tai_san` = `tai_san` (Level 0)
    *   `tong_nguon_von` = `nguon_von` (Level 0) = `no_phai_tra` + `von_chu_so_huu`.

## Logic tính toán tồn kho và ngày lưu kho (Inventory Metrics)
Dữ liệu tồn kho nguyên vật liệu và thành phẩm được quản lý chặt chẽ theo công thức cân đối kho:
```text
Tồn cuối = Tồn đầu + Nhập - Xuất
```

Hệ thống tính toán chỉ số thời gian lưu kho trung bình để phản ánh tốc độ luân chuyển vòng quay hàng tồn kho:
*   **Ngày lưu kho thực tế của lô vật tư (days_in_stock)**: Ghi nhận trong tệp chi tiết phiếu kho dựa trên số ngày chênh lệch giữa ngày nhập kho và ngày xuất dùng sản xuất.
*   **Ngày lưu kho bình quan hàng tháng (days_in_stock lũy kế)**:
    ```text
    Days in Stock lũy kế = Tổng (Days in Stock * Số lượng) / Tổng (Số lượng)
    ```
    Chỉ số này giúp ban điều hành nhận biết những nhóm nguyên vật liệu hoặc thành phẩm nào đang bị ứ đọng kéo dài để kịp thời điều chỉnh kế hoạch sản xuất hoặc giải phóng hàng tồn.

## Logic tính toán tỷ lệ so sánh giữa hai kỳ
Tỷ lệ phần trăm biến động của một chỉ tiêu giữa Kỳ báo cáo (ký hiệu C) và Kỳ so sánh (ký hiệu P) được tính theo công thức:
*   Nếu C khác 0 và P khác 0:
    ```text
    % Biến động = ((C - P) / P) * 100%
    ```
*   Nếu C khác 0 và P bằng 0:
    ```text
    % Biến động = +100.0%
    ```
*   Nếu C bằng 0 và P bằng 0:
    ```text
    % Biến động = 0.0% (Hiển thị ký tự "-" biểu thị không có biến động)
    ```
*   Nếu C bằng 0 và P khác 0:
    ```text
    % Biến động = -100.0%
    ```
*   Nếu P nhỏ hơn 0 (trường hợp hao mòn tài sản mang giá trị âm): Hệ thống tự động lấy giá trị tuyệt đối của P làm mẫu số để đảm bảo chiều hướng tăng/giảm phản ánh đúng quy mô thực tế.
