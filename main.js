// main.js

let rawQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let selectedGroup = 1;
let verbOptionsDict = {};  // 用于保存每个动词对应的选项数组

// 从题目中提取动词。
// 如果题目以 "Minkä tyyppinen verbi on" 开头，则提取该短语后第一个单词（去除问号和括号部分）。
function getVerb(text) {
  const prefix = "Minkä tyyppinen verbi on";
  if (text.startsWith(prefix)) {
    let remainder = text.substring(prefix.length).trim();
    // 如果存在 "(" 则只取其前面的部分
    let parenIndex = remainder.indexOf("(");
    if (parenIndex !== -1) {
      remainder = remainder.substring(0, parenIndex).trim();
    }
    // 去除末尾问号及其他标点
    remainder = remainder.replace(/[?.,!]/g, "").trim();
    return remainder;
  }
  // 否则，尝试从括号中提取
  let match = text.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : "";
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
    // 映射数据：去除两端空格
    rawQuestions = results.data.map(row => {
      const question = row["Question"] ? row["Question"].trim() : "";
      const correct = row["Correct Answer"] ? row["Correct Answer"].trim() : "";
      const distractor1 = row["Distractor 1"] ? row["Distractor 1"].trim() : "";
      const distractor2 = row["Distractor 2"] ? row["Distractor 2"].trim() : "";
      const distractor3 = row["Distractor 3"] ? row["Distractor 3"].trim() : "";
      const group = parseFloat(row["Group"]);
      
      const mapped = {
        question: question,
        correct: correct,
        distractors: [distractor1, distractor2, distractor3],
        group: group
      };
      console.log("【Debug】映射行：", JSON.stringify(mapped));
      return mapped;
    });
    
    // 建立动词与选项的字典：仅对那些“Correct Answer”有内容的行进行映射
    rawQuestions.forEach(row => {
      if (row.correct && row.correct.length > 0) {
        let verb = getVerb(row.question);
        if (verb) {
          // 保存原始顺序的选项数组（正确答案在第一位）
          verbOptionsDict[verb] = [row.correct, ...row.distractors];
        }
      }
    });
    console.log("【Debug】Verb Options Dictionary:", JSON.stringify(verbOptionsDict));
    
    updateGroupSelector();
    updateQuestionSet();
    // 过滤掉没有补全选项的题目（确保所有题目都是多项选择题）
    questions = questions.filter(q => q.options && q.options.length > 0);
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
    questions = questions.filter(q => q.options && q.options.length > 0);
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
  // 对每个题目生成多项选择题
  questions = filteredQuestions.map(q => {
    let options = [];
    let answer = q.correct;
    if (q.correct && q.correct.length > 0) {
      // 当前行本身是多项选择题
      options = generateOptions(q.correct, q.distractors);
    } else {
      // 当前行选项为空，尝试从字典中查找对应动词的选项
      let verb = getVerb(q.question);
      if (verb && verbOptionsDict[verb]) {
        let storedOptions = verbOptionsDict[verb];
        options = generateOptions(storedOptions[0], storedOptions.slice(1));
        answer = storedOptions[0];
      } else {
        options = [];
      }
    }
    return {
      question: q.question,
      options: options,
      answer: answer,
      ttsText: answer
    };
  });
  questions = shuffleArray(questions);
  currentQuestionIndex = 0;
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
