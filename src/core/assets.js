'use strict';

/* 贴图资源: 道路/骑手必需(加载完才 ready), 其余贴图可选 */

/* global detectCustomerFrames, detectSpriteBox, updateBounds, POLICE_BOX:writable, SPIKE_BOX:writable, RIDER_SCALE, player */

const IMG = {
  road: new Image(),
  rider: new Image(),
  smoke: new Image(),
  enemy: new Image(),
  boom: new Image(),
  food: new Image(),
  customer: new Image(),
  item: new Image(),
  sign: new Image(),
  police: new Image(),
  spike: new Image(),
};
const assets = {
  road: false,
  rider: false,
  smoke: false,
  enemy: false,
  boom: false,
  food: false,
  customer: false,
  item: false,
  sign: false,
  police: false,
  spike: false,
};
let ready = false;

/* 可选贴图在 onload 回调里才调用 detectSpriteBox/detectCustomerFrames(定义于所属实体文件) */
let checked = false;
function checkReady() {
  if (checked || !assets.road || !assets.rider) return;
  checked = true;
  ready = true;
}

IMG.road.onload = () => {
  assets.road = true;
  checkReady();
};
IMG.rider.onload = () => {
  assets.rider = true;
  /* 按原比例缩放: 高定 90, 宽随比例, 宽超 44 时改按宽缩放 */
  const iw = IMG.rider.naturalWidth || 1;
  const ih = IMG.rider.naturalHeight || 1;
  let h = 90 * RIDER_SCALE,
    w = (h * iw) / ih;
  if (w > 44 * RIDER_SCALE) {
    w = 44 * RIDER_SCALE;
    h = (w * ih) / iw;
  }
  player.width = w;
  player.height = h;
  updateBounds();
  checkReady();
};
IMG.road.src = 'assets/贴图/道路.png';
IMG.rider.src = 'assets/贴图/骑手.png';
IMG.smoke.onload = () => {
  assets.smoke = true;
}; // 烟雾可选, 不阻塞 ready
IMG.smoke.src = 'assets/贴图/烟雾特效.png';
IMG.enemy.onload = () => {
  assets.enemy = true;
}; // 敌骑手可选
IMG.enemy.src = 'assets/贴图/敌方骑手.png';
IMG.boom.onload = () => {
  assets.boom = true;
}; // 碰撞特效可选
IMG.boom.src = 'assets/贴图/碰撞特效.png';
IMG.food.onload = () => {
  assets.food = true;
}; // 外卖可选
IMG.food.src = 'assets/贴图/外卖.png';
IMG.customer.onload = () => {
  assets.customer = true;
  detectCustomerFrames(); // 分析逐帧包围盒
}; // 客户可选
IMG.customer.src = 'assets/贴图/客户.png';
IMG.item.onload = () => {
  assets.item = true;
}; // 道具可选
IMG.item.src = 'assets/贴图/道具.png';
IMG.sign.onload = () => {
  assets.sign = true;
}; // 警告牌可选
IMG.sign.src = 'assets/贴图/警告牌.png';
IMG.police.onload = () => {
  assets.police = true;
  POLICE_BOX = detectSpriteBox(IMG.police); // 精确裁切
}; // 警车可选
IMG.police.src = 'assets/贴图/警车.png';
IMG.spike.onload = () => {
  assets.spike = true;
  SPIKE_BOX = detectSpriteBox(IMG.spike); // 精确裁切
}; // 路钉可选
IMG.spike.src = 'assets/贴图/路钉.png';
