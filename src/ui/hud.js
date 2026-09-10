'use strict';

/* 界面绘制: HUD(血量/外卖/速度/犯罪条)/虚拟摇杆/游戏结束界面 */

/* global ctx, fillRR, rr, W, H, player, game, PX_PER_M, BASE_SPEED, IMG, assets, HEAL_AMT, WEAPONS, customer, nextCustomerDist, input, JOY_RADIUS, clamp, VEHICLES, drawFoodItem, drawFoodGlow, oldestNonSpecialIndex, screenMsg */

/* 外卖按钮点击区域(右下角水泥路面, 方便手机拇指操作; drawHUD 绘制, input.js pointerdown 共用) */
const foodBtn = { x: 322, y: H - 132, w: 146, h: 64 };

/* 投掷外卖按钮(回血按钮下方; input.js pointerdown 共用) */
const throwBtn = { x: 322, y: H - 62, w: 146, h: 54 };

/* 开始按钮点击区域(主菜单, input.js pointerdown 共用) */
const startBtn = { x: W / 2 - 80, y: H * 0.62, w: 160, h: 56 };

/* "选择出行方式"按钮(主菜单, input.js pointerdown 共用) */
const vehicleOpenBtn = { x: W / 2 - 110, y: H * 0.5, w: 220, h: 60 };

/* 返回按钮(出行方式选择界面, input.js pointerdown 共用) */
const vehicleBackBtn = { x: 20, y: 20, w: 88, h: 42 };

/* 出行方式卡片(左侧纵向排布; 右侧为属性面板; input.js pointerdown 共用) */
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

/* 替身面板式六维属性(右下方雷达图) */
const STAT_AXES = [
  { key: '速度', get: (d) => d.baseSpeed, min: 80, max: 300 },
  { key: '极速', get: (d) => d.maxSpeed, min: 160, max: 480 },
  { key: '耐久', get: (d) => d.maxHp, min: 50, max: 160 },
  { key: '力量', get: (d) => d.damageMul, min: 0.5, max: 2 },
  { key: '灵活', get: (d) => d.moveSpeed, min: 80, max: 380 },
  { key: '冲刺', get: (d) => (d.dashOnEat ? 1 : 0.12), min: 0, max: 1 },
];
function statGrade(v) {
  if (v >= 1) return 'S'; // 突破上限: S 级
  if (v >= 0.85) return 'A';
  if (v >= 0.65) return 'B';
  if (v >= 0.45) return 'C';
  if (v >= 0.25) return 'D';
  return 'E';
}
/* 允许超过 1(如火车头速度)以便面板多边形冲破圆框 */
function statValues(def) {
  return STAT_AXES.map((s) => Math.max(0.08, Math.min(2.1, (s.get(def) - s.min) / (s.max - s.min))));
}
function drawStatPanel(cx, cy, r, def) {
  const n = STAT_AXES.length;
  const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  /* 背板 */
  ctx.fillStyle = 'rgba(10,12,15,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 38, 0, Math.PI * 2);
  ctx.fill();
  /* 网格环 */
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    const rr = (r * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ang(i % n);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  /* 轴线 */
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  /* 数据多边形 */
  const vals = statValues(def);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = ang(i % n);
    const vr = r * vals[i % n];
    const x = cx + Math.cos(a) * vr;
    const y = cy + Math.sin(a) * vr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,213,63,0.35)';
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  ctx.stroke();
  /* 顶点 */
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * vals[i], cy + Math.sin(a) * r * vals[i], 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  /* 标签 + 等级 */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    const lx = cx + Math.cos(a) * (r + 20);
    const ly = cy + Math.sin(a) * (r + 20);
    ctx.fillStyle = '#e6e9ed';
    ctx.font = "bold 12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(STAT_AXES[i].key, lx, ly - 8);
    ctx.fillStyle = '#ffd23f';
    ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(statGrade(vals[i]), lx, ly + 9);
  }
  ctx.textBaseline = 'alphabetic';
}

