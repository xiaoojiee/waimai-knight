'use strict';

/* 犯罪等级 / 警车追击 / 拦车钉(路钉) */

/* global player, clamp, ROAD, game, addFloatText, H, damagePlayer, spawnBoom, enemies, dropFood, WEAPONS, zoneScreenY, ctx, fillRR, IMG, assets, crimeCool:writable, launchEnemy, CRIME_MAX_LVL */

/* 等级: 1 小罪无碍 / 2 略有影响 / 3 大型事故 / 4 重大影响(犯罪槽攒满逐级提升) */
function crimeLevel() {
  return player.crimeLvl;
}
/* 测试: +/- 直接调整犯罪等级(1~4 档) */
function adjustCrime(dir) {
  player.crimeLvl = clamp(player.crimeLvl + dir, 1, CRIME_MAX_LVL);
  player.crime = 0; // 换等级后槽清空
  crimeCool = 2; // 暂时阻止衰减, 便于观察当前等级表现
  addFloatText(player.x, player.y - player.height / 2, '犯罪等级 ' + player.crimeLvl, '#ff9d5c');
}
/* 测试: 直接获得指定装备 */
function grantWeapon(type) {
  const def = WEAPONS[type];
  /* 枪械互斥: 手枪/步枪只能同时存在一种; 匕首/盾牌可与其共存 */
  if (type === 'pistol' || type === 'rifle') {
    delete player.weapons.pistol;
    delete player.weapons.rifle;
  }
  player.weapons[type] = { ammo: def.uses ?? def.ammo ?? def.charges, cd: 0 };
  addFloatText(player.x, player.y - player.height / 2, '获得 ' + def.label, '#ffd23f');
}

/* ---- 警车(矢量绘制, 占满一边车道) ---- */
const police = []; // { x, y, lane, cycleT, surging, weavePhase }
let policeTimer = 0;
const POLICE_DMG = Math.round(100 / 3); // 警车撞击扣 1/3 血量

