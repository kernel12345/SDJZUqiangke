# 山建选课助手 · 油猴脚本

> 直接对接山东建筑大学教务系统选课接口的 Tampermonkey 脚本，自动抢课 / 捡漏，支持公选课 / 必修 / 限选 / 专业选课 / 体育 / 通识选修。

## ✨ 特性

- **无需知道内部 ID** — 只输入课程编号（如 `GXGL9500`）、课程名或教师名，脚本自动调查询接口补全 `jx0404id` / `kcid`
- **直接调接口** — 已硬编码公选课 `ggxxkxkOper` 等接口路径，绕过页面按钮点击，跳过 DOM 渲染延迟
- **自动重试循环** — 自定义间隔 + 最大尝试次数，选上自动停止并桌面通知
- **静默弹窗** — 自动重写 `window.confirm` / `alert`，循环时不卡确认框
- **自动类别识别** — URL 不变？从 DOM 内容推断；DOM 也没有？从选课按钮 href 的函数名推断
- **查询接口兜底** — DOM 扫描不到课程时自动调 DataTables 查询接口拉全量 114 门

## 🔌 已抓包验证的接口规格

### 公选课选课

```
POST /jsxsd/xsxkkc/ggxxkxkOper?kcid=<kcid>&cfbs=null
Content-Type: application/x-www-form-urlencoded

jx0404id=<课班级ID>&xkzy=&trjf=
```

响应 JSON：`{ success: true/false, message: "...", jfViewStr, cfbs, yxjx0404id, yxcfbs, sfydjc }`

### 课程列表查询（DataTables 服务端分页）

```
POST /jsxsd/xsxkkc/xsxkGgxxkxk?kcxx=<关键词>&skls=&skxq=&skjc=&sfym=false&sfct=true&szjylb=&sfxx=true&skfs=
iDisplayStart=0&iDisplayLength=200&sEcho=1
```

响应 JSON：`{ aaData:[ {kch, kcmc, kexuhao, xf, skls, sksj, skdd, xqmc, syrs, ctsm, szkcflmc, czOper} ... ] }`

### 其他类别接口

| 类别 | 选课接口 |
|------|----------|
| 必修课 | `POST /jsxsd/xsxkkc/bxxkOper?jx0404id=<id>&jx0502zbid=<批次>` |
| 限选课 | `POST /jsxsd/xsxkkc/xxxkOper?jx0404id=<id>&jx0502zbid=<批次>` |
| 专业选课 | `POST /jsxsd/xsxkkc/zyxkOper?jx0404id=<id>&jx0502zbid=<批次>` |
| 体育选课 | `POST /jsxsd/xsxkkc/tyxkOper?jx0404id=<id>&jx0502zbid=<批次>` |
| 通识选修 | `POST /jsxsd/xsxkkc/tsxkOper?jx0404id=<id>&jx0502zbid=<批次>` |

### 选课按钮 HTML（公选课）

```html
<a href="javascript:xsxkFun('20262027114826','03C02306A9BE4269B3FB7841AAC32651','null')">选课</a>
```

调用链：`xsxkFun` → `confirm("提示：你确认选择当前课程班级？")` → `xsxkOper` → AJAX POST `ggxxkxkOper`

## 📦 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 新建脚本，粘贴 [选课助手.user.js](选课助手.user.js) 全部内容，Ctrl+S 保存
3. 登录教务系统（`https://xjwgl.sdjzu.edu.cn/jsxsd/`），进入具体选课页面（如公选课）
4. 页面右上角出现面板即表示生效

## 🚀 使用流程

1. **输入课程关键词** — 在面板 ③ 区域输入课程编号/名称/教师（每行一个），点"🔎 查接口并加入目标"
   - 例：`GXGL9500`、`数据艺术`、`李奇会`
   - 脚本自动查询接口并匹配，多门匹配会全部加入并提示
2. **或直接勾选** — 面板 ② 区域显示当前页课程，勾选要抢的课
3. **设置参数** — 重试间隔（默认 800ms）、最大尝试次数（0=无限）
4. **开始抢课** — 点 ▶ 开始抢课，脚本循环调接口，选上自动停止
5. **实时日志** — 面板底部显示每次请求的结果

## ⚠️ 风险提示

- 高频请求教务系统可能触发风控或封号，建议间隔 ≥ 1000ms
- 本脚本仅供学习研究，使用风险自担
- 抢课成功取决于网络速度、课程容量、服务器响应等多重因素

## 🛠️ 技术细节

- 运行域：`https://xjwgl.sdjzu.edu.cn/jsxsd/*`
- 运行时机：`document-idle`
- 请求方式：同域 XMLHttpRequest，CSP 受限时有 GM_xmlhttpRequest 兜底
- 批次 ID（jx0502zbid）：从当前页面 URL 自动提取
- xsxkFun 参数解析：正则匹配 `xsxkFun\('jx0404id','kcid','cfbs'\)` 从 czOper 列 HTML 提取

## 📝 Changelog

- **v2.1.0** — 修复类别识别（AJAX 页面 DOM 关键字兜底）、手动添加改为课程编号/名称/教师自动查询补全、开始抢课前自动补全缺失 ID
- **v2.0.0** — 实地抓包验证，硬编码全部接口路径，支持查询接口自动加载课程
- **v1.0.0** — 自适应版本，自动识别 DOM 按钮

## 📄 License

MIT
