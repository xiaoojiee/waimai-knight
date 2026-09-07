'use strict';

/* 玩家与敌骑手碰撞检测 */

/* global player, enemies, game, DMG_SIDE, DMG_FRONT, DMG_REAR, WEAPONS, slashFX, damagePlayer, damageEnemy, spawnBoom, launchEnemy */

function collide() {
  const pw = player.width * 0.6;
  const ph = player.height * 0.55;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const rx = (pw + e.width * 0.7) / 2;
    const ry = (ph + e.height * 0.7) / 2;
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

    /* 匕首: 撞击时附加伤害并挥向目标 */
    let extra = 0;
    if (player.weapons.dagger) {
      extra = WEAPONS.dagger.extraDmg;
      const aim = Math.atan2(e.x - player.x, -(e.y - player.y));
      slashFX.push({ x: player.x, y: player.y, aim, life: 0.18, maxLife: 0.18 });
      player.weapons.dagger.ammo--;
      if (player.weapons.dagger.ammo <= 0) delete player.weapons.dagger; // 20 次用完消失
    }
    damagePlayer(dmgP);
    damageEnemy(e, dmgE + extra);
    if (e.dying) launchEnemy(e, player.x); // 被玩家撞死: 与警车撞飞一致, 翻滚飞出
    spawnBoom((player.x + e.x) / 2, (player.y + e.y) / 2);
    game.shake = 0.35;
    e.pass = true; // 本次接触只结算一次, 之后穿行滑过
  }
}
