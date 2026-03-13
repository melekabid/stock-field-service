# Database Design

## Core Tables

- `users`: Credentials, role, status, profile data.
- `categories`: Product grouping.
- `suppliers`: Procurement source metadata.
- `warehouses`: Physical inventory locations.
- `products`: Product catalog and price/threshold settings.
- `product_stocks`: Quantity by product and warehouse.
- `stock_movements`: Immutable stock in/out ledger.
- `clients`: Customer account records.
- `sites`: Client intervention locations.
- `interventions`: Work order header and lifecycle state.
- `intervention_items`: Spare parts used per intervention.
- `photos`: Intervention image evidence.
- `signatures`: Client acceptance signatures.
- `notifications`: In-app alert stream.
- `audit_logs`: Operational traceability.

The exact schema is implemented in [`backend/prisma/schema.prisma`](/Users/flapaabid/Downloads/stock-field-service/backend/prisma/schema.prisma).
