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
let time = 30;
let items = [];
let mainCharacterY = canvas.height - 100; // メインキャラクターの初期位置
let gravity = 2;
let isJumping = false;
let jumpSpeed = 5; // ジャンプ速度を調整
let gameInterval;
let timeInterval;
let difficulty = 1; // 1: Easy, 2: Normal, 3: Hard
let combo = 0;
let comboTimer = 0;
let jumpCount = 0; // ジャンプ回数をカウント
let mainCharacterX = 20; // X座標の初期位置
let moveSpeed = 5; // 左右移動速度
const MAX_JUMPS = 2; // 最大ジャンプ回数

// 定数の調整
const GAME_CONFIG = {
  INITIAL_TIME: 30,
  DIFFICULTY_LEVELS: {
    1: { speed: 3, spawnRate: 0.015 }, // 出現率を更に下げる
    2: { speed: 4, spawnRate: 0.02 },
    3: { speed: 5, spawnRate: 0.025 },
  },
  ITEM_SIZE: 60, // アイテムサイズを60x60に設定
  SCORE_SYSTEM: {
    PLUS_POINTS: 10,
    MINUS_POINTS: -5,
    COMBO_MULTIPLIER: 1.5,
    PERFECT_BONUS: 100,
  },
};

// 画像の読み込み完了を確実に待つ
let imagesLoaded = 0;
const requiredImages = 4; // mainCharacter, plusItem, minusItem, background

function onImageLoad() {
  imagesLoaded++;
  if (imagesLoaded === requiredImages) {
    // 初期画面の描画
    resetGame();
  }
}

mainCharacter.onload = onImageLoad;
plusItem.onload = onImageLoad;
minusItem.onload = onImageLoad;
background.onload = onImageLoad;

// 定数とユーティリティをまとめる
const UTILS = {
  // 描画関連の共通関数
  draw: {
    text: (text, x, y, options = {}) => {
      const {
        font = "bold 64px MisakiGothic",
        fillStyle = "#FFFFFF",
        strokeStyle = "#000000",
        lineWidth = 4,
        withStroke = true,
        textAlign = "center",
      } = options;

      ctx.save();
      ctx.font = font;
      ctx.fillStyle = fillStyle;
      ctx.textAlign = textAlign;

      if (withStroke) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.strokeText(text, x, y);
      }

      ctx.fillText(text, x, y);
      ctx.restore();
    },

    overlay: (alpha = 0.7) => {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  },

  // 画面表示関連の共通関数
  screen: {
    showGameOver: () => {
      // 画面を徐々に暗くするアニメーション
      let alpha = 0;
      const fadeInterval = setInterval(() => {
        alpha += 0.05;
        if (alpha >= 0.7) {
          clearInterval(fadeInterval);
          // 暗くなった後にテキストを表示
          showGameOverText();
        }
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }, 50);

      function showGameOverText() {
        // FINISHテキストを大きくしてフェードイン
        let scale = 2;
        let textAlpha = 0;
        const textInterval = setInterval(() => {
          ctx.save();
          UTILS.draw.overlay(0.7);

          // FINISHテキスト
          ctx.globalAlpha = textAlpha;
          UTILS.draw.text("FINISH!", canvas.width / 2, canvas.height / 2 - 60, {
            font: `bold ${72 * scale}px MisakiGothic`,
            lineWidth: 6,
          });

          if (scale > 1) {
            scale -= 0.1;
          }
          if (textAlpha < 1) {
            textAlpha += 0.1;
          }
          if (scale <= 1 && textAlpha >= 1) {
            clearInterval(textInterval);
            // スコア表示
            showScores();
          }
          ctx.restore();
        }, 50);
      }

      function showScores() {
        // スコアとハイスコアを順番に表示
        UTILS.draw.text(
          `Score: ${score}`,
          canvas.width / 2,
          canvas.height / 2 + 20,
          {
            font: "bold 48px MisakiGothic",
          }
        );

        setTimeout(() => {
          UTILS.draw.text(
            `High Score: ${highScore}`,
            canvas.width / 2,
            canvas.height / 2 + 90,
            { font: "bold 48px MisakiGothic" }
          );
        }, 500);

        setTimeout(() => {
          UTILS.draw.text(
            "Press Reset to Play Again",
            canvas.width / 2,
            canvas.height / 2 + 160,
            {
              font: "bold 32px MisakiGothic",
              fillStyle: "#FFD700",
            }
          );
        }, 1000);
      }
    },

    showStartScreen: () => {
      UTILS.draw.overlay();
      UTILS.draw.text("PLAY TO START", canvas.width / 2, canvas.height / 2);
    },
  },

  // 数値計算関連の共通関数
  math: {
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    randomRange: (min, max) => Math.random() * (max - min) + min,
  },
};

