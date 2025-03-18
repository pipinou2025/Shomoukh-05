/**
 * Firebase App (Simplified Local Version)
 * This is a simplified mock version of Firebase for offline usage
 * Version 8.10.1
 */

// تعريف كائن Firebase الأساسي
var firebase = firebase || {};

// إصدار الـ SDK
firebase.SDK_VERSION = '8.10.1';

// تهيئة التطبيق
firebase.initializeApp = function(config) {
    firebase._config = config || {};
    console.log('Firebase App: تم تهيئة تطبيق Firebase محلياً');
    return {
        name: 'default',
        options: firebase._config
    };
};

// تعريف Firebase الأساسي
firebase.app = function() {
    return {
        name: 'default',
        options: firebase._config || {},
        automaticDataCollectionEnabled: false
    };
};

// تسجيل الدخول إلى الـ SDK
console.log('Firebase App: تم تحميل النسخة المحلية من Firebase App'); 