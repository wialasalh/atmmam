"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { ArrowUpLeft, BadgeDollarSign, ChevronDown, RotateCcw } from "lucide-react";

type EntityType = "establishment" | "llc" | "foreign";
type LicenseNeed = "none" | "basic" | "regulated";
type PostSetup = "basic" | "full";
type MonthlyFollowup = "yes" | "no";

const entityOptions: Record<EntityType, { label: string; min: number; max: number; note: string }> = {
  establishment: {
    label: "مؤسسة فردية",
    min: 1200,
    max: 2200,
    note: "غالباً أبسط في البداية، لكن تحتاج ضبط النشاط والملفات بعد السجل.",
  },
  llc: {
    label: "شركة ذات مسؤولية محدودة",
    min: 2800,
    max: 5200,
    note: "تحتاج عناية أكبر بالشركاء والصلاحيات وعقد التأسيس.",
  },
  foreign: {
    label: "شركة أو مستثمر أجنبي",
    min: 6500,
    max: 12000,
    note: "قد تدخل تراخيص استثمارية ومتطلبات إضافية قبل السجل أو بعده.",
  },
};

const licenseOptions: Record<LicenseNeed, { label: string; min: number; max: number; note: string }> = {
  none: {
    label: "لا أعلم أو لا توجد رخصة حالياً",
    min: 0,
    max: 800,
    note: "يفضل فحص النشاط مبكراً حتى لا يظهر ترخيص مطلوب بعد إصدار السجل.",
  },
  basic: {
    label: "رخصة أو تصريح عادي",
    min: 1200,
    max: 3000,
    note: "مثل الرخص البلدية أو التصاريح المرتبطة بالموقع والنشاط.",
  },
  regulated: {
    label: "نشاط منظم أو ترخيص متخصص",
    min: 3500,
    max: 8500,
    note: "الأنشطة المنظمة تحتاج مراجعة جهة مختصة وقد تتطلب مستندات إضافية.",
  },
};

const postSetupOptions: Record<PostSetup, { label: string; min: number; max: number; note: string }> = {
  basic: {
    label: "الملفات الأساسية فقط",
    min: 900,
    max: 1800,
    note: "مثل الغرفة والزكاة والضريبة أو الملفات الضرورية حسب الحالة.",
  },
  full: {
    label: "فتح ملفات التشغيل كاملة",
    min: 2200,
    max: 4800,
    note: "يشمل ترتيب ملفات قوى، التأمينات، مدد، والزكاة والضريبة حسب احتياج المنشأة.",
  },
};

function money(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value);
}

