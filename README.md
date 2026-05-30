# 🍲 Family Recipes

A warm, beautiful shared cookbook for you and your mom. Store all your recipes
in one place, scale any dish up or down with a tap, and cook with Michelin-level
pro tips on every page.

No build tools, no database, no monthly bill — just three files that run
anywhere, including **free GitHub Pages**.

## ✨ What it does

- **Shared cookbook** — your recipes and Mom's, side by side, filterable by who made them.
- **Smart categories** — Appetizer, Main, Side, Soup, Salad, Dessert, Breakfast, Bread, Drink, Sauce.
- **Quantity scaler** — change the servings (or hit ½× / 1× / 2× / 3×) and every
  ingredient amount re-calculates instantly, shown as pretty fractions (¾, 1 ½, ⅓ …).
- **Smart unit converter** — flip any recipe between **As written / Metric / US-Imperial**.
  Grams ↔ oz ↔ lb, ml ↔ fl oz ↔ cup ↔ qt ↔ L, tsp ↔ tbsp — it picks sensible units
  and leaves "4 cloves garlic" alone. Works together with scaling.
- **Multi-phase recipes** — big project recipes (a pasta with its own dough, filling
  and sauce) are shown as numbered parts, each with its own ingredients and method.
- **Michelin pro tips** — each recipe carries a few chef's-secret tips that make it restaurant-quality.
- **Apple Notes import** — paste a recipe straight from Notes (simple *or* multi-phase
  with "Phase 1: …", "Ingredients", "The Execution") and it's auto-parsed, splitting
  amounts/units, grouping parts, and pulling out any "Pro Tip:" lines.
- **✨ Generate AI prompt** — one click builds a prompt you can paste into ChatGPT/Claude
  that cleans up the recipe **and adds Michelin-level pro tips**, then hands back a
  ready-to-paste block.
- **Search** — by recipe name *or* ingredient.
- **Favorites** — heart the ones you want to make (saved in your browser).
- **Saved links** — keep a board of recipes from around the web you both want to try.
- **Light & dark** — a cosy cream cookbook by day, warm charcoal by night.
- **Print** — clean print layout for taping to the fridge.
- **Made for cooking on your phone** — big tap targets, readable text, a sticky
  ingredient panel that stays in view while you scroll the method.

## 📁 The files

| File | What's in it |
|------|--------------|
| `index.html` | The page shell + fonts |
| `styles.css` | All the design (warm editorial cookbook theme) |
| `app.js`     | All the behavior (router, scaler, converter, importer, export, Firebase) |
| `data.js`    | The starter recipes (used in local mode, and as a fallback) |
| `firebase-config.js` | **Paste your Firebase web config here** to turn on live cloud saving (optional) |

## 🔒 Passcode lock

The whole site is behind a passcode (**1948**). Visitors see only a lock screen
until they enter it; the recipe content and scripts aren't even loaded until then.
Once entered, the device stays unlocked. The same passcode also authorises adding
recipes, so you only type it once.

- The passcode is stored in `gate.js` **only as a SHA-256 hash** (not plain text).
- To change it: in any browser console run
  `crypto.subtle.digest('SHA-256', new TextEncoder().encode('NEWCODE')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))`
  then paste the result into `PASSCODE_HASH` in `gate.js`, and set `FAMILY_PASSCODE`
  in `firebase-config.js` to the same new code.

> ⚠️ **What this does and doesn't do.** This is a static site, so the lock is a
> strong *privacy* gate for anyone who finds the link — but it's client-side, so a
> determined technical person could bypass the UI. For true protection of the recipe
> *data*, enable **Firebase Authentication** and require `request.auth != null` in the
> Firestore rules (see below). For a family cookbook, the passcode is usually plenty.

## 🔥 Two ways to run

**Local mode (default, zero setup)** — recipes live in `data.js`, committed to GitHub.
Great for trying it out. To add a recipe you commit a block to `data.js`.

**Cloud mode (recommended for you + Mom)** — turn on Firebase and you can add a recipe
right from the website with one click and it saves instantly for both of you. See below.

## ⭐ The easiest way to add a recipe (AI prompt)

