import { 
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, getDocFromServer 
} from 'firebase/firestore';
import { db, handleFirestoreError, isOfflineOrTimeoutError, OperationType } from './firebase';
import { Section, Service, Review, ContactInfo, Reel, Lead } from '../types';
import { 
  INITIAL_SECTIONS, 
  INITIAL_SERVICES, 
  INITIAL_REVIEWS, 
  DEFAULT_CONTACTS,
  INITIAL_REELS
} from '../data';

const STORAGE_KEYS = {
  sections: 'lazertag_sections',
  services: 'lazertag_services',
  reviews: 'lazertag_reviews',
  contacts: 'lazertag_contacts',
  reels: 'lazertag_reels',
  leads: 'lazertag_leads',
} as const;

let firestoreOnline = true;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && (!Array.isArray(parsed) || parsed.length === 0)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firestore timeout'));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Helper to recursively strip `undefined` properties which cause Firestore setDoc() to throw
function cleanData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanData(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = cleanData(value);
    }
  }
  return cleaned as T;
}

// Validate Connection on Boot with fast timeout so offline clients don't hang
export async function testFirestoreConnection() {
  try {
    await withTimeout(getDocFromServer(doc(db, 'config', 'contacts')), 2500);
    firestoreOnline = true;
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) {
      firestoreOnline = false;
    }
  }
}

// --- Sections DB Sync ---
export async function getSections(): Promise<Section[]> {
  const localSections = readLocal<Section[]>(STORAGE_KEYS.sections, INITIAL_SECTIONS);
  if (!firestoreOnline) return localSections;

  const colPath = 'sections';
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, colPath)));
    if (querySnapshot.empty) {
      for (const sec of localSections) {
        try {
          await withTimeout(setDoc(doc(db, colPath, sec.id), cleanData(sec)), 2000);
        } catch {
          break;
        }
      }
      writeLocal(STORAGE_KEYS.sections, localSections);
      return localSections;
    }
    const sectionsList: Section[] = [];
    querySnapshot.forEach((docSnap) => {
      sectionsList.push(docSnap.data() as Section);
    });
    const orderMap = INITIAL_SECTIONS.reduce((acc, sec, idx) => {
      acc[sec.id] = idx;
      return acc;
    }, {} as Record<string, number>);
    const sorted = sectionsList.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));
    writeLocal(STORAGE_KEYS.sections, sorted);
    return sorted;
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.LIST, colPath);
    return localSections;
  }
}

