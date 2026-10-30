import { createClient } from '@/lib/supabase/server';
export async function financeBrands(){
 const db=createClient();const {data,error}=await db.from('brands').select('id,name_en').eq('status','active').is('deleted_at',null).order('id').limit(500);
 if(error||(data?.length??0)>=500)throw new Error('Brand data unavailable');
 const checked=await Promise.all((data??[]).map(async b=>{
  const p=await db.rpc('inventory_has_permission',{p_permission:'inventory.manage',p_brand_id:b.id});
  if(p.error)throw p.error;return p.data===true?b:null;
 }));return checked.filter((b):b is {id:string;name_en:string}=>b!==null);
}
export function singaporeMonth(){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;
}
