// المتغيرات العامة
let products = [];
let cartItems = [];
let activeProductImageIndex = 0;

// إعدادات المتجر
let storeSettings = {
    storeName: 'Shomoukh',
    deliveryPrice: 800,
    phone: '',
    instagram: ''
};

// الاشتراك في التغييرات الفورية للمنتجات
function subscribeToRealTimeUpdates() {
    // الاشتراك في تغييرات المنتجات
    db.subscribe('products', (payload) => {
        console.log('تم تحديث المنتجات:', payload);
        loadProducts();
    });
    
    // الاشتراك في تغييرات إعدادات المتجر
    db.subscribe('settings', (payload) => {
        console.log('تم تحديث إعدادات المتجر:', payload);
        loadStoreSettings();
    });
}

// تهيئة قائمة الولايات باستخدام Select2 إذا كانت متوفرة
function initializeSelect2() {
    // التحقق من توفر Select2
    if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
        console.log("تهيئة Select2 للولايات");
        
        $('#province').select2({
            placeholder: "اختر الولاية",
            dir: "rtl",
            language: {
                noResults: function () {
                    return "لا توجد نتائج";
                }
            }
        });
    } else {
        console.warn("Select2 غير متوفر، سيتم استخدام القائمة العادية");
    }
}

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة الصفحة والتخزين المؤقت
    console.log("تهيئة الصفحة...");
    
    // تحميل الإعدادات والمنتجات
    loadStoreSettings();
    loadProducts();
    
    // تفعيل الاشتراك في التغييرات الفورية
    subscribeToRealTimeUpdates();
    
    // تهيئة خيارات الولاية وإعدادات النموذج
    setupDeliveryToggle();
    setupCheckoutForm();
    updateCurrentYear();
    
    // استعادة عناصر السلة المحفوظة
    loadCart();
    
    // إعداد معالجات أزرار الإغلاق
    setupModalCloseHandlers();
    
    // التحقق من وجود صورة افتراضية
    checkAndCreatePlaceholderImage();
    
    // تهيئة Select2 إذا كانت متوفرة
    setTimeout(initializeSelect2, 1000);
    
    // التأكد من ظهور أيقونة سلة المشتريات وأيقونة تسجيل الدخول
    ensureUIElementsVisibility();
});

// تحميل إعدادات المتجر
async function loadStoreSettings() {
    console.log("جاري تحميل إعدادات المتجر...");
    
    try {
        const settings = await db.select('settings', {
            where: { column: 'id', value: 'store' }
        });
        
        if (settings && settings.length > 0) {
            storeSettings = settings[0];
            console.log("تم تحميل إعدادات المتجر:", storeSettings);
            
            // تحديث واجهة المستخدم بالإعدادات
            updateUIWithSettings();
            } else {
                console.log("إعدادات المتجر غير موجودة، سيتم إنشاء الإعدادات الافتراضية");
            await initializeStoreSettings();
            }
    } catch (error) {
            console.error("خطأ في تحميل إعدادات المتجر:", error);
        loadSettingsFromCache();
    }
}

// تهيئة إعدادات المتجر الافتراضية
async function initializeStoreSettings() {
    try {
        const result = await db.insert('settings', {
            id: 'store',
            store_name: 'Shomoukh',
            delivery_price: 800,
            phone: '',
            instagram: ''
        });
        
        if (result) {
            storeSettings = result[0];
            console.log("تم إنشاء إعدادات المتجر الافتراضية");
            updateUIWithSettings();
        }
    } catch (error) {
        console.error("خطأ في إنشاء إعدادات المتجر:", error);
    }
}

// تحديث واجهة المستخدم بإعدادات المتجر
function updateUIWithSettings() {
    // تحديث اسم المتجر
    document.querySelectorAll('.store-name').forEach(el => {
        el.textContent = storeSettings.store_name || 'Shomoukh';
    });
    
    // تحديث سعر التوصيل
    document.querySelectorAll('.delivery-price').forEach(el => {
        el.textContent = (storeSettings.delivery_price || 800).toLocaleString() + ' دج';
    });
    
    // تحديث معلومات الاتصال في التذييل
    const footerPhone = document.getElementById('footer-phone');
    if (footerPhone && storeSettings.phone) {
        footerPhone.href = `tel:${storeSettings.phone}`;
        footerPhone.querySelector('span').textContent = storeSettings.phone;
    }
    
    const footerInstagram = document.getElementById('footer-instagram');
    if (footerInstagram && storeSettings.instagram) {
        footerInstagram.href = `https://instagram.com/${storeSettings.instagram}`;
        footerInstagram.querySelector('span').textContent = storeSettings.instagram;
    }
}

