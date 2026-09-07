'use strict';

/* 施工路段(占用半边车道, 黄色斜纹提示) + 犯罪条 */

/* global game, PX_PER_M, ZONE_DELAY_FIRST_M, ZONE_INTERVAL_MIN_M, ZONE_INTERVAL_MAX_M, ZONE_LEN_MIN, ZONE_LEN_MAX, ZONE_ANCHOR_Y, H, ROAD, player, ctx, fillRR, rr, IMG, assets, clamp, CRIME_SPEED_LIMIT, CRIME_MAX_LVL, addFloatText */

let zone = null; // 当前施工路段 { side, worldStart, worldEnd }
let nextZoneDist = ZONE_DELAY_FIRST_M * PX_PER_M; // 下一个施工路段出现的距离阈值(px)
const zoneSigns = []; // 警告牌 { world, x, y, state: idle|flying, vx, vy, rot, spin, life, dead }
let crimeCool = 0; // 停止犯罪后的衰减冷却

/* 世界坐标 → 屏幕 y(玩家标称位置为锚点) */
function zoneScreenY(worldDist) {
  return ZONE_ANCHOR_Y - (worldDist - game.totalDist);
}
function spawnZone() {
  zone = {
    side: Math.random() < 0.5 ? 0 : 1, // 0 = 占用左半车道
    worldStart: game.totalDist + 2000, // 前方 100m 出现
    worldEnd: game.totalDist + 2000 + ZONE_LEN_MIN + Math.random() * (ZONE_LEN_MAX - ZONE_LEN_MIN),
  };
  zoneSigns.length = 0;
  /* 警告牌: 起始边一块 + 结束边一块, 立在维修路段(占用车道)的 x 轴中央 */
  const signX = zone.side === 0 ? ROAD.left + ROAD.width / 4 : ROAD.left + (ROAD.width * 3) / 4;
  zoneSigns.push({
    world: zone.worldStart,
    x: signX,
    state: 'idle',
    rot: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    life: 0,
    dead: false,
  });
  zoneSigns.push({
    world: zone.worldEnd,
    x: signX,
    state: 'idle',
    rot: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    life: 0,
    dead: false,
  });
}
function updateZone(dt) {
  if (!zone) {
    if (!game.over && game.totalDist >= nextZoneDist) spawnZone();
    return;
  }
  /* 完全离开玩家视野(远端也滚出屏幕底部) → 调度下一个 */
  if (zoneScreenY(zone.worldEnd) > H + 30) {
    zone = null;
    zoneSigns.length = 0;
    nextZoneDist =
      game.totalDist +
      (ZONE_INTERVAL_MIN_M + Math.random() * (ZONE_INTERVAL_MAX_M - ZONE_INTERVAL_MIN_M)) *
        PX_PER_M;
    return;
  }
  /* 警告牌: 跟随世界坐标; 玩家可撞飞 */
  for (const s of zoneSigns) {
    if (s.state === 'idle') {
      s.y = zoneScreenY(s.world);
      const dx = s.x - player.x;
      const dy = s.y - player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        /* 撞飞: 沿撞击方向弹开, 带旋转和重力 */
        s.state = 'flying';
        s.vx = (s.x - player.x) * 4 + (Math.random() - 0.5) * 120;
        s.vy = -160 - game.speed * 0.4;
        s.spin = (Math.random() - 0.5) * 14;
        s.life = 0;
        /* 玩家沿撞击反方向弹开一小段 */
        const d2 = Math.hypot(dx, dy) || 1;
        player.x -= (dx / d2) * 26;
        player.y -= (dy / d2) * 26;
        game.shake = 0.12;
      }
    } else {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 500 * dt; // 重力
      s.rot += s.spin * dt;
      if (s.life > 0.9) s.dead = true;
    }
  }
  for (let i = zoneSigns.length - 1; i >= 0; i--) {
    if (zoneSigns[i].dead) zoneSigns.splice(i, 1);
  }
}
/* 犯罪槽(太刀气刃槽式): 占用施工车道/超速会攒槽, 槽满自动升一级并清零;
 * 停止犯罪一段时间后槽衰减, 槽空则降一级(最低 1 级) */
