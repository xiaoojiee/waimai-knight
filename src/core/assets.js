'use strict';

/* 贴图资源: 道路/骑手必需(加载完才 ready), 其余贴图可选 */

/* global detectCustomerFrames, detectSpecialCustomerFrames, detectSpriteBox, updateBounds, applyVehicle, POLICE_BOX:writable, SPIKE_BOX:writable, spritesReady:writable, player */

const IMG = {
  road: new Image(),
  rider: new Image(),
  walk: new Image(),
  cow: new Image(),
  car: new Image(),
  train: new Image(),
  smoke: new Image(),
  enemy: new Image(),
  boom: new Image(),
  food: new Image(),
  poison: new Image(),
  customer: new Image(),
  specCus: new Image(),
  specFood: new Image(),
  item: new Image(),
  sign: new Image(),
  police: new Image(),
  spike: new Image(),
  shop: new Image(),
};
const assets = {
  road: false,
  rider: false,
  walk: false,
  cow: false,
  car: false,
  train: false,
  smoke: false,
  enemy: false,
  boom: false,
  food: false,
  poison: false,
  customer: false,
  specCus: false,
  specFood: false,
  item: false,
  sign: false,
  police: false,
  spike: false,
  shop: false,
};
/* 各贴图非透明内容包围盒(剔除留白), 供碰撞/边界/阴影使用 */
const SPRITE_BOX = {};
let ready = false;

/* 全部贴图加载完成后才 ready(加载页据此显示进度并屏蔽输入) */
let checked = false;
function checkReady() {
  if (checked) return;
  for (const k in assets) {
    if (!assets[k]) return;
  }
  checked = true;
  ready = true;
}
/* 加载进度 0~1 */
function loadProgress() {
  let done = 0;
  let total = 0;
  for (const k in assets) {
    total++;
    if (assets[k]) done++;
  }
  return total ? done / total : 1;
}

IMG.road.onload = () => {
  assets.road = true;
  checkReady();
};
IMG.walk.onload = () => {
  assets.walk = true;
  SPRITE_BOX.walk = detectSpriteBox(IMG.walk);
  if (player.vehicle === 'walk') applyVehicle('walk');
  checkReady();
};
IMG.walk.src = 'assets/贴图/步行.png';
IMG.rider.onload = () => {
  assets.rider = true;
  SPRITE_BOX.rider = detectSpriteBox(IMG.rider);
  spritesReady = true;
  if (player.vehicle === 'rider') applyVehicle('rider');
  else updateBounds();
  checkReady();
};
IMG.road.src = 'assets/贴图/道路.png';
IMG.cow.onload = () => {
  assets.cow = true;
  SPRITE_BOX.cow = detectSpriteBox(IMG.cow);
  if (player.vehicle === 'cow') applyVehicle('cow');
}; // 牛可选
IMG.cow.src = 'assets/贴图/牛来.png';
IMG.car.onload = () => {
  assets.car = true;
  SPRITE_BOX.car = detectSpriteBox(IMG.car);
  if (player.vehicle === 'car') applyVehicle('car');
}; // 跑车可选
IMG.car.src = 'assets/贴图/跑车.png';
IMG.train.onload = () => {
  assets.train = true;
  SPRITE_BOX.train = detectSpriteBox(IMG.train);
  if (player.vehicle === 'train') applyVehicle('train');
}; // 火车头可选
IMG.train.src = 'assets/贴图/火车头.png';
IMG.rider.src = 'assets/贴图/骑手.png';
IMG.smoke.onload = () => {
  assets.smoke = true;
}; // 烟雾可选, 不阻塞 ready
IMG.smoke.src = 'assets/贴图/烟雾特效.png';
IMG.enemy.onload = () => {
  assets.enemy = true;
  SPRITE_BOX.enemy = detectSpriteBox(IMG.enemy);
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
IMG.poison.onload = () => {
  assets.poison = true;
}; // 有毒外卖可选(2列×1行)
IMG.poison.src = 'assets/贴图/有毒食物.png';
IMG.customer.onload = () => {
  assets.customer = true;
  detectCustomerFrames(); // 分析逐帧包围盒
}; // 客户可选
IMG.customer.src = 'assets/贴图/客户.png';
IMG.specCus.onload = () => {
  assets.specCus = true;
  detectSpecialCustomerFrames();
}; // 特殊客户可选(2×2)
IMG.specCus.src = 'assets/贴图/特殊客户.png';
IMG.specFood.onload = () => {
  assets.specFood = true;
}; // 特殊外卖可选(2×2)
IMG.specFood.src = 'assets/贴图/特殊外卖.png';
IMG.item.onload = () => {
  assets.item = true;
}; // 道具可选
IMG.item.src = 'assets/贴图/道具.png';
IMG.sign.onload = () => {
  assets.sign = true;
}; // 路障(原警告牌)可选
IMG.sign.src = 'assets/贴图/路障.png';
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
IMG.shop.onload = () => {
  assets.shop = true;
}; // 店铺可选
IMG.shop.src = 'assets/贴图/店铺.png';
