import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAimevmeh9z0Fb1oL4uW-909o193UrHkfc",
  authDomain: "employmenteam-27b07.firebaseapp.com",
  projectId: "employmenteam-27b07",
  storageBucket: "employmenteam-27b07.firebasestorage.app",
  messagingSenderId: "733859242959",
  appId: "1:733859242959:web:60b2ba6ccafad85876e8ba"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
