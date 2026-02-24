# MealOps Firebase Migration Plan

## Context

MealOps is currently a fully local, single-user app with all data in IndexedDB. This plan covers migrating to Firebase so data is stored in Firestore with user authentication, enabling multi-device access and cloud persistence.

The migration is straightforward because **all IndexedDB access is isolated to a single file** (`utils/db.js`) — 10 consumer files import from it, none use IndexedDB directly. The exported function signatures can be preserved so no component changes are needed for the data layer swap.

---

## Decisions

- **Firebase config**: Hardcoded in `utils/firebase.js` (Firebase API keys are public by design; security via Firestore rules)
- **Offline support**: None — online-only (no Firestore persistence layer)
- **Auth method**: Email/Password only

## Prerequisites

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** with Email/Password provider
3. Enable **Cloud Firestore** (start in test mode, then lock down with rules)
4. Copy the Firebase config object (apiKey, authDomain, projectId, etc.)

---

## Step 1: Add Firebase SDK via `utils/firebase.js`

**New file**: `utils/firebase.js`

Import Firebase SDK from CDN URLs directly as ES modules (no build tools needed). Hardcode the Firebase config here.

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.x.x/firebase-app.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, limit, writeBatch, runTransaction } from 'https://www.gstatic.com/firebasejs/11.x.x/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.x.x/firebase-auth.js';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
export { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, limit, writeBatch, runTransaction };
```

All other modules import from `utils/firebase.js` — single source of truth for Firebase.

---

## Step 2: Create Auth UI Component

**New file**: `components/auth-view.js`

A `<auth-view>` web component matching the terminal/hacker aesthetic:

- **Login form**: email + password fields, `[login]` button
- **Signup form**: email + password + confirm, `[register]` button
- **Toggle**: `> switch to register` / `> switch to login`
- **Feedback**: inline `OK: logged in` / `ERROR: invalid credentials` (no modals)
- **Logout**: `[logout]` button in the app header (visible when authenticated)

Auth state management:
- Use `onAuthStateChanged()` listener in `app.js`
- When not authenticated: show only `<auth-view>`, hide nav + all other views
- When authenticated: hide `<auth-view>`, show app as normal
- Store `auth.currentUser.uid` for use in Firestore paths

---

## Step 3: Rewrite `utils/db.js` to Use Firestore

**File**: `utils/db.js` (full rewrite, same exports)

### Firestore Collection Structure

Each user's data lives under `users/{uid}/`:

| IndexedDB Store | Firestore Collection | Document ID |
|---|---|---|
| `recipes` | `users/{uid}/recipes` | UUID (existing `id` field) |
| `servingsLog` | `users/{uid}/servingsLog` | UUID (existing `id` field) |
| `ingredientCache` | `users/{uid}/ingredientCache` | existing `id` field |
| `settings` | `users/{uid}/settings` | `"user-settings"` (single doc) |

### Function-by-Function Mapping

**`open()`** — becomes a no-op (or waits for auth). Returns a resolved promise. Firebase initializes via `utils/firebase.js` import.

**Generic CRUD → Firestore equivalents:**
- `getAll(store)` → `getDocs(collection(db, 'users', uid, store))`
- `getById(store, id)` → `getDoc(doc(db, 'users', uid, store, id))`
- `put(store, item)` → `setDoc(doc(db, 'users', uid, store, item.id), item)`
- `remove(store, id)` → `deleteDoc(doc(db, 'users', uid, store, id))`

**Recipe functions** — same logic, swap IndexedDB calls for Firestore:
- `getAllRecipes()` → query with `where('deleted', '==', false)` (use Firestore query instead of client-side filter)
- `getRecipe(id)` → `getDoc()`
- `saveRecipe(recipe)` → `setDoc()` (same UUID/timestamp logic)
- `deleteRecipe(id)` → read then `setDoc()` with `deleted: true`

**Servings Log functions:**
- `addLogEntry(entry)` → `setDoc()` with UUID generation
- `removeLogEntry(id)` → `deleteDoc()`
- `getLogEntry(id)` → `getDoc()`
- `getLogByRecipe(recipeId)` → `query(where('recipeId', '==', recipeId))`
- `getLogByDate(start, end)` → `query(where('date', '>=', start), where('date', '<=', end))`
- `getConsumptionByDate(start, end)` → `query(where('type', '==', 'consumption'), where('date', '>=', start), where('date', '<=', end))` — needs a composite index on `[type, date]`
- `getInventory(recipeId)` → same aggregation logic, uses `getLogByRecipe()`
- `getAllInventory()` → same aggregation logic, fetches all recipes + all logs

**Cache functions** — same pattern:
- `getCachedIngredient(name)` → `query(where('name', '==', name), limit(1))`
- `cacheIngredient(ingredient)` → `setDoc()`

**Settings functions:**
- `getSettings()` → `getDoc()` with same default fallback
- `saveSettings(settings)` → `setDoc()`
- `updateSettings(fn)` → `runTransaction()` (Firestore transaction replaces IndexedDB transaction for atomic read-modify-write)

**Bulk operations:**
- `getAllRecipesRaw()` → `getDocs()` (no filter)
- `getAllLogEntries()` → `getDocs()`
- `getAllCachedIngredients()` → `getDocs()`
- `bulkPut(store, records)` → `writeBatch()` with multiple `set()` calls (batches limited to 500 docs, chunk if needed)

### Getting the Current User UID

Add a module-level helper:

```js
import { auth } from './firebase.js';

