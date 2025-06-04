let handposeModel;
let video;
let predictions = [];
let indexTip = null;

const targetRadius = 50;
let targets = [];
let score = 0;
let timeLeft = 60;
let timerInterval;
let gameActive = false;

const infoScore = document.getElementById('score'); // 分數顯示元素
const infoTime = document.getElementById('time'); // 時間顯示元素
const questionEl = document.getElementById('question'); // 題目顯示元素
const feedbackEl = document.getElementById('feedback'); // 回饋顯示元素
const restartBtn = document.getElementById('restartBtn'); // 重啟按鈕元素

function setup() { // 設定畫布和視頻捕捉
  const canvas = createCanvas(700, 480);
  canvas.parent('game-container');

  // 設定視頻捕捉
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handposeModel = ml5.handpose(video, modelReady); // 初始化手勢模型
  handposeModel.on('predict', results => {
    predictions = results;
  });

  textFont('Segoe UI'); // 設定字體
  textAlign(CENTER, CENTER);

  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  resetGame();
}

function modelReady() { // 模型準備完成後開始遊戲
  console.log('Handpose model ready'); 
  startGame();
}

function startGame() { // 開始遊戲
  score = 0; 
  timeLeft = 60;
  gameActive = true;
  updateScore();
  updateTime();
  feedbackEl.textContent = '';
  restartBtn.style.display = 'none';
  prepareQuestion();

  if (timerInterval) clearInterval(timerInterval); // 清除之前的計時器
  timerInterval = setInterval(() => {
    if (!gameActive) return; // 如果遊戲已結束，則不繼續計時
    timeLeft--;
    updateTime();
    if (timeLeft <= 0) { // 時間到達0，結束遊戲
      gameOver();
    }
  }, 1000);
}

function updateScore() { // 更新分數顯示
  infoScore.textContent = score;
}
function updateTime() { // 更新時間顯示
  infoTime.textContent = timeLeft;
}

function gameOver() { // 遊戲結束處理
  gameActive = false;
  feedbackEl.textContent = "";
  questionEl.textContent = `遊戲結束！你的分數：${score}`;
  restartBtn.style.display = 'block';
}

function resetGame() { // 重置遊戲狀態
  score = 0;
  timeLeft = 60;
  gameActive = false;
  feedbackEl.textContent = '';
  questionEl.textContent = '載入中...';
  restartBtn.style.display = 'none';
  targets = [];
  updateScore();
  updateTime(); // 更新分數和時間顯示
  if (handposeModel) { // 如果模型已經載入，則重新開始遊戲
    startGame();
  }
}

function prepareQuestion() {
  // 簡單加法題目
  const a = floor(random(1, 20));
  const b = floor(random(1, 20));
  const correctAnswer = a + b;
  questionEl.textContent = `${a} + ${b} = ?`;

  // 產生3個錯誤答案
  let answers = new Set();
  answers.add(correctAnswer);
  while (answers.size < 4) { // 確保有4個選項
    let wrong = correctAnswer + floor(random(-10, 11));
    if (wrong > 0) answers.add(wrong);
  }

  let answerArray = Array.from(answers); // 將Set轉換為陣列
  shuffleArray(answerArray);

  targets = []; // 清空之前的目標
  let posY = height - 90;
  let spacing = width / (answerArray.length + 1);
  for (let i=0; i < answerArray.length; i++) {
    let posX = spacing * (i + 1);
    targets.push({ // 創建新的目標
      pos: createVector(posX, posY),
      value: answerArray[i],
      isCorrect: answerArray[i] === correctAnswer // 判斷是否為正確答案
    });
  }
}

function shuffleArray(arr) { // 洗牌函數
  for (let i = arr.length -1; i > 0; i--) { // 從最後一個元素開始
    let j = floor(random(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // 交換元素
  }
}

function draw() {
  background(27, 27, 47);

  // 翻轉繪製鏡像視訊（video本身未鏡像）
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 100);
  image(video, 0, 0, width, height); // 繪製視頻
  pop();

  // 畫選項
  for (let t of targets) { // 遍歷每個目標
    drawAnswerTarget(t.pos.x, t.pos.y, targetRadius, t.value);
  }

  // 畫食指尖
  if (predictions.length > 0) {
    const hand = predictions[0];
    const tip = hand.landmarks[8];// 食指尖端的坐標
    if (!tip) return;// 如果沒有檢測到食指尖端，則不繪製
    // 反轉x坐標
    const x = width - tip[0];
    const y = tip[1];
    indexTip = createVector(x, y);

    stroke(0, 255, 180);
    strokeWeight(3);
    fill(0, 255, 180, 220);
    ellipse(indexTip.x, indexTip.y, 30, 30);

    let glowRadius = 38 + 8 * sin(frameCount * 0.18); // 閃爍效果
    noFill();
    stroke(0, 255, 180, 160);
    strokeWeight(2);
    ellipse(indexTip.x, indexTip.y, glowRadius, glowRadius);

    if (gameActive) {
      checkAnswerSelection();
    }
  } else {
    indexTip = null;
  }
}

let selectionCooldown = false;

function checkAnswerSelection() { // 檢查食指尖是否選擇了答案
  if (!indexTip || selectionCooldown) return;

  for (let t of targets) { // 遍歷每個目標
    let d = dist(indexTip.x, indexTip.y, t.pos.x, t.pos.y);
    if (d < targetRadius + 15) {
      if (t.isCorrect) {
        score++;
        updateScore();
        feedbackEl.style.color = '#00ffb7';
        feedbackEl.textContent = '答對了！🎉';
      } else {
        feedbackEl.style.color = '#ff6b6b';
        feedbackEl.textContent = '再試一次！❌';
      }
      selectionCooldown = true; // 防止重複選擇
      setTimeout(() => {
        feedbackEl.textContent = '';
        if (t.isCorrect) {
          prepareQuestion();
        }
        selectionCooldown = false;
      }, 1200);
      break;
    }
  }
}
function drawAnswerTarget(x, y, r, value) { // 繪製答案選項
  noStroke();
  fill(255, 255, 255, 30);
  ellipse(x, y, r * 2 + 10, r * 2 + 10); // 外光圈
  fill(255, 255, 255, 90);
  ellipse(x, y, r * 2, r * 2); // 內圓圈
  fill(255);
  textSize(22);
  textStyle(BOLD);
  text(value, x, y); // 顯示答案值
}
