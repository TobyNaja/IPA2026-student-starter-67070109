# IPA2026 ข้อกำหนด Backend v1 (Backend Specification)

> แปลจาก `specs/backend-spec-v1.md` ถ้าความหมายไม่ตรงกัน ให้ยึดต้นฉบับภาษาอังกฤษ
> ชื่อฟังก์ชัน, key ของ JSON, รหัส error และโค้ดตัวอย่าง คงเป็นภาษาอังกฤษตามต้นฉบับ เพราะต้องใช้ตรงตัว

## จุดประสงค์

Part 3 คือการเขียน **backend adapter** (ตัวเชื่อมกับ router) สำหรับ **อ่าน**, **apply (ตั้งค่า)** และ **ลบ** สถานะของ interface โดยใช้เทคโนโลยี network automation ที่กำหนด

Part 3 **ไม่ต้อง** ทำส่วนเชื่อมต่อ Webex

## ตารางความสามารถ (Capability Matrix)

| Method | status | plan | apply | delete |
|---|---|---|---|---|
| restconf | ได้ | ได้ | ได้ | ไม่ได้ |
| netconf | ได้ | ได้ | ได้ | ไม่ได้ |
| ansible | ไม่ได้ | ไม่ได้ | ได้ | ไม่ได้ |
| netmiko-textfsm | ได้ | ไม่ได้ | ไม่ได้ | ได้ |

## รูปแบบสถานะ Interface มาตรฐาน (Normalized Interface State)

backend ที่รองรับ `status` ต้อง **แปลง (normalize)** ข้อมูลเฉพาะของแต่ละ backend ให้อยู่ในโครงสร้าง interface กลางแบบเดียวกัน:

    {
      "name": "Loopback123",
      "ipv4": "172.23.123.1/32",
      "description": "IPA2026-66070123",
      "admin_state": "up"
    }

interface ที่ normalize แล้วจะอยู่ภายใน response กลางของ backend:

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

ถ้า interface ที่ขอ **ไม่มีอยู่** backend ต้องคืน:

    {
      "status": "ok",
      "result": "not_found",
      "interface": null
    }

Part 2 **ไม่ได้รับ** response ทั้งก้อนของ backend

โปรแกรมจะดึงเฉพาะ:

    response["interface"]

เมื่อผลเป็น `found` หรือใช้:

    None

เมื่อผลเป็น `not_found` ก่อนจะเรียก `build_plan()`

## สัญญาของฟังก์ชัน Backend (Backend Function Contract)

แต่ละ backend เปิดให้เรียกเฉพาะ operation ที่เหมาะกับเทคโนโลยีนั้นเท่านั้น

argument บังคับ 2 ตัวด้านล่าง (`router` และชื่อ interface / desired interface) ถูกใช้โดย dispatcher และคำขอ Live ส่วนฟังก์ชัน stub ใน starter ยังมี **parameter เสริม (optional) ที่รับ callable ที่ฉีดเข้ามา (injected)** สำหรับแต่ละ operation ด้วย parameter เสริมเหล่านี้ **เป็นส่วนหนึ่งของสัญญากับ public test**: public test จะส่งฟังก์ชันปลอม (fake transport/runner) เข้ามา เพื่อไม่ต้องติดต่อ router จริง

| Operation ของ backend | Parameter เสริม | callable ที่ถูกเรียกจะได้รับ / คืนค่า |
|---|---|---|
| RESTCONF status/plan | `http_get` | `http_get(url)`; คืน response ที่มี `status_code` และ `json()` |
| RESTCONF apply | `http_put` | `http_put(url, json=payload)`; คืน response ที่มี `status_code` |
| NETCONF status/plan | `netconf_get_config` | `netconf_get_config(router, filter_xml)`; คืนข้อความ XML |
| NETCONF apply | `netconf_edit_config` | `netconf_edit_config(router, config_xml)` |
| Ansible apply | `run_playbook` | `run_playbook(variables)` |
| Netmiko/TextFSM status | `netmiko_get` | `netmiko_get(router, interface_name)`; คืน `(ip_info, descriptions)` |
| Netmiko/TextFSM delete | `netmiko_delete` | `netmiko_delete(router, interface_name)`; คืน `"deleted"` หรือ `"not_found"` |

ถ้าไม่ได้ส่ง callable เสริมเข้ามา ให้ใช้ **transport/runner ของจริง** และต้องคืนผลลัพธ์กับ error ตามสัญญาเดียวกันทั้งสองทาง

