import { Utils } from './utils.js?v=42';

export class DashboardController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  init() {
    // 1. Gắn các sự kiện từ View
    this.view.bindPageChange(this.handlePageChange.bind(this));
    this.view.bindInventoryTabChange(this.handleInventoryTabChange.bind(this));
    this.view.bindBusinessInventoryTabChange(this.handleBusinessInventoryTabChange.bind(this));
    this.view.bindBizTrendToggle(this.handleBizTrendToggle.bind(this));
    this.view.bindBusinessGroupToggle(this.handleBusinessGroupToggle.bind(this));
    this.view.bindProductionGroupToggle(this.handleProductionGroupToggle.bind(this));
    this.view.bindBalanceRowToggle(this.handleBalanceRowToggle.bind(this));
    this.view.bindProdMonitorTabChange(this.handleProdMonitorTabChange.bind(this));
    this.view.bindProd12MMetricChange(this.handleProd12MMetricChange.bind(this));
    this.view.bindProdMonitorFactoryChange(this.handleProdMonitorFactoryChange.bind(this));
    this.view.bindProdMonitorMonthChange(this.handleProdMonitorMonthChange.bind(this));

    // Gắn sự kiện bộ lọc thời gian toàn cục
    this.view.bindGlobalTimeFilter(
      this.handleGlobalFilterTypeChange.bind(this),
      this.handleGlobalFilterValueChange.bind(this),
      this.handleGlobalFilterClear.bind(this)
    );

