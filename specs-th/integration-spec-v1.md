# IPA2026 Part 4: การเชื่อมระบบ, Webex และ Docker

> แปลจาก `specs/integration-spec-v1.md` ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษ
> ชื่อฟังก์ชัน, class, path และ key ของ JSON คงเป็นภาษาอังกฤษตามต้นฉบับ

## เป้าหมาย

เชื่อม Part 1–3 เข้ากับ **Webex bot ของนักศึกษาเอง** และ deploy ด้วย Docker
ใช้ YAML schema, สัญญา response และตารางความสามารถ (capability matrix) ที่มีอยู่แล้ว

## Input จาก Webex

- เพิ่ม bot ของนักศึกษาเข้าทั้งห้อง **IPA2026** (ทดสอบด้วยมือ) และ **IPA2026 Exam Room** (ตรวจอย่างเป็นทางการ)
- ตั้ง **ชื่อแสดงของ bot** เป็นรหัสนักศึกษา 8 หลัก
- เลือก **bot username ที่ไม่ซ้ำ** และใช้อีเมลของ bot เพื่อเพิ่มเข้าห้อง
- **เลือก @mention ของ bot จริง ๆ** และแนบไฟล์ YAML **หนึ่งไฟล์ในข้อความเดียวกัน**
- ตรวจข้อมูล mention โดยใช้ `mentionedPeople` และ `personId` ของ bot
- **ห้าม** บังคับใช้ slash command หรือระบุ mention จากข้อความธรรมดา
- หา `personId` ของ bot ด้วย **`GET /v1/people/me`** โดยใช้ Bot Access Token ของ bot

## Python API ที่ต้องมี (Required Python APIs)

- `app.dispatcher.dispatch_request(data)`
- `app.integration.process_request(mentioned_people, attachment_path, bot_person_id)`
- `app.webex_client.WebexClient(token=None, session=None)`
  - property `headers`
  - `get_message(message_id)`
  - `download_file(file_url)`
  - `send_message(room_id, text)`
- `app.webhook_server.WebexEventHandler(client, bot_person_id, processor=None)`
  - `handle_event(event)`
- `app.webhook_server.make_http_handler(submit_event)`
- `app.webhook_server.main()`

## การเชื่อมและการส่งต่อคำขอ (Integration and dispatch)

`process_request` ต้อง:
1. ตรวจ envelope ของ mention/ไฟล์แนบ
2. โหลด YAML **ครั้งเดียว**
3. ตรวจคำขอที่ parse แล้ว
4. dispatch **เฉพาะคำขอที่ผ่านการตรวจ**

ให้ **ใช้ซ้ำ** โค้ดตรวจของ Part 1 และ backend ของ Part 3 ที่นักศึกษาเขียนไว้
คืน response ของ backend **โดยไม่เปลี่ยนสัญญาของมัน**

`dispatch_request` รับคำขอที่ **ผ่านการตรวจแล้ว**
- สำหรับ `status`/`delete` ส่ง **router และชื่อ interface** ให้ backend
- สำหรับ `plan`/`apply` ส่ง **router และ dictionary ของ desired interface**

ต้องรองรับ **ทั้ง 9 คู่ method/action** ที่ใช้ได้ตาม capability matrix

## Webex client

- ใช้ `https://webexapis.com/v1` และการยืนยันตัวตนแบบ **Bearer**
- ถ้าไม่ได้ส่ง token มา ให้อ่าน `WEBEX_BOT_TOKEN` จาก environment
- ถ้าไม่มี token ให้ raise **`PermissionError`**
- `get_message` คืน JSON ที่ decode แล้ว
- `download_file` คืน **bytes**
- `send_message` POST `roomId` และ `text` แล้วคืน JSON ที่ decode แล้ว
- ต้องตรวจ HTTP error และใช้ **request timeout 10 วินาที**

## การจัดการ Event (Event handling)

- จัดการ **เฉพาะ** event `messages/created` ที่มี message ID
- **ละเลย** event ที่ไม่เกี่ยวข้องหรือผิดรูปแบบ
- **ละเลยข้อความจาก bot เอง** โดยตรวจก่อนดึงข้อความถ้าทำได้ และตรวจผู้เขียนของข้อความที่ดึงมาแล้วอีกครั้ง เพื่อป้องกัน bot ตอบตัวเองวนไม่รู้จบ

ดึงข้อความด้วย ID แล้วใช้ `roomId` ของข้อความนั้นเป็นห้องที่จะตอบกลับ

- **ไม่มีไฟล์แนบ**: เรียก processor ด้วย `attachment_path=None`
- **มีไฟล์แนบหนึ่งไฟล์**: ดาวน์โหลด เขียนเป็นไฟล์ YAML ชั่วคราว ประมวลผล แล้ว **ลบไฟล์ชั่วคราวทิ้งเสมอ แม้การประมวลผลจะล้มเหลว**
- **มีไฟล์แนบหลายไฟล์**: คืน `status=error`, `result=multiple_attachments` **โดยไม่ดาวน์โหลดไฟล์และไม่เรียก processor**

