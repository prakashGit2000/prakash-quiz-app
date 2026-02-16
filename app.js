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
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.register = async function() {

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  const allowed = await getDoc(doc(db,"allowedEmails",email));

  if(!allowed.exists()){
    msg.innerText="Email not allowed.";
    return;
  }

  try{
    const user = await createUserWithEmailAndPassword(auth,email,password);
    await sendEmailVerification(user.user);
    msg.innerText="Verification email sent.";
  }catch(e){
    msg.innerText=e.message;
  }
};

window.login = async function(){

  try{

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const userCred = await signInWithEmailAndPassword(auth,email,password);
    const user = userCred.user;

    const userRef = doc(db,"users",user.uid);
    const userDoc = await getDoc(userRef);

    if(!userDoc.exists()){
      await setDoc(userRef,{
        email:user.email,
        role:(user.email==="prakash4snu@gmail.com")?"admin":"student",
        status:"online",
        attempted:false
      });
    }

    const role = (await getDoc(userRef)).data().role;

    if(role==="admin"){
      window.location.href="admin.html";
    }else{
      if(!user.emailVerified){
        msg.innerText="Verify email first.";
        return;
      }
      window.location.href="student.html";
    }

  }catch(e){
    msg.innerText="Invalid login.";
  }
};

window.resetPassword = async function(){
  await sendPasswordResetEmail(auth,email.value.trim());
  msg.innerText="Password reset email sent.";
};
