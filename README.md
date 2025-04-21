# Monad Game Project

> **تنبيه**: تم تنظيف المشروع وإزالة الملفات المكررة. يرجى الاطلاع على ملف `README-ORGANIZATION.md` و `CLEANUP-PLAN.md` للحصول على تفاصيل حول هيكل المشروع الجديد.

> **Note**: This project has been cleaned up and duplicate files have been removed. Please see `README-ORGANIZATION.md` and `CLEANUP-PLAN.md` for details about the new project structure.

# لعبة الداما التركية على شبكة Monad Testnet

لعبة داما تركية تقليدية مع دعم كامل لشبكة Monad Testnet. استمتع باللعب ضد أصدقائك أو ضد الذكاء الاصطناعي واربح رموز BTM الرقمية كمكافآت!

## المميزات

- لعبة داما تركية كاملة المزايا مع واجهة مستخدم سلسة
- دعم كامل لشبكة Monad Testnet
- نظام مكافآت لامركزي باستخدام عقود ERC-20 الذكية
- إمكانية اللعب في غرف متعددة مع أصدقائك
- دعم الدردشة داخل اللعبة
- نظام تصنيف وترتيب اللاعبين

## متطلبات النظام

- متصفح حديث
- محفظة MetaMask أو أي محفظة متوافقة مع شبكة Monad
- رموز MON للتفاعل مع شبكة Monad Testnet

## بدء الاستخدام

1. قم بتثبيت محفظة MetaMask أو أي محفظة متوافقة مع EVM
2. أضف شبكة Monad Testnet إلى محفظتك:
   - اسم الشبكة: Monad Testnet
   - عنوان RPC: https://testnet-rpc.monad.xyz
   - معرف السلسلة (Chain ID): 10143
   - رمز العملة: MON
   - مستكشف الكتل: https://testnet.monadexplorer.com
3. احصل على رموز MON من [فوست شبكة Monad](https://testnet.monad.xyz/)
4. شغّل اللعبة وابدأ في الاستمتاع!

## كيف تلعب

1. قم بتوصيل محفظتك بالضغط على زر "ربط المحفظة"
2. اختر وضع اللعب (ضد صديق أو ضد الذكاء الاصطناعي)
3. قم بتحريك القطع باستخدام النقر والسحب
4. اربح المباريات لكسب رموز BTM!

## للمطورين

### متطلبات التطوير

- Node.js v16 أو أحدث
- npm v8 أو أحدث

### تثبيت وتشغيل المشروع

```bash
# تثبيت التبعيات
npm install

# تشغيل الخادم المحلي
npm run dev:all
```

## معلومات الشبكة

- اسم الشبكة: Monad Testnet
- عنوان RPC: https://testnet-rpc.monad.xyz
- معرف السلسلة (Chain ID): 10143
- رمز العملة: MON
- مستكشف الكتل: https://testnet.monadexplorer.com

## عقد BTM Token

- عنوان العقد: 0x59d6d0ADB836Ed25a3E7921ded05BF1997E82b8d
- المعيار: ERC-20
- الرمز: BTM

## الترخيص

هذا المشروع مرخص تحت رخصة MIT. 