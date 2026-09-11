'use strict';

/* 载具解锁: 点赞 / 投币 / 收藏 / 关注 解锁对应载具 */

/* global Toy, VEHICLES, unlocks */

const UNLOCK_HINT = {
  like: '点赞视频解锁',
  coin: '投币视频解锁',
  fav: '收藏视频解锁',
  follow: '关注UP解锁',
};

/* 查询并刷新解锁状态(非 Toy 环境全部解锁, 便于本地测试) */
async function refreshUnlocks() {
  if (!Toy.available()) {
    for (const k in unlocks) unlocks[k] = true;
    return;
  }
  const [va, rel] = await Promise.all([Toy.getVideoActions(), Toy.getAuthorRelation()]);
  /* 两项都拿不到 → 判定不在真实 Toy 环境, 全部解锁 */
  if (!va && !rel) {
    for (const k in unlocks) unlocks[k] = true;
    return;
  }
  if (va) {
    unlocks.rider = va.liked;
    unlocks.cow = va.coin;
    unlocks.car = va.fav;
  }
  if (rel) unlocks.train = rel.following;
}

function isVehicleUnlocked(type) {
  const def = VEHICLES[type];
  if (!def || !def.unlock || def.unlock === 'free') return true;
  return !!unlocks[type];
}
function vehicleUnlockHint(type) {
  const def = VEHICLES[type];
  return (def && UNLOCK_HINT[def.unlock]) || '';
}
