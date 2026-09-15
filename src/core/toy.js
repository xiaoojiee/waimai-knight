'use strict';

/* B站 Toy JS SDK 封装: 非 Toy 环境自动降级(返回 null / 不解锁) */

/* global refreshUnlocks, AUTHOR_NAME, VIDEO_TITLE */

const Toy = (() => {
  const VIDEO_BVID = 'BV1XwtB6YECv'; // 绑定视频
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
      /* 模拟作者/视频信息(仅本地预览用; 换 BV 号后需同步更新) */
      getAuthorProfile: () =>
        Promise.resolve({
          status: 'ok',
          data: {
            nickname: '火山哥哥',
            face: 'https://i1.hdslb.com/bfs/face/4327bd8f5452e59b98ef92ac082cadcc5d2d05e6.jpg',
          },
        }),
      getAuthorVideos: () =>
        Promise.resolve({
          items: [
            {
              bvid: VIDEO_BVID,
              title: '点击即玩最战斗爽的牛来救妈游戏！没有bug，全是特性！',
              pic: 'https://i1.hdslb.com/bfs/archive/e3a91a18d32ec6115946bb056aa560dcc26b3e79.jpg',
            },
          ],
        }),
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
    s.src = '//s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js'; // 协议相对地址, 与 SDK 文档接入方式一致
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

  /* ---- UP 头像 / 视频封面: 与 BV 号(视频)和 UID(作者)同步 ---- */
  const avatarImg = new Image();
  const coverImg = new Image();
  /* B站 图床有防盗链: 非 bilibili Referer 会 403, 不带 Referer 则放行 */
  avatarImg.referrerPolicy = 'no-referrer';
  coverImg.referrerPolicy = 'no-referrer';
  const info = { name: '', title: '' };
  let mediaLoaded = false;
  /* 取 URL 时优先官方 SDK(无跨域限制), 失败再直连 B站接口
   * (接口只在 Origin 为 www.bilibili.com 时放行, 即 Toy 内) */
  async function loadMedia() {
    if (mediaLoaded) return;
    mediaLoaded = true;
    let avatarUrl = '';
    let coverUrl = '';
    /* 1) 官方 SDK */
    try {
      const t = sdk();
      if (t) {
        if (typeof t.getAuthorProfile === 'function') {
          const p = await t.getAuthorProfile();
          const d = p && (p.data || p);
          if (d) {
            avatarUrl = d.face || d.avatar || d.face_url || '';
            info.name = d.nickname || d.name || info.name;
          }
        }
        if (typeof t.getAuthorVideos === 'function') {
          const v = await t.getAuthorVideos({ videos: [{ bvid: VIDEO_BVID }] });
          const arr = v && (v.items || (v.data && (v.data.items || v.data)));
          const it = Array.isArray(arr) ? arr[0] : null;
          if (it) {
            coverUrl = it.pic || it.cover || it.cover_url || '';
            info.title = it.title || info.title;
          }
        }
      }
    } catch (_) {}
    /* 2) 直连 B站 web 接口兜底 */
    if (!avatarUrl || !coverUrl || !info.title) {
      try {
        const r = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + VIDEO_BVID);
        const j = await r.json();
        const d = j && j.data;
        if (d) {
          if (!coverUrl && d.pic) coverUrl = d.pic;
          if (!avatarUrl && d.owner && d.owner.face) avatarUrl = d.owner.face;
          if (!info.title && d.title) info.title = d.title;
          if (!info.name && d.owner && d.owner.name) info.name = d.owner.name;
        }
      } catch (_) {}
    }
    /* 接口返回的封面可能是 http:// → 升级为 https, 避免被混合内容拦截 */
    if (avatarUrl) avatarImg.src = avatarUrl.replace(/^http:/, 'https:');
    if (coverUrl) coverImg.src = coverUrl.replace(/^http:/, 'https:');
  }
  function authorName() {
    return info.name || AUTHOR_NAME;
  }
  function videoTitle() {
    return info.title || VIDEO_TITLE;
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
    loadMedia,
    avatar: () => avatarImg,
    cover: () => coverImg,
    authorName,
    videoTitle,
  };
})();
