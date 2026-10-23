# IPA2026 ข้อกำหนด YAML v1 (YAML Specification)

> แปลจาก `specs/desired-state-spec-v1.md` ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษ
> ชื่อฟังก์ชัน, key ของ YAML/JSON และรหัส error คงเป็นภาษาอังกฤษตามต้นฉบับ

คำขอผ่าน Webex แต่ละครั้งประกอบด้วย:

- **ข้อความ**: ต้อง **เลือก mention ของ bot เป้าหมายจริง ๆ** ในห้อง group ของ Webex ตัวอย่าง mention ที่แสดงคือ `@66070123` **ไม่ต้องใช้** slash command
- ตั้ง **ชื่อ Bot (Bot name)** เป็นรหัสนักศึกษา 8 หลัก
  **Bot username ต้องไม่ซ้ำ** เช่น `ipa2026-66070123`
  ค้นหาหรือเพิ่ม bot ได้ด้วย `ipa2026-66070123@webex.bot`
- ตรวจ mention ด้วย **person ID** ไม่ใช่ด้วยชื่อที่แสดงหรือข้อความธรรมดา

Part 1 ได้รับข้อมูล mention แบบจำลอง และ **ไม่ต้องเรียก Webex API**:

```python
validate_webex_envelope(mentioned_people, attachment_path, bot_person_id)
handle_webex_request(mentioned_people, attachment_path, bot_person_id)
```

- `mentioned_people` คือ list จาก field `mentionedPeople` ของ Webex
- `bot_person_id` คือ person ID ของ bot เป้าหมาย ซึ่งได้จากข้อมูลตัวตนของ bot เอง
- ID เหล่านี้ **ไม่ใช่** รหัสนักศึกษา และ **ไม่ใช่** Bot ID ที่แสดงใน Developer Portal

ลำดับการตรวจ:

1. `bot_person_id` ต้องเป็น string ที่ไม่ว่าง และ `mentioned_people` ต้องเป็น **list** ที่มีค่านี้อยู่ ถ้าไม่ใช่ ให้คืน
   `{"status": "error", "result": "missing_bot_mention"}`
2. ถ้า mention ถูกต้อง แต่ `attachment_path` เป็น `None` ให้คืน
   `{"status": "error", "result": "no_yaml"}`
3. `validate_webex_envelope()` คืน `None` เมื่อผ่านการตรวจทั้งสองข้อ
   จากนั้น `handle_webex_request()` เรียกการตรวจ YAML หลัก (core validation)
   และ **ห้าม** ส่งคำขอไปยัง router

Part 4 จะส่งข้อมูล mention จริงและไฟล์แนบที่ดาวน์โหลดมาแล้ว เข้าฟังก์ชันเดียวกันนี้

- แนบ YAML **หนึ่งไฟล์**

YAML แต่ละไฟล์คือ **คำขอที่สมบูรณ์ในตัวเองและไม่มีสถานะ (stateless)** โปรแกรมต้องไม่พึ่งพาคำขอก่อนหน้า

## ลำดับความสำคัญของการตรวจ YAML (YAML validation precedence)

หลังผ่านการตรวจ mention และไฟล์แนบของ Webex ข้างต้นแล้ว ให้ parse YAML

- ถ้า parse ไม่ผ่าน หรือ root ของ YAML **ไม่ใช่ mapping** (dict) ให้คืน `invalid_yaml`

ถ้าเป็น mapping ให้ตรวจตามลำดับต่อไปนี้ แล้วคืน **error ตัวแรก** ที่เจอ:

1. **`version`**: ต้องเป็น **YAML integer `1`** ถ้าไม่มี version หรือเป็นชนิด/ค่าอื่น ให้คืน `invalid_version`
   โดยเฉพาะ `"1"` (string), `1.0` (float) และ `true` (boolean) **ถือว่าไม่ถูกต้อง**
2. **`router`**: ถ้าไม่มี คืน `missing_router` ถ้าไม่ใช่ address ที่อนุญาต คืน `invalid_router`
3. **`method`**: ถ้าไม่มี คืน `missing_method` ถ้าไม่รู้จัก คืน `invalid_method`
4. **`action`**: ถ้าไม่มี คืน `missing_action` ถ้า method ที่เลือกไม่รองรับ คืน `invalid_action`
5. **`desired`, `desired.interface` และ `desired.interface.name`**: คืน `missing_desired`, `missing_interface` หรือ `missing_interface_name` ตามลำดับ
6. **เฉพาะ `plan` และ `apply`**: ตรวจ `missing_ipv4`, `missing_description`, `missing_admin_state` แล้วจึง `invalid_admin_state`

