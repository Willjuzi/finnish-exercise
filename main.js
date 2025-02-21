// ============== 全局变量 ==============
let currentMode = 'practice';
let rawQuestions = [];
let vocabData = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;
let verbOptionsDict = {};

// API 配置
const API_CONFIG = {
  practice: "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv",
  vocab: "https://docs.google.com/spreadsheets/d/1VD4SYUVH5An14uS8cxzGlREbRx2eL6SeWUMBpNWp9ZQ/export?format=csv"
};

// ============== 初始化事件监听 ==============
document.getElementById('mode-selector').addEventListener('change', function(e) {
  currentMode = e.target.value;
  initializeData();
});

document.getElementById('group-selector').addEventListener('change', function(e) {
  selectedGroup = parseInt(e.target.value);
  updateQuestionSet();
  showQuestion();
});

document.getElementById('next-btn').addEventListener('click', () => {
  currentQuestionIndex++;
  showQuestion();
});

// ============== 数据初始化 ==============
function initializeData() {
  const apiUrl = API_CONFIG[currentMode];
  
  fetch(apiUrl)
    .then(response => response.text())
    .then(csvText => {
      if (currentMode === 'practice') {
        handlePracticeData(csvText);
      } else {
        handleVocabData(csvText);
      }
    })
    .catch(error => console.error("数据加载失败:", error));
}

// ============== 练习模式处理 ==============
function handlePracticeData(csvText) {
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
    group: parseFloat(row["Group"])
  }));

  rawQuestions.forEach(row => {
    if (row.correct) {
      let verb = getVerb(row.question);
      if (verb) verbOptionsDict[verb] = [row.correct, ...row.distractors];
    }
  });

  updateGroupSelector();
  updateQuestionSet();
  showQuestion();
}

// ============== 背单词模式处理 ==============
function handleVocabData(csvText) {
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transform: (value, header) => {
      if (header === "组别") {
        const num = Math.abs(parseInt(value) || 1);
        return num > 0 ? num : 1;
      }
      return value?.trim() || "";
    }
  });

  vocabData = results.data
    .filter(row => row["单词"])
    .map(row => ({
      word: row["单词"],
      definition: row["释义"],
      example: row["例句"],
      group: row["组别"]
    }));

  console.log("背单词数据（调试用）:", vocabData);
  updateGroupSelector();
  updateQuestionSet();
  showQuestion();
}

// ============== 分组选择器修复 ==============
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";

  // 获取有效分组
  let groups = [];
  if (currentMode === 'practice') {
    groups = [...new Set(rawQuestions.map(q => q.group))].sort((a, b) => a - b);
  } else {
    groups = [...new Set(vocabData.map(word => word.group))]
      .filter(g => Number.isInteger(g) && g > 0)
      .sort((a, b) => a - b);
  }

  // 生成唯一选项（修复重复问题）
  const uniqueGroups = [...new Set(groups)];
  uniqueGroups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = `Group ${group}`;
    groupSelector.appendChild(option);
  });

  // 设置默认选中组
  selectedGroup = uniqueGroups.length > 0 ? uniqueGroups[0] : 1;
  groupSelector.value = selectedGroup;
}

// ============== 其他核心函数保持不变 ==============
// （包括 updateQuestionSet、generateVocabOptions、showQuestion、checkAnswer 等）
// ... [保持原有代码不变] ...

// ============== 工具函数 ==============
function getVerb(text) {
  const prefix = "Minkä tyyppinen verbi on ";
  if (text.startsWith(prefix)) {
    let verb = text.slice(prefix.length).split("(")[0].trim();
    return verb.replace(/[?.,!]/g, "");
  }
  const match = text.match(/\(([^)]+)/);
  return match ? match[1].trim() : "";
}

function shuffleArray(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

function generateOptions(correct, distractors) {
  return shuffleArray([correct, ...distractors.filter(d => d)]);
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fi-FI";
  speechSynthesis.speak(utterance);
}

// ============== 首次初始化 ==============
initializeData();
