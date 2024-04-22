// Misc
const fs = require('fs');
require('dotenv').config()
const config = require('./src/config/config.json');

// Telegram
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const tgBot = new Telegraf(process.env.TELEGRAM_BOT)
const solideoId = process.env.CHANNEL_ID

// Whatsapp
const adminNumber = process.env.ADMIN_NUMBER
const { Client, LocalAuth, Buttons, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Youtube
const ytdl = require('ytdl-core');

// Main
const client = new Client({
	restartOnAuthFail: true,
	puppeteer: {
		headless: 'shell',
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		executablePath: `${config.executablePath}`,
	},
	webVersionCache: {
		type: 'remote',
		remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html`,
	},
	authStrategy: new LocalAuth({ clientId: "client" })
});

client.on('qr', (qr) => {
	console.log(`[🤳] Scan the QR below : `);
	qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
	console.log('[✅] Client is ready!');
	client.sendMessage(adminNumber, 'Bot is ready!');
});

client.on('message', async (message) => {
	let tempUrl = message.body.split(' ')[1];
	let url = tempUrl ? tempUrl : message.body

	function isFileExist(title, format) {
		if (fs.existsSync(`src/database/${title}.${format}`)) {
			return true
		} else {
			return false
		}
	}
	async function downloadYouTube(url, format, filter) {
		client.sendMessage(message.from, '[⏳] Loading..');
		try {
			let info = await ytdl.getInfo(url);
			let title = info.videoDetails.title;

			if (isFileExist(title, format)) {
				let media = MessageMedia.fromFilePath(`./src/database/${title}.${format}`);
				await client.sendMessage(message.from, media, { sendMediaAsDocument: true });
			} else {
				ytdl(url, { filter: filter, format: format, quality: 'highest' }).pipe(fs.createWriteStream(`./src/database/${title}.${format}`)).on('finish', async () => {
					let media = MessageMedia.fromFilePath(`./src/database/${title}.${format}`);
					await client.sendMessage(message.from, media, { sendMediaAsDocument: true });
				});
			}
		} catch (err) {
			console.log(err);
			client.sendMessage(message.from, '*[❎]* Failed!');
		}
	}

	async function downloadMedia() {
		client.sendMessage(message.from, '[⏳] Loading..');
		try {
			const audio = await message.downloadMedia();
			const folder = process.cwd() + "/src/database/"
			const filename = folder + audio.filename
			fs.writeFileSync(filename, Buffer.from(audio.data, 'base64').toString('binary'), 'binary')
			await tgBot.telegram.sendDocument(solideoId, { source: filename })
		} catch (error) {
			console.log(error)
		}
	}

	if (message.body == `${config.prefix}help`) return client.sendMessage(message.from, `*${config.name}*\n\n[🎥] : *${config.prefix}video <youtube-url>*\n[🎧] : *${config.prefix}audio <youtube-url>*\n\n*Example :*\n${config.prefix}audio https://youtu.be/abcdefghij`);
	if (url == undefined) return;
	if ((message.body.startsWith('https://') || message.body.startsWith(`${config.prefix}audio`)) && !ytdl.validateURL(url)) return client.sendMessage(message.from, '*[❎]* Failed!, Invalid YouTube URL');
	if (message.body.startsWith(`${config.prefix}audio`)) {
		downloadYouTube(url, 'mp3', 'audioonly');
	} else if (message.body.startsWith('https://')) {
		downloadYouTube(url, 'mp4', 'audioandvideo');
	}
	if (message.hasMedia && message._data.mimetype === 'audio/mpeg') {
		await downloadMedia()
		client.sendMessage(message.from, '[✅] Forwarded')
		const chat = await message.getChat()
		chat.sendSeen()
	}
	if (message.body.startsWith('/judul ')) {
		const body = message.body.slice(7)
		const title = body.toUpperCase()
		tgBot.telegram.sendMessage(solideoId, title)
	}
});
tgBot.launch()
client.initialize();
