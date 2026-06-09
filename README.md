<div align="center">

# 🛡️ SecureAttend

### ប្រព័ន្ធកត់ត្រាវត្តមានបុគ្គលិកឌីជីថល · ទំនើប · សុវត្ថិភាព

ផ្ទៀងផ្ទាត់ទីតាំង **GPS** · ថតមុខ **Selfie** · ស្កេន **QR** · ជូនដំណឹងភ្លាមៗតាម **Telegram**

ដំណោះស្រាយវត្តមានដ៏ទំនើបសម្រាប់គ្រប់ស្ថាប័ន — សាលារៀន ក្រុមហ៊ុន និងការិយាល័យ។

</div>

---

## ✨ លក្ខណៈពិសេស (Features)

| | មុខងារ | ការពិពណ៌នា |
|---|---|---|
| 📍 | **Geofencing** | កត់ត្រាបានតែពេលនៅក្នុងរយៈចម្ងាយ (Radius) ដែលកំណត់ពីការិយាល័យ ដោយប្រើរូបមន្ត Haversine |
| 📸 | **Selfie Verification** | ថតមុខផ្ទាល់តាមកាមេរ៉ាមុខ — ហាមការ Upload រូបកាត់ត |
| 🔳 | **QR Check-in** | ស្កេន QR Code ការិយាល័យសម្រាប់ Check-IN / OUT រហ័ស |
| 🔔 | **Telegram Alerts** | ជូនដំណឹងទៅ Admin Group ភ្លាមៗពេលមានបុគ្គលិក Check-IN/OUT |
| 🗺️ | **Live Map** | បង្ហាញទីតាំងបុគ្គលិក និងតំបន់ការិយាល័យលើផែនទី |
| 🧑‍💼 | **Admin Dashboard** | គ្រប់គ្រងបុគ្គលិក កំណត់ទីតាំង និងភ្ជាប់ Telegram |
| 📱 | **Telegram Mini App** | ដំណើរការជា Web App ក្នុង Telegram ដោយផ្ទាល់ |

## 🧱 បច្ចេកវិទ្យា (Tech Stack)

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** · **Motion** · **Lucide Icons**
- **Supabase** (Database) · **Telegraf** (Telegram Bot)
- **Leaflet / OpenStreetMap** (Maps)

## 🚀 ដំណើរការ (Run Locally)

**តម្រូវការ:** Node.js 18+

```bash
# 1. ដំឡើង dependencies
npm install

# 2. កំណត់ environment variables
cp .env.example .env.local
#    បំពេញ TELEGRAM_BOT_TOKEN, SUPABASE_* ។ល។ ក្នុង .env.local

# 3. ដំណើរការ
npm run dev
```

បើកនៅ [http://localhost:3000](http://localhost:3000)

## ⚙️ Environment Variables

សូមមើល [`.env.example`](.env.example) — តម្រូវ Telegram Bot Token, Admin Chat ID, និង Supabase keys។

## 🔐 ការកំណត់ Admin

កំណត់ `ADMIN_TELEGRAM_ID` ក្នុង environment ដើម្បីការពារផ្ទាំង `/admin` ឱ្យចូលបានតែ Admin។

---

<div align="center">
<sub>© SecureAttend · បង្កើតឡើងសម្រាប់ស្ថាប័នកម្ពុជា 🇰🇭</sub>
</div>
