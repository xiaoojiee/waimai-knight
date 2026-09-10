'use strict';

/* 水泥区店铺(卖装备)与饭店(卖外卖) */

/* global game, assets, PX_PER_M, SHOP_DELAY_FIRST_M, SHOP_INTERVAL_MIN_M, SHOP_INTERVAL_MAX_M, WEAPONS, SHOP_FRAMES, player, addFloatText, REST_DELAY_FIRST_M, REST_INTERVAL_MIN_M, REST_INTERVAL_MAX_M, FOOD_BUY_PRICE, FOOD_BUNDLE, ctx, fillRR, H, IMG, CEMENT_X, W, difficulty, makeFood, damagePlayer, spawnBoom, SHOP_RAM_DMG */

let shop = null; // 当前店铺 { type, x, y, fly, vx, vy, rot, spin, life }
let nextShopDist = SHOP_DELAY_FIRST_M * PX_PER_M; // 下一个店铺出现的距离阈值(px)
const SHOP_HIT_R = 70;
const SHOP_SIZE = 160;

function hitBuilding(b) {
  if (!b || b.fly) return false;
  const dx = b.x - player.x;
  const dy = b.y - player.y;
  return dx * dx + dy * dy < SHOP_HIT_R * SHOP_HIT_R;
}
function flyBuilding(b) {
  const dx = b.x - player.x;
  const dy = b.y - player.y;
  const d = Math.hypot(dx, dy) || 1;
  b.fly = true;
  b.vx = (dx / d) * 320 + (Math.random() - 0.5) * 90;
  b.vy = -240 - game.speed * 0.35;
  b.spin = (Math.random() < 0.5 ? 1 : -1) * (6 + Math.random() * 6);
  b.rot = 0;
  b.life = 0;
  player.kbx -= (dx / d) * 240;
  player.kby -= (dy / d) * 160;
  game.shake = 0.28;
  spawnBoom((player.x + b.x) / 2, (player.y + b.y) / 2);
}
function updateFly(b, dt) {
  b.life += dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.vy += 540 * dt;
  b.rot += b.spin * dt;
  return b.life > 0.95;
}

function spawnShop() {
  const types = ['dagger', 'pistol', 'rifle', 'shield'];
  shop = {
    type: types[Math.floor(Math.random() * types.length)],
    x: CEMENT_X + (W - CEMENT_X) / 2,
    y: -60,
    fly: false,
    vx: 0,
    vy: 0,
    rot: 0,
    spin: 0,
    life: 0,
  };
}
function scheduleShop() {
  /* 难度越高店铺出现越频繁(间隔最多缩短 65%) */
  const d = difficulty();
  const m =
    (SHOP_INTERVAL_MIN_M + Math.random() * (SHOP_INTERVAL_MAX_M - SHOP_INTERVAL_MIN_M)) *
    (1 - d * 0.65);
  nextShopDist = game.totalDist + m * PX_PER_M;
}
function updateShop(dt) {
  if (!shop) {
    if (!game.over && assets.item && game.totalDist >= nextShopDist) {
      /* 避免与饭店刷在一起 */
      if (restaurant && restaurant.y < 160) {
        nextShopDist += 60 * PX_PER_M;
      } else {
        spawnShop();
      }
    }
    return;
  }
  if (shop.fly) {
    if (updateFly(shop, dt)) {
      shop = null;
      scheduleShop();
    }
    return;
  }
  shop.y += game.speed * dt;
  if (hitBuilding(shop)) ramShop();
  if (shop && !shop.fly && shop.y > H + 100) {
    shop = null;
    scheduleShop();
  }
}
function ramShop() {
  const def = WEAPONS[shop.type];
  if (player.money >= def.price) {
    player.money -= def.price;
    if (shop.type === 'pistol' || shop.type === 'rifle') {
      delete player.weapons.pistol;
      delete player.weapons.rifle;
    }
    player.weapons[shop.type] = {
      ammo: def.uses ?? def.ammo ?? def.charges,
      cd: 0,
    };
    addFloatText(player.x, player.y - player.height / 2, def.label + ' -$' + def.price, '#ffd23f');
  } else {
    damagePlayer(SHOP_RAM_DMG);
    addFloatText(player.x, player.y - player.height / 2, '钱不够! 撞毁', '#ff6b6b');
  }
  flyBuilding(shop);
}

