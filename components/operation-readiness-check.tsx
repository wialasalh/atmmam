"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

type Answer = "yes" | "no" | "unsure" | "notNeeded";

type ReadinessItem = {
  id: string;
  question: string;
  hint: string;
  missing: string;
  weight: number;
  optional?: boolean;
};

const readinessItems: ReadinessItem[] = [
  {
    id: "commercialRegister",
    question: "هل السجل التجاري نشط ومطابق للنشاط الفعلي؟",
    hint: "اختلاف النشاط في السجل عن الواقع قد يؤثر على الرخص والملفات اللاحقة.",
    missing: "مراجعة السجل التجاري والنشاط المسجل.",
    weight: 14,
  },
  {
    id: "zakatTax",
    question: "هل ملف الزكاة والضريبة مفتوح ومحدث؟",
    hint: "الملف الضريبي من أساسيات تشغيل المنشأة وتحديث بياناتها.",
    missing: "فتح أو تحديث ملف الزكاة والضريبة.",
    weight: 13,
  },
  {
    id: "qiwa",
    question: "هل حساب قوى مفعل للمنشأة؟",
    hint: "قوى مهم للعقود والمهن والموظفين والامتثال العمالي.",
    missing: "تفعيل حساب قوى ومراجعة صلاحياته.",
    weight: 13,
  },
  {
    id: "gosi",
    question: "هل التأمينات الاجتماعية مفعلة؟",
    hint: "التأمينات مرتبطة بالموظفين والاشتراكات والامتثال التشغيلي.",
    missing: "فتح أو تحديث ملف التأمينات الاجتماعية.",
    weight: 12,
  },
  {
    id: "license",
    question: "هل لديك رخصة بلدية أو مهنية إذا كان النشاط يتطلبها؟",
    hint: "بعض الأنشطة لا يكفيها السجل التجاري وحده.",
    missing: "مراجعة الرخص والتصاريح المرتبطة بالنشاط.",
    weight: 12,
    optional: true,
  },
  {
    id: "employees",
    question: "هل بيانات الموظفين والعقود محدثة؟",
    hint: "العقود والمهن والرواتب تحتاج اتساقاً بين قوى والتأمينات والملفات الداخلية.",
    missing: "مراجعة عقود وبيانات الموظفين.",
    weight: 12,
    optional: true,
  },
  {
    id: "wageProtection",
    question: "هل حماية الأجور مفعلة عند وجود موظفين؟",
    hint: "حماية الأجور تؤثر على الامتثال وتجنب الملاحظات التشغيلية.",
    missing: "تفعيل أو مراجعة حماية الأجور في مدد.",
    weight: 10,
    optional: true,
  },
  {
    id: "calendar",
    question: "هل لديك قائمة بالمواعيد والتجديدات المهمة؟",
    hint: "غياب التقويم التشغيلي يجعل التنبيهات تظهر متأخرة.",
    missing: "إنشاء قائمة بالمواعيد والتجديدات والمهل.",
    weight: 8,
  },
  {
    id: "authorizations",
    question: "هل الصلاحيات والتفويضات مرتبة؟",
    hint: "توقف الطلبات كثيراً بسبب صلاحية غير مفعلة أو مفوض غير واضح.",
    missing: "ترتيب الصلاحيات والتفويضات للمنصات.",
    weight: 6,
  },
];

const answerLabels: Record<Answer, string> = {
  yes: "نعم",
  no: "لا",
  unsure: "غير متأكد",
  notNeeded: "لا ينطبق",
};

function scoreAnswer(answer: Answer, item: ReadinessItem) {
  if (answer === "yes") return item.weight;
  if (answer === "notNeeded" && item.optional) return item.weight;
  if (answer === "unsure") return item.weight * 0.35;
  return 0;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value);
}

