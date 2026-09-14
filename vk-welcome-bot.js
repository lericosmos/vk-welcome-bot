const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const CONFIRMATION_STRING = process.env.CONFIRMATION_STRING || 'СТРОКА_ПОДТВЕРЖДЕНИЯ';
const SECRET_KEY = process.env.SECRET_KEY || '';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'ТОКЕН_ДОСТУПА_СООБЩЕСТВА';
const API_VERSION = '5.199';
const WELCOME_TEXT = `Спасибо за подписку! Рады видеть вас в сообществе 🎉

Если давно хотелось попробовать что-то новое, у нас есть несколько направлений:

Pole Fit — пилон + физическая нагрузка: элементы, трюки и прокачка тела.
High Heels — танцы на каблуках, пластика, хореография и уверенная подача.
Exotic Pole Dance — женственные, более чувственные хореографии и техника у пилона.
Strip Plastic — партерная пластика, женственные движения и танцевальные связки.
Stretching — растяжка и гибкость в комфортном темпе.
Гамак — воздушная растяжка, расслабление и работа с телом.
Pole Kids — занятия на пилоне для детей.

Куда бы вы хотели записаться?

Напишите название направления — подскажем ближайшее занятие и поможем записаться 💌`;
app.post('/vk-callback', async (req, res) => {
  const body = req.body;

  if (SECRET_KEY && body.secret !== SECRET_KEY) {
    return res.status(200).send('Bad secret');
  }

  if (body.type === 'confirmation') {
    return res.send(CONFIRMATION_STRING);
  }

  res.send('ok');

  if (body.type === 'group_join') {
    const userId = body.object.user_id;
    console.log(`Новый подписчик: ${userId}`);
    await sendWelcomeMessage(userId);
  }
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
