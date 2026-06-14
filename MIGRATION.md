# Pixoris CMS v2.1 Migration Guide

## Changes from v2.0

### 1. Security Fixes
- **JWT**: Replaced custom base64 JWT with proper HMAC-SHA256 using Web Crypto API
- **Passwords**: Added SHA-256 hashing with salt. Legacy plaintext passwords auto-migrate on first login.

### 2. TinyMCE → Custom RTE
- Removed TinyMCE Cloud dependency (was read-only without API key)
- Replaced with lightweight `contenteditable` editor with toolbar
- No external API key required
- Supports: bold, italic, strike, headings, lists, alignment, links, images

### 3. Bug Fixes
- **Fixed**: `API_BASE` duplicate declaration error (admin.js now uses `$a`, `$$a`, `showAdminToast`, `adminApiFetch`)
- **Fixed**: Login freeze caused by JS errors
- **Fixed**: Schema sync — `sort_order` column now in schema.sql

### 4. New Features
- **Products API**: Full CRUD for shop products in database
- **Products table** in D1 with seed data
- Public `/api/products` and `/api/product/:slug` endpoints

### 5. Database Migration

Run these SQL commands in your D1 console:

```sql
-- Add sort_order if missing
ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price INTEGER DEFAULT 0,
  image_url TEXT,
  category TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed products
INSERT OR IGNORE INTO products (title, slug, description, price, image_url, category, featured, sort_order) VALUES
  ('اکشن‌فیگور Cyber Hero', 'cyber-hero', '...', 1490000, 'assets/card-shop.svg', 'Figure', 1, 1),
  ('پوستر سینمایی Neon Frame', 'neon-poster', '...', 320000, 'assets/hero-cinema.svg', 'Poster', 0, 2),
  ('Pixel Box Collection', 'pixel-box', '...', 690000, 'assets/hero-gaming.svg', 'Merch', 1, 3);
```

### 6. Deployment Steps

```bash
# 1. Update schema in D1
wrangler d1 execute pixoris-db --file=./schema.sql

# 2. Deploy worker
wrangler deploy

# 3. Update frontend files (admin.html, admin.js, styles.css)
# Upload to your Pages repo

# 4. Clear browser cache and test admin login
```

### 7. Admin Login
- Username: `admin`
- Password: `pixoris2026` (will be auto-hashed on first login)
