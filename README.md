# BharatTax - Interactive Indian Income Tax Calculator & Optimizer

An interactive single-page web application designed for Indian taxpayers (salaried professionals, consultants, and senior citizens) to calculate end-of-year tax liability, compare the **Old Tax Regime** vs. **New Tax Regime** in real-time, maximize exemptions, and compute monthly in-hand take-home salary.

Updated with the latest **Union Budget (July 2024 revisions)** for **FY 2024-25 (AY 2025-26)** and **FY 2025-26**.

---

## 🚀 How to Run

1. Simply double-click `index.html` to open it in any web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
2. Or serve it locally with Python or Node.js:
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx serve .
   ```
3. Open `http://localhost:8000` in your browser.

---

## 🌟 Key Features

### 1. New Tax Regime (FY 2024-25 & FY 2025-26 Budget Slabs)
- **Standard Deduction**: Hiked to **₹75,000** for salaried employees.
- **Section 87A Tax Rebate**: Nil tax on taxable income up to **₹7,00,000** (meaning salaried individuals earning up to **₹7,75,000** pay **₹0 tax**!).
- **Marginal Relief**: Built-in statutory marginal relief under Section 87A so you don't pay more tax than the excess income above ₹7,00,000.
- **Revised Tax Slabs**:
  - `0 to ₹3,00,000`: Nil (0%)
  - `₹3,00,001 to ₹7,00,000`: 5%
  - `₹7,00,001 to ₹10,00,000`: 10%
  - `₹10,00,001 to ₹12,00,000`: 15%
  - `₹12,00,001 to ₹15,00,000`: 20%
  - `Above ₹15,00,000`: 30%
- **Surcharge Capped at 25%** (vs 37% in Old Regime for >₹5 Cr).
- **Employer NPS (Section 80CCD(2))**: Claimable under New Regime up to 14% of Basic + DA.

### 2. Old Tax Regime with Full Deductions
- **Standard Deduction**: ₹50,000.
- **Section 10(13A) HRA Calculator**: Automatically calculates least of:
  1. Actual HRA received
  2. Rent paid minus 10% of (Basic + DA)
  3. 50% (Metro: Delhi, Mumbai, Kolkata, Chennai) or 40% (Non-Metro) of (Basic + DA)
- **Section 24(b)**: Home loan interest on self-occupied house property (up to ₹2,00,000).
- **Section 80C**: EPF, PPF, ELSS, LIC, Home Loan Principal, Tuition fees (up to ₹1,50,000) with visual progress bar.
- **Section 80CCD(1B)**: Additional NPS employee contribution (up to ₹50,000).
- **Section 80D**: Medical Insurance for Self/Family & Parents (with Senior Citizen limits up to ₹50,000).
- **Section 80E, 80G, 80TTA/80TTB**: Higher education loan, donations, savings interest.

### 3. Real-Time Comparison & Break-Even Analysis
- **Live Side-by-Side Comparison**: Shows Gross Income, Deductions, Net Taxable Income, Rebates, Cess, and Final Tax for both regimes on every keystroke.
- **Break-Even Recommendation**: Dynamically calculates the exact additional eligible deductions needed in Old Regime to break even with the New Regime.
- **Monthly In-Hand Take-Home Pay**: Estimates your monthly paycheck after deducting TDS, EPF, and Professional Tax.
- **Visual Charts**: Interactive SVG donut chart breaking down Gross Income into Net Take-Home, Tax, and Deductions.

### 4. 1-Click Presets & Persistence
- **4 Real-World Presets**:
  - 🎓 Fresher (₹7.5 LPA - 0 Tax)
  - 💼 Mid-Level Software Engineer (₹16 LPA)
  - 🏢 Senior Tech Lead / Manager (₹28 LPA)
  - 👑 Director / Executive (₹60 LPA)
- **Local Storage**: Automatically saves your inputs so refreshing doesn't lose your work.
- **Print / PDF Report**: Formatted printable executive summary (`@media print`).

---

## 📁 File Structure

```
Incomtax_Tool/
├── index.html      # Responsive HTML5 layout with Tailwind CSS
├── app.js          # Tax calculation engine & interactive UI controller
├── styles.css      # Custom styles, glows, animations, and print stylesheets
└── README.md       # Documentation and usage guide
```
