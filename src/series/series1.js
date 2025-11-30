/**
 * @brief 系列1：APP 使用情况极坐标图模块 / Series 1: App usage radial visualization module.
 * @note 依赖 d3.js 和 AppUsagePreprocess 提供的 longRecords 数据结构 /
 *       Depends on d3.js and longRecords from AppUsagePreprocess.
 */
(function (global) {
    'use strict';

    /**
     * @brief 默认配置项 / Default configuration options.
     * @note 可以在 render 调用时被覆盖 / Can be overridden in render options.
     */
    const DEFAULT_CONFIG = {
        width: 320,
        height: 360, // 底部多留一点空间给图例 / a bit taller for legend.
        margin: { top: 32, right: 32, bottom: 64, left: 32 },
        innerRadiusRatio: 0.25, // 内半径与可用半径比例 / inner radius ratio to max radius
        outerRadiusRatio: 0.9,  // 外半径与可用半径比例 / outer radius ratio to max radius
        colorInterpolator: d3.interpolateBlues
    };

    /**
     * @brief 12 时辰名称数组（与 preprocess_app.js 中 SHICHEN 顺序一致） /
     *        12 shichen names (should match order in preprocess_app.js SHICHEN).
     */
    const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    // ==========================
    // 工具与布局计算 / Utilities & layout
    // ==========================

    /**
     * @brief 将用户选项与默认配置合并 / Merge user options with default config.
     * @param {Object} userOptions 用户传入配置 / User provided options.
     * @return {Object} 合并后的配置对象 / Merged configuration object.
     */
    function mergeConfig(userOptions) {
        const cfg = Object.assign({}, DEFAULT_CONFIG, userOptions || {});
        const m = cfg.margin || {};
        cfg.margin = {
            top: m.top != null ? m.top : DEFAULT_CONFIG.margin.top,
            right: m.right != null ? m.right : DEFAULT_CONFIG.margin.right,
            bottom: m.bottom != null ? m.bottom : DEFAULT_CONFIG.margin.bottom,
            left: m.left != null ? m.left : DEFAULT_CONFIG.margin.left
        };
        return cfg;
    }

    /**
     * @brief 计算图表绘制区域的半径和中心坐标 / Compute chart radius and center coordinates.
     * @param {Object} cfg 配置对象 / Config object.
     * @return {Object} 包含 cx, cy, innerRadius, outerRadius 的对象 /
     *                  Object containing cx, cy, innerRadius, outerRadius.
     */
    function computeLayout(cfg) {
        const width = cfg.width;
        const height = cfg.height;
        const innerWidth = width - cfg.margin.left - cfg.margin.right;
        const innerHeight = height - cfg.margin.top - cfg.margin.bottom;
        const maxRadius = Math.min(innerWidth, innerHeight) / 2;

        const innerRadius = maxRadius * cfg.innerRadiusRatio;
        const outerRadius = maxRadius * cfg.outerRadiusRatio;

        const cx = cfg.margin.left + innerWidth / 2;
        const cy = cfg.margin.top + innerHeight / 2;

        return {
            cx,
            cy,
            innerRadius,
            outerRadius,
            maxRadius
        };
    }

    // ==========================
    // 数据预处理：按【日期 × 时辰】聚合
    // Data prep: aggregate by (date × shichen)
    // ==========================

    /**
     * @brief 构造时辰×日期矩阵并展平为绘制数组 /
     *        Build shichen × date matrix and flatten to drawing array.
     *
     * @param {Object[]} records longRecords，需包含 dateStr, weekday, shichenIndex, minutes /
     *                           longRecords with dateStr, weekday, shichenIndex, minutes.
     * @param {string} appName 应用名称（用于 tooltip 与注释） / App name for tooltip & annotation.
     * @return {Object} 结果对象 / Result object:
     *   - flatData: 所有 (date × shichen) 的一维数组 / flat array of all (date × shichen)
     *   - dates: 使用到的日期字符串数组（排序） / sorted dateStr array
     *   - weekdayByDate: dateStr → weekday 映射 / map dateStr → weekday
     *   - maxMinutes: 单个扇形的最大使用分钟数 / max minutes over all items
     */
    function buildShichenDateData(records, appName) {
        // 收集日期与 weekday / collect unique dates & weekdays.
        const dateSet = new Set();
        const weekdayByDate = {};

        records.forEach(function (d) {
            if (!d.dateStr) return;
            dateSet.add(d.dateStr);
            if (d.weekday && !weekdayByDate[d.dateStr]) {
                weekdayByDate[d.dateStr] = d.weekday;
            }
        });

        const dates = Array.from(dateSet);
        // 简单按字符串排序（YYYY-MM-DD 格式时等同按时间排序） /
        // Simple string sort; for YYYY-MM-DD it matches chronological order.
        dates.sort();

        const dateIndexByStr = {};
        dates.forEach(function (ds, idx) {
            dateIndexByStr[ds] = idx;
        });

        const numDates = dates.length;

        // 初始化矩阵：12 时辰 × N 日期 /
        // Initialize matrix: 12 shichen × N dates.
        const matrix = [];
        for (let s = 0; s < 12; s++) {
            for (let di = 0; di < numDates; di++) {
                matrix.push({
                    appName: appName || '',
                    shichenIndex: s,
                    shichenName: SHICHEN_NAMES[s] || String(s),
                    dateStr: dates[di],
                    dateIndex: di,
                    weekday: weekdayByDate[dates[di]] || '',
                    minutes: 0
                });
            }
        }

        // 索引助手： (shichenIndex, dateIndex) → item /
        // Index helper: (shichenIndex, dateIndex) → item.
        function getItem(shichenIndex, dateStr) {
            const di = dateIndexByStr[dateStr];
            if (di == null) return null;
            const s = ((shichenIndex % 12) + 12) % 12;
            const idx = s * numDates + di;
            return matrix[idx];
        }

        // 聚合 minutes / aggregate minutes.
        records.forEach(function (d) {
            if (d.minutes == null || d.minutes <= 0) return;
            if (d.shichenIndex == null) return;
            if (!d.dateStr) return;

            const item = getItem(d.shichenIndex, d.dateStr);
            if (!item) return;
            const m = +d.minutes;
            if (!Number.isFinite(m) || m <= 0) return;
            item.minutes += m;
        });

        const maxMinutes = d3.max(matrix, function (d) { return d.minutes; }) || 0;

        return {
            flatData: matrix,
            dates: dates,
            weekdayByDate: weekdayByDate,
            maxMinutes: maxMinutes,
            numDates: numDates
        };
    }

    // ==========================
    // 比例尺、弧生成器
    // Scales & arc generator
    // ==========================

    /**
     * @brief 创建极坐标图所需的比例尺和弧生成器（支持日期分层） /
     *        Create scales and arc generator for radial chart with date bands.
     *
     * @param {Object} dataInfo 由 buildShichenDateData 返回的结果 /
     *                          Result from buildShichenDateData.
     * @param {Object} layout 布局信息 / Layout info.
     * @param {Object} cfg 配置对象 / Config object.
     * @return {Object} 包含 scales 和 arc 的对象 / Object with scales and arc generator.
     */
    function createScalesAndArc(dataInfo, layout, cfg) {
        const maxMinutes = dataInfo.maxMinutes || 0;
        const numDates = Math.max(1, dataInfo.numDates);

        // 角度：12 等分，0 在右侧，标签时我们会减 π/2 旋转到顶部 /
        // Angle: 12 bands, start at right; labels will rotate by -π/2 for top.
        const angleScale = d3.scaleBand()
            .domain(d3.range(12))
            .range([0, Math.PI * 2])
            .align(0);

        // 半径方向划分为多个日期带 / Radius divided into date bands.
        const radialSpan = layout.outerRadius - layout.innerRadius;
        const bandThickness = radialSpan / (numDates + 1); // 留一点外边距 / small outer margin.

        // 每个日期带内：使用 minutes 映射到 band thickness /
        // Within each date band, map minutes to band thickness.
        const radiusScale = d3.scaleLinear()
            .domain([0, maxMinutes || 1])
            .range([0, bandThickness * 0.9]) // 留 10% 空隙 / leave 10% gap.
            .nice();

        // 颜色：按 dateIndex 映射 / Color: map by dateIndex.
        const colorScale = d3.scaleLinear()
            .domain([0, Math.max(1, numDates - 1)])
            .range([0.2, 0.95]);

        const arc = d3.arc()
            .innerRadius(function (d) {
                const base = layout.innerRadius + d.dateIndex * bandThickness;
                return base;
            })
            .outerRadius(function (d) {
                const base = layout.innerRadius + d.dateIndex * bandThickness;
                return base + radiusScale(d.minutes || 0);
            })
            .startAngle(function (d) { return angleScale(d.shichenIndex); })
            .endAngle(function (d) {
                return angleScale(d.shichenIndex) + angleScale.bandwidth();
            })
            .padAngle(Math.PI / 180 * 2)
            .padRadius(layout.innerRadius);

        return {
            maxMinutes: maxMinutes,
            angleScale: angleScale,
            radiusScale: radiusScale,
            colorScale: colorScale,
            bandThickness: bandThickness,
            arc: arc
        };
    }

    // ==========================
    // 画背景与标签
    // Background & labels
    // ==========================

    /**
     * @brief 在 SVG 上绘制背景圆环和辅助圈 / Draw background rings and helper circles.
     * @param {d3.Selection} g 根 g 选区 / Root g selection.
     * @param {Object} layout 布局信息 / Layout info.
     */
    function drawBackground(g, layout) {
        // 最大圆环 / outer background ring
        g.append('circle')
            .attr('class', 'series1-bg-ring')
            .attr('r', layout.outerRadius)
            .attr('fill', 'none')
            .attr('stroke', '#eee')
            .attr('stroke-width', 1);

        // 内圈 / inner ring
        g.append('circle')
            .attr('class', 'series1-inner-ring')
            .attr('r', layout.innerRadius)
            .attr('fill', 'none')
            .attr('stroke', '#f5f5f5')
            .attr('stroke-width', 1);

        // 中间参考圈 / middle reference ring.
        const midRadius = (layout.innerRadius + layout.outerRadius) / 2;
        g.append('circle')
            .attr('class', 'series1-mid-ring')
            .attr('r', midRadius)
            .attr('fill', 'none')
            .attr('stroke', '#f0f0f0')
            .attr('stroke-dasharray', '2,2')
            .attr('stroke-width', 0.8);
    }

    /**
     * @brief 绘制时辰标签 / Draw shichen labels around the circle.
     * @param {d3.Selection} g 根 g 选区 / Root g selection.
     * @param {Object} layout 布局信息 / Layout info.
     * @param {Object} scales 比例尺信息 / Scales (angleScale, etc.).
     */
    function drawShichenLabels(g, layout, scales) {
        const labelRadius = layout.outerRadius + 16;
        const angleScale = scales.angleScale;

        const labels = g.append('g')
            .attr('class', 'series1-shichen-labels');

        d3.range(12).forEach(function (idx) {
            const angle = angleScale(idx) + angleScale.bandwidth() / 2 - Math.PI / 2;
            const x = Math.cos(angle) * labelRadius;
            const y = Math.sin(angle) * labelRadius;

            labels.append('text')
                .attr('class', 'series1-shichen-label')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', 10)
                .attr('fill', '#666')
                .text(SHICHEN_NAMES[idx] || String(idx));
        });
    }

    // ==========================
    // Tooltip 工具
    // Tooltip utilities
    // ==========================

    /**
     * @brief 获取或创建 tooltip div / Get or create tooltip div element.
     * @return {d3.Selection} tooltip 选区 / d3 selection of tooltip div.
     */
    function getOrCreateTooltip() {
        let tip = d3.select('body').select('.series1-tooltip');
        if (!tip.empty()) {
            return tip;
        }
        tip = d3.select('body')
            .append('div')
            .attr('class', 'series1-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', 'rgba(255,255,255,0.95)')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('padding', '4px 8px')
            .style('font-size', '12px')
            .style('color', '#333')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
            .style('display', 'none')
            .style('z-index', 9999);
        return tip;
    }

    // ==========================
    // 绘制扇形与交互
    // Arcs & interaction
    // ==========================

    /**
     * @brief 绘制每个日期×时辰的扇形条，并添加 hover tooltip /
     *        Draw radial arcs for each (date × shichen) and add hover tooltip.
     *
     * @param {d3.Selection} g 根 g 选区 / Root g selection.
     * @param {Object[]} data 扁平化的数据（dateIndex, shichenIndex, minutes 等）/
     *                        Flat data array.
     * @param {Object} layout 布局信息 / Layout info.
     * @param {Object} scales 比例尺信息（含 arc, colorScale 等）/
     *                        Scales (arc, colorScale, etc.).
     */
    function drawArcs(g, data, layout, scales) {
        const tooltip = getOrCreateTooltip();

        const arcGroup = g.append('g')
            .attr('class', 'series1-arcs');

        const arcs = arcGroup.selectAll('path.series1-arc')
            .data(data.filter(function (d) { return d.minutes > 0; }))
            .enter()
            .append('path')
            .attr('class', 'series1-arc')
            .attr('d', scales.arc)
            .attr('fill', function (d) {
                const t = scales.colorScale(d.dateIndex || 0);
                return DEFAULT_CONFIG.colorInterpolator(t);
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.8)
            .on('mouseenter', function (event, d) {
                tooltip.style('display', 'block');
                const minutesStr = d.minutes.toFixed(1);
                const weekday = d.weekday || '';
                const textHtml =
                    '<div><strong>' + (d.appName || 'App') + '</strong></div>' +
                    '<div>日期: ' + d.dateStr + (weekday ? '（' + weekday + '）' : '') + '</div>' +
                    '<div>时辰: ' + d.shichenName + '</div>' +
                    '<div>使用时长: ' + minutesStr + ' 分钟</div>';
                tooltip.html(textHtml);
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY + 12) + 'px');
            })
            .on('mouseleave', function () {
                tooltip.style('display', 'none');
            });
    }

    // ==========================
    // 中心标题与总使用时间
    // Center title & summary
    // ==========================

    /**
     * @brief 在图中心绘制标题和摘要信息 / Draw title and summary text at the center.
     * @param {d3.Selection} g 根 g 选区 / Root g selection.
     * @param {string} title 图表主标题（一般为 app 名） / Main title (usually app name).
     * @param {Object[]} data 绘制数据（flatData）/ Flat data array.
     */
    function drawCenterText(g, title, data) {
        const totalMinutesAll = d3.sum(data, function (d) { return d.minutes; }) || 0;

        g.append('text')
            .attr('class', 'series1-title')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'auto')
            .attr('y', -4)
            .attr('font-size', 14)
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(title || 'App');

        g.append('text')
            .attr('class', 'series1-subtitle')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')
            .attr('y', 4)
            .attr('font-size', 11)
            .attr('fill', '#888')
            .text('总使用: ' + totalMinutesAll.toFixed(1) + ' 分钟');
    }

    // ==========================
    // 自动注释（annotation）
    // Auto annotation
    // ==========================

    /**
     * @brief 绘制自动注释：标出使用时长最大的一段日期×时辰 /
     *        Draw automatic annotation for the max (date × shichen) usage.
     *
     * @param {d3.Selection} g 根 g 选区 / Root g selection.
     * @param {Object} layout 布局信息 / Layout info.
     * @param {Object} scales 比例尺信息 / Scales (angleScale, bandThickness, radiusScale).
     * @param {Object[]} data 扁平化数据 / Flat data array.
     */
    function drawAutoAnnotation(g, layout, scales, data) {
        if (!data || !data.length) return;

        // 找到 minutes 最大的点 / find item with max minutes.
        let maxItem = null;
        data.forEach(function (d) {
            if (!maxItem || d.minutes > maxItem.minutes) {
                maxItem = d;
            }
        });
        if (!maxItem || !maxItem.minutes) return;

        const angleScale = scales.angleScale;
        const bandThickness = scales.bandThickness;

        // 扇形大致外半径 / approximate outer radius for this item.
        const baseRadius = layout.innerRadius + maxItem.dateIndex * bandThickness;
        const arcThickness = scales.radiusScale(maxItem.minutes || 0);
        const r = baseRadius + arcThickness * 1.05; // 稍微再往外一点 / slightly outside arc.

        const angleCenter = angleScale(maxItem.shichenIndex) + angleScale.bandwidth() / 2 - Math.PI / 2;
        const x = Math.cos(angleCenter) * r;
        const y = Math.sin(angleCenter) * r;

        const lineLength = 24;
        const x2 = x * 1.1;
        const y2 = y * 1.1;

        const annotationGroup = g.append('g')
            .attr('class', 'series1-annotation');

        // 小圆点 / small dot
        annotationGroup.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 2.5)
            .attr('fill', '#d95f02');

        // 连线 / leader line
        annotationGroup.append('line')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', '#d95f02')
            .attr('stroke-width', 1);

        // 文本位置：再往外一些 / text position: further out.
        const tx = x2 + (x2 >= 0 ? 8 : -8);
        const ty = y2;

        const minutesStr = maxItem.minutes.toFixed(1);
        const text = '峰值：' + maxItem.dateStr + ' ' + maxItem.shichenName +
            '，约 ' + minutesStr + ' 分钟';

        annotationGroup.append('text')
            .attr('class', 'series1-annotation-text')
            .attr('x', tx)
            .attr('y', ty)
            .attr('text-anchor', x2 >= 0 ? 'start' : 'end')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 10)
            .attr('fill', '#d95f02')
            .text(text);
    }

    // ==========================
    // 日期图例
    // Date legend
    // ==========================

    /**
     * @brief 绘制日期颜色图例 / Draw legend mapping color to dates.
     *
     * @param {d3.Selection} g 根 g 选区（中心为 0,0）/ Root g selection (center at 0,0).
     * @param {Object} layout 布局信息 / Layout info.
     * @param {Object} scales 比例尺信息 / Scales (colorScale).
     * @param {string[]} dates 日期数组 / Array of dateStr.
     */
    function drawDateLegend(g, layout, scales, dates) {
        if (!dates || !dates.length) return;

        const legendGroup = g.append('g')
            .attr('class', 'series1-date-legend');

        const itemWidth = 60;
        const itemHeight = 12;
        const gap = 6;

        const totalWidth = dates.length * itemWidth + (dates.length - 1) * gap;
        const startX = -totalWidth / 2;
        const baseY = layout.outerRadius + 28;

        dates.forEach(function (dateStr, idx) {
            const x = startX + idx * (itemWidth + gap);
            const t = scales.colorScale(idx || 0);
            const color = DEFAULT_CONFIG.colorInterpolator(t);

            const item = legendGroup.append('g')
                .attr('class', 'series1-date-legend-item')
                .attr('transform', 'translate(' + x + ',' + baseY + ')');

            item.append('rect')
                .attr('width', itemHeight)
                .attr('height', itemHeight)
                .attr('rx', 2)
                .attr('ry', 2)
                .attr('fill', color)
                .attr('stroke', '#ccc')
                .attr('stroke-width', 0.5);

            item.append('text')
                .attr('x', itemHeight + 4)
                .attr('y', itemHeight / 2)
                .attr('dominant-baseline', 'middle')
                .attr('font-size', 10)
                .attr('fill', '#555')
                .text(dateStr);
        });
    }

    // ==========================
    // 公共渲染 API
    // Public rendering APIs
    // ==========================

    /**
     * @brief 渲染单个应用的极坐标图（支持日期颜色、tooltip、自动注释与图例）/
     *        Render radial chart for a single app with date color, tooltip,
     *        auto annotation and legend.
     *
     * @param {Object[]} records 来自 AppUsagePreprocess 的 longRecords /
     *                            longRecords from AppUsagePreprocess.
     * @param {Object} options 配置参数 /
     *                         Configuration options.
     * @param {string} options.container 必填，CSS 选择器，如 "#series1-app-0" /
     *                                   Required CSS selector for container.
     * @param {number} [options.width] 图表宽度（像素）/ Chart width in px.
     * @param {number} [options.height] 图表高度（像素）/ Chart height in px.
     * @param {string} [options.title] 图表标题（默认使用 records[0].appName）/
     *                                 Chart title, default is records[0].appName.
     *
     * @return {void}
     */
    function renderAppUsageRadialChart(records, options) {
        if (!records || !records.length) {
            return;
        }
        if (!options || !options.container) {
            return;
        }

        const appName = (records[0] && records[0].appName) || (options.title || 'App');
        const cfg = mergeConfig(options);
        const layout = computeLayout(cfg);
        const containerSel = d3.select(cfg.container);

        // 清空容器 / clear container.
        containerSel.selectAll('*').remove();

        const svg = containerSel.append('svg')
            .attr('class', 'series1-svg')
            .attr('width', cfg.width)
            .attr('height', cfg.height);

        const gRoot = svg.append('g')
            .attr('transform', 'translate(' + layout.cx + ',' + layout.cy + ')');

        // 1) 构造 date × shichen 数据 / build date × shichen data.
        const dataInfo = buildShichenDateData(records, appName);

        // 2) 比例尺与弧 / scales & arc.
        const scales = createScalesAndArc(dataInfo, layout, cfg);

        // 3) 背景与扇形 / background & arcs.
        drawBackground(gRoot, layout);
        drawArcs(gRoot, dataInfo.flatData, layout, scales);
        drawShichenLabels(gRoot, layout, scales);

        // 4) 中心标题与摘要 / center text.
        const title = cfg.title || appName;
        drawCenterText(gRoot, title, dataInfo.flatData);

        // 5) 自动注释（最大点）/ auto annotation.
        drawAutoAnnotation(gRoot, layout, scales, dataInfo.flatData);

        // 6) 日期图例 / date legend.
        drawDateLegend(gRoot, layout, scales, dataInfo.dates);
    }

    /**
     * @brief 一次性为多个应用渲染系列1图表 /
     *        Render series 1 charts for multiple apps at once.
     *
     * @param {Object} preprocessResult 来自 AppUsagePreprocess.preprocessFromRawRows
     *                                  或 loadAndPreprocess 的结果 /
     *                                  Result from AppUsagePreprocess.
     * @param {string[]} appNames 要渲染的应用名称数组（需匹配 byApp 的 key）/
     *                            Array of app names (keys in preprocessResult.byApp).
     * @param {Object} options 配置选项 /
     *                         Configuration options.
     * @param {string} options.containerPrefix 容器前缀，例如 "#series1-app-"，会自动加索引 /
     *                                        Container prefix, e.g. "#series1-app-", index appended automatically.
     *
     * @return {void}
     */
    function renderForMultipleApps(preprocessResult, appNames, options) {
        if (!preprocessResult || !preprocessResult.byApp) {
            return;
        }
        if (!appNames || !appNames.length) {
            return;
        }
        if (!options || !options.containerPrefix) {
            return;
        }

        const prefix = options.containerPrefix;
        appNames.forEach(function (appName, idx) {
            const records = preprocessResult.byApp.get(appName);
            if (!records || !records.length) {
                return;
            }

            renderAppUsageRadialChart(records, Object.assign({}, options, {
                container: prefix + idx,
                title: appName
            }));
        });
    }

    /**
     * @brief 暴露给全局的系列1 API 对象 / Public API object for Series 1.
     */
    const api = {
        DEFAULT_CONFIG: DEFAULT_CONFIG,
        renderAppUsageRadialChart: renderAppUsageRadialChart,
        renderForMultipleApps: renderForMultipleApps
    };

    global.AppUsageSeries1 = api;

})(this);
