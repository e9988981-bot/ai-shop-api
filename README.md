# ai-shop: Multi-tenant Shop + WhatsApp Order System

Production-ready multi-tenant system where **each custom domain = one shop**. Built for Cloudflare (Pages + Workers + D1 + R2), deployed via **GitHub + Cloudflare Dashboard only** (no local Node.js, no wrangler CLI).

## Architecture

| Component | Technology |
|-----------|------------|
| Web (public + admin) | Next.js (App Router, static export) on **Cloudflare Pages** |
| API | **Cloudflare Worker** (separate from Pages) |
| Database | **Cloudflare D1** (SQLite) |
| Images | **Cloudflare R2** |
| Auth | Email + password, HttpOnly cookie session |
| Tenant resolution | Host header → `shops.domain` → `shop_id` |

## Repository Structure

```
/
├── apps/
│   ├── web/              # Next.js → Cloudflare Pages (หน้าเว็บ + Admin)
│   │   ├── src/
│   │   │   ├── app/      # หน้า public: /, /products/[slug], /admin/*
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── public/
│   │   └── next.config.js
│   └── api/              # Cloudflare Worker (API)
│       ├── src/index.ts
│       └── build.mjs
├── packages/
│   └── shared/           # Types, Zod schemas, i18n (Lao + English)
├── schema/
│   ├── schema.sql        # D1 schema (run ใน D1 Console)
│   └── seed.sql          # Optional seed (หรือใช้ bootstrap)
└── wrangler.toml         # Worker config (root)
```

---

## Deployment (Cloudflare Dashboard + GitHub)

### Prerequisites

- Cloudflare account
- GitHub account
- Repository pushed to GitHub

---

### Step 1: Create D1 Database

1. **Cloudflare Dashboard** → **Workers & Pages** → **D1 SQL Database**
2. คลิก **Create database**
3. ชื่อ: `ai-shop-db`
4. คลิก **Create**
5. เปิด database → แท็บ **Console**
6. Copy เนื้อหาจาก `schema/schema.sql` วางลงใน Console
7. คลิก **Execute** เพื่อสร้างตาราง
8. Copy **Database ID** (ใช้สำหรับ Worker ในขั้นตอนถัดไป)

---

### Step 2: Create R2 Bucket

1. **Cloudflare Dashboard** → **R2 Object Storage**
2. คลิก **Create bucket**
3. ชื่อ: `ai-shop-uploads`
4. คลิก **Create bucket**

---

### Step 3: Create Worker (API) – ผูก GitHub จากขั้นตอนแรก

**สร้าง Worker โดยเลือก Connect to Git เลย** (ไม่ต้องสร้าง Worker ว่างก่อน)

1. **Workers & Pages** → **Create** → **Worker**
2. เลือก **Connect to Git** (ไม่ใช่ Deploy)
3. เชื่อมต่อ **GitHub** แล้วเลือก repository `ai-shop`
4. ตั้งค่าในหน้า **Set up your application**:

   | ส่วน | ค่าที่ใช้ |
   |------|-----------|
   | **Project name** | `ai-shop-api` |
   | **Root directory** | เว้นว่างไว้ (ใช้ repo root) |
   | **Build command** | `bun run build:api` |
   | **Deploy command** | `npx wrangler deploy` |

5. คลิก **Deploy** (รอให้ build และ deploy เสร็จ)

6. หลัง deploy เสร็จ → ไปที่ **ai-shop-api** → **Settings** → **Variables and Secrets** แล้วเพิ่ม:

   - **D1 Database binding**
     - Variable name: `DB`
     - D1 database: เลือก `ai-shop-db`
   - **R2 Bucket binding**
     - Variable name: `BUCKET`
     - R2 bucket: เลือก `ai-shop-uploads`
   - **Secret** (encrypted)
     - Name: `SESSION_SECRET`
     - Value: สร้างค่าสุ่มยาว 32+ ตัวอักษร

7. **แก้ไข `wrangler.toml`** ที่ root ของ repo ก่อน deploy ครั้งแรก:
   - เปิด `wrangler.toml`
   - แทนค่า `REPLACE_WITH_YOUR_D1_DATABASE_ID` ด้วย **Database ID** จาก D1
   - Commit และ push ขึ้น GitHub

8. **สำคัญ**: หลังเพิ่ม bindings แล้ว ให้ไปที่ **Deployments** → **Retry deployment** เพื่อให้ Worker รันใหม่พร้อม bindings

---

### Step 4: Create Pages Project (Web)

