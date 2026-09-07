'use strict';

/* 画布元素与 DPR 适配 */

/* global W, H */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
}
resize();
window.addEventListener('resize', resize);
