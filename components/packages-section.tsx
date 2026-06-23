"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Gauge,
  Layers3,
  PanelsTopLeft,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { packages } from "@/data/site";
import { packagesEn, packagesTabsEn, budgetTracksEn, complexityLevelsEn, urgencyLevelsEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";

const tabsAr = [
  { id: "all", label: "باقات الخدمات" },
  { id: "legal", label: "الباقات القانونية" },
  { id: "founding", label: "تأسيس الشركات" },
];

const budgetTracksAr = [
  { value: "launch", label: "تأسيس وتشغيل أولي", note: "كيان جديد وفتح ملفاته الأساسية", base: 3900 },
  { value: "platforms", label: "إدارة منصات حكومية", note: "قوى، مدد، التأمينات ومقيم", base: 3200 },
  { value: "licenses", label: "ترخيص أو اعتماد", note: "رخصة نشاط، تصريح أو تأهيل", base: 4500 },
  { value: "recovery", label: "معالجة تعثر أو ملاحظة", note: "طلب مرفوض أو إجراء متوقف", base: 3600 },
  { value: "compliance", label: "امتثال وملفات دورية", note: "التزامات تشغيل ومتابعة متكررة", base: 5200 },
];

const complexityLevelsAr = [
  { value: "clear", label: "جاهز للتنفيذ", note: "المتطلبات واضحة والمستندات متوفرة", add: 0 },
  { value: "mixed", label: "يحتاج ترتيبًا", note: "متطلبات متعددة أو مستندات ناقصة", add: 1400 },
  { value: "stalled", label: "متعثر حاليًا", note: "رفض أو ملاحظة تحتاج معالجة", add: 2800 },
];

const urgencyLevelsAr = [
  { value: "normal", label: "مرن", note: "دون موعد ضاغط", multiplier: 1 },
  { value: "soon", label: "موعد قريب", note: "لدي مهلة خلال أسبوع", multiplier: 1.18 },
  { value: "urgent", label: "عاجل", note: "أحتاج البدء خلال 72 ساعة", multiplier: 1.35 },
];

const customOptionsAr = ["تأسيس وتشغيل", "منصات حكومية", "رخص واعتمادات", "قانوني", "موارد بشرية", "زكاة وضريبة"];
const customOptionsEn = ["Formation & launch", "Government platforms", "Licenses", "Legal", "HR", "Zakat & Tax"];

export function PackagesSection() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const pkgData = isAr ? packages : packagesEn;
  const tabs = isAr ? tabsAr : packagesTabsEn;
  const budgetTracks = isAr ? budgetTracksAr : budgetTracksEn;
  const complexityLevels = isAr ? complexityLevelsAr : complexityLevelsEn;
  const urgencyLevels = isAr ? urgencyLevelsAr : urgencyLevelsEn;
  const customOptions = isAr ? customOptionsAr : customOptionsEn;

  const [activeTab, setActiveTab] = useState("all");
  const [customOpen, setCustomOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [customStatus, setCustomStatus] = useState("");
  const [scopeStep, setScopeStep] = useState(1);
  const [scopeStage, setScopeStage] = useState("operations");
  const [scopeAreasSelected, setScopeAreasSelected] = useState<string[]>(["platforms"]);
  const [scopeUrgency, setScopeUrgency] = useState("normal");
  const [selectedTrack, setSelectedTrack] = useState(budgetTracks[0].value);
  const [selectedComplexity, setSelectedComplexity] = useState(complexityLevels[0].value);
  const [selectedUrgency, setSelectedUrgency] = useState(urgencyLevels[0].value);
  const visiblePackages = activeTab === "all" ? pkgData : pkgData.filter((item) => item.category === activeTab);
  const selectedTrackData = budgetTracks.find((item) => item.value === selectedTrack) ?? budgetTracks[0];
  const selectedComplexityData = complexityLevels.find((item) => item.value === selectedComplexity) ?? complexityLevels[0];
  const selectedUrgencyData = urgencyLevels.find((item) => item.value === selectedUrgency) ?? urgencyLevels[0];
  const totalCost = Math.round((selectedTrackData.base + selectedComplexityData.add) * selectedUrgencyData.multiplier);
  const formattedTotal = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US").format(totalCost);
  const formattedTotalMax = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US").format(Math.round(totalCost * 1.25));
  const packageIcons = {
    founding: Building2,
    services: PanelsTopLeft,
    legal: Scale,
  };
  const scopeStages = [
    { value: "formation", label: isAr ? "تأسيس كيان جديد" : "Form a new entity", note: isAr ? "من اختيار الشكل القانوني حتى فتح الملفات" : "From legal form to opening files" },
    { value: "operations", label: isAr ? "ترتيب تشغيل منشأة قائمة" : "Organize an existing business", note: isAr ? "تحديث وربط الملفات والمنصات الحكومية" : "Update and connect government files" },
    { value: "license", label: isAr ? "استخراج ترخيص أو اعتماد" : "Obtain a license", note: isAr ? "رخصة نشاط، تصريح، تصنيف أو تأهيل" : "Activity license, permit, or accreditation" },
    { value: "recovery", label: isAr ? "معالجة طلب متعثر" : "Resolve a stalled request", note: isAr ? "رفض، ملاحظة، تعليق أو انتهاء مهلة" : "Rejection, observation, or suspension" },
  ];
  const scopeAreas = [
    { value: "commerce", label: isAr ? "الكيان ووزارة التجارة" : "Entity & Commerce" },
    { value: "platforms", label: isAr ? "قوى، مدد، التأمينات ومقيم" : "Qiwa, Mudad, GOSI & Muqeem" },
    { value: "licenses", label: isAr ? "بلدي والرخص والتصاريح" : "Balady, licenses & permits" },
    { value: "accreditation", label: isAr ? "التصنيف والتأهيل والاعتمادات" : "Classification & accreditation" },
    { value: "tax", label: isAr ? "الزكاة والضريبة" : "Zakat & Tax" },
    { value: "legal", label: isAr ? "العقود والتوثيق والعلامات" : "Contracts, notarization & marks" },
  ];
  const scopeUrgencies = [
    { value: "normal", label: isAr ? "تخطيط دون مهلة" : "Planning, no deadline", note: isAr ? "أبحث عن المسار الصحيح أولًا" : "Finding the right path first" },
    { value: "deadline", label: isAr ? "لدي موعد أو مهلة" : "I have a deadline", note: isAr ? "خلال سبعة أيام" : "Within seven days" },
    { value: "blocked", label: isAr ? "الطلب متوقف الآن" : "Request is blocked", note: isAr ? "يؤثر على تشغيل المنشأة" : "Affecting business operations" },
  ];

  useEffect(() => {
    if (!customOpen && !calculatorOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCustomOpen(false);
        setCalculatorOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [customOpen, calculatorOpen]);

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCustomStatus(isAr ? "تم استلام تفاصيل الباقة المخصصة. سنراجعها ونعود لك بخطة واضحة." : "Custom package details received. We'll review and get back to you with a clear plan.");
  };

  return (
    <section className="section packages" id="packages">
      <div className="packages-heading">
        <div>
          <p className="package-kicker">{isAr ? "الباقات" : "Packages"}</p>
          <h2>{isAr ? "صمم باقتك حسب احتياج منشأتك" : "Design your package based on your business needs"}</h2>
        </div>
        <p>{isAr ? "اختر من الباقات الجاهزة كبداية، أو ابنِ نطاقاً مخصصاً بعد مراجعة وضع المنشأة والطلبات المفتوحة." : "Choose from ready-made packages to start, or build a custom scope after reviewing your business status and open requests."}</p>
        <div className="package-filter-bar">
          <span>{isAr ? "اختر نوع الباقة" : "Choose package type"}</span>
          <div className="package-tabs" aria-label={isAr ? "تصنيفات الباقات" : "Package categories"}>
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="packages-layout">
        <div className="package-grid">
          {visiblePackages.map((item) => {
            const PackageIcon = packageIcons[item.category as keyof typeof packageIcons];

            return (
              <article className={`package-card package-${item.category} ${item.popular ? "popular" : ""}`} key={item.title}>
                {item.popular ? <div className="popular-badge">{isAr ? "الأكثر طلباً" : "Most popular"}</div> : null}
                <div className="package-head">
                  <div className="package-card-meta">
                    <span>{item.tier}</span>
                    <i aria-hidden="true"><PackageIcon size={21} strokeWidth={2} /></i>
                  </div>
                <h3>{item.title}</h3>
                <p className="package-price">
                  {isAr ? "تبدأ من" : "Starts from"} <strong>{item.price}</strong>
                  <small>{isAr ? "ر.س" : "SAR"}</small>
                </p>
              </div>
              <ul>
                {item.points.map((point) => (
                  <li key={point}><Check aria-hidden="true" size={16} strokeWidth={2.5} />{point}</li>
                ))}
              </ul>
              <a className="package-action" href={isAr ? "/#contact" : "/en/#contact"}>
                <span>{isAr ? "اطلب باقتك" : "Request your package"}</span>
                <ArrowUpLeft aria-hidden="true" size={17} strokeWidth={2.3} />
              </a>
              </article>
            );
          })}
          <article className="package-card custom-package">
            <div className="package-head">
              <div className="package-card-meta">
                <span>{isAr ? "باقة مخصصة" : "Custom Package"}</span>
                <i aria-hidden="true"><SlidersHorizontal size={21} strokeWidth={2} /></i>
              </div>
              <h3>{isAr ? "صمم باقتك" : "Design your package"}</h3>
              <p className="package-price">
                {isAr ? "تبدأ بعد" : "Starts after"} <strong>{isAr ? "التشخيص" : "diagnosis"}</strong>
              </p>
              <p>{isAr ? "اكتب لنا وضع المنشأة كما هو، وسنقترح نطاقاً واضحاً بدل بيع خدمات لا تحتاجها الآن." : "Tell us your business situation as is, and we'll suggest a clear scope instead of selling services you don't need now."}</p>
            </div>
            <div className="custom-options" aria-label={isAr ? "خيارات تصميم الباقة" : "Package design options"}>
              {customOptions.map((option) => (
                <span key={option}>{option}</span>
              ))}
            </div>
            <div className="custom-package-actions">
              <button className="package-action custom-action" onClick={() => { setScopeStep(1); setCustomStatus(""); setCustomOpen(true); }} type="button">
                {isAr ? "ابنِ نطاق الخدمة" : "Build service scope"}
              </button>
              <button className="package-action custom-action secondary-action" onClick={() => setCalculatorOpen(true)} type="button">
                {isAr ? "قدّر الميزانية" : "Estimate budget"}
              </button>
            </div>
          </article>
        </div>
      </div>
      {customOpen && typeof document !== "undefined" ? createPortal(
        <div className="package-modal-backdrop scope-builder-backdrop" onClick={() => setCustomOpen(false)} role="presentation">
          <div
            aria-labelledby="custom-package-title"
            aria-modal="true"
            className="scope-builder-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label={isAr ? "إغلاق نافذة تصميم الباقة" : "Close custom package window"}
              className="package-modal-close"
              onClick={() => setCustomOpen(false)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <aside className="scope-builder-sidebar">
              <span className="scope-builder-icon"><BriefcaseBusiness aria-hidden="true" /></span>
              <p className="eyebrow">{isAr ? "مصمم نطاق الخدمة" : "Service scope builder"}</p>
              <h3 id="custom-package-title">{isAr ? "حوّل وضع منشأتك إلى نطاق واضح" : "Turn your situation into a clear scope"}</h3>
              <p>{isAr ? "أربع خطوات قصيرة تساعدنا على فهم البداية الصحيحة قبل الحديث عن الباقة أو السعر." : "Four short steps to identify the right starting point before package or price."}</p>
              <ol className="scope-progress">
                {[1, 2, 3, 4].map((step) => (
                  <li className={scopeStep === step ? "is-current" : scopeStep > step ? "is-done" : ""} key={step}>
                    <span>{scopeStep > step ? <Check aria-hidden="true" /> : step}</span>
                    <small>{isAr ? ["النتيجة المطلوبة", "الخدمات المرتبطة", "درجة الأولوية", "وصف الحالة"][step - 1] : ["Desired outcome", "Related services", "Priority", "Situation summary"][step - 1]}</small>
                  </li>
                ))}
              </ol>
            </aside>
            <form className="scope-builder-workspace" onSubmit={handleCustomSubmit}>
              <header>
                <span>{isAr ? `الخطوة ${scopeStep} من 4` : `Step ${scopeStep} of 4`}</span>
                <div><i style={{ width: `${scopeStep * 25}%` }} /></div>
              </header>

              {scopeStep === 1 ? (
                <section className="scope-step-panel">
                  <h4>{isAr ? "ما النتيجة الأساسية التي تريد الوصول إليها؟" : "What primary outcome do you need?"}</h4>
                  <p>{isAr ? "سنستخدم اختيارك لتحديد نقطة البداية والفريق المناسب." : "Your choice determines the starting point and the right team."}</p>
                  <div className="scope-choice-grid is-stage">
                    {scopeStages.map((item) => (
                      <button className={scopeStage === item.value ? "is-selected" : ""} key={item.value} onClick={() => setScopeStage(item.value)} type="button">
                        <span>{item.label}</span><small>{item.note}</small>{scopeStage === item.value ? <CheckCircle2 aria-hidden="true" /> : null}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {scopeStep === 2 ? (
                <section className="scope-step-panel">
                  <h4>{isAr ? "ما الخدمات أو الجهات المرتبطة بطلبك؟" : "Which services are related to your request?"}</h4>
                  <p>{isAr ? "يمكنك اختيار أكثر من مسار؛ الحالات الحكومية غالبًا تكون مترابطة." : "Choose more than one; government workflows often overlap."}</p>
                  <div className="scope-choice-grid">
                    {scopeAreas.map((item) => (
                      <button
                        aria-pressed={scopeAreasSelected.includes(item.value)}
                        className={scopeAreasSelected.includes(item.value) ? "is-selected" : ""}
                        key={item.value}
                        onClick={() => setScopeAreasSelected((current) => current.includes(item.value) ? (current.length > 1 ? current.filter((value) => value !== item.value) : current) : [...current, item.value])}
                        type="button"
                      >
                        <Layers3 aria-hidden="true" /><span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {scopeStep === 3 ? (
                <section className="scope-step-panel">
                  <h4>{isAr ? "ما درجة الاستعجال؟" : "How urgent is it?"}</h4>
                  <p>{isAr ? "الاستعجال يؤثر في ترتيب الأولويات، وليس في جودة التنفيذ." : "Urgency affects prioritization, not quality."}</p>
                  <div className="scope-choice-grid is-urgency">
                    {scopeUrgencies.map((item) => (
                      <button className={scopeUrgency === item.value ? "is-selected" : ""} key={item.value} onClick={() => setScopeUrgency(item.value)} type="button">
                        <CalendarClock aria-hidden="true" /><span>{item.label}</span><small>{item.note}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {scopeStep === 4 ? (
                <section className="scope-step-panel scope-summary-step">
                  <h4>{isAr ? "أكمل الصورة بجملة واحدة" : "Complete the picture in one sentence"}</h4>
                  <div className="scope-selection-summary">
                    <span><small>{isAr ? "الهدف" : "Goal"}</small><strong>{scopeStages.find((item) => item.value === scopeStage)?.label}</strong></span>
                    <span><small>{isAr ? "المسارات" : "Areas"}</small><strong>{scopeAreas.filter((item) => scopeAreasSelected.includes(item.value)).map((item) => item.label).join("، ")}</strong></span>
                    <span><small>{isAr ? "الأولوية" : "Priority"}</small><strong>{scopeUrgencies.find((item) => item.value === scopeUrgency)?.label}</strong></span>
                  </div>
                  <label>
                    <span>{isAr ? "صف ما حدث أو ما تريد إنجازه" : "Describe what happened or what you need"}</span>
                    <textarea name="caseSummary" placeholder={isAr ? "مثال: طلب بلدي مرفوض بسبب مستند ناقص وأحتاج معرفة الخطوة التالية" : "Example: My request was rejected due to a missing document"} required />
                  </label>
                  <div className="scope-deliverable-note">
                    <CheckCircle2 aria-hidden="true" />
                    <div><strong>{isAr ? "ماذا ستحصل عليه؟" : "What will you receive?"}</strong><p>{isAr ? "مراجعة أولية، ونطاق عمل مقترح، وقائمة بالمتطلبات والخطوة التالية قبل أي التزام مالي." : "An initial review, proposed scope, requirements list, and next step before any financial commitment."}</p></div>
                  </div>
                  {customStatus ? <p className="scope-success"><CheckCircle2 aria-hidden="true" />{customStatus}</p> : null}
                </section>
              ) : null}

              <footer className="scope-builder-actions">
                <button className="scope-back" disabled={scopeStep === 1} onClick={() => setScopeStep((step) => Math.max(1, step - 1))} type="button">
                  <ArrowRight aria-hidden="true" />{isAr ? "السابق" : "Back"}
                </button>
                {scopeStep < 4 ? (
                  <button className="scope-next" onClick={() => setScopeStep((step) => Math.min(4, step + 1))} type="button">
                    {isAr ? "متابعة" : "Continue"}<ArrowLeft aria-hidden="true" />
                  </button>
                ) : (
                  <button className="scope-next" type="submit">{isAr ? "إرسال النطاق للمراجعة" : "Send scope for review"}<ArrowLeft aria-hidden="true" /></button>
                )}
              </footer>
            </form>
          </div>
        </div>,
        document.body
      ) : null}
      {calculatorOpen && typeof document !== "undefined" ? createPortal(
        <div className="package-modal-backdrop budget-planner-backdrop" onClick={() => setCalculatorOpen(false)} role="presentation">
          <div
            aria-labelledby="package-calculator-title"
            aria-modal="true"
            className="budget-planner-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label={isAr ? "إغلاق نافذة حساب تكلفة الاشتراك" : "Close cost calculator window"}
              className="package-modal-close"
              onClick={() => setCalculatorOpen(false)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <header className="budget-planner-header">
              <span><Gauge aria-hidden="true" /></span>
              <div>
                <p className="eyebrow">{isAr ? "مخطط الميزانية" : "Budget planner"}</p>
                <h3 id="package-calculator-title">{isAr ? "كوّن نطاقًا ماليًا أقرب لحالة منشأتك" : "Build a budget range closer to your situation"}</h3>
                <p>{isAr ? "ثلاثة اختيارات فقط تمنحك نطاقًا أوليًا سريعًا." : "Only three choices give you a quick initial range."}</p>
              </div>
            </header>

            <div className="budget-planner-workspace">
              <div className="budget-planner-controls">
              <section className="calculator-group">
                <span className="field-label">
                  <BriefcaseBusiness aria-hidden="true" />
                  {isAr ? "1. ما النتيجة الرئيسية التي تريدها؟" : "1. What primary outcome do you need?"}
                </span>
                <div className="package-type-grid" aria-label={isAr ? "نوع الباقة" : "Package type"}>
                  {budgetTracks.map((item) => (
                    <button
                      className={selectedTrack === item.value ? "is-selected" : ""}
                      key={item.value}
                      onClick={() => setSelectedTrack(item.value)}
                      type="button"
                    >
                      <span>{item.label}</span>
                      {isAr && "note" in item && typeof item.note === "string" ? <small>{item.note}</small> : null}
                    </button>
                  ))}
                </div>
              </section>

              <section className="calculator-group">
                <span className="field-label">
                  <Layers3 aria-hidden="true" />
                  {isAr ? "2. ما حالة الملف والمستندات الآن؟" : "2. What is the current file status?"}
                </span>
                <div className="package-type-grid" aria-label={isAr ? "درجة التعقيد" : "Complexity level"}>
                  {complexityLevels.map((item) => (
                    <button
                      className={selectedComplexity === item.value ? "is-selected" : ""}
                      key={item.value}
                      onClick={() => setSelectedComplexity(item.value)}
                      type="button"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="calculator-group">
                <span className="field-label">
                  <CalendarClock aria-hidden="true" />
                  {isAr ? "3. متى تحتاج أن نبدأ العمل؟" : "3. When do you need work to begin?"}
                </span>
                <div className="package-type-grid" aria-label={isAr ? "الاستعجال" : "Urgency"}>
                  {urgencyLevels.map((item) => (
                    <button
                      className={selectedUrgency === item.value ? "is-selected" : ""}
                      key={item.value}
                      onClick={() => setSelectedUrgency(item.value)}
                      type="button"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
              </div>

              <aside className="budget-live-summary" aria-live="polite">
                <span className="budget-summary-kicker">{isAr ? "نطاق أتعاب الخدمة المتوقع" : "Expected service-fee range"}</span>
                <strong>{formattedTotal} – {formattedTotalMax}</strong>
                <small>{isAr ? "ريال سعودي تقريبًا" : "SAR approximately"}</small>
                <p className="budget-summary-choice">{selectedTrackData.label} · {selectedComplexityData.label} · {selectedUrgencyData.label}</p>
                <p>{isAr ? "أتعاب خدمة تقديرية، ولا تشمل الرسوم الحكومية. السعر النهائي بعد مراجعة الطلب." : "Estimated service fees, excluding government fees. Final pricing follows request review."}</p>
                <div className="calculator-actions">
                <a className="package-modal-submit" href={isAr ? "/#contact" : "/en/#contact"}>
                  {isAr ? "اطلب مراجعة دقيقة" : "Request detailed review"}<ArrowUpLeft aria-hidden="true" />
                </a>
                <button
                  className="calculator-reset"
                  onClick={() => {
                    setSelectedTrack(budgetTracks[0].value);
                    setSelectedComplexity(complexityLevels[0].value);
                    setSelectedUrgency(urgencyLevels[0].value);
                  }}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" />{isAr ? "إعادة التعيين" : "Reset"}
                </button>
              </div>
              </aside>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
