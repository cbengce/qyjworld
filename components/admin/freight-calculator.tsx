'use client';
import { useState } from 'react';
import { allocateFreight, moneyMinor } from '@/lib/inventory/purchasing';
export function FreightCalculator({zh}:{zh:boolean}){
 const [result,setResult]=useState('');
 return <form className="grid gap-3" onSubmit={e=>{e.preventDefault();try{const d=new FormData(e.currentTarget);const weights=String(d.get('weights')).split(/\n/).filter(v=>v.trim()).map((line,i)=>({id:String(i+1),weight:line.trim()}));const shares=allocateFreight(moneyMinor(String(d.get('total'))),weights);setResult(shares.map(s=>`${s.id}: S$${BigInt(s.minor)/100n}.${(BigInt(s.minor)%100n).toString().padStart(2,'0')}`).join('\n'));}catch{setResult(zh?'请检查金额和分摊权重，权重必须大于0。':'Check the amount and positive allocation weights.');}}}>
 <p className="text-sm">{zh?'仅试算，不写入成本。各项权重须采用同一依据，例如全部按kg、体积或货值。':'Preview only; no cost is posted. Use one consistent basis for all lines, such as kg, volume or goods value.'}</p>
 <label>{zh?'本批运费总额（SGD）':'Total freight (SGD)'}<input name="total" required inputMode="decimal" className="block w-full rounded border p-2"/></label>
 <label>{zh?'每项物料的分摊权重，一项一行':'Allocation weight per material, one per line'}<textarea name="weights" required rows={4} className="block w-full rounded border p-2"/></label>
 <button className="rounded bg-forest p-3 text-white">{zh?'计算分摊':'Calculate allocation'}</button><pre aria-live="polite" className="whitespace-pre-wrap">{result}</pre></form>;
}
