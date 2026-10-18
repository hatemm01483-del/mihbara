// إعدادات أثير
// server: لينك السيرفر الخاص بيك (Cloudflare Worker). سيبه فاضي عشان يشتغل بالخدمة المجانية.
// token:  بيتحط تلقائياً وقت البناء من سر GitHub اسمه MIHBARA_TOKEN (متكتبهوش هنا لأن المشروع عام).
// contact: بريد التواصل اللي يظهر في سياسة الخصوصية (اختياري).
window.MIHBARA_CONFIG = {
  server: "https://mihbara.hatem-m01483.workers.dev",
  token: "",
  contact: ""
};
// تحميل أداة التحقق التلقائي من الأخبار
document.write('<script src="verify.js"><\/script>');
document.write('<script src="features.js"><\/script>');
document.write('<script src="live.js"><\/script>');
document.write('<script src="manage.js"><\/script>');
document.write('<script src="lut.js"><\/script>');
document.write('<script src="anchor.js"><\/script>');
document.write('<script src="social.js"><\/script>');
