// ゲーム変数
let lastDrawnNumber = null; // 最後に引いた数字
let lock = false; // カード操作をロックするフラグ
let selectedLevel = 10; // デフォルトレベル
let drawnCards = []; // 引いたカードを記録
let xCardCounts = {}; // 各×カードの引いた回数を記録
let timerInterval = null; // タイマーインターバル
let timeRemaining = 60; // 残り時間（秒）
let bgmAudio = null; // BGMオーディオオブジェクト
let isGameOverSoundPlaying = false; // ゲームオーバー効果音の重複再生を防止するフラグ

// モバイル対応用オーディオコンテキスト
let audioCtx = null;
let gainNode = null;
let audioSource = null;

// チャレンジモード変数
let challengeMode = false; // チャレンジモードかどうか
let challengeCurrentLevel = 4; // チャレンジモードの現在のレベル（レベル4から開始）
let challengeMaxLevel = 13; // チャレンジモードの最終レベル

// 音量設定
let bgmVolume = 0.8; // BGM音量 (80%)
let sfxVolume = 0.8; // 効果音音量 (80%)

// チュートリアル画面を表示する関数
function showTutorial() {
  // 直接チュートリアルゲームを開始
  document.getElementById('level-selection-screen').style.display = 'none';
  selectedLevel = 'tutorial';
  document.getElementById('game-container').style.display = 'flex';
  
  // ゲームを初期化
  initializeGame();
}

// チュートリアル画面を非表示にする関数
function hideTutorial() {
  document.getElementById('tutorial-screen').style.display = 'none';
  document.getElementById('level-selection-screen').style.display = 'flex';
}

// チャレンジ画面を表示する関数
function showChallenge() {
  // チャレンジモードを有効化
  challengeMode = true;
  
  document.getElementById('level-selection-screen').style.display = 'none';
  selectedLevel = challengeCurrentLevel;
  document.getElementById('game-container').style.display = 'flex';
  
  // ゲームを初期化
  initializeGame();
}

// チュートリアルゲームを開始する関数
function startTutorial() {
  document.getElementById('tutorial-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  
  // チュートリアル用のレベルを設定
  selectedLevel = 'tutorial';
  
  // ゲームを初期化
  initializeGame();
}

// レベル選択関数
function selectLevel(level) {
  selectedLevel = level;
  
  // 全てのレベルボタンからselectedクラスを削除
  const allButtons = document.querySelectorAll('.level-btn');
  allButtons.forEach(btn => btn.classList.remove('selected'));
  
  // 選択されたボタンにselectedクラスを追加（安全な方法）
  const clickedButton = Array.from(allButtons).find(btn => btn.textContent.includes(level));
  if (clickedButton) {
    clickedButton.classList.add('selected');
  }
}

// レベル選択関数（クリックイベント対応版）
function selectLevelWithEvent(level, element) {
  selectedLevel = level;
  
  // 全てのレベルボタンからselectedクラスを削除
  const allButtons = document.querySelectorAll('.level-btn');
  allButtons.forEach(btn => btn.classList.remove('selected'));
  
  // 選択されたボタンにselectedクラスを追加
  element.classList.add('selected');
  
  // レベル選択画面を非表示にしてゲーム画面を表示
  document.getElementById('level-selection-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  
  // ゲームを初期化
  initializeGame();
}

// カード配置：選択されたレベルに応じて数字カード＋赤×＋青×＋緑×
function getCardsForLevel(level) {
  const cards = [];
  
  // チュートリアル用：1〜4の数字カードと2枚の×カード
  if (level === 'tutorial' || level === 4) {
    for (let i = 1; i <= 4; i++) {
      cards.push(i); // 1〜4の数字カードを1枚ずつ
    }
    cards.push('red-x', 'blue-x'); // 2枚の×カード
  } else {
    // 通常のレベル設定
    for (let i = 1; i <= level; i++) {
      cards.push(i);
    }
    cards.push('red-x', 'blue-x');
    
    // 11〜13レベルでは緑の×を追加
    if (level >= 11) {
      cards.push('green-x');
    }
  }
  
  cards.sort(() => Math.random() - 0.5);
  return cards;
}

// スタートゲーム関数
function startGame(event) {
  if (event) event.stopPropagation();
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  initializeGame();
}

// タイマー開始関数
function startTimer() {
  // AudioContextをユーザー操作で確実に起動
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('AudioContextが再開されました');
    }).catch(error => {
      console.log('AudioContextの再開に失敗しました:', error);
    });
  }

  // スタートボタンを非表示
  const startContainer = document.getElementById("game-start-container");
  if (startContainer) {
    startContainer.style.display = "none";
  }
  
  // タイマーをリセット
  timeRemaining = 60;
  updateTimerDisplay();
  
  // カード操作を有効化
  lock = false;
  
  // BGMを再生
  playBGM();
  
  // タイマーを開始
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      gameOver();
    }
  }, 1000);
}

