"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

type ActivityType = "retail" | "restaurant" | "office" | "online" | "contracting" | "professional";
type LocationStatus = "ready" | "searching" | "online" | "unknown";
type HiringStatus = "yes" | "soon" | "no";

const activityOptions: Record<ActivityType, string> = {
  retail: "محل تجاري أو بيع مباشر",
  restaurant: "مطعم أو مقهى أو نشاط غذائي",
  office: "مكتب خدمات أو نشاط إداري",
  online: "متجر إلكتروني أو نشاط رقمي",
  contracting: "مقاولات أو تشغيل ميداني",
  professional: "خدمة مهنية أو استشارية",
};

const locationOptions: Record<LocationStatus, string> = {
  ready: "لدي موقع أو عقد إيجار",
  searching: "لم أحدد الموقع بعد",
  online: "النشاط رقمي بدون مقر استقبال",
  unknown: "غير متأكد",
};

const hiringOptions: Record<HiringStatus, string> = {
  yes: "نعم لدي موظفون",
  soon: "سأوظف قريباً",
  no: "لا حالياً",
};

const activityRequirements: Record<ActivityType, { title: string; body: string; agencies: string[]; requirements: string[]; caution: string }> = {
  retail: {
    title: "مسار تجاري يحتاج رخصة وموقع واضح",
    body: "غالباً يبدأ من السجل التجاري ثم التحقق من الرخصة البلدية واشتراطات الموقع قبل التشغيل.",
    agencies: ["وزارة التجارة", "بلدي", "الغرفة التجارية", "الزكاة والضريبة عند بدء النشاط"],
    requirements: ["نشاط واضح في السجل", "عنوان وطني وموقع مناسب", "رخصة بلدية عند وجود محل", "لوحة أو اشتراطات موقع حسب النشاط"],
    caution: "لا تعتمد على السجل وحده إذا كان النشاط يستقبل عملاء في موقع فعلي.",
  },
  restaurant: {
    title: "نشاط غذائي يحتاج اشتراطات أعلى قبل التشغيل",
    body: "الأنشطة الغذائية غالباً تحتاج رخصة بلدية واشتراطات سلامة وموقع قبل الافتتاح.",
    agencies: ["وزارة التجارة", "بلدي", "الدفاع المدني عند الحاجة", "الزكاة والضريبة"],
    requirements: ["سجل بالنشاط الصحيح", "موقع مطابق للاشتراطات", "رخصة بلدية", "اشتراطات سلامة وتجهيزات"],
    caution: "اختيار الموقع قبل فحص الاشتراطات قد يسبب تكلفة تعديل أو رفض.",
  },
  office: {
    title: "مسار مكتبي أخف لكنه يحتاج بيانات دقيقة",
    body: "الأنشطة المكتبية تعتمد على وضوح النشاط والعنوان والملفات الحكومية بعد السجل.",
    agencies: ["وزارة التجارة", "الغرفة التجارية", "قوى والتأمينات عند وجود موظفين", "الزكاة والضريبة"],
    requirements: ["نشاط مناسب في السجل", "عنوان وطني", "عقد أو مقر عند الحاجة", "ملفات حكومية للتشغيل"],
    caution: "بعض الخدمات الإدارية قد تحتاج ترخيصاً مهنياً أو موافقة جهة متخصصة.",
  },
  online: {
    title: "النشاط الرقمي يحتاج ترتيب الهوية والبيع الإلكتروني",
    body: "المتجر الإلكتروني قد يبدأ بسجل ونشاط مناسب، ثم ترتيب بيانات المتجر والدفع والالتزامات حسب المبيعات.",
    agencies: ["وزارة التجارة", "منصات التجارة الإلكترونية", "الزكاة والضريبة", "معروف أو بدائل الثقة عند الحاجة"],
    requirements: ["نشاط تجارة إلكترونية أو نشاط مناسب", "بيانات متجر واضحة", "سياسات بيع واسترجاع", "ترتيب ضريبي عند تحقق المتطلبات"],
    caution: "بيع المنتجات المقيدة أو المنظمة قد يحتاج موافقات إضافية حتى لو كان البيع إلكترونياً.",
  },
  contracting: {
    title: "المقاولات تحتاج جاهزية تشغيل وتصنيف محتمل",
    body: "المسار لا يتوقف عند السجل؛ قد تحتاج ملفات موظفين، تأمينات، اعتماد، وتصنيف حسب طبيعة المشاريع.",
    agencies: ["وزارة التجارة", "قوى ومدد", "التأمينات", "منصة اعتماد", "بلدي أو التصنيف عند الحاجة"],
    requirements: ["نشاط مقاولات مناسب", "ملفات موظفين وتشغيل", "اشتراكات وتأمينات", "تأهيل أو تصنيف عند استهداف مشاريع معينة"],
    caution: "دخول المنافسات أو العمل مع جهات كبرى قد يتطلب اعتمادات قبل أول مشروع.",
  },
  professional: {
    title: "الخدمة المهنية قد تحتاج ترخيصاً متخصصاً",
    body: "بعض الخدمات الاستشارية أو المهنية لا يكفيها السجل، وقد ترتبط بجهة مهنية أو ترخيص محدد.",
    agencies: ["وزارة التجارة", "الجهة المهنية المختصة", "الغرفة التجارية", "الزكاة والضريبة"],
    requirements: ["تحديد نوع الخدمة بدقة", "مراجعة الترخيص المهني إن وجد", "بيانات المؤهل أو الخبرة عند الحاجة", "ملفات تشغيل أساسية"],
    caution: "استخدام وصف نشاط عام قد لا يكون كافياً إذا كانت الخدمة منظمة من جهة مختصة.",
  },
};