ฟังก์ชันปลอมที่ public test ฉีดเข้ามาจะ raise exception ของ Python ดังนี้ และต้องแปลงเป็นรหัส error ตามนี้:

| Exception ที่ fake raise | ต้องแปลงเป็น |
|---|---|
| `PermissionError` | `authentication_failed` |
| `ConnectionError` | `connection_failed` |
| `RuntimeError` | `backend_failed` |

library จริงมี exception class ของตัวเอง ดังนั้น **การดักจับแค่ `ConnectionError` ของ Python ไม่พอ** ต้อง normalize ความล้มเหลวจาก transport จริงก่อนคืน response ของ backend ตัวอย่างเช่น:

- **Requests**: `requests.exceptions.Timeout` และ `requests.exceptions.ConnectionError` หมายถึง `connection_failed` (ตัวหลัง **ไม่ใช่** subclass ของ `ConnectionError` ที่ built-in ใน Python) ส่วน HTTP 401/403 หมายถึง `authentication_failed`
- **ncclient**: ความล้มเหลวในการยืนยันตัวตนแปลงเป็น `authentication_failed`, ความล้มเหลวของการเชื่อมต่อ SSH/session แปลงเป็น `connection_failed` และ RPC error แปลงเป็น `backend_failed`
- **Netmiko**: exception เรื่องยืนยันตัวตนและ timeout แปลงเป็นสองรหัสแรก (`authentication_failed`, `connection_failed`) ส่วนการ parse ด้วย TextFSM ล้มเหลวแปลงเป็น `backend_failed`
- **Ansible**: credential ถูกปฏิเสธ, host เข้าไม่ถึง และ playbook ล้มเหลวแบบอื่น แปลงเป็น 3 หมวดเดียวกันนี้

exception ที่เทียบเท่ากันจาก implementation อื่น ก็ให้ทำตามความหมายของ error ที่อธิบายไว้ด้านล่าง

### RESTCONF

ไฟล์:

    app/backends/restconf.py

ฟังก์ชัน:

    get_interface_state(router, interface_name)
    plan_interface(router, desired_interface)
    apply_interface(router, desired_interface)

### NETCONF

ไฟล์:

    app/backends/netconf.py

ฟังก์ชัน:

    get_interface_state(router, interface_name)
    plan_interface(router, desired_interface)
    apply_interface(router, desired_interface)

### Ansible

ไฟล์:

    app/backends/ansible.py

ฟังก์ชัน:

    apply_interface(router, desired_interface)

### Netmiko + TextFSM

ไฟล์:

    app/backends/netmiko_textfsm.py

ฟังก์ชัน:

    get_interface_state(router, interface_name)
    delete_interface(router, interface_name)

`delete_interface()` ใช้ Netmiko ส่งคำสั่ง configuration ของ IOS และ **อาจ** ใช้เส้นทาง status ที่ใช้ TextFSM ซึ่งมีอยู่แล้ว เพื่อตรวจสอบผลลัพธ์

## การวางแผน (Planning)

RESTCONF และ NETCONF มี `plan_interface()` ให้เรียก แต่ backend **ห้ามเขียน logic เปรียบเทียบ desired/current เอง**

ขั้นตอนของ plan คือ:

    plan_interface(router, desired_interface)
        -> get_interface_state(router, desired_interface["name"])
        -> ได้สถานะปัจจุบันของ interface ที่ normalize แล้ว
        -> build_plan(desired_interface, current_interface)
        -> create / update / no_change

ถ้า status คืน `not_found` การวางแผนจะส่ง `None` เป็น current interface เข้า `build_plan()`

ถ้า status คืน error ของ backend ให้ **คืน error นั้นออกไปตามเดิม ไม่ต้องแก้**

logic การเปรียบเทียบจริง ๆ อยู่ใน Part 2:

    app/planner.py
    build_plan(desired_interface, current_interface)

วิธีนี้ทำให้ RESTCONF และ NETCONF วางแผนได้เหมือนกันทุกประการ และไม่ต้องเขียน logic เปรียบเทียบซ้ำในแต่ละ backend

## สัญญาของ Status (Status Contract)

ฟังก์ชัน `get_interface_state()` ทุกตัวต้องคืน dictionary ตามสัญญา response กลาง

### เจอ Interface

