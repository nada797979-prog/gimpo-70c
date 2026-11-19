/* ============================================================
   김포 70C 전담 버스 앱
   - 시간표: 김포시 게시 시간표 (2025.07.01 시내버스 정규노선 전환)
   - 노선·정류장: 경기버스정보 routeId 232000145 (18개 지점)
   - 실시간: 공공데이터포털 경기도 버스위치정보 v2 (buslocationservice/v2)
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. 실시간 버스위치 API (공공데이터포털 · 경기도 버스위치정보 v2)
     ---------------------------------------------------------
     · apis.data.go.kr 이 Access-Control-Allow-Origin 을 직접 돌려주어
       중계 서버 없이 브라우저에서 바로 호출합니다.
     · 허용된 출처(예: https://nada797979-prog.github.io)가 아니거나, 오프라인·오류·
       file:// 로 열었을 때는 자동으로 시간표 기반 예상 위치로 돌아갑니다.
     · 일일 호출 한도(1,000건)를 지키기 위해 앱이 화면에 보일 때만 30초마다 조회합니다.
  */
  const LIVE = {
    enabled: true,
    url: 'https://apis.data.go.kr/6410000/buslocationservice/v2/getBusLocationListv2',
    arrivalUrl: 'https://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalItemv2',
    serviceKey: '21a4bdbe7fe639098c01f29e3857f08fd7a62d8ea53170d8506badaaac2b95e6',
    routeId: '232000145',
    intervalMs: 30000,
    minGapMs: 5000
  };

  /* ---------------------------------------------------------
     1. 시간표 (기점 = 힐스테이트리버시티2단지정문 출발)
     --------------------------------------------------------- */
  const WEEKDAY = [
    '06:00','06:30','06:40','06:50','07:00','07:10','07:20','07:30','07:40','07:50',
    '08:00','08:10','08:20','08:30','08:55','09:20','09:45','10:20','10:50','11:20',
    '12:00','12:40','13:20','13:50','14:20','14:50','15:15','15:40','16:05','16:30',
    '16:55','17:15','17:35','17:55','18:15','18:40','19:05','19:30','19:55','20:20',
    '20:45','21:10','21:35','22:00'
  ];
  const WEEKEND = [
    '06:00','06:20','06:45','07:10','07:35','08:00','08:25','08:50','09:15','09:40',
    '10:10','10:40','11:10','11:50','12:30','13:10','13:40','14:05','14:30','14:55',
    '15:20','15:45','16:10','16:35','17:00','17:25','17:50','18:15','18:40','19:05',
    '19:30','20:00','20:30','21:00','21:30','22:00'
  ];

  /* 공휴일 (토·일·공휴일 시간표 적용). 매년 초에 새 날짜를 더해 주세요. */
  const HOLIDAYS = new Set([
    // 2026
    '2026-01-01',
    '2026-02-16','2026-02-17','2026-02-18',
    '2026-03-01','2026-03-02',
    '2026-05-05','2026-05-24','2026-05-25',
    '2026-06-06',
    '2026-08-15',
    '2026-09-24','2026-09-25','2026-09-26',
    '2026-10-03','2026-10-09',
    '2026-12-25',
    // 2027
    '2027-01-01',
    '2027-02-06','2027-02-07','2027-02-08',
    '2027-03-01',
    '2027-05-05','2027-05-13',
    '2027-06-06','2027-06-07',
    '2027-08-15','2027-08-16',
    '2027-09-14','2027-09-15','2027-09-16',
    '2027-10-03','2027-10-04','2027-10-09',
    '2027-12-25'
  ]);

  /* ---------------------------------------------------------
     2. 노선 (경기버스정보 route_id 232000145 · 18개 지점)
        t = 기점 출발 후 경과 분(추정 표정속도)
     --------------------------------------------------------- */
  const STOPS = [
    { i: 1,  code: '35179', sid: '232000059',     name: '힐스테이트리버시티2단지정문', label: ['힐스테이트2단지', '정문'], dir: 'up',   t: 0,  tag: '기점', addr: '경기도 김포시 고촌읍 향산리 67-1',   lat: 37.619174, lng: 126.748100 },
    { i: 2,  code: '35197', sid: '232000065',     name: '힐스테이트리버시티2단지후문', label: ['힐스테이트2단지', '후문'], dir: 'up',   t: 1,  addr: '경기도 김포시 고촌읍 향산리 78-5',   lat: 37.621899, lng: 126.748372 },
    { i: 3,  code: '35235', sid: '232000066',     name: '힐스테이트리버시티1단지후문', label: ['힐스테이트1단지', '후문'], dir: 'up',   t: 2,  addr: '경기도 김포시 고촌읍 향산리 123-1',  lat: 37.622344, lng: 126.746263 },
    { i: 4,  code: '35248', sid: '232000069',     name: '힐스테이트리버시티1단지정문', label: ['힐스테이트1단지', '정문'], dir: 'up',   t: 3,  addr: '경기도 김포시 고촌읍 향산리 93-10',  lat: 37.621586, lng: 126.742919 },
    { i: 5,  code: '35273', sid: '232000358',     name: '장곡.고촌고등학교',           label: ['장곡·고촌', '고등학교'],   dir: 'up',   t: 5,  addr: '경기도 김포시 고촌읍 태리 296-8',    lat: 37.605797, lng: 126.749231 },
    { i: 6,  code: '35277', sid: '232000356',     name: '고촌역',                     label: ['고촌역'],                 dir: 'up',   t: 7,  addr: '경기도 김포시 고촌읍 신곡리 573-1',  lat: 37.600549, lng: 126.770710 },
    { i: 7,  code: '', sid: '277103819',          name: '고촌IC',                     label: ['고촌IC', '미정차'],        dir: 'up',   t: 9,  pass: true },
    { i: 8,  code: '277102507', sid: '277102507', name: '개화사거리',                 label: ['개화사거리', '미정차'],    dir: 'up',   t: 11, pass: true },
    { i: 9,  code: '16972', sid: '115000948',     name: '김포공항역3번출구',           label: ['김포공항역', '3번출구'],   dir: 'up',   t: 14, tag: '회차·종점' },
    { i: 10, code: '277102070', sid: '277102070', name: '김포공항입구',               label: ['김포공항입구', '미정차'],  dir: 'down', t: 18, pass: true },
    { i: 11, code: '277102047', sid: '277102047', name: '개화사거리',                 label: ['개화사거리', '미정차'],    dir: 'down', t: 20, pass: true },
    { i: 12, code: '', sid: '277103820',          name: '고촌IC',                     label: ['고촌IC', '미정차'],        dir: 'down', t: 22, pass: true },
    { i: 13, code: '35278', sid: '232000432',     name: '고촌역',                     label: ['고촌역'],                 dir: 'down', t: 25, addr: '경기도 김포시 고촌읍 신곡리 1100',   lat: 37.601706, lng: 126.770235 },
    { i: 14, code: '35514', sid: '232000584',     name: '장곡.고촌고등학교',           label: ['장곡·고촌', '고등학교'],   dir: 'down', t: 27, addr: '경기도 김포시 고촌읍 태리 296-13',   lat: 37.606255, lng: 126.748760 },
    { i: 15, code: '35256', sid: '232000070',     name: '힐스테이트리버시티1단지정문', label: ['힐스테이트1단지', '정문'], dir: 'down', t: 29, addr: '경기도 김포시 고촌읍 향산리 109-1',  lat: 37.621083, lng: 126.742823 },
    { i: 16, code: '35243', sid: '232000068',     name: '힐스테이트리버시티1단지후문', label: ['힐스테이트1단지', '후문'], dir: 'down', t: 30, addr: '경기도 김포시 고촌읍 향산리 123-2',  lat: 37.622155, lng: 126.746268 },
    { i: 17, code: '35183', sid: '232000064',     name: '힐스테이트리버시티2단지후문', label: ['힐스테이트2단지', '후문'], dir: 'down', t: 31, addr: '경기도 김포시 고촌읍 향산리 78-5',   lat: 37.621738, lng: 126.748307 },
    { i: 18, code: '35182', sid: '232000060',     name: '힐스테이트리버시티2단지정문', label: ['힐스테이트2단지', '정문'], dir: 'down', t: 32, tag: '종점', addr: '경기도 김포시 고촌읍 향산리 27-6',   lat: 37.619393, lng: 126.747981 }
  ];

  const OUT_END = 14;   // 기점 → 김포공항역 소요
  const TURN_END = 17;  // 김포공항역 회차(3분)
  const RT = 32;        // 기점 출발 → 기점 도착 (한 바퀴)

  // 정차 정류장이 몰린 구간(고촌역까지)은 넓게, 미정차 구간(고촌IC~김포공항)은 짧게
  const UP_DENSE_END = 7;      // 상행 마지막 정차 정류장(고촌역)
  const DOWN_DENSE_START = 25; // 하행 첫 정차 정류장(고촌역)

  const GEO = {
    W: 360, H: 516,
    xL: 136, xR: 224,
    yTop: 50, yBot: 488, dip: 26,
    dense: 280, express: 158
  };
  const LABEL_GAP = 31;   // 정류장 점 ↔ 이름 사이 여백 (버스 아이콘와 겹치지 않게)

  /* ---------------------------------------------------------
     3. 시간 도우미
     --------------------------------------------------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const fmtHM = (m) => {
    const v = ((m % 1440) + 1440) % 1440;
    return pad(Math.floor(v / 60)) + ':' + pad(Math.round(v % 60));
  };
  const nowMin = (d) => { const x = d || new Date(); return x.getHours() * 60 + x.getMinutes() + x.getSeconds() / 60; };
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const WEEKDAY_MIN = WEEKDAY.map(toMin);
  const WEEKEND_MIN = WEEKEND.map(toMin);

  function serviceTypeOf(date) {
    const day = date.getDay();
    if (day === 0 || day === 6) return 'weekend';
    if (HOLIDAYS.has(ymd(date))) return 'weekend';
    return 'weekday';
  }
  function serviceLabel(type, date) {
    if (type === 'weekday') return '평일';
    const day = date.getDay();
    if (HOLIDAYS.has(ymd(date))) return '공휴일';
    return day === 6 ? '토요일' : '일요일';
  }
  const depsFor = (type) => (type === 'weekday' ? WEEKDAY_MIN : WEEKEND_MIN);

  /* ---------------------------------------------------------
     4. 상태
     --------------------------------------------------------- */
  /* 일일 호출 한도(1,000건) 보호: 오늘 보낸 호출 수를 세어 두고, 많이 쓰면 간격을 늘립니다 */
  const QUOTA_KEY = 'g70c.calls';
  function bumpQuota() {
    try {
      const today = ymd(new Date());
      const raw = JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}');
      if (raw.date !== today) { raw.date = today; raw.n = 0; }
      raw.n = (raw.n || 0) + 1;
      localStorage.setItem(QUOTA_KEY, JSON.stringify(raw));
      return raw.n;
    } catch (e) { return 0; }
  }
  function pollInterval() {
    try {
      const raw = JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}');
      if (raw.date === ymd(new Date())) {
        if (raw.n > 930) return 300000;   // 거의 다 씀 → 5분
        if (raw.n > 820) return 120000;   // 80% 이상 → 2분
      }
    } catch (e) { /* private mode */ }
    return LIVE.intervalMs;
  }

  const state = {
    tab: 'route',
    ttType: null,
    favs: [],
    live: null,          // { at, queryTime, buses: [...] }
    liveAt: 0,
    liveBusy: false,
    liveError: '',
    lastFetch: 0,
    arrivals: new Map(), // stop.i -> { at, data, error, busy }
    activeStopId: null,
    speed: 1,
    simTime: nowMin(),
    lastFrame: performance.now(),
    busNodes: new Map()
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  /* ---------------------------------------------------------
     5. 노선도 좌표
     --------------------------------------------------------- */
  function pointAt(t) {
    const { xL, xR, yTop, yBot, dense, express, dip } = GEO;
    if (t <= OUT_END) {
      const y = t <= UP_DENSE_END
        ? yTop + (Math.max(0, t) / UP_DENSE_END) * dense
        : yTop + dense + ((t - UP_DENSE_END) / (OUT_END - UP_DENSE_END)) * express;
      return { x: xL, y };
    }
    if (t <= TURN_END) {
      const r = (t - OUT_END) / (TURN_END - OUT_END);
      return { x: xL + r * (xR - xL), y: yBot + Math.sin(r * Math.PI) * dip };
    }
    const y = t <= DOWN_DENSE_START
      ? yBot - ((t - TURN_END) / (DOWN_DENSE_START - TURN_END)) * express
      : yBot - express - ((t - DOWN_DENSE_START) / (RT - DOWN_DENSE_START)) * dense;
    return { x: xR, y };
  }

  /* ---------------------------------------------------------
     6. SVG 노선도 그리기
     --------------------------------------------------------- */
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function buildDiagram() {
    const svg = $('#routeSvg');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${GEO.W} ${GEO.H}`);

    const defs = el('defs');
    defs.innerHTML = `
      <linearGradient id="gUp" gradientUnits="userSpaceOnUse" x1="${GEO.xL}" y1="${GEO.yTop}" x2="${GEO.xL}" y2="${GEO.yBot}">
        <stop offset="0" stop-color="#5B9BFF"/><stop offset="1" stop-color="#2563EB"/>
      </linearGradient>
      <linearGradient id="gDown" gradientUnits="userSpaceOnUse" x1="${GEO.xR}" y1="${GEO.yBot}" x2="${GEO.xR}" y2="${GEO.yTop}">
        <stop offset="0" stop-color="#0FB5A0"/><stop offset="1" stop-color="#38D9C0"/>
      </linearGradient>
      <linearGradient id="gBus" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4F8DFF"/><stop offset=".55" stop-color="#2563EB"/><stop offset="1" stop-color="#0FB5A0"/>
      </linearGradient>
      <filter id="busShadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="2.2" stdDeviation="2.4" flood-color="#12325C" flood-opacity=".34"/>
      </filter>`;
    svg.appendChild(defs);

    // 트랙(전체 바퀴)
    const all = [];
    for (let t = 0; t <= RT; t += 0.08) { const p = pointAt(t); all.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`); }
    svg.appendChild(el('path', { d: 'M ' + all.join(' L '), fill: 'none', stroke: '#DCE5F1', 'stroke-width': 12.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

    // 상행 / 하행 / 회차
    const seg = (t0, t1) => {
      const pts = [];
      for (let t = t0; t <= t1 + 1e-6; t += 0.05) { const p = pointAt(t); pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`); }
      return 'M ' + pts.join(' L ');
    };
    svg.appendChild(el('path', { d: seg(0, OUT_END), fill: 'none', stroke: 'url(#gUp)', 'stroke-width': 7.6, 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { d: seg(TURN_END, RT), fill: 'none', stroke: 'url(#gDown)', 'stroke-width': 7.6, 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { d: seg(OUT_END, TURN_END), fill: 'none', stroke: '#BFD0E4', 'stroke-width': 6, 'stroke-dasharray': '2 7.5', 'stroke-linecap': 'round' }));

    // 방면 캡션
    const capY = GEO.yTop - 30;
    const capL = el('text', { x: GEO.xL - LABEL_GAP, y: capY, 'text-anchor': 'end', class: 'dir-caption up' }, '↓ 김포공항역 방면');
    const capR = el('text', { x: GEO.xR + LABEL_GAP, y: capY, 'text-anchor': 'start', class: 'dir-caption down' }, '↑ 힐스테이트 방면');
    svg.appendChild(capL); svg.appendChild(capR);

    // 정류장 (미정차 구간은 노선도에 그리지 않음 — 내부 시퀀스는 1~18 그대로 유지)
    STOPS.filter((s) => !s.pass).forEach((s) => {
      const p = pointAt(s.t);
      const g = el('g', { class: 'stop-g' + (s.tag ? ' terminus' : ''), 'data-stop': s.i });
      g.appendChild(el('circle', { class: 'stop-halo', cx: p.x, cy: p.y, r: 17, fill: s.dir === 'up' ? 'rgba(37,99,235,.13)' : 'rgba(15,181,160,.15)' }));
      if (s.tag) {
        g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 8.4, fill: '#fff', stroke: s.dir === 'up' ? '#2563EB' : '#0FB5A0', 'stroke-width': 2.8 }));
        g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 3.6, fill: s.dir === 'up' ? '#2563EB' : '#0FB5A0' }));
      } else {
        g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 6, fill: '#fff', stroke: s.dir === 'up' ? '#2563EB' : '#0FB5A0', 'stroke-width': 2.6 }));
      }

      const anchor = s.dir === 'up' ? 'end' : 'start';
      const lx = s.dir === 'up' ? p.x - LABEL_GAP : p.x + LABEL_GAP;
      const twoLine = !!s.label[1];
      const y1 = twoLine ? p.y - 5.6 : p.y + 5.6;
      const t1 = el('text', { x: lx, y: y1, 'text-anchor': anchor, class: 'stop-label-1' }, s.label[0]);
      g.appendChild(t1);
      if (twoLine) {
        const t2 = el('text', { x: lx, y: p.y + 13.4, 'text-anchor': anchor, class: 'stop-label-2' }, s.label[1]);
        g.appendChild(t2);
      }

      // 넉넉한 터치 영역 (점 + 이름 전체)
      g.appendChild(el('rect', {
        x: s.dir === 'up' ? p.x - 140 : p.x - 4,
        y: p.y - 19,
        width: 144,
        height: 38,
        rx: 17,
        fill: 'rgba(0,0,0,0)',
        class: 'stop-hit'
      }));
      g.appendChild(el('circle', { cx: p.x, cy: p.y, r: 22, fill: 'rgba(0,0,0,0)', class: 'stop-hit' }));
      g.addEventListener('click', (e) => { e.stopPropagation(); openSheet(s.i); });
      svg.appendChild(g);
    });

    // 버스 레이어
    const layer = el('g', { id: 'busLayer' });
    layer.style.cursor = 'pointer';
    layer.addEventListener('click', (e) => {
      const g = e.target.closest('.bus');
      if (!g || !g.dataset.stop) return;
      e.stopPropagation();
      openSheet(Number(g.dataset.stop));
    });
    svg.appendChild(layer);
  }

  /* ---------------------------------------------------------
     7. 운행 중인 버스 계산
     --------------------------------------------------------- */
  function activeTrips(absMin) {
    const out = [];
    const today = new Date();
    for (let d = -1; d <= 1; d++) {
      const date = addDays(today, d);
      const type = serviceTypeOf(date);
      depsFor(type).forEach((m) => {
        const dep = d * 1440 + m;
        const t = absMin - dep;
        if (t >= 0 && t < RT) out.push({ dep, t, type });
      });
    }
    return out.sort((a, b) => b.t - a.t);
  }

  function nextStopFor(t) {
    if (t < OUT_END) return STOPS.find((s) => s.dir === 'up' && s.t >= t - 0.001 && s.t > 0);
    if (t < TURN_END) return null;
    return STOPS.find((s) => s.dir === 'down' && s.t >= t - 0.001);
  }

  function vehiclesAt(absMin) {
    return activeTrips(absMin).map((tr) => {
      const dir = tr.t < OUT_END ? 'up' : (tr.t < TURN_END ? 'turn' : 'down');
      const ns = nextStopFor(tr.t);
      const eta = ns ? Math.max(0, ns.t - tr.t) : 0;
      return {
        key: tr.dep.toFixed(2),
        t: tr.t,
        dir: dir,
        stop: ns,
        prev: prevStopFor(tr.t),
        eta: eta,
        progress: tr.t / RT
      };
    });
  }

  const CROWD = { 1: '여유', 2: '보통', 3: '혼잡', 4: '매우혼잡' };
  const CROWD_COLOR = { 1: '#0FB5A0', 2: '#3B82F6', 3: '#F59E0B', 4: '#EF4444' };

  function busSvg() {
    const g = el('g', { class: 'bus' });
    g.innerHTML = `
      <circle class="bus-pulse" cx="0" cy="0" r="21" fill="rgba(37,99,235,.16)"></circle>
      <ellipse cx="0" cy="18.3" rx="18.9" ry="4.6" fill="rgba(16,32,56,.16)"></ellipse>
      <g filter="url(#busShadow)">
        <rect x="-23.2" y="-15.1" width="46.4" height="29.6" rx="7.8" fill="url(#gBus)"></rect>
        <rect x="-18.3" y="-10.7" width="15.1" height="8.1" rx="2.3" fill="#EAF3FF" opacity=".95"></rect>
        <rect x="-0.6" y="-10.7" width="15.1" height="8.1" rx="2.3" fill="#EAF3FF" opacity=".95"></rect>
        <text class="bus-num" x="0" y="11.4" text-anchor="middle" font-size="10.7" font-weight="800" fill="#FFFFFF" letter-spacing=".02em">70C</text>
      </g>
      <circle cx="-13.3" cy="15.2" r="3.9" fill="#16233A"></circle>
      <circle cx="13.3" cy="15.2" r="3.9" fill="#16233A"></circle>
      <g class="bus-flags" style="display:none">
        <rect x="24.7" y="-6.8" width="30.5" height="13.6" rx="4.4" fill="#0B7F72"></rect>
        <text x="39.9" y="3.3" text-anchor="middle" font-size="9.1" font-weight="800" fill="#EAFFFB">저상</text>
      </g>`;
    return g;
  }

  function prevStopFor(t) {
    if (t < OUT_END) {
      const up = STOPS.filter((s) => s.dir === 'up' && s.t < t);
      return up.length ? up[up.length - 1] : null;
    }
    if (t < TURN_END) return STOPS[8];
    const dn = STOPS.filter((s) => s.dir === 'down' && s.t < t);
    return dn.length ? dn[dn.length - 1] : STOPS[8];
  }

  function liveActive() { return !!(state.live && state.live.buses && (Date.now() - state.liveAt) < 120000); }

  function liveVehicleList() {
    return state.live.buses.map((b) => {
      const t = Math.min(RT - 0.3, (b.stop ? b.stop.t : 0) + 0.7);
      const ns = nextStopFor(t);
      return {
        key: 'lv-' + b.vehId,
        t: t,
        dir: t < OUT_END ? 'up' : (t < TURN_END ? 'turn' : 'down'),
        stop: ns,
        prev: prevStopFor(t),
        eta: ns ? Math.max(0, ns.t - t) : 0,
        live: b
      };
    });
  }

  function paintBuses() {
    const layer = document.getElementById('busLayer');
    if (!layer) return;

    const list = liveActive() ? liveVehicleList() : vehiclesAt(state.simTime);

    const seen = new Set();
    list.forEach((v) => {
      seen.add(v.key);
      let node = state.busNodes.get(v.key);
      if (!node) {
        node = busSvg();
        node.dataset.key = v.key;
        layer.appendChild(node);
        state.busNodes.set(v.key, node);
      }
      const p = pointAt(v.t);
      node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      node.classList.toggle('is-turning', v.dir === 'turn');
      node.classList.toggle('is-live', !!v.live);
      node.dataset.stop = v.stop ? String(v.stop.i) : '';

      const num = node.querySelector('.bus-num');
      const label = v.live ? (v.live.num || '70C') : '70C';
      if (num.textContent !== label) num.textContent = label;

      const showFlags = !!(v.live && v.live.low);
      const flags = node.querySelector('.bus-flags');
      const disp = showFlags ? '' : 'none';
      if (flags.style.display !== disp) flags.style.display = disp;
      flags.setAttribute('transform', v.dir === 'down' ? 'translate(-80 0)' : 'translate(0 0)');

      const pulse = node.querySelector('.bus-pulse');
      if (v.live) {
        const col = CROWD_COLOR[v.live.crowded] || '#3B82F6';
        pulse.setAttribute('fill', col);
        pulse.setAttribute('fill-opacity', '.26');
      } else {
        pulse.setAttribute('fill', 'rgba(37,99,235,.18)');
        pulse.removeAttribute('fill-opacity');
      }
    });

    state.busNodes.forEach((node, key) => {
      if (!seen.has(key)) { node.remove(); state.busNodes.delete(key); }
    });

    renderBusList(list);
    return list;
  }

  /* ---------------------------------------------------------
     8. 상단 요약 · 시계
     --------------------------------------------------------- */
  let lastListPaint = 0;
  function renderBusList(list) {
    const card = $('#busesCard'), wrap = $('#busesList');
    if (!card || !wrap) return;
    if (!list.length) { card.hidden = true; wrap.innerHTML = ''; return; }
    card.hidden = false;
    $('#busesCount').textContent = list.length + '대';
    const now = performance.now();
    if (now - lastListPaint < 900) return;
    lastListPaint = now;
    wrap.innerHTML = list.map((v) => {
      const live = v.live;
      const dirText = v.dir === 'up' ? '김포공항역 방면'
        : (v.dir === 'down' ? '힐스테이트2단지 방면' : '김포공항역 회차 중');
      let where;
      if (v.dir === 'turn') {
        where = '김포공항역 3번출구에서 회차 중';
      } else {
        const p = v.prev ? v.prev.label[0] + ' 지나' : '기점 출발';
        const n = v.stop ? '다음 ' + v.stop.label[0] : '종점 도착';
        where = p + ' · ' + n;
      }
      const eta = v.dir === 'turn' ? '회차'
        : (v.stop ? Math.max(1, Math.round(v.eta)) + '분 후' : '');
      const head = live ? `${live.num}호${live.low ? ' · 저상' : ''}` : dirText;
      const sub = live ? `${dirText} · ${where}` : where;
      const crowd = (live && live.crowded)
        ? `<span class="crowd c${live.crowded}">${CROWD[live.crowded] || ''}</span>` : '';
      return `<div class="bus-row ${v.dir}${live ? ' live' : ''}">
        <span class="bus-mark"></span>
        <div class="bus-row-main">
          <span class="bus-dir">${head}${crowd}</span>
          <span class="bus-where">${sub}</span>
        </div>
        <span class="bus-eta">${eta}</span>
      </div>`;
    }).join('');
  }

  function updateSummary(list) {
    const v = list || (liveActive() ? liveVehicleList() : vehiclesAt(state.simTime));
    const up = v.filter((x) => x.dir === 'up').length;
    const turn = v.filter((x) => x.dir === 'turn').length;
    const down = v.filter((x) => x.dir === 'down').length;
    $('#sumRunning').textContent = v.length + '대';
    $('#sumUp').textContent = (up + turn) + '대';
    $('#sumDown').textContent = down + '대';

    const sub = $('#diagramSub');
    if (state.speed !== 1) {
      sub.textContent = '데모 30배속 — 실제 시각과 다릅니다';
    } else if (!v.length) {
      const deps = depsFor(serviceTypeOf(new Date()));
      const next = deps.find((m) => m > state.simTime);
      sub.textContent = next != null
        ? `지금은 운행 중인 버스가 없어요 · 다음 출발 ${fmtHM(next)}`
        : '오늘 운행이 모두 끝났어요 · 내일 06:00 첫차';
    } else {
      sub.textContent = '버스를 누르면 다음 정류장, 정류장을 누르면 도착 시간';
    }
  }

  function updateClock() {
    const el = $('#clock');
    if (liveActive() && state.live.queryTime) {
      el.textContent = state.live.queryTime.slice(11, 16);
      return;
    }
    const d = new Date();
    el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function updateServicePill() {
    const d = new Date();
    const type = serviceTypeOf(d);
    const label = serviceLabel(type, d);
    const n = depsFor(type).length;
    const live = liveActive();
    $('#servicePill').textContent = `오늘 ${label} · ${n}회`;
    $('#sourcePill').classList.toggle('live', live);
    $('#sourcePill').querySelector('.dot').className = 'dot ' + (live ? 'green live' : 'amber');
    $('#sourceText').textContent = live ? '실시간 운행 연동' : '시간표 기반 예상 위치';
    $('#clockSuffix').textContent = live ? '갱신' : '기준';
    // 실시간 모드에서는 데모 배속이 의미가 없으므로 감춥니다
    const spd = $('#speedBtn');
    if (spd) {
      spd.hidden = live;
      if (live && state.speed !== 1) { state.speed = 1; state.simTime = nowMin(); spd.textContent = '1×'; spd.classList.remove('on'); }
    }
  }

  /* ---------------------------------------------------------
     9. 정류장 도착 정보
     --------------------------------------------------------- */
  function arrivalsAt(stop, fromAbs, limit) {
    const out = [];
    const base = new Date();
    for (let d = -1; d <= 2; d++) {
      const date = addDays(base, d);
      const type = serviceTypeOf(date);
      depsFor(type).forEach((m) => {
        const arr = d * 1440 + m + stop.t;
        if (arr >= fromAbs - 0.0001) out.push(arr);
      });
    }
    out.sort((a, b) => a - b);
    return out.slice(0, limit || 3);
  }

  function stopFacts(stop, now) {
    const today = new Date();
    const type = serviceTypeOf(today);
    const deps = depsFor(type);
    const first = deps[0] + stop.t;
    const last = deps[deps.length - 1] + stop.t;
    const remain = deps.filter((m) => m + stop.t >= now).length;
    return { type, first, last, remain, total: deps.length };
  }

  /* ----- 실시간 도착정보 (정류장별) ----- */
  function arrivalModel(stop) {
    const c = state.arrivals.get(stop.i);
    if (!c) return { kind: 'loading' };
    if (c.busy && !c.data) return { kind: 'loading' };
    if (c.data && String(c.data.predictTime1 !== undefined ? c.data.predictTime1 : '').length) {
      return { kind: 'live', item: c.data, at: c.at };
    }
    if (c.error) return { kind: 'offline', at: c.at };
    return { kind: 'empty', at: c.at };
  }

  async function fetchArrival(stop, force) {
    if (!LIVE.enabled || !stop || !stop.sid) return;
    const c = state.arrivals.get(stop.i);
    if (!force && c && c.at && Date.now() - c.at < 20000) return;
    if (c && c.busy) return;
    state.arrivals.set(stop.i, Object.assign({}, c || {}, { busy: true }));
    bumpQuota();
    try {
      const u = `${LIVE.arrivalUrl}?serviceKey=${LIVE.serviceKey}&stationId=${stop.sid}` +
                `&routeId=${LIVE.routeId}&format=json&_=${Date.now()}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(u, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const head = data && data.response && data.response.msgHeader;
      const code = head ? String(head.resultCode) : '';
      if (code !== '0') throw new Error('resultCode ' + code);  // 4 = 도착 예정 정보 없음
      let item = data.response.msgBody && data.response.msgBody.busArrivalItem;
      if (Array.isArray(item)) item = item[0];
      if (!item) throw new Error('empty');
      state.arrivals.set(stop.i, { at: Date.now(), data: item, error: '' });
    } catch (e) {
      state.arrivals.set(stop.i, { at: Date.now(), data: null, error: String(e.message || e) });
    }
    if (state.activeStopId === stop.i) renderSheet(stop, true);
  }

  const STA_PLACE = 'https://map.kakao.com/link/search/';
  const NAVER = 'https://map.naver.com/p/search/';

  function openSheet(stopId) {
    const stop = STOPS.find((s) => s.i === stopId);
    if (!stop) return;
    state.activeStopId = stopId;
    renderSheet(stop);
    fetchArrival(stop);
    $$('.stop-g').forEach((g) => g.classList.toggle('is-active', Number(g.dataset.stop) === stopId));
    $('#scrim').hidden = false;
    requestAnimationFrame(() => {
      $('#scrim').classList.add('show');
      $('#sheet').classList.add('open');
      $('#sheet').setAttribute('aria-hidden', 'false');
    });
    document.body.classList.add('locked');
  }

  function closeSheet() {
    state.activeStopId = null;
    $('#sheet').classList.remove('open');
    $('#sheet').setAttribute('aria-hidden', 'true');
    $('#scrim').classList.remove('show');
    $$('.stop-g').forEach((g) => g.classList.remove('is-active'));
    document.body.classList.remove('locked');
    setTimeout(() => { $('#scrim').hidden = true; }, 260);
  }

  function renderSheet(stop, keepScroll) {
    const body = $('#sheetBody');
    const prevScroll = body.scrollTop;
    const now = state.simTime;
    const arr = arrivalsAt(stop, now, 3);
    const facts = stopFacts(stop, now);
    const fav = state.favs.indexOf(stop.i) >= 0;
    const model = arrivalModel(stop);

    const dirLabel = stop.dir === 'up' ? '김포공항역 방면' : '힐스테이트2단지 방면';
    const dirCls = stop.dir === 'up' ? 'up' : 'down';
    const tags = [
      `<span class="sh-tag ${dirCls}">${dirLabel}</span>`,
      stop.pass ? '<span class="sh-tag pass">미정차</span>' : '<span class="sh-tag">정차</span>'
    ];
    if (stop.tag) tags.push(`<span class="sh-tag">${stop.tag}</span>`);

    /* ----- 실시간 도착 카드 ----- */
    let arrivalHtml = '';
    if (model.kind === 'live') {
      const it = model.item;
      const cards = [1, 2].map((n) => {
        const time = it['predictTime' + n];
        if (time === undefined || time === null || time === '') return '';
        const pMin = Number(time) || 0;
        const loc = Number(it['locationNo' + n]) || 0;
        const plate = String(it['plateNo' + n] || '').slice(-4);
        const low = Number(it['lowPlate' + n]) === 1;
        const crowd = Number(it['crowded' + n]) || 0;
        const when = pMin <= 1 ? '곧 도착' : pMin + '분 후 도착';
        const meta = [plate ? plate + '호' : '', low ? '저상' : '', CROWD[crowd] || ''].filter(Boolean).join(' · ');
        const locTxt = loc > 0 ? `${loc}정거장 전` : '바로 앞';
        if (n === 1) {
          return `<div class="arr-card main live">
            <span class="arr-badge">70C</span>
            <div class="arr-main-text">
              <span class="arr-when">${when}<small>${locTxt}</small></span>
              <span class="arr-abs">${meta || '70C 버스'}</span>
            </div>
            <span class="arr-live">LIVE</span>
          </div>`;
        }
        return `<div class="arr-card">
          <span class="arr-badge" style="opacity:.85">70C</span>
          <div class="arr-sub">
            <span class="arr-mini">${when}</span>
            <span class="arr-sub-meta">다음 버스 ${locTxt}${meta ? ' · ' + meta : ''}</span>
          </div>
        </div>`;
      }).filter(Boolean).join('');
      arrivalHtml = cards;
    } else if (model.kind === 'loading') {
      arrivalHtml = `<div class="arr-card main live">
        <span class="arr-badge">70C</span>
        <div class="arr-main-text">
          <span class="arr-when is-status">실시간 도착정보 확인 중<small>잠시만요</small></span>
          <span class="arr-abs">경기버스정보에 지금 물어보고 있어요</span>
        </div>
      </div>`;
    } else {
      /* ----- 시간표 기반 (실시간 정보가 없을 때) ----- */
      let sched = '';
      if (!arr.length) {
        sched = `<div class="arr-none">오늘 운행이 끝났어요. 내일 첫차는 ${fmtHM(arrivalsAt(stop, 1440, 1)[0] || facts.first)}입니다.</div>`;
      } else {
        const first = arr[0];
        const mins = Math.max(0, Math.round(first - now));
        const dayDiff = Math.floor(first / 1440);
        const when = dayDiff > 0
          ? `${dayDiff === 1 ? '내일' : '모레'} 첫차`
          : (mins <= 0 ? '지금 도착' : `${mins}분 후 도착`);
        const abs = dayDiff > 0
          ? '오늘 운행이 모두 끝났어요'
          : (stop.pass ? '이 정류장에 서지 않고 지나갑니다' : '시간표 기준 예상 도착');
        sched += `
          <div class="arr-card main">
            <span class="arr-badge">70C</span>
            <div class="arr-main-text">
              <span class="arr-when">${when}<small>${fmtHM(first)} ${stop.pass && dayDiff <= 0 ? '통과' : (dayDiff > 0 ? '첫차' : '예정')}</small></span>
              <span class="arr-abs">${abs}</span>
            </div>
          </div>`;
        arr.slice(1).forEach((a) => {
          const m = Math.max(0, Math.round(a - now));
          const d2 = Math.floor(a / 1440);
          const txt = d2 > 0
            ? `${d2 === 1 ? '내일' : '모레'} ${fmtHM(a)}`
            : `${m}분 후 · ${fmtHM(a)}`;
          sched += `
            <div class="arr-card">
              <span class="arr-badge" style="opacity:.85">70C</span>
              <div class="arr-sub">
                <span>다음 버스</span>
                <span class="arr-mini">${txt}</span>
              </div>
            </div>`;
        });
      }
      const capText = model.kind === 'offline'
        ? '실시간 정보를 받지 못해 <b>시간표 기준</b>으로 보여드려요'
        : '지금 도착 예정인 70C 정보가 없어 <b>시간표 기준</b>으로 보여드려요';
      arrivalHtml = `<div class="arr-cap">${capText}</div>` + sched;
    }

    const kakaoHref = stop.lat
      ? `https://map.kakao.com/link/map/${encodeURIComponent(stop.name)},${stop.lat},${stop.lng}`
      : STA_PLACE + encodeURIComponent(stop.name + ' 버스정류장');

    const noteText = model.kind === 'live'
      ? '경기버스정보 <b>실시간 도착정보</b>입니다. 30초마다 다시 확인합니다.'
      : (model.kind === 'offline'
        ? '실시간 정보를 받지 못했습니다(오프라인·일시 오류). 시간표와 구간 표정속도로 계산한 <b>추정치</b>입니다.'
        : '시간표와 구간 표정속도로 계산한 <b>추정치</b>이며, 실제 버스는 도로 상황에 따라 달라질 수 있습니다.');

    body.innerHTML = `
      <div class="sh-head">
        <div class="sh-titles">
          <div class="sh-eyebrow">${tags.join('')}</div>
          <h3 class="sh-title" id="sheetTitle">${stop.name}</h3>
          <p class="sh-code">${stop.code ? '정류장 ' + stop.code : '정류장 번호 정보 없음'}</p>
        </div>
        <button class="star-btn ${fav ? 'on' : ''}" id="starBtn" type="button" aria-label="즐겨찾기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6Z" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
        </button>
      </div>

      <div class="sh-arrivals">${arrivalHtml}</div>

      <div class="sh-links">
        <a class="link-btn kakao" href="${kakaoHref}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c-4.4 0-8 2.8-8 6.2 0 2.2 1.5 4.1 3.8 5.2l-.9 3.4c-.1.4.3.7.6.5l3.9-2.5c.2 0 .4.1.6.1 4.4 0 8-2.8 8-6.7s-3.6-6.2-8-6.2Z" fill="currentColor"/></svg>
          카카오맵
        </a>
        <a class="link-btn" href="${NAVER + encodeURIComponent(stop.name + ' 버스정류장')}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 20 4M5 4h6v6M19 20h-6v-6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          네이버지도
        </a>
      </div>

      <p class="sh-note">
        ${stop.pass ? '이 정류장은 70C가 정차하지 않고 지나가는 구간입니다. ' : ''}${noteText}
      </p>`;

    $('#starBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFav(stop.i);
      renderSheet(stop, true);
    });
    body.scrollTop = keepScroll ? prevScroll : 0;
  }

  /* ---------------------------------------------------------
     10. 즐겨찾기
     --------------------------------------------------------- */
  function loadFavs() {
    try {
      const raw = localStorage.getItem('g70c.favs');
      state.favs = raw ? JSON.parse(raw).filter((n) => typeof n === 'number') : [];
    } catch (e) { state.favs = []; }
    renderFavs();
  }
  function saveFavs() {
    try { localStorage.setItem('g70c.favs', JSON.stringify(state.favs)); } catch (e) { /* private mode */ }
    renderFavs();
  }
  function toggleFav(id) {
    const i = state.favs.indexOf(id);
    if (i >= 0) state.favs.splice(i, 1);
    else state.favs.push(id);
    saveFavs();
    if (state.activeStopId === id) {
      const btn = $('#starBtn');
      if (btn) { btn.classList.toggle('on', state.favs.indexOf(id) >= 0); }
    }
  }
  function renderFavs() {
    const bar = $('#favBar');
    const wrap = $('#favChips');
    if (!state.favs.length) { bar.hidden = true; wrap.innerHTML = ''; return; }
    bar.hidden = false;
    wrap.innerHTML = state.favs.map((id) => {
      const s = STOPS.find((x) => x.i === id);
      if (!s) return '';
      return `<button class="fav-chip" type="button" data-stop="${s.i}"><span class="star">★</span>${s.label[0]}${s.label[1] && s.label[1] !== '정문' ? ' ' + s.label[1] : ''}</button>`;
    }).join('');
    wrap.querySelectorAll('.fav-chip').forEach((b) => {
      b.addEventListener('click', () => openSheet(Number(b.dataset.stop)));
    });
  }

  /* ---------------------------------------------------------
     11. 시간표 탭
     --------------------------------------------------------- */
  function renderTimetable() {
    const d = new Date();
    const todayType = serviceTypeOf(d);
    const type = state.ttType || todayType;
    const deps = depsFor(type);
    const now = state.simTime;
    const isToday = type === todayType;

    $$('#typeSeg .seg-btn').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.type === type);
      b.setAttribute('aria-selected', b.dataset.type === type ? 'true' : 'false');
    });

    // 다음 출발 카드
    let nextIdx = -1;
    if (isToday) {
      nextIdx = deps.findIndex((m) => m > now);
      if (nextIdx === -1) nextIdx = -1;
    } else {
      nextIdx = 0;
    }
    const nextCard = $('#nextCard');
    if (isToday && nextIdx >= 0) {
      const mins = Math.round(deps[nextIdx] - now);
      $('#nextTime').textContent = fmtHM(deps[nextIdx]);
      $('#nextNote').textContent = (mins <= 1 ? '곧 출발' : mins + '분 후 출발') +
        (nextIdx === deps.length - 1 ? ' · 막차' : '') + ' · 힐스테이트2단지정문';
      $('#nextCount').textContent = (deps.length - nextIdx) + '회';
      nextCard.style.display = '';
    } else if (isToday) {
      $('#nextTime').textContent = '운행 종료';
      $('#nextNote').textContent = '내일 첫차 ' + fmtHM(depsFor(serviceTypeOf(addDays(d, 1)))[0]);
      $('#nextCount').textContent = '0회';
      nextCard.style.display = '';
    } else {
      $('#nextTime').textContent = fmtHM(deps[0]);
      $('#nextNote').textContent = '이 시간표의 첫차 · ' + deps.length + '회 운행';
      $('#nextCount').textContent = deps.length + '회';
      nextCard.style.display = '';
    }

    let html = '';
    $('#ttList').style.gridTemplateRows = `repeat(${Math.ceil(deps.length / 2)}, auto)`;
    deps.forEach((m, i) => {
      const gap = i === 0 ? '–' : (m - deps[i - 1]) + '분';
      const isNext = i === nextIdx && isToday;
      const past = isToday && m + 0.5 < now;
      const isLast = i === deps.length - 1;
      html += `<div class="tt-row${past ? ' is-past' : ''}${isNext ? ' is-next' : ''}${isLast ? ' is-last' : ''}">
        <span class="tt-no">${i + 1}</span>
        <span class="tt-time">${fmtHM(m)}${isNext ? '<span class="tt-badge">NEXT</span>' : ''}</span>
        <span class="tt-gap">${gap}</span>
      </div>`;
    });
    $('#ttList').innerHTML = html;
  }

  /* ---------------------------------------------------------
     12. 갱신 · 실시간
     --------------------------------------------------------- */
  async function fetchLive(force) {
    if (!LIVE.enabled) return;
    if (document.hidden && !force) return;
    if (state.liveBusy) return;
    const gap = Date.now() - (state.lastFetch || 0);
    if (!force && gap < LIVE.minGapMs) return;
    state.liveBusy = true;
    state.lastFetch = Date.now();
    bumpQuota();
    try {
      const u = `${LIVE.url}?serviceKey=${LIVE.serviceKey}&routeId=${LIVE.routeId}` +
                `&format=json&_=${Date.now()}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(u, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const head = data && data.response && data.response.msgHeader;
      const code = head ? String(head.resultCode) : '';
      if (code !== '0' && code !== '4') throw new Error('resultCode ' + code);
      let body = data.response.msgBody && data.response.msgBody.busLocationList;
      if (code === '4' || !body) body = [];
      if (!Array.isArray(body)) body = [body];
      const buses = body
        .filter((b) => b && Number(b.stationSeq) >= 1 && Number(b.stationSeq) <= STOPS.length)
        .map((b) => {
          const seq = Number(b.stationSeq);
          const plate = String(b.plateNo || '');
          return {
            vehId: String(b.vehId || plate || seq),
            plate: plate,
            num: plate.slice(-4),
            seq: seq,
            stop: STOPS[seq - 1],
            low: Number(b.lowPlate) === 1,
            crowded: Number(b.crowded) || 0
          };
        });
      state.live = { at: Date.now(), queryTime: (head && head.queryTime) || '', buses: buses };
      state.liveAt = Date.now();
      state.liveError = '';
    } catch (e) {
      state.liveError = String((e && e.message) || e);
      state.liveAt = 0;
      state.live = null;
    } finally {
      state.liveBusy = false;
    }
    updateServicePill();
    updateClock();
    updateSummary(paintBuses());
    if (state.activeStopId) {
      const st = STOPS.find((x) => x.i === state.activeStopId);
      if (st) renderSheet(st, true);
    }
  }

  function refresh(force) {
    state.simTime = nowMin();
    updateClock();
    updateServicePill();
    updateSummary(paintBuses());
    renderTimetable();
    if (state.activeStopId) {
      const st = STOPS.find((x) => x.i === state.activeStopId);
      if (st) { renderSheet(st, true); fetchArrival(st, true); }
    }
    fetchLive(force !== false);
  }

  /* ---------------------------------------------------------
     13. 애니메이션 루프
     --------------------------------------------------------- */
  function loop(ts) {
    const dt = Math.min(0.4, (ts - state.lastFrame) / 1000);
    state.lastFrame = ts;
    state.simTime += (dt * state.speed) / 60;
    if (Math.abs(state.simTime - nowMin()) > 240) state.simTime = nowMin();
    paintBuses();
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------
     14. 이벤트 연결
     --------------------------------------------------------- */
  function wire() {
    // 탭
    $$('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.tab;
        $$('.tab').forEach((b) => b.classList.toggle('is-active', b === btn));
        $('#panel-route').classList.toggle('hidden', state.tab !== 'route');
        $('#panel-time').classList.toggle('hidden', state.tab !== 'time');
        if (state.tab === 'time') renderTimetable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // 시간표 구분
    $$('#typeSeg .seg-btn').forEach((b) => {
      b.addEventListener('click', () => { state.ttType = b.dataset.type; renderTimetable(); });
    });

    // 새로고침
    $('#refreshBtn').addEventListener('click', () => {
      $('#refreshBtn').classList.add('spinning');
      setTimeout(() => $('#refreshBtn').classList.remove('spinning'), 720);
      refresh();
    });

    // 시트 닫기
    $('#scrim').addEventListener('click', closeSheet);
    $('#sheetGrip').addEventListener('click', closeSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

    // 사파리식 아래로 스와이프 닫기
    let startY = null;
    const sheet = $('#sheet');
    sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && sheet.querySelector('.sheet-body').scrollTop <= 0) {
        sheet.style.transition = 'none';
        sheet.style.transform = `translateY(${dy}px)`;
      }
    }, { passive: true });
    sheet.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - (startY || 0);
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 90) closeSheet();
      startY = null;
    });

    // 데모 속도 (버스가 실제로 움직이는 걸 눈으로 확인)
    $('#speedBtn').addEventListener('click', () => {
      state.speed = state.speed === 1 ? 30 : 1;
      const b = $('#speedBtn');
      b.textContent = state.speed === 1 ? '1×' : '30×';
      b.classList.toggle('on', state.speed !== 1);
      if (state.speed === 1) state.simTime = nowMin();
      updateSummary();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
  }

  /* ---------------------------------------------------------
     15. 시작
     --------------------------------------------------------- */
  function boot() {
    state.ttType = serviceTypeOf(new Date());
    state.simTime = nowMin();
    buildDiagram();
    loadFavs();
    wire();
    updateClock();
    updateServicePill();
    updateSummary();
    renderTimetable();
    refresh();
    requestAnimationFrame(loop);
    // 30초마다 갱신. 화면이 꺼져 있으면 쉬고, 한도를 많이 쓰면 간격을 늘립니다.
    const tick = () => {
      setTimeout(() => {
        updateClock();
        if (!document.hidden) {
          if (state.tab === 'time') renderTimetable();
          if (state.activeStopId) {
            const st = STOPS.find((x) => x.i === state.activeStopId);
            if (st) { renderSheet(st, true); fetchArrival(st); }
          }
          fetchLive();
        }
        tick();
      }, pollInterval());
    };
    tick();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
