export type TicketExtraField = { label: string; value: string };

export type ParsedTicketDetails = {
  mainDescription: string;
  extraFields: TicketExtraField[];
};

export function parseTicketDetails(body?: string | null): ParsedTicketDetails {
  if (!body) return { mainDescription: "", extraFields: [] };

  const sep = "---\nمعلومات إضافية:";
  const idx = body.indexOf(sep);

  if (idx === -1) return { mainDescription: body, extraFields: [] };

  const mainDescription = body.slice(0, idx).trim();
  const extraPart = body.slice(idx + sep.length).trim();

  const fields: TicketExtraField[] = [];
  for (const line of extraPart.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(": ");
    if (colonIdx > 0) {
      fields.push({
        label: trimmed.slice(0, colonIdx).trim(),
        value: trimmed.slice(colonIdx + 2).trim(),
      });
    }
  }

  return { mainDescription, extraFields: fields };
}

export function getTicketRef(id: string): string {
  return `#${id.slice(0, 7).toUpperCase()}`;
}
