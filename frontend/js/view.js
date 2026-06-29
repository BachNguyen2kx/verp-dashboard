import { Utils } from './utils.js?v=42';

const CHART_COLORS = {
  primary: '#6B4F3A',
  secondary: '#A67C52',
  accent: '#C6923D',
  success: '#5E7C4F',
  danger: '#B8543D',
  info: '#4A7C8F',
  tertiary: '#C49B6F',
  muted: '#D8CFC4'
};

const woodGradientColors = [
  '#6B4F3A',
  '#775B46',
  '#836752',
  '#8F735E',
  '#9B7F6A',
  '#A78B76',
  '#B39782',
  '#BFA38E',
  '#CBAF9A',
  '#D9C0AB'
];

export class DashboardView {
  constructor() {
    this.chartInstances = {};
    this.initDOMRefs();
  }

  initDOMRefs() {
    this.pages = document.querySelectorAll('.page');
    this.navButtons = document.querySelectorAll('.topbar-nav-btn');
    this.topbarTitle = document.getElementById('topbar-title');
    this.topbarSubtitle = document.getElementById('topbar-subtitle');

    // Production refs
    this.productionKPIs = document.getElementById('production-kpis');
    this.productionInventoryTable = document.getElementById('production-inventory-summary-table');
    this.productionFactoryMonitor = document.getElementById('production-factory-monitor');
    this.inventoryTabButtons = document.querySelectorAll('#page-production .prod-wh-tab-btn');

    // Business refs
    this.businessInventoryTable = document.getElementById('business-inventory-table');
    this.businessTabButtons = document.querySelectorAll('#page-business .biz-inv-tab-btn');
    this.bizTrendTable = document.getElementById('business-biz-trend-table');
    this.bizTrendToggleButtons = document.querySelectorAll('.biz-trend-toggle-btn');
    this.viewBizTrendChart = document.getElementById('view-biz-trend-chart');
    this.viewBizTrendTable = document.getElementById('view-biz-trend-table');

    // Finance refs
    this.financePLTable = document.getElementById('finance-pl-table');
    this.financeBalanceTable = document.getElementById('finance-balance-table');
  }