ถ้าติดต่อ router ได้และ interface ที่ขอมีอยู่:

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

ถ้าติดต่อ router ได้ แต่ interface ที่ขอไม่มีอยู่:

    {
      "status": "ok",
      "result": "not_found",
      "interface": null
    }

`not_found` **ไม่ใช่ error**

หมายความว่า operation ของ backend สำเร็จ แต่ resource ที่ขอยังไม่มีอยู่ในขณะนั้น

สำหรับการวางแผน โปรแกรมจะแปลง:

    result: found
        -> current_interface = response["interface"]

    result: not_found
        -> current_interface = None

แล้วเรียก:

    build_plan(desired_interface, current_interface)

ดังนั้น Part 2 จะได้รับเพียง dictionary ของ interface ที่ normalize แล้ว หรือ `None` เท่านั้น

## สัญญาของ Error จาก Backend (Backend Error Contract)

เมื่อ operation ของ backend ล้มเหลว ให้คืน:

    {
      "status": "error",
      "result": "<error_code>"
    }

รหัส error ของ backend ที่อนุญาตมี:

- authentication_failed
- connection_failed
- backend_failed

### authentication_failed

การยืนยันตัวตน (authentication) หรือการอนุญาตสิทธิ์ (authorization) ถูกปฏิเสธ

ตัวอย่างเช่น credential ผิด หรือไม่มีสิทธิ์

### connection_failed

ไม่สามารถสร้างการเชื่อมต่อที่ใช้งานได้กับ router หรือ backend

ตัวอย่างเช่น connection timeout, connection refused หรือเข้าถึง router ไม่ได้

### backend_failed

เชื่อมต่อได้แล้ว แต่ operation ที่ขอบน backend ล้มเหลว

ตัวอย่างเช่น protocol error, คำสั่งทำงานไม่สำเร็จ, response จาก backend ผิดรูปแบบ หรือความล้มเหลวอื่น ๆ เฉพาะของ backend นั้น

## สัญญาของ Apply (Apply Contract)

`apply_interface(router, desired_interface)` ต้องพยายามทำให้ interface เป้าหมายตรงกับ **สถานะที่ต้องการทั้งหมด (complete desired state)**

desired interface ประกอบด้วย:

    {
      "name": "Loopback123",
      "ipv4": "172.23.123.1/32",
      "description": "IPA2026-66070123",
      "admin_state": "up"
    }

เมื่อทำงานสำเร็จ ให้คืน:

    {
      "status": "ok",
      "result": "applied"
    }

เมื่อล้มเหลว ให้คืน error response กลางของ backend:

    {
      "status": "error",
      "result": "authentication_failed"
    }

หรือ:

    {
      "status": "error",
      "result": "connection_failed"
    }

หรือ:

    {
      "status": "error",
      "result": "backend_failed"
    }

backend **ไม่จำเป็น** ต้องคืน field `changed`

การตรวจว่า router ไปถึงสถานะที่ต้องการจริงหรือไม่ อาจตรวจแยกต่างหากโดยอ่านสถานะจาก router

## สัญญาของ Delete (Delete Contract)

มีเพียง `netmiko-textfsm` ที่รองรับ action `delete`

ฟังก์ชันที่เปิดให้เรียกคือ:

    delete_interface(router, interface_name)

backend ต้องลบ Loopback interface ที่ขอ โดยใช้คำสั่ง Cisco IOS CLI:

    no interface <interface_name>

ขั้นตอนที่ตั้งใจไว้คือ:

    delete_interface(router, interface_name)
        -> get_interface_state(router, interface_name)
        -> ถ้า not_found: คืน not_found
        -> ถ้า found: ส่ง "no interface <interface_name>" ด้วย Netmiko
        -> ตรวจสถานะ interface อีกครั้ง
        -> ถ้าหายไปแล้ว: คืน deleted

ถ้าลบ interface สำเร็จ ให้คืน:

    {
      "status": "ok",
      "result": "deleted"
    }

ถ้า interface ไม่มีอยู่แล้วตั้งแต่แรก ให้คืน:

    {
      "status": "ok",
      "result": "not_found",
      "interface": null
    }

ถ้าคำสั่ง delete ล้มเหลว หรือหลังตรวจสอบแล้ว interface ยังอยู่ ให้คืน error response กลางของ backend

