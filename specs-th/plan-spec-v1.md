# IPA2026 ข้อกำหนดการวางแผน v1 (Plan Specification)

> แปลจาก `specs/plan-spec-v1.md` ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษ
> ชื่อฟังก์ชัน, key ของ JSON และชื่อ operation คงเป็นภาษาอังกฤษตามต้นฉบับ

## จุดประสงค์

Part 2 เปรียบเทียบ **สถานะ interface ที่ต้องการ (desired)** กับ **สถานะ interface ปัจจุบันที่ normalize แล้ว (current)** แล้วสร้าง **แผน (plan) ที่ให้ผลแน่นอน (deterministic)**

Part 2 **ห้ามเชื่อมต่อ router จริง**


## ขอบเขตของ Delete (Delete Scope)

Delete **ไม่ใช่** operation ของการวางแผนใน Part 2

`build_plan()` ยังคงสร้างผลได้เพียง:

- create
- update
- no_change

action `delete` ถูกจัดการแยกใน Part 3 โดย backend `netmiko-textfsm` คำขอ delete **ไม่ถูกส่ง** เข้า `build_plan()` และ **ไม่ต้องเพิ่ม** operation `delete` ในการวางแผน

## สัญญาของฟังก์ชัน (Function Contract)

ต้องเขียน:

    build_plan(desired_interface, current_interface)

`desired_interface` คือ dictionary ของ interface ที่ครบถ้วนและผ่านการตรวจจาก Part 1 แล้ว
คำขอ delete ไม่ถูกส่งเข้า `build_plan()`

`current_interface` เป็นได้อย่างใดอย่างหนึ่ง:

- dictionary ของ interface ที่ normalize แล้ว หรือ
- `None` ถ้า interface นั้นยังไม่มีอยู่ในขณะนั้น

## ตัวระบุ Resource (Resource Identifier)

field `name` ใช้ระบุว่าเป็น interface ตัวไหน

ตัวอย่าง:

    name: Loopback123

`name` **ไม่ใช่ field ที่จัดการ (managed field)** และ **ห้ามปรากฏใน `changes`**

## Field ที่จัดการ (Managed Fields)

planner จัดการ field เหล่านี้ **พอดี ไม่ขาดไม่เกิน**:

- ipv4
- description
- admin_state

ตัวอย่าง desired interface:

    {
      "name": "Loopback123",
      "ipv4": "172.23.123.1/32",
      "description": "IPA2026-66070123",
      "admin_state": "up"
    }

## Operation

planner ต้องคืน **อย่างใดอย่างหนึ่งเท่านั้น** จาก:

- create
- update
- no_change

## create

ใช้ `create` เมื่อ:

    current_interface is None

ให้คืน **managed field ทุกตัว** ใน `changes` โดยใช้ **เฉพาะค่า `to`** ที่ต้องการ

ตัวอย่าง:

    {
      "status": "ok",
      "result": "planned",
      "operation": "create",
      "changes": {
        "ipv4": {
          "to": "172.23.123.1/32"
        },
        "description": {
          "to": "IPA2026-66070123"
        },
        "admin_state": {
          "to": "up"
        }
      }
    }

## update

ใช้ `update` เมื่อ interface มีอยู่แล้ว และมี managed field **อย่างน้อยหนึ่งตัว** ที่ต่างจากสถานะที่ต้องการ

ให้คืน **เฉพาะ field ที่มีค่าต่างกัน**

ตัวอย่าง current interface:

    {
      "name": "Loopback123",
      "ipv4": "172.23.123.1/32",
      "description": "OLD-DESCRIPTION",
      "admin_state": "up"
    }

ผลที่คาดหวัง:

    {
      "status": "ok",
      "result": "planned",
      "operation": "update",
      "changes": {
        "description": {
          "from": "OLD-DESCRIPTION",
          "to": "IPA2026-66070123"
        }
      }
    }

## no_change

ใช้ `no_change` เมื่อ managed field **ทุกตัว** ตรงกับสถานะที่ต้องการแล้ว

ผลที่คาดหวัง:

    {
      "status": "ok",
      "result": "planned",
      "operation": "no_change",
      "changes": {}
    }

## สมมติฐานเรื่องสถานะปัจจุบัน (Current-State Assumption)

Part 2 ได้รับสถานะปัจจุบันที่ **normalize แล้ว**

Part 2 **ไม่รับผิดชอบ**:

- การ parse ของ RESTCONF
- การ parse ของ NETCONF
- การ parse output ของ Ansible
- การ parse ของ Netmiko/TextFSM
- การลบ interface
- การยืนยันตัวตนกับ router
- การเชื่อมต่อ router

หน้าที่เหล่านี้เป็นของ Part ถัดไป

## ความแน่นอนของผลลัพธ์ (Determinism)

ถ้า desired state และ current state เหมือนเดิม planner ต้องให้ผลลัพธ์ **เหมือนเดิมทุกครั้ง**

## Idempotency (ทำซ้ำได้ผลเหมือนเดิม)

ถ้าสถานะปัจจุบันตรงกับสถานะที่ต้องการแล้ว planner ต้องคืน:

    operation: no_change
    changes: {}

พฤติกรรมนี้จำเป็นสำหรับ automation แบบ idempotent

## เทสที่นักศึกษาสร้างเอง (Student-created Tests)

นักศึกษา **ต้องเพิ่ม test case ของ Part 2 ที่มีความหมายอย่างน้อย 3 กรณี**

เพิ่มไฟล์ YAML ใหม่ไว้ที่:

    sample-tests/part2/fixtures/
    sample-tests/part2/cases/

**ห้ามแก้ `tests/test_part2.py`** เพียงเพื่อเพิ่ม test case

case ที่นักศึกษาสร้างควรใช้ **ค่าที่ต่างจากตัวอย่างที่เผยแพร่** และอาจเป็น เช่น:

- update เฉพาะ `ipv4`
- update เฉพาะ `admin_state`
- update หลาย managed field พร้อมกัน

## จุดตรวจสอบ (Checkpoint)

Part 2 ถือว่าเสร็จเมื่อ:

- sample test ของ Part 2 ที่เผยแพร่ **ผ่านทั้งหมด**
- `build_plan()` ทำงานได้กับค่าที่ต่างจากตัวอย่าง
- `create` มีเฉพาะค่า `to` ใน `changes`
- `update` มีเฉพาะ field ที่เปลี่ยน พร้อม `from` และ `to`
- `no_change` คืน dictionary `changes` ที่ว่าง
- Part 2 ไม่เชื่อมต่อ router
- Part 2 ไม่ parse output ดิบของ backend
- Part 2 ไม่ลบ interface

CI ของผู้สอนอาจใช้ชื่อ interface, IP address, description และ admin state **ที่ต่างจากตัวอย่างที่เผยแพร่** แต่ยังอยู่ในขอบเขตของข้อกำหนดนี้
