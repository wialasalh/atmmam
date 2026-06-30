create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

create policy "admins can manage site content"
  on public.site_content for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager')
    )
  );

-- Seed default hero content
insert into public.site_content (key, data) values
(
  'hero',
  '{
    "eyebrow": "نرتّب إجراءات منشأتك بين الجهات والمنصات",
    "body": "أرسل لنا وضع الطلب كما هو، ونرتب لك الجهة المناسبة، المتطلبات الناقصة، والخطوة التالية بوضوح قبل بدء التنفيذ.",
    "primaryCta": { "label": "ابدأ تشخيص طلبك", "href": "/#contact" },
    "secondaryCta": { "label": "اكتشف الخدمات", "href": "/services" },
    "assurances": ["فهم سريع لطلبك", "متابعة شفافة", "نتيجة موثقة"],
    "badges": [
      { "value": "+300", "label": "خدمة نقدمها بمختلف الجهات والقطاعات" },
      { "value": "+120", "label": "جهة حكومية وشبه حكومية" },
      { "value": "98%",  "label": "رضا العملاء عن خدماتنا" },
      { "value": "24–72","label": "ساعة متوسط إنجاز الطلب" },
      { "value": "+50,000","label": "عميل من مختلف المنشآت" }
    ]
  }'::jsonb
),
(
  'testimonials',
  '[
    { "quote": "كنت أضيع وقت كثير في متابعة منصة قوى ومدد، صار عندي تقرير واحد أوضح من دخولي على كل منصة لحالها.", "name": "أحمد الغامدي", "role": "مسؤول الموارد البشرية، مؤسسة رواد الأعمال" },
    { "quote": "أول مرة أفهم وش المطلوب مني بالضبط قبل بدء الإجراء. لا نكتفي نرفع الطلب وننتظر بدون فايدة.", "name": "سارة القحطاني", "role": "مالكة منشأة تجارية، الخبر" },
    { "quote": "تعاملنا مع أكثر من مكتب، بس هذولا يشرحون الخطوات قبل لا نبدأ. الفرق إنهم يخلونك فاهم مو بس منفذ.", "name": "فهد الدوسري", "role": "مدير عام، شركة البناء المتقن" }
  ]'::jsonb
),
(
  'site_config',
  '{
    "name": "أتمم",
    "description": "أتمم لخدمات الأعمال: ترتيب ومتابعة تأسيس الشركات، التراخيص، المنصات الحكومية، والملفات التشغيلية للمنشآت في السعودية."
  }'::jsonb
)
on conflict (key) do nothing;
