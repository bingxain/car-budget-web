const systems = [
  {
    key: "tires",
    name: "輪胎抓地",
    hint: "胎況、胎寬、胎溫工作區間",
    cost: 28000,
    advice: "先換狀況穩定的性能胎，確認胎壓與定位，再談更大的動力。"
  },
  {
    key: "brakes",
    name: "煞車",
    hint: "來令片、碟盤、油品、散熱",
    cost: 36000,
    advice: "升級來令片與煞車油，必要時加強導風，避免熱衰退。"
  },
  {
    key: "suspension",
    name: "懸吊定位",
    hint: "避震器、彈簧、camber、toe",
    cost: 52000,
    advice: "先做定位與避震狀態檢查，再依用途調整彈簧與阻尼。"
  },
  {
    key: "cooling",
    name: "散熱",
    hint: "水溫、油溫、進氣溫度",
    cost: 42000,
    advice: "補強水箱、油冷或中冷，讓連續高負載時輸出不衰退。"
  },
  {
    key: "power",
    name: "動力",
    hint: "馬力、扭力、增壓、供油",
    cost: 70000,
    advice: "動力升級要搭配 ECU、供油、散熱與傳動承受度。"
  },
  {
    key: "drivetrain",
    name: "傳動",
    hint: "離合器、變速箱、LSD、半軸",
    cost: 48000,
    advice: "扭力增加前先確認離合器與變速箱承受度，避免打滑或損傷。"
  },
  {
    key: "chassis",
    name: "車體剛性",
    hint: "襯套、拉桿、底盤異音",
    cost: 30000,
    advice: "更新老化襯套與關節，剛性件要配合輪胎與懸吊狀態。"
  },
  {
    key: "data",
    name: "監控資料",
    hint: "油溫、水溫、空燃比、紀錄器",
    cost: 18000,
    advice: "至少建立溫度與空燃比監控，調校前後都要有資料。"
  }
];

const goalWeights = {
  street: { tires: 1.15, brakes: 1.1, suspension: 1.0, cooling: 0.9, power: 0.75, drivetrain: 0.85, chassis: 1.0, data: 0.85 },
  mountain: { tires: 1.3, brakes: 1.25, suspension: 1.25, cooling: 1.05, power: 0.75, drivetrain: 0.9, chassis: 1.05, data: 0.9 },
  track: { tires: 1.25, brakes: 1.35, suspension: 1.2, cooling: 1.3, power: 0.95, drivetrain: 1.05, chassis: 1.0, data: 1.15 },
  drag: { tires: 1.2, brakes: 0.9, suspension: 0.85, cooling: 1.05, power: 1.35, drivetrain: 1.3, chassis: 0.8, data: 1.0 }
};

const dependencies = {
  power: ["tires", "brakes", "cooling", "drivetrain", "data"],
  suspension: ["tires", "chassis"],
  brakes: ["tires", "data"],
  cooling: ["data"],
  drivetrain: ["tires", "data"]
};

const storageKey = "car-tuning-planner";
const defaultScores = {
  tires: 5,
  brakes: 5,
  suspension: 5,
  cooling: 5,
  power: 5,
  drivetrain: 5,
  chassis: 5,
  data: 4
};
const sampleScores = {
  tires: 4.2,
  brakes: 3.8,
  suspension: 5.2,
  cooling: 3.5,
  power: 7.4,
  drivetrain: 4.6,
  chassis: 5.8,
  data: 2.8
};

const inputs = document.getElementById("inputs");
const goalSelect = document.getElementById("goalSelect");
const budgetInput = document.getElementById("budgetInput");
const topUpgrade = document.getElementById("topUpgrade");
const topReason = document.getElementById("topReason");
const budgetStatus = document.getElementById("budgetStatus");
const budgetDetail = document.getElementById("budgetDetail");
const riskStatus = document.getElementById("riskStatus");
const riskDetail = document.getElementById("riskDetail");
const upgradeList = document.getElementById("upgradeList");
const notes = document.getElementById("notes");

let scores = { ...defaultScores };

function buildInputs() {
  inputs.innerHTML = "";
  systems.forEach((system) => {
    const row = document.createElement("label");
    row.className = "metric-row";
    row.innerHTML = `
      <span class="metric-head">
        <strong>${system.name}</strong>
        <span class="score" id="score-${system.key}">${scores[system.key].toFixed(1)} / 10</span>
      </span>
      <span class="metric-hint">${system.hint}</span>
      <input id="input-${system.key}" type="range" min="0" max="10" step="0.1" value="${scores[system.key]}" aria-label="${system.name}">
    `;
    inputs.appendChild(row);

    row.querySelector("input").addEventListener("input", (event) => {
      scores[system.key] = Number(event.target.value);
      document.getElementById(`score-${system.key}`).textContent = `${scores[system.key].toFixed(1)} / 10`;
      update();
    });
  });
}

