// Foundation contract only: not wired to checkout, POS ingestion or menu availability.
// Keep NUMERIC quantities as decimal strings across database/API boundaries.
export type InventoryQuantity = string;
export type InventoryBaseUnit = "each" | "g" | "ml";
export type InventoryMaterialCategory = "ingredient" | "packaging" | "gift" | "consumable";
export type InventoryMovementKind = "opening" | "receipt" | "issue" | "consumption" | "wastage" | "adjustment";

export type InventoryMaterial = {
  id: string;
  brand_id: string;
  sku: string;
  name: string;
  category: InventoryMaterialCategory;
  base_unit: InventoryBaseUnit;
  attributes: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InventoryMaterialUnit = {
  id: string;
  brand_id: string;
  material_id: string;
  unit_label: string;
  base_quantity: InventoryQuantity;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InventoryLocation = {
  id: string;
  brand_id: string;
  store_id: string | null;
  location_code: string;
  name: string;
  kind: "store" | "warehouse";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InventoryBalance = {
  brand_id: string;
  location_id: string;
  material_id: string;
  quantity: InventoryQuantity;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  brand_id: string;
  location_id: string;
  material_id: string;
  movement_kind: InventoryMovementKind;
  quantity_delta: InventoryQuantity;
  base_unit: InventoryBaseUnit;
  reason: string;
  idempotency_key: string;
  actor_user_id: string;
  occurred_at: string;
  created_at: string;
};

export type PostInventoryMovement = {
  p_location_id: string;
  p_material_id: string;
  p_kind: InventoryMovementKind;
  p_quantity_delta: InventoryQuantity;
  p_reason: string;
  p_idempotency_key: string;
  p_occurred_at?: string | null;
};

export type InventoryReorderSetting = {
  brand_id: string;
  location_id: string;
  material_id: string;
  minimum_quantity: InventoryQuantity;
  lead_time_days: number;
  updated_at: string;
};
