'use strict';

/* =====================================================================
 *  你的胆子真的是肥嘟嘟的  (demo v1.3)
 *  ------------------------------------------------------------------
 *  v1.3: 玩家撞死敌人同警车撞飞一样翻滚飞出; 犯罪条改为攒满一槽升一级(太刀气刃槽式)
 *  v1.2: 拆分 game.js 到 src/ 分层目录(core/entities/systems/fx/ui); 骑手死亡动画改为放大淡出(模拟撞飞)
 *  v1.1: 警车可撞飞敌方骑手(秒杀); 修正敌方倒下动画未生效的问题
 *  v1.0: 犯罪等级系统(警车追击/拦车钉扎胎减速)
 *  v0.9: 施工路段(黄色斜纹/警告牌/敌方避让/犯罪条)
 *  v0.8: 饭店(花钱买外卖)
 *  v0.7: 装备系统(匕首/手枪/步枪/盾牌) + 水泥区店铺(色块占位)
 *  v0.6: 送餐客户系统(路边客户/距离提示/达标赚钱/缺货罚款/破产死亡); 客户图集逐帧包围盒切割
 *  v0.5: HUD 重排(左上血量/外卖, 右上速度); 敌方掉落外卖可拾取回血; 敌方倒下动画
 *  v0.4: 玩家/敌方血条; 敌方骑手(前方被超越 / 后方超车两种); 碰撞伤害与特效
 *  v0.3: 取消点击移动; 电脑 WASD/方向键, 手机屏幕下半区滑动(虚拟摇杆)
 *  v0.2: 直接使用贴图 assets/贴图/道路.png(纵向无缝循环)、骑手.png
 *  v0.1: 循环道路场景 + 玩家外卖员(雷霆战机式控制)
 *  ------------------------------------------------------------------
 *  下一阶段 TODO: 难度递增(场景加速)、店铺正式贴图
 * ===================================================================== */

/* 主循环: update/render + 道路贴图滚动 */

/* global game, player, input, BASE_SPEED, SPEED_MIN, SPEED_MAX, clamp, BOUNDS, updateSmoke, updateEnemies, updateEnemyBullets, collide, updateWeapon, updateBoom, updatePickups, updateCustomer, updateShop, updateRestaurant, updateZone, updateCrime, updatePolice, updateSpike, spawnSmokeAt, updateFloatTexts, ctx, dpr, W, H, LOOP, JOY_RADIUS, drawZone, drawSpike, drawSmoke, drawCustomer, drawShop, drawRestaurant, drawEnemies, drawEnemyBullets, drawPolice, drawPickups, drawBullets, drawPlayer, drawWeapon, drawBoom, drawJoy, drawHUD, drawFloatTexts, drawGameOver, drawMenu, ready, assets, IMG, TILE_H */

