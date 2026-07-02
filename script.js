/* =========================================================
   BINARY JOKER — GAME LOGIC (Vanilla JavaScript)
   Konsep: kartu casino menampilkan angka DESIMAL di muka.
   Kartu bisa dibalik SEKALI untuk mengintip angka BINER
   selama beberapa detik (tergantung kesulitan), lalu pemain
   menyusun kartu 0/1/Joker bermotif casino ke slot jawaban.
   ========================================================= */

const elBtnStart      = document.getElementById('btnStart');
const elBtnRestart    = document.getElementById('btnRestart');
const elBtnShuffle    = document.getElementById('btnShuffle');
const elBtnHint       = document.getElementById('btnHint');

const elStatLevel     = document.getElementById('statLevel');
const elStatScore     = document.getElementById('statScore');
const elStatTimer     = document.getElementById('statTimer');
const elStatLives     = document.getElementById('statLives');
const elTimerBar      = document.getElementById('timerBar');

const elStickyTopbar   = document.getElementById('stickyTopbar');
const elTargetArea     = document.querySelector('.target-area');
const elSlotsArea      = document.querySelector('.slots-area');

const elHintCard           = document.getElementById('hintCard');
const elHintCardValue      = document.getElementById('hintCardValue');
const elHintCardBinary     = document.getElementById('hintCardBinary');
const elHintNote           = document.getElementById('hintNote');
const elFlipCountdown      = document.getElementById('flipCountdown');
const elFlipCountdownValue = document.getElementById('flipCountdownValue');

const elSlotsContainer  = document.getElementById('slotsContainer');
const elCardsContainer  = document.getElementById('cardsContainer');
const elFeedbackOverlay = document.getElementById('feedbackOverlay');
const elFeedbackTitle   = document.getElementById('feedbackTitle');
const elFeedbackText    = document.getElementById('feedbackText');
const elFeedbackBtn     = document.getElementById('feedbackBtn');
const elJokerPopup      = document.getElementById('jokerPopup');
const elJokerChoose0    = document.getElementById('jokerChoose0');
const elJokerChoose1    = document.getElementById('jokerChoose1');
const elDiffButtons     = document.querySelectorAll('.diff-btn');
const elStatBest        = document.getElementById('statBest');
const elHomeStatBest    = document.getElementById('homeStatBest');
const elNewRecordBadge  = document.getElementById('newRecordBadge');
const elBtnResetHighscore     = document.getElementById('btnResetHighscore');
const elHomeBtnResetHighscore = document.getElementById('homeBtnResetHighscore');
const elBtnHome         = document.getElementById('btnHome');
const elHomeScreen      = document.getElementById('homeScreen');
const elHomeStartBtn    = document.getElementById('homeStartBtn');
const elHomeDiffBtns    = document.querySelectorAll('#homeDiffSelector .diff-btn');

/* ---------- SOUND HOOKS ---------- */
const SOUNDS = {
  cardPick:{ src:'',audio:null }, cardDrop:{ src:'',audio:null },
  cardFlip:{ src:'',audio:null }, correct: { src:'',audio:null },
  wrong:   { src:'',audio:null }, levelUp: { src:'',audio:null },
  gameOver:{ src:'',audio:null }, tick:    { src:'',audio:null },
};
function playSound(name) {
  const s = SOUNDS[name];
  if (!s || !s.src) return;
  if (!s.audio) s.audio = new Audio(s.src);
  s.audio.currentTime = 0; s.audio.play().catch(() => {});
}