function getUid() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}
```

All collection paths use `getUid()` to scope data per user.

---

## Step 4: Update `app.js` for Auth Flow

**File**: `app.js`

Changes:
1. Import `auth` from `utils/firebase.js` and `onAuthStateChanged` from Firebase Auth
2. Replace `init()` with auth-aware initialization:

```js
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in — show app, start router
    document.getElementById('auth-container').hidden = true;
    document.getElementById('app-content').hidden = false;
    start(); // start the router
  } else {
    // Not signed in — show auth view
    document.getElementById('auth-container').hidden = false;
    document.getElementById('app-content').hidden = true;
  }
});
```

3. Remove the `await open()` call (no longer needed)
4. Add logout button handler in header

---

## Step 5: Update `index.html` Structure

**File**: `index.html`

- Wrap existing app content in a container div that can be hidden
- Add an `<auth-view>` container before the app
- Add `[logout]` button to `<header>`

```html
<div id="auth-container">
  <auth-view></auth-view>
</div>
<div id="app-content" hidden>
  <!-- existing header, main, footer -->
</div>
```

---

## Step 6: Firestore Security Rules

Set up rules so each user can only access their own data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Step 7: Firestore Composite Indexes

Create these indexes (Firebase console or `firestore.indexes.json`):

1. `users/{uid}/servingsLog` — composite index on `[type, date]` (for `getConsumptionByDate`)
2. `users/{uid}/recipes` — single field index on `deleted` (for `getAllRecipes`)

---

## Step 8: Update Import/Export

**File**: `utils/data-io.js`

No changes needed — it already calls the `db.js` API functions (`getAllRecipesRaw`, `bulkPut`, etc.). Once `db.js` is rewritten, import/export will work against Firestore automatically.

---

## Step 9: Update USDA API Key Storage

**File**: `utils/api.js`

No changes needed — it uses `getSettings()` and `updateSettings()` from `db.js`, which will be rewritten to use Firestore. The API key will now be stored per-user in Firestore instead of local IndexedDB.

---

## Files Modified Summary

| File | Change |
|---|---|
| `utils/firebase.js` | **NEW** — Firebase init, exports `db` and `auth` |
| `components/auth-view.js` | **NEW** — Login/signup component |
| `utils/db.js` | **REWRITE** — Swap IndexedDB for Firestore, same exports |
| `app.js` | **MODIFY** — Auth state listener, remove `open()` |
| `index.html` | **MODIFY** — Add Firebase SDK, auth container, logout button |
| `utils/data-io.js` | No changes needed |
| `utils/api.js` | No changes needed |
| All 7 component files | **No changes needed** |

---

## Verification

1. **Auth flow**: Open app → see login screen → register → see app → refresh → still logged in → logout → see login screen
2. **Data isolation**: Log in as user A, create recipe → log out → log in as user B → should see no recipes
3. **All CRUD**: Create recipe, edit, soft-delete, verify it's hidden but data preserved
4. **Eat flow**: Produce servings, consume servings, verify inventory updates
5. **Track flow**: Log consumption, verify daily totals, verify weekly trend
6. **Ad-hoc food**: Log ad-hoc food entry from track view
7. **Import/Export**: Export data, delete some recipes, re-import, verify restore
8. **USDA API**: Set API key in settings, search for ingredient, verify cache works