/* ---- 开始界面(黄色全屏覆盖) ---- */
function drawMenu() {
  if (game.started) return;
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (game.menuScreen === 'vehicle') drawVehicleSelect();
  else drawMenuMain();
}

/* 主菜单: 标题 + 选择出行方式 + 开始 */
function drawMenuMain() {
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 38px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('肥嘟嘟外卖模拟器', W / 2, H * 0.3);
  /* 载具按钮 */
  const b = vehicleOpenBtn;
  fillRR(b.x, b.y, b.w, b.h, 14, '#c9a51c');
  ctx.strokeStyle = '#8a6d10';
  ctx.lineWidth = 1.5;
  rr(b.x, b.y, b.w, b.h, 14);
  ctx.stroke();
  ctx.fillStyle = '#5a4a00';
  ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('载具', W / 2, b.y + 26);
  ctx.font = "13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('当前: ' + VEHICLES[player.vehicle].label, W / 2, b.y + 48);
  /* 开始按钮 */
  fillRR(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 14, '#2b2b2b');
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 26px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('开始', W / 2, startBtn.y + 38);
  /* 操作提示 */
  ctx.fillStyle = '#5a4a00';
  ctx.font = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('电脑: 方向键/WASD · 手机: 下半屏滑动', W / 2, H * 0.85);
}

