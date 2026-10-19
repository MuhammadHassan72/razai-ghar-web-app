export type ISODateTime = string;
export type EntityId = string;
export type ProductRole =
  | "sheet_set"
  | "fitted_sheet"
  | "duvet_cover"
  | "blanket"
  | "throw"
  | "cushion_cover"
  | "pillow_insert"
  | "duvet_insert";
export type LayerGroup = "foundation" | "top" | "cushions";
export type Fiber =
  | "Egyptian Cotton"
  | "French Linen"
  | "Organic Cotton"
  | "Cotton"
  | "Merino Wool"
  | "Cashmere"
  | "Recycled Polyester"
  | "European Down"
  | "Feather";
export type Weave =
  | "Percale"
  | "Sateen"
  | "Chunky Knit"
  | "Sherpa Fleece"
  | "Waffle"
  | "Plain Weave"
  | "Twill";
export type PublicationState = "draft" | "published" | "archived";
export type Role =
  | "guest"
  | "customer"
  | "catalog_editor"
  | "marketing_manager"
  | "fulfillment_operator"
  | "inventory_manager"
  | "finance"
  | "administrator";
export type ViewMode = "storefront" | "builder" | "sanctuary" | "admin";
export type DataSource = "qa_fixture";
export interface Money {
  amount_minor: number;
  currency: string;
  precision: number;
}
export interface SizeSpec {
  id: EntityId;
  market: string;
  label: string;
  width_mm: number;
  length_mm: number;
  pocket_depth_mm?: number;
  measurement_tolerance: { plus_minus_mm: number; basis: string };
  product_role: ProductRole | "mattress";
  display_inches: { width: number; length: number; pocket_depth?: number };
}
export interface SwatchColor {
  id: EntityId;
  name: string;
  hex: `#${string}`;
  family:
    | "White"
    | "Beige"
    | "Tan"
    | "Taupe"
    | "Terracotta"
    | "Pink"
    | "Green"
    | "Blue"
    | "Gray";
  screen_disclosure: string;
}
export interface FiberComponent {
  fiber: Fiber;
  percentage: number;
  origin?: string;
  evidence_reference: string;
}
export interface ProductMedia {
  id: EntityId;
  url: string;
  alt: string;
  width: number;
  height: number;
  kind: "editorial" | "product" | "texture";
  rights_reference: string;
  fidelity: "editorial_reference" | "approved_variant";
}
export interface FeelAssessment {
  softness: number | null;
  warmth: number | null;
  breathability: number | null;
  notes: { softness: string; warmth: string; breathability: string };
  method: string;
  rubric: string;
  assessed_at: ISODateTime;
  evidence_reference: string;
  disclosure: string;
}
export interface Product {
  schema_version: 1;
  id: EntityId;
  revision: number;
  slug: string;
  title: string;
  description: string;
  category:
    "Sheets" | "Duvet Covers" | "Blankets & Throws" | "Cushions" | "Inserts";
  product_role: ProductRole;
  status: PublicationState;
  fibers: FiberComponent[];
  weave: Weave;
  construction: "woven" | "knitted" | "fleece" | "quilted" | "weighted";
  gsm: number | null;
  thread_count: { value: number; basis: "threads_per_square_inch" } | null;
  total_weight_kg: number | null;
  facts_evidence: {
    reference: string;
    verification: "qa_fixture_only";
    disclosure: string;
  };
  feel: FeelAssessment;
  contents: { name: string; quantity: number; note: string }[];
  insert_included: boolean;
  care: {
    wash_celsius: number | null;
    drying: string;
    bleaching: string;
    ironing: string;
    limitations: string;
  };
  media: ProductMedia[];
  related_product_ids: EntityId[];
  featured_rank: number;
  seo?: { title: string; description: string };
  data_source: DataSource;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
export interface SellableVariant {
  schema_version: 1;
  id: EntityId;
  revision: number;
  product_id: EntityId;
  sku: string;
  color_id: EntityId;
  size_id: EntityId;
  fibers: FiberComponent[];
  weave: Weave;
  active: boolean;
  sale_uom: "set" | "each";
  price: Money;
  sale: {
    price: Money;
    reference_price: Money;
    starts_at: ISODateTime;
    ends_at: ISODateTime;
  } | null;
  bundle_eligible: boolean;
  shipping_eligible: boolean;
  compatible_bed_size_ids: EntityId[];
  compatible_insert_variant_ids: EntityId[];
  availability: {
    warehouse_id: EntityId;
    inventory_id: EntityId;
    policy: "finite";
  };
  media_ids: EntityId[];
}
export type BedSlotId =
  | "foundation"
  | "main_top"
  | "throw"
  | "cushion_1"
  | "cushion_2"
  | "cushion_3"
  | "cushion_4"
  | "cushion_5";
export interface BedSlot {
  slot_id: BedSlotId;
  variant_id: EntityId | null;
  quantity: 1;
  position: { x: number; y: number; z: number };
  state: "selected" | "skipped" | "unresolved";
  source_label?: string;
  pending_options?: {
    product_id: EntityId;
    color_id: EntityId | null;
    size_id: EntityId | null;
  };
}
export interface BedSelection {
  schema_version: 1;
  market: string;
  locale: string;
  bed_size_id: EntityId;
  fit_confirmed?: boolean;
  step_intent?: Record<
    "foundation" | "top" | "cushions",
    "open" | "configured" | "skipped"
  >;
  slots: BedSlot[];
  insert_links: { slot_id: BedSlotId; variant_id: EntityId; quantity: 1 }[];
  selection_revision: number;
}
export interface CartLine {
  id: EntityId;
  variant_id: EntityId;
  quantity: number;
  bundle_instance_id: EntityId | null;
  slot_ids: BedSlotId[];
  insert_for_line_id: EntityId | null;
}
export interface CartBundle {
  id: EntityId;
  name: string;
  selection: BedSelection;
  complete_bed: boolean;
}
export interface DestinationContext {
  country: string;
  region: string;
  shipping_method_id: EntityId;
}
export interface Cart {
  schema_version: 1;
  id: EntityId;
  owner_id: EntityId;
  revision: number;
  market: string;
  currency: string;
  bundles: CartBundle[];
  lines: CartLine[];
  promo_code: string | null;
  destination: DestinationContext | null;
  latest_quote_id: EntityId | null;
  updated_at: ISODateTime;
}
export interface QuoteLine {
  id: EntityId;
  variant_id: EntityId;
  product_id: EntityId;
  sku: string;
  title: string;
  category: Product["category"];
  product_role: ProductRole;
  color: SwatchColor;
  size: SizeSpec;
  contents: Product["contents"];
  image_url: string;
  quantity: number;
  bundle_instance_id: EntityId | null;
  unit_price: Money;
  reference_price: Money | null;
  subtotal: Money;
  discount: Money;
  total: Money;
  discount_source: "bundle" | "promo" | "none";
  on_sale: boolean;
  bundle_eligible: boolean;
  shipping_eligible: boolean;
}
export interface CommerceQuote {
  schema_version: 1;
  quote_id: EntityId;
  cart_id: EntityId;
  input_revision: number;
  input_hash: string;
  policy_version: number;
  currency: string;
  precision: number;
  lines: QuoteLine[];
  bundle_tiers: {
    bundle_instance_id: EntityId;
    groups: LayerGroup[];
    basis_points: number;
    discount: Money;
  }[];
  subtotal: Money;
  discount: Money;
  merchandise_total: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  shipping_state: "estimated" | "confirmed";
  tax_state: "estimated" | "confirmed";
  total_state: "estimated" | "confirmed";
  shipping_progress: {
    threshold: Money;
    qualifying: Money;
    remaining: Money;
    percent: number;
    unlocked: boolean;
  } | null;
  applied_discount: "bundle" | "promo" | "none";
  promo_code: string | null;
  comparison: {
    bundle_payable: Money;
    promo_payable: Money | null;
    explanation: string;
  };
  warnings: {
    code: string;
    message: string;
    line_id?: EntityId;
    blocking: boolean;
  }[];
  created_at: ISODateTime;
  expires_at: ISODateTime;
  data_source: DataSource;
}
export interface SavedBedLook {
  schema_version: 1;
  id: EntityId;
  owner_id: EntityId;
  name: string;
  selection: BedSelection;
  source_labels: Record<string, string>;
  revision: number;
  thumbnail: { status: "item_collage" | "unavailable"; urls: string[] };
  deleted_at: ISODateTime | null;
  purge_after: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
export interface PromoCode {
  schema_version: 1;
  id: EntityId;
  revision: number;
  version: number;
  name: string;
  code: string;
  status: PublicationState;
  enabled: boolean;
  benefit:
    | { type: "percent"; basis_points: number }
    | { type: "fixed"; amount: Money }
    | { type: "shipping"; amount: Money | null };
  starts_at: ISODateTime;
  ends_at: ISODateTime;
  timezone: string;
  eligible_categories: Product["category"][];
  excluded_variant_ids: EntityId[];
  minimum_subtotal: Money;
  maximum_discount: Money | null;
  global_usage_limit: number | null;
  per_customer_usage_limit: number | null;
  stacking: "none" | "shipping_with_bundle";
  include_sale_items: boolean;
  markets: string[];
  channels: "web"[];
  updated_at: ISODateTime;
}
export interface BundlePolicy {
  schema_version: 1;
  id: EntityId;
  version: number;
  enabled: boolean;
  starts_at: ISODateTime;
  ends_at: ISODateTime | null;
  eligible_groups: LayerGroup[];
  excluded_variant_ids: EntityId[];
  tiers: { group_count: 1 | 2 | 3; basis_points: number }[];
  maximum_discount: Money | null;
  limits: {
    foundation: 1;
    main_top: 1;
    throw: 1;
    cushions: number;
    insert_per_cover: 1;
  };
  sale_item_treatment: "exclude" | "include";
  stacking: "none";
  refund_policy_reference: string;
}
export interface HeroBannerConfig {
  featured_product_ids?: string[];
  schema_version: 1;
  id: EntityId;
  revision: number;
  internal_name: string;
  page: "/" | "/shop" | "/create-your-bed";
  placement: "hero" | "announcement";
  headline: string;
  supporting_copy: string;
  primary_cta: { label: string; href: string } | null;
  secondary_cta: { label: string; href: string } | null;
  desktop_media: ProductMedia | null;
  mobile_media: ProductMedia | null;
  decorative: boolean;
  focal_points: {
    desktop: { x: number; y: number };
    mobile: { x: number; y: number };
  };
  announcement_text: string | null;
  starts_at: ISODateTime;
  ends_at: ISODateTime | null;
  locale: string;
  priority: number;
  status: PublicationState;
  author_id: EntityId;
  published_at: ISODateTime | null;
  updated_at: ISODateTime;
}
export interface CustomerProfile {
  schema_version: 1;
  id: EntityId;
  revision: number;
  display_name: string;
  email: string;
  phone: string | null;
  locale: string;
  preferred_units: "metric" | "imperial";
  communication_preferences: {
    email_marketing: boolean;
    sms_marketing: boolean;
    consent_updated_at: ISODateTime;
  };
  updated_at: ISODateTime;
}
export interface CustomerAddress {
  schema_version: 1;
  id: EntityId;
  owner_id: EntityId;
  revision: number;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  phone: string | null;
  label: string;
  default_shipping: boolean;
  default_billing: boolean;
  updated_at: ISODateTime;
}
export interface BedPreference {
  schema_version: 1;
  id: EntityId;
  owner_id: EntityId;
  revision: number;
  name: string;
  market: string;
  bed_size_id: EntityId;
  mattress_width_mm: number;
  mattress_length_mm: number;
  mattress_depth_mm: number;
  preferred_units: "metric" | "imperial";
  preferred_feel: "light" | "balanced" | "warm" | null;
  preferred_fibers: Fiber[];
  preferred_color_families: SwatchColor["family"][];
  is_default: boolean;
  updated_at: ISODateTime;
}
export type FulfillmentState =
  | "placed"
  | "processing"
  | "quality_check"
  | "qc_hold"
  | "ready_to_ship"
  | "partially_shipped"
  | "shipped"
  | "partially_delivered"
  | "delivered"
  | "partially_cancelled"
  | "cancelled";
export interface OrderProjection {
  schema_version: 1;
  id: EntityId;
  reference: string;
  owner_id: EntityId;
  revision: number;
  cart_id: EntityId;
  cart_revision: number;
  customer_snapshot: { display_name: string; email: string };
  shipping_address: CustomerAddress;
  destination: DestinationContext;
  quote_snapshot: CommerceQuote;
  policy_snapshot: BundlePolicy;
  bundle_snapshots?: CartBundle[];
  lines: {
    line_id: EntityId;
    quantity: number;
    reserved: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  }[];
  payment_state:
    | "pending"
    | "paid"
    | "failed"
    | "expired"
    | "partially_refunded"
    | "refunded";
  captured: Money;
  refunded: Money;
  financial_events?: {
    id: string;
    type: "capture" | "refund";
    at: ISODateTime;
    amount: Money;
    evidence: string;
  }[];
  fulfillment_state: FulfillmentState;
  return_state: "none" | "partially_returned" | "returned";
  qc: {
    inspection_reference: string;
    operator: string;
    checklist: string[];
    result: "pending" | "passed" | "hold";
    reason: string;
  } | null;
  shipments: {
    id: EntityId;
    carrier: string;
    service: string;
    tracking_reference: string;
    dispatch_evidence: string;
    delivery_note_reference: string;
    dispatched_at: ISODateTime;
    delivered_at: ISODateTime | null;
    delivery_evidence: string | null;
    lines: { line_id: EntityId; quantity: number }[];
  }[];
  timeline: {
    id: EntityId;
    type: string;
    at: ISODateTime;
    actor_id: EntityId;
    message: string;
    evidence: string | null;
  }[];
  reservation_expires_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  data_source: DataSource;
}
export interface InventoryBalance {
  id: EntityId;
  variant_id: EntityId;
  warehouse_id: EntityId;
  revision: number;
  on_hand: number;
  reserved: number;
  reorder_threshold: number;
}
export interface WishlistEntry {
  id: EntityId;
  owner_id: EntityId;
  product_id: EntityId;
  variant_id: EntityId | null;
  created_at: ISODateTime;
}
export interface UndoRecord {
  id: EntityId;
  owner_id: EntityId;
  kind: "wishlist_move" | "look_delete";
  expires_at: ISODateTime;
  entry: WishlistEntry | null;
  look_id: EntityId | null;
  cart_id: EntityId | null;
  cart_revision_after: number | null;
  line_id: EntityId | null;
  quantity_delta: number;
}
export interface AuditEntry {
  id: EntityId;
  actor_id: EntityId;
  role: Role;
  action: string;
  entity_id: EntityId;
  at: ISODateTime;
  reason: string;
  before_revision: number;
  after_revision: number;
}
export interface RealtimeEvent {
  event_id: EntityId;
  schema_version: 1;
  aggregate_type: "commerce";
  aggregate_id: EntityId;
  aggregate_version: number;
  event_type: string;
  occurred_at: ISODateTime;
}
export interface CommerceErrorData {
  code: string;
  message: string;
  field_errors: Record<string, string>;
  retryable: boolean;
  current_revision?: number;
}
export interface CommerceRecipe {
  id: EntityId;
  name: string;
  description: string;
  image: ProductMedia;
  selection: BedSelection;
  data_source: DataSource;
}
export interface CatalogDraft {
  product: Product;
  variants: SellableVariant[];
}
export interface MarketPolicy {
  id: string;
  country: string;
  currency: string;
  precision: number;
  shipping_method_id: string;
  shipping_label: string;
  shipping_minor: number;
  free_shipping_threshold_minor: number;
  tax_basis_points: number;
  tax_shipping: boolean;
  tax_rounding: "half_up_order";
  disclosure: string;
}
export interface CommerceState {
  schema_version: 1;
  mode: "qa_fixture";
  revision: number;
  updated_at: ISODateTime;
  products: Product[];
  variants: SellableVariant[];
  product_drafts: CatalogDraft[];
  sizes: SizeSpec[];
  colors: SwatchColor[];
  inventory: InventoryBalance[];
  markets: MarketPolicy[];
  bundle_policy: BundlePolicy;
  bundle_policy_draft: BundlePolicy | null;
  promos: PromoCode[];
  promo_drafts: PromoCode[];
  hero_banners: HeroBannerConfig[];
  hero_banner_drafts: HeroBannerConfig[];
  hero_history: HeroBannerConfig[];
  recipes: CommerceRecipe[];
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  bed_preferences: BedPreference[];
  cart: Cart;
  builder_selection: BedSelection;
  wishlist: WishlistEntry[];
  saved_looks: SavedBedLook[];
  orders: OrderProjection[];
  undo_records: UndoRecord[];
  audit: AuditEntry[];
  command_receipts: {
    key: string;
    fingerprint: string;
    result: CommandResult;
  }[];
}
export interface CommandResult {
  id?: EntityId;
  undo_id?: EntityId;
  quote?: CommerceQuote;
  message?: string;
}
export interface CommandOptions {
  idempotency_key: string;
  expected_revision?: number;
}
export type OrderTransition =
  | { action: "process"; warehouse_id: string; reason: string }
  | {
      action: "start_qc";
      inspection_reference: string;
      operator: string;
      checklist: string[];
    }
  | { action: "qc_pass" | "qc_hold"; reason: string }
  | {
      action: "ship";
      shipment_id: string;
      carrier: string;
      service: string;
      tracking_reference: string;
      dispatch_evidence: string;
      delivery_note_reference: string;
      lines: { line_id: string; quantity: number }[];
    }
  | { action: "deliver"; shipment_id: string; evidence: string }
  | {
      action: "cancel";
      reason: string;
      lines: { line_id: string; quantity: number }[];
    }
  | {
      action: "receive_return";
      reason: string;
      receipt_reference: string;
      warehouse_id: string;
      restock: boolean;
      lines: { line_id: string; quantity: number }[];
    }
  | { action: "fixture_capture"; evidence: string }
  | {
      action: "fixture_refund";
      reason: string;
      evidence: string;
      amount: Money;
    };
export type CommerceCommand =
  | {
      type: "catalog.swatch_save";
      color: SwatchColor;
      expected_state_revision: number;
    }
  | {
      type: "catalog.delete_draft";
      product_id: string;
      expected_product_revision: number;
      reason: string;
    }
  | {
      type: "catalog.featured";
      product_ids: string[];
      expected_state_revision: number;
      reason: string;
    }
  | {
      type: "inventory.threshold";
      inventory_id: string;
      threshold: number;
      expected_inventory_revision: number;
      reason: string;
    }
  | {
      type: "cart.add_items";
      items: {
        variant_id: string;
        quantity: number;
        expected_unit_price?: Money;
      }[];
      expected_cart_revision: number;
    }
  | { type: "bed.quote"; selection: BedSelection }
  | {
      type: "catalog.save_draft";
      draft: CatalogDraft;
      expected_product_revision: number;
    }
  | {
      type: "catalog.publish" | "catalog.archive";
      product_id: string;
      expected_product_revision: number;
      reason: string;
    }
  | {
      type: "inventory.adjust";
      inventory_id: string;
      delta: number;
      expected_inventory_revision: number;
      reason: string;
      evidence: string;
    }
  | { type: "cart.add_item"; variant_id: string; quantity: number }
  | {
      type: "cart.add_to_bundle";
      bundle_id: string;
      variant_id: string;
      expected_cart_revision: number;
    }
  | {
      type: "cart.add_bundle";
      selection: BedSelection;
      quote: CommerceQuote;
      name: string;
      expected_cart_revision: number;
    }
  | {
      type: "cart.replace_bundle";
      bundle_id: string;
      selection: BedSelection;
      quote: CommerceQuote;
      name: string;
      expected_cart_revision: number;
    }
  | {
      type: "cart.update_line";
      line_id: string;
      quantity: number;
      expected_cart_revision: number;
    }
  | {
      type: "cart.remove_bundle";
      bundle_id: string;
      expected_cart_revision: number;
    }
  | {
      type: "cart.set_destination";
      destination: DestinationContext | null;
      expected_cart_revision: number;
    }
  | {
      type: "cart.apply_promo";
      code: string | null;
      expected_cart_revision: number;
    }
  | {
      type: "builder.save";
      selection: BedSelection;
      expected_selection_revision: number;
    }
  | { type: "wishlist.add"; product_id: string; variant_id: string | null }
  | { type: "wishlist.remove"; entry_id: string }
  | {
      type: "wishlist.move";
      entry_id: string;
      variant_id: string;
      expected_cart_revision: number;
    }
  | { type: "undo"; undo_id: string }
  | {
      type: "look.save";
      look_id: string | null;
      name: string;
      selection: BedSelection;
      expected_look_revision: number;
    }
  | {
      type: "look.duplicate" | "look.delete" | "look.restore";
      look_id: string;
      expected_look_revision: number;
    }
  | {
      type: "profile.update";
      profile: CustomerProfile;
      expected_profile_revision: number;
    }
  | {
      type: "address.save";
      address: CustomerAddress;
      expected_address_revision: number;
    }
  | {
      type: "address.delete";
      address_id: string;
      expected_address_revision: number;
    }
  | {
      type: "preference.save";
      preference: BedPreference;
      expected_preference_revision: number;
    }
  | {
      type: "preference.delete";
      preference_id: string;
      expected_preference_revision: number;
    }
  | {
      type: "checkout.create";
      quote: CommerceQuote;
      address_id: string;
      address?: CustomerAddress;
      contact?: { display_name: string; email: string };
      expected_cart_revision: number;
    }
  | {
      type: "order.transition";
      order_id: string;
      expected_order_revision: number;
      transition: OrderTransition;
    }
  | {
      type: "promo.save_draft";
      promo: PromoCode;
      expected_promo_revision: number;
    }
  | {
      type: "promo.publish" | "promo.archive";
      promo_id: string;
      expected_promo_revision: number;
      reason: string;
    }
  | {
      type: "policy.save_draft";
      policy: BundlePolicy;
      expected_policy_version: number;
    }
  | {
      type: "policy.publish";
      expected_policy_version: number;
      expected_draft_version: number;
      reason: string;
    }
  | {
      type: "hero.save_draft";
      banner: HeroBannerConfig;
      expected_banner_revision: number;
    }
  | {
      type: "hero.publish" | "hero.archive";
      banner_id: string;
      expected_banner_revision: number;
      reason: string;
    }
  | {
      type: "hero.rollback";
      banner_id: string;
      history_revision: number;
      expected_banner_revision: number;
      reason: string;
    }
  | { type: "maintenance.expire" };