/* ---- 店铺绘制 ---- */
function drawShop() {
  if (!shop) return;
  const def = WEAPONS[shop.type];
  const s = SHOP_SIZE;
  ctx.save();
  ctx.translate(shop.x, shop.y);
  if (shop.fly) {
    ctx.rotate(shop.rot);
    ctx.globalAlpha = Math.max(0, 1 - shop.life / 0.95);
  }
  if (assets.shop) {
    /* 店铺图集 3列×2行 */
    const fw = IMG.shop.naturalWidth / 3;
    const fh = IMG.shop.naturalHeight / 2;
    const f = SHOP_FRAMES[shop.type];
    ctx.drawImage(IMG.shop, f[0] * fw + 2, f[1] * fh + 2, fw - 4, fh - 4, -s / 2, -s / 2, s, s);
  } else {
    fillRR(-s / 2, -s / 2, s, s, 10, def.color);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(def.label, 0, 6);
  }
  if (!shop.fly) {
    fillRR(-26, s / 2 - 4, 52, 18, 9, 'rgba(10,12,15,0.75)');
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.font = "bold 12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('$' + def.price, 0, s / 2 + 9);
  }
  ctx.restore();
}

let restaurant = null; // 当前饭店 { x, y, fly, vx, vy, rot, spin, life }
let nextRestDist = REST_DELAY_FIRST_M * PX_PER_M; // 下一个饭店出现的距离阈值(px)

function spawnRestaurant() {
  restaurant = {
    x: CEMENT_X + (W - CEMENT_X) / 2,
    y: -60,
    fly: false,
    vx: 0,
    vy: 0,
    rot: 0,
    spin: 0,
    life: 0,
  };
}
function scheduleRestaurant() {
  /* 难度越高饭店出现越频繁(间隔最多缩短 60%) */
  const d = difficulty();
  const m =
    (REST_INTERVAL_MIN_M + Math.random() * (REST_INTERVAL_MAX_M - REST_INTERVAL_MIN_M)) *
    (1 - d * 0.6);
  nextRestDist = game.totalDist + m * PX_PER_M;
}
function updateRestaurant(dt) {
  if (!restaurant) {
    if (!game.over && game.totalDist >= nextRestDist) {
      /* 避免与武器店铺刷在一起 */
      if (shop && shop.y < 160) {
        nextRestDist += 60 * PX_PER_M;
      } else {
        spawnRestaurant();
      }
    }
    return;
  }
  if (restaurant.fly) {
    if (updateFly(restaurant, dt)) {
      restaurant = null;
      scheduleRestaurant();
    }
    return;
  }
  restaurant.y += game.speed * dt;
  if (hitBuilding(restaurant)) ramRestaurant();
  if (restaurant && !restaurant.fly && restaurant.y > H + 100) {
    restaurant = null;
    scheduleRestaurant();
  }
}
function ramRestaurant() {
  const cost = FOOD_BUY_PRICE * FOOD_BUNDLE;
  if (player.money >= cost) {
    player.money -= cost;
    for (let i = 0; i < FOOD_BUNDLE && player.food.length < 99; i++) player.food.push(makeFood());
    addFloatText(
      player.x,
      player.y - player.height / 2,
      '+' + FOOD_BUNDLE + ' 外卖 -$' + cost,
      '#ffd23f',
    );
  } else {
    damagePlayer(SHOP_RAM_DMG);
    addFloatText(player.x, player.y - player.height / 2, '钱不够! 撞毁', '#ff6b6b');
  }
  flyBuilding(restaurant);
}
function drawRestaurant() {
  if (!restaurant) return;
  const s = SHOP_SIZE;
  ctx.save();
  ctx.translate(restaurant.x, restaurant.y);
  if (restaurant.fly) {
    ctx.rotate(restaurant.rot);
    ctx.globalAlpha = Math.max(0, 1 - restaurant.life / 0.95);
  }
  if (assets.shop) {
    /* 店铺图集 3列×2行, 饭店在 0-0 */
    const fw = IMG.shop.naturalWidth / 3;
    const fh = IMG.shop.naturalHeight / 2;
    ctx.drawImage(IMG.shop, 2, 2, fw - 4, fh - 4, -s / 2, -s / 2, s, s);
  } else {
    fillRR(-s / 2, -s / 2, s, s, 10, '#e67e22');
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('饭店', 0, 6);
  }
  if (!restaurant.fly) {
    fillRR(-30, s / 2 - 4, 60, 18, 9, 'rgba(10,12,15,0.75)');
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.font = "bold 12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(FOOD_BUNDLE + '个 $' + FOOD_BUY_PRICE * FOOD_BUNDLE, 0, s / 2 + 9);
  }
  ctx.restore();
}
