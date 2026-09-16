# 山建选课助手 · 油猴脚本（Tampermonkey Userscript）

> 直接对接**山东建筑大学**教务系统（`xjwgl.sdjzu.edu.cn` / jsxsd 金智教务）选课接口的自动抢课脚本。
> 只需输入课程编号（`GXGL9500`）、课程名或教师名，脚本自动调查询接口拿到内部 ID，循环调选课接口重试直到选上。

---

## 一、安装

### 步骤 1：安装脚本管理器（油猴 / 脚本猫 任选其一）

本脚本兼容 **油猴（Tampermonkey）** 和 **脚本猫（ScriptCat）**，二选一安装即可。

| 扩展 | Chrome 应用商店 | Edge 加载项 | Firefox 附加组件 | 官网 |
|------|----------------|------------|-----------------|------|
| 油猴 Tampermonkey | [链接](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [链接](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) | [链接](https://addons.mozilla.org/firefox/addon/tampermonkey/) | https://www.tampermonkey.net/ |
| 脚本猫 ScriptCat | [链接](https://chromewebstore.google.com/detail/scriptcat/ndibnaafbcjoppljlgjpgnmijokdcmma) | [链接](https://microsoftedge.microsoft.com/addons/detail/脚本猫/liilgpjgabokdklappibcjfablkpcekh) | [链接](https://addons.mozilla.org/firefox/addon/scriptcat/) | https://docs.scriptcat.org/ |

安装后工具栏会出现 🐒（油猴）或 🐱（脚本猫）图标。

### 步骤 2：安装脚本

**方式 A：脚本猫平台一键安装（脚本猫用户推荐）**

已上传至脚本猫平台，打开链接直接安装：
```
https://scriptcat.org/zh-CN/script-show-page/8001
```

**方式 B：URL 导入（油猴 / 脚本猫通用）**

在脚本管理器设置 → 实用工具 → URL 导入，粘贴：
```
https://raw.githubusercontent.com/kernel12345/SDJZUqiangke/main/选课助手.js
```

**方式 C：手动粘贴**

1. 点工具栏 🐒/🐱 图标 → **添加新脚本…**
2. 打开 [选课助手.js](选课助手.js)，全部复制
3. 粘贴到编辑器，Ctrl+S 保存
4. 左侧"已安装脚本"里应该能看到"SDJZU 教务系统选课助手"

> 脚本猫用户注意：脚本猫的 API（`GM_xmlhttpRequest`、`GM_notification` 等）与油猴完全兼容，脚本无需任何修改即可直接运行。

### 步骤 3：验证生效

1. 打开 `https://xjwgl.sdjzu.edu.cn/jsxsd/` 并登录
2. 进入选课中心，点"公选课选课"
3. 页面右上角出现"🚀 山建选课助手 v2.2"面板 = 成功

---

## 二、使用方法

### 完整流程（5 步）

```
┌─────────────────────────────────────────────────────────────┐
│  ① 输入课程关键词（输入即实时过滤 ② 的课程列表）                  │
│  ┌─────────────────────────────────────────┐                │
│  │  课程名/课程号/教师关键词  [GXGL9500    ] │                │
│  │  教师               [李奇会      ]       │  [搜索]       │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ② 已识别课程（共 114 门，已勾选 0 门）                         │
│  ┌─────────────────────────────────────────────────┐        │
│  │  [☑ 只显示在线课程]                              │        │
│  │  [GXGL9500] 读懂建设工程经济 (李奇会) 余122  ☐    │        │
│  │  [GXGL9497] 数据艺术 (徐茜) 余52              ☐    │        │
│  │  …更多（已满课程默认隐藏）                           │        │
│  │  [🔄 读取页面课程] [全选] [清空]                  │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ③ 输入课程编号，查接口匹配课程名/教师后加入目标 ✨ 核心功能 ✨  │
│  ┌─────────────────────────────────────────────────┐        │
│  │  每行一个课程编号，例如:                           │        │
│  │  GXGL9500                                       │        │
│  │  GXGL9497                                       │        │
│  └─────────────────────────────────────────────────┘        │
│  [🔎 查接口并加入目标]                                       │
│  → 下方显示: ✅ GXGL9500/01 — 读懂建设工程经济（教师: 李奇会）余122 → 已加入目标 │
│                                                             │
│  ④ 抢课参数                                                 │
│  重试间隔(ms): [800   ]  最大尝试(0=无限): [0  ]             │
│                                                             │
│  ⑤ [▶ 开始抢课]   [■ 停止]                                  │
│                                                             │
│  日志：                                                     │
│  [15:49:46.779] ✅ 匹配到: 读懂建设工程经济(GXGL9500/01) 教师:李奇会 → 已加入目标 │
│  [15:49:47.285] ✅ 开始抢课，类别=公选课，目标 1 门，间隔 800ms │
│  [15:49:48.086] ✅ 读懂建设工程经济 - 选课成功！                │
└─────────────────────────────────────────────────────────────┘
```

### 面板各区域说明

| 区域 | 功能 | 操作 |
|------|------|------|
| ① 按条件搜索 | 输入即实时过滤 ② 的课程列表；点"搜索"从接口拉取 | 输入课程名/课程号/教师关键词 |
| ② 已识别课程 | 当前页面/查询到的所有课程，勾选加入抢课目标 | 勾选复选框 / 全选 / 清空 / 只显示在线课程 |
| ③ 输入课程编号 | ✨ 最常用 ✨ 输入课程编号，自动查接口匹配课程名+教师并加入目标 | 每行一个课程编号 → 点"🔎 查接口并加入目标" |
| ④ 抢课参数 | 控制循环行为 | 修改数字框 |
| ⑤ 日志 | 实时显示每次请求的结果 | 滚动查看 |

### 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 重试间隔 | 800ms | 两次请求之间的等待时间。建议 ≥ 500ms，太短易被风控 |
| 最大尝试 | 0（无限） | 达到后自动停止。设成 500 次大概能跑 6-7 分钟 |

---

## 目录

- [一、安装](#一安装)
- [二、使用方法](#二使用方法)
- [三、项目背景](#三项目背景)
- [四、功能清单](#四功能清单)
- [五、接口技术规格（2026-09-16 实地抓包验证）](#五接口技术规格2026-09-16-实地抓包验证)
  - [5.1 公选课选课接口 `ggxxkxkOper`](#51-公选课选课接口-ggxxkxkoper)
  - [5.2 课程列表查询接口 `xsxkGgxxkxk`](#52-课程列表查询接口-xsxkgxxkxk)
  - [5.3 其他类别选课接口](#53-其他类别选课接口)
  - [5.4 选课按钮 HTML 结构](#54-选课按钮-html-结构)
  - [5.5 批次 ID `jx0502zbid`](#55-批次-id-jx0502zbid)
- [六、脚本架构](#六脚本架构)
  - [6.1 模块划分](#61-模块划分)
  - [6.2 调用链](#62-调用链)
- [七、关键机制详解](#七关键机制详解)
  - [7.1 类别识别（三级兜底）](#71-类别识别三级兜底)
  - [7.2 课程关键词 → 内部 ID 自动补全](#72-课程关键词--内部-id-自动补全)
  - [7.3 抢课循环](#73-抢课循环)
  - [7.4 静默 confirm / alert](#74-静默-confirm--alert)
  - [7.5 HTTP 请求双兜底](#75-http-请求双兜底)
- [八、常见问题排查 FAQ](#八常见问题排查-faq)
- [九、二次开发指南](#九二次开发指南)
- [十、风险提示](#十风险提示)
- [十一、Changelog](#十一changelog)
- [十二、License](#十二license)

---

## 三、项目背景

山东建筑大学教务系统使用金智教务（jsxsd），选课流程为：

1. 登录 → 进入选课中心
2. 点击"公选课选课"等类别 → DataTables 异步加载课程列表
3. 点击某课程行的"选课"按钮 → 弹出 `confirm("提示：你确认选择当前课程班级？")` → 调 AJAX → 返回 JSON 结果

传统手动抢课的痛点：
- 选课开始瞬间万人并发，手速拼不过脚本
- 选满后需要手动刷新页面捡漏，反复点 confirm 很烦
- 学生只知道课程编号（如 `GXGL9500`），不知道内部 `jx0404id`

本脚本的核心思路：**直接调接口，绕过页面**。

---

## 四、功能清单

| # | 功能 | 实现函数 | 说明 |
|---|------|----------|------|
| 1 | 自动类别识别 | `API.detectCategory()` | URL → DOM 关键字 → 选课按钮函数名，三级兜底 |
| 2 | DOM 解析课程 | `parseCoursesFromDOM()` | 扫描 `table.dataTable`，从 xsxkFun href 提取参数 |
| 3 | 查询接口拉课程 | `fetchCoursesByQuery()` | 调 DataTables 服务端接口，自动解析 czOper HTML |
| 4 | DOM 空时自动兜底 | `scanDOM()` 内逻辑 | DOM 解析 0 门时自动调查询接口拉全量 |
| 5 | 关键词查 ID | `addByCourseKeyword()` | 输入课程编号/名称/教师，自动查接口补全 jx0404id |
| 6 | 抢课前补全 ID | `start()` 内逻辑 | 开始抢课前检查目标是否有 jx0404id/kcid，缺了自动补 |
| 7 | 抢课循环 | `runLoop()` | 自定义间隔 + 最大次数，选上自动停止 |
| 8 | 调选课接口 | `callSelect()` → `API.buildSelectRequest()` | 根据类别构造不同请求 |
| 9 | 解析选课响应 | `API.parseSelectResponse()` | 兼容 JSON / HTML / script:alert 三种格式 |
| 10 | 静默弹窗 | `window.confirm/alert` 重写 | 循环时自动返回 true / 吞掉 alert |
| 11 | HTTP 双兜底 | `http()` | XMLHttpRequest 优先，CSP 拦截时 GM_xmlhttpRequest 兜底 |
| 12 | 桌面通知 | `GM_notification` | 抢课成功时弹窗提醒 |
| 13 | 面板拖拽 | 鼠标事件 | 面板可拖动到任意位置 |

---

## 五、接口技术规格（2026-09-16 实地抓包验证）

> 所有接口均在同源 `https://xjwgl.sdjzu.edu.cn` 下调用，需携带登录 Cookie（`JSESSIONID` + `rememberMe`）。

### 3.1 公选课选课接口 `ggxxkxkOper`

| 项目 | 值 |
|------|-----|
| **完整 URL** | `https://xjwgl.sdjzu.edu.cn/jsxsd/xsxkkc/ggxxkxkOper?kcid=<kcid>&cfbs=null` |
| **HTTP 方法** | `POST` |
| **Content-Type** | `application/x-www-form-urlencoded;charset=UTF-8` |
| **X-Requested-With** | `XMLHttpRequest`（推荐带上，服务器据此判断 AJAX） |

**Query String 参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kcid` | string | ✅ | 课程 ID（UUID 格式，如 `03C02306A9BE4269B3FB7841AAC32651`） |
| `cfbs` | string | ✅ | 选课方式，固定传 `"null"` |

**请求体（form-urlencoded）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `jx0404id` | string | ✅ | 课班级 ID（长数字串，如 `20262027114826`） |
| `xkzy` | string | ❌ | 选课志愿，空字符串即可 |
| `trjf` | string | ❌ | 投入积分，空字符串即可 |

**成功响应（HTTP 200）**

```json
{
  "success": true,
  "message": "选课成功！",
  "jfViewStr": "<b>剩余积分：</b>...",
  "cfbs": "null",
  "yxjx0404id": "",
  "yxcfbs": "",
  "sfydjc": false
}
```

**失败响应（HTTP 200）**

```json
{
  "success": false,
  "message": "该课程已选满，不能再选！",
  "jfViewStr": "",
  "cfbs": "null",
  "yxjx0404id": "",
  "yxcfbs": "",
  "sfydjc": false
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 选课结果，`true` 成功 / `false` 失败 |
| `message` | string | 结果提示，如"选课成功！"、"该课程已选满"、"时间冲突" |
| `jfViewStr` | string | 积分视图 HTML，非积分制专业为空 |
| `cfbs` | string | 回显选课方式 |
| `yxjx0404id` | string | 预选课 jx0404id，无预选课时为空 |
| `yxcfbs` | string | 预选课选课方式 |
| `sfydjc` | boolean | 是否需要验证，`true` 时会弹出验证窗口（本次抓包为 `false`） |

### 3.2 课程列表查询接口 `xsxkGgxxkxk`

DataTables 服务端分页接口，用于拉取课程列表。

| 项目 | 值 |
|------|-----|
| **完整 URL** | `https://xjwgl.sdjzu.edu.cn/jsxsd/xsxkkc/xsxkGgxxkxk` |
| **HTTP 方法** | `POST` |

**Query String 参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kcxx` | string | ❌ | 课程编号/名称关键词，空=全部 |
| `skls` | string | ❌ | 教师关键词 |
| `skxq` | string | ❌ | 星期，`"1"`-`"7"`，空=全部 |
| `skjc` | string | ❌ | 节次，如 `"1-2-"`，空=全部 |
| `sfym` | string | ✅ | 是否已选满，固定传 `"false"` |
| `sfct` | string | ✅ | 是否过滤冲突，`"true"` 过滤掉时间冲突的课 |
| `szjylb` | string | ❌ | 通选课类别（`"1"`-`"8"` 对应人文社科/外语计算机/体育卫生艺术/经济管理/自然科学工程/其他/美育/创新创业） |
| `sfxx` | string | ✅ | 是否过滤限选，固定传 `"true"` |
| `skfs` | string | ❌ | 授课方式，空=全部 |

**请求体（form-urlencoded，DataTables 标准）**

| 字段 | 类型 | 说明 |
|------|------|------|
| `iDisplayStart` | number | 起始位置，`0` = 第一页 |
| `iDisplayLength` | number | 每页条数，`200` 一次拉完所有 |
| `sEcho` | string | 请求序号，随便传 `"1"` |

**成功响应（HTTP 200）**

```json
{
  "aaData": [
    {
      "kch": "GXGL9500",
      "kcmc": "读懂建设工程经济-以城市更新项目为例",
      "kexuhao": "01",
      "xf": "2",
      "skls": "李奇会",
      "sksj": "3-13周 星期四 10-12",
      "skdd": "博文馆501[媒159]",
      "xqmc": "本部",
      "xkrs": "122",
      "syrs": "122",
      "ctsm": "",
      "szkcflmc": "经济管理类",
      "czOper": "<a href=\"javascript:xsxkFun('20262027114826','03C02306A9BE4269B3FB7841AAC32651','null')\">选课</a>"
    }
    // ... 更多课程
  ],
  "bbData": [],
  "flag": true,
  "flag1": "",
  "jfViewStr": ""
}
```

**aaData 字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `kch` | string | 课程编号（如 `GXGL9500`） |
| `kcmc` | string | 课程名称 |
| `kexuhao` | string | 课序号（同一课程号多班时区分，如 `"01"`） |
| `xf` | string | 学分 |
| `skls` | string | 上课教师 |
| `sksj` | string | 上课时间（如 `"3-13周 星期四 10-12"`） |
| `skdd` | string | 上课地点（如 `"博文馆501[媒159]"`） |
| `xqmc` | string | 校区名称 |
| `xkrs` | string | 已选课人数 |
| `syrs` | string | 剩余容量（抢课重点关注） |
| `ctsm` | string | 时间冲突说明，空=无冲突 |
| `szkcflmc` | string | 通选课类别名称 |
| `czOper` | string | 操作列 HTML，包含 `xsxkFun` 调用参数 |

### 3.3 其他类别选课接口

这些类别共享相同的请求格式，区别仅在 URL 路径和 operStyle。

| 类别 | operUrl | listUrl | operStyle |
|------|---------|---------|-----------|
| 公选课 | `/jsxsd/xsxkkc/ggxxkxkOper` | `/jsxsd/xsxkkc/xsxkGgxxkxk` | `ggxxkxk`（POST body 带 jx0404id，query 带 kcid+cfbs） |
| 必修课 | `/jsxsd/xsxkkc/bxxkOper` | `/jsxsd/xsxkkc/xsxkBxxk` | `simple`（query 带 jx0404id+jx0502zbid） |
| 限选课 | `/jsxsd/xsxkkc/xxxkOper` | `/jsxsd/xsxkkc/xsxkXxxk` | `simple` |
| 专业选课 | `/jsxsd/xsxkkc/zyxkOper` | `/jsxsd/xsxkkc/xsxkZyxk` | `simple` |
| 体育选课 | `/jsxsd/xsxkkc/tyxkOper` | `/jsxsd/xsxkkc/xsxkTyxk` | `simple` |
| 通识选修 | `/jsxsd/xsxkkc/tsxkOper` | `/jsxsd/xsxkkc/xsxkTsxk` | `simple` |

**simple 风格请求示例（以必修课为例）**

```
POST /jsxsd/xsxkkc/bxxkOper?jx0404id=20262027114826&jx0502zbid=764075018A02426894C0C67147B30BD6
Content-Type: application/x-www-form-urlencoded;charset=UTF-8
X-Requested-With: XMLHttpRequest
（无请求体）
```

### 3.4 选课按钮 HTML 结构

公选课页面表格 `table#dataView.display.dataTable`，12 列：

| 列序 | 表头 | 对应 JSON 字段 |
|------|------|---------------|
| 0 | 课程编号 | `kch` |
| 1 | 课程名 | `kcmc` |
| 2 | 课序号 | `kexuhao` |
| 3 | 学分 | `xf` |
| 4 | 上课教师 | `skls` |
| 5 | 上课时间 | `sksj` |
| 6 | 上课地点 | `skdd` |
| 7 | 上课校区 | `xqmc` |
| 8 | 剩余容量 | `syrs` |
| 9 | 时间冲突 | `ctsm` |
| 10 | 通选课类别 | `szkcflmc` |
| 11 | 操作 | `czOper` |

操作列的选课按钮：

```html
<a href="javascript:xsxkFun('20262027114826','03C02306A9BE4269B3FB7841AAC32651','null')">选课</a>
```

参数解析：`xsxkFun(jx0404id, kcid, cfbs)`

| 参数 | 示例值 | 来源 |
|------|--------|------|
| `jx0404id` | `20262027114826` | 课班级 ID，唯一标识一个教学班 |
| `kcid` | `03C02306A9BE4269B3FB7841AAC32651` | 课程 ID，UUID 格式 |
| `cfbs` | `null` | 选课方式，当前固定传 `"null"` |

**前端调用链**

```
用户点 <a>选课</a>
  → 触发 href 里的 xsxkFun('jx0404id','kcid','null')
    → xsxkFun 弹 confirm("提示：你确认选择当前课程班级？")
      → 用户点确定 → xsxkOper(jx0404id, "", "", kcid, cfbs)
        → $.ajax({ url: "ggxxkxkOper", type: "POST", data: { jx0404id, xkzy, trjf } })
          → 返回 JSON → 解析 success/message → 弹 alert 或刷新表格
```

脚本直接跳过 `xsxkFun` / `confirm` / `xsxkOper`，构造请求调 `ggxxkxkOper`。

### 3.5 批次 ID `jx0502zbid`

每个选课批次有唯一的 `jx0502zbid`，从选课中心 URL 提取：

```
https://xjwgl.sdjzu.edu.cn/jsxsd/xsxk/xsxk_index?jx0502zbid=764075018A02426894C0C67147B30BD6
                                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

脚本通过 `new URLSearchParams(location.search).get('jx0502zbid')` 自动提取。

---

## 六、脚本架构

### 4.1 模块划分

```
脚本顶层 IIFE
├── 工具层
│   ├── $ / $$ / sleep / ts / getZbid
│   └── http()          —— 同源 XHR + GM_xmlhttpRequest 双兜底
├── API 层（硬编码接口规格）
│   ├── categories      —— 6 种类别 + 通用兜底
│   ├── detectCategory()    —— 三级类别识别
│   ├── buildSelectRequest()   —— 根据类别构造选课请求
│   ├── buildListRequest()     —— 构造查询请求
│   └── parseSelectResponse()  —— 解析选课响应（JSON/HTML/script）
├── 状态层
│   └── STATE { courses, targets, running, stopFlag, retryMs, ... }
├── 数据层
│   ├── parseCoursesFromDOM() —— DOM 表格解析
│   └── fetchCoursesByQuery() —— 查询接口拉取
├── 业务层
│   ├── addByCourseKeyword()  —— 关键词 → 课程对象
│   ├── callSelect()          —— 单次选课
│   ├── runLoop()             —— 抢课循环
│   ├── start() / stop()      —— 控制入口（start 内含 ID 补全）
│   └── scanDOM()             —— 扫描入口（内含 API 兜底）
└── UI 层
    ├── buildUI()             —— 构建面板 DOM
    ├── updateCourseList()    —— 渲染课程列表
    └── updateButtonStates()  —— 按钮启用/禁用
```

### 4.2 调用链

```
用户操作
  │
  ├─ 输入关键词 → 点"🔎 查接口并加入目标"
  │   └─ addByCourseKeyword(['GXGL9500', '数据艺术'])
  │       └─ fetchCoursesByQuery({ kcxx: 'GXGL9500' })
  │           └─ http({ method:'POST', url:'...xsxkGgxxkxk?kcxx=GXGL9500', body:'iDisplayStart=0...' })
  │               └─ parseCoursesFromJSON → 返回 [{ kch, kcmc, jx0404id, kcid, ... }]
  │       └─ 本地匹配 → 找到 jx0404id → 加入 STATE.targets
  │
  ├─ 点"▶ 开始抢课"
  │   └─ start()
  │       ├─ detectCategory() → 识别类别（如公选课）
  │       ├─ 检查 targets 中 jx0404id/kcid 是否缺失
  │       │   └─ fetchCoursesByQuery({}) → 补全缺失 ID
  │       └─ runLoop()
  │           └─ while (!stopFlag):
  │               for id in targets:
  │                   callSelect(course)
  │                       └─ API.buildSelectRequest(course, category)
  │                           └─ POST ggxxkxkOper?kcid=XXX&cfbs=null
  │                              body: jx0404id=YYY&xkzy=&trjf=
  │                       └─ http(...)
  │                       └─ API.parseSelectResponse(text) → { success, message }
  │                   if success: targets.delete(id); notify()
  │               sleep(retryMs)
  │
  └─ 点"🔄 读取页面课程"
      └─ scanDOM()
          ├─ parseCoursesFromDOM() → 从 table.dataTable 提取
          └─ if courses.length === 0:
              └─ fetchCoursesByQuery({}) → API 兜底
```

---

## 七、关键机制详解

### 5.1 类别识别（三级兜底）

教务系统有两种页面形态：
1. **直接链接**：`/jsxsd/xsxkkc/comeInGgxxkxk` — URL 含类别关键词
2. **AJAX 加载**：`/jsxsd/xsxk/xsxk_index` — URL 不变，内容动态切换

`detectCategory()` 的三级识别：

```
第一级：URL 路径匹配
  pathMap = [
    { urlKey: 'ggxxkxk', catKey: 'ggxxkxk' },
    { urlKey: 'bxxk',    catKey: 'bxxk' },
    ...
  ]
  p.toLowerCase().indexOf('ggxxkxk') >= 0 → 命中 ✓

第二级：DOM 内容关键字（AJAX 页面兜底）
  bodyTxt = document.body.innerText.slice(0, 2000)
  kwMap = [
    { kw: '通选课类别', catKey: 'ggxxkxk' },
    { kw: '公选课',     catKey: 'ggxxkxk' },
    { kw: '必修选课',   catKey: 'bxxk' },
    ...
  ]
  bodyTxt.indexOf('通选课类别') >= 0 → 命中 ✓

第三级：选课按钮 href 函数名
  找第一个 /选课/.test(textContent) 的 a[href^="javascript:"]
  href 含 xsxkFun → 公选课
  href 含 bxxkOper → 必修课
  ...

都不命中 → generic（无 listUrl/operUrl，无法查询/选课）
```

### 5.2 课程关键词 → 内部 ID 自动补全

学生只知道 `GXGL9500` 或"数据艺术"，不知道 `20262027114826`（jx0404id）。

`addByCourseKeyword()` 工作流程：

```
输入：['GXGL9500', '数据艺术', '李奇会']

对每个关键词 kw:
  1. 调 fetchCoursesByQuery({ kcxx: kw })
     → POST ...xsxkGgxxkxk?kcxx=<kw>&...
     → 返回 aaData[] 数组

  2. 精确匹配（三重 OR）
     aaData.filter(c =>
       c.kch.toLowerCase() === kw.toLowerCase()    // 课程编号精确
       || c.kch.toLowerCase().includes(kw.toLowerCase())  // 课程编号包含
       || c.kcmc.includes(kw)                       // 课程名包含
       || c.skls.includes(kw)                       // 教师名包含
     )

  3. 如果精确匹配 0 条（可能接口过滤了关键词）
     → 再拉一次全部课程 fetchCoursesByQuery({})
     → 本地宽泛匹配

  4. 去重（同课程号可能有多个课序号）
     seen = Set()
     unique = []
     for c in matched:
       key = c.jx0404id || (c.kch + '_' + c.kexuhao)
       if !seen.has(key): seen.add(key); unique.push(c)

  5. 加入目标
     if unique.length === 1: 直接加入，log ✅
     if unique.length > 1:   全部加入，log ⚠️ 匹配到 N 门
     if unique.length === 0: log ❌ 没找到
```

### 5.3 抢课循环

```
runLoop():
  STATE.running = true
  while (!STATE.stopFlag):
    for id in Array.from(STATE.targets):     // 快照，循环中 targets 会变
      if STATE.stopFlag: break

      course = STATE.courses.find(c => c.id === id)
      if !course: STATE.targets.delete(id); continue

      STATE.attempts++
      if STATE.maxAttempts > 0 && STATE.attempts > STATE.maxAttempts:
        STATE.stopFlag = true; break

      result = callSelect(course)   // 单次调用

      if result.success:
        STATE.targets.delete(id)    // 已选上，移出目标
        STATE.successCount++
        if course.row: course.row.style.backgroundColor = '#d4edda'
        GM_notification('抢课成功', course.kcmc)
      else:
        // 根据失败原因分级日志
        // 满 → warn（高频重试也没用，可以考虑移出目标）
        // 冲突 → warn
        // 其他 → info

    sleep(STATE.retryMs)   // 下一轮
```

关键设计：**`targets` 是 Set，选上即删除**，循环自然终止。

### 5.4 静默 confirm / alert

脚本顶层 IIFE 末尾：

```js
const origConfirm = window.confirm;
window.confirm = function(msg) {
  if (STATE.running) {
    log('[自动确认 confirm] ' + msg, 'info');
    return true;                      // 抢课中：自动点确定
  }
  return origConfirm.call(window, msg); // 非抢课：正常弹窗
};

const origAlert = window.alert;
window.alert = function(msg) {
  if (STATE.running) {
    log('[服务器返回 alert] ' + msg, 'info');
    return;                           // 抢课中：吞掉
  }
  return origAlert.call(window, msg);
};
```

这样脚本运行时，用户手动点"选课"按钮也不会被弹窗卡住——因为脚本重写的 confirm/alert 对所有调用者生效。

### 5.5 HTTP 请求双兜底

```js
function http(opts) {
  // 1) 同源 XMLHttpRequest（优先，因为能自动带 Cookie）
  try {
    const xhr = new XMLHttpRequest();
    xhr.open(opts.method, opts.url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.timeout = 15000;
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 400, text: xhr.responseText });
    xhr.onerror = () => resolve({ ok: false, text: '网络错误' });
    xhr.send(opts.body || '');
  } catch (e) {
    // 2) GM_xmlhttpRequest 兜底（某些浏览器 CSP 会拦 XHR）
    GM_xmlhttpRequest({
      method: opts.method, url: opts.url, data: opts.body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      timeout: 15000,
      onload: (r) => resolve({ ok: r.status >= 200 && r.status < 400, text: r.responseText }),
      onerror: () => resolve({ ok: false, text: 'GM 网络错误' }),
    });
  }
}
```

两者都同源，自动携带登录 Cookie（`JSESSIONID` + `rememberMe`），**不需要手动加 Cookie 请求头**。

---

## 八、常见问题排查 FAQ

### Q1：面板不出现？

**可能原因**：
1. 脚本未在该域名匹配。Tampermonkey 仪表板 → 脚本详情 → 检查"已包含 URL"是否有 `*://xjwgl.sdjzu.edu.cn/jsxsd/*`
2. 脚本被浏览器 CSP 拦截。F12 → Console 看有没有 `Refused to load` 报错
3. 页面 URL 不在 `/jsxsd/` 路径下。面板只在 `https://xjwgl.sdjzu.edu.cn/jsxsd/*` 注入

**解决**：Tampermonkey → 脚本详情 → 在元数据里加一行：
```
@match *://xjwgl.sdjzu.edu.cn/*
```

### Q2：面板出现但"已识别课程"为 0？

**可能原因**：
1. DOM 还没渲染完。DataTables 异步加载，`document-idle` 时表格可能还空
2. 在目录页（`xsxk_index`）而不是课程列表页

**解决**：
- 先点"🔄 读取页面课程"手动触发扫描
- 等 2 秒让 DataTables 渲染完再点
- 如果还不行，输入课程编号到 ③ 区域手动加

### Q3：类别显示"通用"而不是"公选课"？

**可能原因**：教务系统用 AJAX 加载内容，URL 不变（停在 `xsxk_index`）

**已修**：`detectCategory()` 三级兜底已包含 DOM 内容关键字匹配，会从 body.innerText 里找"通选课类别"/"公选课"等词。如果还显示"通用"，说明 DOM 还没渲染完，等 2 秒刷新面板即可。

### Q4：输入课程编号后"查接口并加入目标"报错？

**可能原因**：
1. 还没进入具体选课页（停在目录页），`STATE.category.listUrl` 为 null
2. 查询接口返回空（session 过期、批次无效）

**解决**：先点"公选课选课"进入课程列表页，再输入关键词。如果还是报错，F12 → Network 看请求是否成功。

### Q5：抢课显示"选课失败 - 该课程已选满"但页面还有剩余容量？

**可能原因**：教务系统的"剩余容量"是缓存值，多人同时选时实际已满。或者课程有多重限制（时间冲突、限选范围）。

**解决**：
- 换另一门有剩余的
- 等别人退课后捡漏（脚本持续重试就能抓到）
- 抢课前先点页面上的"过滤已满课程"

### Q6：抢课显示"选课失败 - 时间冲突"？

**解决**：脚本不会自动跳过冲突课程。手动把冲突课从目标里移除，或换同时间其他课。

### Q7：抢课过程中被踢出登录？

**原因**：高频请求触发风控，session 被服务器强制失效。

**解决**：
1. 降低重试间隔到 1500ms 以上
2. 浏览器不要同时开多个教务系统标签页
3. 被踢后重新登录，手动开一次选课按钮（触发 confirm），再继续用脚本

### Q8：如何确认脚本真的在调接口？

**F12 → Network**，筛选 XHR/Fetch，应该能看到：
- 红色或灰色的 `ggxxkxkOper?kcid=...` 请求
- Response 是 JSON `{success: true, message: "..."}`

如果 Network 里没有这个请求，说明脚本没在运行或目标没 jx0404id。

---

## 九、二次开发指南

### 如何添加新的选课类别？

在 `API.categories` 里加一条：

```js
categories: {
  // ...
  新类别: {
    name: '新类别中文名',
    listUrl: '/jsxsd/xsxkkc/xsxk新类别接口',
    operUrl: '/jsxsd/xsxkkc/新类别Oper',
    operStyle: 'simple',  // 或 'ggxxkxk'
  },
}
```

然后在 `detectCategory()` 的 `pathMap` / `kwMap` 里加对应的 urlKey 和 kw。

### 如何适配其他学校的 jsxsd 系统？

金智教务（jsxsd）在多所高校使用，接口格式高度相似：

1. 登录目标学校，进入选课页
2. F12 → Network，手动点一次"选课"按钮
3. 记下选课接口 URL、方法、Query 参数、请求体格式
4. 对照本脚本的 `API.categories` 添加
5. 记下查询接口，添加 `listUrl`
6. 更新脚本顶部的 `@match` 规则

### 如何调试脚本？

1. Tampermonkey → 脚本详情 → 编辑
2. F12 → Console，直接输入：
   ```js
   // 测试类别识别
   unsafeWindow.__test = API.detectCategory(); // 不行，API 是闭包内的
   ```
3. 在脚本里临时加 `window.__debug = { STATE, API };` 暴露变量
4. Console 里就能直接访问 `__debug.STATE.courses`、`__debug.API.detectCategory()`

### 如何添加新功能？

| 需求 | 修改位置 |
|------|---------|
| 自动跳过"已满"课程 | `runLoop()` 里 `result.success === false` 时检查 message 是否含"满"，含则 targets.delete |
| 按优先级抢课 | targets 改成数组按优先级排序，循环按数组顺序 |
| 多个课程同时抢 | 在 `runLoop` 里用 `Promise.all` 并发，注意可能被风控 |
| 定时开始抢课 | 加 `setTimeout(() => start(), targetTime - Date.now())` |
| 导入/导出配置 | 加 GM_setValue/GM_getValue 持久化 STATE.targets |

---

## 十、风险提示

1. **封号风险**：高频请求教务系统可能触发风控，session 被强制失效。建议间隔 ≥ 1000ms，单次运行不超过 30 分钟
2. **选课后无法退课**：脚本走的是选课接口，退课要走 `/jsxsd/xsxkkc/退课Oper`，本次未抓包。如果选了不想要的课，请**手动**操作退课
3. **接口变更**：教务系统可能升级，接口 URL/参数格式可能变。如果脚本突然不工作，请重新抓包
4. **验证码**：本次抓包 `sfydjc=false` 不需要验证码。如果系统开启验证码（`sfyzmxk=1`），脚本会失效
5. **多浏览器 session 冲突**：用系统浏览器登录后，不要同时用其他浏览器登录同一账号（同一个 Cookie 会互相挤掉）

---

## 十一、Changelog

- **v2.1.0** — 类别识别三级兜底（URL → DOM 关键字 → 函数名）、手动添加改为课程编号/名称/教师自动查询补全、开始抢课前自动补全缺失 jx0404id/kcid
- **v2.0.0** — 实地抓包验证，硬编码 `ggxxkxkOper` / `xsxkGgxxkxk` 接口及其他类别路径，支持查询接口自动加载课程，支持课程关键词搜索
- **v1.0.0** — 自适应版本，自动从 DOM 按钮识别 API，GM_xmlhttpRequest 兜底 CSP

---

## 十二、License

MIT
