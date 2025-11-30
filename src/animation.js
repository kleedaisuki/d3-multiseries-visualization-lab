/**
 * @file animation.js
 * @brief 页面动效控制模块 / Page-level animation controller module.
 *
 * @note zh-CN:
 *  负责：
 *    1. 入口滚动动画（hero、section 卡片）
 *    2. 系列 1 APP 卡片的瀑布式进入动画
 *    3. Hero 右侧信息卡片的轻微 3D 跟随动效
 *
 * @note en-US:
 *  Responsibilities:
 *    1. Scroll-triggered entry animations (hero, section cards)
 *    2. Staggered entrance animation for Series 1 app cards
 *    3. Subtle 3D parallax effect for the hero right panel card
 */

/**
 * @brief 页面动效主模块 / Main page animation module.
 *
 * @note zh-CN:
 *  使用 IIFE 封装，避免污染全局命名空间。
 *
 * @note en-US:
 *  Encapsulated via IIFE to avoid global namespace pollution.
 */
const PageAnimation = (() => {
    /**
     * @brief 初始化入口函数 / Initialization entry function.
     *
     * @note zh-CN:
     *  在 DOMContentLoaded 后被调用，统一挂载各类动效。
     *
     * @note en-US:
     *  Called after DOMContentLoaded, wires up all animation behaviors.
     */
    function init() {
        setupScrollEntryAnimations();
        setupSeries1Stagger();
        setupHeroParallax();
    }

    /**
     * @brief 设置滚动触发的进入动画 / Setup scroll-triggered entry animations.
     *
     * @note zh-CN:
     *  目标：
     *    - 让带有 .animate-xxx 的元素在进入视口时才播放 CSS 动画
     *    - 默认将 animationPlayState 设为 paused，进入视口时切换为 running
     *
     * @note en-US:
     *  Goal:
     *    - Elements with .animate-xxx classes only animate when entering viewport
     *    - Default animationPlayState is paused; switch to running when visible
     */
    function setupScrollEntryAnimations() {
        const animatedSelector =
            ".animate-fade-in, .animate-fade-in-delayed, .animate-slide-up, .animate-slide-up-delayed";

        /** @type {NodeListOf<HTMLElement>} */
        const animatedElements = document.querySelectorAll(animatedSelector);

        if (!animatedElements.length) {
            return;
        }

        // 初始化时先暂停动画
        animatedElements.forEach((el) => {
            el.style.animationPlayState = "paused";
        });

        // 如果浏览器不支持 IntersectionObserver，则直接播放动画
        if (!("IntersectionObserver" in window)) {
            animatedElements.forEach((el) => {
                el.style.animationPlayState = "running";
            });
            return;
        }

        /**
         * @brief IntersectionObserver 回调 / IntersectionObserver callback.
         *
         * @param {IntersectionObserverEntry[]} entries zh-CN: 视口变化条目；en-US: list of intersection entries
         * @param {IntersectionObserver} observer zh-CN: 观察者对象；en-US: observer instance
         */
        const handleIntersect = (entries, observer) => {
            entries.forEach((entry) => {
                const target = /** @type {HTMLElement} */ (entry.target);

                if (entry.isIntersecting) {
                    // 进入视口：开始动画并停止观察（仅播放一次）
                    target.style.animationPlayState = "running";
                    observer.unobserve(target);
                }
            });
        };

        /** @type {IntersectionObserver} */
        const observer = new IntersectionObserver(handleIntersect, {
            root: null,
            threshold: 0.12,
        });

        animatedElements.forEach((el) => {
            observer.observe(el);
        });
    }

    /**
     * @brief 为系列 1 APP 卡片设置瀑布式进入动画。
     *        Setup staggered entrance animation for Series 1 app cards.
     *
     * @note zh-CN:
     *  思路：
     *    - 监听 #series1-section 进入视口
     *    - 从其中找到所有 .series1-app-container
     *    - 按 index 设置不同的 transitionDelay，实现「一张一张浮上来」
     *
     * @note en-US:
     *  Idea:
     *    - Observe #series1-section visibility
     *    - Query all .series1-app-container inside it
     *    - Use index-based transitionDelay for a waterfall effect
     */
    function setupSeries1Stagger() {
        const section = /** @type {HTMLElement | null} */ (
            document.getElementById("series1-section")
        );
        if (!section) return;

        /**
         * @brief 实际应用动画到卡片 / Apply animations to cards.
         */
        const applyStaggerToCards = () => {
            /** @type {NodeListOf<HTMLElement>} */
            const cards = section.querySelectorAll(".series1-app-container");

            if (!cards.length) {
                // D3 还没渲染完成，稍后重试一次
                window.setTimeout(applyStaggerToCards, 260);
                return;
            }

            cards.forEach((card, index) => {
                // 初始状态：轻微下移 + 透明
                card.style.opacity = "0";
                card.style.transform = "translateY(10px)";
                card.style.transition =
                    "opacity 0.36s ease-out, transform 0.36s ease-out";
                // 瀑布式延迟
                const delayMs = 70 * index;
                card.style.transitionDelay = `${delayMs}ms`;

                // 使用双 requestAnimationFrame，确保浏览器先应用初始状态，再过渡到目标状态
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        card.style.opacity = "1";
                        card.style.transform = "translateY(0)";
                    });
                });
            });
        };

        // 不支持 IntersectionObserver 时，直接应用动画
        if (!("IntersectionObserver" in window)) {
            applyStaggerToCards();
            return;
        }

        /**
         * @brief Section 观察回调 / Section observer callback.
         *
         * @param {IntersectionObserverEntry[]} entries zh-CN: 视口变化条目；en-US: entries
         * @param {IntersectionObserver} observer zh-CN: 观察者；en-US: observer
         */
        const sectionObserverCallback = (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                applyStaggerToCards();
                observer.unobserve(entry.target);
            });
        };

        /** @type {IntersectionObserver} */
        const sectionObserver = new IntersectionObserver(sectionObserverCallback, {
            root: null,
            threshold: 0.2,
        });

        sectionObserver.observe(section);
    }

    /**
     * @brief 设置 Hero 右侧卡片的 3D 跟随效果。
     *        Setup subtle 3D parallax for the hero right panel card.
     *
     * @note zh-CN:
     *  只做很轻微的 rotateX / rotateY + 阴影变化，避免干扰读图。
     *
     * @note en-US:
     *  Applies very subtle rotateX / rotateY and shadow change,
     *  so it does not distract from reading content.
     */
    function setupHeroParallax() {
        const card = /** @type {HTMLElement | null} */ (
            document.querySelector(".hero-panel-card")
        );
        if (!card) return;

        // 预设过渡，让动效显得顺滑
        card.style.transition =
            "transform 0.18s ease-out, box-shadow 0.18s ease-out";

        /**
         * @brief 鼠标移动时的处理函数 / Mouse move handler.
         *
         * @param {MouseEvent} event zh-CN: 鼠标事件；en-US: mouse event
         */
        const handleMouseMove = (event) => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // 将 (x, y) 映射到 [-1, 1] 区间
            const normalizedX = (x / rect.width) * 2 - 1;
            const normalizedY = (y / rect.height) * 2 - 1;

            const maxRotate = 6; // 最大旋转角度（单位：度 / degrees）

            const rotateY = -normalizedX * maxRotate;
            const rotateX = normalizedY * maxRotate;

            card.style.transform = `
        perspective(780px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        translateZ(4px)
      `;
            card.style.boxShadow =
                "0 22px 40px rgba(15, 23, 42, 0.95), 0 0 0 1px rgba(148, 163, 184, 0.6)";
        };

        /**
         * @brief 鼠标离开时复位 / Reset transform when mouse leaves.
         */
        const handleMouseLeave = () => {
            card.style.transform = "perspective(780px) rotateX(0deg) rotateY(0deg)";
            card.style.boxShadow =
                "0 16px 38px rgba(15, 23, 42, 0.9), 0 0 0 1px rgba(148, 163, 184, 0.5)";
        };

        card.addEventListener("mousemove", handleMouseMove);
        card.addEventListener("mouseleave", handleMouseLeave);
    }

    // 导出公共 API / Export public API
    return {
        init,
    };
})();

/**
 * @brief DOMContentLoaded 事件挂载 / Wire up init on DOMContentLoaded.
 *
 * @note zh-CN:
 *  和 main.js 各自监听 DOMContentLoaded 即可，不会互相冲突。
 *
 * @note en-US:
 *  Safe to have both animation.js and main.js listening to DOMContentLoaded.
 */
document.addEventListener("DOMContentLoaded", () => {
    PageAnimation.init();
});
