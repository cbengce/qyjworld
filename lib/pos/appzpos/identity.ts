// Mirrors the provider-scoped transaction identity written by migration 0032.
export function appzposTransactionId(providerStoreId: string, orderReference: string) {
  return `${providerStoreId}:${orderReference}`;
}