1. Open the site → **Add recipe** → **✨ AI Prompt** tab.
2. (Optional) paste your messy recipe text, then **Build my AI Prompt** → **Copy AI Prompt**.
3. Paste it into **ChatGPT / Claude / Gemini** (with your recipe if you didn't include it).
   The prompt tells the AI to keep **every** ingredient and step and to add **spectacular
   Michelin-level pro tips**, then return clean **JSON**.
4. Copy the JSON the AI gives back → **Add recipe → Paste AI JSON** → **Check & preview**.
5. In cloud mode: **Save to cookbook** (done!). In local mode: **Generate block for data.js**,
   copy it, paste after `const RECIPES = [`, commit.

## 📤 Exporting a recipe (TXT / PDF)

On any recipe page, click **Export ▾**:
- **Save as .txt** — a clean text file you can paste into Apple Notes.
- **Save as PDF** — opens a beautifully formatted print view; choose “Save as PDF”.
- **Copy as text** — copies the formatted recipe to your clipboard.

## ➕ How to add a recipe (the easy way)

1. Open the website and click **Add recipe**.
2. Either fill in the form, **or** click *Paste from Apple Notes* and paste your note.
3. Click **Generate recipe block** and hit **Copy**.
4. Open `data.js` on GitHub (click the pencil ✏️ to edit), and paste the block
   right after the line `const RECIPES = [`.
5. **Commit**. GitHub Pages rebuilds in a few seconds — it's live for both of you. ✨

> Not into editing files? Just send the copied block to whoever manages the repo.
> It contains everything needed.

### Importing from Apple Notes

On your iPhone or Mac, open the note → select all → copy → paste into the
importer. It figures out:

- the **title** (first line),
- **ingredients** (under a line like `Ingredients`, splitting `2 cups flour` into amount/unit/item),
- **steps** (under `Instructions` / `Method` / `Steps`, or any numbered list),
- **tips** (after `Tip:` / `Tips` / `Notes`).

You can fix anything in the preview before saving.

## 🖼️ Adding photos

Leave the photo blank and you get a tasteful placeholder. To add a real photo:

1. Drop the image into an `images/` folder in this repo.
2. In the recipe, set the photo to `images/your-photo.jpg`.

(Or paste any public image URL.)

## 🔥 Turning on Firebase (cloud saving) — one time

> ⚠️ **Security:** only ever use the **Web app config** (the public one with
> `apiKey`, `projectId`, …). **Never** put a Firebase **Admin SDK / service-account
> key** in this website — it has full access to your project and the site is public.
> If you've ever shared an admin key, regenerate it in the Firebase console.

1. In the [Firebase console](https://console.firebase.google.com/): create a project
   (you already have `foodproject-4470e`).
2. **Build → Firestore Database → Create database** (start in *production mode*).
3. **⚙ Project settings → Your apps → Web app (`</>`)** → register an app → copy the
   `firebaseConfig` object it shows.
4. Open **`firebase-config.js`** in this repo and paste your values over the
   `PASTE_…` placeholders.
5. Set **`FAMILY_PASSCODE`** in the same file to a word you and Mom will share. Everyone
   can view recipes; only someone who types this passcode (once per device) can add/edit.
6. Add these **Firestore security rules** (Firestore → Rules → publish):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /recipes/{id} {
         allow read: if true;            // anyone can view the cookbook
         allow write: if true;           // writes are gated by the app passcode
       }
     }
   }
   ```

   This lets anyone read, and allows writes (the website asks for your family passcode
   before saving). For stronger protection, switch to **Google sign-in** later and change
   `allow write: if request.auth != null;`.

7. Commit and deploy. The site detects the config and switches to **cloud mode** —
   your starter recipes still show until you add your own, then the cloud takes over.

That's it: open the site, **Add recipe**, save, and it appears for both of you live.

## 🚀 Deploy to GitHub Pages (one time, ~2 minutes)

1. Create a new repository on GitHub (e.g. `family-recipes`).
2. Upload these files (`index.html`, `styles.css`, `app.js`, `data.js`,
   `firebase-config.js`, `README.md`) — drag-and-drop works on github.com →
   **Add file → Upload files**.
3. Go to **Settings → Pages**.
4. Under *Build and deployment*, set **Source: Deploy from a branch**,
   **Branch: `main`**, **Folder: `/ (root)`**, then **Save**.
5. Wait ~1 minute. Your cookbook is live at:
   `https://<your-username>.github.io/family-recipes/`

Share that link with your mom and you're both cooking. 🧑‍🍳

## 🔗 Sharing favorites & links between the two of you

Favorites and quick-saved links are stored per-device (in the browser), so they're
private to each of you. To **permanently share** a web link with each other, add it
to the `LINKS` array in `data.js` (same idea as recipes) and commit — then it shows
up for both of you, forever.

## 🛠️ Run it locally (optional)

```bash
# from this folder
python3 -m http.server 8000
# then open http://localhost:8000
```

---

Made with love, scaled with math.
