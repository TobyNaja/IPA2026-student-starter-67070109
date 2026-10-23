# Part 4 Live Test (การทดสอบกับระบบจริง)

> แปลจาก `specs/live-test-part4.md` ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษ

## การเตรียมตัว (Preparation)

- เปิด Docker services
- ตรวจ `/health` **ผ่าน URL แบบ HTTPS ภายนอก** (URL ของ tunnel)
- ยืนยันว่า Webex webhook **active อยู่ทั้งห้อง IPA2026 และ IPA2026 Exam Room**
- ใช้ router ที่ได้รับอนุญาต และ interface สำหรับทดสอบโดยเฉพาะ
- **ห้ามใช้ `192.0.2.128/27`** เป็น address ของ Loopback ที่ทดลองเอง เพราะช่วงนี้สงวนไว้สำหรับคำขอ Live อย่างเป็นทางการ
- ก่อน Live อย่างเป็นทางการ ผู้ตรวจจะลบ `Loopback<student-id>` บน `10.0.29.101` **ถ้ามีอยู่ ไม่ว่า description จะเป็นอะไร** แล้วลบ interface เดียวกันอีกครั้งหลังทดสอบเสร็จ
- การเริ่ม `grade` ถือว่าอนุญาตให้รีเซ็ตนี้ interface อื่นจะไม่ถูกลบ
- คำขอ YAML แต่ละครั้งต้อง **แนบในข้อความเดียวกับ mention bot จริง**

## ลำดับการทดสอบ (Test sequence)

1. Mention โดยไม่แนบไฟล์: ควรได้ `error/no_yaml`
2. ส่ง YAML ที่ผิดรูปแบบ: ควรได้ `error/invalid_yaml`
3. ส่ง fixture status ที่มีแค่ชื่อ: ควรได้ `found` หรือ `not_found`
4. ถ้าไม่มี interface ส่ง plan: ควรได้ `planned/create`
5. ส่ง apply: ควรได้ `ok/applied`
6. ส่ง status อีกครั้ง: ควรได้ `found` พร้อม `ipv4`, `description` และ `admin_state` ที่ **อ่านจาก router** และตรงกับค่าที่ apply ไป ค่าที่ใส่เกินมาในคำขอ status จะถูกละเลย **แม้จะไม่ตรงกับ router ก็ตาม**
7. ส่ง plan อีกครั้ง: ควรได้ `planned/no_change` และ `changes={}`
8. ส่งคำขอ delete ผ่าน Netmiko: ควรได้ `deleted`
9. ส่ง status อีกครั้ง: ควรได้ `not_found` และ `interface=null`
10. ส่ง delete อีกครั้ง: ควรได้ `not_found`

- **ห้ามลบ interface ที่มีอยู่แล้วของผู้ใช้อื่น**
- fixture ของ delete ตั้งใจให้มีเพียง `desired.interface.name`
- ตรวจ backend อื่นเพิ่มเติมตาม capability matrix ของ Part 3 ตามความจำเป็น

## การกู้คืนการ Deploy (Deployment recovery)

- สำหรับการตั้งค่า Quick Tunnel แบบอ้างอิง ให้ **restart service tunnel**
- ยืนยันว่า log ของมันรายงาน **target URL ใหม่** และ **Webex webhook ที่ active**
- Mention bot โดยไม่แนบไฟล์: ควรได้ `error/no_yaml` อีกครั้ง

## ตรวจด้วยตัวเองและการตรวจอย่างเป็นทางการ (Self-check and official grading)

ลำดับด้านบนเป็นการ **ตรวจด้วยตัวเองก่อน** การตรวจอย่างเป็นทางการ นักศึกษา **ไม่ต้องส่ง** screenshot, `docker compose ps`, log ของ JSON ที่ตอบกลับ หรือหลักฐาน live ที่ทำด้วยมืออื่น ๆ

ใช้ **mention จริง** ของ bot `IPA2026-Reference` ในห้อง IPA2026 Exam Room:
1. `register https://github.com/owner/repository`
2. คำสั่ง `verify` (ฟรี)
3. `grade` เมื่อพร้อม

`score` ฟรี

- **เปิด bot ของนักศึกษาไว้ตลอด** คำขอ Live อย่างเป็นทางการและการตอบกลับจะมองเห็นได้ในห้อง
- ระบบตรวจของผู้สอนส่ง **20 กรณีทีละกรณี** ไปยัง bot ที่ลงทะเบียน อ่านสถานะ router เองแยกอิสระ และ cleanup เฉพาะ Loopback ของนักศึกษาคนนั้น
- **ห้ามใส่ credential** ใน repository หรือในไฟล์แนบของ Webex

การทดสอบด้วยมือของนักศึกษาให้ทำใน **IPA2026** และใช้ router ที่ได้รับมอบหมายในช่วง `10.0.29.102`–`10.0.29.105`
คำขอ Live อย่างเป็นทางการถูกส่งใน **IPA2026 Exam Room** และใช้ `10.0.29.101`
bot ต้องทำงานได้ **ทั้งสองห้อง** และส่งคำตอบแต่ละครั้งไปยังห้องที่คำขอนั้นส่งมา
