import { saveStoreIdentity, saveStoreOperations } from "@/app/[locale]/admin/stores/actions";

const input = "mt-2 min-h-12 w-full border border-forest/15 bg-white px-4 text-forest";

export function StoreIdentityEditor({ locale, store, canEdit }: { locale: string; store: any; canEdit: boolean }) {
  return <form action={saveStoreIdentity} className="grid gap-5 bg-white p-6 shadow-soft md:grid-cols-2">
    <input name="locale" type="hidden" value={locale} /><input name="storeId" type="hidden" value={store.id} />
    <h2 className="font-serif text-3xl text-forest md:col-span-2">Store identity</h2>
    <label>Name<input className={input} disabled={!canEdit} name="name" required defaultValue={store.name} /></label>
    <label>Public slug<input className={input} disabled={!canEdit} name="publicSlug" required defaultValue={store.public_slug} /></label>
    <label>Address line 1<input className={input} disabled={!canEdit} name="addressLine1" required defaultValue={store.address_line_1} /></label>
    <label>Address line 2<input className={input} disabled={!canEdit} name="addressLine2" defaultValue={store.address_line_2 ?? ""} /></label>
    <label>City<input className={input} disabled={!canEdit} name="city" required defaultValue={store.city} /></label>
    <label>Country code<input className={input} disabled={!canEdit} maxLength={2} name="countryCode" required defaultValue={store.country_code} /></label>
    <label>Postal code<input className={input} disabled={!canEdit} name="postalCode" defaultValue={store.postal_code ?? ""} /></label>
    <label>Ordering URL<input className={input} disabled={!canEdit} name="orderingUrl" type="url" defaultValue={store.ordering_url ?? ""} /></label>
    <label className="flex items-center gap-3"><input disabled={!canEdit} name="isPrimary" type="checkbox" defaultChecked={store.is_primary} /> Primary outlet</label>
    {canEdit && <button className="min-h-12 bg-forest px-6 font-bold text-white md:col-span-2" type="submit">Save store identity</button>}
  </form>;
}

export function StoreOperationsEditor({ locale, store, canEdit }: { locale: string; store: any; canEdit: boolean }) {
  return <form action={saveStoreOperations} className="grid gap-5 bg-white p-6 shadow-soft md:grid-cols-2">
    <input name="locale" type="hidden" value={locale} /><input name="storeId" type="hidden" value={store.id} />
    <h2 className="font-serif text-3xl text-forest md:col-span-2">Contact and location</h2>
    <label>Phone<input className={input} disabled={!canEdit} name="phone" defaultValue={store.phone ?? ""} /></label>
    <label>Public email<input className={input} disabled={!canEdit} name="publicEmail" type="email" defaultValue={store.public_email ?? ""} /></label>
    <label>Latitude<input className={input} disabled={!canEdit} name="latitude" type="number" step="0.000001" defaultValue={store.latitude ?? ""} /></label>
    <label>Longitude<input className={input} disabled={!canEdit} name="longitude" type="number" step="0.000001" defaultValue={store.longitude ?? ""} /></label>
    <label className="md:col-span-2">Map URL<input className={input} disabled={!canEdit} name="mapUrl" type="url" defaultValue={store.map_url ?? ""} /></label>
    {canEdit && <button className="min-h-12 bg-forest px-6 font-bold text-white md:col-span-2" type="submit">Save contact details</button>}
  </form>;
}
