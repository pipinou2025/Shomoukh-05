// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD1G1TCFIbxR1Fw4ATCfOJ_Uw3rcsBoRFw",
    authDomain: "shomoukh-05.firebaseapp.com",
    databaseURL: "https://shomoukh-05-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "shomoukh-05",
    storageBucket: "shomoukh-05.firebasestorage.app",
    messagingSenderId: "745961000926",
    appId: "1:745961000926:web:f79a5c941c34f256c3574f",
    measurementId: "G-T2N8HXDB2Q"
};

// تهيئة Firebase App
firebase.initializeApp(firebaseConfig);
console.log("Firebase App: تم تهيئة تطبيق Firebase محلياً");

// تهيئة Firestore
const db = firebase.firestore();
console.log("Firestore: تم تهيئة Firestore");

// تمكين التخزين المحلي وتهيئة الإعدادات لتحسين الأداء في حالة عدم الاتصال
try {
    // تمكين التخزين المحلي للعمل في وضع عدم الاتصال
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log("Firestore: تم تمكين المثابرة محلياً");
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // إذا كانت هناك علامات تبويب متعددة مفتوحة
                console.warn("Firestore: يمكن تمكين المثابرة في علامة تبويب واحدة فقط.");
            } else if (err.code === 'unimplemented') {
                // المتصفح الحالي لا يدعم التخزين المحلي
                console.warn("Firestore: المتصفح الحالي لا يدعم تخزين البيانات محلياً للعمل أثناء عدم الاتصال.");
            } else {
                console.error("Firestore: خطأ في تمكين المثابرة: ", err);
            }
        });
    
    // ضبط إعدادات Firestore لتحسين الأداء
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED // تعيين حجم التخزين المؤقت غير محدود
    });
    console.log("Firestore: تم ضبط إعدادات التخزين المؤقت");
} catch (e) {
    console.error("Firestore: خطأ في إعداد المثابرة والتخزين المؤقت: ", e);
}

// إعداد معالج حالة الاتصال باستخدام Realtime Database
const rtdb = firebase.database();
const connectedRef = rtdb.ref(".info/connected");
connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
        console.log("متصل بخدمة Firebase");
        window.isOnline = true;
    } else {
        console.log("غير متصل بخدمة Firebase - سيتم العمل في الوضع الغير متصل");
        window.isOnline = false;
    }
});

// دالة للتحقق من حالة الاتصال بالإنترنت
window.checkOnlineStatus = function() {
    return window.navigator.onLine && window.isOnline;
};

// دالة التحقق من الاتصال بـ Firestore
window.checkFirestoreConnection = function() {
    return new Promise((resolve) => {
        const testRef = db.collection("__connectionTest__").doc("online");
        testRef.set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() })
            .then(() => {
                console.log("Firestore: الاتصال يعمل بشكل صحيح");
                resolve(true);
            })
            .catch((error) => {
                console.error("Firestore: لا يمكن الاتصال: ", error);
                resolve(false);
            });
    });
};

// تهيئة Firebase Storage
const storage = firebase.storage();
console.log("Storage: تم تهيئة Firebase Storage");

// للاستخدام العام في التطبيق
window.db = db;
window.storage = storage;
window.rtdb = rtdb; 