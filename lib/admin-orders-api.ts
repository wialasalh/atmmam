import type { AdminOrder, OrderStatus } from "@/lib/admin-orders";
import { formatAppDateTime } from "@/lib/date-format";

type Relation={id?:string;name?:string;full_name?:string;phone?:string;email?:string};
type DatabaseOrder={id:string;reference_no:string;status:string;next_action_text?:string;next_action_at?:string;updated_at:string;clients?:Relation|null;services?:Relation|null;agencies?:Relation|null;profiles?:Relation|null};
const statusMap:Record<string,OrderStatus>={new:"جديد",waiting_documents:"بانتظار المستندات",in_progress:"قيد التنفيذ",completed:"مكتمل",blocked:"قيد التنفيذ",cancelled:"مكتمل"};

export async function fetchAdminOrdersFromApi():Promise<AdminOrder[]|null>{
  const response=await fetch("/api/admin/orders",{cache:"no-store"});if(!response.ok)return null;
  const payload=await response.json() as {data:DatabaseOrder[]};
  return payload.data.map((order)=>({databaseId:order.id,clientId:order.clients?.id,serviceId:order.services?.id,agencyId:order.agencies?.id,assigneeId:order.profiles?.id,id:order.reference_no,client:order.clients?.name??"عميل غير معروف",service:order.services?.name??"خدمة غير معروفة",agency:order.agencies?.name??"غير محددة",agencyType:order.agencies?.name?.includes("الزكاة")?"zatca":order.agencies?.name?.includes("التجارة")?"commerce":"ip",status:statusMap[order.status]??"جديد",assignee:order.profiles?.full_name??"غير مسند",updatedAt:formatAppDateTime(order.updated_at),phone:order.clients?.phone??"",email:order.clients?.email??"",nextAction:order.next_action_text??"تحديد الإجراء التالي",nextActionAt:order.next_action_at?formatAppDateTime(order.next_action_at):"غير محدد"}));
}