function analyze() {
  const goal = goalSelect.value;
  const weights = goalWeights[goal];
  const rows = systems.map((system) => {
    const score = scores[system.key];
    const gap = 10 - score;
    const depKeys = dependencies[system.key] || [];
    const dependencyRisk = depKeys.reduce((sum, key) => sum + Math.max(0, 6 - scores[key]), 0) / Math.max(1, depKeys.length);
    const priority = gap * weights[system.key] + dependencyRisk * 0.55;
    return {
      ...system,
      score,
      gap,
      dependencyRisk,
      priority,
      depKeys
    };
  }).sort((a, b) => b.priority - a.priority);

  const selected = [];
  let spent = 0;
  const budget = Math.max(0, Number(budgetInput.value) || 0);

  rows.forEach((row) => {
    if (selected.length < 4 && spent + row.cost <= budget) {
      selected.push(row);
      spent += row.cost;
    }
  });

  if (!selected.length && rows.length) {
    selected.push(rows[0]);
    spent = rows[0].cost;
  }

  const risks = buildRisks(rows);
  return { rows, selected, spent, budget, risks };
}

function update() {
  const result = analyze();
  const first = result.rows[0];

  topUpgrade.textContent = first.name;
  topReason.textContent = `目前 ${first.score.toFixed(1)} / 10，優先度 ${first.priority.toFixed(1)}。`;

  budgetStatus.textContent = currency(result.spent);
  budgetDetail.textContent = result.spent <= result.budget
    ? `建議先做 ${result.selected.length} 項，剩餘 ${currency(result.budget - result.spent)}。`
    : `第一優先約 ${currency(result.spent)}，高於目前預算。`;

  riskStatus.textContent = result.risks.length ? `${result.risks.length} 項` : "低";
  riskDetail.textContent = result.risks[0] || "目前沒有明顯相依風險。";

  renderUpgradeList(result.selected, result.rows);
  renderNotes(result.rows, result.risks);
  drawGapChart(result.rows);
  drawBudgetChart(result.selected, result.budget, result.spent);
}