/* ---------- STICKY TOPBAR (navbar + timer stay visible on scroll) ---------- */
function updateTopbarHeightVar() {
  if (!elStickyTopbar) return;
  document.documentElement.style.setProperty('--topbar-h', elStickyTopbar.offsetHeight + 'px');
}
function onWindowScroll() {
  if (!elStickyTopbar) return;
  elStickyTopbar.classList.toggle('is-scrolled', window.scrollY > 8);
  updateTopbarHeightVar();
}
window.addEventListener('scroll', onWindowScroll, { passive: true });
let resizeFitTimer = null;
window.addEventListener('resize', () => {
  updateTopbarHeightVar();
  clearTimeout(resizeFitTimer);
  resizeFitTimer = setTimeout(() => {
    autoFitText(elHintCardValue, 14);
    autoFitText(elHintCardBinary, 9);
    autoFitCardValues(elCardsContainer);
    autoFitCardValues(elSlotsContainer);
  }, 120);
});
updateTopbarHeightVar();

/* ---------- AUTO-FIT TEXT ----------
   Shrinks an element's font-size (down to minSize) so its content
   stays on one line and never overflows its box, instead of wrapping
   or spilling out. Reads the CSS-defined size first, then reduces. */
function autoFitText(el, minSize = 9) {
  if (!el) return;
  el.style.fontSize = '';
  const base = parseFloat(getComputedStyle(el).fontSize);
  if (!base) return;
  let size = base;
  el.style.fontSize = size + 'px';
  let guard = 0;
  while (size > minSize && guard < 200 &&
        (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
    size -= 1;
    el.style.fontSize = size + 'px';
    guard++;
  }
}
function autoFitCardValues(container) {
  container.querySelectorAll('.card-value').forEach(el => autoFitText(el, 8));
}

/* ---------- DOCK HINT CARD TO CORNER (FLIP animation) ----------
   Shrinks the target card and glides it from its normal spot into a
   small fixed slot pinned near the sticky topbar, freeing up the
   screen for dragging & dropping the answer cards below. */
function dockHintCardToCorner() {
  const card = elHintCard;
  if (!card || card.classList.contains('is-docked')) return;
  updateTopbarHeightVar();
  const first = card.getBoundingClientRect();
  card.classList.add('is-docked');
  const last = card.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = first.width  / last.width;
  const sy = first.height / last.height;
  card.style.transition = 'none';
  card.style.transform  = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  card.getBoundingClientRect(); // force reflow before releasing the transform
  requestAnimationFrame(() => {
    card.style.transition = '';
    card.style.transform  = '';
    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      card.removeEventListener('transitionend', onEnd);
      autoFitText(elHintCardValue, 7);
    };
    card.addEventListener('transitionend', onEnd);
  });
}

/* ---------- HIGH SCORE (localStorage) ---------- */
const HS_KEY = 'binaryjoker_highscore';

function loadHighScore() {
  return parseInt(localStorage.getItem(HS_KEY) || '0', 10);
}
function saveHighScore(score) {
  localStorage.setItem(HS_KEY, score);
}
function renderHighScore() {
  const best = loadHighScore();
  elStatBest.textContent     = best;
  elHomeStatBest.textContent = best;
}
function checkNewRecord(score) {
  const best = loadHighScore();
  if (score > best) {
    saveHighScore(score);
    renderHighScore();
    elNewRecordBadge.classList.remove('d-none');
    return true;
  }
  return false;
}
function resetHighScore() {
  if (!confirm('Reset high score ke 0? Skor tertinggi saat ini akan hilang dan tidak bisa dikembalikan.')) return;
  saveHighScore(0);
  renderHighScore();
  elNewRecordBadge.classList.add('d-none');
}
if (elBtnResetHighscore)     elBtnResetHighscore.addEventListener('click', resetHighScore);
if (elHomeBtnResetHighscore) elHomeBtnResetHighscore.addEventListener('click', resetHighScore);

/* ---------- DIFFICULTY CONFIG ---------- */
const DIFF = {
  easy:  { lengthBase:3, lengthStep:1.0, flipSec:1.5,   timeBase:50, timeStep:3, jokerEvery:4 },
  normal:{ lengthBase:4, lengthStep:1.2, flipSec:0.5, timeBase:40, timeStep:4, jokerEvery:3 },
  hard:  { lengthBase:5, lengthStep:1.4, flipSec:0.3, timeBase:30, timeStep:4, jokerEvery:2 },
};

