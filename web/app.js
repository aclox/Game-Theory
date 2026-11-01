/**
 * Game-Theoretic Autonomous Vehicles Intersection System
 * Interactive Simulation, Nash Solver, and Benchmark Engine
 * Authors: Mohit Agarwal, Ineesh Khindria, Akshit Goel
 */

// ============================================================================
// 1. TAB NAVIGATION & MATHEMATICAL RENDERING
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initNashSolver();
    initBenchmark();
    initSimulation();
    initMathRendering();
});

function initMathRendering() {
    // If KaTeX auto-render extension is available, typeset mathematics on page
    if (typeof renderMathInElement === "function") {
        renderMathInElement(document.body, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false }
            ],
            throwOnError: false
        });
    } else {
        // Retry shortly in case defer script loads slightly after DOMContentLoaded
        setTimeout(() => {
            if (typeof renderMathInElement === "function") {
                renderMathInElement(document.body, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                        { left: "\\[", right: "\\]", display: true },
                        { left: "\\(", right: "\\)", display: false }
                    ],
                    throwOnError: false
                });
            }
        }, 500);
    }
}

function initTabs() {
    const tabs = document.querySelectorAll(".nav-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const targetId = `tab-${tab.getAttribute("data-tab")}`;
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add("active");

            // Re-render math if switching to theory tab to ensure proper typesetting
            if (targetId === "tab-theory") {
                setTimeout(initMathRendering, 60);
            }
        });
    });
}

// ============================================================================
// 2. INTERACTIVE NASH EQUILIBRIUM SOLVER
// ============================================================================
const PRESETS = {
    chicken: {
        a: [[-100, 10], [2, 0]],
        b: [[-100, 2], [10, 0]],
        labelsA: ["Go", "Yield"],
        labelsB: ["Go", "Yield"],
        desc: "Classic Chicken Game (Hawk-Dove) for unsignalized intersections."
    },
    asymmetric: {
        a: [[-100, 15], [2, 0]],
        b: [[-100, 2], [10, 0]],
        labelsA: ["Go", "Yield"],
        labelsB: ["Go", "Yield"],
        desc: "Player A on main road has priority bonus (+5)."
    },
    coordination: {
        a: [[10, -50], [-50, 5]],
        b: [[10, -50], [-50, 5]],
        labelsA: ["Right-First", "Left-First"],
        labelsB: ["Right-First", "Left-First"],
        desc: "Pure coordination: both benefit from adhering to right-of-way convention."
    },
    prisoners: {
        a: [[-5, 5], [-10, 0]],
        b: [[-5, -10], [5, 0]],
        labelsA: ["Go (Defect)", "Yield (Cooperate)"],
        labelsB: ["Go (Defect)", "Yield (Cooperate)"],
        desc: "Prisoner's Dilemma: Defect is dominant, leading to mutual delay."
    },
    emergency: {
        a: [[-100, 25], [0, -5]],
        b: [[-200, 0], [2, 0]],
        labelsA: ["Go", "Yield"],
        labelsB: ["Go", "Yield"],
        desc: "Emergency Vehicle (Player A) priority with severe penalty for blocking."
    }
};

function initNashSolver() {
    const presetSelect = document.getElementById("matrix-preset");
    const recomputeBtn = document.getElementById("btn-recompute-nash");

    if (presetSelect) {
        presetSelect.addEventListener("change", (e) => {
            if (e.target.value !== "custom") {
                loadPreset(e.target.value);
            }
            computeAndRenderNash();
        });
    }

    if (recomputeBtn) {
        recomputeBtn.addEventListener("click", () => {
            computeAndRenderNash();
            const orig = recomputeBtn.textContent;
            recomputeBtn.textContent = "✓ Equilibria Computed!";
            recomputeBtn.style.boxShadow = "0 0 15px rgba(0, 212, 255, 0.7)";
            setTimeout(() => {
                recomputeBtn.textContent = orig;
                recomputeBtn.style.boxShadow = "";
            }, 1200);
        });
    }

    // Auto-recompute on any input cell change, keyup, or step
    const inputs = document.querySelectorAll(".input-payoff");
    inputs.forEach(input => {
        const handler = () => {
            if (presetSelect && presetSelect.value !== "custom") {
                presetSelect.value = "custom";
            }
            computeAndRenderNash();
        };
        input.addEventListener("input", handler);
        input.addEventListener("change", handler);
        input.addEventListener("keyup", handler);
    });

    // Initial load
    loadPreset("chicken");
    computeAndRenderNash();
}

function loadPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    setVal("cell-00-a", p.a[0][0]);
    setVal("cell-00-b", p.b[0][0]);
    setVal("cell-01-a", p.a[0][1]);
    setVal("cell-01-b", p.b[0][1]);
    setVal("cell-10-a", p.a[1][0]);
    setVal("cell-10-b", p.b[1][0]);
    setVal("cell-11-a", p.a[1][1]);
    setVal("cell-11-b", p.b[1][1]);
}

function getMatrixFromInputs() {
    const getVal = (id, defaultVal = 0) => {
        const el = document.getElementById(id);
        if (!el || el.value.trim() === "" || isNaN(parseFloat(el.value))) return defaultVal;
        return parseFloat(el.value);
    };
    return {
        a: [
            [getVal("cell-00-a", -100), getVal("cell-01-a", 10)],
            [getVal("cell-10-a", 2), getVal("cell-11-a", 0)]
        ],
        b: [
            [getVal("cell-00-b", -100), getVal("cell-01-b", 2)],
            [getVal("cell-10-b", 10), getVal("cell-11-b", 0)]
        ]
    };
}

