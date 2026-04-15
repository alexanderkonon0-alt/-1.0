const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.rareshot.livewallpaper';

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: AudioService (ForegroundService for radio)
// ═══════════════════════════════════════════════════════════════
const AUDIO_SERVICE_JAVA = `package ${PACKAGE_NAME};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

public class AudioService extends Service implements SharedPreferences.OnSharedPreferenceChangeListener {
    public static final String PREFS = "rareshot_prefs";
    private static final String CH_ID = "rareshot_audio";
    private static final int NOTIF_ID = 9001;
    private MediaPlayer player;
    private String radioUrl;
    private boolean isPlaying;
    private SharedPreferences sp;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.registerOnSharedPreferenceChangeListener(this);
        radioUrl = sp.getString("radio_url", null);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if ("PLAY".equals(action)) {
                radioUrl = sp.getString("radio_url", null);
                startPlayback();
            } else if ("STOP".equals(action)) {
                stopPlayback();
                stopForeground(true);
                stopSelf();
            } else if ("NEXT".equals(action)) {
                int idx = sp.getInt("station_index", 0) + 1;
                if (idx > 9) idx = 0;
                sp.edit().putInt("station_index", idx).apply();
            } else if ("PREV".equals(action)) {
                int idx = sp.getInt("station_index", 0) - 1;
                if (idx < 0) idx = 9;
                sp.edit().putInt("station_index", idx).apply();
            }
        }
        startForeground(NOTIF_ID, buildNotification());
        return START_STICKY;
    }

    private void startPlayback() {
        stopPlayback();
        if (radioUrl == null || radioUrl.isEmpty()) return;
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_MEDIA).build());
            player.setDataSource(radioUrl);
            player.setOnPreparedListener(mp -> { mp.start(); isPlaying = true; updateNotif(); });
            player.setOnErrorListener((mp, w, e) -> { Log.e("AudioService", "Error: " + w + "/" + e); stopPlayback(); return true; });
            player.setOnCompletionListener(mp -> { stopPlayback(); startPlayback(); });
            player.prepareAsync();
        } catch (Exception e) { Log.e("AudioService", "Start error", e); stopPlayback(); }
    }

    private void stopPlayback() {
        isPlaying = false;
        if (player != null) {
            try { player.stop(); } catch (Exception e) {}
            try { player.release(); } catch (Exception e) {}
            player = null;
        }
    }

    @Override
    public void onSharedPreferenceChanged(SharedPreferences prefs, String key) {
        if ("radio_url".equals(key)) {
            radioUrl = prefs.getString("radio_url", null);
            startPlayback();
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CH_ID, "Rare Shot Audio", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Background audio playback");
            ch.setSound(null, null);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        String title = sp.getString("station_name", "Rare Shot Radio");
        Intent mainIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) b = new Notification.Builder(this, CH_ID);
        else b = new Notification.Builder(this);

        return b.setContentTitle(title)
            .setContentText(isPlaying ? "Playing..." : "Paused")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pi)
            .setOngoing(true)
            .build();
    }

    private void updateNotif() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIF_ID, buildNotification());
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        if (sp != null) sp.unregisterOnSharedPreferenceChangeListener(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: LiveWallpaperService  (photo + particles + video
//              + auto-change + double-tap screen-lock)
// ═══════════════════════════════════════════════════════════════
const LIVE_SERVICE_JAVA = `package ${PACKAGE_NAME};

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.*;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.service.wallpaper.WallpaperService;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import org.json.JSONArray;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class LiveWallpaperService extends WallpaperService {
    public static final String PREFS = "rareshot_prefs";

    @Override
    public Engine onCreateEngine() { return new LiveEngine(); }

    static class Pt {
        float x, y, vx, vy, sz, rot, rotSpd, age, maxAge;
        int color;
        void tick(float dt) { x += vx * dt; y += vy * dt; rot += rotSpd * dt; age += dt; }
    }

    class LiveEngine extends Engine implements SharedPreferences.OnSharedPreferenceChangeListener {
        private final Handler H = new Handler(Looper.getMainLooper());
        private boolean vis = true;
        private int W = 1080, H2 = 1920;
        private Bitmap bmp;
        private String curUri;
        private MediaPlayer mp;
        private boolean isVid, vidReady;
        private String vidUri;
        private String fx = "none";
        private int fxInt = 2, fxSpd = 2;
        private final List<Pt> pts = new ArrayList<>();
        private final Random R = new Random();
        private final Paint pp = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint bp = new Paint();
        private boolean autoChg;
        private int autoSec = 300;
        private final List<String> uriList = new ArrayList<>();
        private int uriIdx;
        private long lastChgMs;
        private long tapMs;
        private float tapX, tapY;
        private android.media.MediaPlayer audioMp;
        private String radioUrl;
        private final Runnable drawR = () -> doDraw();

        @Override
        public void onCreate(SurfaceHolder sh) {
            super.onCreate(sh);
            setTouchEventsEnabled(true);
            SharedPreferences sp = c().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            sp.registerOnSharedPreferenceChangeListener(this);
            load(sp);
            mkPts();
            if (radioUrl != null && !radioUrl.isEmpty()) startAudio();
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            H.removeCallbacks(drawR);
            try { c().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .unregisterOnSharedPreferenceChangeListener(this); } catch (Exception e) {}
            killVid();
            killBmp();
            stopAudio();
        }

        @Override
        public void onVisibilityChanged(boolean v) {
            vis = v;
            if (v) {
                H.post(drawR);
                if (isVid && mp != null) try { mp.start(); } catch (Exception e) {}
                if (audioMp != null) try { audioMp.start(); } catch (Exception e) {}
                else if (radioUrl != null && !radioUrl.isEmpty()) startAudio();
            } else {
                H.removeCallbacks(drawR);
                if (isVid && mp != null) try { mp.pause(); } catch (Exception e) {}
                if (audioMp != null) try { audioMp.pause(); } catch (Exception e) {}
            }
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder sh, int fmt, int w, int h) {
            super.onSurfaceChanged(sh, fmt, w, h);
            W = w; H2 = h;
            mkPts();
            if (!isVid && curUri != null) loadImg(curUri);
            if (isVid && vidUri != null) initVid();
        }

        @Override public void onSurfaceCreated(SurfaceHolder sh) { super.onSurfaceCreated(sh); }
        @Override public void onSurfaceDestroyed(SurfaceHolder sh) { super.onSurfaceDestroyed(sh); vis = false; H.removeCallbacks(drawR); }

        @Override
        public void onTouchEvent(MotionEvent ev) {
            if (ev.getAction() == MotionEvent.ACTION_DOWN) {
                long now = System.currentTimeMillis();
                if (now - tapMs < 300 && Math.abs(ev.getX() - tapX) < 100 && Math.abs(ev.getY() - tapY) < 100) {
                    dblTap(); tapMs = 0;
                } else { tapMs = now; tapX = ev.getX(); tapY = ev.getY(); }
            }
            super.onTouchEvent(ev);
        }

        private void dblTap() {
            try {
                DevicePolicyManager d = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
                ComponentName cn = new ComponentName(c(), ScreenLockAdmin.class);
                if (d != null && d.isAdminActive(cn)) d.lockNow();
            } catch (Exception e) {}
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences sp, String k) {
            load(sp);
            if ("wallpaper_uri".equals(k) && !isVid && curUri != null) loadImg(curUri);
            if ("is_video".equals(k) || "video_uri".equals(k)) {
                if (isVid && vidUri != null) initVid(); else { killVid(); if (curUri != null) loadImg(curUri); }
            }
            if ("effect_type".equals(k) || "effect_intensity".equals(k)) mkPts();
            if ("radio_url".equals(k)) startAudio();
        }

        private void startAudio() {
            stopAudio();
            if (radioUrl == null || radioUrl.isEmpty()) return;
            new Thread(() -> {
                try {
                    audioMp = new android.media.MediaPlayer();
                    audioMp.setDataSource(radioUrl);
                    audioMp.setAudioAttributes(new android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(android.media.AudioAttributes.USAGE_MEDIA).build());
                    audioMp.setLooping(false);
                    audioMp.setOnPreparedListener(p -> { if (vis) p.start(); });
                    audioMp.setOnErrorListener((p, w, e) -> { stopAudio(); return true; });
                    audioMp.prepareAsync();
                } catch (Exception e) { stopAudio(); }
            }).start();
        }
        private void stopAudio() { if (audioMp != null) { try { audioMp.stop(); } catch (Exception e) {} try { audioMp.release(); } catch (Exception e) {} audioMp = null; } }

        private void load(SharedPreferences sp) {
            curUri = sp.getString("wallpaper_uri", null);
            isVid = sp.getBoolean("is_video", false);
            vidUri = sp.getString("video_uri", null);
            fx = sp.getString("effect_type", "none");
            fxInt = sp.getInt("effect_intensity", 2);
            fxSpd = sp.getInt("effect_speed", 2);
            autoChg = sp.getBoolean("auto_change", false);
            autoSec = sp.getInt("auto_change_interval", 300);
            uriList.clear();
            try { JSONArray a = new JSONArray(sp.getString("wallpaper_uris", "[]")); for (int i = 0; i < a.length(); i++) uriList.add(a.getString(i)); } catch (Exception e) {}
            radioUrl = sp.getString("radio_url", null);
        }

        private void loadImg(final String uri) {
            if (uri == null) return;
            new Thread(() -> {
                try {
                    Bitmap b;
                    if (uri.startsWith("http")) {
                        HttpURLConnection cn = (HttpURLConnection) new URL(uri).openConnection();
                        cn.setConnectTimeout(10000); cn.setReadTimeout(10000); cn.connect();
                        b = BitmapFactory.decodeStream(cn.getInputStream()); cn.disconnect();
                    } else {
                        InputStream is = getContentResolver().openInputStream(Uri.parse(uri));
                        b = BitmapFactory.decodeStream(is); if (is != null) is.close();
                    }
                    if (b != null) {
                        final Bitmap sc = crop(b, W, H2); if (sc != b) b.recycle();
                        H.post(() -> { killBmp(); bmp = sc; });
                    }
                } catch (Exception e) {}
            }).start();
        }

        private Bitmap crop(Bitmap s, int tw, int th) {
            if (s == null || tw <= 0 || th <= 0) return s;
            float sr = (float) s.getWidth() / s.getHeight(), tr = (float) tw / th;
            int cw, ch;
            if (sr > tr) { ch = s.getHeight(); cw = (int)(ch * tr); } else { cw = s.getWidth(); ch = (int)(cw / tr); }
            int ox = Math.max(0, (s.getWidth() - cw) / 2), oy = Math.max(0, (s.getHeight() - ch) / 2);
            Bitmap cr = Bitmap.createBitmap(s, ox, oy, Math.min(cw, s.getWidth() - ox), Math.min(ch, s.getHeight() - oy));
            Bitmap r = Bitmap.createScaledBitmap(cr, tw, th, true);
            if (cr != s && cr != r) cr.recycle(); return r;
        }

        private void killBmp() { if (bmp != null && !bmp.isRecycled()) bmp.recycle(); bmp = null; }

        private void initVid() {
            killVid(); if (vidUri == null) return;
            try {
                mp = new MediaPlayer();
                mp.setDataSource(c(), Uri.parse(vidUri));
                mp.setLooping(true); mp.setVolume(0f, 0f);
                SurfaceHolder sh = getSurfaceHolder(); if (sh != null) mp.setDisplay(sh);
                mp.setOnPreparedListener(p -> { vidReady = true; if (vis) p.start(); });
                mp.prepareAsync();
            } catch (Exception e) { killVid(); }
        }

        private void killVid() {
            vidReady = false;
            if (mp != null) { try { mp.stop(); } catch (Exception e) {} try { mp.release(); } catch (Exception e) {} mp = null; }
        }

        // ── PARTICLES ──
        private void mkPts() {
            pts.clear();
            if ("none".equals(fx)) return;
            int n = fxInt == 1 ? 20 : fxInt == 2 ? 40 : 65;
            for (int i = 0; i < n; i++) { Pt p = new Pt(); resetP(p, true); pts.add(p); }
        }

        private void resetP(Pt p, boolean scatter) {
            p.x = R.nextFloat() * W; p.age = 0; p.rot = R.nextFloat() * 360;
            switch (fx) {
                case "rain":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 80 + 20);
                    p.vy = 900 + R.nextFloat() * 500; p.vx = R.nextFloat() * 20 - 10;
                    p.sz = 2f; p.color = Color.argb(130, 180, 220, 255); break;
                case "snow":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 60 + 20);
                    p.vy = 50 + R.nextFloat() * 70; p.vx = R.nextFloat() * 40 - 20;
                    p.sz = 4 + R.nextFloat() * 8; p.color = Color.argb(200, 255, 255, 255); break;
                case "leaves":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 60 + 20);
                    p.vy = 70 + R.nextFloat() * 50; p.vx = 20 + R.nextFloat() * 30;
                    p.sz = 10 + R.nextFloat() * 8; p.rotSpd = 40 + R.nextFloat() * 60;
                    int[] lc = {Color.argb(170,74,222,128), Color.argb(165,34,197,94), Color.argb(170,21,128,61), Color.argb(150,251,191,36), Color.argb(152,134,239,172)};
                    p.color = lc[R.nextInt(lc.length)]; break;
                case "sparkles":
                    p.y = R.nextFloat() * H2; p.vy = 0; p.vx = 0;
                    p.sz = 10 + R.nextFloat() * 14; p.maxAge = 1.5f + R.nextFloat() * 2f;
                    p.color = Color.argb(200, 251, 191, 36); break;
                case "bubbles":
                    p.y = scatter ? R.nextFloat() * H2 : H2 + R.nextFloat() * 60;
                    p.vy = -(60 + R.nextFloat() * 60); p.vx = R.nextFloat() * 20 - 10;
                    p.sz = 8 + R.nextFloat() * 20; p.color = Color.argb(100, 74, 222, 128); break;
                case "fireflies":
                    p.y = R.nextFloat() * H2; p.vx = R.nextFloat() * 40 - 20; p.vy = R.nextFloat() * 40 - 20;
                    p.sz = 5; p.maxAge = 3 + R.nextFloat() * 3; p.color = Color.argb(230, 180, 255, 100); break;
                case "petals":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 60 + 20);
                    p.vy = 50 + R.nextFloat() * 40; p.vx = 10 + R.nextFloat() * 20;
                    p.sz = 8 + R.nextFloat() * 6; p.rotSpd = 20 + R.nextFloat() * 40;
                    p.color = Color.argb(180, 255, 182, 193); break;
                default: p.y = -50; p.vy = 100; p.sz = 4; p.color = Color.WHITE;
            }
        }

        private void drawPts(Canvas c) {
            if (pts.isEmpty()) return;
            float dt = 0.033f;
            float sm = fxSpd == 1 ? 0.5f : fxSpd == 3 ? 2.0f : 1.0f;
            for (Pt p : pts) {
                p.tick(dt * sm);
                boolean off = p.y > H2 + 60 || p.y < -120 || p.x > W + 60 || p.x < -60;
                if ("sparkles".equals(fx) || "fireflies".equals(fx)) {
                    if (p.age > p.maxAge) { resetP(p, true); continue; }
                    float lf = p.age / p.maxAge;
                    float fd = lf < 0.3f ? lf / 0.3f : lf > 0.7f ? (1f - lf) / 0.3f : 1f;
                    pp.setAlpha((int)(Color.alpha(p.color) * fd));
                } else { if (off) { resetP(p, false); continue; } pp.setAlpha(Color.alpha(p.color)); }
                pp.setColor(p.color); pp.setStyle(Paint.Style.FILL);
                switch (fx) {
                    case "rain": pp.setStrokeWidth(p.sz); c.drawLine(p.x, p.y, p.x + 1, p.y + 22, pp); break;
                    case "snow": c.drawCircle(p.x, p.y, p.sz / 2, pp); break;
                    case "leaves": c.save(); c.rotate(p.rot, p.x, p.y);
                        c.drawOval(new RectF(p.x - p.sz/2, p.y - p.sz/4, p.x + p.sz/2, p.y + p.sz/4), pp); c.restore(); break;
                    case "sparkles": drawStar(c, p.x, p.y, p.sz * 0.5f); break;
                    case "bubbles": pp.setStyle(Paint.Style.STROKE); pp.setStrokeWidth(1.5f);
                        c.drawCircle(p.x, p.y, p.sz / 2, pp); pp.setStyle(Paint.Style.FILL); break;
                    case "fireflies":
                        int ba = pp.getAlpha();
                        pp.setAlpha(ba / 3); c.drawCircle(p.x, p.y, p.sz * 3, pp);
                        pp.setAlpha(ba); c.drawCircle(p.x, p.y, p.sz, pp); break;
                    case "petals": c.save(); c.rotate(p.rot, p.x, p.y); c.drawCircle(p.x, p.y, p.sz / 2, pp); c.restore(); break;
                }
            }
        }

        private void drawStar(Canvas c, float cx, float cy, float r) {
            Path path = new Path();
            for (int i = 0; i < 4; i++) {
                float a = (float)(i * Math.PI / 2);
                float x1 = cx + (float)Math.cos(a) * r, y1 = cy + (float)Math.sin(a) * r;
                float x2 = cx + (float)Math.cos(a + Math.PI / 4) * r * 0.4f;
                float y2 = cy + (float)Math.sin(a + Math.PI / 4) * r * 0.4f;
                if (i == 0) path.moveTo(x1, y1); else path.lineTo(x1, y1);
                path.lineTo(x2, y2);
            }
            path.close(); c.drawPath(path, pp);
        }

        // ── AUTO-CHANGE ──
        private void autoCheck() {
            if (!autoChg || uriList.isEmpty()) return;
            long now = System.currentTimeMillis();
            if (lastChgMs == 0) lastChgMs = now;
            if (now - lastChgMs >= autoSec * 1000L) {
                lastChgMs = now;
                uriIdx = (uriIdx + 1) % uriList.size();
                curUri = uriList.get(uriIdx);
                loadImg(curUri);
            }
        }

        // ── DRAW LOOP ──
        private void doDraw() {
            if (!vis) return;
            autoCheck();
            if (isVid && vidReady && mp != null) {
                try { if (!mp.isPlaying() && vis) mp.start(); } catch (Exception e) {}
                H.removeCallbacks(drawR); H.postDelayed(drawR, 100); return;
            }
            SurfaceHolder sh = getSurfaceHolder(); Canvas canvas = null;
            try {
                canvas = sh.lockCanvas();
                if (canvas != null) {
                    canvas.drawColor(Color.BLACK);
                    if (bmp != null && !bmp.isRecycled()) canvas.drawBitmap(bmp, 0, 0, bp);
                    drawPts(canvas);
                }
            } catch (Exception e) {
            } finally { if (canvas != null) try { sh.unlockCanvasAndPost(canvas); } catch (Exception e) {} }
            H.removeCallbacks(drawR); if (vis) H.postDelayed(drawR, 33);
        }

        private Context c() { return getApplicationContext(); }
    }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: WallpaperModule  (React Native bridge)
