// إعدادات NewsCast 360
// server: لينك السيرفر الخاص بيك (Cloudflare Worker). سيبه فاضي عشان يشتغل بالخدمة المجانية.
// token:  بيتحط تلقائياً وقت البناء من سر GitHub اسمه MIHBARA_TOKEN (متكتبهوش هنا لأن المشروع عام).
// contact: بريد التواصل اللي يظهر في سياسة الخصوصية (اختياري).
window.MIHBARA_CONFIG = {
  server: "https://mihbara.hatem-m01483.workers.dev",
  token: "",
  contact: ""
};
// الحساب والخطط (اختياري، v3.3)
document.write('<script src="account.js"><\/script>');
// شاشة الترحيب وتقسيم الرئيسية (v3.2)
document.write('<script src="hello.js"><\/script>');
// الواجهة الجديدة: 4 تبويبات + اللعبة + أقفال الخطط (v3.3)
document.write('<script src="shell.js"><\/script>');
// تحميل أداة التحقق التلقائي من الأخبار
document.write('<script src="verify.js"><\/script>');
document.write('<script src="features.js"><\/script>');
document.write('<script src="live.js"><\/script>');
document.write('<script src="manage.js"><\/script>');
document.write('<script src="lut.js"><\/script>');
document.write('<script src="anchor.js"><\/script>');
document.write('<script src="social.js"><\/script>');
// تحديث 3.0: أدوات مشتركة + التحديثات الأربعة
['kit','daily','onair','avlab','prlab','career'].forEach(function (f) { document.write('<script src="' + f + '.js"><\/script>'); });
