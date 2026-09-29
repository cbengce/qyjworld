import { NextRequest, NextResponse } from "next/server";
import { runAppzposPolling } from "@/lib/pos/appzpos/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function handle(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const from = params.get("from") ? new Date(params.get("from")!) : undefined;
  const to = params.get("to") ? new Date(params.get("to")!) : undefined;
  if ((from && Number.isNaN(from.valueOf())) || (to && Number.isNaN(to.valueOf()))) return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  try {
    const stores = await runAppzposPolling({ from, to });
    return NextResponse.json({ ok: true, stores });
  } catch (error) {
    console.error("[APPZPOS_POLL_FAILED]", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "APPZPOS polling failed." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
