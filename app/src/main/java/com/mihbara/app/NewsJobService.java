package com.mihbara.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// بيشيك على أخبار الاهتمامات في الخلفية كل ربع ساعة ويبعت تنبيه لو فيه جديد
public class NewsJobService extends JobService {

    static final String PREFS = "mihbara_notify";
    static final String CHANNEL = "news";
    static final int JOB_ID = 1001;
    static final int NOTIF_ID = 2001;
    private static final Pattern ITEM = Pattern.compile("<item>(.*?)</item>", Pattern.DOTALL);

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(() -> {
            try { check(getApplicationContext()); } catch (Exception ignored) { }
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void schedule(Context ctx) {
        try {
            JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js == null) return;
            for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == JOB_ID) return;
            JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(ctx, NewsJobService.class))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPeriodic(15 * 60 * 1000L)
                    .setPersisted(true)
                    .build();
            js.schedule(info);
        } catch (Exception ignored) { }
    }

    static void cancel(Context ctx) {
        try {
            JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js != null) js.cancel(JOB_ID);
        } catch (Exception ignored) { }
    }

    static synchronized LinkedHashSet<String> loadSeen(SharedPreferences sp) {
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        try {
            JSONArray a = new JSONArray(sp.getString("seen", "[]"));
            for (int i = 0; i < a.length(); i++) seen.add(a.getString(i));
        } catch (Exception ignored) { }
        return seen;
    }

    static synchronized void saveSeen(SharedPreferences sp, LinkedHashSet<String> seen) {
        List<String> list = new ArrayList<>(seen);
        int from = Math.max(0, list.size() - 600);
        JSONArray a = new JSONArray();
        for (int i = from; i < list.size(); i++) a.put(list.get(i));
        sp.edit().putString("seen", a.toString()).apply();
    }

    // الأخبار اللي التطبيق عرضها، عشان مايبعتش تنبيه بيها تاني
    static void addSeen(Context ctx, String json) {
        try {
            SharedPreferences sp = prefs(ctx);
            LinkedHashSet<String> seen = loadSeen(sp);
            JSONArray a = new JSONArray(json);
            for (int i = 0; i < a.length(); i++) seen.add(a.getString(i));
            saveSeen(sp, seen);
        } catch (Exception ignored) { }
    }

    static boolean canNotify(Context ctx) {
        if (Build.VERSION.SDK_INT >= 33)
            return ctx.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
        return true;
    }

    static void check(Context ctx) throws Exception {
        SharedPreferences sp = prefs(ctx);
        if (!sp.getBoolean("enabled", false)) return;
        JSONArray feeds = new JSONArray(sp.getString("feeds", "[]"));
        if (feeds.length() == 0) return;
        LinkedHashSet<String> seen = loadSeen(sp);
        boolean first = seen.isEmpty();
        long now = System.currentTimeMillis();
        List<String[]> fresh = new ArrayList<>();
        Set<String> titles = new HashSet<>();
        for (int f = 0; f < feeds.length() && f < 15; f++) {
            JSONObject o = feeds.getJSONObject(f);
            String url = o.optString("u");
            if (!url.startsWith("https://news.google.com/")) continue;
            String xml;
            try { xml = fetch(url); } catch (Exception e) { continue; }
            Matcher m = ITEM.matcher(xml);
            int count = 0;
            while (m.find() && count < 15) {
                count++;
                String it = m.group(1);
                String link = tag(it, "link");
                if (link.isEmpty() || seen.contains(link)) continue;
                seen.add(link);
                String src = unesc(tag(it, "source"));
                String title = unesc(tag(it, "title"));
                if (!src.isEmpty() && title.endsWith(" - " + src)) title = title.substring(0, title.length() - src.length() - 3);
                long t = parseDate(tag(it, "pubDate"));
                if (t > 0 && now - t < 3 * 3600000L && titles.add(title)) fresh.add(new String[]{title, src});
            }
        }
        saveSeen(sp, seen);
        if (!first && !fresh.isEmpty() && canNotify(ctx)) post(ctx, fresh);
    }

    static void post(Context ctx, List<String[]> fresh) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "أخبار جديدة", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("تنبيه لما ينزل خبر جديد في اهتماماتك");
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        String head = fresh.size() == 1 ? "خبر جديد في اهتماماتك" : (fresh.size() + " أخبار جديدة في اهتماماتك");
        Notification.InboxStyle style = new Notification.InboxStyle();
        for (int i = 0; i < fresh.size() && i < 5; i++) {
            String[] x = fresh.get(i);
            style.addLine(x[1].isEmpty() ? x[0] : (x[0] + " — " + x[1]));
        }
        if (fresh.size() > 5) style.setSummaryText("و" + (fresh.size() - 5) + " غيرهم");
        b.setSmallIcon(R.drawable.ic_stat_news)
                .setContentTitle(head)
                .setContentText(fresh.get(0)[0])
                .setStyle(style)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setColor(0xFF1E3A8A);
        nm.notify(NOTIF_ID, b.build());
    }

    static String fetch(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(12000);
        c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) Mihbara/1.8");
        if (c.getResponseCode() != 200) throw new Exception("http");
        InputStream in = c.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n, total = 0;
        while ((n = in.read(buf)) > 0 && total < 3000000) { bo.write(buf, 0, n); total += n; }
        in.close();
        return bo.toString("UTF-8");
    }

    static String tag(String s, String name) {
        Matcher m = Pattern.compile("<" + name + "(?:\\s[^>]*)?>(.*?)</" + name + ">", Pattern.DOTALL).matcher(s);
        if (!m.find()) return "";
        String v = m.group(1).trim();
        if (v.startsWith("<![CDATA[") && v.endsWith("]]>")) v = v.substring(9, v.length() - 3);
        return v.trim();
    }

    static String unesc(String s) {
        return s.replace("&quot;", "\"").replace("&#39;", "'").replace("&apos;", "'")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&nbsp;", " ").replace("&amp;", "&");
    }

    static long parseDate(String s) {
        try {
            return new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz", Locale.US).parse(s).getTime();
        } catch (Exception e) {
            return 0;
        }
    }
}
