import Image from "next/image";
import { archiveProductImage, uploadProductImage } from "@/app/[locale]/admin/menu/actions";

export function ProductImageManager({ brandId, images, locale, productId }: { brandId: string; images: any[]; locale: string; productId: string }) {
  return <section className="bg-white p-6 shadow-soft"><h2 className="font-serif text-3xl text-forest">Images</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">{images.map((image) => <div className="border border-forest/10 p-3" key={image.id}><div className="relative aspect-square"><Image alt={image.alt_text_en || "Product image"} className="object-contain" fill sizes="240px" src={image.image_url} unoptimized={image.image_url.startsWith("http")} /></div>{image.is_primary && <p className="mt-2 text-xs font-bold uppercase text-gold">Primary</p>}<form action={archiveProductImage} className="mt-3"><input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="productId" type="hidden" value={productId} /><input name="imageId" type="hidden" value={image.id} /><button className="text-sm font-bold text-red-700" type="submit">Archive image</button></form></div>)}</div>
    <form action={uploadProductImage} className="mt-6 grid gap-4 md:grid-cols-2">
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="productId" type="hidden" value={productId} />
      <input accept="image/jpeg,image/png,image/webp" className="min-h-12 border border-forest/15 p-3" name="image" required type="file" />
      <input className="min-h-12 border border-forest/15 px-4" name="altTextEn" placeholder="Descriptive English alt text" required />
      <label className="flex items-center gap-3"><input name="isPrimary" type="checkbox" /> Set as primary</label>
      <button className="min-h-12 bg-forest px-6 font-bold text-white" type="submit">Upload image</button>
    </form>
  </section>;
}