/* ---------- GAME STATE ---------- */
const state = {
  difficulty:'easy', level:1, score:0, lives:3,
  target:'', decimalValue:0, cards:[], slots:[],
  selectedCardId:null, jokerPendingId:null, jokerPendingSlot:null,
  flip:{ used:false, isOpen:false, timeoutId:null, countdownId:null },
  timer:{ total:0, remaining:0, intervalId:null, started:false },
  autoCheckTimer:null,
  isPlaying:false,
};
let cardIdCounter = 0;

/* ---------- LEVEL CONFIG ---------- */
function getLevelConfig(level) {
  const d = DIFF[state.difficulty];
  const length     = Math.min(Math.round(d.lengthBase + (level-1)*d.lengthStep), 14);
  const time       = Math.max(d.timeBase - (level-1)*d.timeStep, 12);
  const jokerCount = Math.min(Math.floor((level-1)/d.jokerEvery)+(state.difficulty==='hard'?1:0), Math.max(length-1,0));
  const flipSec    = d.flipSec;
  return { length, time, jokerCount, flipSec };
}

/* ---------- TARGET GENERATION ---------- */
function generateTarget(length) {
  let r = '';
  for (let i=0;i<length;i++) r += Math.random()<0.5?'0':'1';
  if (length>1 && r[0]==='0') r='1'+r.slice(1);
  return r;
}

/* ---------- CREATE CARDS ---------- */
function createCards(target, jokerCount) {
  const digits  = target.split('');
  const indices = digits.map((_,i)=>i);
  shuffleArray(indices);
  const jokerIdx = new Set(indices.slice(0, Math.min(jokerCount, digits.length)));
  return digits.map((digit,i) => {
    cardIdCounter++;
    if (jokerIdx.has(i)) return { id:'card-'+cardIdCounter, type:'joker', value:digit, resolvedValue:null };
    return { id:'card-'+cardIdCounter, type:'digit', value:digit, resolvedValue:digit };
  });
}

function shuffleArray(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

/* ---------- RENDER: TARGET CARD ---------- */
function renderTargetCard() {
  elHintCardValue.textContent  = state.decimalValue;
  elHintCardBinary.textContent = state.target;
  elHintCard.classList.remove('is-flipped');
  elHintCard.classList.remove('is-docked');
  elHintCard.style.transform  = '';
  elHintCard.style.transition = '';
  if (elTargetArea) elTargetArea.classList.remove('is-docked');
  elFlipCountdown.classList.add('d-none');
  requestAnimationFrame(() => {
    autoFitText(elHintCardValue, 14);
    autoFitText(elHintCardBinary, 9);
  });
}

/* ---------- RENDER: SLOTS ---------- */
function renderSlots() {
  elSlotsContainer.innerHTML = '';
  state.slots.forEach((cardId, index) => {
    const el = document.createElement('div');
    el.className = 'slot' + (cardId?' slot--filled':'');
    el.dataset.slotIndex = index;
    el.addEventListener('dragover',  onSlotDragOver);
    el.addEventListener('dragleave', onSlotDragLeave);
    el.addEventListener('drop',      onSlotDrop);
    el.addEventListener('click',     () => onSlotClick(index));
    if (cardId) {
      const card = state.cards.find(c=>c.id===cardId);
      if (card) el.appendChild(buildCardElement(card, true));
    }
    elSlotsContainer.appendChild(el);
  });
  requestAnimationFrame(() => autoFitCardValues(elSlotsContainer));
}

/* ---------- RENDER: CARD DECK ---------- */
function renderCards() {
  elCardsContainer.innerHTML = '';
  state.cards.filter(c=>!state.slots.includes(c.id)).forEach((card,i) => {
    const el = buildCardElement(card, false);
    el.style.animationDelay = (i*0.04)+'s';
    elCardsContainer.appendChild(el);
  });
  requestAnimationFrame(() => autoFitCardValues(elCardsContainer));
}

function buildCardElement(card, inSlot) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.id;
  el.draggable = true;

  if (card.type==='joker') {
    el.classList.add('card--joker');
    el.dataset.pip='JK';
    const val = card.resolvedValue!==null ? card.resolvedValue : '?';
    if (card.resolvedValue!==null) el.classList.add('card--resolved-'+card.resolvedValue);
    el.innerHTML = '<span class="card-suit">&#9733;</span><span class="card-value">'+val+'</span>';
  } else {
    const isZero = card.value==='0';
    el.classList.add(isZero?'card--zero':'card--one');
    el.dataset.pip = card.value+(isZero?'\u2660':'\u2665');
    el.innerHTML = '<span class="card-suit">'+(isZero?'&#9824;':'&#9829;')+'</span><span class="card-value">'+card.value+'</span>';
  }

  el.addEventListener('dragstart', onCardDragStart);
  el.addEventListener('dragend',   onCardDragEnd);
  el.addEventListener('click',     () => onCardClick(card, inSlot));
  return el;
}

