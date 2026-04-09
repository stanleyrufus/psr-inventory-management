# Migration Sync Notes

## Reconciled without execution

### 20251018160004_create_po_rfq_emails.cjs
Reason: `po_rfq_emails` table already existed in DB. RFQ feature currently hidden.

### 20251021_add_product_fk_constraints.cjs
Reason: migration expects `inventory.product_id`, but current schema does not contain that column. Migration is obsolete/incompatible for current schema.

### 20260402_add_new_permissions_for_po_reports_settings.cjs
Reason: all target permissions already existed in `permissions` table.

### 20260402_add_received_and_backorder_qty_to_purchase_order_items.cjs
Reason: `purchase_order_items` already contained `received_quantity` and `backorder_quantity`.

### 20260409014243_add_last_po_fields_to_inventory.cjs
Reason: current schema already contains `last_po_number`, `last_po_date`, `last_vendor_id`, and uses `last_unit_price` instead of `last_po_price`. Migration is obsolete/mismatched.