RESTCONF, NETCONF และ Ansible **ไม่มี** `delete_interface()` ในข้อสอบนี้ การจับคู่ method/action ที่ไม่รองรับจะถูกปฏิเสธตั้งแต่ขั้นก่อนหน้าด้วย `invalid_action`

## Delete แบบ Idempotent (ลบซ้ำได้ผลเหมือนเดิม)

การลบ interface ที่ไม่มีอยู่แล้ว ถือเป็นการทำงานสำเร็จแบบไม่ต้องทำอะไร (no-op) และแสดงผลเป็น:

    {
      "status": "ok",
      "result": "not_found",
      "interface": null
    }

ดังนั้นการส่ง delete ซ้ำ ๆ จะไม่สร้าง resource ขึ้นมาใหม่ และไม่ทำให้เกิดสถานะซ้ำซ้อน

## Apply แบบ Idempotent (apply ซ้ำได้ผลเหมือนเดิม)

การ apply สถานะที่ต้องการเดิมซ้ำหลายครั้ง ต้องไม่ทำให้ configuration ผิด หรือเกิด resource ซ้ำ

ตัวอย่างเช่น apply Loopback interface เดิมสองครั้ง ต้องยังเหลือ interface เพียงตัวเดียวที่อยู่ในสถานะตามที่ขอ

RESTCONF และ NETCONF ใช้ความหมายแบบ **แทนที่ทั้ง resource (resource replacement)** สำหรับ Loopback ที่จัดการ

Ansible ใช้ `cisco.ios.ios_config` คู่กับ `defaults: true` เพื่อให้การเปรียบเทียบรวมคำสั่ง default ของ IOS ด้วย เช่นสถานะ `no shutdown` ที่มีผลอยู่จริง ดังนั้นสำหรับ interface ที่ถูกต้องอยู่แล้ว การ apply สถานะเดิมซ้ำจะเป็น idempotent และอาจจบด้วย Ansible รายงาน `changed=0`

response กลางของ backend **ไม่แสดง** flag `changed` ภายในของ Ansible การทำงานที่สำเร็จยังคงคืน `result: applied`

## การแบ่งหน้าที่ (Separation of Responsibilities)

Part 2 เปรียบเทียบสถานะที่ต้องการกับสถานะปัจจุบัน:

    desired + current
        -> build_plan()
        -> create / update / no_change

Part 3 ติดต่อกับ backend และเปิดให้เรียกเฉพาะ operation ที่แต่ละเทคโนโลยีรองรับ:

    get_interface_state()
    plan_interface()
    apply_interface()
    delete_interface()

`plan_interface()` เป็น **ตัวห่อ (wrapper) ที่ประสานงาน** สำหรับ RESTCONF และ NETCONF โดยดึงสถานะปัจจุบันที่ normalize แล้ว และส่ง logic การเปรียบเทียบทั้งหมดให้ `build_plan()` ของ Part 2

`delete_interface()` แยกจากการวางแผนของ Part 2 และมีให้เรียกเฉพาะใน backend Netmiko + TextFSM

backend **ห้าม** เขียนกฎการวางแผนของ Part 2 ซ้ำ เพียงเพื่อสร้างผลลัพธ์ create/update/no_change

## การตรวจสอบ Apply (Apply Verification)

เทสของผู้สอนอาจตรวจพฤติกรรมของ backend โดยใช้ test double (ตัวปลอม) หรือ router จริงที่ได้รับอนุญาต

implementation **ต้องใช้เทคโนโลยี backend ที่กำหนด** และ **ห้ามคืนผลสำเร็จแบบ hard-code** โดยไม่ได้ทำ operation กับ backend จริง

## YANG Model ที่กำหนดตายตัว (Frozen YANG Models)

IPA2026 ใช้ YANG model **คนละตัว** สำหรับการอ่านสถานะ interface กับการ apply configuration

    status / อ่าน
        -> ietf-interfaces
        -> ietf-ip

    apply / เขียน
        -> Cisco-IOS-XE-native

การเลือก model นี้ใช้เหมือนกันทั้ง RESTCONF และ NETCONF

router Cisco IOS XE ตัวจริงได้รับการตรวจสอบแล้วกับ:

    ietf-interfaces
    revision: 2014-05-08

    ietf-ip
    revision: 2014-06-16

    Cisco-IOS-XE-native
    revision: 2018-07-27


## Model ของ Status (Status Model)

