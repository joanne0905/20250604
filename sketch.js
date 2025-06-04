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

const infoScore = document.getElementById('score');
const infoTime = document.getElementById('time');
const questionEl = document.getElementById('question');
const feedbackEl = document.getElementById('feedback');
const restartBtn = document.getElementById('restartBtn');

function setup() {
  const canvas = createCanvas(700, 480);
  canvas.parent('game-container');

  // Setup video capture to same size as canvas, no CSS mirror
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handposeModel = ml5.handpose(video, modelReady);
  handposeModel.on('predict', results => {
    predictions = results;
  });

  textFont('Segoe UI');
  textAlign(CENTER, CENTER);

  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  resetGame();
}

function modelReady() {
  console.log('Handpose model ready');
  startGame();
}

function startGame() {
  score = 0;
  timeLeft = 60;
  gameActive = true;
  updateScore();
  updateTime();
  feedbackEl.textContent = '';
  restartBtn.style.display = 'none';
  prepareQuestion();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameActive) return;
    timeLeft--;
    updateTime();
    if (timeLeft <= 0) {
      gameOver();
    }
  }, 1000);
}

function updateScore() {
  infoScore.textContent = score;
}
function updateTime() {
  infoTime.textContent = timeLeft;
}

function gameOver() {
  gameActive = false;
  feedbackEl.textContent = "";
  questionEl.textContent = `遊戲結束！你的分數：${score}`;
  restartBtn.style.display = 'block';
}

function resetGame() {
  score = 0;
  timeLeft = 60;
  gameActive = false;
  feedbackEl.textContent = '';
  questionEl.textContent = '載入中...';
  restartBtn.style.display = 'none';
  targets = [];
  updateScore();
  updateTime();
  if (handposeModel) {
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
  while (answers.size < 4) {
    let wrong = correctAnswer + floor(random(-10, 11));
    if (wrong > 0) answers.add(wrong);
  }

  let answerArray = Array.from(answers);
  shuffleArray(answerArray);

  targets = [];
  let posY = height - 90;
  let spacing = width / (answerArray.length + 1);
  for (let i=0; i < answerArray.length; i++) {
    let posX = spacing * (i + 1);
    targets.push({
      pos: createVector(posX, posY),
      value: answerArray[i],
      isCorrect: answerArray[i] === correctAnswer
    });
  }
}

function shuffleArray(arr) {
  for (let i = arr.length -1; i > 0; i--) {
    let j = floor(random(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function draw() {
  background(27, 27, 47);

  // 翻轉繪製鏡像視訊（video本身未鏡像）
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 100);
  image(video, 0, 0, width, height);
  pop();

  // 畫選項
  for (let t of targets) {
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

    let glowRadius = 38 + 8 * sin(frameCount * 0.18);
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

function checkAnswerSelection() {
  if (!indexTip || selectionCooldown) return;

  for (let t of targets) {
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
      selectionCooldown = true;
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
function drawAnswerTarget(x, y, r, value) {
  noStroke();
  fill(255, 255, 255, 30);
  ellipse(x, y, r * 2 + 10, r * 2 + 10); // 外光圈
  fill(255, 255, 255, 90);
  ellipse(x, y, r * 2, r * 2); // 內圓圈
  fill(255);
  textSize(22);
  textStyle(BOLD);
  text(value, x, y);
}
