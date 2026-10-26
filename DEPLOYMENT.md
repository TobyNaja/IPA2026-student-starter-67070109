# Deployment: webhook + tunnel + การลงทะเบียน Webex

เอกสารนี้อธิบายวิธีเปิด bot ให้รับ mention จริง และวิธีอัปเดตการลงทะเบียน
webhook เมื่อ URL ของ tunnel เปลี่ยน ตามข้อกำหนดใน
`specs/integration-spec-v1.md`

## service ใน compose.yaml

| service | หน้าที่ |
|---|---|
| `webhook` | แอป Python รับ `POST /webhook` และตอบ `GET /health` ที่พอร์ต 8000 |
| `tunnel` | `cloudflared` Quick Tunnel แปลง HTTPS สาธารณะมาที่ `webhook:8000` |
| `registrar` | เฝ้า URL ของ tunnel แล้วลงทะเบียน/แก้ webhook ใน Webex ให้ตรงอยู่เสมอ |

ไม่ต้องติดตั้ง `cloudflared` บน Windows เพราะรันเป็น container

## 1. เตรียม .env

คัดลอกจากแม่แบบแล้วเติมค่า ไฟล์นี้อยู่ใน `.gitignore` **ห้าม commit**

```powershell
Copy-Item .env.example .env
```

```
WEBEX_BOT_TOKEN=<Bot Access Token จาก developer.webex.com>
ROUTER_USER=<username ของ router>
ROUTER_PASS=<password ของ router>
```

ก่อนไปขั้นถัดไป ต้องเพิ่ม bot เข้าห้อง **IPA2026** และ **IPA2026 Exam Room**
ด้วย bot email ให้ครบทั้งสองห้อง ไม่งั้น `registrar` จะหา `roomId` ไม่เจอ

## 2. เปิดทั้งสาม service

```powershell
docker compose up -d --build
docker compose ps
```

`webhook` ต้องขึ้น `(healthy)` ภายในราว 30 วินาที (`start_period: 30s`)

ตรวจทีละชั้น

```powershell
curl http://127.0.0.1:8000/health
docker compose logs webhook
docker compose logs tunnel
docker compose logs registrar
```

สิ่งที่ควรเห็น

- `webhook`: `bot personId resolved as ...` และ `webhook listening on 0.0.0.0:8000`
- `tunnel`: บรรทัดที่มี `https://<สี่คำ>.trycloudflare.com`
- `registrar`: `created ipa2026-mentions IPA2026 -> https://.../webhook` สองบรรทัด

## 3. การอัปเดต URL เมื่อ tunnel รีสตาร์ท

Quick Tunnel **เปลี่ยน hostname ทุกครั้งที่รีสตาร์ท** ของเดิมจะตาย และ bot
จะเงียบโดยไม่มี error ให้เห็น

`registrar` จัดการให้อัตโนมัติ: อ่าน URL ปัจจุบันจาก metrics endpoint ของ
cloudflared (`http://tunnel:2000/quicktunnel`) ทุก 15 วินาที ถ้าเปลี่ยนจึง
เรียก Webex API แก้ `targetUrl` ของทั้งสองรายการ ไม่เปลี่ยนก็ไม่ยิงอะไร

สั่งเองได้ด้วยถ้าต้องการ

```powershell
# อ่าน URL ให้อัตโนมัติ (ต้องเปิด tunnel อยู่)
.\.venv\Scripts\python.exe scripts\update_webex_webhooks.py

# หรือระบุ URL ตรง ๆ
.\.venv\Scripts\python.exe scripts\update_webex_webhooks.py --url https://xxx.trycloudflare.com
```

สคริปต์เลือกแหล่ง URL ตามลำดับ: `--url` → `TUNNEL_URL` →
metrics endpoint → `docker compose logs tunnel`

### พฤติกรรมของสคริปต์

| สถานะใน Webex | สคริปต์ทำ |
|---|---|
| ยังไม่มี webhook ของห้องนั้น | `POST /v1/webhooks` สร้างใหม่ |
| มีอยู่และ `targetUrl` ตรงแล้ว | ไม่ทำอะไร |
| มีอยู่แต่ `targetUrl` เก่า หรือ status ไม่ active | `PUT` แก้ (ส่ง `name` กับ `targetUrl` คู่กันตามที่ Webex บังคับ) |
| มีอยู่แต่ `filter` ชี้ผิดห้อง | `DELETE` แล้ว `POST` ใหม่ เพราะ Webex แก้ `filter` ในที่เดิมไม่ได้ |

ตั้งชื่อ webhook เป็น `ipa2026-mentions <ชื่อห้อง>` และใช้ชื่อนี้เป็นตัวจับคู่
จึงไม่สร้างซ้ำซ้อนเมื่อรันหลายครั้ง

## 4. ตรวจว่า Webex เห็นอะไรอยู่

```powershell
curl -H "Authorization: Bearer $env:WEBEX_BOT_TOKEN" https://webexapis.com/v1/webhooks
```

ต้องมีสองรายการ `resource: messages`, `event: created`,
`filter: roomId=...` คนละห้อง และ `targetUrl` ลงท้าย `/webhook` ตรงกับ
URL ของ tunnel ที่กำลังรันอยู่

## 5. ปิด

```powershell
docker compose down
```

## แก้ปัญหา

**bot เงียบ ไม่ตอบ mention** — ดู `docker compose logs registrar` ว่า URL
ล่าสุดตรงกับ `docker compose logs tunnel` หรือไม่ ถ้าไม่ตรงให้รันสคริปต์เอง

**`registrar` ขึ้น `waiting for the tunnel URL` ซ้ำ ๆ** — `tunnel` ยังไม่ได้
hostname ให้ดู log ของ `tunnel` ว่าต่อ Cloudflare ได้หรือไม่

**`the bot is not a member of: ...`** — ยังไม่ได้เพิ่ม bot เข้าห้องนั้น
สคริปต์จะพิมพ์รายชื่อห้องที่ bot เห็นอยู่มาให้เทียบ

**`WEBEX_BOT_TOKEN is not set`** — ยังไม่มี `.env` หรือรันจากโฟลเดอร์อื่น

**แก้โค้ดใน `app/` แล้วไม่มีผล** — image ใช้ `COPY` ไม่ใช่ volume ต้อง
`docker compose up -d --build` ใหม่ (ส่วน `scripts/` mount เป็น volume
แก้แล้วรีสตาร์ท `registrar` พอ)
