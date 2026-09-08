'use strict';

/* 通用工具与绘制辅助(本文件禁止顶层执行语句: 绘制函数依赖 canvas.js 声明的 ctx) */

/* global ctx, game, PX_PER_M */

/* 数值钳制 */
function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
/* 难度系数 0~1: 按已行驶里程线性增长, 4km 时达到满难度 */
function difficulty() {
  return Math.min(1, game.totalDist / PX_PER_M / 4000);
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
/* 通用血条 */
function drawBar(x, y, ratio, w, h) {
  const r = clamp(ratio, 0, 1);
  fillRR(x - w / 2 - 1, y - 1, w + 2, h + 2, 2, 'rgba(0,0,0,0.55)');
  /* 血量越高越绿, 越低越红 */
  fillRR(x - w / 2, y, Math.max(2, w * r), h, 1.5, 'hsl(' + Math.round(r * 120) + ', 75%, 52%)');
}
