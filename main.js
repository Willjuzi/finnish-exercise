// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

// 提前定义所有函数避免引用错误
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  const groups = [...new Set(rawQuestions.map(q => q.group))].sort((a, b) => a - b);
  
  groupSelector.innerHTML = groups.map(g => 
    `<option value="${g}">Group ${g}</option>`
  ).join('');

  groupSelector.addEventListener("change", (e) => {
    selectedGroup = Number(e.target.value);
    updateQuestionSet();
    showQuestion();
  });

  if (groups.length > 0) {
    selectedGroup = groups[0];
    updateQuestionSet();
  }
}

function updateQuestionSet() {
  questions = rawQuestions
    .filter(q => q.group === selectedGroup)
    .map(q => ({
      ...q,
      options: generateOptions(q.correct, q.distractors)
    }));
  
  questions = shuffleArray(questions);
  currentQuestionIndex = 0;
}

function generateOptions(correct, distractors) {
  // 强化数据清洗
  const validDistractors = [...new Set(distractors)]
    .filter(d => d && d.trim() !== "" && d !== correct);
  
  // 自动补足选项
  let options = [correct, ...validDistractors];
  while (options.length < 4) {
    options.push(`选项${options.length + 1}`); // 中文占位符
  }
  
  return shuffleArray(options).slice(0, 4);
}

function showQuestion() {
  const container = document.getElementById("question-container");
  container.innerHTML = "";
  
  if (currentQuestionIndex >= questions.length) {
    container.innerHTML = `<div class="complete">已完成本组所有题目！</div>`;
    return;
  }
  
  const current = questions[currentQuestionIndex];
  const labels = ["A", "B", "C", "D"];
  
  container.innerHTML = `
    <h2>${current.question}</h2>
    <div class="options">
      ${current.options.map((opt, i) => `
        <button class="option-btn" onclick="checkAnswer('${opt.replace(/'/g, "\\'")}', '${current.correct.replace(/'/g, "\\'")}')">
          ${labels[i]}. ${opt}
        </button>
      `).join("")}
    </div>
  `;
}

function checkAnswer(selected, correct) {
  const isCorrect = selected.trim() === correct.trim();
  alert(isCorrect ? "正确！" : `错误，正确答案是：${correct}`);
  if (isCorrect) currentQuestionIndex++;
  showQuestion();
}

function shuffleArray(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

// 初始化加载
fetch(sheetURL)
  .then(res => res.text())
  .then(csv => {
    const results = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true
    });

    rawQuestions = results.data.map(row => {
      // 强化数据清洗
      const distractors = [
        row["Distractor 1"]?.trim() || "",
        row["Distractor 2"]?.trim() || "",
        row["Distractor 3"]?.trim() || ""
      ].filter(d => d !== "");
      
      return {
        question: row.Question?.trim() || "题目加载失败",
        correct: row["Correct Answer"]?.trim() || "答案缺失",
        distractors: distractors,
        group: Number(row.Group) || 1
      };
    });

    updateGroupSelector();
    showQuestion();
  })
  .catch(err => console.error("加载失败:", err));