// ═══════════════════════════════════════════════════════════════
const WALLPAPER_MODULE_JAVA = `package ${PACKAGE_NAME};

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.app.WallpaperManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import org.json.JSONArray;

public class WallpaperModule extends ReactContextBaseJavaModule {
    public static final String PREFS = "rareshot_prefs";
    public WallpaperModule(ReactApplicationContext ctx) { super(ctx); }
    @Override public String getName() { return "WallpaperModule"; }
    private SharedPreferences sp() { return getReactApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    @ReactMethod public void setWallpaperUri(String uri, Promise p) {
        try { sp().edit().putString("wallpaper_uri", uri).putBoolean("is_video", false).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setVideoUri(String uri, Promise p) {
        try { sp().edit().putString("video_uri", uri).putBoolean("is_video", true).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setWallpaperUris(ReadableArray uris, Promise p) {
        try { JSONArray a = new JSONArray(); for (int i = 0; i < uris.size(); i++) a.put(uris.getString(i));
            sp().edit().putString("wallpaper_uris", a.toString()).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setEffect(String type, int intensity, int speed, Promise p) {
        try { sp().edit().putString("effect_type", type).putInt("effect_intensity", intensity).putInt("effect_speed", speed).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setAutoChange(boolean on, int sec, Promise p) {
        try { sp().edit().putBoolean("auto_change", on).putInt("auto_change_interval", sec).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void launchWallpaperPicker(Promise p) {
        try {
            Intent i = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                new ComponentName(getReactApplicationContext(), LiveWallpaperService.class));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(i); p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void openWallpaperChooser(Promise p) {
        try { Intent i = new Intent(Intent.ACTION_SET_WALLPAPER); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(i); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void requestDeviceAdmin(Promise p) {
        try {
            ComponentName cn = new ComponentName(getReactApplicationContext(), ScreenLockAdmin.class);
            Intent i = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            i.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, cn);
            i.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Enable to lock screen with double-tap on live wallpaper");
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(i); p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void isDeviceAdminEnabled(Promise p) {
        try {
            DevicePolicyManager d = (DevicePolicyManager) getReactApplicationContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName cn = new ComponentName(getReactApplicationContext(), ScreenLockAdmin.class);
            p.resolve(d != null && d.isAdminActive(cn));
        } catch (Exception e) { p.resolve(false); }
    }
    @ReactMethod public void lockScreen(Promise p) {
        try {
            DevicePolicyManager d = (DevicePolicyManager) getReactApplicationContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName cn = new ComponentName(getReactApplicationContext(), ScreenLockAdmin.class);
            if (d != null && d.isAdminActive(cn)) { d.lockNow(); p.resolve(true); }
            else p.reject("NA", "Device admin not enabled");
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setRadioUrl(String url, Promise p) {
        try { sp().edit().putString("radio_url", url).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setStationName(String name, Promise p) {
        try { sp().edit().putString("station_name", name).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setAsLockScreen(String uri, Promise p) {
        try {
            android.app.WallpaperManager wm = android.app.WallpaperManager.getInstance(getReactApplicationContext());
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                java.io.InputStream is;
                if (uri.startsWith("http")) {
                    java.net.HttpURLConnection cn = (java.net.HttpURLConnection) new java.net.URL(uri).openConnection();
                    cn.setConnectTimeout(10000); cn.setReadTimeout(10000); cn.connect();
                    is = cn.getInputStream();
                } else {
                    is = getReactApplicationContext().getContentResolver().openInputStream(android.net.Uri.parse(uri));
                }
                if (is != null) {
                    wm.setStream(is, null, true, android.app.WallpaperManager.FLAG_LOCK);
                    is.close();
                    p.resolve(true);
                } else { p.reject("E", "Cannot open stream"); }
            } else { p.reject("E", "Requires Android 7+"); }
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void startAudioService(Promise p) {
        try {
            android.content.Intent i = new android.content.Intent(getReactApplicationContext(), AudioService.class);
            i.setAction("PLAY");
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getReactApplicationContext().startForegroundService(i);
            } else {
                getReactApplicationContext().startService(i);
            }
            p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void stopAudioService(Promise p) {
        try {
            android.content.Intent i = new android.content.Intent(getReactApplicationContext(), AudioService.class);
            i.setAction("STOP");
            getReactApplicationContext().startService(i);
            p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: WallpaperPackage
// ═══════════════════════════════════════════════════════════════
const WALLPAPER_PACKAGE_JAVA = `package ${PACKAGE_NAME};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class WallpaperPackage implements ReactPackage {
    @Override public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        List<NativeModule> m = new ArrayList<>(); m.add(new WallpaperModule(ctx)); return m;
    }
    @Override public List<ViewManager> createViewManagers(ReactApplicationContext ctx) {
        return Collections.emptyList();
    }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: ScreenLockAdmin  (DeviceAdminReceiver)
