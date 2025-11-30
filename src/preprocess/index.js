/**
 * @brief 预处理模块统一入口（聚合 AppUsage & Finance）
 *        Unified entry for preprocessing modules (AppUsage & Finance).
 * @note
 *   - 依赖同目录下的 preprocess_app.js 与 preprocess_finance.js
 *   - 两个子模块均为 IIFE，挂载到全局（window）上
 *   - 本文件提供 ES Module 导出与统一的 Preprocess 命名空间
 * @note 
 *   - Depends on preprocess_app.js and preprocess_finance.js in the same folder
 *   - Both submodules are IIFEs attaching objects to the global window
 *   - This file exposes ES module exports and a unified Preprocess namespace
 */

// 以 side-effect 方式加载两个 IIFE 模块 / Load both IIFE modules for side effects.
import "./preprocess_app.js";
import "./preprocess_finance.js";

/**
 * @brief 从全局对象读取子模块引用
 *        Read submodule references from global object.
 * @note 在浏览器中 global 即 window
 *       In browsers, global is `window`.
 */
const globalObj = (typeof window !== "undefined") ? window : globalThis;

/**
 * @brief 应用使用数据预处理模块别名
 *        Alias for app-usage preprocessing module.
 */
const AppUsagePreprocess = globalObj.AppUsagePreprocess;

/**
 * @brief 年度资产价格预处理模块别名
 *        Alias for finance (annual price) preprocessing module.
 */
const FinancePreprocess = globalObj.FinancePreprocess;

/**
 * @brief 统一命名空间，便于在全局模式下访问
 *        Unified namespace for convenient access in global mode.
 *
 * @example
 *   // 全局方式：
 *   Preprocess.AppUsage.loadAndPreprocess("data/app_usage.csv")
 *   Preprocess.Finance.loadAndPreprocess("data/SP500_Nasdaq_BTC.csv")
 *
 * @example
 *   // Global style:
 *   Preprocess.AppUsage.loadAndPreprocess("data/app_usage.csv");
 *   Preprocess.Finance.loadAndPreprocess("data/SP500_Nasdaq_BTC.csv");
 */
const Preprocess = {
    AppUsage: AppUsagePreprocess,
    Finance: FinancePreprocess
};

// 挂到全局，方便非模块脚本直接用 / Attach to global for non-module scripts.
if (globalObj) {
    globalObj.Preprocess = Preprocess;
}

// 作为 ES Module 导出，方便 import / Export as ES module for imports.
export {
    AppUsagePreprocess,
    FinancePreprocess,
    Preprocess
};
