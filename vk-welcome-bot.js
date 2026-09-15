// Сервер-обработчик Callback API ВКонтакте:
// при вступлении нового подписчика в сообщество отправляет ему приветственное сообщение.
//
// Установка зависимостей:
//   npm install express axios
//
// Запуск:
//   node vk-welcome-bot.js

const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

// ==== Значения берутся из переменных окружения (Railway → Variables) ====
// Локально можно создать файл .env и подключить пакет dotenv,
// либо на время теста вписать значения прямо сюда вместо process.env.*
const CONFIRMATION_STRING = process.env.CONFIRMATION_STRING || 'СТРОКА_ПОДТВЕРЖДЕНИЯ';
const SECRET_KEY = process.env.SECRET_KEY || '';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'ТОКЕН_ДОСТУПА_СООБЩЕСТВА';
const API_VERSION = '5.199';
const WELCOME_TEXT = 'Спасибо за подписку! Рады видеть вас в сообществе 🎉';

// Путь к файлу, где хранится список подписавшихся на сообщения.
// На Railway это должен быть путь внутри подключённого Volume (см. инструкцию),
// иначе список будет стираться при каждом перезапуске сервера.
const DATA_FILE = process.env.DATA_FILE || './subscribers.json';

// Секрет для доступа к списку подписчиков извне (для скрипта рассылки).
// Придумайте свою длинную случайную строку и впишите в Railway → Variables.
const BROADCAST_SECRET = process.env.BROADCAST_SECRET || '';
// ===================================

// Загружаем список подписчиков с диска при старте сервера
function loadSubscribers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return new Set(JSON.parse(raw));
  } catch (err) {
    return new Set(); // файла ещё нет — начинаем с пустого списка
  }
}

function saveSubscribers() {
  fs.writeFileSync(DATA_FILE, JSON.stringify([...subscribers]));
}

const subscribers = loadSubscribers();
console.log(`Загружено подписчиков из файла: ${subscribers.size}`);

app.post('/vk-callback', async (req, res) => {
  const body = req.body;

  // Проверка секретного ключа, если он задан в настройках VK
  if (SECRET_KEY && body.secret !== SECRET_KEY) {
    return res.status(200).send('Bad secret');
  }

  // Подтверждение сервера при первой настройке Callback API
  if (body.type === 'confirmation') {
    return res.send(CONFIRMATION_STRING);
  }

  // VK ждёт ответ "ok" в течение нескольких секунд, иначе повторит запрос —
  // отвечаем сразу, а сообщение отправляем асинхронно
  res.send('ok');

  if (body.type === 'group_join') {
    const userId = body.object.user_id;
    console.log(`Новый подписчик: ${userId}`);
    await sendWelcomeMessage(userId);
  }

  // Пользователь разрешил сообщения от сообщества — запоминаем его
  if (body.type === 'message_allow') {
    const userId = body.object.user_id;
    subscribers.add(userId);
    saveSubscribers();
    console.log(`Пользователь ${userId} разрешил сообщения. Всего в списке: ${subscribers.size}`);
  }

  // Пользователь запретил сообщения — убираем из списка, чтобы не было ошибок при рассылке
  if (body.type === 'message_deny') {
    const userId = body.object.user_id;
    subscribers.delete(userId);
    saveSubscribers();
    console.log(`Пользователь ${userId} запретил сообщения. Всего в списке: ${subscribers.size}`);
  }
});

// Эндпоинт для скрипта рассылки — отдаёт список ID подписчиков.
// Доступ только по секретному ключу в параметре ?secret=...
app.get('/subscribers', (req, res) => {
  if (!BROADCAST_SECRET || req.query.secret !== BROADCAST_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json([...subscribers]);
});

async function sendWelcomeMessage(userId) {
  try {
    const response = await axios.get('https://api.vk.com/method/messages.send', {
      params: {
        user_id: userId,
        message: WELCOME_TEXT,
        random_id: Date.now(),
        access_token: ACCESS_TOKEN,
        v: API_VERSION,
      },
    });

    if (response.data.error) {
      // Частая причина ошибки 901: пользователь не разрешил сообщения от сообщества
      console.error('Ошибка VK API:', response.data.error);
    } else {
      console.log(`Приветствие отправлено пользователю ${userId}`);
    }
  } catch (err) {
    console.error('Ошибка запроса к VK API:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
