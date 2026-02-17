# วิธีตั้งค่า Subdomain สำหรับแต่ละร้าน

ระบบรองรับการใช้ **Subdomain** เพื่อแยกร้านแต่ละร้าน โดยแต่ละร้านจะมี subdomain เป็นของตัวเอง

## ตัวอย่าง Subdomain

- `shop1.example.com` → ร้านที่ 1
- `shop2.example.com` → ร้านที่ 2  
- `shop3.example.com` → ร้านที่ 3
- `myshop.example.com` → ร้านของฉัน

## ขั้นตอนการตั้งค่า

### 1. สมัครร้านใหม่

เมื่อสมัครร้านใหม่ (`/register`):
- **Domain**: ใส่ subdomain ที่ต้องการ (เช่น `shop1.example.com`)
- ระบบจะสร้างร้านและบันทึก domain นี้

### 2. ตั้งค่า DNS ใน Cloudflare

1. ไปที่ **Cloudflare Dashboard** → เลือก domain ของคุณ (เช่น `example.com`)
2. ไปที่ **DNS** → **Records**
3. คลิก **Add record**
4. ตั้งค่า:
   - **Type**: `CNAME` หรือ `A` (ถ้าใช้ CNAME ต้องชี้ไปที่ Worker)
   - **Name**: `shop1` (สำหรับ `shop1.example.com`)
   - **Target**: 
     - ถ้าใช้ CNAME: ชื่อ Worker (เช่น `ai-shop-api.xxx.workers.dev`)
     - ถ้าใช้ A: IP address ของ Worker (หาได้จาก Cloudflare Dashboard)
   - **Proxy status**: เปิด Proxy (ส้ม) หรือปิด (เทา) ก็ได้
5. คลิก **Save**

### 3. เพิ่ม Custom Domain ใน Worker

1. ไปที่ **Cloudflare Dashboard** → **Workers & Pages** → เลือก Worker ของคุณ
2. ไปที่ **Settings** → **Triggers** → **Custom Domains**
3. คลิก **Add Custom Domain**
4. ใส่ subdomain (เช่น `shop1.example.com`)
5. คลิก **Add Custom Domain**
6. รอให้ Cloudflare ตรวจสอบ DNS (อาจใช้เวลา 1-5 นาที)

### 4. ตั้งค่า Domain ใน Admin

1. Login เข้า Admin
2. ไปที่ **ตั้งค่าข้อมูลร้าน**
3. ตั้งค่า **โดเมนร้าน** เป็น subdomain ที่ตั้งไว้ (เช่น `shop1.example.com`)
4. กด **บันทึก**

### 5. ทดสอบ

เปิด browser ไปที่ `https://shop1.example.com` → ควรเห็นหน้าร้านของร้านนั้น

---

## หมายเหตุสำคัญ

⚠️ **แต่ละร้านต้องมี subdomain ที่ไม่ซ้ำกัน**
- ถ้า subdomain ซ้ำกัน ระบบจะแสดงร้านที่สร้างก่อน

⚠️ **DNS Propagation**
- หลังตั้งค่า DNS อาจใช้เวลา 1-24 ชั่วโมงในการ propagate
- ใช้ `dig` หรือ `nslookup` เพื่อตรวจสอบว่า DNS ทำงานหรือยัง

⚠️ **SSL Certificate**
- Cloudflare จะออก SSL certificate อัตโนมัติให้ subdomain
- รอให้ SSL active (อาจใช้เวลา 1-5 นาที)

---

## ตัวอย่างการใช้งาน

### ร้านที่ 1
- **Subdomain**: `shop1.example.com`
- **Admin**: `https://shop1.example.com/admin`
- **Storefront**: `https://shop1.example.com`

### ร้านที่ 2
- **Subdomain**: `shop2.example.com`
- **Admin**: `https://shop2.example.com/admin`
- **Storefront**: `https://shop2.example.com`

### ร้านที่ 3
- **Subdomain**: `myshop.example.com`
- **Admin**: `https://myshop.example.com/admin`
- **Storefront**: `https://myshop.example.com`

แต่ละร้านจะมีข้อมูลแยกกัน (สินค้า, ออเดอร์, ข้อมูลร้าน) ตาม `shop_id` ที่แยกด้วย domain