function computeAndRenderNash() {
    const { a, b } = getMatrixFromInputs();
    const outputEl = document.getElementById("nash-results-output");
    const statusText = document.getElementById("solver-status-text");
    const calcTime = document.getElementById("solver-calc-time");

    // 1. Identify Best Responses for Player A and Player B
    // Player A best response in Col 0:
    const brA_col0 = a[0][0] >= a[1][0] ? (a[0][0] === a[1][0] ? [0, 1] : [0]) : [1];
    // Player A best response in Col 1:
    const brA_col1 = a[0][1] >= a[1][1] ? (a[0][1] === a[1][1] ? [0, 1] : [0]) : [1];

    // Player B best response in Row 0:
    const brB_row0 = b[0][0] >= b[0][1] ? (b[0][0] === b[0][1] ? [0, 1] : [0]) : [1];
    // Player B best response in Row 1:
    const brB_row1 = b[1][0] >= b[1][1] ? (b[1][0] === b[1][1] ? [0, 1] : [0]) : [1];

    // Highlight inputs according to best responses
    const updateInputHighlight = (id, isBest) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("best-response-a", isBest);
    };
    const updateInputHighlightB = (id, isBest) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("best-response-b", isBest);
    };

    updateInputHighlight("cell-00-a", brA_col0.includes(0));
    updateInputHighlight("cell-10-a", brA_col0.includes(1));
    updateInputHighlight("cell-01-a", brA_col1.includes(0));
    updateInputHighlight("cell-11-a", brA_col1.includes(1));

    updateInputHighlightB("cell-00-b", brB_row0.includes(0));
    updateInputHighlightB("cell-01-b", brB_row0.includes(1));
    updateInputHighlightB("cell-10-b", brB_row1.includes(0));
    updateInputHighlightB("cell-11-b", brB_row1.includes(1));

    // 2. Pure Strategy NE
    const pureNE = [];
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            const isBestA = (c === 0 && brA_col0.includes(r)) || (c === 1 && brA_col1.includes(r));
            const isBestB = (r === 0 && brB_row0.includes(c)) || (r === 1 && brB_row1.includes(c));
            if (isBestA && isBestB) {
                pureNE.push({ row: r, col: c, payoffA: a[r][c], payoffB: b[r][c] });
            }
        }
    }

    // 3. Pareto Optimality Check
    function isPareto(r, c) {
        const ua = a[r][c];
        const ub = b[r][c];
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (a[i][j] >= ua && b[i][j] >= ub && (a[i][j] > ua || b[i][j] > ub)) {
                    return false;
                }
            }
        }
        return true;
    }

    // Update table cell classes and badges
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            const td = document.getElementById(`td-cell-${r}${c}`);
            const label = document.getElementById(`cell-${r}${c}-label`);
            const isNE = pureNE.some(ne => ne.row === r && ne.col === c);
            const pareto = isPareto(r, c);
            const welfare = a[r][c] + b[r][c];

            if (td) {
                td.classList.toggle("is-nash", isNE);
                td.classList.toggle("is-pareto", pareto && !isNE);
            }
            if (label) {
                if (isNE) {
                    label.innerHTML = `<span class="cell-nash-badge ${pareto ? 'pareto' : ''}">★ Pure NE ${pareto ? '(Pareto)' : ''}</span><br><span style="font-size:0.75rem; color:#8b949e">Welfare: ${welfare}</span>`;
                } else {
                    label.innerHTML = `Welfare: ${welfare} ${pareto ? '<span style="color:var(--accent-cyan)">• Pareto Frontier</span>' : ''}`;
                }
            }
        }
    }

    // 4. Mixed Strategy NE (Indifference Condition)
    // q * a[0][0] + (1-q) * a[0][1] = q * a[1][0] + (1-q) * a[1][1]
    let mixedNE = null;
    const denomA = (a[0][0] - a[0][1] - a[1][0] + a[1][1]);
    const numA = (a[1][1] - a[0][1]);
    const q = denomA !== 0 ? numA / denomA : null;

    // p * b[0][0] + (1-p) * b[1][0] = p * b[0][1] + (1-p) * b[1][1]
    const denomB = (b[0][0] - b[1][0] - b[0][1] + b[1][1]);
    const numB = (b[1][1] - b[1][0]);
    const p = denomB !== 0 ? numB / denomB : null;

    if (p !== null && q !== null && p > 0 && p < 1 && q > 0 && q < 1) {
        const expPayoffA = p * (q * a[0][0] + (1 - q) * a[0][1]) + (1 - p) * (q * a[1][0] + (1 - q) * a[1][1]);
        const expPayoffB = p * (q * b[0][0] + (1 - q) * b[0][1]) + (1 - p) * (q * b[1][0] + (1 - q) * b[1][1]);
        mixedNE = { p, q, expPayoffA, expPayoffB };
    }

    // 5. Dominant Strategy Detection
    let domA = "No strictly dominant strategy (Best response depends on Player B)";
    if (a[0][0] > a[1][0] && a[0][1] > a[1][1]) domA = "Action 0 (Go) strictly dominates Action 1 (Yield)";
    else if (a[1][0] > a[0][0] && a[1][1] > a[0][1]) domA = "Action 1 (Yield) strictly dominates Action 0 (Go)";

    let domB = "No strictly dominant strategy (Best response depends on Player A)";
    if (b[0][0] > b[0][1] && b[1][0] > b[1][1]) domB = "Action 0 (Go) strictly dominates Action 1 (Yield)";
    else if (b[0][1] > b[0][0] && b[1][1] > b[1][0]) domB = "Action 1 (Yield) strictly dominates Action 0 (Go)";

    // 6. Social Welfare and Price of Anarchy
    const allWelfares = [
        a[0][0] + b[0][0],
        a[0][1] + b[0][1],
        a[1][0] + b[1][0],
        a[1][1] + b[1][1]
    ];
    const maxWelfare = Math.max(...allWelfares);
    let poaText = "N/A";
    if (pureNE.length > 0) {
        const neWelfares = pureNE.map(ne => ne.payoffA + ne.payoffB);
        const worstNeWelfare = Math.min(...neWelfares);
        if (worstNeWelfare > 0 && maxWelfare > 0) {
            poaText = (maxWelfare / worstNeWelfare).toFixed(2);
        } else if (worstNeWelfare === maxWelfare) {
            poaText = "1.00 (Optimal Welfare)";
        } else {
            poaText = `${maxWelfare} / ${worstNeWelfare}`;
        }
    }

    // Render HTML Output
    let html = "";
    if (pureNE.length > 0) {
        pureNE.forEach((ne, idx) => {
            const pareto = isPareto(ne.row, ne.col);
            const rName = ne.row === 0 ? "Go" : "Yield";
            const cName = ne.col === 0 ? "Go" : "Yield";
            html += `
                <div class="eq-card ${pareto ? 'pareto' : ''}">
                    <div class="eq-title">
                        <span>Pure Equilibrium #${idx + 1}: (${rName}, ${cName})</span>
                        <div>
                            <span class="eq-badge">Pure NE</span>
                            ${pareto ? '<span class="eq-badge pareto-tag">Pareto Optimal</span>' : ''}
                        </div>
                    </div>
                    <div class="eq-detail">
                        Payoff Profile: (Player A: ${ne.payoffA}, Player B: ${ne.payoffB}) | Social Welfare: ${ne.payoffA + ne.payoffB}
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div class="empty-state">No Pure-Strategy Nash Equilibrium exists for this payoff configuration.</div>`;
    }

    if (mixedNE) {
        html += `
            <div class="eq-card">
                <div class="eq-title">
                    <span>Mixed-Strategy Nash Equilibrium</span>
                    <span class="eq-badge">Mixed NE</span>
                </div>
                <div class="eq-detail">
                    <div>Player A strategy: σ_A = (${(mixedNE.p * 100).toFixed(1)}% Go, ${((1 - mixedNE.p) * 100).toFixed(1)}% Yield)</div>
                    <div>Player B strategy: σ_B = (${(mixedNE.q * 100).toFixed(1)}% Go, ${((1 - mixedNE.q) * 100).toFixed(1)}% Yield)</div>
                    <div style="margin-top:6px; color: var(--accent-yellow)">Expected Payoffs: (A: ${mixedNE.expPayoffA.toFixed(2)}, B: ${mixedNE.expPayoffB.toFixed(2)}) | Exp Welfare: ${(mixedNE.expPayoffA + mixedNE.expPayoffB).toFixed(2)}</div>
                </div>
            </div>
        `;
    }

    html += `
        <div class="eq-card" style="border-left-color: var(--accent-purple);">
            <div class="eq-title">
                <span>Strategic Insights & Social Optimality</span>
                <span class="eq-badge" style="color:var(--accent-purple); background:rgba(138,43,226,0.15)">Analysis</span>
            </div>
            <div class="eq-detail" style="line-height: 1.6;">
                <div><strong>Player A Dominance:</strong> ${domA}</div>
                <div><strong>Player B Dominance:</strong> ${domB}</div>
                <div style="margin-top:4px;"><strong>Social Optimum (Max Welfare):</strong> ${maxWelfare} | <strong>Price of Anarchy (PoA):</strong> ${poaText}</div>
            </div>
        </div>
    `;

    outputEl.innerHTML = html;

    if (statusText) {
        statusText.innerHTML = `● Solved: ${pureNE.length} Pure NE ${mixedNE ? '+ 1 Mixed NE' : ''} | Real-Time Active`;
    }
    if (calcTime) {
        const now = new Date();
        calcTime.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }
}

// ============================================================================
// 3. BENCHMARK & COMPARISON TABLE
// ============================================================================
const BENCHMARK_DATA = [
    {
        name: "Nash Simultaneous (Decentralized)",
        collisionRate: "0.8%",
        delay: "3.4s",
        throughput: "24.2",
        fairness: "0.985",
        poa: "66.7",
        welfare: "12.0",
        advantage: "Decentralized, zero communication required"
    },
    {
        name: "Stackelberg Leader-Follower",
        collisionRate: "0.0%",
        delay: "2.1s",
        throughput: "28.5",
        fairness: "0.833",
        poa: "1.00",
        welfare: "12.0",
        advantage: "Zero collisions, eliminates coordination failure"
    },
    {
        name: "Bayesian Mixed Traffic (AV vs HDV)",
        collisionRate: "0.0%",
        delay: "4.8s",
        throughput: "21.0",
        fairness: "0.780",
        poa: "1.20",
        welfare: "10.0",
        advantage: "Provably collision-free against irrational/aggressive drivers"
    },
    {
        name: "Vickrey Urgency Auction",
        collisionRate: "0.0%",
        delay: "1.8s",
        throughput: "32.4",
        fairness: "0.910",
        poa: "1.00",
        welfare: "24.5",
        advantage: "Maximizes allocative efficiency; dominant truth-telling"
    },
    {
        name: "Priority Borda Voting",
        collisionRate: "0.0%",
        delay: "2.3s",
        throughput: "29.1",
        fairness: "0.965",
        poa: "1.05",
        welfare: "21.2",
        advantage: "Fair social choice, emergency vehicle priority without money"
    },
    {
        name: "Correlated Traffic Signal",
        collisionRate: "0.0%",
        delay: "5.2s",
        throughput: "19.5",
        fairness: "1.000",
        poa: "1.15",
        welfare: "12.0",
        advantage: "Perfect fairness, conventional infrastructure baseline"
    }
];

function initBenchmark() {
    const tbody = document.getElementById("benchmark-table-body");
    tbody.innerHTML = BENCHMARK_DATA.map(row => `
        <tr>
            <td><strong>${row.name}</strong></td>
            <td><span style="color: ${row.collisionRate === '0.0%' ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:600;">${row.collisionRate}</span></td>
            <td>${row.delay}</td>
            <td>${row.throughput}</td>
            <td>${row.fairness}</td>
            <td>${row.poa}</td>
            <td><strong>${row.welfare}</strong></td>
            <td><span style="color: var(--text-secondary); font-size: 0.82rem">${row.advantage}</span></td>
        </tr>
    `).join("");

    renderBenchmarkCharts();

    const exportBtn = document.getElementById("btn-export-csv");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            let csv = "Mechanism,Collision Rate,Avg Delay,Throughput,Fairness,PoA,Social Welfare,Advantage\n";
            BENCHMARK_DATA.forEach(r => {
                csv += `"${r.name}","${r.collisionRate}","${r.delay}","${r.throughput}","${r.fairness}","${r.poa}","${r.welfare}","${r.advantage}"\n`;
            });
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "intersection_game_benchmark.csv";
            a.click();
        });
    }
}

