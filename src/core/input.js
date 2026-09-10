'use strict';

/* 输入: 键盘(WASD/方向键)+ 手机虚拟摇杆 + 外卖按钮点击 */

/* global canvas, input, W, H, game, foodBtn, startBtn, vehicleBtns, vehicleOpenBtn, vehicleBackBtn, useFood, resetGame, adjustCrime, grantWeapon, player, addFloatText, PX_PER_M, makeFood, makeSpecialFood, applySpecialEffect, VEHICLES, applyVehicle, throwBtn, throwFood, ready */

const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
};

window.addEventListener('keydown', (e) => {
  if (!ready) return; // 加载中屏蔽输入
  const k = KEYMAP[e.code];
  if (!k) {
    /* ---- 测试快捷键 ---- */
    /* +/- 调整犯罪等级 */
    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      adjustCrime(1);
      return;
    }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      adjustCrime(-1);
      return;
    }
    /* 数字键 1~4 直接获得装备 */
    const testItems = { Digit1: 'dagger', Digit2: 'pistol', Digit3: 'rifle', Digit4: 'shield' };
    if (testItems[e.code]) {
      e.preventDefault();
      grantWeapon(testItems[e.code]);
      return;
    }
    /* 数字键 5 获得外卖 */
    if (e.code === 'Digit5') {
      e.preventDefault();
      for (let i = 0; i < 5 && player.food.length < 99; i++) player.food.push(makeFood());
      addFloatText(player.x, player.y - player.height / 2, '+5 外卖', '#ffd23f');
      return;
    }
    /* 数字键 6: +1 有毒外卖 */
    if (e.code === 'Digit6') {
      e.preventDefault();
      player.food.push(makeFood(true));
      addFloatText(player.x, player.y - player.height / 2, '+1 有毒外卖', '#4ade80');
      return;
    }
    /* 数字键 7: +1 特殊外卖(随机) */
    if (e.code === 'Digit7') {
      e.preventDefault();
      player.food.push(makeSpecialFood(Math.floor(Math.random() * 4)));
      addFloatText(player.x, player.y - player.height / 2, '+1 特殊外卖', '#ffd23f');
      return;
    }
    /* 数字键 8/9/0: 直接触发特殊效果(勇猛 / 水果摊 / 焖子) */
    if (e.code === 'Digit8') {
      e.preventDefault();
      applySpecialEffect(0);
      return;
    }
    if (e.code === 'Digit9') {
      e.preventDefault();
      applySpecialEffect(2);
      return;
    }
    if (e.code === 'Digit0') {
      e.preventDefault();
      applySpecialEffect(1);
      return;
    }
    /* P: 现有食物全部变毒(鸡汤来咯) */
    if (e.code === 'KeyP') {
      e.preventDefault();
      applySpecialEffect(3);
      return;
    }
    /* T: 测试用, 增加 500m 路程快速进入高难度 */
    if (e.code === 'KeyT') {
      e.preventDefault();
      game.totalDist += 500 * PX_PER_M;
      addFloatText(player.x, player.y - player.height / 2, '路程 +500m', '#c7cdd4');
      return;
    }
    return;
  }
  e.preventDefault();
  input.keys[k] = true;
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) input.keys[k] = false;
});
window.addEventListener('blur', () => {
  // 失焦时清空按键/摇杆, 防止卡方向
  input.keys = Object.create(null);
  input.joy = null;
});

/* 屏幕坐标 → 逻辑坐标 */
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * W) / r.width,
    y: ((e.clientY - r.top) * H) / r.height,
  };
}
/* 手机: 屏幕下半区按下出现虚拟摇杆, 滑动控制方向(桌面端点击不移动, 仅用键盘) */
const JOY_RADIUS = 70;
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!ready) return; // 加载中屏蔽输入
  if (!game.started) {
    const p = toLogical(e);
    const hit = (b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    if (game.menuScreen === 'vehicle') {
      /* 出行方式选择界面 */
      if (hit(vehicleBackBtn)) {
        game.menuScreen = 'main';
        return;
      }
      for (const type of Object.keys(VEHICLES)) {
        if (hit(vehicleBtns[type])) {
          applyVehicle(type);
          return;
        }
      }
    } else {
      /* 主菜单 */
      if (hit(vehicleOpenBtn)) {
        game.menuScreen = 'vehicle';
        return;
      }
      /* 开始按钮: 应用当前载具(贴图可能刚加载完, 重新算尺寸) */
      if (hit(startBtn)) {
        game.started = true;
        applyVehicle(player.vehicle);
      }
    }
    return;
  }
  if (game.over) {
    resetGame();
    game.started = false; // 死亡后退回开始界面
    return;
  }
  const p = toLogical(e);
  const hitBtn = (b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  /* 点击回血按钮 → 消耗 1 个外卖回血 */
  if (hitBtn(foodBtn)) {
    useFood();
    return;
  }
  /* 点击投掷按钮 → 丢出外卖锁定敌人 */
  if (hitBtn(throwBtn)) {
    throwFood();
    return;
  }
  if (e.pointerType === 'touch' && !input.joy) {
    if (p.y > H * 0.5) {
      input.joy = { id: e.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0 };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  const joy = input.joy;
  if (joy && e.pointerId === joy.id) {
    const p = toLogical(e);
    let dx = p.x - joy.ox;
    let dy = p.y - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_RADIUS) {
      dx = (dx / d) * JOY_RADIUS;
      dy = (dy / d) * JOY_RADIUS;
    }
    joy.dx = dx;
    joy.dy = dy;
  }
});
['pointerup', 'pointercancel'].forEach((t) =>
  canvas.addEventListener(t, (e) => {
    if (input.joy && e.pointerId === input.joy.id) input.joy = null;
  }),
);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
