#!/bin/bash

# سكريبت نشر لعبة الداما التركية على شبكة Monad

echo "بدء عملية النشر..."

# بناء المشروع
echo "بناء المشروع..."
npm run build

# التحقق من نجاح البناء
if [ $? -ne 0 ]; then
  echo "فشل البناء! تحقق من الأخطاء."
  exit 1
fi

# إنشاء النسخة الاحتياطية
echo "إنشاء نسخة احتياطية من النشر السابق..."
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
if [ -d "/var/www/monad-game" ]; then
  mkdir -p /var/www/backups
  tar -czf "/var/www/backups/monad-game-$TIMESTAMP.tar.gz" /var/www/monad-game
fi

# نسخ الملفات
echo "نسخ الملفات إلى المجلد المستهدف..."
mkdir -p /var/www/monad-game
cp -r dist/* /var/www/monad-game/
cp server.js /var/www/monad-game/
cp package.json /var/www/monad-game/
cp ethereum-fix.js /var/www/monad-game/

# تثبيت التبعيات
echo "تثبيت التبعيات..."
cd /var/www/monad-game
npm install --production

# إعادة تشغيل الخدمة
echo "إعادة تشغيل الخدمة..."
pm2 restart monad-game || pm2 start server.js --name monad-game

# ضبط التصاريح
echo "ضبط التصاريح..."
chown -R www-data:www-data /var/www/monad-game

# إعادة تشغيل nginx
echo "إعادة تشغيل خادم الويب..."
systemctl restart nginx

echo "تم النشر بنجاح!"
echo "يمكنك الوصول إلى الموقع على https://bitmon.site" 