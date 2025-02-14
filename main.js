// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// 使用你提供的 Google Sheets CSV 地址
const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

// 从 Google Sheets 获取 CSV 数据，并使用 PapaParse 转换成 JSON
fetch(sheetURL)
  .then(response => response.text())
  .then(csvText => {
    // 使用 PapaParse 解析 CSV
    const results = Papa.parse(csvText, {
      header: true,       // 第一行作为表头（请确保你的 Google Sheet 中表头名称与下面的字段匹配）
      skipEmptyLines: true
    });
    
    // 假设你的表头名称分别是：Question, Correct, Distractor1, Distractor2, Distractor3, Group
    rawQuestions = results.data.map(row => ({
      question: row["Question"],
      correct: row["Correct"],
      distractors: [row["Distractor1"], row["Distractor2"], row["Distractor3"]],
      group: parseInt(row["Group"], 10)
    }));
    
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  })
  .catch(error => console.error('Error loading quiz data:', error));

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

  // 为每个题目生成随机排列的答案选项
  questions = filteredQuestions.map(q => {
    let options = generateOptions(q.correct, q.distractors);
    return {
      question: q.question,
      options: options,
      answer: q.correct,
      ttsText: q.correct  // 可根据需要调整语音播报的文本
    };
  });

  questions = shuffleArray(questions);
  currentQuestionIndex = 0;
}

// 生成答案选项：合并正确答案与干扰项，然后随机打乱顺序
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
    // 将答案选项存入 data-value 属性，便于后续比对
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
  utterance.lang = 'fi-FI';

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