function renderUpgradeList(selected, rows) {
  upgradeList.innerHTML = "";
  selected.forEach((item) => {
    const li = document.createElement("li");
    const blockers = item.depKeys.filter((key) => scores[key] < 6).map((key) => systems.find((system) => system.key === key).name);
    li.innerHTML = `
      <strong>${item.name}: ${item.advice}</strong>
      <div class="upgrade-meta">估計 ${currency(item.cost)}，目前 ${item.score.toFixed(1)} / 10，缺口 ${item.gap.toFixed(1)}。</div>
      <div class="tag-row">
        <span class="tag">${priorityLabel(item.priority)}</span>
        ${blockers.map((name) => `<span class="tag warn">需搭配 ${name}</span>`).join("")}
      </div>
    `;
    upgradeList.appendChild(li);
  });

  if (selected.length < 3) {
    const next = rows.find((row) => !selected.includes(row));
    if (next) {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>下一階段: ${next.name}</strong>
        <div class="upgrade-meta">預算增加到 ${currency(selected.reduce((sum, item) => sum + item.cost, 0) + next.cost)} 時，建議納入。</div>
      `;
      upgradeList.appendChild(li);
    }
  }
}

function renderNotes(rows, risks) {
  const weakest = rows.slice(0, 3);
  notes.innerHTML = "";
  [
    {
      title: "先做可驗證的改善",
      body: `本輪重點是 ${weakest.map((item) => item.name).join("、")}。每改一項都應該記錄溫度、胎壓、煞車感與圈速或路感。`
    },
    {
      title: "動力不是孤立項目",
      body: scores.power >= 7 && (scores.brakes < 6 || scores.cooling < 6 || scores.tires < 6)
        ? "動力已高於底盤或散熱承受度，建議暫停追馬力，先補煞車、輪胎與散熱。"
        : "動力升級前，確認輪胎、煞車、散熱、傳動與 ECU 安全策略都跟得上。"
    },
    {
      title: "風險處理",
      body: risks.length ? risks.join("；") : "目前沒有明顯高風險組合，維持定期檢查與資料紀錄。"
    }
  ].forEach((note) => {
    const node = document.createElement("div");
    node.className = "note";
    node.innerHTML = `<strong>${note.title}</strong><p>${note.body}</p>`;
    notes.appendChild(node);
  });
}

function buildRisks(rows) {
  const risks = [];
  if (scores.power >= 7 && scores.brakes < 6) risks.push("動力高但煞車不足，熱衰退與制動距離風險上升");
  if (scores.power >= 7 && scores.cooling < 6) risks.push("動力高但散熱不足，連續高負載可能降功率或傷引擎");
  if (scores.power >= 7 && scores.drivetrain < 6) risks.push("扭力提高但傳動不足，離合器或變速箱承受度需確認");
  if (scores.suspension >= 7 && scores.tires < 6) risks.push("懸吊調硬但輪胎不足，抓地與循跡不會同步提升");
  if (scores.data < 4) risks.push("缺少監控資料，調校後難以及早發現溫度或空燃比異常");
  if (rows[0].priority > 8) risks.push(`${rows[0].name} 缺口很大，建議優先處理後再升級其他項目`);
  return risks;
}

function drawGapChart(rows) {
  const canvas = document.getElementById("gapChart");
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth || 760;
  const height = Math.max(320, width * 0.47);
  const left = Math.max(92, width * 0.17);
  const right = 52;
  const top = 20;
  const rowH = (height - top - 24) / rows.length;
  const graphW = width - left - right;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Segoe UI, Noto Sans TC, Arial";
  ctx.textBaseline = "middle";

  rows.forEach((item, index) => {
    const y = top + index * rowH;
    const gapW = graphW * (item.gap / 10);
    ctx.fillStyle = "#151b1f";
    ctx.fillText(item.name, 12, y + rowH / 2);
    ctx.fillStyle = "#edf1f3";
    roundRect(ctx, left, y + 6, graphW, rowH - 12, 5);
    ctx.fill();
    ctx.fillStyle = item.priority > 8 ? "#b91c1c" : item.priority > 5 ? "#b45309" : "#1f6f8b";
    roundRect(ctx, left, y + 6, gapW, rowH - 12, 5);
    ctx.fill();
    ctx.fillStyle = "#66727a";
    ctx.fillText(item.gap.toFixed(1), left + graphW + 10, y + rowH / 2);
  });
}

function drawBudgetChart(selected, budget, spent) {
  const canvas = document.getElementById("budgetChart");
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth || 760;
  const height = Math.max(320, width * 0.47);
  const centerX = width * 0.5;
  const centerY = height * 0.48;
  const radius = Math.min(width, height) * 0.28;
  const total = Math.max(spent, budget, 1);
  let start = -Math.PI / 2;
  const colors = ["#b42318", "#1f6f8b", "#b45309", "#475569", "#0f766e"];

  ctx.clearRect(0, 0, width, height);
  ctx.font = "13px Segoe UI, Noto Sans TC, Arial";

  selected.forEach((item, index) => {
    const angle = (item.cost / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    start += angle;
  });

  if (budget > spent) {
    const angle = ((budget - spent) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = "#e6ecef";
    ctx.fill();
  }

  ctx.fillStyle = "#151b1f";
  ctx.textAlign = "center";
  ctx.font = "700 18px Segoe UI, Noto Sans TC, Arial";
  ctx.fillText(currency(spent), centerX, centerY - 8);
  ctx.font = "12px Segoe UI, Noto Sans TC, Arial";
  ctx.fillStyle = "#66727a";
  ctx.fillText(`預算 ${currency(budget)}`, centerX, centerY + 16);
  ctx.textAlign = "left";

  selected.forEach((item, index) => {
    const y = height - 24 - (selected.length - index - 1) * 22;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(16, y - 10, 10, 10);
    ctx.fillStyle = "#151b1f";
    ctx.fillText(`${item.name} ${currency(item.cost)}`, 34, y - 5);
  });
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 760;
  const height = Math.max(320, width * 0.47);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function roundRect(ctx, x, y, width, height, radius) {
  if (width <= 0 || height <= 0) return;
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function priorityLabel(value) {
  if (value >= 8) return "必做";
  if (value >= 5) return "建議優先";
  return "可排後";
}

function currency(value) {
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function setScores(nextScores) {
  scores = { ...nextScores };
  systems.forEach((system) => {
    const input = document.getElementById(`input-${system.key}`);
    const label = document.getElementById(`score-${system.key}`);
    if (input) input.value = scores[system.key];
    if (label) label.textContent = `${scores[system.key].toFixed(1)} / 10`;
  });
  update();
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({
    scores,
    goal: goalSelect.value,
    budget: budgetInput.value
  }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return;
    scores = { ...defaultScores, ...saved.scores };
    goalSelect.value = saved.goal || "street";
    budgetInput.value = saved.budget || 80000;
  } catch {
    scores = { ...defaultScores };
  }
}

loadState();
buildInputs();
update();

goalSelect.addEventListener("change", update);
budgetInput.addEventListener("input", update);
document.getElementById("resetBtn").addEventListener("click", () => setScores(defaultScores));
document.getElementById("sampleBtn").addEventListener("click", () => setScores(sampleScores));
document.getElementById("saveBtn").addEventListener("click", () => {
  saveState();
  const button = document.getElementById("saveBtn");
  button.textContent = "已儲存";
  window.setTimeout(() => {
    button.textContent = "儲存設定";
  }, 1200);
});
window.addEventListener("resize", update);
