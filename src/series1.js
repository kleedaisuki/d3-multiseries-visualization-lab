// series1.js

/**
 * @brief 系列1：APP 使用情况极坐标图模块
 *        Series 1: Polar chart for app usage.
 *
 * @note 该模块假设全局存在 APP_USAGE_DATA（从 JS 常量文件加载）
 *       This module assumes global APP_USAGE_DATA is available (from JS constant file).
 */
(function (global) {
    'use strict';

    /** 
     * @brief 默认配置（绘图尺寸、边距等）
     *        Default configuration (chart size, margins, etc).
     *
     * @type {Object}
     */
    const DEFAULT_CONFIG = {
        width: 320,
        height: 360,
        marginTop: 40,
        marginRight: 40,
        marginBottom: 50,
        marginLeft: 40,
        innerRadiusRatio: 0.18,
        outerRadiusRatio: 0.46,
        backgroundRingCount: 3,
        hourLabelStep: 3,
        transitionDuration: 600
    };

    /**
     * @brief 小时字段名称列表（与 APP_USAGE_DATA 列名对应）
     *        Hour column names list (matching APP_USAGE_DATA).
     *
     * @type {string[]}
     */
    const HOUR_KEYS = (function buildHourKeys() {
        /** @type {string[]} */
        const keys = [];
        for (let h = 0; h < 24; h++) {
            const start = h.toString().padStart(1, '0') + ':00';
            const end = h.toString().padStart(1, '0') + ':59';
            keys.push(start + '-' + end);
        }
        return keys;
    })();

    /**
     * @brief 合并用户配置和默认配置
     *        Merge user config with default config.
     *
     * @param {Object} userOptions
     *        用户传入配置（可选）/ User provided options (optional).
     * @return {Object}
     *         合并后的配置对象 / Merged config object.
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
     * @brief 从 APP 原始记录中按应用分组
     *        Group raw app usage records by app name.
     *
     * @param {Object[]} records
     *        原始记录数组 / Raw records array.
     * @return {Map<string, Object[]>}
     *         key 为应用名称，value 为该应用的所有记录数组 /
     *         key is app name, value is array of records for that app.
     */
    function groupByApp(records) {
        /** @type {Map<string, Object[]>} */
        const byApp = new Map();
        records.forEach(function (row) {
            const appName = row['应用名称'];
            if (!byApp.has(appName)) {
                byApp.set(appName, []);
            }
            byApp.get(appName).push(row);
        });
        return byApp;
    }

    /**
     * @brief 针对单个应用，聚合为 24 小时序列
     *        Build 24-hour aggregated series for a single app.
     *
     * @param {Object[]} appRecords
     *        属于同一应用的所有记录 / All records of one app.
     * @return {Object[]}
     *         形如 [{ hour: 0, label: "0:00-0:59", value: 12.3 }, ...] 的数组 /
     *         Array of objects like above.
     */
    function buildHourlySeriesForApp(appRecords) {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push({
                hour: i,
                label: HOUR_KEYS[i],
                value: 0
            });
        }

        appRecords.forEach(function (row) {
            for (let i = 0; i < 24; i++) {
                const key = HOUR_KEYS[i];
                const raw = row[key];
                const v = typeof raw === 'number' ? raw : parseFloat(raw);
                if (!isNaN(v)) {
                    hours[i].value += v;
                }
            }
        });

        return hours;
    }

    /**
     * @brief 计算内部绘图区域尺寸
     *        Compute inner chart area size.
     *
     * @param {Object} cfg
     *        配置对象 / Config object.
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
     * @brief 创建 SVG 根节点并返回绘图分组
     *        Create SVG root and return main group.
     *
     * @param {string} containerSelector
     *        容器选择器 / Container CSS selector.
     * @param {Object} cfg
     *        配置对象 / Config.
     * @return {Object}
     *         { svg, g, radius, innerRadius, outerRadius }
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
                (cfg.marginLeft + size.innerWidth / 2) + ',' +
                (cfg.marginTop + size.innerHeight / 2) + ')');

        const radius = Math.min(size.innerWidth, size.innerHeight) / 2;
        const innerRadius = radius * cfg.innerRadiusRatio;
        const outerRadius = radius * cfg.outerRadiusRatio;

        return {
            svg: svg,
            g: g,
            radius: radius,
            innerRadius: innerRadius,
            outerRadius: outerRadius
        };
    }

    /**
     * @brief 为单个应用绘制极坐标图
     *        Render polar chart for a single app.
     *
     * @param {string} containerSelector
     *        容器选择器 / Container selector.
     * @param {string} appName
     *        应用名称 / App name.
     * @param {Object[]} hourlySeries
     *        24 小时聚合序列 / 24-hour aggregated series.
     * @param {Object} userOptions
     *        用户配置 / User options.
     */
    function renderAppChart(containerSelector, appName, hourlySeries, userOptions) {
        const cfg = mergeConfig(userOptions);

        const root = createSvgRoot(containerSelector, cfg);
        const g = root.g;
        const innerRadius = root.innerRadius;
        const outerRadius = root.outerRadius;

        const maxValue = d3.max(hourlySeries, function (d) { return d.value; }) || 0;
        const angle = d3.scaleBand()
            .domain(hourlySeries.map(function (d) { return d.hour; }))
            .range([0, Math.PI * 2])
            .align(0);

        const radius = d3.scaleLinear()
            .domain([0, maxValue || 1])
            .range([innerRadius, outerRadius])
            .nice();

        // 背景环 / background rings
        const ringStepCount = cfg.backgroundRingCount;
        if (ringStepCount > 0) {
            const ticks = radius.ticks(ringStepCount);
            const gr = g.append('g').attr('class', 'background-rings');
            ticks.forEach(function (t) {
                gr.append('circle')
                    .attr('class', 'series1-ring')
                    .attr('r', radius(t));
            });
        }

        // 扇形（使用 d3.arc）
        const arc = d3.arc()
            .innerRadius(function (d) { return radius(0); })
            .outerRadius(function (d) { return radius(d.value); })
            .startAngle(function (d) { return angle(d.hour); })
            .endAngle(function (d) { return angle(d.hour) + angle.bandwidth(); })
            .padAngle(0.02)
            .padRadius(innerRadius);

        const arcGroup = g.append('g').attr('class', 'series1-arcs');

        arcGroup.selectAll('path')
            .data(hourlySeries)
            .enter()
            .append('path')
            .attr('class', 'series1-arc')
            .attr('d', arc)
            .append('title')
            .text(function (d) {
                return appName + ' ' + d.label + ': ' + d.value.toFixed(1) + ' min';
            });

        // 小时标签 / hour labels
        const labelGroup = g.append('g').attr('class', 'series1-hour-labels');
        hourlySeries.forEach(function (d) {
            if (d.hour % cfg.hourLabelStep !== 0) {
                return;
            }
            const a = angle(d.hour) + angle.bandwidth() / 2 - Math.PI / 2;
            const r = outerRadius + 12;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            labelGroup.append('text')
                .attr('class', 'series1-hour-label')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .text(d.hour);
        });

        // 标题 / title
        g.append('text')
            .attr('class', 'series1-title')
            .attr('x', 0)
            .attr('y', -outerRadius - 24)
            .attr('text-anchor', 'middle')
            .text(appName);
    }

    /**
     * @brief 从原始记录渲染多个应用的极坐标图
     *        Render polar charts for multiple apps from raw records.
     *
     * @param {Object[]} records
     *        原始 APP 使用记录（通常是 APP_USAGE_DATA）/
     *        Raw app usage records (usually APP_USAGE_DATA).
     * @param {string[]} appNames
     *        要渲染的应用名称列表 / App names to render.
     * @param {Object} userOptions
     *        用户配置，其中 containerPrefix 必须指定，例如 "#series1-app-" /
     *        User options. containerPrefix must be specified, e.g. "#series1-app-".
     *
     * @example
     *   AppUsageSeries1.renderFromRawRecords(
     *       APP_USAGE_DATA,
     *       ['微信', 'Bilibili'],
     *       { containerPrefix: '#series1-app-', width: 360, height: 380 }
     *   );
     */
    function renderFromRawRecords(records, appNames, userOptions) {
        if (!Array.isArray(records)) {
            throw new Error('AppUsageSeries1: records 必须是数组 / records must be an array.');
        }
        if (!Array.isArray(appNames) || appNames.length === 0) {
            throw new Error('AppUsageSeries1: appNames 不能为空 / appNames must not be empty.');
        }
        if (!userOptions || !userOptions.containerPrefix) {
            throw new Error('AppUsageSeries1: containerPrefix 必须提供 / containerPrefix is required.');
        }

        const byApp = groupByApp(records);

        appNames.forEach(function (name) {
            const appRecords = byApp.get(name) || [];
            const hourlySeries = buildHourlySeriesForApp(appRecords);
            const selector = userOptions.containerPrefix + name;
            renderAppChart(selector, name, hourlySeries, userOptions);
        });
    }

    /**
     * @brief 对外暴露的模块 API
     *        Public module API.
     */
    const api = {
        /** @brief 默认配置 / Default configuration. */
        DEFAULT_CONFIG: DEFAULT_CONFIG,

        /** 
         * @brief 从原始记录渲染多个应用图表
         *        Render multiple app charts from raw records.
         */
        renderFromRawRecords: renderFromRawRecords,

        /**
         * @brief 内部工具，仅调试使用
         *        Internal helpers, for debugging only.
         */
        _internal: {
            groupByApp: groupByApp,
            buildHourlySeriesForApp: buildHourlySeriesForApp
        }
    };

    global.AppUsageSeries1 = api;

})(this);
