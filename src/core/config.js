'use strict';

/* 常量配置(纯常量, 无外部依赖) */

const W = 480,
  H = 800; // 逻辑分辨率
/* 新道路贴图: 左侧沥青路面(贴图 152~728px 映射), 右侧水泥区(贴图 740px 起)预留给店铺 */
const ROAD = { left: 63, width: 240 }; // 沥青路面(画布坐标)
const CEMENT_X = 308; // 水泥区起始(画布坐标): 不响应滑动, 摆放外卖按钮

const TILE_H = 852; // 道路贴图缩放后高度(1152×2048 贴图按画布宽度铺满)
const LOOP = TILE_H * 20; // 场景无缝循环长度(20 块贴图)
const PX_PER_M = 20; // 20px 计 1m, 仅用于里程换算
const BASE_SPEED = 240; // 场景默认前进速度 px/s
const SPEED_MIN = 55,
  SPEED_MAX = 410; // 速度下限/上限: 向后刹得更慢, 向前冲得略低

/* 碰撞伤害: 侧面相撞双方相同; 前后相撞前方(世界前进方向=屏幕上方)受伤更多 */
const DMG_SIDE = 15;
const DMG_FRONT = 24;
const DMG_REAR = 8;
const HIT_CD = 1; // 玩家受击无敌时间(秒), 防止一帧内多次结算
const ENEMY_HIT_CD = 0.2; // 敌方受击无敌时间(秒), 保证连续子弹/撞击可连续结算
const ENEMY_MAX = 3; // 同屏敌骑手上限
const HEAL_AMT = 25; // 点击外卖按钮回复的血量
const RIDER_SCALE = 1.5; // 玩家贴图缩放倍数
const FOOD_SIZE = 104; // 外卖掉落绘制尺寸
const ENEMY_DIE_TIME = 0.9; // 敌人倒下动画时长(秒)
const START_FOOD = 3; // 初始外卖数量
const FOOD_PRICE = 15; // 送达每个外卖的报酬
const FOOD_FINE = 8; // 缺少每个外卖的罚款
const CUSTOMER_DELAY_FIRST_M = 120; // 开局行驶多远后可能出现第一个客户(米)
const CUSTOMER_INTERVAL_MIN_M = 60; // 客户间隔距离下限(米)
const CUSTOMER_INTERVAL_MAX_M = 150; // 客户间隔距离上限(米)
const CUSTOMER_SPAWN_CHANCE = 0.6; // 到达距离阈值时的生成概率

/* 装备(道具图集 3×3: 匕首/剑/弯刀/手枪/步枪/机枪/盾牌×3, 只启用匕首/手枪/步枪/盾牌)
 * 手枪贴图枪口朝左 → 右转 90° 指向上方; 步枪贴图朝左上 → 右转 45° 指向上方 */
const WEAPONS = {
  dagger: {
    frame: [0, 0],
    price: 40,
    label: '匕首',
    color: '#c0392b',
    baseRot: 0,
    uses: 20,
    extraDmg: 15,
  },
  pistol: {
    frame: [1, 0],
    price: 70,
    label: '手枪',
    color: '#2980b9',
    baseRot: Math.PI / 2,
    ammo: 6,
    dmg: 12,
    rate: 0.45,
  },
  rifle: {
    frame: [1, 1],
    price: 120,
    label: '步枪',
    color: '#27ae60',
    baseRot: Math.PI / 4,
    ammo: 15,
    dmg: 15,
    rate: 0.3,
  },
  shield: { frame: [2, 2], price: 60, label: '盾牌', color: '#8e44ad', baseRot: 0, charges: 3 },
};
const SHOP_DELAY_FIRST_M = 80; // 开局行驶多远后出现第一个店铺(米)
const SHOP_INTERVAL_MIN_M = 150; // 店铺间隔下限(米)
const SHOP_INTERVAL_MAX_M = 300; // 店铺间隔上限(米)
const FOOD_BUY_PRICE = 10; // 饭店购买单个外卖的价格
const FOOD_BUNDLE = 5; // 饭店一次购买的外卖数量(一家只卖一次)
const REST_DELAY_FIRST_M = 200; // 开局行驶多远后出现第一家饭店(米)
const REST_INTERVAL_MIN_M = 200; // 饭店间隔下限(米)
const REST_INTERVAL_MAX_M = 400; // 饭店间隔上限(米)
const ZONE_DELAY_FIRST_M = 200; // 开局行驶多远后出现第一个施工路段(米)
const ZONE_INTERVAL_MIN_M = 300; // 施工路段间隔下限(米)
const ZONE_INTERVAL_MAX_M = 600; // 施工路段间隔上限(米)
const ZONE_LEN_MIN = 500; // 施工路段长度下限(px)
const ZONE_LEN_MAX = 900; // 施工路段长度上限(px)
const ZONE_ANCHOR_Y = H * 0.66; // 世界坐标 → 屏幕 y 锚点(玩家标称位置)
const CRIME_SPEED_LIMIT = BASE_SPEED + 60; // 超过此速度算超速, 涨犯罪条
const CRIME_MAX_LVL = 4; // 犯罪等级上限(犯罪槽攒满自动升一级, 太刀气刃槽式)
