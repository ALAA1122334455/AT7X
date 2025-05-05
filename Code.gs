// 1. قم بإنشاء جدول بيانات جوجل جديد (Google Sheet).
// 2. انسخ "معرف جدول البيانات" (Spreadsheet ID) من عنوان URL الخاص به.
//    (مثال: في https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit, المعرف هو SPREADSHEET_ID)
// 3. افتح محرر البرامج النصية (Script editor) من داخل جدول البيانات (Tools > Script editor).
// 4. الصق هذا الكود في المحرر واستبدل "YOUR_SPREADSHEET_ID" بمعرف جدول البيانات الخاص بك.
// 5. استبدل "YOUR_CHOSEN_PASSWORD" بكلمة المرور التي تريدها للوصول إلى الإحصائيات.
// 6. انشر البرنامج النصي كتطبيق ويب (Deploy > New deployment):
//    - اختر "Web app" كنوع.
//    - في "Execute as"، اختر "Me (your email address)".
//    - في "Who has access"، اختر "Anyone". **مهم:** هذا لا يعني أن أي شخص يمكنه رؤية البيانات، فقط أن أي شخص يمكنه *تشغيل* البرنامج النصي (مثل تسجيل زيارة). الوصول إلى البيانات محمي بكلمة المرور التي اخترتها.
//    - انقر فوق "Deploy".
// 7. قم بمنح الأذونات اللازمة عند الطلب.
// 8. انسخ "عنوان URL لتطبيق الويب" (Web app URL) الذي تم إنشاؤه. ستحتاجه لملفات HTML.

var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; // <--- استبدل هذا بمعرف جدول البيانات الخاص بك
var PASSWORD = "YOUR_CHOSEN_PASSWORD"; // <--- استبدل هذا بكلمة المرور التي تريدها

// اسم الورقة داخل جدول البيانات لتخزين الطوابع الزمنية
var SHEET_NAME = "Visits";

function setup() {
  // يقوم بإنشاء الورقة إذا لم تكن موجودة
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss.getSheetByName(SHEET_NAME)) {
    ss.insertSheet(SHEET_NAME);
    ss.getSheetByName(SHEET_NAME).appendRow(["Timestamp"]); // إضافة رأس للعمود
    Logger.log("Sheet '" + SHEET_NAME + "' created.");
  } else {
    Logger.log("Sheet '" + SHEET_NAME + "' already exists.");
  }
}

function recordVisit() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      // إذا لم تكن الورقة موجودة، قم بإنشائها أولاً
      setup();
      sheet = ss.getSheetByName(SHEET_NAME);
    }
    var timestamp = new Date();
    sheet.appendRow([timestamp]);
    return ContentService.createTextOutput("Visit recorded").setMimeType(ContentService.MimeType.TEXT);
  } catch (e) {
    Logger.log("Error recording visit: " + e);
    return ContentService.createTextOutput("Error recording visit: " + e).setMimeType(ContentService.MimeType.TEXT);
  }
}

function getStats(password) {
  if (password !== PASSWORD) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Incorrect password" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Sheet not found. Run setup function?" })).setMimeType(ContentService.MimeType.JSON);
    }
    // الحصول على جميع البيانات باستثناء الصف الأول (الرأس)
    var data = sheet.getDataRange().getValues();
    var timestamps = [];
    if (data.length > 1) {
      // تخطي الصف الأول (الرأس)
      for (var i = 1; i < data.length; i++) {
        if (data[i][0]) { // تأكد من أن الخلية ليست فارغة
          // تنسيق التاريخ ليكون أكثر قابلية للقراءة
          var date = new Date(data[i][0]);
          var formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss z");
          timestamps.push(formattedDate);
        }
      }
    }
    
    var stats = {
      visitCount: timestamps.length,
      visits: timestamps.reverse() // عرض الأحدث أولاً
    };
    
    return ContentService.createTextOutput(JSON.stringify(stats)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log("Error getting stats: " + e);
    return ContentService.createTextOutput(JSON.stringify({ error: "Error getting stats: " + e })).setMimeType(ContentService.MimeType.JSON);
  }
}

// نقطة الدخول الرئيسية لتطبيق الويب
function doGet(e) {
  // تحقق مما إذا كان الطلب مخصصًا للحصول على الإحصائيات (مع كلمة مرور)
  if (e.parameter.action === "getStats") {
    var providedPassword = e.parameter.password;
    if (!providedPassword) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Password required for stats" })).setMimeType(ContentService.MimeType.JSON);
    }
    return getStats(providedPassword);
  }
  // إذا لم يكن للحصول على الإحصائيات، افترض أنه تسجيل زيارة
  else {
    // ملاحظة: تسجيل الزيارة عبر GET ليس مثاليًا لأنه يمكن تخزينه مؤقتًا.
    // من الأفضل استخدام POST، ولكن للتبسيط ومع GitHub Pages، سنستخدم GET هنا.
    // يمكن تحسين ذلك لاحقًا إذا لزم الأمر.
    return recordVisit(); 
    // بدلاً من ذلك، يمكن جعل تسجيل الزيارة يتطلب action=recordVisit
    // if (e.parameter.action === "recordVisit") { return recordVisit(); }
    // return ContentService.createTextOutput("Invalid action").setMimeType(ContentService.MimeType.TEXT);
  }
}

// يمكنك أيضًا إضافة دالة doPost لتسجيل الزيارات إذا كنت تفضل ذلك
/*
function doPost(e) {
  // يمكنك هنا تحليل e.postData.contents إذا كنت ترسل JSON
  // أو استخدام e.parameter إذا كنت ترسل بيانات نموذج
  return recordVisit();
}
*/

