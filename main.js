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
      parseFloat(e.target.value) :  // 练习模式保留小数
      parseInt(e.target.value);
    updateQuestionSet();
    showQuestion();
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    currentQuestionIndex++;
    showQuestion();
  });
}

// ============== 练习模式数据处理（关键修复） ==============
function handlePracticeData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    // 调试输出原始数据
    console.log("练习模式原始数据:", results.data);

    rawQuestions = results.data.map(row => ({
      // 列名必须与Google Sheet完全匹配（区分大小写）
      question: row["Question"]?.trim() || "",
      correct: row["Correct Answer"]?.trim() || "",
      distractors: [
        row["Distractor 1"]?.trim() || "",
        row["Distractor 2"]?.trim() || "",
        row["Distractor 3"]?.trim() || ""
      ],
      group: parseFloat(row["Group"]) || 1  // 保留小数分组
    }));

    // 调试输出处理后的数据
    console.log("练习模式处理数据:", rawQuestions);
    
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("练习数据处理失败:", error);
    showError("练习数据格式错误，请检查列名是否匹配");
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
    // 背单词模式：只显示整数分组
    groups = [...new Set(vocabData.map(word => word.group))]
      .filter(g => Number.isInteger(g) && g > 0)
      .sort((a, b) => a - b);
  }

  // 生成选项
  groups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = `Group ${group}`;
    groupSelector.appendChild(option);
  });

  // 设置默认选中组（优先匹配当前URL参数）
  selectedGroup = groups.includes(1) ? 1 : groups[0] || 1;
  groupSelector.value = selectedGroup;
}

// ============== 其他核心函数保持不变 ==============
// ... [保持原有 initializeData、showQuestion、checkAnswer 等函数] ...

// ============== 初始化执行 ==============
initializeEventListeners();
initializeData();
