/** Straight-line depreciation in whole SGD cents, 36 months; no tax depreciation rules. */
export function monthIndex(month: string) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
 return Number(month.slice(0,4))*12+Number(month.slice(5))-1;
}
export function depreciation36(costMinor:string,residualMinor:string,startMonth:string,reportMonth:string){
 if(!/^\d+$/.test(costMinor)||!/^\d+$/.test(residualMinor))throw new Error('Invalid asset amount');
 const cost=BigInt(costMinor),residual=BigInt(residualMinor);
 if(cost<=0n||residual<0n||residual>=cost)throw new Error('Invalid asset amount');
 const elapsed=monthIndex(reportMonth)-monthIndex(startMonth);
 const depreciable=cost-residual,base=depreciable/36n,extra=depreciable%36n;
 const months=Math.max(0,Math.min(36,elapsed+1));
 const count=BigInt(months),accumulated=base*count+(count<extra?count:extra);
 const current=elapsed<0||elapsed>=36?0n:base+(BigInt(elapsed)<extra?1n:0n);
 return {monthly:current.toString(),accumulated:accumulated.toString(),net:(cost-accumulated).toString(),months};
}
