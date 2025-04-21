# خطة تنظيف وإزالة التكرار في مشروع Monad Game

## الملفات المكررة المحددة

### 1. ملفات الخادم:
- `server.js` في المجلد الرئيسي (خادم بسيط على المنفذ 3001)
- `server.js` في المجلد `/project` (خادم اللعبة الرئيسي على المنفذ 3002)
- `server.js` في المجلد `/project/monad-game` (نسخة من خادم اللعبة)

### 2. ملفات التطبيق:
- ملفات `.js` متطابقة في المجلدات `project` و `project/monad-game`:
  - `token-abi.js`
  - `wallet.js`
  - `game.js`
  - `bot.js`
  - `btm-api.js`
  - `btm-contract.js`
  - `index.js`
  - `main.js`
  - `ui.jsx`
  - وغيرها

### 3. ملفات التكوين:
- ملفات `package.json` و `package-lock.json` متكررة في ثلاثة مجلدات مختلفة
- ملفات `vite.config.js` و `tailwind.config.js` و `postcss.config.js` متكررة

### 4. ملفات النمط:
- `styles.css` مكرر في المجلدين `project` و `project/monad-game`

### 5. ملفات HTML:
- `index.html` مكرر في المجلدين `project` و `project/monad-game`

### 6. مجلدات مكررة:
- `node_modules` في ثلاثة مجلدات مختلفة
- مجلدات `.git` متعددة

## خطة التنظيف

### الخطوة 1: تنظيم هيكل المشروع
سنحافظ على هيكل المشروع التالي:
```
project-bolt/
├── server.js (خادم التطوير البسيط)
├── start-dev-server.bat
├── project/
│   ├── monad-game/
│   │   ├── server.js (خادم اللعبة الرئيسي)
│   │   ├── start-server.bat
│   │   ├── dist/
│   │   └── (ملفات المشروع الأخرى)
```

### الخطوة 2: إزالة الملفات المكررة
1. حذف ملف `server.js` من مجلد `project` (الاحتفاظ بالنسخة في `project/monad-game`)
2. حذف الملفات المكررة الأخرى من مجلد `project` والاحتفاظ بالنسخ في `project/monad-game`

### الخطوة 3: توحيد ملفات التكوين
1. الاحتفاظ بملف `package.json` في المجلد الرئيسي للخادم البسيط
2. الاحتفاظ بملف `package.json` في مجلد `project/monad-game` للعبة

### الخطوة 4: تحديث ملف README للتوثيق
1. تحديث ملف `README-ORGANIZATION.md` ليعكس الهيكل الجديد
2. إضافة تعليمات واضحة لاستخدام الخوادم

## خطوات التنفيذ

1. نسخ النسخ الاحتياطية من الملفات المهمة أولاً
2. حذف الملفات المكررة بعناية
3. اختبار الخوادم للتأكد من أنها تعمل بشكل صحيح بعد التنظيف

# Project Cleanup and Deduplication Plan for Monad Game

## Identified Duplicate Files

### 1. Server Files:
- `server.js` in root directory (simple server on port 3001)
- `server.js` in `/project` directory (main game server on port 3002)
- `server.js` in `/project/monad-game` directory (duplicate of game server)

### 2. Application Files:
- Identical `.js` files in both `project` and `project/monad-game` directories:
  - `token-abi.js`
  - `wallet.js`
  - `game.js`
  - `bot.js`
  - `btm-api.js`
  - `btm-contract.js`
  - `index.js`
  - `main.js`
  - `ui.jsx`
  - and others

### 3. Configuration Files:
- `package.json` and `package-lock.json` duplicated in three different directories
- `vite.config.js`, `tailwind.config.js`, and `postcss.config.js` duplicated

### 4. Style Files:
- `styles.css` duplicated in both `project` and `project/monad-game`

### 5. HTML Files:
- `index.html` duplicated in both `project` and `project/monad-game`

### 6. Duplicate Directories:
- `node_modules` in three different locations
- Multiple `.git` directories

## Cleanup Plan

### Step 1: Organize Project Structure
We will maintain the following project structure:
```
project-bolt/
├── server.js (simple development server)
├── start-dev-server.bat
├── project/
│   ├── monad-game/
│   │   ├── server.js (main game server)
│   │   ├── start-server.bat
│   │   ├── dist/
│   │   └── (other project files)
```

### Step 2: Remove Duplicate Files
1. Delete `server.js` from the `project` directory (keep the version in `project/monad-game`)
2. Delete other duplicated files from `project` directory and keep the versions in `project/monad-game`

### Step 3: Consolidate Configuration Files
1. Keep `package.json` in root directory for the simple server
2. Keep `package.json` in `project/monad-game` directory for the game

### Step 4: Update README for Documentation
1. Update `README-ORGANIZATION.md` to reflect the new structure
2. Add clear instructions for using the servers

## Implementation Steps

1. Make backups of important files first
2. Carefully remove duplicate files
3. Test the servers to ensure they work correctly after cleanup 