// BGM再生関数
function playBGM() {
  try {
    if (!bgmAudio) {
        // モードによってBGMファイルを切り替え
        const bgmFile = (selectedLevel === 'tutorial') ? 'bgm/chare.mp3' : 'bgm/chare1.mp3';
        bgmAudio = new Audio(bgmFile);
        bgmAudio.loop = (selectedLevel === 'tutorial'); // チュートリアルのみループ
    }
    
    // AudioContextがなければ作成
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext());
    }
    
    // BGM用のGainNode（なければ作成）
    if (!gainNode) {
        gainNode = audioCtx.createGain();
        audioSource = audioCtx.createMediaElementSource(bgmAudio);
        audioSource.connect(gainNode).connect(audioCtx.destination);
    }
    
    // 初期音量設定
    const initialVol = bgmVolume * 0.6;
    gainNode.gain.setValueAtTime(initialVol, audioCtx.currentTime);
    
    // AudioContextの状態を確認して再生
    const playPromise = bgmAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('BGM再生開始');
      }).catch(error => {
        console.log('BGMの再生に失敗しました:', error);
        // フォールバック：通常のAudio要素で再生
        bgmAudio.volume = bgmVolume * 0.6;
        bgmAudio.play().catch(e => console.log('フォールバック再生も失敗:', e));
      });
    }
  } catch (error) {
    console.log('BGMの作成に失敗しました:', error);
  }
}

// BGM停止関数
function stopBGM() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    // 音量を元に戻しておく
    if (gainNode) {
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.setValueAtTime(bgmVolume * 0.6, audioCtx.currentTime);
    }
    console.log('BGM停止');
  }
}

// タイマー表示更新関数
function updateTimerDisplay() {
  const timerText = document.getElementById("timer-text");
  if (timerText) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    // 残り10秒になったら背景を黒く変化させる（チュートリアル以外）
    if (timeRemaining === 10 && selectedLevel !== 'tutorial') {
      document.body.style.transition = 'background-color 10s ease-in-out';
      document.body.style.backgroundColor = 'black';
      console.log('背景色の10秒間の黒への変化を開始');
    }
    
    // 0:00になったら止めて時間切れとして認識
    if (timeRemaining === 0 && minutes === 0 && seconds === 0) {
      timerText.textContent = "0:00";
      
      // チュートリアル以外でもBGMは停止しない（chare1.mp3を最後まで流す）
      // 通常モード・チャレンジモードではBGMを流し続ける
      
      setTimeout(() => {
        gameOver();
      }, 100); 
    } else {
      timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      // timeRemaining === 0 の時のBGM停止処理を削除
    }
  }
}

// ゲームオーバー関数
function gameOver() {
  if (selectedLevel === 'tutorial') {
    return;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  lock = true;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "game-over-message";
  messageDiv.textContent = "ゲームオーバー";
  document.body.appendChild(messageDiv);
  
  showGameOverImage();
}

// クリア効果音再生関数 (1つ目)
function playClearSound() {
  try {
    const audio = new Audio();
    const desktopPath = 'sounds/coingame.mp3'; // モバイル対応のため相対パスに修正推奨
    audio.src = desktopPath;
    audio.type = 'audio/mpeg';
    audio.volume = sfxVolume;
    
    audio.addEventListener('canplaythrough', function() {
      audio.play().catch(e => console.log(e));
    });
  } catch (error) {
    console.log('クリア効果音の作成に失敗しました:', error);
  }
}

// 代替再生方法
function tryAlternativePlay() {
  try {
    const altAudio = new Audio('sounds/coingame.mp3');
    altAudio.volume = 0.8;
    altAudio.play().catch(e => console.log(e));
  } catch (error) {
    console.log('代替方法の作成に失敗しました:', error);
  }
}

// ゲームオーバー効果音再生関数
function playGameOverSound() {
  if (isGameOverSoundPlaying) return;
  isGameOverSoundPlaying = true;
  
  try {
    const audio = new Audio('sounds/batu.mp3');
    audio.volume = sfxVolume;
    
    audio.onended = () => {
      isGameOverSoundPlaying = false;
    };
    
    audio.play().catch(error => {
      isGameOverSoundPlaying = false;
      console.log('再生失敗、再試行します');
      setTimeout(() => audio.play(), 200);
    });
  } catch (error) {
    isGameOverSoundPlaying = false;
  }
}

// レベル選択画面を表示
function showLevelSelection() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('level-selection-screen').style.display = 'flex';
}