// ═══════════════════════════════════════════════════════════════
const SCREEN_LOCK_ADMIN_JAVA = `package ${PACKAGE_NAME};

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

public class ScreenLockAdmin extends DeviceAdminReceiver {
    @Override public void onEnabled(Context c, Intent i) { super.onEnabled(c, i); }
    @Override public void onDisabled(Context c, Intent i) { super.onDisabled(c, i); }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: ScreenLockAccessibilityService
// ═══════════════════════════════════════════════════════════════
const ACCESSIBILITY_SERVICE_JAVA = `package ${PACKAGE_NAME};

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;

public class ScreenLockAccessibilityService extends AccessibilityService {
    public static final String PREFS = "rareshot_prefs";
    private long lastTapMs = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}

    @Override
    public void onInterrupt() {}

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
        setServiceInfo(info);
    }

    public void performLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
        }
    }
}
`;

// ═══════════════════════════════════════════════════════════════
// XML Resources
// ═══════════════════════════════════════════════════════════════
const WALLPAPER_XML = `<?xml version="1.0" encoding="utf-8"?>
<wallpaper xmlns:android="http://schemas.android.com/apk/res/android"
    android:label="Rare Shot Live Wallpaper"
    android:thumbnail="@mipmap/ic_launcher"
    android:settingsActivity="${PACKAGE_NAME}.MainActivity" />