    // 2. Hiển thị trang mặc định (Sản xuất)
    this.renderCurrentPageState();
  }

  // Chuyển trang
  handlePageChange(pageId) {
    this.model.setActivePage(pageId);
    this.view.showPage(pageId);
    this.renderCurrentPageState();
  }

  renderCurrentPageState() {
    const activePage = this.model.getActivePage();
    if (activePage === 'production') {
      this.renderProductionPage();
    } else if (activePage === 'business') {
      this.renderBusinessPage();
    } else if (activePage === 'finance') {
      this.renderFinancePage();
    }
  }

  // Render trang Sản xuất
  renderProductionPage() {
    const filter = this.model.getTimeFilter();
    const prodKPIs = this.generateProductionKPIs(filter);
    const activeMonitorMonth = this.model.getActiveMonitorMonth();
    const factories = this.model.getFactoriesForMonth(activeMonitorMonth);
    const activeWarehouseTab = this.model.getActiveWarehouseTab();
    
    // Lấy dữ liệu tồn kho nguyên vật liệu đã lọc và scale theo thời gian
    const inventoryData = this.model.getWarehouseSummaryDataFiltered(activeWarehouseTab, filter);
    
    const activeMonitorTab = this.model.getActiveMonitorTab();
    const statusTimeHistory = this.model.data.production.monitor.statusTimeHistory;
    const activeMonitorFactory = this.model.getActiveMonitorFactory();
    const monthlyPlans = this.model.data.monthlyPlans;
    const active12MMetric = this.model.getActive12MMetric();
    const monthsLabels = this.model.data.months;

    this.view.renderProductionKPIs(prodKPIs);
    this.view.renderProductionInventoryTable(inventoryData, activeWarehouseTab);
    this.view.renderFactoryMonitoring(factories, activeMonitorTab, statusTimeHistory, activeMonitorFactory, activeMonitorMonth, filter);
    this.view.renderProduction12MPerformanceChart(monthlyPlans, active12MMetric, monthsLabels, filter);
    
    // Scale dữ liệu tổng hợp kho cho biểu đồ tròn
    const scaledSummary = {};
    Object.keys(this.model.data.production.warehouseSummary).forEach(whId => {
      scaledSummary[whId] = this.model.getWarehouseSummaryDataFiltered(whId, filter);
    });
    this.view.renderWarehouseInventoryPieChart(scaledSummary);

    // Cập nhật tiêu đề động theo bộ lọc thời gian
    this.view.updatePeriodLabels(filter);
  }

  handleProd12MMetricChange(metric) {
    this.model.setActive12MMetric(metric);
    this.renderProductionPage();
  }

  handleProdMonitorTabChange(tabId) {
    this.model.setActiveMonitorTab(tabId);
    this.renderProductionPage();
  }

  handleProdMonitorFactoryChange(factoryId) {
    this.model.setActiveMonitorFactory(factoryId);
    this.renderProductionPage();
  }

  handleProdMonitorMonthChange(month) {
    this.model.setActiveMonitorMonth(month);
    this.renderProductionPage();
  }

  handleInventoryTabChange(tabId) {
    this.model.setActiveWarehouseTab(tabId);
    const filter = this.model.getTimeFilter();
    const inventoryData = this.model.getWarehouseSummaryDataFiltered(tabId, filter);
    this.view.renderProductionInventoryTable(inventoryData, tabId);
  }

  handleProductionGroupToggle(groupName) {
    // No-op: warehouse summary table is a flat list and does not support group toggling
  }

  // Render trang Kinh doanh
  renderBusinessPage() {
    const filter = this.model.getTimeFilter();

    // 1. Vẽ bảng tồn kho thành phẩm
    const activeTab = this.model.getActiveBusinessInventoryTab();
    const rawInventoryData = this.model.getInventoryDataForType(activeTab, filter);
    const inventoryData = this.scaleBusinessInventoryData(rawInventoryData, filter);
    const collapsedGroups = this.model.getCollapsedBusinessGroups();
    this.view.renderBusinessInventoryTable(inventoryData, activeTab, collapsedGroups);

    // 2. Vẽ bảng xu hướng hoạt động kinh doanh
    const trendObj = this.model.data.business.revenueOverTime;
    const labels = trendObj.labels || ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const dataRevenue = trendObj.revenue;
    const dataNet = trendObj.netProfit;
    const dataGross = trendObj.grossProfit;
    const dataGrossMargin = trendObj.grossMargin;
    const dataNetMargin = trendObj.netMargin;

    this.view.renderBizTrendTable(labels, dataRevenue, dataGross, dataNet, dataGrossMargin, dataNetMargin);

    // 3. Cập nhật hiển thị (Bảng hay Biểu đồ)
    const viewType = this.model.getBusinessTrendView();
    this.view.toggleBizTrendView(viewType);

    // 4. Vẽ các biểu đồ trang Kinh doanh
    const trendData = {
      revenue: dataRevenue,
      gross: dataGross,
      net: dataNet,
      grossMargin: dataGrossMargin,
      netMargin: dataNetMargin
    };

    const turnoverData = this.scaleTurnoverData(this.model.data.business.topTurnoverItems, filter);
    const productsSalesData = this.scaleSalesData(this.model.data.business.topProductsSales, filter);
    const customersSalesData = this.scaleSalesData(this.model.data.business.topCustomersSales, filter);
    const suppliersData = this.scaleSuppliersData(this.model.data.business.topSuppliers, filter);

    this.view.renderBusinessCharts(trendData, turnoverData, productsSalesData, customersSalesData, suppliersData, filter);

    // Cập nhật tiêu đề động
    this.view.updatePeriodLabels(filter);
  }

  handleBizTrendToggle(viewType) {
    this.model.setBusinessTrendView(viewType);
    this.view.toggleBizTrendView(viewType);
  }

  handleBusinessGroupToggle(groupName) {
    this.model.toggleBusinessGroup(groupName);
    const filter = this.model.getTimeFilter();
    const activeTab = this.model.getActiveBusinessInventoryTab();
    const rawInventoryData = this.model.getInventoryDataForType(activeTab, filter);
    const inventoryData = this.scaleBusinessInventoryData(rawInventoryData, filter);
    const collapsedGroups = this.model.getCollapsedBusinessGroups();
    this.view.renderBusinessInventoryTable(inventoryData, activeTab, collapsedGroups);
  }

  handleBusinessInventoryTabChange(tabId) {
    this.model.setActiveBusinessInventoryTab(tabId);
    const filter = this.model.getTimeFilter();
    const rawInventoryData = this.model.getInventoryDataForType(tabId, filter);
    const inventoryData = this.scaleBusinessInventoryData(rawInventoryData, filter);
    const collapsedGroups = this.model.getCollapsedBusinessGroups();
    this.view.renderBusinessInventoryTable(inventoryData, tabId, collapsedGroups);
  }

  // Render trang Kế toán
  renderFinancePage() {
    const filter = this.model.getTimeFilter();
    const plKPIs = this.model.data.finance.pl.kpis;
    const plData = this.calculateDynamicFinanceData(filter);
    const balanceData = this.calculateDynamicBalanceData(filter);

    this.view.renderPLTable(plData);
    this.view.renderBalanceTable(balanceData);

    // Cập nhật nhãn động
    this.view.updatePeriodLabels(filter);
  }

  handleBalanceRowToggle(rowId) {
    this.model.toggleBalanceRow(rowId);
    const filter = this.model.getTimeFilter();
    const balanceData = this.calculateDynamicBalanceData(filter);
    this.view.renderBalanceTable(balanceData);
  }

  // Xử lý bộ lọc thời gian toàn cục
  handleGlobalFilterTypeChange(type, value) {
    this.model.setTimeFilter(type, value);
    this.renderCurrentPageState();
  }

  handleGlobalFilterValueChange(type, value) {
    this.model.setTimeFilter(type, value);
    this.renderCurrentPageState();
  }

  handleGlobalFilterClear() {
    this.model.clearTimeFilter();
    this.renderCurrentPageState();
  }

  generateProductionKPIs(filter) {
    let targetMonth = 6;
    let periodText = 'tháng 06/2026';
    let plansToSum = [];

    const getMonthOverlaps = (startDateStr, endDateStr) => {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const overlaps = {};
      const daysInMonth = {1:31, 2:28, 3:31, 4:30, 5:31, 6:30, 7:31, 8:31, 9:30, 10:31, 11:30, 12:31};
      for (let m = 1; m <= 12; m++) {
        const monthStart = new Date(`2026-${String(m).padStart(2, '0')}-01`);
        const monthEnd = new Date(2026, m - 1, daysInMonth[m]);
        const overlapStart = new Date(Math.max(start, monthStart));
        const overlapEnd = new Date(Math.min(end, monthEnd));
        if (overlapStart <= overlapEnd) {
          const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
          overlaps[m] = overlapDays / daysInMonth[m];
        }
      }
      return overlaps;
    };

    if (filter && filter.type !== 'none') {
      if (filter.type === 'month') {
        targetMonth = parseInt(filter.value);
        periodText = `tháng ${String(targetMonth).padStart(2, '0')}/2026`;
        plansToSum = this.model.data.monthlyPlans.filter(p => p.Month === targetMonth);
      } else if (filter.type === 'quarter') {
        const q = parseInt(filter.value);
        periodText = `Quý ${q === 1 ? 'I' : q === 2 ? 'II' : q === 3 ? 'III' : 'IV'}/2026`;
        plansToSum = this.model.data.monthlyPlans.filter(p => {
          if (q === 1) return p.Month >= 1 && p.Month <= 3;
          if (q === 2) return p.Month >= 4 && p.Month <= 6;
          if (q === 3) return p.Month >= 7 && p.Month <= 9;
          return false;
        });
      } else if (filter.type === 'week') {
        const w = parseInt(filter.value);
        periodText = `Tuần ${w}/2026`;
        // Dùng hàm dùng chung từ Utils thay vì lặp lại logic tuần → tháng
        let m = Utils.weekToMonth(w);
        const basePlan = this.model.data.monthlyPlans.find(p => p.Month === m) || {};
        plansToSum = [{
          Plan_Orders: Math.round((basePlan.Plan_Orders || 500) / 4.2),
          Actual_Orders: basePlan.Actual_Orders !== null ? Math.round((basePlan.Actual_Orders || 450) / 4.2) : null,
          Plan_Value: Math.round((basePlan.Plan_Value || 2000000) / 4.2),
          Actual_Value: basePlan.Actual_Value !== null ? Math.round((basePlan.Actual_Value || 1800000) / 4.2) : null,
          Plan_Volume: Math.round((basePlan.Plan_Volume || 900) / 4.2),
          Actual_Volume: basePlan.Actual_Volume !== null ? Math.round((basePlan.Actual_Volume || 850) / 4.2) : null,
        }];
      } else if (filter.type === 'day') {
        const parts = filter.value.split('-');
        const dStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        periodText = `ngày ${dStr}`;
        
        const dayRecord = this.model.data.production.monitor.statusTimeHistory.find(h => h.date === filter.value);
        const dayTotal = dayRecord ? dayRecord.overview.total : 15;
        const dayCompleted = dayRecord ? dayRecord.overview.completed : 12;
        
        plansToSum = [{
          Plan_Orders: dayTotal,
          Actual_Orders: dayCompleted,
          Plan_Value: dayTotal * 15000,
          Actual_Value: dayCompleted * 15000,
          Plan_Volume: dayTotal * 1.8,
          Actual_Volume: dayCompleted * 1.8,
        }];
      } else if (filter.type === 'range') {
        const startParts = filter.value.startDate.split('-');
        const endParts = filter.value.endDate.split('-');
        const startStr = `${startParts[2]}/${startParts[1]}/${startParts[0]}`;
        const endStr = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;
        periodText = `từ ngày ${startStr} đến ngày ${endStr}`;
        
        const overlaps = getMonthOverlaps(filter.value.startDate, filter.value.endDate);
        const aggregated = { Plan_Orders: 0, Actual_Orders: 0, Plan_Value: 0, Actual_Value: 0, Plan_Volume: 0, Actual_Volume: 0 };
        let hasActual = false;
        
        Object.keys(overlaps).forEach(mKey => {
          const m = parseInt(mKey);
          const fraction = overlaps[m];
          const basePlan = this.model.data.monthlyPlans.find(p => p.Month === m);
          if (basePlan) {
            aggregated.Plan_Orders += (basePlan.Plan_Orders || 0) * fraction;
            aggregated.Plan_Value += (basePlan.Plan_Value || 0) * fraction;
            aggregated.Plan_Volume += (basePlan.Plan_Volume || 0) * fraction;
            if (basePlan.Actual_Orders !== null && basePlan.Actual_Orders !== undefined) {
              aggregated.Actual_Orders += basePlan.Actual_Orders * fraction;
              aggregated.Actual_Value += (basePlan.Actual_Value || 0) * fraction;
              aggregated.Actual_Volume += (basePlan.Actual_Volume || 0) * fraction;
              hasActual = true;
            }
          }
        });
        
        plansToSum = [{
          Plan_Orders: Math.round(aggregated.Plan_Orders),
          Actual_Orders: hasActual ? Math.round(aggregated.Actual_Orders) : null,
          Plan_Value: Math.round(aggregated.Plan_Value),
          Actual_Value: hasActual ? Math.round(aggregated.Actual_Value) : null,
          Plan_Volume: parseFloat(aggregated.Plan_Volume.toFixed(1)),
          Actual_Volume: hasActual ? parseFloat(aggregated.Actual_Volume.toFixed(1)) : null,
        }];
      } else if (filter.type === 'year') {
        periodText = `Năm ${filter.value}`;
        plansToSum = this.model.data.monthlyPlans;
      }
    } else {
      plansToSum = this.model.data.monthlyPlans.filter(p => p.Month === 6);
    }

    let planOrders = 0, actualOrders = 0;
    let planValue = 0, actualValue = 0;
    let planVolume = 0, actualVolume = 0;
    let hasActual = false;

    plansToSum.forEach(p => {
      planOrders += p.Plan_Orders || 0;
      planValue += p.Plan_Value || 0;
      planVolume += p.Plan_Volume || 0;
      
      if (p.Actual_Orders !== null && p.Actual_Orders !== undefined) {
        actualOrders += p.Actual_Orders;
        actualValue += p.Actual_Value || 0;
        actualVolume += p.Actual_Volume || 0;
        hasActual = true;
      }
    });

    const pct = (a, b) => {
      return b ? `${(a / b * 100).toFixed(1)}%` : '0.0%';
    };

    return [
      {
        label: `Kế hoạch lệnh sản xuất đang triển khai ${periodText}`,
        icon: "plan", "type": "triple",
        m1Label: "Số lượng lệnh",          "m1Value": Utils.formatNumber(planOrders),  "m1Unit": "lệnh",
        m2Label: "Tổng giá trị sản xuất",  "m2Value": Utils.formatNumber(planValue),   "m2Unit": "$",
        m3Label: "Khối lượng yêu cầu",     "m3Value": Utils.formatNumber(planVolume, 1),  "m3Unit": "m³",
      },
      {
        label: `Kết quả thực hiện lệnh sản xuất hoàn thành ${periodText}`,
        icon: "production", "type": "triple",
        m1Label: "Số lệnh Hoàn thành",    "m1Value": Utils.formatNumber(hasActual ? actualOrders : 0), "m1Unit": "lệnh",
        m1Percent: hasActual ? pct(actualOrders, planOrders) : '0.0%',
        m2Label: "Tổng giá trị sản xuất", "m2Value": Utils.formatNumber(hasActual ? actualValue : 0),  "m2Unit": "$",
        m2Percent: hasActual ? pct(actualValue, planValue) : '0.0%',
        m3Label: "Khối lượng thực hiện",  "m3Value": Utils.formatNumber(hasActual ? actualVolume : 0, 1), "m3Unit": "m³",
        m3Percent: hasActual ? pct(actualVolume, planVolume) : '0.0%',
      }
    ];
  }

  // Trả về hệ số tỷ lệ xấp xỉ để scale dữ liệu kinh doanh theo bộ lọc thời gian.
  // Đây là công thức ước lượng tuyến tính, không tính từ dữ liệu thực tế.
  // Hệ số 1.0 tương ương với một tháng (chuẩn).
  getFilterScaleFactor(filter) {
    if (!filter || filter.type === 'none') return 1.0;
    if (filter.type === 'month') {
      // Táng dần theo tháng: T1 ≈ 0.67, T6 ≈ 1.02, T12 ≈ 1.44
      // Phản ánh xu hướng mùa vụ tăng dần trong năm
      return 0.6 + (parseInt(filter.value) * 0.07);
    } else if (filter.type === 'quarter') {
      // Q1 ≈ 1.9, Q2 ≈ 2.3, Q3 ≈ 2.7, Q4 ≈ 3.1 (xấp xỉ tổng 3 tháng)
      return 1.5 + (parseInt(filter.value) * 0.4);
    } else if (filter.type === 'week') {
      // Mỗi tuần ≈ 1/4.3 tháng; tăng nhẹ theo số tuần do xu hướng mùa vụ
      return 0.22 + (parseInt(filter.value) * 0.01);
    } else if (filter.type === 'day') {
      // Mỗi ngày ≈ 1/30 tháng; ngày cuối tháng thường có sản lượng cao hơn ngày đầu
      const dayNum = parseInt(filter.value.split('-')[2]) || 15;
      return 0.03 + (dayNum * 0.002);
    } else if (filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
      // Tỷ lệ chính xác: số ngày trong khoảng / 30 ngày chuẩn một tháng
      const diffTime = Math.abs(new Date(filter.value.endDate) - new Date(filter.value.startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays / 30;
    } else if (filter.type === 'year') {
      // Cả năm = 12 tháng
      return 12.0;
    }
    return 1.0;
  }

  scaleBusinessInventoryData(data, filter) {
    return data;
  }

  scaleTurnoverData(data, filter) {
    if (!filter || filter.type === 'none') return data;
    const factor = this.getFilterScaleFactor(filter);
    return (data || []).map(item => ({
      ...item,
      days: Math.round(item.days * factor) || 1
    }));
  }

  scaleSalesData(data, filter) {
    if (!filter || filter.type === 'none') return data;
    const factor = this.getFilterScaleFactor(filter);
    return (data || []).map(item => ({
      ...item,
      sales: Math.round(item.sales * factor)
    }));
  }

  scaleSuppliersData(data, filter) {
    if (!filter || filter.type === 'none') return data;
    const factor = this.getFilterScaleFactor(filter);
    return (data || []).map(item => ({
      ...item,
      value: Math.round(item.value * factor)
    }));
  }

  scaleFinanceData(data, filter) {
    if (!filter || filter.type === 'none') return data;
    const factor = this.getFilterScaleFactor(filter);
    
    return data.map(r => ({
      ...r,
      current: Math.round(r.current * factor),
      prior: Math.round(r.prior * factor)
    }));
  }

  calculateDynamicFinanceData(filter) {
    const plTableTemplate = this.model.data.finance.pl.plTable;
    const monthlyPl = this.model.data.finance.pl.monthlyPl;
    
    if (!filter || filter.type === 'none' || filter.type === 'year') {
      return plTableTemplate;
    }
    
    let currentMonths = [];
    let priorMonths = [];
    
    if (filter.type === 'month') {
      const m = parseInt(filter.value);
      currentMonths = [m];
      priorMonths = m > 1 ? [m - 1] : [];
    } else if (filter.type === 'quarter') {
      const q = parseInt(filter.value);
      if (q === 1) {
        currentMonths = [1, 2, 3];
        priorMonths = [];
      } else if (q === 2) {
        currentMonths = [4, 5, 6];
        priorMonths = [1, 2, 3];
      } else if (q === 3) {
        currentMonths = [7, 8, 9];
        priorMonths = [4, 5, 6];
      } else if (q === 4) {
        currentMonths = [10, 11, 12];
        priorMonths = [7, 8, 9];
      }
    } else if (filter.type === 'week') {
      const w = parseInt(filter.value);
      // Dùng hàm dùng chung từ Utils thay vì lặp lại logic tuần → tháng
      let m = Utils.weekToMonth(w);
      currentMonths = [m];
      priorMonths = m > 1 ? [m - 1] : [];
    } else if (filter.type === 'day') {
      const m = parseInt(filter.value.split('-')[1]) || 6;
      currentMonths = [m];
      priorMonths = m > 1 ? [m - 1] : [];
    } else if (filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
      const mStart = parseInt(filter.value.startDate.split('-')[1]) || 1;
      const mEnd = parseInt(filter.value.endDate.split('-')[1]) || 6;
      currentMonths = [];
      for (let m = mStart; m <= mEnd; m++) {
        currentMonths.push(m);
      }
      priorMonths = [];
    }
    
    const sumMetrics = (months) => {
      let revenue = 0;
      let cogs = 0;
      let gross_profit = 0;
      let fin_rev = 0;
      let fin_exp = 0;
      let interest_exp = 0;
      let sell_expense = 0;
      let sgna_expense = 0;
      let operating_profit = 0;
      let tax = 0;
      let net_profit = 0;
      
      months.forEach(m => {
        const dataM = monthlyPl && monthlyPl[m];
        if (dataM) {
          revenue += dataM.revenue || 0;
          cogs += dataM.cogs || 0;
          gross_profit += dataM.gross_profit || 0;
          fin_rev += dataM.fin_rev || 0;
          fin_exp += dataM.fin_exp || 0;
          interest_exp += dataM.interest_exp || 0;
          sell_expense += dataM.sell_expense || 0;
          sgna_expense += dataM.sgna_expense || 0;
          operating_profit += dataM.operating_profit || 0;
          tax += dataM.tax || 0;
          net_profit += dataM.net_profit || 0;
        }
      });
      
      return { revenue, cogs, gross_profit, fin_rev, fin_exp, interest_exp, sell_expense, sgna_expense, operating_profit, tax, net_profit };
    };
    
    const curVal = sumMetrics(currentMonths);
    const priVal = sumMetrics(priorMonths);
    
    const hasPriorMonths = priorMonths.length > 0;
    // Giá trị kỳ trước ước tính khi không có dữ liệu thực tế:
    // các hệ số (0.91–0.95) phản ánh tốc độ tăng trưởng giả định ~5–10% so khoảng trước
    // (dương = kỳ trước thấp hơn kỳ này, tức doanh nghiệp đang tăng trưởng)
    const getPriorVal = (cur, pri, ratio = 0.94) => {
      return hasPriorMonths ? pri : Math.round(cur * ratio);
    };
    
    const mappedTable = plTableTemplate.map(item => {
      let current = 0;
      let prior = 0;
      let isEPS = item.isEPS || false;
      
      const name = item.name;
      if (name === "Doanh thu bán hàng và cung cấp dịch vụ") {
        current = curVal.revenue;
        prior = getPriorVal(curVal.revenue, priVal.revenue, 0.94);
      } else if (name === "Các khoản giảm trừ doanh thu") {
        current = 0;
        prior = 0;
      } else if (name === "Doanh thu thuần về bán hàng và cung cấp dịch vụ") {
        current = curVal.revenue;
        prior = getPriorVal(curVal.revenue, priVal.revenue, 0.94);
      } else if (name === "Giá vốn hàng bán") {
        current = curVal.cogs;
        prior = getPriorVal(curVal.cogs, priVal.cogs, 0.95);
      } else if (name === "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ") {
        current = curVal.gross_profit;
        prior = getPriorVal(curVal.gross_profit, priVal.gross_profit, 0.93);
      } else if (name === "Doanh thu hoạt động tài chính") {
        current = curVal.fin_rev;
        prior = getPriorVal(curVal.fin_rev, priVal.fin_rev, 0.93);
      } else if (name === "Chi phí tài chính") {
        current = curVal.fin_exp;
        prior = getPriorVal(curVal.fin_exp, priVal.fin_exp, 0.94);
      } else if (name === "- Trong đó: Chi phí lãi vay") {
        current = curVal.interest_exp;
        prior = getPriorVal(curVal.interest_exp, priVal.interest_exp, 0.94);
      } else if (name === "Chi phí bán hàng") {
        current = curVal.sell_expense;
        prior = getPriorVal(curVal.sell_expense, priVal.sell_expense, 0.94);
      } else if (name === "Chi phí quản lý doanh nghiệp") {
        current = curVal.sgna_expense;
        prior = getPriorVal(curVal.sgna_expense, priVal.sgna_expense, 0.95);
      } else if (name === "Lợi nhuận thuần từ hoạt động kinh doanh") {
        current = curVal.operating_profit;
        prior = getPriorVal(curVal.operating_profit, priVal.operating_profit, 0.92);
      } else if (name === "Thu nhập khác") {
        current = 0;
        prior = 0;
      } else if (name === "Chi phí khác") {
        current = 0;
        prior = 0;
      } else if (name === "Lợi nhuận khác") {
        current = 0;
        prior = 0;
      } else if (name === "Tổng lợi nhuận kế toán trước thuế") {
        current = curVal.operating_profit;
        prior = getPriorVal(curVal.operating_profit, priVal.operating_profit, 0.92);
      } else if (name === "Chi phí thuế thu nhập doanh nghiệp hiện hành") {
        current = curVal.tax;
        prior = getPriorVal(curVal.tax, priVal.tax, 0.95);
      } else if (name === "Chi phí thuế thu nhập doanh nghiệp hoãn lại") {
        current = 0;
        prior = 0;
      } else if (name === "Lợi nhuận sau thuế thu nhập doanh nghiệp") {
        current = curVal.net_profit;
        prior = getPriorVal(curVal.net_profit, priVal.net_profit, 0.91);
      } else if (name === "Lãi cơ bản trên cổ phiếu") {
        current = curVal.net_profit / 1000000.0;
        prior = getPriorVal(curVal.net_profit / 1000000.0, priVal.net_profit / 1000000.0, 0.91);
      }
      
      return {
        ...item,
        current: isEPS ? current : Math.round(current),
        prior: isEPS ? prior : Math.round(prior)
      };
    });
    
    return mappedTable;
  }

  calculateDynamicBalanceData(filter) {
    const balanceState = this.model.getBalanceTableData();
    const monthlyBalance = this.model.data.finance.balance.monthlyBalance;
    
    let targetMonth = 6;
    let priorMonth = 5;
    
    if (filter && filter.type !== 'none') {
      if (filter.type === 'month') {
        targetMonth = parseInt(filter.value);
        priorMonth = targetMonth > 1 ? targetMonth - 1 : 12;
      } else if (filter.type === 'quarter') {
        const q = parseInt(filter.value);
        if (q === 1) { targetMonth = 3; priorMonth = 12; }
        else if (q === 2) { targetMonth = 6; priorMonth = 3; }
        else if (q === 3) { targetMonth = 9; priorMonth = 6; }
        else if (q === 4) { targetMonth = 12; priorMonth = 9; }
      } else if (filter.type === 'week') {
        targetMonth = Utils.weekToMonth(parseInt(filter.value));
        priorMonth = targetMonth > 1 ? targetMonth - 1 : 12;
      } else if (filter.type === 'day') {
        targetMonth = parseInt(filter.value.split('-')[1]) || 6;
        priorMonth = targetMonth > 1 ? targetMonth - 1 : 12;
      } else if (filter.type === 'range' && filter.value.endDate) {
        targetMonth = parseInt(filter.value.endDate.split('-')[1]) || 6;
        priorMonth = targetMonth > 1 ? targetMonth - 1 : 12;
      }
    }
    
    const targetMonthStr = `2026-${String(targetMonth).padStart(2, '0')}`;
    const priorMonthStr = `2026-${String(priorMonth).padStart(2, '0')}`;

    const curBalances = monthlyBalance && monthlyBalance[targetMonthStr];
    const priBalances = monthlyBalance && monthlyBalance[priorMonthStr];
    
    const mapped = balanceState.map(row => {
      let current = curBalances ? (curBalances[row.id] || 0.0) : row.current;
      let prior = priBalances ? (priBalances[row.id] || 0.0) : row.prior;
      
      if (filter && filter.type === 'month' && parseInt(filter.value) === 1) {
        prior = current * 0.95;
      } else if (filter && filter.type === 'quarter' && parseInt(filter.value) === 1) {
        prior = current * 0.95;
      } else if (!priBalances) {
        prior = current * 0.95;
      }
      
      return {
        ...row,
        current: Math.round(current),
        prior: Math.round(prior)
      };
    });
    
    return mapped;
  }
}
