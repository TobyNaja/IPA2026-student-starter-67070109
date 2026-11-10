// Project documentation data for IPA2026-student-starter-67070109.
// Content comes from README.md, specs/, DEPLOYMENT.md and the real code in app/ and scripts/ (commit 12d7543).
// The UI (js/app.js) only renders this data, so edit content here, not in the UI.

window.PROJECT_DATA = {
  meta: {
    name: "IPA2026-student-starter-67070109",
    commit: "12d7543",
    analyzedOn: "2026-11-08",
    testRun: { passed: 91, failed: 0, failedFile: "" },
    oneLiner:
      "Webex bot ที่รับการ @mention พร้อมไฟล์ YAML หนึ่งไฟล์ ตรวจคำขอ ทำงานกับ router (RESTCONF / NETCONF / Ansible / Netmiko+TextFSM) แล้วตอบผลเป็น JSON กลับไปห้องเดิม",
  },

  // ---------------------------------------------------------------- What changed since the first analysis (1e0b242)
  changes: [
    { commit: "3d9ccc5", title: "add Part 3 and Part 4", files: ["app/webhook_server.py"], what: "เขียน main(), make_http_handler() และ WebexEventHandler ครบ เพิ่ม resolve_bot_person_id() กับ process_event() bot จึงรับ event และตอบได้จริง pytest ผ่านครบ 91 ข้อ" },
    { commit: "e5ffdd1", title: "part 4.10", files: ["compose.yaml", "scripts/update_webex_webhooks.py", "DEPLOYMENT.md", ".env.example"], what: "เพิ่ม service tunnel (cloudflared Quick Tunnel) และ registrar ที่คอยแก้ webhook ใน Webex ให้ชี้ URL ปัจจุบันของ tunnel พร้อมเอกสาร deploy" },
    { commit: "2310a18", title: "pin cloudflared image and add filled manual test requests", files: ["compose.yaml", "sample-tests/webex-manual/ready/"], what: "ล็อก image เป็น cloudflare/cloudflared:2026.10.4 และเพิ่ม YAML ข้อ 2–10 ที่กรอก router, Loopback และ IPv4 แล้วไว้ส่งทดสอบเอง" },
    { commit: "12d7543", title: "Clear the old primary address before a NETCONF apply", files: ["app/backends/netconf.py"], what: "IOS-XE ไม่ยอมเปลี่ยน primary address ผ่าน native model แม้ใช้ replace จึงลบ address เดิมก่อนใน session เดียวกัน apply ที่เปลี่ยน IP ผ่าน NETCONF จึงมีผลใน running-config จริง" },
  ],

  // ---------------------------------------------------------------- Parts
  parts: [
    {
      id: "P1", title: "Part 1 — ตรวจ mention และ YAML",
      files: ["app/request_handler.py", "app/core.py"],
      spec: ["specs/desired-state-spec-v1.md", "specs/response-spec-v1.md"],
      status: "done", statusText: "เขียนแล้ว",
      what: "ตรวจว่า bot ถูก mention จริงและมีไฟล์แนบ จากนั้นอ่าน YAML และตรวจ key ตามลำดับ คืน error ตัวแรกที่เจอ",
    },
    {
      id: "P2", title: "Part 2 — วางแผน create / update / no_change",
      files: ["app/planner.py"],
      spec: ["specs/plan-spec-v1.md"],
      status: "done", statusText: "เขียนแล้ว",
      what: "เทียบ desired กับ current (ที่ normalize แล้ว) ไม่ต่อ router เอง",
    },
    {
      id: "P3", title: "Part 3 — เชื่อม router (backends)",
      files: ["app/backends/restconf.py", "app/backends/netconf.py", "app/backends/ansible.py", "app/backends/netmiko_textfsm.py", "app/backends/planning.py", "app/backends/common.py"],
      spec: ["specs/backend-spec-v1.md"],
      status: "done", statusText: "เขียนแล้ว",
      what: "อ่านสถานะ / apply / delete ด้วยเทคโนโลยีตาม method และแปลงผลให้เป็นรูปแบบกลาง",
    },
    {
      id: "P4", title: "Part 4 — เชื่อม Webex, webhook และ Docker",
      files: ["app/dispatcher.py", "app/integration.py", "app/webex_client.py", "app/webhook_server.py", "compose.yaml", "scripts/update_webex_webhooks.py"],
      spec: ["specs/integration-spec-v1.md", "specs/live-test-part4.md"],
      status: "done", statusText: "เขียนแล้ว",
      what: "webhook server รับ event และตอบกลับห้องเดิม ประมวลผลทีละงาน deploy ด้วย 3 service (webhook, tunnel, registrar) และ registrar คอยอัปเดต URL ของ webhook ใน Webex",
    },
  ],

  actions: [
    { action: "status", meaning: "อ่านว่า interface มีอยู่ไหม และค่าปัจจุบันคืออะไร", changes: "ไม่", result: "found / not_found" },
    { action: "plan", meaning: "เทียบค่าปัจจุบันกับ desired.interface แล้วบอกว่าจะ create / update / no_change", changes: "ไม่", result: "planned + operation + changes" },
    { action: "apply", meaning: "ทำให้ interface บน router มีค่าตาม desired.interface", changes: "เปลี่ยนจริง", result: "applied" },
    { action: "delete", meaning: "ลบ interface ตามชื่อ", changes: "เปลี่ยนจริง", result: "deleted (ลบซ้ำได้ not_found)" },
  ],

  // method → supported actions (same as SUPPORTED_ACTIONS in app/core.py)
  matrix: {
    actions: ["status", "plan", "apply", "delete"],
    rows: [
      { method: "restconf", yes: ["status", "plan", "apply"] },
      { method: "netconf", yes: ["status", "plan", "apply"] },
      { method: "ansible", yes: ["apply"] },
      { method: "netmiko-textfsm", yes: ["status", "delete"] },
    ],
  },

  // ---------------------------------------------------------------- Startup
  startup: [
    { title: "docker compose up เปิด 3 service", body: "webhook (bot), tunnel (cloudflared Quick Tunnel ต่อเข้า http://webhook:8000) และ registrar (รัน scripts/update_webex_webhooks.py --watch) ค่า WEBEX_BOT_TOKEN, ROUTER_USER, ROUTER_PASS มาจาก .env", ref: "compose.yaml" },
    { title: "container webhook เรียก main()", body: "Dockerfile สั่ง CMD [\"python\", \"-m\", \"app.webhook_server\"] main() ตั้ง logging แล้วอ่าน WEBHOOK_HOST / WEBHOOK_PORT (ค่าเริ่มต้น 0.0.0.0:8000)", ref: "main" },
    { title: "เตรียม client และ bot identity", body: "WebexClient() อ่าน WEBEX_BOT_TOKEN แล้ว resolve_bot_person_id() เรียก GET /v1/people/me เพื่อได้ personId ของ bot จากนั้นสร้าง WebexEventHandler(client, bot_person_id)", ref: "resolve_bot_person_id" },
    { title: "เปิดคิวและ HTTP server", body: "ThreadPoolExecutor(max_workers=1) เป็นคิวที่ทำงานทีละรายการ แล้วเปิด ThreadingHTTPServer ด้วย make_http_handler(submit_event) และ serve_forever รอ GET /health กับ POST /webhook", ref: "make_http_handler" },
    { title: "registrar ลงทะเบียน webhook", body: "อ่าน URL ของ tunnel จาก http://tunnel:2000/quicktunnel แล้วสร้างหรือแก้ webhook messages/created ของห้อง IPA2026 และ IPA2026 Exam Room ให้ targetUrl เป็น <URL>/webhook จากนั้นเช็กซ้ำทุก 15 วินาที", ref: "registrar.watch" },
  ],

  // ---------------------------------------------------------------- Functions
  // calledBy / calls type:
  //   direct    = เรียกกันตรง ๆ ในโค้ด
  //   event     = เกิดจาก Webex event / HTTP request
  //   framework = http.server, Docker หรือ Python runtime เป็นผู้เรียก
  //   injected  = ถูกส่งเข้าไปเป็น parameter (callable) แล้วถูกเรียกภายใน
  //   test      = เรียกจาก tests เท่านั้น
  functions: [
    // ---------------- Part 4: webhook server
    {
      id: "main", name: "main()", file: "app/webhook_server.py", part: "P4", group: "entry",
      status: "done", runtime: true,
      signature: "main()",
      summary: "จุดเริ่มต้นของโปรแกรม: สร้าง WebexClient, หา personId ของ bot, สร้าง event handler กับคิวที่ทำงานทีละงาน แล้วเปิด HTTP server รอ Webex",
      trigger: "เมื่อรัน python -m app.webhook_server (CMD ใน Dockerfile) ผ่านบรรทัด if __name__ == \"__main__\": main()",
      calledBy: [{ label: "Dockerfile CMD → if __name__ == \"__main__\"", type: "framework" }],
      calls: [
        { ref: "WebexClient", type: "direct" },
        { ref: "resolve_bot_person_id", type: "direct" },
        { ref: "handle_event", label: "WebexEventHandler(client, bot_person_id)", type: "direct" },
        { ref: "make_http_handler", label: "make_http_handler(submit_event)", type: "direct" },
        { ref: "process_event", label: "executor.submit(process_event, ...) ใน submit_event", type: "injected" },
      ],
      steps: [
        "logging.basicConfig(level=INFO) เพื่อให้ docker compose logs webhook มีข้อความให้ดู",
        "host = WEBHOOK_HOST (ค่าเริ่มต้น 0.0.0.0), port = int(WEBHOOK_PORT) (ค่าเริ่มต้น 8000)",
        "client = WebexClient() ซึ่งอ่าน WEBEX_BOT_TOKEN เอง ถ้าไม่มีจะ raise PermissionError",
        "bot_person_id = resolve_bot_person_id(client) แล้ว log \"bot personId resolved as ...\"",
        "event_handler = WebexEventHandler(client, bot_person_id) โดย processor ค่าเริ่มต้นคือ process_request",
        "เปิด ThreadPoolExecutor(max_workers=1) และนิยาม submit_event(event) = executor.submit(process_event, event_handler, event)",
        "สร้าง ThreadingHTTPServer((host, port), make_http_handler(submit_event)) log \"webhook listening on ...\" แล้ว serve_forever()",
        "Ctrl+C → log \"shutting down\" และ finally ปิด server เสมอ (shutdown + server_close)",
      ],
      ipo: {
        input: "Environment: WEBEX_BOT_TOKEN, WEBHOOK_HOST, WEBHOOK_PORT",
        process: "สร้าง client / handler / คิว 1 worker / HTTP server",
        output: "HTTP server ที่รันค้างไว้ (ไม่มีค่าคืน)",
        next: "make_http_handler() รอ POST /webhook → submit_event → process_event()",
      },
      errors: [
        "ไม่มี token → WebexClient raise PermissionError โปรแกรมจบ แล้ว restart: unless-stopped เริ่มใหม่วนไป",
        "token ผิด → GET /v1/people/me ได้ 401 → raise_for_status() raise HTTPError ตั้งแต่ตอนเริ่ม",
      ],
      note: "HTTP server เป็น ThreadingHTTPServer (รับหลาย request พร้อมกันได้) แต่ executor มี worker เดียว งานที่แตะ router จึงทำทีละรายการตามที่ spec บังคับ",
    },
    {
      id: "resolve_bot_person_id", name: "resolve_bot_person_id(client)", file: "app/webhook_server.py", part: "P4", group: "entry",
      status: "done", runtime: true,
      signature: "resolve_bot_person_id(client)",
      summary: "ถาม Webex ว่า token นี้เป็นของ bot ตัวไหน แล้วคืน personId ของ bot ไว้ใช้ตรวจ mention และกันการตอบข้อความของตัวเอง",
      trigger: "main() เรียกครั้งเดียวตอนเริ่มโปรแกรม",
      calledBy: [{ ref: "main", type: "direct" }],
      calls: [{ label: "requests.get(WEBEX_API_BASE + \"/people/me\", headers=client.headers)", type: "direct" }],
      steps: [
        "GET https://webexapis.com/v1/people/me พร้อม client.headers (Bearer token) และ timeout = REQUEST_TIMEOUT (10 วินาที)",
        "response.raise_for_status() ถ้าได้ HTTP error",
        "คืน response.json()[\"id\"]",
      ],
      ipo: {
        input: "WebexClient (ใช้แค่ headers)",
        process: "GET /v1/people/me",
        output: "personId ของ bot (string)",
        next: "main() ส่งต่อให้ WebexEventHandler(client, bot_person_id)",
      },
      errors: ["HTTP 401/403 (token ผิด) หรือ network error → exception ทำให้ main() หยุด"],
      note: "spec สั่งให้หา personId ด้วย GET /v1/people/me แทนการ hard-code ค่า ID ของ bot",
    },
    {
      id: "make_http_handler", name: "make_http_handler(submit_event)", file: "app/webhook_server.py", part: "P4", group: "entry",
      status: "done", runtime: true,
      signature: "make_http_handler(submit_event) → class WebhookHTTPHandler(BaseHTTPRequestHandler)",
      summary: "สร้าง class HTTP handler ที่มี 2 endpoint คือ GET /health และ POST /webhook โดย /webhook ส่ง event เข้าคิวด้วย submit_event แล้วตอบรับทันที",
      trigger: "main() เรียกตอนเปิด server ส่วน do_GET / do_POST ทำงานเมื่อมี HTTP request เข้ามา",
      calledBy: [
        { ref: "main", type: "direct" },
        { label: "ThreadingHTTPServer (ทุก HTTP request)", type: "framework" },
        { label: "tests/test_part4_webhook.py, scripts/check_webhook_image.py", type: "test" },
      ],
      calls: [
        { label: "submit_event(event) → คิว → process_event() → handle_event()", ref: "process_event", type: "injected" },
      ],
      steps: [
        "do_GET: path = /health → 200 {\"status\":\"ok\",\"result\":\"healthy\"} ไม่งั้น 404 {\"status\":\"error\",\"result\":\"not_found\"}",
        "do_POST: path ไม่ใช่ /webhook → 404 not_found",
        "_read_event(): Content-Length ต้องเป็นตัวเลข 1 ถึง 1,000,000 (MAX_BODY_BYTES) อ่าน body ได้ครบตามความยาว parse JSON ได้ และผลต้องเป็น dict ถ้าไม่ผ่านข้อใดคืน None",
        "ได้ None → 400 {\"status\":\"error\",\"result\":\"invalid_event\"} และไม่ submit",
        "ถูกต้อง → submit_event(event) ก่อน แล้วตอบ 200 {\"status\":\"ok\",\"result\":\"accepted\"} โดยไม่รอ router",
        "_send_json() ใส่ Content-Type: application/json และ Content-Length ทุกคำตอบ",
        "timeout = 10 ตัด connection ที่ส่ง body ค้างกลางทาง ไม่ให้ค้าง thread ไว้",
      ],
      ipo: {
        input: "submit_event (callable) และ HTTP request จาก Webex, health check หรือ smoke test",
        process: "route ตาม path, ตรวจ body, ส่ง event เข้าคิว",
        output: "class handler สำหรับ server / คำตอบ HTTP 200, 400 หรือ 404",
        next: "submit_event → process_event() → WebexEventHandler.handle_event() (ทำงานเบื้องหลัง)",
      },
      errors: ["ไม่มีหรือผิด Content-Length, body ไม่ครบ, JSON ผิด, ไม่ใช่ object → 400 invalid_event", "path ไม่รู้จัก → 404 not_found"],
      note: "HTTP 200 accepted แปลว่าได้รับ event แล้วเท่านั้น ผลของ YAML ส่งเป็นข้อความใหม่เข้าห้อง Webex ภายหลัง",
    },
    {
      id: "process_event", name: "process_event(event_handler, event)", file: "app/webhook_server.py", part: "P4", group: "entry",
      status: "done", runtime: true,
      signature: "process_event(event_handler, event)",
      summary: "ตัวห่อที่ worker ของคิวเรียก: รัน handle_event แล้ว log exception ที่หลุดออกมา เพื่อไม่ให้ error หายเงียบ",
      trigger: "worker ของ ThreadPoolExecutor หยิบงานที่ submit_event ใส่ไว้",
      calledBy: [{ ref: "main", label: "executor.submit(process_event, event_handler, event)", type: "injected" }],
      calls: [{ ref: "handle_event", type: "direct" }],
      steps: [
        "try: event_handler.handle_event(event)",
        "except Exception: logger.exception(\"unhandled error while processing ...\")",
      ],
      ipo: {
        input: "WebexEventHandler และ event dict",
        process: "เรียก handle_event และจับ exception",
        output: "ไม่มีค่าคืน (log error ถ้ามี)",
        next: "worker ว่าง → หยิบ event ถัดไปในคิว",
      },
      errors: ["exception ใด ๆ จาก handle_event (เช่น Webex API ล่ม) ถูก log และไม่มีข้อความตอบเข้าห้อง"],
      note: "ไม่มีใครรอผลของ future จาก executor.submit ถ้าไม่ log ตรงนี้ exception จะหายไปเฉย ๆ",
    },
    {
      id: "handle_event", name: "WebexEventHandler.handle_event(event)", file: "app/webhook_server.py", part: "P4", group: "entry",
      status: "done", runtime: true,
      signature: "WebexEventHandler(client, bot_person_id, processor=None).handle_event(event)",
      summary: "รับ event หนึ่งรายการ ดึงข้อความจริงจาก Webex จัดการไฟล์แนบ เรียก processor แล้วส่งผล JSON กลับห้องเดิม",
      trigger: "process_event() เรียกใน worker ของคิว (ทีละรายการ)",
      calledBy: [
        { ref: "process_event", type: "direct" },
        { label: "tests/test_part4_webhook.py", type: "test" },
      ],
      calls: [
        { ref: "get_message", type: "direct" },
        { ref: "download_file", label: "ใน _build_response() เมื่อมี 1 ไฟล์", type: "direct" },
        { ref: "process_request", label: "self._processor(...) ค่าเริ่มต้น = process_request", type: "injected" },
        { ref: "send_message", type: "direct" },
      ],
      steps: [
        "_accepted_message_id(event): ต้องเป็น dict, resource = messages, event = created, data เป็น dict และ data.personId ไม่ใช่ของ bot แล้วคืน data.id (ว่างก็ถือเป็น None)",
        "ได้ None → return None ไม่เรียก API และไม่ตอบ",
        "message = client.get_message(message_id)",
        "เช็กผู้เขียนอีกครั้ง: message.personId เป็นของ bot → return None (กรณี event ไม่มี personId มาให้)",
        "_build_response(message): ไฟล์มากกว่า 1 → MULTIPLE_ATTACHMENTS ทันที ไม่ดาวน์โหลดและไม่เรียก processor",
        "ไม่มีไฟล์ → processor(mentionedPeople, None, bot_person_id) ซึ่งจะได้ no_yaml หรือ missing_bot_mention",
        "มี 1 ไฟล์ → ใน TemporaryDirectory เขียน download_file(files[0]) เป็น request.yaml แล้ว processor(mentionedPeople, path, bot_person_id) โฟลเดอร์ถูกลบเมื่อออกจาก with แม้ processor จะ raise",
        "client.send_message(message.roomId, json.dumps(response)) แล้ว return response",
      ],
      ipo: {
        input: "event dict เช่น {resource: \"messages\", event: \"created\", data: {id, personId}}",
        process: "กรอง event → get_message → จัดการไฟล์แนบ → processor → send_message",
        output: "response dict ที่ส่งเข้าห้อง หรือ None ถ้าเป็น event ที่ไม่สนใจ",
        next: "WebexClient.send_message() → ผู้ใช้เห็นผลในห้องเดิม",
      },
      errors: [
        "event อื่น / ผิดรูป / ข้อความของ bot เอง → None ไม่ตอบ",
        "ไฟล์แนบหลายไฟล์ → {\"status\":\"error\",\"result\":\"multiple_attachments\"}",
        "exception จาก Webex API หรือ processor ไม่ถูกจับที่นี่ แต่ไปถูก log ใน process_event()",
      ],
      note: "ตอบไปที่ roomId ของข้อความที่รับมา ไม่ hard-code room เพราะ bot ต้องใช้ได้ทั้งห้อง IPA2026 และ IPA2026 Exam Room",
    },

    // ---------------- Part 4: Webex client
    {
      id: "WebexClient", name: "WebexClient(token=None, session=None)", file: "app/webex_client.py", part: "P4", group: "webex",
      status: "done", runtime: true,
      signature: "WebexClient(token=None, session=None) และ property headers",
      summary: "ตัวเรียก Webex REST API (https://webexapis.com/v1) เก็บ token และ session แล้วสร้าง header Bearer ให้ทุก request",
      trigger: "ถูกสร้างครั้งเดียวตอนเริ่มโปรแกรมใน main()",
      calledBy: [{ ref: "main", type: "direct" }, { label: "tests/test_part4_webex_client.py", type: "test" }],
      calls: [{ label: "os.environ.get(\"WEBEX_BOT_TOKEN\")", type: "direct" }, { label: "requests.Session()", type: "direct" }],
      steps: [
        "ถ้าไม่ได้ส่ง token ให้อ่านจาก environment WEBEX_BOT_TOKEN",
        "ถ้ายังไม่มี token → raise PermissionError(\"WEBEX_BOT_TOKEN is not set\")",
        "ใช้ session ที่ส่งมา (tests ส่ง fake session) หรือสร้าง requests.Session()",
        "property headers คืน {\"Authorization\": \"Bearer <token>\"} ให้ทุก method ใช้",
      ],
      ipo: {
        input: "token (หรือ env WEBEX_BOT_TOKEN), session (ไม่บังคับ)",
        process: "ตรวจว่ามี token และเตรียม session",
        output: "object WebexClient ที่มี get_message / download_file / send_message",
        next: "WebexEventHandler ใช้ client นี้",
      },
      errors: ["ไม่มี token → PermissionError"],
    },
    {
      id: "get_message", name: "WebexClient.get_message(message_id)", file: "app/webex_client.py", part: "P4", group: "webex",
      status: "done", runtime: true,
      signature: "get_message(message_id)",
      summary: "ดึงข้อความเต็มจาก Webex เพราะ webhook event ส่งมาแค่ message ID ไม่มีเนื้อหาหรือไฟล์",
      trigger: "handle_event ได้ event messages/created ที่ไม่ใช่ข้อความของ bot",
      calledBy: [{ ref: "handle_event", type: "direct" }],
      calls: [{ label: "GET https://webexapis.com/v1/messages/{id}", type: "direct" }],
      steps: [
        "GET {WEBEX_API_BASE}/messages/{message_id} พร้อม header Bearer และ timeout 10 วินาที",
        "response.raise_for_status() ถ้าได้ HTTP error",
        "คืน response.json()",
      ],
      ipo: {
        input: "message_id จาก event.data.id",
        process: "GET /v1/messages/{id}",
        output: "dict ของข้อความ: roomId, personId, mentionedPeople, files, text",
        next: "handle_event อ่าน files แล้วเรียก download_file / processor",
      },
      errors: ["HTTP 4xx/5xx → requests.HTTPError จาก raise_for_status", "เกิน 10 วินาที → Timeout"],
    },
    {
      id: "download_file", name: "WebexClient.download_file(file_url)", file: "app/webex_client.py", part: "P4", group: "webex",
      status: "done", runtime: true,
      signature: "download_file(file_url)",
      summary: "ดาวน์โหลดไฟล์แนบ (YAML) จาก URL ในข้อความ โดยใช้ token เดียวกัน",
      trigger: "ข้อความมีไฟล์แนบพอดี 1 ไฟล์",
      calledBy: [{ ref: "handle_event", type: "direct" }],
      calls: [{ label: "GET file_url (พร้อม Bearer)", type: "direct" }],
      steps: ["GET file_url พร้อม header Bearer และ timeout 10 วินาที", "raise_for_status()", "คืน response.content (bytes)"],
      ipo: {
        input: "file_url จาก message.files[0]",
        process: "ดาวน์โหลดไฟล์",
        output: "bytes ของไฟล์ YAML",
        next: "handle_event เขียน bytes เป็นไฟล์ชั่วคราว แล้วส่ง path ให้ process_request",
      },
      errors: ["HTTP error → requests.HTTPError"],
    },
    {
      id: "send_message", name: "WebexClient.send_message(room_id, text)", file: "app/webex_client.py", part: "P4", group: "webex",
      status: "done", runtime: true,
      signature: "send_message(room_id, text)",
      summary: "ส่งผล JSON กลับเข้าห้อง Webex เป็นข้อความใหม่ เป็นขั้นตอนสุดท้ายที่ผู้ใช้จะเห็น",
      trigger: "handle_event ได้ response dict แล้ว",
      calledBy: [{ ref: "handle_event", type: "direct" }],
      calls: [{ label: "POST https://webexapis.com/v1/messages {roomId, text}", type: "direct" }],
      steps: ["POST {WEBEX_API_BASE}/messages ด้วย json={\"roomId\": room_id, \"text\": text}", "raise_for_status()", "คืน response.json()"],
      ipo: {
        input: "room_id (ห้องเดียวกับคำขอ), text (JSON string ของผลลัพธ์)",
        process: "POST /v1/messages",
        output: "dict ของข้อความที่ส่งแล้ว",
        next: "จบ workflow: ผู้ใช้เห็นคำตอบในห้อง",
      },
      errors: ["HTTP error → requests.HTTPError ทำให้ผู้ใช้ไม่เห็นคำตอบ แม้ router จะเปลี่ยนไปแล้ว"],
      note: "คำตอบไม่ได้ส่งกลับทาง HTTP response ของ /webhook แต่ส่งเป็นข้อความใหม่ผ่าน Webex API โดยตรง",
    },

    // ---------------- Part 4: integration + dispatcher
    {
      id: "process_request", name: "process_request(mentioned_people, attachment_path, bot_person_id)", file: "app/integration.py", part: "P4", group: "integration",
      status: "done", runtime: true,
      signature: "process_request(mentioned_people, attachment_path, bot_person_id)",
      summary: "ศูนย์กลางของการประมวลผลคำขอ: ตรวจ envelope → อ่าน YAML ครั้งเดียว → ตรวจ YAML → ส่งต่อ dispatcher เฉพาะคำขอที่ผ่าน",
      trigger: "handle_event เรียกในฐานะ processor หลังจัดการไฟล์แนบ",
      calledBy: [{ ref: "handle_event", label: "self._processor ค่าเริ่มต้น", type: "injected" }, { label: "tests/test_part4_integration.py", type: "test" }],
      calls: [
        { ref: "validate_webex_envelope", type: "direct" },
        { ref: "load_request_file", type: "direct" },
        { ref: "validate_request", type: "direct" },
        { ref: "dispatch_request", type: "direct" },
      ],
      steps: [
        "validate_webex_envelope(...) ถ้าได้ error (missing_bot_mention / no_yaml) → return error ทันที",
        "load_request_file(attachment_path) ได้ (data, error) ถ้า error (invalid_yaml) → return",
        "validate_request(data) ถ้า status เป็น error → return error นั้น",
        "dispatch_request(data) แล้ว return ผลจาก backend โดยไม่แก้รูปแบบ",
      ],
      ipo: {
        input: "mentionedPeople (list), path ของไฟล์ YAML หรือ None, bot personId",
        process: "validate envelope → load YAML → validate → dispatch",
        output: "response dict (error จากการตรวจ หรือผลจาก backend)",
        next: "dispatch_request() เมื่อผ่านทุกการตรวจ / กลับไปที่ handle_event",
      },
      errors: ["ไม่ไปถึง router เลยถ้าการตรวจใดไม่ผ่าน"],
      note: "ไม่เรียก handle_webex_request() ของ Part 1 เพราะฟังก์ชันนั้นคืนแค่ accepted/error ไม่คืน data ที่ parse แล้ว แต่ขั้นนี้ต้องใช้ data ไป dispatch และ spec ให้อ่าน YAML ครั้งเดียว",
    },
    {
      id: "dispatch_request", name: "dispatch_request(data)", file: "app/dispatcher.py", part: "P4", group: "integration",
      status: "done", runtime: true,
      signature: "dispatch_request(data)",
      summary: "เลือก backend function จากคู่ (method, action) ในตาราง BACKENDS แล้วเรียกด้วย argument ที่ถูกรูปแบบ",
      trigger: "process_request ได้คำขอที่ validate_request ตอบ accepted",
      calledBy: [{ ref: "process_request", type: "direct" }, { label: "tests/test_part4_dispatcher.py", type: "test" }],
      calls: [
        { ref: "restconf.get_interface_state", type: "direct" }, { ref: "restconf.plan_interface", type: "direct" }, { ref: "restconf.apply_interface", type: "direct" },
        { ref: "netconf.get_interface_state", type: "direct" }, { ref: "netconf.plan_interface", type: "direct" }, { ref: "netconf.apply_interface", type: "direct" },
        { ref: "ansible.apply_interface", type: "direct" },
        { ref: "netmiko.get_interface_state", type: "direct" }, { ref: "netmiko.delete_interface", type: "direct" },
      ],
      steps: [
        "หา (module, ชื่อฟังก์ชัน) จาก BACKENDS[(method, action)] ซึ่งมีครบ 9 คู่ตาม capability matrix",
        "getattr(module, function_name) เพื่อได้ฟังก์ชันจริง",
        "status / delete → backend(router, interface[\"name\"])",
        "plan / apply → backend(router, interface) ส่ง desired.interface ทั้ง dict",
        "คืนผลจาก backend ตรง ๆ",
      ],
      ipo: {
        input: "data: dict ของ YAML ที่ผ่านการตรวจแล้ว",
        process: "lookup ตาราง BACKENDS แล้วเรียก backend",
        output: "response dict จาก backend",
        next: "กลับไปที่ process_request → handle_event → send_message",
      },
      errors: ["ไม่ตรวจซ้ำ: ถือว่า data ผ่าน validate_request แล้ว"],
    },

    // ---------------- Part 1
    {
      id: "validate_webex_envelope", name: "validate_webex_envelope(mentioned_people, attachment_path, bot_person_id)", file: "app/request_handler.py", part: "P1", group: "validation",
      status: "done", runtime: true,
      signature: "validate_webex_envelope(mentioned_people, attachment_path, bot_person_id)",
      summary: "ด่านแรก: ตรวจว่า bot ถูก mention จริงด้วย personId และมีไฟล์แนบ ก่อนจะอ่าน YAML",
      trigger: "process_request (Part 4) หรือ handle_webex_request (Part 1) เรียกเป็นขั้นแรก",
      calledBy: [{ ref: "process_request", type: "direct" }, { ref: "handle_webex_request", type: "direct" }],
      calls: [],
      steps: [
        "bot_person_id ต้องเป็น string ที่ไม่ว่าง, mentioned_people ต้องเป็น list และต้องมี bot_person_id อยู่ ถ้าไม่ครบ → missing_bot_mention",
        "ถ้า mention ถูกต้องแต่ attachment_path เป็น None → no_yaml",
        "ผ่านทั้งสองข้อ → return None (หมายถึงไปต่อได้)",
      ],
      ipo: {
        input: "mentionedPeople จากข้อความ, path ไฟล์แนบหรือ None, personId ของ bot",
        process: "ตรวจ mention ด้วย ID แล้วตรวจว่ามีไฟล์",
        output: "error dict หรือ None",
        next: "load_request_file() (ใน process_request)",
      },
      errors: ["missing_bot_mention", "no_yaml"],
      note: "ตรวจด้วย personId ไม่ใช่ชื่อที่แสดงหรือข้อความ การพิมพ์ @ชื่อ เป็นข้อความธรรมดาจึงไม่ผ่าน",
    },
    {
      id: "load_request_file", name: "load_request_file(path)", file: "app/core.py", part: "P1", group: "validation",
      status: "done", runtime: true,
      signature: "load_request_file(path)",
      summary: "อ่านไฟล์ YAML หนึ่งครั้งด้วย yaml.safe_load แล้วคืน (data, None) หรือ (None, invalid_yaml)",
      trigger: "envelope ผ่านแล้ว",
      calledBy: [{ ref: "process_request", type: "direct" }, { ref: "process_request_file", type: "direct" }],
      calls: [{ label: "yaml.safe_load (PyYAML)", type: "direct" }],
      steps: [
        "เปิดไฟล์แบบ utf-8 แล้ว yaml.safe_load",
        "สำเร็จ → (data, None)",
        "yaml.YAMLError หรือ UnicodeDecodeError → (None, {\"status\":\"error\",\"result\":\"invalid_yaml\"})",
      ],
      ipo: {
        input: "path ของไฟล์ YAML ชั่วคราว",
        process: "parse YAML",
        output: "tuple (data, error)",
        next: "validate_request(data)",
      },
      errors: ["invalid_yaml เมื่อ parse ไม่ได้หรือ decode utf-8 ไม่ได้"],
      note: "ถ้า parse ได้แต่ root ไม่ใช่ mapping (เช่น list หรือไฟล์ว่าง) ฟังก์ชันนี้ยังคืน data ได้ แล้ว validate_request จะตอบ invalid_yaml",
    },
    {
      id: "validate_request", name: "validate_request(data)", file: "app/core.py", part: "P1", group: "validation",
      status: "done", runtime: true,
      signature: "validate_request(data)",
      summary: "ตรวจ YAML ที่ parse แล้วตามลำดับใน desired-state spec คืน error ตัวแรกที่เจอ หรือ accepted",
      trigger: "load_request_file สำเร็จ",
      calledBy: [{ ref: "process_request", type: "direct" }, { ref: "process_request_file", type: "direct" }],
      calls: [{ label: "ใช้ค่าคงที่ ALLOWED_ROUTERS, SUPPORTED_ACTIONS, ADMIN_STATES", type: "direct" }],
      steps: [
        "root ต้องเป็น dict ไม่งั้น invalid_yaml",
        "version ต้องเป็น int 1 เท่านั้น (\"1\", 1.0, true ผิดหมด) → invalid_version",
        "router: ไม่มี → missing_router, ไม่อยู่ใน ALLOWED_ROUTERS (10.0.29.101–105) → invalid_router",
        "method: ไม่มี → missing_method, ไม่อยู่ใน SUPPORTED_ACTIONS → invalid_method",
        "action: ไม่มี → missing_action, method นั้นไม่รองรับ → invalid_action",
        "desired / desired.interface ต้องเป็น dict และต้องมี name → missing_desired / missing_interface / missing_interface_name",
        "เฉพาะ plan และ apply: ต้องมี ipv4, description, admin_state และ admin_state ต้องเป็น up/down",
        "ผ่านทั้งหมด → {\"status\":\"ok\",\"result\":\"accepted\"}",
      ],
      ipo: {
        input: "data (dict ที่ได้จาก YAML)",
        process: "ตรวจ key ทีละขั้นตามลำดับ",
        output: "error dict ตัวแรก หรือ accepted",
        next: "dispatch_request(data) ถ้า accepted",
      },
      errors: ["invalid_yaml, invalid_version, missing_router, invalid_router, missing_method, invalid_method, missing_action, invalid_action, missing_desired, missing_interface, missing_interface_name, missing_ipv4, missing_description, missing_admin_state, invalid_admin_state"],
      note: "ตรวจคู่ method/action ก่อนฟิลด์เฉพาะของ action เสมอ ส่วน status และ delete ต้องการแค่ name (ค่า ipv4/description/admin_state ใน status ถูกละเลย)",
    },
    {
      id: "handle_webex_request", name: "handle_webex_request(mentioned_people, attachment_path, bot_person_id)", file: "app/request_handler.py", part: "P1", group: "validation",
      status: "done", runtime: false,
      signature: "handle_webex_request(mentioned_people, attachment_path, bot_person_id)",
      summary: "ฟังก์ชันของ Part 1: ตรวจ envelope แล้วตรวจ YAML คืน accepted/error โดยไม่ส่งต่อไป router",
      trigger: "เรียกจาก tests ของ Part 1 (จำลอง mention)",
      calledBy: [{ label: "tests/test_part1.py, tests/test_part1_mentions.py", type: "test" }],
      calls: [{ ref: "validate_webex_envelope", type: "direct" }, { ref: "process_request_file", type: "direct" }],
      steps: ["validate_webex_envelope(...) ถ้ามี error → return", "process_request_file(attachment_path) → accepted หรือ error"],
      ipo: {
        input: "เหมือน process_request",
        process: "ตรวจอย่างเดียว ไม่ dispatch",
        output: "accepted หรือ error",
        next: "ไม่มี (จบที่ผลการตรวจ)",
      },
      errors: ["error เดียวกับ envelope + YAML validation"],
      note: "ไม่อยู่ใน runtime หลักของ bot: Part 4 ใช้ process_request() แทน",
    },
    {
      id: "process_request_file", name: "process_request_file(path)", file: "app/core.py", part: "P1", group: "validation",
      status: "done", runtime: false,
      signature: "process_request_file(path)",
      summary: "อ่าน YAML แล้ว validate ในครั้งเดียว คืนผลการตรวจ (ใช้ใน Part 1)",
      trigger: "handle_webex_request หรือ tests ของ Part 1",
      calledBy: [{ ref: "handle_webex_request", type: "direct" }, { label: "tests/test_part1.py", type: "test" }],
      calls: [{ ref: "load_request_file", type: "direct" }, { ref: "validate_request", type: "direct" }],
      steps: ["load_request_file(path) ถ้า error → return", "validate_request(data)"],
      ipo: { input: "path", process: "load + validate", output: "accepted หรือ error", next: "ไม่มี" },
      errors: ["invalid_yaml และ error จาก validate_request"],
      note: "ไม่อยู่ใน runtime หลักของ bot",
    },

    // ---------------- Part 2
    {
      id: "build_plan", name: "build_plan(desired_interface, current_interface)", file: "app/planner.py", part: "P2", group: "planning",
      status: "done", runtime: true,
      signature: "build_plan(desired_interface, current_interface)",
      summary: "เทียบ desired กับ current แล้วคืน operation create / update / no_change พร้อม changes โดยไม่ติดต่อ router",
      trigger: "planning.plan_interface ได้ current state แล้ว",
      calledBy: [{ ref: "planning.plan_interface", type: "direct" }, { label: "tests/test_part2.py", type: "test" }],
      calls: [],
      steps: [
        "managed fields มี 3 ตัว: ipv4, description, admin_state (name ใช้ระบุ interface ไม่อยู่ใน changes)",
        "current_interface เป็น None → create พร้อม changes ทั้ง 3 ฟิลด์ (มีแค่ to)",
        "มี current → ใส่เฉพาะฟิลด์ที่ค่าต่างลง changes พร้อม from / to",
        "changes ว่าง → no_change, ไม่ว่าง → update",
      ],
      ipo: {
        input: "desired_interface (dict ครบ 4 ฟิลด์), current_interface (dict ที่ normalize แล้ว หรือ None)",
        process: "เปรียบเทียบ managed fields",
        output: "{status: ok, result: planned, operation, changes}",
        next: "กลับไปที่ plan_interface → dispatcher → ผู้ใช้",
      },
      errors: ["ไม่มี error ของตัวเอง เพราะ error จาก router ถูกคืนก่อนถึงฟังก์ชันนี้"],
      note: "ผลต้องเหมือนเดิมทุกครั้งสำหรับ input เดิม และถ้าค่าตรงกันแล้วต้องได้ no_change (idempotent)",
    },

    // ---------------- Part 3: shared planning wrapper
    {
      id: "planning.plan_interface", name: "planning.plan_interface(router, desired_interface, get_interface_state)", file: "app/backends/planning.py", part: "P3", group: "planning",
      status: "done", runtime: true,
      signature: "plan_interface(router, desired_interface, get_interface_state)",
      summary: "ตัวกลางที่ RESTCONF และ NETCONF ใช้ร่วมกัน: อ่านสถานะด้วย get_interface_state ที่ส่งเข้ามา แปลงเป็น current แล้วให้ build_plan ตัดสิน",
      trigger: "restconf.plan_interface หรือ netconf.plan_interface เรียก",
      calledBy: [{ ref: "restconf.plan_interface", type: "direct" }, { ref: "netconf.plan_interface", type: "direct" }],
      calls: [
        { label: "get_interface_state ที่ส่งเข้ามา (restconf / netconf)", ref: "restconf.get_interface_state", type: "injected" },
        { ref: "build_plan", type: "direct" },
      ],
      steps: [
        "status = get_interface_state(router, desired_interface[\"name\"])",
        "status เป็น error → คืน error นั้นทันที ไม่เรียก build_plan",
        "not_found → current = None, found → current = status[\"interface\"]",
        "return build_plan(desired_interface, current)",
      ],
      ipo: {
        input: "router, desired_interface, ฟังก์ชันอ่านสถานะของ backend",
        process: "อ่านสถานะ → แปลงเป็น current → build_plan",
        output: "plan dict หรือ backend error",
        next: "build_plan()",
      },
      errors: ["authentication_failed / connection_failed / backend_failed ถูกส่งต่อแบบไม่แก้"],
      note: "ทำให้ backend ไม่ต้องเขียนตรรกะเปรียบเทียบซ้ำ ตามที่ backend spec กำหนด",
    },

    // ---------------- Part 3: RESTCONF
    {
      id: "restconf.get_interface_state", name: "restconf.get_interface_state(router, interface_name, http_get=None)", file: "app/backends/restconf.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "get_interface_state(router, interface_name, http_get=None)",
      summary: "อ่านสถานะ interface ด้วย RESTCONF (HTTPS GET ไปที่ model ietf-interfaces) แล้วแปลงให้เป็นรูปแบบกลาง",
      trigger: "restconf + status หรือขั้นอ่านสถานะของ restconf + plan",
      calledBy: [{ ref: "dispatch_request", type: "direct" }, { ref: "restconf.plan_interface", label: "ผ่าน planning.plan_interface", type: "injected" }],
      calls: [{ label: "http_get(url) หรือ _real_get → requests (ใช้ ROUTER_USER/PASS)", type: "direct" }, { ref: "error_from_exception", type: "direct" }],
      steps: [
        "สร้าง URL https://{router}/restconf/data/ietf-interfaces:interfaces/interface={name}",
        "เรียก http_get(url) (tests ส่ง fake มา, ถ้าไม่ส่งใช้ requests จริงพร้อม verify=False, timeout 10)",
        "exception → error_from_exception (Timeout / ConnectionError ของ requests ถูกแปลงเป็น ConnectionError ก่อน)",
        "HTTP 404 → not_found, 401/403 → authentication_failed, อื่นที่ไม่ใช่ 200 → backend_failed",
        "200 → แปลง JSON: enabled → admin_state, ip + netmask → CIDR, description → found",
        "JSON ผิดรูป → backend_failed",
      ],
      ipo: {
        input: "router IP, ชื่อ interface",
        process: "HTTP GET + normalize",
        output: "found พร้อม interface / not_found / error",
        next: "กลับ dispatcher หรือส่งต่อให้ planning.plan_interface",
      },
      errors: ["authentication_failed", "connection_failed", "backend_failed"],
    },
    {
      id: "restconf.plan_interface", name: "restconf.plan_interface(router, desired_interface, http_get=None)", file: "app/backends/restconf.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "plan_interface(router, desired_interface, http_get=None)",
      summary: "วางแผนผ่าน RESTCONF: ส่ง get_interface_state ของ RESTCONF เข้า planning.plan_interface",
      trigger: "restconf + plan",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [{ ref: "planning.plan_interface", type: "direct" }, { ref: "restconf.get_interface_state", type: "injected" }],
      steps: ["ห่อ get_interface_state(router, name, http_get) เป็นฟังก์ชัน get_state", "return planning.plan_interface(router, desired_interface, get_state)"],
      ipo: { input: "router, desired_interface", process: "ส่งต่อให้ wrapper กลาง", output: "plan dict หรือ error", next: "planning.plan_interface()" },
      errors: ["error จากขั้นอ่านสถานะ"],
    },
    {
      id: "restconf.apply_interface", name: "restconf.apply_interface(router, desired_interface, http_put=None)", file: "app/backends/restconf.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "apply_interface(router, desired_interface, http_put=None)",
      summary: "เขียนค่า Loopback ทั้งก้อนด้วย HTTP PUT ไปที่ model Cisco-IOS-XE-native (แทนที่ resource ทั้งหมด)",
      trigger: "restconf + apply",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [{ label: "http_put(url, json=payload) หรือ requests จริง", type: "direct" }, { ref: "error_from_exception", type: "direct" }],
      steps: [
        "ตัดคำว่า Loopback ออกจากชื่อเพื่อได้เลข เช่น Loopback123 → 123",
        "URL .../Cisco-IOS-XE-native:native/interface/Loopback=123",
        "payload: name, description, ip.address.primary (address + mask จาก CIDR) และถ้า admin_state = down ใส่ \"shutdown\": [null]",
        "HTTP 200/201/204 → applied, 401/403 → authentication_failed, อื่น ๆ → backend_failed",
      ],
      ipo: { input: "router, desired_interface ครบ 4 ฟิลด์", process: "สร้าง payload native แล้ว PUT", output: "applied หรือ error", next: "กลับ dispatcher" },
      errors: ["authentication_failed", "connection_failed", "backend_failed (เช่น IP ซ้ำ router ปฏิเสธ)"],
      note: "PUT แทนที่ resource ทั้งก้อน จึง apply ซ้ำได้โดยไม่เกิดค่าซ้อน (idempotent)",
    },

    // ---------------- Part 3: NETCONF
    {
      id: "netconf.get_interface_state", name: "netconf.get_interface_state(router, interface_name, netconf_get_config=None)", file: "app/backends/netconf.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "get_interface_state(router, interface_name, netconf_get_config=None)",
      summary: "อ่านสถานะด้วย NETCONF get-config (subtree filter ของ ietf-interfaces) ผ่าน ncclient SSH port 830 แล้ว normalize",
      trigger: "netconf + status หรือขั้นอ่านสถานะของ netconf + plan",
      calledBy: [{ ref: "dispatch_request", type: "direct" }, { ref: "netconf.plan_interface", label: "ผ่าน planning.plan_interface", type: "injected" }],
      calls: [{ label: "netconf_get_config(router, filter_xml) หรือ ncclient จริง", type: "direct" }, { ref: "error_from_exception", type: "direct" }],
      steps: [
        "สร้าง subtree filter ที่มี <name> ของ interface",
        "ดึง XML จาก running config (ncclient: AuthenticationError → PermissionError, TransportError/Timeout/OSError → ConnectionError, RPCError → RuntimeError)",
        "parse XML หา <interface> ที่ชื่อตรง → found (enabled true/false → up/down, ip + netmask → CIDR)",
        "ไม่เจอ → not_found, XML ผิด → backend_failed",
      ],
      ipo: { input: "router, ชื่อ interface", process: "get-config + parse XML", output: "found / not_found / error", next: "กลับ dispatcher หรือ planning" },
      errors: ["authentication_failed", "connection_failed", "backend_failed"],
    },
    {
      id: "netconf.plan_interface", name: "netconf.plan_interface(router, desired_interface, netconf_get_config=None)", file: "app/backends/netconf.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "plan_interface(router, desired_interface, netconf_get_config=None)",
      summary: "วางแผนผ่าน NETCONF: ใช้ wrapper กลางเหมือน RESTCONF ต่างกันแค่ฟังก์ชันอ่านสถานะ",
      trigger: "netconf + plan",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [{ ref: "planning.plan_interface", type: "direct" }, { ref: "netconf.get_interface_state", type: "injected" }],
      steps: ["ห่อ netconf.get_interface_state เป็น get_state", "return planning.plan_interface(router, desired_interface, get_state)"],
      ipo: { input: "router, desired_interface", process: "ส่งต่อให้ wrapper กลาง", output: "plan dict หรือ error", next: "planning.plan_interface()" },
      errors: ["error จากขั้นอ่านสถานะ"],
    },
    {
      id: "netconf.apply_interface", name: "netconf.apply_interface(router, desired_interface, netconf_edit_config=None)", file: "app/backends/netconf.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "apply_interface(router, desired_interface, netconf_edit_config=None)",
      summary: "ส่ง edit-config (target running) ด้วย Cisco native Loopback แบบ nc:operation=\"replace\" โดยลบ address เดิมก่อนใน session เดียวกัน",
      trigger: "netconf + apply",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [{ label: "netconf_edit_config(router, config_xml) หรือ _real_edit_config (ncclient จริง)", type: "direct" }, { ref: "error_from_exception", type: "direct" }],
      steps: [
        "_build_apply_config(): แปลง ipv4 เป็น address + mask และ escape description",
        "admin_state = down → ใส่ <shutdown/>, up → ไม่ใส่",
        "_real_edit_config(): _config_loopback_number() อ่านเลข Loopback จาก XML ที่จะ apply",
        "เปิด NETCONF session เดียว แล้วส่ง edit-config ครั้งแรกด้วย REMOVE_ADDRESS_CONFIG (<address nc:operation=\"remove\"/>) ถ้าได้ RPCError ให้ข้าม เพราะ interface ใหม่ยังไม่มี address ให้ลบ",
        "ส่ง edit-config ครั้งที่สองด้วย config ที่ต้องการ (replace)",
        "ไม่มี exception → applied",
      ],
      ipo: { input: "router, desired_interface", process: "สร้าง XML native → ลบ address เดิม → edit-config replace", output: "applied หรือ error", next: "กลับ dispatcher" },
      errors: ["authentication_failed", "connection_failed", "backend_failed (RPCError ของ edit-config ครั้งที่สอง)"],
      note: "commit 12d7543: IOS-XE เก็บ primary address เดิมไว้เมื่อ address ใหม่มาทาง native model แม้ใช้ replace ก่อนแก้ apply ตอบ applied แต่ show running-config ยังเป็น IP เดิม ทั้งที่ RESTCONF / NETCONF อ่านจาก YANG datastore ได้ IP ใหม่ จึงลบ address ก่อนใน session เดียวกัน",
    },

    // ---------------- Part 3: Ansible
    {
      id: "ansible.apply_interface", name: "ansible.apply_interface(router, desired_interface, run_playbook=None)", file: "app/backends/ansible.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "apply_interface(router, desired_interface, run_playbook=None)",
      summary: "แปลง desired เป็นตัวแปร playbook แล้วรัน ansible-playbook กับ ansible/apply_interface.yml (apply อย่างเดียว)",
      trigger: "ansible + apply",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [
        { label: "_build_variables() → router, interface_name, description, ipv4_address, netmask, shutdown", type: "direct" },
        { label: "run_playbook(variables) หรือ subprocess ansible-playbook -i inventory.ini apply_interface.yml --extra-vars", type: "direct" },
        { ref: "error_from_exception", type: "direct" },
      ],
      steps: [
        "_build_variables: แยก ipv4 เป็น address + netmask, shutdown = (admin_state == \"down\")",
        "ตัวรันจริงตรวจว่าชื่อเป็น Loopback + เลข และ description ไม่มีขึ้นบรรทัดใหม่",
        "รัน ansible-playbook (timeout 120 วินาที) ส่งตัวแปรเป็น JSON ผ่าน --extra-vars",
        "return code 0 → applied, ข้อความ authentication / permission denied → authentication_failed, return code 4 หรือ unreachable / timed out → connection_failed, อื่น ๆ → backend_failed",
      ],
      ipo: { input: "router, desired_interface", process: "สร้างตัวแปร → รัน playbook", output: "applied หรือ error", next: "กลับ dispatcher" },
      errors: ["authentication_failed", "connection_failed", "backend_failed"],
      note: "ไม่ส่งค่า changed ของ Ansible ออกมา สำเร็จคือ applied เสมอ",
    },

    // ---------------- Part 3: Netmiko + TextFSM
    {
      id: "netmiko.get_interface_state", name: "netmiko_textfsm.get_interface_state(router, interface_name, netmiko_get=None)", file: "app/backends/netmiko_textfsm.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "get_interface_state(router, interface_name, netmiko_get=None)",
      summary: "อ่านสถานะด้วย SSH CLI (Netmiko) 2 คำสั่ง แล้ว parse ด้วย TextFSM ให้เป็นรูปแบบกลาง",
      trigger: "netmiko-textfsm + status",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [{ label: "netmiko_get(router, name) หรือ Netmiko จริง → (ip_info, descriptions)", type: "direct" }, { ref: "error_from_exception", type: "direct" }],
      steps: [
        "รัน show ip interface <name> และ show interfaces description แล้ว parse ด้วย NTC TextFSM template",
        "ถ้า IOS ตอบ Invalid input (ไม่มี interface) ถือว่า ip_info ว่าง",
        "หา record ที่ชื่อตรง โดยขยายชื่อย่อ Lo123 → Loopback123 ก่อนเทียบ",
        "ไม่เจอ → not_found, เจอ → ipv4 = address/prefix ตัวแรก, link_status = administratively down → down ไม่งั้น up, description จาก record ที่สอง",
      ],
      ipo: { input: "router, ชื่อ interface", process: "CLI show + TextFSM + normalize", output: "found / not_found / error", next: "กลับ dispatcher" },
      errors: ["authentication_failed (NetmikoAuthenticationException)", "connection_failed (timeout / SSH)", "backend_failed (parse ไม่ได้)"],
    },
    {
      id: "netmiko.delete_interface", name: "netmiko_textfsm.delete_interface(router, interface_name, netmiko_delete=None)", file: "app/backends/netmiko_textfsm.py", part: "P3", group: "backend",
      status: "done", runtime: true,
      signature: "delete_interface(router, interface_name, netmiko_delete=None)",
      summary: "ลบ Loopback ด้วยคำสั่ง IOS no interface <name> (backend เดียวที่รองรับ delete) โดยอ่านสถานะก่อนและหลังลบ",
      trigger: "netmiko-textfsm + delete",
      calledBy: [{ ref: "dispatch_request", type: "direct" }],
      calls: [{ label: "netmiko_delete(router, name) หรือ _real_delete", type: "direct" }, { ref: "error_from_exception", type: "direct" }],
      steps: [
        "_real_delete รับเฉพาะชื่อแบบ Loopback + เลข ไม่งั้น RuntimeError → backend_failed",
        "อ่านสถานะก่อน (ใช้ตัวอ่าน show ชุดเดียวกับ status) ถ้าไม่มี → \"not_found\"",
        "ถ้ามี → send_config_set([\"no interface <name>\"])",
        "อ่านซ้ำ ถ้ายังอยู่ → RuntimeError → backend_failed, ถ้าหายแล้ว → \"deleted\"",
        "แปลงผลเป็น {ok, deleted} หรือ {ok, not_found, interface: null}",
      ],
      ipo: { input: "router, ชื่อ interface", process: "ตรวจก่อน → ลบ → ตรวจยืนยัน", output: "deleted / not_found / error", next: "กลับ dispatcher" },
      errors: ["authentication_failed", "connection_failed", "backend_failed"],
      note: "ลบซ้ำได้ not_found ซึ่งไม่ใช่ error (idempotent delete)",
    },

    // ---------------- Part 3: common helper
    {
      id: "error_from_exception", name: "error_from_exception(exc)", file: "app/backends/common.py", part: "P3", group: "util",
      status: "done", runtime: true,
      signature: "error_from_exception(exc)",
      summary: "แปลง exception ให้เป็นรหัส error กลางของ backend ทั้ง 3 แบบ (helper ที่ทุก backend ใช้)",
      trigger: "เมื่อ transport / runner ของ backend raise exception",
      calledBy: [
        { ref: "restconf.get_interface_state", type: "direct" }, { ref: "restconf.apply_interface", type: "direct" },
        { ref: "netconf.get_interface_state", type: "direct" }, { ref: "netconf.apply_interface", type: "direct" },
        { ref: "ansible.apply_interface", type: "direct" },
        { ref: "netmiko.get_interface_state", type: "direct" }, { ref: "netmiko.delete_interface", type: "direct" },
      ],
      calls: [],
      steps: ["PermissionError → authentication_failed", "ConnectionError → connection_failed", "exception อื่นทั้งหมด → backend_failed"],
      ipo: { input: "exception", process: "เช็กชนิด", output: "{status: error, result: <code>}", next: "คืนกลับผ่าน backend → dispatcher" },
      errors: [],
      note: "แต่ละ backend แปลง exception ของ library จริง (requests, ncclient, Netmiko, Ansible) เป็น PermissionError / ConnectionError / RuntimeError ก่อน ในไฟล์เดียวกันมี helper found(), not_found(), error(), to_cidr(), split_ipv4(), loopback_number() และ router_credentials() ด้วย",
    },

    // ---------------- Part 4: deployment / webhook registration (scripts/update_webex_webhooks.py)
    {
      id: "registrar.watch", name: "update_webex_webhooks.watch(session, args)", file: "scripts/update_webex_webhooks.py", part: "P4", group: "deploy",
      status: "done", runtime: false,
      signature: "watch(session, args) เรียกจาก main() เมื่อสั่ง --watch",
      summary: "ลูปของ service registrar: ทุก 15 วินาทีอ่าน URL ของ tunnel ถ้าเปลี่ยนจากรอบก่อนจึงลงทะเบียน webhook ใหม่ ทำให้ tunnel restart แล้ว bot ไม่เงียบ",
      trigger: "compose.yaml service registrar สั่ง python scripts/update_webex_webhooks.py --watch",
      calledBy: [{ label: "compose.yaml: registrar command → main() --watch", type: "framework" }],
      calls: [
        { ref: "registrar.discover_tunnel_url", type: "direct" },
        { ref: "registrar.find_room_ids", type: "direct" },
        { ref: "registrar.sync_webhooks", type: "direct" },
      ],
      steps: [
        "main(): load_env_file() อ่าน .env โดยไม่ทับ environment จริง แล้วสร้าง requests.Session ที่มี Authorization: Bearer <WEBEX_BOT_TOKEN>",
        "watch(): last = None แล้ววนไม่จบ",
        "base_url = discover_tunnel_url(args)",
        "ได้ URL และต่างจาก last → sync_webhooks(session, base_url, find_room_ids(session)) แล้วจำ last = base_url",
        "ยังไม่ได้ URL → พิมพ์ \"waiting for the tunnel URL\"",
        "Webex API ล้ม (RequestException) → พิมพ์ \"webex call failed, will retry\" แล้วลองรอบถัดไป",
        "time.sleep(args.interval) ค่าเริ่มต้น POLL_SECONDS = 15",
      ],
      ipo: {
        input: "session ที่มี Bearer token, args (--url, --service, --interval)",
        process: "อ่าน URL → เทียบกับรอบก่อน → sync เมื่อเปลี่ยน",
        output: "ไม่มีค่าคืน (รันค้าง) พิมพ์ log created / updated / replaced / ok",
        next: "Webex ส่ง event ไปที่ <URL ใหม่>/webhook → tunnel → service webhook",
      },
      errors: [
        "ไม่มี WEBEX_BOT_TOKEN → SystemExit \"WEBEX_BOT_TOKEN is not set; put it in .env\"",
        "bot ไม่อยู่ในห้องที่ต้องการ → find_room_ids() SystemExit แล้ว restart: unless-stopped เริ่มใหม่",
      ],
      note: "ไม่อยู่ในเส้นทางของ event: registrar แค่บอก Webex ว่าให้ส่ง event ไปที่ URL ไหน ถ้าไม่ใช้ --watch สคริปต์จะ run_once() แล้วจบ (ใช้สั่งเองได้ เช่น --url https://xxx.trycloudflare.com)",
    },
    {
      id: "registrar.discover_tunnel_url", name: "update_webex_webhooks.discover_tunnel_url(args)", file: "scripts/update_webex_webhooks.py", part: "P4", group: "deploy",
      status: "done", runtime: false,
      signature: "discover_tunnel_url(args)",
      summary: "หา URL สาธารณะของ tunnel จากแหล่งที่เชื่อถือได้ที่สุดที่มี: --url → TUNNEL_URL → metrics ของ cloudflared → docker compose logs",
      trigger: "watch() ทุกรอบ หรือ run_once() ครั้งเดียว",
      calledBy: [{ ref: "registrar.watch", type: "direct" }],
      calls: [
        { label: "url_from_metrics(): GET {TUNNEL_METRICS_URL}/quicktunnel → hostname", type: "direct" },
        { label: "url_from_compose_logs(): docker compose logs tunnel แล้วหา https://*.trycloudflare.com", type: "direct" },
      ],
      steps: [
        "มี --url → ใช้ค่านั้น (ตัด / ท้ายออก)",
        "มี env TUNNEL_URL → ใช้ค่านั้น",
        "url_from_metrics(TUNNEL_METRICS_URL ค่าเริ่มต้น http://127.0.0.1:2000 ส่วนใน compose คือ http://tunnel:2000) อ่าน JSON field hostname แล้วเติม https://",
        "ไม่ได้ → url_from_compose_logs(\"tunnel\") หา URL ตัวล่าสุดใน log 800 บรรทัดด้วย TUNNEL_URL_PATTERN",
        "ไม่เจอทุกแหล่ง → None",
      ],
      ipo: {
        input: "args.url, env TUNNEL_URL / TUNNEL_METRICS_URL",
        process: "ลองแหล่ง URL ตามลำดับ",
        output: "base URL เช่น https://<สี่คำ>.trycloudflare.com (ไม่มี /webhook) หรือ None",
        next: "sync_webhooks() ต่อท้ายด้วย /webhook",
      },
      errors: ["metrics ต่อไม่ได้หรือ JSON ผิด → คืน None แล้วลองแหล่งถัดไป (ไม่ raise)"],
      note: "ใน container registrar ไม่มีคำสั่ง docker ทางที่ใช้ได้จริงคือ metrics endpoint ของ service tunnel ส่วน log fallback ใช้ตอนรันสคริปต์บนเครื่องตัวเอง",
    },
    {
      id: "registrar.find_room_ids", name: "update_webex_webhooks.find_room_ids(session)", file: "scripts/update_webex_webhooks.py", part: "P4", group: "deploy",
      status: "done", runtime: false,
      signature: "find_room_ids(session)",
      summary: "หา roomId ของห้อง IPA2026 และ IPA2026 Exam Room จากรายชื่อห้องที่ bot อยู่ เพื่อใช้เป็น filter ของ webhook",
      trigger: "ก่อน sync_webhooks() ทุกครั้งที่ URL เปลี่ยน",
      calledBy: [{ ref: "registrar.watch", type: "direct" }],
      calls: [{ label: "GET /v1/rooms?max=1000", type: "direct" }],
      steps: [
        "GET /v1/rooms แล้วสร้าง map title → id",
        "ROOM_TITLES = (\"IPA2026\", \"IPA2026 Exam Room\") ต้องมีครบทั้งสองห้อง",
        "ขาดห้องไหน → SystemExit \"the bot is not a member of: ...\" พร้อมรายชื่อห้องที่ bot เห็น",
        "คืน [(title, roomId), ...] ตามลำดับ ROOM_TITLES",
      ],
      ipo: {
        input: "session ที่มี Bearer token",
        process: "list rooms แล้วจับคู่ชื่อห้อง",
        output: "list ของ (ชื่อห้อง, roomId) 2 รายการ",
        next: "sync_webhooks(session, base_url, rooms)",
      },
      errors: ["bot ยังไม่ถูกเพิ่มเข้าห้อง → SystemExit พร้อมบอกว่าให้เพิ่ม bot ด้วย bot email"],
    },
    {
      id: "registrar.sync_webhooks", name: "update_webex_webhooks.sync_webhooks(session, base_url, rooms)", file: "scripts/update_webex_webhooks.py", part: "P4", group: "deploy",
      status: "done", runtime: false,
      signature: "sync_webhooks(session, base_url, rooms)",
      summary: "ทำให้มี webhook messages/created หนึ่งรายการต่อห้อง ที่ชี้ไปที่ <base_url>/webhook โดยสร้าง แก้ หรือสร้างใหม่ตามสถานะใน Webex",
      trigger: "watch() / run_once() ได้ URL ใหม่และ roomId แล้ว",
      calledBy: [{ ref: "registrar.watch", type: "direct" }],
      calls: [{ label: "GET / POST / PUT / DELETE /v1/webhooks", type: "direct" }],
      steps: [
        "target_url = base_url + \"/webhook\" และ GET /v1/webhooks แล้วจับคู่ด้วย name",
        "ชื่อ webhook = \"ipa2026-mentions <ชื่อห้อง>\" payload: targetUrl, resource messages, event created, filter roomId=<id>",
        "ยังไม่มี → POST สร้างใหม่ (log created)",
        "filter / resource / event ไม่ตรง → DELETE แล้ว POST ใหม่ เพราะ Webex แก้ filter ในที่เดิมไม่ได้ (log replaced)",
        "targetUrl ตรงและ status = active → ไม่ทำอะไร (log ok)",
        "นอกนั้น (URL เก่าหรือไม่ active) → PUT {name, targetUrl} ซึ่ง Webex บังคับให้ส่งคู่กัน (log updated)",
      ],
      ipo: {
        input: "session, base_url, rooms [(title, roomId)]",
        process: "เทียบ webhook ที่มีกับที่ต้องการ แล้วสร้าง / แก้ / แทนที่",
        output: "ไม่มีค่าคืน webhook ใน Webex ชี้ URL ปัจจุบันครบทั้งสองห้อง",
        next: "Webex ส่ง event ของทั้งสองห้องไปที่ /webhook → make_http_handler()",
      },
      errors: ["HTTP error จาก Webex → requests.HTTPError (ใน watch จะถูกจับแล้วลองใหม่รอบหน้า)"],
      note: "ใช้ชื่อเป็นตัวจับคู่ รันซ้ำกี่ครั้งก็ไม่สร้าง webhook ซ้ำ (idempotent)",
    },
  ],

  // ---------------------------------------------------------------- Files
  fileGroups: [
    { id: "entry", title: "Entry Point & Event Handling", desc: "จุดเริ่มโปรแกรม, HTTP server และการจัดการ Webex event", files: ["app/webhook_server.py"] },
    { id: "webex", title: "Webex Integration", desc: "เรียก Webex REST API", files: ["app/webex_client.py"] },
    { id: "integration", title: "Request Processing", desc: "รวมการตรวจและส่งคำขอไป backend", files: ["app/integration.py", "app/dispatcher.py"] },
    { id: "validation", title: "Validation (Part 1)", desc: "ตรวจ mention, ไฟล์แนบ และ YAML", files: ["app/request_handler.py", "app/core.py"] },
    { id: "planning", title: "Planning (Part 2)", desc: "เปรียบเทียบ desired / current", files: ["app/planner.py", "app/backends/planning.py"] },
    { id: "backend", title: "Router Backends (Part 3)", desc: "คุยกับ router ด้วยเทคโนโลยีต่าง ๆ", files: ["app/backends/restconf.py", "app/backends/netconf.py", "app/backends/ansible.py", "app/backends/netmiko_textfsm.py"] },
    { id: "util", title: "Utility & Error Handling", desc: "helper และการแปลง error ที่ใช้ร่วมกัน", files: ["app/backends/common.py"] },
    { id: "deploy", title: "Deployment & Webhook Registration", desc: "เปิด tunnel และลงทะเบียน webhook ให้ Webex ส่ง event มาถึง bot", files: ["scripts/update_webex_webhooks.py", "DEPLOYMENT.md"] },
    { id: "config", title: "Configuration", desc: "ไฟล์ตั้งค่าที่ไม่ใช่โค้ด Python", files: ["compose.yaml", ".env.example", "Dockerfile", "ansible/apply_interface.yml", "ansible/inventory.ini", "requirements.txt", ".github/workflows/student-ci.yaml"] },
    { id: "extra", title: "ส่วนเสริม (ไม่อยู่ใน runtime)", desc: "เอกสาร, tests และข้อมูลทดสอบ", files: ["specs/", "tests/", "sample-tests/", "scripts/check_webhook_image.py"] },
  ],

  files: {
    "app/webhook_server.py": {
      status: "done",
      role: "จุดเริ่มต้นของโปรแกรม (Dockerfile สั่ง python -m app.webhook_server) เปิด HTTP server รับ /health และ /webhook ส่ง event เข้าคิว 1 worker แล้วจัดการ Webex event และตอบกลับห้องเดิม",
      functions: ["main", "resolve_bot_person_id", "make_http_handler", "process_event", "handle_event"],
      uses: ["process_request (app/integration.py)", "WebexClient, WEBEX_API_BASE, REQUEST_TIMEOUT (app/webex_client.py)", "requests (GET /v1/people/me)", "ThreadPoolExecutor, ThreadingHTTPServer, BaseHTTPRequestHandler, TemporaryDirectory, logging (standard library)"],
      usedBy: ["Dockerfile CMD", "tests/test_part4_webhook.py", "scripts/check_webhook_image.py (ตรวจ /health และ /webhook ใน image)"],
      yaml: ["compose.yaml: WEBHOOK_HOST, WEBHOOK_PORT, healthcheck ที่เรียก /health, service ชื่อ webhook", "service tunnel ส่งต่อ HTTPS มาที่ http://webhook:8000"],
      order: ["main() → resolve_bot_person_id() → WebexEventHandler(...) → เปิด server", "make_http_handler(): POST /webhook → submit_event(event) → 200 accepted", "worker: process_event() → handle_event()", "handle_event() → get_message() → process_request() → send_message()"],
    },
    "app/webex_client.py": {
      status: "done",
      role: "wrapper ของ Webex REST API: ดึงข้อความ ดาวน์โหลดไฟล์ และส่งข้อความ ใช้ Bearer token และ timeout 10 วินาที",
      functions: ["WebexClient", "get_message", "download_file", "send_message"],
      uses: ["requests.Session", "environment WEBEX_BOT_TOKEN"],
      usedBy: ["app/webhook_server.py (main, resolve_bot_person_id, WebexEventHandler)", "tests/test_part4_webex_client.py"],
      yaml: ["compose.yaml: WEBEX_BOT_TOKEN"],
      order: ["WebexClient() ตอนเริ่มโปรแกรม", "get_message()", "download_file() (ถ้ามี 1 ไฟล์)", "send_message() ตอนจบ"],
    },
    "app/integration.py": {
      status: "done",
      role: "ประกอบ Part 1 กับ Part 3 เข้าด้วยกัน: ตรวจ envelope, อ่าน YAML, validate แล้ว dispatch",
      functions: ["process_request"],
      uses: ["validate_webex_envelope (request_handler.py)", "load_request_file, validate_request (core.py)", "dispatch_request (dispatcher.py)"],
      usedBy: ["WebexEventHandler (processor ค่าเริ่มต้น)", "tests/test_part4_integration.py"],
      yaml: ["อ่าน request YAML ผ่าน load_request_file()"],
      order: ["validate_webex_envelope", "load_request_file", "validate_request", "dispatch_request"],
    },
    "app/dispatcher.py": {
      status: "done",
      role: "ตาราง BACKENDS ที่จับคู่ (method, action) ทั้ง 9 คู่กับฟังก์ชัน backend และฟังก์ชันเรียกใช้",
      functions: ["dispatch_request"],
      uses: ["app/backends/restconf.py, netconf.py, ansible.py, netmiko_textfsm.py"],
      usedBy: ["process_request (integration.py)", "tests/test_part4_dispatcher.py"],
      yaml: ["ใช้ method, action, router, desired.interface จาก request YAML"],
      order: ["lookup BACKENDS", "เลือกรูปแบบ argument ตาม action", "เรียก backend"],
    },
    "app/request_handler.py": {
      status: "done",
      role: "ตรวจ Webex envelope (mention + ไฟล์แนบ) และฟังก์ชันรวมของ Part 1",
      functions: ["validate_webex_envelope", "handle_webex_request"],
      uses: ["process_request_file (core.py)"],
      usedBy: ["process_request (ใช้เฉพาะ validate_webex_envelope)", "tests/test_part1.py, tests/test_part1_mentions.py"],
      yaml: ["ไม่อ่าน YAML เอง ส่งต่อให้ core.py"],
      order: ["validate_webex_envelope", "(Part 1 เท่านั้น) process_request_file"],
    },
    "app/core.py": {
      status: "done",
      role: "อ่านและตรวจ request YAML มีค่าคงที่ ALLOWED_ROUTERS, SUPPORTED_ACTIONS (capability matrix) และ ADMIN_STATES",
      functions: ["load_request_file", "validate_request", "process_request_file"],
      uses: ["PyYAML yaml.safe_load"],
      usedBy: ["process_request (integration.py)", "handle_webex_request (request_handler.py)", "tests/test_part1.py"],
      yaml: ["อ่าน request YAML ที่แนบมาทุก key: version, router, method, action, desired.interface.*"],
      order: ["load_request_file", "validate_request"],
    },
    "app/planner.py": {
      status: "done",
      role: "ตรรกะวางแผนของ Part 2 ไม่ต่อ router และไม่ parse ผลดิบจาก backend",
      functions: ["build_plan"],
      uses: [],
      usedBy: ["app/backends/planning.py", "tests/test_part2.py (อ่าน sample-tests/part2)"],
      yaml: ["ใช้ desired.interface จาก request YAML (ipv4, description, admin_state)"],
      order: ["build_plan"],
    },
    "app/backends/planning.py": {
      status: "done",
      role: "wrapper ที่ RESTCONF และ NETCONF ใช้ร่วมกัน: อ่านสถานะแล้วให้ build_plan ตัดสิน",
      functions: ["planning.plan_interface"],
      uses: ["build_plan (planner.py)", "get_interface_state ที่ส่งเข้ามา"],
      usedBy: ["restconf.plan_interface", "netconf.plan_interface"],
      yaml: [],
      order: ["get_interface_state", "แปลง found/not_found เป็น current", "build_plan"],
    },
    "app/backends/restconf.py": {
      status: "done",
      role: "RESTCONF ผ่าน HTTPS + requests: อ่านด้วย ietf-interfaces, เขียนด้วย Cisco-IOS-XE-native PUT",
      functions: ["restconf.get_interface_state", "restconf.plan_interface", "restconf.apply_interface"],
      uses: ["planning.plan_interface", "common.py helpers", "requests (ใช้ ROUTER_USER/ROUTER_PASS)"],
      usedBy: ["dispatch_request"],
      yaml: ["router → host ใน URL, name → interface/Loopback number, ipv4/description/admin_state → payload"],
      order: ["get_interface_state", "plan_interface", "apply_interface"],
    },
    "app/backends/netconf.py": {
      status: "done",
      role: "NETCONF ผ่าน ncclient (SSH port 830): get-config ietf-interfaces, edit-config native replace",
      functions: ["netconf.get_interface_state", "netconf.plan_interface", "netconf.apply_interface"],
      uses: ["planning.plan_interface", "common.py helpers", "ncclient (ใช้ ROUTER_USER/ROUTER_PASS)"],
      usedBy: ["dispatch_request"],
      yaml: ["router → host, name → filter/Loopback name, ipv4/description/admin_state → XML"],
      order: ["get_interface_state", "plan_interface", "apply_interface"],
    },
    "app/backends/ansible.py": {
      status: "done",
      role: "รัน ansible-playbook สำหรับ apply อย่างเดียว",
      functions: ["ansible.apply_interface"],
      uses: ["ansible/apply_interface.yml", "ansible/inventory.ini", "common.split_ipv4, error_from_exception"],
      usedBy: ["dispatch_request"],
      yaml: ["ansible/apply_interface.yml: ใช้ตัวแปรที่ไฟล์นี้สร้าง", "ansible/inventory.ini: ansible_host = router, credentials จาก env"],
      order: ["_build_variables", "run_playbook / _real_run_playbook"],
    },
    "app/backends/netmiko_textfsm.py": {
      status: "done",
      role: "SSH CLI ด้วย Netmiko + parse ด้วย TextFSM สำหรับ status และ delete",
      functions: ["netmiko.get_interface_state", "netmiko.delete_interface"],
      uses: ["netmiko ConnectHandler (device_type cisco_xe)", "ntc-templates", "common.py helpers"],
      usedBy: ["dispatch_request"],
      yaml: ["router → host, name → คำสั่ง show / no interface"],
      order: ["get_interface_state", "delete_interface (อ่าน → ลบ → อ่านยืนยัน)"],
    },
    "app/backends/common.py": {
      status: "done",
      role: "helper กลาง: error(), error_from_exception(), found(), not_found(), to_cidr(), split_ipv4(), loopback_number(), router_credentials()",
      functions: ["error_from_exception"],
      uses: ["ipaddress.IPv4Interface", "environment ROUTER_USER, ROUTER_PASS"],
      usedBy: ["ทุกไฟล์ใน app/backends/"],
      yaml: ["compose.yaml: ROUTER_USER, ROUTER_PASS → router_credentials()"],
      order: ["ถูกเรียกเป็น helper ไม่มีลำดับของตัวเอง"],
    },
    "compose.yaml": { status: "config", role: "เปิด 3 service: webhook (bot, มี health check), tunnel (cloudflared Quick Tunnel) และ registrar (คอยแก้ webhook ใน Webex ให้ตรง URL ของ tunnel)", functions: [], uses: ["Dockerfile", ".env", "scripts/update_webex_webhooks.py (mount เป็น volume ให้ registrar)"], usedBy: ["docker compose up -d --build", "Student CI (docker compose build webhook)"], yaml: ["ดูหน้า YAML Configuration"], order: ["webhook", "tunnel (depends_on webhook)", "registrar (depends_on tunnel)"], yamlId: "compose" },
    ".env.example": { status: "config", role: "แม่แบบของ .env: WEBEX_BOT_TOKEN, ROUTER_USER, ROUTER_PASS และพอร์ตที่ไม่บังคับ (HOST_PORT, METRICS_PORT) ให้ copy เป็น .env แล้วเติมค่า ห้าม commit .env", functions: [], uses: [], usedBy: ["compose.yaml (อ่าน .env)", "load_env_file() ใน scripts/update_webex_webhooks.py"], yaml: ["ค่าทุกตัวถูกส่งเข้า container ผ่าน environment ของ compose.yaml"], order: [], yamlId: "compose" },
    "scripts/update_webex_webhooks.py": {
      status: "done",
      role: "สคริปต์ลงทะเบียน webhook: หา URL ของ tunnel และ roomId ของสองห้อง แล้วสร้างหรือแก้ webhook messages/created ใน Webex รันเองครั้งเดียว หรือรันค้างด้วย --watch (service registrar)",
      functions: ["registrar.watch", "registrar.discover_tunnel_url", "registrar.find_room_ids", "registrar.sync_webhooks"],
      uses: ["requests.Session (Bearer WEBEX_BOT_TOKEN)", "metrics endpoint ของ cloudflared /quicktunnel", "docker compose logs (fallback)"],
      usedBy: ["compose.yaml service registrar", "รันเองตาม DEPLOYMENT.md"],
      yaml: ["compose.yaml: registrar ส่ง WEBEX_BOT_TOKEN และ TUNNEL_METRICS_URL=http://tunnel:2000", "ไม่ได้ COPY เข้า image แต่ mount ./scripts เป็น volume"],
      order: ["main(): load_env_file → session", "watch() / run_once()", "discover_tunnel_url()", "find_room_ids()", "sync_webhooks()"],
    },
    "DEPLOYMENT.md": { status: "extra", role: "เอกสารวิธี deploy: เตรียม .env, เพิ่ม bot เข้าสองห้อง, docker compose up, ตรวจ log ทีละ service, พฤติกรรมของ registrar และวิธีแก้ปัญหา", functions: [], uses: ["compose.yaml", "scripts/update_webex_webhooks.py"], usedBy: ["ผู้รัน bot (ตาม spec: documented way to update registration)"], yaml: [], order: ["เตรียม .env", "docker compose up -d --build", "ตรวจ /health และ log", "tunnel restart → registrar แก้ URL เอง"] },
    "Dockerfile": { status: "config", role: "image python:3.12-slim ติดตั้ง requirements, คัดลอก app/ และ ansible/ แล้วสั่ง CMD python -m app.webhook_server", functions: [], uses: ["requirements.txt", "app/", "ansible/"], usedBy: ["compose.yaml"], yaml: [], order: [], yamlId: "dockerfile" },
    "ansible/apply_interface.yml": { status: "config", role: "playbook ที่ตั้งค่า Loopback ด้วย cisco.ios.ios_config", functions: [], uses: ["ansible/inventory.ini"], usedBy: ["ansible.apply_interface (subprocess ansible-playbook)"], yaml: ["ดูหน้า YAML Configuration"], order: [], yamlId: "ansible" },
    "ansible/inventory.ini": { status: "config", role: "inventory ของ Ansible: host = ตัวแปร router, user/pass จาก env, เชื่อมแบบ network_cli", functions: [], uses: [], usedBy: ["ansible.apply_interface"], yaml: [], order: [], yamlId: "ansible" },
    "requirements.txt": { status: "config", role: "Python packages: PyYAML, pytest, ncclient, paramiko, ansible, netmiko, textfsm, ntc-templates, requests", functions: [], uses: [], usedBy: ["Dockerfile", "Student CI"], yaml: [], order: [], yamlId: "requirements" },
    ".github/workflows/student-ci.yaml": { status: "config", role: "GitHub Actions ที่รัน public tests, build image และตรวจ HTTP ใน image เมื่อ push main", functions: [], uses: ["requirements.txt", "compose.yaml", "scripts/check_webhook_image.py"], usedBy: ["GitHub Actions", "คำสั่ง verify ของ IPA2026-Reference"], yaml: ["ดูหน้า YAML Configuration"], order: [], yamlId: "ci" },
    "specs/": { status: "extra", role: "ข้อกำหนดภาษาอังกฤษที่ใช้ตรวจจริง (specs-th/ เป็นฉบับแปล ถ้าความหมายต่างให้ยึด specs/)", functions: [], uses: [], usedBy: [], yaml: [], order: [] },
    "tests/": { status: "extra", role: "pytest ของผู้สอน ไม่ควรแก้ ใช้ fake transport จึงไม่ต้องมี router หรือ token", functions: [], uses: ["sample-tests/"], usedBy: ["Student CI"], yaml: ["อ่าน sample-tests/*/cases และ fixtures"], order: [] },
    "sample-tests/": { status: "extra", role: "cases/fixtures ที่ pytest อ่าน และชุด YAML ที่ส่งเองผ่าน Webex (webex-manual/ เป็นแม่แบบ, webex-manual/ready/ คือฉบับที่กรอกค่าแล้ว, part4/live/)", functions: [], uses: [], usedBy: ["tests/test_part1.py, test_part2.py, test_part3_*.py"], yaml: ["ดูหน้า YAML Configuration"], order: [], yamlId: "samples" },
    "scripts/check_webhook_image.py": { status: "extra", role: "ตรวจใน image ที่ build แล้วว่า import ได้และ /health กับ /webhook ตอบถูก โดยไม่ใช้ token", functions: [], uses: ["make_http_handler"], usedBy: ["Student CI"], yaml: [], order: [] },
  },

  // ---------------------------------------------------------------- YAML / config
  yaml: [
    {
      id: "request",
      title: "Request YAML (ไฟล์ที่แนบมากับ @mention)",
      path: "sample-tests/webex-manual/*.yaml, sample-tests/webex-manual/ready/*.yaml, sample-tests/part4/live/*.yaml",
      sourceFile: "sample-tests/webex-manual/05-apply-create.yaml",
      extraSources: ["sample-tests/webex-manual/ready/05-apply-create.yaml", "sample-tests/webex-manual/03-status-not-found.yaml", "sample-tests/webex-manual/09-delete.yaml", "sample-tests/webex-manual/02-invalid-yaml.yaml"],
      purpose: "คำขอหนึ่งรายการที่สมบูรณ์ในตัวเอง (stateless) บอกว่าทำอะไร กับ router ไหน ด้วยวิธีใด และอยากให้ interface เป็นอย่างไร เป็น YAML ที่สำคัญที่สุดของโปรเจกต์",
      readBy: "WebexClient.download_file() → ไฟล์ชั่วคราว → core.load_request_file() (yaml.safe_load) → core.validate_request() → dispatcher.dispatch_request() → backend",
      chain: ["ไฟล์แนบใน Webex", "download_file()", "load_request_file()", "validate_request()", "dispatch_request()", "backend → router"],
      keys: [
        { key: "version", rule: "ต้องเป็น integer 1", usedBy: "validate_request()", effect: "ตรวจเป็นอันดับแรก ผิด → invalid_version (\"1\", 1.0, true ก็ผิด)" },
        { key: "router", rule: "ต้องเป็นหนึ่งใน 10.0.29.101–10.0.29.105", usedBy: "validate_request() → dispatch_request() → ทุก backend", effect: "เป็น host ของ URL RESTCONF, host ของ ncclient / Netmiko และตัวแปร router ของ Ansible ไม่มี → missing_router, ไม่อยู่ในรายการ → invalid_router" },
        { key: "method", rule: "restconf / netconf / ansible / netmiko-textfsm", usedBy: "validate_request() (SUPPORTED_ACTIONS), dispatch_request() (BACKENDS)", effect: "เลือก backend module ที่จะใช้คุยกับ router ไม่มี → missing_method, ไม่รู้จัก → invalid_method" },
        { key: "action", rule: "status / plan / apply / delete ที่ method นั้นรองรับ", usedBy: "validate_request(), dispatch_request()", effect: "เลือกฟังก์ชัน backend และรูปแบบ argument (status/delete ส่งแค่ name, plan/apply ส่ง interface ทั้ง dict) ไม่รองรับ → invalid_action" },
        { key: "desired", rule: "ต้องเป็น mapping", usedBy: "validate_request()", effect: "ไม่มีหรือไม่ใช่ mapping → missing_desired" },
        { key: "desired.interface", rule: "ต้องเป็น mapping", usedBy: "validate_request(), dispatch_request()", effect: "ส่งทั้ง dict เป็น desired_interface ให้ plan_interface / apply_interface ไม่มี → missing_interface" },
        { key: "desired.interface.name", rule: "จำเป็นทุก action เช่น Loopback66070123", usedBy: "ทุก backend", effect: "ใช้ระบุ interface: status/delete ใช้เป็น interface_name, apply ตัดเป็นเลข Loopback (RESTCONF URL, NETCONF <name>) หรือ interface_name ของ Ansible ไม่มี → missing_interface_name" },
        { key: "desired.interface.ipv4", rule: "CIDR เช่น 172.23.123.1/32 จำเป็นเฉพาะ plan/apply", usedBy: "build_plan(), apply_interface() ทุก backend", effect: "apply แยกเป็น address + mask ด้วย split_ipv4() ส่วน plan ใช้เทียบกับค่าปัจจุบัน ไม่มี → missing_ipv4" },
        { key: "desired.interface.description", rule: "ข้อความ จำเป็นเฉพาะ plan/apply", usedBy: "build_plan(), apply_interface()", effect: "เขียนลง router และใช้เทียบใน plan ไม่มี → missing_description" },
        { key: "desired.interface.admin_state", rule: "up หรือ down จำเป็นเฉพาะ plan/apply", usedBy: "validate_request(), build_plan(), apply_interface()", effect: "down → shutdown (RESTCONF \"shutdown\": [null], NETCONF <shutdown/>, Ansible shutdown) ส่วน up → ไม่ shutdown ไม่มี → missing_admin_state, ค่าอื่น → invalid_admin_state" },
      ],
      notes: [
        "status ต้องการแค่ name ถ้าใส่ ipv4 / description / admin_state มาจะถูกละเลย และไม่ใช้ตรวจ",
        "delete ต้องการแค่ name",
        "ตรวจตามลำดับและคืน error ตัวแรกเท่านั้น เช่น version ผิดและไม่มี router → invalid_version",
        "webex-manual/*.yaml เป็นแม่แบบที่มี <assigned-router-ip> ส่วน webex-manual/ready/ คือข้อ 2–10 ที่กรอกแล้ว: router 10.0.29.104, Loopback67070109, 172.23.109.1/32 ใช้ค่าเดียวกันทุกไฟล์เพื่อให้ผลต่อเนื่องกัน",
      ],
    },
    {
      id: "compose",
      title: "compose.yaml",
      path: "compose.yaml",
      sourceFile: "compose.yaml",
      extraSources: [".env.example"],
      purpose: "บอก Docker Compose ให้รัน 3 service: webhook (bot), tunnel (เปิด HTTPS สาธารณะเข้ามาที่ webhook) และ registrar (คอยแก้ webhook ใน Webex ให้ชี้ URL ปัจจุบันของ tunnel) และเป็นจุดที่ใส่ environment เข้า container",
      readBy: "Docker Compose (ไม่ใช่ Python) ค่าที่ได้จะกลายเป็น environment variable ที่ Python อ่านด้วย os.environ",
      chain: ["compose.yaml / .env", "environment ของแต่ละ container", "main() / WebexClient / router_credentials() / registrar", "Webex API, tunnel และ router"],
      keys: [
        { key: "services.webhook", rule: "ต้องชื่อ webhook", usedBy: "Student CI, check_webhook_image.py, ผู้ตรวจ", effect: "ถ้าเปลี่ยนชื่อ คำสั่ง docker compose build webhook และการตรวจ image จะหา service ไม่เจอ" },
        { key: "build.context / build.dockerfile", rule: ". และ Dockerfile", usedBy: "Docker", effect: "build image จาก Dockerfile ที่ root" },
        { key: "environment.WEBEX_BOT_TOKEN", rule: "${WEBEX_BOT_TOKEN:-} จาก shell หรือ .env", usedBy: "WebexClient.__init__ (os.environ.get)", effect: "ว่าง → WebexClient raise PermissionError, bot ดึงข้อความและตอบไม่ได้" },
        { key: "environment.ROUTER_USER / ROUTER_PASS", rule: "จาก shell หรือ .env", usedBy: "common.router_credentials() (RESTCONF, NETCONF, Netmiko) และ ansible/inventory.ini", effect: "ผิด → backend ตอบ authentication_failed" },
        { key: "environment.WEBHOOK_HOST / WEBHOOK_PORT", rule: "0.0.0.0 และ 8000", usedBy: "main() (os.environ.get)", effect: "server ต้อง bind 0.0.0.0 ใน container เพื่อให้ tunnel และ healthcheck ต่อเข้ามาได้" },
        { key: "ports", rule: "127.0.0.1:${HOST_PORT:-8000}:8000", usedBy: "Docker", effect: "เปิดพอร์ตให้เครื่อง host เท่านั้น (ใช้ curl http://127.0.0.1:8000/health) ส่วน tunnel ต่อผ่าน network ของ compose ที่ http://webhook:8000" },
        { key: "restart", rule: "unless-stopped", usedBy: "Docker", effect: "container ล้มแล้วเริ่มใหม่เอง เช่น token ผิดจน main() หยุดตอนเริ่ม ใช้ค่านี้กับทั้ง 3 service" },
        { key: "healthcheck", rule: "python urllib เรียก http://127.0.0.1:8000/health ทุก 30s, timeout 10s, retries 3, start_period 30s", usedBy: "Docker, ตอบโดย make_http_handler()", effect: "/health ต้องตอบ 200 ไม่งั้น container ถูกมองว่า unhealthy (docker compose ps ต้องเห็น healthy)" },
        { key: "services.tunnel.image", rule: "cloudflare/cloudflared:2026.10.4", usedBy: "Docker", effect: "ล็อกเวอร์ชันไว้ (commit 2310a18) ไม่ต้องติดตั้ง cloudflared บนเครื่อง" },
        { key: "services.tunnel.command", rule: "tunnel --no-autoupdate --metrics 0.0.0.0:2000 --url http://webhook:8000", usedBy: "cloudflared", effect: "Quick Tunnel: ได้ URL https://<สี่คำ>.trycloudflare.com ที่ส่งต่อมาที่ service webhook ไม่ต้องมีบัญชี Cloudflare แต่ hostname เปลี่ยนทุกครั้งที่ restart ส่วน --metrics เปิด /quicktunnel ให้อ่าน hostname ได้" },
        { key: "services.tunnel.ports", rule: "127.0.0.1:${METRICS_PORT:-2000}:2000", usedBy: "url_from_metrics() เมื่อรันสคริปต์บนเครื่อง host", effect: "เปิด metrics ให้เครื่องตัวเองเท่านั้น" },
        { key: "depends_on", rule: "tunnel → webhook, registrar → tunnel", usedBy: "Docker", effect: "ลำดับการเริ่ม: webhook ก่อน แล้ว tunnel แล้ว registrar" },
        { key: "services.registrar.command", rule: "[\"python\", \"scripts/update_webex_webhooks.py\", \"--watch\"]", usedBy: "registrar.watch()", effect: "ใช้ image เดียวกับ webhook แต่รันสคริปต์ลงทะเบียนแบบวนทุก 15 วินาที" },
        { key: "services.registrar.environment.TUNNEL_METRICS_URL", rule: "http://tunnel:2000", usedBy: "discover_tunnel_url() → url_from_metrics()", effect: "registrar ถาม hostname จาก service tunnel ผ่าน network ของ compose" },
        { key: "services.registrar.volumes", rule: "./scripts:/opt/ipa2026/scripts:ro", usedBy: "Docker", effect: "Dockerfile COPY แค่ app/ และ ansible/ จึงต้อง mount scripts/ เข้าไป แก้สคริปต์แล้ว restart registrar พอ ไม่ต้อง build ใหม่" },
      ],
      notes: [
        "ห้ามใส่ token หรือรหัสผ่านลงใน repo ให้เก็บใน environment หรือ .env (ซึ่งอยู่ใน .gitignore แล้ว) โดย copy จาก .env.example",
        "spec ห้ามเปลี่ยนชื่อหรือ override command ของ service webhook ส่วน registrar เป็นคนละ service จึงเปลี่ยน command ได้",
        "แก้โค้ดใน app/ ต้อง docker compose up -d --build ใหม่ เพราะ image ใช้ COPY ไม่ใช่ volume",
      ],
    },
    {
      id: "ansible",
      title: "ansible/apply_interface.yml + inventory.ini",
      path: "ansible/apply_interface.yml, ansible/inventory.ini",
      sourceFile: "ansible/apply_interface.yml",
      extraSources: ["ansible/inventory.ini"],
      purpose: "playbook ที่ backend ansible ใช้ตั้งค่า Loopback บน router ผ่าน Cisco IOS CLI",
      readBy: "ansible.apply_interface() → _real_run_playbook() → subprocess: ansible-playbook -i ansible/inventory.ini ansible/apply_interface.yml --extra-vars '<JSON>'",
      chain: ["desired.interface ใน request YAML", "_build_variables()", "--extra-vars", "apply_interface.yml + inventory.ini", "router"],
      keys: [
        { key: "hosts: routers", rule: "กลุ่ม [routers] ใน inventory มี host ชื่อ target", usedBy: "ansible-playbook", effect: "รันกับ host เดียวคือ target" },
        { key: "gather_facts: false", rule: "", usedBy: "ansible-playbook", effect: "ไม่เก็บ facts ของอุปกรณ์ จึงเร็วขึ้น" },
        { key: "cisco.ios.ios_config.parents", rule: "interface {{ interface_name }}", usedBy: "ตัวแปร interface_name จาก _build_variables()", effect: "เข้าโหมด config ของ Loopback ที่ต้องการ" },
        { key: "lines", rule: "description / ip address / shutdown หรือ no shutdown", usedBy: "ตัวแปร description, ipv4_address, netmask, shutdown", effect: "คำสั่ง IOS ที่ทำให้ interface ตรงกับ desired" },
        { key: "defaults: true", rule: "", usedBy: "ios_config", effect: "เทียบรวมคำสั่ง default ของ IOS ด้วย apply ซ้ำจึงได้ changed=0 (idempotent)" },
        { key: "inventory: ansible_host={{ router }}", rule: "", usedBy: "ตัวแปร router จาก --extra-vars", effect: "ต่อไปที่ router ที่ระบุใน request YAML" },
        { key: "inventory: ansible_user / ansible_password", rule: "lookup env ROUTER_USER / ROUTER_PASS", usedBy: "environment จาก compose.yaml", effect: "ผิด → playbook ล้มด้วยข้อความ authentication → authentication_failed" },
        { key: "inventory: ansible_connection / network_os / ssh_type", rule: "network_cli, cisco.ios.ios, paramiko", usedBy: "Ansible", effect: "คุยกับ router ผ่าน SSH CLI" },
        { key: "inventory: connect_timeout / command_timeout", rule: "10 / 30 วินาที", usedBy: "Ansible", effect: "เกินเวลา → unreachable / timed out → connection_failed" },
      ],
      notes: ["Dockerfile คัดลอกโฟลเดอร์ ansible/ เข้า image เพราะ backend ต้องใช้ไฟล์นี้ตอน runtime"],
    },
    {
      id: "ci",
      title: ".github/workflows/student-ci.yaml",
      path: ".github/workflows/student-ci.yaml",
      sourceFile: ".github/workflows/student-ci.yaml",
      purpose: "GitHub Actions ที่ตรวจงานทุกครั้งที่ push main: tests → build image → ตรวจ HTTP ใน image",
      readBy: "GitHub Actions (คำสั่ง verify ของผู้สอนดูผลของ workflow นี้ที่ SHA ล่าสุด)",
      chain: ["push main", "Run public tests", "Build webhook image", "Check webhook inside built image"],
      keys: [
        { key: "on.push.branches: main / workflow_dispatch", rule: "", usedBy: "GitHub", effect: "รันเมื่อ push main หรือกดรันเอง" },
        { key: "concurrency", rule: "cancel-in-progress: true", usedBy: "GitHub", effect: "push ใหม่จะยกเลิก run เก่าของ branch เดียวกัน" },
        { key: "jobs.test-and-build.timeout-minutes", rule: "10", usedBy: "GitHub", effect: "ทั้ง job ต้องจบใน 10 นาที" },
        { key: "Run public tests", rule: "timeout 120s python -m pytest -q tests", usedBy: "tests/", effect: "ถ้าไม่ผ่าน ขั้นถัดไปถูกข้าม" },
        { key: "Build webhook image", rule: "timeout 90s docker compose build webhook", usedBy: "compose.yaml, Dockerfile", effect: "ต้องมี service ชื่อ webhook" },
        { key: "Check webhook inside built image", rule: "timeout 35s python scripts/check_webhook_image.py", usedBy: "make_http_handler() ใน image", effect: "ตรวจ /health และ /webhook โดยไม่ใช้ token" },
      ],
      notes: ["ณ commit 12d7543: pytest ในเครื่องผ่านครบ 91 ข้อ (ที่ 1e0b242 เคยไม่ผ่าน 9 ข้อใน tests/test_part4_webhook.py เพราะ webhook_server.py ยังเป็น stub)"],
    },
    {
      id: "samples",
      title: "sample-tests: cases + fixtures (ข้อมูลทดสอบ)",
      path: "sample-tests/part*/cases/*.yaml, sample-tests/part*/fixtures/*.yaml",
      sourceFile: "sample-tests/part1/cases/06-valid-handler.yaml",
      extraSources: ["sample-tests/part1/fixtures/01-valid.yaml", "sample-tests/part2/cases/02-update-one-field.yaml", "sample-tests/part2/fixtures/02-update-one-field.yaml"],
      purpose: "ส่วนเสริม ไม่อยู่ใน runtime ของ bot: case บอก input และผลที่คาดหวัง ส่วน fixture เก็บข้อมูลที่ case ใช้ pytest ค้นหา cases/*.yaml อัตโนมัติ",
      readBy: "tests/test_part1.py, tests/test_part2.py, tests/test_part3_*.py",
      chain: ["cases/*.yaml", "tests/*.py", "ฟังก์ชันใน app/", "เทียบกับ expected"],
      keys: [
        { key: "target (Part 1)", rule: "core หรือ handler", usedBy: "tests/test_part1.py", effect: "core → process_request_file(), handler → handle_webex_request()" },
        { key: "request / attachment", rule: "ชื่อไฟล์ใน fixtures/", usedBy: "tests", effect: "attachment: null จำลองข้อความที่ไม่แนบไฟล์ → no_yaml" },
        { key: "mentioned_people / bot_person_id", rule: "", usedBy: "tests/test_part1.py", effect: "จำลอง mention metadata ของ Webex" },
        { key: "fixture (Part 2): desired / current", rule: "", usedBy: "tests/test_part2.py → build_plan()", effect: "current ที่ normalize แล้วสำหรับทดสอบ plan" },
        { key: "expected", rule: "", usedBy: "ทุก test", effect: "ผลที่ฟังก์ชันต้องคืน" },
      ],
      notes: ["sample-tests/webex-manual/ และ part4/live/ เป็น YAML สำหรับส่งเองผ่าน Webex pytest ไม่ได้อ่าน", "เพิ่ม case + fixture ของตัวเองได้โดยไม่ต้องแก้ tests/"],
    },
  ],

  envVars: [
    { name: "WEBEX_BOT_TOKEN", from: "compose.yaml ← shell / .env", usedBy: "WebexClient.__init__ → headers (Bearer) และ registrar (read_token)", ifWrong: "ไม่มี → PermissionError (webhook) / SystemExit (registrar), ผิด → GET /v1/people/me ได้ 401 ตั้งแต่ main() เริ่ม" },
    { name: "ROUTER_USER, ROUTER_PASS", from: "compose.yaml ← shell / .env", usedBy: "common.router_credentials() (RESTCONF, NETCONF, Netmiko) และ ansible/inventory.ini", ifWrong: "authentication_failed" },
    { name: "WEBHOOK_HOST, WEBHOOK_PORT", from: "Dockerfile ENV และ compose.yaml", usedBy: "main() (ค่าเริ่มต้น 0.0.0.0 และ 8000)", ifWrong: "server ไม่ bind 0.0.0.0:8000 → health check และ tunnel ต่อไม่ได้" },
    { name: "HOST_PORT", from: "shell / .env (ค่าเริ่มต้น 8000)", usedBy: "compose.yaml ports ของ webhook", ifWrong: "พอร์ตฝั่งเครื่อง host เปลี่ยน ต้อง curl ไปที่พอร์ตใหม่ (tunnel ไม่กระทบเพราะต่อ webhook:8000 ใน network ของ compose)" },
    { name: "METRICS_PORT", from: "shell / .env (ค่าเริ่มต้น 2000)", usedBy: "compose.yaml ports ของ tunnel", ifWrong: "สคริปต์ที่รันบนเครื่อง host อ่าน metrics ที่ 127.0.0.1:2000 ไม่เจอ ต้องตั้ง TUNNEL_METRICS_URL ให้ตรง" },
    { name: "TUNNEL_METRICS_URL", from: "compose.yaml (registrar) = http://tunnel:2000", usedBy: "discover_tunnel_url() → url_from_metrics()", ifWrong: "หา URL ไม่ได้ → registrar พิมพ์ waiting for the tunnel URL" },
    { name: "TUNNEL_URL", from: "ตั้งเองเมื่อต้องการ (ไม่บังคับ)", usedBy: "discover_tunnel_url() ลำดับที่ 2 รองจาก --url", ifWrong: "URL เก่าค้างอยู่ → webhook ชี้ผิดที่ bot เงียบ" },
  ],

  // ---------------------------------------------------------------- Diagrams (Mermaid)
  // nodeMap: Mermaid node id → function id (string) or several function ids (array)
  diagrams: [
    {
      id: "main",
      title: "Function Call Flow ทั้งระบบ",
      desc: "ตั้งแต่ผู้ใช้ @mention จนได้คำตอบ กดที่กล่องฟังก์ชันเพื่อดูรายละเอียด",
      def: `flowchart TD
  U(["ผู้ใช้ @mention bot + แนบ YAML"]) --> WX["Webex สร้าง event<br/>messages/created"]
  WX -->|"POST ไปที่ targetUrl ที่ลงทะเบียนไว้"| TN["tunnel (cloudflared)<br/>https://….trycloudflare.com<br/>→ http://webhook:8000"]
  TN --> HTTP["make_http_handler()<br/>do_POST /webhook"]
  HTTP --> C1{"body เป็น<br/>JSON object?"}
  C1 -->|ไม่| R400[/"HTTP 400 invalid_event"/]
  C1 -->|ใช่| SUB["submit_event(event)<br/>executor.submit()"]
  SUB --> ACK[/"HTTP 200 accepted ทันที"/]
  SUB --> PE["process_event()<br/>worker 1 ตัว ทำทีละงาน"]
  PE --> HE["WebexEventHandler.handle_event()<br/>webhook_server.py"]
  HE --> C2{"messages/created<br/>และไม่ใช่ข้อความของ bot?"}
  C2 -->|ไม่| IGN[/"ignore: return None ไม่ตอบ"/]
  C2 -->|ใช่| GM["WebexClient.get_message()<br/>webex_client.py"]
  GM --> C3{"จำนวนไฟล์แนบ"}
  C3 -->|"มากกว่า 1"| MA[/"multiple_attachments ↩"/]
  C3 -->|"1 ไฟล์"| DL["WebexClient.download_file()<br/>เขียนไฟล์ YAML ชั่วคราว"]
  C3 -->|"0 ไฟล์ path=None"| PR
  DL --> PR["process_request()<br/>integration.py"]
  PR --> VE["validate_webex_envelope()<br/>request_handler.py"]
  VE --> C4{"personId ของ bot<br/>อยู่ใน mentionedPeople?"}
  C4 -->|ไม่| MBM[/"missing_bot_mention ↩"/]
  C4 -->|ใช่| C5{"มีไฟล์แนบ?"}
  C5 -->|ไม่มี| NY[/"no_yaml ↩"/]
  C5 -->|มี| LR["load_request_file()<br/>core.py"]
  LR --> C6{"parse YAML ได้?"}
  C6 -->|ไม่ได้| IY[/"invalid_yaml ↩"/]
  C6 -->|ได้| VR["validate_request()<br/>core.py"]
  VR --> C7{"ผ่านทุกข้อ?"}
  C7 -->|ไม่ผ่าน| VERR[/"error ตัวแรก เช่น<br/>invalid_version,<br/>invalid_action ↩"/]
  C7 -->|accepted| DR["dispatch_request()<br/>dispatcher.py"]
  DR --> C8{"method<br/>+ action"}
  C8 -->|status| GS["get_interface_state()<br/>restconf · netconf<br/>· netmiko_textfsm"]
  C8 -->|plan| PL["plan_interface()<br/>restconf · netconf"]
  C8 -->|apply| AP["apply_interface()<br/>restconf · netconf<br/>· ansible"]
  C8 -->|delete| DEL["delete_interface()<br/>netmiko_textfsm"]
  PL --> PP["planning<br/>.plan_interface()"]
  PP -.->|อ่านสถานะ| GS
  PP --> BP["build_plan()<br/>planner.py"]
  GS & AP & DEL --> RT[("Router")]
  RT --> RES[/"found / not_found /<br/>applied / deleted<br/>หรือ backend error"/]
  BP --> PLN[/"planned: create /<br/>update / no_change"/]
  RES & PLN --> SM["WebexClient.send_message()<br/>POST /v1/messages ไป roomId เดิม"]
  SM --> U2(["ผู้ใช้เห็น JSON ในห้องเดิม"])
  classDef err fill:#fde8e4,stroke:#c0392b,color:#7a1f15
  class MA,MBM,NY,IY,VERR err`,
      nodeMap: {
        HTTP: "make_http_handler", SUB: "make_http_handler", PE: "process_event", HE: "handle_event", GM: "get_message", DL: "download_file",
        PR: "process_request", VE: "validate_webex_envelope", LR: "load_request_file", VR: "validate_request",
        DR: "dispatch_request", GS: ["restconf.get_interface_state", "netconf.get_interface_state", "netmiko.get_interface_state"],
        PL: ["restconf.plan_interface", "netconf.plan_interface"], AP: ["restconf.apply_interface", "netconf.apply_interface", "ansible.apply_interface"],
        DEL: "netmiko.delete_interface", PP: "planning.plan_interface", BP: "build_plan", SM: "send_message",
      },
    },
    {
      id: "validation",
      title: "ลำดับการตรวจของ validate_request()",
      desc: "คืน error ตัวแรกที่เจอเท่านั้น และไม่ติดต่อ router ถ้าไม่ผ่าน",
      def: `flowchart TD
  S(["data จาก load_request_file()"]) --> A{"root เป็น mapping?"}
  A -->|ไม่| E0[/"invalid_yaml"/]
  A -->|ใช่| V{"version เป็น int 1?"}
  V -->|ไม่| E1[/"invalid_version"/]
  V -->|ใช่| R1{"มี router?"}
  R1 -->|ไม่| E2[/"missing_router"/]
  R1 -->|มี| R2{"อยู่ใน ALLOWED_ROUTERS?"}
  R2 -->|ไม่| E3[/"invalid_router"/]
  R2 -->|ใช่| M1{"มี method?"}
  M1 -->|ไม่| E4[/"missing_method"/]
  M1 -->|มี| M2{"อยู่ใน SUPPORTED_ACTIONS?"}
  M2 -->|ไม่| E5[/"invalid_method"/]
  M2 -->|ใช่| A1{"มี action?"}
  A1 -->|ไม่| E6[/"missing_action"/]
  A1 -->|มี| A2{"method นี้รองรับ action?"}
  A2 -->|ไม่| E7[/"invalid_action"/]
  A2 -->|ใช่| D1{"desired / interface / name ครบ?"}
  D1 -->|ไม่| E8[/"missing_desired / missing_interface /<br/>missing_interface_name"/]
  D1 -->|ครบ| P{"action เป็น plan หรือ apply?"}
  P -->|"ไม่ใช่ (status / delete)"| OK[/"accepted"/]
  P -->|ใช่| F{"มี ipv4, description,<br/>admin_state ครบ?"}
  F -->|ไม่| E9[/"missing_ipv4 / missing_description /<br/>missing_admin_state"/]
  F -->|ครบ| G{"admin_state เป็น up / down?"}
  G -->|ไม่| E10[/"invalid_admin_state"/]
  G -->|ใช่| OK`,
      nodeMap: {},
    },
    {
      id: "plan",
      title: "Plan flow (restconf / netconf)",
      desc: "backend ไม่เปรียบเทียบเอง แต่ส่งต่อให้ build_plan() ของ Part 2",
      def: `flowchart TD
  P1["restconf.plan_interface() หรือ<br/>netconf.plan_interface()"] --> P2["planning.plan_interface()"]
  P2 --> P3["get_interface_state() ของ backend นั้น"]
  P3 --> P4{"ผลการอ่านสถานะ"}
  P4 -->|error| P5[/"คืน error เดิม ไม่เรียก build_plan"/]
  P4 -->|not_found| P6["current = None"]
  P4 -->|found| P7["current = response interface"]
  P6 --> P8["build_plan(desired, current)"]
  P7 --> P8
  P8 --> Q{"current เป็น None?"}
  Q -->|ใช่| C[/"create: changes มี to ครบ 3 ฟิลด์"/]
  Q -->|ไม่| Q2{"มีฟิลด์ที่ค่าต่าง?"}
  Q2 -->|มี| U[/"update: เฉพาะฟิลด์ที่ต่าง from / to"/]
  Q2 -->|ไม่มี| N[/"no_change: changes ว่าง"/]`,
      nodeMap: { P1: ["restconf.plan_interface", "netconf.plan_interface"], P2: "planning.plan_interface", P3: ["restconf.get_interface_state", "netconf.get_interface_state"], P8: "build_plan" },
    },
    {
      id: "delete",
      title: "Delete flow (netmiko-textfsm)",
      desc: "อ่านก่อน ลบ แล้วอ่านยืนยัน ลบซ้ำได้ not_found",
      def: `flowchart TD
  D1["delete_interface()<br/>netmiko_textfsm.py"] --> D2["_real_delete()"]
  D2 --> D3{"ชื่อเป็น Loopback + เลข?"}
  D3 -->|ไม่| DX[/"RuntimeError → backend_failed"/]
  D3 -->|ใช่| D4{"อ่านสถานะ: มี interface?"}
  D4 -->|ไม่มี| D5[/"not_found, interface: null"/]
  D4 -->|มี| D6["send_config_set<br/>no interface NAME"]
  D6 --> D7{"อ่านซ้ำ: ยังอยู่?"}
  D7 -->|ยังอยู่| DX
  D7 -->|หายแล้ว| D8[/"deleted"/]`,
      nodeMap: { D1: "netmiko.delete_interface", D2: "netmiko.delete_interface" },
    },
    {
      id: "errors",
      title: "การแปลง error ของ backend",
      desc: "ทุก backend แปลง exception ของ library เป็น 3 ชนิดก่อน แล้ว error_from_exception() เปลี่ยนเป็นรหัสกลาง",
      def: `flowchart TD
  L["exception จาก requests / ncclient /<br/>Netmiko / ansible-playbook"] --> N["backend แปลงเป็น<br/>PermissionError / ConnectionError / RuntimeError"]
  N --> X2{"error_from_exception()"}
  X2 -->|PermissionError| X3[/"authentication_failed"/]
  X2 -->|ConnectionError| X4[/"connection_failed"/]
  X2 -->|อื่น ๆ| X5[/"backend_failed"/]
  H["RESTCONF HTTP status"] --> H1{"code"}
  H1 -->|"401 / 403"| X3
  H1 -->|"404 ตอน status"| NF[/"not_found (ไม่ใช่ error)"/]
  H1 -->|"code อื่นที่ไม่สำเร็จ"| X5`,
      nodeMap: { X2: "error_from_exception" },
    },
    {
      id: "deploy",
      title: "Startup & Deploy (3 services)",
      desc: "สิ่งที่เกิดตอน docker compose up: bot เตรียมตัวรับ event และ registrar ทำให้ Webex ส่ง event มาถูก URL กดกล่องฟังก์ชันเพื่อดูรายละเอียด",
      def: `flowchart TD
  DC(["docker compose up -d --build"]) --> W1["service webhook<br/>python -m app.webhook_server"]
  DC --> T1["service tunnel<br/>cloudflared Quick Tunnel"]
  DC --> R1["service registrar<br/>update_webex_webhooks.py --watch"]
  W1 --> MN["main()"]
  MN --> WC["WebexClient()<br/>อ่าน WEBEX_BOT_TOKEN"]
  WC --> RB["resolve_bot_person_id()<br/>GET /v1/people/me"]
  RB --> EH["WebexEventHandler(client, botId)"]
  EH --> EX["ThreadPoolExecutor(max_workers=1)<br/>worker รัน process_event()"]
  EX --> SV["ThreadingHTTPServer<br/>make_http_handler(submit_event)"]
  SV --> L1[/"listening 0.0.0.0:8000<br/>GET /health · POST /webhook"/]
  T1 --> T2[/"https://สี่คำ.trycloudflare.com<br/>→ http://webhook:8000"/]
  R1 --> WA["watch()<br/>ทุก 15 วินาที"]
  WA --> DU["discover_tunnel_url()"]
  T2 -.->|"hostname จาก<br/>tunnel:2000/quicktunnel"| DU
  DU --> D1{"URL เปลี่ยนจาก<br/>รอบก่อน?"}
  D1 -->|"ไม่ (รอรอบถัดไป)"| WA
  D1 -->|ใช่| FR["find_room_ids()<br/>IPA2026 + IPA2026 Exam Room"]
  FR --> SW["sync_webhooks()"]
  SW --> D2{"webhook ของห้องนี้<br/>ใน Webex"}
  D2 -->|ยังไม่มี| K1[/"POST สร้างใหม่"/]
  D2 -->|filter ผิด| K2[/"DELETE แล้ว POST"/]
  D2 -->|"URL เก่า / ไม่ active"| K3[/"PUT name + targetUrl"/]
  D2 -->|ตรงแล้ว| K4[/"ไม่ทำอะไร"/]`,
      nodeMap: {
        MN: "main", WC: "WebexClient", RB: "resolve_bot_person_id", EH: "handle_event", EX: "process_event", SV: "make_http_handler",
        WA: "registrar.watch", DU: "registrar.discover_tunnel_url", FR: "registrar.find_room_ids", SW: "registrar.sync_webhooks",
      },
    },
  ],

  overviewSequence: `sequenceDiagram
  actor U as ผู้ใช้
  participant W as Webex
  participant T as tunnel
  participant H as /webhook
  participant Q as คิว 1 worker
  participant E as handle_event
  participant P as process_request
  participant B as Backend
  participant R as Router
  U->>W: @mention bot + แนบ YAML
  W->>T: POST event (มีแค่ message id)
  T->>H: POST /webhook
  H->>Q: submit_event(event)
  H-->>T: HTTP 200 accepted
  T-->>W: HTTP 200
  Q->>E: process_event() → handle_event()
  E->>W: get_message() และ download_file()
  W-->>E: ข้อความ + YAML
  E->>P: process_request(mentionedPeople, path, botId)
  Note over P: validate_webex_envelope<br/>load_request_file<br/>validate_request
  P->>B: dispatch_request(data)
  B->>R: RESTCONF / NETCONF / Ansible / Netmiko
  R-->>B: สถานะหรือผล
  B-->>E: response dict
  E->>W: send_message(roomId, JSON)
  W-->>U: แสดงคำตอบในห้องเดิม`,

  // ---------------------------------------------------------------- Data-flow scenarios
  scenarios: [
    {
      id: "status-found", title: "status ผ่าน RESTCONF (เจอ interface)",
      yaml: "version: 1\nrouter: 10.0.29.102\nmethod: restconf\naction: status\ndesired:\n  interface:\n    name: Loopback66070123",
      steps: [
        { fn: "make_http_handler", data: "POST /webhook จาก tunnel: {resource: messages, event: created, data: {id, personId}}", out: "submit_event(event) แล้วตอบ HTTP 200 accepted" },
        { fn: "process_event", data: "event จากคิว (worker ว่าง)", out: "เรียก handle_event(event)" },
        { fn: "handle_event", data: "event", out: "_accepted_message_id() ได้ message id (ไม่ใช่ข้อความของ bot)" },
        { fn: "get_message", data: "message id", out: "roomId, mentionedPeople, files (1 ไฟล์)" },
        { fn: "download_file", data: "files[0]", out: "bytes → ไฟล์ YAML ชั่วคราว" },
        { fn: "process_request", data: "mentionedPeople, path, botId", out: "เริ่มตรวจ" },
        { fn: "validate_webex_envelope", data: "mentionedPeople มี botId และ path ไม่ใช่ None", out: "None (ผ่าน)" },
        { fn: "load_request_file", data: "path", out: "(data, None)" },
        { fn: "validate_request", data: "data", out: "accepted (status ไม่ต้องมี ipv4 ฯลฯ)" },
        { fn: "dispatch_request", data: "BACKENDS[(restconf, status)]", out: "เรียก get_interface_state(router, \"Loopback66070123\")" },
        { fn: "restconf.get_interface_state", data: "GET .../ietf-interfaces:interfaces/interface=Loopback66070123", out: "HTTP 200 → normalize → found" },
        { fn: "send_message", data: "roomId เดิม, JSON", out: "{\"status\":\"ok\",\"result\":\"found\",\"interface\":{...}}" },
      ],
    },
    {
      id: "plan-create", title: "plan ผ่าน RESTCONF (ยังไม่มี interface)",
      yaml: "version: 1\nrouter: 10.0.29.102\nmethod: restconf\naction: plan\ndesired:\n  interface:\n    name: Loopback66070123\n    ipv4: 172.23.123.1/32\n    description: IPA2026-66070123\n    admin_state: up",
      steps: [
        { fn: "handle_event", data: "event → get_message → download_file", out: "path ของ request.yaml ใน TemporaryDirectory" },
        { fn: "process_request", data: "mentionedPeople, path, botId", out: "envelope ผ่าน, YAML ผ่าน (มี ipv4, description, admin_state ครบ)" },
        { fn: "dispatch_request", data: "BACKENDS[(restconf, plan)]", out: "plan_interface(router, desired.interface ทั้ง dict)" },
        { fn: "restconf.plan_interface", data: "router, desired_interface", out: "ส่ง get_state เข้า wrapper" },
        { fn: "planning.plan_interface", data: "เรียก get_interface_state", out: "ได้ not_found (HTTP 404) → current = None" },
        { fn: "build_plan", data: "desired, None", out: "create พร้อม changes {ipv4: {to}, description: {to}, admin_state: {to}}" },
        { fn: "send_message", data: "roomId เดิม", out: "{\"status\":\"ok\",\"result\":\"planned\",\"operation\":\"create\",...}" },
      ],
      after: "router ไม่เปลี่ยน plan แค่บอกว่าจะทำอะไร",
    },
    {
      id: "apply", title: "apply ผ่าน RESTCONF",
      yaml: "version: 1\nrouter: 10.0.29.102\nmethod: restconf\naction: apply\ndesired:\n  interface:\n    name: Loopback66070123\n    ipv4: 172.23.123.1/32\n    description: IPA2026-66070123\n    admin_state: up",
      steps: [
        { fn: "handle_event", data: "event → get_message → download_file", out: "path ของ request.yaml ใน TemporaryDirectory" },
        { fn: "process_request", data: "…", out: "accepted" },
        { fn: "dispatch_request", data: "BACKENDS[(restconf, apply)]", out: "apply_interface(router, desired_interface)" },
        { fn: "restconf.apply_interface", data: "Loopback66070123 → เลข 66070123, ipv4 → address + mask", out: "PUT .../native/interface/Loopback=66070123 → HTTP 200/201/204 → applied" },
        { fn: "send_message", data: "roomId เดิม", out: "{\"status\":\"ok\",\"result\":\"applied\"}" },
      ],
      after: "router เปลี่ยนจริง อยากตรวจผลต้องส่ง status เป็นข้อความใหม่ bot ไม่ส่ง status ให้เอง",
    },
    {
      id: "delete", title: "delete ผ่าน netmiko-textfsm",
      yaml: "version: 1\nrouter: 10.0.29.102\nmethod: netmiko-textfsm\naction: delete\ndesired:\n  interface:\n    name: Loopback66070123",
      steps: [
        { fn: "handle_event", data: "event → get_message → download_file", out: "path ของ request.yaml ใน TemporaryDirectory" },
        { fn: "process_request", data: "…", out: "accepted (delete ต้องการแค่ name)" },
        { fn: "dispatch_request", data: "BACKENDS[(netmiko-textfsm, delete)]", out: "delete_interface(router, name)" },
        { fn: "netmiko.delete_interface", data: "อ่านสถานะ → มีอยู่", out: "no interface Loopback66070123 → อ่านซ้ำ → หายแล้ว → deleted" },
        { fn: "send_message", data: "roomId เดิม", out: "{\"status\":\"ok\",\"result\":\"deleted\"}" },
      ],
      after: "ส่ง delete ซ้ำจะได้ {\"status\":\"ok\",\"result\":\"not_found\",\"interface\":null}",
    },
    {
      id: "no-yaml", title: "@mention แต่ไม่แนบไฟล์",
      yaml: "(ไม่มีไฟล์แนบ)",
      steps: [
        { fn: "handle_event", data: "files = []", out: "_build_response() เรียก processor(mentionedPeople, None, botId) โดยไม่ดาวน์โหลด" },
        { fn: "process_request", data: "attachment_path = None", out: "เรียก validate_webex_envelope" },
        { fn: "validate_webex_envelope", data: "mention ถูก แต่ path เป็น None", out: "{\"status\":\"error\",\"result\":\"no_yaml\"}" },
        { fn: "send_message", data: "roomId เดิม", out: "no_yaml ไม่ติดต่อ router" },
      ],
    },
    {
      id: "invalid-action", title: "method กับ action ผิดคู่ (restconf + delete)",
      yaml: "version: 1\nrouter: 10.0.29.102\nmethod: restconf\naction: delete\ndesired:\n  interface:\n    name: Loopback66070123",
      steps: [
        { fn: "process_request", data: "envelope ผ่าน, load ผ่าน", out: "เรียก validate_request" },
        { fn: "validate_request", data: "SUPPORTED_ACTIONS[\"restconf\"] = (status, plan, apply)", out: "{\"status\":\"error\",\"result\":\"invalid_action\"}" },
        { fn: "send_message", data: "roomId เดิม", out: "invalid_action ไม่เรียก dispatch_request และ interface ยังอยู่" },
      ],
    },
    {
      id: "multi", title: "แนบไฟล์มากกว่า 1 ไฟล์",
      yaml: "(แนบ 2 ไฟล์)",
      steps: [
        { fn: "handle_event", data: "files มี 2 รายการ", out: "_build_response() คืน MULTIPLE_ATTACHMENTS ทันที ไม่ดาวน์โหลดและไม่เรียก process_request" },
        { fn: "send_message", data: "roomId เดิม", out: "{\"status\":\"error\",\"result\":\"multiple_attachments\"}" },
      ],
    },
    {
      id: "own-message", title: "event จากข้อความที่ bot ส่งเอง",
      yaml: "(ไม่มีไฟล์: เป็นข้อความ JSON ที่ bot เพิ่งตอบเข้าห้อง)",
      steps: [
        { fn: "make_http_handler", data: "event messages/created ของข้อความที่ bot ส่ง (data.personId = botId)", out: "submit_event(event) แล้ว HTTP 200 accepted" },
        { fn: "process_event", data: "event จากคิว", out: "เรียก handle_event(event)" },
        { fn: "handle_event", data: "_accepted_message_id(): data.personId == bot_person_id", out: "None → return None ไม่เรียก get_message และไม่ตอบ" },
      ],
      after: "ถ้า event ไม่มี personId มาให้ handle_event จะ get_message แล้วเช็ก message.personId อีกรอบ จึงไม่เกิด reply loop",
    },
    {
      id: "invalid-body", title: "POST /webhook ด้วย body ที่ไม่ใช่ JSON object",
      yaml: "# HTTP body ที่ส่งมา เช่น\n{\n# หรือ\n[1, 2]",
      steps: [
        { fn: "make_http_handler", data: "do_POST: path = /webhook", out: "เรียก _read_event()" },
        { fn: "make_http_handler", data: "_read_event(): JSON ผิด (\"{\") หรือ parse ได้แต่เป็น list", out: "None → HTTP 400 {\"status\":\"error\",\"result\":\"invalid_event\"} และไม่เรียก submit_event" },
      ],
      after: "ไม่มีอะไรเข้าคิวและไม่มีข้อความเข้าห้อง scripts/check_webhook_image.py ทดสอบกรณีนี้ด้วย body \"{\" ใน image ที่ build แล้ว",
    },
    {
      id: "netconf-change", title: "apply เปลี่ยน IPv4 ผ่าน NETCONF",
      yaml: "version: 1\nrouter: 10.0.29.102\nmethod: netconf\naction: apply\ndesired:\n  interface:\n    name: Loopback66070123\n    ipv4: 172.23.123.2/32\n    description: IPA2026-66070123\n    admin_state: up",
      steps: [
        { fn: "process_request", data: "…", out: "accepted" },
        { fn: "dispatch_request", data: "BACKENDS[(netconf, apply)]", out: "netconf.apply_interface(router, desired_interface)" },
        { fn: "netconf.apply_interface", data: "_build_apply_config(): Loopback 66070123, 172.23.123.2 / 255.255.255.255", out: "config_xml แบบ nc:operation=\"replace\"" },
        { fn: "netconf.apply_interface", data: "_real_edit_config(): edit-config ครั้งที่ 1 = REMOVE_ADDRESS_CONFIG", out: "ลบ address เดิม (172.23.123.1) ใน session เดียวกัน" },
        { fn: "netconf.apply_interface", data: "edit-config ครั้งที่ 2 = config_xml", out: "ใส่ 172.23.123.2/32 → ไม่มี exception → applied" },
        { fn: "send_message", data: "roomId เดิม", out: "{\"status\":\"ok\",\"result\":\"applied\"}" },
      ],
      after: "ก่อน commit 12d7543 ไม่มีขั้นลบ: ได้ applied และ status ผ่าน RESTCONF / NETCONF เห็น IP ใหม่ แต่ show running-config ยังเป็น IP เดิม",
    },
    {
      id: "tunnel-restart", title: "tunnel restart แล้ว URL เปลี่ยน",
      yaml: "(ไม่มี YAML: เป็นงานของ service registrar)",
      steps: [
        { fn: "registrar.watch", data: "รอบใหม่ (ทุก 15 วินาที) last = URL เดิม", out: "เรียก discover_tunnel_url()" },
        { fn: "registrar.discover_tunnel_url", data: "GET http://tunnel:2000/quicktunnel", out: "hostname ใหม่ → https://<ใหม่>.trycloudflare.com ซึ่งไม่เท่ากับ last" },
        { fn: "registrar.find_room_ids", data: "GET /v1/rooms", out: "roomId ของ IPA2026 และ IPA2026 Exam Room" },
        { fn: "registrar.sync_webhooks", data: "webhook ทั้งสองมี targetUrl เก่า", out: "PUT {name, targetUrl: <ใหม่>/webhook} ทั้งสองห้อง (log updated)" },
        { fn: "make_http_handler", data: "mention ครั้งถัดไปมาที่ URL ใหม่", out: "HTTP 200 accepted ตามปกติ" },
      ],
      after: "ตาม live-test-part4.md: หลัง restart tunnel ให้ mention bot แบบไม่แนบไฟล์ ควรได้ no_yaml อีกครั้ง ถ้าไม่มี registrar ต้องรันสคริปต์เองหรือแก้ webhook มือ",
    },
    {
      id: "unreachable", title: "router เข้าไม่ถึง (NETCONF status)",
      yaml: "version: 1\nrouter: 10.0.29.103\nmethod: netconf\naction: status\ndesired:\n  interface:\n    name: Loopback66070123",
      steps: [
        { fn: "process_request", data: "…", out: "accepted" },
        { fn: "dispatch_request", data: "BACKENDS[(netconf, status)]", out: "get_interface_state(router, name)" },
        { fn: "netconf.get_interface_state", data: "ncclient ต่อ port 830 ไม่ได้", out: "TransportError / timeout → ConnectionError" },
        { fn: "error_from_exception", data: "ConnectionError", out: "{\"status\":\"error\",\"result\":\"connection_failed\"}" },
        { fn: "send_message", data: "roomId เดิม", out: "connection_failed" },
      ],
    },
  ],

  // ---------------------------------------------------------------- Result codes
  resultCodes: [
    { code: "accepted", kind: "ok", where: "validate_request() (Part 1) และ HTTP 200 ของ /webhook", meaning: "ผ่านการตรวจ / ได้รับ event แล้ว" },
    { code: "healthy", kind: "ok", where: "GET /health (make_http_handler)", meaning: "server พร้อม" },
    { code: "found", kind: "ok", where: "get_interface_state()", meaning: "มี interface พร้อมค่าจริงจาก router" },
    { code: "not_found", kind: "ok", where: "get_interface_state(), delete_interface()", meaning: "ไม่มี interface (ไม่ใช่ error)" },
    { code: "planned", kind: "ok", where: "build_plan()", meaning: "มี operation create / update / no_change" },
    { code: "applied", kind: "ok", where: "apply_interface()", meaning: "ส่งค่าไป router สำเร็จ" },
    { code: "deleted", kind: "ok", where: "netmiko.delete_interface()", meaning: "ลบแล้วและยืนยันว่าหายจริง" },
    { code: "invalid_event", kind: "error", where: "POST /webhook (HTTP 400)", meaning: "body ไม่ใช่ JSON object" },
    { code: "not_found (HTTP 404)", kind: "error", where: "make_http_handler() เมื่อ path ไม่รู้จัก", meaning: "เรียก URL ผิด เช่น GET /status (คนละความหมายกับ not_found ของ interface)" },
    { code: "multiple_attachments", kind: "error", where: "handle_event() → _build_response()", meaning: "แนบไฟล์มากกว่า 1" },
    { code: "missing_bot_mention", kind: "error", where: "validate_webex_envelope()", meaning: "ไม่ได้ mention bot จริง" },
    { code: "no_yaml", kind: "error", where: "validate_webex_envelope()", meaning: "ไม่แนบไฟล์" },
    { code: "invalid_yaml", kind: "error", where: "load_request_file() / validate_request()", meaning: "parse ไม่ได้ หรือ root ไม่ใช่ mapping" },
    { code: "invalid_version … invalid_admin_state", kind: "error", where: "validate_request()", meaning: "YAML ผิดข้อกำหนด (คืนตัวแรกที่เจอ)" },
    { code: "authentication_failed", kind: "error", where: "backend", meaning: "router ปฏิเสธ user / password" },
    { code: "connection_failed", kind: "error", where: "backend", meaning: "ต่อ router ไม่ได้ / timeout" },
    { code: "backend_failed", kind: "error", where: "backend", meaning: "ต่อได้แต่ทำงานไม่สำเร็จ เช่น IP ซ้ำ หรือผลผิดรูป" },
  ],

  // ---------------------------------------------------------------- Troubleshooting
  troubleshooting: [
    { symptom: "@mention แล้วไม่มีคำตอบเลย", check: "1) docker compose ps: webhook ต้อง healthy 2) URL ล่าสุดใน docker compose logs registrar ต้องตรงกับ docker compose logs tunnel (restart แล้ว hostname เปลี่ยน) 3) Webex ต้องมี webhook messages/created ของทั้งสองห้อง targetUrl ลงท้าย /webhook 4) docker compose logs webhook หา unhandled error while processing", where: "compose.yaml, registrar.sync_webhooks(), process_event()" },
    { symptom: "registrar ขึ้น waiting for the tunnel URL ซ้ำ ๆ", check: "tunnel ยังไม่ได้ hostname ดู docker compose logs tunnel ว่าต่อ Cloudflare ได้หรือไม่", where: "discover_tunnel_url(), service tunnel" },
    { symptom: "registrar: the bot is not a member of: ...", check: "เพิ่ม bot เข้าห้องนั้นด้วย bot email สคริปต์พิมพ์รายชื่อห้องที่ bot เห็นมาให้เทียบ", where: "find_room_ids()" },
    { symptom: "WEBEX_BOT_TOKEN is not set", check: "ยังไม่มี .env (copy จาก .env.example) หรือรันจากโฟลเดอร์อื่น", where: "WebexClient, read_token()" },
    { symptom: "แก้โค้ดใน app/ แล้วไม่มีผล", check: "image ใช้ COPY ต้อง docker compose up -d --build ใหม่ ส่วน scripts/ เป็น volume แค่ restart registrar", where: "Dockerfile, compose.yaml" },
    { symptom: "NETCONF apply ตอบ applied แต่ show running-config ยังเป็น IP เดิม", check: "ต้องลบ address เดิมก่อน apply (แก้แล้วใน commit 12d7543) แล้วเทียบผล status ของทุก backend กับ CLI", where: "netconf.apply_interface()" },
    { symptom: "ได้ missing_bot_mention", check: "ต้องเลือก mention จากรายการของ Webex จริง ไม่ใช่พิมพ์ @ชื่อ และ bot_person_id ต้องได้จาก GET /v1/people/me", where: "validate_webex_envelope(), main()" },
    { symptom: "ได้ no_yaml ทั้งที่คิดว่าแนบไฟล์", check: "ไฟล์ต้องอยู่ในข้อความเดียวกับ mention และ handle_event ต้องดาวน์โหลดแล้วส่ง path (ไม่ใช่ None)", where: "handle_event(), validate_webex_envelope()" },
    { symptom: "ได้ invalid_yaml", check: "syntax ของ YAML, root ต้องเป็น mapping, ไฟล์ต้องเป็น utf-8", where: "load_request_file(), validate_request()" },
    { symptom: "ได้ invalid_* หรือ missing_*", check: "แก้ YAML ตาม desired-state spec โดยดู error ตัวแรกที่ตอบ", where: "validate_request()" },
    { symptom: "ได้ authentication_failed", check: "ROUTER_USER / ROUTER_PASS ใน environment", where: "common.router_credentials(), ansible/inventory.ini" },
    { symptom: "ได้ connection_failed", check: "router IP เข้าถึงได้ไหม, port 443 / 830 / 22, timeout", where: "backend ของ method นั้น" },
    { symptom: "apply ได้ backend_failed", check: "ส่ง status ดูสถานะจริงก่อน และตรวจว่า IP ไม่ซ้ำกับ interface อื่น ไม่ควรสมมติว่าสำเร็จ", where: "apply_interface()" },
    { symptom: "router เปลี่ยนแล้วแต่ไม่เห็นคำตอบ / ตอบผิดห้อง", check: "ต้องตอบไปที่ roomId ของข้อความนั้น ไม่ hard-code และ send_message ต้องไม่ error", where: "handle_event(), send_message()" },
    { symptom: "bot ตอบวนไม่หยุด", check: "ต้องข้าม event และข้อความที่ personId เป็นของ bot เอง", where: "handle_event()" },
    { symptom: "Student CI ไม่ผ่าน", check: "ดูขั้นที่ล้ม: tests → build → check image ขั้นที่ล้มทำให้ขั้นถัดไปถูกข้าม", where: ".github/workflows/student-ci.yaml" },
  ],

  // ---------------------------------------------------------------- Data shapes along the pipeline
  dataShapes: [
    { stage: "Webex → tunnel → /webhook", shape: "event JSON: {resource: \"messages\", event: \"created\", data: {id, personId}}", producer: "Webex", consumer: "make_http_handler()" },
    { stage: "/webhook → คิว", shape: "event dict เดิม ผ่าน submit_event → executor.submit(process_event, handler, event)", producer: "make_http_handler()", consumer: "process_event() → handle_event()" },
    { stage: "get_message()", shape: "message dict: roomId, personId, mentionedPeople, files", producer: "Webex API", consumer: "handle_event()" },
    { stage: "download_file()", shape: "bytes ของ YAML → เขียนเป็นไฟล์ชั่วคราว → path", producer: "Webex API", consumer: "process_request()" },
    { stage: "load_request_file()", shape: "data dict ของ YAML (หรือ invalid_yaml)", producer: "core.py", consumer: "validate_request(), dispatch_request()" },
    { stage: "dispatch_request()", shape: "status/delete: (router, name) · plan/apply: (router, desired_interface dict)", producer: "dispatcher.py", consumer: "backend" },
    { stage: "backend", shape: "response dict เช่น {status: ok, result: found, interface: {name, ipv4, description, admin_state}}", producer: "app/backends/", consumer: "dispatch_request() → process_request() → handle_event()" },
    { stage: "send_message()", shape: "text = json.dumps(response) ไปที่ roomId เดิม", producer: "handle_event()", consumer: "Webex → ผู้ใช้" },
    { stage: "registrar → Webex", shape: "{name: \"ipa2026-mentions <ห้อง>\", targetUrl: \"<tunnel>/webhook\", resource: \"messages\", event: \"created\", filter: \"roomId=...\"}", producer: "sync_webhooks()", consumer: "Webex /v1/webhooks" },
  ],

  // ---------------------------------------------------------------- Review page (สรุปก่อนสอบ)
  review: [
    {
      q: "อัปเดตล่าสุด: อะไรเปลี่ยนไปบ้าง",
      table: "changes",
    },
    {
      q: "โปรเจกต์นี้ทำงานอย่างไร",
      a: [
        "เป็น Webex bot ที่รอรับ event messages/created ทาง POST /webhook ซึ่ง Webex ส่งมาผ่าน Cloudflare Quick Tunnel",
        "เมื่อมีคนแนบ YAML พร้อม @mention bot จะดึงข้อความและไฟล์ ตรวจ mention และ YAML แล้วส่งคำขอไปที่ backend ตาม method",
        "backend คุยกับ router (RESTCONF / NETCONF / Ansible / Netmiko+TextFSM) แล้วคืนผลในรูปแบบกลาง จากนั้น bot ส่งผลเป็น JSON กลับไปห้องเดิม",
      ],
    },
    {
      q: "เริ่มต้นทำงานจากไฟล์ไหน",
      a: [
        "docker compose up -d --build เปิด 3 service: webhook, tunnel และ registrar",
        "service webhook: Dockerfile สั่ง CMD python -m app.webhook_server ทำให้ main() ใน app/webhook_server.py ทำงาน",
        "main() สร้าง WebexClient() → resolve_bot_person_id() → WebexEventHandler(...) → ThreadPoolExecutor(max_workers=1) → ThreadingHTTPServer ด้วย make_http_handler(submit_event)",
        "service registrar: scripts/update_webex_webhooks.py --watch ทำให้ webhook ใน Webex ชี้ไปที่ URL ปัจจุบันของ tunnel",
      ],
    },
    {
      q: "แต่ละ Function มีหน้าที่อะไร",
      table: "functions",
    },
    {
      q: "Function ต่าง ๆ เชื่อมโยงกันอย่างไร",
      a: [
        "main() → resolve_bot_person_id() → WebexEventHandler(...) → make_http_handler(submit_event)",
        "POST /webhook → submit_event(event) → process_event() (worker เดียว) → handle_event()",
        "handle_event() → get_message() → download_file() → process_request() → send_message()",
        "process_request() → validate_webex_envelope() → load_request_file() → validate_request() → dispatch_request()",
        "dispatch_request() → get_interface_state() / plan_interface() / apply_interface() / delete_interface() ของ backend ที่เลือก",
        "plan_interface() → planning.plan_interface() → get_interface_state() + build_plan()",
        "ทุก backend → error_from_exception() เมื่อเกิด exception",
        "registrar (แยกจาก bot): watch() → discover_tunnel_url() → find_room_ids() → sync_webhooks()",
      ],
    },
    {
      q: "ข้อมูลถูกส่งผ่านส่วนต่าง ๆ อย่างไร",
      table: "dataShapes",
    },
    {
      q: "YAML มีหน้าที่อะไรและถูกนำไปใช้งานอย่างไร",
      a: [
        "Request YAML คือคำขอหนึ่งรายการ: version, router, method, action และ desired.interface ถูกอ่านโดย load_request_file() ตรวจโดย validate_request() แล้ว dispatch_request() ใช้ method + action เลือก backend",
        "compose.yaml: webhook ได้ environment (WEBEX_BOT_TOKEN, ROUTER_USER, ROUTER_PASS, WEBHOOK_HOST, WEBHOOK_PORT), port, restart และ healthcheck ส่วน tunnel รัน cloudflared --url http://webhook:8000 และ registrar ได้ TUNNEL_METRICS_URL=http://tunnel:2000 พร้อม mount scripts/",
        "ansible/apply_interface.yml + inventory.ini ถูก ansible.apply_interface() รันผ่าน ansible-playbook โดยรับตัวแปรจาก _build_variables()",
        ".github/workflows/student-ci.yaml รัน tests → build → ตรวจ HTTP ใน image เมื่อ push main",
      ],
    },
    {
      q: "เมื่อผู้ใช้ @mention Bot จะเกิดกระบวนการอะไรขึ้น",
      a: [
        "Webex ส่ง event ที่มีแค่ message id ผ่าน tunnel มาที่ /webhook bot ใส่ event เข้าคิวแล้วตอบ HTTP 200 accepted ทันที",
        "worker ตัวเดียวรัน process_event() → handle_event() ซึ่งข้าม event ที่ไม่เกี่ยวข้องหรือเป็นข้อความของ bot เอง แล้วเรียก get_message()",
        "ดูจำนวนไฟล์: มากกว่า 1 → multiple_attachments, 0 → no_yaml, 1 → ดาวน์โหลดเป็นไฟล์ชั่วคราว",
        "process_request() ตรวจ mention → อ่าน YAML → ตรวจ YAML → dispatch ไป backend",
        "ผลลัพธ์ทุกกรณี (ทั้ง error และสำเร็จ) ถูกส่งด้วย send_message() ไปที่ roomId ของข้อความนั้น",
      ],
    },
    {
      q: "Deploy และการลงทะเบียน webhook ทำงานอย่างไร",
      a: [
        "tunnel: cloudflared Quick Tunnel ให้ URL https://<สี่คำ>.trycloudflare.com ที่ส่งต่อมาที่ http://webhook:8000 ไม่ต้องมีบัญชี Cloudflare แต่ hostname เปลี่ยนทุกครั้งที่ restart",
        "registrar: ทุก 15 วินาที discover_tunnel_url() อ่าน hostname จาก http://tunnel:2000/quicktunnel ถ้าเปลี่ยนจากรอบก่อนจึงเรียก Webex API",
        "find_room_ids() ต้องเจอทั้งห้อง IPA2026 และ IPA2026 Exam Room แล้ว sync_webhooks() ทำให้มี webhook ห้องละรายการชื่อ ipa2026-mentions <ชื่อห้อง>",
        "ยังไม่มี → POST, filter ผิดห้อง → DELETE แล้ว POST, URL เก่าหรือไม่ active → PUT {name, targetUrl}, ตรงแล้ว → ไม่ทำอะไร",
        "registrar ไม่อยู่ในเส้นทางของ event มันแค่บอก Webex ว่าให้ส่ง event ไปที่ไหน event จริงยังวิ่ง Webex → tunnel → webhook",
      ],
    },
    {
      q: "หากเกิดปัญหาในแต่ละขั้นตอน ควรตรวจสอบส่วนใด",
      table: "troubleshooting",
    },
  ],
};