// تحميل المنتجات من قاعدة البيانات
async function loadProducts() {
    console.log("جاري تحميل المنتجات...");
    
    try {
        const productsList = await db.select('products');
        
        products = productsList.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            hasMultipleAngles: p.has_multiple_angles || false,
            additionalImages: p.additional_images || []
        }));
            
            console.log(`تم تحميل ${products.length} منتج`);
            
        // تخزين المنتجات في ذاكرة التخزين المؤقت للاستخدام أثناء عدم الاتصال
            if (products.length > 0) {
                localStorage.setItem('cachedProducts', JSON.stringify(products));
            }
            
            // التحقق من وجود منتجات
            if (products.length === 0) {
            console.log("لا توجد منتجات، سيتم إنشاء منتجات افتراضية");
            await initializeDefaultProducts();
            } else {
                updateProductsDisplay();
            }
    } catch (error) {
            console.error("خطأ في تحميل المنتجات:", error);
            loadProductsFromCache();
    }
}

// تحميل المنتجات من التخزين المؤقت
function loadProductsFromCache() {
    console.log("محاولة تحميل المنتجات من ذاكرة التخزين المؤقت");
    const cachedProducts = localStorage.getItem('cachedProducts');
    
    if (cachedProducts) {
        products = JSON.parse(cachedProducts);
        console.log(`تم تحميل ${products.length} منتج من التخزين المؤقت`);
        updateProductsDisplay();
    } else {
        console.log("لا توجد منتجات مخزنة، سيتم إنشاء منتجات افتراضية");
        products = [
            { id: 'default1', name: 'فستان سهرة أنيق', price: 12000, image: 'images/placeholder.jpg', hasMultipleAngles: false, additionalImages: [] },
            { id: 'default2', name: 'فستان زفاف أبيض', price: 25000, image: 'images/placeholder.jpg', hasMultipleAngles: false, additionalImages: [] },
            { id: 'default3', name: 'فستان تطريز ذهبي', price: 18000, image: 'images/placeholder.jpg', hasMultipleAngles: false, additionalImages: [] },
            { id: 'default4', name: 'فستان حفلة راقي', price: 15000, image: 'images/placeholder.jpg', hasMultipleAngles: false, additionalImages: [] }
        ];
        updateProductsDisplay();
        showOfflineMessage();
    }
}

// تحديث عرض المنتجات في الصفحة
function updateProductsDisplay() {
    const productsGrid = document.querySelector('.products-grid');
    
    if (!productsGrid) return;
    
    // إفراغ القائمة
    productsGrid.innerHTML = '';
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined') || path === '') {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إضافة المنتجات
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // التحقق من مسار الصورة قبل عرضها
        const imagePath = checkImagePath(product.image);
        
        // إنشاء زر معاينة التفاصيل - سيكون مختلفاً بناءً على وجود زوايا متعددة
        let detailsButtonText = product.hasMultipleAngles && product.additionalImages && product.additionalImages.length > 0 
            ? 'عرض الزوايا المتعددة' 
            : 'عرض التفاصيل';
        
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${imagePath}" alt="${product.name}" onerror="this.src='images/placeholder.jpg'">
                ${product.hasMultipleAngles ? '<span class="multiple-views-badge"><i class="fas fa-clone"></i></span>' : ''}
                <button class="view-details-btn" onclick="showProductDetails('${product.id}')">${detailsButtonText}</button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">${product.price.toLocaleString()} دج</p>
                <button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${imagePath}')">
                    <i class="fas fa-shopping-cart"></i>
                    <span>أضف للسلة</span>
                </button>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
}

// إنشاء منتجات افتراضية
async function initializeDefaultProducts() {
    const defaultProducts = [
        { 
            name: 'فستان سهرة أنيق', 
            price: 12000, 
            image: 'images/placeholder.jpg', 
            has_multiple_angles: false, 
            additional_images: [] 
        },
        { 
            name: 'فستان زفاف أبيض', 
            price: 25000, 
            image: 'images/placeholder.jpg', 
            has_multiple_angles: false, 
            additional_images: [] 
        },
        { 
            name: 'فستان تطريز ذهبي', 
            price: 18000, 
            image: 'images/placeholder.jpg', 
            has_multiple_angles: false, 
            additional_images: [] 
        },
        { 
            name: 'فستان حفلة راقي', 
            price: 15000, 
            image: 'images/placeholder.jpg', 
            has_multiple_angles: false, 
            additional_images: [] 
        }
    ];
    
    console.log("جاري إضافة المنتجات الافتراضية...");
    
    try {
        for (const product of defaultProducts) {
            await db.insert('products', product);
            console.log(`تمت إضافة المنتج ${product.name}`);
        }
        
        console.log("تم إضافة المنتجات الافتراضية بنجاح");
        loadProducts(); // إعادة تحميل المنتجات
    } catch (error) {
        console.error("خطأ في إضافة المنتجات الافتراضية:", error);
        products = defaultProducts.map((p, index) => ({
            id: 'default' + (index + 1),
            name: p.name,
            price: p.price,
            image: p.image,
            hasMultipleAngles: p.has_multiple_angles,
            additionalImages: p.additional_images
        }));
        updateProductsDisplay();
    }
}

