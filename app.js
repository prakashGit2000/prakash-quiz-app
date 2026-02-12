import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system",
  storageBucket: "prakashsir-quiz-system.firebasestorage.app",
  messagingSenderId: "319414061738",
  appId: "1:319414061738:web:318c9c438e0991f09a9ed3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.login = async function() {
  const email = email.value;
  const password = password.value;

  await signInWithEmailAndPassword(auth, email, password);

  document.body.innerHTML = "<h2>Loading Quiz...</h2>";

  const querySnapshot = await getDocs(collection(db, "quizzes/quiz1/questions"));

  let html = "<h2>Quiz Started</h2>";

  querySnapshot.forEach(doc => {
    const q = doc.data();
    html += `
      <p><b>${q.question}</b></p>
      <label><input type="radio" name="${doc.id}" value="${q.option1}"> ${q.option1}</label><br>
      <label><input type="radio" name="${doc.id}" value="${q.option2}"> ${q.option2}</label><br>
      <label><input type="radio" name="${doc.id}" value="${q.option3}"> ${q.option3}</label><br>
      <label><input type="radio" name="${doc.id}" value="${q.option4}"> ${q.option4}</label><br><br>
    `;
  });

  html += `<button onclick="submitQuiz()">Submit</button>`;
  document.body.innerHTML = html;
}
