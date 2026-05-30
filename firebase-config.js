/* =========================================================================
   FIREBASE CONFIG  —  paste your WEB app config below.
   -------------------------------------------------------------------------
   ⚠️  Use the WEB SDK config (the public one), NOT the Admin SDK service
       account key. The web config is SAFE to commit to a public repo — it's
       designed to be public and is protected by Firestore security rules.
       NEVER put a service-account / admin key in this file.

   WHERE TO GET IT:
     Firebase console → ⚙ Project settings → "Your apps" → Web app (</>)
     → "SDK setup and configuration" → Config. Copy the object it shows.

   HOW TO TURN FIREBASE ON:
     1. Paste your config into FIREBASE_CONFIG below (replace the placeholder).
     2. Set FAMILY_PASSCODE to a word/phrase you and Mom will share.
     3. Add the Firestore security rules from the README.
     That's it — the site detects the config and switches to live cloud mode.

   If you leave the placeholder as-is, the site runs in LOCAL mode using the
   recipes in data.js (no cloud) — everything still works for trying it out.
   ========================================================================= */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBtx_w6mtCZ0BP_wH3hax8Twhl-8vpKwaE",
  authDomain:        "foodproject-4470e.firebaseapp.com",
  projectId:         "foodproject-4470e",
  storageBucket:     "foodproject-4470e.firebasestorage.app",
  messagingSenderId: "43453846189",
  appId:             "1:43453846189:web:17116a9de392f1175f2c24",
  measurementId:     "G-41ZV18PCPC",
};

// A simple shared passcode that unlocks "Add / Edit". Everyone can VIEW;
// only people who type this once (per device) can save recipes.
// Change it to whatever you and Mom agree on.
const FAMILY_PASSCODE = "family";