/* ---------- DRAG & DROP ---------- */
function onCardDragStart(e) {
  e.dataTransfer.setData('text/plain', e.currentTarget.dataset.cardId);
  e.currentTarget.classList.add('card--dragging');
  playSound('cardPick');
}
function onCardDragEnd(e)   { e.currentTarget.classList.remove('card--dragging'); }
function onSlotDragOver(e)  { e.preventDefault(); e.currentTarget.classList.add('slot--dragover'); }
function onSlotDragLeave(e) { e.currentTarget.classList.remove('slot--dragover'); }
function onSlotDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('slot--dragover');
  placeCardInSlot(e.dataTransfer.getData('text/plain'), Number(e.currentTarget.dataset.slotIndex));
}

/* ---------- CLICK (mobile) ---------- */
function onCardClick(card, inSlot) {
  if (!state.isPlaying) return;
  if (inSlot) { returnCardToDeck(card.id); return; }
  if (card.type==='joker' && card.resolvedValue===null) { openJokerPopup(card.id); return; }
  state.selectedCardId = card.id;
  document.querySelectorAll('.card').forEach(el => {
    el.classList.toggle('card--selected', el.dataset.cardId===state.selectedCardId);
  });
  playSound('cardPick');
}
function onSlotClick(index) {
  if (!state.isPlaying || state.slots[index] || !state.selectedCardId) return;
  placeCardInSlot(state.selectedCardId, index);
  state.selectedCardId = null;
}

/* ---------- PLACE / RETURN ---------- */
function placeCardInSlot(cardId, slotIndex) {
  const card = state.cards.find(c=>c.id===cardId);
  if (!card || state.slots[slotIndex]) return;
  if (card.type==='joker' && card.resolvedValue===null) { openJokerPopup(cardId, slotIndex); return; }
  const prev = state.slots.indexOf(cardId);
  if (prev!==-1) state.slots[prev]=null;
  state.slots[slotIndex] = cardId;
  renderSlots(); renderCards(); maybeAutoCheck();
  playSound('cardDrop');
}
function returnCardToDeck(cardId) {
  const idx = state.slots.indexOf(cardId);
  if (idx!==-1) state.slots[idx]=null;
  renderSlots(); renderCards(); maybeAutoCheck();
}
function clearAutoCheckTimer() {
  if (state.autoCheckTimer) { clearTimeout(state.autoCheckTimer); state.autoCheckTimer = null; }
}
function maybeAutoCheck() {
  clearAutoCheckTimer();
  const complete = state.slots.length > 0 && state.slots.every(s => s !== null);
  if (!complete || !state.isPlaying) return;
  // small pause so the player sees the last card land before verdict
  state.autoCheckTimer = setTimeout(() => {
    state.autoCheckTimer = null;
    const stillComplete = state.slots.length > 0 && state.slots.every(s => s !== null);
    if (stillComplete && state.isPlaying) checkAnswer();
  }, 450);
}

