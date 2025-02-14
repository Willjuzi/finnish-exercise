// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

// 初始化加载
fetch(sheetURL)
  .then(response => response.text())
  .then(csvText => {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    // 强化数据清洗
    rawQuestions = results.data.map(row => {
      const question = (row.Question || "").trim();
      const correct = (row["Correct Answer"] || "").trim();
      
      // 处理干扰项
      const distractors = [
        row["Distractor 1"],
        row["Distractor 2"],
        row["Distractor 3"]
      ].map(d => (d || "").trim())  // 确保每个干扰项都经过trim处理
       .filter(d => d !== "");      // 过滤空值

      // 数据验证
      if (distractors.length < 3) {
        console.error(`干扰项不足: ${question}`, distractors);
      }

      return {
        question: question,
        correct: correct,
        distractors: distractors,
        group: parseInt(row.Group || "1", 10)
      };
    });

    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  })
  .catch(error => console.error('数据加载失败:', error));

// 选项生成逻辑（关键修复）
function generateOptions(correct, distractors) {
  // 确保至少有3个有效干扰项
  const validDistractors = [...new Set(distractors)] // 去重
    .filter(d => d !== correct); // 排除与正确答案相同的选项

  // 合并选项并保证数量
  let options = [correct, ...validDistractors];
  
  // 如果选项不足4个，用占位符补充
  while (options.length < 4) {
    options.push(`[缺失选项${options.length + 1}]`);
  }

  // 随机选择前4个选项（避免重复）
  return shuffleArray(options).slice(0, 4);
}

// 强化答案检查
function checkAnswer(selected, correct) {
  const normalizedSelected = selected.replace(/\[.*?\]/g, "").trim(); // 移除占位符
  const normalizedCorrect = correct.trim();

  const isCorrect = normalizedSelected === normalizedCorrect;
  
  alert(isCorrect ? "✅ 正确！" : `❌ 错误。正确答案是：${normalizedCorrect}`);
  speak(normalizedCorrect);
  
  return isCorrect;
}

// 显示题目（修复渲染问题）
function showQuestion() {
  const container = document.getElementById('question-container');
  container.innerHTML = "";

  if (currentQuestionIndex >= questions.length) {
    container.innerHTML = `<div class="completed">练习完成！</div>`;
    return;
  }

  const current = questions[currentQuestionIndex];
  const labels = ['A', 'B', 'C', 'D'];

  // 渲染题目
  const questionHTML = `
    <h2>${current.question}</h2>
    <div class="options">
      ${current.options.map((option, index) => `
        <button class="option" 
                onclick="checkAnswer('${option.replace(/'/g, "\\'")}', '${current.correct.replace(/'/g, "\\'")}')">
          ${labels[index]}. ${option || '[选项加载失败]'}
        </button>
      `).join('')}
    </div>
  `;

  container.innerHTML = questionHTML;
}

// 其他辅助函数保持不变...