RESTCONF และ NETCONF อ่านสถานะ interface ด้วย IETF interface model ซึ่งเป็นกลางไม่ผูกกับยี่ห้อ ส่วน Netmiko + TextFSM อ่าน output ของ IOS CLI แล้ว normalize ให้เป็นโครงสร้าง interface แบบเดียวกัน

สถานะ interface ที่ normalize แล้วคือ:

    {
      "name": "Loopback123",
      "ipv4": "172.23.123.1/32",
      "description": "IPA2026-66070123",
      "admin_state": "up"
    }


### Status ผ่าน RESTCONF

RESTCONF อ่านจาก:

    /restconf/data/ietf-interfaces:interfaces/interface=<interface_name>

ตัวอย่าง:

    /restconf/data/ietf-interfaces:interfaces/interface=Loopback123

ข้อมูลดิบที่ได้มีรูปแบบนี้:

    {
      "ietf-interfaces:interface": {
        "name": "Loopback123",
        "description": "IPA2026-66070123",
        "type": "iana-if-type:softwareLoopback",
        "enabled": true,
        "ietf-ip:ipv4": {
          "address": [
            {
              "ip": "172.23.123.1",
              "netmask": "255.255.255.255"
            }
          ]
        },
        "ietf-ip:ipv6": {}
      }
    }

transport ของ RESTCONF ในการใช้งานจริงใช้ **HTTPS** โดย implementation อ้างอิง (reference) ของผู้สอนใช้ Python `requests` และ credential ของ router กลางที่ส่งเข้ามาตอน runtime


### Status ผ่าน NETCONF

NETCONF ใช้ subtree filter:

    <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
      <interface>
        <name>Loopback123</name>
      </interface>
    </interfaces>

ข้อมูล interface ที่ได้กลับมามีรูปแบบนี้:

    <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
      <interface>
        <name>Loopback123</name>
        <description>IPA2026-66070123</description>
        <type xmlns:ianaift="urn:ietf:params:xml:ns:yang:iana-if-type">
          ianaift:softwareLoopback
        </type>
        <enabled>true</enabled>

        <ipv4 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
          <address>
            <ip>172.23.123.1</ip>
            <netmask>255.255.255.255</netmask>
          </address>
        </ipv4>

        <ipv6 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip"/>
      </interface>
    </interfaces>

transport ของ NETCONF ในการใช้งานจริงใช้ `ncclient` ผ่าน **SSH port 830**


### Status ผ่าน Netmiko + TextFSM

Netmiko + TextFSM รองรับ status และ delete หัวข้อนี้อธิบายเส้นทางของ status

implementation อ้างอิงรันคำสั่ง IOS แบบอ่านอย่างเดียว 2 คำสั่ง:

    show ip interface <interface_name>
    show interfaces description

`show ip interface` ถูก parse ด้วย NTC TextFSM template สำหรับ Cisco IOS และให้ข้อมูล:

    interface
    IP address
    prefix length
    สถานะ link ทางการจัดการ (administrative link state)

`show interfaces description` ให้ข้อมูล description ของ interface

Cisco IOS อาจ **ย่อชื่อ Loopback** ในคำสั่งนี้ เช่น:

    Loopback123 -> Lo123

backend ต้อง normalize ชื่อที่ถูกย่อ **ก่อน** จะจับคู่ record

admin state ได้มาจาก `show ip interface` ตามกฎนี้:

    administratively down
        -> admin_state: down

    กรณีอื่นทั้งหมด
        -> admin_state: up

IPv4 address ตัวแรกที่ parse ได้ คู่กับ prefix length ที่ตรงกัน ใช้สร้าง field `ipv4` ที่ normalize แล้ว


### การ Normalize สถานะ (Status Normalization)

RESTCONF และ NETCONF normalize IETF model ตามกฎนี้:

    name
        -> name

    description
        -> description

    enabled: true
        -> admin_state: up

    enabled: false
        -> admin_state: down

    ip + netmask
        -> ipv4 ในรูปแบบ CIDR

ตัวอย่าง:

    172.23.123.1 + 255.255.255.255
        -> 172.23.123.1/32

สำหรับ Netmiko + TextFSM ข้อมูล CLI ที่ parse ได้จะถูก normalize ให้อยู่ในรูปแบบ output เดียวกัน

field ของ IETF ต่อไปนี้ **ให้ละเลย**:

    type
    ipv6

ถ้า **ไม่มี description**:

    description: null

## Model ของ Apply (Apply Model)

