'use strict';

/* 通用工具与绘制辅助(本文件禁止顶层执行语句: 绘制函数依赖 canvas.js 声明的 ctx) */

/* global ctx, game, PX_PER_M, DIFFICULTY_FULL_M, PACE_MAX, PACE_PER_KM */

/* 数值钳制 */
function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
/* 难度系数 0~1: 按已行驶里程线性增长, DIFFICULTY_FULL_M 米时达到满难度 */
function difficulty() {
  return Math.min(1, game.totalDist / PX_PER_M / DIFFICULTY_FULL_M);
}
/* 节奏系数: 随里程提升场景基础速度(1 → 1+PACE_MAX) */
function pace() {
  const km = game.totalDist / PX_PER_M / 1000;
  return 1 + Math.min(PACE_MAX, km * PACE_PER_KM);
}
/* 圆角矩形路径 */
function rr(x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
function fillRR(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  rr(x, y, w, h, r);
  ctx.fill();
}
/* 检测贴图非透明内容包围盒(剔除透明留白) */
function detectSpriteBox(img) {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const c2d = c.getContext('2d', { willReadFrequently: true });
    c2d.drawImage(img, 0, 0);
    const d = c2d.getImageData(0, 0, c.width, c.height).data;
    const iw = c.width,
      ih = c.height;
    const s = 4; // 4px 采样
    let minX = iw,
      minY = ih,
      maxX = 0,
      maxY = 0;
    for (let y = 0; y < ih; y += s) {
      for (let x = 0; x < iw; x += s) {
        if (d[(y * iw + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  } catch (_) {
    return null;
  }
}

/* 按 cols×rows 网格切图, 逐格分析非透明内容包围盒(剔除留白); 空帧回退整格 */
function detectGridFrames(img, cols, rows) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const cw = iw / cols;
  const ch = ih / rows;
  const out = [];
  let data;
  try {
    const c = document.createElement('canvas');
    c.width = iw;
    c.height = ih;
    const c2d = c.getContext('2d', { willReadFrequently: true });
    c2d.drawImage(img, 0, 0);
    data = c2d.getImageData(0, 0, iw, ih).data;
  } catch (_) {
    data = null;
  }
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round(col * cw);
      const y0 = Math.round(r * ch);
      const x1 = Math.round((col + 1) * cw);
      const y1 = Math.round((r + 1) * ch);
      if (!data) {
        out.push({ x: x0, y: y0, w: cw, h: ch });
        continue;
      }
      let minX = x1,
        minY = y1,
        maxX = x0,
        maxY = y0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          if (data[(y * iw + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX > minX && maxY > minY) {
        out.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      } else {
        out.push({ x: x0, y: y0, w: cw, h: ch });
      }
    }
  }
  return out;
}

/* 通用血条 */
function drawBar(x, y, ratio, w, h) {
  const r = clamp(ratio, 0, 1);
  fillRR(x - w / 2 - 1, y - 1, w + 2, h + 2, 2, 'rgba(0,0,0,0.55)');
  /* 血量越高越绿, 越低越红 */
  fillRR(x - w / 2, y, Math.max(2, w * r), h, 1.5, 'hsl(' + Math.round(r * 120) + ', 75%, 52%)');
}
