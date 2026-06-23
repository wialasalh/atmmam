export type TicketStatus = "جديدة" | "قيد المراجعة" | "بانتظار العميل" | "تم الحل" | "مغلقة";

export type Ticket = {
  id: string;
  title: string;
  type: string;
  requesterName?: string;
  contact?: string;
  priority?: "عادية" | "مرتفعة" | "عاجلة";
  body: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  messages: Array<{
    author: "customer" | "admin";
    body: string;
    createdAt: string;
  }>;
};

export const TICKETS_STORAGE_KEY = "atmmam:tickets";

export function createTicketId() {
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  const timePart = Date.now().toString().slice(-5);
  return `ATM-${timePart}-${randomPart}`;
}

export function readTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  const rawTickets = readStoredTickets();
  if (!rawTickets) return [];
  try {
    return JSON.parse(rawTickets) as Ticket[];
  } catch {
    return [];
  }
}

export function writeTickets(tickets: Ticket[]) {
  const serializedTickets = JSON.stringify(tickets);
  try {
    window.localStorage?.setItem(TICKETS_STORAGE_KEY, serializedTickets);
  } catch {}
  document.cookie = `${TICKETS_STORAGE_KEY}=${encodeURIComponent(serializedTickets)}; path=/; max-age=2592000; SameSite=Lax`;
}

export function saveTicket(ticket: Ticket) {
  const tickets = readTickets();
  const existingIndex = tickets.findIndex((item) => item.id === ticket.id);
  if (existingIndex === -1) {
    writeTickets([ticket, ...tickets]);
    return;
  }
  const nextTickets = [...tickets];
  nextTickets[existingIndex] = ticket;
  writeTickets(nextTickets);
}

export function findTicket(id: string) {
  return readTickets().find((ticket) => ticket.id === id);
}

export function encodeTicket(ticket: Ticket) {
  return encodeURIComponent(JSON.stringify(ticket));
}

export function decodeTicket(value: string) {
  try {
    return JSON.parse(decodeURIComponent(value)) as Ticket;
  } catch {
    return null;
  }
}

function readStoredTickets() {
  try {
    const localTickets = window.localStorage?.getItem(TICKETS_STORAGE_KEY);
    if (localTickets) return localTickets;
  } catch {}
  const cookiePrefix = `${TICKETS_STORAGE_KEY}=`;
  const cookieValue = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(cookiePrefix))
    ?.slice(cookiePrefix.length);
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}