RESTCONF และ NETCONF apply configuration ของ Loopback โดยใช้ Cisco native YANG model:

    Cisco-IOS-XE-native

Ansible apply สถานะที่ต้องการที่ normalize แล้วแบบเดียวกัน ผ่าน Cisco IOS CLI โดยใช้ `cisco.ios.ios_config`

สำหรับชื่อที่ normalize แล้ว เช่น:

    Loopback123

key ของ Loopback ใน Cisco native คือ:

    123

สถานะที่ต้องการ:

    {
      "name": "Loopback123",
      "ipv4": "172.23.123.1/32",
      "description": "IPA2026-66070123",
      "admin_state": "up"
    }

แปลงเป็น Cisco native model ดังนี้:

    name
        -> Loopback name 123

    description
        -> description

    ipv4
        -> ip/address/primary/address
        -> ip/address/primary/mask

    admin_state: down
        -> มี shutdown

    admin_state: up
        -> ไม่มี shutdown


### Apply ผ่าน RESTCONF

RESTCONF เขียน native Loopback resource ด้วย **HTTP PUT**:

    /restconf/data/Cisco-IOS-XE-native:native/interface/Loopback=123

ถ้า admin_state เป็น `up` payload มีรูปแบบนี้:

    {
      "Cisco-IOS-XE-native:Loopback": {
        "name": 123,
        "description": "IPA2026-66070123",
        "ip": {
          "address": {
            "primary": {
              "address": "172.23.123.1",
              "mask": "255.255.255.255"
            }
          }
        }
      }
    }

ถ้า admin_state เป็น `down` ให้ใส่เพิ่ม:

    "shutdown": [null]

ใช้ HTTP PUT เพื่อให้ Loopback resource ที่จัดการ **ถูกแทนที่ด้วยสถานะที่ต้องการทั้งหมด**

HTTP response ที่ถือว่าสำเร็จได้แก่:

    200
    201
    204


### Apply ผ่าน NETCONF

NETCONF เขียน Cisco native Loopback model แบบเดียวกัน โดยใช้:

    edit-config
    target: running

Loopback list entry ถูก **แทนที่ทั้งก้อน** ในฐานะ resource ที่จัดการ

ถ้า admin_state เป็น `up`:

    <config
        xmlns="urn:ietf:params:xml:ns:netconf:base:1.0"
        xmlns:nc="urn:ietf:params:xml:ns:netconf:base:1.0">

      <native xmlns="http://cisco.com/ns/yang/Cisco-IOS-XE-native">
        <interface>

          <Loopback nc:operation="replace">
            <name>123</name>

            <description>IPA2026-66070123</description>

            <ip>
              <address>
                <primary>
                  <address>172.23.123.1</address>
                  <mask>255.255.255.255</mask>
                </primary>
              </address>
            </ip>

          </Loopback>

        </interface>
      </native>
    </config>

ถ้า admin_state เป็น `down` element Loopback ต้องมีเพิ่ม:

    <shutdown/>

ถ้า admin_state เป็น `up` ให้ **ไม่ใส่** leaf `shutdown`

การแทนที่ native Loopback entry ทั้งก้อน ช่วยป้องกันไม่ให้ IPv4 address เก่าค้างอยู่เป็น secondary address หลังเปลี่ยน IPv4


### Apply ผ่าน Ansible

Ansible ใช้ได้กับ **apply อย่างเดียว**

implementation อ้างอิงใช้:

    cisco.ios.ios_config
    ansible.netcommon.network_cli

สถานะที่ต้องการที่ normalize แล้ว ถูกแปลงเป็น configuration ของ IOS interface:

    interface Loopback123
     description IPA2026-66070123
     ip address 172.23.123.1 255.255.255.255
     no shutdown

ถ้า admin_state เป็น `down` คำสั่งสุดท้ายคือ:

    shutdown

task `ios_config` ใช้:

    defaults: true

ค่านี้ทำให้เปรียบเทียบกับ default configuration ของ IOS ได้ และป้องกันไม่ให้ interface ที่ up อยู่แล้วถูกรายงานว่า changed ทุกครั้งที่ apply ซ้ำ เพียงเพราะ `no shutdown` ไม่ปรากฏใน output ของ running-config ปกติ

implementation อ้างอิงได้รับการตรวจสอบแล้วว่า แทนที่ primary IPv4 address ได้โดยไม่ทิ้ง primary address เดิมไว้เป็น secondary address