/* ==================== 更新 ==================== */
function update(dt) {
  game.time += dt;

  if (!game.started) {
    /* 开始界面: 游戏完全暂停 */
    return;
  }

  if (game.over) {
    /* 游戏结束: 场景冻结, 只更新特效 */
    updateSmoke(dt);
    updateBoom(dt);
    updateFloatTexts(dt);
    game.shake = Math.max(0, game.shake - dt);
    player.flash = Math.max(0, player.flash - dt);
    player.healFlash = Math.max(0, player.healFlash - dt);
    return;
  }

  /* 场景前进速度 = 默认速度 + 玩家前后移动分量(向上=向前=更快), 扎胎时整体减速 */
  if (player.slowT > 0) player.slowT -= dt;
  const slowMul = player.slowT > 0 ? 0.55 : 1;
  /* 扎胎后刹车更灵: 后退(减速)分量放大, 最低速度更低 */
  const brake = player.slowT > 0 && player.vy > 0 ? 2.2 : 1;
  const effMin = player.slowT > 0 ? 32 : SPEED_MIN;
  const targetSpeed = clamp((BASE_SPEED - player.vy * brake) * slowMul, effMin, SPEED_MAX);
  game.speed += (targetSpeed - game.speed) * Math.min(1, dt * 3); // 平滑过渡

  /* 场景按当前速度向前滚动(无缝循环) */
  game.distance = (game.distance + game.speed * dt) % LOOP;
  game.totalDist += game.speed * dt;

  /* 玩家移动: 键盘(WASD/方向键)或手机虚拟摇杆 */
  const k = input.keys;
  let mx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
  let my = (k.down ? 1 : 0) - (k.up ? 1 : 0);
  const joy = input.joy;
  if (joy) {
    const d = Math.hypot(joy.dx, joy.dy);
    if (d > 8) {
      /* 摇杆偏移越大速度越快, 推满 = 键盘全速 */
      const t = Math.min(1, d / JOY_RADIUS);
      mx = (joy.dx / d) * t;
      my = (joy.dy / d) * t;
    } else {
      mx = 0;
      my = 0;
    }
  }
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const s = len * player.MOVE_SPEED * slowMul; // 扎胎时移动也变慢
    player.vx = (mx / len) * s;
    player.vy = (my / len) * s;
  } else {
    player.vx = 0;
    player.vy = 0;
  }
  /* 撞击弹开冲量叠加在输入移动之上, 随时间衰减 */
  player.x += (player.vx + player.kbx) * dt;
  player.y += (player.vy + player.kby) * dt;
  player.kbx *= Math.max(0, 1 - dt * 6);
  player.kby *= Math.max(0, 1 - dt * 6);
  player.x = clamp(player.x, BOUNDS.x0, BOUNDS.x1);
  player.y = clamp(player.y, BOUNDS.y0, BOUNDS.y1);

  /* 侧倾动画 */
  const targetTilt = clamp(player.vx * 0.00045, -0.14, 0.14);
  player.tilt += (targetTilt - player.tilt) * Math.min(1, dt * 12);

  /* 烟雾特效(随速度增多) */
  updateSmoke(dt);

  /* 敌方骑手 / 碰撞 / 特效 */
  updateEnemies(dt);
  updateEnemyBullets(dt);
  collide();
  updateWeapon(dt);
  updateBoom(dt);
  updatePickups(dt);
  updateCustomer(dt);
  updateShop(dt);
  updateRestaurant(dt);
  updateZone(dt);
  updateCrime(dt);
  updatePolice(dt);
  updateSpike(dt);
  /* 扎胎时车轮冒烟 */
  if (player.slowT > 0 && Math.random() < dt * 10) {
    spawnSmokeAt(
      player.x + (Math.random() - 0.5) * 14,
      player.y + player.height * 0.42,
      (Math.random() - 0.5) * 60,
      game.speed * 0.6 + 20,
    );
  }
  updateFloatTexts(dt);
  game.shake = Math.max(0, game.shake - dt);
  player.hitCd = Math.max(0, player.hitCd - dt);
  player.flash = Math.max(0, player.flash - dt);
  player.healFlash = Math.max(0, player.healFlash - dt);
}

/* ==================== 绘制 ==================== */
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  /* 受击屏幕震动 */
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 12 * game.shake, (Math.random() - 0.5) * 12 * game.shake);
  }
  ctx.fillStyle = '#171a1d';
  ctx.fillRect(-8, -8, W + 16, H + 16);

  drawRoadTexture(); // 道路贴图纵向无缝循环
  drawZone(); // 施工路段(黄色斜纹/警告牌)
  drawSpike(); // 拦车钉
  drawSmoke(); // 烟雾(画在骑手下方)
  drawCustomer(); // 路边客户
  drawShop(); // 水泥区店铺
  drawRestaurant(); // 水泥区饭店
  drawEnemies(); // 敌方骑手
  drawEnemyBullets(); // 敌方子弹
  drawPolice(); // 警车
  drawPickups(); // 外卖掉落
  drawBullets(); // 子弹
  drawPlayer(); // 玩家外卖员
  drawWeapon(); // 装备(枪械/护盾/挥砍)
  drawBoom(); // 碰撞特效
  drawJoy(); // 手机虚拟摇杆
  if (game.started) drawHUD(); // HUD(血量/外卖/速度, 开始界面不显示)
  if (player.flash > 0) {
    /* 受击红色蒙板 */
    ctx.fillStyle = 'rgba(255,40,40,' + Math.min(0.4, player.flash) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (player.healFlash > 0) {
    /* 回血绿色蒙板 */
    ctx.fillStyle = 'rgba(74,222,128,' + Math.min(0.4, player.healFlash) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  drawFloatTexts(); // 漂浮文字
  drawGameOver(); // 结束界面
  drawMenu(); // 开始界面(未开始时盖在最上层)

  if (!ready) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c7cdd4';
    ctx.font = "16px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('资源加载中…', W / 2, H / 2);
  }
}

/* ---- 道路贴图: 纵向无缝循环滚动 ---- */
function drawRoadTexture() {
  if (!assets.road) return; // 未加载完, 先留空
  const ih = IMG.road.naturalHeight,
    iw = IMG.road.naturalWidth;
  const s = TILE_H / ih; // 贴图高缩放到 1120, 宽≈480 几乎铺满画布
  const tileW = iw * s;
  const x = (W - tileW) / 2;
  const off = game.distance % TILE_H; // LOOP 是 TILE_H 整数倍, 无缝衔接
  for (let y = -TILE_H + off; y < H; y += TILE_H) {
    ctx.drawImage(IMG.road, x, y, tileW, TILE_H);
  }
}

/* ==================== 主循环 ==================== */
let last = 0;
function frame(t) {
  const dt = Math.min((t - last) / 1000, 1 / 30); // 限制最大帧间隔, 防止切后台后跳变
  last = t;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
