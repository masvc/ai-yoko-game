let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
let mainCharacter = new Image();
mainCharacter.src = "img/main.png";
let plusItem = new Image();
plusItem.src = "img/plus.png";
let minusItem = new Image();
minusItem.src = "img/minus.png";
let background = new Image();
background.src = "img/back.jpg"; // 背景画像を追加してください
let score = 0;
let time = 15;
let items = [];
let mainCharacterY = canvas.height - 100; // メインキャラクターの初期位置
let gravity = 2;
let isJumping = false;
let jumpSpeed = 5; // ジャンプ速度を調整
let gameInterval;
let timeInterval;

// ゲーム開始前に背景とテキストを描画
background.onload = function () {
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.font = "48px MisakiGothic";
  ctx.fillText("Play to Start", canvas.width / 2 - 120, canvas.height / 2);
};

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("jumpButton").addEventListener("click", jump);
document.getElementById("resetButton").addEventListener("click", resetGame);

function startGame() {
  resetGame();
  gameInterval = setInterval(updateGame, 20);
  timeInterval = setInterval(updateTime, 1000);
}

function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(mainCharacter, 20, mainCharacterY, 100, 100);

  if (!isJumping && mainCharacterY < canvas.height - 100) {
    mainCharacterY += gravity;
  }

  items.forEach((item, index) => {
    item.x -= item.speed;
    ctx.drawImage(item.image, item.x, item.y, 100, 100);
    if (item.x < -30) {
      items.splice(index, 1);
    }

    if (isColliding(20, mainCharacterY, 100, 100, item.x, item.y, 100, 100)) {
      if (item.type === "plus") {
        score++;
      } else {
        score--;
      }
      items.splice(index, 1);
      document.getElementById("score").innerText = `Score: ${score}`;
    }
  });

  if (Math.random() < 0.01) {
    // アイテム出現確率を減らす
    let item = {
      x: canvas.width,
      y: Math.random() * (canvas.height - 100),
      speed: 3 + Math.random() * 2, // アイテムのスピードをダウン
      image: Math.random() < 0.5 ? plusItem : minusItem,
      type: Math.random() < 0.5 ? "plus" : "minus",
    };
    items.push(item);
  }

  if (time <= 0) {
    clearInterval(gameInterval);
    clearInterval(timeInterval);
    ctx.font = "48px MisakiGothic";
    ctx.fillText("FINISH", canvas.width / 2 - 100, canvas.height / 2);
    ctx.fillText(
      `Score: ${score}`,
      canvas.width / 2 - 80,
      canvas.height / 2 + 50
    );
  }
}

function updateTime() {
  time--;
  document.getElementById("time").innerText = `Time: ${time}`;
}

function jump() {
  if (!isJumping || mainCharacterY < canvas.height - 100) {
    isJumping = true;
    let jumpInterval = setInterval(() => {
      if (mainCharacterY > 100) {
        mainCharacterY -= jumpSpeed;
      } else {
        clearInterval(jumpInterval);
        let fallInterval = setInterval(() => {
          if (mainCharacterY < canvas.height - 100) {
            mainCharacterY += (gravity * 1.5) / 2; // 落下速度を1.5倍に
          } else {
            clearInterval(fallInterval);
            isJumping = false;
          }
        }, 20);
      }
    }, 20);
  }
}

function resetGame() {
  clearInterval(gameInterval);
  clearInterval(timeInterval);
  score = 0;
  time = 15;
  items = [];
  mainCharacterY = canvas.height - 100;
  document.getElementById("score").innerText = `Score: ${score}`;
  document.getElementById("time").innerText = `Time: ${time}`;

  // 背景とテキストを再描画
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.font = "48px MisakiGothic";
  ctx.fillText("Play to Start", canvas.width / 2 - 120, canvas.height / 2);
}

function isColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
  return !(x2 > x1 + w1 || x2 + w2 < x1 || y2 > y1 + h1 || y2 + h2 < y1);
}
