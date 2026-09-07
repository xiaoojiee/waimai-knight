'use strict';

/* 界面绘制: HUD(血量/外卖/速度/犯罪条)/虚拟摇杆/游戏结束界面 */

/* global ctx, fillRR, rr, W, H, player, game, PX_PER_M, BASE_SPEED, IMG, assets, HEAL_AMT, WEAPONS, customer, nextCustomerDist, input, JOY_RADIUS, clamp */

/* 外卖按钮点击区域(右下角水泥路面, 方便手机拇指操作; drawHUD 绘制, input.js pointerdown 共用) */
const foodBtn = { x: 322, y: H - 132, w: 146, h: 64 };

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
  /* 外卖数量(仅显示) */
  if (assets.food) {
    const fw = IMG.food.naturalWidth / 3;
    const fh = IMG.food.naturalHeight / 3;
    ctx.drawImage(IMG.food, 2, 2, fw - 4, fh - 4, 24, 46, 18, 18);
  }
  ctx.fillStyle = player.food > 0 ? '#ffd23f' : '#8a929c';
  ctx.font = "bold 15px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('× ' + player.food, 48, 61);
  /* 金钱(外卖数量下方, 负数显示红色) */
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

  /* 右下: 外卖按钮(水泥路面区域, 方便手机拇指操作) */
  const canUse = player.food > 0 && player.hp < player.maxHp;
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
  if (assets.food) {
    /* 外卖图标(取 3×3 图集 0-0 帧) */
    const fw = IMG.food.naturalWidth / 3;
    const fh = IMG.food.naturalHeight / 3;
    ctx.drawImage(IMG.food, 2, 2, fw - 4, fh - 4, foodBtn.x + 12, foodBtn.y + 12, 40, 40);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = canUse ? '#ffd23f' : '#8a929c';
  ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('回血', foodBtn.x + 62, foodBtn.y + 32);
  ctx.fillStyle = canUse ? '#c7cdd4' : '#6a727c';
  ctx.font = "11px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('+' + HEAL_AMT + ' HP', foodBtn.x + 62, foodBtn.y + 50);

  /* 装备状态(外卖按钮上方, 可同时显示多种道具) */
  const heldTypes = ['dagger', 'pistol', 'rifle', 'shield'].filter((t) => player.weapons[t]);
  if (heldTypes.length > 0) {
    fillRR(foodBtn.x, foodBtn.y - 60, foodBtn.w, 48, 12, 'rgba(10,12,15,0.55)');
    if (assets.item) {
      const fw = IMG.item.naturalWidth / 3;
      const fh = IMG.item.naturalHeight / 3;
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
  ctx.fillText(
    game.overReason === 'bankrupt' ? '外卖基金亏损破产!' : '骑手受伤过重',
    W / 2,
    H / 2 - 16,
  );
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
  ctx.fillText('— 点击屏幕重新开始 —', W / 2, H / 2 + 44);
  ctx.globalAlpha = 1;
}
