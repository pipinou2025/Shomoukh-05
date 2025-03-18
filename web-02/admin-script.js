// المتغيرات العامة
let products = [];
let orders = [];
let orderCategories = {
    all: [],
    confirmed: [],
    cancelled: [],
    returned: [],
    delivered: [],
    pending: []
};

// إعدادات المتجر
let storeSettings = {
    homeDeliveryFee: 800,
    municipalityDeliveryFee: 500,
    phoneNumber: '',
    facebook: '',
    instagram: ''
};

// متغير للتحقق من حالة عرض رسالة الاتصال
let offlineMessageDisplayed = false;

// استدعاء البيانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود اتصال بالإنترنت
    checkConnection();
    
    // تحميل البيانات من Firestore
    loadData();
    
    // تهيئة التنقل بين الصفحات
    setupNavigation();
    
    // تهيئة صفحة المنتجات
    setupProductsPage();
    
    // تهيئة صفحة الطلبات
    setupOrdersPage();
    
    // تهيئة صفحة الإعدادات
    setupSettingsPage();
    
    // تهيئة تسجيل الخروج
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            window.location.href = 'index.html';
        }
    });
    
    // إضافة مراقبي حالة الاتصال
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
});

// التحقق من حالة الاتصال
function checkConnection() {
    if (!navigator.onLine) {
        handleOffline();
    }
}

// معالجة حالة استعادة الاتصال
function handleOnline() {
    console.log("تم استعادة الاتصال بالإنترنت");
    showOnlineMessage();
    
    // إعادة تحميل البيانات بعد استعادة الاتصال
    loadData();
}

// معالجة حالة فقدان الاتصال
function handleOffline() {
    console.log("انقطع الاتصال بالإنترنت");
    showOfflineMessage();
    
    // استخدام البيانات المخزنة مؤقتاً إن وجدت
    loadCachedData();
}

// عرض رسالة استعادة الاتصال
function showOnlineMessage() {
    offlineMessageDisplayed = false;
    
    // إزالة رسالة عدم الاتصال إن وجدت
    const oldOfflineMessage = document.querySelector('.offline-status-bar');
    if (oldOfflineMessage) {
        oldOfflineMessage.remove();
    }
    
    // إنشاء رسالة استعادة الاتصال
    const message = document.createElement('div');
    message.className = 'online-status-bar';
    message.innerHTML = `
        <i class="fas fa-wifi"></i>
        <span>تم استعادة الاتصال بالإنترنت</span>
        <button class="close-btn" onclick="this.parentElement.remove();">×</button>
    `;
    
    document.body.insertBefore(message, document.body.firstChild);
    
    // إخفاء الرسالة بعد فترة
    setTimeout(() => {
        if (message.parentElement) {
            message.remove();
        }
    }, 5000);
}

