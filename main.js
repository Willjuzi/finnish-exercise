// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// 使用你的 Google Sheets CSV 地址
const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

fetch(sheetURL)
  .then(response => response.text())
  .then(csvText => {
    console.log("CSV 数据：", csvText);  // 查看原始 CSV 数据
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });
    console.log("解析结果：", results);  // 查看 PapaParse 解析后的结果

    // 如果有数据，打印第一行的键，确认表头名称
    if (results.data && results.data.length > 0) {
      console.log("表头键值：", Object.keys(results.data[0]));
    }

    // 根据你的 Google Sheet 表头映射数据（这里已加入 trim() 处理）
    // 表头应为：Question, Correct Answer, Distractor 1, Distractor 2, Distractor 3, Group
    rawQuestions = results.data.map(row => ({
      question: row["Question"] ? row["Question"].trim() : "",
      correct: row["Correct Answer"] ? row["Correct Answer"].trim() : "",
      distractors: [
        row["Distractor 1"] ? row["Distractor 1"].trim() : "",
        row["Distractor 2"] ? row["Distractor 2"].trim() : "",
        row["Distractor 3"] ? row["Distractor 3"].trim() : ""
      ],
      group: parseInt(row["Group"], 10)
    }));

    console.log("映射后的题库数据：", rawQuestions);  // 调试日志：映射后的数据

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

// 根据选定组别更新题库
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
      ttsText: q.correct  // 这里使用正确答案进行朗读
    };
  });

  questions = shuffleArray(questions);
  currentQuestionIndex = 0;
}

// 合并正确答案与干扰项，并随机排列
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

// 显示当前题目和选项
function showQuestion() {
  const container = document.getElementById('question-container');
  container.innerHTML = '';

  if (currentQuestionIndex >= questions.length) {
    alert("🎉 Practice complete! You have finished all questions in this group!");
    return;
  }

  const current = questions[currentQuestionIndex];
  console.log("当前题目数据：", current);  // 调试日志：当前题目的详细数据

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
    btn.dataset.value = option;
    btn.textContent = `${labels[index]}. ${option}`;
    btn.onclick = () => checkAnswer(option, current.answer, current.ttsText);
    container.appendChild(btn);
  });
}

// 检查答案是否正确
function checkAnswer(selected, correct, ttsText) {
  if (selected === correct) {
    alert("🎉 Congratulations! You got it right! Keep going! 🚀");
  } else {
    alert(`❌ Oops! Try again! The correct answer is: ${correct} 😉`);
  }
  speak(ttsText);
}

// 使用 Web Speech API 朗读文本，若失败则使用 Google Translate TTS
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
