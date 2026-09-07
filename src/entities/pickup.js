'use strict';

/* 外卖掉落与拾取(敌方死亡掉落/回血按钮) */

/* global assets, clamp, ROAD, player, game, addFloatText, HEAL_AMT, IMG, ctx, FOOD_SIZE, H */

/* 3×3 图集, 中间 [1,1] 为空, 取其余 8 帧 */
const FOOD_FRAMES = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
];
const pickups = [];

/* 敌方死亡掉落 2~3 个外卖 */
function dropFood(x, y) {
  if (!assets.food) return;
  const n = 2 + Math.floor(Math.random() * 2);
  /* 撒向路面空间更广阔的一侧, 且全部落在路面内可捡到 */
  const margin = 60;
  const leftSpace = x - (ROAD.left + margin);
  const rightSpace = ROAD.left + ROAD.width - margin - x;
  const dir = rightSpace > leftSpace ? 1 : -1;
  const spread = Math.max(50, Math.min(150, Math.max(leftSpace, rightSpace) + 40));
  for (let i = 0; i < n; i++) {
    /* 往前(屏幕上方向)斜着撒出, 横向偏向空间更广阔的一侧 */
    const dx = dir * spread * (0.3 + Math.random() * 0.7);
    const dy = -(25 + Math.random() * 55);
    pickups.push({
      x: clamp(x + dx, ROAD.left + margin, ROAD.left + ROAD.width - margin),
      y: clamp(y + dy, 60, H - 60),
      vx: dir * (40 + Math.random() * 90),
      vy: -(240 + Math.random() * 180), // 向前滑行的初速度(带惯性)
      life: 0,
      maxLife: 7,
      frame: FOOD_FRAMES[Math.floor(Math.random() * FOOD_FRAMES.length)],
    });
  }
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const f = pickups[i];
    f.life += dt;
    f.x += f.vx * dt;
    f.y += game.speed * 0.9 * dt + f.vy * dt; // 惯性滑行 + 随场景缓慢后移
    f.vx *= Math.max(0, 1 - dt * 2); // 横向摩擦
    f.vy *= Math.max(0, 1 - dt * 1.5); // 纵向摩擦: 向前滑一段后逐渐落后
    f.x = clamp(f.x, ROAD.left + 44, ROAD.left + ROAD.width - 44); // 始终留在路面内
    const dx = f.x - player.x;
    const dy = f.y - player.y;
    if (dx * dx + dy * dy < 55 * 55) {
      player.food++;
      addFloatText(f.x, f.y, '+1', '#ffd23f');
      pickups.splice(i, 1);
      continue;
    }
    if (f.life >= f.maxLife) pickups.splice(i, 1);
  }
}

/* 点击外卖按钮: 消耗 1 个外卖回血 */
function useFood() {
  if (player.food <= 0 || game.over || player.hp >= player.maxHp) return;
  player.food--;
  player.hp = Math.min(player.maxHp, player.hp + HEAL_AMT);
  player.healFlash = 0.4;
  addFloatText(player.x, player.y - player.height / 2, '+' + HEAL_AMT, '#4ade80');
}

/* ---- 外卖掉落绘制 ---- */
function drawPickups() {
  if (!assets.food) return;
  const fw = IMG.food.naturalWidth / 3; // 3×3 图集
  const fh = IMG.food.naturalHeight / 3;
  for (const f of pickups) {
    const t = f.life / f.maxLife;
    /* 最后 20% 时间闪烁消失 */
    const alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
    const bob = Math.sin(game.time * 6 + f.life * 10) * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(f.x, f.y + bob);
    const s = FOOD_SIZE;
    ctx.drawImage(
      IMG.food,
      f.frame[0] * fw + 2,
      f.frame[1] * fh + 2,
      fw - 4,
      fh - 4,
      -s / 2,
      -s / 2,
      s,
      s,
    );
    ctx.restore();
  }
}