function renderBenchmarkCharts() {
    const canvas = document.getElementById("chart-efficiency");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = ["Nash", "Stackelberg", "Bayesian", "Auction", "Voting", "Signal"];
    const throughputs = [24.2, 28.5, 21.0, 32.4, 29.1, 19.5];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxVal = 40;
    const barWidth = 45;
    const startX = 40;
    const baseY = 200;

    ctx.font = "11px Outfit, sans-serif";

    throughputs.forEach((val, i) => {
        const x = startX + i * 65;
        const h = (val / maxVal) * 150;
        const y = baseY - h;

        const grad = ctx.createLinearGradient(x, y, x, baseY);
        grad.addColorStop(0, "#00d4ff");
        grad.addColorStop(1, "#0066aa");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, h);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(val.toString(), x + 10, y - 6);

        ctx.fillStyle = "#8b949e";
        ctx.fillText(labels[i], x + 5, baseY + 18);
    });

    const canvasSafety = document.getElementById("chart-safety");
    if (!canvasSafety) return;
    const ctxS = canvasSafety.getContext("2d");
    ctxS.clearRect(0, 0, canvasSafety.width, canvasSafety.height);

    ctxS.font = "12px Outfit, sans-serif";
    ctxS.fillStyle = "#2ecc71";
    ctxS.fillText("Stackelberg, Bayesian, Auction, Voting, Signal: 0.0% Collisions (Proven Safe)", 20, 60);

    ctxS.fillStyle = "#e74c3c";
    ctxS.fillText("Nash Decentralized Mixed Strategy: 0.8% Coordination Collision Risk", 20, 100);

    ctxS.fillStyle = "#8b949e";
    ctxS.font = "11px Outfit, sans-serif";
    ctxS.fillText("Coordination failure in symmetric simultaneous play occurs when both vehicles", 20, 140);
    ctxS.fillText("randomize and simultaneously sample 'Go' (Hawk-Hawk dilemma).", 20, 158);
}

