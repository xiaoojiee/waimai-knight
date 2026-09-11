'use strict';

/* 输入: 键盘(WASD/方向键)+ 手机虚拟摇杆 + 外卖按钮点击 */

/* global canvas, input, W, H, game, foodBtn, startBtn, vehicleBtns, vehicleOpenBtn, vehicleBackBtn, useFood, resetGame, adjustCrime, grantWeapon, player, addFloatText, PX_PER_M, makeFood, makeSpecialFood, applySpecialEffect, VEHICLES, applyVehicle, throwBtn, throwFood, ready, SFX, pauseBtn, soundBtn, pauseHomeBtn, spawnInitialEnemies, INITIAL_ENEMIES, spawnBoss, rankOpenBtn, rankRefreshBtn, mockBtns, markPress, Toy, refreshUnlocks, isVehicleUnlocked, loadRank, giftBtn, giftCloseBtn, giftHomeBtn, giftVideoBtn, giftUnlockBtn */

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

/* 测试模式作弊码: 连续输入 hsgg 开关(类似 GTA 作弊码) */
const CHEAT = 'hsgg';
let cheatBuf = '';

window.addEventListener('keydown', (e) => {
  if (!ready) return; // 加载中屏蔽输入
  SFX.unlock(); // 用户交互, 解锁音频
  /* 作弊码: 连续输入 hsgg 开关「测试模式」 */
  if (/^Key[A-Z]$/.test(e.code)) {
    cheatBuf = (cheatBuf + e.code.slice(3).toLowerCase()).slice(-CHEAT.length);
    if (cheatBuf === CHEAT) {
      cheatBuf = '';
      game.testMode = !game.testMode;
      addFloatText(
        player.x,
        player.y - player.height / 2,
        game.testMode ? '测试模式 开启' : '测试模式 关闭',
        '#ffd23f',
      );
    }
  }
  /* Esc: 暂停/继续 */
  if (e.code === 'Escape' && game.started && !game.over) {
    e.preventDefault();
    game.paused = !game.paused;
    return;
  }
  const k = KEYMAP[e.code];
  if (!k) {
    if (!game.testMode) return; // 未开启测试模式(作弊码 hsgg)时屏蔽所有测试键
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
    /* B: 测试用, 立即生成大运 Boss */
    if (e.code === 'KeyB') {
      e.preventDefault();
      spawnBoss();
      addFloatText(player.x, player.y - player.height / 2, '大运来了!', '#ff9d5c');
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
  SFX.unlock(); // 用户交互, 解锁音频
  if (!game.started) {
    const p = toLogical(e);
    const hit = (b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    if (game.menuScreen === 'gift') {
      /* 礼物 / 互动奖励面板 */
      if (hit(giftCloseBtn)) {
        markPress(giftCloseBtn);
        game.menuScreen = 'main';
      } else if (hit(giftHomeBtn)) {
        markPress(giftHomeBtn);
        Toy.openAuthor();
      } else if (hit(giftVideoBtn) || hit(giftUnlockBtn)) {
        markPress(hit(giftVideoBtn) ? giftVideoBtn : giftUnlockBtn);
        Toy.openVideo();
      }
      return;
    }
    if (game.menuScreen === 'rank') {
      /* 排行榜界面 */
      if (hit(vehicleBackBtn)) {
        markPress(vehicleBackBtn);
        game.menuScreen = 'main';
      } else if (hit(rankRefreshBtn)) {
        markPress(rankRefreshBtn);
        loadRank();
      }
      return;
    }
    if (game.menuScreen === 'vehicle') {
      /* 出行方式选择界面 */
      if (hit(vehicleBackBtn)) {
        markPress(vehicleBackBtn);
        game.menuScreen = 'main';
        return;
      }
      if (Toy.isMock()) {
        for (const mb of mockBtns) {
          if (hit(mb)) {
            markPress(mb);
            window.__toyMock.toggle(mb.key);
            refreshUnlocks();
            return;
          }
        }
      }
      for (const type of Object.keys(VEHICLES)) {
        if (hit(vehicleBtns[type])) {
          markPress(vehicleBtns[type]);
          if (!isVehicleUnlocked(type)) {
            /* 未解锁 → 跳到视频/UP 去点赞投币收藏关注 */
            if (VEHICLES[type].unlock === 'follow') Toy.openAuthor();
            else Toy.openVideo();
            return;
          }
          applyVehicle(type);
          return;
        }
      }
    } else {
      /* 主菜单 */
      if (hit(giftBtn)) {
        markPress(giftBtn);
        game.menuScreen = 'gift';
        refreshUnlocks(); // 刷新解锁状态
        return;
      }
      if (hit(vehicleOpenBtn)) {
        markPress(vehicleOpenBtn);
        game.menuScreen = 'vehicle';
        refreshUnlocks(); // 刷新解锁状态
        return;
      }
      if (hit(rankOpenBtn)) {
        markPress(rankOpenBtn);
        game.menuScreen = 'rank';
        loadRank();
        return;
      }
      /* 开始按钮: 应用当前载具(贴图可能刚加载完, 重新算尺寸) */
      if (hit(startBtn)) {
        markPress(startBtn);
        game.started = true;
        applyVehicle(player.vehicle);
        spawnInitialEnemies(INITIAL_ENEMIES); // 开局一批敌人
        SFX.play('start');
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
  /* 暂停 / 音量 按钮 */
  if (hitBtn(pauseBtn)) {
    markPress(pauseBtn);
    game.paused = !game.paused;
    return;
  }
  if (hitBtn(soundBtn)) {
    markPress(soundBtn);
    const v = SFX.getVolume();
    SFX.setVolume(v > 0.75 ? 0.5 : v > 0.25 ? 0 : 1); // 100% → 50% → 0 → 100%
    return;
  }
  if (game.paused) {
    /* 暂停界面: 仅「返回开始界面」可点 */
    if (hitBtn(pauseHomeBtn)) {
      markPress(pauseHomeBtn);
      resetGame();
      game.started = false; // 退回开始界面
    }
    return;
  }
  /* 点击回血按钮 → 消耗 1 个外卖回血 */
  if (hitBtn(foodBtn)) {
    markPress(foodBtn);
    useFood();
    return;
  }
  /* 点击投掷按钮 → 丢出外卖锁定敌人 */
  if (hitBtn(throwBtn)) {
    markPress(throwBtn);
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