/* 警车/路钉贴图的内容包围盒(贴图带透明余量, 精确裁切) */
let POLICE_BOX = null;
let SPIKE_BOX = null;
function detectSpriteBox(img) {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const c2d = c.getContext('2d', { willReadFrequently: true });
    c2d.drawImage(img, 0, 0);
    const d = c2d.getImageData(0, 0, c.width, c.height).data;
    const iw = c.width,
      ih = c.height;
    const s = 4; // 4px 采样
    let minX = iw,
      minY = ih,
      maxX = 0,
      maxY = 0;
    for (let y = 0; y < ih; y += s) {
      for (let x = 0; x < iw; x += s) {
        if (d[(y * iw + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  } catch (_) {
    return null;
  }
}

function spawnPolice() {
  /* 第二辆走另一条车道 */
  const lane = police.length === 0 ? (Math.random() < 0.5 ? 0 : 1) : police[0].lane === 0 ? 1 : 0;
  police.push({
    x: lane === 0 ? ROAD.left + ROAD.width / 4 : ROAD.left + (ROAD.width * 3) / 4,
    y: H + 90, // 从屏幕下方入场
    lane,
    state: 'track', // track(下方跟随) / surge(前冲) / retreat(退回)
    /* 第二辆错开相位, 不与第一辆同时冲撞 */
    cycleT: (police.length === 1 ? 2.5 : 0) + 1 + Math.random() * 1.5,
    weavePhase: Math.random() * Math.PI * 2,
  });
}
function updatePolice(dt) {
  const lvl = crimeLevel();
  const want = lvl >= 3 ? 2 : lvl >= 2 ? 1 : 0;
  if (want > 0 && !game.over) {
    /* 补齐数量: 等级2一辆 / 等级3+两辆(两边各一), 持续跟踪 */
    policeTimer -= dt;
    if (policeTimer <= 0 && police.length < want) {
      spawnPolice();
      policeTimer = 1.2;
    }
  } else {
    police.length = 0;
    policeTimer = 0;
  }
  while (police.length > want) police.pop(); // 等级降低时撤走多余的

  for (const p of police) {
    /* 跟踪位置: 屏幕最下方 */
    const trackY = H - 90;
    if (p.state === 'track') {
      p.cycleT -= dt;
      p.y += (trackY - p.y) * Math.min(1, dt * 4); // 平滑保持在下方
      if (p.cycleT <= 0) {
        p.state = 'surge';
        /* 两辆警车的冲撞错开: 另一辆至少再等 1.6 秒 */
        for (const q of police) {
          if (q !== p && q.state === 'track') q.cycleT = Math.max(q.cycleT, 1.6);
        }
      }
    } else if (p.state === 'surge') {
      p.y -= 520 * dt; // 间歇性往前撞
      if (p.y <= player.y + 50) p.state = 'retreat'; // 冲到玩家附近就退回
    } else {
      /* retreat: 回到下方跟踪位 */
      p.y += 300 * dt;
      if (p.y >= trackY) {
        p.state = 'track';
        p.cycleT = 1.5 + Math.random() * 2.5;
      }
    }
    /* 轻微横向跟踪玩家(保持在本车道内) */
    const laneX0 = p.lane === 0 ? ROAD.left : ROAD.left + ROAD.width / 2;
    const laneX1 = laneX0 + ROAD.width / 2;
    p.x += (clamp(player.x, laneX0 + 34, laneX1 - 34) - p.x) * Math.min(1, dt * 2);

    /* 撞到玩家: 扣 1/3 血量并弹开 */
    if (player.hitCd <= 0) {
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const rx = (player.width * 0.5 + 30) * 0.9;
      const ry = (player.height * 0.5 + 50) * 0.9;
      if (Math.abs(dx) < rx && Math.abs(dy) < ry) {
        damagePlayer(POLICE_DMG);
        const d2 = Math.hypot(dx, dy) || 1;
        player.kbx = (dx / d2) * 320;
        player.kby = (dy / d2) * 320;
        game.shake = 0.5;
        spawnBoom((p.x + player.x) / 2, (p.y + player.y) / 2);
        if (p.state === 'surge') p.state = 'retreat'; // 撞完退回
      }
    }
    /* 撞到敌方骑手: 直接撞飞秒杀(不受敌方受击无敌影响), 照常掉落外卖 */
    for (const e of enemies) {
      if (e.dead || e.dying) continue;
      if (Math.abs(e.x - p.x) < 50 && Math.abs(e.y - p.y) < 62) {
        e.hp = 0;
        e.dead = true;
        e.dying = true;
        e.dieT = 0;
        launchEnemy(e, p.x);
        spawnBoom(e.x, e.y);
        dropFood(e.x, e.y);
      }
    }
  }
}

/* ---- 拦车钉(等级4: 前方随机一边车道生成, 碾过减速) ---- */
let spikeStrip = null; // { world, lane, hit }
let spikeTimer = 0;
function updateSpike(dt) {
  const lvl = crimeLevel();
  if (lvl >= 4 && !game.over) {
    if (!spikeStrip) {
      spikeTimer -= dt;
      if (spikeTimer <= 0) {
        spikeStrip = {
          world: game.totalDist + 1500, // 前方 75m
          lane: Math.random() < 0.5 ? 0 : 1,
          hit: false,
        };
      }
    } else {
      const sy = zoneScreenY(spikeStrip.world);
      const laneX0 = spikeStrip.lane === 0 ? ROAD.left : ROAD.left + ROAD.width / 2;
      const laneX1 = laneX0 + ROAD.width / 2;
      if (
        !spikeStrip.hit &&
        Math.abs(player.y - sy) < 30 &&
        player.x > laneX0 &&
        player.x < laneX1
      ) {
        spikeStrip.hit = true;
        player.slowT = 4; // 整体速度下降 4 秒
        addFloatText(player.x, player.y - player.height / 2, '扎胎! 减速', '#ff9d5c');
        game.shake = 0.3;
      }
      if (sy > H + 100) {
        spikeStrip = null;
        spikeTimer = 4 + Math.random() * 3;
      }
    }
  } else {
    spikeStrip = null;
    spikeTimer = 0;
  }
}

/* ---- 警车绘制 ---- */
function drawPolice() {
  for (const p of police) {
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(game.time * 18 + p.weavePhase) * 1.5);
    /* 阴影 */
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 30, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    if (assets.police && POLICE_BOX) {
      /* 警车贴图(按内容包围盒裁切) */
      const h = 115;
      const w = (h * POLICE_BOX.w) / POLICE_BOX.h;
      ctx.drawImage(
        IMG.police,
        POLICE_BOX.x,
        POLICE_BOX.y,
        POLICE_BOX.w,
        POLICE_BOX.h,
        -w / 2,
        -h / 2,
        w,
        h,
      );
    } else {
      /* 回退: 矢量警车 */
      fillRR(-29, -48, 58, 96, 10, '#f2f4f7');
      fillRR(-23, -38, 46, 16, 4, '#39414a');
      fillRR(-23, 22, 46, 16, 4, '#39414a');
      fillRR(-29, -10, 58, 20, 4, '#2b5fd9');
      const flash = Math.sin(game.time * 12 + p.weavePhase) > 0;
      fillRR(-13, -56, 11, 9, 2, flash ? '#ff4444' : '#3366ff');
      fillRR(2, -56, 11, 9, 2, flash ? '#3366ff' : '#ff4444');
    }
    ctx.restore();
  }
}

/* ---- 拦车钉绘制 ---- */
function drawSpike() {
  if (!spikeStrip) return;
  const sy = zoneScreenY(spikeStrip.world);
  if (sy < -40 || sy > H + 40) return;
  const x0 = spikeStrip.lane === 0 ? ROAD.left : ROAD.left + ROAD.width / 2;
  const w = ROAD.width / 2;
  ctx.save();
  if (assets.spike && SPIKE_BOX) {
    /* 路钉贴图(按内容包围盒裁切) */
    ctx.drawImage(
      IMG.spike,
      SPIKE_BOX.x,
      SPIKE_BOX.y,
      SPIKE_BOX.w,
      SPIKE_BOX.h,
      x0 + 2,
      sy - 16,
      w - 4,
      32,
    );
  } else {
    /* 回退: 矢量拦车钉 */
    fillRR(x0 + 2, sy - 7, w - 4, 14, 3, '#22262b');
    ctx.fillStyle = '#c9ced6';
    for (let x = x0 + 10; x < x0 + w - 8; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, sy - 7);
      ctx.lineTo(x + 5, sy - 16);
      ctx.lineTo(x + 10, sy - 7);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}
