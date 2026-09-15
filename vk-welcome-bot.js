// ============================================
// VK WELCOME BOT
// ============================================

const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(express.json());

// ============================================
// НАСТРОЙКИ
// ============================================

const CONFIRMATION_STRING =
  process.env.CONFIRMATION_STRING || 'СТРОКА_ПОДТВЕРЖДЕНИЯ';

const SECRET_KEY =
  process.env.SECRET_KEY || '';

const ACCESS_TOKEN =
  process.env.ACCESS_TOKEN || 'ТОКЕН_ДОСТУПА_СООБЩЕСТВА';

const API_VERSION = '5.199';

const DATA_FILE =
  process.env.DATA_FILE || './subscribers.json';

const BROADCAST_SECRET =
  process.env.BROADCAST_SECRET || '';

// ============================================
// ТЕКСТЫ СООБЩЕНИЙ
// ============================================

// Приветствие при подписке
const WELCOME_TEXT = `Спасибо за подписку на Elation! ❤️

Мы — студия танцев и растяжки.

У нас есть Pole Fit, High Heels, Exotic и Stretching — можно прийти с нуля, специальная подготовка не нужна.

Если хотите попробовать, напишите, какое направление вас интересует ✨`;

// Автоответ, когда человек сам написал в сообщения
const MESSAGE_WELCOME_TEXT = `Привет! ❤️ Вы в Elation — студии танцев и растяжки.

У нас есть Pole Fit, High Heels, Exotic и Stretching. Можно прийти с нуля, специальная подготовка не нужна.

Напишите, какое направление вас интересует — расскажем про расписание, стоимость и подберём подходящую группу ✨`;

// ============================================
// РАБОТА С ПОДПИСЧИКАМИ
// ============================================

function loadSubscribers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return new Set(JSON.parse(raw));
  } catch (err) {
    return new Set();
  }
}

function saveSubscribers() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify([...subscribers])
  );
}

const subscribers = loadSubscribers();

console.log(
  `Загружено подписчиков из файла: ${subscribers.size}`
);

// ============================================
// CALLBACK API VK
// ============================================

app.post('/vk-callback', async (req, res) => {
  const body = req.body;

  // ------------------------------------------
  // Проверка секретного ключа
  // ------------------------------------------

  if (SECRET_KEY && body.secret !== SECRET_KEY) {
    console.log('Неверный секретный ключ');
    return res.status(200).send('Bad secret');
  }

  // ------------------------------------------
  // Подтверждение Callback API
  // ------------------------------------------

  if (body.type === 'confirmation') {
    console.log('Получен запрос confirmation');
    return res.send(CONFIRMATION_STRING);
  }

  // ------------------------------------------
  // Отвечаем VK сразу
  // ------------------------------------------

  res.send('ok');

  // ==========================================
  // НОВЫЙ ПОДПИСЧИК
  // ==========================================

  if (body.type === 'group_join') {
    const userId = body.object.user_id;

    console.log(`Новый подписчик: ${userId}`);

    await sendWelcomeMessage(userId);
  }

  // ==========================================
  // ПОЛЬЗОВАТЕЛЬ РАЗРЕШИЛ СООБЩЕНИЯ
  // ==========================================

  if (body.type === 'message_allow') {
    const userId = body.object.user_id;

    subscribers.add(userId);
    saveSubscribers();

    console.log(
      `Пользователь ${userId} разрешил сообщения. Всего: ${subscribers.size}`
    );
  }

  // ==========================================
  // ПОЛЬЗОВАТЕЛЬ ЗАПРЕТИЛ СООБЩЕНИЯ
  // ==========================================

  if (body.type === 'message_deny') {
    const userId = body.object.user_id;

    subscribers.delete(userId);
    saveSubscribers();

    console.log(
      `Пользователь ${userId} запретил сообщения. Всего: ${subscribers.size}`
    );
  }

  // ==========================================
  // ПОЛЬЗОВАТЕЛЬ НАПИСАЛ САМ
  // ==========================================

  if (body.type === 'message_new') {
    const userId = body.object.from_id;
    const messageText = (body.object.text || '').trim();

    console.log(
      `Новое сообщение от ${userId}: ${messageText}`
    );

    await sendMessageWelcome(userId);
  }
});

// ============================================
// СПИСОК ПОДПИСЧИКОВ
// ============================================

app.get('/subscribers', (req, res) => {
  if (
    !BROADCAST_SECRET ||
    req.query.secret !== BROADCAST_SECRET
  ) {
    return res.status(403).json({
      error: 'Forbidden'
    });
  }

  res.json([...subscribers]);
});

// ============================================
// ОТПРАВКА ПРИВЕТСТВИЯ ПРИ ПОДПИСКЕ
// ============================================

async function sendWelcomeMessage(userId) {
  try {
    const response = await axios.get(
      'https://api.vk.com/method/messages.send',
      {
        params: {
          user_id: userId,
          message: WELCOME_TEXT,
          random_id: Date.now(),
          access_token: ACCESS_TOKEN,
          v: API_VERSION
        }
      }
    );

    if (response.data.error) {
      console.error(
        'Ошибка VK API при отправке приветствия:',
        response.data.error
      );
    } else {
      console.log(
        `Приветствие отправлено пользователю ${userId}`
      );
    }

  } catch (err) {
    console.error(
      'Ошибка запроса VK API:',
      err.message
    );
  }
}

// ============================================
// ОТВЕТ НА ВХОДЯЩЕЕ СООБЩЕНИЕ
// ============================================

async function sendMessageWelcome(userId) {
  try {
    const response = await axios.get(
      'https://api.vk.com/method/messages.send',
      {
        params: {
          user_id: userId,
          message: MESSAGE_WELCOME_TEXT,
          random_id: Date.now(),
          access_token: ACCESS_TOKEN,
          v: API_VERSION
        }
      }
    );

    if (response.data.error) {
      console.error(
        'Ошибка VK API при автоответе:',
        response.data.error
      );
    } else {
      console.log(
        `Автоответ отправлен пользователю ${userId}`
      );
    }

  } catch (err) {
    console.error(
      'Ошибка отправки автоответа:',
      err.message
    );
  }
}

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Сервер запущен на порту ${PORT}`
  );
});
