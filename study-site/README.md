# IPA2026 Bot Explorer (study site)

เว็บไซต์สำหรับศึกษาโปรเจกต์ `IPA2026-student-starter-67070109` แยกจากโค้ด bot ทั้งหมด (ไม่ได้แก้ไฟล์ใน `app/`, `tests/` หรือ config ของ bot)

## เปิดใช้งาน

เปิดไฟล์ `study-site/index.html` ในเบราว์เซอร์ได้เลย ไม่ต้อง build และไม่ต้องมี server

- แผนภาพ (Mermaid) และฟอนต์โหลดจาก CDN จึงต้องต่ออินเทอร์เน็ต ถ้าออฟไลน์ เนื้อหาอื่นยังใช้ได้ครบ และหน้า Workflow จะแสดงข้อความแจ้งแทนแผนภาพ
- ความคืบหน้าและประวัติข้อสอบเก็บใน `localStorage` ของเบราว์เซอร์นั้น

## หน้าในเว็บ

| หน้า | เนื้อหา |
|---|---|
| Project Overview | ภาพรวม, สิ่งที่เปลี่ยนใน commit ล่าสุด, สถานะแต่ละ Part, ลำดับการเริ่มระบบ, sequence diagram, capability matrix, โครงสร้างไฟล์ |
| Function Explorer | 32 ฟังก์ชันหลักตาม README/specs (รวม registrar ใน `scripts/update_webex_webhooks.py`): ข้อมูลพื้นฐาน, ขั้นตอน, Input/Process/Output, ความสัมพันธ์, โค้ดจริง |
| Workflow Visualization | Function call flow (กดกล่องได้), ลำดับ validation, plan flow, delete flow, error mapping, Startup & Deploy (3 service), Data Flow ทีละขั้น 12 สถานการณ์ |
| File Explorer | สรุปแต่ละไฟล์ จัดกลุ่มตามหน้าที่ พร้อมความสัมพันธ์ข้ามไฟล์ |
| YAML Configuration | Request YAML, compose.yaml (webhook / tunnel / registrar), `.env.example`, Ansible playbook/inventory, Student CI, sample-tests และ environment variables |
| สรุปก่อนสอบ | สิ่งที่เปลี่ยนแต่ละ commit, ตอบคำถามหลัก 10 ข้อ (รวม deploy), ตารางรหัสผลลัพธ์, ตารางแก้ปัญหา |
| Quiz | 63 ข้อ 4 ด้าน, Practice / Exam / Random mode, เฉลยพร้อมเหตุผล, คะแนนและประวัติ |

## โครงสร้าง

```
study-site/
├── index.html                 หน้าเว็บ (shell)
├── css/style.css              สไตล์ (light/dark, responsive)
├── js/app.js                  UI เท่านั้น: router, render, quiz engine
├── data/project-data.js       เนื้อหา documentation (function, file, YAML, workflow)
├── data/quiz-data.js          คลังข้อสอบ
├── data/source-snippets.js    โค้ดจริงที่ดึงจาก repo (สร้างอัตโนมัติ)
└── tools/build_snippets.py    สคริปต์สร้าง source-snippets.js
```

เนื้อหาแยกจาก UI: แก้คำอธิบายหรือข้อสอบที่ `data/` ส่วน `js/app.js` แค่แสดงผล

## อัปเดตโค้ดที่แสดงหลังแก้ `app/`

```bash
python study-site/tools/build_snippets.py
```

สคริปต์อ่านไฟล์อย่างเดียวแล้วเขียน `data/source-snippets.js` ใหม่ ส่วนคำอธิบายใน `data/project-data.js` และข้อสอบใน `data/quiz-data.js` ต้องแก้เองให้ตรงกับโค้ดที่เปลี่ยน

## ที่มาของเนื้อหา

วิเคราะห์จาก `README.md`, `specs/`, `DEPLOYMENT.md` และโค้ดใน `app/` กับ `scripts/` ที่ commit `12d7543` (2026-11-08) pytest ในเครื่องผ่านครบ 91 ข้อ

ครั้งแรกวิเคราะห์ที่ `1e0b242` ซึ่ง `app/webhook_server.py` ยังเป็น stub หลังจากนั้นมี 4 commit (`3d9ccc5`, `e5ffdd1`, `2310a18`, `12d7543`) ที่เขียน webhook server เพิ่ม tunnel กับ registrar และแก้ NETCONF apply ดูรายละเอียดได้ที่หน้าสรุปก่อนสอบ
