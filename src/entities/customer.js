'use strict';

/* 客户(送餐任务): 路边生成/距离提示/送达结算 */

/* global game, assets, IMG, PX_PER_M, CUSTOMER_DELAY_FIRST_M, CUSTOMER_SPAWN_CHANCE, CUSTOMER_INTERVAL_MIN_M, CUSTOMER_INTERVAL_MAX_M, player, FOOD_PRICE, FOOD_FINE, gameOver, addFloatText, ctx, fillRR, H, ROAD */

let customer = null; // 当前路边客户 { x, y, side, demand, frame, resolved }
let nextCustomerDist = CUSTOMER_DELAY_FIRST_M * PX_PER_M; // 下一个客户出现的距离阈值(px)

/* 客户图集: 加载时逐帧检测包围盒——贴图带外余量, 以内容为中心切割, 适应任意布局 */
const CUS_FRAMES = []; // [{x, y, w, h}] 行主序
function detectCustomerFrames() {
  try {
    const c = document.createElement('canvas');
    c.width = IMG.customer.naturalWidth;
    c.height = IMG.customer.naturalHeight;
    const c2d = c.getContext('2d', { willReadFrequently: true });
    c2d.drawImage(IMG.customer, 0, 0);
    const d = c2d.getImageData(0, 0, c.width, c.height).data;
    const iw = c.width,
      ih = c.height;
    /* 16px 采样网格 + 连通域分析, 得到每个角色的包围盒 */
    const s = 16;
    const gw = Math.ceil(iw / s),
      gh = Math.ceil(ih / s);
    const grid = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let has = false;
        for (let y = gy * s; y < (gy + 1) * s && y < ih && !has; y += 2) {
          for (let x = gx * s; x < (gx + 1) * s && x < iw; x += 2) {
            if (d[(y * iw + x) * 4 + 3] > 8) {
              has = true;
              break;
            }
          }
        }
        grid[gy * gw + gx] = has ? 1 : 0;
      }
    }
    /* BFS 连通域 */
    const seen = new Uint8Array(gw * gh);
    const stack = [];
    const boxes = [];
    for (let i = 0; i < gw * gh; i++) {
      if (!grid[i] || seen[i]) continue;
      let minX = gw,
        minY = gh,
        maxX = 0,
        maxY = 0;
      seen[i] = 1;
      stack.push(i);
      while (stack.length) {
        const p = stack.pop();
        const px = p % gw,
          py = (p / gw) | 0;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (px + 1 < gw && grid[p + 1] && !seen[p + 1]) {
          seen[p + 1] = 1;
          stack.push(p + 1);
        }
        if (px > 0 && grid[p - 1] && !seen[p - 1]) {
          seen[p - 1] = 1;
          stack.push(p - 1);
        }
        if (py + 1 < gh && grid[p + gw] && !seen[p + gw]) {
          seen[p + gw] = 1;
          stack.push(p + gw);
        }
        if (py > 0 && grid[p - gw] && !seen[p - gw]) {
          seen[p - gw] = 1;
          stack.push(p - gw);
        }
      }
      const bx = Math.max(0, minX * s - 2);
      const by = Math.max(0, minY * s - 2);
      boxes.push({
        x: bx,
        y: by,
        w: Math.min(iw - bx, (maxX - minX + 1) * s + 4),
        h: Math.min(ih - by, (maxY - minY + 1) * s + 4),
      });
    }
    /* 合并同行的碎块(同一角色被拆成多个连通域的情况) */
    boxes.sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i],
        b = boxes[i + 1];
      if (!a || !b) continue;
      if (b.x < a.x + a.w + 40 && b.y < a.y + a.h && b.y + b.h > a.y) {
        const x2 = Math.min(a.x, b.x);
        const y2 = Math.min(a.y, b.y);
        a.x = x2;
        a.y = y2;
        a.w = Math.max(a.x + a.w, b.x + b.w) - x2;
        a.h = Math.max(a.y + a.h, b.y + b.h) - y2;
        boxes[i + 1] = null;
      }
    }
    for (const b of boxes) if (b) CUS_FRAMES.push(b);
    CUS_FRAMES.sort((a, b) => a.y - b.y || a.x - b.x);
  } catch (_) {
    /* 分析失败时回退: 按 5×5 均分 */
    const iw = IMG.customer.naturalWidth,
      ih = IMG.customer.naturalHeight;
    const cw = iw / 5,
      ch = ih / 5;
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 5; col++) {
        CUS_FRAMES.push({ x: col * cw, y: r * ch, w: cw, h: ch });
      }
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
  return min + Math.floor(Math.random() * (max - min + 1));
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
      /* 到达距离阈值: 概率生成, 未生成则重新调度 */
      if (Math.random() < CUSTOMER_SPAWN_CHANCE) {
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
  const m =
    CUSTOMER_INTERVAL_MIN_M + Math.random() * (CUSTOMER_INTERVAL_MAX_M - CUSTOMER_INTERVAL_MIN_M);
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
