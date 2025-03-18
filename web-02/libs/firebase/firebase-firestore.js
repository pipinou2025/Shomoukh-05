/**
 * Firebase Firestore (Simplified Local Version)
 * This is a simplified mock version of Firebase Firestore for offline usage
 * Version 8.10.1
 */

// تعريف كائن Firebase الأساسي إذا لم يكن موجوداً
var firebase = firebase || {};

// تأكد من وجود SDK_VERSION
firebase.SDK_VERSION = firebase.SDK_VERSION || '8.10.1';

// إضافة Firestore
firebase.firestore = function() {
    // تحقق مما إذا كان مخزن Firestore موجوداً بالفعل
    if (window._firestoreInstance) {
        return window._firestoreInstance;
    }
    
    // إذا لم يكن موجوداً، قم بإنشاء واحد جديد
    var firestoreDb = {
        // بيانات المستند المخزنة محلياً
        _collections: {},
        
        // إضافة مجموعة
        collection: function(collectionPath) {
            return {
                _path: collectionPath,
                
                // إضافة مستند
                add: function(data) {
                    var id = 'local_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    var docData = JSON.parse(JSON.stringify(data)); // نسخة عميقة
                    
                    // تخزين البيانات محلياً
                    localStorage.setItem(collectionPath + '_' + id, JSON.stringify(docData));
                    
                    console.log('Firestore: تمت إضافة مستند إلى المجموعة ' + collectionPath);
                    
                    return Promise.resolve({ 
                        id: id, 
                        path: collectionPath + '/' + id 
                    });
                },
                
                // الحصول على مستند
                doc: function(docId) {
                    return {
                        _id: docId,
                        _path: collectionPath + '/' + docId,
                        
                        // الحصول على بيانات المستند
                        get: function() {
                            var data = localStorage.getItem(collectionPath + '_' + docId);
                            
                            console.log('Firestore: محاولة الحصول على مستند ' + docId + ' من المجموعة ' + collectionPath);
                            
                            return Promise.resolve({
                                exists: !!data,
                                id: docId,
                                data: function() {
                                    return data ? JSON.parse(data) : null;
                                }
                            });
                        },
                        
                        // تعيين بيانات المستند
                        set: function(data) {
                            localStorage.setItem(collectionPath + '_' + docId, JSON.stringify(data));
                            console.log('Firestore: تم تعيين مستند ' + docId + ' في المجموعة ' + collectionPath);
                            return Promise.resolve();
                        },
                        
                        // تحديث بيانات المستند
                        update: function(data) {
                            var existingData = localStorage.getItem(collectionPath + '_' + docId);
                            var merged = existingData ? { ...JSON.parse(existingData), ...data } : data;
                            
                            localStorage.setItem(collectionPath + '_' + docId, JSON.stringify(merged));
                            console.log('Firestore: تم تحديث مستند ' + docId + ' في المجموعة ' + collectionPath);
                            
                            return Promise.resolve();
                        },
                        
                        // حذف المستند
                        delete: function() {
                            localStorage.removeItem(collectionPath + '_' + docId);
                            console.log('Firestore: تم حذف مستند ' + docId + ' من المجموعة ' + collectionPath);
                            return Promise.resolve();
                        }
                    };
                },
                
                // الحصول على جميع المستندات في المجموعة
                get: function() {
                    console.log('Firestore: محاولة الحصول على جميع المستندات في المجموعة ' + collectionPath);
                    
                    // مصفوفة لتخزين نتائج المستندات
                    var results = [];
                    
                    // البحث عن جميع المستندات في التخزين المحلي
                    for (var i = 0; i < localStorage.length; i++) {
                        var key = localStorage.key(i);
                        if (key.startsWith(collectionPath + '_')) {
                            var docId = key.substring((collectionPath + '_').length);
                            var data = JSON.parse(localStorage.getItem(key));
                            
                            results.push({
                                id: docId,
                                data: function() { return data; }
                            });
                        }
                    }
                    
                    return Promise.resolve({
                        docs: results,
                        forEach: function(callback) {
                            results.forEach(callback);
                        }
                    });
                },
                
                // ترتيب المستندات
                orderBy: function() {
                    // تجاهل الترتيب في النسخة المحلية
                    return this;
                },
                
                // تصفية المستندات
                where: function() {
                    // تجاهل التصفية في النسخة المحلية
                    return this;
                }
            };
        },
        
        // تمكين المثابرة
        enablePersistence: function() {
            console.log('Firestore: تم تمكين المثابرة محلياً');
            return Promise.resolve();
        },
        
        // إعدادات قاعدة البيانات
        settings: function() {
            // تجاهل الإعدادات في النسخة المحلية
            return this;
        },
        
        // الثوابت
        CACHE_SIZE_UNLIMITED: -1
    };
    
    // تخزين المثيل للاستخدام اللاحق
    window._firestoreInstance = firestoreDb;
    window.db = firestoreDb; // نسخة سهلة الوصول إليها
    
    return firestoreDb;
};

// إضافة ثوابت Firestore
firebase.firestore.CACHE_SIZE_UNLIMITED = -1;

// تسجيل الدخول إلى الـ SDK
console.log('Firebase Firestore: تم تحميل النسخة المحلية من Firebase Firestore'); 