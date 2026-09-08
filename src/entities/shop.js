'use strict';

/* 水泥区店铺(卖装备)与饭店(卖外卖) */

/* global game, assets, PX_PER_M, SHOP_DELAY_FIRST_M, SHOP_INTERVAL_MIN_M, SHOP_INTERVAL_MAX_M, WEAPONS, SHOP_FRAMES, player, BOUNDS, input, JOY_RADIUS, addFloatText, REST_DELAY_FIRST_M, REST_INTERVAL_MIN_M, REST_INTERVAL_MAX_M, FOOD_BUY_PRICE, FOOD_BUNDLE, ctx, fillRR, H, IMG, CEMENT_X, W, ROAD, rr, difficulty */

let shop = null; // 当前店铺 { type, x, y, buyCd }
let nextShopDist = SHOP_DELAY_FIRST_M * PX_PER_M; // 下一个店铺出现的距离阈值(px)

function spawnShop() {
  const types = ['dagger', 'pistol', 'rifle', 'shield'];
  shop = {
    type: types[Math.floor(Math.random() * types.length)],
    x: CEMENT_X + (W - CEMENT_X) / 2, // 水泥区正中间, 店铺占满水泥地面
    y: -60,
    buyCd: 0,
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
  shop.y += game.speed * dt;
  if (shop.buyCd > 0) shop.buyCd -= dt;
  /* 玩家靠到水泥区方向且与店铺齐平 → 购买 */
  const pressingRight = input.keys.right || (input.joy && input.joy.dx > JOY_RADIUS * 0.5);
  if (pressingRight && player.x >= BOUNDS.x1 - 6 && Math.abs(shop.y - player.y) < 90) {
    buyWeapon();
    return;
  }
  if (shop.y > H + 100) {
    shop = null;
    scheduleShop();
  }
}
function buyWeapon() {
  const def = WEAPONS[shop.type];
  if (player.money < def.price) {
    if (shop.buyCd <= 0) {
      shop.buyCd = 0.8; // 提示节流
      addFloatText(player.x, player.y - player.height / 2, '钱不够!', '#ff6b6b');
    }
    return;
  }
  player.money -= def.price;
  /* 枪械互斥: 手枪/步枪只能同时存在一种; 匕首/盾牌可与其共存 */
  if (shop.type === 'pistol' || shop.type === 'rifle') {
    delete player.weapons.pistol;
    delete player.weapons.rifle;
  }
  player.weapons[shop.type] = {
    ammo: def.uses ?? def.ammo ?? def.charges,
    cd: 0,
  };
  addFloatText(player.x, player.y - player.height / 2, def.label + ' -$' + def.price, '#ffd23f');
  shop = null;
  scheduleShop();
}

/* 购买区提示: 绿色蒙板覆盖在店铺旁的路边窄条上 */
function drawBuyZone(y) {
  const zw = 56; // 路边窄条(略加宽)
  const zh = 180; // 与购买触发范围(±90)一致
  const zx = ROAD.left + ROAD.width - zw + 26; // 右移压进水泥区, 弥补店铺贴图的透明余量, 与门面相连
  const zy = y - zh / 2;
  ctx.fillStyle = 'rgba(74,222,128,' + (0.15 + 0.06 * Math.sin(game.time * 5)) + ')';
  fillRR(zx, zy, zw, zh, 10, ctx.fillStyle);
  ctx.strokeStyle = 'rgba(74,222,128,0.45)';
  ctx.lineWidth = 2;
  rr(zx, zy, zw, zh, 10);
  ctx.stroke();
}

/* ---- 店铺绘制 ---- */
function drawShop() {
  if (!shop) return;
  const def = WEAPONS[shop.type];
  const s = 160; // 占满右侧水泥地面
  if (assets.shop) {
    /* 店铺贴图(3×3 图集对应帧) */
    const fw = IMG.shop.naturalWidth / 3;
    const fh = IMG.shop.naturalHeight / 3;
    const f = SHOP_FRAMES[shop.type];
    ctx.drawImage(IMG.shop, f[0] * fw + 2, f[1] * fh + 2, fw - 4, fh - 4, shop.x - s / 2, shop.y - s / 2, s, s);
  } else {
    /* 回退: 色块 + 文字 */
    fillRR(shop.x - s / 2, shop.y - s / 2, s, s, 10, def.color);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(def.label, shop.x, shop.y + 6);
  }
  /* 价格牌 */
  fillRR(shop.x - 26, shop.y + s / 2 - 4, 52, 18, 9, 'rgba(10,12,15,0.75)');
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'center';
  ctx.font = "bold 12px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText('$' + def.price, shop.x, shop.y + s / 2 + 9);
  /* 靠近提示 */
  if (Math.abs(shop.y - player.y) < 90 && player.x >= BOUNDS.x1 - 40) {
    ctx.fillStyle = 'rgba(255,213,63,' + (0.6 + 0.4 * Math.sin(game.time * 6)) + ')';
    ctx.font = "bold 13px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('→ 靠右购买', shop.x, shop.y - s / 2 - 10);
  }
  /* 绿色购买区蒙板(覆盖在店铺旁的路面上) */
  drawBuyZone(shop.y);
}

let restaurant = null; // 当前饭店 { x, y, buyCd }
let nextRestDist = REST_DELAY_FIRST_M * PX_PER_M; // 下一个饭店出现的距离阈值(px)

function spawnRestaurant() {
  restaurant = {
    x: CEMENT_X + (W - CEMENT_X) / 2, // 水泥区正中间, 占满水泥地面
    y: -60,
    buyCd: 0,
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
  restaurant.y += game.speed * dt;
  if (restaurant.buyCd > 0) restaurant.buyCd -= dt;
  /* 玩家靠到水泥区方向且与饭店齐平 → 花钱买外卖(按住可连续买) */
  const pressingRight = input.keys.right || (input.joy && input.joy.dx > JOY_RADIUS * 0.5);
  if (pressingRight && player.x >= BOUNDS.x1 - 6 && Math.abs(restaurant.y - player.y) < 90) {
    buyFood();
    return;
  }
  if (restaurant.y > H + 100) {
    restaurant = null;
    scheduleRestaurant();
  }
}
function buyFood() {
  if (restaurant.buyCd > 0) return;
  const cost = FOOD_BUY_PRICE * FOOD_BUNDLE; // 一次买 5 个
  if (player.money < cost) {
    restaurant.buyCd = 0.8; // 提示节流
    addFloatText(player.x, player.y - player.height / 2, '钱不够!', '#ff6b6b');
    return;
  }
  player.money -= cost;
  player.food = Math.min(99, player.food + FOOD_BUNDLE);
  addFloatText(
    player.x,
    player.y - player.height / 2,
    '+' + FOOD_BUNDLE + ' 外卖 -$' + cost,
    '#ffd23f',
  );
  restaurant = null; // 一家饭店只能购买一次
  scheduleRestaurant();
}
function drawRestaurant() {
  if (!restaurant) return;
  const s = 160; // 占满右侧水泥地面
  if (assets.shop) {
    /* 饭店贴图(3×3 图集 0-0 帧) */
    const fw = IMG.shop.naturalWidth / 3;
    const fh = IMG.shop.naturalHeight / 3;
    ctx.drawImage(
      IMG.shop,
      2,
      2,
      fw - 4,
      fh - 4,
      restaurant.x - s / 2,
      restaurant.y - s / 2,
      s,
      s,
    );
  } else {
    /* 回退: 色块 + 文字 */
    fillRR(restaurant.x - s / 2, restaurant.y - s / 2, s, s, 10, '#e67e22');
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = "bold 18px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('饭店', restaurant.x, restaurant.y + 6);
  }
  /* 价格牌 */
  fillRR(restaurant.x - 30, restaurant.y + s / 2 - 4, 60, 18, 9, 'rgba(10,12,15,0.75)');
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'center';
  ctx.font = "bold 12px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(
    FOOD_BUNDLE + '个 $' + FOOD_BUY_PRICE * FOOD_BUNDLE,
    restaurant.x,
    restaurant.y + s / 2 + 9,
  );
  /* 靠近提示 */
  if (Math.abs(restaurant.y - player.y) < 90 && player.x >= BOUNDS.x1 - 40) {
    ctx.fillStyle = 'rgba(255,213,63,' + (0.6 + 0.4 * Math.sin(game.time * 6)) + ')';
    ctx.font = "bold 13px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('→ 靠右购买', restaurant.x, restaurant.y - s / 2 - 10);
  }
  /* 绿色购买区蒙板(覆盖在饭店旁的路面上) */
  drawBuyZone(restaurant.y);
}
