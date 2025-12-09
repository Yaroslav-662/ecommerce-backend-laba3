WebSocket API (Socket.io) — Документація
Огляд

Backend підтримує WebSocket з використанням Socket.io. WebSocket-підключення використовуються для real-time оновлень (замовлення, сповіщення, online presence, чат/кімнати тощо).
Ця документація описує всі доступні події, очікувані payload-и, ack-формати та приклади.

Base URL / Path

Base: https://<YOUR_BACKEND_HOST> (наприклад https://ecommerce-backend-mgfu.onrender.com)

Socket.io path: /socket.io

Transport

Рекомендується використовувати тільки websocket (без fallback), але Socket.io підтримує polling+websocket.

Авторизація

Аутентифікація через JWT. Токен передається при підключенні в auth.token.

Клієнтський приклад (JS):

import { io } from "socket.io-client";

const socket = io("https://your-host", {
  path: "/socket.io",
  transports: ["websocket"],
  auth: { token: "Bearer eyJ..." } // з префіксом "Bearer "
});


Сервер очікує валідний JWT; якщо токен відсутній або недійсний — більшість подій повернуть ack з error: "Unauthorized".

Загальний формат помилок / ack

Ack при успіху: { ok: true, ... }

Ack при помилці: { error: "<message>" }

Якщо подія використовує socket.timeout(ms).emit(...), можливі timeout відповіді.

Події (Events)

Примітка: в таблиці — Direction C→S означає client→server, S→C — server→client.

Таблиця подій (коротко)
Подія	Direction	Опис
joinRoom	C→S	Приєднання до кімнати (room).
leaveRoom	C→S	Вихід з кімнати.
message	C↔S	Broadcast повідомлення в кімнаті.
whoami	C→S	Повернути info про підключеного користувача (ack).
presence:update	S→C	Повідомлення про online/offline користувачів.
notification:send	C→S	Надіслати персональне сповіщення (можна через чергу).
notification:received	S→C	Сервер доставив/emit сповіщення отримувачу.
order:create	C→S	Створити замовлення (user).
order:created	S→C	Повідомлення про створене замовлення (user + admins).
order:updateStatus	C→S	Змінити статус замовлення (owner або admin).
order:updated	S→C	Подія оновлення замовлення (user/admin).
product:stockUpdated	S→C	Повідомлення про зміну запасу продукту (broadcast).
typing	C→S	Індикація, що користувач набирає повідомлення (personal).
reconnect	handled by client	Автоматична логіка Socket.io для reconnect.
Схеми подій (детально)
joinRoom

Direction: C → S

Payload:

"room" // string


Ack:

{ "ok": true, "room": "roomName" }


Server emits to room on other clients:

{ "event": "joined", "room": "roomName", "by": "<socketId>" }

leaveRoom

Direction: C → S

Payload:

"room" // string


Ack:

{ "ok": true, "room": "roomName" }

message

Direction: C → S (emit), S → C (broadcast)

Payload (C→S):

{
  "room": "string",
  "text": "string",
  "meta": { /* optional */ }
}


Broadcast format (S→C):

{
  "room": "string",
  "text": "string",
  "from": { "id": "userId", "name": "User Name" } | null,
  "ts": "ISO timestamp"
}


Ack:

{ "ok": true, "sentTo": "room:roomName" }

whoami

Direction: C → S

Payload: null

Ack (S→C):

{ "userId": "string", "role": "user|admin", "email": "string", "isVerified": true }

presence:update

Direction: S → C (broadcast)

Payload:

{
  "userId": "string",
  "status": "online" | "offline",
  "at": "ISO timestamp"
}

notification:send

Direction: C → S

Description: надсилання персонального повідомлення. Сервер спробує додати job у чергу (якщо налаштовано), інакше — запише у БД і надішле realtime.

Payload:

{
  "toUserId": "string",          // обов'язково
  "type": "info|warning|error",  // optional, default "info"
  "title": "string",             // optional
  "body": "string",              // optional
  "meta": {},                    // optional
  "priority": "low|normal|high"  // optional
}


Ack:

{ "ok": true, "queued": true|false, "saved": true|false }


Server emits to a user room (user:<toUserId>):

{ "event": "notification:received", "title": "...", "body": "...", "from": "<fromUserId>", "ts": "ISO" }

order:create

Direction: C → S

Description: створити замовлення (повинні бути валідні продукти у базі). Токен user обов’язковий.

Payload:

{
  "items": [
    { "product": "ObjectId string", "quantity": Number, "price": Number /* per item */ }
  ],
  "shippingAddress": { "country": "...", "city": "...", "street": "...", "postalCode": "..." }, // optional/custom
  "paymentMethod": "card|cash|..." ,
  "total": Number  // total сума замовлення (обов'язково, сервер може валідувати)
}


