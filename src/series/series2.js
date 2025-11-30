/**
 * @brief 系列2：年度资产价格重制折线图模块
 *        Series 2: Annual asset-price redesigned line chart module.
 *
 * @note 依赖 d3.js 与 FinancePreprocess 的预处理结果（rows / meta）
 *       Depends on d3.js and FinancePreprocess preprocess result (rows / meta).
 */

(function (global) {
    "use strict";

    /**
     * @brief 默认配置项 / Default configuration options.
     *
     * @note
     *   - normalize: 是否按首年归一化为 1（便于比较相对涨幅）
     *                Whether to normalize each series to 1 at its first year.
     *   - showPoints: 是否显示每年圆点
     *                 Whether to show per-year circles.
     */
    const DEFAULT_CONFIG = {
        width: 640,
        height: 360,
        margin: { top: 48, right: 96, bottom: 40, left: 64 },
        normalize: true,
        showPoints: true
    };

    /**
     * @brief 资产到颜色的映射 / Mapping from asset keys to colors.
     */
    const ASSET_COLORS = {
        SPX: "#1f77b4",
        NASDAQ: "#ff7f0e",
        BTC: "#2ca02c"
    };

    /**
     * @brief 合并用户配置与默认配置
     *        Merge user configuration with default configuration.
     *
     * @param {Object} userOptions
     *        用户传入配置 / User provided options.
     * @return {Object}
     *         合并后的配置对象 / Merged config object.
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
     * @brief 计算内部绘图区域尺寸
     *        Compute inner chart area size.
     *
     * @param {Object} cfg
     *        配置对象 / Config object.
     * @return {Object}
     *         内部尺寸信息 { innerWidth, innerHeight }
     *         Inner size info.
     */
    function computeLayout(cfg) {
        const innerWidth = cfg.width - cfg.margin.left - cfg.margin.right;
        const innerHeight = cfg.height - cfg.margin.top - cfg.margin.bottom;

        return {
            innerWidth: innerWidth,
            innerHeight: innerHeight
        };
    }

    /**
     * @brief 从 FinancePreprocess 结果或 rows 数组构建多资产序列
     *        Build multi-asset series from FinancePreprocess result or plain rows array.
     *
     * @param {Object|Object[]} financeInput
     *        可以是 FinancePreprocess.preprocessFinanceRows 的返回结果，
     *        也可以是仅包含 rows 的数组。
     *        Either the full FinancePreprocess result or just rows array.
     * @param {Object} cfg
     *        配置对象（包含 normalize 等）/ Config object (includes normalize).
     *
     * @return {Object}
     *         {
     *           seriesList: [{ key, label, points: [{year, value, rawValue}] }],
     *           years: [year1, year2, ...],
     *           yDomain: [minY, maxY]
     *         }
     */
    function buildSeries(financeInput, cfg) {
        let rows = financeInput;
        let meta = null;

        if (financeInput && Array.isArray(financeInput.rows)) {
            rows = financeInput.rows;
            meta = financeInput.meta || null;
        }

        if (!Array.isArray(rows)) {
            rows = [];
        }

        const assetKeys = ["SPX", "NASDAQ", "BTC"];

        const seriesList = [];

        assetKeys.forEach(function (key) {
            const points = rows
                .filter(function (r) {
                    return r && Number.isFinite(+r.year) && Number.isFinite(+r[key]);
                })
                .map(function (r) {
                    return {
                        year: +r.year,
                        rawValue: +r[key]
                    };
                });

            if (!points.length) {
                return;
            }

            // 按年份排序 / sort by year.
            points.sort(function (a, b) { return a.year - b.year; });

            // 归一化（如果启用）/ normalize if enabled.
            let base = points[0].rawValue;
            if (!Number.isFinite(base) || base <= 0) {
                base = null;
            }

            const normalizedPoints = points.map(function (p) {
                let value = p.rawValue;
                if (cfg.normalize && base && base > 0) {
                    value = p.rawValue / base;
                }
                return {
                    year: p.year,
                    value: value,
                    rawValue: p.rawValue
                };
            });

            // 从 meta 中取可读名称 / use human-readable label from meta if available.
            let label = key;
            if (meta && meta.assets && meta.assets[key] && meta.assets[key].label) {
                label = meta.assets[key].label;
            }

            seriesList.push({
                key: key,
                label: label,
                points: normalizedPoints
            });
        });

        // 收集所有年份 / collect all years.
        const yearSet = new Set();
        seriesList.forEach(function (s) {
            s.points.forEach(function (p) {
                yearSet.add(p.year);
            });
        });
        const years = Array.from(yearSet);
        years.sort(function (a, b) { return a - b; });

        // 计算 Y 轴范围 / compute Y domain.
        let yMin = d3.min(seriesList, function (s) {
            return d3.min(s.points, function (p) { return p.value; });
        });
        let yMax = d3.max(seriesList, function (s) {
            return d3.max(s.points, function (p) { return p.value; });
        });

        if (!Number.isFinite(yMin)) {
            yMin = 0;
        }
        if (!Number.isFinite(yMax)) {
            yMax = 1;
        }

        // 如果是归一化模式，略微扩展下限以获得更好视觉效果
        // For normalized mode, slightly expand lower bound for better visual.
        if (cfg.normalize) {
            yMin = Math.min(0.8, yMin);
            yMax = Math.max(1.2, yMax);
        }

        return {
            seriesList: seriesList,
            years: years,
            yDomain: [yMin, yMax]
        };
    }

    /**
     * @brief 创建 X / Y 比例尺
     *        Create X/Y scales.
     *
     * @param {Object} layout
     *        布局信息（innerWidth, innerHeight）/ Layout info.
     * @param {number[]} years
     *        年份数组 / Year array.
     * @param {number[]} yDomain
     *        Y 轴取值范围 / Y domain [min, max].
     *
     * @return {Object}
     *         { xScale, yScale }
     */
    function createScales(layout, years, yDomain) {
        const xExtent = d3.extent(years);
        const xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([0, layout.innerWidth]);

        const yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([layout.innerHeight, 0])
            .nice();

        return {
            xScale: xScale,
            yScale: yScale
        };
    }

    /**
     * @brief 获取或创建系列2的 tooltip 容器
     *        Get or create tooltip container for Series 2.
     *
     * @return {d3.Selection}
     *         tooltip 的 d3 选区 / d3 selection of tooltip div.
     */
    function getOrCreateTooltip() {
        let tip = d3.select("body").select(".series2-tooltip");
        if (!tip.empty()) {
            return tip;
        }
        tip = d3.select("body")
            .append("div")
            .attr("class", "series2-tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(255,255,255,0.96)")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("padding", "4px 8px")
            .style("font-size", "12px")
            .style("color", "#333")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
            .style("display", "none")
            .style("z-index", 9999);
        return tip;
    }

    /**
     * @brief 绘制坐标轴与网格线
     *        Draw axes and gridlines.
     *
     * @param {d3.Selection} g
     *        根 g 选区（已平移到绘图区左上角）
     *        Root g selection translated to chart origin.
     * @param {Object} scales
     *        比例尺对象 { xScale, yScale } / Scales.
     * @param {Object} layout
     *        布局信息 { innerWidth, innerHeight } / Layout.
     * @param {Object} cfg
     *        配置对象，用于 Y 轴标签文本等 / Config for axis labels.
     */
    function drawAxes(g, scales, layout, cfg) {
        const xAxis = d3.axisBottom(scales.xScale)
            .ticks(10)
            .tickFormat(d3.format("d"));

        const yAxis = d3.axisLeft(scales.yScale)
            .ticks(6);

        // X 轴 / x-axis.
        g.append("g")
            .attr("class", "series2-axis series2-axis-x")
            .attr("transform", "translate(0," + layout.innerHeight + ")")
            .call(xAxis);

        // Y 轴 / y-axis.
        g.append("g")
            .attr("class", "series2-axis series2-axis-y")
            .call(yAxis);

        // Y 轴标签 / y-axis label.
        const yLabel = cfg.normalize
            ? "相对起始年倍数 (×)"
            : "价格 (Price)";

        g.append("text")
            .attr("class", "series2-axis-label-y")
            .attr("transform", "rotate(-90)")
            .attr("x", -layout.innerHeight / 2)
            .attr("y", -48)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", "#555")
            .text(yLabel);

        // X 轴标签 / x-axis label.
        g.append("text")
            .attr("class", "series2-axis-label-x")
            .attr("x", layout.innerWidth / 2)
            .attr("y", layout.innerHeight + 32)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", "#555")
            .text("年份 (Year)");

        // 水平网格线 / horizontal gridlines.
        const yGrid = d3.axisLeft(scales.yScale)
            .ticks(6)
            .tickSize(-layout.innerWidth)
            .tickFormat("");

        g.append("g")
            .attr("class", "series2-grid-y")
            .call(yGrid)
            .selectAll("line")
            .attr("stroke", "#eee");
    }

    /**
     * @brief 绘制折线与数据点，并添加 hover tooltip
     *        Draw lines and points with hover tooltip.
     *
     * @param {d3.Selection} g
     *        根 g 选区 / Root g selection.
     * @param {Object[]} seriesList
     *        多资产序列数组 / Series array.
     * @param {Object} scales
     *        比例尺对象 / Scales.
     * @param {Object} layout
     *        布局信息 / Layout.
     * @param {Object} cfg
     *        配置对象 / Config.
     */
    function drawLinesAndPoints(g, seriesList, scales, layout, cfg) {
        const tooltip = getOrCreateTooltip();

        const lineGen = d3.line()
            .x(function (d) { return scales.xScale(d.year); })
            .y(function (d) { return scales.yScale(d.value); })
            .curve(d3.curveMonotoneX);

        const linesGroup = g.append("g")
            .attr("class", "series2-lines");

        const pointsGroup = g.append("g")
            .attr("class", "series2-points");

        seriesList.forEach(function (series) {
            const color = ASSET_COLORS[series.key] || "#888";

            // 折线 / line path.
            linesGroup.append("path")
                .datum(series.points)
                .attr("class", "series2-line series2-line-" + series.key.toLowerCase())
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .attr("d", lineGen);

            if (!cfg.showPoints) {
                return;
            }

            // 圆点 / circles.
            const pts = pointsGroup
                .selectAll("circle.series2-point-" + series.key.toLowerCase())
                .data(series.points)
                .enter()
                .append("circle")
                .attr("class", "series2-point series2-point-" + series.key.toLowerCase())
                .attr("cx", function (d) { return scales.xScale(d.year); })
                .attr("cy", function (d) { return scales.yScale(d.value); })
                .attr("r", 3)
                .attr("fill", "#fff")
                .attr("stroke", color)
                .attr("stroke-width", 1);

            pts.on("mouseenter", function (event, d) {
                tooltip.style("display", "block");

                const yearStr = d.year.toString();
                const rawStr = Number.isFinite(d.rawValue)
                    ? d.rawValue.toLocaleString("en-US")
                    : String(d.rawValue);

                let html = "<div><strong>" + series.label + "</strong></div>" +
                    "<div>年份 (Year)： " + yearStr + "</div>" +
                    "<div>价格 (Price)： " + rawStr + "</div>";

                if (cfg.normalize) {
                    html += "<div>相对起始年倍数： " + d.value.toFixed(2) + "×</div>";
                }

                tooltip.html(html);
            })
                .on("mousemove", function (event) {
                    tooltip
                        .style("left", (event.pageX + 12) + "px")
                        .style("top", (event.pageY + 12) + "px");
                })
                .on("mouseleave", function () {
                    tooltip.style("display", "none");
                });
        });
    }

    /**
     * @brief 绘制图例，展示资产名称与颜色
     *        Draw legend showing asset labels and colors.
     *
     * @param {d3.Selection} g
     *        根 g 选区 / Root g selection.
     * @param {Object[]} seriesList
     *        多资产序列数组 / Series list.
     * @param {Object} layout
     *        布局信息 / Layout.
     */
    function drawLegend(g, seriesList, layout) {
        if (!seriesList || !seriesList.length) {
            return;
        }

        const legend = g.append("g")
            .attr("class", "series2-legend")
            .attr("transform", "translate(" + (layout.innerWidth) + ",0)");

        const itemHeight = 18;
        const rectSize = 10;

        seriesList.forEach(function (series, idx) {
            const color = ASSET_COLORS[series.key] || "#888";
            const y = idx * itemHeight;

            const item = legend.append("g")
                .attr("class", "series2-legend-item")
                .attr("transform", "translate(-4," + (y + 4) + ")");

            item.append("rect")
                .attr("x", -rectSize)
                .attr("y", -rectSize / 2)
                .attr("width", rectSize)
                .attr("height", rectSize)
                .attr("fill", color)
                .attr("stroke", "#ccc")
                .attr("stroke-width", 0.5);

            item.append("text")
                .attr("x", 4)
                .attr("y", 0)
                .attr("dominant-baseline", "middle")
                .attr("font-size", 11)
                .attr("fill", "#555")
                .text(series.label);
        });
    }

    /**
     * @brief 在 SVG 顶部绘制标题与副标题
     *        Draw title and subtitle at top of SVG.
     *
     * @param {d3.Selection} svg
     *        SVG 选区 / SVG selection.
     * @param {Object} cfg
     *        配置对象（包含 title / subtitle）/ Config with title & subtitle.
     * @param {boolean} normalized
     *        是否为归一化模式 / Whether normalized mode is used.
     */
    function drawTitle(svg, cfg, normalized) {
        const title = cfg.title || "资产价格重制图 (Redesigned Asset Price Chart)";
        let subtitle = cfg.subtitle || "";

        if (!subtitle && normalized) {
            subtitle = "以各资产首个年份价格归一化为 1.0，用于比较相对涨幅 / " +
                "Each asset normalized to 1.0 at its first year to compare relative growth.";
        }

        svg.append("text")
            .attr("class", "series2-title")
            .attr("x", cfg.margin.left)
            .attr("y", 20)
            .attr("text-anchor", "start")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .text(title);

        if (subtitle) {
            svg.append("text")
                .attr("class", "series2-subtitle")
                .attr("x", cfg.margin.left)
                .attr("y", 36)
                .attr("text-anchor", "start")
                .attr("font-size", 11)
                .attr("fill", "#777")
                .text(subtitle);
        }
    }

    /**
     * @brief 使用 FinancePreprocess 预处理结果渲染系列2图表
     *        Render Series 2 chart from FinancePreprocess result object.
     *
     * @param {Object} financeResult
     *        FinancePreprocess.preprocessFinanceRows 或 loadAndPreprocess 的返回结果。
     *        Result returned by FinancePreprocess.preprocessFinanceRows or loadAndPreprocess.
     * @param {Object} options
     *        配置对象，至少应包含 container 选择器。
     *        Config object, should at least include container selector.
     *
     * @note options.container 必填，例如 "#series2"
     *       options.container is required, e.g. "#series2".
     */
    function renderFromPreprocessResult(financeResult, options) {
        if (!financeResult) {
            return;
        }
        renderInternal(financeResult, options);
    }

    /**
     * @brief 直接从 rows 数组渲染系列2图表
     *        Render Series 2 chart directly from rows array.
     *
     * @param {Object[]} rows
     *        含 year / SPX / NASDAQ / BTC 字段的数组。
     *        Array with fields year / SPX / NASDAQ / BTC.
     * @param {Object} options
     *        配置对象 / Config object.
     */
    function renderFromRows(rows, options) {
        if (!Array.isArray(rows)) {
            return;
        }
        const fakeResult = { rows: rows, meta: null };
        renderInternal(fakeResult, options);
    }

    /**
     * @brief 内部渲染函数：完成布局、比例尺、主图绘制。
     *        Internal rendering function: layout, scales, main chart drawing.
     *
     * @param {Object} financeResult
     *        FinancePreprocess 结果对象 / FinancePreprocess result object.
     * @param {Object} options
     *        配置对象 / Config object.
     */
    function renderInternal(financeResult, options) {
        if (!options || !options.container) {
            return;
        }

        const cfg = mergeConfig(options);
        const layout = computeLayout(cfg);

        const prepared = buildSeries(financeResult, cfg);
        if (!prepared.seriesList.length) {
            return;
        }

        const scales = createScales(layout, prepared.years, prepared.yDomain);

        const containerSel = d3.select(cfg.container);
        containerSel.selectAll("*").remove();

        const svg = containerSel.append("svg")
            .attr("class", "series2-svg")
            .attr("width", cfg.width)
            .attr("height", cfg.height);

        // 标题放在整体 SVG 上，图表主体在 margin 内部 / title on SVG, chart inside margins.
        drawTitle(svg, cfg, cfg.normalize);

        const gRoot = svg.append("g")
            .attr("transform", "translate(" + cfg.margin.left + "," + cfg.margin.top + ")");

        drawAxes(gRoot, scales, layout, cfg);
        drawLinesAndPoints(gRoot, prepared.seriesList, scales, layout, cfg);
        drawLegend(gRoot, prepared.seriesList, layout);
    }

    /**
     * @brief 暴露给全局的系列2 API 对象
     *        Public API object for Series 2.
     *
     * @example
     * // 中文示例：
     * Preprocess.Finance.loadAndPreprocess("data/SP500_Nasdaq_BTC_20yrs_annual.csv")
     *   .then(finance => {
     *     FinanceSeries2.renderFromPreprocessResult(finance, {
     *       container: "#series2",
     *       title: "全球资产表现对比",
     *       normalize: true
     *     });
     *   });
     *
     * @example
     * // English example:
     * Preprocess.Finance.loadAndPreprocess("data/SP500_Nasdaq_BTC_20yrs_annual.csv")
     *   .then(finance => {
     *     FinanceSeries2.renderFromPreprocessResult(finance, {
     *       container: "#series2",
     *       title: "Global Assets: Normalized Performance",
     *       normalize: true
     *     });
     *   });
     */
    const api = {
        DEFAULT_CONFIG: DEFAULT_CONFIG,
        renderFromPreprocessResult: renderFromPreprocessResult,
        renderFromRows: renderFromRows
    };

    global.FinanceSeries2 = api;

})(this);
