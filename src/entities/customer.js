'use strict';

/* 客户(送餐任务): 路边生成/距离提示/送达结算; 特殊客户对应特殊外卖; 可同时存在多个 */

/* global game, assets, IMG, PX_PER_M, CUSTOMER_DELAY_FIRST_M, CUSTOMER_SPAWN_CHANCE, CUSTOMER_INTERVAL_MIN_M, CUSTOMER_INTERVAL_MAX_M, player, FOOD_PRICE, FOOD_FINE, gameOver, addFloatText, ctx, fillRR, H, ROAD, difficulty, detectGridFrames, SPECIAL_MATCH, SPECIAL_CUSTOMER_CHANCE, drawFoodItem, showScreenText, grantWeapon, BRAVE_TIME, MELON_TIME, EAT_TIME, SFX, GROUND_SCROLL_MUL */

const customers = []; // 多个路边客户
let nextCustomerDist = CUSTOMER_DELAY_FIRST_M * PX_PER_M; // 下一个客户出现的距离阈值(px)

/* 普通客户图集 3列×3行; 特殊客户图集 2列×2行 */
const CUS_FRAMES = []; // [{x, y, w, h}] 行主序
const SPCUS_FRAMES = [];
function detectCustomerFrames() {
  CUS_FRAMES.length = 0;
  CUS_FRAMES.push(...detectGridFrames(IMG.customer, 3, 3));
}
function detectSpecialCustomerFrames() {
  SPCUS_FRAMES.length = 0;
  SPCUS_FRAMES.push(...detectGridFrames(IMG.specCus, 2, 2));
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

/* 持有某特殊外卖时, 提高对应特殊客户的出现权重 */
function pickSpecialIndex() {
  const w = [1, 1, 1, 1];
  for (const f of player.food) {
    if (f.special < 0) continue;
    const ci = SPECIAL_MATCH.indexOf(f.special); // 该食物对应的客户索引
    if (ci >= 0) w[ci] = 4; // 持有对应食物 → 权重 ×4
  }
  let total = 0;
  for (const x of w) total += x;
  let r = Math.random() * total;
  for (let i = 0; i < 4; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return 3;
}
/* 持有任意特殊外卖时, 特殊客户出现概率提升 */
function specialChance() {
  for (const f of player.food) {
    if (f.special >= 0) return Math.min(0.6, SPECIAL_CUSTOMER_CHANCE + 0.25);
  }
  return SPECIAL_CUSTOMER_CHANCE;
}

function spawnCustomer(atY) {
  if (!assets.customer) return;
  const side = Math.random() < 0.5 ? 0 : 1;
  /* 特殊客户: 持有对应外卖时概率更高、且更偏向对应类型 */
  const special = assets.specCus && Math.random() < specialChance() ? pickSpecialIndex() : -1;
  customers.push({
    x: side === 0 ? ROAD.left - 24 : ROAD.left + ROAD.width + 24, // 路边人行道
    y: atY != null ? atY : -90, // 屏幕上方入场, 随场景向后移动
    side,
    special,
    demand: special >= 0 ? 0 : rollDemand(), // 特殊客户不看数量
    frame: Math.floor(Math.random() * CUS_FRAMES.length),
    resolved: false,
  });
}

/* 消耗最下方 n 个非特殊外卖(特殊外卖留给特殊客户); 数量不足返回 false */
function consumeNonSpecial(n) {
  const idx = [];
  for (let i = 0; i < player.food.length && idx.length < n; i++) {
    if (player.food[i].special < 0) idx.push(i);
  }
  if (idx.length < n) return false;
  for (let k = idx.length - 1; k >= 0; k--) player.food.splice(idx[k], 1);
  return true;
}

/* 特殊客户效果(参数为对应特殊外卖帧):
 * 0 罐(0-0客户): 我超勇的 — 移速大增, 大幅减伤
 * 2 西瓜(0-1客户): 给匕首, 短时间自动丢西瓜
 * 1 香肠(1-0客户): 焖子 — 撞死敌人被吃掉回血
 * 3 鸡汤(1-1客户): 现有食物全部变有毒 */
function applySpecialEffect(foodIdx) {
  const b = player.buff;
  if (foodIdx === 0) {
    showScreenText('我超勇的');
    SFX.voice('brave');
    b.brave = BRAVE_TIME;
  } else if (foodIdx === 2) {
    showScreenText('我开水果摊的能卖你生瓜蛋子啊');
    SFX.voice('melon');
    grantWeapon('dagger');
    b.melon = MELON_TIME;
  } else if (foodIdx === 1) {
    showScreenText('焖子');
    SFX.voice('eat');
    b.eat = EAT_TIME;
  } else if (foodIdx === 3) {
    showScreenText('鸡汤来咯');
    SFX.voice('soup');
    for (const it of player.food) {
      it.poison = true;
      it.special = -1;
      it.f = null;
      it.pf = Math.floor(Math.random() * 2);
    }
  }
}

function updateCustomer(dt) {
  /* 到达距离阈值: 概率生成(可同时存在多个), 然后调度下一个 */
  if (!game.over && assets.customer && game.totalDist >= nextCustomerDist) {
    if (Math.random() < CUSTOMER_SPAWN_CHANCE + difficulty() * 0.3) spawnCustomer();
    scheduleCustomer();
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i];
    c.y += game.speed * GROUND_SCROLL_MUL * dt; // 客户站在路边, 随世界一起后移(与地面同步)
    if (!c.resolved && c.y > player.y) {
      /* 经过客户: 结算 */
      c.resolved = true;
      if (c.special >= 0) {
        /* 特殊客户: 身上有对应特殊外卖则触发特殊效果, 否则无视 */
        const want = SPECIAL_MATCH[c.special];
        const fi = player.food.findIndex((f) => f.special === want);
        if (fi >= 0) {
          player.food.splice(fi, 1);
          applySpecialEffect(want);
        }
      } else if (consumeNonSpecial(c.demand)) {
        const gain = c.demand * FOOD_PRICE;
        player.money += gain;
        addFloatText(c.x, c.y, '+' + gain, '#ffd23f');
      } else {
        const fine = c.demand * FOOD_FINE;
        player.money -= fine;
        addFloatText(c.x, c.y, '-' + fine, '#ff6b6b');
        if (player.money < 0) {
          /* 金钱低于 0 → 破产死亡 */
          game.overReason = 'bankrupt';
          gameOver();
        }
      }
    }
    if (c.y > H + 120) customers.splice(i, 1);
  }
}

/* 最近的一个未结算客户(用于 HUD 距离提示); y 越大越靠近玩家 */
function nearestCustomer() {
  let best = null;
  for (const c of customers) {
    if (c.resolved) continue;
    if (!best || c.y > best.y) best = c;
  }
  return best;
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
  for (const c of customers) {
    const s = 64;
    if (c.special >= 0) {
      if (!assets.specCus || !SPCUS_FRAMES.length) continue;
      const f = SPCUS_FRAMES[c.special % SPCUS_FRAMES.length];
      const w = s * (f.w / f.h);
      /* 金色高光 */
      const g = ctx.createRadialGradient(c.x, c.y - s / 2, s * 0.1, c.x, c.y - s / 2, s * 0.85);
      g.addColorStop(0, 'rgba(255,213,63,0.5)');
      g.addColorStop(0.6, 'rgba(255,213,63,0.22)');
      g.addColorStop(1, 'rgba(255,213,63,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y - s / 2, s * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.side === 1) ctx.scale(-1, 1);
      ctx.drawImage(IMG.specCus, f.x, f.y, f.w, f.h, -w / 2, -s, w, s);
      ctx.restore();
      /* 需求气泡: 显示对应特殊外卖图标 */
      fillRR(c.x - 26, c.y - s - 34, 52, 32, 12, 'rgba(10,12,15,0.72)');
      ctx.strokeStyle = 'rgba(255,213,63,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y - s - 18, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(c.x, c.y - s - 18);
      drawFoodItem({ special: SPECIAL_MATCH[c.special], poison: false, f: null }, 24);
      ctx.restore();
      continue;
    }
    if (!assets.customer || !CUS_FRAMES.length) continue;
    const f = CUS_FRAMES[c.frame % CUS_FRAMES.length]; // 逐帧包围盒(以内容为中心切割)
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
}
