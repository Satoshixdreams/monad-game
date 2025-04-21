// حل مشكلة تعارض محافظ الإيثيريوم
(function() {
  // تخزين مؤقت للمزود الأصلي
  let originalEthereum = null;
  let ethereumProviders = [];
  
  // تعريف خاصية ethereum الآمنة
  if (!Object.getOwnPropertyDescriptor(window, 'ethereum')) {
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      get: function() {
        return originalEthereum;
      },
      set: function(newValue) {
        if (!originalEthereum) {
          originalEthereum = newValue;
        } else if (newValue && !ethereumProviders.includes(newValue)) {
          ethereumProviders.push(newValue);
        }
      }
    });
  }
  
  // منع إعادة تعريف ethereum
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (obj === window && prop === 'ethereum') {
      return window; // تجاهل محاولات إعادة تعريف ethereum
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  console.log('تم تثبيت حل مشكلة تعارض محافظ الإيثيريوم');
})(); 