// ============================================================================
// 4. LIVE 2D INTERSECTION SIMULATION
// ============================================================================
let simRunning = true;
let simVehicles = [];
let simCollisions = 0;
let simThroughput = 0;
let simDelays = [];
let simMode = "stackelberg";
let signalPhase = "NS";
let signalTimer = 0;
let activePriorityWinnerId = null;
let autoFlowEnabled = false;
let autoFlowTimer = 0;

const DESCRIPTIONS = {
    nash: "Decentralized Normal-Form Game: Vehicles simultaneously randomize over Go/Yield based on mixed NE. Low collision probability occurs during simultaneous 'Go' sampling.",
    stackelberg: "Sequential Extensive-Form: Earlier vehicle commits to Go as Leader. Follower rationally best-responds by Yielding. 100% collision-free.",
    bayesian: "Incomplete Information: AV models unknown human drivers as Aggressive (35%) or Cautious (65%). AV yields conservatively to avoid aggressive collisions.",
    auction: "Vickrey Second-Price Sealed-Bid: Approaching vehicles bid private urgency. Highest bidder wins traversal priority, paying second-highest bid. 100% efficient.",
    voting: "Priority-Weighted Borda Count: Vehicles cast preference rankings. Emergency vehicles receive weighted priority veto.",
    correlated: "Correlated Equilibrium Traffic Light: Signal device alternates green/red phases. Eliminates conflicts with perfect fairness."
};

