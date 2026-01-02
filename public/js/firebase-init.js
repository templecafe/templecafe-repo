if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();
const firestore = firebase.firestore();