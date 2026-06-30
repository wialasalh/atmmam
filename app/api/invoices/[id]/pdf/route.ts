import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

// ZATCA-compliant TLV QR code data (Base64)
function buildZatcaQr(sellerName: string, vatNumber: string, timestamp: string, totalAmount: string, vatAmount: string): string {
  function tlv(tag: number, value: string): Uint8Array {
    const encoded = new TextEncoder().encode(value);
    const result  = new Uint8Array(2 + encoded.length);
    result[0] = tag;
    result[1] = encoded.length;
    result.set(encoded, 2);
    return result;
  }
  const parts = [
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, timestamp),
    tlv(4, totalAmount),
    tlv(5, vatAmount),
  ];
  const total  = parts.reduce((a, p) => a + p.length, 0);
  const merged = new Uint8Array(total);
  let offset   = 0;
  for (const p of parts) { merged.set(p, offset); offset += p.length; }
  return Buffer.from(merged).toString("base64");
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const serviceClient = makeServiceClient();

  // Fetch invoice with relations
  const { data: inv, error } = await serviceClient
    .from("invoices")
    .select(`
      id, invoice_number, description, service_name,
      amount, tax_rate, tax_amount, total_amount,
      currency, payment_method, status,
      notes, paid_at, due_date, created_at,
      clients(id, name, phone, email, tax_number, commercial_number, company_address, city, client_type),
      orders(id, reference_no)
    `)
    .eq("id", id)
    .single();

  if (error || !inv) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });

  // Access control: client or staff
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && isStaffRole(profile.role);
  const client = inv.clients as any;

  if (!isStaff) {
    const { data: myClients } = await serviceClient
      .from("clients")
      .select("id")
      .eq("user_id", user.id);
    const myClientIds = (myClients || []).map(c => c.id);
    if (!myClientIds.includes(client?.id)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  const fmtMoney = (n: number) => new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(n);
  const fmtDate  = (d: string) => new Date(d).toLocaleDateString("ar-SA", {calendar: "gregory", year: "numeric", month: "long", day: "numeric" });

  const paymentMethodAr: Record<string, string> = {
    bank_transfer: "تحويل بنكي",
    cash:          "نقداً",
    credit_card:   "بطاقة ائتمانية",
    stc_pay:       "STC Pay",
  };

  const statusLabel: Record<string, { ar: string; color: string }> = {
    issued:    { ar: "صادرة",   color: "#b45309" },
    paid:      { ar: "مدفوعة",  color: "#15803d" },
    cancelled: { ar: "ملغاة",   color: "#dc2626" },
    refunded:  { ar: "مستردة",  color: "#6b7280" },
  };
  const st = statusLabel[(inv.status as string)] || statusLabel.issued;

  const zatcaQr = buildZatcaQr(
    "ATMMAM منصة الأعمال",
    "300XXXXXXXXXX",
    new Date(inv.created_at as string).toISOString(),
    String(inv.total_amount),
    String(inv.tax_amount)
  );

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>فاتورة ضريبية - ${inv.invoice_number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #f4f6f9; color: #1a2535; direction: rtl; }
  .page { max-width: 800px; margin: 0 auto; background: #fff; min-height: 100vh; }

  /* Header */
  .header { background: linear-gradient(135deg, #073766 0%, #0875dc 100%); color: #fff; padding: 36px 48px 28px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand-name { font-size: 22px; font-weight: 900; letter-spacing: .5px; }
  .brand-sub  { font-size: 12px; opacity: .75; margin-top: 4px; }
  .inv-meta   { text-align: left; }
  .inv-label  { font-size: 11px; opacity: .7; }
  .inv-number { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
  .inv-date   { font-size: 12px; opacity: .8; margin-top: 3px; }

  /* Status ribbon */
  .status-bar { background: ${st.color}15; border-top: 3px solid ${st.color}; border-bottom: 3px solid ${st.color}; padding: 10px 48px; display: flex; align-items: center; gap: 10px; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; background: ${st.color}; }
  .status-text { font-size: 13px; font-weight: 700; color: ${st.color}; }
  ${inv.status === "paid" ? `.status-stamp { margin-right: auto; background: #15803d; color: #fff; font-size: 13px; font-weight: 900; padding: 4px 18px; border-radius: 4px; border: 2px solid #15803d; transform: rotate(-2deg); display: inline-block; }` : ""}

  /* Parties */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e8edf5; }
  .party { padding: 24px 48px; }
  .party + .party { border-right: 1px solid #e8edf5; }
  .party-label { font-size: 10px; font-weight: 700; color: #8b9dad; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
  .party-name  { font-size: 16px; font-weight: 800; color: #073766; margin-bottom: 6px; }
  .party-info  { font-size: 12px; color: #526983; line-height: 1.8; }

  /* Items table */
  .items-section { padding: 28px 48px; }
  .section-title { font-size: 11px; font-weight: 700; color: #8b9dad; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f4f7fb; }
  th { padding: 10px 14px; font-size: 11px; font-weight: 800; color: #4a6075; text-align: right; border-bottom: 2px solid #e0e7ef; }
  td { padding: 14px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #f0f4f8; }
  .col-desc { width: 55%; }
  .col-qty  { width: 10%; text-align: center; }
  .col-price{ width: 17%; text-align: left; }
  .col-total{ width: 18%; text-align: left; font-weight: 700; }

  /* Totals */
  .totals { margin-top: 4px; display: flex; justify-content: flex-start; }
  .totals-box { min-width: 260px; }
  .total-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; color: #526983; border-bottom: 1px solid #f0f4f8; }
  .total-row:last-child { border-bottom: none; }
  .total-row.grand { font-size: 16px; font-weight: 900; color: #073766; padding-top: 12px; }
  .total-row .val { font-weight: 700; color: #073766; }
  .total-row.grand .val { color: #0875dc; font-size: 18px; }

  /* Notes */
  .notes { padding: 0 48px 24px; }
  .notes-box { background: #f8fafc; border: 1px solid #e8edf5; border-radius: 8px; padding: 14px 18px; font-size: 12px; color: #526983; line-height: 1.7; }

  /* Payment info */
  .payment-section { padding: 0 48px 28px; }
  .payment-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .payment-item { background: #f8fafc; border: 1px solid #e8edf5; border-radius: 8px; padding: 12px 14px; }
  .payment-item-label { font-size: 10px; color: #8b9dad; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  .payment-item-value { font-size: 13px; font-weight: 700; color: #073766; }

  /* Footer */
  .footer { background: #f8fafc; border-top: 1px solid #e8edf5; padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; }
  .footer-note { font-size: 11px; color: #8b9dad; line-height: 1.6; }
  .qr-placeholder { width: 64px; height: 64px; background: #e8edf5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #8b9dad; text-align: center; padding: 4px; }

  /* Watermark for paid */
  ${inv.status === "paid" ? `
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 96px; font-weight: 900; color: rgba(21,128,61,.06); pointer-events: none; white-space: nowrap; z-index: 0; }
  ` : ""}

  @media print {
    body { background: #fff; }
    .page { max-width: 100%; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${inv.status === "paid" ? '<div class="watermark">مدفوعة</div>' : ""}

<!-- Print button -->
<div class="no-print" style="background:#073766;color:#fff;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;">
  <span style="font-size:13px;font-weight:700;">معاينة الفاتورة الضريبية</span>
  <button onclick="window.print()" style="background:#0875dc;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">⬇ تحميل / طباعة</button>
</div>

<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">ATMMAM</div>
      <div class="brand-sub">منصة إدارة الأعمال</div>
    </div>
    <div class="inv-meta">
      <div class="inv-label">فاتورة ضريبية</div>
      <div class="inv-number">${inv.invoice_number}</div>
      <div class="inv-date">تاريخ الإصدار: ${fmtDate(inv.created_at as string)}</div>
      ${inv.due_date ? `<div class="inv-date">تاريخ الاستحقاق: ${fmtDate(inv.due_date as string)}</div>` : ""}
    </div>
  </div>

  <!-- Status -->
  <div class="status-bar">
    <div class="status-dot"></div>
    <span class="status-text">${st.ar}</span>
    ${inv.status === "paid" ? `<span class="status-stamp">✓ مدفوعة</span>` : ""}
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">من (المورد)</div>
      <div class="party-name">ATMMAM — منصة الأعمال</div>
      <div class="party-info">
        الرقم الضريبي: 300XXXXXXXXXX<br/>
        المملكة العربية السعودية
      </div>
    </div>
    <div class="party">
      <div class="party-label">إلى (العميل)</div>
      <div class="party-name">${client?.name || "—"}</div>
      <div class="party-info">
        ${client?.tax_number ? `الرقم الضريبي: ${client.tax_number}<br/>` : ""}
        ${client?.commercial_number ? `السجل التجاري: ${client.commercial_number}<br/>` : ""}
        ${client?.phone ? `الهاتف: ${client.phone}<br/>` : ""}
        ${client?.email ? `البريد: ${client.email}<br/>` : ""}
        ${client?.company_address || client?.city ? `العنوان: ${[client.company_address, client.city].filter(Boolean).join("، ")}` : ""}
      </div>
    </div>
  </div>

  <!-- Items -->
  <div class="items-section">
    <div class="section-title">تفاصيل الخدمة</div>
    <table>
      <thead>
        <tr>
          <th class="col-desc">الوصف</th>
          <th class="col-qty">الكمية</th>
          <th class="col-price">سعر الوحدة</th>
          <th class="col-total">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-desc">
            <strong>${inv.service_name || inv.description}</strong>
            ${inv.orders ? `<br/><span style="font-size:11px;color:#8b9dad;">رقم الطلب: ${(inv.orders as any).reference_no}</span>` : ""}
          </td>
          <td class="col-qty" style="text-align:center;">1</td>
          <td class="col-price" style="text-align:left;">${fmtMoney(inv.amount as number)} ${inv.currency}</td>
          <td class="col-total" style="text-align:left;">${fmtMoney(inv.amount as number)} ${inv.currency}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box" style="margin-right:auto;margin-top:16px;border:1px solid #e8edf5;border-radius:10px;padding:16px 20px;">
        <div class="total-row">
          <span>المبلغ قبل الضريبة</span>
          <span class="val">${fmtMoney(inv.amount as number)} ${inv.currency}</span>
        </div>
        <div class="total-row">
          <span>ضريبة القيمة المضافة (${inv.tax_rate}%)</span>
          <span class="val">${fmtMoney(inv.tax_amount as number)} ${inv.currency}</span>
        </div>
        <div class="total-row grand">
          <span>الإجمالي</span>
          <span class="val">${fmtMoney(inv.total_amount as number)} ${inv.currency}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Payment info -->
  ${inv.payment_method || inv.paid_at ? `
  <div class="payment-section">
    <div class="section-title">معلومات الدفع</div>
    <div class="payment-grid">
      ${inv.payment_method ? `<div class="payment-item"><div class="payment-item-label">طريقة الدفع</div><div class="payment-item-value">${paymentMethodAr[inv.payment_method as string] || inv.payment_method}</div></div>` : ""}
      ${inv.paid_at ? `<div class="payment-item"><div class="payment-item-label">تاريخ الدفع</div><div class="payment-item-value">${fmtDate(inv.paid_at as string)}</div></div>` : ""}
      <div class="payment-item"><div class="payment-item-label">العملة</div><div class="payment-item-value">${inv.currency}</div></div>
    </div>
  </div>
  ` : ""}

  <!-- Notes -->
  ${inv.notes ? `
  <div class="notes">
    <div class="section-title">ملاحظات</div>
    <div class="notes-box">${inv.notes}</div>
  </div>
  ` : ""}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-note">
      هذه فاتورة ضريبية إلكترونية صادرة وفق متطلبات هيئة الزكاة والضريبة والجمارك<br/>
      لا تحتاج إلى توقيع أو ختم لاعتمادها<br/>
      للاستفسار: support@atmmam.com
    </div>
    <div style="text-align:center;">
      <canvas id="qr" width="80" height="80"></canvas>
      <div style="font-size:9px;color:#8b9dad;margin-top:4px;">امسح للتحقق (ZATCA)</div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
  <script>
    QRCode.toCanvas(document.getElementById('qr'), '${zatcaQr}', {
      width: 80, margin: 1,
      color: { dark: '#073766', light: '#ffffff' }
    });
  </script>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.html"`,
    },
  });
}