/* 出行方式选择界面: 左侧卡片列表 + 右侧替身式属性面板 + 返回 */
function drawVehicleSelect() {
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 26px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('选择出行方式', W / 2, H * 0.11);
  for (const type of vehicleKeys) {
    const def = VEHICLES[type];
    const b = vehicleBtns[type];
    const sel = player.vehicle === type;
    fillRR(b.x, b.y, b.w, b.h, 14, sel ? '#2b2b2b' : '#f0c93f');
    ctx.strokeStyle = sel ? '#ffd23f' : '#c9a51c';
    ctx.lineWidth = sel ? 3 : 1.5;
    rr(b.x, b.y, b.w, b.h, 14);
    ctx.stroke();
    /* 贴图预览(多帧只画第一帧), 左侧 */
    const preview = IMG[def.img];
    if (preview && preview.naturalWidth) {
      const ph = 62;
      const frameW = preview.naturalWidth / def.frames;
      const pw = (ph * frameW) / preview.naturalHeight;
      ctx.drawImage(
        preview,
        0,
        0,
        frameW,
        preview.naturalHeight,
        b.x + 44 - pw / 2,
        b.y + b.h / 2 - ph / 2,
        pw,
        ph,
      );
    }
    /* 文案 */
    ctx.textAlign = 'left';
    ctx.fillStyle = sel ? '#ffd23f' : '#5a4a00';
    ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(def.label, b.x + 92, b.y + 40);
    ctx.font = "12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(def.desc, b.x + 92, b.y + 64);
    ctx.textAlign = 'center';
  }
  /* 右侧替身式属性面板(显示当前所选载具) */
  const selDef = VEHICLES[player.vehicle];
  ctx.fillStyle = '#2b2b2b';
  ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(selDef.label, 372, 180);
  drawStatPanel(372, 420, 66, selDef);
  /* 返回按钮 */
  const r = vehicleBackBtn;
  fillRR(r.x, r.y, r.w, r.h, 10, '#2b2b2b');
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('← 返回', r.x + r.w / 2, r.y + 27);
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
  /* 左上: 玩家血量(红色) + 外卖数量 + 金钱 */
  fillRR(12, 12, 204, 96, 12, 'rgba(10,12,15,0.55)');
  fillRR(24, 26, 180, 14, 7, 'rgba(255,255,255,0.12)');
  const ratio = clamp(player.hp / player.maxHp, 0, 1);
  /* 血量低于 30% 时呼吸闪烁 */
  const pulse = ratio < 0.3 ? 0.6 + 0.4 * Math.sin(game.time * 8) : 1;
  fillRR(26, 28, Math.max(4, 176 * ratio), 10, 5, 'rgba(229,72,77,' + pulse + ')');
  ctx.textAlign = 'left';
  /* 外卖 / 特殊外卖 数量 */
  let normalN = 0;
  let specialN = 0;
  for (const f of player.food) {
    if (f.special >= 0) specialN++;
    else normalN++;
  }
  ctx.font = "bold 13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillStyle = '#e6e9ed';
  ctx.fillText('外卖 ×' + normalN, 28, 64);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('特殊 ×' + specialN, 112, 64);
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
  if (player.slowT > 0) {
    /* 扎胎减速提示 */
    ctx.fillStyle = '#ff9d5c';
    ctx.fillText('扎胎减速 ' + Math.ceil(player.slowT) + 's', 88, 131);
  }

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

  /* 右下: 回血按钮(消耗最下方非特殊外卖) */
  const healIdx = oldestNonSpecialIndex();
  const healItem = healIdx >= 0 ? player.food[healIdx] : null;
  const poisonNext = !!(healItem && healItem.poison);
  const canUse = healIdx >= 0 && player.hp < player.maxHp;
  fillRR(
    foodBtn.x,
    foodBtn.y,
    foodBtn.w,
    foodBtn.h,
    14,
    canUse ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
  );
  ctx.strokeStyle = canUse ? 'rgba(255,213,63,0.5)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  rr(foodBtn.x, foodBtn.y, foodBtn.w, foodBtn.h, 14);
  ctx.stroke();
  /* 待食用的是有毒外卖 → 按钮发绿光 */
  if (poisonNext) {
    ctx.save();
    ctx.shadowColor = 'rgba(74,222,128,0.95)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(74,222,128,0.95)';
    ctx.lineWidth = 3;
    rr(foodBtn.x, foodBtn.y, foodBtn.w, foodBtn.h, 14);
    ctx.stroke();
    ctx.restore();
  }
  if (healItem) {
    ctx.save();
    ctx.translate(foodBtn.x + 32, foodBtn.y + 32);
    if (poisonNext) drawFoodGlow(healItem, 40);
    drawFoodItem(healItem, 40);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = canUse ? '#ffd23f' : '#8a929c';
  ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('回血', foodBtn.x + 62, foodBtn.y + 32);
  ctx.fillStyle = canUse ? '#c7cdd4' : '#6a727c';
  ctx.font = "11px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('+' + HEAL_AMT + ' HP', foodBtn.x + 62, foodBtn.y + 50);

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

  /* 装备状态(外卖按钮上方, 可同时显示多种道具) */
  const heldTypes = ['dagger', 'pistol', 'rifle', 'shield'].filter((t) => player.weapons[t]);
  if (heldTypes.length > 0) {
    fillRR(foodBtn.x, foodBtn.y - 60, foodBtn.w, 48, 12, 'rgba(10,12,15,0.55)');
    if (assets.item) {
      const fw = IMG.item.naturalWidth / 2;
      const fh = IMG.item.naturalHeight / 2;
      heldTypes.forEach((type, idx) => {
        const def = WEAPONS[type];
        const ix = foodBtn.x + 6 + idx * 34;
        ctx.drawImage(
          IMG.item,
          def.frame[0] * fw + 2,
          def.frame[1] * fh + 2,
          fw - 4,
          fh - 4,
          ix,
          foodBtn.y - 52,
          26,
          26,
        );
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e6e9ed';
        ctx.font = "bold 11px 'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText('×' + player.weapons[type].ammo, ix + 27, foodBtn.y - 30);
      });
    }
  }

  /* 右侧: 有客户时显示距离与需求, 无客户时显示预警 */
  if (customer) {
    fillRR(W - 170, 92, 158, 72, 12, 'rgba(10,12,15,0.55)');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e6e9ed';
    ctx.font = "bold 16px 'PingFang SC','Microsoft YaHei',sans-serif";
    const distM = Math.max(0, Math.round((customer.y - player.y) / PX_PER_M));
    ctx.fillText('距离客户 ' + distM + ' m', W - 24, 116);
    ctx.fillStyle = '#ffd23f';
    ctx.font = "bold 15px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('需要 × ' + customer.demand, W - 24, 144);
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