function updateCrime(dt) {
  let gain = 0;
  /* 超速(全局) */
  const speedOver = game.speed - CRIME_SPEED_LIMIT;
  if (speedOver > 0) gain += (speedOver / 200) * 12 * dt;
  /* 施工占用车道内(玩家可以进入, 但要付出代价) */
  if (zone) {
    const zy0 = zoneScreenY(zone.worldStart);
    const zy1 = zoneScreenY(zone.worldEnd);
    const mid = ROAD.left + ROAD.width / 2;
    const inOccupied = zone.side === 0 ? player.x < mid : player.x > mid;
    if (player.y > zy1 && player.y < zy0 && inOccupied) gain += 14 * dt;
  }
  if (gain > 0) {
    player.crime += gain;
    crimeCool = 2; // 停止犯罪 2 秒后开始衰减
    /* 槽满 → 升一级并清槽(最高 CRIME_MAX_LVL, 满级后槽停在满格) */
    while (player.crime >= 100 && player.crimeLvl < CRIME_MAX_LVL) {
      player.crime -= 100;
      player.crimeLvl++;
      addFloatText(
        player.x,
        player.y - player.height / 2,
        '犯罪等级 ' + player.crimeLvl + '!',
        '#ff9d5c',
      );
    }
    if (player.crimeLvl >= CRIME_MAX_LVL) player.crime = Math.min(player.crime, 100);
  } else {
    crimeCool -= dt;
    if (crimeCool <= 0) {
      player.crime -= 8 * dt;
      /* 槽空 → 降一级并回满槽(最低 1 级) */
      if (player.crime <= 0 && player.crimeLvl > 1) {
        player.crimeLvl--;
        player.crime += 100;
        addFloatText(
          player.x,
          player.y - player.height / 2,
          '犯罪等级 ' + player.crimeLvl,
          '#ff9d5c',
        );
      }
      player.crime = clamp(player.crime, 0, 100);
    }
  }
}
/* ---- 施工路段绘制: 黄色斜向条纹 + 警告牌 ---- */
function drawZone() {
  if (!zone) return;
  const zy0 = zoneScreenY(zone.worldStart);
  const zy1 = zoneScreenY(zone.worldEnd);
  if (zy0 < -10 || zy1 > H + 10) return;
  const occX = zone.side === 0 ? ROAD.left : ROAD.left + ROAD.width / 2;
  const occW = ROAD.width / 2;
  const h = zy0 - zy1;
  /* 黄色底 + 斜向深色条纹(世界锚定, 不随路面滚动) */
  ctx.save();
  ctx.beginPath();
  ctx.rect(occX, zy1, occW, h);
  ctx.clip();
  ctx.fillStyle = '#e8b923';
  ctx.fillRect(occX, zy1, occW, h);
  ctx.strokeStyle = '#8a6d10';
  ctx.lineWidth = 15;
  ctx.beginPath();
  for (let x = occX - h; x < occX + occW + h; x += 34) {
    ctx.moveTo(x, zy0);
    ctx.lineTo(x + h, zy1);
  }
  ctx.stroke();
  ctx.restore();
  /* 警告牌(贴图, 立于路段中部; 加载失败回退矢量绘制) */
  for (const s of zoneSigns) {
    if (s.dead) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    if (assets.sign) {
      const sh = 52;
      const sw = (sh * IMG.sign.naturalWidth) / IMG.sign.naturalHeight;
      ctx.drawImage(IMG.sign, -sw / 2, -sh, sw, sh);
    } else {
      /* 回退: 呼吸光晕 + 黄底黑框 */
      ctx.fillStyle = 'rgba(255,200,60,' + (0.18 + 0.12 * Math.sin(game.time * 5)) + ')';
      ctx.beginPath();
      ctx.arc(0, -20, 32, 0, Math.PI * 2);
      ctx.fill();
      /* 杆 */
      ctx.fillStyle = '#6a6f76';
      ctx.fillRect(-2.5, -2, 5, 24);
      /* 牌面 */
      fillRR(-18, -34, 36, 26, 4, '#ffb300');
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      rr(-18, -34, 36, 26, 4);
      ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.textAlign = 'center';
      ctx.font = "bold 20px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText('!', 0, -15);
    }
    ctx.restore();
  }
}
