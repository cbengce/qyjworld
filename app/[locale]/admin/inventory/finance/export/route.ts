import ExcelJS from 'exceljs';
import {NextRequest} from 'next/server';
import {requireAdmin} from '@/lib/data';
import {readInventoryTable} from '@/lib/inventory/admin';
import {monthIndex,depreciation36} from '@/lib/inventory/finance';
import {singaporeMonth} from '@/lib/inventory/finance-admin';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:{locale:string}}){
 await requireAdmin(params.locale==='zh'?'zh':'en');
 const month=request.nextUrl.searchParams.get('month')??singaporeMonth();
 try{monthIndex(month);}catch{return new Response('Invalid month',{status:400});}
 try{
 const [assets,costs]=await Promise.all([readInventoryTable('inventory_fixed_assets','id,brand_id,store_id,asset_name,asset_reference,model,acquired_on,depreciation_start,cost_sgd_minor::text,residual_sgd_minor::text,cost_status,notes'),readInventoryTable('inventory_monthly_costs','id,brand_id,store_id,expense_month,entry_kind,category,amount_sgd_minor::text,reference,notes')]);
 const wb=new ExcelJS.Workbook();wb.creator='QINGYUNJIAN';
 const guide=wb.addWorksheet('Read me');guide.addRows([
 ['QINGYUNJIAN - partial monthly accounting data',month],
 ['Not a complete P&L or Balance Sheet. Only entered records are included.'],
 ['Assets use 36 full calendar months from the explicitly entered depreciation-start month.'],
 ['Estimated asset costs are marked; reconcile before posting to accounts.'],
 ['Budget and actual expense rows are separate. Do not add budgets to actual expenses.'],
 ['Actual expenses do not prove cash payment. Salary rows are manual summaries, not payroll calculations.'],
 ['Sales, inventory valuation, bank balances, tax and other unrecorded accounts are not included.'],
 ['Prior asset carrying values and historical depreciation require reconciliation.']]);guide.getColumn(1).width=110;
 const sheet=wb.addWorksheet('Fixed assets');sheet.columns=[
 {header:'Asset reference',key:'ref',width:24},{header:'Asset',key:'name',width:30},{header:'Store ID (blank = shared)',key:'store',width:38},
 {header:'Cost status',key:'status',width:15},{header:'Acquired',key:'date',width:15},{header:'Depreciation start',key:'start',width:20},
 {header:'Cost SGD',key:'cost',width:18},{header:'Residual SGD',key:'residual',width:18},{header:'This month SGD',key:'monthly',width:18},
 {header:'Accumulated SGD',key:'accumulated',width:20},{header:'Net value SGD',key:'net',width:18}];
 for(const a of assets.filter(a=>String(a.acquired_on).slice(0,7)<=month)){
 const d=depreciation36(String(a.cost_sgd_minor),String(a.residual_sgd_minor),String(a.depreciation_start).slice(0,7),month);
 sheet.addRow({ref:a.asset_reference,name:a.asset_name,store:a.store_id??'',status:a.cost_status,date:a.acquired_on,start:a.depreciation_start,cost:Number(a.cost_sgd_minor)/100,residual:Number(a.residual_sgd_minor)/100,monthly:Number(d.monthly)/100,accumulated:Number(d.accumulated)/100,net:Number(d.net)/100});}
 for(let c=7;c<=11;c++)sheet.getColumn(c).numFmt='0.00';
 const expenses=wb.addWorksheet('Monthly costs');expenses.columns=[{header:'Month',key:'month',width:15},{header:'Budget or actual',key:'kind',width:20},{header:'Category',key:'category',width:20},{header:'Store ID',key:'store',width:38},{header:'Amount SGD',key:'amount',width:18},{header:'Reference',key:'reference',width:30},{header:'Notes',key:'notes',width:50}];
 for(const c of costs.filter(c=>String(c.expense_month).slice(0,7)===month))expenses.addRow({month,kind:c.entry_kind,category:c.category,store:c.store_id??'',amount:Number(c.amount_sgd_minor)/100,reference:c.reference,notes:c.notes});expenses.getColumn(5).numFmt='0.00';
 for(const s of [sheet,expenses]){s.getRow(1).font={bold:true};s.views=[{state:'frozen',ySplit:1}];}
 const bytes=await wb.xlsx.writeBuffer();return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="QYJ-partial-accounts-${month}.xlsx"`,'Cache-Control':'private, no-store'}});
 }catch{return new Response('Accounting export unavailable. No incomplete workbook was returned.',{status:503});}
}