## Model ของ Delete (Delete Model)

delete ตั้งใจให้ทำได้ **เฉพาะ Netmiko + TextFSM**

เส้นทาง delete ใช้ Netmiko เข้า configuration mode ของ IOS แล้วส่ง:

    no interface Loopback123

ไม่จำเป็นต้องใช้ TextFSM parse ผลของคำสั่ง delete เอง แต่ **อาจ** ใช้เส้นทาง status ของ Netmiko + TextFSM ที่มีอยู่ ทั้งก่อนและหลังส่งคำสั่ง เพื่อดูว่า interface มีอยู่หรือไม่ และตรวจว่าลบสำเร็จ

การแยกแบบนี้ทำให้พฤติกรรมของ delete เรียบง่าย และไม่ต้องให้ RESTCONF, NETCONF หรือ Ansible มีความหมายของ delete เฉพาะตัว

## ผลลัพธ์ของ Delete (Delete Result)

ลบสำเร็จ คืน:

    {
      "status": "ok",
      "result": "deleted"
    }

ลบ interface ที่ไม่มีอยู่แล้ว คืน:

    {
      "status": "ok",
      "result": "not_found",
      "interface": null
    }

delete ที่ล้มเหลวใช้สัญญา error กลางของ backend:

    authentication_failed
    connection_failed
    backend_failed

## ผลลัพธ์ของ Apply (Apply Result)

apply ผ่าน RESTCONF, NETCONF หรือ Ansible สำเร็จ คืน:

    {
      "status": "ok",
      "result": "applied"
    }

ความล้มเหลวใช้สัญญา error กลางของ backend:

    authentication_failed
    connection_failed
    backend_failed

ผลลัพธ์กลาง **ไม่แสดง** รายละเอียดเฉพาะของ backend เช่น flag `changed` ของ Ansible

## พฤติกรรมที่ตรวจสอบแล้วกับ Router จริง (Verified Live-Router Behavior)

router Cisco IOS XE ของ IPA2026 ถูกใช้ตรวจสอบแล้วว่า:

- RESTCONF native PUT **สร้าง** Loopback ได้
- RESTCONF native PUT **แทนที่ primary IPv4 address** ได้ โดยไม่ทิ้ง address เก่าไว้เป็น secondary
- RESTCONF native `shutdown` ตรงกับ IETF `enabled=false`
- การไม่ใส่ native `shutdown` ใน RESTCONF PUT ตรงกับ IETF `enabled=true`
- NETCONF native configuration สร้าง Loopback ได้ และตั้งหรือเอา `shutdown` ออกได้
- NETCONF native Loopback replacement ลบ secondary IPv4 address ที่ค้างอยู่ และเหลือเฉพาะ primary address ที่ขอ
- Ansible `network_cli` เชื่อมต่อ router IOS XE ผ่าน **Paramiko** ได้ และ `cisco.ios.ios_config` สร้างและแก้ Loopback ได้
- การ apply สถานะเดิมที่ไม่เปลี่ยนผ่าน Ansible ด้วย `defaults: true` จบแบบ idempotent โดย Ansible รายงาน `changed=0`
- Ansible เปลี่ยน primary IPv4 address ได้ โดยไม่ทิ้ง primary address เก่าไว้เป็น secondary
- Netmiko + TextFSM อ่าน IPv4/prefix, description และ administrative state ของ Loopback ได้ ด้วยขั้นตอน status 2 คำสั่งที่อธิบายไว้ด้านบน
- Cisco IOS ย่อชื่อ Loopback เช่น `Loopback994` เป็น `Lo994` ใน `show interfaces description` และการ normalize ของ backend รองรับการย่อนี้
- Netmiko ลบ Loopback ได้ด้วยคำสั่ง IOS `no interface <interface_name>`
- การลบด้วย Netmiko ได้รับการตรวจสอบกับ Loopback ทดสอบที่ **ลบผ่าน RESTCONF native DELETE ได้ไม่สม่ำเสมอ** ดังนั้นในข้อสอบนี้ delete จึงตั้งใจจำกัดไว้ที่ `netmiko-textfsm` เท่านั้น

การตรวจ status หลัง apply อาจใช้เส้นทางการอ่านที่เป็นอิสระ สำหรับ RESTCONF และ NETCONF นั้น IETF status model ตั้งใจให้เป็นอิสระจาก Cisco native apply model