/* ---------- JOKER POPUP ---------- */
function openJokerPopup(cardId, pendingSlot) {
  state.jokerPendingId   = cardId;
  state.jokerPendingSlot = pendingSlot !== undefined ? pendingSlot : null;
  elJokerPopup.classList.remove('d-none');
}
function closeJokerPopup() {
  elJokerPopup.classList.add('d-none');
  state.jokerPendingId = state.jokerPendingSlot = null;
}
function resolveJoker(value) {
  const card = state.cards.find(c=>c.id===state.jokerPendingId);
  if (!card) { closeJokerPopup(); return; }
  card.resolvedValue = value; card.usedAsJoker = true;
  const slot = state.jokerPendingSlot;
  closeJokerPopup();
  renderCards(); renderSlots();
  if (slot!==null) placeCardInSlot(card.id, slot);
}
elJokerChoose0.addEventListener('click', () => resolveJoker('0'));
elJokerChoose1.addEventListener('click', () => resolveJoker('1'));

/* ---------- KARTU CASINO FLIP (sekali saja) ---------- */
function clearFlipTimers() {
  if (state.flip.timeoutId)  { clearTimeout(state.flip.timeoutId);   state.flip.timeoutId=null; }
  if (state.flip.countdownId){ clearInterval(state.flip.countdownId); state.flip.countdownId=null; }
}
function resetFlipState() {
  clearFlipTimers();
  state.flip.used = state.flip.isOpen = false;
  elHintCard.classList.remove('is-flipped');
  elFlipCountdown.classList.add('d-none');
  elBtnHint.disabled     = !state.isPlaying;
  elBtnHint.textContent  = 'BALIK KARTU';
  elHintNote.textContent = 'Kartu hanya bisa dibalik 1x dan tampil sebentar. Ingat baik-baik.';
}
function flipTargetCard() {
  if (!state.isPlaying || state.flip.used || state.flip.isOpen) return;
  const sec = Math.round(getLevelConfig(state.level).flipSec * 10) / 10;
  state.flip.used = state.flip.isOpen = true;
  elBtnHint.disabled = true;
  elBtnHint.textContent = 'TERBUKA...';
  elHintCard.classList.add('is-flipped');
  playSound('cardFlip');

  // the level countdown begins the moment the card turns to binary
  if (!state.timer.started) startTimer(state.timer.total);

  let rem = sec;
  elFlipCountdown.classList.remove('d-none');
  elFlipCountdownValue.textContent = rem.toFixed(1);
  state.flip.countdownId = setInterval(() => {
    rem = Math.max(rem-0.1, 0);
    elFlipCountdownValue.textContent = rem.toFixed(1);
  }, 100);
  state.flip.timeoutId = setTimeout(() => {
    clearFlipTimers();
    state.flip.isOpen = false;
    elHintCard.classList.remove('is-flipped');
    elFlipCountdown.classList.add('d-none');
    elBtnHint.textContent  = 'SUDAH DIBUKA';
    elHintNote.textContent = 'Kesempatan melihat biner sudah habis. Susun dari ingatanmu.';

    // brief beat to see the decimal face again, then shrink & dock to the corner
    setTimeout(() => {
      dockHintCardToCorner();
      if (elTargetArea) elTargetArea.classList.add('is-docked');
      requestAnimationFrame(() => {
        if (elSlotsArea) elSlotsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }, 500);
  }, sec*1000);
}
elBtnHint.addEventListener('click', flipTargetCard);

/* ---------- TIMER ----------
   The countdown only STARTS once the player flips the target card
   (decimal -> binary). Before that it sits idle showing the full
   duration, so there's no time pressure until the peek happens. */
function prepareTimer(seconds) {
  stopTimer();
  state.timer.total = state.timer.remaining = seconds;
  state.timer.started = false;
  updateTimerDisplay();
}
function startTimer(seconds) {
  stopTimer();
  if (typeof seconds === 'number') state.timer.total = state.timer.remaining = seconds;
  state.timer.started = true;
  updateTimerDisplay();
  state.timer.intervalId = setInterval(() => {
    state.timer.remaining--;
    updateTimerDisplay();
    if (state.timer.remaining<=5 && state.timer.remaining>0) playSound('tick');
    if (state.timer.remaining<=0) { stopTimer(); onTimeUp(); }
  }, 1000);
}
function stopTimer() {
  if (state.timer.intervalId) { clearInterval(state.timer.intervalId); state.timer.intervalId=null; }
}
function updateTimerDisplay() {
  elStatTimer.textContent = state.timer.remaining;
  elTimerBar.style.width  = Math.max(state.timer.remaining/state.timer.total*100, 0)+'%';
  const danger = state.timer.remaining<=5 && state.timer.started;
  elStatTimer.classList.toggle('timer-warning', danger);
  elTimerBar.classList.toggle('timer-fill--danger', danger);
}

/* ---------- CHECK ANSWER ---------- */
function checkAnswer() {
  if (!state.isPlaying) return;
  const answer = state.slots.map(id => {
    const c = state.cards.find(c=>c.id===id);
    return c ? c.resolvedValue : '';
  }).join('');
  if (answer===state.target) handleCorrectAnswer();
  else handleWrongAnswer();
}

/* ---------- CORRECT ---------- */
function handleCorrectAnswer() {
  stopTimer(); clearFlipTimers(); playSound('correct');
  const timeBonus   = Math.min(state.timer.remaining*5, 50);
  const memBonus    = !state.flip.used ? 40 : 0;
  const gained      = 100 + timeBonus + memBonus;
  updateScore(gained);
  checkNewRecord(state.score);
  showFeedback({
    type:'success', title:'BENAR!',
    text: 'Skor +'+gained+' POIN  |  Waktu +'+timeBonus+(memBonus?' | Tanpa Buka +'+memBonus:''),
    onContinue: nextLevel,
  });
}

/* ---------- WRONG ---------- */
function handleWrongAnswer() {
  playSound('wrong');
  elHintCard.classList.add('shake');
  setTimeout(() => elHintCard.classList.remove('shake'), 400);
  updateLives(-1);
  if (state.lives<=0) { triggerGameOver(); return; }
  showFeedback({ type:'fail', title:'SALAH', text:'Susunan belum sesuai target. Coba lagi!', onContinue:resetSlotsOnly });
}

function onTimeUp() {
  playSound('wrong');
  updateLives(-1);
  if (state.lives<=0) { triggerGameOver(); return; }
  showFeedback({ type:'fail', title:'WAKTU HABIS', text:'Level diulang dengan kartu baru.', onContinue:() => startLevel(state.level) });
}

/* ---------- SCORE / LIVES ---------- */
function updateScore(n) { state.score+=n; elStatScore.textContent=state.score; }
function updateLives(delta) {
  state.lives = typeof delta==='number' && Math.abs(delta)<=3
    ? Math.max(0, Math.min(3, state.lives+delta))
    : Math.max(0, Math.min(3, delta));
  elStatLives.innerHTML = [0,1,2].map(i =>
    '<span class="life-chip'+(i<state.lives?' is-on':'')+'"></span>'
  ).join('');
}

/* ---------- FEEDBACK ---------- */
function showFeedback({ type, title, text, onContinue }) {
  elFeedbackTitle.className = 'feedback-title is-'+type;
  elFeedbackTitle.textContent = title;
  elFeedbackText.textContent  = text;
  elFeedbackOverlay.classList.remove('d-none');
  elFeedbackBtn.onclick = () => {
    elFeedbackOverlay.classList.add('d-none');
    if (onContinue) onContinue();
  };
}
function resetSlotsOnly() {
  state.slots = state.slots.map(() => null);
  renderSlots(); renderCards(); maybeAutoCheck();
  if (state.timer.started) startTimer(state.timer.total);
}

/* ---------- NEXT LEVEL ---------- */
function nextLevel() {
  state.level++;
  elStatLevel.textContent = state.level;
  showFeedback({ type:'levelup', title:'LEVEL '+state.level, text:'Bersiap! Target makin panjang & waktu makin singkat.', onContinue:() => startLevel(state.level) });
  playSound('levelUp');
}

/* ---------- START LEVEL ---------- */
function startLevel(level) {
  const cfg = getLevelConfig(level);
  state.target       = generateTarget(cfg.length);
  state.decimalValue = parseInt(state.target, 2);
  state.cards        = createCards(state.target, cfg.jokerCount);
  state.slots        = new Array(cfg.length).fill(null);
  state.selectedCardId = null;
  shuffleArray(state.cards);
  renderTargetCard(); renderSlots(); renderCards();
  maybeAutoCheck(); resetFlipState();
  prepareTimer(cfg.time);
  elBtnShuffle.disabled = false;
}

/* ---------- GAME OVER ---------- */
function triggerGameOver() {
  state.isPlaying = false;
  stopTimer(); clearFlipTimers(); clearAutoCheckTimer(); playSound('gameOver');
  toggleControls(false); toggleDiffLock(false);
  showFeedback({ type:'gameover', title:'GAME OVER', text:'Skor akhir kamu: '+state.score+'. Tekan Restart untuk mencoba lagi.', onContinue:()=>{} });
  elFeedbackBtn.textContent = 'TUTUP';
}

/* ---------- RESET GAME ---------- */
function resetGame() {
  stopTimer(); clearFlipTimers(); clearAutoCheckTimer(); closeJokerPopup();
  elFeedbackOverlay.classList.add('d-none');
  elFeedbackBtn.textContent = 'LANJUT';
  Object.assign(state, { level:1, score:0, lives:3, target:'', decimalValue:0, cards:[], slots:[], selectedCardId:null, isPlaying:false });
  elStatLevel.textContent = '1';
  elStatScore.textContent = '0';
  elStatTimer.textContent = '--';
  updateLives(3);
  elTimerBar.style.width = '100%';
  elTimerBar.classList.remove('timer-fill--danger');
  elStatTimer.classList.remove('timer-warning');
  elHintCardValue.textContent  = '--';
  elHintCardBinary.textContent = '----';
  elHintCard.classList.remove('is-docked');
  if (elTargetArea) elTargetArea.classList.remove('is-docked');
  elSlotsContainer.innerHTML   = '';
  elCardsContainer.innerHTML   = '';
  resetFlipState();
  elNewRecordBadge.classList.add('d-none');
  toggleControls(false); toggleDiffLock(false);
}

function toggleControls(playing) {
  elBtnShuffle.disabled = !playing;
  elBtnHint.disabled    = !playing || state.flip.used;
  elBtnRestart.disabled = !playing && state.score===0 && state.level===1;
}
function toggleDiffLock(locked) {
  elDiffButtons.forEach(b => b.disabled = locked);
}

/* ---------- DIFFICULTY SELECTOR ---------- */
elDiffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.isPlaying) return;
    elDiffButtons.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.difficulty = btn.dataset.diff;
  });
});