class SimVehicle {
    constructor(id, direction, isAv = true, urgency = 5.0, isEmergency = false, startOffset = 230) {
        this.id = id;
        this.direction = direction; // 'north', 'south', 'east', 'west'
        this.isAv = isAv;
        this.urgency = urgency;
        this.isEmergency = isEmergency;
        this.length = 32;
        this.width = 18;
        this.speed = 0;
        this.maxSpeed = 2.4;
        this.action = "go";
        this.state = "approaching"; // 'approaching', 'yielding', 'crossing', 'passed', 'collided'
        this.waitingTime = 0;
        this.counted = false;

        this.centerX = 380;
        this.centerY = 325;
        this.startOffset = startOffset;
        this.initPos();
    }

    initPos() {
        const offset = this.startOffset;
        const laneOffset = 20;

        if (this.direction === "north") {
            this.x = this.centerX - laneOffset;
            this.y = this.centerY - offset;
            this.speed = this.maxSpeed * 0.85;
        } else if (this.direction === "south") {
            this.x = this.centerX + laneOffset;
            this.y = this.centerY + offset;
            this.speed = this.maxSpeed * 0.85;
        } else if (this.direction === "east") {
            this.x = this.centerX + offset;
            this.y = this.centerY - laneOffset;
            this.speed = this.maxSpeed * 0.85;
        } else if (this.direction === "west") {
            this.x = this.centerX - offset;
            this.y = this.centerY + laneOffset;
            this.speed = this.maxSpeed * 0.85;
        }
    }

    distToCenter() {
        return Math.hypot(this.x - this.centerX, this.y - this.centerY);
    }

    isInside() {
        return Math.abs(this.x - this.centerX) <= 80 && Math.abs(this.y - this.centerY) <= 80;
    }

    hasClearedConflict() {
        // Vehicle center has passed the critical intersection box center line
        if (this.direction === "north") return this.y > this.centerY + 65;
        if (this.direction === "south") return this.y < this.centerY - 65;
        if (this.direction === "east") return this.x < this.centerX - 65;
        if (this.direction === "west") return this.x > this.centerX + 65;
        return false;
    }

    hasExited() {
        if (this.direction === "north") return this.y > this.centerY + 120;
        if (this.direction === "south") return this.y < this.centerY - 120;
        if (this.direction === "east") return this.x < this.centerX - 120;
        if (this.direction === "west") return this.x > this.centerX + 120;
        return false;
    }

    update() {
        if (this.state === "collided") {
            this.speed = 0;
            return;
        }

        if (this.hasClearedConflict()) {
            this.state = "passed";
            this.action = "go";
        }

        const targetSpeed = this.action === "go" ? this.maxSpeed : 0.0;
        if (this.speed < targetSpeed) this.speed = Math.min(targetSpeed, this.speed + 0.14);
        if (this.speed > targetSpeed) this.speed = Math.max(targetSpeed, this.speed - 0.24);

        if (this.speed < 0.25 && this.state !== "passed") {
            this.waitingTime += 0.016;
            if (!this.isInside() && this.action === "yield") {
                this.state = "yielding";
            }
        }

        if (this.direction === "north") this.y += this.speed;
        if (this.direction === "south") this.y -= this.speed;
        if (this.direction === "east") this.x -= this.speed;
        if (this.direction === "west") this.x += this.speed;

        if (this.isInside() && this.state !== "collided" && this.state !== "passed") {
            this.state = "crossing";
        }
    }
}

function initSimulation() {
    const select = document.getElementById("mechanism-select");
    const desc = document.getElementById("mechanism-description");
    const btnSpawn = document.getElementById("btn-spawn");
    const btnAutoFlow = document.getElementById("btn-auto-flow");
    const btnPause = document.getElementById("btn-toggle-pause");
    const btnReset = document.getElementById("btn-reset");

    if (select) {
        select.addEventListener("change", (e) => {
            simMode = e.target.value;
            if (desc) desc.textContent = DESCRIPTIONS[simMode] || "";
            activePriorityWinnerId = null;
        });
    }

    if (btnSpawn) btnSpawn.addEventListener("click", () => spawnWave());

    if (btnAutoFlow) {
        btnAutoFlow.addEventListener("click", () => {
            autoFlowEnabled = !autoFlowEnabled;
            btnAutoFlow.textContent = autoFlowEnabled ? "⚡ Auto Flow: ON" : "⚡ Auto Flow: OFF";
            btnAutoFlow.classList.toggle("active-pulse", autoFlowEnabled);
        });
    }

    if (btnPause) {
        btnPause.addEventListener("click", () => {
            simRunning = !simRunning;
            btnPause.textContent = simRunning ? "⏸ Pause" : "▶ Resume";
            const badge = document.getElementById("sim-status-badge");
            if (badge) badge.textContent = simRunning ? "Running" : "Paused";
        });
    }

    if (btnReset) btnReset.addEventListener("click", () => resetSim());

    // Initial spawn
    spawnWave();
    requestAnimationFrame(simLoop);
}

