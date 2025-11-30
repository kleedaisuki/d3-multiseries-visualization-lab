/**
 * @brief 项目入口（main.js）：统一加载数据、预处理，并调用系列1与系列2的渲染模块  
 *        Project entry: load data, preprocess, and call Series 1 & Series 2 renderers.
 *
 * @note 本文件不负责图表绘制逻辑，仅做 orchestration
 *       This file does not implement visualization logic; it orchestrates all modules.
 *
 * @note 依赖：  
 *       - Preprocess.AppUsage (from preprocess/index.js)  
 *       - Preprocess.Finance  
 *       - AppUsageSeries1 (series1.js)  
 *       - FinanceSeries2   (series2.js)
 */

(function (global) {
    "use strict";

    /**
     * @brief 项目初始化入口  
     *        Bootstrap function of the whole project.
     *
     * @note 在 HTML `<body onload="Main.init()">` 或 main.js 最后自动触发  
     *       Called once on page load.
     */
    function init() {
        console.log("Main.init(): 项目启动中 / Project booting…");

        // ================================
        // 1. 加载并预处理「APP 使用情况」数据
        // ================================
        const appCsv = "data/app_usage_2025-10-28_7days.csv";
        const appPromise = Preprocess.AppUsage.loadAndPreprocess(appCsv)
            .then(appData => {
                console.log("App usage preprocessed:", appData);
                renderSeries1(appData);
                return appData;
            })
            .catch(err => {
                console.error("加载 APP 使用数据失败 / Failed to load app usage CSV:", err);
            });

        // ================================
        // 2. 加载并预处理「年度资产价格」数据（系列2）
        // ================================
        const financeCsv = "data/SP500_Nasdaq_BTC_20yrs_annual.csv";
        const financePromise = Preprocess.Finance.loadAndPreprocess(financeCsv)
            .then(finance => {
                console.log("Finance preprocessed:", finance);
                renderSeries2(finance);
                return finance;
            })
            .catch(err => {
                console.error("加载年度资产价格数据失败 / Failed to load finance CSV:", err);
            });

        // 若需要等待两个都加载完（例如做全局状态）可以：
        // Promise.all([appPromise, financePromise]).then(([appData, financeData]) => { ... });
    }

    /**
     * @brief 渲染系列1：APP 使用极坐标图  
     *        Render Series 1 radial charts for selected apps.
     *
     * @param {Object} appData 预处理结果（byApp / longRecords）  
     *                         Preprocessed app usage result.
     */
    function renderSeries1(appData) {
        if (!appData || !appData.byApp) {
            console.warn("Series1: appData invalid.");
            return;
        }

        // TODO：根据你的 HTML，你放了几个容器？
        // 例如：#series1-app-0, #series1-app-1
        // 这里选择前两个最常使用的 App：
        const appNames = Array.from(appData.byApp.keys()).slice(0, 2);

        AppUsageSeries1.renderForMultipleApps(appData, appNames, {
            containerPrefix: "#series1-app-",
            width: 320,
            height: 360
        });
    }

    /**
     * @brief 渲染系列2：年度资产价格折线图  
     *        Render redesigned annual finance line chart.
     *
     * @param {Object} financeResult FinancePreprocess 的返回结果  
     *                              Preprocessed finance result.
     */
    function renderSeries2(financeResult) {
        if (!financeResult) {
            console.warn("Series2: financeResult invalid.");
            return;
        }

        FinanceSeries2.renderFromPreprocessResult(financeResult, {
            container: "#series2",
            title: "全球主要资产表现（20年） / Global Assets Performance (20 years)",
            normalize: true,
            showPoints: true
        });
    }

    // 暴露给全局 / Export global API
    const api = {
        init: init,
        renderSeries1: renderSeries1,
        renderSeries2: renderSeries2
    };

    global.Main = api;

    // 自动启动（如不想自动启动可注释掉）
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})(this);
