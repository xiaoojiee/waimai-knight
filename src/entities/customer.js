'use strict';

/* 客户(送餐任务): 路边生成/距离提示/送达结算 */

/* global game, assets, IMG, PX_PER_M, CUSTOMER_DELAY_FIRST_M, CUSTOMER_SPAWN_CHANCE, CUSTOMER_INTERVAL_MIN_M, CUSTOMER_INTERVAL_MAX_M, player, FOOD_PRICE, FOOD_FINE, gameOver, addFloatText, ctx, fillRR, H, ROAD, difficulty */

let customer = null; // 当前路边客户 { x, y, side, demand, frame, resolved }
let nextCustomerDist = CUSTOMER_DELAY_FIRST_M * PX_PER_M; // 下一个客户出现的距离阈值(px)

/* 客户图集: 已离线裁切为 5×3 均匀网格(每格居中一个客户), 直接按格切分;
 * 剔除最左边一列(该列角色有问题), 实际使用 4×3 = 12 个客户 */
const CUS_FRAMES = []; // [{x, y, w, h}] 行主序
function detectCustomerFrames() {
  const iw = IMG.customer.naturalWidth;
  const ih = IMG.customer.naturalHeight;
  const cw = iw / 5;
  const ch = ih / 3;
  CUS_FRAMES.length = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 1; c < 5; c++) {
      CUS_FRAMES.push({ x: c * cw, y: r * ch, w: cw, h: ch });
    }
  }
}

/* 客户需求随行驶里程增长: 每 500m 升一档(上限 4 档), 越往后要求越多 */
function rollDemand() {
  /* 前 250 米只要求 1~2 个 */
  if (game.totalDist < 250 * PX_PER_M) return 1 + Math.floor(Math.random() * 2);
  const km = game.totalDist / PX_PER_M / 1000; // 已行驶公里数
  const lvl = Math.min(4, Math.floor(km / 0.5)); // 每 500 米一档
  const max = 4 + lvl; // 需求上限 4 → 8
  const min = Math.min(1 + Math.floor(lvl / 2), max - 1); // 需求下限 1 → 3
  /* 难度越高需求越大: 满难度时额外 +0~3 个 */
  const extra = Math.floor(difficulty() * 4 * Math.random());
  return min + Math.floor(Math.random() * (max - min + 1)) + extra;
}

function spawnCustomer() {
  if (!assets.customer) return;
  const side = Math.random() < 0.5 ? 0 : 1;
  customer = {
    x: side === 0 ? ROAD.left - 24 : ROAD.left + ROAD.width + 24, // 路边人行道
    y: -90, // 屏幕上方入场, 随场景向后移动
    side,
    demand: rollDemand(), // 需求随里程增长, 越往后越高
    frame: Math.floor(Math.random() * CUS_FRAMES.length),
    resolved: false,
  };
}

function updateCustomer(dt) {
  if (!customer) {
    if (!game.over && assets.customer && game.totalDist >= nextCustomerDist) {
      /* 到达距离阈值: 概率生成(难度越高概率越高 60%→90%), 未生成则重新调度 */
      if (Math.random() < CUSTOMER_SPAWN_CHANCE + difficulty() * 0.3) {
        spawnCustomer();
      } else {
        scheduleCustomer();
      }
    }
    return;
  }
  customer.y += game.speed * dt; // 客户站在路边, 随世界一起后移
  if (!customer.resolved && customer.y > player.y) {
    /* 经过客户: 结算 */
    customer.resolved = true;
    if (player.food >= customer.demand) {
      player.food -= customer.demand;
      const gain = customer.demand * FOOD_PRICE;
      player.money += gain;
      addFloatText(customer.x, customer.y, '+' + gain, '#ffd23f');
    } else {
      const fine = customer.demand * FOOD_FINE;
      player.money -= fine;
      addFloatText(customer.x, customer.y, '-' + fine, '#ff6b6b');
      if (player.money < 0) {
        /* 金钱低于 0 → 破产死亡 */
        game.overReason = 'bankrupt';
        gameOver();
      }
    }
  }
  if (customer.y > H + 120) {
    customer = null;
    scheduleCustomer();
  }
}

/* 调度下一个客户的出现距离 */
function scheduleCustomer() {
  /* 难度越高客户越频繁(间隔最多缩短 50%) */
  const m =
    (CUSTOMER_INTERVAL_MIN_M + Math.random() * (CUSTOMER_INTERVAL_MAX_M - CUSTOMER_INTERVAL_MIN_M)) *
    (1 - difficulty() * 0.5);
  nextCustomerDist = game.totalDist + m * PX_PER_M;
}

/* ---- 客户绘制(路边) ---- */
function drawCustomer() {
  if (!customer || !assets.customer || !CUS_FRAMES.length) return;
  const c = customer;
  const f = CUS_FRAMES[c.frame % CUS_FRAMES.length]; // 逐帧包围盒(以内容为中心切割)
  const s = 64;
  const w = s * (f.w / f.h); // 按帧的实际宽高比绘制
  ctx.save();
  /* 阴影 */
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - 3, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(c.x, c.y);
  /* 右侧的客户镜像翻转, 面向路面 */
  if (c.side === 1) ctx.scale(-1, 1);
  ctx.drawImage(IMG.customer, f.x, f.y, f.w, f.h, -w / 2, -s, w, s);
  ctx.restore();
  /* 头顶需求气泡 */
  fillRR(c.x - 23, c.y - s - 30, 46, 20, 10, 'rgba(10,12,15,0.7)');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = "bold 13px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('× ' + c.demand, c.x, c.y - s - 16);
}