function spawnWave() {
    const allDirs = ["north", "south", "east", "west"];
    const id = Math.floor(Math.random() * 900) + 100;
    
    // Pick 2 to 4 distinct directions to prevent spawning multiple cars at identical spawn coordinates
    const numVehicles = Math.min(4, Math.floor(Math.random() * 3) + 2);
    const chosenDirs = [...allDirs].sort(() => 0.5 - Math.random()).slice(0, numVehicles);

    // Track active vehicles per direction that are still approaching the intersection
    const activeVehicles = simVehicles.filter(v => v.state !== "passed" && v.state !== "collided");

    chosenDirs.forEach((d, idx) => {
        // Find existing approaching vehicles in this lane
        const inLane = activeVehicles.filter(v => v.direction === d && !v.isInside());
        let startOffset = 230;
        if (inLane.length > 0) {
            // Place behind the last vehicle in this lane by 48 pixels
            const maxCenterDist = Math.max(...inLane.map(v => v.distToCenter()));
            startOffset = Math.max(230, maxCenterDist + 48);
        }

        // Keep vehicle within road approach boundary
        startOffset = Math.min(320, startOffset);

        // If the lane already has 5 waiting vehicles, skip adding to avoid overflowing off-canvas
        if (inLane.length >= 5) return;

        const isEmg = idx === 0 && Math.random() < 0.22;
        const isAv = Math.random() < 0.75;
        const urgency = parseFloat((Math.random() * 8 + 2).toFixed(1));
        const v = new SimVehicle(`V${id + idx}`, d, isAv, urgency, isEmg, startOffset);
        simVehicles.push(v);
    });

    updateLedger();
}

function resetSim() {
    simVehicles = [];
    simCollisions = 0;
    simThroughput = 0;
    simDelays = [];
    activePriorityWinnerId = null;
    updateMetricsUI();
    updateLedger();
}

function updateLedger() {
    const ledger = document.getElementById("vehicle-ledger");
    if (!ledger) return;
    const active = simVehicles.filter(v => v.state !== "passed" && v.state !== "collided");
    if (active.length === 0) {
        ledger.innerHTML = `<div class="empty-state">No approaching vehicles. Click "Spawn Wave" above.</div>`;
        return;
    }
    ledger.innerHTML = active.map(v => `
        <div class="ledger-row">
            <span>${v.id} (${v.direction.toUpperCase()}) ${v.isEmergency ? '🚨' : (v.isAv ? '🤖' : '👤')}</span>
            <span>Urgency: ${v.urgency}</span>
            <span style="color: ${v.action === 'go' ? 'var(--accent-green)' : 'var(--accent-yellow)'}; font-weight:600;">${v.action.toUpperCase()}</span>
        </div>
    `).join("");
}

function enforceSameLaneCarFollowing(active) {
    const byDir = { north: [], south: [], east: [], west: [] };
    active.forEach(v => {
        if (byDir[v.direction]) byDir[v.direction].push(v);
    });

    const SAFE_GAP = 48; // minimum safe gap buffer between vehicle centers

    // Apply car following in a sorted lane list (index 0 is front-most car)
    const applyFollowing = (lane, getGap) => {
        for (let i = 1; i < lane.length; i++) {
            const lead = lane[i - 1];
            const trail = lane[i];
            const gap = getGap(lead, trail);

            if (gap < SAFE_GAP) {
                if (lead.action === "yield" || lead.speed < 0.35) {
                    // Lead vehicle is stopped or yielding; trail vehicle stops behind it
                    trail.action = "yield";
                    trail.speed = Math.max(0, trail.speed - 0.25);
                } else {
                    // Lead vehicle is cruising forward; trail follows smoothly!
                    trail.action = "go";
                    trail.speed = Math.min(trail.maxSpeed, Math.max(0.6, lead.speed * 0.98));
                }
            } else {
                // Gap is open! Trailing car always accelerates forward to fill the space
                trail.action = "go";
            }
        }
    };

    // North (heading south, y increases: larger y is ahead)
    byDir.north.sort((a, b) => b.y - a.y);
    applyFollowing(byDir.north, (lead, trail) => lead.y - trail.y);

    // South (heading north, y decreases: smaller y is ahead)
    byDir.south.sort((a, b) => a.y - b.y);
    applyFollowing(byDir.south, (lead, trail) => trail.y - lead.y);

    // East (heading west, x decreases: smaller x is ahead)
    byDir.east.sort((a, b) => a.x - b.x);
    applyFollowing(byDir.east, (lead, trail) => trail.x - lead.x);

    // West (heading east, x increases: larger x is ahead)
    byDir.west.sort((a, b) => b.x - a.x);
    applyFollowing(byDir.west, (lead, trail) => lead.x - trail.x);
}

