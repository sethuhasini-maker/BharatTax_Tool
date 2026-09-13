/**
 * BharatTax - Indian Income Tax Engine & UI Controller
 * Updated for FY 2024-25 (AY 2025-26 - Budget July 2024 revisions) & FY 2025-26
 */

const TaxEngine = {
  // Format number into Indian currency format (e.g., ₹12,50,000)
  formatINR(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
    const rounded = Math.round(amount);
    const isNegative = rounded < 0;
    const absVal = Math.abs(rounded);
    
    const str = absVal.toString();
    let lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return (isNegative ? '-₹' : '₹') + formatted;
  },

  // Format to human-readable Lakhs / Crores string (e.g. "(12.50 L)" or "(1.25 Cr)")
  formatWords(amount) {
    if (isNaN(amount) || !amount || amount <= 0) return '';
    const abs = Math.abs(amount);
    if (abs >= 10000000) {
      return `(${(amount / 10000000).toFixed(2)} Cr)`;
    } else if (abs >= 100000) {
      return `(${(amount / 100000).toFixed(2)} L)`;
    } else if (abs >= 1000) {
      return `(${(amount / 1000).toFixed(1)}k)`;
    }
    return '';
  },

  // Calculate HRA Exemption under Section 10(13A)
  calculateHRA(basic, da, hraReceived, rentPaidAnnual, isMetro) {
    const salaryForHRA = (basic || 0) + (da || 0);
    if (salaryForHRA <= 0 || rentPaidAnnual <= 0 || hraReceived <= 0) {
      return {
        exemptHRA: 0,
        taxableHRA: hraReceived || 0,
        rule1Actual: hraReceived || 0,
        rule2RentMinusTenPct: 0,
        rule3SalaryPct: 0
      };
    }

    const rule1 = hraReceived;
    const rule2 = Math.max(0, rentPaidAnnual - (0.10 * salaryForHRA));
    const rule3 = (isMetro ? 0.50 : 0.40) * salaryForHRA;

    const exemptHRA = Math.min(rule1, rule2, rule3);
    const taxableHRA = Math.max(0, hraReceived - exemptHRA);

    return {
      exemptHRA: Math.round(exemptHRA),
      taxableHRA: Math.round(taxableHRA),
      rule1Actual: Math.round(rule1),
      rule2RentMinusTenPct: Math.round(rule2),
      rule3SalaryPct: Math.round(rule3)
    };
  },

  // Calculate Surcharge & Marginal Relief for Old Regime
  calculateOldSurcharge(taxableIncome, basicTax) {
    let surchargeRate = 0;
    let surchargeThreshold = 0;

    if (taxableIncome > 50000000) { // > 5 Crore
      surchargeRate = 0.37;
      surchargeThreshold = 50000000;
    } else if (taxableIncome > 20000000) { // > 2 Crore
      surchargeRate = 0.25;
      surchargeThreshold = 20000000;
    } else if (taxableIncome > 10000000) { // > 1 Crore
      surchargeRate = 0.15;
      surchargeThreshold = 10000000;
    } else if (taxableIncome > 5000000) { // > 50 Lakhs
      surchargeRate = 0.10;
      surchargeThreshold = 5000000;
    }

    if (surchargeRate === 0) {
      return { surcharge: 0, surchargeRate: 0, marginalRelief: 0 };
    }

    let surcharge = basicTax * surchargeRate;

    // Marginal relief check on surcharge
    const taxOnThreshold = this.calculateOldBasicTax(surchargeThreshold, '<60').basicTax;
    let thresholdSurcharge = 0;
    if (surchargeThreshold === 10000000) thresholdSurcharge = taxOnThreshold * 0.10;
    else if (surchargeThreshold === 20000000) thresholdSurcharge = taxOnThreshold * 0.15;
    else if (surchargeThreshold === 50000000) thresholdSurcharge = taxOnThreshold * 0.25;

    const maxAllowedTaxAndSurcharge = taxOnThreshold + thresholdSurcharge + (taxableIncome - surchargeThreshold);
    const currentTaxAndSurcharge = basicTax + surcharge;

    let marginalRelief = 0;
    if (currentTaxAndSurcharge > maxAllowedTaxAndSurcharge) {
      marginalRelief = currentTaxAndSurcharge - maxAllowedTaxAndSurcharge;
      surcharge = Math.max(0, surcharge - marginalRelief);
    }

    return {
      surcharge: Math.round(surcharge),
      surchargeRate,
      marginalRelief: Math.round(marginalRelief)
    };
  },

  // Calculate Surcharge & Marginal Relief for New Regime (Max 25% capped)
  calculateNewSurcharge(taxableIncome, basicTax, fy = '2024-25') {
    let surchargeRate = 0;
    let surchargeThreshold = 0;

    if (taxableIncome > 20000000) { // > 2 Crore
      surchargeRate = 0.25;
      surchargeThreshold = 20000000;
    } else if (taxableIncome > 10000000) { // > 1 Crore
      surchargeRate = 0.15;
      surchargeThreshold = 10000000;
    } else if (taxableIncome > 5000000) { // > 50 Lakhs
      surchargeRate = 0.10;
      surchargeThreshold = 5000000;
    }

    if (surchargeRate === 0) {
      return { surcharge: 0, surchargeRate: 0, marginalRelief: 0 };
    }

    let surcharge = basicTax * surchargeRate;

    // Marginal relief calculation
    const taxOnThreshold = this.calculateNewBasicTax(surchargeThreshold, fy).basicTax;
    let thresholdSurcharge = 0;
    if (surchargeThreshold === 10000000) thresholdSurcharge = taxOnThreshold * 0.10;
    else if (surchargeThreshold === 20000000) thresholdSurcharge = taxOnThreshold * 0.15;

    const maxAllowedTaxAndSurcharge = taxOnThreshold + thresholdSurcharge + (taxableIncome - surchargeThreshold);
    const currentTaxAndSurcharge = basicTax + surcharge;

    let marginalRelief = 0;
    if (currentTaxAndSurcharge > maxAllowedTaxAndSurcharge) {
      marginalRelief = currentTaxAndSurcharge - maxAllowedTaxAndSurcharge;
      surcharge = Math.max(0, surcharge - marginalRelief);
    }

    return {
      surcharge: Math.round(surcharge),
      surchargeRate,
      marginalRelief: Math.round(marginalRelief)
    };
  },

  // Calculate Old Regime Basic Tax before 87A and Cess
  calculateOldBasicTax(taxableIncome, ageCategory = '<60') {
    let exemptionLimit = 250000;
    if (ageCategory === '60-79') exemptionLimit = 300000;
    else if (ageCategory === '80+') exemptionLimit = 500000;

    const slabBreakdown = [];
    let remainingIncome = taxableIncome;
    let basicTax = 0;

    // Slab 1: Up to Exemption Limit
    const slab1Amount = Math.min(remainingIncome, exemptionLimit);
    slabBreakdown.push({
      slab: `0 to ₹${(exemptionLimit / 100000).toFixed(1)} Lakhs`,
      rate: '0%',
      taxableAmount: Math.max(0, slab1Amount),
      tax: 0
    });
    remainingIncome -= slab1Amount;

    // Slab 2: Exemption Limit to 5 Lakhs (5%)
    if (exemptionLimit < 500000) {
      const slab2Cap = 500000 - exemptionLimit;
      const slab2Amount = Math.max(0, Math.min(remainingIncome, slab2Cap));
      const slab2Tax = slab2Amount * 0.05;
      basicTax += slab2Tax;
      slabBreakdown.push({
        slab: `₹${(exemptionLimit / 100000).toFixed(1)}L to ₹5.0 Lakhs`,
        rate: '5%',
        taxableAmount: slab2Amount,
        tax: slab2Tax
      });
      remainingIncome -= slab2Amount;
    }

    // Slab 3: 5 Lakhs to 10 Lakhs (20%)
    const slab3Cap = 500000; // 10L - 5L
    const slab3Amount = Math.max(0, Math.min(remainingIncome, slab3Cap));
    const slab3Tax = slab3Amount * 0.20;
    basicTax += slab3Tax;
    slabBreakdown.push({
      slab: '₹5.0L to ₹10.0 Lakhs',
      rate: '20%',
      taxableAmount: slab3Amount,
      tax: slab3Tax
    });
    remainingIncome -= slab3Amount;

    // Slab 4: Above 10 Lakhs (30%)
    const slab4Amount = Math.max(0, remainingIncome);
    const slab4Tax = slab4Amount * 0.30;
    basicTax += slab4Tax;
    slabBreakdown.push({
      slab: 'Above ₹10.0 Lakhs',
      rate: '30%',
      taxableAmount: slab4Amount,
      tax: slab4Tax
    });

    return { basicTax, slabBreakdown };
  },

  // Calculate New Regime Basic Tax before 87A and Cess
  calculateNewBasicTax(taxableIncome, fy = '2024-25') {
    const slabBreakdown = [];
    let remainingIncome = taxableIncome;
    let basicTax = 0;

    if (fy === '2023-24') {
      const slabs = [
        { label: '0 to ₹3 Lakhs', cap: 300000, rate: 0 },
        { label: '₹3L to ₹6 Lakhs', cap: 300000, rate: 0.05 },
        { label: '₹6L to ₹9 Lakhs', cap: 300000, rate: 0.10 },
        { label: '₹9L to ₹12 Lakhs', cap: 300000, rate: 0.15 },
        { label: '₹12L to ₹15 Lakhs', cap: 300000, rate: 0.20 },
        { label: 'Above ₹15 Lakhs', cap: Infinity, rate: 0.30 }
      ];

      for (const s of slabs) {
        if (remainingIncome <= 0) {
          slabBreakdown.push({ slab: s.label, rate: `${s.rate * 100}%`, taxableAmount: 0, tax: 0 });
          continue;
        }
        const amt = s.cap === Infinity ? remainingIncome : Math.min(remainingIncome, s.cap);
        const tax = amt * s.rate;
        basicTax += tax;
        slabBreakdown.push({ slab: s.label, rate: `${s.rate * 100}%`, taxableAmount: amt, tax });
        remainingIncome -= amt;
      }
    } else {
      // FY 2024-25 & FY 2025-26 Revised Slabs (Union Budget July 2024):
      const slabs = [
        { label: '0 to ₹3 Lakhs', cap: 300000, rate: 0 },
        { label: '₹3L to ₹7 Lakhs', cap: 400000, rate: 0.05 },
        { label: '₹7L to ₹10 Lakhs', cap: 300000, rate: 0.10 },
        { label: '₹10L to ₹12 Lakhs', cap: 200000, rate: 0.15 },
        { label: '₹12L to ₹15 Lakhs', cap: 300000, rate: 0.20 },
        { label: 'Above ₹15 Lakhs', cap: Infinity, rate: 0.30 }
      ];

      for (const s of slabs) {
        if (remainingIncome <= 0) {
          slabBreakdown.push({ slab: s.label, rate: `${s.rate * 100}%`, taxableAmount: 0, tax: 0 });
          continue;
        }
        const amt = s.cap === Infinity ? remainingIncome : Math.min(remainingIncome, s.cap);
        const tax = amt * s.rate;
        basicTax += tax;
        slabBreakdown.push({ slab: s.label, rate: `${s.rate * 100}%`, taxableAmount: amt, tax });
        remainingIncome -= amt;
      }
    }

    return { basicTax, slabBreakdown };
  },

  // Full Calculation for Old Tax Regime
  calculateOldRegime(params) {
    const {
      grossSalary = 0,
      exemptionsSection10 = 0,
      standardDeduction = 50000,
      professionalTax = 0,
      housePropertyIncome = 0,
      otherIncome = 0,
      deductions80C = 0,
      deductions80CCD1B = 0,
      deductions80CCD2 = 0,
      deductions80D = 0,
      deductions80E = 0,
      deductions80G = 0,
      deductions80TTA = 0,
      otherDeductions = 0,
      ageCategory = '<60',
      isSalaried = true
    } = params;

    const applicableStdDeduction = isSalaried ? Math.min(grossSalary, standardDeduction) : 0;
    const salaryDeductions = Math.min(grossSalary, applicableStdDeduction + exemptionsSection10 + professionalTax);
    const netSalaryIncome = Math.max(0, grossSalary - salaryDeductions);

    // Set off loss from house property capped at ₹2,00,000
    const clampedHPIncome = Math.max(-200000, housePropertyIncome);
    const grossTotalIncome = Math.max(0, netSalaryIncome + clampedHPIncome + otherIncome);

    const capped80C = Math.min(150000, Math.max(0, deductions80C));
    const capped80CCD1B = Math.min(50000, Math.max(0, deductions80CCD1B));
    const capped80D = Math.max(0, deductions80D);
    const capped80TTA = ageCategory === '<60' ? Math.min(10000, deductions80TTA) : Math.min(50000, deductions80TTA);

    const totalChapterVIA = capped80C + capped80CCD1B + deductions80CCD2 + capped80D +
      deductions80E + deductions80G + capped80TTA + otherDeductions;

    const eligibleDeductions = Math.min(grossTotalIncome, totalChapterVIA);
    const taxableIncome = Math.max(0, grossTotalIncome - eligibleDeductions);

    const { basicTax, slabBreakdown } = this.calculateOldBasicTax(taxableIncome, ageCategory);

    // Section 87A Rebate for Old Regime (taxable income <= 5,00,000)
    let rebate87A = 0;
    if (taxableIncome <= 500000) {
      rebate87A = Math.min(basicTax, 12500);
    }
    const taxAfterRebate = Math.max(0, basicTax - rebate87A);

    const { surcharge, surchargeRate, marginalRelief } = this.calculateOldSurcharge(taxableIncome, taxAfterRebate);
    const cess = (taxAfterRebate + surcharge) * 0.04;
    const totalTax = Math.round(taxAfterRebate + surcharge + cess);

    return {
      regime: 'Old Regime',
      originalParams: params,
      grossSalary,
      standardDeduction: applicableStdDeduction,
      exemptionsSection10,
      professionalTax,
      netSalaryIncome,
      housePropertyIncome: clampedHPIncome,
      otherIncome,
      grossTotalIncome,
      totalDeductions: eligibleDeductions + salaryDeductions,
      salaryDeductions,
      chapterVIADeductions: eligibleDeductions,
      taxableIncome,
      basicTax,
      slabBreakdown,
      rebate87A,
      taxAfterRebate,
      surcharge,
      surchargeRate,
      marginalRelief,
      cess: Math.round(cess),
      totalTax,
      effectiveTaxRate: grossTotalIncome > 0 ? ((totalTax / grossTotalIncome) * 100).toFixed(2) : '0.00'
    };
  },

  // Full Calculation for New Tax Regime
  calculateNewRegime(params) {
    const {
      grossSalary = 0,
      otherIncome = 0,
      deductions80CCD2 = 0,
      fy = '2024-25',
      isSalaried = true
    } = params;

    let standardDeduction = 0;
    if (isSalaried) {
      standardDeduction = (fy === '2023-24') ? 50000 : 75000;
      standardDeduction = Math.min(grossSalary, standardDeduction);
    }

    const netSalaryIncome = Math.max(0, grossSalary - standardDeduction);
    const grossTotalIncome = netSalaryIncome + (otherIncome || 0);

    const eligibleDeductions = Math.min(grossTotalIncome, deductions80CCD2 || 0);
    const taxableIncome = Math.max(0, grossTotalIncome - eligibleDeductions);

    const { basicTax, slabBreakdown } = this.calculateNewBasicTax(taxableIncome, fy);

    let rebate87A = 0;
    let marginalRelief87A = 0;
    let taxAfterRebate = basicTax;

    // 87A rebate & marginal relief under New Regime
    if (taxableIncome <= 700000) {
      rebate87A = basicTax;
      taxAfterRebate = 0;
    } else {
      const excessIncome = taxableIncome - 700000;
      if (basicTax > excessIncome) {
        marginalRelief87A = basicTax - excessIncome;
        taxAfterRebate = excessIncome;
      }
    }

    const { surcharge, surchargeRate, marginalRelief: surchargeRelief } = this.calculateNewSurcharge(taxableIncome, taxAfterRebate, fy);
    const cess = (taxAfterRebate + surcharge) * 0.04;
    const totalTax = Math.round(taxAfterRebate + surcharge + cess);

    return {
      regime: 'New Regime',
      originalParams: params,
      grossSalary,
      standardDeduction,
      exemptionsSection10: 0,
      professionalTax: 0,
      netSalaryIncome,
      housePropertyIncome: 0,
      otherIncome,
      grossTotalIncome,
      totalDeductions: standardDeduction + eligibleDeductions,
      salaryDeductions: standardDeduction,
      chapterVIADeductions: eligibleDeductions,
      taxableIncome,
      basicTax,
      slabBreakdown,
      rebate87A,
      marginalRelief87A,
      taxAfterRebate,
      surcharge,
      surchargeRate,
      marginalRelief: surchargeRelief,
      cess: Math.round(cess),
      totalTax,
      effectiveTaxRate: grossTotalIncome > 0 ? ((totalTax / grossTotalIncome) * 100).toFixed(2) : '0.00'
    };
  },

  // Calculate Break-Even Deductions for Old Regime to match New Regime
  calculateBreakEven(oldResult, newResult) {
    const taxDiff = oldResult.totalTax - newResult.totalTax;
    if (taxDiff <= 0) {
      return {
        isOldBetter: true,
        taxSaved: Math.abs(taxDiff),
        additionalDeductionsNeeded: 0
      };
    }

    let low = 0;
    let high = 2500000;
    let additionalDeductionsNeeded = high;
    const baseParams = { ...oldResult.originalParams };

    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      const testParams = {
        ...baseParams,
        otherDeductions: (baseParams.otherDeductions || 0) + mid
      };
      const simOld = this.calculateOldRegime(testParams);
      if (simOld.totalTax <= newResult.totalTax) {
        additionalDeductionsNeeded = mid;
        high = mid;
      } else {
        low = mid;
      }
    }

    return {
      isOldBetter: false,
      taxSaved: taxDiff,
      additionalDeductionsNeeded: Math.round(additionalDeductionsNeeded)
    };
  },

  // Calculate Monthly Take Home Salary
  calculateMonthlyTakeHome(grossAnnualSalary, annualTax, annualPF = 0, annualPT = 0) {
    const monthlyGross = grossAnnualSalary / 12;
    const monthlyTDS = annualTax / 12;
    const monthlyPF = annualPF / 12;
    const monthlyPT = annualPT / 12;
    const monthlyTakeHome = Math.max(0, monthlyGross - monthlyTDS - monthlyPF - monthlyPT);

    return {
      monthlyGross: Math.round(monthlyGross),
      monthlyTDS: Math.round(monthlyTDS),
      monthlyPF: Math.round(monthlyPF),
      monthlyPT: Math.round(monthlyPT),
      monthlyTakeHome: Math.round(monthlyTakeHome)
    };
  }
};

