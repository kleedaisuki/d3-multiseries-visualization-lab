/**
 * @brief 应用使用数据预处理工具（浏览器端） / App usage data preprocessing utilities (browser side).
 * @note 依赖 d3.js 的 d3.csv、d3.timeParse 等函数 / Depends on d3.js (d3.csv, d3.timeParse, etc.).
 */
(function (global) {
    'use strict';

    /**
     * @brief 24 小时列名列表 / Hourly column names (24 hours).
     * @note 顺序必须与原 CSV 一致 / The order must match the original CSV.
     */
    const HOUR_COLUMNS = [
        '0:00-0:59', '1:00-1:59', '2:00-2:59', '3:00-3:59',
        '4:00-4:59', '5:00-5:59', '6:00-6:59', '7:00-7:59',
        '8:00-8:59', '9:00-9:59', '10:00-10:59', '11:00-11:59',
        '12:00-12:59', '13:00-13:59', '14:00-14:59', '15:00-15:59',
        '16:00-16:59', '17:00-17:59', '18:00-18:59', '19:00-19:59',
        '20:00-20:59', '21:00-21:59', '22:00-22:59', '23:00-23:59'
    ];

    /**
     * @brief 12 时辰定义及其元数据 / 12 traditional Chinese time periods (shichen).
     * @note 包含中文名、罗马拼音和描述 / Contains Chinese name, pinyin and description.
     */
    const SHICHEN = [
        { index: 0, name: '子', pinyin: 'Zi', description: '23:00-01:00' },
        { index: 1, name: '丑', pinyin: 'Chou', description: '01:00-03:00' },
        { index: 2, name: '寅', pinyin: 'Yin', description: '03:00-05:00' },
        { index: 3, name: '卯', pinyin: 'Mao', description: '05:00-07:00' },
        { index: 4, name: '辰', pinyin: 'Chen', description: '07:00-09:00' },
        { index: 5, name: '巳', pinyin: 'Si', description: '09:00-11:00' },
        { index: 6, name: '午', pinyin: 'Wu', description: '11:00-13:00' },
        { index: 7, name: '未', pinyin: 'Wei', description: '13:00-15:00' },
        { index: 8, name: '申', pinyin: 'Shen', description: '15:00-17:00' },
        { index: 9, name: '酉', pinyin: 'You', description: '17:00-19:00' },
        { index: 10, name: '戌', pinyin: 'Xu', description: '19:00-21:00' },
        { index: 11, name: '亥', pinyin: 'Hai', description: '21:00-23:00' }
    ];

    /** @brief 日期解析器 / Date parser (YYYY-MM-DD). */
    const parseDate = d3.timeParse('%Y-%m-%d');
    /** @brief 星期格式化器 / Weekday formatter (e.g. "Mon"). */
    const weekdayFormat = d3.timeFormat('%a');

    /**
     * @brief 将字符串安全转为数字（NaN→0）/ Safely convert string to number (NaN→0).
     * @param {string|number} v 原始值 / Raw value.
     * @return {number} 数值（无效时为 0）/ Parsed number (0 if invalid).
     */
    function toNumber(v) {
        const n = +v;
        return Number.isFinite(n) ? n : 0;
    }

    /**
     * @brief 根据小时求对应的时辰索引 / Get shichen index for a given hour.
     * @param {number} hour 0-23 之间的整数小时 / Integer hour between 0 and 23.
     * @return {number} 时辰索引（0-11）/ Shichen index (0-11).
     * @note 使用简单近似：((hour + 1) % 24) / 2 取整 / Uses approximation ((hour + 1) % 24) / 2 floored.
     */
    function getShichenIndex(hour) {
        const h = ((hour % 24) + 24) % 24; // 规范为 0-23 / normalize
        return Math.floor(((h + 1) % 24) / 2);
    }

    /**
     * @brief 解析原始 CSV 行为统一的“宽表”对象 / Parse raw CSV row to normalized wide row object.
     * @param {Object} d d3.csv 返回的原始对象 / Raw object from d3.csv.
     * @return {Object} 解析后的对象 / Parsed object with typed fields.
     *
     * 字段包括：
     * - date: Date 对象 / JS Date
     * - dateStr: 原始日期字符串 / Original date string
     * - weekday: 星期缩写 / Weekday string
     * - appName, packageName, totalMinutes 等
     * - 每个小时列会被转为数字 / Each hourly column converted to number
     */
    function parseWideRow(d) {
        const dateObj = parseDate(d['日期']);
        const dateStr = d['日期'];
        const weekday = dateObj ? weekdayFormat(dateObj) : '';

        const row = {
            raw: d,  // 保留原始对象 / keep original for debugging
            date: dateObj,
            dateStr: dateStr,
            weekday: weekday,
            appName: d['应用名称'],
            packageName: d['包名'],
            totalMinutes: toNumber(d['总时长'])
        };

        HOUR_COLUMNS.forEach((col, hourIndex) => {
            row[col] = toNumber(d[col]);
        });

        return row;
    }

    /**
     * @brief 将单行宽表数据展开为多条“长表记录” / Expand a wide row into multiple long-format records.
     * @param {Object} wideRow 经过 parseWideRow 的行 / Row parsed by parseWideRow.
     * @return {Object[]} 长表记录数组 / Array of long records.
     *
     * 每条记录字段：
     * - date, dateStr, weekday, appName, packageName, totalMinutes
     * - hour (0-23), hourLabel, minutes
     * - shichenIndex, shichenName, shichenMeta
     */
    function wideRowToLongRecords(wideRow) {
        const records = [];

        HOUR_COLUMNS.forEach((col, hourIndex) => {
            const minutes = wideRow[col];
            // 跳过 0 使用时长，以减少数据点 / skip zero-usage bins
            if (!minutes || minutes <= 0) {
                return;
            }

            const shichenIndex = getShichenIndex(hourIndex);
            const shichen = SHICHEN[shichenIndex];

            records.push({
                date: wideRow.date,
                dateStr: wideRow.dateStr,
                weekday: wideRow.weekday,
                appName: wideRow.appName,
                packageName: wideRow.packageName,
                totalMinutes: wideRow.totalMinutes,
                hour: hourIndex,
                hourLabel: col,
                minutes: minutes,
                shichenIndex: shichenIndex,
                shichenName: shichen ? shichen.name : '',
                shichenMeta: shichen || null
            });
        });

        return records;
    }

    /**
     * @brief 通用分组函数（按 keyFn 分组）/ Generic group-by helper by key function.
     * @param {Object[]} array 输入数组 / Input array.
     * @param {Function} keyFn 产生分组 key 的函数 / Function that returns grouping key.
     * @return {Map<string, Object[]>} key 到数组的映射 / Map from key to array of items.
     */
    function groupBy(array, keyFn) {
        const map = new Map();
        array.forEach(item => {
            const key = keyFn(item);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
        });
        return map;
    }

    /**
     * @brief 将原始 CSV 数据做完整预处理 / Fully preprocess raw CSV rows.
     * @param {Object[]} rawRows d3.csv 返回的原始数组 / Raw array from d3.csv.
     * @return {Object} 预处理后的结果对象 / Preprocessed result object.
     *
     * @return.rawRows 解析后的宽表行 / Parsed wide rows
     * @return.longRecords 宽表→长表后的所有记录 / All long-format records
     * @return.byApp 按 appName 分组的 Map / Map grouped by appName
     * @return.byDate 按 dateStr 分组的 Map / Map grouped by dateStr
     */
    function preprocessFromRawRows(rawRows) {
        const wideRows = rawRows.map(parseWideRow);

        const longRecords = [];
        wideRows.forEach(wideRow => {
            const records = wideRowToLongRecords(wideRow);
            records.forEach(r => longRecords.push(r));
        });

        const byApp = groupBy(longRecords, d => d.appName);
        const byDate = groupBy(longRecords, d => d.dateStr);

        return {
            rawRows: wideRows,
            longRecords: longRecords,
            byApp: byApp,
            byDate: byDate,
            meta: {
                hourColumns: HOUR_COLUMNS,
                shichen: SHICHEN
            }
        };
    }

    /**
     * @brief 从 CSV 路径加载并预处理数据 / Load and preprocess app usage data from CSV.
     * @param {string} csvPath CSV 文件相对或绝对路径 / Relative or absolute CSV path.
     * @return {Promise<Object>} Promise 解析为预处理结果对象 / Promise resolving to preprocess result.
     *
     * @example
     * // 中文示例：
     * // 在 main.js 中：
     * AppUsagePreprocess.loadAndPreprocess('data/app_usage_2025-10-28_7days.csv')
     *   .then(data => {
     *     // 使用 data.byApp 渲染系列1
     *   });
     *
     * // English example:
     * // In main.js:
     * AppUsagePreprocess.loadAndPreprocess('data/app_usage_2025-10-28_7days.csv')
     *   .then(data => {
     *     // Use data.byApp to render series 1
     *   });
     */
    function loadAndPreprocess(csvPath) {
        return d3.csv(csvPath).then(rawRows => {
            return preprocessFromRawRows(rawRows);
        });
    }

    /**
     * @brief 暴露给全局的 API 对象 / Public API exposed to the global window.
     */
    const api = {
        HOUR_COLUMNS: HOUR_COLUMNS,
        SHICHEN: SHICHEN,
        getShichenIndex: getShichenIndex,
        parseWideRow: parseWideRow,
        wideRowToLongRecords: wideRowToLongRecords,
        preprocessFromRawRows: preprocessFromRawRows,
        loadAndPreprocess: loadAndPreprocess
    };

    // 挂到 global（浏览器里就是 window）/ Attach to global (window in browsers).
    global.AppUsagePreprocess = api;

})(this);
