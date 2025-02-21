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
  practice: "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv",
  vocab: "https://docs.google.com/spreadsheets/d/1VD4SYUVH5An14uS8cxzGlREbRx2eL6SeWUMBpNWp9ZQ/export?format=csv"
};

// ============== 初始化事件监听 ==============
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

// ============== 数据初始化 ==============
function initializeData() {
  const apiUrl = API_CONFIG[currentMode];
  
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
      showError("⚠️ 数据加载失败，请检查表格权限或网络连接");
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

    rawQuestions.forEach(row => {
      if (row.correct) {
        let verb = getVerb(row.question);
        if (verb) verbOptionsDict[verb] = [row.correct, ...row.distractors];
      }
    });

    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("练习数据处理失败:", error);
    showError("练习数据格式错误");
  }
}

// ============== 背单词模式处理 ==============
function handleVocabData(csvText) {
  try {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value, header) => {
        if (header === "组别") {
          // 强制转换为1-7的整数
          const num = Math.min(7, Math.max(1, parseInt(value) || 1));
          return num;
        }
        return value?.trim() || "";
      }
    });

    vocabData = results.data
      .filter(row => row["单词"]?.trim()) 
      .map(row => ({
        word: row["单词"]?.trim(),
        definition: row["释义"]?.trim(),
        example: row["例句"]?.trim(),
        group: row["组别"]
      }));

    console.log("背单词数据（调试）:", vocabData);
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("背单词数据处理失败:", error);
    showError("单词数据格式错误");
  }
}

// ============== 分组选择器关键修复 ==============
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";

  // 获取有效分组
  let groups = [];
  if (currentMode === 'practice') {
    // 练习模式：允许小数分组（如5.1）
    groups = [...new Set(rawQuestions.map(q => q.group))]
      .filter(g => !isNaN(g))
      .sort((a, b) => a - b);
  } else {
    // 背单词模式：只显示1-7整数分组
    groups = Array.from({ length: 7 }, (_, i) => i + 1)
      .filter(g => vocabData.some(word => word.group === g));
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

// ============== 题目逻辑 ==============
function updateQuestionSet() {
  if (currentMode === 'practice') {
    // 练习模式：支持小数分组
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
    // 背单词模式：仅限整数分组
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

  if (currentQuestionIndex >= questions.length) {
    const msg = currentMode === 'practice' 
      ? "🎉 本组练习已完成！" 
      : "🎉 本组单词已复习完成！";
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

  // 生成选项
  const labels = ["A", "B", "C", "D"];
  current.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${labels[index]}. ${option}`;
    btn.onclick = () => checkAnswer(option, current.answer, current.ttsText);
    container.appendChild(btn);
  });
}

// ============== 工具函数 ==============
function checkAnswer(selected, correct, ttsText) {
  if (selected === correct) {
    alert("✅ 正确！");
  } else {
    alert(`❌ 正确答案是：${correct}`);
  }
  speak(ttsText);
}

function getVerb(text) {
  const prefix = "Minkä tyyppinen verbi on ";
  return text.startsWith(prefix) ? 
    text.slice(prefix.length).split("(")[0].trim().replace(/[?.,!]/g, "") : 
    (text.match(/\(([^)]+)/)?.[1]?.trim() || "");
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
