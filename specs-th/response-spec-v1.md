# IPA2026 ข้อกำหนด Response v1 (Response Specification)

> แปลจาก `specs/response-spec-v1.md` ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษ
> key ของ JSON และรหัส result/error คงเป็นภาษาอังกฤษตามต้นฉบับ

response ทุกตัวต้องเป็น **JSON ที่ถูกต้อง**

response ทุกตัวต้องมี:

    status
    result

`status` ต้องเป็นอย่างใดอย่างหนึ่ง:

    ok
    error

## Response เมื่อสำเร็จ (Success responses)

operation ที่สำเร็จใช้รูปแบบ:

    {
      "status": "ok",
      "result": "<success_result>"
    }

ค่า result ที่สำเร็จที่พบบ่อย:

- accepted
- found
- not_found
- planned
- applied
- deleted

จะมี field เพิ่มเติมเมื่อ operation นั้นต้องการ

### Part 1: คำขอผ่านการตรวจ (accepted request)

    {
      "status": "ok",
      "result": "accepted"
    }

### เจอ Interface

    {
      "status": "ok",
      "result": "found",
      "interface": {
        "name": "Loopback123",
        "ipv4": "172.23.123.1/32",
        "description": "IPA2026-66070123",
        "admin_state": "up"
      }
    }

### ไม่เจอ Interface

    {
      "status": "ok",
      "result": "not_found",
      "interface": null
    }

`not_found` **ไม่ใช่ error** อาจได้จาก operation `status` หรือจากการลบ interface ที่ไม่มีอยู่แล้ว

### Apply สำเร็จ

    {
      "status": "ok",
      "result": "applied"
    }

### Delete สำเร็จ

    {
      "status": "ok",
      "result": "deleted"
    }

## Response เมื่อเกิด Error

error ทุกตัวต้องใช้รูปแบบ:

    {
      "status": "error",
      "result": "<error_code>"
    }

## รหัส Error ของ Part 1

| รหัส | ความหมาย |
|---|---|
| missing_bot_mention | ไม่ได้ mention bot ตัวนี้ |
| no_yaml | mention แล้วแต่ไม่แนบไฟล์ |
| invalid_yaml | YAML อ่านไม่ได้ หรือ root ไม่ใช่ mapping |
| invalid_version | ไม่มี version หรือไม่ใช่ integer `1` |
| missing_router | ไม่มี `router` |
| invalid_router | `router` ไม่อยู่ในรายชื่อที่อนุญาต |
| missing_method | ไม่มี `method` |
| invalid_method | `method` ไม่รู้จัก |
| missing_action | ไม่มี `action` |
| invalid_action | `action` ไม่รองรับใน method ที่เลือก |
| missing_desired | ไม่มี `desired` |
| missing_interface | ไม่มี `desired.interface` |
| missing_interface_name | ไม่มี `desired.interface.name` |
| missing_ipv4 | ไม่มี `ipv4` (เฉพาะ plan/apply) |
| missing_description | ไม่มี `description` (เฉพาะ plan/apply) |
| missing_admin_state | ไม่มี `admin_state` (เฉพาะ plan/apply) |
| invalid_admin_state | `admin_state` ไม่ใช่ `up` หรือ `down` (เฉพาะ plan/apply) |

> คอลัมน์ "ความหมาย" เป็นคำอธิบายที่เพิ่มเพื่อให้อ่านง่าย สรุปจากต้นฉบับและ `desired-state-spec-v1.md` ต้นฉบับมีเพียงรายชื่อรหัส

สำหรับ `action: status` และ `action: delete` รหัส `missing_ipv4`, `missing_description`, `missing_admin_state` และ `invalid_admin_state` **ไม่ใช้** ทั้งสอง action ต้องการเพียง **ชื่อ interface** ภายใน `desired.interface`
สำหรับ status ค่าของ field เหล่านั้นที่ส่งมาจะถูก **ละเลย** และ `found` จะมีค่าที่ **อ่านจาก router**

## ผลลัพธ์ Error ของ Backend (Backend error results)

ความล้มเหลวของ backend ใช้:

- authentication_failed
- connection_failed
- backend_failed

ตัวอย่าง:

    {
      "status": "error",
      "result": "connection_failed"
    }

## กฎ (Rules)

- output ต้องเป็น **JSON ที่ถูกต้อง**
- ต้องมี `status` เสมอ
- ต้องมี `result` เสมอ
- `status` ต้องเป็น `ok` หรือ `error` เท่านั้น
- ถ้า `status` เป็น `error` ค่า `result` คือรหัส error
- **ไม่ต้องยึด** ช่องว่าง (whitespace) หรือลำดับ key ของ JSON ให้ตรงเป๊ะ
- **ใส่ field เพิ่มได้** เว้นแต่จะระบุไว้เป็นอย่างอื่น
