```
d3-multiseries-visualization-lab

A visualization study using D3.js to encode multi-day app usage as radial temporal structures. Includes perceptual mapping design, annotations, legends, and an improved remake of a previous visualization.
```

---

# 🍱 一、全局设计理念：**清晰、可维护、可扩展、符合课程要求**

这个实验既不是单纯的 demo，也不是一页 HTML 就草草了事，而是：

* 有**系列1**（多图联动的极坐标图）
* 有**系列2**（重制图表）
* 有**数据预处理层**
* 有**通用工具（tooltip、annotation 等）**
* 有**页面布局、图例、外观控制**
* 最终要打包提交，也可能未来扩展（放 portfolio 也说不定）

所以设计的结构目标是：
**“能跑、能扩、能提交、可读、可维护”**

---

# 🧱 二、项目结构总体思想

结构如下：

```
d3-app-usage-visualization/
│
├── data/       
│   ├── SP500_Nasdaq_BTC_20yrs_annual.js
│   └── app_usage_2025-10-28_7days.js
│ 
├── src/
│   ├── series1.js
│   └── series2.js
│
├── css/
│   └── style.css
│
├── index.html
│
├── STRUCTURE.md
├── README.md
│
├── LICENSE
└── .gitignore
```

---

# 🍡 三、逐层解释：为什么这样设计？

---

## **1. data/** —— 数据是 Chaos 的源头，要隔离在最左边

### 为什么需要单独目录？

* 实验要求要上传 CSV / JSON；
* 可能会有原始数据（raw）和加工数据（processed）；
* D3 加载时路径需要稳定清晰；
* 数据是“纯资源”，与 JS、CSS 分离是最佳实践。

### 未来可能扩展？

* 自动生成 cleaned CSV；
* 保存 aggregated results；
* 放 additional datasets 做系列2。

所以 `data/` 是最左侧资源池。

---

## **2. src/** —— JavaScript 的逻辑“层级化”

### 为什么不把所有 JS 塞进 main.js？

因为你有两个系列，每个系列都是“一个子项目”，还需要预处理层。
按照教授的 Kernel 习惯，这些东西 **必须拆开**，否则就会变成 spaghetti code。

### 为什么是这 4 个文件？

#### ① series1.js

**图表层（Vis layer）—— 系列1专用**

* 极坐标图有独特的逻辑：scale、arc、legend、annotation、tooltip。
* 这套逻辑比较复杂，放到独立模块可读性更强。

#### ② series2.js

**图表层（Vis layer）—— 系列2专用**

* 重制图和系列1完全不同。
* 分开后不会互相污染，也更符合 MECE。

#### ③ main.js

**入口层（Entry point）**
负责 orchestrate 全局流程：

* data → preprocess → series1 / series2 → render
* HTML 元素绑定
* 主逻辑调用

> **main.js 是 conductor**
> 其余 JS 是 orchestra 的不同 section

---

## **3. css/** —— 单独管理样式，图表样式也能写在这里

为什么不用 inline 或 style 标签？

* 图表注释、tooltip、legend 的样式需要统一地方管理。
* 如果你想给 series1 和 series2 各自主题，也容易扩展。

Use-case：

* tooltip 样式
* arc hover 样式
* legend style
* title style
* layout（grid/flex）

---

## **4. index.html** —— 统一容器 + 挂载点

承载页面：

* 两个 series 的 `<div>` 容器
* tooltip 的 `<div>`
* 引入 main.js

HTML 的角色是一张“舞台蓝图”，让 JS 上去表演。

---

## **5. LICENSE** —— GPL-3.0

GPL-3.0，这意味着：

* 开源
* 强制衍生作品同样开源
* 合适 coursework 或个人项目
* README + LICENSE 会让仓库更“完备”。

---

## **6. .gitignore** —— 使用 Node 模板（最佳前端项目选择）

GitHub 默认 Node 模板覆盖得最全最安全。

---

# 🍥 四、总体设计逻辑总结

> **这是一份“前端可视化项目最优解”的结构。**

* **data/**
  数据独立 → 易于管理

* **src/**

  * series1.js：第一个图表系统
  * series2.js：第二个图表系统
  * main.js：统一调度
    → 职责分离、干净、扩展性强

* **css/**
  样式集中，便于复用与维护

* **index.html**
  舞台：挂载点明确

* **STRUCTURE.md**
  文档化结构，学术友好

* **README.md + LICENSE**
  完整开源项目的外壳

* **.gitignore**
  避免污染、稳定构建

---

# 🍙 五、额外视角

这个结构从**Kernel 维护习惯 + MECE 设计法 + 可爱可持续工程学**三角里自然长出来的：

* Kernel 思维：

  > 模块拆清楚、职责单一、可组合可替换。

* MECE 思维：

  > 系列1、系列2、预处理、样式、页面入口，不重叠、不遗漏。

* 可爱工程哲学：

  > 以后你回来修改或扩展它，都不会骂过去的自己。

---

# 实验4 D3可视化练习

请浏览以下示例中的两种项目框架，仿照其一，使用D3.js在同一个页面内分区按要求绘制两个系列的图表。

系列1：APP使用情况
**要求**
a) 至少在系列1的分区内绘制2个app的使用情况图表，每个图表以app名为标题
b) 参考下图，使用如下可视映射绘制每个app的使用情况图表
        - 扇形所在位置对应的角度映射12时辰
        - 扇形的颜色映射日期
        - 扇形所在位置距中心的距离映射某日某时辰内某app的使用时长
即，在绘制一个app的图表时，为每个使用时长不为0的时辰绘制一个扇形，以D日的T时辰为例，该扇形应满足：
        - 所处的扇区对应T时辰
        - 在圆盘中位置的半径对应该时辰内该app的使用时长
        - 颜色对应D日
c) 每个app至少添加 1 处注释，例如“傍晚 Bilibili 使用高峰”“周末下午外卖app峰值”等
d) 支持扇形Hover出信息提示框的交互效果（App、星期、时间段、分钟数等，可自行设计）

**数据获取**
> 使用示例数据

**扣分点（包括但不限于）**
a) 没有图表标题、图例（如日期的颜色映射图例）或坐标轴（角度的时间轴）描述等必要信息（总分数20%）
b) 扇形简化绘制为方块（总分数10%）
c) 整体效果不美观（总分数10%）
d) 缺少hover高亮的提示框（总分数10%）

系列2：图表重制
**要求**
从实验1的5个图表中，选出至少1个你觉得不够完善的作品，自行收集相关数据（也可使用从图表中读取的近似数据），重新设计并使用D3绘制

**扣分点（包括但不限于）**
a) 没有优化（总分数20%）
b) 引入了新的信达雅问题（总分数20%）