export function ActivityRequirementsTool() {
  const resultRef = useRef<HTMLElement>(null);
  const [activity, setActivity] = useState<ActivityType>("retail");
  const [location, setLocation] = useState<LocationStatus>("unknown");
  const [hiring, setHiring] = useState<HiringStatus>("soon");
  const [hasResult, setHasResult] = useState(false);

  const result = useMemo(() => {
    const base = activityRequirements[activity];
    const extra: string[] = [];

    if (location === "ready") extra.push("راجع عقد الموقع والعنوان الوطني قبل رفع الرخصة.");
    if (location === "searching") extra.push("لا توقع عقد موقع قبل فحص الاشتراطات المرتبطة بالنشاط.");
    if (location === "online") extra.push("ركز على بيانات المتجر والسياسات والالتزامات المرتبطة بالبيع عن بعد.");
    if (location === "unknown") extra.push("ابدأ بتحديد هل النشاط يحتاج مقر استقبال أو يمكن تشغيله رقمياً.");

    if (hiring === "yes") extra.push("افتح أو راجع ملفات قوى، مدد، والتأمينات من البداية.");
    if (hiring === "soon") extra.push("جهّز مسار الموارد البشرية قبل أول موظف لتجنب تعطيل لاحق.");
    if (hiring === "no") extra.push("قد لا تحتاج ملفات موظفين فوراً، لكن راقبها عند أول توظيف.");

    return { ...base, extra };
  }, [activity, hiring, location]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasResult(true);
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <div className="checklist-shell">
      <form className="checklist-card" onSubmit={handleSubmit}>
        <div className="labor-form-head">
          <p className="eyebrow">فرز المتطلبات</p>
          <h2>اختر وصف النشاط لتحصل على مسار أولي.</h2>
          <p>الأداة تساعدك على معرفة الجهات والمتطلبات المحتملة قبل طلب الخدمة أو البدء في الترخيص.</p>
        </div>

        <div className="activity-tool-grid">
          <label className="custom-field">
            <span className="field-label">نوع النشاط</span>
            <select value={activity} onChange={(event) => setActivity(event.target.value as ActivityType)}>
              {Object.entries(activityOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="custom-field">
            <span className="field-label">حالة الموقع</span>
            <select value={location} onChange={(event) => setLocation(event.target.value as LocationStatus)}>
              {Object.entries(locationOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="custom-field">
            <span className="field-label">هل يوجد موظفون؟</span>
            <select value={hiring} onChange={(event) => setHiring(event.target.value as HiringStatus)}>
              {Object.entries(hiringOptions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="labor-submit-row">
          <button type="submit">اعرض المتطلبات المتوقعة</button>
          <p>النتيجة تقديرية وتساعدك على ترتيب الأسئلة قبل التواصل.</p>
        </div>
      </form>

      <aside className={`checklist-result-card activity-result ${hasResult ? "is-strong" : ""}`} ref={resultRef}>
        {hasResult ? (
          <>
            <div className="checklist-score">
              <span>المسار الأقرب</span>
              <strong>01</strong>
            </div>
            <h2>{result.title}</h2>
            <p>{result.body}</p>
            <div className="checklist-missing">
              <strong>الجهات المحتملة:</strong>
              <ul>
                {result.agencies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="checklist-missing">
              <strong>متطلبات أولية:</strong>
              <ul>
                {[...result.requirements, ...result.extra].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p className="activity-caution">{result.caution}</p>
            <div className="labor-actions">
              <a href="/services/licenses">خدمة التراخيص</a>
              <a href="/#contact">اطلب مراجعة</a>
            </div>
          </>
        ) : (
          <p>اختر نوع النشاط وحالة الموقع والموظفين، ثم اعرض المتطلبات المتوقعة.</p>
        )}
      </aside>
    </div>
  );
}