หน้าเว็บ (public + admin) อยู่ใน `apps/web/` เป็น Next.js App Router

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. เลือก repository เดียวกับ Worker (`ai-shop`)
3. **Production branch**: `main`
4. ตั้งค่า **Build configuration** (โค้ดเว็บอยู่ใน `apps/web/`):

   | ส่วน | ค่า |
   |------|-----|
   | **Framework preset** | Next.js (Static HTML) |
   | **Root directory** | เว้นว่าง (ใช้ repo root เพราะ build:web รันจาก root) |
   | **Build command** | `bun run build:web` |
   | **Build output directory** | `apps/web/out` |

   **สำคัญ:** ต้องใส่ `apps/web/out` ไม่ใช่ `out` — เพราะ build รันจาก root แต่ Next.js สร้างโฟลเดอร์ `out` ภายใน `apps/web/` เท่านั้น

5. เพิ่ม **Environment variable** (ถ้าต้องการ):
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: URL ของ API (เช่น `https://ai-shop-api.<subdomain>.workers.dev`) หรือเว้นว่างถ้าใช้ same domain

6. คลิก **Save and Deploy**

**ถ้า Build ล้มเหลว (เช่น "missing generateStaticParams"):**  
โปรเจกต์ใช้ `output: 'export'` (static export) ทุก dynamic route เช่น `[id]`, `[slug]` ต้องมี `generateStaticParams()` ในโค้ด และมี rewrite ใน `public/_redirects` ให้ path จริงไปที่ path ที่ generate (เช่น `/admin/products/*` → `/admin/products/edit/`)

**ถ้า Pages deploy แล้วไม่มีหน้าเว็บ / 404 / ขาว:**
- ตรวจสอบ **Build output directory** ว่าเป็น **`apps/web/out`** (ไม่ใช่ `out`)
- ตรวจสอบ **Root directory** ว่าเว้นว่าง (ใช้ repo root)
- ดู **Deployments** → Build logs ว่า `bun run build:web` ผ่านและมีโฟลเดอร์ `out` ถูกสร้าง

---

### Step 5: Bootstrap – สร้างร้านค้าแรก

1. ตั้งค่า custom domain (ถ้ามี) หรือใช้ `*.pages.dev` / `*.workers.dev`
2. เปิด: `https://<worker-url>/admin/bootstrap`
   - เช่น `https://ai-shop-api.<account>.workers.dev/admin/bootstrap`
3. กรอก:
   - Domain (เช่น `ai-shop-api.<account>.workers.dev` หรือโดเมนที่ใช้)
   - ชื่อร้าน (Lao + English)
   - อีเมลและรหัสผ่านของ Owner (อย่างน้อย 8 ตัวอักษร)
4. คลิก **Create Shop**
5. ลงชื่อเข้าใช้ที่ `/admin/login`

Bootstrap จะใช้งานได้**เฉพาะเมื่อตาราง `users` ว่าง**เท่านั้น หลังสร้าง owner คนแรกแล้วจะใช้ไม่ได้อีก

---

## Build Commands (สรุป)

| โปรเจกต์ | คำสั่ง |
|----------|--------|
| Worker (API) | `bun run build:api` |
| Pages (Web) | `bun run build:web` |

Cloudflare จะรัน `bun install` ให้อัตโนมัติก่อน build ไม่ต้องใส่ `npm install` เพิ่ม

---

## Environment Variables & Secrets

| Variable | ที่ใช้ | คำอธิบาย |
|----------|--------|----------|
| `SESSION_SECRET` | Worker | สตริงสุ่มยาวสำหรับเซสชัน (จำเป็น) |
| `NEXT_PUBLIC_API_URL` | Pages | URL ของ API หรือเว้นว่างสำหรับ same-origin |

---

## Security

- **Password hashing**: PBKDF2-SHA256, 100,000 iterations, 16-byte salt
- **Session cookie**: HttpOnly, Secure, SameSite=Lax
- **CSRF**: Same-site cookie + ตรวจสอบ Origin
- **Rate limit**: Login จำกัด 5 ครั้งต่อ IP ต่อนาที

---

## API Routes

### Public

- `GET /api/public/shop` – ข้อมูลร้าน
- `GET /api/public/categories` – รายการหมวดหมู่
- `GET /api/public/products` – รายการสินค้า (query: `category_id`, `search`)
- `GET /api/public/products/:slug` – รายละเอียดสินค้า
- `POST /api/public/orders` – สร้าง order, ส่งกลับ `{ wa_url }`
- `GET /api/public/images/:key` – รูปจาก R2

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Admin (ต้อง login)

- `POST /api/admin/bootstrap` – สร้างร้านแรก (ใช้ได้เมื่อยังไม่มี users)
- `GET/PUT /api/admin/shop`
- CRUD `/api/admin/wa-numbers`
- CRUD `/api/admin/categories`
- CRUD `/api/admin/products`
- `POST /api/admin/uploads/sign` – ได้ `{ uploadUrl, r2Key, publicUrl }`
- CRUD `/api/admin/products/:id/images`
- CRUD `/api/admin/products/:id/options`
- `GET/PUT /api/admin/orders`
- `GET /api/admin/orders/export.csv`

---

## Languages

- Lao (lo)
- English (en)

สลับได้ใน UI และเก็บใน `localStorage` ด้วยคีย์ `ai_shop_locale`
