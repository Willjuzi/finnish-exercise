// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// 使用你提供的 Google Sheets CSV 地址（更新时会自动调用最新数据）
const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

// 从 Google Sheet 获取 CSV 数据，并转换成 JSON
fetch(sheetURL)
  .then(response => response.text())
  .then(csvText => {
    rawQuestions = parseCSV(csvText);
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  })
  .catch(error => console.error('Error loading quiz data:', error));

/**
 * 解析 CSV 数据为 JSON 对象
 * 假设 CSV 列顺序为：
 * Column 0: Question (英文题目)
 * Column 1: Correct Answer (正确答案)
 * Column 2: Distractor1 (干扰项1)
 * Column 3: Distractor2 (干扰项2)
 * Column 4: Distractor3 (干扰项3)
 * Column 5: Group (组别)
 */
function parseCSV(csvText) {
  const rows = csvText.split("\n").filter(row => row.trim() !== "");
  // 假设第一行是表头，从第二行开始读取数据
  const data = rows.slice(1).map(row => {
    // 简单按照逗号分割（如果数据中有逗号，请考虑使用更健壮的 CSV 解析方法）
    const cols = row.split(",").map(col => col.replace(/"/g, '').trim());
    return {
      question: cols[0],
      correct: cols[1],
      distractors: [cols[2], cols[3], cols[4]],
      group: parseInt(cols[5], 10)
    };
  });
  return data;
}

// 更新页面上的组别选择框
function updateGroupSelector() {
  const groupSelector = document.getElementById("group-selector");
  groupSelector.innerHTML = "";

  let uniqueGroups = [...new Set(rawQuestions.map(q => q.group))];
  uniqueGroups.sort((a, b) => a - b);

  uniqueGroups.forEach(groupNum => {
    let option = document.createElement("option");
    option.value = groupNum;
    option.textContent = `Group ${groupNum}`;
    groupSelector.appendChild(option);
  });

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

// 根据选定的组别更新题库
function updateQuestionSet() {
  let filteredQuestions = rawQuestions.filter(q => q.group === selectedGroup);
  filteredQuestions = shuffleArray(filteredQuestions);

  // 将每个题目转换为带有随机排列答案选项的对象
  questions = filteredQuestions.map(q => {
    let options = generateOptions(q.correct, q.distractors);
    return {
      question: q.question,
      options: options,
      answer: q.correct,
      ttsText: q.correct  // 可根据需要调整语音播报文本
    };
  });

  questions = shuffleArray(questions);
  currentQuestionIndex = 0;
}

// 生成答案选项：合并正确答案和干扰项，并随机排列
function generateOptions(correct, distractors) {
  let options = [correct, ...distractors];
  return shuffleArray(options);
}

// 使用 Fisher-Yates 算法随机打乱数组
function shuffleArray(array) {
  let newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 显示当前题目及其答案选项
function showQuestion() {
  const container = document.getElementById('question-container');
  container.innerHTML = '';

  if (currentQuestionIndex >= questions.length) {
    alert("🎉 Practice complete! You have finished all questions in this group!");
    return;
  }

  const current = questions[currentQuestionIndex];

  // 显示题目文本
  const questionElem = document.createElement('h2');
  questionElem.className = "question-text";
  questionElem.textContent = current.question;
  container.appendChild(questionElem);

  // 定义选项前缀标签 A, B, C, D
  const labels = ['A', 'B', 'C', 'D'];

  current.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = "option-btn";
    // 将答案选项保存到 data-value 属性中，便于后续比对
    btn.dataset.value = option;
    btn.textContent = `${labels[index]}. ${option}`;
    btn.onclick = () => checkAnswer(option, current.answer, current.ttsText);
    container.appendChild(btn);
  });
}

// 检查用户选择的答案并给予反馈
function checkAnswer(selected, correct, ttsText) {
  if (selected === correct) {
    alert("🎉 Congratulations! You got it right! Keep going! 🚀");
  } else {
    alert(`❌ Oops! Try again! The correct answer is: ${correct} 😉`);
  }
  speak(ttsText);
}

// 使用 Web Speech API 朗读文本，若未找到芬兰语发音则回退使用 Google Translate TTS
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fi-FI'; // 指定芬兰语

  const voices = speechSynthesis.getVoices();
  const finnishVoice = voices.find(voice => voice.lang.toLowerCase().includes('fi'));
  
  if (finnishVoice) {
    utterance.voice = finnishVoice;
    speechSynthesis.speak(utterance);
  } else {
    let audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&tl=fi&client=tw-ob&q=${encodeURIComponent(text)}`);
    audio.oncanplaythrough = () => {
      audio.play().catch(error => console.error("Audio play failed:", error));
    };
    audio.onerror = () => {
      console.error("Error loading the TTS audio.");
    };
  }
}

// “Next” 按钮点击事件，显示下一题
document.getElementById('next-btn').addEventListener('click', () => {
  currentQuestionIndex++;
  showQuestion();
});

