import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let questions = [];
let timerInterval;


// ================= REGISTER =================
window.register = async function () {
  const emailVal = email.value;
  const passwordVal = password.value;

  const userCredential = await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    email: emailVal,
    role: "student",
    approved: false,
    attempted: false
  });

  msg.innerText = "Registered. Wait for admin approval.";
};


// ================= LOGIN =================
window.login = async function () {

  const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
  const user = userCredential.user;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const data = userDoc.data();

  if (data.role === "student" && data.approved === false) {
    document.body.innerHTML = "<h3>Waiting for Admin Approval</h3>";
    return;
  }

  if (data.role === "student" && data.attempted === true) {
    document.body.innerHTML = "<h3>You already attempted the quiz</h3>";
    return;
  }

  if (data.role === "admin") loadAdmin();
  else loadQuiz();
};


// ================= ADMIN PANEL =================
async function loadAdmin() {

  let html = "<h2>Admin Dashboard</h2><h3>Pending Students</h3>";

  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(docSnap => {
    const u = docSnap.data();

    if (u.role === "student" && u.approved === false) {
      html += `
        <p>${u.email}
        <button onclick="approveStudent('${docSnap.id}')">Approve</button></p>`;
    }
  });

  html += "<h3>Approved Students</h3>";

  snapshot.forEach(docSnap => {
    const u = docSnap.data();
    if (u.role === "student" && u.approved === true) html += `<p>${u.email} ✅</p>`;
  });

  document.body.innerHTML = html;
}

window.approveStudent = async function (uid) {
  await updateDoc(doc(db, "users", uid), { approved: true });
  alert("Approved");
  loadAdmin();
};


// ================= LOAD QUIZ =================
async function loadQuiz() {

  document.body.innerHTML = "<h2 id='timer'></h2><h3>Loading Quiz...</h3>";

  startTimer(30); // 30 minutes

  const snapshot = await getDocs(collection(db, "quizzes/quiz1/questions"));

  let html = "<h2 id='timer'></h2>";

  snapshot.forEach(docSnap => {
    const q = docSnap.data();
    questions.push({ id: docSnap.id, ...q });

    html += `
      <p><b>${q.question}</b></p>
      <label><input type="radio" name="${docSnap.id}" value="${q.option1}">${q.option1}</label><br>
      <label><input type="radio" name="${docSnap.id}" value="${q.option2}">${q.option2}</label><br>
      <label><input type="radio" name="${docSnap.id}" value="${q.option3}">${q.option3}</label><br>
      <label><input type="radio" name="${docSnap.id}" value="${q.option4}">${q.option4}</label><br><br>
    `;
  });

  html += `<button onclick="submitQuiz()">Submit</button>`;
  document.body.innerHTML = html;
}


// ================= TIMER =================
function startTimer(minutes) {

  let time = minutes * 60;

  timerInterval = setInterval(() => {

    const min = Math.floor(time / 60);
    const sec = time % 60;

    const timerEl = document.getElementById("timer");
    if (timerEl) timerEl.innerText = `Time Left: ${min}:${sec}`;

    time--;

    if (time <= 0) {
      clearInterval(timerInterval);
      submitQuiz();
    }

  }, 1000);
}


// ================= SUBMIT =================
window.submitQuiz = async function () {

  clearInterval(timerInterval);

  let score = 0;

  questions.forEach(q => {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    if (selected && selected.value === q.answer) score++;
  });

  const user = auth.currentUser;

  await setDoc(doc(db, "results", user.uid), {
    email: user.email,
    score: score,
    total: questions.length
  });

  await updateDoc(doc(db, "users", user.uid), { attempted: true });

  document.body.innerHTML = `<h2>Submitted</h2><h3>Score: ${score}/${questions.length}</h3>`;
};
