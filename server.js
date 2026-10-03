const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

// Render-এর Environment Variable থেকে সিক্রেট ডাটা লোড করা
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

async function fetchAndSaveData(apiURL, collectionName) {
  try {
    const response = await axios.get(apiURL + '?ts=' + Date.now(), {
      timeout: 3000
    });
    const data = response.data;

    if (!data.data || !Array.isArray(data.data.list)) return;

    const latestItems = data.data.list.slice(0, 5);

    for (const item of latestItems) {
      const issueNumber = String(item.issueNumber);
      const num = Number.parseInt(item.number, 10);

      if (!Number.isInteger(num) || num < 0 || num > 9) continue;

      const size = num >= 5 ? 'Big' : 'Small';
      let color;
      if ([1, 3, 7, 9].includes(num)) color = 'green';
      else if ([2, 4, 6, 8].includes(num)) color = 'red';
      else color = 'violet';

      const docRef = db.collection(collectionName).doc(issueNumber);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        await docRef.set({
          issueNumber: issueNumber,
          number: num,
          size: size,
          color: color,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Saved [${collectionName}]: ${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error in [${collectionName}]:`, error.message);
  }
}

// প্রতি ৪ সেকেন্ড পর পর রান করবে
setInterval(() => {
  fetchAndSaveData('https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json', 'history_30s');
  fetchAndSaveData('https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json', 'history_1m');
}, 4000);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
