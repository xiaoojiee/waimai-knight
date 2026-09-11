'use strict';

/* B站 Toy JS SDK 封装: 非 Toy 环境自动降级(返回 null / 不解锁) */

/* global refreshUnlocks */

const Toy = (() => {
  const VIDEO_BVID = 'BV1XwtB6YECv'; // 测试视频
  const AUTHOR_UID = '137429365'; // UP 主 uid

  /* ---- 本地模拟(?mock=1): 注入假的 window.toy, 便于在普通浏览器测试 ---- */
  const MOCK_KEY = 'toyMockState';
  let mockState = null;
  function isMock() {
    return mockState !== null;
  }
  function installMock() {
    const raw = JSON.parse(localStorage.getItem(MOCK_KEY) || '{}');
    mockState = {
      liked: !!raw.liked,
      coin: !!raw.coin,
      fav: !!raw.fav,
      following: !!raw.following,
    };
    const save = () => localStorage.setItem(MOCK_KEY, JSON.stringify(mockState));
    const fakeList = () => {
      const base = [
        { rank: 1, score: 9999, nickname: '肥嘟嘟冠军' },
        { rank: 2, score: 8200, nickname: '风一样的外卖员' },
        { rank: 3, score: 6600, nickname: '牛来！！' },
        { rank: 4, score: 5200, nickname: '提新车了' },
        { rank: 5, score: 4100, nickname: '心脏有点问题' },
        { rank: 6, score: 3000, nickname: '腿着跑' },
      ];
      const my = Number(localStorage.getItem('toyMockScore') || 0);
      if (my > 0) {
        base.push({ rank: 0, score: my, nickname: '我' });
        base.sort((a, b) => b.score - a.score);
        base.forEach((it, i) => (it.rank = i + 1));
      }
      return base;
    };
    window.toy = {
      getVideoUserActions: () =>
        Promise.resolve({
          items: [
            {
              status: 'ok',
              liked: mockState.liked,
              coinCount: mockState.coin ? 2 : 0,
              favorited: mockState.fav,
            },
          ],
        }),
      getAuthorRelation: () =>
        Promise.resolve({ status: 'ok', data: { isFollowing: mockState.following } }),
      submitScore: (req) => {
        const my = Number(localStorage.getItem('toyMockScore') || 0);
        if (req.score > my) localStorage.setItem('toyMockScore', String(req.score));
        return Promise.resolve({ score: Math.max(my, req.score) });
      },
      getRankList: () => Promise.resolve(fakeList()),
      getMyRank: () => {
        const my = Number(localStorage.getItem('toyMockScore') || 0);
        const list = fakeList();
        const me = list.find((it) => it.nickname === '我');
        return Promise.resolve({ ranked: !!me, rank: me ? me.rank : 0, score: my });
      },
      navigate: (req) => {
        console.log('[mock toy.navigate]', req);
        return Promise.resolve();
      },
    };
    window.__toyMock = {
      state: mockState,
      toggle(k) {
        mockState[k] = !mockState[k];
        save();
      },
    };
  }
  const mockMode = typeof location !== 'undefined' && location.search.indexOf('mock') >= 0;
  if (typeof window !== 'undefined' && !window.toy && mockMode) {
    installMock();
  }
  /* 异步动态加载真 SDK: 不阻塞页面; 模拟模式跳过; 加载完刷新一次解锁状态 */
  function loadSdk() {
    if (mockMode || typeof document === 'undefined') return;
    const s = document.createElement('script');
    s.src = 'https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js';
    s.async = true;
    s.onerror = () => {};
    s.onload = () => {
      if (typeof refreshUnlocks === 'function') refreshUnlocks();
    };
    document.head.appendChild(s);
  }
  loadSdk();

  function sdk() {
    return typeof window !== 'undefined' && window.toy ? window.toy : null;
  }
  function available() {
    return !!sdk();
  }

  /* 当前用户对该视频的 点赞/投币/收藏 */
  async function getVideoActions() {
    const t = sdk();
    if (!t || typeof t.getVideoUserActions !== 'function') return null;
    try {
      const res = await t.getVideoUserActions({ videos: [{ bvid: VIDEO_BVID }] });
      const item = res && res.items && res.items[0];
      if (!item || item.status !== 'ok') return null;
      return { liked: !!item.liked, coin: (item.coinCount || 0) > 0, fav: !!item.favorited };
    } catch (_) {
      return null;
    }
  }
  /* 当前用户是否关注了作者 */
  async function getAuthorRelation() {
    const t = sdk();
    if (!t || typeof t.getAuthorRelation !== 'function') return null;
    try {
      const res = await t.getAuthorRelation();
      if (!res || res.status !== 'ok' || !res.data) return null;
      return { following: !!res.data.isFollowing };
    } catch (_) {
      return null;
    }
  }
  /* 提交里程分数(榜位 1) */
  async function submitScore(score) {
    const t = sdk();
    if (!t || typeof t.submitScore !== 'function') return;
    try {
      await t.submitScore({ board: 1, score });
    } catch (_) {}
  }
  /* 排行榜(榜位 1, 总榜) */
  async function getRankList(limit) {
    const t = sdk();
    if (!t || typeof t.getRankList !== 'function') return null;
    try {
      return await t.getRankList({ board: 1, period: 'all', limit: limit || 50 });
    } catch (_) {
      return null;
    }
  }
  async function getMyRank() {
    const t = sdk();
    if (!t || typeof t.getMyRank !== 'function') return null;
    try {
      return await t.getMyRank({ board: 1, period: 'all' });
    } catch (_) {
      return null;
    }
  }
  function navigate(type, id) {
    const t = sdk();
    if (!t || typeof t.navigate !== 'function') return;
    try {
      t.navigate({ type: type, id: id }).catch(() => {});
    } catch (_) {}
  }
  function openVideo() {
    navigate('video', VIDEO_BVID);
  }
  function openAuthor() {
    navigate('space', AUTHOR_UID);
  }

  return {
    VIDEO_BVID,
    AUTHOR_UID,
    available,
    getVideoActions,
    getAuthorRelation,
    submitScore,
    getRankList,
    getMyRank,
    navigate,
    openVideo,
    openAuthor,
    isMock,
  };
})();