ตัวอย่าง:
- คำขอที่มี `version: 2` และไม่มี `router` คืน `invalid_version` (เพราะ version ถูกตรวจก่อน)
- คำขอที่ version ถูกต้อง แต่ไม่มีทั้ง router และ method คืน `missing_router`

**ห้าม dispatch** คำขอที่ไม่ผ่านการตรวจ
สำหรับ `status` ให้ **ละเลย** ค่า `ipv4`, `description` หรือ `admin_state` ที่ส่งมา ตามที่ระบุไว้ด้านล่าง

## คำขอ (Request)

ตัวอย่างคำขอ `apply`:

    version: 1

    router: 10.0.29.101
    method: restconf
    action: apply

    desired:
      interface:
        name: Loopback123
        ipv4: 172.23.123.1/32
        description: IPA2026-66070123
        admin_state: up

ตัวอย่างคำขอ `delete`:

    version: 1

    router: 10.0.29.101
    method: netmiko-textfsm
    action: delete

    desired:
      interface:
        name: Loopback123

## Router ที่อนุญาต (Allowed routers)

- 10.0.29.101
- 10.0.29.102
- 10.0.29.103
- 10.0.29.104
- 10.0.29.105

## Method และ Action

| method | status | plan | apply | delete |
|---|---|---|---|---|
| restconf | ได้ | ได้ | ได้ | ไม่ได้ |
| netconf | ได้ | ได้ | ได้ | ไม่ได้ |
| ansible | ไม่ได้ | ไม่ได้ | ได้ | ไม่ได้ |
| netmiko-textfsm | ได้ | ไม่ได้ | ไม่ได้ | ได้ |

## Field ของ Interface

สำหรับ **`status`** ต้องมีเพียงตัวระบุ interface:

    desired:
      interface:
        name: Loopback123

คำขอยังต้องมี `version`, `router`, `method` และ `action`

field `ipv4`, `description` และ `admin_state` **ใส่มาได้** สำหรับ `status` แต่จะถูก **ละเลยทั้งหมด รวมถึงค่าของมันด้วย** status จะอ่านสถานะจริงของ router ตามชื่อ แล้วคืน `found` พร้อมค่าจริงของ interface หรือ `not_found` ถ้าไม่มี interface นั้น status **ไม่** เปรียบเทียบ field เหล่านี้กับ router และ **ไม่** ใช้ตรวจความถูกต้อง

สำหรับ **`plan` และ `apply`** `desired.interface` คือ **นิยาม interface ที่ครบถ้วน** ซึ่งประกอบด้วย:

    name
    ipv4
    description
    admin_state

สำหรับ **`delete`** ต้องมีเพียงตัวระบุ interface:

    desired:
      interface:
        name: Loopback123

`ipv4`, `description` และ `admin_state` **ไม่จำเป็น** สำหรับ `delete`

## admin_state

ค่าที่อนุญาต:

- up
- down

`admin_state` **บังคับเฉพาะ `plan` และ `apply`** สำหรับ `status` จะถูกละเลย และสำหรับ `delete` ไม่จำเป็น

## ความเข้ากันของ Method/Action (Method/action compatibility)

คู่ที่ใช้ได้:

- restconf + status
- restconf + plan
- restconf + apply
- netconf + status
- netconf + plan
- netconf + apply
- ansible + apply
- netmiko-textfsm + status
- netmiko-textfsm + delete

ถ้า `method` ถูกต้อง แต่ `action` ที่เลือกไม่รองรับใน method นั้น ให้คืน:

    {
      "status": "error",
      "result": "invalid_action"
    }

**การตรวจความเข้ากันของ method/action ทำก่อน** การตรวจ field ที่เฉพาะของ action นั้น

## การตรวจสำหรับ status และ delete

สำหรับ `action: status` และ `action: delete` ยังต้องมีโครงสร้างคำขอปกติครบ:

    version
    router
    method
    action
    desired
    desired.interface
    desired.interface.name

ดังนั้น error ต่อไปนี้ **ยังใช้อยู่** ถ้าค่าที่เกี่ยวข้องหายไป:

    missing_desired
    missing_interface
    missing_interface_name

ส่วน error เรื่องสถานะที่ต้องการครบถ้วนต่อไปนี้ ใช้ **เฉพาะ `plan` และ `apply`** ไม่ใช้กับ `status` หรือ `delete`:

    missing_ipv4
    missing_description
    missing_admin_state
    invalid_admin_state
