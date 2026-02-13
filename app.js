// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system",
  storageBucket: "prakashsir-quiz-system.appspot.com",
  messagingSenderId: "319414061738",
  appId: "1:319414061738:web:318c9c438e0991f09a9ed3"
};


// ================= INITIALIZE =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let questions = [];
let timerInterval;
let examListener;
let currentQuizId = null;


// ================= REGISTER =================
window.register = async function () {

  const emailVal = email.value.trim();
  const passwordVal = password.value;

  if (!emailVal || !passwordVal) {
    msg.innerText = "Enter email and password.";
    return;
  }

  const allowed = await getDoc(doc(db, "allowedEmails", emailVal));
  if (!allowed.exists()) {
    msg.innerText = "You are not allowed.";
    return;
  }

  try {
    const user = await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
    await sendEmailVerification(user.user);
    msg.innerText = "Verification email sent. Verify before login.";
  } catch (e) {
    msg.innerText = e.message;
  }
};


// ================= LOGIN =================
window.login = async function () {

  try {
    const emailVal = email.value.trim();
    const passwordVal = password.value;

    // ================= ADMIN LOGIN =================
    if (emailVal === "prakash4snu@gmail.com") {

      const userCred = await signInWithEmailAndPassword(auth, emailVal, passwordVal);
      const user = userCred.user;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: "admin",
          createdAt: new Date().toISOString()
        });
      }

      loadAdmin();
      return;
    }

    // ================= STUDENT LOGIN =================
    const allowed = await getDoc(doc(db, "allowedEmails", emailVal));
    if (!allowed.exists()) {
      msg.innerText = "This email is not allowed.";
      return;
    }

    const userCred = await signInWithEmailAndPassword(auth, emailVal, passwordVal);
    const user = userCred.user;

    if (!user.emailVerified) {
      msg.innerText = "Verify email before login.";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().attempted === true) {
      document.body.innerHTML = "<h3>You already attempted this exam</h3>";
      return;
    }

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: user.email,
        role: "student",
        attempted: false,
        createdAt: new Date().toISOString()
      });
    }

    listenExamStatus();

  } catch (e) {
    msg.innerText = "Invalid email or password.";
  }
};


// ================= RESET PASSWORD =================
window.resetPassword = async function () {
  await sendPasswordResetEmail(auth, email.value.trim());
  msg.innerText = "Password reset email sent.";
};


// ================= REALTIME EXAM STATUS =================
function listenExamStatus() {

  const configRef = doc(db, "config", "activeQuiz");

  examListener = onSnapshot(configRef, (snapshot) => {

    if (!snapshot.exists()) {
      document.body.innerHTML = "<h3>Exam not started</h3>";
      return;
    }

    const data = snapshot.data();

    if (data.status === "running") {
      loadQuiz(data.quizId, data.duration);
    } else {
      clearInterval(timerInterval);
      submitQuiz(); // auto submit when admin stops
    }
  });
}


// ================= ADMIN PANEL =================
async function loadAdmin() {

  const quizSnapshot = await getDocs(collection(db, "quizzes"));
  let quizOptions = "";

  quizSnapshot.forEach(docSnap => {
    quizOptions += `<option value="${docSnap.id}">${docSnap.id}</option>`;
  });

  document.body.innerHTML = `
  <h2>Admin Dashboard</h2>

  <h3>Select Quiz</h3>
  <select id="quizSelect">${quizOptions}</select>

  <h3>Duration (minutes)</h3>
  <input id="duration" type="number" placeholder="Enter duration">

  <button onclick="startExam()">Start Exam</button>
  <button onclick="stopExam()">Stop Exam</button>

  <hr>

  <h3>Upload Students Excel</h3>
  <input type="file" id="studentFile">
  <button onclick="uploadStudents()">Upload Students</button>

  <h3>Upload Questions Excel</h3>
  <input type="file" id="questionFile">
  <button onclick="uploadQuestions()">Upload Questions</button>

  <hr>

  <button onclick="downloadResults()">Download Results</button>
  `;
}


// ================= START EXAM =================
window.startExam = async function () {

  const quizId = document.getElementById("quizSelect").value;
  const durationVal = Number(document.getElementById("duration").value);

  if (!quizId || !durationVal || durationVal <= 0) {
    alert("Select quiz and valid duration");
    return;
  }

  await setDoc(doc(db, "config", "activeQuiz"), {
    quizId: quizId,
    duration: durationVal,
    status: "running",
    startedAt: new Date().toISOString()
  });

  alert("Exam Started");
};


// ================= STOP EXAM =================
window.stopExam = async function () {
  await updateDoc(doc(db, "config", "activeQuiz"), { status: "stopped" });
  alert("Exam Stopped");
};


// ================= LOAD QUIZ =================
async function loadQuiz(quizId, duration) {

  clearInterval(timerInterval);
  questions = [];
  currentQuizId = quizId;

  document.body.innerHTML = `<h2 id="timer"></h2><div id="quiz"></div>`;

  startTimer(duration);

  const snap = await getDocs(collection(db, "quizzes", quizId, "questions"));

  let html = "";

  snap.forEach(d => {
    const q = d.data();

    questions.push({
      id: d.id,
      answer: q.answer
    });

    html += `
    <p><b>${q.question}</b></p>
    <label><input type="radio" name="${d.id}" value="${q.option1}"> ${q.option1}</label><br>
    <label><input type="radio" name="${d.id}" value="${q.option2}"> ${q.option2}</label><br>
    <label><input type="radio" name="${d.id}" value="${q.option3}"> ${q.option3}</label><br>
    <label><input type="radio" name="${d.id}" value="${q.option4}"> ${q.option4}</label><br><br>
    `;
  });

  html += `<button onclick="submitQuiz()">Submit</button>`;
  document.getElementById("quiz").innerHTML = html;
}


// ================= TIMER =================
function startTimer(minutes) {

  let t = minutes * 60;

  timerInterval = setInterval(() => {

    timer.innerText = `Time Left: ${Math.floor(t / 60)}:${t % 60}`;

    if (--t <= 0) {
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
    const ans = document.querySelector(`input[name="${q.id}"]:checked`);
    if (ans && ans.value === q.answer) score++;
  });

  await setDoc(doc(db, "results", auth.currentUser.uid), {
    email: auth.currentUser.email,
    quizId: currentQuizId,
    score,
    total: questions.length,
    submittedAt: new Date().toISOString()
  });

  await updateDoc(doc(db, "users", auth.currentUser.uid), { attempted: true });

  document.body.innerHTML = `
  <h2>Test Submitted Successfully</h2>
  <h3>Score: ${score}/${questions.length}</h3>
  `;
};


// ================= DOWNLOAD RESULTS =================
window.downloadResults = async function () {

  const snap = await getDocs(collection(db, "results"));
  const rows = [["Email", "Quiz", "Score", "Total"]];

  snap.forEach(d => {
    const r = d.data();
    rows.push([r.email, r.quizId, r.score, r.total]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "results.xlsx");
};
