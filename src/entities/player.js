'use strict';

/* 玩家: 受击结算与绘制 */

/* global player, game, HIT_CD, addFloatText, gameOver, ctx, BASE_SPEED, IMG, assets */

function damagePlayer(d) {
  if (player.hitCd > 0 || game.over) return;
  /* 盾牌: 免疫撞击伤害(消耗次数) */
  if (player.weapons.shield) {
    player.weapons.shield.ammo--;
    player.hitCd = HIT_CD;
    player.flash = 0.15;
    addFloatText(player.x, player.y - player.height / 2, '格挡!', '#4da3ff');
    if (player.weapons.shield.ammo <= 0) delete player.weapons.shield; // 次数用完消失
    return;
  }
  player.hp = Math.max(0, player.hp - d);
  player.hitCd = HIT_CD;
  player.flash = 0.35;
  if (player.hp <= 0) gameOver();
}

/* ---- 玩家绘制: 骑手贴图 ---- */
function drawPlayer() {
  const p = player;
  ctx.save();
  const bob = Math.sin(game.time * 22) * 1.8 * (game.speed / BASE_SPEED); // 行驶颠簸(随速度)
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(p.tilt);

  /* 阴影 */
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, p.height * 0.08, p.width * 0.52, p.height * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  if (assets.rider) {
    ctx.drawImage(IMG.rider, -p.width / 2, -p.height / 2, p.width, p.height);
    /* 受击白闪: 叠加提亮, 不再画红框 */
    if (player.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, player.flash * 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(IMG.rider, -p.width / 2, -p.height / 2, p.width, p.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