// إضافة منتج للسلة
function addToCart(id, name, price, image) {
    // البحث عن المنتج في السلة
    const existingItem = cartItems.find(item => item.id === id);
    
    if (existingItem) {
        // زيادة الكمية إذا كان المنتج موجود بالفعل
        existingItem.quantity++;
    } else {
        // إضافة المنتج إلى السلة
        cartItems.push({
            id: id,
            name: name,
            price: price,
            image: image,
            quantity: 1
        });
    }
    
    // تحديث عرض السلة
    updateCartItems();
    
    // حفظ السلة في التخزين المؤقت
    saveCart();
    
    // إظهار رسالة تأكيد
    showToast(`تم إضافة ${name} إلى السلة`);
}

// حفظ عناصر السلة في التخزين المؤقت
function saveCart() {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

// استعادة عناصر السلة المحفوظة
function loadCart() {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
        updateCartCount();
    }
}

// تحديث عدد العناصر في السلة
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    const totalCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalCount;
}

// عرض السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
                    </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إنشاء وظيفة إرسال الطلب إلى قاعدة البيانات
async function submitOrder(orderData) {
    try {
        const result = await db.insert('orders', orderData);
        
        if (result) {
            console.log("تم إرسال الطلب بنجاح:", result);
            return true;
        }
        return false;
    } catch (error) {
        console.error("خطأ في إرسال الطلب:", error);
        
        // حفظ الطلب محلياً في حالة الفشل للمزامنة لاحقاً
        const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        pendingOrders.push(orderData);
        localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
        
        return false;
    }
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
                </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
            </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
        modal.classList.remove('show');
        setTimeout(() => {
        modal.style.display = 'none';
        }, 300);
    }

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
        </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
        updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
        updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
            return;
        }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
        updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}
    
    // إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
            setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath = (path) => {
        // استخدام صورة بديلة إذا كان المسار غير صحيح
        if (!path || path.includes('undefined')) {
            return 'images/placeholder.jpg';
        }
        return path;
    };
    
    // إنشاء عناصر السلة
    cartItems.forEach((item, index) => {
        total += item.price * item.quantity;
        
        // تصحيح مسار الصورة
        const imagePath = checkImagePath(item.image);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${imagePath}" alt="${item.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2EwYTBhMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7YtdmI2LHYqSDYutmK2LEg2YXYqtmI2YHYsdipPC90ZXh0Pjwvc3ZnPg=='">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-price">${item.price.toLocaleString()} دج</p>
                <div class="quantity-controls">
                    <button type="button" onclick="decreaseQuantity(${index})">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <button type="button" class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        cartItemsContainer.appendChild(itemElement);
    });
    
    // تحديث المجموع
    totalPriceElement.textContent = total.toLocaleString() + ' دج';
}

// إظهار السلة
function showCart() {
    const modal = document.getElementById('cart-modal');
    
    if (!modal) {
        console.error("لم يتم العثور على نافذة السلة!");
        return;
    }
    
    // تحديث عناصر السلة
    updateCartItems();
    
    // التأكد من وجود مربع النص في النافذة
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            const cartItemsElement = document.createElement('div');
            cartItemsElement.id = 'cart-items';
            modalBody.appendChild(cartItemsElement);
            console.log("تم إنشاء عنصر لعرض عناصر السلة");
        }
    }
    
    // التأكد من وجود عنصر لعرض المجموع
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) {
        console.warn("لم يتم العثور على عنصر المجموع في السلة!");
    }
    
    // إظهار النافذة
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// إخفاء السلة
function hideCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// تحديث عناصر السلة
function updateCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    
    if (!cartItemsContainer || !totalPriceElement) return;
    
    // تحديث عدد العناصر في السلة
    updateCartCount();
    
    // مسح محتوى السلة الحالي
    cartItemsContainer.innerHTML = '';
    
    // إذا كانت السلة فارغة
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>سلة المشتريات فارغة</p></div>';
        totalPriceElement.textContent = '0 دج';
        return;
    }
    
    // حساب المجموع
    let total = 0;
    
    // التحقق من مسار الصور
    const checkImagePath