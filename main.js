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

// ============== 初始化 ==============
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

// ============== 核心函数 ==============
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

// 处理练习题数据
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

// 处理背单词数据
function handleVocabData(csvText) {
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });

  vocabData = results.data.map(row => ({
    word: row["单词"]?.trim() || "",
    definition: row["释义"]?.trim() || "",
    example: row["例句"]?.trim() || "",
    group: parseInt(row["组别"]) || 1
  }));

  updateGroupSelector();
  updateQuestionSet();
  showQuestion();
}

// ============== 功能函数 ==============
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";
  
  // 获取当前模式下的所有组别
  let groups = currentMode === 'practice' 
    ? [...new Set(rawQuestions.map(q => q.group))]
    : [...new Set(vocabData.map(word => word.group))];
  
  // 生成选项
  groups.sort((a, b) => a - b).forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = `Group ${group}`;
    groupSelector.appendChild(option);
  });

  // 设置默认选中组
  selectedGroup = groups[0] || 1;
  groupSelector.value = selectedGroup;
}

function updateQuestionSet() {
  if (currentMode === 'practice') {
    // 练习模式：过滤当前组 + 随机排序
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
    // 背单词模式：过滤当前组 + 生成选项
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

// 生成背单词选项（正确释义 + 3个同组干扰项）
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

// ============== 界面相关 ==============
function showQuestion() {
  const container = document.getElementById("question-container");
  container.innerHTML = "";

  // 全部完成提示
  if (currentQuestionIndex >= questions.length) {
    const msg = currentMode === 'practice' 
      ? "🎉 练习完成！本组题目已全部完成！"
      : "🎉 恭喜！本组单词已全部复习！";
    container.innerHTML = `<h2 style="color: #4CAF50;">${msg}</h2>`;
    return;
  }

  const current = questions[currentQuestionIndex];
  
  // 显示问题
  const questionElem = document.createElement("h2");
  questionElem.className = "question-text";
  questionElem.textContent = currentMode === 'practice' 
    ? current.question 
    : `单词：${current.word}`;
  container.appendChild(questionElem);

  // 生成选项按钮
  const labels = ["A", "B", "C", "D"];
  current.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${labels[index]}. ${option}`;
    btn.onclick = () => checkAnswer(option, current.answer, current.ttsText);
    container.appendChild(btn);
  });
}

function checkAnswer(selected, correct, ttsText) {
  if (selected === correct) {
    alert("✅ 正确！正确答案是：" + correct);
  } else {
    alert(`❌ 错误！正确答案是：${correct}`);
  }
  speak(ttsText);
}

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
