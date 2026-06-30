-- Seed general settings into site_content
insert into public.site_content (key, data) values
(
  'settings_general',
  '{
    "siteName": "أتمم",
    "logoUrl": "",
    "faviconUrl": "",
    "defaultLang": "ar",
    "maintenanceMode": false
  }'::jsonb
),
(
  'settings_contact',
  '{
    "email": "info@atmmam.com.sa",
    "supportEmail": "support@atmmam.com.sa",
    "phone": "",
    "whatsapp": "",
    "address": "",
    "workingHours": "الأحد – الخميس، 9 ص – 6 م",
    "twitter": "",
    "instagram": "",
    "linkedin": "",
    "youtube": "",
    "snapchat": ""
  }'::jsonb
),
(
  'settings_seo',
  '{
    "siteDescription": "أتمم لخدمات الأعمال: ترتيب ومتابعة تأسيس الشركات، التراخيص، المنصات الحكومية، والملفات التشغيلية للمنشآت في السعودية.",
    "keywords": "تأسيس شركات، تراخيص تجارية، إجراءات حكومية، منصات حكومية، أتمم",
    "ogImage": "",
    "googleAnalytics": "",
    "googleTagManager": ""
  }'::jsonb
)
on conflict (key) do nothing;
