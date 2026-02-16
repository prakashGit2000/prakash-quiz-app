import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let timerInterval;
let questions = [];
let currentQuizId = null;


// ================= AUTH CHECK =================
auth.onAuthStateChanged(async user => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  window.userData = userDoc.data();

  if (window.userData?.attempts?.[currentQuizId] === true) {
  alert("You already attempted this quiz.");
  return;
}



  listenExam(user);
});


// ================= REALTIME EXAM LISTENER =================
function listenExam(user) {

  const examRef = doc(db, "examSessions", "activeExam");

  onSnapshot(examRef, async snap => {

    if (!snap.exists()) {
      examTitle.innerText = "No active exam";
      return;
    }

    const data = snap.data();

    if (
      data.status === "running" &&
      data.allowedStudents?.includes(user.uid)
    ) {
      loadQuiz(user, data.quizId, data.duration);
    }

    if (data.status === "stopped") {
      submitQuiz(user);
    }
  });
}


// ================= LOAD QUIZ =================
async function loadQuiz(user, quizId, duration) {
  
  if (window.userData?.attempts?.[quizId] === true) {
   quiz.innerHTML = "<h2>You already attempted this quiz</h2>";
   return;
}

  currentQuizId = quizId;
  questions = [];
  clearInterval(timerInterval);

  const snap = await getDocs(collection(db, "quizzes", quizId, "questions"));

  let html = "";

  snap.forEach(d => {

    const q = d.data();

    questions.push({
      id: d.id,
      answer: q.answer
    });

    html += `
      <h3>${q.question}</h3>
      <label><input type="radio" name="${d.id}" value="${q.option1}"> ${q.option1}</label><br>
      <label><input type="radio" name="${d.id}" value="${q.option2}"> ${q.option2}</label><br>
      <label><input type="radio" name="${d.id}" value="${q.option3}"> ${q.option3}</label><br>
      <label><input type="radio" name="${d.id}" value="${q.option4}"> ${q.option4}</label><br><br>
    `;
  });

  html += `<button onclick="manualSubmit()">Submit</button>`;

  quiz.innerHTML = html;

  startTimer(user, duration);
}


// ================= TIMER =================
function startTimer(user, minutes) {

  let t = minutes * 60;

  timerInterval = setInterval(() => {

    timer.innerText = `Time Left: ${Math.floor(t / 60)}:${t % 60}`;

    if (--t <= 0) {
      clearInterval(timerInterval);
      submitQuiz(user);
    }

  }, 1000);
}


// ================= MANUAL SUBMIT =================
window.manualSubmit = function () {
  submitQuiz(auth.currentUser);
};


// ================= SUBMIT QUIZ =================
async function submitQuiz(user) {

  if (!user || !currentQuizId) return;

  if (window.userData?.attempts?.[currentQuizId] === true) {
    alert("You already attempted this quiz.");
    return;
  }

  clearInterval(timerInterval);

  let score = 0;

  questions.forEach(q => {
    const ans = document.querySelector(`input[name="${q.id}"]:checked`);
    if (ans && ans.value === q.answer) score++;
  });

  await setDoc(doc(db, "results", `${user.uid}_${currentQuizId}`), {
    userId: user.uid,
    email: user.email,
    quizId: currentQuizId,
    score,
    total: questions.length,
    submittedAt: new Date().toISOString()
  });

  await updateDoc(doc(db, "users", user.uid), {
    [`attempts.${currentQuizId}`]: true,
    status: "submitted"
  });

  if (!window.userData.attempts) {
    window.userData.attempts = {};
  }

  window.userData.attempts[currentQuizId] = true;

  quiz.innerHTML = `
    <h2>Submitted Successfully</h2>
    <h3>Score: ${score}/${questions.length}</h3>
  `;

  setTimeout(() => {
    window.location.href = "index.html";
  }, 5000);
}



// ================= TAB SWITCH DETECTION =================
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    alert("Tab switching is not allowed!");
  }
});
