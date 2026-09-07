'use strict';

/* 游戏流程: 结束与重新开始 */

/* global game, player, W, H, BASE_SPEED, enemies, boomParts, smokeParts, pickups, floatTexts, START_FOOD, CUSTOMER_DELAY_FIRST_M, PX_PER_M, SHOP_DELAY_FIRST_M, REST_DELAY_FIRST_M, ZONE_DELAY_FIRST_M, zoneSigns, police, bullets, slashFX, spawnBoom, spawnSmokeAt, customer:writable, nextCustomerDist:writable, shop:writable, nextShopDist:writable, restaurant:writable, nextRestDist:writable, zone:writable, nextZoneDist:writable, crimeCool:writable, policeTimer:writable, spikeStrip:writable, spikeTimer:writable, enemyTimer:writable */

function gameOver() {
  if (!game.overReason) game.overReason = 'hp';
  game.over = true;
  game.shake = 0.6;
  /* 玩家爆炸: 三连爆 + 烟雾 */
  for (let i = 0; i < 3; i++) {
    spawnBoom(player.x + (Math.random() - 0.5) * 40, player.y + (Math.random() - 0.5) * 40);
    spawnSmokeAt(
      player.x + (Math.random() - 0.5) * 30,
      player.y + (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 140,
      game.speed * (0.4 + Math.random() * 0.3),
    );
  }
}

/* 重新开始: 玩家回到中心 */
function resetGame() {
  game.over = false;
  game.overReason = '';
  game.distance = 0;
  game.totalDist = 0;
  game.speed = BASE_SPEED;
  game.shake = 0;
  player.x = W / 2;
  player.y = H * 0.66;
  player.vx = 0;
  player.vy = 0;
  player.kbx = 0;
  player.kby = 0;
  player.tilt = 0;
  player.hp = player.maxHp;
  player.hitCd = 1.5; // 重生短暂无敌
  player.flash = 0;
  enemies.length = 0;
  boomParts.length = 0;
  smokeParts.length = 0;
  pickups.length = 0;
  floatTexts.length = 0;
  player.food = START_FOOD;
  player.money = 0;
  player.healFlash = 0;
  customer = null;
  nextCustomerDist = CUSTOMER_DELAY_FIRST_M * PX_PER_M;
  shop = null;
  nextShopDist = SHOP_DELAY_FIRST_M * PX_PER_M;
  restaurant = null;
  nextRestDist = REST_DELAY_FIRST_M * PX_PER_M;
  zone = null;
  zoneSigns.length = 0;
  nextZoneDist = ZONE_DELAY_FIRST_M * PX_PER_M;
  player.crime = 0;
  player.crimeLvl = 1;
  crimeCool = 0;
  player.slowT = 0;
  police.length = 0;
  policeTimer = 0;
  spikeStrip = null;
  spikeTimer = 0;
  player.weapons = {};
  bullets.length = 0;
  slashFX.length = 0;
  enemyTimer = 1.2;
}
