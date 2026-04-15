# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (artifacts/pos-system)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Applications

### POS System (artifacts/pos-system)

Full-stack Point of Sales system with:
- **Dashboard**: real-time metrics, sales trend chart, top products, low stock alerts
- **Point of Sale**: product search, cart, multi-payment checkout
- **Products**: CRUD with categories/brands, stock tracking
- **Categories & Brands**: management
- **Customers & Suppliers**: management with credit limits, loyalty points
- **Purchases & Purchase Returns**: with stock-in movements
- **Sales & Sales Returns**: with stock-out movements and loyalty points
- **Stock Movement**: history tracking per product
- **Reports**: charts and analytics

### API Server (artifacts/api-server)

Express 5 REST API serving all POS operations.

## Database Schema

- `categories` — product categories
- `brands` — product brands
- `products` — inventory with pricing and valuation method
- `suppliers` — vendor management
- `customers` — customer management with loyalty points
- `purchases` / `purchase_details` — purchase records
- `purchase_returns` / `purchase_return_details` — purchase return records
- `sales` / `sale_details` / `payment_transactions` — sales records
- `sales_returns` / `sales_return_details` — sales return records
- `stock_movements` — unified stock in/out ledger

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
