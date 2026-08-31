import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function WebhookEventsPage({ params }: { params: { locale: Locale } }) {
  await requireAdmin(params.locale);
  const { data: events } = await createServiceClient().from("webhook_events").select("id,provider,external_event_id,event_type,processing_status,processing_error,received_at,processed_at").order("received_at",{ascending:false}).limit(200);
  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-6xl"><h1 className="font-serif text-5xl">POS Webhook Events</h1><div className="mt-8 overflow-x-auto"><table className="w-full min-w-[900px] bg-white text-left"><thead><tr><th className="p-4">Received</th><th>Provider</th><th>External ID</th><th>Type</th><th>Status</th><th>Error</th></tr></thead><tbody>{(events??[]).map(event=><tr className={`border-t ${event.processing_status==="failed"?"bg-red-50":""}`} key={event.id}><td className="p-4">{new Date(event.received_at).toLocaleString("en-SG")}</td><td>{event.provider}</td><td>{event.external_event_id||"-"}</td><td>{event.event_type}</td><td>{event.processing_status}</td><td>{event.processing_error||"-"}</td></tr>)}</tbody></table></div></div></main>;
}
