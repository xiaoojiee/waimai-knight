'use strict';

/* 界面绘制: HUD(血量/外卖/速度/犯罪条)/虚拟摇杆/游戏结束界面 */

/* global ctx, fillRR, rr, W, H, player, game, PX_PER_M, BASE_SPEED, IMG, assets, WEAPONS, nearestCustomer, nextCustomerDist, input, JOY_RADIUS, clamp, VEHICLES, drawFoodItem, drawFoodGlow, oldestNonSpecialIndex, screenMsg, loadProgress, SFX, BRAVE_TIME, MELON_TIME, EAT_TIME, DASH_TIME, vehicleDef, boss, Toy, rankState, isVehicleUnlocked, vehicleUnlockHint, AUTHOR_NAME, VIDEO_TITLE */

/* 投掷外卖按钮(右下角水泥路面, 方便手机拇指操作; drawHUD 绘制, input.js pointerdown 共用) */
const throwBtn = { x: 322, y: H - 62, w: 146, h: 54 };

/* 暂停 / 音量 按钮(游戏内顶部中央; input.js pointerdown 共用) */
const pauseBtn = { x: 220, y: 14, w: 34, h: 34 };
const soundBtn = { x: 260, y: 14, w: 34, h: 34 };

/* 暂停界面「返回开始界面」按钮(input.js pointerdown 共用) */
const pauseHomeBtn = { x: W / 2 - 90, y: H * 0.44 + 84, w: 180, h: 52 };

/* 特殊效果倒计时行 */
const BUFF_ROWS = [
  { key: 'brave', label: '我超勇的', color: '#ffd23f', max: BRAVE_TIME },
  { key: 'melon', label: '水果摊', color: '#4ade80', max: MELON_TIME },
  { key: 'eat', label: '焖子', color: '#ff9d5c', max: EAT_TIME },
  { key: 'dash', label: '冲刺', color: '#4da3ff', max: DASH_TIME },
];

/* 开始按钮点击区域(主菜单, input.js pointerdown 共用) */
const startBtn = { x: W / 2 - 110, y: H * 0.45, w: 220, h: 56 };

/* "选择出行方式"按钮(主菜单, input.js pointerdown 共用) */
const vehicleOpenBtn = { x: W / 2 - 110, y: H * 0.55, w: 220, h: 56 };

/* 主菜单底部: 排行榜 (input.js pointerdown 共用) */
const rankOpenBtn = { x: W / 2 - 110, y: H * 0.66, w: 220, h: 56 };
/* 排行榜界面: 刷新按钮(input.js pointerdown 共用) */
const rankRefreshBtn = { x: W - 110, y: 20, w: 90, h: 42 };

/* 按钮按下反馈: pointerdown 标记, 绘制时短暂下沉+压暗(input.js 调用 markPress) */
const uiPress = { btn: null, t: 0 };
function markPress(btn) {
  uiPress.btn = btn;
  uiPress.t = performance.now();
}
function pressFlash(btn) {
  return uiPress.btn === btn && performance.now() - uiPress.t < 150;
}
function pressShade(btn, r) {
  if (pressFlash(btn)) fillRR(btn.x, btn.y + 3, btn.w, btn.h, r, 'rgba(0,0,0,0.22)');
}
/* 仅压暗(不位移), 用于 HUD 内的小按钮 */
function pressDark(btn, r) {
  if (pressFlash(btn)) fillRR(btn.x, btn.y, btn.w, btn.h, r, 'rgba(0,0,0,0.3)');
}

/* 载具选择页右侧: UP 主页 / 开发视频 入口(input.js pointerdown 共用) */
const vehicleHomeBtn = { x: 346, y: 226, w: 98, h: 28 };
const vehicleVideoBtn = { x: 280, y: 342, w: 180, h: 126 };

/* 模拟模式(?mock=1)下, 载具页底部切换互动状态(input.js pointerdown 共用) */
const mockBtns = [
  { key: 'liked', label: '点赞', x: 20, y: H - 54, w: 104, h: 40 },
  { key: 'coin', label: '投币', x: 132, y: H - 54, w: 104, h: 40 },
  { key: 'fav', label: '收藏', x: 244, y: H - 54, w: 104, h: 40 },
  { key: 'following', label: '关注', x: 356, y: H - 54, w: 104, h: 40 },
];

/* 返回按钮(出行方式选择界面, input.js pointerdown 共用) */
const vehicleBackBtn = { x: 20, y: 20, w: 88, h: 42 };

