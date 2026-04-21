const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.relaxsound.livewallpaper';
const PREFS = 'relaxsound_prefs';

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: AudioService  (ForegroundService for radio)
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

public class AudioService extends Service {
    public static final String PREFS = "${PREFS}";
    private static final String CH_ID  = "relaxsound_audio";
    private static final int    NOTIF_ID = 9001;
    private static final String TAG    = "AudioService";

    // All station URLs in the same order as JS constants/radioStations.ts
    private static final String[] STATION_URLS = {
        "https://ice.somafm.com/dronezone-128-mp3",
        "https://ice.somafm.com/fluid-128-mp3",
        "https://ice.somafm.com/sleep-128-mp3",
        "https://ice.somafm.com/groovesalad-128-mp3",
        "https://ice.somafm.com/spacestation-128-mp3",
        "https://ice.somafm.com/deepspaceone-128-mp3",
        "https://ice.somafm.com/lush-128-mp3",
        "https://ice.somafm.com/thetrip-128-mp3",
        "https://ice.somafm.com/suburbsofgoa-128-mp3",
        "https://ice.somafm.com/missioncontrol-128-mp3"
    };
    private static final String[] STATION_NAMES = {
        "Drone Zone", "Fluid", "Sleep.fm", "Groove Salad", "Space Station",
        "Deep Space One", "Lush", "The Trip", "Suburbs of Goa", "Mission Control"
    };

    private MediaPlayer player;
    private String radioUrl;
    private boolean isPlaying;
    private boolean wasPlayingBeforeScreenOff;
    private SharedPreferences sp;
    private android.content.BroadcastReceiver screenReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        radioUrl = sp.getString("radio_url", null);