// スタート画面に戻る
function backToStartScreen() {
  document.getElementById('level-selection-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
}

// スタート画面に戻る関数
function backToStart() {
  document.getElementById('level-selection-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  
  const dynamicElements = document.querySelectorAll('div[style*="game-over-message"], div[style*="bottom: 5%"], #game-over-image, #x-message, #shuffle-image, .game-over-message');
  dynamicElements.forEach(elem => elem.remove());
  
  document.body.style.backgroundColor = 'white';
  stopBGM();
  resetGame();
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  lock = false;
}

// ゲーム初期化関数
function initializeGame() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  
  lastDrawnNumber = null;
  drawnCards = [];
  xCardCounts = {};
  lock = true; 
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timeRemaining = 60;
  updateTimerDisplay();
  
  // 背景色とtransitionをリセット
  document.body.style.backgroundColor = 'white';
  document.body.style.transition = 'background-color 10s ease-in-out';
  
  if (selectedLevel === 'tutorial') {
    document.getElementById('timer-display').style.display = 'none';
  } else {
    document.getElementById('timer-display').style.display = 'block';
  }
  
  board.className = "";
  if (selectedLevel === 'tutorial') {
    board.classList.add("tutorial");
    document.querySelector('.game-side-images').classList.add('show');
  } else {
    document.querySelector('.game-side-images').classList.remove('show');
  }
  
  if (selectedLevel >= 4 && selectedLevel <= 10) {
    board.classList.add("level-" + selectedLevel);
  }
  
  const cards = getCardsForLevel(selectedLevel);
  let totalSlots;
  
  if (selectedLevel === 'tutorial') {
    totalSlots = 6;
  } else if (selectedLevel === 4) {
    totalSlots = 6;
  } else if (selectedLevel >= 5 && selectedLevel <= 6) {
    totalSlots = 8;
  } else if (selectedLevel === 7) {
    totalSlots = 9;
  } else if (selectedLevel >= 8 && selectedLevel <= 10) {
    totalSlots = 12;
  } else if (selectedLevel >= 11 && selectedLevel <= 13) {
    totalSlots = 16;
  } else {
    totalSlots = 12;
  }
  
  cards.forEach((cardValue, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.value = cardValue;
    card.dataset.position = index + 1;
    
    const cardFront = document.createElement("div");
    cardFront.className = "card-face card-front position-number";
    cardFront.textContent = String.fromCharCode(65 + index);
    
    const cardBack = document.createElement("div");
    cardBack.className = "card-face card-back";
    
    if (cardValue === 'red-x') {
      cardBack.textContent = "×";
      cardBack.style.color = "#ff0000";
    } else if (cardValue === 'blue-x') {
      cardBack.textContent = "×";
      cardBack.style.color = "#0000ff";
    } else if (cardValue === 'green-x') {
      cardBack.textContent = "×";
      cardBack.style.color = "#32cd32";
    } else {
      cardBack.textContent = cardValue;
      cardBack.setAttribute('data-number', cardValue);
    }
    
    card.appendChild(cardFront);
    card.appendChild(cardBack);

    card.addEventListener('click', function handleClick(e) {
      if (lock || card.classList.contains("open")) return;
      lock = true;
      card.classList.add("open");

      if (cardValue === 'red-x' || cardValue === 'blue-x' || cardValue === 'green-x') {
        xCardCounts[cardValue] = (xCardCounts[cardValue] || 0) + 1;
        lastDrawnNumber = null;
        drawnCards = [];
        
        if (selectedLevel === 'tutorial') {
          showXCardMessage("アクマにご注意！");
          setTimeout(() => {
            flipAllCardsBack();
            lock = false;
          }, 1000);
        } else {
          if (xCardCounts[cardValue] === 1) {
            showXCardMessage("アクマにご注意！");
            setTimeout(() => {
              flipAllCardsBack();
              lock = false;
            }, 1000);
          } else if (xCardCounts[cardValue] === 2) {
            showXCardMessage(getShuffleMessage());
            showShuffleImage();
            setTimeout(() => {
              flipAllCardsBack();
              shuffleCards();
              xCardCounts = {};
              lock = false;
            }, 1000);
          } else {
            setTimeout(() => {
              flipAllCardsBack();
              resetGame();
              lock = false;
            }, 1000);
          }
        }
        return;
      }

      if (lastDrawnNumber === null) {
        lastDrawnNumber = cardValue;
        drawnCards.push(cardValue);
        lock = false;
      } else {
        if (cardValue === lastDrawnNumber + 1) {
          lastDrawnNumber = cardValue;
          drawnCards.push(cardValue);
          lock = false;
          
          const allNumbersDrawn = drawnCards.filter(card => typeof card === 'number');
          let requiredNumbers;
          let isCompleteClear;
          
          if (selectedLevel === 'tutorial') {
            requiredNumbers = [1, 2, 3, 4];
            isCompleteClear = allNumbersDrawn.length === requiredNumbers.length &&
                            requiredNumbers.every(num => allNumbersDrawn.includes(num));
          } else {
            requiredNumbers = Array.from({length: selectedLevel}, (_, i) => i + 1);
            isCompleteClear = allNumbersDrawn.length === requiredNumbers.length &&
                            requiredNumbers.every(num => allNumbersDrawn.includes(num)) &&
                            allNumbersDrawn[0] === 1;
          }
          
          if (isCompleteClear) {
            showClearMessage();
            lock = false;
          } else {
            lock = false;
          }
        } else {
          setTimeout(() => {
            flipAllCardsBack();
            lastDrawnNumber = null;
            drawnCards = [];
            lock = false;
          }, 1000);
        }
      }
    });

    board.appendChild(card);
  });
  
  for (let i = cards.length; i < totalSlots; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.className = "empty-slot";
    board.appendChild(emptySlot);
  }
}

// ゲームをリセット
function resetGame() {
  lastDrawnNumber = null;
  drawnCards = [];
  xCardCounts = {};
  const allCards = document.querySelectorAll(".card");
  allCards.forEach(card => {
    card.classList.remove("open");
  });
}

// ×カードのメッセージ表示
function showXCardMessage(message) {
  const existingMessage = document.getElementById("x-message");
  if (existingMessage) existingMessage.remove();
  
  const messageDiv = document.createElement("div");
  messageDiv.id = "x-message";
  messageDiv.style.cssText = `
    position: fixed;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1.5vw 3vw;
    border-radius: 1vw;
    font-size: 2.5vw;
    z-index: 1000;
    font-family: 'JF-Dot-Kaname12', monospace;
  `;
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  
  if (message.includes("シャッフル")) showShuffleImage();
  
  setTimeout(() => {
    if (messageDiv.parentNode) messageDiv.remove();
  }, 1000);
}

// ゲームオーバー画像を表示
function showGameOverImage() {
  const existingImage = document.getElementById("game-over-image");
  if (existingImage) existingImage.remove();
  
  const imageDiv = document.createElement("div");
  imageDiv.id = "game-over-image";
  imageDiv.style.cssText = `
    position: fixed;
    top: 52%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    pointer-events: none;
  `;
  
  const img = document.createElement("img");
  img.src = "images/out.png";
  img.style.cssText = `width: 30vw; height: auto;`;
  
  imageDiv.appendChild(img);
  document.body.appendChild(imageDiv);
}

// シャッフルメッセージの候補をランダムに選択
function getShuffleMessage() {
  const messages = ["シャッフルします♪", "シャッフル～♪", "まぜまぜ～♪", "シャッフルタイム！", "シャッフル！", "まぜまぜタイム！"];
  return messages[Math.floor(Math.random() * messages.length)];
}

// 全てのカードを裏に戻す
function flipAllCardsBack() {
  const allCards = document.querySelectorAll(".card");
  allCards.forEach(card => card.classList.remove("open"));
}

// シャッフル画像を表示
function showShuffleImage() {
  const existingImage = document.getElementById("shuffle-image");
  if (existingImage) existingImage.remove();
  
  const imageDiv = document.createElement("div");
  imageDiv.id = "shuffle-image";
  imageDiv.style.cssText = `
    position: fixed;
    top: 52%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    pointer-events: none;
  `;
  
  const img = document.createElement("img");
  img.src = "images/mazeru.png";
  img.style.cssText = `width: 30vw; height: auto;`;
  
  imageDiv.appendChild(img);
  document.body.appendChild(imageDiv);
  
  setTimeout(() => {
    if (imageDiv.parentNode) imageDiv.remove();
  }, 1000);
}

// カードをシャッフル
function shuffleCards() {
  const board = document.getElementById("board");
  const allChildren = Array.from(board.children);
  const emptySlots = [];
  const cardElements = [];
  
  allChildren.forEach((child, index) => {
    if (child.classList.contains("empty-slot")) {
      emptySlots.push({element: child, index: index});
    } else {
      cardElements.push(child);
    }
  });
  
  cardElements.sort(() => Math.random() - 0.5);
  board.innerHTML = "";
  
  const totalElements = emptySlots.length + cardElements.length;
  for (let i = 0; i < totalElements; i++) {
    const slot = emptySlots.find(s => s.index === i);
    if (slot) {
      board.appendChild(slot.element);
    } else {
      const card = cardElements.shift();
      if (card) {
        board.appendChild(card);
        setupCardEventListeners(card);
      }
    }
  }
}

// カードのイベントリスナーを設定する関数
function setupCardEventListeners(card) {
  const cardValue = card.dataset.value;
  card.removeEventListener('click', card.handleClick);
  
  card.handleClick = function(e) {
    if (lock || card.classList.contains("open")) return;
    lock = true;
    card.classList.add("open");

    if (cardValue === 'red-x' || cardValue === 'blue-x' || cardValue === 'green-x') {
      xCardCounts[cardValue] = (xCardCounts[cardValue] || 0) + 1;
      lastDrawnNumber = null;
      drawnCards = [];
      
      if (xCardCounts[cardValue] === 1) {
        showXCardMessage("アクマにご注意！");
        setTimeout(() => {
          flipAllCardsBack();
          lock = false;
        }, 1000);
      } else if (xCardCounts[cardValue] === 2) {
        showXCardMessage(getShuffleMessage());
        showShuffleImage();
        setTimeout(() => {
          flipAllCardsBack();
          shuffleCards();
          xCardCounts = {};
          lock = false;
        }, 1000);
      } else {
        setTimeout(() => {
          flipAllCardsBack();
          resetGame();
          lock = false;
        }, 1000);
      }
      return;
    }

    if (lastDrawnNumber === null) {
      lastDrawnNumber = cardValue;
      drawnCards.push(cardValue);
      lock = false;
    } else {
      if (cardValue > lastDrawnNumber) {
        lastDrawnNumber = cardValue;
        drawnCards.push(cardValue);
        const allNumbersDrawn = drawnCards.filter(card => typeof card === 'number');
        const requiredNumbers = Array.from({length: selectedLevel}, (_, i) => i + 1);
        const isCompleteClear = allNumbersDrawn.length === requiredNumbers.length &&
                                requiredNumbers.every(num => allNumbersDrawn.includes(num)) &&
                                allNumbersDrawn[0] === 1;
        if (isCompleteClear) showClearMessage();
        lock = false;
      } else {
        setTimeout(() => {
          flipAllCardsBack();
          lastDrawnNumber = null;
          drawnCards = [];
          lock = false;
        }, 1000);
      }
    }
  };
  card.addEventListener('click', card.handleClick);
}

function showClearMessage() {
  lock = true;
  const messageDiv = document.createElement("div");
  
  if (challengeMode) {
    messageDiv.style.cssText = `position: fixed; bottom: 5%; left: 50%; transform: translateX(-50%); z-index: 1002;`;
    const buttonText = (challengeCurrentLevel === 13) ? 'すばらしい！' : '次のステージへ';
    const buttonAction = (challengeCurrentLevel === 13) ? 'playTousenAndChangeText()' : 'challengeNextStage()';
    messageDiv.innerHTML = `<button onclick="${buttonAction}" style="background: #4ade80; color: white; border: none; padding: 1vw 2vw; border-radius: 0.5vw; font-size: 2vw; font-family: 'JF-Dot-Kaname12', monospace; cursor: pointer; margin-top: 1vw;">${buttonText}</button>`;
  } else {
    messageDiv.style.cssText = `position: fixed; bottom: 5%; left: 50%; transform: translateX(-50%); background: black; padding: 1.5vw 3vw; border-radius: 1vw; z-index: 1002; font-size: 2.5vw; color: yellow; text-align: center; border: 3px solid yellow; white-space: pre-line;`;
    messageDiv.textContent = `ゲームクリア！`;
  }
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => card.style.pointerEvents = 'none');
    if (timerInterval) clearInterval(timerInterval);
    stopBGM();
    document.body.style.transition = 'none';
    document.body.style.backgroundColor = 'white';
    playClearSound();
  }, 100);
}

