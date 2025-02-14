// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// 使用你的 Google Sheets CSV 地址
const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

// 初始化
fetch(sheetURL)
  .then(response => response.text())
  .then(csvText => {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    rawQuestions = results.data.map(row => {
      // 数据清洗和验证
      const question = (row.Question || "").trim();
      const correct = (row["Correct Answer"] || "").trim();
      const distractors = [
        (row["Distractor 1"] || "").trim(),
        (row["Distractor 2"] || "").trim(),
        (row["Distractor 3"] || "").trim()
      ];
      const group = parseInt(row.Group || "1", 10);

      // 数据验证
      if (distractors.some(d => d === "")) {
        console.warn(`空干扰项：${question}`);
      }
      if (new Set([correct, ...distractors]).size < 4) {
        console.warn(`选项重复：${question}`);
      }

      return {
        question: question,
        correct: correct,
        distractors: distractors,
        group: group
      };
    });

    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  })
  .catch(error => console.error('加载数据失败:', error));

// 更新组别选择器
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  const uniqueGroups = [...new Set(rawQuestions.map(q => q.group))].sort((a, b) => a - b);
  
  groupSelector.innerHTML = uniqueGroups.map(groupNum => 
    `<option value="${groupNum}">Group ${groupNum}</option>`
  ).join('');

  groupSelector.addEventListener("change", (event) => {
    selectedGroup = parseInt(event.target.value, 10);
    updateQuestionSet();
    showQuestion();
  });

  if (uniqueGroups.length > 0) {
    selectedGroup = uniqueGroups[0];
    updateQuestionSet();
  }
}

// 生成题目集
function updateQuestionSet() {
  const filteredQuestions = rawQuestions
    .filter(q => q.group === selectedGroup)
    .map(q => ({
      ...q,
      options: generateOptions(q.correct, q.distractors)
    }));

  questions = shuffleArray(filteredQuestions);
  currentQuestionIndex = 0;
}

// 生成选项（带数据校验）
function generateOptions(correct, distractors) {
  const validDistractors = [...new Set(distractors  // 去重
    .map(d => d.trim())                            // 去除空格
    .filter(d => d !== "")                         // 过滤空值
    .filter(d => d !== correct))];                // 排除与正确答案重复

  // 合并选项并补足数量
  let options = [correct, ...validDistractors];
  while (options.length < 4) {
    options.push(correct); // 用正确答案补足选项
  }

  return shuffleArray(options).slice(0, 4);
}

// 显示题目
function showQuestion() {
  const container = document.getElementById('question-container');
  container.innerHTML = "";

  if (currentQuestionIndex >= questions.length) {
    container.innerHTML = `<div class="completed-message">🎉 本组练习已完成！</div>`;
    return;
  }

  const current = questions[currentQuestionIndex];
  const labels = ['A', 'B', 'C', 'D'];

  // 题目显示
  container.innerHTML = `
    <h2 class="question-text">${current.question}</h2>
    <div class="options-container">
      ${current.options.map((option, index) => `
        <button class="option-btn" 
                data-value="${option}" 
                onclick="checkAnswer('${option}', '${current.correct}', '${current.correct}')">
          ${labels[index]}. ${option}
        </button>
      `).join('')}
    </div>
  `;
}

// 检查答案
function checkAnswer(selected, correct, ttsText) {
  const correctAnswer = correct.trim();
  const selectedAnswer = selected.trim();

  const resultMessage = selectedAnswer === correctAnswer 
    ? `🎉 正确！正确答案是：${correctAnswer}` 
    : `❌ 错误。正确答案是：${correctAnswer}`;

  // 显示浮动提示
  const floatingMessage = document.createElement('div');
  floatingMessage.className = `floating-message ${selectedAnswer === correctAnswer ? 'correct' : 'wrong'}`;
  floatingMessage.textContent = resultMessage;
  document.body.appendChild(floatingMessage);

  // 自动消失效果
  setTimeout(() => {
    floatingMessage.remove();
  }, 2000);

  speak(ttsText);
}

// 语音功能
function speak(text) {
  if (!text) return;

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fi-FI';
    const finnishVoice = speechSynthesis.getVoices().find(v => v.lang === 'fi-FI');
    if (finnishVoice) utterance.voice = finnishVoice;
    speechSynthesis.speak(utterance);
  } else {
    const audio = new Audio(
      `https://translate.google.com/translate_tts?ie=UTF-8&tl=fi&client=tw-ob&q=${encodeURIComponent(text)}`
    );
    audio.play().catch(error => console.error('语音播放失败:', error));
  }
}

// 工具函数
function shuffleArray(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

// 下一题按钮
document.getElementById('next-btn').addEventListener('click', () => {
  currentQuestionIndex = Math.min(currentQuestionIndex + 1, questions.length);
  showQuestion();
});

// 重置按钮
document.getElementById('reset-btn').addEventListener('click', () => {
  currentQuestionIndex = 0;
  questions = shuffleArray(questions);
  showQuestion();
});