`;

const DEVICE_ADMIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <force-lock />
    </uses-policies>
</device-admin>
`;

const ACCESSIBILITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canPerformGestures="true"
    android:description="@string/app_name"
    android:notificationTimeout="100"
    android:settingsActivity="${PACKAGE_NAME}.MainActivity" />
`;

// ═══════════════════════════════════════════════════════════════
// Helper: recursive file search
// ═══════════════════════════════════════════════════════════════
function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const fp = path.join(dir, it.name);
      if (it.isFile() && it.name === name) return fp;
      if (it.isDirectory()) { const f = findFile(fp, name); if (f) return f; }
    }
  } catch (e) {}
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CONFIG PLUGIN
// ═══════════════════════════════════════════════════════════════
const withLiveWallpaper = (config) => {

  // ── 1. AndroidManifest: WallpaperService + ScreenLockAdmin ──
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;

    // WallpaperService
    app.service = app.service || [];
    if (!app.service.some(s => s.$?.['android:name'] === '.LiveWallpaperService')) {
      app.service.push({
        $: { 'android:name': '.LiveWallpaperService', 'android:label': 'Rare Shot Live Wallpaper',
             'android:permission': 'android.permission.BIND_WALLPAPER', 'android:exported': 'true' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.wallpaper.WallpaperService' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.service.wallpaper', 'android:resource': '@xml/wallpaper' } }],
      });
    }

    // ScreenLockAdmin receiver
    app.receiver = app.receiver || [];
    if (!app.receiver.some(r => r.$?.['android:name'] === '.ScreenLockAdmin')) {
      app.receiver.push({
        $: { 'android:name': '.ScreenLockAdmin', 'android:permission': 'android.permission.BIND_DEVICE_ADMIN', 'android:exported': 'true' },
        'meta-data': [{ $: { 'android:name': 'android.app.device_admin', 'android:resource': '@xml/device_admin' } }],
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED' } }] }],
      });
    }

    // AccessibilityService for screen lock
    app.service = app.service || [];
    if (!app.service.some(s => s.$?.['android:name'] === '.ScreenLockAccessibilityService')) {
      app.service.push({
        $: { 'android:name': '.ScreenLockAccessibilityService', 'android:label': 'Rare Shot Screen Lock',
             'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE', 'android:exported': 'false' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/accessibility_config' } }],
      });
    }

    // AudioService for background radio playback
    if (!app.service.some(s => s.$?.['android:name'] === '.AudioService')) {
      app.service.push({
        $: { 'android:name': '.AudioService', 'android:exported': 'false',
             'android:foregroundServiceType': 'mediaPlayback' },
      });
    }

    // Add FOREGROUND_SERVICE permission
    const permissions = manifest['uses-permission'] || [];
    const permNames = permissions.map(p => p.$?.['android:name']);
    if (!permNames.includes('android.permission.FOREGROUND_SERVICE')) {
      permissions.push({ $: { 'android:name': 'android.permission.FOREGROUND_SERVICE' } });
    }
    if (!permNames.includes('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK')) {
      permissions.push({ $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' } });
    }
    if (!permNames.includes('android.permission.INTERNET')) {
      permissions.push({ $: { 'android:name': 'android.permission.INTERNET' } });
    }
    manifest['uses-permission'] = permissions;
    return cfg;
  });

  // ── 2. Write Java + XML files & patch MainApplication ──
  config = withDangerousMod(config, ['android', async (cfg) => {
    const root = cfg.modRequest.projectRoot;
    const andro = path.join(root, 'android');
    const jDir = path.join(andro, 'app', 'src', 'main', 'java', ...PACKAGE_NAME.split('.'));
    const xmlDir = path.join(andro, 'app', 'src', 'main', 'res', 'xml');

    fs.mkdirSync(jDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });

    // Write Java
    fs.writeFileSync(path.join(jDir, 'LiveWallpaperService.java'), LIVE_SERVICE_JAVA);
    fs.writeFileSync(path.join(jDir, 'WallpaperModule.java'), WALLPAPER_MODULE_JAVA);
    fs.writeFileSync(path.join(jDir, 'WallpaperPackage.java'), WALLPAPER_PACKAGE_JAVA);
    fs.writeFileSync(path.join(jDir, 'ScreenLockAdmin.java'), SCREEN_LOCK_ADMIN_JAVA);

    // Write XML
    fs.writeFileSync(path.join(xmlDir, 'wallpaper.xml'), WALLPAPER_XML);
    fs.writeFileSync(path.join(xmlDir, 'device_admin.xml'), DEVICE_ADMIN_XML);
    fs.writeFileSync(path.join(xmlDir, 'accessibility_config.xml'), ACCESSIBILITY_XML);

    // Write Accessibility Service
    fs.writeFileSync(path.join(jDir, 'ScreenLockAccessibilityService.java'), ACCESSIBILITY_SERVICE_JAVA);

    // Write AudioService
    fs.writeFileSync(path.join(jDir, 'AudioService.java'), AUDIO_SERVICE_JAVA);

    // ── Patch MainApplication to register WallpaperPackage ──
    const srcMain = path.join(andro, 'app', 'src', 'main');
    const ktFile = findFile(srcMain, 'MainApplication.kt');
    const jvFile = findFile(srcMain, 'MainApplication.java');
    const mainFile = ktFile || jvFile;
    const isKt = !!ktFile;

    if (mainFile) {
      let src = fs.readFileSync(mainFile, 'utf-8');
      if (!src.includes('WallpaperPackage')) {
        if (isKt) {
          src = src.replace(/(package [^\n]+\n)/, `$1\nimport ${PACKAGE_NAME}.WallpaperPackage\n`);
          if (src.includes('PackageList(this).packages')) {
            src = src.replace('PackageList(this).packages', 'PackageList(this).packages.apply { add(WallpaperPackage()) }');
          }
        } else {
          src = src.replace(/(package [^\n]+;\n)/, `$1\nimport ${PACKAGE_NAME}.WallpaperPackage;\n`);
          if (src.includes('PackageList(this).getPackages()')) {
            src = src.replace(
              'return PackageList(this).getPackages();',
              'java.util.List<com.facebook.react.ReactPackage> packages = new java.util.ArrayList<>(PackageList(this).getPackages());\n            packages.add(new WallpaperPackage());\n            return packages;'
            );
          }
        }
        fs.writeFileSync(mainFile, src);
      }
    }

    return cfg;
  }]);

  return config;
};

module.exports = withLiveWallpaper;
