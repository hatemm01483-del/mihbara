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
- `MODEL` (النوع Text) = `claude-haiku-5-5` — الأسرع والأرخص لكل الأدوات.
- `VERIFY_MODEL` (اختياري، Text) = الموديل اللي بيبحث في المصادر لأداة التحقق. الافتراضي `claude-sonnet-5-5`.
- `TRUSTED_DOMAINS` (اختياري، Text) = لو عايز تغيّر قايمة المواقع الموثوقة: مواقع مفصولة بفاصلة، مثلاً `cabinet.gov.eg,ahram.org.eg,reuters.com`.

### أداة التحقق من الأخبار
بتبحث بنفسها في المواقع الموثوقة بس (الجهات الرسمية، وكالات الأنباء، الصحف الكبرى، منصات تدقيق المعلومات)، وبتعرض الروابط اللي راجعتها.
تكلفتها أعلى شوية من باقي الأدوات لأن كل بحث بيتحسب: تقريباً 5 لـ 8 سنت للتحقق الواحد.

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
