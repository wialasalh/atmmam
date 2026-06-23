"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type ContractType = "fixed" | "indefinite";
type EndReason =
  | "employer"
  | "resignation"
  | "article80"
  | "article81"
  | "unlawful";

const reasonLabels: Record<EndReason, string> = {
  employer: "إنهاء من صاحب العمل",
  resignation: "استقالة",
  article80: "إنهاء بموجب المادة 80",
  article81: "ترك العمل بموجب المادة 81",
  unlawful: "إنهاء دون سبب مشروع (المادة 77)",
};

const ARTICLE_77_CONTRACT_NOTE =
  "إذا نص العقد على تعويض محدد مثل أجر شهرين فقط، فيُحسب التعويض وفق ذلك البند ولا تُحتسب المدة المتبقية.";

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  futureYears?: number;
};

function toNumber(value: string) {
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/٫/g, ".")
    .replace(/[,\s٬،]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function arabicNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(Math.max(0, value));
}

function parseDate(value: string) {
  const [year = "", month = "", day = ""] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function addYears(date: Date, years: number) {
  const result = new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
  if (result.getUTCMonth() !== date.getUTCMonth()) {
    return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth() + 1, 0));
  }
  return result;
}

function diffDays(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
}

function daysBetweenDates(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end <= start) return 0;
  return diffDays(start, end);
}

function yearsBetween(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

  let completedYears = end.getUTCFullYear() - start.getUTCFullYear();
  let lastAnniversary = addYears(start, completedYears);

  if (lastAnniversary > end) {
    completedYears -= 1;
    lastAnniversary = addYears(start, completedYears);
  }

  const nextAnniversary = addYears(start, completedYears + 1);
  const remainingDays = diffDays(lastAnniversary, end);
  const currentServiceYearDays = diffDays(lastAnniversary, nextAnniversary);

  return completedYears + remainingDays / currentServiceYearDays;
}

function endOfServiceBase(years: number, wage: number) {
  const firstFive = Math.min(years, 5);
  const afterFive = Math.max(years - 5, 0);
  return firstFive * (wage / 2) + afterFive * wage;
}

function entitlementFactor(reason: EndReason, years: number) {
  if (reason === "article80") return 0;
  if (reason !== "resignation") return 1;
  if (years < 2) return 0;
  if (years < 5) return 1 / 3;
  if (years < 10) return 2 / 3;
  return 1;
}

function pad(value: string) {
  return value.padStart(2, "0");
}

function dateParts(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return { day, month, year };
}

function buildDateValue(day: string, month: string, year: string) {
  if (!day || !month || !year) return "";
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValid =
    date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
  return isValid ? `${year}-${pad(month)}-${pad(day)}` : "";
}

function buildPartialDateValue(day: string, month: string, year: string) {
  return `${year}-${month}-${day}`;
}

function completeDate(value: string) {
  const { day, month, year } = dateParts(value);
  return buildDateValue(day, month, year);
}

