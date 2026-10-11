// إعدادات مِحبرة
// server: لينك السيرفر الخاص بيك (Cloudflare Worker). سيبه فاضي عشان يشتغل بالخدمة المجانية.
// token:  نفس الكلمة السرية اللي حطيتها في السيرفر باسم APP_TOKEN (اختياري).
// contact: بريد التواصل اللي يظهر في سياسة الخصوصية (اختياري).
window.MIHBARA_CONFIG = {
  server: "",
  token: "",
  contact: ""
};
// تحميل أداة التحقق التلقائي من الأخبار
document.write('<script src="verify.js"><\/script>');
