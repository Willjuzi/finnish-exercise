// ============== 全局变量 ==============
let currentMode = 'practice'; // 当前模式（practice/vocab）
let rawQuestions = [];        // 原始练习题库
let vocabData = [];           // 原始单词数据
let questions = [];           // 当前题目集合
let currentQuestionIndex = 0; // 当前题目索引
let selectedGroup = 1;        // 当前选中组数
let verbOptionsDict = {};     // 动词选项字典

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
  selectedGroup = parseFloat(e.target.value);
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

  // 建立动词选项字典
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
      // 特殊处理组别字段
      if (header === "组别") {
        const num = Math.abs(parseInt(value) || 1); // 负数组别自动转正
        return num > 0 ? num : 1; // 确保最小为1
      }
      return value?.trim() || "";
    }
  });

  vocabData = results.data
    .filter(row => row["单词"]) // 过滤空行
    .map(row => ({
      word: row["单词"],
      definition: row["释义"],
      example: row["例句"],
      group: row["组别"]
    }));

  console.log("背单词数据加载结果：", vocabData);
  updateGroupSelector();
  updateQuestionSet();
  showQuestion();
}

// ============== 分组选择器逻辑 ==============
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";

  // 获取当前模式的有效分组
  let groups = [];
  if (currentMode === 'practice') {
    groups = [...new Set(rawQuestions.map(q => q.group))].sort((a, b) => a - b);
  } else {
    // 动态获取所有存在的正整数组别（支持第八组及以上）
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

  // 设置默认选中组
  selectedGroup = groups.length > 0 ? groups[0] : 1;
  groupSelector.value = selectedGroup;
}

// ============== 题目集合更新 ==============
function updateQuestionSet() {
  if (currentMode === 'practice') {
    // 练习模式逻辑
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
    // 背单词模式逻辑
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

// ============== 背单词选项生成 ==============
function generateVocabOptions(correctWord) {
  const sameGroupWords = vocabData.filter(word => 
    word.group === selectedGroup && 
    word.word !== correctWord.word
  );
  
  const distractors = shuffleArray(sameGroupWords)
    .slice(0, 3)
    .map(word => word.definition);

  return shuffleArray([correctWord.definition, ...distractors]);
}

// ============== 界面渲染 ==============
function showQuestion() {
  const container = document.getElementById("question-container");
  container.innerHTML = "";

  // 完成提示
  if (currentQuestionIndex >= questions.length) {
    const msg = currentMode === 'practice' 
      ? "🎉 练习完成！本组题目已全部完成！"
      : "🎉 恭喜！本组单词已全部复习！";
    container.innerHTML = `<h2 style="color: #4CAF50;">${msg}</h2>`;
    return;
  }

  const current = questions[currentQuestionIndex];
  
  // 显示题目
  const questionElem = document.createElement("h2");
  questionElem.className = "question-text";
  questionElem.textContent = currentMode === 'practice' 
    ? current.question 
    : `单词：${current.word}`;
  container.appendChild(questionElem);

  // 生成选项按钮
  const labels = ["
