// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;

// 只保留正确答案非空的题目，确保所有题目都是多项选择题
function filterMultipleChoice(rows) {
  return rows.filter(row => row.correct && row.correct.trim().length > 0);
}

function generateOptions(correct, distractors) {
  let options = [correct, ...distractors];
  return shuffleArray(options);
}

function shuffleArray(array) {
  let newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 将 CSV 数据映射为对象，并去除两端空格
function mapRow(row) {
  return {
    question: row["Question"] ? row["Question"].trim() : "",
    correct: row["Correct Answer"] ? row["Correct Answer"].trim() : "",
    distractors: [
      row["Distractor 1"] ? row["Distractor 1"].trim() : "",
      row["Distractor 2"] ? row["Distractor 2"].trim() : "",
      row["Distractor 3"] ? row["Distractor 3"].trim() : ""
    ],
    group: parseFloat(row["Group"])
  };
}

const sheetURL = "https://docs.google.com/spreadsheets/d/1_3YwljVW1L0v-lQkL0qQUls5E1amPSTmpQGCSVEHj6E/gviz/tq?tqx=out:csv";

fetch(sheetURL)
  .then(response => response.text())
  .then(csvText => {
    console.log("【Debug】CSV 原始数据：", csvText);
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });
    console.log("【Debug】PapaParse 解析结果：", results);
    if (results.data && results.data.length > 0) {
      console.log("【Debug】数据项键值：", Object.keys(results.data[0]));
    }
    // 映射所有数据行
    rawQuestions = results.data.map(mapRow);
    // 只保留多项选择题（即正确答案非空）
    rawQuestions = filterMultipleChoice(rawQuestions);
    rawQuestions.forEach(row => console.log("【Debug】映射行：", JSON.stringify(row)));
    
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  })
  .catch(error => console.error("Error loading quiz data:", error));

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
  groupSelector.addEventListener("change", event => {
    selectedGroup = parseFloat(event.target.value);
    updateQuestionSet();
    showQuestion();
  });
  if (uniqueGroups.length > 0) {
    selectedGroup = uniqueGroups[0];
    updateQuestionSet();
  }
}

function updateQuestionSet() {
  let filteredQuestions = rawQuestions.filter(q => q.group === selectedGroup);
  filteredQuestions = shuffleArray(filteredQuestions);
  // 对每个题目生成多项选择题（直接使用该行的正确答案和干扰项）
  questions = filteredQuestions.map(q => {
    let options = generateOptions(q.correct, q.distractors);
    return {
      question: q.question,
      options: options,
      answer: q.correct,
      ttsText: q.correct
    };
  });
  questions = shuffleArray(questions);
  currentQuestionIndex = 0;
}

function showQuestion() {
  const container = document.getElementById("question-container");
  container.innerHTML = "";
  
  if (currentQuestionIndex >= questions.length) {
    alert("🎉 Practice complete! You have finished all questions in this group!");
    return;
  }
  
  const current = questions[currentQuestionIndex];
  console.log("【Debug】当前题目数据：", JSON.stringify(current));
  
  // 显示题目文本
  const questionElem = document.createElement("h2");
  questionElem.className = "question-text";
  questionElem.textContent = current.question;
  container.appendChild(questionElem);
  
  // 显示多项选择题选项（标签依次为 A、B、C、D、E）
  const labels = ["A", "B", "C", "D", "E"];
  current.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.value = option;
    btn.textContent = `${labels[index]}. ${option}`;
    btn.onclick = () => checkAnswer(option, current.answer, current.ttsText);
    container.appendChild(btn);
  });
}

function checkAnswer(selected, correct, ttsText) {
  if (selected === correct) {
    alert("🎉 Congratulations! You got it right! Keep going! 🚀");
  } else {
    alert(`❌ Oops! Try again! The correct answer is: ${correct} 😉`);
  }
  speak(ttsText);
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fi-FI";
  const voices = speechSynthesis.getVoices();
  const finnishVoice = voices.find(voice => voice.lang.toLowerCase().includes("fi"));
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

document.getElementById("next-btn").addEventListener("click", () => {
  currentQuestionIndex++;
  showQuestion();
});