ส่ง dictionary ของ response เป็น **ข้อความ JSON** ไปยังห้องเดิม
คืน dictionary นั้นจาก `handle_event`
คืน `None` สำหรับ event ที่ถูกละเลย **โดยไม่ส่งข้อความตอบกลับ**

## HTTP endpoint

**GET /health:**
- HTTP 200
- `{"status":"ok","result":"healthy"}`

**POST /webhook:**
- รับ JSON object แล้วส่งไปประมวลผลเบื้องหลัง (background)
- HTTP 200 พร้อม `{"status":"ok","result":"accepted"}` หมายถึง **รับ event แล้ว**
- ส่งผลการตรวจ/ผลจาก backend ขั้นสุดท้าย **แยกต่างหาก** ไปยังห้อง Webex
- JSON ไม่ถูกต้อง, body ไม่ใช่ object หรือความยาว body ไม่ถูกต้อง:
  HTTP 400 พร้อม `{"status":"error","result":"invalid_event"}`
- รับความยาว body ตั้งแต่ **1 ถึง 1,000,000 bytes**

path ที่ไม่รู้จักคืน **HTTP 404**
การตอบรับ HTTP **ต้องไม่รอ** การทำงานกับ router
ประมวลผลคำขอที่ใช้ router **ทีละรายการ (sequential)** เพื่อไม่ให้การเปลี่ยนแปลงทับซ้อนกัน

## การ Deploy (Deployment)

- ส่ง `Dockerfile` และ `compose.yaml` ที่เปิด service webhook
- bind server ที่ **`0.0.0.0`** ภายใน container
- ใช้ `WEBHOOK_HOST` และ `WEBHOOK_PORT` โดย port ค่าเริ่มต้นคือ **8000**
- มี health check และ restart policy
- ใส่ไฟล์ Ansible ที่ใช้ตอน runtime ไว้ใน image ด้วย

`Dockerfile` ที่ให้มาเริ่ม webhook ด้วย `CMD ["python", "-m", "app.webhook_server"]`
- ให้คงชื่อ service ใน Compose เป็น **`webhook`**
- **ห้าม override** command หรือ entrypoint ของมัน

หลัง build แล้ว Student CI จะรัน `scripts/check_webhook_image.py` กับ image ที่ build ได้ สคริปต์นี้ import แอปและ backend แล้วตรวจ `/health` และ `/webhook` ด้วย event ปลอมในเครื่อง smoke แบบ offline นี้ **ไม่ใช้ credential ของ Webex และไม่ติดต่อ router** ผู้สอนรันสำเนาของสัญญาเดียวกันนี้เอง และถ้า smoke ไม่ผ่าน **จะไม่ได้ตรวจ Live**

ส่ง credential ผ่าน **environment** ห้ามใส่ใน image หรือ source code:
`WEBEX_BOT_TOKEN`, `ROUTER_USER`, `ROUTER_PASS`

### การเปิด webhook สู่ภายนอกและการลงทะเบียน

- เปิด webhook ผ่าน **URL แบบ HTTPS ที่เข้าถึงได้จากภายนอก** เช่น Cloudflare Tunnel
- ลงทะเบียน Webex webhook แบบ **`messages/created`** โดยใช้ **Bot Access Token ของนักศึกษา**
- ใช้ roomId filter ของ **ทั้ง IPA2026** (ทดสอบด้วยมือ) **และ IPA2026 Exam Room** (verify/grade อย่างเป็นทางการ) โดยแต่ละอันมี `targetUrl` ลงท้ายด้วย **`/webhook`**
- ลงทะเบียน webhook แยกห้องละอัน **หรือ** ใช้ subscription เดียวที่ส่ง mention จากทั้งสองห้องก็ได้
- **อัปเดตการลงทะเบียนเดิมเมื่อ URL ภายนอกเปลี่ยน**
- ตอบกลับไปที่ `roomId` ของคำขอที่เข้ามาแต่ละครั้ง **ห้าม hard-code ห้องตอบกลับห้องเดียว**

**ไม่จำเป็น** ต้องมีบัญชี Cloudflare หรือซื้อโดเมนสำหรับ live test

implementation อ้างอิงของผู้สอนรัน webhook และ tunnel เป็น **2 service ใน Compose** โดย tunnel จะอัปเดตการลงทะเบียน Webex ให้อัตโนมัติตอนเริ่มทำงาน
นักศึกษาอาจใช้การ deploy แบบอื่นได้ ถ้าพฤติกรรมการประมวลผลคำขอเหมือนกัน และมีวิธีที่บันทึกไว้ชัดเจนสำหรับอัปเดตการลงทะเบียน

## การตรวจสอบ (Validation)

- starter มี **public tests 88 กรณี**: 64 กรณีสำหรับ Part 1–3 และ 24 กรณีสำหรับ Part 4
- mock test **ไม่ต้องใช้** credential ของ bot หรือ router จริง
- Live testing ใช้ bot ของนักศึกษาเองในห้อง IPA2026 Exam Room และสิทธิ์เข้าถึง router `10.0.29.101`
- การทดสอบด้วยมือใช้ห้อง IPA2026 และ router ที่ได้รับมอบหมายในช่วง `10.0.29.102`–`10.0.29.105`

ดูขั้นตอนแบบครบวงจรได้ที่ `live-test-part4.md`
