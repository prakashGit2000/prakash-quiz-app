// 🔥 Firebase Imports
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


// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let questions = [];


// ==============================
// 🔵 STUDENT REGISTRATION
// ==============================
window.register = async function () {
  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;

  const userCredential = await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    email: emailVal,
    role: "student",
    approved: false
  });

  document.getElementById("msg").innerText =
    "Registered successfully. Wait for admin approval.";
};


// ==============================
// 🔵 LOGIN SYSTEM WITH ROLE CHECK
// ==============================
window.login = async function () {

  const emailVal = document.getElementById("email").value;
  const passwordVal = document.getElementById("password").value;

  const userCredential = await signInWithEmailAndPassword(auth, emailVal, passwordVal);
  const user = userCredential.user;

  const userDoc = await getDoc(doc(db, "users", user.uid));

  if (!userDoc.exists()) {
    document.getElementById("msg").innerText = "User not registered.";
    return;
  }

  const data = userDoc.data();

  if (data.role === "student" && data.approved === false) {
    document.body.innerHTML = "<h3>Waiting for Admin Approval</h3>";
    return;
  }

  if (data.role === "admin") {
    loadAdmin();
  } else {
    loadQuiz();
  }
};


// ==============================
// 🔵 LOAD QUIZ FOR STUDENTS
// ==============================
async function loadQuiz() {

  document.body.innerHTML = "<h2>Loading Quiz...</h2>";

  const snapshot = await getDocs(collection(db, "quizzes/quiz1/questions"));

  questions = [];
  let html = "<h2>Quiz</h2>";

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

  html += `<button onclick="submitQuiz()">Submit Quiz</button>`;
  document.body.innerHTML = html;
}


// ==============================
// 🔵 SUBMIT QUIZ
// ==============================
window.submitQuiz = async function () {

  let score = 0;

  questions.forEach(q => {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    if (selected && selected.value === q.answer) score++;
  });

  const user = auth.currentUser;

  await setDoc(doc(db, "results", user.uid), {
    email: user.email,
    score: score,
    total: questions.length,
    submittedAt: new Date().toISOString()
  });

  document.body.innerHTML = `
    <h2>Quiz Submitted</h2>
    <h3>Your Score: ${score} / ${questions.length}</h3>
  `;
};


// ==============================
// 🔵 ADMIN DASHBOARD
// ==============================
async function loadAdmin() {

  let html = `<h2>Admin Dashboard</h2>
              <h3>Pending Student Approvals</h3>`;

  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(docSnap => {
    const user = docSnap.data();

    if (user.role === "student" && user.approved === false) {
      html += `
        <div style="border:1px solid #ccc;padding:10px;margin:10px;">
          <p>${user.email}</p>
          <button onclick="approveStudent('${docSnap.id}')">Approve</button>
        </div>
      `;
    }
  });

  html += `<h3>Approved Students</h3>`;

  snapshot.forEach(docSnap => {
    const user = docSnap.data();
    if (user.role === "student" && user.approved === true) {
      html += `<p>${user.email} ✅</p>`;
    }
  });

  document.body.innerHTML = html;
}


// ==============================
// 🔵 APPROVE STUDENT FUNCTION
// ==============================
window.approveStudent = async function (uid) {

  await updateDoc(doc(db, "users", uid), {
    approved: true
  });

  alert("Student Approved");
  loadAdmin();
};
