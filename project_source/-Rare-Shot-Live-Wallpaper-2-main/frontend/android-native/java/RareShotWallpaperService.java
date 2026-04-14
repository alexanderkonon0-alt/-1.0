package com.rareshot.livewallpaper;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.os.Handler;
import android.os.Looper;
import android.service.wallpaper.WallpaperService;
import android.content.SharedPreferences;
import android.view.SurfaceHolder;
import java.io.IOException;
import java.net.URL;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Rare Shot Live Wallpaper Service
 * Displays photo wallpapers with smooth rendering as Android live wallpapers.
 * Communicates with the main app via SharedPreferences.
 */
public class RareShotWallpaperService extends WallpaperService {

    @Override
    public Engine onCreateEngine() {
        return new WallpaperEngine();
    }

    class WallpaperEngine extends Engine {
        private final Handler handler = new Handler(Looper.getMainLooper());
        private final ExecutorService executor = Executors.newSingleThreadExecutor();
        private boolean visible = true;
        private Bitmap wallpaperBitmap;
        private Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private String currentUri = "";

        private final Runnable drawRunnable = () -> {
            if (visible) {
                draw();
                loadWallpaperIfChanged();
            }
        };

        @Override
        public void onCreate(SurfaceHolder surfaceHolder) {
            super.onCreate(surfaceHolder);
            loadWallpaperIfChanged();
        }

        @Override
        public void onVisibilityChanged(boolean visible) {
            this.visible = visible;
            if (visible) {
                loadWallpaperIfChanged();
                handler.post(drawRunnable);
            } else {
                // Pause for battery optimization
                handler.removeCallbacks(drawRunnable);
            }
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            draw();
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            super.onSurfaceDestroyed(holder);
            visible = false;
            handler.removeCallbacks(drawRunnable);
            if (executor != null) executor.shutdown();
        }

        private void loadWallpaperIfChanged() {
            SharedPreferences prefs = getSharedPreferences("RareShotPrefs", MODE_PRIVATE);
            String uri = prefs.getString("currentWallpaperUri", "");
            if (!uri.equals(currentUri) && !uri.isEmpty()) {
                currentUri = uri;
                executor.execute(() -> {
                    try {
                        Bitmap bmp;
                        if (uri.startsWith("http")) {
                            InputStream is = new URL(uri).openStream();
                            bmp = BitmapFactory.decodeStream(is);
                            is.close();
                        } else {
                            bmp = BitmapFactory.decodeFile(uri);
                        }
                        if (bmp != null) {
                            wallpaperBitmap = bmp;
                            handler.post(this::draw);
                        }
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });
            }
        }

        private void draw() {
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockCanvas();
                if (canvas != null && wallpaperBitmap != null) {
                    int sw = canvas.getWidth();
                    int sh = canvas.getHeight();
                    int bw = wallpaperBitmap.getWidth();
                    int bh = wallpaperBitmap.getHeight();

                    // Scale bitmap to fill the screen (center crop)
                    float scale = Math.max((float) sw / bw, (float) sh / bh);
                    Matrix matrix = new Matrix();
                    matrix.setScale(scale, scale);
                    matrix.postTranslate((sw - bw * scale) / 2f, (sh - bh * scale) / 2f);
                    canvas.drawBitmap(wallpaperBitmap, matrix, paint);
                } else if (canvas != null) {
                    canvas.drawColor(0xFF030E06); // Dark green fallback
                }
            } finally {
                if (canvas != null) holder.unlockCanvasAndPost(canvas);
            }
        }
    }
}
