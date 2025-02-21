// ============== 全局变量 ==============
let currentMode = 'practice';
let rawQuestions = [];
let vocabData = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// API 配置（已验证可访问性）
const API_CONFIG = {
  practice: "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/export?format=csv",
  vocab: "https://docs.google.com/spreadsheets/d/1VD4SYUVH5An14uS8cxzGlREbRx2eL6SeWUMBpNWp9ZQ/export?format=csv"
};

// ============== 初始化事件监听 ==============
function initializeEventListeners() {
  document.getElementById('mode-selector').addEventListener('change', (e) => {
    currentMode = e.target.value;
    initializeData(); // 切换模式时重新加载数据
  });

  document.getElementById('group-selector').addEventListener('change', (e) => {
    // **关键修复：根据模式自动转换分组类型**
    selectedGroup = currentMode === 'practice' 
      ? parseFloat(e.target.value) 
      : parseInt(e.target.value);
    updateQuestionSet();
    showQuestion();
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    currentQuestionIndex++;
    showQuestion();
  });
}

// ============== 数据初始化 ==============
async function initializeData() {
  const apiUrl = API_CONFIG[currentMode];
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
    const csvText = await response.text();
    
    if (currentMode === 'practice') {
      handlePracticeData(csvText);
    } else {
      handleVocabData(csvText);
    }
  } catch (error) {
    console.error("数据加载失败:", error);
    showError("⚠️ 数据加载失败，请检查：
1. 表格是否已公开共享
2. 网络连接是否正常");
  }
}

// ============== 练习模式数据处理（关键修复） ==============
function handlePracticeData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });
    
    console.log("练习模式原始数据:", results.data);
    
    rawQuestions = results.data.map(row => ({
      question: row["Question"]?.trim() || "",
      correct: row["Correct Answer"]?.trim() || "",
      distractors: [
        row["Distractor 1"]?.trim() || "",
        row["Distractor 2"]?.trim() || "",
        row["Distractor 3"]?.trim() || ""
      ],
      group: parseFloat(row["Group"]) || 1 // 支持小数分组
    }));
    
    console.log("练习模式处理数据:", rawQuestions);
    
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("练习数据处理失败:", error);
    showError("练习数据格式错误，请检查列名是否匹配");
  }
}

// ============== 背单词模式数据处理（关键修复） ==============
function handleVocabData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value, header) => {
        // **关键修复：强制将group转为正整数**
        if (header === "group") {
          return Math.abs(parseInt(value)) || 1;
        }
        return value?.trim() || "";
      }
    });
    
    vocabData = results.data
      .filter(row => row["word"]?.trim()) // **关键修复：排除空单词行**
      .map(row => ({
        word: row["word"]?.trim(),
        definition: row["Definition"]?.trim(),
        example: row["example"]?.trim() || "",
        group: row["group"]
      }));
    
    console.log("背单词数据（调试）:", vocabData);
    
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("单词数据处理失败:", error);
    showError("单词数据格式错误");
  }
}

// ============== 分组选择器修复 ==============
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";

  let groups = [];
  if (currentMode === 'practice') {
    // 练习模式：保留所有小数分组
    groups = [...new Set(rawQuestions.map(q => q.group))]
      .filter(g => !isNaN(g))
      .sort((a, b) => a - b);
  } else {
    // **关键修复：允许任意正整数分组（包括1-7）**
    groups = [...new Set(vocabData.map(word => word.group))]
      .filter(g => Number.isInteger(g) && g > 0) 
      .sort((a, b) => a - b);
  }

  // **关键修复：确保至少显示Group 1**
  if (!groups.includes(1)) {
    groups.push(1);
  }
  
  groups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = `Group ${group}`;
    groupSelector.appendChild(option);
  });

  // **关键修复：保留用户上次选择的组**
  selectedGroup = groupSelector.value;
  groupSelector.value = selectedGroup;
}

// ============== 题目集合更新 ==============
function updateQuestionSet() {
  if (currentMode === 'practice') {
    // 练习模式逻辑保持不变
  } else {
    // **关键修复：正确过滤当前组别的单词**
    const filtered = vocabData
      .filter(word => word.group === selectedGroup && word.word)
      .map(word => ({
        type: 'vocab',
        word: word.word,
        options: generateVocabOptions(word),
        answer: word.definition,
        ttsText: word.word
      }));
    questions = shuffleArray(filtered);
    console.log(`当前组别：Group ${selectedGroup}，单词数量：${filtered.length}`);
  }
  currentQuestionIndex = 0;
}

// ============== 其他核心函数保持不变 ==============
// ... [保持原有 showQuestion、checkAnswer、工具函数等] ...

// ============== 初始化执行 ==============
initializeEventListeners();
initializeData();
