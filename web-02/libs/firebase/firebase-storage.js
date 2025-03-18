/**
 * Firebase Storage (Simplified Local Version)
 * This is a simplified mock version of Firebase Storage for offline usage
 * Version 8.10.1
 */

// تعريف كائن Firebase الأساسي إذا لم يكن موجوداً
var firebase = firebase || {};

// تأكد من وجود SDK_VERSION
firebase.SDK_VERSION = firebase.SDK_VERSION || '8.10.1';

// إضافة Storage
firebase.storage = function() {
    // تحقق مما إذا كان مخزن Storage موجوداً بالفعل
    if (window._storageInstance) {
        return window._storageInstance;
    }
    
    // إذا لم يكن موجوداً، قم بإنشاء واحد جديد
    var storageInstance = {
        // الإشارة إلى موقع
        ref: function(path) {
            return {
                _path: path || '',
                
                // الحصول على URL للتنزيل
                getDownloadURL: function() {
                    console.log('Storage: محاولة الحصول على رابط التنزيل للمسار ' + this._path);
                    // إرجاع مسار محلي للملف
                    return Promise.resolve('images/placeholder.jpg');
                },
                
                // تحميل ملف
                put: function(file) {
                    console.log('Storage: محاولة تحميل ملف إلى المسار ' + this._path);
                    
                    return {
                        on: function(event, onProgress, onError, onComplete) {
                            // محاكاة اكتمال التحميل
                            setTimeout(function() {
                                if (onComplete) {
                                    onComplete({
                                        ref: {
                                            getDownloadURL: function() {
                                                return Promise.resolve('images/placeholder.jpg');
                                            }
                                        }
                                    });
                                }
                            }, 500);
                        },
                        then: function(onResolve) {
                            // محاكاة وعد مكتمل
                            setTimeout(function() {
                                onResolve({
                                    ref: {
                                        getDownloadURL: function() {
                                            return Promise.resolve('images/placeholder.jpg');
                                        }
                                    }
                                });
                            }, 500);
                            
                            return Promise.resolve();
                        }
                    };
                },
                
                // حذف ملف
                delete: function() {
                    console.log('Storage: محاولة حذف ملف من المسار ' + this._path);
                    return Promise.resolve();
                },
                
                // الإشارة إلى مسار فرعي
                child: function(childPath) {
                    return storageInstance.ref(this._path + '/' + childPath);
                }
            };
        }
    };
    
    // تخزين المثيل للاستخدام اللاحق
    window._storageInstance = storageInstance;
    window.storage = storageInstance; // نسخة سهلة الوصول إليها
    
    return storageInstance;
};

// تسجيل الدخول إلى الـ SDK
console.log('Firebase Storage: تم تحميل النسخة المحلية من Firebase Storage'); 