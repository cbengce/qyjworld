import { z } from 'zod';
const common={locale:z.enum(['en','zh']),key:z.string().uuid(),brandId:z.string().uuid(),storeId:z.union([z.string().uuid(),z.literal('')])};
const amount=z.string().regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/);
const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const text=z.string().trim().min(1).max(200);
export const assetInput=z.object({...common,operation:z.literal('asset'),supplierId:z.union([z.string().uuid(),z.literal('')]),name:text,reference:text,model:z.string().trim().max(200),acquiredOn:z.string().date(),startMonth:month,cost:amount,residual:amount,costStatus:z.enum(['estimated','actual']),notes:z.string().trim().max(1000)});
export const monthlyCostInput=z.object({...common,operation:z.literal('monthlyCost'),month,kind:z.enum(['budget','actual']),category:z.enum(['rent','season_parking','utilities','network','salary','other']),amount,reference:text,notes:z.string().trim().max(1000)});
export const openingInput=z.object({locale:z.enum(['en','zh']),key:z.string().uuid(),operation:z.literal('openingBatch'),locationId:z.string().uuid(),rows:z.string().max(30000).transform((v,ctx)=>{try{return JSON.parse(v);}catch{ctx.addIssue({code:z.ZodIssueCode.custom,message:'Invalid rows'});return z.NEVER;}}).pipe(z.array(z.object({materialId:z.string().uuid(),quantity:z.string().regex(/^(0|[1-9]\d{0,13})(\.\d{1,6})?$/)})).min(1).max(100))});
