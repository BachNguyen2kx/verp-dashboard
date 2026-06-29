import { Utils } from './utils.js?v=42';

export class DashboardModel {
  constructor(mockData) {
    this.data = mockData;
    this.activePage = 'production';
    this.activeWarehouseTab = 'nguyen_lieu_chinh'; // 'nguyen_lieu_chinh' | 'vat_tu' | 'son_dau_mau' | ...
    this.activeBusinessInventoryTab = 'cuoi'; // 'ton' | 'nhap' | 'xuat' | 'cuoi'
    this.businessTrendView = 'chart'; // 'chart' | 'table'
    this.activeMonitorTab = 'tien_do'; // 'tien_do' | 'tinh_trang'
    this.active12MMetric = 'orders'; // 'orders' | 'value' | 'volume'
    this.activeMonitorFactory = 'overview'; // 'overview' | 'factory1' | 'factory2' | 'factory3'
    this.activeMonitorMonth = 6; // default to June (Tháng 6)
    
    // Bộ lọc thời gian toàn cục
    this.timeFilter = {
      type: 'none', // 'none' | 'day' | 'week' | 'month' | 'quarter'
      value: null,  // Kiểu tương ứng: 'day': 'YYYY-MM-DD', 'week': '24', 'month': 6, 'quarter': 2
      year: 2026
    };

    this.balanceTableState = [];
    this.collapsedBusinessGroups = new Set();
    this.collapsedProductionGroups = new Set();

    this.initStates();
  }

  getTimeFilter() {
    return this.timeFilter;
  }

  setTimeFilter(type, value) {
    this.timeFilter.type = type;
    this.timeFilter.value = value;
    
    if (type === 'month') {
      this.activeMonitorMonth = parseInt(value);
    } else if (type === 'day' && value) {
      const parts = value.split('-');
      if (parts[1]) {
        this.activeMonitorMonth = parseInt(parts[1]);
      }
    } else if (type === 'week' && value) {
      // Dùng hàm dùng chung từ Utils thay vì lặp lại logic tuần → tháng
      this.activeMonitorMonth = Utils.weekToMonth(value);
    } else if (type === 'quarter') {
      const q = parseInt(value);
      if (q === 1) this.activeMonitorMonth = 3;
      else if (q === 2) this.activeMonitorMonth = 6;
      else if (q === 3) this.activeMonitorMonth = 7;
      else this.activeMonitorMonth = 6;
    } else if (type === 'range' && value && value.endDate) {
      const parts = value.endDate.split('-');
      if (parts[1]) {
        this.activeMonitorMonth = parseInt(parts[1]);
      }
    } else if (type === 'year') {
      this.activeMonitorMonth = 6;
    } else {
      this.activeMonitorMonth = 6;
    }
  }

  clearTimeFilter() {
    this.timeFilter = {
      type: 'none',
      value: null,
      year: 2026
    };
    this.activeMonitorMonth = 6;
  }

  getActiveMonitorMonth() {
    return this.activeMonitorMonth || 6;
  }

  setActiveMonitorMonth(month) {
    this.activeMonitorMonth = parseInt(month);
  }

  // Lấy data tồn kho theo mã kho (đã lọc và scale theo thời gian)
  getWarehouseSummaryDataFiltered(warehouseId, filter) {
    let m = 6;
    if (filter && filter.type === 'month') {
      m = parseInt(filter.value);
    } else if (filter && filter.type === 'quarter') {
      m = filter.value === 1 ? 3 : 6;
    } else if (filter && filter.type === 'week') {
      m = Math.min(6, Math.ceil(filter.value / 4.35)) || 1;
    } else if (filter && filter.type === 'day') {
      m = parseInt(filter.value.split('-')[1]) || 6;
    } else if (filter && filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
      m = parseInt(filter.value.endDate.split('-')[1]) || 6;
    } else {
      m = this.activeMonitorMonth || 6;
    }

    m = Math.min(7, Math.max(1, m)); // giới hạn tháng trong khoảng [1, 7] để tránh lỗi

    const byMonth = this.data.production.warehouseSummaryByMonth;
    if (byMonth && byMonth[m]) {
      return byMonth[m][warehouseId] || [];
    }

    // fallback về kho mặc định nếu không tìm thấy
    return this.data.production.warehouseSummary[warehouseId] || [];
  }

  // Lấy danh sách nhà máy cho tháng cụ thể (1-7)
  getFactoriesForMonth(month) {
    const m = parseInt(month) || 6;
    const byMonth = this.data.production.monitor.factoriesByMonth;
    if (byMonth && byMonth[m]) return byMonth[m];
    // fallback về danh sách nhà máy mặc định
    return this.data.production.monitor.factories;
  }

  getActive12MMetric() {
    return this.active12MMetric;
  }

  setActive12MMetric(metric) {
    this.active12MMetric = metric;
  }

