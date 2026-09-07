'use strict';

/* 输入: 键盘(WASD/方向键)+ 手机虚拟摇杆 + 外卖按钮点击 */

/* global canvas, input, W, H, game, foodBtn, useFood, resetGame, adjustCrime, grantWeapon, player, addFloatText, CEMENT_X */

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
      player.food = Math.min(99, player.food + 5);
      addFloatText(player.x, player.y - player.height / 2, '+5 外卖', '#ffd23f');
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
  if (game.over) {
    resetGame();
    return;
  }
  const p = toLogical(e);
  /* 点击左上角外卖按钮 → 消耗 1 个外卖回血 */
  if (
    p.x >= foodBtn.x &&
    p.x <= foodBtn.x + foodBtn.w &&
    p.y >= foodBtn.y &&
    p.y <= foodBtn.y + foodBtn.h
  ) {
    useFood();
    return;
  }
  if (e.pointerType === 'touch' && !input.joy) {
    /* 仅路面区域可触发摇杆: 水泥区不响应滑动(留给店铺/按钮) */
    if (p.y > H * 0.5 && p.x < CEMENT_X) {
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
