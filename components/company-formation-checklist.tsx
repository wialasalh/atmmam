"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";

type Answer = "yes" | "no" | "unsure";

type ChecklistItem = {
  id: string;
  question: string;
  hint: string;
  missing: string;
  weight: number;
};

const checklistItems: ChecklistItem[] = [
  {
    id: "entityType",
    question: "هل حددت نوع الكيان المناسب؟",
    hint: "مؤسسة فردية، شركة ذات مسؤولية محدودة، أو مسار آخر حسب الشركاء والمخاطر.",
    missing: "تحديد نوع الكيان المناسب قبل بدء الطلب.",
    weight: 18,
  },
  {
    id: "activity",
    question: "هل تعرف النشاط الذي سيظهر في السجل التجاري؟",
    hint: "وصف النشاط يؤثر على التراخيص والمنصات والالتزامات اللاحقة.",
    missing: "تحديد النشاط التجاري ووصفه بدقة.",
    weight: 16,
  },
  {
    id: "tradeName",
    question: "هل لديك اسم تجاري مناسب أو بدائل جاهزة؟",
    hint: "وجود أكثر من خيار يقلل التعطيل عند عدم قبول الاسم الأول.",
    missing: "تحضير اسم تجاري وبدائل مناسبة.",
    weight: 12,
  },
  {
    id: "partners",
    question: "هل بيانات الشركاء ونسب الملكية والصلاحيات واضحة؟",
    hint: "هذا مهم عند تأسيس شركة أو وجود أكثر من مالك أو مدير.",
    missing: "ترتيب بيانات الشركاء ونسب الملكية والصلاحيات.",
    weight: 16,
  },
  {
    id: "licenses",
    question: "هل تعرف إن كان النشاط يحتاج رخصة أو تصريحاً إضافياً؟",
    hint: "بعض الأنشطة لا يكفيها السجل التجاري وحده.",
    missing: "فحص الرخص والتصاريح المرتبطة بالنشاط.",
    weight: 14,
  },
  {
    id: "governmentFiles",
    question: "هل تعرف الملفات الحكومية المطلوبة بعد السجل؟",
    hint: "مثل قوى، التأمينات، الزكاة والضريبة، الغرفة التجارية أو منصات أخرى.",
    missing: "تحديد الملفات الحكومية التي تحتاج فتحاً أو تحديثاً بعد التأسيس.",
    weight: 14,
  },
  {
    id: "documents",
    question: "هل المستندات والبيانات الأساسية جاهزة؟",
    hint: "الهوية، بيانات التواصل، العنوان، وبيانات صاحب القرار أو المفوض.",
    missing: "تجهيز المستندات والبيانات الأساسية قبل بدء التنفيذ.",
    weight: 10,
  },
];

const answerLabels: Record<Answer, string> = {
  yes: "نعم",
  no: "لا",
  unsure: "غير متأكد",
};

function scoreAnswer(answer: Answer, weight: number) {
  if (answer === "yes") return weight;
  if (answer === "unsure") return weight * 0.45;
  return 0;
}

function arabicPercent(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value);
}

export function CompanyFormationChecklist() {
  const resultRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(checklistItems.map((item) => [item.id, "unsure" as Answer])),
  );
  const [hasChecked, setHasChecked] = useState(false);

  const result = useMemo(() => {
    const score = checklistItems.reduce((total, item) => total + scoreAnswer(answers[item.id], item.weight), 0);
    const roundedScore = Math.round(score);
    const missing = checklistItems.filter((item) => answers[item.id] !== "yes").map((item) => item.missing);

    if (roundedScore >= 82) {
      return {
        score: roundedScore,
        title: "جاهز تقريباً لبدء التأسيس",
        body: "لديك أغلب عناصر التأسيس الأساسية. الخطوة الأنسب الآن هي مراجعة المتطلبات النهائية قبل رفع الطلب.",
        tone: "strong",
        missing,
      };
    }

    if (roundedScore >= 55) {
      return {
        score: roundedScore,
        title: "تحتاج ترتيب بعض التفاصيل قبل البدء",
        body: "الوضع جيد كبداية، لكن توجد نقاط لو اتضحت الآن ستقلل احتمالات الرفض أو الحاجة للتعديل لاحقاً.",
        tone: "medium",
        missing,
      };
    }

    return {
      score: roundedScore,
      title: "يفضل مراجعة المتطلبات قبل التأسيس",
      body: "هناك عناصر مؤثرة غير واضحة بعد. البدء الآن قد يسبب توقف الطلب أو اختيار مسار غير مناسب للنشاط.",
      tone: "low",
      missing,
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
    <div className="checklist-shell">
      <form className="checklist-card" onSubmit={handleSubmit}>
        <div className="labor-form-head">
          <p className="eyebrow">قائمة تحقق</p>
          <h2>أجب عن الأسئلة لمعرفة جاهزية التأسيس.</h2>
          <p>الأداة لا تصدر قراراً نهائياً، لكنها تساعدك تعرف أين تقف وما الذي يحتاج ترتيباً قبل بدء الطلب.</p>
        </div>

        <div className="checklist-items">
          {checklistItems.map((item) => (
            <fieldset className="checklist-item" key={item.id}>
              <legend>{item.question}</legend>
              <p>{item.hint}</p>
              <div className="checklist-options">
                {(Object.keys(answerLabels) as Answer[]).map((answer) => (
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
          <button type="submit">اعرض نتيجة الجاهزية</button>
          <p>ستظهر لك النواقص والخطوة المقترحة بعد الإجابة.</p>
        </div>
      </form>

      <aside className={`checklist-result-card ${hasChecked ? `is-${result.tone}` : ""}`} ref={resultRef}>
        <div className="checklist-score">
          <span>جاهزية التأسيس</span>
          <strong>{hasChecked ? `${arabicPercent(result.score)}٪` : "—"}</strong>
        </div>
        {hasChecked ? (
          <>
            <h2>{result.title}</h2>
            <p>{result.body}</p>
            <div className="checklist-missing">
              <strong>النقاط التي تحتاج انتباه:</strong>
              <ul>
                {(result.missing.length ? result.missing.slice(0, 5) : ["مراجعة نهائية للمتطلبات قبل رفع الطلب."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="labor-actions">
              <a href="/services/company-formation">خدمة التأسيس</a>
              <a href="/#contact">اطلب مراجعة</a>
            </div>
          </>
        ) : (
          <p>املأ القائمة ثم اضغط على عرض النتيجة لتحصل على تقييم أولي مختصر.</p>
        )}
      </aside>
    </div>
  );
}
