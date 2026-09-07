'use strict';

/* 全局游戏状态: game(流程)/player(玩家)/input(输入)/BOUNDS(活动范围) */

/* global RIDER_SCALE, START_FOOD, W, H, BASE_SPEED, ROAD */

const game = {
  distance: 0, // 本圈内滚动距离(px)
  totalDist: 0, // 累计行驶距离(px)
  time: 0,
  speed: BASE_SPEED,
  over: false, // 游戏结束标记
  overReason: '', // 结束原因: hp(受伤) / bankrupt(破产)
  shake: 0, // 受击屏幕震动计时
};

const player = {
  x: W / 2,
  y: H * 0.66,
  vx: 0,
  vy: 0,
  tilt: 0, // 侧倾角度(转向动画)
  width: 44 * RIDER_SCALE,
  height: 90 * RIDER_SCALE, // 骑手贴图绘制尺寸(加载后按比例更新)
  MOVE_SPEED: 330, // 键盘移动速度 px/s
  hp: 100, // 生命值
  maxHp: 100,
  hitCd: 0, // 受击无敌计时
  flash: 0, // 受击红闪计时
  food: START_FOOD, // 外卖数量(初始 3 个)
  money: 0, // 金钱
  weapons: {}, // 已持有的道具 { type: { ammo, cd } }, 不同种类可同时存在
  crime: 0, // 犯罪槽 0~100(攒满自动升一级并清零)
  crimeLvl: 1, // 犯罪等级 1~4
  kbx: 0, // 撞击弹开冲量(横向)
  kby: 0, // 撞击弹开冲量(纵向)
  slowT: 0, // 扎胎减速剩余时间
  healFlash: 0, // 回血绿闪计时
};

const input = {
  keys: Object.create(null),
  joy: null, // 手机虚拟摇杆 { id, ox, oy, dx, dy }
};

/* 玩家活动范围(贴图加载后由 updateBounds 更新) */
const BOUNDS = { x0: 0, x1: 0, y0: 96, y1: H - 120 };
function updateBounds() {
  const m = player.width / 2 + 6;
  BOUNDS.x0 = ROAD.left + m;
  BOUNDS.x1 = ROAD.left + ROAD.width - m;
}
updateBounds();
