/**
 * @file main.js
 * @brief 项目入口：负责数据调度、DOM 初始化、图表渲染
 *        Project entry point: orchestrates datasets, DOM init, and chart rendering.
 *
 * @note 本文件不包含任何绘图逻辑，仅作为 orchestrator。
 *       This file contains no visualization logic; it only orchestrates calls.
 */

(function () {
    'use strict';

    /**
     * @brief 初始化整个项目 / Initialize whole project.
     *
     * @note 在 DOMContentLoaded 后被调用。
     */
    function init() {
        console.log('Main.init(): 项目启动中 / Project booting…');

        // === 1. 检查全局数据（防止加载错误） ===========================
        if (!Array.isArray(APP_USAGE_DATA)) {
            console.error('APP_USAGE_DATA 加载失败 / APP_USAGE_DATA not loaded.');
            return;
        }
        if (!Array.isArray(FINANCE_DATA)) {
            console.error('FINANCE_DATA 加载失败 / FINANCE_DATA not loaded.');
            return;
        }

        // === 2. 系列1：APP 使用情况极坐标图 ==============================
        renderSeries1();

        // === 3. 系列2：年度金融折线图 ================================
        renderSeries2();

        console.log('Main.init(): 所有图表已渲染完毕 / All charts rendered.');
    }

    /**
     * @brief 渲染系列1（APP 使用情况） / Render Series 1 (app usage polar charts)
     */
    function renderSeries1() {
        console.log('渲染 Series1 / Rendering Series1…');

        // (1) 指定要绘制的应用名称（至少两个）
        // 你可以随时扩展
        const appsToShow = ['微信', 'Bilibili'];

        // (2) 自动为每个 app 创建容器 div
        const containerRoot = document.querySelector('#series1');
        if (!containerRoot) {
            console.error('#series1 容器缺失 / Missing #series1 container.');
            return;
        }
        containerRoot.innerHTML = ''; // 清空旧内容

        appsToShow.forEach(app => {
            const div = document.createElement('div');
            div.id = 'series1-app-' + app;
            div.className = 'series1-app-container';
            containerRoot.appendChild(div);
        });

        // (3) 调用系列1模块
        AppUsageSeries1.renderFromRawRecords(APP_USAGE_DATA, appsToShow, {
            containerPrefix: '#series1-app-',
            width: 360,
            height: 380
        });
    }

    /**
     * @brief 渲染系列2（金融重制图）/ Render Series 2 (finance line chart)
     */
    function renderSeries2() {
        console.log('渲染 Series2 / Rendering Series2…');

        const container = '#series2';
        const root = document.querySelector(container);
        if (!root) {
            console.error('#series2 容器缺失 / Missing #series2 container.');
            return;
        }
        root.innerHTML = ''; // 清空

        FinanceSeries2.renderFromRawRows(container, FINANCE_DATA, {
            width: 780,
            height: 440
        });
    }

    // 注册 DOMContentLoaded
    document.addEventListener('DOMContentLoaded', init);
})();
