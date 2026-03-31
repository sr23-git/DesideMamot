const choiceAInput = document.getElementById("choiceA");
const choiceBInput = document.getElementById("choiceB");
const choiceCInput = document.getElementById("choiceC");
const choiceCWrap = document.getElementById("choiceCWrap");
const choicesGrid = document.getElementById("choicesGrid");
const tagA = document.getElementById("tagA");
const tagB = document.getElementById("tagB");
const tagC = document.getElementById("tagC");
const fighterC = document.getElementById("fighterC");
const battleButton = document.getElementById("battleButton");
const swapButton = document.getElementById("swapButton");
const modeTwoButton = document.getElementById("modeTwoButton");
const modeThreeButton = document.getElementById("modeThreeButton");
const statusText = document.getElementById("statusText");
const winnerText = document.getElementById("winnerText");
const skyWinnerText = document.getElementById("skyWinnerText");
const winnerBurst = document.querySelector(".winner-burst");
const arena = document.getElementById("arena");

const timing = {
  approach: 1100,
  struggle: 1900,
  finish: 1200,
};

let battleInProgress = false;
let audioContext;
let battleMode = 2;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function sanitizeChoice(value, fallback) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function syncLabels() {
  const left = sanitizeChoice(choiceAInput.value, "候補1");
  const right = sanitizeChoice(choiceBInput.value, "候補2");
  const center = sanitizeChoice(choiceCInput.value, "候補3");
  tagA.textContent = left;
  tagB.textContent = right;
  tagC.textContent = center;
}

function resetArenaClasses() {
  arena.className = "arena state-idle";
  arena.classList.add(battleMode === 3 ? "mode-three" : "mode-two");
  skyWinnerText.textContent = "";
  skyWinnerText.classList.remove("is-visible");
  winnerBurst.classList.remove("is-visible");
}

function setControlsDisabled(disabled) {
  battleButton.disabled = disabled;
  swapButton.disabled = disabled;
  modeTwoButton.disabled = disabled;
  modeThreeButton.disabled = disabled;
  choiceAInput.disabled = disabled;
  choiceBInput.disabled = disabled;
  choiceCInput.disabled = disabled || battleMode !== 3;
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  if (audioContext?.state === "suspended") {
    audioContext.resume();
  }
}

function playTone({ frequency, duration, type = "sine", volume = 0.03, delay = 0 }) {
  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime + delay;
  const endTime = startTime + duration;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime);
}

function playBattleStartSound() {
  playTone({ frequency: 220, duration: 0.18, type: "triangle", volume: 0.035 });
  playTone({ frequency: 330, duration: 0.18, type: "triangle", volume: 0.028, delay: 0.12 });
}

function playScuffleSounds() {
  for (let i = 0; i < 7; i += 1) {
    playTone({
      frequency: 140 + Math.random() * 120,
      duration: 0.08,
      type: i % 2 === 0 ? "square" : "sawtooth",
      volume: 0.02,
      delay: i * 0.2,
    });
  }
}

function playVictorySound() {
  playTone({ frequency: 392, duration: 0.16, type: "triangle", volume: 0.03 });
  playTone({ frequency: 523.25, duration: 0.24, type: "triangle", volume: 0.03, delay: 0.16 });
  playTone({ frequency: 659.25, duration: 0.36, type: "triangle", volume: 0.028, delay: 0.34 });
}

function playDecisionSound() {
  playTone({ frequency: 523.25, duration: 0.12, type: "triangle", volume: 0.045 });
  playTone({ frequency: 659.25, duration: 0.16, type: "triangle", volume: 0.04, delay: 0.08 });
  playTone({ frequency: 783.99, duration: 0.28, type: "triangle", volume: 0.04, delay: 0.18 });
  playTone({ frequency: 1046.5, duration: 0.38, type: "sine", volume: 0.03, delay: 0.24 });
}

