package com.mihbara.app;

import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.content.ContentValues;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashMap;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.util.Locale;

public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/index.html";

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private ValueCallback<Uri[]> fileCallback;
    private static final int FILE_REQ = 41;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        webView.setBackgroundColor(night ? 0xFF0E0E13 : 0xFFF6F6F9);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true;
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { sendTts("done", id); }
                    @Override public void onError(String id) { sendTts("error", id); }
                    @Override public void onStop(String id, boolean interrupted) { sendTts("done", id); }
                });
            }
        });

        webView.addJavascriptInterface(new TtsBridge(), "MihbaraTTS");
        webView.addJavascriptInterface(new ShareBridge(), "MihbaraShare");
        webView.addJavascriptInterface(new UiBridge(), "MihbaraUI");
        webView.addJavascriptInterface(new NetBridge(), "MihbaraNet");
        webView.addJavascriptInterface(new NotifyBridge(), "MihbaraNotify");
        webView.addJavascriptInterface(new FileBridge(), "MihbaraFile");
        if (NewsJobService.prefs(this).getBoolean("enabled", false)) NewsJobService.schedule(this);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                boolean wantsVideo = false;
                try { for (String t : params.getAcceptTypes()) if (t != null && t.startsWith("video")) wantsVideo = true; } catch (Exception ignored) { }
                pick.setType(wantsVideo ? "video/*" : "image/*");
                try {
                    startActivityForResult(Intent.createChooser(pick, "اختار صورة"), FILE_REQ);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) { }
                return true;
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private void sendTts(String event, String id) {
        final String js = "window.__tts && window.__tts('" + event + "','" + id.replace("'", "") + "')";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private class TtsBridge {
        @JavascriptInterface
        public boolean speak(String text, String lang, String id, float pitch, float rate) {
            if (!ttsReady || tts == null) return false;
            String[] p = lang.split("-");
            Locale loc = p.length > 1 ? new Locale(p[0], p[1]) : new Locale(p[0]);
            int r = tts.setLanguage(loc);
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                r = tts.setLanguage(new Locale("ar"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) return false;
            }
            tts.setPitch(pitch);
            tts.setSpeechRate(rate);
            return tts.speak(text, TextToSpeech.QUEUE_ADD, null, id) == TextToSpeech.SUCCESS;
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null) tts.stop();
        }
    }

    // بيجيب نتايج البحث من أخبار جوجل (بس) لأداة التحقق
    private class NetBridge {
        @JavascriptInterface
        public void get(final String url, final String id) {
            final String safeId = id == null ? "" : id.replaceAll("[^A-Za-z0-9_]", "");
            new Thread(() -> {
                boolean ok = false;
                String b64 = "";
                try {
                    Uri u = Uri.parse(url);
                    if (!"https".equals(u.getScheme()) || !"news.google.com".equals(u.getHost())) throw new Exception("blocked");
                    java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(12000);
                    c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) Mihbara/1.7");
                    int code = c.getResponseCode();
                    java.io.InputStream in = c.getInputStream();
                    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n, total = 0;
                    while ((n = in.read(buf)) > 0 && total < 3000000) { bo.write(buf, 0, n); total += n; }
                    in.close();
                    b64 = android.util.Base64.encodeToString(bo.toByteArray(), android.util.Base64.NO_WRAP);
                    ok = code == 200;
                } catch (Exception e) {
                    ok = false;
                }
                final String js = "window.__net && window.__net('" + safeId + "'," + ok + ",'" + b64 + "')";
                webView.post(() -> webView.evaluateJavascript(js, null));
            }).start();
        }
    }

    // تنبيهات الأخبار الجديدة في الخلفية
    private class NotifyBridge {
        @JavascriptInterface
        public void configure(String json) {
            NewsJobService.prefs(MainActivity.this).edit().putString("feeds", json == null ? "[]" : json).apply();
        }

        @JavascriptInterface
        public void seen(String json) {
            NewsJobService.addSeen(MainActivity.this, json);
        }

        @JavascriptInterface
        public boolean isEnabled() {
            return NewsJobService.prefs(MainActivity.this).getBoolean("enabled", false) && NewsJobService.canNotify(MainActivity.this);
        }

        @JavascriptInterface
        public void setEnabled(boolean on) {
            NewsJobService.prefs(MainActivity.this).edit().putBoolean("enabled", on).apply();
            if (on) {
                if (Build.VERSION.SDK_INT >= 33 && !NewsJobService.canNotify(MainActivity.this))
                    runOnUiThread(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 77));
                NewsJobService.schedule(MainActivity.this);
            } else {
                NewsJobService.cancel(MainActivity.this);
            }
        }
    }

    private class UiBridge {
        @JavascriptInterface
        public void setDark(boolean dark) {
            runOnUiThread(() -> {
                int c = dark ? 0xFF0E0E13 : 0xFFF6F6F9;
                getWindow().setStatusBarColor(c);
                if (dark || Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getWindow().setNavigationBarColor(c);
                else getWindow().setNavigationBarColor(0xFF15151C);
                webView.setBackgroundColor(c);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    View d = getWindow().getDecorView();
                    int f = d.getSystemUiVisibility();
                    if (dark) f &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; else f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (dark) f &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR; else f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                    d.setSystemUiVisibility(f);
                }
            });
        }
    }

    private class ShareBridge {
        @JavascriptInterface
        public void share(String text) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text);
            runOnUiThread(() -> {
                try { startActivity(Intent.createChooser(send, "مشاركة")); } catch (Exception ignored) { }
            });
        }
    }

    private class FileBridge {
        private final HashMap<String, OutputStream> streams = new HashMap<>();
        private final HashMap<String, Uri> uris = new HashMap<>();
        private final HashMap<String, String> mimes = new HashMap<>();
        private final HashMap<String, String> places = new HashMap<>();

        @JavascriptInterface
        public synchronized String begin(String name, String mime) {
            try {
                String id = Long.toString(System.nanoTime());
                String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                OutputStream os; Uri uri; String place;
                if (Build.VERSION.SDK_INT >= 29) {
                    boolean img = mime.startsWith("image/"), vid = mime.startsWith("video/");
                    String dir = (img ? Environment.DIRECTORY_PICTURES : vid ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_DOWNLOADS) + "/Atheer";
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, dir);
                    v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri coll = img ? MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                            : vid ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                            : MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    uri = getContentResolver().insert(coll, v);
                    if (uri == null) return "";
                    os = getContentResolver().openOutputStream(uri);
                    place = dir;
                } else {
                    File d = new File(getExternalFilesDir(null), "Atheer");
                    if (!d.exists()) d.mkdirs();
                    File f = new File(d, safe);
                    os = new FileOutputStream(f);
                    uri = null;
                    place = f.getAbsolutePath();
                }
                if (os == null) return "";
                streams.put(id, os); if (uri != null) uris.put(id, uri); mimes.put(id, mime); places.put(id, place);
                return id;
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public synchronized boolean append(String id, String b64) {
            OutputStream os = streams.get(id);
            if (os == null) return false;
            try { os.write(Base64.decode(b64, Base64.DEFAULT)); return true; } catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public synchronized String finish(String id) {
            OutputStream os = streams.remove(id);
            if (os == null) return "";
            try {
                os.close();
                Uri uri = uris.get(id);
                if (uri != null && Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContentResolver().update(uri, v, null, null);
                }
                String p = places.get(id);
                return p == null ? "" : p;
            } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public void share(String id) {
            final Uri uri = uris.get(id);
            if (uri == null) return;
            final String mime = mimes.get(id);
            runOnUiThread(() -> {
                try {
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType(mime == null ? "*/*" : mime);
                    send.putExtra(Intent.EXTRA_STREAM, uri);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(send, "افتح الـ LUT في…"));
                } catch (Exception ignored) { }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQ && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                result = new Uri[]{ data.getData() };
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("(window.atheerBack&&window.atheerBack())?'1':'0'", v -> {
            if (v != null && v.contains("1")) return;
            if (webView.canGoBack()) webView.goBack();
            else finish();
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        super.onDestroy();
    }
}