  // Chuyển đổi giữa các trang
  showPage(pageId) {
    this.pages.forEach(p => p.classList.remove('active'));
    this.navButtons.forEach(btn => btn.classList.remove('active'));

    const activePage = document.getElementById(`page-${pageId}`);
    if (activePage) activePage.classList.add('active');

    const activeBtn = document.querySelector(`.topbar-nav-btn[data-page="${pageId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Cập nhật tiêu đề Topbar
    const titles = {
      production: { title: 'Sản xuất', subtitle: 'Theo dõi tiến độ sản xuất, năng suất và tồn kho' },
      business: { title: 'Kinh doanh', subtitle: 'Phân tích doanh số, khách hàng và hàng tồn kho thành phẩm' },
      finance: { title: 'Kế toán', subtitle: 'Báo cáo tài chính kế toán tổng hợp nội bộ' }
    };

    if (titles[pageId]) {
      this.topbarTitle.textContent = titles[pageId].title;
      this.topbarSubtitle.textContent = titles[pageId].subtitle;
    }
  }

  bindGlobalTimeFilter(onChangeType, onChangeValue, onClear) {
    const modeRangeBtn = document.getElementById('mode-range-btn');
    const modePeriodBtn = document.getElementById('mode-period-btn');
    const rangeContainer = document.getElementById('filter-range-inputs');
    const periodContainer = document.getElementById('filter-period-inputs');
    
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    const applyRangeBtn = document.getElementById('btn-apply-range');
    
    const periodRadios = document.getElementsByName('period-type');
    const periodDateInput = document.getElementById('filter-period-date');
    const periodMonthSelect = document.getElementById('filter-period-month');
    const periodQuarterSelect = document.getElementById('filter-period-quarter');
    const periodYearSelect = document.getElementById('filter-period-year');
    
    const clearBtn = document.getElementById('btn-clear-global-filter');

    if (!modeRangeBtn) return;

    let currentMode = 'range';
    let currentPeriodType = 'month';

    const setMode = (mode) => {
      currentMode = mode;
      if (mode === 'range') {
        modeRangeBtn.classList.add('active');
        modeRangeBtn.style.background = 'white';
        modeRangeBtn.style.color = 'var(--text)';
        
        modePeriodBtn.classList.remove('active');
        modePeriodBtn.style.background = 'transparent';
        modePeriodBtn.style.color = 'var(--text-secondary)';
        
        rangeContainer.style.display = 'flex';
        periodContainer.style.display = 'none';
        
        triggerRangeChange();
      } else {
        modePeriodBtn.classList.add('active');
        modePeriodBtn.style.background = 'white';
        modePeriodBtn.style.color = 'var(--text)';
        
        modeRangeBtn.classList.remove('active');
        modeRangeBtn.style.background = 'transparent';
        modeRangeBtn.style.color = 'var(--text-secondary)';
        
        rangeContainer.style.display = 'none';
        periodContainer.style.display = 'flex';
        
        triggerPeriodChange();
      }
      clearBtn.style.display = 'flex';
    };

    modeRangeBtn.addEventListener('click', () => setMode('range'));
    modePeriodBtn.addEventListener('click', () => setMode('period'));

    const triggerRangeChange = () => {
      const val = {
        startDate: startDateInput.value || '2026-06-01',
        endDate: endDateInput.value || '2026-06-17'
      };
      onChangeType('range', val);
    };
    applyRangeBtn.addEventListener('click', triggerRangeChange);

    const updatePeriodVisibility = (type) => {
      periodDateInput.style.display = type === 'day' ? 'block' : 'none';
      periodMonthSelect.style.display = type === 'month' ? 'block' : 'none';
      periodQuarterSelect.style.display = type === 'quarter' ? 'block' : 'none';
      periodYearSelect.style.display = type === 'year' ? 'block' : 'none';
    };

    const triggerPeriodChange = () => {
      let activeRadio = 'month';
      periodRadios.forEach(r => {
        if (r.checked) activeRadio = r.value;
      });
      currentPeriodType = activeRadio;
      updatePeriodVisibility(currentPeriodType);

      let val = null;
      if (currentPeriodType === 'day') {
        val = periodDateInput.value || '2026-06-15';
      } else if (currentPeriodType === 'month') {
        val = periodMonthSelect.value || '6';
      } else if (currentPeriodType === 'quarter') {
        val = periodQuarterSelect.value || '2';
      } else if (currentPeriodType === 'year') {
        val = periodYearSelect.value || '2026';
      }
      onChangeType(currentPeriodType, val);
    };

    periodRadios.forEach(r => {
      r.addEventListener('change', triggerPeriodChange);
    });

    periodDateInput.addEventListener('change', triggerPeriodChange);
    periodMonthSelect.addEventListener('change', triggerPeriodChange);
    periodQuarterSelect.addEventListener('change', triggerPeriodChange);
    periodYearSelect.addEventListener('change', triggerPeriodChange);

    clearBtn.addEventListener('click', () => {
      modeRangeBtn.classList.remove('active');
      modeRangeBtn.style.background = 'transparent';
      modeRangeBtn.style.color = 'var(--text-secondary)';
      modePeriodBtn.classList.add('active');
      modePeriodBtn.style.background = 'white';
      modePeriodBtn.style.color = 'var(--text)';
      
      rangeContainer.style.display = 'none';
      periodContainer.style.display = 'flex';
      
      startDateInput.value = '2026-06-01';
      endDateInput.value = '2026-06-17';
      
      periodRadios.forEach(r => {
        r.checked = r.value === 'month';
      });
      periodDateInput.value = '2026-06-15';
      periodMonthSelect.value = '6';
      periodQuarterSelect.value = '2';
      periodYearSelect.value = '2026';
      
      updatePeriodVisibility('month');
      clearBtn.style.display = 'none';
      onClear();
    });
    
    this.populateWeekSelect();
  }

  populateWeekSelect() {
    const weekSelect = document.getElementById('global-filter-week');
    if (!weekSelect) return;
    weekSelect.innerHTML = '';
    
    let currentDate = new Date('2026-01-01');
    for (let w = 1; w <= 30; w++) {
      let start = new Date(currentDate);
      let end = new Date(currentDate);
      end.setDate(end.getDate() + 6);
      
      const startStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
      const endStr = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`;
      
      const option = document.createElement('option');
      option.value = w;
      option.textContent = `Tuần ${w}/2026 (${startStr} - ${endStr})`;
      weekSelect.appendChild(option);
      
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  // Cập nhật nhãn khoảng thời gian hiển thị
  updatePeriodLabels(filter) {
    let periodText = 'Tháng 6/2026';
    let rangeText = 'từ ngày (1/6/2026) đến (17/06/2026)';
    
    if (filter && filter.type !== 'none') {
      if (filter.type === 'month') {
        periodText = `Tháng ${filter.value}/2026`;
        rangeText = `Tháng ${filter.value}/2026`;
      } else if (filter.type === 'quarter') {
        const roman = filter.value === 1 ? 'I' : filter.value === 2 ? 'II' : filter.value === 3 ? 'III' : 'IV';
        periodText = `Quý ${roman}/2026`;
        rangeText = `Quý ${roman}/2026`;
      } else if (filter.type === 'week') {
        periodText = `Tuần ${filter.value}/2026`;
        rangeText = `Tuần ${filter.value}/2026`;
      } else if (filter.type === 'day') {
        const parts = filter.value.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        periodText = `ngày ${formattedDate}`;
        rangeText = `ngày ${formattedDate}`;
      } else if (filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
        const startParts = filter.value.startDate.split('-');
        const endParts = filter.value.endDate.split('-');
        const startStr = `${startParts[2]}/${startParts[1]}/${startParts[0]}`;
        const endStr = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;
        periodText = `từ ngày ${startStr} đến ngày ${endStr}`;
        rangeText = `từ ngày ${startStr} đến ngày ${endStr}`;
      } else if (filter.type === 'year') {
        periodText = `Năm ${filter.value}`;
        rangeText = `Năm ${filter.value}`;
      }
    }

    const pieTitle = document.getElementById('prod-warehouse-pie-title');
    if (pieTitle) {
      pieTitle.textContent = `Tồn kho của các kho — Tồn cuối kỳ (ĐVC) ${periodText}`;
    }
    const tableTitle = document.getElementById('prod-inventory-table-title');
    if (tableTitle) {
      tableTitle.textContent = `Tổng hợp XNT 2 ĐVT [Kho] - tách riêng kho ${periodText}`;
    }
    const bizTableTitle = document.getElementById('biz-inventory-table-title');
    if (bizTableTitle) {
      bizTableTitle.textContent = `Bảng tổng hợp nhập xuất tồn thành phẩm theo KL Nguyên liệu ${periodText}`;
    }
    const bizTurnoverTitle = document.getElementById('biz-turnover-chart-title');
    if (bizTurnoverTitle) {
      bizTurnoverTitle.textContent = `Top 10 mặt hàng xoay vòng (ngày) - ${rangeText}`;
    }
    const finPlTitle = document.getElementById('fin-pl-table-title');
    if (finPlTitle) {
      finPlTitle.textContent = `KẾT QUẢ HOẠT ĐỘNG SXKD ${periodText.toLowerCase()}`;
    }
    const finBalanceTitle = document.getElementById('fin-balance-table-title');
    if (finBalanceTitle) {
      finBalanceTitle.textContent = `KẾT QUẢ THỰC HIỆN MỘT SỐ CHỈ TIÊU TÀI CHÍNH ${periodText.toLowerCase()}`;
    }
  }

  // Vẽ các thẻ KPI
  renderProductionKPIs(kpis) {
    if (!this.productionKPIs) return;
    
    const getPercentBadge = (percentStr) => {
      if (!percentStr) return '';
      const num = parseFloat(percentStr.replace('%', ''));
      let color = '#B8543D'; // red (< 30)
      let bg = '#fff5f5';
      let border = '#fee2e2';
      
      if (num > 80) {
        color = '#5E7C4F'; // green (> 80)
        bg = '#f0fdf4';
        border = '#dcfce7';
      } else if (num >= 31) {
        color = '#C6923D'; // yellow (31-80)
        bg = '#FFF8ED';
        border = '#fef08a';
      }
      return `<span style="font-size: 13px; font-weight: 800; color: ${color}; background: ${bg}; border: 1px solid ${border}; padding: 3px 6px; border-radius: 4px; line-height: 1; margin-left: 4px; display: inline-block;">${percentStr}</span>`;
    };

    this.productionKPIs.innerHTML = kpis.map(kpi => {
      if (kpi.type === 'triple') {
        return `
        <div class="kpi-card kpi-card--triple" style="display:flex; flex-direction:column; justify-content:space-between; padding: 20px; min-height: 130px; gap: 12px; border-top: 3px solid var(--primary);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text); line-height: 1.3;">
                ${kpi.label}
              </div>
            </div>
          </div>
 
          <div style="display:grid; grid-template-columns: 1fr 1.2fr 1fr; gap: var(--s-4); border-top: 1px solid var(--border-light); padding-top: 10px;">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">${kpi.m1Label}</div>
              <div style="font-size: 19px; font-weight: 800; color: var(--text); display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="display: flex; align-items: baseline; gap: 2px;">
                  ${kpi.m1Value}
                  <small style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${kpi.m1Unit}</small>
                </span>
                ${getPercentBadge(kpi.m1Percent)}
              </div>
            </div>
            <div style="border-left: 1px solid var(--border-light); padding-left: 12px;">
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">${kpi.m2Label}</div>
              <div style="font-size: 19px; font-weight: 800; color: var(--primary); display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="display: flex; align-items: baseline; gap: 2px;">
                  ${kpi.m2Value}
                  <small style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${kpi.m2Unit}</small>
                </span>
                ${getPercentBadge(kpi.m2Percent)}
              </div>
            </div>
            <div style="border-left: 1px solid var(--border-light); padding-left: 12px;">
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">${kpi.m3Label}</div>
              <div style="font-size: 19px; font-weight: 800; color: var(--info); display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="display: flex; align-items: baseline; gap: 2px;">
                  ${kpi.m3Value}
                  <small style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${kpi.m3Unit}</small>
                </span>
                ${getPercentBadge(kpi.m3Percent)}
              </div>
            </div>
          </div>
        </div>
        `;
      }

      const isAlert = !!kpi._alert;
      const alertBorder = isAlert ? 'border-left: 4px solid var(--danger); background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);' : 'border-top: 3px solid var(--primary);';
      const valueColor = isAlert ? 'color: var(--danger);' : '';
      const percentColor = isAlert ? 'color: var(--danger);' : 'color: var(--success);';
      return `
      <div class="kpi-card" style="display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding: 12px var(--s-4); gap: 4px; border: 1px solid var(--border-light); background: var(--surface); ${alertBorder}">
        <div class="kpi-card-label" style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${kpi.label}</div>
        <div class="kpi-card-value" style="font-size: 24px; font-weight: 800; display: flex; align-items: baseline; gap: 4px; line-height: 1.1; ${valueColor}">
          ${kpi.value}
          <small style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">${kpi.unit || ''}</small>
          ${kpi.percent ? `<small style="font-size: 13px; font-weight: 600; ${percentColor}">(${kpi.percent})</small>` : ''}
        </div>
        <div style="display: flex; gap: 6px; font-size: 11px; font-weight: 600; color: var(--text-secondary);">
          ${kpi.trend !== null && kpi.trend !== undefined ? Utils.trendHTML(kpi.trend, kpi.trendDir) : ''}
          ${kpi.sub ? `<span class="kpi-card-sub" style="${isAlert ? 'color:var(--danger);' : ''}">${kpi.sub}</span>` : ''}
        </div>
      </div>
      `;
    }).join('');
  }

  // Vẽ bảng tổng hợp tồn kho bên Sản xuất
  renderProductionInventoryTable(data, activeWarehouseTab) {
    if (!this.productionInventoryTable) return;

    // Update active class on tab buttons
    if (this.inventoryTabButtons) {
      this.inventoryTabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === activeWarehouseTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Cột header dùng chung cho cả scroll body và footer
    const THEAD = `
      <thead>
        <tr>
          <th rowspan="2" style="width: 80px; vertical-align: middle; background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Mã vật tư</th>
          <th rowspan="2" style="min-width: 220px; vertical-align: middle; background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Tên vật tư/Goods</th>
          <th colspan="2" class="text-center" style="background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">ĐVT/Unit</th>
          <th colspan="2" class="text-center" style="background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Tồn đầu kỳ</th>
          <th colspan="2" class="text-center" style="background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Nhập trong kỳ</th>
          <th colspan="2" class="text-center" style="background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Xuất trong kỳ</th>
          <th colspan="2" class="text-center" style="background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Tồn cuối kỳ</th>
          <th rowspan="2" style="width: 100px; vertical-align: middle; text-align: center; background:#E3D5C8; color:#4A3C31; font-weight:800; border: 1px solid var(--border);">Thời gian tồn<br>(Ngày)</th>
        </tr>
        <tr>
          <th class="text-center" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVC</th>
          <th class="text-center" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVCD</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVC</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVCD</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVC</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVCD</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVC</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVCD</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVC</th>
          <th class="text-right" style="background:#FAF3EC; color:#4A3C31; font-size:10px; border: 1px solid var(--border);">ĐVCD</th>
        </tr>
      </thead>`;

    // ── Trường hợp không có dữ liệu ──
    if (!data || data.length === 0) {
      this.productionInventoryTable.innerHTML = `
        <div style="overflow-x:auto; overflow-y:auto;">
          <table class="data-table excel-table" style="font-size:11px; width:100%; min-width:1000px; margin:0;">
            ${THEAD}
            <tbody>
              <tr><td colspan="13" class="text-center" style="padding:32px !important; color:var(--text-muted); font-size:13px;">
                Không có dữ liệu cho kho này
              </td></tr>
            </tbody>
          </table>
        </div>`;
      return;
    }

    // ── Tính tổng và build tbody ──
    let totalTonDvc = 0, totalTonDvcd = 0;
    let totalNhapDvc = 0, totalNhapDvcd = 0;
    let totalXuatDvc = 0, totalXuatDvcd = 0;
    let totalCuoiDvc = 0, totalCuoiDvcd = 0;

    const formatVal = (val) => {
      if (val === null || val === undefined) return '';
      if (val === 0) return '0';
      const str = val.toString();
      if (str.includes('.')) {
        const decimals = str.split('.')[1].length;
        return Utils.formatNumber(val, Math.min(decimals, 6));
      }
      return Utils.formatNumber(val, 0);
    };

    let tbodyRows = '';
    data.forEach((item, idx) => {
      totalTonDvc  += item.ton_dvc;  totalTonDvcd  += item.ton_dvcd;
      totalNhapDvc += item.nhap_dvc; totalNhapDvcd += item.nhap_dvcd;
      totalXuatDvc += item.xuat_dvc; totalXuatDvcd += item.xuat_dvcd;
      totalCuoiDvc += item.cuoi_dvc; totalCuoiDvcd += item.cuoi_dvcd;

      const bg = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
      tbodyRows += `
        <tr class="product-row" style="background:${bg};">
          <td style="font-weight:700; color:var(--primary); border:1px solid var(--border); background:${bg};">${item.code}</td>
          <td style="color:var(--text); font-weight:600; border:1px solid var(--border); background:${bg};">${item.name}</td>
          <td class="text-center" style="color:var(--text-secondary); border:1px solid var(--border); background:${bg};">${item.dvc}</td>
          <td class="text-center" style="color:var(--text-secondary); border:1px solid var(--border); background:${bg};">${item.dvcd}</td>
          <td class="text-right" style="color:var(--text); border:1px solid var(--border); background:${bg};">${formatVal(item.ton_dvc)}</td>
          <td class="text-right" style="color:var(--text); border:1px solid var(--border); background:${bg};">${formatVal(item.ton_dvcd)}</td>
          <td class="text-right" style="color:var(--text); border:1px solid var(--border); background:${bg};">${formatVal(item.nhap_dvc)}</td>
          <td class="text-right" style="color:var(--text); border:1px solid var(--border); background:${bg};">${formatVal(item.nhap_dvcd)}</td>
          <td class="text-right" style="color:var(--text); border:1px solid var(--border); background:${bg};">${formatVal(item.xuat_dvc)}</td>
          <td class="text-right" style="color:var(--text); border:1px solid var(--border); background:${bg};">${formatVal(item.xuat_dvcd)}</td>
          <td class="text-right" style="color:var(--text); font-weight:700; border:1px solid var(--border); background:${bg};">${formatVal(item.cuoi_dvc)}</td>
          <td class="text-right" style="color:var(--text); font-weight:700; border:1px solid var(--border); background:${bg};">${formatVal(item.cuoi_dvcd)}</td>
          <td class="text-center" style="color:var(--text-secondary); font-weight:600; border:1px solid var(--border); background:${bg};">${item.days}</td>
        </tr>`;
    });

    const getMaxDecimals = (key) => {
      let maxDec = 0;
      data.forEach(item => {
        const val = item[key];
        if (val === null || val === undefined) return;
        const str = val.toString();
        if (str.includes('.')) {
          const dec = str.split('.')[1].length;
          if (dec > maxDec) maxDec = dec;
        }
      });
      return Math.min(maxDec, 6);
    };

    // ── Dòng TỔNG CỘNG (không sticky, nằm ngoài vùng cuộn) ──
    const totalRowHtml = `
      <tr class="grand-total-row" style="background:#D5C5B5; font-weight:800; color:#4A3C31;">
        <td colspan="4" class="text-center" style="font-weight:800; font-size:11px; letter-spacing:0.5px; text-transform:uppercase; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">TỔNG CỘNG</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalTonDvc,  getMaxDecimals('ton_dvc'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalTonDvcd, getMaxDecimals('ton_dvcd'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalNhapDvc,  getMaxDecimals('nhap_dvc'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalNhapDvcd, getMaxDecimals('nhap_dvcd'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalXuatDvc,  getMaxDecimals('xuat_dvc'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalXuatDvcd, getMaxDecimals('xuat_dvcd'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalCuoiDvc,  getMaxDecimals('cuoi_dvc'))}</td>
        <td class="text-right" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">${Utils.formatNumber(totalCuoiDvcd, getMaxDecimals('cuoi_dvcd'))}</td>
        <td class="text-center" style="font-weight:800; color:#4A3C31; border:1px solid #A89585; background:#D5C5B5; padding:8px 12px;">—</td>
      </tr>`;

    const COLGROUP = `
      <colgroup>
        <col style="width: 80px; min-width: 80px;">
        <col style="width: 220px; min-width: 220px;">
        <col style="width: 50px; min-width: 50px;">
        <col style="width: 50px; min-width: 50px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 85px; min-width: 85px;">
        <col style="width: 100px; min-width: 100px;">
      </colgroup>`;

    // ── Inject cấu trúc 2 tầng:
    //    [div.inv-scroll-body]  → cuộn dọc, chứa thead + tbody
    //    [div.inv-total-fixed]  → cố định bên ngoài cuộn, chứa TỔNG CỘNG
    //    Cả hai cuộn ngang đồng bộ với nhau qua JS ──
    this.productionInventoryTable.innerHTML = `
      <div class="inv-scroll-body" style="overflow-x:auto; overflow-y:auto; max-height:228px;">
        <table class="data-table excel-table" style="font-size:11px; width:100%; min-width:1180px; margin:0; table-layout:fixed;">
          ${COLGROUP}
          ${THEAD}
          <tbody>${tbodyRows}</tbody>
        </table>
      </div>
      <div class="inv-total-fixed" style="overflow-x:hidden; border-top:2px solid #A89585; box-shadow:0 -3px 8px rgba(0,0,0,0.08);">
        <table class="data-table excel-table" style="font-size:11px; width:100%; min-width:1180px; margin:0; table-layout:fixed;">
          ${COLGROUP}
          <tbody>${totalRowHtml}</tbody>
        </table>
      </div>`;

    // ── Đồng bộ scroll ngang: scroll body → scroll footer theo ──
    const scrollBody = this.productionInventoryTable.querySelector('.inv-scroll-body');
    const totalFixed = this.productionInventoryTable.querySelector('.inv-total-fixed');
    if (scrollBody && totalFixed) {
      scrollBody.addEventListener('scroll', () => {
        totalFixed.scrollLeft = scrollBody.scrollLeft;
      });
    }
  }

  // Vẽ biểu đồ giám sát nhà xưởng
  renderFactoryMonitoring(factories, activeMonitorTab = 'tien_do', statusTimeHistory = [], activeMonitorFactory = 'overview', activeMonitorMonth = 6, filter = null) {
    if (!this.productionFactoryMonitor) return;

    // Update active class on monitor tab buttons
    const tabButtons = document.querySelectorAll('.prod-monitor-tab-btn');
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === activeMonitorTab) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text-secondary)';
      }
    });

    const tienDoContent = document.getElementById('monitor-content-tien_do');
    const tinhTrangContent = document.getElementById('monitor-content-tinh_trang');
    const isPastMonth = (filter && filter.type === 'month') ? parseInt(filter.value) < 6 : activeMonitorMonth < 6;

    // Tên thời gian cho label nhân sự/sản lượng
    let periodLabel = `tháng ${String(activeMonitorMonth).padStart(2, '0')}/2026`;
    if (filter && filter.type !== 'none') {
      if (filter.type === 'month') {
        periodLabel = `tháng ${String(filter.value).padStart(2, '0')}/2026`;
      } else if (filter.type === 'quarter') {
        const roman = filter.value === 1 ? 'I' : filter.value === 2 ? 'II' : filter.value === 3 ? 'III' : 'IV';
        periodLabel = `quý ${roman}/2026`;
      } else if (filter.type === 'week') {
        periodLabel = `tuần ${filter.value}/2026`;
      } else if (filter.type === 'day') {
        const parts = filter.value.split('-');
        periodLabel = `ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
      } else if (filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
        const startParts = filter.value.startDate.split('-');
        const endParts = filter.value.endDate.split('-');
        periodLabel = `từ ngày ${startParts[2]}/${startParts[1]} đến ngày ${endParts[2]}/${endParts[1]}`;
      } else if (filter.type === 'year') {
        periodLabel = `năm ${filter.value}`;
      }
    }

    const staffDateLabel  = `Nhân sự ${periodLabel}`;
    const outputDateLabel = `Sản lượng lũy kế ${periodLabel}`;

    if (activeMonitorTab === 'tien_do') {
      if (tienDoContent) tienDoContent.style.display = 'block';
      if (tinhTrangContent) tinhTrangContent.style.display = 'none';

      // Helper functions for stage styling and status colors
      const getStageColor = (index, totalStages) => {
        const shades = ['#D2A87E', '#D6AE88', '#DAB592', '#DEBB9C', '#E2C2A6', '#E6C8B0', '#EACFBA', '#EED6C4'];
        if (totalStages <= 1) return shades[0];
        const step = (shades.length - 1) / (totalStages - 1);
        const shadeIndex = Math.round(index * step);
        return shades[shadeIndex] || shades[0];
      };

      const getStatusColors = (prog) => {
        if (prog === 100) return { bg: '#5E7C4F', text: '#ffffff', name: 'Hoàn thành (100%)' };
        if (prog >= 90) return { bg: '#8BBA77', text: '#ffffff', name: 'Sắp hoàn thành (90-99%)' };
        if (prog >= 50) return { bg: '#4A7C8F', text: '#ffffff', name: 'Đang triển khai (50-89%)' };
        if (prog > 0) return { bg: '#C6923D', text: '#ffffff', name: 'Mới bắt đầu (1-49%)' };
        return { bg: '#9ca3af', text: '#ffffff', name: 'Chưa khởi công (0%)' };
      };

      let renderList = [];
      if (activeMonitorFactory === 'overview') {
        // Tính tổng nhân sự và sản lượng từ tất cả các nhà máy
        let totalActual = 0, totalCapacity = 0, totalOutput = 0;
        factories.forEach(f => {
          const staffParts = (f.staff || '0/0').split('/');
          totalActual   += parseInt(staffParts[0]) || 0;
          totalCapacity += parseInt(staffParts[1]) || 0;
          const outputMatch = (f.output || '0').match(/^(\d+)/);
          totalOutput += outputMatch ? parseInt(outputMatch[1]) : 0;
        });

        // Adjust output label based on week/day scale if relevant
        let displayOutput = totalOutput;
        if (filter && filter.type === 'week') {
          displayOutput = Math.round(totalOutput / 4);
        } else if (filter && filter.type === 'day') {
          displayOutput = Math.round(totalOutput / 26) || 1;
        } else if (filter && filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
          const diffTime = Math.abs(new Date(filter.value.endDate) - new Date(filter.value.startDate));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          displayOutput = Math.round(totalOutput * (diffDays / 30));
        } else if (filter && filter.type === 'year') {
          displayOutput = totalOutput * 12;
        }
        
        const outputLabel = displayOutput === 0
          ? (isPastMonth ? '0 cont' : '0 cont (đang triển khai)')
          : `${displayOutput} cont`;

        const overviewFactory = {
          name: 'Tổng quan nhà máy',
          staff: `${totalActual}/${totalCapacity}`,
          output: outputLabel,
          status: 'normal',
          stages: ['Cắt phôi', 'Chà nhám', 'Lắp ráp', 'Sơn', 'Lắp phụ kiện', 'Đóng gói'],
          orders: []
        };
        factories.forEach(f => {
          f.orders.forEach(o => {
            overviewFactory.orders.push({
              ...o,
              parentStagesLength: f.stages.length
            });
          });
        });
        renderList = [overviewFactory];
      } else {
        let factoryIndex = 0;
        if (activeMonitorFactory === 'factory1') factoryIndex = 0;
        else if (activeMonitorFactory === 'factory2') factoryIndex = 1;
        else if (activeMonitorFactory === 'factory3') factoryIndex = 2;

        const factory = factories[factoryIndex];
        
        // Adjust output label based on week/day scale if relevant
        let displayOutput = 0;
        const outputMatch = (factory.output || '0').match(/^(\d+)/);
        if (outputMatch) {
          const rawOut = parseInt(outputMatch[1]);
          if (filter && filter.type === 'week') {
            displayOutput = Math.round(rawOut / 4);
          } else if (filter && filter.type === 'day') {
            displayOutput = Math.round(rawOut / 26) || 1;
          } else if (filter && filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
            const diffTime = Math.abs(new Date(filter.value.endDate) - new Date(filter.value.startDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            displayOutput = Math.round(rawOut * (diffDays / 30));
          } else if (filter && filter.type === 'year') {
            displayOutput = rawOut * 12;
          } else {
            displayOutput = rawOut;
          }
        }
        
        const outputLabel = displayOutput === 0
          ? (isPastMonth ? '0 cont' : '0 cont (đang triển khai)')
          : `${displayOutput} cont`;

        const singleFactory = {
          ...factory,
          output: outputLabel,
          orders: factory.orders.map(o => ({ ...o, parentStagesLength: factory.stages.length }))
        };
        renderList = [singleFactory];
      }

      this.productionFactoryMonitor.innerHTML = renderList.map(factory => {
        return `
        <div class="factory-card factory-card--${factory.status}" style="border-top: 3px solid var(--primary); padding: 20px; gap: 16px; margin-bottom: 16px; width: 100%;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${factory.name}</h3>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); white-space: nowrap; font-weight: 600; background: var(--surface-alt); border: 1px solid var(--border-light); padding: 8px 20px; border-radius: var(--r-full); box-shadow: var(--sh-xs);">
              <span>${staffDateLabel}: <strong style="color: var(--text); font-size: 16px; font-weight: 800; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; margin-left: 4px;">${factory.staff}</strong></span>
              <span style="margin: 0 16px; color: var(--border);">|</span>
              <span>${outputDateLabel}: <strong style="color: #c2410c; font-size: 16px; font-weight: 800; background: #ffedd5; padding: 2px 8px; border-radius: 4px; margin-left: 4px; border: 1px solid #fed7aa;">${factory.output}</strong></span>
            </div>
          </div>


          <div style="border-top: 1px solid var(--border-light); padding-top: 16px; width: 100%;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; font-size: 11px; padding: 2px 4px;">
              ${factory.stages.map((stg, index) => `
                <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--text);">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: ${getStageColor(index, factory.stages.length)}; border: 1px solid rgba(0,0,0,0.1);"></span>
                  ${stg}
                </span>
              `).join('')}
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; padding: 4px 12px 4px 0; max-height: 350px; overflow-y: auto;" class="custom-scrollbar">
              ${factory.orders.map(order => {
                const hasProgress = order.stageProgress.some(p => p > 0);
                
                // Calculate average progress
                const avgProg = order.stageProgress.length > 0 
                  ? Math.round(order.stageProgress.reduce((sum, p) => sum + p, 0) / order.stageProgress.length)
                  : 0;
                  
                const overallColors = getStatusColors(avgProg);

                return `
                <div style="display: flex; align-items: center; gap: 16px; padding: 4px 0;">
                  <div style="width: 200px; display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <span style="font-weight: 800; color: #000000 !important; font-size: 12px; min-width: 95px; display: inline-block;">${order.code}</span>
                    <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: var(--r-md); background: ${overallColors.bg}; color: ${overallColors.text}; border: 1px solid rgba(0,0,0,0.05); white-space: nowrap; display: inline-block; text-align: center; min-width: 45px;" title="Tiến độ tổng thể: ${avgProg}%">
                      ${avgProg}%
                    </span>
                  </div>
                  <div style="flex: 1; display: flex; align-items: center; min-width: 0;">
                    ${hasProgress ? `
                      <div style="display: flex; height: 22px; width: 100%; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.06); background: #f3f4f6; border: 1px solid rgba(0,0,0,0.05);">
                        ${order.stageProgress.map((prog, sIdx) => {
                          if (prog === 0) return '';
                          const segmentWidthPercent = (prog / order.parentStagesLength).toFixed(4);
                          const stgColor = getStageColor(sIdx, order.parentStagesLength);
                          const stgName = factory.stages[sIdx] || `Công đoạn ${sIdx + 1}`;
                          return `
                            <div title="${stgName}: ${prog.toFixed(1)}%" style="width: ${segmentWidthPercent}%; height: 100%; background: ${stgColor}; border-right: 1px solid #ffffff; display: flex; align-items: center; justify-content: center; transition: all 0.3s; position: relative; cursor: pointer; min-width: 0; overflow: hidden; flex-shrink: 0; flex-grow: 0;">
                              <span style="color: #21150c; font-weight: 800; font-size: 10px; text-shadow: none; z-index: 2; padding: 0 2px; white-space: nowrap;">
                                ${prog.toFixed(1)}%
                              </span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    ` : `
                      <span style="color: var(--text-muted); font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Chưa triển khai (0%)</span>
                    `}
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        `;
      }).join('');
    } else {
      if (tienDoContent) tienDoContent.style.display = 'none';
      if (tinhTrangContent) tinhTrangContent.style.display = 'block';

      // Update chart title
      const titleEl = document.getElementById('tinh-trang-chart-title');
      if (titleEl) {
        const titleMap = {
          overview: 'Tổng quan nhà máy',
          factory1: 'Nhà máy sản xuất A',
          factory2: 'Nhà máy sản xuất B',
          factory3: 'Nhà máy sản xuất C'
        };
        titleEl.textContent = `${titleMap[activeMonitorFactory] || 'Tổng quan nhà máy'} — ${periodLabel.toUpperCase()}`;
      }
      this.renderStatusTimeChart(statusTimeHistory, activeMonitorFactory, activeMonitorMonth, filter);
    }
  }

  // Vẽ biểu đồ thời gian hoạt động của máy móc và nhân công
  renderStatusTimeChart(statusTimeHistory, activeMonitorFactory = 'overview', activeMonitorMonth = 6, filter = null) {
    if (!statusTimeHistory || statusTimeHistory.length === 0) return;
    
    let historyPeriod = [];
    if (filter && filter.type !== 'none') {
      if (filter.type === 'month') {
        const prefix = `2026-${String(filter.value).padStart(2, '0')}`;
        historyPeriod = statusTimeHistory.filter(h => h.date.startsWith(prefix));
      } else if (filter.type === 'quarter') {
        const q = parseInt(filter.value);
        historyPeriod = statusTimeHistory.filter(h => {
          const m = parseInt(h.date.split('-')[1]);
          if (q === 1) return m >= 1 && m <= 3;
          if (q === 2) return m >= 4 && m <= 6;
          if (q === 3) return m >= 7 && m <= 9;
          return false;
        });
      } else if (filter.type === 'week') {
        const w = parseInt(filter.value);
        let weekStartDate = new Date('2026-01-01');
        weekStartDate.setDate(weekStartDate.getDate() + (w - 1) * 7);
        let weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        historyPeriod = statusTimeHistory.filter(h => {
          const d = new Date(h.date);
          return d >= weekStartDate && d <= weekEndDate;
        });
      } else if (filter.type === 'day') {
        const parts = filter.value.split('-');
        const prefix = `${parts[0]}-${parts[1]}`;
        historyPeriod = statusTimeHistory.filter(h => h.date.startsWith(prefix));
      } else if (filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
        const start = new Date(filter.value.startDate);
        const end = new Date(filter.value.endDate);
        historyPeriod = statusTimeHistory.filter(h => {
          const d = new Date(h.date);
          return d >= start && d <= end;
        });
      } else if (filter.type === 'year') {
        const prefix = `${filter.value}-`;
        historyPeriod = statusTimeHistory.filter(h => h.date.startsWith(prefix));
      }
    } else {
      const prefix = `2026-${String(activeMonitorMonth).padStart(2, '0')}`;
      historyPeriod = statusTimeHistory.filter(h => h.date.startsWith(prefix));
    }

    if (historyPeriod.length === 0) return;

    const labels = historyPeriod.map(h => {
      if (filter && (filter.type === 'quarter' || filter.type === 'range' || filter.type === 'year')) {
        const p = h.date.split('-');
        return `${p[2]}/${p[1]}`;
      }
      return h.date.split('-')[2]; // DD format
    });

    // Clean up legacy chart instances if present
    this.destroyChart('chart-status-time-overview');
    this.destroyChart('chart-status-time-factory1');
    this.destroyChart('chart-status-time-factory2');
    this.destroyChart('chart-status-time-factory3');

    const configChart = (canvasId, dataKey) => {
      this.destroyChart(canvasId);
      const ctx = document.getElementById(canvasId);
      if (!ctx) return;

      const totalData = historyPeriod.map(h => h[dataKey].total);
      const pendingData = historyPeriod.map(h => h[dataKey].pending);
      const inProdData = historyPeriod.map(h => h[dataKey].inProduction);
      const completedData = historyPeriod.map(h => h[dataKey].completed);
      const delayedData = historyPeriod.map(h => h[dataKey].delayed);

      const isSelectedDay = (hDate) => filter && filter.type === 'day' && hDate === filter.value;
      const pointRadii = historyPeriod.map(h => isSelectedDay(h.date) ? 8 : 3);
      const pointBg = historyPeriod.map(h => isSelectedDay(h.date) ? '#C6923D' : '#4F46E5');
      const pointBorder = historyPeriod.map(h => isSelectedDay(h.date) ? '#ffffff' : '#4F46E5');
      const pointBorderW = historyPeriod.map(h => isSelectedDay(h.date) ? 2 : 1);

      const barDatalabelConfig = {
        display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
        anchor: 'center',
        align: 'center',
        font: { size: 10, weight: '800' },
        color: '#ffffff',
        formatter: (val) => val
      };

      this.chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
          labels: labels,
          datasets: [
            {
              type: 'line',
              label: 'Tổng số lệnh',
              data: totalData,
              borderColor: '#4F46E5',
              backgroundColor: 'transparent',
              borderWidth: 3,
              tension: 0.15,
              pointRadius: pointRadii,
              pointHoverRadius: 10,
              pointBackgroundColor: pointBg,
              pointBorderColor: pointBorder,
              pointBorderWidth: pointBorderW,
              fill: false,
              order: 1,
              datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                font: { size: 11, weight: '800' },
                color: '#4F46E5',
                textStrokeColor: '#ffffff',
                textStrokeWidth: 2,
                offset: 2
              }
            },
            {
              label: 'Đang sản xuất',
              data: inProdData,
              backgroundColor: '#4A7C8F',
              barPercentage: 0.85,
              categoryPercentage: 0.85,
              stack: 'status',
              order: 2,
              datalabels: barDatalabelConfig
            },
            {
              label: 'Chờ sản xuất',
              data: pendingData,
              backgroundColor: '#A67C52',
              barPercentage: 0.85,
              categoryPercentage: 0.85,
              stack: 'status',
              order: 2,
              datalabels: barDatalabelConfig
            },
            {
              label: 'Hoàn thành',
              data: completedData,
              backgroundColor: '#5E7C4F',
              barPercentage: 0.85,
              categoryPercentage: 0.85,
              stack: 'status',
              order: 2,
              datalabels: barDatalabelConfig
            },
            {
              label: 'Chậm tiến độ',
              data: delayedData,
              backgroundColor: '#B8543D',
              barPercentage: 0.85,
              categoryPercentage: 0.85,
              stack: 'status',
              order: 2,
              datalabels: barDatalabelConfig
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 20, right: 10 } },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                font: { size: 10, weight: '600' },
                padding: 10
              }
            }
          },
          scales: {
            x: { 
              stacked: true,
              grid: { display: false }, 
              ticks: { 
                font: { size: 9, weight: '500' },
                maxTicksLimit: 31
              } 
            },
            y: { 
              stacked: true,
              beginAtZero: true, 
              ticks: { font: { size: 9 } } 
            }
          }
        }
      });
    };

    configChart('chart-status-time-single', activeMonitorFactory);
  }

  // Vẽ biểu đồ so sánh kế hoạch và thực tế 12 tháng
  renderProduction12MPerformanceChart(monthlyPlans, activeMetric = 'orders', monthsLabels = [], filter = null) {
    this.destroyChart('chart-production-12m-performance');
    const ctx = document.getElementById('chart-production-12m-performance');
    if (!ctx || !monthlyPlans || monthlyPlans.length === 0) return;

    const sortedPlans = [...monthlyPlans].sort((a, b) => a.Month - b.Month);

    let planData, actualData, labelText, formatFn;
    if (activeMetric === 'orders') {
      planData = sortedPlans.map(p => p.Plan_Orders);
      actualData = sortedPlans.map(p => p.Actual_Orders);
      labelText = 'Số lượng lệnh';
      formatFn = v => v;
    } else if (activeMetric === 'value') {
      planData = sortedPlans.map(p => p.Plan_Value);
      actualData = sortedPlans.map(p => p.Actual_Value);
      labelText = 'Giá trị sản xuất ($)';
      formatFn = v => '$' + (v / 1000000).toFixed(1) + 'M';
    } else {
      planData = sortedPlans.map(p => p.Plan_Volume);
      actualData = sortedPlans.map(p => p.Actual_Volume);
      labelText = 'Khối lượng yêu cầu (m³)';
      formatFn = v => v + ' m³';
    }

    const buttons = document.querySelectorAll('.prod-12m-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-metric') === activeMetric) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text-secondary)';
      }
    });

    const isMonthSelected = (m) => {
      if (!filter || filter.type === 'none') return false;
      if (filter.type === 'month') {
        return m === parseInt(filter.value);
      }
      if (filter.type === 'quarter') {
        const q = parseInt(filter.value);
        if (q === 1) return m >= 1 && m <= 3;
        if (q === 2) return m >= 4 && m <= 6;
        if (q === 3) return m >= 7 && m <= 9;
      }
      if (filter.type === 'week') {
        const w = parseInt(filter.value);
        let targetM = 6;
        if (w <= 5) targetM = 1;
        else if (w <= 9) targetM = 2;
        else if (w <= 13) targetM = 3;
        else if (w <= 17) targetM = 4;
        else if (w <= 22) targetM = 5;
        else if (w <= 26) targetM = 6;
        else targetM = 7;
        return m === targetM;
      }
      if (filter.type === 'day') {
        const parts = filter.value.split('-');
        const targetM = parseInt(parts[1]);
        return m === targetM;
      }
      if (filter.type === 'range' && filter.value.startDate && filter.value.endDate) {
        const startM = parseInt(filter.value.startDate.split('-')[1]);
        const endM = parseInt(filter.value.endDate.split('-')[1]);
        return m >= startM && m <= endM;
      }
      if (filter.type === 'year') {
        return true;
      }
      return false;
    };

    const bgColorsPlan = sortedPlans.map(p => isMonthSelected(p.Month) ? '#C6923D' : '#A67C52');
    const bgColorsActual = sortedPlans.map(p => isMonthSelected(p.Month) ? '#8BBA77' : '#5E7C4F');

    this.chartInstances['chart-production-12m-performance'] = new Chart(ctx, {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: monthsLabels,
        datasets: [
          {
            label: 'Kế hoạch',
            data: planData,
            backgroundColor: bgColorsPlan,
            barPercentage: 0.85,
            categoryPercentage: 0.85,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null && ctx.dataset.data[ctx.dataIndex] !== undefined,
              anchor: 'end',
              align: 'top',
              color: '#3A2210',
              font: { size: 10.5, weight: '800' },
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2,
              offset: 2,
              formatter: (v) => (v === null || v === undefined) ? '' : formatFn(v)
            }
          },
          {
            label: 'Thực hiện',
            data: actualData,
            backgroundColor: bgColorsActual,
            barPercentage: 0.85,
            categoryPercentage: 0.85,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null && ctx.dataset.data[ctx.dataIndex] !== undefined,
              anchor: 'end',
              align: 'top',
              color: '#3A2210',
              font: { size: 10.5, weight: '800' },
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2,
              offset: 2,
              formatter: (v) => (v === null || v === undefined) ? '' : formatFn(v)
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 25 } },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, weight: '600' } } }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 9 },
              callback: (v) => {
                if (activeMetric === 'value') return '$' + (v / 1000000).toFixed(1) + 'M';
                return v;
              }
            }
          }
        }
      }
    });
  }

  // Vẽ biểu đồ tròn cơ cấu kho hàng
  renderWarehouseInventoryPieChart(warehouseSummary) {
    this.destroyChart('chart-warehouse-inventory-pie');
    const ctx = document.getElementById('chart-warehouse-inventory-pie');
    if (!ctx || !warehouseSummary) return;

    const warehouseLabels = {
      nguyen_lieu_chinh: 'NL chính',
      vat_tu: 'Vật tư',
      son_dau_mau: 'Sơn - dầu màu',
      thanh_pham: 'Thành phẩm',
      dong_goi: 'Đóng gói',
      hang_hoa: 'Hàng hóa',
      hanh_chinh: 'VT hành chính'
    };

    const keys = Object.keys(warehouseSummary);
    const rawLabels = keys.map(k => warehouseLabels[k] || k);
    const rawValues = keys.map(k => {
      const items = warehouseSummary[k];
      return parseFloat(items.reduce((sum, item) => sum + (item.cuoi_dvc || 0), 0).toFixed(2));
    });

    // Sắp xếp từ cao → thấp theo giá trị tồn cuối kỳ
    const sortedIndices = rawValues
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v)
      .map(x => x.i);
    const labels = sortedIndices.map(i => rawLabels[i]);
    const dataValues = sortedIndices.map(i => rawValues[i]);
    const grandTotal = dataValues.reduce((s, v) => s + v, 0);

    // Palette: warm wood tones gradient — ALL have ≥4.5:1 contrast on white (readable as bold text)
    // Goes from darkest (largest slice) to medium-dark (smallest slice)
    // Avoids pale/beige tones that blend into white background
    const colors = [
      '#3B1505', // 0: Espresso (darkest) — slice lớn nhất
      '#6B3A1F', // 1: Dark walnut
      '#8B4820', // 2: Rich mahogany
      '#A06030', // 3: Copper teak
      '#7A5A28', // 4: Golden walnut (readable on white, WCAG AA Large)
      '#5A4A28', // 5: Olive wood
      '#3D3518', // 6: Dark olive (smallest slice)
    ];

    // Precompute sorted colors so datalabels match slice colors correctly
    const sortedColors = sortedIndices.map(i => colors[sortedIndices.indexOf(i) % colors.length]);

    this.chartInstances['chart-warehouse-inventory-pie'] = new Chart(ctx, {
      type: 'doughnut',
      plugins: [ChartDataLabels],
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors.slice(0, keys.length),
          borderColor: '#FFFFFF',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '42%',
        layout: { padding: { top: 40, bottom: 40, left: 72, right: 72 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed;
                const pct = ((val / grandTotal) * 100).toFixed(1);
                return `${context.label}: ${Utils.formatNumber(val, 0)} (${pct}%)`;
              }
            }
          },
          datalabels: {
            anchor: 'end',
            align: 'end',
            offset: 8,
            clamp: true,
            clip: false,
            // Use the slice's own color as text — all are dark enough to read on white
            color: (context) => colors[context.dataIndex % colors.length],
            backgroundColor: '#FFFFFF',
            borderColor: (context) => colors[context.dataIndex % colors.length],
            borderWidth: 1.5,
            borderRadius: 4,
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
            font: {
              size: 9.5,
              weight: '700',
              family: 'Inter, sans-serif'
            },
            textAlign: 'center',
            formatter: (value, context) => {
              const pct = ((value / grandTotal) * 100).toFixed(1);
              const label = context.chart.data.labels[context.dataIndex];
              return `${label}\n${Utils.formatNumber(value, 0)} (${pct}%)`;
            },
            display: (context) => {
              // Only show label if slice is large enough to matter (>1%)
              const value = context.dataset.data[context.dataIndex];
              return value > 0 && (value / grandTotal) > 0.01;
            }
          }
        }
      }
    });
  }

  // Vẽ bảng chi tiết nhập xuất tồn kho thành phẩm
  renderBusinessInventoryTable(data, activeTab, collapsedGroups) {
    if (!this.businessInventoryTable) return;

    // Update active class on business tab buttons
    if (this.businessTabButtons) {
      this.businessTabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === activeTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    const headers = { ton: 'TỒN ĐẦU KỲ', nhap: 'NHẬP TRONG KỲ', xuat: 'XUẤT TRONG KỲ', cuoi: 'TỒN CUỐI KỲ' };
    const currentHeader = headers[activeTab] || 'TỒN CUỐI KỲ';

    let html = `
      <table class="data-table excel-table" style="font-size: 12px; min-width: 600px; width: 100%;">
        <thead>
          <tr>
            <th rowspan="2" class="text-center" style="width: 40px; vertical-align: middle;">STT</th>
            <th rowspan="2" style="min-width: 180px; vertical-align: middle;">Khách hàng / Mã SP</th>
            <th colspan="4" class="text-center" style="background:#E3D5C8; color:#4A3C31; letter-spacing:0.5px; font-weight: 800;">${currentHeader}</th>
          </tr>
          <tr>
            <th class="text-right" style="width: 90px;">Số lượng TP</th>
            <th class="text-right" style="width: 110px;">Khối lượng (m3)</th>
            <th class="text-right" style="width: 190px;">Tổng tiền theo giá bán TP (Đồng)</th>
            <th class="text-right" style="width: 120px;">Thành tiền (USD)</th>
          </tr>
        </thead>
        <tbody>
    `;

    let grandQty = 0;
    let grandVol = 0;
    let grandVnd = 0;
    let grandUsd = 0;

    data.forEach((g, idx) => {
      grandQty += g.total.qty;
      grandVol += g.total.vol;
      grandVnd += g.total.vnd;
      grandUsd += g.total.usd;

      const isCollapsed = collapsedGroups.has(g.group);
      const arrow = isCollapsed ? '▶' : '▼';

      html += `
        <tr class="group-row business-group-row" data-group-name="${g.group}" style="background:#F4EAE1 !important; color:#4A3C31; font-weight:bold; cursor:pointer;">
          <td class="text-center">${idx + 1}</td>
          <td style="padding-left: 10px;">
            <span class="toggle-icon" style="margin-right: 8px; font-size: 10px; display: inline-block; transition: transform var(--tr-fast);">${arrow}</span>${g.group}
          </td>
          <td class="text-right">${Utils.formatNumber(g.total.qty)}</td>
          <td class="text-right">${Utils.formatNumber(g.total.vol, 5)}</td>
          <td class="text-right">${Utils.formatNumber(g.total.vnd)}</td>
          <td class="text-right">${Utils.formatNumber(g.total.usd)}</td>
        </tr>
      `;

      g.products.forEach((p, pIdx) => {
        const displayStyle = isCollapsed ? 'display: none;' : '';
        html += `
          <tr class="product-row" style="${displayStyle}">
            <td class="text-center" style="color: var(--text-muted);">${pIdx + 1}</td>
            <td style="font-weight: 600; color: var(--primary); padding-left: 24px !important;">${p.code}</td>
            <td class="text-right" style="color: var(--text-secondary);">${Utils.formatNumber(p.qty)}</td>
            <td class="text-right" style="color: var(--text-secondary);">${Utils.formatNumber(p.vol, 5)}</td>
            <td class="text-right" style="color: var(--text-secondary);">${Utils.formatNumber(p.vnd)}</td>
            <td class="text-right" style="color: var(--text-secondary);">${Utils.formatNumber(p.usd)}</td>
          </tr>
        `;
      });
    });

    html += `
      <tr class="grand-total-row" style="background:#D5C5B5; font-weight:800; border-top:2px solid #A89585; color:#4A3C31;">
        <td colspan="2" class="text-center" style="font-weight: 800; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; color: #4A3C31;">TỔNG CỘNG</td>
        <td class="text-right" style="font-weight: 800; color: #4A3C31;">${Utils.formatNumber(grandQty)}</td>
        <td class="text-right" style="font-weight: 800; color: #4A3C31;">${Utils.formatNumber(grandVol, 5)}</td>
        <td class="text-right" style="font-weight: 800; color: #4A3C31;">${Utils.formatNumber(grandVnd)}</td>
        <td class="text-right" style="font-weight: 800; color: #4A3C31;">${Utils.formatNumber(grandUsd)}</td>
      </tr>
      </tbody>
    </table>
    `;

    this.businessInventoryTable.innerHTML = html;
  }

  // Ve bang xu huong hoat dong kinh doanh
  renderBizTrendTable(labels, dataRevenue, dataGross, dataNet, dataGrossMargin, dataNetMargin) {
    if (!this.bizTrendTable) return;

    let html = `
      <table class="data-table excel-table" style="font-size: 13px; width: 100%; min-width: 800px; margin: 0; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 10px 12px; font-weight: 800; text-align: left; background:#E3D5C8; color:#4A3C31; position: sticky; left: 0; z-index: 2;">Chỉ tiêu</th>
    `;

    labels.forEach(lbl => {
      html += `<th class="text-right" style="padding: 10px 12px; font-weight: 800; background:#E3D5C8; color:#4A3C31; width: 60px;">${lbl}</th>`;
    });

    html += `
          </tr>
        </thead>
        <tbody>
    `;

    const formatRow = (label, dataList, isPercentage = false, bold = false) => {
      let rowHtml = `<tr style="${bold ? 'font-weight:700; background:#FAF6F0;' : ''}">`;
      rowHtml += `<td style="padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-light); position: sticky; left: 0; background: ${bold ? '#FAF6F0' : '#ffffff'}; z-index: 1; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1); white-space: nowrap;">${label}</td>`;
      dataList.forEach(val => {
        let displayVal = '';
        if (val !== null && val !== undefined) {
          displayVal = isPercentage ? val.toFixed(1) + '%' : val.toFixed(1);
        } else {
          displayVal = '—';
        }
        rowHtml += `<td class="text-right" style="padding: 10px 12px; border-bottom: 1px solid var(--border-light);">${displayVal}</td>`;
      });
      rowHtml += '</tr>';
      return rowHtml;
    };

    html += formatRow('Doanh thu (tỷ VNĐ)', dataRevenue, false, true);
    html += formatRow('Lợi nhuận gộp (tỷ VNĐ)', dataGross, false, false);
    html += formatRow('Biên lợi nhuận gộp (%)', dataGrossMargin, true, false);
    html += formatRow('Lợi nhuận thuần (tỷ VNĐ)', dataNet, false, true);
    html += formatRow('Biên lợi nhuận thuần (%)', dataNetMargin, true, false);

    html += `
        </tbody>
      </table>
    `;

    this.bizTrendTable.innerHTML = html;
  }

  toggleBizTrendView(viewType) {
    if (!this.viewBizTrendChart || !this.viewBizTrendTable) return;

    if (viewType === 'chart') {
      this.viewBizTrendChart.style.display = 'block';
      this.viewBizTrendTable.style.display = 'none';
    } else {
      this.viewBizTrendChart.style.display = 'none';
      this.viewBizTrendTable.style.display = 'block';
    }

    // Toggle active class on toggle buttons
    const buttons = document.querySelectorAll('.biz-trend-toggle-btn');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-view') === viewType) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = 'var(--primary)';
      }
    });
  }

  // Vẽ các biểu đồ trang Kinh doanh
  renderBusinessCharts(trendData, turnoverData, productsSalesData, customersSalesData, suppliersData, filter = null) {
    Chart.defaults.font.family = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
    this.destroyAllCharts();

    const isMonthSelected = (m) => {
      if (!filter || filter.type === 'none') return false;
      if (filter.type === 'month') {
        return m === parseInt(filter.value);
      }
      if (filter.type === 'quarter') {
        const q = parseInt(filter.value);
        if (q === 1) return m >= 1 && m <= 3;
        if (q === 2) return m >= 4 && m <= 6;
        if (q === 3) return m >= 7 && m <= 9;
      }
      if (filter.type === 'week') {
        const w = parseInt(filter.value);
        let targetM = 6;
        if (w <= 5) targetM = 1;
        else if (w <= 9) targetM = 2;
        else if (w <= 13) targetM = 3;
        else if (w <= 17) targetM = 4;
        else if (w <= 22) targetM = 5;
        else if (w <= 26) targetM = 6;
        else targetM = 7;
        return m === targetM;
      }
      if (filter.type === 'day') {
        const parts = filter.value.split('-');
        const targetM = parseInt(parts[1]);
        return m === targetM;
      }
      return false;
    };

    // Smooth brown gradient: đậm nhất (trên/giá trị cao) → nhạt nhất (dưới/giá trị thấp)
    const bizGradientColors = [
      '#3D1A08', '#5A2A12', '#7A3A1C', '#975028',
      '#B06836', '#C48048', '#D39860', '#DEB07C',
      '#E6C89A', '#EDD8B8'
    ];

    // Utility: lấy đủ màu cho n thanh, từ đậm → nhạt
    const getDecreasingColors = (count) => bizGradientColors.slice(0, Math.max(count, 1));
    const bgColorsRevenue = trendData.revenue.map((_, idx) => isMonthSelected(idx + 1) ? '#C6923D' : '#6B4F3A');
    const bgColorsGross = trendData.gross.map((_, idx) => isMonthSelected(idx + 1) ? '#C6923D' : '#A67C52');
    const bgColorsNet = trendData.net.map((_, idx) => isMonthSelected(idx + 1) ? '#8BBA77' : '#5E7C4F');

    // Chart 1: Doanh thu - Lợi nhuận Combo
    this.createChart('chart-biz-trend', {
      type: 'bar',
      data: {
        labels: [
          ['T1', 'Q1'], 'T2', 'T3',
          ['T4', 'Q2'], 'T5', 'T6',
          ['T7', 'Q3'], 'T8', 'T9',
          ['T10', 'Q4'], 'T11', 'T12'
        ],
        datasets: [
          {
            type: 'bar',
            label: 'Doanh thu',
            data: trendData.revenue,
            backgroundColor: bgColorsRevenue,
            yAxisID: 'y',
            barPercentage: 0.85,
            categoryPercentage: 0.85,
            borderRadius: 0,
            order: 2,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null,
              anchor: 'end',
              align: 'top',
              color: '#6B4F3A',
              font: { size: 10, weight: '800' },
              formatter: (v) => v + ' tỷ',
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2.0,
              offset: 2
            }
          },
          {
            type: 'bar',
            label: 'LN gộp',
            data: trendData.gross,
            backgroundColor: bgColorsGross,
            yAxisID: 'y',
            barPercentage: 0.85,
            categoryPercentage: 0.85,
            borderRadius: 0,
            order: 2,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null,
              anchor: 'end',
              align: 'top',
              color: '#8D653E',
              font: { size: 9.5, weight: '800' },
              formatter: (v) => v + ' tỷ',
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2.0,
              offset: 2
            }
          },
          {
            type: 'bar',
            label: 'LN ròng',
            data: trendData.net,
            backgroundColor: bgColorsNet,
            yAxisID: 'y',
            barPercentage: 0.85,
            categoryPercentage: 0.85,
            borderRadius: 0,
            order: 2,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null,
              anchor: 'end',
              align: 'top',
              color: '#465F3A',
              font: { size: 9.5, weight: '800' },
              formatter: (v) => v + ' tỷ',
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2.0,
              offset: 2
            }
          },
          {
            type: 'line',
            label: 'Tỷ suất LNG (%)',
            data: trendData.grossMargin,
            borderColor: '#E67E22',
            backgroundColor: '#E67E22',
            borderWidth: 2.5,
            fill: false,
            yAxisID: 'y1',
            tension: 0.3,
            order: 1,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ffffff',
            pointBorderWidth: 3,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null,
              anchor: 'end',
              align: 'top',
              offset: 10,
              color: '#E67E22',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderColor: '#E67E22',
              borderWidth: 1.5,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              font: { size: 10, weight: '800' },
              formatter: (v) => v + '%',
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2.0
            }
          },
          {
            type: 'line',
            label: 'Tỷ suất LNR (%)',
            data: trendData.netMargin,
            borderColor: '#0284C7',
            backgroundColor: '#0284C7',
            borderWidth: 2.5,
            fill: false,
            yAxisID: 'y1',
            tension: 0.3,
            order: 1,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ffffff',
            pointBorderWidth: 3,
            datalabels: {
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] !== null,
              anchor: 'start',
              align: 'bottom',
              offset: 10,
              color: '#0284C7',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderColor: '#0284C7',
              borderWidth: 1.5,
              borderRadius: 4,
              padding: { top: 2, bottom: 2, left: 5, right: 5 },
              font: { size: 10, weight: '800' },
              formatter: (v) => v + '%',
              textStrokeColor: '#ffffff',
              textStrokeWidth: 2.0
            }
          }
        ]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { type: 'linear', position: 'left', beginAtZero: true },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            max: 130,
            grid: { drawOnChartArea: false },
            ticks: {
              callback: (v) => v + '%',
              font: { size: 10 }
            }
          }
        }
      }
    });

    // Chart 2: Top 10 Turnover
    const turnoverSlice = (turnoverData || []).slice(0, 10);
    const turnoverLabels = turnoverSlice.map(item => item.code);
    const turnoverValues = turnoverSlice.map(item => item.days);
    const turnoverBgColors = getDecreasingColors(turnoverValues.length);
    this.createChart('chart-biz-top-turnover', {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: turnoverLabels,
        datasets: [{
          label: 'Số ngày tồn kho',
          data: turnoverValues,
          backgroundColor: turnoverBgColors,
          borderWidth: 0,
          borderRadius: 0,
          barPercentage: 0.75,
          categoryPercentage: 0.85
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 95 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            color: '#000000',
            font: { weight: '800', size: 13 },
            formatter: (v) => v + ' ngày'
          }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, title: { display: true, text: 'Số ngày tồn kho', font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 9, weight: '600' } } }
        }
      }
    });

    // Formatter utility for bar labels
    const formatBizSalesFull = (v) => {
      if (v === null || v === undefined) return '—';
      if (v >= 1e9) return (v / 1e9).toFixed(2) + ' tỷ';
      if (v >= 1e6) return (v / 1e6).toFixed(1) + ' triệu';
      return new Intl.NumberFormat('vi-VN').format(v);
    };

    // Chart 3: Top Products Sales
    const productsSlice = (productsSalesData || []).slice(0, 10);
    const productsLabels = productsSlice.map(item => item.code);
    const productsValues = productsSlice.map(item => item.sales);
    const productsBgColors = getDecreasingColors(productsValues.length);
    this.createChart('chart-biz-top-products-sales', {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: productsLabels,
        datasets: [{
          label: 'Doanh số',
          data: productsValues,
          backgroundColor: productsBgColors,
          borderWidth: 0,
          borderRadius: 0,
          barPercentage: 0.75,
          categoryPercentage: 0.85
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 205 } },
        plugins: {
          legend: { display: false },
          datalabels: { 
            display: true, 
            anchor: 'end', 
            align: 'right', 
            color: '#000000', 
            font: { weight: '800', size: 12 }, 
            formatter: (v, ctx) => {
              const item = productsSlice[ctx.dataIndex];
              const salesStr = formatBizSalesFull(v);
              if (item && item.qty !== undefined) {
                return `${salesStr} (${item.qty.toLocaleString('vi-VN')} SP)`;
              }
              return salesStr;
            }
          },
          tooltip: { 
            callbacks: { 
              label: ctx => {
                const item = productsSlice[ctx.dataIndex];
                const salesStr = formatBizSalesFull(ctx.parsed.x);
                if (item && item.qty !== undefined) {
                  return `Doanh số: ${salesStr} (Số lượng: ${item.qty.toLocaleString('vi-VN')} SP)`;
                }
                return `Doanh số: ${salesStr}`;
              } 
            } 
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: v => {
                if (v >= 1e9) return (v / 1e9).toFixed(1) + ' tỷ';
                if (v >= 1e6) return (v / 1e6).toFixed(0) + ' triệu';
                return v;
              },
              font: { size: 9 }
            }
          },
          y: { grid: { display: false }, ticks: { font: { size: 9, weight: '600' } } }
        }
      }
    });

    // Chart 4: Top Customers Sales
    const customersSlice = (customersSalesData || []).slice(0, 10);
    const customersLabels = customersSlice.map(item => item.name);
    const customersValues = customersSlice.map(item => item.sales);
    const customersBgColors = getDecreasingColors(customersValues.length);
    this.createChart('chart-biz-top-customers-sales', {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: customersLabels,
        datasets: [{
          label: 'Doanh số',
          data: customersValues,
          backgroundColor: customersBgColors,
          borderWidth: 0,
          borderRadius: 0,
          barPercentage: 0.75,
          categoryPercentage: 0.85
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 145 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'right', color: '#000000', font: { weight: '800', size: 13 }, formatter: formatBizSalesFull },
          tooltip: { callbacks: { label: ctx => `Doanh số: ${formatBizSalesFull(ctx.parsed.x)}` } }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: v => {
                if (v >= 1e9) return (v / 1e9).toFixed(0) + ' tỷ';
                if (v >= 1e6) return (v / 1e6).toFixed(0) + ' triệu';
                return v;
              },
              font: { size: 9 }
            }
          },
          y: { grid: { display: false }, ticks: { font: { size: 9, weight: '600' } } }
        }
      }
    });

    // Chart 5: Top Suppliers
    const suppliersSlice = (suppliersData || []).slice(0, 10);
    const suppliersLabels = suppliersSlice.map(item => item.name);
    const suppliersValues = suppliersSlice.map(item => item.sales);
    const suppliersBgColors = getDecreasingColors(suppliersValues.length);
    this.createChart('chart-biz-top-suppliers', {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: suppliersLabels,
        datasets: [{
          label: 'Giá trị mua',
          data: suppliersValues,
          backgroundColor: suppliersBgColors,
          borderWidth: 0,
          borderRadius: 0,
          barPercentage: 0.75,
          categoryPercentage: 0.85
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 135 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'right', color: '#000000', font: { weight: '800', size: 13 }, formatter: formatBizSalesFull },
          tooltip: { callbacks: { label: ctx => `Giá trị mua: ${formatBizSalesFull(ctx.parsed.x)}` } }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: v => {
                if (v >= 1e9) return (v / 1e9).toFixed(0) + ' tỷ';
                if (v >= 1e6) return (v / 1e6).toFixed(0) + ' triệu';
                return v;
              },
              font: { size: 9 }
            }
          },
          y: { grid: { display: false }, ticks: { font: { size: 9, weight: '600' } } }
        }
      }
    });
  }

  // Vẽ bảng Báo cáo kết quả hoạt động SXKD (P&L)
  renderPLTable(plData) {
    if (!this.financePLTable) return;

    let html = `
      <table class="data-table excel-table" style="font-size: 14px; width: 100%; min-width: 600px; margin: 0;">
        <thead>
          <tr>
            <th style="padding: 12px 14px; font-weight: 800; text-align: left; background:#E3D5C8; color:#4A3C31;">Chỉ tiêu</th>
            <th class="text-right" style="padding: 12px 14px; font-weight: 800; width: 180px; background:#E3D5C8; color:#4A3C31;">Kỳ này</th>
            <th class="text-right" style="padding: 12px 14px; font-weight: 800; width: 180px; background:#E3D5C8; color:#4A3C31;">Kỳ trước</th>
            <th class="text-center" style="padding: 12px 14px; font-weight: 800; width: 120px; background:#E3D5C8; color:#4A3C31;">% So sánh</th>
          </tr>
        </thead>
        <tbody>
    `;

    plData.forEach(r => {
      let currentStr = '0';
      let priorStr = '0';

      if (r.isEPS) {
        currentStr = Utils.formatNumber(r.current, 6);
        priorStr = Utils.formatNumber(r.prior, 6);
      } else {
        currentStr = Utils.formatNumber(r.current);
        priorStr = Utils.formatNumber(r.prior);
      }

      let pctStr = '—';
      let pctColor = 'var(--text-muted)';
      if (r.prior !== 0) {
        const pct = ((r.current - r.prior) / r.prior) * 100;
        if (pct > 0) {
          pctStr = '+' + pct.toFixed(1) + '%';
          pctColor = '#2E6A3B';
        } else if (pct < 0) {
          pctStr = pct.toFixed(1) + '%';
          pctColor = '#B84A39';
        } else {
          pctStr = '0.0%';
          pctColor = 'var(--text-secondary)';
        }
      } else if (r.current !== 0) {
        pctStr = '+100.0%';
        pctColor = '#2E6A3B';
      }

      let rowStyle = '';
      let indentStyle = r.indent ? `padding-left: ${12 + r.indent * 16}px !important;` : '';
      if (r.highlight) {
        rowStyle = 'background:#D5C5B5 !important; font-weight:800; border-top:1px solid #A89585; color:#4A3C31;';
      } else if (r.isParent) {
        rowStyle = 'background:#F4EAE1 !important; font-weight:700; color:#4A3C31;';
      } else {
        rowStyle = 'background:#ffffff !important;';
      }

      html += `
        <tr style="${rowStyle}">
          <td style="${indentStyle}">${r.name}</td>
          <td class="text-right" style="font-weight:${(r.highlight || r.isParent) ? '700' : '500'};">${currentStr}</td>
          <td class="text-right">${priorStr}</td>
          <td class="text-center" style="font-weight:700; color:${pctColor};">${pctStr}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    this.financePLTable.innerHTML = `
      <div style="width: 100%; overflow-x: auto; padding: 0;">
        ${html}
      </div>
    `;
    this.adjustFinanceContainersHeight();
  }

  // Vẽ bảng Cân đối kế toán
  renderBalanceTable(balanceData) {
    if (!this.financeBalanceTable) return;

    let html = `
      <table class="data-table excel-table" style="font-size: 14px; width: 100%; min-width: 600px; margin: 0;">
        <thead>
          <tr>
            <th style="padding: 12px 14px; font-weight: 800; text-align: left; background:#E3D5C8; color:#4A3C31;">Chỉ tiêu</th>
            <th class="text-right" style="padding: 12px 14px; font-weight: 800; width: 180px; background:#E3D5C8; color:#4A3C31;">Kỳ này</th>
            <th class="text-right" style="padding: 12px 14px; font-weight: 800; width: 180px; background:#E3D5C8; color:#4A3C31;">Kỳ trước</th>
            <th class="text-center" style="padding: 12px 14px; font-weight: 800; width: 120px; background:#E3D5C8; color:#4A3C31;">% So sánh</th>
          </tr>
        </thead>
        <tbody>
    `;

    balanceData.forEach(r => {
      // Determine if this row is hidden based on any parent's collapse state
      let isHidden = false;
      let parentId = r.parentId;
      while (parentId) {
        const parentItem = balanceData.find(x => x.id === parentId);
        if (parentItem && parentItem.collapsed) {
          isHidden = true;
          break;
        }
        parentId = parentItem ? parentItem.parentId : null;
      }

      let currentStr = (r.current !== null && r.current !== undefined) ? Utils.formatNumber(r.current) : '';
      let priorStr = (r.prior !== null && r.prior !== undefined) ? Utils.formatNumber(r.prior) : '';

      let pctStr = '—';
      let pctColor = 'var(--text-muted)';
      if (r.prior && r.current !== null && r.current !== undefined) {
        const pct = ((r.current - r.prior) / r.prior) * 100;
        if (pct > 0) {
          pctStr = '+' + pct.toFixed(1) + '%';
          pctColor = '#2E6A3B';
        } else if (pct < 0) {
          pctStr = pct.toFixed(1) + '%';
          pctColor = '#B84A39';
        } else {
          pctStr = '0.0%';
          pctColor = 'var(--text-secondary)';
        }
      } else if (r.current && !r.prior) {
        pctStr = '+100.0%';
        pctColor = '#2E6A3B';
      }

      let rowStyle = '';
      let cursorStyle = r.isParent ? 'cursor:pointer;' : '';

      if (r.level === 0) {
        rowStyle = 'background:#D5C5B5 !important; font-weight:800; border-top:2px solid #A89585; color:#4A3C31;';
      } else if (r.level === 1) {
        rowStyle = 'background:#F4EAE1 !important; font-weight:700; color:#4A3C31; border-top:1px solid #E3D5C8;';
      } else if (r.level === 2) {
        rowStyle = 'background:#FAF6F0 !important; font-weight:600; color:#4A3C31;';
      } else if (r.level === 3) {
        rowStyle = 'background:#ffffff !important; font-weight:500; color:var(--text);';
      } else {
        rowStyle = 'background:#ffffff !important; color:var(--text-muted); font-size:12px;';
      }

      let indentStyle = `padding-left: ${12 + r.level * 16}px !important;`;

      const collapsedClass = r.collapsed ? 'collapsed' : '';
      const displayStyle = isHidden ? 'display: none;' : '';

      const toggleIcon = r.isParent
        ? `<span class="toggle-icon" style="margin-right: 8px; font-size: 10px; display: inline-block; transition: transform var(--tr-fast);">${r.collapsed ? '▶' : '▼'}</span>`
        : `<span style="margin-right: 8px; font-size: 10px; display: inline-block; width: 10px;"></span>`;

      html += `
        <tr class="balance-row level-${r.level} ${collapsedClass}" data-row-id="${r.id}" style="${rowStyle} ${cursorStyle} ${displayStyle}">
          <td style="${indentStyle}">
            ${toggleIcon}${r.name}
          </td>
          <td class="text-right" style="font-weight:${(r.highlight || r.level <= 1) ? '700' : '500'};">${currentStr}</td>
          <td class="text-right">${priorStr}</td>
          <td class="text-center" style="font-weight:700; color:${pctColor};">${pctStr}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    this.financeBalanceTable.innerHTML = `
      <div style="width: 100%; overflow-x: auto; padding: 0;">
        ${html}
      </div>
    `;
    this.adjustFinanceContainersHeight();
  }

  // Các hàm helper quản lý Chart.js
  destroyChart(id) {
    if (this.chartInstances[id]) {
      this.chartInstances[id].destroy();
      delete this.chartInstances[id];
    }
  }

  createChart(canvasId, config) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    this.chartInstances[canvasId] = new Chart(ctx, config);
    return this.chartInstances[canvasId];
  }

  destroyAllCharts() {
    Object.keys(this.chartInstances).forEach(id => {
      this.destroyChart(id);
    });
  }

  // --- Bind Event Handlers (Called by Controller) ---
  bindProdMonitorFactoryChange(handler) {
    const container = document.querySelector('.monitor-factory-toggles');
    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.monitor-fac-btn');
        if (btn) {
          const factoryId = btn.getAttribute('data-factory');
          handler(factoryId);
        }
      });
    }
  }

  bindPageChange(handler) {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const pageId = btn.getAttribute('data-page');
        handler(pageId);
      });
    });
  }

  bindInventoryTabChange(handler) {
    this.inventoryTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        handler(tabId);
      });
    });
  }
  bindBizTrendToggle(handler) {
    this.bizTrendToggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewType = btn.getAttribute('data-view');
        handler(viewType);
      });
    });
  }

  bindBusinessGroupToggle(handler) {
    // Event delegation on table container
    if (this.businessInventoryTable) {
      this.businessInventoryTable.addEventListener('click', (e) => {
        const groupRow = e.target.closest('.business-group-row');
        if (groupRow) {
          const groupName = groupRow.getAttribute('data-group-name');
          handler(groupName);
        }
      });
    }
  }

  bindProductionGroupToggle(handler) {
    if (this.productionInventoryTable) {
      this.productionInventoryTable.addEventListener('click', (e) => {
        const groupRow = e.target.closest('.production-group-row');
        if (groupRow) {
          const groupName = groupRow.getAttribute('data-group-name');
          handler(groupName);
        }
      });
    }
  }

  bindBalanceRowToggle(handler) {
    if (this.financeBalanceTable) {
      this.financeBalanceTable.addEventListener('click', (e) => {
        const row = e.target.closest('.balance-row');
        if (row) {
          const rowId = row.getAttribute('data-row-id');
          handler(rowId);
        }
      });
    }
  }

  bindBusinessInventoryTabChange(handler) {
    if (this.businessTabButtons) {
      this.businessTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabId = btn.getAttribute('data-tab');
          handler(tabId);
        });
      });
    }
  }

  bindProdMonitorTabChange(handler) {
    const container = document.querySelector('.production-monitor-section');
    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.prod-monitor-tab-btn');
        if (btn) {
          const tabId = btn.getAttribute('data-tab');
          handler(tabId);
        }
      });
    }
  }

  bindProd12MMetricChange(handler) {
    const buttons = document.querySelectorAll('.prod-12m-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const metric = btn.getAttribute('data-metric');
        handler(metric);
      });
    });
  }

  bindProdMonitorMonthChange(handler) {
    // Khong co nut/dropdown thay doi thang rieng cho Monitor trong giao dien hien tai
  }

  // Điều chỉnh chiều cao cân đối giữa 2 bảng báo cáo tài chính
  adjustFinanceContainersHeight() {
    const plCard = document.getElementById('finance-pl-table')?.closest('.table-card');
    const balCard = document.getElementById('finance-balance-table')?.closest('.table-card');
    const balWrapper = document.getElementById('finance-balance-table')?.closest('.table-wrapper');
    
    if (plCard && balCard && balWrapper) {
      plCard.style.height = 'auto';
      
      requestAnimationFrame(() => {
        const plHeight = plCard.offsetHeight;
        if (plHeight > 0) {
          balCard.style.height = `${plHeight}px`;
          const headerHeight = balCard.querySelector('.table-card > div')?.offsetHeight || 53;
          balWrapper.style.height = `${plHeight - headerHeight}px`;
          // Đảm bảo wrapper cho phép scroll dọc
          balWrapper.style.overflowY = 'auto';
        }
      });
    }
  }
}