function DateSelectField({ label, value, onChange, futureYears = 0 }: DateFieldProps) {
  const { day, month, year } = dateParts(value);
  const years = Array.from({ length: 81 + futureYears }, (_, index) => String(CURRENT_YEAR + futureYears - index));

  function update(next: Partial<{ day: string; month: string; year: string }>) {
    const nextDay = next.day ?? day;
    const nextMonth = next.month ?? month;
    const nextYear = next.year ?? year;
    onChange(buildPartialDateValue(nextDay, nextMonth, nextYear));
  }

  return (
    <div className="date-select-field" role="group" aria-label={label}>
      <span className="date-select-label">{label}</span>
      <div className="date-selects">
        <div className="date-select-control">
          <select aria-label={`${label} - اليوم`} value={day} onChange={(event) => update({ day: event.target.value })}>
            <option value="">اليوم</option>
            {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((item) => (
              <option value={pad(item)} key={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
        </div>
        <div className="date-select-control is-month">
          <select aria-label={`${label} - الشهر`} value={month} onChange={(event) => update({ month: event.target.value })}>
            <option value="">الشهر</option>
            {MONTHS.map((item, index) => (
              <option value={pad(String(index + 1))} key={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
        </div>
        <div className="date-select-control">
          <select aria-label={`${label} - السنة`} value={year} onChange={(event) => update({ year: event.target.value })}>
            <option value="">السنة</option>
            {years.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
        </div>
      </div>
      <p className="date-select-hint">اختر اليوم ثم الشهر ثم السنة</p>
    </div>
  );
}

export function LaborCalculator() {
  const resultPanelRef = useRef<HTMLElement>(null);
  const [reason, setReason] = useState<EndReason>("employer");
  const [contractType, setContractType] = useState<ContractType>("fixed");
  const [employeeName, setEmployeeName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyWage, setMonthlyWage] = useState("");
  const [remainingVacationDays, setRemainingVacationDays] = useState("");
  const [unpaidDays, setUnpaidDays] = useState("");
  const [hasCompensationClause, setHasCompensationClause] = useState(false);
  const [compensationAmount, setCompensationAmount] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const reviewTicketHref = "/#contact";

  const completedStartDate = completeDate(startDate);
  const completedEndDate = completeDate(endDate);
  const canCalculate = Boolean(completedStartDate && completedEndDate && toNumber(monthlyWage) > 0);
  const shouldShowResult = hasCalculated && canCalculate;
  const clearResult = () => {
    if (!hasCalculated && !formMessage) return;
    setHasCalculated(false);
    setFormMessage("");
  };

  const result = useMemo(() => {
    const wage = toNumber(monthlyWage);
    const completeStartDate = completeDate(startDate);
    const completeEndDate = completeDate(endDate);
    const completeContractEndDate = completeDate(contractEndDate);
    const years = yearsBetween(completeStartDate, completeEndDate);
    const baseReward = endOfServiceBase(years, wage);
    const factor = entitlementFactor(reason, years);
    const endOfService = baseReward * factor;
    const vacationRemaining = toNumber(remainingVacationDays);
    const vacationPay = vacationRemaining * (wage / 30);
    const unpaidWages = toNumber(unpaidDays) * (wage / 30);
    const minimumCompensation = wage * 2;
    const remainingContractDays =
      contractType === "fixed" ? daysBetweenDates(completeEndDate, completeContractEndDate) : 0;
    const remainingContractCompensation = (remainingContractDays / 30) * wage;
    const indefiniteContractCompensation = years * (wage / 2);
    const estimatedCompensation =
      reason !== "unlawful"
        ? 0
        : hasCompensationClause
          ? toNumber(compensationAmount)
          : contractType === "fixed"
            ? Math.max(remainingContractCompensation, minimumCompensation)
            : Math.max(indefiniteContractCompensation, minimumCompensation);
    const total = endOfService + vacationPay + unpaidWages + estimatedCompensation;

    return {
      years,
      endOfService,
      vacationRemaining,
      vacationPay,
      unpaidWages,
      remainingContractDays,
      estimatedCompensation,
      total,
    };
  }, [
    compensationAmount,
    contractEndDate,
    contractType,
    endDate,
    hasCompensationClause,
    monthlyWage,
    reason,
    startDate,
    unpaidDays,
    remainingVacationDays,
  ]);
  const displayMoney = (value: number) => (shouldShowResult ? `${money(value)} ر.س` : "-");
  const displayDays = (value: number) => (shouldShowResult ? `${arabicNumber(value, 1)} يوم` : "-");
  const compensationNeedsAmount = reason === "unlawful" && hasCompensationClause && toNumber(compensationAmount) <= 0;
  const displayCompensation = compensationNeedsAmount && shouldShowResult
    ? "أدخل المبلغ"
    : displayMoney(result.estimatedCompensation);

  function handleCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const completeStartDate = completeDate(startDate);
    const completeEndDate = completeDate(endDate);
    const completeContractEndDate = completeDate(contractEndDate);

    if (!completeStartDate || !completeEndDate || toNumber(monthlyWage) <= 0) {
      setHasCalculated(false);
      setFormMessage("فضلاً أكمل تاريخ بداية العمل، تاريخ نهاية العلاقة، والأجر الشهري الأخير قبل الحساب.");
      return;
    }

    if (new Date(completeEndDate) <= new Date(completeStartDate)) {
      setHasCalculated(false);
      setFormMessage("تاريخ نهاية العلاقة يجب أن يكون بعد تاريخ بداية العمل.");
      return;
    }

    if (
      reason === "unlawful" &&
      contractType === "fixed" &&
      completeContractEndDate &&
      new Date(completeContractEndDate) <= new Date(completeEndDate)
    ) {
      setHasCalculated(false);
      setFormMessage("تاريخ نهاية العقد المحدد يجب أن يكون بعد تاريخ نهاية العلاقة.");
      return;
    }

    setHasCalculated(true);
    if (reason === "unlawful" && hasCompensationClause && toNumber(compensationAmount) <= 0) {
      setFormMessage("تم حساب بقية المستحقات. أدخل مبلغ التعويض المذكور في العقد لإضافته إلى الإجمالي.");
    } else if (reason === "unlawful" && contractType === "fixed" && !completeContractEndDate) {
      setFormMessage("تم الحساب مبدئيًا على الحد الأدنى للتعويض. أدخل تاريخ نهاية العقد لحساب المدة المتبقية بدقة.");
    } else {
      setFormMessage("تم حساب النتيجة التقديرية.");
    }
    window.setTimeout(() => {
      resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleReset() {
    setReason("employer");
    setContractType("fixed");
    setEmployeeName("");
    setStartDate("");
    setContractEndDate("");
    setEndDate("");
    setMonthlyWage("");
    setRemainingVacationDays("");
    setUnpaidDays("");
    setHasCompensationClause(false);
    setCompensationAmount("");
    setHasCalculated(false);
    setFormMessage("");
  }

  return (
    <div className="labor-calculator-shell">
      <form className="labor-calculator-card" onSubmit={handleCalculate}>
        <div className="labor-form-head">
          <p className="eyebrow">بيانات العلاقة العمالية</p>
          <h2>أدخل البيانات الأساسية</h2>
          <p>كلما كانت البيانات أدق، كانت النتيجة أقرب للتقدير الصحيح.</p>
        </div>

        <div className="labor-form-grid">
          <label>
            اسم الموظف
            <input value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} placeholder="اختياري" />
          </label>
          <DateSelectField label="تاريخ بداية العمل" value={startDate} onChange={setStartDate} />
          <DateSelectField label="تاريخ نهاية العلاقة" value={endDate} onChange={setEndDate} />
          <label className="labor-reason-field">
            سبب انتهاء العلاقة
            <span className="labor-select-wrap">
              <select
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value as EndReason);
                  clearResult();
                }}
              >
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={15} strokeWidth={2.4} />
            </span>
          </label>
          <label>
            الأجر الشهري الأخير شامل البدلات
            <input inputMode="decimal" placeholder="مثال: 8000" value={monthlyWage} onChange={(event) => setMonthlyWage(event.target.value)} />
          </label>
        </div>

        {reason === "unlawful" ? (
          <div className="labor-article77-section">
          <label>
            نوع العقد
            <span className="labor-select-wrap">
              <select
                value={contractType}
                onChange={(event) => {
                  setContractType(event.target.value as ContractType);
                  clearResult();
                }}
              >
                <option value="fixed">محدد المدة</option>
                <option value="indefinite">غير محدد المدة</option>
              </select>
              <ChevronDown aria-hidden="true" size={15} strokeWidth={2.4} />
            </span>
          </label>
            {contractType === "fixed" && !hasCompensationClause ? (
              <DateSelectField label="تاريخ نهاية العقد المحدد" value={contractEndDate} onChange={setContractEndDate} futureYears={10} />
            ) : null}
          </div>
        ) : null}

        <aside className="labor-rules-card" aria-label="طريقة حساب بدل الإجازات">
          <div className="labor-rules-intro">
            <strong>طريقة حساب بدل الإجازات</strong>
            <p>أدخل رصيد الإجازات غير المستخدمة فقط</p>
          </div>
          <div className="labor-vacation-rates">
            <div>
              <strong>21</strong>
              <span>يومًا سنويًا<small>لأول خمس سنوات</small></span>
            </div>
            <div>
              <strong>30</strong>
              <span>يومًا سنويًا<small>بعد الخمس سنوات</small></span>
            </div>
          </div>
          <p className="labor-rules-note">لا يوجد رصيد متبقٍ؟ اترك الحقل فارغًا.</p>
        </aside>

        <div className="labor-subgrid">
          <label>
            رصيد الإجازات غير المستخدمة
            <input inputMode="decimal" placeholder="مثال: 12" value={remainingVacationDays} onChange={(event) => setRemainingVacationDays(event.target.value)} />
          </label>
          <label>
            أيام عمل لم يستلم أجرها
            <input inputMode="decimal" placeholder="اتركه فارغًا إذا لا يوجد" value={unpaidDays} onChange={(event) => setUnpaidDays(event.target.value)} />
          </label>
        </div>

        <div className="labor-compensation">
          <label className="labor-check">
            <input
              checked={hasCompensationClause}
              onChange={(event) => {
                setHasCompensationClause(event.target.checked);
                clearResult();
              }}
              type="checkbox"
            />
            يوجد في العقد بند يحدد مبلغ التعويض عن الفسخ غير المشروع
          </label>
          {hasCompensationClause ? (
            <label>
              مبلغ التعويض المتفق عليه
              <input inputMode="decimal" placeholder="اكتب المبلغ المذكور في العقد" value={compensationAmount} onChange={(event) => setCompensationAmount(event.target.value)} />
            </label>
          ) : null}
          {reason === "unlawful" ? (
            <div className="labor-field-note">
              <strong>ملاحظة المادة 77</strong>
              <p>{ARTICLE_77_CONTRACT_NOTE}</p>
            </div>
          ) : null}
        </div>

        <div className="labor-submit-row">
          <button type="submit">احسب المستحقات</button>
          <button className="labor-reset-button" type="button" onClick={handleReset}>
            تفريغ الحقول
          </button>
          <p role="status" aria-live="polite">
            {formMessage}
          </p>
        </div>
      </form>

      <aside className="labor-result-card" id="labor-results" ref={resultPanelRef} aria-live="polite">
        <div className="labor-result-head">
          <p className="eyebrow">النتيجة التقديرية</p>
          <h2>{shouldShowResult ? `${money(result.total)} ر.س` : "أكمل البيانات"}</h2>
          <p>{employeeName ? `تقدير مستحقات ${employeeName}` : "تظهر النتيجة بعد إدخال البيانات والضغط على زر الحساب."}</p>
        </div>

        <div className="labor-result-list">
          <div>
            <span>مدة الخدمة</span>
            <strong>{shouldShowResult ? `${arabicNumber(result.years, 2)} سنة` : "-"}</strong>
          </div>
          <div>
            <span>مكافأة نهاية الخدمة</span>
            <strong>{displayMoney(result.endOfService)}</strong>
          </div>
          <div>
            <span>رصيد الإجازات المتبقي</span>
            <strong>{displayDays(result.vacationRemaining)}</strong>
          </div>
          <div>
            <span>بدل الإجازات</span>
            <strong>{displayMoney(result.vacationPay)}</strong>
          </div>
          <div>
            <span>أجور غير مستلمة</span>
            <strong>{displayMoney(result.unpaidWages)}</strong>
          </div>
          <div>
            <span>تعويض تقديري</span>
            <strong>{displayCompensation}</strong>
          </div>
        </div>

        <div className="labor-actions">
          <button type="button" onClick={() => window.print()}>
            طباعة النتيجة
          </button>
          <a href={reviewTicketHref}>طلب مراجعة مختصرة</a>
        </div>
      </aside>
    </div>
  );
}
