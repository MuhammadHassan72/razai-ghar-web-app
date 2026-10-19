import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compiled = path.join(root, ".next", "commerce-tests");
for (const relative of [
  "lib/brand.ts",
  "lib/commerce-contracts.ts",
  "lib/commerce-engine.ts",
  "lib/seed-data.ts",
  "lib/storefront.ts",
  "lib/bed-builder.ts",
  "lib/backoffice.ts",
  "components/builder/BedPreviewStage.tsx",
  "context/CommerceContext.tsx",
]) {
  const output = path.join(compiled, relative.replace(/\.tsx?$/, ".js"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const source = fs
    .readFileSync(path.join(root, "src", relative), "utf8")
    .replace(/(["'])@\//g, `$1${compiled.replaceAll("\\", "/")}/`);
  fs.writeFileSync(
    output,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
  );
}
const engine = await import(
  pathToFileURL(path.join(compiled, "lib/commerce-engine.js")).href
);
const { createSeedState, FIXTURE_TIME } = await import(
  pathToFileURL(path.join(compiled, "lib/seed-data.js")).href
);
const { getCommerceJSONSchemas } = await import(
  pathToFileURL(path.join(compiled, "lib/commerce-contracts.js")).href
);
const { createCommerceStore } = await import(
  pathToFileURL(path.join(compiled, "context/CommerceContext.js")).href
);
const { filterCatalog } = await import(
  pathToFileURL(path.join(compiled, "lib/storefront.js")).href
);
const builderModel = await import(
  pathToFileURL(path.join(compiled, "lib/bed-builder.js")).href
);
const backoffice = await import(
  pathToFileURL(path.join(compiled, "lib/backoffice.js")).href
);
const { BedPreviewStage } = await import(
  pathToFileURL(path.join(compiled, "components/builder/BedPreviewStage.js"))
    .href
);
const {
  quoteCart,
  quoteSelection,
  executeCommand,
  money,
  allocateLargestRemainder,
  validateState,
  canonicalJSON,
} = engine;

function harness(initial = createSeedState()) {
  let state = initial,
    sequence = 0;
  const runtime = {
    now: FIXTURE_TIME,
    role: "administrator",
    actor_id: state.profile.id,
    newId: () => `test-${++sequence}`,
  };
  return {
    get state() {
      return state;
    },
    runtime,
    command(command, key = `command-${++sequence}`) {
      const response = executeCommand(
        state,
        command,
        { idempotency_key: key },
        runtime,
      );
      state = response.state;
      return response.result;
    },
    quote() {
      return quoteCart(state, state.cart, {
        now: runtime.now,
        quote_id: `quote-${++sequence}`,
      });
    },
  };
}
function addRecipe(h) {
  const selection = h.state.recipes[0].selection;
  return h.command({
    type: "cart.add_bundle",
    selection,
    name: "QA bed",
    quote: quoteSelection(h.state, selection, {
      now: h.runtime.now,
      quote_id: "selection-quote",
    }),
    expected_cart_revision: h.state.cart.revision,
  });
}
function destination(h) {
  h.command({
    type: "cart.set_destination",
    destination: {
      country: "US",
      region: "NY",
      shipping_method_id: "qa-ground",
    },
    expected_cart_revision: h.state.cart.revision,
  });
}
function checkout(h, key) {
  return h.command(
    {
      type: "checkout.create",
      quote: h.quote(),
      address_id: h.state.addresses[0].id,
      expected_cart_revision: h.state.cart.revision,
    },
    key,
  );
}
function code(value) {
  return (error) =>
    error instanceof engine.CommerceError && error.code === value;
}

test("seed is complete, deterministic, internally valid, and explicitly synthetic", () => {
  const seed = createSeedState();
  assert.equal(canonicalJSON(seed), canonicalJSON(createSeedState()));
  validateState(seed);
  assert.equal(seed.products.length, 16);
  assert.equal(seed.colors.length, 12);
  assert.equal(seed.orders.length, 5);
  assert.deepEqual(
    seed.orders.map((o) => o.fulfillment_state),
    ["placed", "processing", "quality_check", "shipped", "delivered"],
  );
  assert.ok(
    seed.products.every(
      (p) => p.data_source === "qa_fixture" && p.feel.disclosure.includes("QA"),
    ),
  );
  assert.deepEqual(
    seed.sizes
      .filter((s) => s.product_role === "cushion_cover")
      .map((s) => [s.display_inches.width, s.display_inches.length]),
    [
      [18, 18],
      [20, 20],
      [26, 26],
      [14, 22],
    ],
  );
});
test("specification 40,000 / 4,000 / 36,000 and 35,000 / 1,750 / 33,250 reconcile", () => {
  const state = createSeedState(),
    selection = structuredClone(state.recipes[0].selection);
  const full = quoteSelection(state, selection, {
    now: FIXTURE_TIME,
    quote_id: "q-full",
  });
  assert.deepEqual(
    [
      full.subtotal.amount_minor,
      full.discount.amount_minor,
      full.merchandise_total.amount_minor,
    ],
    [40000, 4000, 36000],
  );
  const cushion = selection.slots.find((s) => s.slot_id === "cushion_1");
  cushion.variant_id = null;
  cushion.state = "skipped";
  const two = quoteSelection(state, selection, {
    now: FIXTURE_TIME,
    quote_id: "q-two",
  });
  assert.deepEqual(
    [
      two.subtotal.amount_minor,
      two.discount.amount_minor,
      two.merchandise_total.amount_minor,
    ],
    [35000, 1750, 33250],
  );
  selection.slots.find((s) => s.slot_id === "main_top").state = "skipped";
  selection.slots.find((s) => s.slot_id === "main_top").variant_id = null;
  assert.equal(
    quoteSelection(state, selection, { now: FIXTURE_TIME, quote_id: "q-one" })
      .discount.amount_minor,
    0,
  );
});
test("largest remainder has stable ID ties and safe-integer arithmetic", () => {
  assert.deepEqual(
    allocateLargestRemainder(2, [
      { id: "c", amount: 1 },
      { id: "a", amount: 1 },
      { id: "b", amount: 1 },
    ]),
    { c: 0, a: 1, b: 1 },
  );
  for (let subtotal = 1; subtotal <= 1000; subtotal++) {
    const weights = [
      { id: "a", amount: subtotal },
      { id: "b", amount: 37 },
      { id: "c", amount: 113 },
    ];
    const total = engine.roundBasisPoints(subtotal + 150, 1000),
      allocations = allocateLargestRemainder(total, weights);
    assert.equal(
      Object.values(allocations).reduce((sum, n) => sum + n, 0),
      total,
    );
    weights.forEach((w) =>
      assert.ok(allocations[w.id] >= 0 && allocations[w.id] <= w.amount),
    );
  }
  assert.equal(
    engine.roundBasisPoints(Number.MAX_SAFE_INTEGER, 10000),
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(money(100, "JPY").precision, 0);
  assert.equal(money(100, "KWD").precision, 3);
  assert.throws(() => money(0.5, "USD"), code("MONEY"));
});
test("inserts do not qualify groups; sale-only top does not qualify; throws cannot make a complete bed", () => {
  const state = createSeedState(),
    selection = structuredClone(state.recipes[0].selection);
  selection.slots.find((s) => s.slot_id === "main_top").variant_id =
    "cloud-sherpa-sand-blanket-queen";
  const quote = quoteSelection(state, selection, {
    now: FIXTURE_TIME,
    quote_id: "q-sale",
  });
  assert.equal(quote.bundle_tiers[0].basis_points, 500);
  assert.equal(quote.lines.find((l) => l.on_sale).discount.amount_minor, 0);
  const top = selection.slots.find((s) => s.slot_id === "main_top");
  top.variant_id = null;
  top.state = "skipped";
  const throwSlot = selection.slots.find((s) => s.slot_id === "throw");
  throwSlot.variant_id = "highland-throw-sand-throw-50-70";
  throwSlot.state = "selected";
  selection.insert_links = [
    {
      slot_id: "cushion_1",
      variant_id: "down-pillow-chalk-pillow-18",
      quantity: 1,
    },
  ];
  assert.equal(
    quoteSelection(state, selection, { now: FIXTURE_TIME, quote_id: "q-throw" })
      .bundle_tiers[0].basis_points,
    1000,
  );
  assert.equal(engine.isCompleteBed(selection), false);
  const insertLine = quoteSelection(state, selection, {
    now: FIXTURE_TIME,
    quote_id: "q-insert",
  }).lines.find((l) => l.product_role === "pillow_insert");
  assert.equal(insertLine.discount.amount_minor, 0);
});
test("promotion selection compares final whole-cart totals, respects shipping thresholds, and prefers bundle ties", () => {
  const h = harness();
  addRecipe(h);
  destination(h);
  h.command({
    type: "cart.apply_promo",
    code: "rest8",
    expected_cart_revision: h.state.cart.revision,
  });
  let quote = h.quote();
  assert.equal(quote.applied_discount, "bundle");
  assert.equal(quote.total.amount_minor, 36000);
  const p = h.state.promos.find((p) => p.code === "REST8");
  p.benefit.basis_points = 1300;
  quote = h.quote();
  assert.equal(quote.applied_discount, "bundle");
  assert.equal(quote.comparison.promo_payable.amount_minor, 36300);
  p.benefit.basis_points = 1000;
  assert.equal(h.quote().applied_discount, "bundle");
  p.benefit.basis_points = 2000;
  quote = h.quote();
  assert.equal(quote.applied_discount, "promo");
  assert.equal(quote.discount.amount_minor, 8000);
  assert.equal(quote.shipping.amount_minor, 1500);
  assert.equal(
    quote.lines.reduce((sum, l) => sum + l.discount.amount_minor, 0),
    quote.discount.amount_minor,
  );
});
test("strict runtime contracts reject forged fields, float quantities and incompatible dimensions", () => {
  const h = harness();
  assert.throws(
    () =>
      h.command({
        type: "cart.add_item",
        variant_id: h.state.variants[0].id,
        quantity: 1,
        price: 0,
      }),
    code("VALIDATION"),
  );
  assert.throws(
    () =>
      h.command({
        type: "cart.add_item",
        variant_id: h.state.variants[0].id,
        quantity: 1.1,
      }),
    code("VALIDATION"),
  );
  const selection = structuredClone(h.state.recipes[0].selection);
  selection.bed_size_id = "us-twin";
  assert.throws(
    () =>
      quoteSelection(h.state, selection, {
        now: FIXTURE_TIME,
        quote_id: "q-bad-fit",
      }),
    code("FIT"),
  );
  selection.bed_size_id = "us-queen";
  selection.insert_links = [
    {
      slot_id: "cushion_1",
      variant_id: "down-pillow-chalk-pillow-euro",
      quantity: 1,
    },
  ];
  assert.throws(
    () =>
      quoteSelection(h.state, selection, {
        now: FIXTURE_TIME,
        quote_id: "q-bad-insert",
      }),
    code("INSERT_FIT"),
  );
  const schemas = getCommerceJSONSchemas();
  assert.equal(
    schemas.command.oneOf.length > 20 || schemas.command.anyOf.length > 20,
    true,
  );
});
test("failed bundle and stale-price checkout mutate nothing; repeated add/checkout is idempotent", () => {
  const h = harness(),
    selection = h.state.recipes[0].selection;
  const quote = quoteSelection(h.state, selection, {
    now: FIXTURE_TIME,
    quote_id: "q-add",
  });
  const command = {
    type: "cart.add_bundle",
    selection,
    quote,
    name: "QA bed",
    expected_cart_revision: h.state.cart.revision,
  };
  const first = h.command(command, "bundle-command");
  const after = canonicalJSON(h.state);
  assert.equal(h.command(command, "bundle-command").id, first.id);
  assert.equal(canonicalJSON(h.state), after);
  assert.throws(
    () => h.command({ ...command, name: "Different" }, "bundle-command"),
    code("IDEMPOTENCY_CONFLICT"),
  );
  destination(h);
  const accepted = h.quote();
  h.state.variants.find((v) => v.id === accepted.lines[0].variant_id).price
    .amount_minor++;
  const before = canonicalJSON(h.state);
  assert.throws(
    () =>
      h.command({
        type: "checkout.create",
        quote: accepted,
        address_id: h.state.addresses[0].id,
        expected_cart_revision: h.state.cart.revision,
      }),
    code("QUOTE_CHANGED"),
  );
  assert.equal(canonicalJSON(h.state), before);
  const newQuote = h.quote(),
    checkoutCommand = {
      type: "checkout.create",
      quote: newQuote,
      address_id: h.state.addresses[0].id,
      expected_cart_revision: h.state.cart.revision,
    };
  const order = h.command(checkoutCommand, "checkout-one");
  assert.equal(h.command(checkoutCommand, "checkout-two").id, order.id);
  assert.equal(h.state.orders.filter((o) => o.id === order.id).length, 1);
});
test("wishlist undo reverses only the moved delta and retains changed cart or checkout", () => {
  const h = harness(),
    entry = h.state.wishlist.find((w) => w.variant_id);
  h.command({
    type: "cart.add_item",
    variant_id: entry.variant_id,
    quantity: 2,
  });
  let move = h.command({
    type: "wishlist.move",
    entry_id: entry.id,
    variant_id: entry.variant_id,
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.state.cart.lines[0].quantity, 3);
  h.command({ type: "undo", undo_id: move.undo_id });
  assert.equal(h.state.cart.lines[0].quantity, 2);
  move = h.command({
    type: "wishlist.move",
    entry_id: entry.id,
    variant_id: entry.variant_id,
    expected_cart_revision: h.state.cart.revision,
  });
  h.command({
    type: "cart.add_item",
    variant_id: entry.variant_id,
    quantity: 1,
  });
  assert.match(
    h.command({ type: "undo", undo_id: move.undo_id }).message,
    /retained/,
  );
  assert.equal(h.state.cart.lines[0].quantity, 4);
  assert.ok(h.state.wishlist.some((w) => w.id === entry.id));
});
test("look delete supports 10-second undo and 30-day Recently deleted restoration", () => {
  const h = harness();
  let look = h.state.saved_looks[0];
  const deletion = h.command({
    type: "look.delete",
    look_id: look.id,
    expected_look_revision: look.revision,
  });
  assert.ok(h.state.saved_looks[0].deleted_at);
  h.command({ type: "undo", undo_id: deletion.undo_id });
  assert.equal(h.state.saved_looks[0].deleted_at, null);
  look = h.state.saved_looks[0];
  const second = h.command({
    type: "look.delete",
    look_id: look.id,
    expected_look_revision: look.revision,
  });
  h.runtime.now = new Date(Date.parse(FIXTURE_TIME) + 11000).toISOString();
  assert.throws(
    () => h.command({ type: "undo", undo_id: second.undo_id }),
    code("NOT_FOUND"),
  );
  h.command({
    type: "look.restore",
    look_id: look.id,
    expected_look_revision: h.state.saved_looks[0].revision,
  });
  assert.equal(h.state.saved_looks[0].deleted_at, null);
});
test("fulfillment forbids skipped QC, handles split shipments/cancellation, and preserves purchased snapshots", () => {
  const h = harness();
  addRecipe(h);
  destination(h);
  const id = checkout(h).id;
  const advance = (transition) =>
    h.command({
      type: "order.transition",
      order_id: id,
      expected_order_revision: h.state.orders.find((o) => o.id === id).revision,
      transition,
    });
  const order = () => h.state.orders.find((o) => o.id === id);
  assert.throws(
    () =>
      advance({
        action: "process",
        warehouse_id: "qa-warehouse",
        reason: "QA",
      }),
    code("ILLEGAL_TRANSITION"),
  );
  advance({ action: "fixture_capture", evidence: "QA capture" });
  advance({ action: "process", warehouse_id: "qa-warehouse", reason: "QA" });
  const ship = {
    action: "ship",
    shipment_id: "split-a",
    carrier: "QA",
    service: "QA",
    tracking_reference: "QA-track",
    dispatch_evidence: "QA handoff",
    delivery_note_reference: "QA-DN",
    lines: [{ line_id: order().lines[0].line_id, quantity: 1 }],
  };
  assert.throws(() => advance(ship), code("ILLEGAL_TRANSITION"));
  advance({
    action: "start_qc",
    inspection_reference: "QA-QC",
    operator: "QA",
    checklist: ["QA inspected"],
  });
  advance({ action: "qc_pass", reason: "QA passed" });
  advance(ship);
  assert.equal(order().fulfillment_state, "partially_shipped");
  advance({
    action: "deliver",
    shipment_id: "split-a",
    evidence: "QA delivery scan",
  });
  assert.equal(order().fulfillment_state, "partially_delivered");
  const oldAddress = canonicalJSON(order().shipping_address),
    oldQuote = canonicalJSON(order().quote_snapshot);
  h.command({
    type: "address.save",
    address: { ...h.state.addresses[0], line1: "200 New Example Avenue" },
    expected_address_revision: h.state.addresses[0].revision,
  });
  assert.equal(canonicalJSON(order().shipping_address), oldAddress);
  assert.equal(canonicalJSON(order().quote_snapshot), oldQuote);
  advance({
    action: "cancel",
    reason: "QA cancel remaining",
    lines: order()
      .lines.slice(1)
      .map((l) => ({ line_id: l.line_id, quantity: l.quantity })),
  });
  assert.equal(order().fulfillment_state, "delivered");
  validateState(h.state);
});
test("catalog drafts do not affect live prices; stale edits fail; archive preserves order history", () => {
  const h = harness(),
    product = h.state.products[0];
  const draft = {
    product: { ...product, title: "QA revised title" },
    variants: h.state.variants
      .filter((v) => v.product_id === product.id)
      .map((v) => ({ ...v, price: money(v.price.amount_minor + 100, "USD") })),
  };
  h.command({
    type: "catalog.save_draft",
    draft,
    expected_product_revision: product.revision,
  });
  assert.equal(h.state.products[0].title, product.title);
  assert.throws(
    () =>
      h.command({
        type: "catalog.save_draft",
        draft,
        expected_product_revision: product.revision,
      }),
    code("REVISION_CONFLICT"),
  );
  const draftRevision = h.state.product_drafts[0].product.revision;
  h.command({
    type: "catalog.publish",
    product_id: product.id,
    expected_product_revision: draftRevision,
    reason: "QA publish",
  });
  assert.equal(
    h.state.products.find((p) => p.id === product.id).title,
    "QA revised title",
  );
  const snapshot = canonicalJSON(h.state.orders[0].quote_snapshot);
  h.command({
    type: "catalog.archive",
    product_id: product.id,
    expected_product_revision: h.state.products.find((p) => p.id === product.id)
      .revision,
    reason: "QA archive",
  });
  assert.equal(canonicalJSON(h.state.orders[0].quote_snapshot), snapshot);
});

test("shortage rejects the entire bed and checkout without changing any stock reservation", () => {
  const h = harness(),
    selection = h.state.recipes[0].selection;
  const accepted = quoteSelection(h.state, selection, {
    now: FIXTURE_TIME,
    quote_id: "shortage-selection",
  });
  const variant = h.state.variants.find(
    (v) =>
      v.id ===
      selection.slots.find((s) => s.slot_id === "cushion_1").variant_id,
  );
  const inventory = h.state.inventory.find(
    (i) => i.id === variant.availability.inventory_id,
  );
  inventory.on_hand = inventory.reserved;
  let before = canonicalJSON(h.state);
  assert.throws(
    () =>
      h.command({
        type: "cart.add_bundle",
        selection,
        quote: accepted,
        name: "Shortage",
        expected_cart_revision: h.state.cart.revision,
      }),
    code("QUOTE_CHANGED"),
  );
  assert.equal(canonicalJSON(h.state), before);
  inventory.on_hand += 1;
  addRecipe(h);
  destination(h);
  const checkoutQuote = h.quote();
  h.state.inventory.find((i) => i.id === inventory.id).on_hand =
    h.state.inventory.find((i) => i.id === inventory.id).reserved;
  before = canonicalJSON(h.state);
  assert.throws(
    () =>
      h.command({
        type: "checkout.create",
        quote: checkoutQuote,
        address_id: h.state.addresses[0].id,
        expected_cart_revision: h.state.cart.revision,
      }),
    code("QUOTE_CHANGED"),
  );
  assert.equal(canonicalJSON(h.state), before);
});
test("multiple bundles qualify independently; standalone merchandise cannot join a tier", () => {
  const h = harness();
  addRecipe(h);
  addRecipe(h);
  h.command({
    type: "cart.add_item",
    variant_id: "rivage-cushion-clay-cushion-18",
    quantity: 2,
  });
  const quote = h.quote();
  assert.equal(quote.bundle_tiers.length, 2);
  assert.equal(quote.discount.amount_minor, 8000);
  assert.equal(
    quote.lines.find((l) => !l.bundle_instance_id).discount.amount_minor,
    0,
  );
  const bundle = h.state.cart.bundles[0],
    cushionLine = h.state.cart.lines.find(
      (l) =>
        l.bundle_instance_id === bundle.id && l.slot_ids[0] === "cushion_1",
    );
  h.command({
    type: "cart.update_line",
    line_id: cushionLine.id,
    quantity: 5,
    expected_cart_revision: h.state.cart.revision,
  });
  assert.throws(
    () =>
      h.command({
        type: "cart.update_line",
        line_id: cushionLine.id,
        quantity: 6,
        expected_cart_revision: h.state.cart.revision,
      }),
    code("CUSHION_LIMIT"),
  );
  assert.equal(h.quote().bundle_tiers[0].groups.length, 3);
});
test("shipping promotions combine with bundle savings only under explicit published permission", () => {
  const h = harness();
  addRecipe(h);
  const cushion = h.state.cart.lines.find((l) =>
    l.slot_ids.includes("cushion_1"),
  );
  h.command({
    type: "cart.update_line",
    line_id: cushion.id,
    quantity: 0,
    expected_cart_revision: h.state.cart.revision,
  });
  destination(h);
  h.command({
    type: "cart.apply_promo",
    code: "SHIPQUIET",
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.quote().applied_discount, "bundle");
  assert.equal(h.quote().total.amount_minor, 34750);
  h.state.promos.find((p) => p.code === "SHIPQUIET").stacking =
    "shipping_with_bundle";
  const quote = h.quote();
  assert.equal(quote.applied_discount, "promo");
  assert.equal(quote.total.amount_minor, 33250);
  assert.equal(quote.discount.amount_minor, 1750);
  assert.equal(quote.shipping.amount_minor, 0);
  assert.ok(quote.lines.every((l) => l.discount_source === "bundle"));
});
test("promo usage is claimed at committed checkout, and reservation expiry releases it and stock", () => {
  const h = harness();
  addRecipe(h);
  destination(h);
  const promo = h.state.promos.find((p) => p.code === "REST8");
  promo.benefit.basis_points = 2000;
  promo.global_usage_limit = 1;
  h.command({
    type: "cart.apply_promo",
    code: "REST8",
    expected_cart_revision: h.state.cart.revision,
  });
  const created = checkout(h).id;
  addRecipe(h);
  assert.throws(
    () =>
      h.command({
        type: "cart.apply_promo",
        code: "REST8",
        expected_cart_revision: h.state.cart.revision,
      }),
    code("PROMO_INELIGIBLE"),
  );
  const before = h.state.inventory.reduce((sum, i) => sum + i.reserved, 0);
  h.runtime.now = new Date(Date.parse(FIXTURE_TIME) + 900001).toISOString();
  h.command({ type: "maintenance.expire" });
  const order = h.state.orders.find((o) => o.id === created);
  assert.equal(order.payment_state, "expired");
  assert.equal(order.fulfillment_state, "cancelled");
  assert.ok(h.state.inventory.reduce((sum, i) => sum + i.reserved, 0) < before);
  assert.throws(
    () =>
      h.command({
        type: "order.transition",
        order_id: created,
        expected_order_revision: order.revision,
        transition: { action: "fixture_capture", evidence: "Late QA capture" },
      }),
    code("ILLEGAL_TRANSITION"),
  );
  h.command({
    type: "cart.apply_promo",
    code: "REST8",
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.quote().applied_discount, "promo");
  validateState(h.state);
});
test("address defaults are atomic; inventory requires a valid revision and cannot consume reserved units", () => {
  const h = harness(),
    old = h.state.addresses[0];
  h.command({
    type: "address.save",
    address: {
      ...old,
      id: "second-address",
      revision: 0,
      line1: "300 Example Street",
    },
    expected_address_revision: 0,
  });
  assert.equal(h.state.addresses.filter((a) => a.default_shipping).length, 1);
  assert.equal(
    h.state.addresses.find((a) => a.id === old.id).default_shipping,
    false,
  );
  const inventory = h.state.inventory.find((i) => i.reserved > 0);
  assert.throws(
    () =>
      h.command({
        type: "inventory.adjust",
        inventory_id: inventory.id,
        delta: -inventory.on_hand,
        expected_inventory_revision: inventory.revision,
        reason: "QA stocktake",
        evidence: "QA count sheet",
      }),
    code("STOCK_ADJUSTMENT"),
  );
  const command = {
    type: "inventory.adjust",
    inventory_id: inventory.id,
    delta: 1,
    expected_inventory_revision: inventory.revision,
    reason: "QA receipt",
    evidence: "QA count sheet",
  };
  const preview = engine.previewCommand(h.state, command, h.runtime);
  assert.equal(preview.inventory_changes.length, 1);
  assert.equal(
    preview.inventory_changes[0].after.on_hand,
    inventory.on_hand + 1,
  );
  h.command(command);
  assert.throws(() => h.command(command), code("REVISION_CONFLICT"));
});
test("CMS drafts remain private; publication, scheduling and rollback preserve history", () => {
  const h = harness(),
    original = h.state.hero_banners[0];
  const draft = {
    ...original,
    headline: "A quieter kind of comfort.",
    starts_at: "2026-10-19T00:00:00.000Z",
  };
  h.command({
    type: "hero.save_draft",
    banner: draft,
    expected_banner_revision: original.revision,
  });
  assert.equal(
    h.state.hero_banners.find((b) => b.id === original.id).headline,
    original.headline,
  );
  h.command({
    type: "hero.publish",
    banner_id: draft.id,
    expected_banner_revision: h.state.hero_banner_drafts[0].revision,
    reason: "QA scheduled campaign",
  });
  assert.equal(
    engine
      .publishedBanners(h.state, FIXTURE_TIME)
      .filter((b) => b.placement === "hero").length,
    0,
  );
  assert.equal(
    engine
      .publishedBanners(h.state, "2026-10-19T01:00:00.000Z")
      .filter((b) => b.placement === "hero").length,
    1,
  );
  h.command({
    type: "hero.rollback",
    banner_id: original.id,
    history_revision: original.revision,
    expected_banner_revision: h.state.hero_banners.find(
      (b) => b.id === original.id,
    ).revision,
    reason: "QA rollback",
  });
  assert.equal(
    h.state.hero_banners.find((b) => b.id === original.id).headline,
    original.headline,
  );
  assert.equal(h.state.hero_history.length, 2);
  h.runtime.role = "marketing_manager";
  assert.throws(
    () =>
      h.command({
        type: "hero.archive",
        banner_id: original.id,
        expected_banner_revision: h.state.hero_banners.find(
          (b) => b.id === original.id,
        ).revision,
        reason: "Unauthorized publication change",
      }),
    code("FORBIDDEN"),
  );
});

test("policy edits and publication reject stale drafts and retain accepted order policies", () => {
  const h = harness(),
    original = structuredClone(h.state.bundle_policy),
    orderPolicy = canonicalJSON(h.state.orders[0].policy_snapshot);
  const draft = {
    ...original,
    tiers: [
      { group_count: 1, basis_points: 0 },
      { group_count: 2, basis_points: 600 },
      { group_count: 3, basis_points: 1200 },
    ],
  };
  h.command({
    type: "policy.save_draft",
    policy: draft,
    expected_policy_version: original.version,
  });
  assert.equal(h.state.bundle_policy.tiers[2].basis_points, 1000);
  assert.throws(
    () =>
      h.command({
        type: "policy.save_draft",
        policy: draft,
        expected_policy_version: original.version,
      }),
    code("REVISION_CONFLICT"),
  );
  const firstDraft = h.state.bundle_policy_draft.version;
  h.command({
    type: "policy.save_draft",
    policy: draft,
    expected_policy_version: firstDraft,
  });
  assert.throws(
    () =>
      h.command({
        type: "policy.publish",
        expected_policy_version: original.version,
        expected_draft_version: firstDraft,
        reason: "QA stale publication",
      }),
    code("REVISION_CONFLICT"),
  );
  h.command({
    type: "policy.publish",
    expected_policy_version: original.version,
    expected_draft_version: h.state.bundle_policy_draft.version,
    reason: "QA approved policy",
  });
  assert.equal(h.state.bundle_policy.tiers[2].basis_points, 1200);
  assert.equal(canonicalJSON(h.state.orders[0].policy_snapshot), orderPolicy);
});

function persistenceHarness(seed) {
  let raw = JSON.stringify(seed),
    tail = Promise.resolve(),
    writeError = false;
  const listeners = new Set();
  const persistence = {
    can_write: true,
    read: () => raw,
    write(value) {
      if (writeError) throw new Error("Quota denied");
      raw = value;
    },
    exclusive(operation) {
      const result = tail.then(operation);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      listeners.forEach((listener) => listener());
    },
  };
  return {
    persistence,
    get raw() {
      return raw;
    },
    set raw(value) {
      raw = value;
    },
    failWrites() {
      writeError = true;
    },
  };
}

test("named cushion upsell changes only its bundle and replacement preserves bundle identity", () => {
  const h = harness();
  addRecipe(h);
  const bundleId = h.state.cart.bundles[0].id,
    cushion = h.state.cart.lines.find((l) => l.slot_ids.includes("cushion_1"));
  h.command({
    type: "cart.update_line",
    line_id: cushion.id,
    quantity: 0,
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.quote().bundle_tiers[0].basis_points, 500);
  const command = {
    type: "cart.add_to_bundle",
    bundle_id: bundleId,
    variant_id: "rivage-cushion-sage-cushion-18",
    expected_cart_revision: h.state.cart.revision,
  };
  h.command(command, "named-upsell");
  assert.equal(h.quote().discount.amount_minor, 4000);
  assert.equal(h.state.cart.bundles.length, 1);
  h.command(command, "named-upsell");
  assert.equal(
    h.state.cart.lines.find((l) => l.slot_ids.includes("cushion_1")).quantity,
    1,
  );
  const selection = structuredClone(h.state.recipes[1].selection),
    quote = quoteSelection(h.state, selection, {
      now: FIXTURE_TIME,
      quote_id: "replace-quote",
    });
  h.command({
    type: "cart.replace_bundle",
    bundle_id: bundleId,
    selection,
    quote,
    name: "Updated bed",
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.state.cart.bundles.length, 1);
  assert.equal(h.state.cart.bundles[0].id, bundleId);
  assert.equal(h.state.cart.bundles[0].name, "Updated bed");
  assert.ok(h.state.cart.lines.every((l) => l.bundle_instance_id === bundleId));
});
test("guest checkout snapshots inline contact/address without altering profile or address book", () => {
  const h = harness();
  addRecipe(h);
  destination(h);
  h.runtime.role = "guest";
  const profile = canonicalJSON(h.state.profile),
    book = canonicalJSON(h.state.addresses);
  const address = {
    ...h.state.addresses[0],
    id: "guest-delivery",
    revision: 0,
    recipient: "QA Guest",
    line1: "800 Example Road",
    default_shipping: false,
    default_billing: false,
  };
  const command = {
    type: "checkout.create",
    quote: h.quote(),
    address_id: address.id,
    address,
    contact: { display_name: "QA Guest", email: "guest@example.test" },
    expected_cart_revision: h.state.cart.revision,
  };
  const result = h.command(command, "guest-checkout"),
    order = h.state.orders.find((o) => o.id === result.id);
  assert.equal(order.customer_snapshot.email, "guest@example.test");
  assert.equal(order.shipping_address.line1, address.line1);
  assert.equal(order.payment_state, "pending");
  assert.equal(order.captured.amount_minor, 0);
  assert.equal(order.bundle_snapshots.length, 1);
  assert.equal(canonicalJSON(h.state.profile), profile);
  assert.equal(canonicalJSON(h.state.addresses), book);
  assert.equal(h.command(command, "guest-checkout-retry").id, result.id);
  assert.throws(
    () =>
      h.command(
        {
          ...command,
          contact: {
            display_name: "Different Guest",
            email: "different@example.test",
          },
        },
        "guest-conflict",
      ),
    code("CHECKOUT_BINDING"),
  );
});
test("facets correlate size/color/availability on one SKU and OR within each facet", () => {
  const state = createSeedState(),
    product = state.products.find((p) => p.id === "atelier-percale");
  state.products = [product];
  state.variants = state.variants.filter(
    (v) =>
      v.product_id === product.id &&
      ((v.color_id === "chalk" && v.size_id === "sheet-set-twin") ||
        (v.color_id === "sage" && v.size_id === "sheet-set-king")),
  );
  assert.equal(
    filterCatalog(state, new URLSearchParams("color=White&size=sheet-set-king"))
      .length,
    0,
  );
  assert.equal(
    filterCatalog(
      state,
      new URLSearchParams("color=White&color=Green&size=sheet-set-king"),
    ).length,
    1,
  );
  assert.equal(
    filterCatalog(
      state,
      new URLSearchParams("fiber=French+Linen&weave=Percale"),
    ).length,
    0,
  );
  const king = state.variants.find((v) => v.size_id === "sheet-set-king"),
    stock = state.inventory.find((i) => i.variant_id === king.id);
  stock.on_hand = stock.reserved;
  assert.equal(
    filterCatalog(state, new URLSearchParams("color=Green&stock=1")).length,
    0,
  );
});
test("unavailable cart lines can be removed sequentially without trapping the cart", () => {
  const h = harness();
  addRecipe(h);
  for (const line of h.state.cart.lines) {
    const stock = h.state.inventory.find(
      (i) => i.variant_id === line.variant_id,
    );
    stock.on_hand = stock.reserved;
  }
  const line = h.state.cart.lines[0];
  h.command({
    type: "cart.update_line",
    line_id: line.id,
    quantity: 0,
    expected_cart_revision: h.state.cart.revision,
  });
  assert.ok(h.state.cart.lines.length > 0);
  assert.ok(h.quote().warnings.some((w) => w.blocking));
});
test("two stores serialize last-unit checkout; one succeeds without oversell and both synchronize", async () => {
  const seed = createSeedState(),
    variant = seed.variants.find((v) => v.product_id === "velour-cushion");
  seed.inventory.find((i) => i.variant_id === variant.id).on_hand = 1;
  const persisted = persistenceHarness(seed);
  let n = 0;
  const dependencies = {
    persistence: persisted.persistence,
    now: () => FIXTURE_TIME,
    newId: () => `store-${++n}`,
  };
  const a = createCommerceStore(seed, dependencies),
    b = createCommerceStore(seed, dependencies);
  try {
    await Promise.all([a.start(), b.start()]);
    await a.dispatch(
      { type: "cart.add_item", variant_id: variant.id, quantity: 1 },
      { idempotency_key: "last-item" },
    );
    await a.dispatch(
      {
        type: "cart.set_destination",
        destination: {
          country: "US",
          region: "NY",
          shipping_method_id: "qa-ground",
        },
        expected_cart_revision: a.getSnapshot().state.cart.revision,
      },
      { idempotency_key: "destination" },
    );
    const accepted = a.quoteCart(),
      command = {
        type: "checkout.create",
        quote: accepted,
        address_id: seed.addresses[0].id,
        expected_cart_revision: a.getSnapshot().state.cart.revision,
      };
    const results = await Promise.all([
      a.dispatch(command, { idempotency_key: "last-checkout-a" }),
      b.dispatch(command, { idempotency_key: "last-checkout-b" }),
    ]);
    assert.equal(results[0].id, results[1].id);
    assert.equal(a.getSnapshot().state.orders.length, 6);
    assert.equal(b.getSnapshot().state.orders.length, 6);
    await assert.rejects(
      b.dispatch(
        { type: "cart.add_item", variant_id: variant.id, quantity: 1 },
        { idempotency_key: "oversell" },
      ),
      code("INSUFFICIENT_STOCK"),
    );
    const balance = a
      .getSnapshot()
      .state.inventory.find((i) => i.variant_id === variant.id);
    assert.equal(balance.on_hand - balance.reserved, 0);
  } finally {
    a.stop();
    b.stop();
  }
});
test("storage failures preserve committed data; hydration is deterministic; view switching cannot grant role", async () => {
  const seed = createSeedState(),
    persisted = persistenceHarness(seed);
  let n = 0;
  const store = createCommerceStore(seed, {
    persistence: persisted.persistence,
    now: () => FIXTURE_TIME,
    newId: () => `storage-${++n}`,
  });
  assert.equal(store.getServerSnapshot().hydrated, false);
  try {
    await store.start();
    assert.equal(store.getSnapshot().hydrated, true);
    assert.throws(() => store.setViewMode("admin"), code("FORBIDDEN"));
    assert.equal(store.getSnapshot().role, "customer");
    store.setDemoRole("administrator");
    store.setViewMode("admin");
    store.setDemoRole("customer");
    assert.equal(store.getSnapshot().view_mode, "storefront");
    const before = persisted.raw;
    persisted.failWrites();
    await assert.rejects(
      store.dispatch(
        { type: "cart.add_item", variant_id: seed.variants[0].id, quantity: 1 },
        { idempotency_key: "quota-fail" },
      ),
      code("PERSISTENCE_FAILED"),
    );
    assert.equal(persisted.raw, before);
    assert.equal(store.getSnapshot().state.cart.lines.length, 0);
    persisted.raw = "invalid JSON";
    store.refresh();
    assert.equal(store.getSnapshot().persistence, "error");
    assert.equal(persisted.raw, "invalid JSON");
  } finally {
    store.stop();
  }
});

test("bed.quote is read-only and validates explicit mattress fit", () => {
  const h = harness(),
    original = h.state;
  const selection = builderModel.normalizeBed(h.state.recipes[0].selection);
  selection.fit_confirmed = true;
  const result = h.command({ type: "bed.quote", selection });
  assert.equal(h.state, original);
  assert.equal(h.state.revision, original.revision);
  assert.equal(result.quote.subtotal.amount_minor, 40000);
  assert.equal(result.quote.discount.amount_minor, 4000);
  selection.fit_confirmed = false;
  assert.throws(
    () => h.command({ type: "bed.quote", selection }),
    code("FIT_CONFIRMATION"),
  );
  assert.equal(h.state, original);
});

test("open steps can quote current selections but must be explicitly resolved before atomic purchase", () => {
  const h = harness();
  let selection = builderModel.newBed("us-queen", true);
  const foundation = h.state.recipes[0].selection.slots.find(
    (s) => s.slot_id === "foundation",
  ).variant_id;
  selection = builderModel.setBedSlot(
    selection,
    "foundation",
    foundation,
    h.state,
  );
  const quote = h.command({ type: "bed.quote", selection }).quote;
  assert.equal(quote.bundle_tiers[0].groups.length, 1);
  const before = h.state;
  assert.throws(
    () =>
      h.command({
        type: "cart.add_bundle",
        selection,
        quote,
        name: "Partial bed",
        expected_cart_revision: h.state.cart.revision,
      }),
    code("OPEN_BED_STEPS"),
  );
  assert.equal(h.state, before);
  selection = builderModel.skipBedStep(selection, 1, h.state);
  selection = builderModel.skipBedStep(selection, 2, h.state);
  const accepted = h.command({ type: "bed.quote", selection }).quote;
  h.command({
    type: "cart.add_bundle",
    selection,
    quote: accepted,
    name: "Explicit partial bed",
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.state.cart.lines.length, 1);
  assert.equal(h.state.cart.bundles[0].complete_bed, false);
});

test("size reconciliation retains named color, proposes exact equivalents, and changes attached insert dimensions", () => {
  const h = harness(),
    selection = builderModel.normalizeBed(h.state.recipes[0].selection);
  const top = selection.slots.find((s) => s.slot_id === "main_top"),
    topVariant = h.state.variants.find((v) => v.id === top.variant_id);
  selection.insert_links.push({
    slot_id: "main_top",
    variant_id: topVariant.compatible_insert_variant_ids[0],
    quantity: 1,
  });
  const original = canonicalJSON(selection),
    proposal = builderModel.changeBedSize(
      h.state,
      selection,
      "us-king",
      h.runtime.now,
    );
  assert.equal(canonicalJSON(selection), original);
  assert.equal(proposal.selection.bed_size_id, "us-king");
  assert.ok(proposal.changes.some((c) => c.kind === "replaced"));
  for (const old of selection.slots.filter((s) => s.variant_id)) {
    const next = proposal.selection.slots.find(
      (s) => s.slot_id === old.slot_id,
    );
    const a = h.state.variants.find((v) => v.id === old.variant_id),
      b = h.state.variants.find((v) => v.id === next.variant_id);
    assert.equal(a.color_id, b.color_id);
    assert.equal(a.product_id, b.product_id);
    assert.equal(next.state, "selected");
  }
  const changedTop = h.state.variants.find(
    (v) =>
      v.id ===
      proposal.selection.slots.find((s) => s.slot_id === "main_top").variant_id,
  );
  assert.ok(
    changedTop.compatible_insert_variant_ids.includes(
      proposal.selection.insert_links[0].variant_id,
    ),
  );
  h.command({ type: "bed.quote", selection: proposal.selection });
});

test("missing same-color size stays unresolved instead of silently substituting another color", () => {
  const state = createSeedState(),
    selection = builderModel.normalizeBed(state.recipes[0].selection);
  const original = state.variants.find(
    (v) =>
      v.id ===
      selection.slots.find((s) => s.slot_id === "foundation").variant_id,
  );
  for (const v of state.variants)
    if (
      v.product_id === original.product_id &&
      v.color_id === original.color_id &&
      v.compatible_bed_size_ids.includes("us-king")
    )
      v.active = false;
  const proposal = builderModel.changeBedSize(
    state,
    selection,
    "us-king",
    FIXTURE_TIME,
  );
  const slot = proposal.selection.slots.find((s) => s.slot_id === "foundation");
  assert.equal(slot.variant_id, original.id);
  assert.equal(slot.state, "unresolved");
  assert.ok(
    proposal.changes.some(
      (c) => c.slot === "foundation" && c.kind === "unresolved",
    ),
  );
  assert.throws(
    () =>
      quoteSelection(state, proposal.selection, {
        now: FIXTURE_TIME,
        quote_id: "unresolved",
      }),
    code("INCOMPLETE_SELECTION"),
  );
});

test("entry links preserve exact SKU and saved-look ownership and reject conflicting contexts", () => {
  const state = createSeedState(),
    variant = state.variants.find(
      (v) =>
        v.product_id === "atelier-percale" &&
        v.color_id === "sage" &&
        v.size_id.includes("queen"),
    );
  const entry = builderModel.resolveBedEntry(
    state,
    new URLSearchParams({ sku: variant.sku }),
  );
  assert.equal(
    entry.selection.slots.find((s) => s.slot_id === "foundation").variant_id,
    variant.id,
  );
  assert.equal(entry.selection.fit_confirmed, true);
  assert.equal(entry.selection.step_intent.top, "open");
  const recipe = builderModel.resolveBedEntry(
    state,
    new URLSearchParams({ recipe: state.recipes[0].id }),
  );
  assert.equal(
    recipe.selection.slots.find((s) => s.slot_id === "foundation").variant_id,
    state.recipes[0].selection.slots.find((s) => s.slot_id === "foundation")
      .variant_id,
  );
  assert.ok(
    builderModel.resolveBedEntry(
      state,
      new URLSearchParams({ recipe: state.recipes[0].id, sku: variant.id }),
    ).error,
  );
  assert.ok(
    builderModel.resolveBedEntry(
      state,
      new URLSearchParams({ look: "another-owners-look" }),
    ).error,
  );
  const cushion = state.variants.find(
    (v) =>
      state.products.find((p) => p.id === v.product_id)?.product_role ===
      "cushion_cover",
  );
  assert.equal(
    builderModel.resolveBedEntry(
      state,
      new URLSearchParams({ sku: cushion.id }),
    ).selection.fit_confirmed,
    false,
  );
});

test("five positioned cushion covers aggregate commerce quantity while retaining all visual positions and insert links", () => {
  const h = harness();
  let selection = builderModel.normalizeBed(h.state.recipes[0].selection);
  const cover = selection.slots.find(
    (s) => s.slot_id === "cushion_1",
  ).variant_id;
  const insert = h.state.variants.find((v) => v.id === cover)
    .compatible_insert_variant_ids[0];
  for (let i = 1; i <= 5; i++) {
    selection = builderModel.setBedSlot(
      selection,
      "cushion_" + i,
      cover,
      h.state,
    );
    selection.insert_links.push({
      slot_id: "cushion_" + i,
      variant_id: insert,
      quantity: 1,
    });
  }
  const quote = h.command({ type: "bed.quote", selection }).quote;
  assert.equal(quote.lines.find((l) => l.variant_id === cover).quantity, 5);
  assert.equal(
    quote.lines
      .filter((l) => l.product_role === "pillow_insert")
      .reduce((n, l) => n + l.quantity, 0),
    5,
  );
  assert.equal(quote.bundle_tiers[0].groups.length, 3);
  const command = {
    type: "cart.add_bundle",
    selection,
    quote,
    name: "Five positioned cushions",
    expected_cart_revision: h.state.cart.revision,
  };
  h.command(command, "five-cushion-intent");
  h.command(command, "five-cushion-intent");
  assert.equal(h.state.cart.bundles.length, 1);
  assert.equal(
    h.state.cart.bundles[0].selection.slots.filter(
      (s) => s.slot_id.startsWith("cushion_") && s.state === "selected",
    ).length,
    5,
  );
  assert.deepEqual(
    h.state.cart.bundles[0].selection.slots
      .filter((s) => s.slot_id.startsWith("cushion_"))
      .map((s) => s.position.z),
    [60, 61, 62, 63, 64],
  );
});

test("renderer follows 0/10/20/30/40/50/60-64 and inspection cannot remove merchandise", () => {
  const state = createSeedState();
  let selection = builderModel.normalizeBed(state.recipes[0].selection);
  const throwVariant = state.variants.find(
    (v) => v.product_id === "highland-throw",
  );
  selection = builderModel.setBedSlot(
    selection,
    "throw",
    throwVariant.id,
    state,
  );
  const cushion = selection.slots.find(
    (s) => s.slot_id === "cushion_1",
  ).variant_id;
  for (let i = 2; i <= 5; i++)
    selection = builderModel.setBedSlot(
      selection,
      "cushion_" + i,
      cushion,
      state,
    );
  const before = canonicalJSON(selection);
  const render = (inspection) =>
    renderToStaticMarkup(
      createElement(BedPreviewStage, {
        state,
        selection,
        inspection,
        onEdit: () => {},
      }),
    );
  const all = render("all");
  const order = [...all.matchAll(/data-render-order="(\d+)"/g)].map((m) =>
    Number(m[1]),
  );
  assert.deepEqual(order, [0, 10, 20, 30, 40, 50, 60, 61, 62, 63, 64]);
  assert.ok(all.includes("2400 1800"));
  assert.ok(all.includes("styling-only"));
  assert.ok(!render("foundation").includes('data-render-order="30"'));
  assert.ok(!render("top").includes('data-render-order="10"'));
  assert.equal(canonicalJSON(selection), before);
  const fitted = state.variants.find(
    (v) =>
      v.product_id === "essential-fitted" &&
      v.compatible_bed_size_ids.includes("us-queen"),
  );
  selection = builderModel.setBedSlot(
    selection,
    "foundation",
    fitted.id,
    state,
  );
  assert.ok(!render("all").includes('data-render-order="20"'));
  assert.ok(!render("all").includes('data-render-order="50"'));
  const empty = renderToStaticMarkup(
    createElement(BedPreviewStage, {
      state,
      selection: builderModel.newBed(),
      inspection: "all",
      onEdit: () => {},
    }),
  );
  assert.deepEqual(
    [...empty.matchAll(/data-render-order="(\d+)"/g)].map((m) => Number(m[1])),
    [0],
  );
});

test("builder saves use expected look revisions and expired quotes cannot commit a bundle", () => {
  const h = harness(),
    selection = builderModel.normalizeBed(h.state.recipes[0].selection);
  const saved = h.command({
    type: "look.save",
    look_id: null,
    expected_look_revision: 0,
    name: "Flagship QA look",
    selection,
  });
  h.command({
    type: "look.save",
    look_id: saved.id,
    expected_look_revision: 1,
    name: "Updated flagship QA look",
    selection,
  });
  assert.throws(
    () =>
      h.command({
        type: "look.save",
        look_id: saved.id,
        expected_look_revision: 1,
        name: "Stale overwrite",
        selection,
      }),
    code("REVISION_CONFLICT"),
  );
  assert.equal(
    h.state.saved_looks.find((l) => l.id === saved.id).name,
    "Updated flagship QA look",
  );
  const old = h.command({ type: "bed.quote", selection }).quote;
  h.runtime.now = new Date(Date.parse(old.expires_at) + 1).toISOString();
  const before = h.state;
  assert.throws(
    () =>
      h.command({
        type: "cart.add_bundle",
        selection,
        quote: old,
        name: "Expired intent",
        expected_cart_revision: h.state.cart.revision,
      }),
    code("QUOTE_EXPIRED"),
  );
  assert.equal(h.state, before);
  const fresh = h.command({ type: "bed.quote", selection }).quote;
  h.command({
    type: "cart.add_bundle",
    selection,
    quote: fresh,
    name: "Fresh intent",
    expected_cart_revision: h.state.cart.revision,
  });
  assert.equal(h.state.cart.bundles.length, 1);
});

test("atomic buy-again batch rejects the entire purchase on shortage or stale cart", () => {
  const h = harness();
  const variants = h.state.variants.slice(0, 2);
  const before = h.state;
  assert.throws(
    () =>
      h.command({
        type: "cart.add_items",
        expected_cart_revision: h.state.cart.revision,
        items: [
          { variant_id: variants[0].id, quantity: 1 },
          { variant_id: variants[1].id, quantity: 99 },
        ],
      }),
    code("INSUFFICIENT_STOCK"),
  );
  assert.equal(h.state, before);
  h.command({
    type: "cart.add_items",
    expected_cart_revision: h.state.cart.revision,
    items: variants.map((v) => ({ variant_id: v.id, quantity: 1 })),
  });
  assert.equal(h.state.cart.lines.length, 2);
  assert.throws(
    () =>
      h.command({
        type: "cart.add_items",
        expected_cart_revision: before.cart.revision,
        items: [{ variant_id: variants[0].id, quantity: 1 }],
      }),
    code("REVISION_CONFLICT"),
  );
});

test("named swatches and reorder thresholds enforce role, revision and range contracts", () => {
  const h = harness();
  const color = {
    ...h.state.colors[0],
    id: "new-swatch",
    name: "Deep Fern",
    hex: "#365447",
  };
  h.runtime.role = "customer";
  assert.throws(
    () =>
      h.command({
        type: "catalog.swatch_save",
        color,
        expected_state_revision: h.state.revision,
      }),
    code("FORBIDDEN"),
  );
  h.runtime.role = "catalog_editor";
  const old = h.state.revision;
  h.command({
    type: "catalog.swatch_save",
    color,
    expected_state_revision: old,
  });
  assert.equal(h.state.colors.at(-1).name, "Deep Fern");
  assert.throws(
    () =>
      h.command({
        type: "catalog.swatch_save",
        color,
        expected_state_revision: old,
      }),
    code("REVISION_CONFLICT"),
  );
  const balance = h.state.inventory[0];
  assert.throws(
    () =>
      h.command({
        type: "inventory.threshold",
        inventory_id: balance.id,
        expected_inventory_revision: balance.revision,
        threshold: 10,
        reason: "Review",
      }),
    code("FORBIDDEN"),
  );
  h.runtime.role = "inventory_manager";
  h.command({
    type: "inventory.threshold",
    inventory_id: balance.id,
    expected_inventory_revision: balance.revision,
    threshold: 10,
    reason: "Count policy review",
  });
  assert.equal(h.state.inventory[0].reorder_threshold, 10);
  assert.equal(h.state.inventory[0].on_hand, balance.on_hand);
});

test("unpublished catalog deletion cannot remove historical products and new publication creates zero stock", () => {
  const h = harness();
  const source = h.state.products[0];
  const product = {
    ...structuredClone(source),
    id: "phase4-new-product",
    revision: 0,
    slug: "phase4-new-product",
    title: "New QA catalog family",
  };
  const variant = {
    ...structuredClone(
      h.state.variants.find((v) => v.product_id === source.id),
    ),
    id: "phase4-new-variant",
    product_id: product.id,
    sku: "PHASE4-NEW",
    revision: 0,
    availability: {
      warehouse_id: "qa-warehouse",
      inventory_id: "phase4-inventory",
      policy: "finite",
    },
  };
  h.command({
    type: "catalog.save_draft",
    draft: { product, variants: [variant] },
    expected_product_revision: 0,
  });
  h.command({
    type: "catalog.delete_draft",
    product_id: product.id,
    expected_product_revision: 1,
    reason: "Delete unpublished draft after impact review",
  });
  assert.ok(!h.state.product_drafts.some((d) => d.product.id === product.id));
  h.command({
    type: "catalog.save_draft",
    draft: { product, variants: [variant] },
    expected_product_revision: 0,
  });
  h.command({
    type: "catalog.publish",
    product_id: product.id,
    expected_product_revision: 1,
    reason: "Publish reviewed QA product",
  });
  const stock = h.state.inventory.find(
    (i) => i.id === variant.availability.inventory_id,
  );
  assert.equal(stock.on_hand, 0);
  assert.equal(stock.reserved, 0);
  h.command({
    type: "catalog.save_draft",
    draft: {
      product: h.state.products.find((p) => p.id === product.id),
      variants: [h.state.variants.find((v) => v.id === variant.id)],
    },
    expected_product_revision: 2,
  });
  assert.throws(
    () =>
      h.command({
        type: "catalog.delete_draft",
        product_id: product.id,
        expected_product_revision: 3,
        reason: "Unsafe historical deletion",
      }),
    code("REFERENCED_PRODUCT"),
  );
});

test("Finance records immutable event amounts and rejects competing refunds against stale order revisions", () => {
  const h = harness();
  const order = h.state.orders.find((o) => o.payment_state === "paid");
  const snapshot = canonicalJSON(order.quote_snapshot);
  const balance = h.state.inventory.map((i) => [i.id, i.on_hand, i.reserved]);
  const command = {
    type: "order.transition",
    order_id: order.id,
    expected_order_revision: order.revision,
    transition: {
      action: "fixture_refund",
      amount: money(100, order.captured.currency),
      evidence: "QA refund evidence",
      reason: "QA partial refund",
    },
  };
  h.command(command);
  const updated = h.state.orders.find((o) => o.id === order.id);
  assert.equal(updated.financial_events.at(-1).amount.amount_minor, 100);
  assert.equal(updated.financial_events.at(-1).type, "refund");
  assert.equal(canonicalJSON(updated.quote_snapshot), snapshot);
  assert.deepEqual(
    h.state.inventory.map((i) => [i.id, i.on_hand, i.reserved]),
    balance,
  );
  assert.throws(() => h.command(command), code("REVISION_CONFLICT"));
  assert.throws(
    () =>
      h.command({
        ...command,
        expected_order_revision: updated.revision,
        transition: {
          ...command.transition,
          amount: money(updated.captured.amount_minor, order.captured.currency),
        },
      }),
    code("REFUND_AMOUNT"),
  );
});

test("analytics uses financial event dates, excludes shipping/tax and preserves category allocations after catalog edits", () => {
  const h = harness();
  const currency = h.state.cart.currency;
  const expected = h.state.orders
    .filter((o) => o.captured.amount_minor > 0)
    .reduce(
      (total, o) => total + o.quote_snapshot.merchandise_total.amount_minor,
      0,
    );
  const data = backoffice.analytics(
    h.state,
    "2026-01-01",
    "2099-12-31",
    "Asia/Karachi",
    currency,
  );
  assert.equal(data.net, expected);
  assert.equal(
    Object.values(data.categories).reduce((a, b) => a + b, 0),
    data.net,
  );
  assert.equal(
    data.pending.length,
    h.state.orders.filter((o) => o.payment_state === "pending").length,
  );
  assert.ok(data.active.every((o) => o.payment_state !== "pending"));
  h.state.products.forEach((p) => (p.category = "Inserts"));
  assert.deepEqual(
    backoffice.analytics(
      h.state,
      "2026-01-01",
      "2099-12-31",
      "Asia/Karachi",
      currency,
    ).categories,
    data.categories,
  );
  assert.equal(
    backoffice.reportingDay("2026-10-18T23:30:00.000Z", "Asia/Karachi"),
    "2026-10-19",
  );
});

test("homepage featured drafts publish as an atomic CMS version and reject missing product references", () => {
  const h = harness();
  const hero = h.state.hero_banners.find((b) => b.placement === "hero");
  const ids = h.state.products.slice(0, 2).map((p) => p.id);
  h.command({
    type: "hero.save_draft",
    banner: { ...hero, featured_product_ids: ids },
    expected_banner_revision: hero.revision,
  });
  assert.equal(
    h.state.hero_banners.find((b) => b.id === hero.id).featured_product_ids,
    undefined,
  );
  const draft = h.state.hero_banner_drafts.find((b) => b.id === hero.id);
  h.command({
    type: "hero.publish",
    banner_id: hero.id,
    expected_banner_revision: draft.revision,
    reason: "Reviewed collection order",
  });
  const live = h.state.hero_banners.find((b) => b.id === hero.id);
  assert.deepEqual(live.featured_product_ids, ids);
  assert.throws(
    () =>
      h.command({
        type: "hero.save_draft",
        banner: { ...live, featured_product_ids: ["missing-product"] },
        expected_banner_revision: live.revision,
      }),
    code("NOT_FOUND"),
  );
});

test("auth return targets and money inputs reject unsafe redirects and imprecise amounts", () => {
  for (const value of [
    "//evil.test",
    "/admin%2f/evil",
    "https://evil.test",
    "/account\\evil",
    "/account?next=%0aevil",
  ])
    assert.equal(backoffice.safeReturn(value), "/account");
  assert.equal(backoffice.safeReturn("/checkout"), "/checkout");
  assert.equal(backoffice.minorInput("12.34"), 1234);
  assert.throws(() => backoffice.minorInput("12.345"));
  assert.throws(() => backoffice.minorInput("-1"));
});

test("legacy full-capture timestamps support reporting without inventing unknown refund history", () => {
  const h = harness();
  const current = backoffice.analytics(
    h.state,
    "2026-01-01",
    "2099-12-31",
    "UTC",
    "USD",
  );
  h.state.orders.forEach((o) => delete o.financial_events);
  const restored = backoffice.analytics(
    h.state,
    "2026-01-01",
    "2099-12-31",
    "UTC",
    "USD",
  );
  assert.equal(restored.net, current.net);
  assert.equal(restored.missing, 0);
  const order = h.state.orders.find((o) => o.captured.amount_minor > 0);
  order.refunded.amount_minor = 100;
  const incomplete = backoffice.analytics(
    h.state,
    "2026-01-01",
    "2099-12-31",
    "UTC",
    "USD",
  );
  assert.equal(incomplete.missing, 1);
  assert.equal(backoffice.minorInput("123", 0), 123);
  assert.throws(() => backoffice.minorInput("1.00", 0));
});

test("buy-again rejects a concurrent price change without adding a partial batch", () => {
  const h = harness();
  const v = h.state.variants[0];
  const expectedPrice = structuredClone(v.price);
  v.price.amount_minor += 100;
  const before = h.state;
  assert.throws(
    () =>
      h.command({
        type: "cart.add_items",
        expected_cart_revision: h.state.cart.revision,
        items: [
          { variant_id: v.id, quantity: 1, expected_unit_price: expectedPrice },
        ],
      }),
    code("PRICE_CHANGED"),
  );
  assert.equal(h.state, before);
  assert.equal(h.state.cart.lines.length, 0);
});