// スコア関連の処理をまとめる
const ScoreManager = {
  save: () => {
    try {
      const scores = JSON.parse(localStorage.getItem("highScores") || "[]");
      scores.push({
        score: score,
        date: new Date().toLocaleDateString(),
      });
      scores.sort((a, b) => b.score - a.score);
      const topScores = scores.slice(0, 10);
      localStorage.setItem("highScores", JSON.stringify(topScores));
      updateRankingDisplay();
      return topScores[0].score;
    } catch (error) {
      console.error("ハイスコアの保存に失敗:", error);
      return score;
    }
  },

  update: (itemType) => {
    const basePoints = itemType === "plus" ? 1 : -1;
    combo++;
    const comboMultiplier = Math.min(combo, 5);
    score += basePoints * comboMultiplier;

    UTILS.draw.text(
      basePoints * comboMultiplier > 0
        ? `+${basePoints * comboMultiplier}`
        : basePoints * comboMultiplier,
      mainCharacterX + 50,
      mainCharacterY - 20,
      {
        font: "bold 24px MisakiGothic",
        fillStyle: itemType === "plus" ? "#4CAF50" : "#F44336",
        withStroke: false,
      }
    );

    document.getElementById("score").innerText = `Score: ${score}`;
  },
};

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("jumpButton").addEventListener("click", jump);
document.getElementById("resetButton").addEventListener("click", resetGame);

// requestAnimationFrameの使用
let lastTime = 0;

// グローバル変数として追加
let animationFrameId = null;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;

  if (deltaTime >= 20) {
    // 約50FPS
    updateGame();
    lastTime = timestamp;
  }

  requestAnimationFrame(gameLoop);
}

function startGame() {
  if (gameState === GAME_STATES.PLAYING) return;
  resetGame();
  gameState = GAME_STATES.PLAYING;
  // アニメーションフレームIDを保存
  animationFrameId = requestAnimationFrame(gameLoop);
  timeInterval = setInterval(updateTime, 1000);
}

const DEBUG = false;

const GAME_STATES = {
  LOADING: "loading",
  READY: "ready",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameOver",
};

let gameState = GAME_STATES.READY;

function updateGame() {
  if (gameState !== GAME_STATES.PLAYING) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    if (gameState === GAME_STATES.READY) {
      UTILS.screen.showStartScreen();
    }
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // キャラクターの位置を更新
  ctx.drawImage(mainCharacter, mainCharacterX, mainCharacterY, 100, 100);

  if (!isJumping && mainCharacterY < canvas.height - 100) {
    mainCharacterY += gravity;
  }

  items.forEach((item, index) => {
    MOVEMENT_PATTERNS[item.pattern](item);
    ctx.drawImage(
      item.image,
      item.x,
      item.y,
      GAME_CONFIG.ITEM_SIZE,
      GAME_CONFIG.ITEM_SIZE
    );

    if (item.x < -30) {
      items.splice(index, 1);
    }

    if (
      isColliding(
        mainCharacterX,
        mainCharacterY,
        100,
        100,
        item.x,
        item.y,
        GAME_CONFIG.ITEM_SIZE,
        GAME_CONFIG.ITEM_SIZE
      )
    ) {
      handleCollision(item);
    }
  });

  if (Math.random() < GAME_CONFIG.DIFFICULTY_LEVELS[difficulty].spawnRate) {
    const itemTypes = ["plus", "minus"];
    const selectedType =
      itemTypes[Math.floor(Math.random() * itemTypes.length)];

    let item = createItem(selectedType);
    items.push(item);
  }

  if (time <= 0) {
    gameState = GAME_STATES.GAME_OVER;
    clearInterval(timeInterval);
    const highScore = ScoreManager.save();

    // ゲームループを停止
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // シンプルなアラートでスコアを表示
    alert(`FINISH!\n\nYOUR SCORE: ${score}\nHIGH SCORE: ${highScore}`);
    return;
  }

  // 次のフレームをリクエスト
  animationFrameId = requestAnimationFrame(gameLoop);
}

