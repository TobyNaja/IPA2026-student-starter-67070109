# specs-th: ข้อกำหนด IPA2026 ฉบับภาษาไทย

โฟลเดอร์นี้คือฉบับแปลภาษาไทยของทุกไฟล์ใน `specs/` ใช้ประกอบการอ่านเท่านั้น
**ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษใน `specs/` เสมอ** เพราะผู้สอนตรวจตามต้นฉบับ

ชื่อฟังก์ชัน, path, key ของ YAML/JSON, รหัส error และโค้ดตัวอย่าง คงเป็นภาษาอังกฤษไว้ตามเดิม เพราะต้องใช้ในโค้ดแบบตรงตัว

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | เนื้อหา | ใช้กับ Part |
|---|---|---|
| [desired-state-spec-v1.md](desired-state-spec-v1.md) | รูปแบบ YAML, การตรวจ mention, ลำดับการตรวจ error | Part 1 |
| [response-spec-v1.md](response-spec-v1.md) | รูปแบบ JSON ที่ตอบกลับ และรายชื่อรหัส error | Part 1 (และทุก Part) |
| [plan-spec-v1.md](plan-spec-v1.md) | กฎของ `build_plan()`: create / update / no_change | Part 2 |
| [backend-spec-v1.md](backend-spec-v1.md) | RESTCONF, NETCONF, Ansible, Netmiko/TextFSM | Part 3 |
| [integration-spec-v1.md](integration-spec-v1.md) | dispatcher, Webex client, webhook server, Docker | Part 4 |
| [live-test-part4.md](live-test-part4.md) | ขั้นตอนทดสอบกับ bot และ router จริง | Part 4 |
| [grading-policy-v1.md](grading-policy-v1.md) | วิธีส่งตรวจ, โควตา, การคิดคะแนน CI และ Live | ทั้งหมด |
