// تهيئة Supabase
const SUPABASE_URL = 'https://ujnojhgaopjabpmfrlvc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbm9qaGdhb3BqYWJwbWZybHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA2MzI0ODQsImV4cCI6MjAyNjIwODQ4NH0.8xOL9lvNGQ8U0LpVe8mN4p5XCo2ZaUyZ8_uukMbG5Ms';

// إنشاء اتصال Supabase
const supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// للوصول العام في التطبيق
window.supabase = supabase;

// تكوين وظائف مساعدة للتعامل مع قاعدة البيانات
window.db = {
    // تنفيذ استعلام Select
    async select(table, options = {}) {
        try {
            let query = supabase.from(table).select(options.columns || '*');
            
            // إضافة شروط البحث إن وجدت
            if (options.where) {
                const { column, operator, value } = options.where;
                query = query[operator || 'eq'](column, value);
            }
            
            // إضافة الترتيب إن وجد
            if (options.orderBy) {
                const { column, ascending } = options.orderBy;
                query = query.order(column, { ascending: ascending !== false });
            }
            
            // إضافة الحد والتخطي إن وجد
            if (options.limit) query = query.limit(options.limit);
            if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            
            const { data, error } = await query;
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`خطأ في استعلام ${table}:`, error.message);
            return [];
        }
    },
    
    // إضافة بيانات
    async insert(table, data) {
        try {
            const { data: result, error } = await supabase
                .from(table)
                .insert(data)
                .select();
            
            if (error) throw error;
            return result;
        } catch (error) {
            console.error(`خطأ في إضافة بيانات ${table}:`, error.message);
            return null;
        }
    },
    
    // تحديث بيانات
    async update(table, data, options = {}) {
        try {
            let query = supabase.from(table).update(data);
            
            // إضافة شروط البحث إن وجدت
            if (options.where) {
                const { column, operator, value } = options.where;
                query = query[operator || 'eq'](column, value);
            }
            
            const { data: result, error } = await query.select();
            
            if (error) throw error;
            return result;
        } catch (error) {
            console.error(`خطأ في تحديث بيانات ${table}:`, error.message);
            return null;
        }
    },
    
    // حذف بيانات
    async delete(table, options = {}) {
        try {
            let query = supabase.from(table).delete();
            
            // إضافة شروط البحث إن وجدت
            if (options.where) {
                const { column, operator, value } = options.where;
                query = query[operator || 'eq'](column, value);
            }
            
            const { error } = await query;
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`خطأ في حذف بيانات ${table}:`, error.message);
            return false;
        }
    },
    
    // الاشتراك في التغييرات
    subscribe(table, callback) {
        try {
            const channel = supabase.channel(`public:${table}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: table 
                }, payload => {
                    callback(payload);
                })
                .subscribe();
                
            return channel;
        } catch (error) {
            console.error(`خطأ في الاشتراك بتغييرات ${table}:`, error.message);
            return null;
        }
    }
};

// واجهة لرفع الملفات
window.storage = {
    // رفع ملف
    async upload(bucket, path, file) {
        try {
            const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });
                
            if (error) throw error;
            
            // إرجاع رابط العام للملف
            const { data: urlData } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(path);
                
            return urlData.publicUrl;
        } catch (error) {
            console.error(`خطأ في رفع الملف:`, error.message);
            return null;
        }
    },
    
    // حذف ملف
    async delete(bucket, path) {
        try {
            const { error } = await supabase
                .storage
                .from(bucket)
                .remove([path]);
                
            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`خطأ في حذف الملف:`, error.message);
            return false;
        }
    }
};

console.log("تم تهيئة Supabase بنجاح"); 