export function OperationReadinessCheck() {
  const resultRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(readinessItems.map((item) => [item.id, "unsure" as Answer])),
  );
  const [hasChecked, setHasChecked] = useState(false);

  const result = useMemo(() => {
    const maxScore = readinessItems.reduce((total, item) => total + item.weight, 0);
    const score = readinessItems.reduce((total, item) => total + scoreAnswer(answers[item.id], item), 0);
    const percentage = Math.round((score / maxScore) * 100);
    const missing = readinessItems
      .filter((item) => answers[item.id] === "no" || answers[item.id] === "unsure")
      .map((item) => item.missing);

    if (percentage >= 82) {
      return {
        percentage,
        tone: "strong",
        title: "منشأتك جاهزة للتشغيل بدرجة جيدة",
        body: "الملفات الأساسية تبدو مكتملة، وتحتاج غالباً إلى متابعة دورية للتجديدات والتنبيهات.",
        missing,
        serviceHref: "/services/government-platforms",
        serviceLabel: "متابعة المنصات",
      };
    }

    if (percentage >= 55) {
      return {
        percentage,
        tone: "medium",
        title: "جاهزية متوسطة وتحتاج استكمال بعض الملفات",
        body: "هناك ملفات أو صلاحيات مؤثرة لم تتضح بعد. ترتيبها الآن يقلل توقف الطلبات لاحقاً.",
        missing,
        serviceHref: "/services/government-platforms",
        serviceLabel: "ترتيب ملفات التشغيل",
      };
    }

    return {
      percentage,
      tone: "low",
      title: "يفضل ترتيب الملفات قبل التوسع أو التشغيل",
      body: "توجد نواقص أساسية قد تؤثر على الرخص، الموظفين، أو المنصات الحكومية.",
      missing,
      serviceHref: "/services/company-formation",
      serviceLabel: "استكمال ملفات المنشأة",
    };
  }, [answers]);

  function updateAnswer(id: string, answer: Answer) {
    setAnswers((current) => ({ ...current, [id]: answer }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasChecked(true);
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <div className="checklist-shell operation-readiness-shell">
      <form className="checklist-card operation-readiness-card" onSubmit={handleSubmit}>
        <div className="labor-form-head">
          <p className="eyebrow">بعد التأسيس</p>
          <h2>أجب عن الأسئلة لفحص ملفات التشغيل الحكومية.</h2>
          <p>الأداة تركّز على الملفات التي تأتي بعد وجود المنشأة، حتى لا تختلط مع قائمة تحقق التأسيس.</p>
        </div>

        <div className="checklist-items">
          {readinessItems.map((item) => (
            <fieldset className="checklist-item" key={item.id}>
              <legend>{item.question}</legend>
              <p>{item.hint}</p>
              <div className="checklist-options">
                {(Object.keys(answerLabels) as Answer[])
                  .filter((answer) => item.optional || answer !== "notNeeded")
                  .map((answer) => (
                    <label className={answers[item.id] === answer ? "is-selected" : ""} key={answer}>
                      <input
                        checked={answers[item.id] === answer}
                        name={item.id}
                        onChange={() => updateAnswer(item.id, answer)}
                        type="radio"
                        value={answer}
                      />
                      <span>{answerLabels[answer]}</span>
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="labor-submit-row">
          <button type="submit">اعرض نتيجة الملفات</button>
          <p>ستظهر لك النتيجة والنواقص الأكثر أهمية والخدمة الأقرب لحالتك.</p>
        </div>
      </form>

      <aside className={`checklist-result-card ${hasChecked ? `is-${result.tone}` : ""}`} ref={resultRef}>
        <div className="checklist-score">
          <span>اكتمال الملفات</span>
          <strong>{hasChecked ? `${formatPercent(result.percentage)}٪` : "—"}</strong>
        </div>
        {hasChecked ? (
          <>
            <h2>{result.title}</h2>
            <p>{result.body}</p>
            <div className="checklist-missing">
              <strong>أهم النواقص أو نقاط المراجعة:</strong>
              <ul>
                {(result.missing.length ? result.missing.slice(0, 6) : ["مراجعة دورية للتنبيهات والتجديدات."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="labor-actions">
              <a href={result.serviceHref}>{result.serviceLabel}</a>
              <a href="/#contact">اطلب ترتيب الملفات</a>
            </div>
          </>
        ) : (
          <p>املأ الفحص ثم اعرض النتيجة لتحصل على قراءة مختصرة لجاهزية التشغيل.</p>
        )}
      </aside>
    </div>
  );
}