export async function saveSection(section: Section): Promise<void> {
  const current = readLocal<Section[]>(STORAGE_KEYS.sections, INITIAL_SECTIONS);
  const exists = current.some(s => s.id === section.id);
  const updated = exists
    ? current.map(s => (s.id === section.id ? section : s))
    : [...current, section];
  writeLocal(STORAGE_KEYS.sections, updated);

  if (!firestoreOnline) return;
  const path = `sections/${section.id}`;
  try {
    await withTimeout(setDoc(doc(db, 'sections', section.id), cleanData(section)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSection(id: string): Promise<void> {
  const current = readLocal<Section[]>(STORAGE_KEYS.sections, INITIAL_SECTIONS);
  writeLocal(STORAGE_KEYS.sections, current.filter(s => s.id !== id));

  if (!firestoreOnline) return;
  const path = `sections/${id}`;
  try {
    await withTimeout(deleteDoc(doc(db, 'sections', id)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Services DB Sync ---
export async function getServices(): Promise<Service[]> {
  const localServices = readLocal<Service[]>(STORAGE_KEYS.services, INITIAL_SERVICES);
  if (!firestoreOnline) return localServices;

  const colPath = 'services';
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, colPath)));
    if (querySnapshot.empty) {
      for (const srv of localServices) {
        try {
          await withTimeout(setDoc(doc(db, colPath, srv.id), cleanData(srv)), 2000);
        } catch {
          break;
        }
      }
      writeLocal(STORAGE_KEYS.services, localServices);
      return localServices;
    }
    const servicesList: Service[] = [];
    querySnapshot.forEach((docSnap) => {
      servicesList.push(docSnap.data() as Service);
    });
    writeLocal(STORAGE_KEYS.services, servicesList);
    return servicesList;
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.LIST, colPath);
    return localServices;
  }
}

export async function saveService(service: Service): Promise<void> {
  const current = readLocal<Service[]>(STORAGE_KEYS.services, INITIAL_SERVICES);
  const exists = current.some(s => s.id === service.id);
  const updated = exists
    ? current.map(s => (s.id === service.id ? service : s))
    : [service, ...current];
  writeLocal(STORAGE_KEYS.services, updated);

  if (!firestoreOnline) return;
  const path = `services/${service.id}`;
  try {
    await withTimeout(setDoc(doc(db, 'services', service.id), cleanData(service)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteService(id: string): Promise<void> {
  const current = readLocal<Service[]>(STORAGE_KEYS.services, INITIAL_SERVICES);
  writeLocal(STORAGE_KEYS.services, current.filter(s => s.id !== id));

  if (!firestoreOnline) return;
  const path = `services/${id}`;
  try {
    await withTimeout(deleteDoc(doc(db, 'services', id)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Reviews DB Sync ---
export async function getReviews(): Promise<Review[]> {
  const localReviews = readLocal<Review[]>(STORAGE_KEYS.reviews, INITIAL_REVIEWS);
  if (!firestoreOnline) return localReviews;

  const colPath = 'reviews';
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, colPath)));
    if (querySnapshot.empty) {
      for (const rev of localReviews) {
        try {
          await withTimeout(setDoc(doc(db, colPath, rev.id), cleanData(rev)), 2000);
        } catch {
          break;
        }
      }
      writeLocal(STORAGE_KEYS.reviews, localReviews);
      return localReviews;
    }
    const reviewsList: Review[] = [];
    querySnapshot.forEach((docSnap) => {
      reviewsList.push(docSnap.data() as Review);
    });
    writeLocal(STORAGE_KEYS.reviews, reviewsList);
    return reviewsList;
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.LIST, colPath);
    return localReviews;
  }
}

export async function saveReview(review: Review): Promise<void> {
  const current = readLocal<Review[]>(STORAGE_KEYS.reviews, INITIAL_REVIEWS);
  const exists = current.some(r => r.id === review.id);
  const updated = exists
    ? current.map(r => (r.id === review.id ? review : r))
    : [review, ...current];
  writeLocal(STORAGE_KEYS.reviews, updated);

  if (!firestoreOnline) return;
  const path = `reviews/${review.id}`;
  try {
    await withTimeout(setDoc(doc(db, 'reviews', review.id), cleanData(review)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteReview(id: string): Promise<void> {
  const current = readLocal<Review[]>(STORAGE_KEYS.reviews, INITIAL_REVIEWS);
  writeLocal(STORAGE_KEYS.reviews, current.filter(r => r.id !== id));

  if (!firestoreOnline) return;
  const path = `reviews/${id}`;
  try {
    await withTimeout(deleteDoc(doc(db, 'reviews', id)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Contacts DB Sync ---
export async function getContacts(): Promise<ContactInfo> {
  const localContacts = readLocal<ContactInfo>(STORAGE_KEYS.contacts, DEFAULT_CONTACTS);
  if (!firestoreOnline) return localContacts;

  const path = 'config/contacts';
  try {
    const docSnap = await withTimeout(getDoc(doc(db, 'config', 'contacts')));
    if (!docSnap.exists()) {
      try {
        await withTimeout(setDoc(doc(db, 'config', 'contacts'), cleanData(localContacts)), 2000);
      } catch {
        // Ignore unauthorized seed error
      }
      writeLocal(STORAGE_KEYS.contacts, localContacts);
      return localContacts;
    }
    const data = docSnap.data() as ContactInfo;
    writeLocal(STORAGE_KEYS.contacts, data);
    return data;
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.GET, path);
    return localContacts;
  }
}

export async function saveContacts(contacts: ContactInfo): Promise<void> {
  writeLocal(STORAGE_KEYS.contacts, contacts);

  if (!firestoreOnline) return;
  const path = 'config/contacts';
  try {
    await withTimeout(setDoc(doc(db, 'config', 'contacts'), cleanData(contacts)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Leads DB Sync ---
export async function getLeads(): Promise<Lead[]> {
  const localLeads = readLocal<Lead[]>(STORAGE_KEYS.leads, []);
  if (!firestoreOnline) {
    return [...localLeads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const colPath = 'leads';
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, colPath)));
    const leadsList: Lead[] = [];
    querySnapshot.forEach((docSnap) => {
      leadsList.push(docSnap.data() as Lead);
    });
    const sorted = leadsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sorted.length > 0) {
      writeLocal(STORAGE_KEYS.leads, sorted);
      return sorted;
    }
    return [...localLeads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.LIST, colPath);
    return [...localLeads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  const current = readLocal<Lead[]>(STORAGE_KEYS.leads, []);
  const exists = current.some(l => l.id === lead.id);
  const updated = exists
    ? current.map(l => (l.id === lead.id ? lead : l))
    : [lead, ...current];
  writeLocal(STORAGE_KEYS.leads, updated);

  if (!firestoreOnline) return;
  const path = `leads/${lead.id}`;
  try {
    await withTimeout(setDoc(doc(db, 'leads', lead.id), cleanData(lead)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteLead(id: string): Promise<void> {
  const current = readLocal<Lead[]>(STORAGE_KEYS.leads, []);
  writeLocal(STORAGE_KEYS.leads, current.filter(l => l.id !== id));

  if (!firestoreOnline) return;
  const path = `leads/${id}`;
  try {
    await withTimeout(deleteDoc(doc(db, 'leads', id)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Reels DB Sync ---
export async function getReels(): Promise<Reel[]> {
  const localReels = readLocal<Reel[]>(STORAGE_KEYS.reels, INITIAL_REELS);
  if (!firestoreOnline) return localReels;

  const colPath = 'reels';
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, colPath)));
    if (querySnapshot.empty) {
      for (const rl of localReels) {
        try {
          await withTimeout(setDoc(doc(db, colPath, rl.id), cleanData(rl)), 2000);
        } catch {
          break;
        }
      }
      writeLocal(STORAGE_KEYS.reels, localReels);
      return localReels;
    }
    const reelsList: Reel[] = [];
    querySnapshot.forEach((docSnap) => {
      reelsList.push(docSnap.data() as Reel);
    });
    writeLocal(STORAGE_KEYS.reels, reelsList);
    return reelsList;
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.LIST, colPath);
    return localReels;
  }
}

export async function saveReel(reel: Reel): Promise<void> {
  const current = readLocal<Reel[]>(STORAGE_KEYS.reels, INITIAL_REELS);
  const exists = current.some(r => r.id === reel.id);
  const updated = exists
    ? current.map(r => (r.id === reel.id ? reel : r))
    : [reel, ...current];
  writeLocal(STORAGE_KEYS.reels, updated);

  if (!firestoreOnline) return;
  const path = `reels/${reel.id}`;
  try {
    await withTimeout(setDoc(doc(db, 'reels', reel.id), cleanData(reel)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteReel(id: string): Promise<void> {
  const current = readLocal<Reel[]>(STORAGE_KEYS.reels, INITIAL_REELS);
  writeLocal(STORAGE_KEYS.reels, current.filter(r => r.id !== id));

  if (!firestoreOnline) return;
  const path = `reels/${id}`;
  try {
    await withTimeout(deleteDoc(doc(db, 'reels', id)));
  } catch (error) {
    if (isOfflineOrTimeoutError(error)) firestoreOnline = false;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
