process.env["NTBA_FIX_350"] = "1";
require('dotenv').config();
const TelegramAPI = require('node-telegram-bot-api');
const bot = new TelegramAPI(process.env.TOKEN, { polling: true });

let cache = {};

async function startMessage(chatID) {
    return bot.sendMessage(chatID, 'Выберите интересующую колоду!', {
        disable_notification: true,
        reply_markup: {
            keyboard: [['Универсальная колода'], ['Карта моих чувств']],
            resize_keyboard: true,
            // one_time_keyboard: true,
        }
    })
}

async function errorMessage(chatID) {
    return bot.sendMessage(chatID, 'Произошла ошибка, повторите попытку', {
        reply_markup: {
            keyboard: [['Перезапустить бота']],
            resize_keyboard: true,
            // one_time_keyboard: true,
        }
    })
} 
async function subscribeMessage(chatID) {
    return bot.sendMessage(chatID, 'Ой, кажется вы еще не подписаны на канал! Возвращайтесь, когда подпишетесь.', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Подписаться на канал',
                        url: 'https://t.me/psychologist_Marina_Chernova',
                    },
                ],
            ],
        },
    })
}

async function pullCard(chatID) {
    try {
        const userCache = cache[chatID];
        cache[chatID].number = Math.floor(Math.random() * 50);
        const newImagePath = `./assets/${userCache.category === 'Карта моих чувств' ? 'feelings' : 'universal'}/Card-${userCache.number}.jpeg`;
        cache[chatID].number = undefined;
        const temporaryMessage = await bot.sendMessage(chatID, 'Ваше бессознательное выбрало карту...', { disable_notification: true, reply_markup: { remove_keyboard: true } });
        await bot.sendChatAction(chatID, 'upload_photo');

        return bot.sendPhoto(chatID, newImagePath, {
            caption: 'Помогающие вопросы: <blockquote>Что изображено на картинке?\nЧто, по вашему мнению, сейчас происходит на картинке?\nЧто чувствует этот персонаж? А этот? (даже если изображено дерево).\nЧто на картинке есть, а вы не заметили?\nЧто поможет вам?</blockquote>',
            parse_mode: 'html',
            reply_markup: {
                keyboard: [['Ещё карту'], ['Сменить колоду']],
                resize_keyboard: true,
                // one_time_keyboard: true,
            },
        }).then(() => bot.deleteMessage(chatID, temporaryMessage.message_id));
    } catch (error) {
        console.error(error.message);
        return errorMessage(chatID);
    }
}

bot.on('message', async function (message) {
    const chatID = message.chat.id;
    const text = message.text;
    const chatMember = await bot.getChatMember('@psychologist_Marina_Chernova', chatID);
    const isSubscribed = chatMember.status !== 'left' && chatMember.status !== 'kicked';

    try {
        if (isSubscribed) {
            switch (text) {
                case '/start':
                case 'Сменить колоду':
                case 'Перезапустить бота':
                    cache[chatID] = { category: undefined, number: undefined, categoryMessage: undefined };
                    return startMessage(chatID);
                case 'Универсальная колода':
                case 'Карта моих чувств':
                    cache[chatID].category = text;
                    const categoryMessage = await bot.sendMessage(chatID, 'Самое важное правило – ваш запрос должен быть связан лично с вами.\nВыбрав карту, опишите то, что вы видите. Лучше всего это делать вслух.', {
                        disable_notification: true,
                        reply_markup: {
                            // inline_keyboard: [
                            //     [
                            //         {
                            //             text: 'Выбрать карту',
                            //             callback_data: '/pull',
                            //         },
                            //     ],
                            //     [
                            //         {
                            //             text: 'Сменить колоду',
                            //             callback_data: '/category',
                            //         }
                            //     ],
                            // ],
                            keyboard: [['Выбрать карту'], ['Сменить колоду']],
                            resize_keyboard: true,
                            // one_time_keyboard: true,
                        },
                    })
                    cache[chatID].categoryMessage = categoryMessage.message_id;
                    break;
                case 'Выбрать карту':
                case 'Ещё карту':
                    return pullCard(chatID);
            }
        } else {
            return subscribeMessage(chatID);
        }
    } catch (error) {
        console.error(error.message);
        return errorMessage(chatID);
    }
})

bot.on('callback_query', async function (message) {
    const chatID = message.message.chat.id;
    const data = message.data;
    const chatMember = await bot.getChatMember('https://t.me/psychologist_Marina_Chernova', chatID);
    const isSubscribed = chatMember.status !== 'left' && chatMember.status !== 'kicked';

    try {
        if (isSubscribed) {
            switch (data) {
                case '/pull':
                    return pullCard(chatID);
                case '/category':
                    startMessage(chatID);
            }
        } else {
            return subscribeMessage(chatID);
        }
    } catch (error) {
        console.error(error.message);
        return errorMessage(chatID);
    }
})

bot.setMyCommands([
    {
        command: '/start',
        description: 'Перезапустить бота',
    }
])

// Что изображено на картинке?\n\nЧто, по вашему мнению, сейчас происходит на картинке?\n\nЧто чувствует этот персонаж? А этот? (даже если изображено дерево).\n\nЧто на картинке привлекло ваше внимание больше всего и почему?\n\nЕсть ли на этой картинке вы? Или Кто это может быть из вашей реальной жизни?\n\nЧто на картинке есть, а вы не заметили?\n\nЧто хотелось бы сделать?\n\nЧто поможет вам?