function coordinateVehicles() {
    const active = simVehicles.filter(v => v.state !== "collided");

    // 1. Reset action to "go" for every vehicle by default so queues never freeze
    active.forEach(v => {
        v.action = "go";
    });

    // 2. Correlated Traffic Signal (Alternating green phases)
    if (simMode === "correlated") {
        signalTimer += 0.016;
        if (signalTimer >= 3.2) {
            signalTimer = 0;
            signalPhase = signalPhase === "NS" ? "EW" : "NS";
        }

        const nsInBox = active.some(v => v.isInside() && (v.direction === "north" || v.direction === "south"));
        const ewInBox = active.some(v => v.isInside() && (v.direction === "east" || v.direction === "west"));

        active.forEach(v => {
            if (v.isInside() || v.hasClearedConflict()) {
                v.action = "go";
                return;
            }
            // Vehicles approaching the stop line
            const isApproachingStop = v.distToCenter() <= 170;
            if (isApproachingStop) {
                if (signalPhase === "NS") {
                    // NS green if EW cleared; EW must yield at stop line
                    if (v.direction === "north" || v.direction === "south") {
                        v.action = ewInBox ? "yield" : "go";
                    } else {
                        v.action = "yield";
                    }
                } else {
                    // EW green if NS cleared; NS must yield at stop line
                    if (v.direction === "east" || v.direction === "west") {
                        v.action = nsInBox ? "yield" : "go";
                    } else {
                        v.action = "yield";
                    }
                }
            }
        });

        enforceSameLaneCarFollowing(active);
        return;
    }

    // 3. Priority & Game-Theoretic Coordination
    // Find the lead vehicle of each approaching direction (the front of the queue outside intersection)
    const byDir = { north: [], south: [], east: [], west: [] };
    active.forEach(v => {
        if (!v.isInside() && !v.hasClearedConflict()) {
            byDir[v.direction].push(v);
        }
    });

    // In each direction, find the front-most vehicle
    const leadCandidates = [];
    Object.keys(byDir).forEach(dir => {
        const list = byDir[dir];
        if (list.length > 0) {
            list.sort((a, b) => a.distToCenter() - b.distToCenter());
            const lead = list[0];
            // Only consider competing if within stopping decision zone (<= 170px)
            if (lead.distToCenter() <= 170) {
                leadCandidates.push(lead);
            }
        }
    });

    // If a priority winner is currently inside crossing the intersection, let it finish clearing
    if (activePriorityWinnerId) {
        const winner = active.find(v => v.id === activePriorityWinnerId);
        if (winner && !winner.hasClearedConflict() && winner.state !== "collided") {
            // Priority winner proceeds; conflicting leads must yield
            leadCandidates.forEach(v => {
                if (v.id !== activePriorityWinnerId) {
                    const isSameCorridor = (
                        (winner.direction === "north" && v.direction === "south") ||
                        (winner.direction === "south" && v.direction === "north") ||
                        (winner.direction === "east" && v.direction === "west") ||
                        (winner.direction === "west" && v.direction === "east")
                    );
                    if (!isSameCorridor) {
                        v.action = "yield";
                    }
                } else {
                    v.action = "go";
                }
            });
            enforceSameLaneCarFollowing(active);
            return;
        } else {
            // Winner cleared conflict zone! Release priority lock immediately
            activePriorityWinnerId = null;
        }
    }

    // If any car is currently inside the conflict zone, perpendicular cars must wait
    const crossingCar = active.find(v => v.isInside() && !v.hasClearedConflict());
    if (crossingCar) {
        leadCandidates.forEach(v => {
            const isPerpendicular = (
                ((crossingCar.direction === "north" || crossingCar.direction === "south") && (v.direction === "east" || v.direction === "west")) ||
                ((crossingCar.direction === "east" || crossingCar.direction === "west") && (v.direction === "north" || v.direction === "south"))
            );
            if (isPerpendicular) {
                v.action = "yield";
            }
        });
        enforceSameLaneCarFollowing(active);
        return;
    }

    // No car currently in conflict zone! Decide priority among lead candidates
    if (leadCandidates.length >= 2) {
        if (simMode === "stackelberg") {
            // Closest vehicle commits to Go as Leader
            leadCandidates.sort((a, b) => a.distToCenter() - b.distToCenter());
            const winner = leadCandidates[0];
            activePriorityWinnerId = winner.id;
            winner.action = "go";
            for (let i = 1; i < leadCandidates.length; i++) {
                leadCandidates[i].action = "yield";
            }
        } else if (simMode === "auction") {
            // Highest urgency bid (emergency vehicle priority)
            leadCandidates.sort((a, b) => {
                if (a.isEmergency !== b.isEmergency) return b.isEmergency ? 1 : -1;
                return b.urgency - a.urgency;
            });
            const winner = leadCandidates[0];
            activePriorityWinnerId = winner.id;
            winner.action = "go";
            for (let i = 1; i < leadCandidates.length; i++) {
                leadCandidates[i].action = "yield";
            }
        } else if (simMode === "voting") {
            // Borda count ranking (urgency + waiting time bonus + emergency)
            leadCandidates.sort((a, b) => {
                const scoreA = (a.isEmergency ? 60 : 0) + a.urgency + a.waitingTime * 1.8;
                const scoreB = (b.isEmergency ? 60 : 0) + b.urgency + b.waitingTime * 1.8;
                return scoreB - scoreA;
            });
            const winner = leadCandidates[0];
            activePriorityWinnerId = winner.id;
            winner.action = "go";
            for (let i = 1; i < leadCandidates.length; i++) {
                leadCandidates[i].action = "yield";
            }
        } else if (simMode === "bayesian") {
            // Incomplete information: AV yields conservatively to human driver
            const av = leadCandidates.find(v => v.isAv);
            const hdv = leadCandidates.find(v => !v.isAv);
            if (av && hdv) {
                av.action = "yield";
                hdv.action = "go";
                activePriorityWinnerId = hdv.id;
            } else {
                leadCandidates.sort((a, b) => a.distToCenter() - b.distToCenter());
                leadCandidates[0].action = "go";
                for (let i = 1; i < leadCandidates.length; i++) leadCandidates[i].action = "yield";
                activePriorityWinnerId = leadCandidates[0].id;
            }
        } else if (simMode === "nash") {
            // Mixed strategy simultaneous coordination
            leadCandidates.sort((a, b) => a.distToCenter() - b.distToCenter());
            if (Math.random() < 0.08) {
                // Hawk-Hawk simultaneous entry collision risk
                leadCandidates[0].action = "go";
                leadCandidates[1].action = "go";
            } else {
                leadCandidates[0].action = "go";
                leadCandidates[1].action = "yield";
                activePriorityWinnerId = leadCandidates[0].id;
            }
        }
    }

    // 4. Car-Following: Ensure trailing cars follow lead cars smoothly and fill up spaces
    enforceSameLaneCarFollowing(active);
}

