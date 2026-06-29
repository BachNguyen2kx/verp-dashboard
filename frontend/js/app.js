/**
 * app.js — Entry point của ERP Dashboard
 * Lấy dữ liệu từ API và khởi tạo mô hình MVC (Model, View, Controller)
 */

import { DashboardModel }      from './model.js?v=42';
import { DashboardView }       from './view.js?v=42';
import { DashboardController } from './controller.js?v=42';
import { Utils }               from './utils.js?v=42';

async function initApp() {
  try {
    // Tu dong nhan dien host de ho tro ca file:// va localhost
    const apiHost = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

    // 1. Fetch dữ liệu từ Flask API chạy song song
    const [meta, prod, biz, fin] = await Promise.all([
      fetch(`${apiHost}/api/metadata`).then(r => r.json()),
      fetch(`${apiHost}/api/production`).then(r => r.json()),
      fetch(`${apiHost}/api/business`).then(r => r.json()),
      fetch(`${apiHost}/api/finance`).then(r => r.json()),
    ]);

    // 2. Format số cho KPI cards (Python trả về số thô, View cần string)
    function fmtKpiValue(kpi) {
      if (kpi.type === 'triple') {
        return {
          ...kpi,
          m1Value: Utils.formatNumber(kpi.m1Value),
          m2Value: Utils.formatNumber(kpi.m2Value),
          m3Value: Utils.formatNumber(kpi.m3Value, 2),
        };
      }
      return { ...kpi, value: Utils.formatNumber(kpi.value) };
    }

    // 3. Lắp ráp mockData — đúng cấu trúc mà Model và View cần
    const mockData = {
      // Metadata dùng chung
      company:   meta.company,
      factories: meta.factories,
      workshops: meta.workshops,
      customers: meta.customers,
      periods:   meta.periods,
      months:    meta.months,
      weeks:     meta.weeks,

      // monthlyPlans dùng chung cho biểu đồ 12 tháng
      monthlyPlans: prod.monthlyPlans,

      // Trang Sản xuất
      production: {
        kpis:                 prod.kpis.map(fmtKpiValue),
        weeklyProduction:     prod.weeklyProduction,
        volumeProductivity:   prod.volumeProductivity,
        warehouseVsFinished:  prod.warehouseVsFinished,
        inventoryComposition: prod.inventoryComposition,
        inventoryTable:       prod.inventoryTable,
        monitor: {
          kpis:             prod.monitor.kpis,
          stageProgress:    prod.monitor.stageProgress,
          factories:        prod.monitor.factories,
          factoriesByMonth: prod.monitor.factoriesByMonth,
          inventorySummary: prod.monitor.inventorySummary,
          statusTimeHistory: prod.monitor.statusTimeHistory,
        },
        warehouseSummary: prod.warehouseSummary,
        warehouseSummaryByMonth: prod.warehouseSummaryByMonth,
      },

      // Trang Kinh doanh
      business: {
        kpis:                    biz.kpis.map(fmtKpiValue),
        revenueByCustomer:       biz.revenueByCustomer,
        revenueOverTime:         biz.revenueOverTime,
        inventoryByCategory:     biz.inventoryByCategory,
        topProducts:             biz.topProducts,
        customerShareList:       biz.customerShareList,
        revenueTable:            biz.revenueTable,
        topTurnoverItems:        biz.topTurnoverItems,
        topProductsSales:        biz.topProductsSales,
        topCustomersSales:       biz.topCustomersSales,
        topSuppliers:            biz.topSuppliers,
        inventorySummaryByMonth: biz.inventorySummaryByMonth,
      },

      // Trang Tài chính
      finance: {
        pl: {
          kpis:    fin.pl.kpis.map(fmtKpiValue),
          plTable: fin.pl.plTable,
          monthlyPl: fin.pl.monthlyPl,
        },
        balance: fin.balance,
      },
    };

    // 4. Khởi tạo MVC
    const model      = new DashboardModel(mockData);
    const view       = new DashboardView();
    const controller = new DashboardController(model, view);
    controller.init();

  } catch (error) {
    console.error('❌ Lỗi khởi động Dashboard:', error);

    // Hiển thị thông báo lỗi thân thiện
    document.body.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        height:100vh; font-family:Inter,sans-serif; color:#4A3C31; background:#FAF6F1;
        gap:16px; text-align:center; padding:24px;
      ">
        <div style="font-size:48px;">⚠️</div>
        <h2 style="font-size:22px; font-weight:800; margin:0;">Không kết nối được đến server</h2>
        <p style="color:#8B7355; max-width:420px; margin:0; line-height:1.6;">
          Dashboard cần Flask server đang chạy.<br>
          Hãy chạy file <strong>KHOI_DONG.bat</strong> để khởi động server,
          sau đó tải lại trang.
        </p>
        <div style="
          background:#fff; border:1px solid #E8DDD4; border-radius:8px;
          padding:12px 20px; font-family:monospace; font-size:13px; color:#6B4F3A;
        ">python backend/server.py</div>
        <button onclick="location.reload()" style="
          background:#C6923D; color:#fff; border:none; border-radius:6px;
          padding:10px 24px; font-size:14px; font-weight:700; cursor:pointer; margin-top:8px;
        ">🔄 Thử lại</button>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