function updateTime() {
  time--;
  document.getElementById("time").innerText = `Time: ${time}`;
}

function jump() {
  if (jumpCount < MAX_JUMPS) {
    // 2段ジャンプまで許可
    isJumping = true;
    jumpCount++;
    let jumpPower = 15 - (jumpCount - 1) * 3; // 2段目は少し低く
    let jumpHeight = 0;
    let maxJumpHeight = 200 - (jumpCount - 1) * 50; // 2段目は低い高度まで

    let jumpInterval = setInterval(() => {
      if (jumpHeight < maxJumpHeight && mainCharacterY > 0) {
        mainCharacterY -= jumpPower;
        jumpHeight += jumpPower;
      } else {
        clearInterval(jumpInterval);
        let fallInterval = setInterval(() => {
          if (mainCharacterY < canvas.height - 100) {
            mainCharacterY += gravity;
          } else {
            mainCharacterY = canvas.height - 100;
            clearInterval(fallInterval);
            isJumping = false;
            jumpCount = 0; // 着地時にリセット
          }
        }, 20);
      }
    }, 20);
  }
}

function resetGame() {
  // アニメーションフレームをキャンセル
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  clearInterval(timeInterval);
  score = 0;
  time = GAME_CONFIG.INITIAL_TIME;
  combo = 0;
  items = [];
  mainCharacterY = canvas.height - 100;
  mainCharacterX = 20;
  jumpCount = 0;
  gameState = GAME_STATES.READY;

  document.getElementById("score").innerText = `Score: ${score}`;
  document.getElementById("time").innerText = `Time: ${time}`;

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // 半透明の背景オーバーレイ
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // PLAY TO STARTテキスト
  ctx.textAlign = "center";
  ctx.font = "bold 64px MisakiGothic";
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.strokeText("PLAY TO START", canvas.width / 2, canvas.height / 2);
  ctx.fillText("PLAY TO START", canvas.width / 2, canvas.height / 2);
}

function isColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
  const margin = 20;
  return !(
    x2 > x1 + w1 - margin ||
    x2 + w2 < x1 + margin ||
    y2 > y1 + h1 - margin ||
    y2 + h2 < y1 + margin
  );
}

function handleCollision(item) {
  ScoreManager.update(item.type);
  items.splice(items.indexOf(item), 1);
  document.getElementById("score").innerText = `Score: ${score}`;
}

// 2. パワーアップアイテムの実装
function applyPowerUp(type) {
  switch (type) {
    case "speed":
      jumpSpeed *= 1.5;
      setTimeout(() => (jumpSpeed /= 1.5), 5000);
      break;
    case "invincible":
      // 無敵状態の実装
      break;
  }
}

// ランキング表示の更新
function updateRankingDisplay() {
  const rankingList = document.getElementById("rankingList");
  const scores = JSON.parse(localStorage.getItem("highScores") || "[]");

  rankingList.innerHTML = scores
    .map(
      (score, index) => `
    <div class="ranking-item">
      <span class="ranking-position">${index + 1}位</span>
      <span class="ranking-score">${score.score}点</span>
      <span class="ranking-date">${score.date}</span>
    </div>
  `
    )
    .join("");
}

// ページ読込み時にランキングを表示
window.onload = function () {
  document.getElementById(
    "time"
  ).innerText = `Time: ${GAME_CONFIG.INITIAL_TIME}`;
  resetGame();
  updateRankingDisplay();
};

// キーボド入力の処理を追加
document.addEventListener("keydown", function (event) {
  switch (event.key) {
    case "ArrowLeft":
      mainCharacterX = UTILS.math.clamp(
        0,
        mainCharacterX - moveSpeed,
        canvas.width - 100
      );
      break;
    case "ArrowRight":
      mainCharacterX = UTILS.math.clamp(
        0,
        mainCharacterX + moveSpeed,
        canvas.width - 100
      );
      break;
    case "ArrowUp":
    case " ": // スペースキー
      jump();
      break;
  }
});

const POWERUPS = {
  DOUBLE_POINTS: {
    image: "double_points.png",
    duration: 5000,
    effect: () => {
      /* スコア2倍 */
    },
  },
  SLOW_TIME: {
    image: "slow_time.png",
    duration: 3000,
    effect: () => {
      /* アイテムの速度半減 */
    },
  },
  SHIELD: {
    image: "shield.png",
    duration: 4000,
    effect: () => {
      /* マイナスポイント無効 */
    },
  },
};