/* ---------- MAIN EVENT LISTENERS ---------- */
elBtnStart.addEventListener('click', () => {
  state.isPlaying = true;
  elBtnStart.disabled   = true;
  elBtnRestart.disabled = false;
  toggleDiffLock(true);
  startLevel(state.level);
});
elBtnRestart.addEventListener('click', () => {
  resetGame();
  state.isPlaying = true;
  elBtnStart.disabled   = true;
  elBtnRestart.disabled = false;
  toggleDiffLock(true);
  startLevel(state.level);
});
elBtnShuffle.addEventListener('click', () => { shuffleArray(state.cards); renderCards(); playSound('cardDrop'); });
elJokerPopup.addEventListener('click', e => { if (e.target===elJokerPopup) closeJokerPopup(); });


/* ---------- HOME SCREEN ---------- */
function showHomeScreen() {
  stopTimer();
  clearFlipTimers();
  closeJokerPopup();
  elFeedbackOverlay.classList.add('d-none');
  renderHighScore();
  elHomeScreen.classList.add('is-visible');
  // sync home diff buttons with current difficulty
  elHomeDiffBtns.forEach(b => b.classList.toggle('is-active', b.dataset.diff === state.difficulty));
  elDiffButtons.forEach(b => b.classList.toggle('is-active', b.dataset.diff === state.difficulty));
}