  getActiveMonitorFactory() {
    return this.activeMonitorFactory;
  }

  setActiveMonitorFactory(factoryId) {
    this.activeMonitorFactory = factoryId;
  }

  getActiveMonitorTab() {
    return this.activeMonitorTab;
  }

  setActiveMonitorTab(tabId) {
    this.activeMonitorTab = tabId;
  }

  initStates() {
    // Khởi tạo trạng thái thu gọn dòng trong Bảng Cân đối kế toán
    const balanceData = this.data.finance.balance.balanceTable || [];
    this.balanceTableState = balanceData.map(row => {
      let collapsed = false;
      if (row.isParent) {
        if (row.id === 'von_chu_so_huu' || row.level >= 2) {
          collapsed = true;
        }
      }
      return { ...row, collapsed };
    });

    // Mới đầu vào thì cho các nhóm tồn kho thu gọn hết
    const prodInventory = this.data.production.monitor.inventorySummary.ton || [];
    prodInventory.forEach(g => {
      this.collapsedBusinessGroups.add(g.group);
      this.collapsedProductionGroups.add(g.group);
    });
  }

  // Lấy trang đang active
  getActivePage() {
    return this.activePage;
  }

  // Đặt trang active
  setActivePage(pageId) {
    this.activePage = pageId;
  }

  // Lấy tab kho đang active bên Sản xuất
  getActiveWarehouseTab() {
    return this.activeWarehouseTab;
  }

  // Đặt tab kho đang active bên Sản xuất
  setActiveWarehouseTab(tabId) {
    this.activeWarehouseTab = tabId;
  }

  // Lấy tab nhỏ tồn kho đang active bên Kinh doanh
  getActiveBusinessInventoryTab() {
    return this.activeBusinessInventoryTab;
  }

  // Đặt tab nhỏ tồn kho đang active bên Kinh doanh
  setActiveBusinessInventoryTab(tabId) {
    this.activeBusinessInventoryTab = tabId;
  }

  // Lấy kiểu hiển thị xu hướng kinh doanh (chart hay table)
  getBusinessTrendView() {
    return this.businessTrendView;
  }

  // Đặt kiểu hiển thị xu hướng kinh doanh
  setBusinessTrendView(viewType) {
    this.businessTrendView = viewType;
  }

  // Lấy dữ liệu dòng của Bảng Cân đối kế toán
  getBalanceTableData() {
    return this.balanceTableState;
  }

  // Đóng/mở rộng dòng cụ thể trong Bảng Cân đối kế toán
  toggleBalanceRow(rowId) {
    const row = this.balanceTableState.find(r => r.id === rowId);
    if (row && row.isParent) {
      row.collapsed = !row.collapsed;
    }
  }

  getCollapsedBusinessGroups() {
    return this.collapsedBusinessGroups;
  }

  // Đóng/mở rộng nhóm tồn kho bên Kinh doanh
  toggleBusinessGroup(groupName) {
    if (this.collapsedBusinessGroups.has(groupName)) {
      this.collapsedBusinessGroups.delete(groupName);
    } else {
      this.collapsedBusinessGroups.add(groupName);
    }
  }

  // Lấy danh sách các nhóm tồn kho đang thu gọn bên Sản xuất
  getCollapsedProductionGroups() {
    return this.collapsedProductionGroups;
  }

  // Đóng/mở rộng nhóm tồn kho bên Sản xuất
  toggleProductionGroup(groupName) {
    if (this.collapsedProductionGroups.has(groupName)) {
      this.collapsedProductionGroups.delete(groupName);
    } else {
      this.collapsedProductionGroups.add(groupName);
    }
  }

  // Lấy dữ liệu tồn kho thành phẩm theo tháng từ CSV
  getInventoryDataForType(type, filter) {
    let m = 6;
    if (filter && filter.type === 'month') {
      m = parseInt(filter.value);
    } else if (filter && filter.type === 'quarter') {
      m = filter.value === 1 ? 3 : 6;
    } else if (filter && filter.type === 'week') {
      m = Math.min(6, Math.ceil(filter.value / 4.35)) || 1;
    } else if (filter && filter.type === 'day') {
      m = parseInt(filter.value.split('-')[1]) || 6;
    } else if (filter && filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
      m = parseInt(filter.value.endDate.split('-')[1]) || 6;
    } else {
      m = this.activeMonitorMonth || 6;
    }

    m = Math.min(7, Math.max(1, m)); // giới hạn tháng từ 1 đến 7

    const byMonth = this.data.business.inventorySummaryByMonth;
    if (byMonth && byMonth[m] && byMonth[m][type]) {
      return byMonth[m][type];
    }

    // fallback đề phòng mất dữ liệu
    const ton = this.data.production.monitor.inventorySummary.ton;
    return ton;
  }
}
