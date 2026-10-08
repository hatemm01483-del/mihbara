# تجهيز سيرفر مِحبرة (اختياري)

السيرفر بيخبّي مفاتيحك، فالطلاب يستخدموا التطبيق من غير ما حد يشوف أي مفتاح.

## 1. اعمل السيرفر (مجاني)
1. ادخل dash.cloudflare.com واعمل حساب.
2. Workers & Pages ← Create ← Create Worker ← سمّيه `mihbara` ← Deploy.
3. دوس Edit code، امسح الكود كله، والصق محتوى `worker.js`، ودوس Deploy.
4. هتلاقي لينك شبه: `https://mihbara.اسمك.workers.dev` — انسخه.

## 2. حط المفاتيح
في صفحة الـ Worker ← Settings ← Variables and Secrets ← Add، واختار النوع Secret:
- `ANTHROPIC_API_KEY` = مفتاح الذكاء الاصطناعي (من console.anthropic.com).
- `DID_API_KEY` = مفتاح D-ID لو عايز المذيع فيديو (من studio.d-id.com). اختياري.
- `APP_TOKEN` = أي كلمة سرية تخترعها. اختياري بس مفيد.

ومن صفحات الحسابات دي، حط حد أقصى للصرف الشهري.

## 3. اربط التطبيق بالسيرفر
عدّل `app/src/main/assets/config.js`:
```js
window.MIHBARA_CONFIG = {
  server: "https://mihbara.اسمك.workers.dev",
  token: "نفس الكلمة السرية",
  contact: "بريدك للتواصل"
};
```
GitHub هيبني نسخة جديدة لوحده.