/* 出行方式卡片(左侧纵向排布; 右侧为 UP 入口; input.js pointerdown 共用) */
const vehicleKeys = Object.keys(VEHICLES);
const vehicleBtns = {};
(function layoutVehicleBtns() {
  const bw = 240;
  const bh = 92;
  const gap = 16;
  const total = vehicleKeys.length * bh + (vehicleKeys.length - 1) * gap;
  const y0 = H * 0.52 - total / 2;
  vehicleKeys.forEach((k, i) => {
    vehicleBtns[k] = { x: 20, y: y0 + i * (bh + gap), w: bw, h: bh };
  });
})();

/* ---- 加载页(贴图未加载完时显示, 并屏蔽输入) ---- */
function drawLoading() {
  ctx.fillStyle = '#171a1d';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 30px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('肥嘟嘟外卖模拟器', W / 2, H * 0.42);
  const p = loadProgress();
  const bw = 260;
  const bh = 14;
  const bx = (W - bw) / 2;
  const by = H * 0.52;
  fillRR(bx, by, bw, bh, 7, 'rgba(255,255,255,0.12)');
  fillRR(bx, by, Math.max(4, bw * p), bh, 7, '#ffd23f');
  ctx.fillStyle = '#c7cdd4';
  ctx.font = "13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('加载中… ' + Math.round(p * 100) + '%', W / 2, by + 42);
}

/* ---- 开始界面(黄色全屏覆盖) ---- */
function drawMenu() {
  if (game.started) return;
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (game.menuScreen === 'vehicle') drawVehicleSelect();
  else if (game.menuScreen === 'rank') drawRankScreen();
  else drawMenuMain();
}

/* 主菜单: 标题 + 开始(第一位) + 选择出行方式 + 排行榜 */
function drawMenuMain() {
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 38px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('肥嘟嘟外卖模拟器', W / 2, H * 0.3);
  /* 开始按钮(第一位) */
  const sy = pressFlash(startBtn) ? 3 : 0;
  fillRR(startBtn.x, startBtn.y + sy, startBtn.w, startBtn.h, 14, '#2b2b2b');
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 26px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('开始', W / 2, startBtn.y + sy + 38);
  pressShade(startBtn, 14);
  /* 载具按钮 */
  const b = vehicleOpenBtn;
  const by = pressFlash(b) ? 3 : 0;
  fillRR(b.x, b.y + by, b.w, b.h, 14, '#c9a51c');
  ctx.strokeStyle = '#8a6d10';
  ctx.lineWidth = 1.5;
  rr(b.x, b.y + by, b.w, b.h, 14);
  ctx.stroke();
  ctx.fillStyle = '#5a4a00';
  ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('载具', W / 2, b.y + by + 26);
  ctx.font = "13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('当前: ' + VEHICLES[player.vehicle].label, W / 2, b.y + by + 48);
  pressShade(b, 14);
  /* 底部: 排行榜 */
  const it = { b: rankOpenBtn, label: '排行榜' };
  const dy = pressFlash(it.b) ? 3 : 0;
  fillRR(it.b.x, it.b.y + dy, it.b.w, it.b.h, 10, '#c9a51c');
  ctx.strokeStyle = '#8a6d10';
  ctx.lineWidth = 1.5;
  rr(it.b.x, it.b.y + dy, it.b.w, it.b.h, 10);
  ctx.stroke();
  ctx.fillStyle = '#5a4a00';
  ctx.font = "bold 15px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(it.label, it.b.x + it.b.w / 2, it.b.y + dy + 28);
  pressShade(it.b, 10);
  /* 操作提示 */
  ctx.fillStyle = '#5a4a00';
  ctx.font = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('电脑: 方向键/WASD · 手机: 下半屏滑动', W / 2, H * 0.86);
}

