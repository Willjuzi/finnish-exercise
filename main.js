// ============== 全局变量 ==============
let currentMode = 'practice';
let rawQuestions = [];
let vocabData = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;
let verbOptionsDict = {};

// API 配置（请确保表格已公开）
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
    selectedGroup = parseFloat(e.target.value);
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

// ============== 背单词模式处理（关键修复） ==============
function handleVocabData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value, header) => {
        if (header === "组别") {
          // 不再限制组别范围，动态显示所有存在的正整数组
          const num = parseInt(value) || 1;
          return Math.abs(num); // 处理负数组别
        }
        return value?.trim() || "";
      }
    });

    vocabData = results.data
      .filter(row => row["单词"]?.trim()) // 过滤空行
      .map(row => ({
        word: row["单词"]?.trim(),
        definition: row["释义"]?.trim(),
        example: row["例句"]?.trim(),
        group: row["组别"]
      }));

    console.log("背单词原始数据（调试）：", vocabData);
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("背单词数据处理失败:", error);
    showError("单词数据格式错误");
  }
}

// ============== 分组选择器修复 ==============
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";

  // 获取有效分组
  let groups = [];
  if (currentMode === 'practice') {
    groups = [...new Set(rawQuestions.map(q => q.group))]
      .filter(g => !isNaN(g))
      .sort((a, b) => a - b);
  } else {
    // 动态获取所有存在的正整数组别
    groups = [...new Set(vocabData.map(word => word.group))]
      .filter(g => Number.isInteger(g) && g > 0)
      .sort((a, b) => a - b);
  }

  // 生成选项（至少保证一个默认选项）
  if (groups.length === 0) groups.push(1);

  groups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = `Group ${group}`;
    groupSelector.appendChild(option);
  });

  // 设置默认选中组
  selectedGroup = groups.includes(1) ? 1 : groups[0];
  groupSelector.value = selectedGroup;
}

// ============== 题目集合更新（关键修复） ==============
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
    // 严格过滤当前组别单词
    let filtered = vocabData
      .filter(word => word.group === selectedGroup && word.word) // 确保单词字段不为空
      .map(word => ({
        type: 'vocab',
        word: word.word,
        options: generateVocabOptions(word),
        answer: word.definition,
        ttsText: word.word
      }));
    questions = shuffleArray(filtered);
    
    // 调试输出
    console.log(`当前组别：Group ${selectedGroup}，单词数量：${filtered.length}`);
  }
  currentQuestionIndex = 0;
}

// ============== 其他核心函数保持不变 ==============
// ... [包括 generateVocabOptions, showQuestion, checkAnswer 等] ...

// ============== 初始化执行 ==============
initializeEventListeners();
initializeData();