Validation:

items — array, обов’язково хоча б 1 елемент

кожен product має бути валідним ObjectId та існувати в БД

price — обов’язкове поле для кожного item (щоб уникнути inconsistency)

total — обов’язкове

Ack (успіх):

{ "ok": true, "order": { /* created order object */ } }


Server emits:

order:created в кімнату user:<userId> та в адміністраторські кімнати (admin, admins):

{ "event": "order:created", "order": { /* order */ } }

order:updateStatus

Direction: C → S

Опис: оновлення статусу замовлення — доступно owner або admin.

Payload:

{ "orderId": "ObjectId string", "status": "paid|shipped|cancelled|..." }


Behavior:

перевірка прав: або власник замовлення, або req.user.role === 'admin'

при paid / shipped можливе зменшення stock продуктів і emit product:stockUpdated

Ack:

{ "ok": true, "order": { /* updated order */ } }
// якщо помилка
{ "error": "Access denied" } | { "error": "Order not found" }


Server emits:

order:updated (user + admin rooms)

product:stockUpdated (broadcast або to product rooms)

typing

Direction: C → S

Payload:

{ "toUserId": "string" }


Server emits to user:<toUserId>:

{ "event": "typing", "from": "<userId>", "at": "ISO" }

Приклади (JS)

Підключитися та отримати whoami

const socket = io(BASE_URL, { path: "/socket.io", auth: { token: "Bearer <JWT>" }, transports: ["websocket"] });

socket.on("connect", () => console.log("connected", socket.id));

socket.timeout(3000).emit("whoami", (err, resp) => {
  if (err) return console.error("whoami timeout/err", err);
  console.log("whoami:", resp);
});


Створити замовлення

socket.timeout(5000).emit("order:create", {
  items: [
    { product: "64a1b2c3d4e5f67890123456", quantity: 2, price: 100 },
    { product: "64a1b2c3d4e5f67890123457", quantity: 1, price: 150 }
  ],
  total: 350
}, (err, ack) => {
  if (err) return console.error("timeout", err);
  if (ack.error) return console.error("order create error:", ack.error);
  console.log("order created:", ack.order);
});


Надіслати персональне сповіщення

socket.emit("notification:send", { toUserId: "<id2>", title: "Hi", body: "Test" }, (ack) => {
  console.log("notification ack:", ack);
});

Формат даних в базі (коротко)

Order.items має містити { product: ObjectId, quantity: Number, price: Number }.

Order.total — Number (required).

Якщо сервер валідує items.product як ObjectId — передавайте чистий id без < > (рядок типу "64a1b2c3d4e5f67890123456").

Тестування (ws-tester)

Для швидкої перевірки використовується ws-tester.html (Socket.io Tester — Verbose). Інструкції:

Відкрий ws-tester.html у браузері.

В поле URL впиши https://your-host і Path — /socket.io.

В полі JWT token — встав Bearer <JWT> (з префіксом Bearer ).

Натисни Connect. У логах має з’явитися CONNECTED: <socket-id> і presence:update.

Виконай послідовні тести (joinRoom, message, order:create, order:updateStatus, notification:send).

Перевір ACK-відповіді і server-emits у логах.

Типові проблеми при тестуванні

Cast to ObjectId failed — ви надали product id в неправильному форматі (мають бути прості рядки ObjectId).

items.0.price: Path 'price' is required — не передано price для item.

Unauthorized — відправлений JWT некоректний або не передано префікс Bearer .

Рекомендації з безпеки

Передавайте JWT тільки через auth.token при підключенні (не через query string).

На сервері — перевіряти role/permission для admin-only подій.

Валідуйте всі вхідні поля (ObjectId, кількості, price, total).

Обмежуйте частоту подій (rate limit) для spam-сценаріїв (особливо message, order:create, notification:send).

Якщо плануєш масштабувати — використовуй Redis adapter для Socket.io та зовнішні черги (Bull/BullMQ).

Вставка в Swagger / README

WebSocket-документація не є прямим OpenAPI (Swagger) стандартом, але може бути додана як:

окрема секція в README (рекомендовано),

або в Swagger UI як Custom Markdown/additional docs (наприклад у swagger-ui можна додати HTML/MD сторінку з WebSocket описом).
Рекомендація: зберегти цю секцію в README та додати посилання на неї з Swagger UI (як «WebSocket API»).

Чек-ліст перед тестуванням / деплоєм

 DB має містити тестові продукти (ObjectId у коректному форматі).

 JWT токени валідні (подивись whoami щоб переконатися).

 Шлях /socket.io доступний (CORS/SSL).

 Якщо використовуєш Redis adapter — налаштуй REDIS_URL у середовищі.

 Для production: встановити rate limiting і обмеження payload size.