/* 出行方式选择界面: 左侧卡片列表 + 右侧 UP 入口 + 返回 */
function drawVehicleSelect() {
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 26px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('选择出行方式', W / 2, H * 0.11);
  for (const type of vehicleKeys) {
    const def = VEHICLES[type];
    const b = vehicleBtns[type];
    const sel = player.vehicle === type;
    const unlocked = isVehicleUnlocked(type);
    const dy = pressFlash(b) ? 3 : 0;
    let bg = sel ? '#2b2b2b' : '#f0c93f';
    if (!unlocked) bg = sel ? '#4a4433' : '#b8a76a';
    fillRR(b.x, b.y + dy, b.w, b.h, 14, bg);
    ctx.strokeStyle = !unlocked ? '#8a7f55' : sel ? '#ffd23f' : '#c9a51c';
    ctx.lineWidth = sel ? 3 : 1.5;
    rr(b.x, b.y + dy, b.w, b.h, 14);
    ctx.stroke();
    /* 贴图预览(多帧只画第一帧), 左侧 */
    const preview = IMG[def.img];
    if (preview && preview.naturalWidth) {
      const ph = 62;
      const frameW = preview.naturalWidth / def.frames;
      const pw = (ph * frameW) / preview.naturalHeight;
      ctx.save();
      if (!unlocked) ctx.globalAlpha = 0.4;
      ctx.drawImage(
        preview,
        0,
        0,
        frameW,
        preview.naturalHeight,
        b.x + 44 - pw / 2,
        b.y + dy + b.h / 2 - ph / 2,
        pw,
        ph,
      );
      ctx.restore();
    }
    /* 文案 */
    ctx.textAlign = 'left';
    ctx.fillStyle = !unlocked ? '#6a6250' : sel ? '#ffd23f' : '#5a4a00';
    ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(def.label, b.x + 92, b.y + dy + 40);
    ctx.font = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(unlocked ? def.desc : '🔒 ' + vehicleUnlockHint(type), b.x + 92, b.y + dy + 64);
    pressShade(b, 14);
    ctx.textAlign = 'center';
  }
  /* 右侧: UP 主卡片 + 开发视频入口 */
  const upX = 280;
  const upW = 180;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 17px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('作者', upX, 156);
  /* 作者卡片 */
  const acY = 168;
  fillRR(upX, acY, upW, 104, 14, '#f0c93f');
  ctx.strokeStyle = '#c9a51c';
  ctx.lineWidth = 1.5;
  rr(upX, acY, upW, 104, 14);
  ctx.stroke();
  const avX = upX + 32;
  const avY = acY + 52;
  const avR = 28;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#ffe0b0';
  ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
  fitInto(IMG.cow, avX, avY, avR * 2.1);
  ctx.restore();
  ctx.strokeStyle = '#e6b878';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#5a4a00';
  ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(AUTHOR_NAME, upX + 68, acY + 30);
  /* 访问主页按钮 */
  const hb = vehicleHomeBtn;
  const hdy = pressFlash(hb) ? 2 : 0;
  fillRR(hb.x, hb.y + hdy, hb.w, hb.h, 8, '#f0872a');
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('访问主页', hb.x + hb.w / 2, hb.y + hdy + 19);
  pressDark(hb, 8);
  /* 开发视频 */
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 17px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('开发视频', upX, 330);
  const vb = vehicleVideoBtn;
  const vdy = pressFlash(vb) ? 2 : 0;
  fillRR(vb.x, vb.y + vdy, vb.w, vb.h, 12, '#2b2b2b');
  ctx.save();
  ctx.beginPath();
  rr(vb.x, vb.y + vdy, vb.w, vb.h, 12);
  ctx.clip();
  const grd = ctx.createLinearGradient(vb.x, vb.y, vb.x + vb.w, vb.y + vb.h);
  grd.addColorStop(0, '#3f7a4f');
  grd.addColorStop(1, '#8fb84a');
  ctx.fillStyle = grd;
  ctx.fillRect(vb.x, vb.y + vdy, vb.w, vb.h);
  fitInto(IMG.cow, vb.x + vb.w / 2, vb.y + vdy + vb.h / 2, vb.h * 0.95);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(vb.x + vb.w / 2, vb.y + vdy + vb.h / 2, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(vb.x + vb.w / 2 - 7, vb.y + vdy + vb.h / 2 - 11);
  ctx.lineTo(vb.x + vb.w / 2 - 7, vb.y + vdy + vb.h / 2 + 11);
  ctx.lineTo(vb.x + vb.w / 2 + 11, vb.y + vdy + vb.h / 2);
  ctx.closePath();
  ctx.fill();
  pressDark(vb, 12);
  /* 视频标题(换行) */
  ctx.fillStyle = '#5a4a00';
  const titleFont = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.font = titleFont;
  wrapCJK(VIDEO_TITLE, upW, titleFont).forEach((line, i) =>
    ctx.fillText(line, upX, vb.y + vb.h + 26 + i * 18),
  );
  ctx.textAlign = 'center';
  /* 返回按钮 */
  const r = vehicleBackBtn;
  const rdy = pressFlash(r) ? 3 : 0;
  fillRR(r.x, r.y + rdy, r.w, r.h, 10, '#2b2b2b');
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('← 返回', r.x + r.w / 2, r.y + rdy + 27);
  pressShade(r, 10);
  /* 模拟模式: 解锁开关 */
  if (Toy.isMock()) {
    ctx.fillStyle = '#5a4a00';
    ctx.font = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('模拟模式: 点击切换互动状态', W / 2, H - 62);
    const st = window.__toyMock.state;
    for (const mb of mockBtns) {
      const on = st[mb.key];
      const mdy = pressFlash(mb) ? 3 : 0;
      fillRR(mb.x, mb.y + mdy, mb.w, mb.h, 8, on ? '#2b2b2b' : '#c9a51c');
      ctx.fillStyle = on ? '#ffd23f' : '#5a4a00';
      ctx.font = "bold 14px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText(mb.label + (on ? ' ✓' : ''), mb.x + mb.w / 2, mb.y + mdy + 26);
      pressShade(mb, 8);
    }
  }
}

/* ---- 通用绘制辅助(贴图适配 / 中文换行) ---- */
/* 把贴图按比例塞进 box×box 方框内居中绘制 */
function fitInto(img, cx, cy, box) {
  if (!img || !img.naturalWidth) return;
  const s = Math.min(box / img.naturalWidth, box / img.naturalHeight);
  ctx.drawImage(img, cx - (img.naturalWidth * s) / 2, cy - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
}

/* 中文按宽度换行 */
function wrapCJK(text, maxW, font) {
  ctx.font = font;
  const lines = [];
  let cur = '';
  for (const ch of text) {
    if (cur && ctx.measureText(cur + ch).width > maxW) {
      lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ---- 排行榜(里程) ---- */
function loadRank() {
  rankState.loading = true;
  rankState.error = '';
  Promise.all([Toy.getRankList(50), Toy.getMyRank()])
    .then((res) => {
      const list = res[0];
      rankState.loading = false;
      rankState.list = list || [];
      rankState.my = res[1];
      if (!list || !list.length) rankState.error = '暂无数据（需在B站内打开）';
    })
    .catch(() => {
      rankState.loading = false;
      rankState.list = [];
      rankState.error = '加载失败';
    });
}

function drawRankScreen() {
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 26px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('里程排行榜', W / 2, H * 0.13);
  const x = 40;
  const y0 = 150;
  const rowH = 46;
  if (rankState.loading) {
    ctx.fillStyle = '#5a4a00';
    ctx.font = "15px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('加载中…', W / 2, y0 + 40);
  } else if (rankState.error) {
    ctx.fillStyle = '#8a4a00';
    ctx.font = "15px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(rankState.error, W / 2, y0 + 40);
  } else {
    const n = Math.min(rankState.list.length, 11);
    for (let i = 0; i < n; i++) {
      const it = rankState.list[i];
      const ry = y0 + i * rowH;
      fillRR(x, ry, W - 2 * x, rowH - 8, 8, '#f0c93f');
      ctx.textAlign = 'left';
      ctx.fillStyle = '#5a4a00';
      ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText('#' + it.rank, x + 12, ry + 26);
      ctx.fillText(it.nickname || '玩家', x + 62, ry + 26);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#2b2b2b';
      ctx.fillText((it.score || 0) + ' m', x + (W - 2 * x) - 12, ry + 26);
      ctx.textAlign = 'center';
    }
  }
  if (rankState.my) {
    const m = rankState.my;
    ctx.fillStyle = '#5a4a00';
    ctx.font = "14px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(
      m.ranked ? '我的排名 #' + m.rank + '  ' + m.score + ' m' : '我还没上榜',
      W / 2,
      H - 66,
    );
  }
  /* 刷新按钮 */
  const rb = rankRefreshBtn;
  const rbdy = pressFlash(rb) ? 3 : 0;
  fillRR(rb.x, rb.y + rbdy, rb.w, rb.h, 10, '#2b2b2b');
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 15px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('刷新', rb.x + rb.w / 2, rb.y + rbdy + 27);
  pressShade(rb, 10);
  /* 返回按钮 */
  const r = vehicleBackBtn;
  const rdy = pressFlash(r) ? 3 : 0;
  fillRR(r.x, r.y + rdy, r.w, r.h, 10, '#2b2b2b');
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('← 返回', r.x + r.w / 2, r.y + rdy + 27);
  pressShade(r, 10);
}

/* ---- 虚拟摇杆(仅手机滑动时显示) ---- */
function drawJoy() {
  const joy = input.joy;
  if (!joy) return;
  /* 底座 */
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(joy.ox, joy.oy, JOY_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joy.ox, joy.oy, JOY_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  /* 摇杆头 */
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(joy.ox + joy.dx, joy.oy + joy.dy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(joy.ox + joy.dx, joy.oy + joy.dy, 26, 0, Math.PI * 2);
  ctx.stroke();
}

/* ---- HUD: 左上血量(红)+外卖按钮, 右上速度+里程 ---- */
function drawHUD() {
  /* 测试模式提示(连续输入作弊码 hsgg 开关) */
  if (game.testMode) {
    fillRR(12, 116, 96, 22, 6, 'rgba(255,210,63,0.85)');
    ctx.fillStyle = '#2b2b2b';
    ctx.font = "bold 12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText('测试模式 ON', 20, 132);
  }
  /* 左上: 玩家血量(红色) + 外卖数量 + 金钱 */
  fillRR(12, 12, 204, 96, 12, 'rgba(10,12,15,0.55)');
  fillRR(24, 26, 180, 14, 7, 'rgba(255,255,255,0.12)');
  const ratio = clamp(player.hp / player.maxHp, 0, 1);
  /* 血量低于 30% 时呼吸闪烁 */
  const pulse = ratio < 0.3 ? 0.6 + 0.4 * Math.sin(game.time * 8) : 1;
  fillRR(26, 28, Math.max(4, 176 * ratio), 10, 5, 'rgba(229,72,77,' + pulse + ')');
  ctx.textAlign = 'left';
  /* 外卖数量 + 特殊外卖图标(去重显示持有的种类与数量) */
  let normalN = 0;
  const specCounts = [0, 0, 0, 0];
  for (const f of player.food) {
    if (f.special >= 0) specCounts[f.special]++;
    else normalN++;
  }
  ctx.font = "bold 13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillStyle = '#e6e9ed';
  ctx.fillText('外卖 ×' + normalN, 28, 66);
  let sx = 100;
  for (let i = 0; i < specCounts.length; i++) {
    if (specCounts[i] <= 0) continue;
    ctx.save();
    ctx.translate(sx, 60);
    drawFoodItem({ special: i, poison: false, f: null }, 22);
    ctx.restore();
    ctx.fillStyle = '#ffd23f';
    ctx.font = "bold 10px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('×' + specCounts[i], sx + 12, 70);
    sx += 26;
  }
  /* 金钱(负数显示红色) */
  ctx.fillStyle = player.money < 0 ? '#ff6b6b' : '#ffd23f';
  ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('💰 ' + player.money, 28, 86);

  /* 犯罪条(左上角面板下方) */
  fillRR(12, 118, 204, 16, 8, 'rgba(10,12,15,0.55)');
  const cr = clamp(player.crime / 100, 0, 1);
  if (cr > 0) {
    fillRR(
      14,
      120,
      200 * cr,
      12,
      6,
      'rgba(255,120,50,' + (0.7 + 0.3 * Math.sin(game.time * 6)) + ')',
    );
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 10px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('犯罪 Lv' + player.crimeLvl, 20, 131);

  /* Boss 血条(犯罪条下方, 不与其它 UI 重叠) */
  if (boss) {
    const bw = W - 40;
    const bx = 20;
    const by = 140;
    fillRR(bx - 2, by - 2, bw + 4, 20, 10, 'rgba(10,12,15,0.7)');
    fillRR(bx, by, Math.max(4, bw * (boss.hp / boss.maxHp)), 16, 8, '#e5484d');
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = "bold 11px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('逆行大运  ' + Math.ceil(boss.hp) + ' / ' + boss.maxHp, W / 2, by + 13);
  }

  /* 特殊效果倒计时 */
  drawBuffs();

  /* 暂停 / 音量 按钮 */
  fillRR(pauseBtn.x, pauseBtn.y, pauseBtn.w, pauseBtn.h, 8, 'rgba(10,12,15,0.55)');
  ctx.fillStyle = '#e6e9ed';
  if (game.paused) {
    /* 播放三角 */
    ctx.beginPath();
    ctx.moveTo(pauseBtn.x + 12, pauseBtn.y + 10);
    ctx.lineTo(pauseBtn.x + 12, pauseBtn.y + 24);
    ctx.lineTo(pauseBtn.x + 25, pauseBtn.y + 17);
    ctx.closePath();
    ctx.fill();
  } else {
    /* 暂停双竖线 */
    ctx.fillRect(pauseBtn.x + 12, pauseBtn.y + 10, 4, 14);
    ctx.fillRect(pauseBtn.x + 19, pauseBtn.y + 10, 4, 14);
  }
  pressDark(pauseBtn, 8);
  fillRR(soundBtn.x, soundBtn.y, soundBtn.w, soundBtn.h, 8, 'rgba(10,12,15,0.55)');
  const vol = SFX.getVolume();
  ctx.fillStyle = vol <= 0 ? '#8a929c' : '#e6e9ed';
  ctx.font = "14px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(vol <= 0 ? '🔇' : '🔊', soundBtn.x + soundBtn.w / 2, soundBtn.y + 22);
  ctx.fillStyle = '#9aa3ad';
  ctx.font = "9px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(Math.round(vol * 100) + '%', soundBtn.x + soundBtn.w / 2, soundBtn.y + 31);
  pressDark(soundBtn, 8);
  ctx.textAlign = 'left';

  /* 右上: 当前速度 + 已行驶里程 */
  fillRR(W - 176, 12, 164, 64, 12, 'rgba(10,12,15,0.55)');
  ctx.textAlign = 'right';
  const kmh = Math.round((game.speed / PX_PER_M) * 3.6);
  /* 超过默认速度时文字变黄提示 */
  ctx.fillStyle = kmh > Math.round((BASE_SPEED / PX_PER_M) * 3.6) + 5 ? '#ffd23f' : '#e6e9ed';
  ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(kmh + ' km/h', W - 24, 40);
  ctx.fillStyle = '#9aa3ad';
  ctx.font = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('已行驶 ' + (game.totalDist / PX_PER_M / 1000).toFixed(2) + ' km', W - 24, 62);


  /* 投掷按钮(消耗最下方非特殊外卖, 自动锁定敌人) */
  const throwIdx = oldestNonSpecialIndex();
  const canThrow = throwIdx >= 0;
  fillRR(
    throwBtn.x,
    throwBtn.y,
    throwBtn.w,
    throwBtn.h,
    14,
    canThrow ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
  );
  ctx.strokeStyle = canThrow ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  rr(throwBtn.x, throwBtn.y, throwBtn.w, throwBtn.h, 14);
  ctx.stroke();
  if (canThrow) {
    const bottom = player.food[throwIdx];
    ctx.save();
    ctx.translate(throwBtn.x + 30, throwBtn.y + 27);
    if (bottom.poison || bottom.special >= 0) drawFoodGlow(bottom, 34);
    drawFoodItem(bottom, 34);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = canThrow ? '#4ade80' : '#8a929c';
  ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('投掷', throwBtn.x + 62, throwBtn.y + 26);
  ctx.fillStyle = canThrow ? '#c7cdd4' : '#6a727c';
  ctx.font = "11px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('锁定敌人', throwBtn.x + 62, throwBtn.y + 44);
  pressDark(throwBtn, 14);

  /* 装备状态(投掷按钮上方, 可同时显示多种道具) */
  const heldTypes = ['dagger', 'pistol', 'rifle', 'shield'].filter((t) => player.weapons[t]);
  if (heldTypes.length > 0) {
    fillRR(throwBtn.x, throwBtn.y - 60, throwBtn.w, 48, 12, 'rgba(10,12,15,0.55)');
    if (assets.item) {
      const fw = IMG.item.naturalWidth / 2;
      const fh = IMG.item.naturalHeight / 2;
      heldTypes.forEach((type, idx) => {
        const def = WEAPONS[type];
        const ix = throwBtn.x + 6 + idx * 34;
        ctx.drawImage(
          IMG.item,
          def.frame[0] * fw + 2,
          def.frame[1] * fh + 2,
          fw - 4,
          fh - 4,
          ix,
          throwBtn.y - 52,
          26,
          26,
        );
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e6e9ed';
        ctx.font = "bold 11px 'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText('×' + player.weapons[type].ammo, ix + 27, throwBtn.y - 30);
      });
    }
  }

  /* 右侧: 有客户时显示距离与需求, 无客户时显示预警 */
  const nextC = nearestCustomer();
  if (nextC) {
    fillRR(W - 170, 92, 158, 72, 12, 'rgba(10,12,15,0.55)');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e6e9ed';
    ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
    const distM = Math.max(0, Math.round((nextC.y - player.y) / PX_PER_M));
    ctx.fillText('距离客户 ' + distM + ' m', W - 24, 116);
    ctx.fillStyle = '#ffd23f';
    ctx.font = "bold 15px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(nextC.special >= 0 ? '特殊客户' : '需要 × ' + nextC.demand, W - 24, 144);
  } else if (assets.customer && !game.over) {
    /* 客户预警: 再行驶多少米从上方刷新一个客户 */
    const remainM = Math.max(0, Math.round((nextCustomerDist - game.totalDist) / PX_PER_M));
    fillRR(W - 170, 92, 158, 72, 12, 'rgba(10,12,15,0.55)');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffb84d';
    ctx.font = "bold 15px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('⚠ 客户预警', W - 24, 116);
    ctx.fillStyle = '#e6e9ed';
    ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('前方 ' + remainM + ' m 出现', W - 24, 144);
  }
}

/* ---- 屏幕中央大字(特殊客户台词) ---- */
function drawScreenMsg() {
  if (screenMsg.life <= 0 || !screenMsg.text) return;
  const fadeIn = Math.min(1, (screenMsg.maxLife - screenMsg.life) / 0.2);
  const fadeOut = Math.min(1, screenMsg.life / 0.4);
  const size = Math.min(36, (W - 48) / screenMsg.text.length);
  ctx.save();
  ctx.globalAlpha = fadeIn * fadeOut;
  ctx.textAlign = 'center';
  ctx.font = "bold " + size + "px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(screenMsg.text, W / 2, H * 0.4);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(screenMsg.text, W / 2, H * 0.4);
  ctx.restore();
}

/* ---- 特殊效果倒计时条 ---- */
function drawBuffs() {
  let y = boss ? 172 : 150; // 有 Boss 血条时下移, 避免重叠
  for (const b of BUFF_ROWS) {
    const t = player.buff[b.key];
    if (t <= 0) continue;
    const ratio = Math.min(1, t / b.max);
    fillRR(12, y, 132, 16, 8, 'rgba(10,12,15,0.55)');
    fillRR(14, y + 2, Math.max(2, 128 * ratio), 12, 6, b.color);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 10px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(b.label + ' ' + t.toFixed(1) + 's', 20, y + 12);
    ctx.restore();
    y += 20;
  }
}

/* ---- 暂停界面 ---- */
function drawPause() {
  if (!game.paused) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 34px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('已暂停', W / 2, H * 0.44);
  ctx.fillStyle = '#c7cdd4';
  ctx.font = "14px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('点击暂停按钮 / 按 Esc 继续', W / 2, H * 0.44 + 34);
  ctx.fillText('音量 ' + Math.round(SFX.getVolume() * 100) + '%（点右上角喇叭切换）', W / 2, H * 0.44 + 58);
  /* 返回开始界面按钮 */
  const ph = pauseHomeBtn;
  const phdy = pressFlash(ph) ? 3 : 0;
  fillRR(ph.x, ph.y + phdy, ph.w, ph.h, 12, '#2b2b2b');
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  rr(ph.x, ph.y + phdy, ph.w, ph.h, 12);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('返回开始界面', W / 2, ph.y + phdy + 33);
  pressShade(ph, 12);
}

/* ---- 游戏结束界面 ---- */
function drawGameOver() {
  if (!game.over) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5252';
  ctx.font = "bold 36px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('游戏结束', W / 2, H / 2 - 50);
  ctx.fillStyle = '#ffb3b3';
  ctx.font = "15px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(game.overReason === 'bankrupt' ? '破产！' : '死亡！', W / 2, H / 2 - 16);
  ctx.fillStyle = '#c7cdd4';
  ctx.font = "15px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(
    '本次行驶 ' + (game.totalDist / PX_PER_M / 1000).toFixed(2) + ' km',
    W / 2,
    H / 2 + 10,
  );
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(game.time * 4);
  ctx.fillStyle = '#ffd23f';
  ctx.font = "13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('— 点击返回开始界面 —', W / 2, H / 2 + 44);
  ctx.globalAlpha = 1;
}
