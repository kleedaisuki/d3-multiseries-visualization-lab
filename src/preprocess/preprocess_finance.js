/**
 * @brief年度资产价格预处理工具（浏览器端）
 *        Annual asset-price preprocessing utilities (browser side).
 * @note依赖 d3.csv 读取 CSV 数据；专门处理 Year / S&P 500 / Nasdaq / Bitcoin
 *       Depends on d3.csv; dedicated to Year / S&P 500 / Nasdaq / Bitcoin series.
 */
(function (global) {
    "use strict";

    /**
     * @briefCSV 列名常量（避免手写出错）
     *        CSV column name constants (to avoid typos).
     */
    const COL_YEAR = "Year";
    const COL_SPX = "S&P 500 (Jan 1 close)";
    const COL_NASDAQ = "Nasdaq Composite (first trading day in Jan)";
    const COL_BTC = "Bitcoin USD (Jan 1)";

    /**
     * @brief资产 key 到可读名称映射
     *        Mapping from asset keys to human-readable labels.
     */
    const ASSET_META = {
        SPX: {
            key: "SPX",
            label: "S&P 500",
            column: COL_SPX
        },
        NASDAQ: {
            key: "NASDAQ",
            label: "Nasdaq Composite",
            column: COL_NASDAQ
        },
        BTC: {
            key: "BTC",
            label: "Bitcoin",
            column: COL_BTC
        }
    };

    /**
     * @brief将任意值安全转为数字（失败返回 null）
     *        Safely cast any value to number (returns null on failure).
     * @param {string|number} v
     *        原始值 / Raw value.
     * @return {number|null}
     *         合法数字或 null / Valid number or null.
     */
    function toNumberOrNull(v) {
        const n = +v;
        return Number.isFinite(n) ? n : null;
    }

    /**
     * @brief解析一行年度价格记录
     *        Parse a single annual price row from CSV.
     * @param {Object} d
     *        d3.csv 返回的原始对象
     *        Raw row object from d3.csv.
     * @return {Object}
     *         标准化后的记录：
     *         { year, SPX, NASDAQ, BTC }
     *         Normalized record with numeric fields.
     */
    function parseFinanceRow(d) {
        const year = +d[COL_YEAR];

        return {
            year: Number.isFinite(year) ? year : NaN,
            SPX: toNumberOrNull(d[COL_SPX]),
            NASDAQ: toNumberOrNull(d[COL_NASDAQ]),
            BTC: toNumberOrNull(d[COL_BTC]),
            // 额外保留原始对象以便 debug（可选）
            raw: d
        };
    }

    /**
     * @brief对原始 CSV 行数组做完整预处理
     *        Fully preprocess raw CSV rows into typed structures.
     * @param {Object[]} rawRows
     *        d3.csv 读取得到的原始数组
     *        Raw array returned by d3.csv.
     * @return {Object}
     *         结果对象：
     *          - rows: 按年份升序排序的完整行
     *          - byAsset: 按资产拆分的序列
     *          - meta: 一些辅助元数据（年份范围、列名等）
     *         Result object containing rows, per-asset series and meta.
     *
     * @example
     * // 在 main.js 中：
     * // FinancePreprocess.preprocessFinanceRows(rawRows)
     * //   .rows → 直接传给 D3 折线图
     *
     * // In main.js:
     * // const result = FinancePreprocess.preprocessFinanceRows(rawRows);
     * // renderSeries2(result.rows, "#series2");
     */
    function preprocessFinanceRows(rawRows) {
        // 1) 逐行解析
        const parsed = rawRows
            .map(parseFinanceRow)
            .filter(r => Number.isFinite(r.year));

        // 2) 按年份升序排序
        parsed.sort((a, b) => a.year - b.year);

        // 3) 按资产拆分序列（过滤掉 null）
        const byAsset = {
            SPX: parsed.filter(r => Number.isFinite(r.SPX)),
            NASDAQ: parsed.filter(r => Number.isFinite(r.NASDAQ)),
            BTC: parsed.filter(r => Number.isFinite(r.BTC))
        };

        // 4) 元数据：年份范围、列名等
        const years = parsed.map(r => r.year);
        const yearMin = years.length ? Math.min.apply(null, years) : null;
        const yearMax = years.length ? Math.max.apply(null, years) : null;

        const meta = {
            columns: {
                year: COL_YEAR,
                spx: COL_SPX,
                nasdaq: COL_NASDAQ,
                btc: COL_BTC
            },
            assets: ASSET_META,
            yearRange: {
                min: yearMin,
                max: yearMax
            }
        };

        return {
            rows: parsed,
            byAsset: byAsset,
            meta: meta
        };
    }

    /**
     * @brief从 CSV 路径加载并预处理年度资产价格
     *        Load and preprocess annual asset prices from CSV file.
     * @param {string} csvPath
     *        CSV 文件路径（相对或绝对）
     *        CSV path (relative or absolute).
     * @return {Promise<Object>}
     *         Promise，解析为 preprocessFinanceRows 的返回值
     *         Promise resolving to the preprocessFinanceRows result.
     *
     * @example
     * // 典型用法（main.js）：
     * FinancePreprocess.loadAndPreprocess("data/SP500_Nasdaq_BTC_20yrs_annual.csv")
     *   .then(finance => {
     *       // finance.rows 传给系列2的 D3 图表
     *       renderSeries2(finance.rows, "#series2");
     *   });
     *
     * // Typical usage (main.js):
     * // FinancePreprocess.loadAndPreprocess("data/SP500_Nasdaq_BTC_20yrs_annual.csv")
     * //   .then(finance => renderSeries2(finance.rows, "#series2"));
     */
    function loadAndPreprocess(csvPath) {
        return d3.csv(csvPath).then(rawRows => {
            return preprocessFinanceRows(rawRows);
        });
    }

    /**
     * @brief暴露给全局的 FinancePreprocess API
     *        Public FinancePreprocess API exposed on global object.
     * @note在浏览器环境下，global 即 window
     *      In browsers, global is window.
     */
    const api = {
        // 常量（如果 series2 需要知道列名、资产名字）
        COL_YEAR,
        COL_SPX,
        COL_NASDAQ,
        COL_BTC,
        ASSET_META,

        // 核心函数
        toNumberOrNull,
        parseFinanceRow,
        preprocessFinanceRows,
        loadAndPreprocess
    };

    global.FinancePreprocess = api;

})(this);
