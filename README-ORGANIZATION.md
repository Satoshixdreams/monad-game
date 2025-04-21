# تنظيم مشروع Monad Game

## هيكل الملفات والخوادم

### 1. خادم التطوير (المجلد الرئيسي)
- الملف: `server.js` في المجلد الرئيسي `C:\Users\berli\project-bolt last one`
- المنفذ: 3001
- الوصف: خادم بسيط يستخدم Express فقط للتطوير والاختبار
- لتشغيله: `node server.js` أو النقر على `start-dev-server.bat` من المجلد الرئيسي

### 2. خادم اللعبة (مجلد monad-game)
- الملف: `server.js` في `C:\Users\berli\project-bolt last one\project\monad-game`
- المنفذ: 3002
- الوصف: خادم كامل للعبة يستخدم Socket.io للتواصل في الوقت الحقيقي وإدارة غرف اللعب
- التكوين: يستخدم ملف `server-config.js` للإعدادات
- لتشغيله: `node server.js` أو النقر على `start-server.bat` من مجلد monad-game

## هيكل المشروع بعد التنظيف

تم تنظيم المشروع ليكون بالهيكل التالي:

```
project-bolt/
├── server.js (خادم التطوير البسيط)
├── start-dev-server.bat
├── package.json (تبعيات خادم التطوير)
├── project/
│   ├── monad-game/
│   │   ├── server.js (خادم اللعبة الرئيسي)
│   │   ├── start-server.bat
│   │   ├── server-config.js
│   │   ├── package.json (تبعيات اللعبة)
│   │   ├── dist/
│   │   ├── game.js (منطق اللعبة)
│   │   ├── ui.jsx (واجهة المستخدم)
│   │   └── (ملفات مشروع اللعبة الأخرى)
```

## كيفية تشغيل الخوادم

### لتشغيل خادم التطوير (منفذ 3001):
```
cd "C:\Users\berli\project-bolt last one"
node server.js
```
أو النقر المزدوج على `start-dev-server.bat`

### لتشغيل خادم اللعبة (منفذ 3002):
```
cd "C:\Users\berli\project-bolt last one\project\monad-game"
node server.js
```
أو النقر المزدوج على `start-server.bat`

## ملاحظات هامة
- تم إزالة الملفات المكررة من المجلد الوسيط `project` والاحتفاظ بالنسخ في `project\monad-game`
- لا تقم بتشغيل الخادمين في نفس الوقت إذا كنت تستخدم نفس المنفذ
- تأكد من تثبيت جميع التبعيات باستخدام `npm install` في كل من المجلد الرئيسي ومجلد `project\monad-game`

# Project Organization - Monad Game

## File Structure and Servers

### 1. Development Server (Root Directory)
- File: `server.js` in the root directory `C:\Users\berli\project-bolt last one`
- Port: 3001
- Description: Simple server using only Express for development and testing
- To run: `node server.js` or click on `start-dev-server.bat` from the root directory

### 2. Game Server (monad-game directory)
- File: `server.js` in `C:\Users\berli\project-bolt last one\project\monad-game`
- Port: 3002  
- Description: Full game server using Socket.io for real-time communication and game room management
- Configuration: Uses `server-config.js` file for settings
- To run: `node server.js` or click on `start-server.bat` from the monad-game directory

## Project Structure After Cleanup

The project has been organized to have the following structure:

```
project-bolt/
├── server.js (simple development server)
├── start-dev-server.bat
├── package.json (development server dependencies)
├── project/
│   ├── monad-game/
│   │   ├── server.js (main game server)
│   │   ├── start-server.bat
│   │   ├── server-config.js
│   │   ├── package.json (game dependencies)
│   │   ├── dist/
│   │   ├── game.js (game logic)
│   │   ├── ui.jsx (user interface)
│   │   └── (other game project files)
```

## How to Run the Servers

### To run the development server (port 3001):
```
cd "C:\Users\berli\project-bolt last one"
node server.js
```
Or double-click on `start-dev-server.bat`

### To run the game server (port 3002):
```
cd "C:\Users\berli\project-bolt last one\project\monad-game"
node server.js
```
Or double-click on `start-server.bat`

## Important Notes
- Duplicate files were removed from the intermediate `project` directory and kept in the `project\monad-game` directory
- Do not run both servers at the same time if using the same port
- Make sure all dependencies are installed using `npm install` in both the root directory and the `project\monad-game` directory 