// ==UserScript==
// @name         SDJZU 教务系统选课助手
// @namespace    https://xjwgl.sdjzu.edu.cn/
// @version      2.2.0
// @description  直接对接山东建筑大学教务系统选课接口(已实地抓包)，自动抢课/捡漏，支持公选课/必修/限选/专业选课。兼容油猴(Tampermonkey)与脚本猫(ScriptCat)
// @author       You
// @match        https://xjwgl.sdjzu.edu.cn/jsxsd/*
// @match        http://xjwgl.sdjzu.edu.cn/jsxsd/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-idle
// @noframes     false
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 工具函数
  // ============================================================
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ts = () => {
    const d = new Date();
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  };
  const getZbid = () => new URLSearchParams(location.search).get('jx0502zbid') || '';

  // 同源请求 + GM_xmlhttpRequest 兜底
  function http(opts) {
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(opts.method || 'GET', opts.url, true);
        if (opts.method === 'POST' && opts.body && typeof opts.body === 'string') {
          xhr.setRequestHeader('Content-Type', opts.contentType || 'application/x-www-form-urlencoded;charset=UTF-8');
        }
        if (opts.headers) {
          Object.keys(opts.headers).forEach((k) => {
            try { xhr.setRequestHeader(k, opts.headers[k]); } catch (e) {}
          });
        }
        xhr.timeout = 15000;
        xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 400, status: xhr.status, text: xhr.responseText });
        xhr.onerror = () => resolve({ ok: false, status: 0, text: '网络错误' });
        xhr.ontimeout = () => resolve({ ok: false, status: 0, text: '请求超时' });
        xhr.send(opts.method === 'POST' ? (opts.body || '') : null);
      } catch (e) {
        if (typeof GM_xmlhttpRequest === 'function') {
          GM_xmlhttpRequest({
            method: opts.method || 'GET',
            url: opts.url,
            data: opts.body,
            headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, opts.headers || {}),
            timeout: 15000,
            onload: (r) => resolve({ ok: r.status >= 200 && r.status < 400, status: r.status, text: r.responseText }),
            onerror: () => resolve({ ok: false, status: 0, text: '网络错误(GM)' }),
            ontimeout: () => resolve({ ok: false, status: 0, text: '请求超时(GM)' }),
          });
        } else {
          resolve({ ok: false, status: 0, text: String(e) });
        }
      }
    });
  }

  // ============================================================
  // 真实接口规格（2026-09-16 实地抓包验证）
  // ============================================================
  // 选课操作端点按课程类别不同：
  //   公选课:    /jsxsd/xsxkkc/ggxxkxkOper?kcid=<kcid>&cfbs=<cfbs>
  //   必修课:    /jsxsd/xsxkkc/bxxkOper?jx0404id=<jx0404id>
  //   限选课:    /jsxsd/xsxkkc/xxxkOper?jx0404id=<jx0404id>
  //   专业选课:  /jsxsd/xsxkkc/zyxkOper?jx0404id=<jx0404id>
  //   体育选课:  /jsxsd/xsxkkc/tyxkOper?jx0404id=<jx0404id>
  //   通识选修:  /jsxsd/xsxkkc/tsxkOper?jx0404id=<jx0404id>
  //
  // 公选课请求体（form-urlencoded）:
  //   jx0404id=<课班级ID>&xkzy=&trjf=
  // 公选课响应：JSON  {success:true/false, message:"...", jfViewStr, cfbs, yxjx0404id, yxcfbs, sfydjc}
  //
  // 课程列表查询接口（DataTables 服务端分页）:
  //   POST /jsxsd/xsxkkc/xsxkGgxxkxk  (公选课)
  //   POST /jsxsd/xsxkkc/xsxkBxxk     (必修)
  //   POST /jsxsd/xsxkkc/xsxkXxxk     (限选)
  //   查询参数(走 query string): kcxx=<课程号关键词>&skls=<教师>&skxq=<星期1-7>&skjc=<节次>
  //                              &sfym=false&sfct=true&szjylb=<类别>&sfxx=true&skfs=
  //   请求体: DataTables 标准字段 iDisplayStart/iDisplayLength/sEcho/columns[]/search/order
  //   响应: JSON  {aaData:[{kch,kcmc,kexuhao,xf,skls,sksj,skdd,xqmc,xkrs,syrs,ctsm,szkcflmc,czOper}...],
  //                bbData, flag, flag1, jfViewStr}
  //
  // 选课按钮 HTML 形态（公选课，从 czOper 列直接来）：
  //   <a href="javascript:xsxkFun('jx0404id','kcid','cfbs')">选课</a>
  //   内部调用链: xsxkFun → confirm("提示：你确认选择当前课程班级？") → xsxkOper
  // ============================================================
  const API = {
    // 类别 -> {listUrl, operUrl, operStyle}
    //   operStyle: 'ggxxkxk' = POST body 带 jx0404id, query 带 kcid+cfbs
    //              'simple'   = GET/POST, query 带 jx0404id
    categories: {
      // 公选课
      ggxxkxk: { name: '公选课', listUrl: '/jsxsd/xsxkkc/xsxkGgxxkxk', operUrl: '/jsxsd/xsxkkc/ggxxkxkOper', operStyle: 'ggxxkxk' },
      // 必修（本学期计划选课内的必修部分）
      bxxk: { name: '必修课', listUrl: '/jsxsd/xsxkkc/xsxkBxxk', operUrl: '/jsxsd/xsxkkc/bxxkOper', operStyle: 'simple' },
      // 限选
      xxxk: { name: '限选课', listUrl: '/jsxsd/xsxkkc/xsxkXxxk', operUrl: '/jsxsd/xsxkkc/xxxkOper', operStyle: 'simple' },
      // 专业选课
      zyxk: { name: '专业选课', listUrl: '/jsxsd/xsxkkc/xsxkZyxk', operUrl: '/jsxsd/xsxkkc/zyxkOper', operStyle: 'simple' },
      // 体育选课
      tyxk: { name: '体育选课', listUrl: '/jsxsd/xsxkkc/xsxkTyxk', operUrl: '/jsxsd/xsxkkc/tyxkOper', operStyle: 'simple' },
      // 通识选修
      tsxk: { name: '通识选修', listUrl: '/jsxsd/xsxkkc/xsxkTsxk', operUrl: '/jsxsd/xsxkkc/tsxkOper', operStyle: 'simple' },
      // 兜底通用 Oper
      generic: { name: '通用', listUrl: null, operUrl: null, operStyle: 'simple' },
    },
    // 从当前页面推断所属类别（先看 URL，再看 DOM 内容，再看选课按钮）
    detectCategory() {
      const p = location.pathname.toLowerCase();
      // 1) URL 路径匹配
      const pathMap = [
        { urlKey: 'ggxxkxk', catKey: 'ggxxkxk' },
        { urlKey: 'bxxk',    catKey: 'bxxk' },
        { urlKey: 'xxxk',    catKey: 'xxxk' },
        { urlKey: 'zyxk',    catKey: 'zyxk' },
        { urlKey: 'tyxk',    catKey: 'tyxk' },
        { urlKey: 'tsxk',    catKey: 'tsxk' },
        { urlKey: 'ggx',     catKey: 'ggxxkxk' },
      ];
      for (const item of pathMap) {
        if (p.indexOf(item.urlKey) >= 0) {
          return Object.assign({ key: item.catKey }, this.categories[item.catKey]);
        }
      }
      // 2) DOM 内容关键字（AJAX 加载页面时 URL 不变，靠内容识别）
      const bodyTxt = (document.body?.innerText || '').slice(0, 2000);
      const kwMap = [
        { kw: '通选课类别',        catKey: 'ggxxkxk' },
        { kw: '公共选修',          catKey: 'ggxxkxk' },
        { kw: '公选课',            catKey: 'ggxxkxk' },
        { kw: '必修选课',          catKey: 'bxxk' },
        { kw: '限选选课',          catKey: 'xxxk' },
        { kw: '专业选课',          catKey: 'zyxk' },
        { kw: '体育选课',          catKey: 'tyxk' },
        { kw: '通识选修',          catKey: 'tsxk' },
      ];
      for (const item of kwMap) {
        if (bodyTxt.indexOf(item.kw) >= 0) {
          return Object.assign({ key: item.catKey }, this.categories[item.catKey]);
        }
      }
      // 3) 看页面里第一个选课按钮 href 调用的函数
      const btn = $$('a[href^="javascript:"], a[href*="javascript:xsxk"]').find((a) => /选课/.test(a.textContent || ''));
      if (btn) {
        const href = btn.getAttribute('href') || '';
        if (/xsxkFun/.test(href)) {
          return Object.assign({ key: 'ggxxkxk' }, this.categories.ggxxkxk);
        }
        const m = href.match(/(bxxkOper|xxxkOper|zyxkOper|tyxkOper|tsxkOper)/);
        if (m) {
          const map = { bxxkOper: 'bxxk', xxxkOper: 'xxxk', zyxkOper: 'zyxk', tyxkOper: 'tyxk', tsxkOper: 'tsxk' };
          return Object.assign({ key: map[m[1]] }, this.categories[map[m[1]]]);
        }
      }
      return Object.assign({ key: 'generic' }, this.categories.generic);
    },
    // 构造选课请求
    buildSelectRequest(course, category) {
      const zbId = getZbid();
      if (category.operStyle === 'ggxxkxk') {
        // 公选课：POST ggxxkxkOper?kcid=<kcid>&cfbs=<cfbs>
        const url = location.origin + category.operUrl +
                    '?kcid=' + encodeURIComponent(course.kcid || '') +
                    '&cfbs=' + encodeURIComponent(course.cfbs || 'null');
        const body = 'jx0404id=' + encodeURIComponent(course.jx0404id || '') +
                     '&xkzy=&trjf=';
        return { method: 'POST', url, body, headers: { 'X-Requested-With': 'XMLHttpRequest' } };
      } else {
        // 通用：POST <operUrl>?jx0404id=<jx0404id>&jx0502zbid=<zbId>
        const url = location.origin + category.operUrl +
                    '?jx0404id=' + encodeURIComponent(course.jx0404id || '') +
                    (zbId ? '&jx0502zbid=' + encodeURIComponent(zbId) : '');
        return { method: 'POST', url, body: '', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
      }
    },
    // 构造查询课程列表请求（DataTables 服务端分页）
    buildListRequest(category, filter = {}, pageStart = 0, pageLength = 200) {
      if (!category.listUrl) return null;
      const url = location.origin + category.listUrl +
                  '?kcxx=' + encodeURIComponent(filter.kcxx || '') +
                  '&skls=' + encodeURIComponent(filter.skls || '') +
                  '&skxq=' + encodeURIComponent(filter.skxq || '') +
                  '&skjc=' + encodeURIComponent(filter.skjc || '') +
                  '&sfym=false&sfct=' + (filter.sfct === false ? 'false' : 'true') +
                  '&szjylb=' + encodeURIComponent(filter.szjylb || '') +
                  '&sfxx=true&skfs=';
      // DataTables 请求体
      const params = new URLSearchParams();
      params.append('iDisplayStart', String(pageStart));
      params.append('iDisplayLength', String(pageLength));
      params.append('sEcho', '1');
      // 简化：只发必要字段
      return { method: 'POST', url, body: params.toString(), headers: { 'X-Requested-With': 'XMLHttpRequest' } };
    },
    // 解析选课响应
    parseSelectResponse(text) {
      // 公选课是 JSON；必修等老版本可能返回 HTML/脚本
      let data = null;
      try { data = JSON.parse(text); } catch (e) {
        // 尝试剥离 HTML 后再解析
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { data = JSON.parse(m[0]); } catch (e2) {} }
      }
      if (data && typeof data === 'object') {
        return {
          success: data.success === true || data.success === 'true',
          message: data.message || (data.success ? '选课成功' : '选课失败'),
          raw: data,
        };
      }
      // HTML / 脚本格式兜底
      const tmp = document.createElement('div');
      tmp.innerHTML = text;
      const plain = (tmp.textContent || text || '').trim();
      const am = plain.match(/alert\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      const msg = am ? am[1] : plain.slice(0, 120);
      const success = /选课成功|已选|操作成功|true/i.test(plain);
      return { success, message: msg, raw: text };
    },
  };

  // ============================================================
  // 全局状态
  // ============================================================
  const STATE = {
    category: null,    // 当前类别
    courses: [],       // 已发现的课程
    targets: new Set(),// 目标 id 集合
    running: false,
    stopFlag: false,
    retryMs: 800,
    maxAttempts: 0,
    attempts: 0,
    successCount: 0,
  };

  let logBox = null, courseListEl = null, statusEl = null, countEl = null;

  // ============================================================
  // 日志
  // ============================================================
  function log(msg, type = 'info') {
    const colors = { info: '#9aa', success: '#5fff5f', error: '#ff7a7a', warn: '#ffd866' };
    if (logBox) {
      const line = document.createElement('div');
      line.style.cssText = `color:${colors[type] || colors.info};margin:2px 0;font-size:12px;word-break:break-all;line-height:1.4;`;
      line.textContent = `[${ts()}] ${msg}`;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
      while (logBox.children.length > 500) logBox.removeChild(logBox.firstChild);
    }
    console.log(`[抢课][${type}] ${msg}`);
  }

  function notify(title, text) {
    try { if (typeof GM_notification === 'function') GM_notification({ title, text, timeout: 6000 }); } catch (e) {}
  }

  // ============================================================
  // 从 DOM 解析课程列表
  // ============================================================
  // 公选课页面表格：table.display.dataTable#dataView，12 列：
  // 0:kch 1:kcmc 2:kexuhao 3:xf 4:skls 5:sksj 6:skdd 7:xqmc 8:syrs 9:ctsm 10:szkcflmc 11:czOper
  // czOper 单元格里有 <a href="javascript:xsxkFun('jx0404id','kcid','cfbs')">选课</a>
  // 但有时 czOper 列可能还没渲染（DataTables 异步），此时也要从其它列提取课程信息
  function parseCoursesFromDOM() {
    const table = $('table.dataTable, table.display, #dataView') || $('table');
    if (!table) return [];
    const rows = $$('tbody tr', table).filter((r) => r.cells && r.cells.length >= 4);
    const list = [];
    for (const row of rows) {
      const cells = row.cells;
      // 先找选课按钮（优先 czOper 列）
      let btn = null;
      for (let i = cells.length - 1; i >= 0; i--) {
        const a = $('a[href*="xsxkFun"], a[href*="xsxk_oper"], a[onclick*="xsxk"], input[onclick*="xsxk"]', cells[i]);
        if (a) { btn = a; break; }
      }
      if (!btn) {
        btn = $$('a, button, input', row).find((el) => /选课/.test(el.textContent || el.value || ''));
      }

      const callSource = btn ? ((btn.getAttribute('href') || '') + ' ' + (btn.getAttribute('onclick') || '')) : '';
      const m = callSource.match(/xsxkFun\s*\(\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]\s*(?:,\s*['"]([^'"]*)['"])?/);
      let jx0404id = '', kcid = '', cfbs = 'null';
      if (m) {
        jx0404id = m[1]; kcid = m[2]; cfbs = m[3] || 'null';
      } else if (callSource) {
        // 其他形式：xsxk_oper('jx0404id') 或 bxxkOper('jx0404id')
        const m2 = callSource.match(/(?:xsxk_oper|xsxkOper|bxxkOper|xxxkOper|zyxkOper|tyxkOper|tsxkOper)\s*\(\s*['"]([^'"]*)['"]/);
        if (m2) jx0404id = m2[1];
      }

      // 无论有没有按钮，都从表格列提取课程基本信息
      const kch = (cells[0]?.textContent || '').trim();
      const kcmc = (cells[1]?.textContent || '').trim();
      const kexuhao = (cells[2]?.textContent || '').trim();
      const skls = (cells[4]?.textContent || '').trim();
      const sksj = (cells[5]?.textContent || '').trim();
      const syrsText = (cells[8]?.textContent || '').trim();
      const ctsm = (cells[9]?.textContent || '').trim();

      // 没按钮也没课程名就跳过
      if (!jx0404id && !kcid && !kch && !kcmc) continue;

      const id = jx0404id || kcid || `${kch}_${kexuhao}` || kch || kcmc;
      list.push({
        id, jx0404id, kcid, cfbs,
        kch, kcmc, kexuhao, skls, sksj, syrsText, ctsm,
        name: `${kcmc || kch || id}`,
        row, btn,
      });
    }
    return list;
  }

  // ============================================================
  // 通过查询接口拉课程（按课程名/教师筛选）
  // ============================================================
  async function fetchCoursesByQuery(filter) {
    if (!STATE.category || !STATE.category.listUrl) {
      log('当前类别不支持查询接口，改用 DOM 解析', 'warn');
      return [];
    }
    const req = API.buildListRequest(STATE.category, filter, 0, 500);
    if (!req) return [];
    log(`查询课程: ${JSON.stringify(filter)} → ${req.url}`, 'info');
    const resp = await http(req);
    if (!resp.ok) { log(`查询失败 HTTP ${resp.status}`, 'error'); return []; }
    let data = null;
    try { data = JSON.parse(resp.text); } catch (e) {
      const m = resp.text.match(/\{[\s\S]*\}/);
      if (m) { try { data = JSON.parse(m[0]); } catch (e2) {} }
    }
    if (!data || !data.aaData) { log('查询响应非预期格式', 'error'); return []; }
    const list = [];
    for (const row of data.aaData) {
      // czOper 是 HTML 字符串，从中提取 xsxkFun 调用
      const czOper = row.czOper || '';
      const m = czOper.match(/xsxkFun\s*\(\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]\s*(?:,\s*['"]([^'"]*)['"])?/);
      let jx0404id = '', kcid = '', cfbs = 'null';
      if (m) { jx0404id = m[1]; kcid = m[2]; cfbs = m[3] || 'null'; }
      const id = jx0404id || kcid || row.kch;
      list.push({
        id, jx0404id, kcid, cfbs,
        kch: row.kch || '', kcmc: row.kcmc || '', kexuhao: row.kexuhao || '',
        skls: row.skls || '', sksj: row.sksj || '', skdd: row.skdd || '',
        syrsText: String(row.syrs ?? ''), ctsm: row.ctsm || '',
        name: `${row.kcmc || row.kch || id}`,
        row: null, btn: null,
      });
    }
    log(`查询到 ${list.length} 门课程`, 'success');
    return list;
  }

  // ============================================================
  // 调用选课接口
  // ============================================================
  async function callSelect(course) {
    const req = API.buildSelectRequest(course, STATE.category || API.categories.generic);
    if (!req) return { success: false, message: '无法构造选课请求（类别未知）' };
    const resp = await http(req);
    const parsed = API.parseSelectResponse(resp.text || '');
    return parsed;
  }

  // ============================================================
  // 抢课循环
  // ============================================================
  async function runLoop() {
    STATE.running = true;
    STATE.stopFlag = false;
    STATE.attempts = 0;
    STATE.successCount = 0;
    updateButtonStates();

    while (!STATE.stopFlag) {
      const pending = Array.from(STATE.targets);
      if (pending.length === 0) {
        log('全部目标已选上，自动停止', 'success');
        break;
      }
      for (const id of pending) {
        if (STATE.stopFlag) break;
        const course = STATE.courses.find((c) => c.id === id);
        if (!course) { STATE.targets.delete(id); continue; }
        STATE.attempts++;
        if (STATE.maxAttempts > 0 && STATE.attempts > STATE.maxAttempts) {
          log(`已达最大尝试次数 ${STATE.maxAttempts}，停止`, 'warn');
          STATE.stopFlag = true;
          break;
        }
        const result = await callSelect(course);
        const shortName = `${course.kcmc || course.kch || id}(${course.kexuhao || ''})`;
        if (result.success) {
          log(`✅ ${shortName} - ${result.message}`, 'success');
          STATE.targets.delete(id);
          STATE.successCount++;
          if (course.row) course.row.style.backgroundColor = '#d4edda';
          notify('抢课成功', shortName);
          updateCourseList();
        } else {
          const t = result.message.includes('满') ? 'warn' :
                    (result.message.includes('冲突') ? 'warn' : 'info');
          log(`❌ ${shortName} - ${result.message}`, t);
        }
      }
      await sleep(STATE.retryMs);
    }
    STATE.running = false;
    updateButtonStates();
    log(`抢课结束：成功 ${STATE.successCount} 门，共尝试 ${STATE.attempts} 次`, 'info');
  }

  async function start() {
    if (STATE.running) return;
    if (STATE.targets.size === 0) {
      log('未选择目标课程，请先输入课程编号/名称/教师并加入目标', 'warn');
      return;
    }
    if (!STATE.category) {
      STATE.category = API.detectCategory();
      log(`自动识别类别: ${STATE.category.name}`, 'info');
    }
    // 检查目标课程是否都有 jx0404id/kcid，缺了就先补全
    const targetsArr = Array.from(STATE.targets);
    const missing = targetsArr.filter((id) => {
      const c = STATE.courses.find((x) => x.id === id);
      return c && !c.jx0404id && !c.kcid;
    });
    if (missing.length > 0) {
      log(`${missing.length} 门课程缺少内部 ID，正在自动查询补全…`, 'warn');
      // 查全部课程做一次本地匹配（避免多次网络请求）
      const allList = await fetchCoursesByQuery({});
      for (const id of missing) {
        const course = STATE.courses.find((x) => x.id === id);
        if (!course) continue;
        const kw = course.kch || course.kcmc || course.name;
        const matched = allList.find((c) =>
          (c.kch && c.kch.toLowerCase() === kw.toLowerCase()) ||
          (c.kcmc && c.kcmc === kw)
        );
        if (matched) {
          course.jx0404id = matched.jx0404id;
          course.kcid = matched.kcid;
          course.cfbs = matched.cfbs || 'null';
          course.kch = matched.kch || course.kch;
          course.kcmc = matched.kcmc || course.kcmc;
          log(`✅ 补全: ${course.kcmc} jx0404id=${course.jx0404id}`, 'success');
        } else {
          log(`❌ 补全失败: ${kw} 无法在课程列表中找到，请检查课程编号是否正确`, 'error');
          STATE.targets.delete(id);
        }
      }
      updateCourseList();
      if (STATE.targets.size === 0) {
        log('补全后没有有效目标，请重新添加课程', 'warn');
        return;
      }
    }
    log(`开始抢课，类别=${STATE.category.name}，目标 ${STATE.targets.size} 门，间隔 ${STATE.retryMs}ms`, 'success');
    runLoop();
  }

  function stop() {
    STATE.stopFlag = true;
    log('收到停止指令…', 'warn');
  }

  // ============================================================
  // UI 面板
  // ============================================================
  function buildUI() {
    if (document.getElementById('sdjzu-xk-helper')) return;
    const panel = document.createElement('div');
    panel.id = 'sdjzu-xk-helper';
    panel.innerHTML = `
      <style>
        #sdjzu-xk-helper { position:fixed; right:16px; top:16px; width:400px; z-index:99999;
          background:#fff; border:1px solid #cdd; border-radius:8px; box-shadow:0 6px 24px rgba(0,0,0,.18);
          font:13px/1.5 -apple-system,"Microsoft YaHei",sans-serif; color:#222; }
        #sdjzu-xk-helper .xk-head { padding:8px 12px; background:#2c5aa0; color:#fff; border-radius:8px 8px 0 0;
          cursor:move; user-select:none; display:flex; justify-content:space-between; align-items:center; }
        #sdjzu-xk-helper .xk-body { padding:10px; max-height:80vh; overflow:auto; }
        #sdjzu-xk-helper .xk-sec { margin-bottom:8px; padding:6px; background:#f6f8fa; border-radius:4px; }
        #sdjzu-xk-helper .xk-sec h4 { margin:0 0 4px 0; font-size:12px; color:#555; }
        #sdjzu-xk-helper .xk-courses { max-height:220px; overflow:auto; border:1px solid #e3e3e3; background:#fff; border-radius:4px; }
        #sdjzu-xk-helper .xk-item { padding:4px 6px; border-bottom:1px solid #eee; font-size:12px; }
        #sdjzu-xk-helper .xk-item label { display:flex; align-items:center; cursor:pointer; }
        #sdjzu-xk-helper .xk-item:hover { background:#eef4ff; }
        #sdjzu-xk-helper .xk-item input { margin-right:6px; flex:0 0 auto; }
        #sdjzu-xk-helper .xk-item .xk-name { flex:1; word-break:break-all; }
        #sdjzu-xk-helper .xk-item .xk-meta { color:#888; font-size:11px; margin-left:6px; }
        #sdjzu-xk-helper .xk-item.sel { background:#d4edda; }
        #sdjzu-xk-helper textarea, #sdjzu-xk-helper input[type=text], #sdjzu-xk-helper input[type=number] {
          width:100%; box-sizing:border-box; padding:4px; border:1px solid #ccc; border-radius:3px; font-size:12px; }
        #sdjzu-xk-helper .xk-btn { padding:6px 10px; margin:2px; border:none; border-radius:4px; cursor:pointer; font-size:12px; }
        #sdjzu-xk-helper .xk-btn-start { background:#28a745; color:#fff; }
        #sdjzu-xk-helper .xk-btn-stop { background:#dc3545; color:#fff; }
        #sdjzu-xk-helper .xk-btn-refresh { background:#17a2b8; color:#fff; }
        #sdjzu-xk-helper .xk-btn-search { background:#6f42c1; color:#fff; }
        #sdjzu-xk-helper .xk-log { height:180px; overflow:auto; background:#1e1e1e; color:#ccc; padding:6px; border-radius:4px; font-family:Consolas,monospace; }
        #sdjzu-xk-helper .xk-status { font-size:11px; color:#666; margin:4px 0; }
        #sdjzu-xk-helper .xk-collapse { font-size:11px; color:#fff; opacity:.85; cursor:pointer; }
        #sdjzu-xk-helper .xk-collapsed .xk-body { display:none; }
        #sdjzu-xk-helper .xk-small { font-size:11px; color:#888; }
        #sdjzu-xk-helper .xk-row { display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
        #sdjzu-xk-helper .xk-row > * { flex:1; }
      </style>
      <div class="xk-head">
        <span>🚀 山建选课助手 v2.1 <span id="xk-cat" class="xk-small" style="color:#cfe2ff;"></span></span>
        <span><span class="xk-collapse" id="xk-collapse">收起</span></span>
      </div>
      <div class="xk-body">
        <div class="xk-status" id="xk-status">正在扫描页面…</div>

        <div class="xk-sec">
          <h4>① 按条件搜索课程（输入即过滤下方列表，也可点搜索从接口拉取）</h4>
          <div class="xk-row">
            <input type="text" id="xk-q-name" placeholder="课程名/课程号/教师关键词" />
            <input type="text" id="xk-q-teacher" placeholder="教师" style="flex:0 0 80px;" />
            <button class="xk-btn xk-btn-search" id="xk-search" style="flex:0 0 auto;">搜索</button>
          </div>
        </div>

        <div class="xk-sec">
          <h4>② 已识别课程（共 <span id="xk-count">0</span> 门，已勾选 <span id="xk-sel">0</span> 门）</h4>
          <div class="xk-courses" id="xk-courses"></div>
          <div style="margin-top:4px; display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
            <button class="xk-btn xk-btn-refresh" id="xk-refresh">🔄 读取页面课程</button>
            <button class="xk-btn" id="xk-checkall" style="background:#6c757d;color:#fff;">全选</button>
            <button class="xk-btn" id="xk-clearsel" style="background:#6c757d;color:#fff;">清空</button>
            <label style="font-size:12px; display:flex; align-items:center; cursor:pointer;">
              <input type="checkbox" id="xk-onlyonline" checked style="margin-right:3px;">
              只显示在线课程
            </label>
            <label style="font-size:12px; display:flex; align-items:center; cursor:pointer;">
              <input type="checkbox" id="xk-onlyhas" style="margin-right:3px;">
              只显示有容量
            </label>
          </div>
        </div>

        <div class="xk-sec">
          <h4>③ 输入课程编号，查接口匹配课程名/教师后加入目标</h4>
          <textarea id="xk-manual" rows="2" placeholder="每行一个课程编号，例如:&#10;GXGL9500&#10;GXGL9497"></textarea>
          <button class="xk-btn" id="xk-addmanual" style="background:#fd7e14;color:#fff;width:100%;margin-top:4px;">🔎 查接口并加入目标</button>
          <div id="xk-manual-result" style="margin-top:6px; font-size:12px; color:#555;"></div>
        </div>

        <div class="xk-sec">
          <h4>④ 抢课参数</h4>
          重试间隔(ms): <input type="number" id="xk-interval" value="800" min="100" step="100" style="width:80px;">
          最大尝试(0=无限): <input type="number" id="xk-max" value="0" min="0" step="10" style="width:70px;">
        </div>

        <div class="xk-sec">
          <button class="xk-btn xk-btn-start" id="xk-start" style="width:48%;">▶ 开始抢课</button>
          <button class="xk-btn xk-btn-stop" id="xk-stop" style="width:48%;">■ 停止</button>
        </div>

        <div class="xk-sec">
          <h4>⑤ 日志</h4>
          <div class="xk-log" id="xk-log"></div>
        </div>

        <div class="xk-small">
          已硬编码公选课/必修/限选/专业选课/体育/通识接口路径。公选课直接调用
          <code>ggxxkxkOper</code>，其它走对应 <code>xxxOper</code>，绕过页面按钮点击。
          自动重写 window.confirm/alert，循环时静默确认。
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    logBox = $('#xk-log');
    courseListEl = $('#xk-courses');
    statusEl = $('#xk-status');
    countEl = $('#xk-count');

    // 拖拽
    const head = panel.querySelector('.xk-head');
    let dragging = false, ox = 0, oy = 0;
    head.addEventListener('mousedown', (e) => {
      if (e.target.id === 'xk-collapse') return;
      dragging = true;
      ox = e.clientX - panel.offsetLeft;
      oy = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panel.style.left = (e.clientX - ox) + 'px';
      panel.style.top = (e.clientY - oy) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    $('#xk-collapse').addEventListener('click', () => panel.classList.toggle('xk-collapsed'));
    $('#xk-refresh').addEventListener('click', () => { scanDOM(); });
    $('#xk-search').addEventListener('click', () => { searchFromQuery(); });
    // ① 实时过滤：输入一个字就过滤 ② 的课程列表
    $('#xk-q-name').addEventListener('input', () => { updateCourseList(); });
    $('#xk-q-teacher').addEventListener('input', () => { updateCourseList(); });
    // ② 只显示在线课程切换
    $('#xk-onlyonline').addEventListener('change', () => { updateCourseList(); });
    // ② 只显示有容量的课程切换
    $('#xk-onlyhas').addEventListener('change', () => { updateCourseList(); });
    $('#xk-checkall').addEventListener('click', () => {
      STATE.courses.forEach((c) => STATE.targets.add(c.id));
      updateCourseList();
    });
    $('#xk-clearsel').addEventListener('click', () => {
      STATE.targets.clear();
      updateCourseList();
    });
    $('#xk-addmanual').addEventListener('click', () => {
      const txt = ($('#xk-manual').value || '').trim();
      if (!txt) return;
      const inputs = txt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      addByCourseKeyword(inputs);
    });
    $('#xk-start').addEventListener('click', start);
    $('#xk-stop').addEventListener('click', stop);
    $('#xk-interval').addEventListener('change', (e) => {
      STATE.retryMs = Math.max(100, parseInt(e.target.value, 10) || 800);
    });
    $('#xk-max').addEventListener('change', (e) => {
      STATE.maxAttempts = Math.max(0, parseInt(e.target.value, 10) || 0);
    });
  }

  function updateCourseList() {
    if (!courseListEl) return;
    courseListEl.innerHTML = '';

    // ① 搜索关键词过滤（课程号/课程名/教师）
    const qName = ($('#xk-q-name')?.value || '').trim().toLowerCase();
    const qTeacher = ($('#xk-q-teacher')?.value || '').trim().toLowerCase();
    // ② 只显示在线课程（课程名包含"在线"）
    const onlyOnline = $('#xk-onlyonline')?.checked ?? false;
    // ② 只显示有容量的课程（剩余容量 > 0）
    const onlyHas = $('#xk-onlyhas')?.checked ?? false;

    let filtered = STATE.courses.filter((c) => {
      if (qName) {
        const hit = (c.kch || '').toLowerCase().includes(qName) ||
                    (c.kcmc || '').toLowerCase().includes(qName) ||
                    (c.skls || '').toLowerCase().includes(qName);
        if (!hit) return false;
      }
      if (qTeacher) {
        if (!(c.skls || '').toLowerCase().includes(qTeacher)) return false;
      }
      if (onlyOnline) {
        if ((c.kcmc || '').indexOf('在线') < 0) return false;
      }
      if (onlyHas) {
        const syrs = parseInt(c.syrsText, 10);
        if (!isNaN(syrs) && syrs <= 0) return false;
      }
      return true;
    });

    filtered.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'xk-item' + (STATE.targets.has(c.id) ? ' sel' : '');
      const checked = STATE.targets.has(c.id) ? 'checked' : '';
      const meta = [c.kexuhao, c.skls, c.syrsText ? `余${c.syrsText}` : '', c.ctsm ? '⚠冲突' : '']
                     .filter((x) => x).join(' / ');
      div.innerHTML = `<label>
        <input type="checkbox" data-id="${c.id}" ${checked}/>
        <span class="xk-name">${c.kcmc || c.kch || c.name}</span>
        <span class="xk-meta">${meta}</span>
      </label>`;
      div.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) STATE.targets.add(c.id);
        else STATE.targets.delete(c.id);
        div.classList.toggle('sel', e.target.checked);
        const sel = $('#xk-sel');
        if (sel) sel.textContent = STATE.targets.size;
      });
      courseListEl.appendChild(div);
    });

    if (countEl) countEl.textContent = STATE.courses.length;
    const sel = $('#xk-sel');
    if (sel) sel.textContent = STATE.targets.size;
    if (statusEl) {
      let info = `共 ${STATE.courses.length} 门课程`;
      if (qName || qTeacher) info += `，过滤后 ${filtered.length} 门`;
      info += ` | 目标 ${STATE.targets.size} 门`;
      if (STATE.category) info += ` | 类别: ${STATE.category.name}`;
      statusEl.textContent = info;
    }
  }

  function updateButtonStates() {
    const startBtn = $('#xk-start');
    const stopBtn = $('#xk-stop');
    if (startBtn) startBtn.disabled = STATE.running;
    if (stopBtn) stopBtn.disabled = !STATE.running;
  }

  // ============================================================
  // 扫描页面 DOM 解析课程
  // ============================================================
  function scanDOM() {
    if (!STATE.category) STATE.category = API.detectCategory();
    const catEl = $('#xk-cat');
    if (catEl && STATE.category) catEl.textContent = '· ' + STATE.category.name;
    log(`扫描页面课程（类别=${STATE.category.name}）…`, 'info');
    const found = parseCoursesFromDOM();
    const existIds = new Set(STATE.courses.map((c) => c.id));
    for (const c of found) {
      if (!existIds.has(c.id)) STATE.courses.push(c);
    }
    log(`DOM 解析到 ${found.length} 门课程，累计 ${STATE.courses.length} 门`, 'success');
    updateCourseList();

    // DOM 解析不到课程时，自动用查询接口拉取全部
    if (STATE.courses.length === 0 && STATE.category && STATE.category.listUrl) {
      log('DOM 无课程，自动调用查询接口拉取全部…', 'warn');
      fetchCoursesByQuery({}).then((list) => {
        const e2 = new Set(STATE.courses.map((c) => c.id));
        for (const c of list) {
          if (!e2.has(c.id)) STATE.courses.push(c);
        }
        log(`查询接口拉取 ${list.length} 门，累计 ${STATE.courses.length} 门`, 'success');
        updateCourseList();
      });
    }
  }

  // 通过查询接口搜索
  async function searchFromQuery() {
    if (!STATE.category) STATE.category = API.detectCategory();
    const filter = {
      kcxx: ($('#xk-q-name')?.value || '').trim(),
      skls: ($('#xk-q-teacher')?.value || '').trim(),
    };
    if (!filter.kcxx && !filter.skls) {
      log('请输入课程名或教师作为搜索条件', 'warn');
      return;
    }
    log(`从查询接口 ${STATE.category.listUrl} 拉取课程…`, 'info');
    const list = await fetchCoursesByQuery(filter);
    const existIds = new Set(STATE.courses.map((c) => c.id));
    for (const c of list) {
      if (!existIds.has(c.id)) STATE.courses.push(c);
    }
    log(`查询到 ${list.length} 门课程，累计 ${STATE.courses.length} 门`, 'success');
    updateCourseList();
  }

  // 通过课程编号添加抢课目标
  // 只接受课程编号（如 GXGL9500），调查询接口匹配到课程名和教师后显示并加入目标
  async function addByCourseKeyword(keywords) {
    if (!STATE.category) STATE.category = API.detectCategory();
    if (!STATE.category.listUrl) {
      log('当前类别不支持查询接口，请先进入具体选课页面（公选课/必修等）', 'error');
      return;
    }
    const resultEl = $('#xk-manual-result');
    if (resultEl) resultEl.innerHTML = '';

    log(`查询 ${keywords.length} 个课程编号: ${keywords.join(', ')}`, 'info');
    const lines = [];

    for (const kw of keywords) {
      const filter = { kcxx: kw, skls: '' };
      const list = await fetchCoursesByQuery(filter);

      // 只按课程编号(kch)匹配：精确匹配优先，其次包含匹配
      let matched = list.filter((c) =>
        c.kch && c.kch.toLowerCase() === kw.toLowerCase()
      );
      if (matched.length === 0) {
        matched = list.filter((c) =>
          c.kch && c.kch.toLowerCase().indexOf(kw.toLowerCase()) >= 0
        );
      }
      // 如果查询接口返回空（关键词被过滤），拉全部再本地匹配
      if (matched.length === 0 && list.length === 0) {
        const all = await fetchCoursesByQuery({});
        matched = all.filter((c) =>
          c.kch && c.kch.toLowerCase() === kw.toLowerCase()
        );
        if (matched.length === 0) {
          matched = all.filter((c) =>
            c.kch && c.kch.toLowerCase().indexOf(kw.toLowerCase()) >= 0
          );
        }
      }

      if (matched.length === 0) {
        log(`❌ 课程编号 "${kw}" 没找到匹配的课程`, 'error');
        lines.push(`<div style="color:#dc3545;">❌ ${kw} — 未找到课程</div>`);
        continue;
      }

      // 去重（同课程号可能有多个课序号）
      const seen = new Set();
      const unique = [];
      for (const c of matched) {
        const key = c.jx0404id || (c.kch + '_' + c.kexuhao);
        if (!seen.has(key)) { seen.add(key); unique.push(c); }
      }

      // 显示匹配结果（课程名 + 教师 + 剩余容量）
      for (const c of unique) {
        const exist = STATE.courses.find((x) => x.id === c.id);
        if (!exist) STATE.courses.push(c);
        STATE.targets.add(c.id);
        const syrsInfo = c.syrsText ? ` 余${c.syrsText}` : '';
        lines.push(
          `<div style="color:#28a745;">✅ ${c.kch}/${c.kexuhao} — ${c.kcmc}（教师: ${c.skls}）${syrsInfo} → 已加入目标</div>`
        );
        log(`✅ 匹配到: ${c.kcmc}(${c.kch}/${c.kexuhao}) 教师:${c.skls} → 已加入目标`, 'success');
      }
    }

    if (resultEl) resultEl.innerHTML = lines.join('');
    updateCourseList();
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    // 仅在选课相关页面构建 UI
    if (!/\/jsxsd\/(xsxk|xsxkkc|xsxkjg)\//.test(location.pathname)) return;
    // 标题页（xsxk_index 仅显示目录）也允许，但提示用户点击进入具体类别
    if (/\/xsxk\/xsxk_index/.test(location.pathname)) {
      log('当前是选课目录页。请先点击"公选课选课"等具体类别进入课程列表页，脚本才会自动加载课程', 'info');
    }
    buildUI();
    // 自动识别类别
    STATE.category = API.detectCategory();
    const catEl = $('#xk-cat');
    if (catEl && STATE.category) catEl.textContent = '· ' + STATE.category.name;
    log(`已识别类别: ${STATE.category.name}`, 'info');
    // 自动扫描
    setTimeout(scanDOM, 500);

    // 监听 DOM 变化（DataTables 异步刷新）
    const obs = new MutationObserver(() => {
      if (!document.getElementById('sdjzu-xk-helper')) return;
      // 检查是否有未识别的新行
      const table = $('table.dataTable, table.display, #dataView') || $('table');
      if (!table) return;
      const rows = $$('tbody tr', table);
      const known = new Set(STATE.courses.map((c) => c.row));
      const hasNew = rows.some((r) => !known.has(r));
      if (hasNew) {
        clearTimeout(window.__xkRescanTimer);
        window.__xkRescanTimer = setTimeout(scanDOM, 600);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ============================================================
  // 重写 confirm / alert，循环时静默
  // ============================================================
  const origConfirm = window.confirm;
  window.confirm = function (msg) {
    if (STATE.running) {
      log(`[自动确认 confirm] ${msg}`, 'info');
      return true;
    }
    return origConfirm.call(window, msg);
  };
  const origAlert = window.alert;
  window.alert = function (msg) {
    if (STATE.running) {
      log(`[服务器返回 alert] ${msg}`, 'info');
      return;
    }
    return origAlert.call(window, msg);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