const STAGES = {
  1: {
    background: "back1.jpg",
    requiredScore: 0,
    itemPattern: "normal",
  },
  2: {
    background: "back2.jpg",
    requiredScore: 1000,
    itemPattern: "zigzag",
  },
  3: {
    background: "back3.jpg",
    requiredScore: 2500,
    itemPattern: "wave",
  },
};

function updateStage() {
  const currentStage = determineStage(score);
  if (currentStage !== lastStage) {
    showStageTransition(currentStage);
    updateBackground(STAGES[currentStage].background);
  }
}

const MOVEMENT_PATTERNS = {
  normal: (item) => {
    item.x -= item.speed;
  },
  zigzag: (item) => {
    item.x -= item.speed;
    item.y += Math.sin(item.x / 50) * 3;
  },
  wave: (item) => {
    item.x -= item.speed;
    item.y = item.initialY + Math.sin(item.x / 100) * 50;
  },
};

const MISSIONS = {
  PERFECT_CATCH: {
    description: "プラスアイテムを10個連続ゲット",
    reward: 500,
  },
  SPEED_RUN: {
    description: "10秒以内に1000点達成",
    reward: 1000,
  },
  MASTER_DODGE: {
    description: "マイナスアイテムを20個回避",
    reward: 800,
  },
};

function checkMissionCompletion() {
  // ミッション達成チェックと報酬付与
}

const SOUND_EFFECTS = {
  PLUS_ITEM: null,
  MINUS_ITEM: null,
  COMBO: null,
  STAGE_CLEAR: null,
};

function showVisualEffects(type, x, y) {
  // パーティクルエフェクトなどの表示
  console.log("Visual effect:", type, x, y);
}

const PLAYER_UPGRADES = {
  SPEED: {
    cost: 1000,
    levels: [1, 1.2, 1.4, 1.6, 1.8],
  },
  JUMP_POWER: {
    cost: 1500,
    levels: [1, 1.3, 1.6, 1.9, 2.2],
  },
  COMBO_BONUS: {
    cost: 2000,
    levels: [1, 1.5, 2, 2.5, 3],
  },
};

// 必要な変数の追加
let lastStage = 1;
let currentStage = 1;

// 必要関数の定義
function showComboEffect(combo, multiplier) {
  ctx.save();
  ctx.font = "bold 24px MisakiGothic";
  ctx.fillStyle = "#FFD700";
  ctx.textAlign = "center";
  ctx.fillText(`${combo}x COMBO!`, mainCharacterX + 50, mainCharacterY - 20);
  ctx.restore();
}

function determineStage(score) {
  if (score >= STAGES[3].requiredScore) return 3;
  if (score >= STAGES[2].requiredScore) return 2;
  return 1;
}

// アイテム生成時にinitialY追加
function createItem(type) {
  const yPos =
    Math.random() * (canvas.height - GAME_CONFIG.ITEM_SIZE - 50) + 50;
  return {
    x: canvas.width,
    y: yPos,
    initialY: yPos, // wave patternで必要
    speed: GAME_CONFIG.DIFFICULTY_LEVELS[difficulty].speed,
    image: type === "plus" ? plusItem : minusItem,
    type: type,
    pattern: "normal",
  };
}

// サウンド再生関数を安全に実装
function playSound(type) {
  if (SOUND_EFFECTS[type]) {
    SOUND_EFFECTS[type]
      .play()
      .catch((err) => console.log("Sound play failed:", err));
  }
}

// タッチ操作の追加
canvas.addEventListener("touchstart", handleTouchStart);

function handleTouchStart(event) {
  event.preventDefault(); // デフォルトのスクロール動作を防止
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;

  if (x < canvas.width / 2) {
    mainCharacterX = UTILS.math.clamp(
      0,
      mainCharacterX - moveSpeed,
      canvas.width - 100
    );
  } else {
    mainCharacterX = UTILS.math.clamp(
      0,
      mainCharacterX + moveSpeed,
      canvas.width - 100
    );
  }
}

// ジャンプのためのタッチ操作を追加
canvas.addEventListener("touchend", function (event) {
  event.preventDefault();
  jump();
});