function hideHomeScreen() {
  elHomeScreen.classList.remove('is-visible');
}

elBtnHome.addEventListener('click', () => {
  // reset game state then show home
  resetGame();
  showHomeScreen();
});

// Home screen difficulty selection (mirrors header buttons)
elHomeDiffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    elHomeDiffBtns.forEach(b => b.classList.remove('is-active'));
    elDiffButtons.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.difficulty = btn.dataset.diff;
    // sync header buttons
    elDiffButtons.forEach(b => b.classList.toggle('is-active', b.dataset.diff === state.difficulty));
  });
});

elHomeStartBtn.addEventListener('click', () => {
  hideHomeScreen();
  state.isPlaying = true;
  elBtnStart.disabled   = true;
  elBtnRestart.disabled = false;
  toggleDiffLock(true);
  startLevel(state.level);
});

/* ---------- INIT ---------- */
(function init() {
  elBtnRestart.disabled = true;
  elBtnShuffle.disabled = true;
  elBtnHint.disabled    = true;
  updateLives(3);
  renderHighScore();
  showHomeScreen();
})();

/* =========================================================
   THEME TOGGLE (dark / light) — persisted via localStorage
   ========================================================= */
(function themeModule() {
  const THEME_KEY = 'bj-theme';
  const root = document.documentElement;
  const toggles = [document.getElementById('btnTheme'), document.getElementById('btnThemeHome')].filter(Boolean);

  function getTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    toggles.forEach(btn => btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false'));
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }
  }
  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
  }

  applyTheme(getTheme(), false); // sync aria-pressed with theme set by inline head script
  toggles.forEach(btn => btn.addEventListener('click', toggleTheme));
})();

/* =========================================================
   DIGITAL RAIN — falling binary 0/1, hacker-casino ambience
   Lightweight canvas animation behind the felt. Colors follow
   the current CSS theme so it stays readable in light mode too.
   ========================================================= */
(function matrixRainModule() {
  const canvas = document.getElementById('matrixRain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, columns, drops, fontSize, rafId;

  function themeColor() {
    return getComputedStyle(root).getPropertyValue('--c-cyan').trim() || '#33ffc2';
  }

  function resize() {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
    fontSize = Math.max(12, Math.min(16, Math.round(window.innerWidth / 70)));
    columns = Math.ceil(width / fontSize);
    drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -40));
  }

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = fontSize + 'px "Space Mono", monospace';
    ctx.fillStyle = themeColor();

    for (let i = 0; i < columns; i++) {
      const char = Math.random() > 0.5 ? '1' : '0';
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillText(char, x, y);
      if (y > height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    rafId = requestAnimationFrame(draw);
  }

  function start() {
    cancelAnimationFrame(rafId);
    resize();
    ctx.clearRect(0, 0, width, height);
    if (!prefersReducedMotion) draw();
  }

  window.addEventListener('resize', () => { resize(); });
  start();
})();