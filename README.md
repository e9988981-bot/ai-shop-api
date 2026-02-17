# ai-shop: Multi-tenant Shop + WhatsApp Order System

Production-ready multi-tenant system where **each custom domain = one shop**. Built for Cloudflare (Pages + Workers + D1 + R2), deployed via **GitHub + Cloudflare Dashboard only** (no local Node.js, no wrangler CLI).

**► หลัง deploy แล้วไม่รู้จะใช้ยังไง:** อ่าน **[คู่มือการใช้งาน](docs/คู่มือการใช้งาน.md)** (สร้างร้านครั้งแรก → Login → ตั้งค่าร้าน/สินค้า/WhatsApp → รับออเดอร์)

## Architecture (Workflow ใหม่)

| Component | Technology |
|-----------|------------|
| **หน้าร้าน (ลูกค้า)** | Next.js (static export) บน **Cloudflare Pages** — แสดงร้าน + สินค้า + สั่งผ่าน WhatsApp เท่านั้น |
| **หลังบ้าน (Admin)** | เปิดที่ **Worker** — `https://<worker>/admin` = Bootstrap, Login, Shop, Products, Orders ฯลฯ (proxy ไปที่ Admin Pages) |
| **API** | **Cloudflare Worker** — `/api/*` (public, auth, admin) |
| Database | **Cloudflare D1** (SQLite) |
| Images | **Cloudflare R2** |
| Auth | Email + password, HttpOnly cookie (SameSite=None สำหรับ cross-origin) |
| Tenant resolution | Host header → `shops.domain` → `shop_id` |

## Repository Structure

```
/
├── apps/
│   ├── web/              # Next.js → Cloudflare Pages (หน้าร้านอย่างเดียว: /, /products/[slug])
│   ├── admin/            # Vite + React → Cloudflare Pages (Admin SPA) แล้ว Worker proxy /admin ไปที่นี้
│   └── api/              # Cloudflare Worker (API + proxy /admin, /assets)
├── packages/shared/
└── schema/
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

9. **ตั้งค่า Admin (หลังบ้านที่ Worker):** ใน **Variables and Secrets** เพิ่ม **Environment variable**:
   - Name: `ADMIN_ORIGIN`
   - Value: URL ของ Admin Pages (จะสร้างใน Step 5) เช่น `https://ai-shop-admin.xxx.pages.dev`
   - หลัง deploy Admin Pages แล้วถึงจะใส่ค่าได้

---

### Step 4: Create Pages Project (Web) — หน้าร้านอย่างเดียว

หน้าเว็บ **หน้าร้าน (ลูกค้า)** อยู่ใน `apps/web/` เป็น Next.js — ไม่มี Admin แล้ว

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

5. เพิ่ม **Environment variables**:
   - `NEXT_PUBLIC_API_URL` = URL เต็มของ Worker (เช่น `https://ai-shop-api.xxx.workers.dev`) — ให้หน้าร้านเรียก API ได้
   - `NEXT_PUBLIC_ADMIN_URL` = URL เต็มของ Worker เดียวกัน — ให้ปุ่ม "Admin" ลิงก์ไปที่ Worker /admin

6. คลิก **Save and Deploy**

**ถ้า Build ล้มเหลว (เช่น "missing generateStaticParams"):**  
โปรเจกต์ใช้ `output: 'export'` (static export) หน้า products/[slug] ต้องมี `generateStaticParams()` (มีอยู่แล้ว)

**ถ้า Pages deploy แล้วไม่มีหน้าเว็บ / 404 / ขาว:**
- ตรวจสอบ **Build output directory** ว่าเป็น **`apps/web/out`** (ไม่ใช่ `out`)
- ตรวจสอบ **Root directory** ว่าเว้นว่าง (ใช้ repo root)
- ดู **Deployments** → Build logs ว่า `bun run build:web` ผ่านและมีโฟลเดอร์ `out` ถูกสร้าง

---

### Step 5: Create Pages Project (Admin) — หลังบ้าน

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. เลือก repository เดียวกัน
3. **Production branch**: `main`
4. ตั้งค่า **Build configuration**:

   | ส่วน | ค่า |
   |------|-----|
   | **Framework preset** | None / Static |
   | **Root directory** | เว้นว่าง |
   | **Build command** | `npm run build:admin` (หรือ `bun run build:admin`) |
   | **Build output directory** | `apps/admin/dist` |

5. คลิก **Save and Deploy** แล้ว copy URL ของโปรเจกต์ (เช่น `https://ai-shop-admin.xxx.pages.dev`)
6. กลับไปที่ **Worker** → **Settings** → **Variables and Secrets** → แก้ `ADMIN_ORIGIN` ให้เป็น URL นี้ (ไม่มี slash ต่อท้าย) → **Retry deployment**

หลังนั้น เปิด **https://\<worker-url\>/admin** จะได้หน้า Admin (Bootstrap / Login / Dashboard ฯลฯ)

---

### Step 6: Bootstrap – สร้างร้านค้าแรก

1. เปิด: **https://\<worker-url\>/admin** (หรือ `/admin/bootstrap` โดยตรง)
2. ถ้ายังไม่มี user จะเห็น **Create First Shop** — กรอก Domain (โดเมนของ Worker), ชื่อร้าน, อีเมล, รหัสผ่าน
3. คลิก **Create Shop** แล้วลงชื่อเข้าใช้ที่ `/admin/login`

Bootstrap ใช้ได้**เฉพาะเมื่อตาราง `users` ว่าง** หลังสร้าง owner แล้วจะใช้ไม่ได้อีก

---

## Build Commands (สรุป)

| โปรเจกต์ | คำสั่ง |
|----------|--------|
| Worker (API) | `bun run build:api` |
| Pages (หน้าร้าน) | `bun run build:web` |
| Pages (Admin) | `bun run build:admin` |

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
