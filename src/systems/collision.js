'use strict';

/* 玩家与敌骑手碰撞检测 */

/* global player, enemies, game, DMG_SIDE, DMG_FRONT, DMG_REAR, WEAPONS, slashFX, damagePlayer, damageEnemy, spawnBoom, consumeDagger, vehicleDef, contentSize, DASH_DEALT_MUL, SFX */

function collide() {
  /* 用可见内容尺寸(剔除透明留白)作为碰撞盒 */
  const pcs = contentSize(player.vehicle);
  const pw = pcs.w * 0.9;
  const ph = pcs.h * 0.75;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const rx = (pw + e.cw * 0.9) / 2;
    const ry = (ph + e.ch * 0.75) / 2;
    if (Math.abs(dx) >= rx || Math.abs(dy) >= ry) {
      /* 完全脱离碰撞范围 → 解除穿行状态 */
      e.pass = false;
      continue;
    }
    /* 已经撞过一次、正在穿行 → 不再结算(防止慢速敌人被推开力卡在玩家身边反复扣血) */
    if (e.pass) continue;

    const overlapX = rx - Math.abs(dx);
    const overlapY = ry - Math.abs(dy);
    /* 垂直重叠更多 = 并排 → 侧面相撞; 否则前后相撞 */
    const isSide = overlapY > overlapX;
    /* 世界前方 = 屏幕上方(y 更小) */
    const playerFront = player.y < e.y;
    let dmgP, dmgE;
    if (isSide) {
      dmgP = DMG_SIDE;
      dmgE = DMG_SIDE;
    } else if (playerFront) {
      dmgP = DMG_FRONT;
      dmgE = DMG_REAR;
    } else {
      dmgP = DMG_REAR;
      dmgE = DMG_FRONT;
    }

    /* 沿重叠较小的轴推开双方: 位置分离 + 玩家撞击弹开冲量 */
    if (overlapX < overlapY) {
      const push = overlapX / 2 + 8;
      const dir = dx >= 0 ? 1 : -1;
      player.x -= dir * push;
      e.x += dir * push;
      player.kbx = -dir * 260; // 玩家被弹开(反方向滑出一小段)
      e.kbx = dir * 300; // 敌方横向被撞开
    } else {
      const push = overlapY / 2 + 8;
      const dir = dy >= 0 ? 1 : -1;
      player.y -= dir * push;
      e.y += dir * push;
      player.kby = -dir * 380; // 前后相撞弹开力度更大
      e.kby = dir * 340; // 被玩家撞上的敌方飞得更远
    }

    /* 匕首: 撞击时附加伤害并消耗一把 */
    let extra = 0;
    if (player.weapons.dagger) {
      extra = WEAPONS.dagger.extraDmg;
      const aim = Math.atan2(e.x - player.x, -(e.y - player.y));
      slashFX.push({ x: player.x, y: player.y, aim, life: 0.18, maxLife: 0.18 });
      consumeDagger();
    }
    /* 载具撞击敌人伤害倍率(如步行减半); 冲刺期间大幅提升 */
    let dmgMul = vehicleDef().damageMul;
    if (player.buff.dash > 0) dmgMul *= DASH_DEALT_MUL;
    if (dmgMul !== 1) dmgE = Math.round(dmgE * dmgMul);
    /* 敌方匕首: 撞击时对玩家附加伤害(与玩家一致) */
    const extraE = e.weapons.includes('dagger') ? WEAPONS.dagger.extraDmg : 0;
    damagePlayer(dmgP + extraE);
    damageEnemy(e, dmgE + extra, true); // true: 撞击伤害(触发「焖子」吃敌人效果)
    if (player.buff.brave > 0) SFX.voice('weak'); // 我超勇的: 撞敌喊「弱欸」
    spawnBoom((player.x + e.x) / 2, (player.y + e.y) / 2);
    game.shake = 0.35;
    e.pass = true; // 本次接触只结算一次, 之后穿行滑过
  }
}
