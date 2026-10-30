"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveInventory } from "@/app/[locale]/admin/inventory/actions";
import type { InventoryFormState } from "@/lib/inventory/admin";

const errors: Record<string, [string, string]> = {
  opening: ["物料重复或已有期初记录，请检查；已有库存请使用盘点。", "Duplicate material or opening stock already exists. Review the batch; use stocktake for existing stock."],
  receipt: ["请核对待收数量：合格＋破损＋短缺须等于本批应到，且不得超过剩余待收。", "Check outstanding quantities: accepted + damaged + short must equal this delivery and not exceed the outstanding balance."],
  invalid: ["请检查必填项和数量（最多六位小数）。", "Check required fields and quantities (up to six decimal places)."],
  stale: ["库存已变化，请刷新页面后重新确认盘点。", "Stock has changed. Refresh and confirm the count again."],
  stock: ["库存不足，没有扣减。", "Insufficient stock. Nothing was deducted."],
  permission: ["你没有操作这项库存的权限。", "You do not have permission for this inventory operation."],
  whole: ["按个计的物料必须填写整数。", "Counted materials require whole units."],
  duplicate: ["编号或名称重复，或本次提交已使用不同资料。请检查后刷新。", "Duplicate identity or a submission key used with different data. Check and refresh."],
  unavailable: ["库存模块尚未启用，请联系管理员。", "Inventory is not enabled yet. Contact the administrator."],
  save: ["未能确认保存，请保留当前资料并重试；不要重复建立新单。", "Could not confirm the save. Keep these details and retry this submission."]
};

function Submit({ zh }: { zh: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="focus-ring rounded-full bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? (zh ? "保存中…" : "Saving…") : (zh ? "保存" : "Save")}</button>;
}

export function InventoryForm({ locale, operation, initialKey, children }: {
  locale: string; operation: string; initialKey: string; children: React.ReactNode;
}) {
  const [state, action] = useFormState<InventoryFormState, FormData>(saveInventory, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  const zh = locale === "zh";
  return <form ref={ref} action={action} className="grid gap-4">
    <input type="hidden" name="locale" value={locale} />
    <input type="hidden" name="operation" value={operation} />
    <input type="hidden" name="key" value={state.key ?? initialKey} />
    {children}
    <div aria-live="polite">{state.error && <p role="alert" className="text-sm text-red-700">{(errors[state.error] ?? errors.save)[zh ? 0 : 1]}</p>}
      {state.ok && <p className="text-sm text-forest">{state.noChange ? (zh ? "数量一致，无需调整。" : "Count matches. No adjustment needed.") : (zh ? "已保存。" : "Saved.")}</p>}</div>
    <div><Submit zh={zh} /></div>
  </form>;
}