function setBattleMode(mode) {
  if (battleInProgress) {
    return;
  }

  battleMode = mode;
  const threePlayer = mode === 3;
  modeTwoButton.classList.toggle("is-active", !threePlayer);
  modeThreeButton.classList.toggle("is-active", threePlayer);
  choicesGrid.classList.toggle("mode-two", !threePlayer);
  choicesGrid.classList.toggle("mode-three", threePlayer);
  choiceCWrap.classList.toggle("is-hidden", !threePlayer);
  fighterC.classList.toggle("is-hidden", !threePlayer);
  resetArenaClasses();
  syncLabels();
  if (winnerText) winnerText.textContent = "まだ決まっていません";
  if (statusText) {
    statusText.textContent = threePlayer
      ? "3匹そろいました。中央の乱入マーモットにも注目です。"
      : "候補を決めて、対決スタート！";
  }
  setControlsDisabled(false);
}

function getChoices() {
  const choices = [
    { side: "left", value: sanitizeChoice(choiceAInput.value, "候補1") },
    { side: "right", value: sanitizeChoice(choiceBInput.value, "候補2") },
  ];

  if (battleMode === 3) {
    choices.splice(1, 0, {
      side: "center",
      value: sanitizeChoice(choiceCInput.value, "候補3"),
    });
  }

  return choices;
}

async function startBattle() {
  if (battleInProgress) {
    return;
  }

  ensureAudioContext();
  battleInProgress = true;
  setControlsDisabled(true);
  syncLabels();
  resetArenaClasses();

  const choices = getChoices();
  const winner = choices[Math.floor(Math.random() * choices.length)];
  const winnerSide = winner.side;
  const winnerChoice = winner.value;

  if (winnerText) winnerText.textContent = "判定中...";
  if (statusText) {
    statusText.textContent =
      battleMode === 3
        ? "3匹がじりじり間合いを詰めています..."
        : "両者、じりじり間合いを詰めています...";
  }
  arena.classList.replace("state-idle", "state-approach");
  playBattleStartSound();

  await sleep(timing.approach);

  if (statusText) {
    statusText.textContent =
      battleMode === 3
        ? "三つ巴の取っ組み合い開始。かなりのもふもふ乱戦です。"
        : "取っ組み合い開始。もふもふ乱戦です。";
  }
  arena.classList.replace("state-approach", "state-struggle");
  playScuffleSounds();

  await sleep(timing.struggle);

  const finishMessages = {
    left:
      battleMode === 3
        ? `${winnerChoice}マーモットが横から押し切りました。`
        : `${winnerChoice}マーモットが押し切ったようです。`,
    right:
      battleMode === 3
        ? `${winnerChoice}マーモットが最後に踏ん張りました。`
        : `${winnerChoice}マーモットが粘り勝ちしました。`,
    center: `${winnerChoice}マーモットが中央から勝ち名乗りです。`,
  };

  if (statusText) statusText.textContent = finishMessages[winnerSide];
  arena.classList.replace("state-struggle", "state-finish");
  arena.classList.add(`winner-${winnerSide}`);
  playVictorySound();

  await sleep(timing.finish);

  if (winnerText) winnerText.textContent = `今日は「${winnerChoice}」で決まり！`;
  if (statusText) statusText.textContent = `勝者は ${winnerChoice}。本日の決定です。`;
  arena.classList.add("decision-final");
  skyWinnerText.textContent = winnerChoice;
  skyWinnerText.classList.remove("is-visible");
  winnerBurst.classList.remove("is-visible");
  void skyWinnerText.offsetWidth;
  void winnerBurst.offsetWidth;
  skyWinnerText.classList.add("is-visible");
  winnerBurst.classList.add("is-visible");
  playDecisionSound();

  battleInProgress = false;
  setControlsDisabled(false);
}

function swapChoices() {
  if (battleInProgress) {
    return;
  }
  const currentA = choiceAInput.value;
  choiceAInput.value = choiceBInput.value;
  if (battleMode === 3) {
    choiceBInput.value = choiceCInput.value;
    choiceCInput.value = currentA;
  } else {
    choiceBInput.value = currentA;
  }
  syncLabels();
}

choiceAInput.addEventListener("input", syncLabels);
choiceBInput.addEventListener("input", syncLabels);
choiceCInput.addEventListener("input", syncLabels);
battleButton.addEventListener("click", startBattle);
swapButton.addEventListener("click", swapChoices);
modeTwoButton.addEventListener("click", () => setBattleMode(2));
modeThreeButton.addEventListener("click", () => setBattleMode(3));

setBattleMode(2);
