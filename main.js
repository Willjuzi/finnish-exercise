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
    console.log("【调试】CSV 原始数据：", csvText);
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });
    console.log("【调试】PapaParse 解析结果：", results);
    if (results.data && results.data.length > 0) {
      console.log("【调试】数据项键值：", Object.keys(results.data[0]));
    }
    // 映射数据，调用 trim() 以去除两端空格
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
      console.log("【调试】映射行：", JSON.stringify(mapped));
      return mapped;
    });
    
    updateGroupSelector();
    updateQuestionSet();
    showQuestion();
  })
  .catch(error => console.error('Error loading quiz data:', error));

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
  // 对每个题目，根据是否有正确答案来判断题型：
  questions = filteredQuestions.map(q => {
    let options = [];
    // 如果“Correct Answer”有内容，则视为多项选择题
    if (q.correct && q.correct.length > 0) {
      options = generateOptions(q.correct, q.distractors);
    }
    // 否则视为填空题（选项数组保持为空）
    return {
      question: q.question,
      options: options,
      answer: q.correct,  // 多项选择题用此字段来校对答案
      ttsText: q.correct  // 语音朗读使用，可根据需要调整
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
  const container = document.getElementById('question-container');
  container.innerHTML = "";
  
  if (currentQuestionIndex >= questions.length) {
    alert("🎉 Practice complete! You have finished all questions in this group!");
    return;
  }
  
  const current = questions[currentQuestionIndex];
  console.log("【调试】当前题目数据：", JSON.stringify(current));
  
  // 显示题目文本
  const questionElem = document.createElement('h2');
  questionElem.className = "question-text";
  questionElem.textContent = current.question;
  container.appendChild(questionElem);
  
  if (current.options.length === 0) {
    // 填空题：显示一个文本输入框和提交按钮
    const input = document.createElement('input');
    input.type = "text";
    input.id = "answer-input";
    input.placeholder = "Type your answer here";
    container.appendChild(input);
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = "Submit Answer";
    submitBtn.onclick = () => {
      let userAnswer = document.getElementById("answer-input").value.trim();
      // 可在此添加比对逻辑，如与正确答案比较（此处仅显示提交的答案）
      alert("Your answer: " + userAnswer);
      currentQuestionIndex++;
      showQuestion();
    };
    container.append
