import ExcelJS from "exceljs";
import type { PartnerReport } from "@/lib/partners/report";

export async function partnerReportXlsx(report: PartnerReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QINGYUNJIAN";
  workbook.created = new Date(report.generatedAt);
  workbook.calcProperties.fullCalcOnLoad = true;
  const moneyFormat = '"S$"#,##0.00';
  function sheet(name: string, headers: string[], widths: number[]) {
    const ws = workbook.addWorksheet(name, { views:[{state:"frozen",ySplit:6}], pageSetup:{paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:6",margins:{left:0.3,right:0.3,top:0.4,bottom:0.4,header:0.2,footer:0.2}} });
    ws.columns = widths.map(width=>({width}));
    for (const [row,value] of [[1,"QINGYUNJIAN · Partner Daily Report"],[2,`${report.scopeName} · ${report.storeName}`],[3,`${report.from} to ${report.to} · Singapore time`],[4,"Paid/completed orders only. Missing commission is pending review."]] as const) {
      ws.mergeCells(row,1,row,headers.length); ws.getCell(row,1).value=value;
      ws.getRow(row).height=row===1?30:24;
    }
    ws.getCell("A1").font={name:"Calibri",size:18,bold:true,color:{argb:"FF153E31"}};
    ws.getCell("A2").font={name:"Calibri",size:12,bold:true};
    ws.getRow(6).values=headers;ws.getRow(6).height=32;
    ws.getRow(6).eachCell(cell=>{cell.font={bold:true,color:{argb:"FFFFFFFF"}};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF153E31"}};cell.alignment={vertical:"middle",wrapText:true};});
    ws.headerFooter.oddFooter="QINGYUNJIAN | Page &P of &N";
    return ws;
  }
  const daily = sheet("Daily summary",["Date (SGT)","Partner","Partner Code","Paid orders","Cups","Paid sales (SGD)","Commission (SGD)","Commission status"],[16,28,16,14,12,20,20,24]);
  for (const row of report.daily) daily.addRow([new Date(`${row.day}T00:00:00Z`),row.partnerName,row.partnerCode,row.orders,row.cups,row.paidMinor/100,row.missingCommission?null:row.commissionMinor/100,row.missingCommission?`${row.missingCommission} orders pending review`:"Complete"]);
  daily.getColumn(1).numFmt="dd mmm yyyy";
  daily.getColumn(4).numFmt=daily.getColumn(5).numFmt="#,##0";
  daily.getColumn(6).numFmt=daily.getColumn(7).numFmt=moneyFormat;
  const detail = sheet("Order details",["Order","Date / time (SGT)","Partner","Partner Code","Store","Status","Cups","Gross (SGD)","Discounts (SGD)","Paid sales (SGD)","Commission (SGD)","Commission status"],[18,24,28,16,24,16,10,18,18,18,18,24]);
  for (const row of report.details) detail.addRow([row.order_reference,new Date(Date.parse(row.order_created_at)+8*3600000),row.partners?.partner_name??report.scopeName,row.partners?.partner_code??"",row.stores?.name??"Store",row.order_status,row.cup_quantity,Number(row.subtotal_minor)/100,(Number(row.discount_minor)+Number(row.item_discount_minor)+Number(row.coupon_discount_minor))/100,Number(row.total_payable_minor)/100,row.commissionMinor===null?null:row.commissionMinor/100,row.commissionMinor===null?"Pending review":"Complete"]);
  detail.getColumn(2).numFmt="dd mmm yyyy hh:mm";detail.getColumn(7).numFmt="#,##0";
  for (const col of [8,9,10,11]) detail.getColumn(col).numFmt=moneyFormat;
  function finish(ws: ExcelJS.Worksheet, mergeEnd: number, totals: Array<[number,number|null]>, statusColumn: number) {
    const lastData = ws.rowCount;
    if (lastData>=7) ws.autoFilter={from:{row:6,column:1},to:{row:lastData,column:ws.columnCount}};
    const totalRow=ws.addRow([]).number;ws.mergeCells(totalRow,1,totalRow,mergeEnd);ws.getCell(totalRow,1).value="Period total";
    for (const [column,result] of totals) {
      if (result===null) {ws.getCell(totalRow,column).value=null;continue;}
      const letter=ws.getColumn(column).letter;
      ws.getCell(totalRow,column).value=lastData>=7?{formula:`SUM(${letter}7:${letter}${lastData})`,result}:result;
    }
    ws.getCell(totalRow,statusColumn).value=report.totals.missingCommission?`${report.totals.missingCommission} orders pending review`:"Complete";
    ws.getRow(totalRow).font={bold:true};ws.getRow(totalRow).height=28;
    ws.eachRow((row,n)=>{if(n>=7){row.height=28;row.eachCell(cell=>{cell.alignment={vertical:"middle",wrapText:true};cell.border={bottom:{style:"hair",color:{argb:"FFD9E2DD"}}};});}});
    ws.pageSetup.printArea=`A1:${ws.getColumn(ws.columnCount).letter}${totalRow}`;
  }
  const totals=report.totals;const commission=totals.missingCommission?null:totals.commissionMinor/100;
  finish(daily,3,[[4,totals.orders],[5,totals.cups],[6,totals.paidMinor/100],[7,commission]],8);
  finish(detail,6,[[7,totals.cups],[8,totals.grossMinor/100],[9,totals.discountMinor/100],[10,totals.paidMinor/100],[11,commission]],12);
  return workbook.xlsx.writeBuffer();
}
