import { NextRequest, NextResponse } from "next/server";
import { getPartnerReport, PartnerReportError } from "@/lib/partners/report";
import { partnerReportXlsx } from "@/lib/partners/report-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control":"private, no-store, max-age=0", "X-Content-Type-Options":"nosniff" };
  try {
    const params=request.nextUrl.searchParams;
    const report=await getPartnerReport({from:params.get("from")??undefined,to:params.get("to")??undefined,partner:params.get("partner")??undefined,store:params.get("store")??undefined});
    const bytes=await partnerReportXlsx(report);
    return new NextResponse(new Uint8Array(bytes),{headers:{...headers,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="QYJ_Partner_Report_${report.from}_${report.to}.xlsx"`}});
  } catch(error) {
    if(error instanceof PartnerReportError) return NextResponse.json({error:error.message},{status:error.status,headers});
    return NextResponse.json({error:"Unable to create the Excel report. Please try again."},{status:502,headers});
  }
}
