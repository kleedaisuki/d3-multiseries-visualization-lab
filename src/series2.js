// series2.js

/**
 * @brief 系列2：年度资产价格折线图模块
 *        Series 2: Annual asset price line chart module.
 *
 * @note 该模块假设全局存在 FINANCE_DATA（从 JS 常量文件加载）
 *       This module assumes global FINANCE_DATA is available (from JS constant file).
 */
(function (global) {
    'use strict';

    /**
     * @brief 资产代码到显示颜色映射
     *        Asset code to color mapping.
     *
     * @type {Object}
     */
    const ASSET_COLORS = {
        SPX: '#1f77b4',
        NASDAQ: '#ff7f0e',
        BTC: '#2ca02c'
    };

    /**
     * @brief 默认配置
     *        Default configuration.
     *
     * @type {Object}
     */
    const DEFAULT_CONFIG = {
        width: 720,
        height: 420,
        marginTop: 40,
        marginRight: 100,
        marginBottom: 50,
        marginLeft: 70,
        /**
         * @brief 是否使用对数坐标
         *        Use log scale on Y axis.
         */
        useLogScale: false,
        /**
         * @brief 折线插值方式
         *        Line interpolation curve.
         */
        lineCurve: d3.curveMonotoneX
    };

    /**
     * @brief 将用户配置合并进默认配置
     *        Merge user configuration with default configuration.
     *
     * @param {Object} userOptions
     *        用户设置 / User options.
     * @return {Object}
     *         合并结果 / Merged configuration.
     */
    function mergeConfig(userOptions) {
        const cfg = Object.assign({}, DEFAULT_CONFIG);
        if (!userOptions) {
            return cfg;
        }
        Object.keys(userOptions).forEach(function (k) {
            if (Object.prototype.hasOwnProperty.call(cfg, k)) {
                cfg[k] = userOptions[k];
            }
        });
        return cfg;
    }

    /**
     * @brief 解析 FINANCE_DATA 为标准行结构
     *        Normalize FINANCE_DATA rows to a standard structure.
     *
     * @param {Object[]} rows
     *        原始金融数据行 / Raw finance rows.
     * @return {Object[]}
     *         标准化行：{ year: number, SPX: number|null, NASDAQ: number|null, BTC: number|null }
     */
    function normalizeFinanceRows(rows) {
        return rows.map(function (r) {
            function num(v) {
                return typeof v === 'number'
                    ? (isNaN(v) ? null : v)
                    : (v == null ? null : (isNaN(+v) ? null : +v));
            }

            return {
                year: r.Year,
                SPX: num(r['S&P 500 (Jan 1 close)']),
                NASDAQ: num(r['Nasdaq Composite (first trading day in Jan)']),
                BTC: num(r['Bitcoin USD (Jan 1)'])
            };
        }).filter(function (r) {
            return typeof r.year === 'number';
        });
    }

    /**
     * @brief 将标准行按资产拆分为多序列
     *        Split normalized rows into multi-series data.
     *
     * @param {Object[]} rows
     *        标准行数组 / Normalized rows.
     * @return {Object}
     *         { series: {SPX: [...], NASDAQ: [...], BTC: [...]}, meta: {...} }
     */
    function buildSeriesByAsset(rows) {
        /** @type {Object.<string, Object[]>} */
        const series = {
            SPX: [],
            NASDAQ: [],
            BTC: []
        };

        rows.forEach(function (r) {
            if (r.SPX != null) {
                series.SPX.push({ year: r.year, value: r.SPX });
            }
            if (r.NASDAQ != null) {
                series.NASDAQ.push({ year: r.year, value: r.NASDAQ });
            }
            if (r.BTC != null) {
                series.BTC.push({ year: r.year, value: r.BTC });
            }
        });

        Object.keys(series).forEach(function (k) {
            series[k].sort(function (a, b) { return a.year - b.year; });
        });

        const years = rows.map(function (r) { return r.year; });
        const minYear = d3.min(years);
        const maxYear = d3.max(years);

        return {
            series: series,
            meta: {
                minYear: minYear,
                maxYear: maxYear
            }
        };
    }

    /**
     * @brief 计算内部绘图区尺寸
     *        Compute inner chart drawing area size.
     *
     * @param {Object} cfg
     *        配置 / Config.
     * @return {Object}
     *         { innerWidth, innerHeight }
     */
    function computeInnerSize(cfg) {
        const innerWidth = cfg.width - cfg.marginLeft - cfg.marginRight;
        const innerHeight = cfg.height - cfg.marginTop - cfg.marginBottom;
        return {
            innerWidth: innerWidth,
            innerHeight: innerHeight
        };
    }

    /**
     * @brief 创建 SVG 及主绘图分组
     *        Create SVG and main group.
     *
     * @param {string} containerSelector
     *        容器选择器 / Container selector.
     * @param {Object} cfg
     *        配置 / Config.
     * @return {Object}
     *         { svg, g, innerWidth, innerHeight }
     */
    function createSvgRoot(containerSelector, cfg) {
        const size = computeInnerSize(cfg);

        const svg = d3.select(containerSelector)
            .append('svg')
            .attr('width', cfg.width)
            .attr('height', cfg.height);

        const g = svg.append('g')
            .attr('transform',
                'translate(' +
                cfg.marginLeft + ',' +
                cfg.marginTop + ')');

        return {
            svg: svg,
            g: g,
            innerWidth: size.innerWidth,
            innerHeight: size.innerHeight
        };
    }

    /**
     * @brief 根据多资产序列绘制折线图
     *        Render multi-asset line chart from series.
     *
     * @param {string} containerSelector
     *        容器选择器 / Container selector.
     * @param {Object} seriesResult
     *        来自 buildSeriesByAsset 的结果 / Result from buildSeriesByAsset.
     * @param {Object} userOptions
     *        用户配置 / User options.
     */
    function renderFromSeries(containerSelector, seriesResult, userOptions) {
        const cfg = mergeConfig(userOptions);
        const root = createSvgRoot(containerSelector, cfg);
        const svg = root.svg;
        const g = root.g;
        const innerWidth = root.innerWidth;
        const innerHeight = root.innerHeight;

        const series = seriesResult.series;
        const yearsAll = [];
        const valuesAll = [];

        Object.keys(series).forEach(function (key) {
            series[key].forEach(function (d) {
                yearsAll.push(d.year);
                valuesAll.push(d.value);
            });
        });

        const x = d3.scaleLinear()
            .domain(d3.extent(yearsAll))
            .range([0, innerWidth]);

        let y;
        if (cfg.useLogScale) {
            const minPos = d3.min(valuesAll.filter(function (v) { return v > 0; }));
            const maxVal = d3.max(valuesAll);
            y = d3.scaleLog()
                .clamp(true)
                .domain([minPos || 1, maxVal || 10])
                .range([innerHeight, 0])
                .nice();
        } else {
            y = d3.scaleLinear()
                .domain(d3.extent(valuesAll))
                .range([innerHeight, 0])
                .nice();
        }

        const xAxis = d3.axisBottom(x).ticks(10).tickFormat(d3.format('d'));
        const yAxis = d3.axisLeft(y).ticks(8);

        g.append('g')
            .attr('class', 'series2-axis series2-axis-x')
            .attr('transform', 'translate(0,' + innerHeight + ')')
            .call(xAxis);

        g.append('g')
            .attr('class', 'series2-axis series2-axis-y')
            .call(yAxis);

        // 坐标轴标题（Y 轴）
        g.append('text')
            .attr('class', 'series2-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -cfg.marginLeft + 16)
            .attr('text-anchor', 'middle')
            .text('Index / Price');

        // 标题
        g.append('text')
            .attr('class', 'series2-title')
            .attr('x', innerWidth / 2)
            .attr('y', -16)
            .attr('text-anchor', 'middle')
            .text('Annual prices: S&P 500, Nasdaq, Bitcoin');

        const line = d3.line()
            .x(function (d) { return x(d.year); })
            .y(function (d) { return y(d.value); })
            .curve(cfg.lineCurve);

        const seriesGroup = g.append('g').attr('class', 'series2-lines');

        Object.keys(series).forEach(function (key) {
            const data = series[key];
            if (!data || data.length === 0) {
                return;
            }
            const color = ASSET_COLORS[key] || '#000000';

            const path = seriesGroup.append('path')
                .datum(data)
                .attr('class', 'series2-line series2-line-' + key)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('d', line);

            const dotGroup = seriesGroup.append('g')
                .attr('class', 'series2-dots series2-dots-' + key);

            dotGroup.selectAll('circle')
                .data(data)
                .enter()
                .append('circle')
                .attr('cx', function (d) { return x(d.year); })
                .attr('cy', function (d) { return y(d.value); })
                .attr('r', 3)
                .attr('fill', color)
                .append('title')
                .text(function (d) {
                    return key + ' ' + d.year + ': ' + d.value;
                });
        });

        // 图例 / legend
        const legend = svg.append('g')
            .attr('class', 'series2-legend')
            .attr('transform',
                'translate(' +
                (cfg.width - cfg.marginRight + 10) + ',' +
                (cfg.marginTop + 10) + ')');

        const assets = [
            { key: 'SPX', label: 'S&P 500' },
            { key: 'NASDAQ', label: 'Nasdaq Composite' },
            { key: 'BTC', label: 'Bitcoin (Jan 1)' }
        ];

        assets.forEach(function (item, index) {
            const gLegendItem = legend.append('g')
                .attr('transform', 'translate(0,' + (index * 22) + ')');

            gLegendItem.append('rect')
                .attr('width', 14)
                .attr('height', 14)
                .attr('fill', ASSET_COLORS[item.key] || '#000000');

            gLegendItem.append('text')
                .attr('x', 20)
                .attr('y', 11)
                .attr('alignment-baseline', 'middle')
                .text(item.label);
        });
    }

    /**
     * @brief 从原始金融数据行渲染折线图
     *        Render line chart from raw finance data rows.
     *
     * @param {string} containerSelector
     *        容器选择器 / Container selector.
     * @param {Object[]} rows
     *        原始金融数据行（通常是 FINANCE_DATA）/
     *        Raw finance rows (usually FINANCE_DATA).
     * @param {Object} userOptions
     *        用户配置 / User options.
     *
     * @example
     *   FinanceSeries2.renderFromRawRows(
     *       '#series2-finance',
     *       FINANCE_DATA,
     *       { width: 800, height: 460 }
     *   );
     */
    function renderFromRawRows(containerSelector, rows, userOptions) {
        if (!Array.isArray(rows)) {
            throw new Error('FinanceSeries2: rows 必须是数组 / rows must be an array.');
        }
        const normalized = normalizeFinanceRows(rows);
        const seriesResult = buildSeriesByAsset(normalized);
        renderFromSeries(containerSelector, seriesResult, userOptions);
    }

    /**
     * @brief 对外暴露的 FinanceSeries2 模块 API
     *        Public FinanceSeries2 module API.
     */
    const api = {
        /** @brief 默认配置 / Default configuration. */
        DEFAULT_CONFIG: DEFAULT_CONFIG,

        /** 
         * @brief 从原始数据行渲染折线图
         *        Render line chart from raw rows.
         */
        renderFromRawRows: renderFromRawRows,

        /**
         * @brief 内部工具，仅调试使用
         *        Internal helpers, debugging only.
         */
        _internal: {
            normalizeFinanceRows: normalizeFinanceRows,
            buildSeriesByAsset: buildSeriesByAsset
        }
    };

    global.FinanceSeries2 = api;

})(this);
