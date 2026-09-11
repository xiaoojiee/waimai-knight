'use strict';

/* 装备: 枪械自动瞄准开火 / 子弹飞行 / 匕首挥砍特效 */

/* global enemies, player, IMG, assets, ctx, game, WEAPONS, damageEnemy, W, H, spawnBoom, SFX */

const bullets = [];
const slashFX = []; // 匕首挥砍特效
const ORBIT = {
  dagger: { r: 36, spin: 2.2, hitR: 22 },
  shield: { r: 50, spin: 1.4 },
};
function squashScale(c) {
  const a = Math.abs(c);
  if (a < 0.1) return c < 0 ? -0.1 : 0.1;
  return c;
}
function eachOrbit(type, fn) {
  const w = player.weapons[type];
  if (!w) return;
  const n = w.ammo;
  const o = ORBIT[type];
  for (let i = 0; i < n; i++) {
    const φ = game.time * o.spin + (i / Math.max(1, n)) * Math.PI * 2;
    fn(φ, player.x + Math.sin(φ) * o.r, player.y - Math.cos(φ) * o.r, i);
  }
}
function consumeDagger() {
  const w = player.weapons.dagger;
  if (!w) return false;
  w.ammo--;
  if (w.ammo <= 0) delete player.weapons.dagger;
  return true;
}
function shieldBlockPos() {
  let x = player.x;
  let y = player.y;
  eachOrbit('shield', (φ, px, py, i) => {
    if (i === 0) {
      x = px;
      y = py;
    }
  });
  return { x, y };
}

function nearestEnemy() {
  let best = null;
  let bd = 320 * 320; // 射程平方
  for (const e of enemies) {
    if (e.dead || e.dying) continue;
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}
function fireBullet(def, target) {
  const aim = Math.atan2(target.x - player.x, -(target.y - player.y));
  const speed = 950;
  bullets.push({
    x: player.x + Math.sin(aim) * 26,
    y: player.y - Math.cos(aim) * 26,
    vx: Math.sin(aim) * speed,
    vy: -Math.cos(aim) * speed,
    dmg: def.dmg,
    life: 0.9,
  });
  SFX.play('shoot');
}
function updateWeapon(dt) {
  /* 枪械: 各自独立冷却, 自动瞄准最近敌人自动开火(可同时持有) */
  const target = nearestEnemy();
  for (const type of ['pistol', 'rifle']) {
    const w = player.weapons[type];
    if (!w) continue;
    const def = WEAPONS[type];
    w.cd -= dt;
    if (target && w.cd <= 0 && w.ammo > 0) {
      fireBullet(def, target);
      w.ammo--;
      w.cd = def.rate;
      if (w.ammo <= 0) delete player.weapons[type]; // 子弹打完消失
    }
  }
  /* 子弹飞行与命中 */
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let hit = false;
    for (const e of enemies) {
      if (e.dead || e.dying) continue;
      const r = e.cw * 0.6;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < r * r) {
        damageEnemy(e, b.dmg);
        hit = true;
        break;
      }
    }
    if (hit || b.life <= 0 || b.x < 0 || b.x > W || b.y < -40 || b.y > H + 40) bullets.splice(i, 1);
  }
  /* 匕首碰到敌人 → +15、销毁这一把、攻击特效 [2,2] */
  if (player.weapons.dagger) {
    const hitR = ORBIT.dagger.hitR;
    const hitIdx = [];
    eachOrbit('dagger', (φ, x, y, i) => {
      for (const e of enemies) {
        if (e.dead || e.dying || e.hitCd > 0) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        const r = hitR + e.cw * 0.3;
        if (dx * dx + dy * dy < r * r) {
          if (damageEnemy(e, WEAPONS.dagger.extraDmg)) {
            spawnBoom(x, y, [2, 2]);
            hitIdx.push(i);
          }
          break;
        }
      }
    });
    if (hitIdx.length) {
      for (let k = 0; k < hitIdx.length; k++) consumeDagger();
    }
  }
  /* 挥砍特效 */
  for (let i = slashFX.length - 1; i >= 0; i--) {
    slashFX[i].life -= dt;
    if (slashFX[i].life <= 0) slashFX.splice(i, 1);
  }
}

/* ---- 装备/子弹/挥砍绘制 ---- */
function drawOrbitSprite(type, φ, x, y, s) {
  if (!assets.item) return;
  const def = WEAPONS[type];
  const fw = IMG.item.naturalWidth / 2;
  const fh = IMG.item.naturalHeight / 2;
  ctx.save();
  ctx.translate(x, y);
  if (type === 'dagger') {
    ctx.rotate(φ);
  } else {
    ctx.scale(squashScale(Math.cos(φ)), 1);
    ctx.rotate(def.baseRot);
  }
  ctx.drawImage(
    IMG.item,
    def.frame[0] * fw + 2,
    def.frame[1] * fh + 2,
    fw - 4,
    fh - 4,
    -s / 2,
    -s / 2,
    s,
    s,
  );
  ctx.restore();
}
function drawOrbitWeapons() {
  const orbitDraw = [];
  eachOrbit('dagger', (φ, x, y) => orbitDraw.push({ type: 'dagger', φ, x, y, s: 36 }));
  eachOrbit('shield', (φ, x, y) => orbitDraw.push({ type: 'shield', φ, x, y, s: 40 }));
  orbitDraw.sort((a, b) => a.y - b.y);
  for (const it of orbitDraw) drawOrbitSprite(it.type, it.φ, it.x, it.y, it.s);
}
function drawWeapon() {
  /* 枪械: 围绕骑手旋转自动瞄准(两把枪不同半径, 可同时装备) */
  if ((player.weapons.pistol || player.weapons.rifle) && assets.item) {
    const fw = IMG.item.naturalWidth / 2;
    const fh = IMG.item.naturalHeight / 2;
    const target = nearestEnemy();
    const aim = target ? Math.atan2(target.x - player.x, -(target.y - player.y)) : 0;
    const s = 44;
    for (const type of ['pistol', 'rifle']) {
      if (!player.weapons[type]) continue;
      const def = WEAPONS[type];
      const orbitR = type === 'pistol' ? 24 : 38;
      ctx.save();
      ctx.translate(player.x + Math.sin(aim) * orbitR, player.y - Math.cos(aim) * orbitR);
      ctx.rotate(aim + def.baseRot);
      ctx.drawImage(
        IMG.item,
        def.frame[0] * fw + 2,
        def.frame[1] * fh + 2,
        fw - 4,
        fh - 4,
        -s / 2,
        -s / 2,
        s,
        s,
      );
      ctx.restore();
    }
  }
  /* 匕首挥砍特效: 弧形刀光挥向目标方向 */
  for (const s of slashFX) {
    const t = 1 - s.life / s.maxLife;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.aim);
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - t) * 0.9 + ')';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 42, -0.9, 0.9);
    ctx.stroke();
    ctx.restore();
  }
}
function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