/**
 * UI Controller & Event Handlers
 */
const App = {
  isMetroCity: true,
  isPayingRent: true,

  init() {
    this.bindEvents();
    this.loadSavedScenario();
    this.calculate();
  },

  bindEvents() {
    // Collect all input elements
    const inputs = document.querySelectorAll('input[type="number"], select, input[type="checkbox"]');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.calculate());
      input.addEventListener('change', () => this.calculate());
    });

    // City Metro / Non-Metro toggles
    const btnMetro = document.getElementById('btn-city-metro');
    const btnNonMetro = document.getElementById('btn-city-nonmetro');
    if (btnMetro && btnNonMetro) {
      btnMetro.addEventListener('click', () => {
        this.isMetroCity = true;
        btnMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-brand-500 bg-brand-50 text-brand-700 transition flex items-center justify-center gap-1.5';
        btnNonMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5';
        this.calculate();
      });

      btnNonMetro.addEventListener('click', () => {
        this.isMetroCity = false;
        btnNonMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-brand-500 bg-brand-50 text-brand-700 transition flex items-center justify-center gap-1.5';
        btnMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5';
        this.calculate();
      });
    }

    // Toggle Paying Rent
    const toggleRent = document.getElementById('toggle-paying-rent');
    if (toggleRent) {
      toggleRent.addEventListener('change', (e) => {
        this.isPayingRent = e.target.checked;
        const rentInput = document.getElementById('input-rent-paid');
        if (rentInput) {
          rentInput.disabled = !this.isPayingRent;
          rentInput.classList.toggle('opacity-50', !this.isPayingRent);
        }
        this.calculate();
      });
    }

    // Toggle Slabs Accordion
    const btnToggleSlabs = document.getElementById('btn-toggle-slabs');
    const containerSlabs = document.getElementById('container-slabs');
    const arrowSlabs = document.getElementById('arrow-slabs');
    if (btnToggleSlabs && containerSlabs && arrowSlabs) {
      btnToggleSlabs.addEventListener('click', () => {
        const isHidden = containerSlabs.classList.contains('hidden');
        containerSlabs.classList.toggle('hidden', !isHidden);
        arrowSlabs.classList.toggle('rotate-180', isHidden);
      });
    }

    // Preset buttons
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.getAttribute('data-preset');
        this.loadPreset(preset);
      });
    });

    // Reset button
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Reset all income and deduction values to default?')) {
          this.loadPreset('mid');
          localStorage.removeItem('bharattax_saved_scenario');
        }
      });
    }

    // Save scenario button
    const btnSave = document.getElementById('btn-save-scenario');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.saveScenario();
        btnSave.innerHTML = `<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span class="text-emerald-700 font-semibold">Saved!</span>`;
        setTimeout(() => {
          btnSave.innerHTML = `<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg><span class="hidden md:inline">Save Data</span>`;
        }, 2000);
      });
    }

    // Print button
    const btnPrint = document.getElementById('btn-print-report');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const printTime = document.getElementById('print-timestamp');
        if (printTime) printTime.textContent = `Generated on: ${dateStr}`;
        window.print();
      });
    }
  },

  // Read all inputs into a clean data object
  getInputs() {
    const getVal = (id) => parseFloat(document.getElementById(id)?.value) || 0;

    const basic = getVal('input-basic');
    const da = getVal('input-da');
    const hraReceived = getVal('input-hra-received');
    const specialAllowance = getVal('input-special-allowance');
    const bonus = getVal('input-bonus');
    const otherAllowance = getVal('input-other-allowance');
    const grossSalary = basic + da + hraReceived + specialAllowance + bonus + otherAllowance;

    const rentPaid = this.isPayingRent ? getVal('input-rent-paid') : 0;
    const homeLoanInterest = getVal('input-home-loan-interest');
    const savingsInterest = getVal('input-savings-interest');
    const fdInterest = getVal('input-fd-interest');
    const miscIncome = getVal('input-other-income');
    const otherIncome = savingsInterest + fdInterest + miscIncome;

    const epf = getVal('input-epf');
    const other80c = getVal('input-80c-other');
    const deductions80C = epf + other80c;
    const deductions80CCD1B = getVal('input-80ccd1b');
    const deductions80CCD2 = getVal('input-80ccd2');
    const deductions80DSelf = getVal('input-80d-self');
    const deductions80DParents = getVal('input-80d-parents');
    const deductions80D = deductions80DSelf + deductions80DParents;
    const deductions80E = getVal('input-80e');
    const professionalTax = getVal('input-professional-tax');

    const fy = document.getElementById('fy-select')?.value || '2024-25';
    const ageCategory = document.getElementById('age-select')?.value || '<60';
    const isSalaried = document.getElementById('is-salaried')?.checked ?? true;

    return {
      basic,
      da,
      hraReceived,
      specialAllowance,
      bonus,
      otherAllowance,
      grossSalary,
      rentPaid,
      homeLoanInterest,
      savingsInterest,
      fdInterest,
      miscIncome,
      otherIncome,
      epf,
      other80c,
      deductions80C,
      deductions80CCD1B,
      deductions80CCD2,
      deductions80DSelf,
      deductions80DParents,
      deductions80D,
      deductions80E,
      deductions80TTA: savingsInterest,
      professionalTax,
      fy,
      ageCategory,
      isSalaried
    };
  },

  calculate() {
    const data = this.getInputs();

    // 1. Update currency word labels on inputs
    this.updateInputBadges(data);

    // 2. Calculate HRA Exemption
    const hraResult = TaxEngine.calculateHRA(
      data.basic,
      data.da,
      data.hraReceived,
      data.rentPaid,
      this.isMetroCity
    );
    this.renderHRA(hraResult);

    // 3. Update 80C Progress Bar
    this.render80CProgress(data.deductions80C);

    // 4. Calculate Old Tax Regime
    const oldParams = {
      grossSalary: data.grossSalary,
      exemptionsSection10: hraResult.exemptHRA,
      standardDeduction: 50000,
      professionalTax: data.professionalTax,
      housePropertyIncome: -Math.min(200000, data.homeLoanInterest),
      otherIncome: data.otherIncome,
      deductions80C: data.deductions80C,
      deductions80CCD1B: data.deductions80CCD1B,
      deductions80CCD2: data.deductions80CCD2,
      deductions80D: data.deductions80D,
      deductions80E: data.deductions80E,
      deductions80TTA: data.deductions80TTA,
      ageCategory: data.ageCategory,
      isSalaried: data.isSalaried
    };
    const oldResult = TaxEngine.calculateOldRegime(oldParams);

    // 5. Calculate New Tax Regime
    const newParams = {
      grossSalary: data.grossSalary,
      otherIncome: data.otherIncome,
      deductions80CCD2: data.deductions80CCD2,
      fy: data.fy,
      isSalaried: data.isSalaried
    };
    const newResult = TaxEngine.calculateNewRegime(newParams);

    // 6. Calculate Break-Even
    const breakEven = TaxEngine.calculateBreakEven(oldResult, newResult);

    // 7. Render Comparison & Cards
    this.renderComparison(oldResult, newResult, breakEven, data);

    // 8. Render Monthly In-Hand Salary
    this.renderMonthlyTakeHome(oldResult, newResult, data);

    // 9. Render Slab breakdown tables
    this.renderSlabTables(oldResult, newResult);

    // 10. Render Visual Chart
    this.renderVisualChart(oldResult, newResult, data);

    // 11. Render Tax Optimization Insights
    this.renderOptimizationInsights(data, oldResult, newResult, breakEven);
  },

  updateInputBadges(d) {
    const setBadge = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = TaxEngine.formatWords(val) || TaxEngine.formatINR(val);
    };

    setBadge('words-basic', d.basic);
    setBadge('words-da', d.da);
    setBadge('words-hra-received', d.hraReceived);
    setBadge('words-special-allowance', d.specialAllowance);
    setBadge('words-bonus', d.bonus);
    setBadge('words-other-allowance', d.otherAllowance);
    setBadge('words-rent-paid', d.rentPaid);
    setBadge('words-home-loan', d.homeLoanInterest);
    setBadge('words-savings-interest', d.savingsInterest);
    setBadge('words-fd-interest', d.fdInterest);
    setBadge('words-other-income', d.miscIncome);
    setBadge('words-epf', d.epf);
    setBadge('words-80c-other', d.other80c);
    setBadge('words-80ccd1b', d.deductions80CCD1B);
    setBadge('words-80ccd2', d.deductions80CCD2);
    setBadge('words-80d-self', d.deductions80DSelf);
    setBadge('words-80d-parents', d.deductions80DParents);
    setBadge('words-80e', d.deductions80E);
    setBadge('words-pt', d.professionalTax);

    const grossEl = document.getElementById('display-gross-salary');
    if (grossEl) {
      grossEl.textContent = `${TaxEngine.formatINR(d.grossSalary)} ${TaxEngine.formatWords(d.grossSalary)}`;
    }
  },

  renderHRA(res) {
    const badge = document.getElementById('hra-exempt-badge');
    const r1 = document.getElementById('hra-rule-1');
    const r2 = document.getElementById('hra-rule-2');
    const r3 = document.getElementById('hra-rule-3');

    if (badge) badge.textContent = `Exempt: ${TaxEngine.formatINR(res.exemptHRA)}`;
    if (r1) r1.textContent = TaxEngine.formatINR(res.rule1Actual);
    if (r2) r2.textContent = TaxEngine.formatINR(res.rule2RentMinusTenPct);
    if (r3) r3.textContent = TaxEngine.formatINR(res.rule3SalaryPct);
  },

  render80CProgress(totalInvested) {
    const display = document.getElementById('display-total-80c');
    const progress = document.getElementById('progress-80c');
    const capped = Math.min(150000, totalInvested);
    const pct = Math.min(100, Math.round((totalInvested / 150000) * 100));

    if (display) {
      display.textContent = `${TaxEngine.formatINR(capped)} / ₹1.5L (${pct}%)`;
    }
    if (progress) {
      progress.style.width = `${pct}%`;
      progress.className = pct >= 100 ? 'bg-emerald-500 h-2 rounded-full transition-all duration-300' : 'bg-indigo-600 h-2 rounded-full transition-all duration-300';
    }
  },

  renderComparison(oldR, newR, breakEven, d) {
    // 1. Update Old Regime Card
    document.getElementById('old-gross').textContent = TaxEngine.formatINR(oldR.grossTotalIncome);
    document.getElementById('old-deductions').textContent = `-${TaxEngine.formatINR(oldR.totalDeductions)}`;
    document.getElementById('old-taxable').textContent = TaxEngine.formatINR(oldR.taxableIncome);
    document.getElementById('old-rebate').textContent = TaxEngine.formatINR(oldR.rebate87A);
    document.getElementById('old-cess').textContent = TaxEngine.formatINR(oldR.cess + oldR.surcharge);
    document.getElementById('old-total-tax').textContent = TaxEngine.formatINR(oldR.totalTax);
    document.getElementById('old-effective-rate').textContent = `${oldR.effectiveTaxRate}%`;

    // 2. Update New Regime Card
    document.getElementById('new-gross').textContent = TaxEngine.formatINR(newR.grossTotalIncome);
    document.getElementById('new-deductions').textContent = `-${TaxEngine.formatINR(newR.totalDeductions)}`;
    document.getElementById('new-taxable').textContent = TaxEngine.formatINR(newR.taxableIncome);
    document.getElementById('new-rebate').textContent = TaxEngine.formatINR(newR.rebate87A + (newR.marginalRelief87A || 0));
    document.getElementById('new-cess').textContent = TaxEngine.formatINR(newR.cess + newR.surcharge);
    document.getElementById('new-total-tax').textContent = TaxEngine.formatINR(newR.totalTax);
    document.getElementById('new-effective-rate').textContent = `${newR.effectiveTaxRate}%`;

    // 3. Winner Hero Card
    const heroCard = document.getElementById('winner-hero-card');
    const winnerTag = document.getElementById('winner-tag');
    const winnerTitle = document.getElementById('winner-title');
    const winnerSubtitle = document.getElementById('winner-subtitle');
    const breakEvenText = document.getElementById('break-even-text');
    const cardOld = document.getElementById('card-old-regime');
    const cardNew = document.getElementById('card-new-regime');
    const printWinner = document.getElementById('print-winner-badge');

    // Remove prior glow classes
    cardOld.classList.remove('winner-glow-blue', 'winner-glow-green');
    cardNew.classList.remove('winner-glow-blue', 'winner-glow-green');

    if (newR.totalTax < oldR.totalTax) {
      const diff = oldR.totalTax - newR.totalTax;
      heroCard.className = 'rounded-2xl p-6 text-white bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 shadow-lg relative overflow-hidden transition-all duration-300';
      winnerTag.textContent = '🎉 Recommended Regime';
      winnerTag.className = 'px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20';
      winnerTitle.textContent = `New Tax Regime Saves You ${TaxEngine.formatINR(diff)}`;
      winnerSubtitle.textContent = `Under New Regime (Revised Budget 2024 slabs & ₹75k Standard Deduction), you pay ${TaxEngine.formatINR(newR.totalTax)} vs ${TaxEngine.formatINR(oldR.totalTax)} in Old Regime.`;
      cardNew.classList.add('winner-glow-green');

      if (printWinner) printWinner.textContent = `New Regime Saves ${TaxEngine.formatINR(diff)}`;

      if (breakEven.additionalDeductionsNeeded > 0) {
        breakEvenText.innerHTML = `<strong>Break-even Insight:</strong> To make the Old Regime equal to New Regime, you would need an additional <strong>${TaxEngine.formatINR(breakEven.additionalDeductionsNeeded)}</strong> in eligible deductions (e.g. HRA, 80C, 80D, or Home Loan interest).`;
      } else {
        breakEvenText.innerHTML = `<strong>Break-even Insight:</strong> Even with extreme deductions, New Regime's low slab rates provide maximum tax efficiency at this income level.`;
      }

    } else if (oldR.totalTax < newR.totalTax) {
      const diff = newR.totalTax - oldR.totalTax;
      heroCard.className = 'rounded-2xl p-6 text-white bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 shadow-lg relative overflow-hidden transition-all duration-300';
      winnerTag.textContent = '🏆 Recommended Regime';
      winnerTag.className = 'px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20';
      winnerTitle.textContent = `Old Tax Regime Saves You ${TaxEngine.formatINR(diff)}`;
      winnerSubtitle.textContent = `Your high deductions (HRA ₹${Math.round(oldR.exemptionsSection10 / 1000)}k, 80C ₹${Math.round(oldR.chapterVIADeductions / 1000)}k, etc.) make the Old Regime superior.`;
      cardOld.classList.add('winner-glow-blue');

      if (printWinner) printWinner.textContent = `Old Regime Saves ${TaxEngine.formatINR(diff)}`;
      breakEvenText.innerHTML = `<strong>Smart Insight:</strong> You are currently claiming <strong>${TaxEngine.formatINR(oldR.totalDeductions)}</strong> in total exemptions and deductions, saving you <strong>${TaxEngine.formatINR(diff)}</strong> over the New Regime.`;

    } else {
      heroCard.className = 'rounded-2xl p-6 text-white bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg relative overflow-hidden transition-all duration-300';
      winnerTag.textContent = '⚖️ Equal Tax';
      winnerTitle.textContent = `Both Regimes Pay Equal Tax (${TaxEngine.formatINR(newR.totalTax)})`;
      winnerSubtitle.textContent = `You can opt for the New Tax Regime for simpler compliance without needing investment proof submissions.`;
      breakEvenText.innerHTML = `<strong>Recommendation:</strong> Choose the New Regime for zero paperwork hassle.`;
      if (printWinner) printWinner.textContent = `Both Regimes Equal (${TaxEngine.formatINR(newR.totalTax)})`;
    }
  },

  renderMonthlyTakeHome(oldR, newR, d) {
    const isNewBetter = newR.totalTax <= oldR.totalTax;
    const activeTax = isNewBetter ? newR.totalTax : oldR.totalTax;
    const activeRegimeName = isNewBetter ? 'New Regime' : 'Old Regime';

    const th = TaxEngine.calculateMonthlyTakeHome(d.grossSalary, activeTax, d.epf, d.professionalTax);
    const otherTax = isNewBetter ? oldR.totalTax : newR.totalTax;
    const monthlyDiff = Math.round(Math.abs(oldR.totalTax - newR.totalTax) / 12);

    document.getElementById('takehome-active-regime').textContent = `${activeRegimeName} In-Hand`;
    document.getElementById('monthly-inhand-pay').textContent = TaxEngine.formatINR(th.monthlyTakeHome);
    document.getElementById('monthly-gross').textContent = TaxEngine.formatINR(th.monthlyGross);
    document.getElementById('monthly-tds').textContent = `-${TaxEngine.formatINR(th.monthlyTDS)}`;
    document.getElementById('monthly-epf-pt').textContent = `-${TaxEngine.formatINR(th.monthlyPF + th.monthlyPT)}`;

    const diffBadge = document.getElementById('monthly-diff-badge');
    if (monthlyDiff > 0) {
      diffBadge.textContent = `+${TaxEngine.formatINR(monthlyDiff)} / mo extra`;
      diffBadge.classList.remove('hidden');
    } else {
      diffBadge.textContent = `Zero Tax Difference`;
    }
  },

  renderSlabTables(oldR, newR) {
    const newTbody = document.getElementById('tbody-new-slabs');
    const oldTbody = document.getElementById('tbody-old-slabs');

    if (newTbody) {
      newTbody.innerHTML = newR.slabBreakdown.map(s => `
        <tr class="hover:bg-slate-50">
          <td class="py-1 px-2 font-medium">${s.slab}</td>
          <td class="py-1 px-2 text-slate-500">${s.rate}</td>
          <td class="py-1 px-2 text-right">${TaxEngine.formatINR(s.taxableAmount)}</td>
          <td class="py-1 px-2 text-right font-semibold">${TaxEngine.formatINR(s.tax)}</td>
        </tr>
      `).join('');
    }

    if (oldTbody) {
      oldTbody.innerHTML = oldR.slabBreakdown.map(s => `
        <tr class="hover:bg-slate-50">
          <td class="py-1 px-2 font-medium">${s.slab}</td>
          <td class="py-1 px-2 text-slate-500">${s.rate}</td>
          <td class="py-1 px-2 text-right">${TaxEngine.formatINR(s.taxableAmount)}</td>
          <td class="py-1 px-2 text-right font-semibold">${TaxEngine.formatINR(s.tax)}</td>
        </tr>
      `).join('');
    }
  },

  renderVisualChart(oldR, newR, d) {
    const gross = d.grossSalary + d.otherIncome;
    if (gross <= 0) return;

    const isNewBetter = newR.totalTax <= oldR.totalTax;
    const tax = isNewBetter ? newR.totalTax : oldR.totalTax;
    const th = TaxEngine.calculateMonthlyTakeHome(d.grossSalary, tax, d.epf, d.professionalTax);
    const annualTakeHome = th.monthlyTakeHome * 12;
    const annualDeductions = Math.max(0, gross - annualTakeHome - tax);

    const takeHomePct = Math.max(0, Math.min(100, (annualTakeHome / gross) * 100));
    const taxPct = Math.max(0, Math.min(100, (tax / gross) * 100));
    const dedPct = Math.max(0, Math.min(100, 100 - takeHomePct - taxPct));

    // Circumference = 2 * PI * r = 2 * 3.14159 * 40 = 251.327
    const circ = 251.327;
    const takeHomeDash = (takeHomePct / 100) * circ;
    const taxDash = (taxPct / 100) * circ;
    const dedDash = (dedPct / 100) * circ;

    const elTakeHome = document.getElementById('chart-takehome');
    const elTax = document.getElementById('chart-tax');
    const elDeductions = document.getElementById('chart-deductions');
    const elCenter = document.getElementById('chart-center-pct');

    if (elTakeHome) {
      elTakeHome.style.strokeDasharray = `${takeHomeDash} ${circ}`;
      elTakeHome.style.strokeDashoffset = '0';
    }
    if (elTax) {
      elTax.style.strokeDasharray = `${taxDash} ${circ}`;
      elTax.style.strokeDashoffset = `-${takeHomeDash}`;
    }
    if (elDeductions) {
      elDeductions.style.strokeDasharray = `${dedDash} ${circ}`;
      elDeductions.style.strokeDashoffset = `-${takeHomeDash + taxDash}`;
    }
    if (elCenter) {
      elCenter.textContent = `${Math.round(takeHomePct)}%`;
    }

    // Update legend
    document.getElementById('legend-takehome').textContent = TaxEngine.formatINR(annualTakeHome);
    document.getElementById('legend-tax').textContent = TaxEngine.formatINR(tax);
    document.getElementById('legend-deductions').textContent = TaxEngine.formatINR(annualDeductions);
  },

  renderOptimizationInsights(d, oldR, newR, breakEven) {
    const list = document.getElementById('recommendations-list');
    if (!list) return;

    const insights = [];

    // 1. Zero Tax Threshold Alert
    if (newR.totalTax === 0 && d.grossSalary > 0) {
      insights.push(`🎉 <strong>Zero Tax Liability!</strong> Your taxable income falls within the ₹7 Lakhs threshold under the New Tax Regime, giving you a 100% tax rebate under Section 87A.`);
    }

    // 2. Unutilized 80C
    const unutilized80C = 150000 - Math.min(150000, d.deductions80C);
    if (unutilized80C > 5000 && oldR.totalTax > 0) {
      const taxSavingPotential = Math.round(unutilized80C * 0.312); // top bracket estimate
      insights.push(`💡 <strong>Section 80C:</strong> You still have <strong>${TaxEngine.formatINR(unutilized80C)}</strong> unutilized headroom. Investing in PPF, ELSS, or EPF can save up to ~${TaxEngine.formatINR(taxSavingPotential)} in the Old Regime.`);
    }

    // 3. Section 80CCD(1B) NPS ₹50k
    if (d.deductions80CCD1B < 50000 && oldR.totalTax > 0) {
      const room = 50000 - d.deductions80CCD1B;
      insights.push(`💡 <strong>NPS Sec 80CCD(1B):</strong> Investing an additional <strong>${TaxEngine.formatINR(room)}</strong> in the National Pension System gives an exclusive deduction beyond 80C in the Old Regime.`);
    }

    // 4. Section 80CCD(2) Employer NPS
    if (d.deductions80CCD2 === 0 && d.grossSalary >= 1000000) {
      insights.push(`🌟 <strong>Employer NPS (Sec 80CCD(2)):</strong> Did you know? Corporate NPS contributions up to 14% of Basic Salary are tax-deductible in <strong>BOTH New and Old regimes</strong>. Ask your HR/company!`);
    }

    // 5. Section 80D Health Insurance
    if (d.deductions80DSelf === 0) {
      insights.push(`💡 <strong>Health Insurance (Sec 80D):</strong> Health insurance premiums up to ₹25,000 for self/family (and ₹50,000 for senior parents) are eligible for Old Regime deduction.`);
    }

    // 6. Regime Selection Strategy
    if (newR.totalTax < oldR.totalTax) {
      insights.push(`✅ <strong>Strategic Choice:</strong> New Regime is your clear winner with ${TaxEngine.formatINR(oldR.totalTax - newR.totalTax)} saved. You also avoid collecting rent receipts and proof submissions.`);
    } else if (oldR.totalTax < newR.totalTax) {
      insights.push(`✅ <strong>Strategic Choice:</strong> Maintain documentation for your HRA and 80C investments to successfully claim ${TaxEngine.formatINR(newR.totalTax - oldR.totalTax)} tax savings under Old Regime.`);
    }

    list.innerHTML = insights.map(tip => `<li class="flex items-start gap-2"><span class="text-amber-500 font-bold shrink-0">•</span><span>${tip}</span></li>`).join('');
  },

  loadPreset(preset) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    if (preset === 'fresher') {
      setVal('input-basic', 420000);
      setVal('input-da', 0);
      setVal('input-hra-received', 180000);
      setVal('input-special-allowance', 100000);
      setVal('input-bonus', 50000);
      setVal('input-other-allowance', 0);
      setVal('input-rent-paid', 120000);
      setVal('input-home-loan-interest', 0);
      setVal('input-savings-interest', 5000);
      setVal('input-fd-interest', 0);
      setVal('input-other-income', 0);
      setVal('input-epf', 50400);
      setVal('input-80c-other', 20000);
      setVal('input-80ccd1b', 0);
      setVal('input-80ccd2', 0);
      setVal('input-80d-self', 15000);
      setVal('input-80d-parents', 0);
      setVal('input-80e', 0);
      setVal('input-professional-tax', 2400);
    } else if (preset === 'mid') {
      setVal('input-basic', 900000);
      setVal('input-da', 0);
      setVal('input-hra-received', 360000);
      setVal('input-special-allowance', 240000);
      setVal('input-bonus', 100000);
      setVal('input-other-allowance', 0);
      setVal('input-rent-paid', 300000);
      setVal('input-home-loan-interest', 0);
      setVal('input-savings-interest', 8000);
      setVal('input-fd-interest', 0);
      setVal('input-other-income', 0);
      setVal('input-epf', 108000);
      setVal('input-80c-other', 42000);
      setVal('input-80ccd1b', 50000);
      setVal('input-80ccd2', 0);
      setVal('input-80d-self', 25000);
      setVal('input-80d-parents', 0);
      setVal('input-80e', 0);
      setVal('input-professional-tax', 2400);
    } else if (preset === 'lead') {
      setVal('input-basic', 1500000);
      setVal('input-da', 0);
      setVal('input-hra-received', 600000);
      setVal('input-special-allowance', 450000);
      setVal('input-bonus', 250000);
      setVal('input-other-allowance', 0);
      setVal('input-rent-paid', 480000);
      setVal('input-home-loan-interest', 180000);
      setVal('input-savings-interest', 12000);
      setVal('input-fd-interest', 40000);
      setVal('input-other-income', 0);
      setVal('input-epf', 150000);
      setVal('input-80c-other', 50000);
      setVal('input-80ccd1b', 50000);
      setVal('input-80ccd2', 120000);
      setVal('input-80d-self', 25000);
      setVal('input-80d-parents', 50000);
      setVal('input-80e', 0);
      setVal('input-professional-tax', 2500);
    } else if (preset === 'executive') {
      setVal('input-basic', 3000000);
      setVal('input-da', 0);
      setVal('input-hra-received', 1200000);
      setVal('input-special-allowance', 1200000);
      setVal('input-bonus', 600000);
      setVal('input-other-allowance', 0);
      setVal('input-rent-paid', 720000);
      setVal('input-home-loan-interest', 200000);
      setVal('input-savings-interest', 25000);
      setVal('input-fd-interest', 150000);
      setVal('input-other-income', 50000);
      setVal('input-epf', 150000);
      setVal('input-80c-other', 50000);
      setVal('input-80ccd1b', 50000);
      setVal('input-80ccd2', 300000);
      setVal('input-80d-self', 25000);
      setVal('input-80d-parents', 50000);
      setVal('input-80e', 0);
      setVal('input-professional-tax', 2500);
    }

    this.calculate();
  },

  saveScenario() {
    const inputs = this.getInputs();
    inputs.isMetroCity = this.isMetroCity;
    inputs.isPayingRent = this.isPayingRent;
    try {
      localStorage.setItem('bharattax_saved_scenario', JSON.stringify(inputs));
    } catch (e) {
      console.error('LocalStorage write failed', e);
    }
  },

  loadSavedScenario() {
    try {
      const raw = localStorage.getItem('bharattax_saved_scenario');
      if (!raw) return;
      const s = JSON.parse(raw);

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
      };

      setVal('input-basic', s.basic);
      setVal('input-da', s.da);
      setVal('input-hra-received', s.hraReceived);
      setVal('input-special-allowance', s.specialAllowance);
      setVal('input-bonus', s.bonus);
      setVal('input-other-allowance', s.otherAllowance);
      setVal('input-rent-paid', s.rentPaid);
      setVal('input-home-loan-interest', s.homeLoanInterest);
      setVal('input-savings-interest', s.savingsInterest);
      setVal('input-fd-interest', s.fdInterest);
      setVal('input-other-income', s.miscIncome);
      setVal('input-epf', s.epf);
      setVal('input-80c-other', s.other80c);
      setVal('input-80ccd1b', s.deductions80CCD1B);
      setVal('input-80ccd2', s.deductions80CCD2);
      setVal('input-80d-self', s.deductions80DSelf);
      setVal('input-80d-parents', s.deductions80DParents);
      setVal('input-80e', s.deductions80E);
      setVal('input-professional-tax', s.professionalTax);

      if (s.fy) {
        const fyEl = document.getElementById('fy-select');
        if (fyEl) fyEl.value = s.fy;
      }
      if (s.ageCategory) {
        const ageEl = document.getElementById('age-select');
        if (ageEl) ageEl.value = s.ageCategory;
      }
      if (s.isSalaried !== undefined) {
        const salEl = document.getElementById('is-salaried');
        if (salEl) salEl.checked = s.isSalaried;
      }
      if (s.isMetroCity !== undefined) {
        this.isMetroCity = s.isMetroCity;
        const btnMetro = document.getElementById('btn-city-metro');
        const btnNonMetro = document.getElementById('btn-city-nonmetro');
        if (btnMetro && btnNonMetro) {
          if (this.isMetroCity) {
            btnMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-brand-500 bg-brand-50 text-brand-700 transition flex items-center justify-center gap-1.5';
            btnNonMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5';
          } else {
            btnNonMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-brand-500 bg-brand-50 text-brand-700 transition flex items-center justify-center gap-1.5';
            btnMetro.className = 'city-toggle-btn px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5';
          }
        }
      }
      if (s.isPayingRent !== undefined) {
        this.isPayingRent = s.isPayingRent;
        const toggleRent = document.getElementById('toggle-paying-rent');
        if (toggleRent) toggleRent.checked = this.isPayingRent;
        const rentInput = document.getElementById('input-rent-paid');
        if (rentInput) {
          rentInput.disabled = !this.isPayingRent;
          rentInput.classList.toggle('opacity-50', !this.isPayingRent);
        }
      }
    } catch (e) {
      console.warn('Could not parse saved scenario', e);
    }
  }
};

// Initialize on DOM load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaxEngine, App };
}
