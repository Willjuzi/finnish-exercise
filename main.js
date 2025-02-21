// ============== 全局变量 ==============
let currentMode = 'practice';
let rawQuestions = [];
let vocabData = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;
let verbOptionsDict = {};

// API 配置（已验证可访问性）
const API_CONFIG = {
  practice: "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/export?format=csv",
  vocab: "https://docs.google.com/spreadsheets/d/1VD4SYUVH5An14uS8cxzGlREbRx2eL6SeWUMBpNWp9ZQ/export?format=csv"
};

// ============== 初始化事件监听 ==============
function initializeEventListeners() {
  document.getElementById('mode-selector').addEventListener('change', function(e) {
    currentMode = e.target.value;
    initializeData();
  });

  document.getElementById('group-selector').addEventListener('change', function(e) {
    selectedGroup = currentMode === 'practice' ? 
      parseFloat(e.target.value) : 
      parseInt(e.target.value);
    updateQuestionSet();
    showQuestion();
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    currentQuestionIndex++;
    showQuestion();
  });
}

// ============== 数据初始化 ==============
function initializeData() {
  const apiUrl = API_CONFIG[currentMode];
  
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
      return response.text();
    })
    .then(csvText => {
      if (currentMode === 'practice') {
        handlePracticeData(csvText);
      } else {
        handleVocabData(csvText);
      }
    })
    .catch(error => {
      console.error("数据加载失败:", error);
      showError("⚠️ 数据加载失败，请检查：<br>1. 表格是否已公开共享<br>2. 网络连接是否正常");
    });
}

// ============== 错误处理 ==============
function showError(message) {
  const container = document.getElementById("question-container");
  container.innerHTML = `<h2 style="color: #dc3545;">${message}</h2>`;
  document.getElementById("group-selector").innerHTML = "";
}

// ============== 练习模式处理 ==============
function handlePracticeData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    rawQuestions = results.data.map(row => ({
      question: row["Question"]?.trim() || "",
      correct: row["Correct Answer"]?.trim() || "",
      distractors: [
        row["Distractor 1"]?.trim() || "",
        row["Distractor 2"]?.trim() || "",
        row["Distractor 3"]?.trim() || ""
      ],
      group: parseFloat(row["Group"]) || 1
    }));

    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("练习数据处理失败:", error);
    showError("练习数据格式错误");
  }
}

// ============== 词汇模式处理 ==============
function handleVocabData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    vocabData = results.data.map(row => ({
      word: row["Word"]?.trim() || "",
      definition: row["Definition"]?.trim() || "",
      group: parseInt(row["Group"]) || 1
    }));

    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("词汇数据处理失败:", error);
    showError("词汇数据格式错误");
  }
}

// ============== 更新组选择器 ==============
function updateGroupSelector() {
  const selector = document.getElementById("group-selector");
  const data = currentMode === 'practice' ? rawQuestions : vocabData;
  const groups = [...new Set(data.map(item => item.group))].sort((a, b) => a - b);
  selector.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
}

// ============== 生成选项 ==============
function generateOptions(correct, distractors) {
  let options = [correct, ...distractors.filter(d => d !== "")];
  return shuffleArray(options);
}

function generateVocabOptions(word) {
  let options = [word.definition];
  let otherWords = vocabData.filter(w => w.word !== word.word);
  let distractors = [];
  while (distractors.length < 3 && otherWords.length > 0) {
    let randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
    if (!distractors.includes(randomWord.definition)) {
      distractors.push(randomWord.definition);
    }
    otherWords = otherWords.filter(w => w.definition !== randomWord.definition);
  }
  options = options.concat(distractors);
  return shuffleArray(options);
}

// ============== 关键函数定义 ==============
function updateQuestionSet() {
  if (currentMode === 'practice') {
    let filtered = rawQuestions
      .filter(q => q.group === selectedGroup)
      .map(q => ({
        question: q.question,
        options: generateOptions(q.correct, q.distractors),
        answer: q.correct,
        ttsText: getVerb(q.question)
      }));
    questions = shuffleArray(filtered);
  } else {
    let filtered = vocabData
      .filter(word => word.group === selectedGroup)
      .map(word => ({
        type: 'vocab',
        word: word.word,
        options: generateVocabOptions(word),
        answer: word.definition,
        ttsText: word.word
      }));
    questions = shuffleArray(filtered);
  }
  currentQuestionIndex = 0;
}

// ============== 显示问题 ==============
function showQuestion() {
  const container = document.getElementById("question-container");
  if (currentQuestionIndex >= questions.length) {
    container.innerHTML = "<h2>已完成所有问题！</h2>";
    return;
  }

  const question = questions[currentQuestionIndex];
  if (currentMode === 'practice') {
    container.innerHTML = `<h2>${question.question}</h2>`;
    let optionsHtml = question.options
      .map((opt, i) => `<button class="btn btn-primary" onclick="checkAnswer(${i})">${opt}</button>`)
      .join('');
    container.innerHTML += `<div class="options">${optionsHtml}</div>`;
  } else {
    container.innerHTML = `<h2>${question.word}</h2>`;
    let optionsHtml = question.options
      .map((opt, i) => `<button class="btn btn-primary" onclick="checkAnswer(${i})">${opt}</button>`)
      .join('');
    container.innerHTML += `<div class="options">${optionsHtml}</div>`;
  }
}

// ============== 检查答案 ==============
function checkAnswer(selectedIndex) {
  const question = questions[currentQuestionIndex];
  const selectedOption = question.options[selectedIndex];
  if (selectedOption === question.answer) {
    alert("正确！");
  } else {
    alert(`错误！正确答案是：${question.answer}`);
  }
}

// ============== 辅助函数 ==============
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getVerb(question) {
  return question.split(" ")[0]; // 简单假设第一个词是动词
}

// ============== 初始化执行 ==============
initializeEventListeners();
initializeData();
