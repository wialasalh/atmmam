"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

type ActivityType = "general" | "retail" | "contracting" | "professional" | "unknown";

const activityOptions: Record<ActivityType, { label: string; note: string }> = {
  general: {
    label: "نشاط عام أو مكتبي",
    note: "الأنشطة العامة تختلف جداولها حسب التصنيف الدقيق في قوى.",
  },
  retail: {
    label: "تجزئة أو متجر",
    note: "أنشطة البيع والتجزئة قد تتأثر بعدد الفروع وطبيعة الوظائف.",
  },
  contracting: {
    label: "مقاولات أو تشغيل ميداني",
    note: "الأنشطة التشغيلية غالباً تحتاج متابعة أدق للعمالة والمهن.",
  },
  professional: {
    label: "استشارات أو خدمات مهنية",
    note: "الوظائف المهنية قد تحتاج مراجعة المهن والعقود مع نسبة التوطين.",
  },
  unknown: {
    label: "لا أعرف التصنيف",
    note: "إذا لم تعرف النشاط الفرعي، استخدم النتيجة كتوجيه فقط ثم راجع قوى.",
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 }).format(value);
}

export function NitaqatIndicator() {
  const resultRef = useRef<HTMLElement>(null);
  const [activityType, setActivityType] = useState<ActivityType>("unknown");
  const [saudis, setSaudis] = useState("");
  const [nonSaudis, setNonSaudis] = useState("");
  const [targetSaudis, setTargetSaudis] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const result = useMemo(() => {
    const saudiCount = Math.max(0, Number(saudis) || 0);
    const nonSaudiCount = Math.max(0, Number(nonSaudis) || 0);
    const targetSaudiCount = Math.max(0, Number(targetSaudis) || 0);
    const total = saudiCount + nonSaudiCount;
    const percentage = total > 0 ? (saudiCount / total) * 100 : 0;
    const futureTotal = total + targetSaudiCount;
    const futurePercentage = futureTotal > 0 ? ((saudiCount + targetSaudiCount) / futureTotal) * 100 : 0;
    const underQiwaMinimum = total <= 5;

    let status = "يحتاج إدخال بيانات";
    let tone: "is-low" | "is-medium" | "is-good" = "is-medium";
    let summary = "أدخل عدد السعوديين وغير السعوديين للحصول على قراءة أولية.";

    if (total > 0 && underQiwaMinimum) {
      status = "عدد الموظفين منخفض للحساب الرسمي";
      tone = "is-medium";
      summary = "حاسبة قوى الرسمية تشير إلى أن الاستفادة من حاسبة نطاقات تتطلب أن يكون إجمالي الموظفين أكثر من 5.";
    } else if (total > 0 && percentage < 20) {
      status = "يحتاج مراجعة قريبة";
      tone = "is-low";
      summary = "نسبة التوطين منخفضة مبدئياً، وقد تحتاج مراجعة النشاط والمهن وخطة التوظيف قبل أي توسع.";
    } else if (percentage < 40) {
      status = "وضع متوسط يحتاج متابعة";
      tone = "is-medium";
      summary = "النسبة المبدئية ليست منخفضة جداً، لكنها تستحق متابعة خاصة إذا كان لديك تأشيرات أو توسع قريب.";
    } else {
      status = "قراءة مبدئية مطمئنة";
      tone = "is-good";
      summary = "النسبة المبدئية جيدة، لكن النطاق الرسمي يبقى مرتبطاً بالنشاط الاقتصادي الفرعي وجداول قوى.";
    }

    const notes = [
      activityOptions[activityType].note,
      "هذه القراءة لا تحدد لون النطاق الرسمي ولا تغني عن حاسبة قوى.",
      targetSaudiCount > 0
        ? `إضافة ${formatNumber(targetSaudiCount)} سعودي ترفع النسبة المبدئية إلى ${formatNumber(futurePercentage)}%.`
        : "يمكنك تجربة إضافة موظفين سعوديين لمعرفة أثرها التقريبي على النسبة.",
    ];

    return {
      total,
      percentage,
      futurePercentage,
      status,
      tone,
      summary,
      notes,
      underQiwaMinimum,
    };
  }, [activityType, nonSaudis, saudis, targetSaudis]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasResult(true);
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <div className="checklist-shell nitaqat-shell">
      <form className="checklist-card nitaqat-card" onSubmit={handleSubmit}>
        <div className="labor-form-head">
          <p className="eyebrow">مؤشر توطين</p>
          <h2>أدخل أعداد الموظفين لتحصل على قراءة أولية.</h2>
          <p>
            الأداة تساعدك تفهم نسبة السعوديين إلى إجمالي الموظفين، ثم توجهك للخطوة المناسبة دون اعتبارها نتيجة نطاق رسمية.
          </p>
        </div>

        <div className="activity-tool-grid">
          <label className="custom-field">
            <span className="field-label">نوع النشاط التقريبي</span>
            <select value={activityType} onChange={(event) => setActivityType(event.target.value as ActivityType)}>
              {Object.entries(activityOptions).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="custom-field">
            <span className="field-label">عدد السعوديين</span>
            <input
              inputMode="numeric"
              min="0"
              onChange={(event) => setSaudis(event.target.value)}
              placeholder="مثال: 3"
              type="number"
              value={saudis}
            />
          </label>

          <label className="custom-field">
            <span className="field-label">عدد غير السعوديين</span>
            <input
              inputMode="numeric"
              min="0"
              onChange={(event) => setNonSaudis(event.target.value)}
              placeholder="مثال: 12"
              type="number"
              value={nonSaudis}
            />
          </label>

          <label className="custom-field">
            <span className="field-label">موظفون سعوديون تخطط لإضافتهم</span>
            <input
              inputMode="numeric"
              min="0"
              onChange={(event) => setTargetSaudis(event.target.value)}
              placeholder="اختياري"
              type="number"
              value={targetSaudis}
            />
          </label>
        </div>

        <div className="nitaqat-official-note">
          <strong>مهم</strong>
          <p>النطاق الرسمي يتحدد من قوى حسب النشاط الاقتصادي الفرعي وجداول التوطين المعتمدة.</p>
        </div>

        <div className="labor-submit-row">
          <button type="submit">احسب المؤشر المبدئي</button>
          <p>ستظهر لك النسبة، قراءة مختصرة، ورابط الحاسبة الرسمية في قوى.</p>
        </div>
      </form>

      <aside className={`checklist-result-card activity-result nitaqat-result ${hasResult ? result.tone : ""}`} ref={resultRef}>
        {hasResult ? (
          <>
            <div className="checklist-score">
              <span>نسبة التوطين المبدئية</span>
              <strong>{formatNumber(result.percentage)}%</strong>
            </div>
            <h2>{result.status}</h2>
            <p>{result.summary}</p>

            <div className="nitaqat-summary-grid">
              <div>
                <span>إجمالي الموظفين</span>
                <strong>{formatNumber(result.total)}</strong>
              </div>
              <div>
                <span>بعد الإضافة المقترحة</span>
                <strong>{formatNumber(result.futurePercentage)}%</strong>
              </div>
            </div>

            <div className="checklist-missing">
              <strong>ملاحظات القراءة:</strong>
              <ul>
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="labor-actions">
              <a href="https://www.qiwa.sa/ar/tools-and-calculators/nitaqat-calculator" rel="noreferrer" target="_blank">
                حاسبة قوى الرسمية
              </a>
              <a href="/#contact">اطلب مراجعة وضع نطاقات</a>
            </div>
          </>
        ) : (
          <>
            <div className="checklist-score">
              <span>مؤشر نطاقات</span>
              <strong>جاهز</strong>
            </div>
            <h2>ابدأ بإدخال الأعداد الحالية.</h2>
            <p>ستحصل على قراءة مبدئية تساعدك تعرف هل الوضع يحتاج مراجعة قبل استخدام النتيجة الرسمية في قوى.</p>
          </>
        )}
      </aside>
    </div>
  );
}
