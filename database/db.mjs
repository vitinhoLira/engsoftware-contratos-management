import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
config();

const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } = process.env;

const firebaseConfig = {
    apiKey: "AIzaSyCA4fAKxNjsD8s6Srf3LPp2Jy-5UEwPUfs",
    authDomain: "estagios-eng-software-mvp.firebaseapp.com",
    projectId: "estagios-eng-software-mvp",
    storageBucket: "estagios-eng-software-mvp.firebasestorage.app",
    messagingSenderId: "731429483546",
    appId: "1:731429483546:web:d3a02076b8e080ef85cda3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);