'use client';
import {useState} from 'react';
export function OpeningRows({materials,zh}:{materials:{id:string;name:string;unit:string}[];zh:boolean}){
 const [rows,setRows]=useState([{materialId:'',quantity:''},{materialId:'',quantity:''},{materialId:'',quantity:''}]);
 const active=rows.filter(r=>r.materialId||r.quantity);
 const update=(i:number,key:'materialId'|'quantity',value:string)=>setRows(old=>old.map((r,n)=>n===i?{...r,[key]:value}:r));
 return <div><input type="hidden" name="rows" value={JSON.stringify(active)}/>
 <div className="grid gap-3">{rows.map((r,i)=><div key={i} className="grid grid-cols-[1fr_120px_auto] items-center gap-2"><label className="text-xs">{i===0?(zh?'物料／基本单位':'Material / base unit'):''}<select aria-label={`${zh?'物料':'Material'} ${i+1}`} value={r.materialId} onChange={e=>update(i,'materialId',e.target.value)} className="mt-1 w-full rounded border p-2 text-sm"><option value="">{zh?'请选择物料':'Choose material'}</option>{materials.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select></label><label className="text-xs">{i===0?(zh?'实盘数量':'Counted quantity'):''}<input aria-label={`${zh?'数量':'Quantity'} ${i+1}`} value={r.quantity} onChange={e=>update(i,'quantity',e.target.value)} inputMode="decimal" className="mt-1 w-full rounded border p-2 text-sm"/></label><button type="button" aria-label={`${zh?'删除行':'Remove row'} ${i+1}`} onClick={()=>setRows(old=>old.filter((_,n)=>n!==i))} className="mt-4 p-2">×</button></div>)}</div>
 <button type="button" disabled={rows.length>=100} onClick={()=>setRows(old=>[...old,{materialId:'',quantity:''}])} className="my-4 rounded border px-4 py-2 text-sm">{zh?'＋增加一行':'＋ Add row'}</button>
 <p className="mb-4 text-sm">{zh?`本批将录入 ${active.length} 项。数量全部是基本单位，不是箱数。`:`This batch contains ${active.length} items. Enter base units, not boxes.`}</p>
 <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1"/>{zh?'我已核对位置和实盘数量；这些物料尚未做期初建档。':'I have checked the location and physical counts. These materials have no opening stock recorded.'}</label></div>;
}
