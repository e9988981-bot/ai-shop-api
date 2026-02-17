-- ai-shop Seed: Create first shop + owner
-- Run AFTER schema.sql in Cloudflare D1 Console
--
-- IMPORTANT: Replace PASSWORD_HASH with actual hash before running.
-- Use the bootstrap endpoint instead if you prefer (recommended):
-- POST /api/admin/bootstrap with body:
--   { "domain": "myshop.example.com", "shop_name_lo": "...", "shop_name_en": "...", "email": "owner@example.com", "password": "..." }
-- Bootstrap is ONLY enabled when users table is empty.
--
-- To generate password hash for manual seed:
-- 1. Use Workers runtime: crypto.subtle.importKey + PBKDF2 with SHA-256
-- 2. Or use: https://raw.githubusercontent.com/your-repo/scripts/hash-password.html (create a simple page)
--
-- For reference, a bcrypt-style approach in Workers:
--   PBKDF2(password, salt, iterations=100000, SHA-256) -> base64
--   Store as: salt:hash (e.g. "abc123:SHA256_HASH_BASE64")
--
-- Placeholder hash below - REPLACE before use:
-- Format: base64(salt):base64(hash) where hash = PBKDF2(password, salt, 100000, SHA-256, 32)

-- Insert first shop (replace 'example.com' with your domain)
INSERT INTO shops (domain, name_lo, name_en, desc_lo, desc_en, theme_primary, theme_secondary)
VALUES ('example.com', 'ຮ້ານຕົວຢ່າງ', 'Example Shop', 'ຄຳອະທິບາຍຕົວຢ່າງ', 'Example description', '#2563eb', '#1e40af');

-- Insert owner user
-- REPLACE 1 with shop id if you have multiple shops
-- REPLACE 'CHANGE_ME_HASH' with actual PBKDF2-SHA256 hash
-- Format: generate with 100k iterations, 32 bytes output, random 16-byte salt
INSERT INTO users (shop_id, email, password_hash, role)
VALUES (1, 'owner@example.com', 'CHANGE_ME_HASH', 'owner');

-- Insert sample WhatsApp number
INSERT INTO wa_numbers (shop_id, label, phone_e164, is_default, is_active)
VALUES (1, 'Main', '+8562012345678', 1, 1);