export function FormationCostEstimator() {
  const resultRef = useRef<HTMLElement>(null);
  const [entityType, setEntityType] = useState<EntityType>("llc");
  const [partners, setPartners] = useState(2);
  const [licenseNeed, setLicenseNeed] = useState<LicenseNeed>("basic");
  const [postSetup, setPostSetup] = useState<PostSetup>("full");
  const [monthlyFollowup, setMonthlyFollowup] = useState<MonthlyFollowup>("no");
  const [hasResult, setHasResult] = useState(false);

  const result = useMemo(() => {
    const entity = entityOptions[entityType];
    const license = licenseOptions[licenseNeed];
    const setup = postSetupOptions[postSetup];
    const partnerExtra = Math.max(partners - 1, 0) * 350;
    const followupMin = monthlyFollowup === "yes" ? 900 : 0;
    const followupMax = monthlyFollowup === "yes" ? 2200 : 0;
    const min = entity.min + license.min + setup.min + partnerExtra + followupMin;
    const max = entity.max + license.max + setup.max + partnerExtra + followupMax;
    const notes = [entity.note, license.note, setup.note];

    if (partners > 1) notes.push("زيادة عدد الشركاء ترفع أهمية ضبط الصلاحيات ونسب الملكية قبل الرفع.");
    if (monthlyFollowup === "yes") notes.push("المتابعة الشهرية تقديرية وتختلف حسب عدد المنصات والطلبات المفتوحة.");

    return {
      min,
      max,
      title: max >= 15000 ? "التكلفة المتوقعة مرتفعة وتحتاج تشخيصاً قبل التسعير" : "نطاق تكلفة تقديري كبداية",
      notes,
      items: [
        `نوع الكيان: ${entity.label}`,
        `الرخص والتصاريح: ${license.label}`,
        `ما بعد التأسيس: ${setup.label}`,
        `عدد الشركاء أو الملاك: ${money(partners)}`,
      ],
    };
  }, [entityType, licenseNeed, monthlyFollowup, partners, postSetup]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasResult(true);
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function resetEstimator() {
    setEntityType("llc");
    setPartners(2);
    setLicenseNeed("basic");
    setPostSetup("full");
    setMonthlyFollowup("no");
    setHasResult(false);
  }

  return (
    <div className="checklist-shell estimator-shell">
      <form className="checklist-card estimator-card" onSubmit={handleSubmit}>
        <div className="labor-form-head">
          <p className="eyebrow">بيانات النطاق</p>
          <h2>ابنِ نطاق الخدمة خطوة بخطوة.</h2>
          <p>اختر التفاصيل الأقرب لحالتك، وسنوضح لك النطاق المالي والعوامل المؤثرة فيه.</p>
        </div>

        <div className="activity-tool-grid">
          <label className="custom-field estimator-field">
            <span className="field-label"><b>01</b>نوع الكيان</span>
            <span className="estimator-select-wrap">
              <select value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType)}>
                {Object.entries(entityOptions).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <label className="custom-field estimator-field">
            <span className="field-label"><b>02</b>عدد الشركاء أو الملاك</span>
            <input
              inputMode="numeric"
              min="1"
              onChange={(event) => setPartners(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={partners}
            />
          </label>

          <label className="custom-field estimator-field">
            <span className="field-label"><b>03</b>الرخص والتصاريح</span>
            <span className="estimator-select-wrap">
              <select value={licenseNeed} onChange={(event) => setLicenseNeed(event.target.value as LicenseNeed)}>
                {Object.entries(licenseOptions).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <label className="custom-field estimator-field">
            <span className="field-label"><b>04</b>ملفات ما بعد التأسيس</span>
            <span className="estimator-select-wrap">
              <select value={postSetup} onChange={(event) => setPostSetup(event.target.value as PostSetup)}>
                {Object.entries(postSetupOptions).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <fieldset className="checklist-item estimator-followup">
            <legend><b>05</b>هل تحتاج متابعة شهرية بعد التأسيس؟</legend>
            <p>اختياري، ويعتمد على عدد المنصات والموظفين والطلبات المفتوحة.</p>
            <div className="checklist-options">
              <label className={monthlyFollowup === "yes" ? "is-selected" : ""}>
                <input checked={monthlyFollowup === "yes"} onChange={() => setMonthlyFollowup("yes")} type="radio" />
                <span>نعم</span>
              </label>
              <label className={monthlyFollowup === "no" ? "is-selected" : ""}>
                <input checked={monthlyFollowup === "no"} onChange={() => setMonthlyFollowup("no")} type="radio" />
                <span>لا حالياً</span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="labor-submit-row estimator-submit-row">
          <button type="submit">احسب النطاق التقديري</button>
          <button className="estimator-reset" type="button" onClick={resetEstimator}>
            <RotateCcw aria-hidden="true" />
            إعادة التعيين
          </button>
        </div>
      </form>

      <aside className={`checklist-result-card activity-result estimator-result ${hasResult ? "has-result" : ""}`} ref={resultRef}>
        {hasResult ? (
          <>
            <div className="estimator-result-head">
              <span className="estimator-result-icon"><BadgeDollarSign aria-hidden="true" /></span>
              <div className="checklist-score">
                <span>النطاق التقديري</span>
                <strong>{money(result.min)} – {money(result.max)}</strong>
                <small>ريال سعودي تقريبًا</small>
              </div>
            </div>
            <div className="estimator-result-summary">
              <h2>{result.title}</h2>
              <p>قد يزيد أو ينقص بعد مراجعة النشاط والمستندات والجهات المرتبطة.</p>
            </div>
            <div className="checklist-missing">
              <strong>ما الذي دخل في التقدير؟</strong>
              <ul>
                {result.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="checklist-missing">
              <strong>ملاحظات مهمة:</strong>
              <ul>
                {result.notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="labor-actions">
              <a href="/services/company-formation">خدمة التأسيس</a>
              <a href="/#contact">اطلب تسعيرًا أدق <ArrowUpLeft aria-hidden="true" /></a>
            </div>
          </>
        ) : (
          <div className="estimator-empty-state">
            <span><BadgeDollarSign aria-hidden="true" /></span>
            <strong>نتيجتك ستظهر هنا</strong>
            <p>أكمل الخيارات الخمسة ثم اضغط «احسب النطاق التقديري» للحصول على قراءة أولية منظمة.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