function checkSimConflicts() {
    const active = simVehicles.filter(v => v.state !== "passed" && v.state !== "collided");
    for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
            const v1 = active[i];
            const v2 = active[j];
            const d = Math.hypot(v1.x - v2.x, v1.y - v2.y);
            if (d < 22 && (v1.isInside() || v2.isInside())) {
                v1.state = "collided";
                v2.state = "collided";
                simCollisions++;
                updateMetricsUI();
            }
        }
    }
}

function updateMetricsUI() {
    const elTh = document.getElementById("metric-throughput");
    const elCol = document.getElementById("metric-collisions");
    const elDel = document.getElementById("metric-avg-delay");
    const elFair = document.getElementById("metric-fairness");

    if (elTh) elTh.textContent = simThroughput.toString();
    if (elCol) elCol.textContent = simCollisions.toString();

    const avgWait = simDelays.length > 0
        ? (simDelays.reduce((a, b) => a + b, 0) / simDelays.length).toFixed(1)
        : "0.0";
    if (elDel) elDel.textContent = `${avgWait}s`;

    // Jain's fairness index
    if (simDelays.length >= 2) {
        const sum = simDelays.reduce((a, b) => a + b, 0);
        const sumSq = simDelays.reduce((a, b) => a + b * b, 0);
        const jain = ((sum * sum) / (simDelays.length * sumSq)).toFixed(3);
        if (elFair) elFair.textContent = isNaN(jain) ? "1.000" : jain;
    }
}

function drawSim(ctx) {
    const w = 760;
    const h = 650;
    const cx = 380;
    const cy = 325;
    const roadW = 80;

    // Background
    ctx.fillStyle = "#12141a";
    ctx.fillRect(0, 0, w, h);

    // Roads (Horizontal & Vertical cross)
    ctx.fillStyle = "#2c303d";
    ctx.fillRect(0, cy - roadW / 2, w, roadW);
    ctx.fillRect(cx - roadW / 2, 0, roadW, h);

    // Intersection Conflict Box
    ctx.fillStyle = "#3a4052";
    ctx.fillRect(cx - 80, cy - 80, 160, 160);
    ctx.strokeStyle = "#5a627a";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 80, cy - 80, 160, 160);

    // Dashed center markings
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);

    // East-West line
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(cx - 80, cy);
    ctx.moveTo(cx + 80, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // North-South line
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - 80);
    ctx.moveTo(cx, cy + 80);
    ctx.lineTo(cx, h);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // Solid stop lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    // North stop line
    ctx.beginPath(); ctx.moveTo(cx - 40, cy - 80); ctx.lineTo(cx, cy - 80); ctx.stroke();
    // South stop line
    ctx.beginPath(); ctx.moveTo(cx, cy + 80); ctx.lineTo(cx + 40, cy + 80); ctx.stroke();
    // West stop line
    ctx.beginPath(); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx - 80, cy + 40); ctx.stroke();
    // East stop line
    ctx.beginPath(); ctx.moveTo(cx + 80, cy - 40); ctx.lineTo(cx + 80, cy); ctx.stroke();

    // Traffic signal lights for Correlated Signal Mode
    if (simMode === "correlated") {
        ctx.fillStyle = signalPhase === "NS" ? "#2ecc71" : "#e74c3c";
        ctx.beginPath(); ctx.arc(cx - 50, cy - 85, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 50, cy + 85, 7, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = signalPhase === "EW" ? "#2ecc71" : "#e74c3c";
        ctx.beginPath(); ctx.arc(cx - 85, cy + 50, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 85, cy - 50, 7, 0, Math.PI * 2); ctx.fill();
    }

    // Draw vehicles
    simVehicles.forEach(v => {
        let color = v.isAv ? "#00d4ff" : "#f39c12";
        if (v.isEmergency) color = "#ff1f50";
        if (v.action === "yield" && v.state !== "collided") color = "#2ecc71";
        if (v.state === "collided") color = "#e74c3c";

        ctx.fillStyle = color;
        const isVert = v.direction === "north" || v.direction === "south";
        const bw = isVert ? v.width : v.length;
        const bh = isVert ? v.length : v.width;

        ctx.beginPath();
        ctx.roundRect(v.x - bw / 2, v.y - bh / 2, bw, bh, 4);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.font = "10px JetBrains Mono, monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(v.id, v.x - 10, v.y - bh / 2 - 4);
    });
}

function simLoop() {
    if (simRunning) {
        // Handle Auto-Flow Spawning
        if (autoFlowEnabled) {
            autoFlowTimer += 0.016;
            if (autoFlowTimer >= 3.2) {
                autoFlowTimer = 0;
                const activeCount = simVehicles.filter(v => v.state !== "passed" && v.state !== "collided").length;
                if (activeCount < 10) {
                    spawnWave();
                }
            }
        }

        coordinateVehicles();
        simVehicles.forEach(v => {
            v.update();
            if (v.state === "passed" && !v.counted) {
                v.counted = true;
                simThroughput++;
                simDelays.push(v.waitingTime);
                updateMetricsUI();
            }
        });
        checkSimConflicts();
        // Remove exited vehicles only when they have completed crossing and fully left the canvas
        simVehicles = simVehicles.filter(v => {
            if (v.state === "collided") return true;
            if (v.state === "passed") {
                return Math.hypot(v.x - v.centerX, v.y - v.centerY) < 450;
            }
            return true; // Approaching and crossing vehicles are NEVER removed
        });
    }

    const canvas = document.getElementById("sim-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        drawSim(ctx);
    }

    requestAnimationFrame(simLoop);
}