// tousen効果音再生関数
function playTousenSound() {
  try {
    const audio = new Audio('sounds/tousen.mp3');
    audio.volume = sfxVolume * 1.2;
    audio.play().catch(e => console.log(e));
  } catch (error) {
    console.log('tousen効果音の作成に失敗しました:', error);
  }
}

// レベル13用のすばらしいボタン関数
function playTousenAndChangeText() {
  event.target.disabled = true;
  event.target.textContent = '全ステージクリア！おめでとう！';
  event.target.style.cssText = `background: black; color: yellow; border: 3px solid yellow; padding: 1.5vw 3vw; border-radius: 1vw; font-size: 2.5vw; font-weight: bold; font-family: 'JF-Dot-Kaname12', monospace; cursor: pointer; margin-top: 1vw; text-align: center;`;
  playTousenSound();
}

// クリア効果音再生関数 (2つ目)
function playClearSound() {
  try {
    const audio = new Audio('sounds/coingame.mp3');
    audio.volume = sfxVolume;
    audio.play().catch(e => console.log(e));
  } catch (error) {
    console.log('クリア効果音の作成に失敗しました:', error);
  }
}

// チャレンジモードで次のステージへ進む関数
function challengeNextStage() {
  const messageDiv = document.querySelector('div[style*="position: fixed"]');
  if (messageDiv) document.body.removeChild(messageDiv);
  challengeCurrentLevel++;
  
  if (challengeCurrentLevel > challengeMaxLevel) {
    challengeMode = false;
    const completeMessage = document.createElement('div');
    completeMessage.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: black; color: yellow; padding: 1.5vw 3vw; border-radius: 1vw; z-index: 1002; font-size: 2.5vw; font-weight: bold; font-family: 'JF-Dot-Kaname12', monospace; text-align: center; border: 3px solid yellow; white-space: pre-line;`;
    completeMessage.textContent = `全ステージクリア！\nおめでとう！`;
    document.body.appendChild(completeMessage);
    stopBGM();
    playTousenSound();
    return;
  }
  selectedLevel = challengeCurrentLevel;
  initializeGame();
  const startContainer = document.getElementById("game-start-container");
  if (startContainer) startContainer.style.display = "block";
}

// チャレンジモードのレベルを開始する関数
function startChallengeLevel() {
  const messageDiv = document.querySelector('div[style*="position: fixed"]');
  if (messageDiv) document.body.removeChild(messageDiv);
  selectedLevel = challengeCurrentLevel;
  initializeGame();
  startTimer();
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', function() {
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', function() {
      document.getElementById('home-confirm-dialog').style.display = 'block';
    });
  }
  
  const confirmHome = document.getElementById('confirm-home');
  if (confirmHome) {
    confirmHome.addEventListener('click', function() {
      backToStart();
      document.getElementById('home-confirm-dialog').style.display = 'none';
      setTimeout(() => { location.reload(); }, 100);
    });
  }
  
  const cancelHome = document.getElementById('cancel-home');
  if (cancelHome) {
    cancelHome.addEventListener('click', function() {
      document.getElementById('home-confirm-dialog').style.display = 'none';
    });
  }
  
  const volumeBtn = document.getElementById('volume-btn');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', function() {
      document.getElementById('volume-panel').style.display = 'block';
    });
  }
  
  const closeVolumePanel = document.getElementById('close-volume-panel');
  if (closeVolumePanel) {
    closeVolumePanel.addEventListener('click', function() {
      document.getElementById('volume-panel').style.display = 'none';
    });
  }
  
  const bgmVolumeSlider = document.getElementById('bgm-volume');
  const bgmVolumeValue = document.getElementById('bgm-volume-value');
  if (bgmVolumeSlider && bgmVolumeValue) {
    bgmVolumeSlider.addEventListener('input', function() {
      bgmVolume = this.value / 100;
      bgmVolumeValue.textContent = this.value + '%';
      if (gainNode) {
        gainNode.gain.setValueAtTime(bgmVolume * 0.3, audioCtx.currentTime);
      }
    });
  }
  
  const sfxVolumeSlider = document.getElementById('sfx-volume');
  const sfxVolumeValue = document.getElementById('sfx-volume-value');
  if (sfxVolumeSlider && sfxVolumeValue) {
    sfxVolumeSlider.addEventListener('input', function() {
      sfxVolume = this.value / 100;
      sfxVolumeValue.textContent = this.value + '%';
    });
  }
});