// عرض رسالة عدم الاتصال
function showOfflineMessage() {
    // التحقق من عدم عرض الرسالة بالفعل
    if (offlineMessageDisplayed) return;
    offlineMessageDisplayed = true;
    
    // إنشاء رسالة عدم الاتصال
    const message = document.createElement('div');
    message.className = 'offline-status-bar';
    message.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>أنت حالياً في وضع عدم الاتصال - بعض الميزات قد لا تعمل بشكل كامل</span>
        <button class="close-btn" onclick="this.parentElement.remove(); offlineMessageDisplayed = false;">×</button>
    `;
    
    document.body.insertBefore(message, document.body.firstChild);
}

// تحميل البيانات المخزنة مؤقتاً
function loadCachedData() {
    // محاولة استخدام بيانات المنتجات المخزنة مؤقتاً
    const cachedProducts = localStorage.getItem('cachedProducts');
    if (cachedProducts) {
        products = JSON.parse(cachedProducts);
        updateProductsTable();
    }
    
    // محاولة استخدام بيانات الطلبات المخزنة مؤقتاً
    const cachedOrders = localStorage.getItem('cachedOrders');
    if (cachedOrders) {
        orders = JSON.parse(cachedOrders);
        categorizeOrders();
        updateOrdersDisplay();
    }
    
    // محاولة استخدام إعدادات المتجر المخزنة مؤقتاً
    const cachedSettings = localStorage.getItem('cachedSettings');
    if (cachedSettings) {
        storeSettings = JSON.parse(cachedSettings);
    }
}

// تحميل البيانات من Firestore
function loadData() {
    console.log("جاري تحميل البيانات من Firestore...");
    
    // تنفيذ كل عمليات التحميل بالتوازي
    Promise.all([
        loadProducts(),
        loadOrders(),
        loadStoreSettings()
    ]).then(() => {
        console.log("تم تحميل جميع البيانات بنجاح");
    }).catch(error => {
        console.error("حدث خطأ أثناء تحميل البيانات:", error);
        
        if (!navigator.onLine) {
            console.log("استخدام البيانات المخزنة مؤقتاً بسبب عدم الاتصال");
            loadCachedData();
            showOfflineMessage();
        }
    });
}

// تحميل المنتجات من Firestore
function loadProducts() {
    console.log("جاري تحميل المنتجات...");
    
    return db.collection('products').get()
        .then((querySnapshot) => {
            products = [];
            querySnapshot.forEach((doc) => {
                products.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`تم تحميل ${products.length} منتج`);
            
            // تخزين المنتجات مؤقتاً للاستخدام في حالة عدم الاتصال
            localStorage.setItem('cachedProducts', JSON.stringify(products));
            
            // تحديث واجهة المستخدم
            updateProductsTable();
            return products;
        })
        .catch((error) => {
            console.error("خطأ في تحميل المنتجات:", error);
            throw error;
        });
}

// تحميل الطلبات من Firestore
function loadOrders() {
    console.log("جاري تحميل الطلبات...");
    
    return db.collection('orders').orderBy('orderDate', 'desc').get()
        .then((querySnapshot) => {
            orders = [];
            querySnapshot.forEach((doc) => {
                const orderData = doc.data();
                orders.push({
                    id: doc.id,
                    ...orderData,
                    // التأكد من تحويل التاريخ إلى كائن Date
                    orderDate: orderData.orderDate instanceof Date ? orderData.orderDate : orderData.orderDate.toDate()
                });
            });
            
            console.log(`تم تحميل ${orders.length} طلب`);
            
            // تخزين الطلبات مؤقتاً للاستخدام في حالة عدم الاتصال
            localStorage.setItem('cachedOrders', JSON.stringify(orders));
            
            // تصنيف الطلبات
            categorizeOrders();
            updateOrdersDisplay();
            return orders;
        })
        .catch((error) => {
            console.error("خطأ في تحميل الطلبات:", error);
            throw error;
        });
}

// تحميل إعدادات المتجر
function loadStoreSettings() {
    console.log("جاري تحميل إعدادات المتجر...");
    
    return db.collection('settings').doc('store').get()
        .then((doc) => {
            if (doc.exists) {
                storeSettings = doc.data();
                console.log("تم تحميل إعدادات المتجر بنجاح");
                
                // تخزين الإعدادات مؤقتاً للاستخدام في حالة عدم الاتصال
                localStorage.setItem('cachedSettings', JSON.stringify(storeSettings));
                
                return storeSettings;
            } else {
                console.log("إعدادات المتجر غير موجودة، سيتم إنشاء إعدادات افتراضية");
                return saveStoreSettings();
            }
        })
        .catch((error) => {
            console.error("خطأ في تحميل إعدادات المتجر:", error);
            throw error;
        });
}

// تصنيف الطلبات حسب الحالة
function categorizeOrders() {
    // إعادة تعيين التصنيفات
    orderCategories = {
        all: [],
        confirmed: [],
        cancelled: [],
        returned: [],
        delivered: [],
        pending: []
    };
    
    // تصنيف جميع الطلبات
    orderCategories.all = [...orders];
    
    // تصنيف حسب الحالة
    orders.forEach(order => {
        const status = order.status || 'pending';
        if (orderCategories[status]) {
            orderCategories[status].push(order);
        }
    });
}

// وظائف إدارة المنتجات
function setupProductsPage() {
    // تهيئة زر إضافة منتج جديد
    const addProductBtn = document.getElementById('add-product-btn');
    
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            // إظهار مودال إضافة منتج
            showProductModal();
        });
    }
    
    // تهيئة نموذج إضافة المنتج
    const productForm = document.getElementById('product-form');
    
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // جمع بيانات المنتج
            const productId = document.getElementById('product-id').value;
            const productName = document.getElementById('product-name').value;
            const productPrice = parseInt(document.getElementById('product-price').value);
            const productImage = document.getElementById('main-image-upload').value || 'images/placeholder.jpg';
            
            // إنشاء كائن المنتج
            const newProduct = {
                name: productName,
                price: productPrice,
                image: productImage,
                hasMultipleAngles: document.getElementById('multiple-angles').checked,
                additionalImages: []
            };
            
            if (productId) {
                // تحديث منتج موجود
                updateExistingProduct(productId, newProduct);
            } else {
                // إضافة منتج جديد
                addNewProduct(newProduct);
            }
        });
    }
    
    // تحديث جدول المنتجات
    updateProductsTable();
    
    console.log("تم تهيئة صفحة المنتجات");
}

// إضافة منتج جديد إلى Firestore
function addNewProduct(product) {
    db.collection('products').add(product)
        .then((docRef) => {
            // إضافة المنتج للمصفوفة المحلية
            products.push({
                id: docRef.id,
                ...product
            });
            
            // تحديث العرض
            updateProductsTable();
            
            // إخفاء المودال
            hideProductModal();
            
            // عرض رسالة نجاح
            alert('تم إضافة المنتج بنجاح!');
            
            console.log("تم إضافة منتج جديد:", product.name);
        })
        .catch((error) => {
            console.error("خطأ في إضافة المنتج:", error);
            alert('حدث خطأ أثناء إضافة المنتج.');
        });
}

// تحديث منتج موجود
function updateExistingProduct(productId, updatedProduct) {
    db.collection('products').doc(productId).update(updatedProduct)
        .then(() => {
            // تحديث المنتج في المصفوفة المحلية
            const index = products.findIndex(p => p.id === productId);
            products[index] = { id: productId, ...updatedProduct };
            
            // تحديث العرض
            updateProductsTable();
            
            // إخفاء المودال
            hideProductModal();
            
            // عرض رسالة نجاح
            alert('تم تحديث المنتج بنجاح!');
            
            console.log("تم تحديث المنتج:", updatedProduct.name);
        })
        .catch((error) => {
            console.error("خطأ في تحديث المنتج:", error);
            alert('حدث خطأ أثناء تحديث المنتج.');
        });
}

// تحديث عرض المنتجات في الجدول
function updateProductsTable() {
    const productsGrid = document.querySelector('.products-grid');
    
    if (!productsGrid) {
        console.error("لم يتم العثور على شبكة المنتجات!");
        return;
    }
    
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<div class="no-products">لا توجد منتجات، يمكنك إضافة منتجات جديدة.</div>';
        return;
    }
    
    console.log(`عرض ${products.length} منتج في لوحة المدير`);
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'admin-product-card';
        
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="price">${product.price.toLocaleString()} دج</p>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i> تعديل</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
}

// إظهار مودال إضافة/تعديل منتج
function showProductModal(productId = null) {
    const modalTitle = document.getElementById('product-modal-title');
    const productForm = document.getElementById('product-form');
    const productIdField = document.getElementById('product-id');
    
    // إعادة تعيين النموذج
    productForm.reset();
    productIdField.value = '';
    
    if (productId) {
        // تعديل منتج موجود
        const product = products.find(p => p.id === productId);
        
        if (product) {
            modalTitle.textContent = 'تعديل المنتج';
            productIdField.value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('main-image-upload').value = product.image;
            document.getElementById('multiple-angles').checked = product.hasMultipleAngles;
            
            // إظهار حقول الصور الإضافية إذا كان المنتج يحتوي على زوايا متعددة
            if (product.hasMultipleAngles) {
                document.getElementById('additional-images-container').classList.remove('hidden');
            } else {
                document.getElementById('additional-images-container').classList.add('hidden');
            }
        }
    } else {
        // إضافة منتج جديد
        modalTitle.textContent = 'إضافة منتج جديد';
        document.getElementById('additional-images-container').classList.add('hidden');
    }
    
    // إظهار المودال
    const modal = document.getElementById('product-modal');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء مودال المنتج
function hideProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تعديل منتج
function editProduct(productId) {
    showProductModal(productId);
}

// حذف منتج
function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        // حذف المنتج من Firestore
        db.collection('products').doc(productId).delete()
            .then(() => {
                // حذف المنتج من المصفوفة المحلية
                products = products.filter(p => p.id !== productId);
                
                // تحديث العرض
                updateProductsTable();
                
                // عرض رسالة نجاح
                alert('تم حذف المنتج بنجاح!');
                
                console.log("تم حذف المنتج:", productId);
            })
            .catch((error) => {
                console.error("خطأ في حذف المنتج:", error);
                alert('حدث خطأ أثناء حذف المنتج.');
            });
    }
}

// وظائف إدارة الطلبات
function setupOrdersPage() {
    // تهيئة أزرار التصفية
    const filterBtns = document.querySelectorAll('.order-filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.filter;
            
            // تحديث الزر النشط
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // تحديث عرض الطلبات
            updateOrdersDisplay(category);
            
            console.log(`تم تحديد تصفية الطلبات لـ: ${category}`);
        });
    });
    
    // عرض كل الطلبات افتراضياً
    updateOrdersDisplay('all');
}

// تحديث عرض الطلبات
function updateOrdersDisplay(category = 'all') {
    const ordersContainer = document.querySelector('.orders-list');
    
    if (!ordersContainer) {
        console.error("لم يتم العثور على حاوية الطلبات!");
        return;
    }
    
    ordersContainer.innerHTML = '';
    
    // اختيار القائمة المناسبة
    const ordersList = orderCategories[category] || [];
    
    if (ordersList.length === 0) {
        ordersContainer.innerHTML = '<div class="no-orders">لا توجد طلبات في هذه الفئة.</div>';
        return;
    }
    
    console.log(`عرض ${ordersList.length} طلب من فئة ${category}`);
    
    // إنشاء بطاقة لكل طلب
    ordersList.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        // تنسيق التاريخ
        const orderDate = order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate);
        const formattedDate = orderDate.toLocaleDateString('ar-DZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // جمع معلومات العناصر
        const itemsList = order.items.map(item => {
            return `
                <div class="order-item">
                    <div class="item-image"><img src="${item.image}" alt="${item.name}"></div>
                    <div class="item-details">
                        <div>${item.name}</div>
                        <div>${item.price.toLocaleString()} دج × ${item.quantity}</div>
                        <div>${(item.price * item.quantity).toLocaleString()} دج</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // بناء بطاقة الطلب
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-id">طلب #${order.id.substring(0, 8)}</div>
                <div class="order-date">${formattedDate}</div>
                <div class="order-status status-${order.status || 'pending'}">${getStatusText(order.status || 'pending')}</div>
            </div>
            
            <div class="order-customer">
                <div><strong>العميل:</strong> ${order.customer.firstName} ${order.customer.lastName}</div>
                <div><strong>الهاتف:</strong> ${order.customer.phone}</div>
                <div><strong>الولاية:</strong> ${order.customer.province}</div>
                ${order.customer.municipality ? `<div><strong>البلدية:</strong> ${order.customer.municipality}</div>` : ''}
                <div><strong>التوصيل:</strong> ${order.deliveryType === 'home' ? 'منزلي' : 'إلى البلدية'}</div>
            </div>
            
            <div class="order-items">${itemsList}</div>
            
            <div class="order-summary">
                <div class="summary-row">
                    <div>المنتجات:</div>
                    <div>${order.productsTotal.toLocaleString()} دج</div>
                </div>
                <div class="summary-row">
                    <div>التوصيل:</div>
                    <div>${order.deliveryFee.toLocaleString()} دج</div>
                </div>
                <div class="summary-row total">
                    <div>المجموع:</div>
                    <div>${order.finalTotal.toLocaleString()} دج</div>
                </div>
            </div>
            
            <div class="order-actions">
                ${order.status === 'pending' ? `
                    <button class="btn-confirm" onclick="updateOrderStatus('${order.id}', 'confirmed')">تأكيد الطلب</button>
                    <button class="btn-cancel" onclick="updateOrderStatus('${order.id}', 'cancelled')">إلغاء الطلب</button>
                ` : ''}
                ${order.status === 'confirmed' ? `
                    <button class="btn-delivered" onclick="updateOrderStatus('${order.id}', 'delivered')">تم التوصيل</button>
                    <button class="btn-return" onclick="updateOrderStatus('${order.id}', 'returned')">مرتجع</button>
                ` : ''}
            </div>
        `;
        
        ordersContainer.appendChild(orderCard);
    });
}

// الحصول على نص الحالة
function getStatusText(status) {
    const statusMap = {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        cancelled: 'ملغي',
        delivered: 'تم التوصيل',
        returned: 'مرتجع'
    };
    
    return statusMap[status] || status;
}

// تحديث حالة الطلب
function updateOrderStatus(orderId, newStatus) {
    // التحقق من الاتصال قبل محاولة التحديث
    if (!navigator.onLine) {
        alert("أنت حالياً غير متصل بالإنترنت. لا يمكن تحديث حالة الطلب في الوقت الحالي.");
        return;
    }
    
    // عرض مؤشر التحميل أو رسالة للمستخدم
    const statusBtn = document.querySelector(`button[onclick*="updateOrderStatus('${orderId}', '${newStatus}')"]`);
    if (statusBtn) {
        const originalText = statusBtn.innerHTML;
        statusBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
        statusBtn.disabled = true;
    }
    
    // تحديث الحالة في Firestore
    db.collection('orders').doc(orderId).update({
        status: newStatus
    })
    .then(() => {
        console.log(`تم تحديث حالة الطلب ${orderId} إلى ${newStatus}`);
        
        // تحديث الحالة في المصفوفة المحلية
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
        }
        
        // تحديث التخزين المؤقت
        localStorage.setItem('cachedOrders', JSON.stringify(orders));
        
        // إعادة تصنيف الطلبات
        categorizeOrders();
        
        // تحديث العرض
        updateOrdersDisplay(document.querySelector('.order-filter-btn.active').dataset.filter);
        
        // عرض رسالة نجاح
        alert(`تم تحديث حالة الطلب إلى "${getStatusText(newStatus)}" بنجاح!`);
        
        // استعادة حالة الزر
        if (statusBtn) {
            statusBtn.disabled = false;
        }
    })
    .catch((error) => {
        console.error("خطأ في تحديث حالة الطلب:", error);
        alert('حدث خطأ أثناء تحديث حالة الطلب. يرجى المحاولة مرة أخرى.');
        
        // استعادة حالة الزر
        if (statusBtn) {
            statusBtn.disabled = false;
            statusBtn.innerHTML = originalText;
        }
    });
}

// وظائف إدارة الإعدادات
function setupSettingsPage() {
    // تهيئة نموذج الإعدادات
    const settingsForm = document.getElementById('settings-form');
    
    // ملء النموذج بالإعدادات الحالية
    document.getElementById('home-delivery-fee').value = storeSettings.homeDeliveryFee;
    document.getElementById('municipality-delivery-fee').value = storeSettings.municipalityDeliveryFee;
    document.getElementById('phone-number').value = storeSettings.phoneNumber;
    document.getElementById('facebook').value = storeSettings.facebook;
    document.getElementById('instagram').value = storeSettings.instagram;
    
    // معالجة تقديم النموذج
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // تحديث الإعدادات
        storeSettings.homeDeliveryFee = parseInt(document.getElementById('home-delivery-fee').value);
        storeSettings.municipalityDeliveryFee = parseInt(document.getElementById('municipality-delivery-fee').value);
        storeSettings.phoneNumber = document.getElementById('phone-number').value;
        storeSettings.facebook = document.getElementById('facebook').value;
        storeSettings.instagram = document.getElementById('instagram').value;
        
        // حفظ الإعدادات في Firestore
        saveStoreSettings();
        
        // عرض رسالة تأكيد
        alert('تم حفظ الإعدادات بنجاح!');
    });
}

// حفظ إعدادات المتجر في Firestore
function saveStoreSettings() {
    // التحقق من الاتصال
    if (!navigator.onLine) {
        alert("أنت حالياً غير متصل بالإنترنت. لا يمكن حفظ الإعدادات في الوقت الحالي.");
        return Promise.reject(new Error("عدم وجود اتصال بالإنترنت"));
    }
    
    return db.collection('settings').doc('store').set(storeSettings)
        .then(() => {
            console.log("تم حفظ إعدادات المتجر بنجاح");
            
            // تحديث التخزين المؤقت
            localStorage.setItem('cachedSettings', JSON.stringify(storeSettings));
            
            return storeSettings;
        })
        .catch((error) => {
            console.error("خطأ في حفظ إعدادات المتجر:", error);
            alert('حدث خطأ أثناء حفظ إعدادات المتجر. يرجى المحاولة مرة أخرى.');
            throw error;
        });
}

// وظائف التنقل
function setupNavigation() {
    const navBtns = document.querySelectorAll('.sidebar nav a');
    const pages = document.querySelectorAll('.admin-page');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); // منع الانتقال الافتراضي للرابط
            
            const targetPage = this.getAttribute('data-page');
            
            // تحديث الزر النشط
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // تحديث الصفحة المعروضة
            pages.forEach(page => {
                if (page.id === targetPage + '-page') {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
            
            // تحديث عنوان الصفحة في المتصفح (اختياري)
            window.location.hash = targetPage;
            
            console.log(`تم الانتقال إلى صفحة: ${targetPage}`);
        });
    });
    
    // التنقل عند تحميل الصفحة بناءً على الهاش
    const hash = window.location.hash.substring(1) || 'dashboard';
    const activeLink = document.querySelector(`.sidebar nav a[data-page="${hash}"]`);
    if (activeLink) {
        activeLink.click();
    }
}

// إغلاق المودال
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
} 