        // Register screen on/off receiver — pause radio when screen turns off
        screenReceiver = new android.content.BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent i) {
                if (android.content.Intent.ACTION_SCREEN_OFF.equals(i.getAction())) {
                    wasPlayingBeforeScreenOff = isPlaying;
                    if (isPlaying) { stopPlayback(); }
                } else if (android.content.Intent.ACTION_SCREEN_ON.equals(i.getAction())) {
                    // Do NOT auto-resume — user must explicitly press play
                }
                // Also handle audio focus changes via ACTION_AUDIO_BECOMING_NOISY
                if (android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(i.getAction())) {
                    if (isPlaying) stopPlayback();
                }
            }
        };
        android.content.IntentFilter filter = new android.content.IntentFilter();
        filter.addAction(android.content.Intent.ACTION_SCREEN_OFF);
        filter.addAction(android.content.Intent.ACTION_SCREEN_ON);
        filter.addAction(android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        registerReceiver(screenReceiver, filter);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if ("PLAY".equals(action)) {
                radioUrl = sp.getString("radio_url", null);
                if (radioUrl == null || radioUrl.isEmpty()) {
                    // Use first station as default
                    radioUrl = STATION_URLS[0];
                    sp.edit().putString("radio_url", radioUrl).putString("station_name", STATION_NAMES[0]).apply();
                }
                startPlayback();
            } else if ("STOP".equals(action)) {
                stopPlayback();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            } else if ("TOGGLE".equals(action)) {
                if (isPlaying) {
                    stopPlayback();
                } else {
                    radioUrl = sp.getString("radio_url", null);
                    if (radioUrl == null) radioUrl = STATION_URLS[0];
                    startPlayback();
                }
            } else if ("NEXT".equals(action)) {
                int idx = sp.getInt("station_index", 0) + 1;
                if (idx >= STATION_URLS.length) idx = 0;
                radioUrl = STATION_URLS[idx];
                sp.edit().putInt("station_index", idx)
                    .putString("radio_url", radioUrl)
                    .putString("station_name", STATION_NAMES[idx]).apply();
                startPlayback();
            } else if ("PREV".equals(action)) {
                int idx = sp.getInt("station_index", 0) - 1;
                if (idx < 0) idx = STATION_URLS.length - 1;
                radioUrl = STATION_URLS[idx];
                sp.edit().putInt("station_index", idx)
                    .putString("radio_url", radioUrl)
                    .putString("station_name", STATION_NAMES[idx]).apply();
                startPlayback();
            } else if ("SET_VOLUME".equals(action)) {
                float vol = intent.getFloatExtra("volume", 0.8f);
                sp.edit().putFloat("app_volume", vol).apply();
                if (player != null) {
                    // Set volume ONLY on this MediaPlayer — does NOT affect system volume
                    try { player.setVolume(vol, vol); } catch (Exception e) {}
                }
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
            float vol = sp.getFloat("app_volume", 0.8f);
            player.setOnPreparedListener(mp -> {
                mp.setVolume(vol, vol);  // Apply saved app volume
                mp.start(); isPlaying = true; updateNotif();
            });
            player.setOnErrorListener((mp, w, e) -> {
                Log.e(TAG, "Playback error: " + w + "/" + e);
                stopPlayback();
                return true;
            });
            player.setOnCompletionListener(mp -> {
                // Radio streams don't usually complete; restart on disconnect
                stopPlayback(); startPlayback();
            });
            player.prepareAsync();
        } catch (Exception e) {
            Log.e(TAG, "Start error", e);
            stopPlayback();
        }
    }

    private void stopPlayback() {
        isPlaying = false;
        if (player != null) {
            try { player.stop(); } catch (Exception e) {}
            try { player.release(); } catch (Exception e) {}
            player = null;
        }
        updateNotif();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CH_ID, "Relax Sound Radio", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Background radio playback");
            ch.setSound(null, null);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        String stationName = sp.getString("station_name", "Relax Sound Radio");
        Intent mainIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (mainIntent == null) mainIntent = new Intent();
        PendingIntent pi = PendingIntent.getActivity(this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Actions for the notification
        Intent stopIntent = new Intent(this, AudioService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPi = PendingIntent.getService(this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent nextIntent = new Intent(this, AudioService.class);
        nextIntent.setAction("NEXT");
        PendingIntent nextPi = PendingIntent.getService(this, 2, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            b = new Notification.Builder(this, CH_ID);
        else
            b = new Notification.Builder(this);

        return b.setContentTitle("Relax Sound \u2014 " + stationName)
            .setContentText(isPlaying ? "Playing..." : "Paused")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pi)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_next, "Next", nextPi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPi)
            .build();
    }

    private void updateNotif() {
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIF_ID, buildNotification());
        } catch (Exception e) {}
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        if (screenReceiver != null) {
            try { unregisterReceiver(screenReceiver); } catch (Exception e) {}
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: LiveWallpaperService
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
    public static final String PREFS = "${PREFS}";

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

        // Gesture tracking
        private long tapMs;
        private float tapX, tapY;
        private float swipeStartX = -1;

        private final Runnable drawR = () -> doDraw();

        @Override
        public void onCreate(SurfaceHolder sh) {
            super.onCreate(sh);
            setTouchEventsEnabled(true);
            SharedPreferences sp = c().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            sp.registerOnSharedPreferenceChangeListener(this);
            load(sp);
            mkPts();
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            H.removeCallbacks(drawR);
            try { c().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .unregisterOnSharedPreferenceChangeListener(this); } catch (Exception e) {}
            killVid();
            killBmp();
        }

        @Override
        public void onVisibilityChanged(boolean v) {
            vis = v;
            if (v) {
                H.post(drawR);
                if (isVid && mp != null) try { mp.start(); } catch (Exception e) {}
            } else {
                H.removeCallbacks(drawR);
                if (isVid && mp != null) try { mp.pause(); } catch (Exception e) {}
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
            int action = ev.getAction();
            if (action == MotionEvent.ACTION_DOWN) {
                swipeStartX = ev.getX();
                long now = System.currentTimeMillis();
                if (now - tapMs < 400 &&
                    Math.abs(ev.getX() - tapX) < 150 &&
                    Math.abs(ev.getY() - tapY) < 150) {
                    dblTap(); tapMs = 0;
                } else {
                    tapMs = now; tapX = ev.getX(); tapY = ev.getY();
                }
            } else if (action == MotionEvent.ACTION_UP) {
                if (swipeStartX >= 0) {
                    float dx = ev.getX() - swipeStartX;
                    if (Math.abs(dx) > 200) {
                        if (dx < 0) nextWallpaperSwipe();
                        else prevWallpaperSwipe();
                    }
                    swipeStartX = -1;
                }
            }
            super.onTouchEvent(ev);
        }

        private void dblTap() {
            // Try DevicePolicyManager first
            try {
                DevicePolicyManager d = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
                ComponentName cn = new ComponentName(c(), ScreenLockAdmin.class);
                if (d != null && d.isAdminActive(cn)) { d.lockNow(); return; }
            } catch (Exception e) {}
            // Fallback: use AccessibilityService global action
            try {
                ScreenLockAccessibilityService svc = ScreenLockAccessibilityService.getInstance();
                if (svc != null) svc.performLockScreen();
            } catch (Exception e) {}
        }

        private void nextWallpaperSwipe() {
            if (uriList.isEmpty()) return;
            uriIdx = (uriIdx + 1) % uriList.size();
            curUri = uriList.get(uriIdx);
            loadImg(curUri);
            c().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString("wallpaper_uri", curUri).apply();
        }

        private void prevWallpaperSwipe() {
            if (uriList.isEmpty()) return;
            uriIdx = (uriIdx - 1 + uriList.size()) % uriList.size();
            curUri = uriList.get(uriIdx);
            loadImg(curUri);
            c().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString("wallpaper_uri", curUri).apply();
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences sp, String k) {
            load(sp);
            if ("wallpaper_uri".equals(k) && !isVid && curUri != null) loadImg(curUri);
            if ("is_video".equals(k) || "video_uri".equals(k)) {
                if (isVid && vidUri != null) initVid(); else { killVid(); if (curUri != null) loadImg(curUri); }
            }
            if ("effect_type".equals(k) || "effect_intensity".equals(k)) mkPts();
        }

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
            try {
                JSONArray a = new JSONArray(sp.getString("wallpaper_uris", "[]"));
                for (int i = 0; i < a.length(); i++) uriList.add(a.getString(i));
            } catch (Exception e) {}
        }

        private void loadImg(final String uri) {
            if (uri == null) return;
            new Thread(() -> {
                try {
                    Bitmap b;
                    if (uri.startsWith("http")) {
                        HttpURLConnection cn = (HttpURLConnection) new URL(uri).openConnection();
                        cn.setConnectTimeout(12000); cn.setReadTimeout(12000); cn.connect();
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

        // ── PARTICLES (2x bigger than original) ──────────────────────────────
        private void mkPts() {
            pts.clear();
            if ("none".equals(fx)) return;
            // Doubled particle counts: 40/80/130 (was 20/40/65)
            int n = fxInt == 1 ? 40 : fxInt == 2 ? 80 : 130;
            for (int i = 0; i < n; i++) { Pt p = new Pt(); resetP(p, true); pts.add(p); }
        }

        private void resetP(Pt p, boolean scatter) {
            p.x = R.nextFloat() * W; p.age = 0; p.rot = R.nextFloat() * 360;
            switch (fx) {
                case "rain":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 80 + 20);
                    p.vy = 900 + R.nextFloat() * 500; p.vx = R.nextFloat() * 20 - 10;
                    p.sz = 4f;   // was 2f — 2x bigger
                    p.color = Color.argb(130, 180, 220, 255); break;
                case "snow":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 60 + 20);
                    p.vy = 50 + R.nextFloat() * 70; p.vx = R.nextFloat() * 40 - 20;
                    p.sz = 8 + R.nextFloat() * 16;  // was 4+8 — 2x bigger
                    p.color = Color.argb(200, 255, 255, 255); break;
                case "leaves":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 60 + 20);
                    p.vy = 70 + R.nextFloat() * 50; p.vx = 20 + R.nextFloat() * 30;
                    p.sz = 20 + R.nextFloat() * 16;  // was 10+8 — 2x bigger
                    p.rotSpd = 40 + R.nextFloat() * 60;
                    int[] lc = {Color.argb(170,74,222,128), Color.argb(165,34,197,94),
                                Color.argb(170,21,128,61), Color.argb(150,251,191,36),
                                Color.argb(152,134,239,172)};
                    p.color = lc[R.nextInt(lc.length)]; break;
                case "sparkles":
                    p.y = R.nextFloat() * H2; p.vy = 0; p.vx = 0;
                    p.sz = 20 + R.nextFloat() * 28;  // was 10+14 — 2x bigger
                    p.maxAge = 1.5f + R.nextFloat() * 2f;
                    p.color = Color.argb(200, 251, 191, 36); break;
                case "bubbles":
                    p.y = scatter ? R.nextFloat() * H2 : H2 + R.nextFloat() * 60;
                    p.vy = -(60 + R.nextFloat() * 60); p.vx = R.nextFloat() * 20 - 10;
                    p.sz = 16 + R.nextFloat() * 40;  // was 8+20 — 2x bigger
                    p.color = Color.argb(100, 74, 222, 128); break;
                case "fireflies":
                    p.y = R.nextFloat() * H2; p.vx = R.nextFloat() * 40 - 20; p.vy = R.nextFloat() * 40 - 20;
                    p.sz = 10;  // was 5 — 2x bigger
                    p.maxAge = 3 + R.nextFloat() * 3;
                    p.color = Color.argb(230, 180, 255, 100); break;
                case "petals":
                    p.y = scatter ? R.nextFloat() * H2 : -(R.nextFloat() * 60 + 20);
                    p.vy = 50 + R.nextFloat() * 40; p.vx = 10 + R.nextFloat() * 20;
                    p.sz = 16 + R.nextFloat() * 12;  // was 8+6 — 2x bigger
                    p.rotSpd = 20 + R.nextFloat() * 40;
                    p.color = Color.argb(180, 255, 182, 193); break;
                default:
                    p.y = -50; p.vy = 100; p.sz = 8; p.color = Color.WHITE;
            }
        }

        private void drawPts(Canvas c) {
            if (pts.isEmpty()) return;
            float dt = 0.033f;
            float sm = fxSpd == 1 ? 0.5f : fxSpd == 3 ? 2.0f : 1.0f;
            for (Pt p : pts) {
                p.tick(dt * sm);
                boolean off = p.y > H2 + 100 || p.y < -150 || p.x > W + 100 || p.x < -100;
                if ("sparkles".equals(fx) || "fireflies".equals(fx)) {
                    if (p.age > p.maxAge) { resetP(p, true); continue; }
                    float lf = p.age / p.maxAge;
                    float fd = lf < 0.3f ? lf / 0.3f : lf > 0.7f ? (1f - lf) / 0.3f : 1f;
                    pp.setAlpha((int)(Color.alpha(p.color) * fd));
                } else {
                    if (off) { resetP(p, false); continue; }
                    pp.setAlpha(Color.alpha(p.color));
                }
                pp.setColor(p.color); pp.setStyle(Paint.Style.FILL);
                switch (fx) {
                    case "rain":
                        pp.setStrokeWidth(p.sz);
                        c.drawLine(p.x, p.y, p.x + 2, p.y + 44, pp);  // was y+22 — 2x longer
                        break;
                    case "snow":
                        c.drawCircle(p.x, p.y, p.sz / 2, pp); break;
                    case "leaves":
                        c.save(); c.rotate(p.rot, p.x, p.y);
                        c.drawOval(new RectF(p.x - p.sz/2, p.y - p.sz/4, p.x + p.sz/2, p.y + p.sz/4), pp);
                        c.restore(); break;
                    case "sparkles":
                        drawStar(c, p.x, p.y, p.sz * 0.5f); break;
                    case "bubbles":
                        pp.setStyle(Paint.Style.STROKE); pp.setStrokeWidth(2.5f);
                        c.drawCircle(p.x, p.y, p.sz / 2, pp);
                        pp.setStyle(Paint.Style.FILL); break;
                    case "fireflies":
                        int ba = pp.getAlpha();
                        pp.setAlpha(ba / 3); c.drawCircle(p.x, p.y, p.sz * 3, pp);
                        pp.setAlpha(ba); c.drawCircle(p.x, p.y, p.sz, pp); break;
                    case "petals":
                        c.save(); c.rotate(p.rot, p.x, p.y);
                        c.drawCircle(p.x, p.y, p.sz / 2, pp);
                        c.restore(); break;
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

        // ── AUTO-CHANGE ──────────────────────────────────────────────────────
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

        // ── DRAW LOOP ─────────────────────────────────────────────────────────
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
            } finally {
                if (canvas != null) try { sh.unlockCanvasAndPost(canvas); } catch (Exception e) {}
            }
            H.removeCallbacks(drawR); if (vis) H.postDelayed(drawR, 33);
        }

        private Context c() { return getApplicationContext(); }
    }
}
`;

// ═══════════════════════════════════════════════════════════════
// NATIVE JAVA: WallpaperModule (React Native bridge)
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
    public static final String PREFS = "${PREFS}";
    public WallpaperModule(ReactApplicationContext ctx) { super(ctx); }
    @Override public String getName() { return "WallpaperModule"; }
    private SharedPreferences sp() {
        return getReactApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @ReactMethod public void setWallpaperUri(String uri, Promise p) {
        try { sp().edit().putString("wallpaper_uri", uri).putBoolean("is_video", false).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setVideoUri(String uri, Promise p) {
        try { sp().edit().putString("video_uri", uri).putBoolean("is_video", true).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setWallpaperUris(ReadableArray uris, Promise p) {
        try {
            JSONArray a = new JSONArray();
            for (int i = 0; i < uris.size(); i++) a.put(uris.getString(i));
            sp().edit().putString("wallpaper_uris", a.toString()).apply(); p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void nextWallpaper(Promise p) {
        try {
            SharedPreferences sp = sp();
            int idx = sp.getInt("wallpaper_index", 0) + 1;
            JSONArray uris = new JSONArray(sp.getString("wallpaper_uris", "[]"));
            if (uris.length() == 0) { p.resolve(false); return; }
            if (idx >= uris.length()) idx = 0;
            String uri = uris.getString(idx);
            sp.edit().putInt("wallpaper_index", idx).putString("wallpaper_uri", uri).apply();
            p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void prevWallpaper(Promise p) {
        try {
            SharedPreferences sp = sp();
            JSONArray uris = new JSONArray(sp.getString("wallpaper_uris", "[]"));
            if (uris.length() == 0) { p.resolve(false); return; }
            int idx = sp.getInt("wallpaper_index", 0) - 1;
            if (idx < 0) idx = uris.length() - 1;
            String uri = uris.getString(idx);
            sp.edit().putInt("wallpaper_index", idx).putString("wallpaper_uri", uri).apply();
            p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setEffect(String type, int intensity, int speed, Promise p) {
        try { sp().edit().putString("effect_type", type).putInt("effect_intensity", intensity)
            .putInt("effect_speed", speed).apply(); p.resolve(true); }
        catch (Exception e) { p.reject("E", e.getMessage()); }
    }
    @ReactMethod public void setVolume(float volume, Promise p) {
        try {
            sp().edit().putFloat("volume", volume).apply();
            // Send to AudioService
            Intent i = new Intent(getReactApplicationContext(), AudioService.class);
            i.setAction("SET_VOLUME");
            i.putExtra("volume", volume);
            getReactApplicationContext().startService(i);
            p.resolve(true);
        } catch (Exception e) { p.reject("E", e.getMessage()); }
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
                    java.net.HttpURLConnection cn2 = (java.net.HttpURLConnection) new java.net.URL(uri).openConnection();
                    cn2.setConnectTimeout(10000); cn2.setReadTimeout(10000); cn2.connect();
                    is = cn2.getInputStream();
                } else {
                    is = getReactApplicationContext().getContentResolver()
                        .openInputStream(android.net.Uri.parse(uri));
                }
                if (is != null) {
                    wm.setStream(is, null, true, android.app.WallpaperManager.FLAG_LOCK);
                    is.close(); p.resolve(true);
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
// NATIVE JAVA: ScreenLockAdmin
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
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;

public class ScreenLockAccessibilityService extends AccessibilityService {
    private static ScreenLockAccessibilityService sInstance;

    public static ScreenLockAccessibilityService getInstance() { return sInstance; }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}

    @Override
    public void onInterrupt() {}

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        sInstance = this;
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
        setServiceInfo(info);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (sInstance == this) sInstance = null;
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
    android:label="Relax Sound Live Wallpaper"
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

  // ── 1. AndroidManifest ──────────────────────────────────────
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;

    app.service = app.service || [];

    // LiveWallpaperService
    if (!app.service.some(s => s.$?.['android:name'] === '.LiveWallpaperService')) {
      app.service.push({
        $: {
          'android:name': '.LiveWallpaperService',
          'android:label': 'Relax Sound Live Wallpaper',
          'android:permission': 'android.permission.BIND_WALLPAPER',
          'android:exported': 'true',
        },
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

    // AccessibilityService
    if (!app.service.some(s => s.$?.['android:name'] === '.ScreenLockAccessibilityService')) {
      app.service.push({
        $: {
          'android:name': '.ScreenLockAccessibilityService',
          'android:label': 'Relax Sound Screen Lock',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'false',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.accessibilityservice', 'android:resource': '@xml/accessibility_config' } }],
      });
    }

    // AudioService
    if (!app.service.some(s => s.$?.['android:name'] === '.AudioService')) {
      app.service.push({
        $: { 'android:name': '.AudioService', 'android:exported': 'false', 'android:foregroundServiceType': 'mediaPlayback' },
      });
    }

    // Permissions
    const permissions = manifest['uses-permission'] || [];
    const permNames = permissions.map(p => p.$?.['android:name']);
    const needed = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.INTERNET',
    ];
    for (const perm of needed) {
      if (!permNames.includes(perm)) {
        permissions.push({ $: { 'android:name': perm } });
      }
    }
    manifest['uses-permission'] = permissions;
    return cfg;
  });

  // ── 2. Write Java + XML files & patch MainApplication ──────
  config = withDangerousMod(config, ['android', async (cfg) => {
    const root = cfg.modRequest.projectRoot;
    const andro = path.join(root, 'android');
    const jDir = path.join(andro, 'app', 'src', 'main', 'java', ...PACKAGE_NAME.split('.'));
    const xmlDir = path.join(andro, 'app', 'src', 'main', 'res', 'xml');

    fs.mkdirSync(jDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });

    fs.writeFileSync(path.join(jDir, 'LiveWallpaperService.java'), LIVE_SERVICE_JAVA);
    fs.writeFileSync(path.join(jDir, 'WallpaperModule.java'), WALLPAPER_MODULE_JAVA);
    fs.writeFileSync(path.join(jDir, 'WallpaperPackage.java'), WALLPAPER_PACKAGE_JAVA);
    fs.writeFileSync(path.join(jDir, 'ScreenLockAdmin.java'), SCREEN_LOCK_ADMIN_JAVA);
    fs.writeFileSync(path.join(jDir, 'ScreenLockAccessibilityService.java'), ACCESSIBILITY_SERVICE_JAVA);
    fs.writeFileSync(path.join(jDir, 'AudioService.java'), AUDIO_SERVICE_JAVA);

    fs.writeFileSync(path.join(xmlDir, 'wallpaper.xml'), WALLPAPER_XML);
    fs.writeFileSync(path.join(xmlDir, 'device_admin.xml'), DEVICE_ADMIN_XML);
    fs.writeFileSync(path.join(xmlDir, 'accessibility_config.xml'), ACCESSIBILITY_XML);

    // Patch MainApplication to register WallpaperPackage
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
