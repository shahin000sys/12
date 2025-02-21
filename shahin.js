import dotenv from "dotenv";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const RECORD_ID = process.env.DNS_RECORD_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

let lastIP = null;

async function getIP(domain) {
  try {
    const response = await fetch(`https://check-host.net/ip-info?host=${domain}`);
    const data = await response.text();
    const $ = cheerio.load(data);
    const ip = $("strong").text().match(/(\d+\.\d+\.\d+\.\d+)/);
    if (ip && ip[0]) {
      console.log("IP دامنه:", ip[0]);
      return ip[0];
    } else {
      console.log("❌ IP یافت نشد.");
      return null;
    }
  } catch (error) {
    console.error("❌ خطا در دریافت IP:", error.message);
    return null;
  }
}

async function updateDNSRecord() {
  const CLOUDFLARE_API_URL = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}`;
  const NEW_IP = await getIP("cname.ircf.space");
  if (!NEW_IP) {
    console.log("❌ عملیات به‌دلیل عدم دریافت IP متوقف شد.");
    return;
  }
  if (NEW_IP !== lastIP) {
    console.log("✅ IP تغییر کرده است:", NEW_IP);
    await sendTelegramMessage(
      `✅ IP successfully changed.\n\n🔗 SubDomain: jmhngf435tyjhgnfb.kavirmotor.site\n🎲 Ip Changed: ${NEW_IP}\n\n\n#shahin`
    );
    lastIP = NEW_IP;
    try {
      const recordData = {
        type: "A",
        name: "jmhngf435tyjhgnfb",
        content: NEW_IP,
        ttl: 120,
        proxied: false,
      };
      const response = await fetch(CLOUDFLARE_API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recordData),
      });
      const result = await response.json();
      if (result.success) {
        console.log("✅ رکورد با موفقیت آپدیت شد:", result.result);
      } else {
        console.error("❌ خطا در آپدیت رکورد:", result.errors);
      }
    } catch (error) {
      console.error("❌ خطای درخواست:", error.message);
    }
  }
}

async function sendTelegramMessage(message) {
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message);
    console.log("✅ پیام تلگرام ارسال شد.");
  } catch (error) {
    console.error("❌ خطا در ارسال پیام تلگرام:", error.message);
  }
}

setInterval(updateDNSRecord, 20000);

bot.onText(/\/change/, (msg) => {
  if (msg.chat.id.toString() === TELEGRAM_CHAT_ID) {
    console.log("🔄 دریافت فرمان /change از تلگرام");
    updateDNSRecord();
    bot.sendMessage(TELEGRAM_CHAT_ID, "🔄 IP is being updated...");
  }
});
