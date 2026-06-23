"use client";

import { useEffect, useState } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { Search, FileText, ExternalLink, Eye } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ClientRecord = {
  id: string;
  name: string;
  client_type: string;
  phone: string;
  email: string | null;
  commercial_number: string | null;
  national_id: string | null;
  unified_register_number: string | null;
  company_address: string | null;
  company_activity: string | null;
  notes: string | null;
  commercial_register_doc: string | null;
  company_license_doc: string | null;
  national_id_doc: string | null;
  created_at: string;
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRecord | null>(null);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setClients(data as ClientRecord[]);
    setLoading(false);
  }

  const filtered = clients.filter((c) =>
    `${c.name} ${c.phone} ${c.email || ""} ${c.commercial_number || ""} ${c.national_id || ""}`
      .includes(search.trim())
  );

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="clients" />
      <div className="ops-layout">
        <div className="ops-main">
          <h1>العملاء</h1>

          <div className="ops-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
            <label>
              <Search size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الجوال أو البريد..." />
            </label>
          </div>

          <div className="ops-stats" style={{ position: "static", display: "flex", marginBottom: 18 }}>
            <article>
              <span>👥</span>
              <div><strong>{clients.length}</strong><small>إجمالي العملاء</small></div>
            </article>
            <article>
              <span>📋</span>
              <div><strong>{clients.filter(c => c.commercial_number).length}</strong><small>لديهم سجل تجاري</small></div>
            </article>
            <article>
              <span>📄</span>
              <div><strong>{clients.filter(c => c.commercial_register_doc || c.company_license_doc || c.national_id_doc).length}</strong><small>لديهم مستندات</small></div>
            </article>
          </div>

          {loading ? (
            <div className="ops-table-card"><div className="ops-table-scroll"><table><tbody><tr><td className="ops-empty" colSpan={8}>جاري التحميل...</td></tr></tbody></table></div></div>
          ) : filtered.length === 0 ? (
            <div className="ops-table-card"><div className="ops-table-scroll"><table><tbody><tr><td className="ops-empty" colSpan={8}>{search ? "لا توجد نتائج" : "لا يوجد عملاء مسجلون بعد."}</td></tr></tbody></table></div></div>
          ) : (
            <div className="ops-table-card">
              <div className="ops-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>العميل</th>
                      <th>الجوال</th>
                      <th>السجل التجاري</th>
                      <th>الرقم الموحد</th>
                      <th>الهوية</th>
                      <th>المستندات</th>
                      <th>تاريخ التسجيل</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} onClick={() => setSelected(c)}>
                        <td>
                          <div className="ops-owner">
                            <i>{(c.name || "?").charAt(0)}</i>
                            <div>
                              <strong>{c.name}</strong>
                              <br /><small style={{ color: "#8b9dad", fontSize: ".55rem" }}>{c.client_type === "company" ? "مؤسسة" : "فرد"}</small>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: ".65rem" }}>{c.phone}</td>
                        <td>{c.commercial_number ? <span className="ops-status new">{c.commercial_number}</span> : <small style={{ color: "#b0bcc9" }}>—</small>}</td>
                        <td>{c.unified_register_number ? <span className="ops-status new">{c.unified_register_number}</span> : <small style={{ color: "#b0bcc9" }}>—</small>}</td>
                        <td>{c.national_id ? <span className="ops-status new">{c.national_id}</span> : <small style={{ color: "#b0bcc9" }}>—</small>}</td>
                        <td style={{ fontSize: ".7rem" }}>
                          {[c.commercial_register_doc && "📋", c.company_license_doc && "📜", c.national_id_doc && "🪪"].filter(Boolean).join(" ") || <small style={{ color: "#b0bcc9" }}>—</small>}
                        </td>
                        <td style={{ fontSize: ".6rem", color: "#8b9dad" }}>{new Date(c.created_at).toLocaleDateString("ar-SA")}</td>
                        <td><Eye size={14} style={{ color: "#8b9dad" }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="ops-summary">
          {selected ? (
            <>
              <div className="ops-summary-head">
                <h2>{selected.name}</h2>
                <button onClick={() => setSelected(null)}>✕</button>
              </div>
              <dl>
                <div><dt>نوع العميل</dt><dd>{selected.client_type === "company" ? "مؤسسة" : "فرد"}</dd></div>
                <div><dt>الجوال</dt><dd>{selected.phone}</dd></div>
                {selected.email && <div><dt>البريد</dt><dd>{selected.email}</dd></div>}
                {selected.national_id && <div><dt>رقم الهوية</dt><dd>{selected.national_id}</dd></div>}
                {selected.commercial_number && <div><dt>رقم السجل التجاري</dt><dd>{selected.commercial_number}</dd></div>}
                {selected.unified_register_number && <div><dt>الرقم الموحد</dt><dd>{selected.unified_register_number}</dd></div>}
                {selected.company_address && <div><dt>العنوان</dt><dd>{selected.company_address}</dd></div>}
                {selected.company_activity && <div><dt>النشاط</dt><dd>{selected.company_activity}</dd></div>}
                {selected.notes && <div><dt>ملاحظات</dt><dd>{selected.notes}</dd></div>}
              </dl>
              <div className="ops-timeline" style={{ padding: "15px 20px" }}>
                <h3>المستندات</h3>
                {selected.commercial_register_doc && <DocLink label="السجل التجاري" path={selected.commercial_register_doc} />}
                {selected.company_license_doc && <DocLink label="رخصة المنشأة" path={selected.company_license_doc} />}
                {selected.national_id_doc && <DocLink label="صورة الهوية" path={selected.national_id_doc} />}
                {!selected.commercial_register_doc && !selected.company_license_doc && !selected.national_id_doc && (
                  <p style={{ color: "#b0bcc9", fontSize: ".65rem" }}>لا توجد مستندات مرفوعة.</p>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: 30, textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>
              <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
              <p>اختر عميلاً لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DocLink({ label, path }: { label: string; path: string }) {
  const supabase = createSupabaseBrowserClient();
  const [url, setUrl] = useState("");

  useEffect(() => {
    supabase.storage.from("client-documents").createSignedUrl(path, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [path]);

  return (
    <div style={{ marginBottom: 8 }}>
      <a href={url} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#0875dc", fontSize: ".65rem", textDecoration: "none" }}>
        <FileText size={14} /> {label} <ExternalLink size={12} />
      </a>
    </div>
  );
}
