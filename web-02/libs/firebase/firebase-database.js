/**
 * Firebase Realtime Database (Simplified Local Version)
 * This is a simplified mock version of Firebase Realtime Database for offline usage
 * Version 8.10.1
 */

// تعريف كائن Firebase الأساسي إذا لم يكن موجوداً
var firebase = firebase || {};

// تأكد من وجود SDK_VERSION
firebase.SDK_VERSION = firebase.SDK_VERSION || '8.10.1';

// إضافة قاعدة البيانات في الوقت الفعلي
firebase.database = function() {
    // تحقق مما إذا كانت قاعدة البيانات موجودة بالفعل
    if (window._rtdbInstance) {
        return window._rtdbInstance;
    }
    
    // إذا لم تكن موجودة، قم بإنشاء واحدة جديدة
    var rtdbInstance = {
        // البيانات المخزنة محلياً
        _data: {},
        
        // الإشارة إلى موقع
        ref: function(path) {
            return {
                _path: path || '',
                
                // ضبط قيمة
                set: function(value) {
                    var key = path || 'root';
                    localStorage.setItem('rtdb_' + key, JSON.stringify(value));
                    console.log('RTDB: تم ضبط قيمة في المسار ' + path);
                    return Promise.resolve();
                },
                
                // تحديث قيمة
                update: function(value) {
                    var key = path || 'root';
                    var existingData = localStorage.getItem('rtdb_' + key);
                    var merged = existingData ? { ...JSON.parse(existingData), ...value } : value;
                    
                    localStorage.setItem('rtdb_' + key, JSON.stringify(merged));
                    console.log('RTDB: تم تحديث قيمة في المسار ' + path);
                    
                    return Promise.resolve();
                },
                
                // الاستماع للتغييرات
                on: function(event, callback) {
                    var key = path || 'root';
                    
                    // استدعاء رد الاتصال مرة واحدة بالقيمة الحالية
                    var existingData = localStorage.getItem('rtdb_' + key);
                    var data = existingData ? JSON.parse(existingData) : null;
                    
                    if (callback) {
                        setTimeout(function() {
                            callback({
                                val: function() {
                                    return data;
                                }
                            });
                        }, 0);
                    }
                    
                    console.log('RTDB: بدء الاستماع للتغييرات في المسار ' + path);
                    
                    // إرجاع وظيفة لإيقاف الاستماع
                    return function() {
                        console.log('RTDB: إيقاف الاستماع للتغييرات في المسار ' + path);
                    };
                },
                
                // الحصول على قيمة مرة واحدة
                once: function(event) {
                    var key = path || 'root';
                    var existingData = localStorage.getItem('rtdb_' + key);
                    var data = existingData ? JSON.parse(existingData) : null;
                    
                    console.log('RTDB: الحصول على قيمة مرة واحدة في المسار ' + path);
                    
                    return Promise.resolve({
                        val: function() {
                            return data;
                        },
                        exists: function() {
                            return !!data;
                        }
                    });
                },
                
                // حذف قيمة
                remove: function() {
                    var key = path || 'root';
                    localStorage.removeItem('rtdb_' + key);
                    console.log('RTDB: تم حذف قيمة في المسار ' + path);
                    
                    return Promise.resolve();
                },
                
                // الإشارة إلى طفل
                child: function(childPath) {
                    var newPath = path ? path + '/' + childPath : childPath;
                    return rtdbInstance.ref(newPath);
                },
                
                // الإشارة إلى الوالد
                parent: function() {
                    if (!path) return null;
                    
                    var lastSlash = path.lastIndexOf('/');
                    if (lastSlash === -1) {
                        return rtdbInstance.ref();
                    }
                    
                    var parentPath = path.substring(0, lastSlash);
                    return rtdbInstance.ref(parentPath);
                }
            };
        }
    };
    
    // تخزين المثيل للاستخدام اللاحق
    window._rtdbInstance = rtdbInstance;
    window.rtdb = rtdbInstance; // نسخة سهلة الوصول إليها
    
    return rtdbInstance;
};

// تسجيل الدخول إلى الـ SDK
console.log('Firebase Database: تم تحميل النسخة المحلية من Firebase Realtime Database'); 