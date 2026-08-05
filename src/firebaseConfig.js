import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDnTprZv08X1WzjLPzCJeBUPLk2UHE_LHk",
  authDomain: "petiary-dev.firebaseapp.com",
  projectId: "petiary-dev",
  storageBucket: "petiary-dev.firebasestorage.app",
  messagingSenderId: "1095114770746",
  appId: "1:1095114770746:web:4990078ee70aa98ec6e803"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
