# 📊 D3 多系列可视化实验

**App 使用情况（极坐标）× 年度资产价格（折线图）**

本项目使用 **D3.js v7** 实现两个独立的可视化系统（系列 1 & 系列 2），并将其统一展示在同一页面上。  
项目采用 startup 风格视觉设计（glassmorphism、渐变、柔光阴影、动画），代码结构完全解耦，具备开源级别的可维护性。

---

## 🌈 功能概览

### ⭐ 系列 1：APP 使用情况（极坐标图）

- 使用三层可视映射：
  - **角度** → 24 小时（12 时辰分布）
  - **半径** → 使用时长
  - **颜色** → 日期
- 每个 App 独立渲染为一张「小卡片」图表。
- 支持 tooltip（含时间段、星期、分钟数等信息）。
- 支持至少一处注释（annotation）。
- 含入场动画：扇形从中心“长出”。
- 完全模块化（`src/series1.js`）。

### ⭐ 系列 2：金融指数年度折线图（图表重制）

- 比较三项资产：
  - **S&P 500（标普 500）**
  - **Nasdaq Composite（纳指）**
  - **Bitcoin（比特币，1 月 1 日价格）**
- 平滑曲线（monotoneX）、点标记、tooltip、图例完整。
- 支持线性坐标或对数坐标。
- 完全模块化（`src/series2.js`）。

---

## 🧱 项目结构（完全解耦）

```
d3-multiseries-visualization-lab/
│
├── data/
│   ├── app_usage_2025-10-28_7days.js
│   └── SP500_Nasdaq_BTC_20yrs_annual.js
│
├── src/
│   ├── series1.js        # APP 使用极坐标图
│   ├── series2.js        # 金融指数折线图重制
│   ├── main.js           # 全局 orchestrator（不含绘图逻辑）
│   └── animation.js      # 页面 + 卡片动画
│
├── css/
│   └── style.css         # 全局 startup 风格视觉设计
│
├── index.html            # 页面布局 & 图表挂载点
├── STRUCTURE.md          # 项目结构设计说明
├── README.md
├── LICENSE               # GPL-3.0
└── .gitignore
```

该结构遵循 MECE 原则，职责明确：  

- **index.html** 只是布局与挂载点  
- **style.css** 负责全部视觉  
- **main.js** 负责调用与调度  
- **series1.js / series2.js** 负责独立的可视化系统  
- **data/** 作为纯数据源  

---

## 🎨 视觉设计理念（Design Philosophy）

项目使用 startup 式视觉语言，包含：

- **Glassmorphism**（毛玻璃卡片）  
- **柔光阴影 + 透光渐变背景**  
- **Conic / radial 渐变**  
- **栅格卡片布局（App Charts Grid）**  
- **滚动触发的进入动画 + 瀑布式卡片动画**  
- **Hero Panel 上的微 3D Parallax（跟随鼠标）**  

所有设计集中于 `css/style.css`，保持完全解耦。

---

## 🚀 运行方式（必须用 HTTP Server）

由于浏览器安全限制，不能直接打开 `index.html`（会触发 CORS）。  
你必须用本地 server 运行：

### 方法 A（推荐）—— VS Code Live Server

```
右键 index.html → Open with Live Server
```

### 方法 B —— Python 3

```sh
python3 -m http.server 8000
```

访问：

```
http://localhost:8000
```

### 方法 C —— Node

```sh
npx http-server .
```

---

## 📦 数据说明

### 系列 1（APP 使用情况）

- 数据文件：`app_usage_2025-10-28_7days.js`
- 数据格式：直接以 JS 常量暴露，避免 CSV 异步解析
- 在 `series1.js` 内自动聚合为 24 小时序列

### 系列 2（金融指数）

- 数据文件：`SP500_Nasdaq_BTC_20yrs_annual.js`
- 范围：2006—2025 年  
- 包含比特币早期价格缺失（自动处理 NaN）

---

## 🔧 技术栈

- **D3.js v7**
- HTML + CSS + JS（无构建工具）
- 浏览器原生运行
- 使用 requestAnimationFrame + IntersectionObserver 实现动画

---

## 🛠️ 开发注意事项

### 为什么分成两个图表模块？

因为两者逻辑完全不同：

| 维度 | 系列 1（极坐标） | 系列 2（折线图） |
|-----|------------------|------------------|
| 数据结构 | 24 小时 × 多天 | 年度 × 多资产 |
| 坐标系 | Polar（极坐标） | Cartesian（笛卡尔） |
| 可视形态 | Arc、Band Angle | Path、Axes |
| 交互 | Tooltip + Radial 注释 | Tooltip + Legend |
| 动画 | 半径生长式 | Path 绘制 / 点标记 |

模块拆分避免“卷面屎山”，也符合代码可维护性原则。

### 为什么 main.js 不写绘图？

它是 orchestrator：  
负责调用数据 → 生成 DOM → 调用两个系列的渲染器。

---

## 📈 系列 2（图表重制）的优化内容

相比实验一的原始图表，重制图包含以下改进：

- 使用一致的色彩编码（SPX / NASDAQ / BTC）
- 统一轴范围与比例，更易比较
- Tooltip 更丰富（含年份与数值）
- 平滑曲线修正跳点
- 修复比特币早期数据缺失导致的断线问题
- 更干净的图例布局
- 字体、间距、网格线更现代与美观

---

## 📜 开源协议

本项目使用 **GPL-3.0** 开源协议——  
你可以自由研究、修改、再分发所有内容，但衍生作品必须同样开源。

---

## 🤝 致谢

感谢 D3.js 社区与相关示例提供思路与灵感。
