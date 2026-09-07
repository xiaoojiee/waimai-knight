'use strict';

/* 敌方骑手: 生成(前方被超越/后方超车两种)、更新、受击结算与绘制 */

/* global game, ENEMY_MAX, assets, H, ENEMY_DIE_TIME, clamp, ROAD, zone, zoneScreenY, ENEMY_HIT_CD, spawnBoom, dropFood, IMG, ctx, drawBar, player, addFloatText */

const enemies = [];
let enemyTimer = 1.2;

/* 生成敌方骑手: 'ahead' 从前方出现被玩家超越, 'behind' 从后方超车 */
function spawnEnemy() {
  const type = Math.random() < 0.5 ? 'ahead' : 'behind';
  const speed =
    type === 'ahead'
      ? game.speed * (0.35 + Math.random() * 0.15) // 远慢于场景 → 快速滑出屏幕被超越
      : game.speed * (1.25 + Math.random() * 0.25); // 快于玩家 → 超车
  let x = ROAD.left + 34 + Math.random() * (ROAD.width - 68);
  /* 避免直接刷在玩家正前/正后方 */
  for (let i = 0; i < 5 && Math.abs(x - player.x) < 90; i++) {
    x = ROAD.left + 34 + Math.random() * (ROAD.width - 68);
  }
  enemies.push({
    x,
    y: type === 'ahead' ? -90 : H + 90, // 屏幕外入场
    speed, // 世界前进速度 px/s
    width: 51,
    height: 51, // 敌方贴图绘制尺寸(64 的 0.8 倍)
    hp: 30,
    maxHp: 30,
    hitCd: 0,
    flash: 0,
    kbx: 0, // 撞击弹开冲量(横向)
    kby: 0, // 撞击弹开冲量(纵向)
    spin: 0, // 死亡翻滚角速度(被警车撞飞时设定)
    wobblePhase: Math.random() * Math.PI * 2,
    dead: false,
    pass: false, // 碰撞后穿行标记: 完全离开碰撞范围前不再结算
    dying: false, // 死亡倒下动画
    dieT: 0,
  });
}

function updateEnemies(dt) {
  /* 定时生成 */
  enemyTimer -= dt;
  if (!game.over && enemyTimer <= 0 && enemies.length < ENEMY_MAX && assets.enemy) {
    spawnEnemy();
    enemyTimer = 1.8 + Math.random() * 2.2;
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    /* 屏幕速度 = 场景速度 - 敌方世界速度: 慢者向后滑, 快者向前超 */
    e.y += (game.speed - e.speed + e.kby) * dt; // 含撞击弹开冲量
    if (!e.dying) {
      /* 轻微左右游走, 保持路内 */
      e.x += (Math.sin(game.time * 1.4 + e.wobblePhase) * 42 + e.kbx) * dt;
      /* 施工路段: 敌方骑手避开占用车道, 玩家不受限 */
      if (zone) {
        const zy0 = zoneScreenY(zone.worldStart);
        const zy1 = zoneScreenY(zone.worldEnd);
        const mid = ROAD.left + ROAD.width / 2;
        if (e.y > zy1 - 10 && e.y < zy0 + 10) {
          if (zone.side === 0 && e.x < mid) {
            e.x += 150 * dt; // 渐渐靠向开放半区
          } else if (zone.side === 1 && e.x > mid) {
            e.x -= 150 * dt;
          }
        }
      }
      e.x = clamp(e.x, ROAD.left + 34, ROAD.left + ROAD.width - 34);
    }
    /* 死亡动画期间(被撞飞)弹开冲量衰减更慢, 让敌方飞得更远 */
    const kbDecay = e.dying ? 2 : 4;
    e.kbx *= Math.max(0, 1 - dt * kbDecay);
    e.kby *= Math.max(0, 1 - dt * kbDecay);
    e.hitCd = Math.max(0, e.hitCd - dt);
    e.flash = Math.max(0, e.flash - dt);
    if (e.dying) {
      /* 倒下/被撞飞动画: 期间保留在场上, 弹开冲量继续作用 */
      e.x += e.kbx * dt;
      e.dieT += dt;
      if (e.dieT >= ENEMY_DIE_TIME) enemies.splice(i, 1);
      continue;
    }
    if (e.dead || e.y > H + 130 || e.y < -130) enemies.splice(i, 1);
  }
}

function damageEnemy(e, d) {
  if (e.hitCd > 0) return;
  e.hp = Math.max(0, e.hp - d);
  e.hitCd = ENEMY_HIT_CD;
  e.flash = 0.3;
  if (e.hp <= 0) {
    e.dead = true;
    e.dying = true; // 死亡动画(放大淡出)
    e.dieT = 0;
    spawnBoom(e.x, e.y);
    dropFood(e.x, e.y); // 掉落若干外卖
  }
}

/* 撞飞效果: 死亡后向前上方翻滚飞出(被警车撞飞 / 被玩家撞死共用) */
function launchEnemy(e, fromX) {
  e.speed = 0; // 撞飞后不再按自身速度行驶, 轨迹完全由弹开冲量决定
  e.spin = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5);
  e.kbx = (e.x >= fromX ? 1 : -1) * (260 + Math.random() * 160);
  e.kby = -(420 + Math.random() * 220); // 向前上方飞出
  addFloatText(e.x, e.y - e.height / 2, '撞飞!', '#ff9d5c');
}

/* ---- 敌方骑手绘制 ---- */
function drawEnemies() {
  if (!assets.enemy) return;
  for (const e of enemies) {
    const wobble = Math.sin(game.time * 1.4 + e.wobblePhase);
    ctx.save();
    if (e.dying) {
      /* 死亡: 放大 + 淡出模拟被撞飞(被警车撞飞时附加翻滚与弹开位移) */
      const t = Math.min(1, e.dieT / ENEMY_DIE_TIME);
      const k = t * t; // 加速曲线, 开头变化更明显
      ctx.translate(e.x, e.y);
      if (e.spin) ctx.rotate(e.spin * e.dieT); // 被警车撞飞时翻滚旋转
      ctx.scale(1 + 0.6 * k, 1 + 0.6 * k); // 放大到 1.6 倍
      ctx.globalAlpha = 1 - k; // 淡出
      ctx.drawImage(IMG.enemy, -e.width / 2, -e.height / 2, e.width, e.height);
    } else {
      ctx.translate(e.x, e.y + Math.sin(game.time * 20 + e.wobblePhase) * 1.5);
      ctx.rotate(wobble * 0.08);
      /* 阴影 */
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, e.height * 0.08, e.width * 0.45, e.height * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(IMG.enemy, -e.width / 2, -e.height / 2, e.width, e.height);
      /* 受击白闪: 叠加提亮, 不再画红框 */
      if (e.flash > 0) {
        ctx.globalAlpha = Math.min(0.8, e.flash * 2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(IMG.enemy, -e.width / 2, -e.height / 2, e.width, e.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    /* 头顶血条(倒下时不显示) */
    if (!e.dying) drawBar(e.x, e.y - e.height / 2 - 10, e.hp / e.maxHp, 34, 4);
  }
}
