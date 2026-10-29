import { z } from 'zod';
const common = { locale: z.enum(['en','zh']), key: z.string().uuid() };
const text = z.string().trim().min(1).max(200);
const amount = z.string().regex(/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/);
export const supplierInput = z.object({ ...common, operation: z.literal('supplier'), brandId: z.string().uuid(), platform: z.enum(['pinduoduo','douyin','taobao','wechat']), companyName: text, supplierName: text });
export const paymentInput = z.object({ ...common, operation: z.literal('payment'), orderId: z.string().uuid(), paidOn: z.string().date(), originalAmount: amount.refine(v => /[1-9]/.test(v)), actualSgd: amount, feeSgd: amount, reference: text });
const quantity = z.string().regex(/^(0|[1-9]\d{0,7})(\.\d{1,6})?$/).refine(v => /[1-9]/.test(v));
export const purchaseInput = z.object({ ...common, operation: z.literal('purchase'), supplierId: z.string().uuid(), reference: text, currency: z.enum(['CNY','SGD']), orderedOn: z.string().date(), materialId: z.string().uuid(), packageLabel: text, packageQuantity: quantity, conversion: quantity, goodsAmount: amount });
