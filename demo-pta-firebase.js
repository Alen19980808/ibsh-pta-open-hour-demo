/**
 * Minimal Firebase-compatible module for the independent PTA portfolio demo.
 * Data is fictional and shared by index.html/admin.html through localStorage.
 */
const KEY = 'ibsh_pta_open_hour_demo_v2';
const listeners = new Set();
const authListeners = new Set();
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const isAdminPage = /(?:^|\/)admin\.html$/.test(location.pathname);

function dateOffset(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('sv-SE');
}
function seed() {
  const teacherPath = 'artifacts/ibsh-pta-v2/public/data/teachers';
  const bookingsPath = 'artifacts/ibsh-pta-v2/private_bookings';
  const profilesPath = 'artifacts/ibsh-pta-v2/private_profiles';
  const configCollectionPath = 'artifacts/ibsh-pta-v2/public';
  const logsPath = 'artifacts/ibsh-pta-v2/system_logs';
  const collections = {};
  collections[teacherPath] = {
    'teacher-alex': { name: 'Alex Rivera', email: 'alex.teacher@demo.local', subject: 'Math', location: 'Room D201', mascot: 0, note: 'Supports families with math learning plans and study routines.' },
    'teacher-mina': { name: 'Mina Park', email: 'mina.teacher@demo.local', subject: 'English, Middle School Humanities', location: 'Room D305', mascot: 2, note: 'Happy to discuss reading, writing, and class participation.' },
    'teacher-owen': { name: 'Owen Brooks', email: 'owen.teacher@demo.local', subject: 'Science', location: 'Science Lab 2', mascot: 5, note: 'Bring questions about lab work, projects, or learning support.' },
    'teacher-lena': { name: 'Lena Wu', email: 'lena.teacher@demo.local', subject: 'Chinese', location: 'Room C104', mascot: 15, note: 'Available for language progress and home-practice conversations.' },
  };
  const slots = (teacherId, rows) => { collections[`${teacherPath}/${teacherId}/slots`] = Object.fromEntries(rows.map((row, index) => [`slot-${index + 1}`, row])); };
  slots('teacher-alex', [
    { date: dateOffset(4), time: '09:00–09:15', status: 'available' },
    { date: dateOffset(4), time: '09:20–09:35', status: 'available' },
    { date: dateOffset(6), time: '13:30–13:45', status: 'available' },
  ]);
  slots('teacher-mina', [
    { date: dateOffset(5), time: '10:00–10:15', status: 'booked', bookingRef: 'booking-demo-1' },
    { date: dateOffset(5), time: '10:20–10:35', status: 'available' },
    { date: dateOffset(7), time: '14:00–14:15', status: 'available' },
  ]);
  slots('teacher-owen', [
    { date: dateOffset(4), time: '11:00–11:15', status: 'available' },
    { date: dateOffset(6), time: '11:20–11:35', status: 'available' },
  ]);
  slots('teacher-lena', [
    { date: dateOffset(5), time: '15:00–15:15', status: 'available' },
    { date: dateOffset(7), time: '15:20–15:35', status: 'available' },
  ]);
  collections[bookingsPath] = {
    'booking-demo-1': {
      uid: 'demo-parent-uid', teacherId: 'teacher-mina', teacherName: 'Mina Park', teacherEmail: 'mina.teacher@demo.local',
      location: 'Room D305', slotId: 'slot-1', slotTime: '10:00–10:15', slotDate: dateOffset(5),
      student: 'Avery Chen', grade: '10A', childId: 'child-avery', parent: 'Jamie Chen', parentId: 'parent-jamie',
      parentRelation: 'Parent', email: 'family@demo.local', message: 'Reading progress and next steps.', sendReminder: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  };
  collections[profilesPath] = {
    'family@demo.local': {
      email: 'family@demo.local',
      children: [
        { id: 'child-avery', name: 'Avery Chen', grade: '10A', notes: 'Fictional demo profile' },
        { id: 'child-noah', name: 'Noah Chen', grade: '8B', notes: '' },
      ],
      parents: [{ id: 'parent-jamie', name: 'Jamie Chen', relation: 'Parent' }],
      createdAt: new Date(Date.now() - 604800000).toISOString(),
    },
  };
  collections[configCollectionPath] = {
    system_settings: {
      start: new Date(Date.now() - 3600000).toISOString(),
      end: new Date(Date.now() + 30 * 86400000).toISOString(),
      announcement: 'Welcome to the portfolio demo. All people and bookings shown here are fictional.\nTry adding a family member or reserving an available teacher slot.',
      backendNotice: 'Portfolio demo mode · No emails are sent and no production services are connected.',
      gasUrl: '',
      customSubjects: ['A&T', 'Chinese', 'CSS & WSS', 'English', 'Middle School Humanities', 'Elementary', 'Math', 'PE', 'Science'],
    },
  };
  collections[logsPath] = {
    'log-demo-1': { action: 'Booking Created', details: 'Demo family booked Mina Park.', userEmail: 'family@demo.local', timestamp: new Date().toISOString(), timestampMs: Date.now() },
  };
  return { version: 2, collections, assets: {} };
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved && saved.version === 2 ? saved : seed();
  } catch (_) { return seed(); }
}
let store = load();
function persist() { localStorage.setItem(KEY, JSON.stringify(store)); }
function ensureCollection(path) { store.collections[path] = store.collections[path] || {}; return store.collections[path]; }
function autoId() { return 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function collection(_db, path) { return { kind: 'collection', path: String(path) }; }
function doc(first, second, third) {
  if (first && first.kind === 'collection') return { kind: 'document', collectionPath: first.path, id: second == null ? autoId() : String(second) };
  const full = third == null ? String(second) : String(second) + '/' + String(third);
  const cut = full.lastIndexOf('/');
  return { kind: 'document', collectionPath: full.slice(0, cut), id: full.slice(cut + 1) };
}
function documentSnapshot(ref) {
  const value = ensureCollection(ref.collectionPath)[ref.id];
  return { id: ref.id, exists: () => value !== undefined, data: () => clone(value) };
}
function collectionSnapshot(ref) {
  let entries = Object.entries(ensureCollection(ref.path));
  (ref.filters || []).forEach(filter => { entries = entries.filter(([, value]) => value && value[filter.field] === filter.value); });
  if (ref.orderField) entries.sort((a, b) => Number(b[1][ref.orderField] || 0) - Number(a[1][ref.orderField] || 0));
  if (ref.max) entries = entries.slice(0, ref.max);
  const docs = entries.map(([id, value]) => ({ id, data: () => clone(value), ref: { kind: 'document', collectionPath: ref.path, id } }));
  return { docs, empty: docs.length === 0, size: docs.length, forEach: callback => docs.forEach(callback) };
}
function snapshot(ref) { return ref.kind === 'document' ? documentSnapshot(ref) : collectionSnapshot(ref); }
function notify() {
  persist();
  listeners.forEach(item => {
    try { item.next(snapshot(item.ref)); } catch (error) { if (item.error) item.error(error); }
  });
}
function applyMerge(current, value) { return { ...(current || {}), ...clone(value || {}) }; }
async function getDoc(ref) { return documentSnapshot(ref); }
async function getDocs(ref) { return collectionSnapshot(ref); }
async function setDoc(ref, value, options) { ensureCollection(ref.collectionPath)[ref.id] = options && options.merge ? applyMerge(ensureCollection(ref.collectionPath)[ref.id], value) : clone(value); notify(); }
async function updateDoc(ref, value) { ensureCollection(ref.collectionPath)[ref.id] = applyMerge(ensureCollection(ref.collectionPath)[ref.id], value); notify(); }
async function deleteDoc(ref) { delete ensureCollection(ref.collectionPath)[ref.id]; notify(); }
async function addDoc(ref, value) { const target = doc(ref); await setDoc(target, value); return target; }
function onSnapshot(ref, next, error) { const item = { ref, next, error }; listeners.add(item); setTimeout(() => next(snapshot(ref)), 0); return () => listeners.delete(item); }
function where(field, op, value) { return { type: 'where', field, op, value }; }
function orderBy(field) { return { type: 'order', field }; }
function limit(max) { return { type: 'limit', max }; }
function query(base, ...constraints) {
  const ref = { ...base, filters: [...(base.filters || [])] };
  constraints.forEach(rule => {
    if (rule.type === 'where' && rule.op === '==') ref.filters.push(rule);
    if (rule.type === 'order') ref.orderField = rule.field;
    if (rule.type === 'limit') ref.max = rule.max;
  });
  return ref;
}
async function runTransaction(_db, handler) {
  const tx = {
    get: getDoc,
    set(ref, value, options) { ensureCollection(ref.collectionPath)[ref.id] = options && options.merge ? applyMerge(ensureCollection(ref.collectionPath)[ref.id], value) : clone(value); },
    update(ref, value) { ensureCollection(ref.collectionPath)[ref.id] = applyMerge(ensureCollection(ref.collectionPath)[ref.id], value); },
    delete(ref) { delete ensureCollection(ref.collectionPath)[ref.id]; },
  };
  const result = await handler(tx); notify(); return result;
}
function writeBatch() {
  const jobs = [];
  return {
    set: (ref, value, options) => jobs.push(() => { ensureCollection(ref.collectionPath)[ref.id] = options && options.merge ? applyMerge(ensureCollection(ref.collectionPath)[ref.id], value) : clone(value); }),
    update: (ref, value) => jobs.push(() => { ensureCollection(ref.collectionPath)[ref.id] = applyMerge(ensureCollection(ref.collectionPath)[ref.id], value); }),
    delete: ref => jobs.push(() => { delete ensureCollection(ref.collectionPath)[ref.id]; }),
    commit: async () => { jobs.forEach(job => job()); notify(); },
  };
}

function makeUser() {
  const email = isAdminPage ? 'demo-admin@demo.local' : null;
  return {
    uid: isAdminPage ? 'demo-admin-uid' : 'demo-parent-uid', email, isAnonymous: !isAdminPage,
    getIdTokenResult: async () => ({ claims: { verifiedEmail: isAdminPage ? null : 'family@demo.local' } }),
  };
}
const auth = { currentUser: makeUser() };
function initializeApp() { return {}; }
function getFirestore() { return {}; }
function getAuth() { return auth; }
function onAuthStateChanged(_auth, callback) { authListeners.add(callback); setTimeout(() => callback(auth.currentUser), 0); return () => authListeners.delete(callback); }
async function signInAnonymously() { auth.currentUser = makeUser(); authListeners.forEach(cb => cb(auth.currentUser)); return { user: auth.currentUser }; }
async function signInWithPopup() { auth.currentUser = makeUser(); authListeners.forEach(cb => cb(auth.currentUser)); return { user: auth.currentUser }; }
async function signOut() { auth.currentUser = null; authListeners.forEach(cb => cb(null)); }
class GoogleAuthProvider {}

function getStorage() { return {}; }
function ref(_storage, path) { return { path: String(path) }; }
async function uploadString(assetRef, dataUrl) { store.assets[assetRef.path] = dataUrl; persist(); return assetRef; }
async function getDownloadURL(assetRef) { return store.assets[assetRef.path] || ''; }
async function deleteObject(assetRef) { delete store.assets[assetRef.path]; persist(); }

window.resetPTADemo = function () {
  store = seed();
  localStorage.removeItem('pta_teachers');
  localStorage.removeItem('pta_teachers_ts');
  localStorage.setItem('pta_verified_email', 'family@demo.local');
  notify();
  location.reload();
};

export {
  initializeApp, getFirestore, doc, collection, addDoc, setDoc, deleteDoc, getDoc, getDocs, onSnapshot,
  runTransaction, query, where, updateDoc, writeBatch, orderBy, limit,
  getAuth, signOut, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  getStorage, ref, uploadString, getDownloadURL, deleteObject,
};
