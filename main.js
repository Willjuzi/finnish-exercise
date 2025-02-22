// ============== 全局变量 ==============
let currentMode = 'practice';
let rawQuestions = [];
let vocabData = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// API 配置（列名已匹配）
const API_CONFIG = {
  practice: "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/export?format=csv",
  vocab: "https://docs.google.com/spreadsheets/d/1VD4SYUVH5An14uS8cxzGlREbRx2eL6SeWUMBpNWp9ZQ/export?format=csv"
};

// 缓存配置
const CACHE_KEY_PREFIX = "learning_app_data_";
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

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
async function initializeData() {
  const cachedData = getCachedData(currentMode);
  if (cachedData) {
    console.log(`使用缓存数据 (${currentMode})`);
    if (currentMode === 'practice') {
      handlePracticeData(cachedData);
    } else {
      handleVocabData(cachedData);
    }
  } else {
    console.log(`未找到缓存数据 (${currentMode})，正在请求新数据...`);
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
      
      cacheData(currentMode, csvText);
    } catch (error) {
      console.error("数据加载失败:", error);
      showError("⚠️ 数据加载失败，请检查：<br>1. 表格是否已公开共享<br>2. 网络连接是否正常");
    }
  }
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
        // 列名已调整为英文
        if (header === "Group") {
          const num = parseInt(value) || 1;
          return Math.abs(num); // 处理负数组别
        }
        return value?.trim() || "";
      }
    });

    console.log("背单词原始数据（调试）:", results.data);

    // 检查列名是否存在
    const headers = results.meta.fields;
    if (!headers.includes("Word") || !headers.includes("Definition")) {
      console.error("CSV 文件缺少必要的列：", headers);
      showError("CSV 文件缺少必要的列");
      return;
    }

    vocabData = results.data
      .filter(row => row["Word"] && row["Definition"]) // 使用正确的列名 "Word" 和 "Definition"
      .map(row => ({
        word: row["Word"],
        definition: row["Definition"], // 使用正确的列名 "Definition"
        group: row["Group"]
      }));

    console.log("过滤后的数据（调试）:", vocabData);

    if (vocabData.length === 0) {
      console.error("词汇数据为空或格式不正确");
      showError("词汇数据为空或格式不正确");
      return;
    }

    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  } catch (error) {
    console.error("背单词数据处理失败:", error);
    showError("单词数据格式错误");
  }
}

// ============== 分组选择器 ==============
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
    groups = [...new Set(vocabData.map(word => word.group))]
      .filter(g => Number.isInteger(g) && g > 0)
      .sort((a, b) => a - b);
  }

  // 生成选项
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

// ============== 题目集合更新 ==============
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
  utterance.lang = "fi-FI"; // 设置语言为芬兰语
  utterance.voice = getFinnishVoice(); // 使用芬兰语的语音

  speechSynthesis.speak(utterance);
}

function getFinnishVoice() {
  const voices = window.speechSynthesis.getVoices();
  for (let voice of voices) {
    if (voice.lang === "fi-FI") {
      return voice;
    }
  }
  return null; // 如果没有找到合适的语音，则返回 null
}

// ============== 缓存管理 ==============
function getCachedData(mode) {
  const key = `${CACHE_KEY_PREFIX}${mode}`;
  const item = localStorage.getItem(key);
  if (!item) return null;
  
  const data = JSON.parse(item);
  const now = Date.now();
  
  if (now - data.timestamp < CACHE_DURATION) {
    return data.csvText;
  } else {
    localStorage.removeItem(key);
    return null;
  }
}

function cacheData(mode, csvText) {
  const key = `${CACHE_KEY_PREFIX}${mode}`;
  const now = Date.now();
  const data = { timestamp: now, csvText };
  localStorage.setItem(key, JSON.stringify(data));
}

// ============== 初始化执行 ==============
initializeEventListeners();
initializeData();

// 加载 PapaParse 库
if (typeof Papa === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js';
  script.onload = initializeData; // 确保在库加载后初始化数据
  document.head.appendChild(script);
}



