import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sampleDir = path.resolve("data/samples");

function colName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

async function writeWorkbook(fileName, headers, rows, tableName) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("Sheet1");
  const matrix = [headers, ...rows];
  const range = sheet.getRange(`A1:${colName(headers.length - 1)}${matrix.length}`);
  range.values = matrix;
  sheet.freezePanes.freezeRows(1);
  sheet.getRange(`A1:${colName(headers.length - 1)}1`).format = {
    fill: "#E8F3FF",
    font: { bold: true, color: "#0F172A" },
  };
  range.format.borders = { preset: "all", style: "thin", color: "#D9E2EC" };
  range.format.wrapText = true;
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i];
    const width = Math.max(92, Math.min(240, header.length * 13 + 44));
    sheet.getRange(`${colName(i)}:${colName(i)}`).format.columnWidthPx = width;
  }
  sheet.tables.add(`A1:${colName(headers.length - 1)}${matrix.length}`, true, tableName);
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path.join(sampleDir, fileName));
}

const now = "2026-06-10 14:00:00";

const usersHeaders = [
  "user_id",
  "login_account",
  "password_hash",
  "login_password",
  "role",
  "nickname",
  "avatar_url",
  "QQ",
  "account_status",
  "current_session_id",
  "last_login_at",
  "created_at",
  "updated_at",
];

const usersRows = [
  ["10001", "stu10001", "$2b$12$sample_hash_for_123456_user_10001", "student", "张同学", "/avatars/10001.png", "248100101", "active", "S-10001-20260610-A", "2026-06-10 08:20:00", "2026-05-18 09:00:00", now],
  ["10002", "stu10002", "$2b$12$sample_hash_for_123456_user_10002", "student", "李知远", "/avatars/10002.png", "248100102", "active", "S-10002-20260610-A", "2026-06-10 08:10:00", "2026-05-18 09:00:00", now],
  ["10003", "stu10003", "$2b$12$sample_hash_for_123456_user_10003", "student", "王思敏", "/avatars/10003.png", "248100103", "paused", "", "2026-06-09 22:12:00", "2026-05-18 09:00:00", now],
  ["10004", "stu10004", "$2b$12$sample_hash_for_123456_user_10004", "student", "周子涵", "/avatars/10004.png", "248100104", "active", "S-10004-20260610-A", "2026-06-10 07:54:00", "2026-05-18 09:00:00", now],
  ["10005", "stu10005", "$2b$12$sample_hash_for_123456_user_10005", "student", "赵宇航", "/avatars/10005.png", "248100105", "active", "S-10005-20260610-A", "2026-06-10 07:58:00", "2026-05-18 09:00:00", now],
  ["10006", "stu10006", "$2b$12$sample_hash_for_123456_user_10006", "student", "刘雨桐", "/avatars/10006.png", "248100106", "active", "S-10006-20260610-A", "2026-06-10 08:03:00", "2026-05-18 09:00:00", now],
  ["10007", "stu10007", "$2b$12$sample_hash_for_123456_user_10007", "student", "陈奕然", "/avatars/10007.png", "248100107", "active", "S-10007-20260610-A", "2026-06-10 08:01:00", "2026-05-18 09:00:00", now],
  ["10008", "stu10008", "$2b$12$sample_hash_for_123456_user_10008", "student", "林可欣", "/avatars/10008.png", "248100108", "active", "S-10008-20260610-A", "2026-06-10 07:43:00", "2026-05-18 09:00:00", now],
  ["10009", "stu10009", "$2b$12$sample_hash_for_123456_user_10009", "student", "韩子墨", "/avatars/10009.png", "248100109", "disabled", "", "2026-06-01 20:31:00", "2026-05-18 09:00:00", now],
  ["10010", "stu10010", "$2b$12$sample_hash_for_123456_user_10010", "student", "许一诺", "/avatars/10010.png", "248100110", "active", "S-10010-20260610-A", "2026-06-10 07:50:00", "2026-05-18 09:00:00", now],
  ["10011", "stu10011", "$2b$12$sample_hash_for_123456_user_10011", "student", "沈知夏", "/avatars/10011.png", "248100111", "active", "S-10011-20260610-A", "2026-06-10 08:05:00", "2026-05-20 09:00:00", now],
  ["10012", "stu10012", "$2b$12$sample_hash_for_123456_user_10012", "student", "顾星辰", "/avatars/10012.png", "248100112", "active", "S-10012-20260610-A", "2026-06-10 08:08:00", "2026-05-20 09:00:00", now],
  ["10013", "stu10013", "$2b$12$sample_hash_for_123456_user_10013", "student", "唐若宁", "/avatars/10013.png", "248100113", "active", "S-10013-20260610-A", "2026-06-10 07:48:00", "2026-05-20 09:00:00", now],
  ["10014", "stu10014", "$2b$12$sample_hash_for_123456_user_10014", "student", "魏承泽", "/avatars/10014.png", "248100114", "active", "S-10014-20260610-A", "2026-06-10 08:15:00", "2026-05-20 09:00:00", now],
  ["10015", "stu10015", "$2b$12$sample_hash_for_123456_user_10015", "student", "苏景行", "/avatars/10015.png", "248100115", "active", "S-10015-20260610-A", "2026-06-10 07:41:00", "2026-05-20 09:00:00", now],
  ["10016", "stu10016", "$2b$12$sample_hash_for_123456_user_10016", "student", "蒋一然", "/avatars/10016.png", "248100116", "active", "S-10016-20260610-A", "2026-06-10 08:25:00", "2026-05-20 09:00:00", now],
  ["10017", "stu10017", "$2b$12$sample_hash_for_123456_user_10017", "student", "宋清越", "/avatars/10017.png", "248100117", "active", "S-10017-20260610-A", "2026-06-10 08:18:00", "2026-05-20 09:00:00", now],
  ["10018", "stu10018", "$2b$12$sample_hash_for_123456_user_10018", "student", "程予安", "/avatars/10018.png", "248100118", "active", "S-10018-20260610-A", "2026-06-10 07:39:00", "2026-05-20 09:00:00", now],
  ["10019", "stu10019", "$2b$12$sample_hash_for_123456_user_10019", "student", "孟云舟", "/avatars/10019.png", "248100119", "active", "S-10019-20260610-A", "2026-06-10 08:12:00", "2026-05-20 09:00:00", now],
  ["10020", "stu10020", "$2b$12$sample_hash_for_123456_user_10020", "student", "叶嘉树", "/avatars/10020.png", "248100120", "active", "S-10020-20260610-A", "2026-06-10 08:29:00", "2026-05-20 09:00:00", now],
  ["10021", "stu10021", "$2b$12$sample_hash_for_123456_user_10021", "student", "秦书禾", "/avatars/10021.png", "248100121", "active", "S-10021-20260610-A", "2026-06-10 07:57:00", "2026-05-20 09:00:00", now],
  ["10022", "stu10022", "$2b$12$sample_hash_for_123456_user_10022", "student", "傅明朗", "/avatars/10022.png", "248100122", "active", "S-10022-20260610-A", "2026-06-10 08:33:00", "2026-05-20 09:00:00", now],
  ["90001", "teacher01", "$2b$12$sample_hash_for_teacher01", "teacher", "王老师", "/avatars/teacher01.png", "724810001", "active", "S-90001-20260610-A", "2026-06-10 09:00:00", "2026-05-18 09:00:00", now],
  ["90002", "admin01", "$2b$12$sample_hash_for_admin01", "admin", "运营管理员", "/avatars/admin01.png", "724810002", "active", "S-90002-20260610-A", "2026-06-10 09:30:00", "2026-05-18 09:00:00", now],
];

const userAvatarPool = [
  "assets/images/avatars/user/B_kaoyan_avatar_01.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_02.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_03.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_04.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_05.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_06.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_07.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_08.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_10.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_11.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_12.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_13.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_15.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_16.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_17.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_18.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_19.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_24.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_25.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_26.webp",
  "assets/images/avatars/user/G_kaoyan_avatar_27.webp",
  "assets/images/avatars/user/B_kaoyan_avatar_28.webp",
];

function avatarIndexForUserId(userId) {
  return String(userId)
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0) % userAvatarPool.length;
}

const usersRowsWithAvatars = usersRows.map((row) => {
  if (row[3] !== "student") return row;
  const nextRow = [...row];
  nextRow[5] = userAvatarPool[avatarIndexForUserId(row[0])];
  return nextRow;
});

const usersRowsWithLoginPasswords = usersRowsWithAvatars.map((row) => [
  row[0],
  row[1],
  row[2],
  "123456",
  ...row.slice(3),
]);

const userSessionsHeaders = [
  "session_id",
  "user_id",
  "refresh_token_hash",
  "device_id",
  "device_name",
  "ip_address",
  "user_agent",
  "expires_at",
  "revoked_at",
  "created_at",
  "updated_at",
];

const userSessionsRows = [
  ["S-10001-20260610-A", "10001", "$sha256$sample_refresh_token_hash_10001_A", "D-10001-IP13", "iPhone 13 Safari", "120.245.10.11", "Mobile Safari iOS", "2026-07-10 08:20:00", "", "2026-06-10 08:20:00", now],
  ["S-10001-20260609-OLD", "10001", "$sha256$sample_refresh_token_hash_10001_old", "D-10001-PC", "Windows Edge", "120.245.10.12", "Microsoft Edge Windows", "2026-07-09 22:00:00", "2026-06-10 08:20:00", "2026-06-09 22:00:00", "2026-06-10 08:20:00"],
  ["S-10002-20260610-A", "10002", "$sha256$sample_refresh_token_hash_10002_A", "D-10002-IP14", "iPhone 14 Safari", "120.245.10.21", "Mobile Safari iOS", "2026-07-10 08:10:00", "", "2026-06-10 08:10:00", now],
  ["S-10004-20260610-A", "10004", "$sha256$sample_refresh_token_hash_10004_A", "D-10004-HM", "HarmonyOS Browser", "120.245.10.41", "Huawei Browser Mobile", "2026-07-10 07:54:00", "", "2026-06-10 07:54:00", now],
  ["S-10005-20260610-A", "10005", "$sha256$sample_refresh_token_hash_10005_A", "D-10005-IP12", "iPhone 12 Safari", "120.245.10.51", "Mobile Safari iOS", "2026-07-10 07:58:00", "", "2026-06-10 07:58:00", now],
  ["S-10006-20260610-A", "10006", "$sha256$sample_refresh_token_hash_10006_A", "D-10006-MI", "Xiaomi Browser", "120.245.10.61", "Miui Browser Mobile", "2026-07-10 08:03:00", "", "2026-06-10 08:03:00", now],
  ["S-10007-20260610-A", "10007", "$sha256$sample_refresh_token_hash_10007_A", "D-10007-IP15", "iPhone 15 Safari", "120.245.10.71", "Mobile Safari iOS", "2026-07-10 08:01:00", "", "2026-06-10 08:01:00", now],
  ["S-10008-20260610-A", "10008", "$sha256$sample_refresh_token_hash_10008_A", "D-10008-OPPO", "OPPO Browser", "120.245.10.81", "Oppo Browser Mobile", "2026-07-10 07:43:00", "", "2026-06-10 07:43:00", now],
  ["S-10010-20260610-A", "10010", "$sha256$sample_refresh_token_hash_10010_A", "D-10010-IP13", "iPhone 13 Safari", "120.245.10.101", "Mobile Safari iOS", "2026-07-10 07:50:00", "", "2026-06-10 07:50:00", now],
  ["S-10011-20260610-A", "10011", "$sha256$sample_refresh_token_hash_10011_A", "D-10011-IP14", "iPhone 14 Safari", "120.245.10.111", "Mobile Safari iOS", "2026-07-10 08:05:00", "", "2026-06-10 08:05:00", now],
  ["S-10012-20260610-A", "10012", "$sha256$sample_refresh_token_hash_10012_A", "D-10012-MI", "Xiaomi Browser", "120.245.10.112", "Miui Browser Mobile", "2026-07-10 08:08:00", "", "2026-06-10 08:08:00", now],
  ["S-10013-20260610-A", "10013", "$sha256$sample_refresh_token_hash_10013_A", "D-10013-IP13", "iPhone 13 Safari", "120.245.10.113", "Mobile Safari iOS", "2026-07-10 07:48:00", "", "2026-06-10 07:48:00", now],
  ["S-10014-20260610-A", "10014", "$sha256$sample_refresh_token_hash_10014_A", "D-10014-HM", "HarmonyOS Browser", "120.245.10.114", "Huawei Browser Mobile", "2026-07-10 08:15:00", "", "2026-06-10 08:15:00", now],
  ["S-10015-20260610-A", "10015", "$sha256$sample_refresh_token_hash_10015_A", "D-10015-OPPO", "OPPO Browser", "120.245.10.115", "Oppo Browser Mobile", "2026-07-10 07:41:00", "", "2026-06-10 07:41:00", now],
  ["S-10016-20260610-A", "10016", "$sha256$sample_refresh_token_hash_10016_A", "D-10016-IP15", "iPhone 15 Safari", "120.245.10.116", "Mobile Safari iOS", "2026-07-10 08:25:00", "", "2026-06-10 08:25:00", now],
  ["S-10017-20260610-A", "10017", "$sha256$sample_refresh_token_hash_10017_A", "D-10017-HM", "HarmonyOS Browser", "120.245.10.117", "Huawei Browser Mobile", "2026-07-10 08:18:00", "", "2026-06-10 08:18:00", now],
  ["S-10018-20260610-A", "10018", "$sha256$sample_refresh_token_hash_10018_A", "D-10018-IP12", "iPhone 12 Safari", "120.245.10.118", "Mobile Safari iOS", "2026-07-10 07:39:00", "", "2026-06-10 07:39:00", now],
  ["S-10019-20260610-A", "10019", "$sha256$sample_refresh_token_hash_10019_A", "D-10019-MI", "Xiaomi Browser", "120.245.10.119", "Miui Browser Mobile", "2026-07-10 08:12:00", "", "2026-06-10 08:12:00", now],
  ["S-10020-20260610-A", "10020", "$sha256$sample_refresh_token_hash_10020_A", "D-10020-IP14", "iPhone 14 Safari", "120.245.10.120", "Mobile Safari iOS", "2026-07-10 08:29:00", "", "2026-06-10 08:29:00", now],
  ["S-10021-20260610-A", "10021", "$sha256$sample_refresh_token_hash_10021_A", "D-10021-IP13", "iPhone 13 Safari", "120.245.10.121", "Mobile Safari iOS", "2026-07-10 07:57:00", "", "2026-06-10 07:57:00", now],
  ["S-10022-20260610-A", "10022", "$sha256$sample_refresh_token_hash_10022_A", "D-10022-HM", "HarmonyOS Browser", "120.245.10.122", "Huawei Browser Mobile", "2026-07-10 08:33:00", "", "2026-06-10 08:33:00", now],
  ["S-90001-20260610-A", "90001", "$sha256$sample_refresh_token_hash_90001_A", "D-90001-MAC", "MacBook Chrome", "120.245.20.1", "Chrome macOS", "2026-07-10 09:00:00", "", "2026-06-10 09:00:00", now],
  ["S-90001-20260609-OLD", "90001", "$sha256$sample_refresh_token_hash_90001_old", "D-90001-PC", "Windows Chrome", "120.245.20.2", "Chrome Windows", "2026-07-09 18:00:00", "2026-06-10 09:00:00", "2026-06-09 18:00:00", "2026-06-10 09:00:00"],
  ["S-90002-20260610-A", "90002", "$sha256$sample_refresh_token_hash_90002_A", "D-90002-MAC", "MacBook Safari", "120.245.20.9", "Safari macOS", "2026-07-10 09:30:00", "", "2026-06-10 09:30:00", now],
];

const classesHeaders = [
  "class_id",
  "class_name",
  "math_type",
  "target_exam_year",
  "level",
  "teacher_user_id",
  "group_name",
  "created_at",
  "updated_at",
];

const classesRows = [
  ["A201", "26考研数学二A01班", "数学二", "2026", "A", "90001", "26考研数学二A01群", "2026-05-18 09:00:00", now],
  ["A202", "26考研数二A02班", "数学二", "2026", "A", "90001", "26考研数二A02群", "2026-05-18 09:00:00", now],
  ["B201", "26考研数学二B01班", "数学二", "2026", "B", "90001", "26考研数学二B01群", "2026-05-18 09:00:00", now],
  ["B202", "26考研数学二B02班", "数学二", "2026", "B", "90001", "26考研数学二B02群", "2026-05-18 09:00:00", now],
  ["A101", "26考研数学一A01班", "数学一", "2026", "A", "90001", "26考研数学一A01群", "2026-05-18 09:00:00", now],
];

const studentProfilesHeaders = [
  "user_id",
  "math_type",
  "target_exam_year",
  "target_exam_date",
  "target_score",
  "class_id",
  "level",
  "plan_enabled",
  "paid_until",
  "primary_book_1",
  "primary_book_2",
  "backup_book",
  "current_type_id",
  "current_stage",
  "last_plan_date",
  "created_at",
  "updated_at",
];

const studentProfilesRows = [
  ["10001", "数学二", "2026", "2026-12-19", "120", "A201", "A", "1", "2026-07-30", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10002", "数学二", "2026", "2026-12-19", "120", "A201", "A", "1", "2026-08-29", "880", "1000", "660", "G-01-Z-02", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10003", "数学二", "2026", "2026-12-19", "120", "A201", "A", "0", "2026-09-28", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-09", "2026-05-18 09:00:00", now],
  ["10004", "数学二", "2026", "2026-12-19", "115", "B202", "B", "1", "2026-06-30", "880", "1000", "1800", "G-01-Z-02", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10005", "数学二", "2026", "2026-12-19", "110", "B202", "B", "1", "2026-07-30", "880", "1000", "1800", "G-01-Z-02", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10006", "数学二", "2026", "2026-12-19", "110", "B202", "B", "1", "2026-08-29", "880", "1000", "1800", "G-01-Z-01", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10007", "数学一", "2026", "2026-12-19", "125", "A101", "A", "1", "2026-09-28", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10008", "数学一", "2026", "2026-12-19", "120", "A101", "A", "1", "2026-07-30", "880", "1000", "660", "G-01-Z-02", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10009", "数学二", "2026", "2026-12-19", "105", "B202", "B", "0", "2026-06-01", "880", "1000", "1800", "G-01-Z-01", "强化", "2026-06-01", "2026-05-18 09:00:00", now],
  ["10010", "数学二", "2026", "2026-12-19", "118", "A201", "A", "1", "2026-08-29", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-10", "2026-05-18 09:00:00", now],
  ["10011", "数学二", "2026", "2026-12-19", "122", "A202", "A", "1", "2026-07-30", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10012", "数学二", "2026", "2026-12-19", "118", "A202", "A", "1", "2026-08-29", "880", "1000", "660", "G-01-Z-02", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10013", "数学二", "2026", "2026-12-19", "116", "A202", "A", "1", "2026-09-28", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10014", "数学二", "2026", "2026-12-19", "121", "A202", "A", "1", "2026-07-30", "880", "1000", "660", "G-01-Z-02", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10015", "数学二", "2026", "2026-12-19", "112", "B201", "B", "1", "2026-08-29", "880", "1000", "1800", "G-01-Z-01", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10016", "数学二", "2026", "2026-12-19", "109", "B201", "B", "1", "2026-09-28", "880", "1000", "1800", "G-01-Z-02", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10017", "数学二", "2026", "2026-12-19", "115", "B201", "B", "1", "2026-07-30", "880", "1000", "1800", "G-01-Z-01", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10018", "数学二", "2026", "2026-12-19", "108", "B201", "B", "1", "2026-08-29", "880", "1000", "1800", "G-01-Z-02", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10019", "数学二", "2026", "2026-12-19", "111", "B202", "B", "1", "2026-09-28", "880", "1000", "1800", "G-01-Z-01", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10020", "数学二", "2026", "2026-12-19", "113", "B202", "B", "1", "2026-07-30", "880", "1000", "1800", "G-01-Z-02", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10021", "数学一", "2026", "2026-12-19", "126", "A101", "A", "1", "2026-08-29", "880", "1000", "660", "G-01-Z-01", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
  ["10022", "数学一", "2026", "2026-12-19", "123", "A101", "A", "1", "2026-09-28", "880", "1000", "660", "G-01-Z-02", "强化", "2026-06-10", "2026-05-20 09:00:00", now],
];

const questionTypesHeaders = [
  "type_id",
  "sort_code",
  "subject",
  "chapter_id",
  "chapter_name",
  "content_block",
  "type_name",
  "parent_type_id",
  "suggested_days",
  "direct_assignable",
  "lecture_image_url",
  "input_note",
];

const questionTypesRows = [
  ["G-01-Z-01", "G-01-01-01-00", "高等数学", "G-01", "第一章 极限", "知识点", "函数极限概念辨析（注意复合函数极限）", "", "0.3", "1", "assets/images/type-limit-green.png", ""],
  ["G-01-Z-02", "G-01-01-02-00", "高等数学", "G-01", "第一章 极限", "知识点", "分左右讨论的极限", "", "0.2", "1", "assets/images/type-limit-purple.png", ""],
  ["G-01-T-01", "G-01-02-01-00", "高等数学", "G-01", "第一章 极限", "父级题型", "求极限（重点）", "", "", "0", "", "仅作父级目录；具体题目归属其子题型"],
  ["G-01-T-01-01", "G-01-02-01-01", "高等数学", "G-01", "第一章 极限", "子题型", "等价无穷小、泰勒展开、变限积分（重点）", "G-01-T-01", "0.8", "1", "", ""],
  ["G-01-T-01-02", "G-01-02-01-02", "高等数学", "G-01", "第一章 极限", "子题型", "洛必达", "G-01-T-01", "0.2", "1", "", ""],
  ["G-02-Z-01", "G-02-01-01-00", "高等数学", "G-02", "第二章 一元函数微分学", "知识点", "导数应用", "", "0.5", "1", "", "能力曲线诊断题型"],
  ["G-05-Z-01", "G-05-01-01-00", "高等数学", "G-05", "第五章 一元函数积分学", "知识点", "定积分", "", "0.6", "1", "", "能力曲线诊断题型"],
  ["G-06-Z-01", "G-06-01-01-00", "高等数学", "G-06", "第六章 积分应用", "知识点", "二重积分", "", "0.7", "1", "", "能力曲线诊断题型"],
  ["L-01-Z-01", "L-01-01-01-00", "线性代数", "L-01", "线性方程组", "知识点", "线性方程组", "", "0.5", "1", "", "能力曲线诊断题型"],
  ["L-02-Z-01", "L-02-01-01-00", "线性代数", "L-02", "特征值与特征向量", "知识点", "特征值", "", "0.5", "1", "", "能力曲线诊断题型"],
  ["P-01-Z-01", "P-01-01-01-00", "概率论", "P-01", "随机变量及其分布", "知识点", "随机变量分布", "", "0.4", "1", "", "能力曲线诊断题型"],
  ["G-07-Z-01", "G-07-01-01-00", "高等数学", "G-07", "空间解析几何", "知识点", "向量与空间解析几何", "", "0.4", "1", "", "能力曲线诊断题型"],
  ["G-08-Z-01", "G-08-01-01-00", "高等数学", "G-08", "无穷级数", "知识点", "无穷级数", "", "0.6", "1", "", "能力曲线诊断题型"],
];

const questionsHeaders = [
  "question_id",
  "type_id",
  "type_name_check",
  "question_note",
  "applicable_levels",
  "plan_stage",
  "source",
  "original_position_text",
  "question_order",
  "display_permission",
];

const questionsRows = [
  ["880-01-JC1-004", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "", "A,B,C,D", "强化", "880", "《880》第1章基础一第4题", "1", "仅显示题号"],
  ["880-01-JC1-005", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "", "A,B,C,D", "强化", "880", "《880》第1章基础一第5题", "2", "仅显示题号"],
  ["880-01-JC1-010", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "也可举反例", "A,B,C,D", "强化", "880", "《880》第1章基础一第10题", "3", "仅显示题号"],
  ["1000-01-QH-017", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "四则运算逆用", "A,B,C,D", "强化", "1000", "《1000》第1章强化第17题", "4", "仅显示题号"],
  ["1000-01-QH-018", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "", "A,B,C,D", "强化", "1000", "《1000》第1章强化第18题", "5", "仅显示题号"],
  ["1000-01-QH-024", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "", "A,B,C,D", "强化", "1000", "《1000》第1章强化第24题", "6", "仅显示题号"],
  ["1000-01-QH-032", "G-01-Z-02", "分左右讨论的极限", "", "A,B,C,D", "强化", "1000", "《1000》第1章强化第32题", "1", "仅显示题号"],
  ["880-01-QH1-021", "G-01-Z-02", "分左右讨论的极限", "", "A,B,C,D", "强化", "880", "《880》第1章强化一第21题", "2", "仅显示题号"],
];

const dailyPlansHeaders = [
  "plan_id",
  "user_id",
  "plan_date",
  "plan_status",
  "slogan",
  "exam_date",
  "days_to_exam",
  "type_index",
  "type_id",
  "type_name",
  "question_id",
  "source",
  "original_position_text",
  "question_order",
  "feedback_open_status",
  "created_at",
  "updated_at",
];

const dailyPlansRows = [
  ["P20260610-10001", "10001", "2026-06-10", "in_progress", "稳住节奏，今天也只需要完成眼前这一组。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-004", "880", "《880》第1章基础一第4题", "1", "open", "2026-06-10 06:00:00", now],
  ["P20260610-10001", "10001", "2026-06-10", "in_progress", "稳住节奏，今天也只需要完成眼前这一组。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-005", "880", "《880》第1章基础一第5题", "2", "open", "2026-06-10 06:00:00", now],
  ["P20260610-10001", "10001", "2026-06-10", "in_progress", "稳住节奏，今天也只需要完成眼前这一组。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-010", "880", "《880》第1章基础一第10题", "3", "open", "2026-06-10 06:00:00", now],
  ["P20260610-10001", "10001", "2026-06-10", "in_progress", "稳住节奏，今天也只需要完成眼前这一组。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "1000-01-QH-017", "1000", "《1000》第1章强化第17题", "4", "open", "2026-06-10 06:00:00", now],
  ["P20260610-10001", "10001", "2026-06-10", "in_progress", "稳住节奏，今天也只需要完成眼前这一组。", "2026-12-19", "192", "2", "G-01-Z-02", "分左右讨论的极限", "1000-01-QH-032", "1000", "《1000》第1章强化第32题", "1", "locked", "2026-06-10 06:00:00", now],
  ["P20260610-10002", "10002", "2026-06-10", "completed", "今天的反馈不是评判，是给明天少走弯路。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-004", "880", "《880》第1章基础一第4题", "1", "submitted", "2026-06-10 06:00:00", now],
  ["P20260610-10002", "10002", "2026-06-10", "completed", "今天的反馈不是评判，是给明天少走弯路。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-005", "880", "《880》第1章基础一第5题", "2", "submitted", "2026-06-10 06:00:00", now],
  ["P20260610-10002", "10002", "2026-06-10", "completed", "今天的反馈不是评判，是给明天少走弯路。", "2026-12-19", "192", "2", "G-01-Z-02", "分左右讨论的极限", "1000-01-QH-032", "1000", "《1000》第1章强化第32题", "1", "submitted", "2026-06-10 06:00:00", now],
  ["P20260610-10004", "10004", "2026-06-10", "blocked_by_unfinished", "别急着往后赶，先把这一组真正落下来。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-004", "880", "《880》第1章基础一第4题", "1", "submitted", "2026-06-10 06:00:00", now],
  ["P20260610-10004", "10004", "2026-06-10", "blocked_by_unfinished", "别急着往后赶，先把这一组真正落下来。", "2026-12-19", "192", "1", "G-01-Z-01", "函数极限概念辨析（注意复合函数极限）", "880-01-JC1-005", "880", "《880》第1章基础一第5题", "2", "submitted", "2026-06-10 06:00:00", now],
  ["P20260610-10004", "10004", "2026-06-10", "blocked_by_unfinished", "别急着往后赶，先把这一组真正落下来。", "2026-12-19", "192", "2", "G-01-Z-02", "分左右讨论的极限", "1000-01-QH-032", "1000", "《1000》第1章强化第32题", "1", "locked", "2026-06-10 06:00:00", now],
];

const questionFeedbacksHeaders = [
  "feedback_id",
  "plan_id",
  "user_id",
  "plan_date",
  "type_id",
  "question_id",
  "result",
  "is_wrong_record",
  "is_unfinished_blocker",
  "submitted_at",
  "created_at",
  "updated_at",
];

const questionFeedbacksRows = [
  ["F20260610-10002-001", "P20260610-10002", "10002", "2026-06-10", "G-01-Z-01", "880-01-JC1-004", "correct", "0", "0", "2026-06-10 21:10:00", "2026-06-10 21:10:00", now],
  ["F20260610-10002-002", "P20260610-10002", "10002", "2026-06-10", "G-01-Z-01", "880-01-JC1-005", "wrong", "1", "0", "2026-06-10 21:10:00", "2026-06-10 21:10:00", now],
  ["F20260610-10002-003", "P20260610-10002", "10002", "2026-06-10", "G-01-Z-02", "1000-01-QH-032", "correct", "0", "0", "2026-06-10 21:35:00", "2026-06-10 21:35:00", now],
  ["F20260610-10004-001", "P20260610-10004", "10004", "2026-06-10", "G-01-Z-01", "880-01-JC1-004", "correct", "0", "0", "2026-06-10 22:00:00", "2026-06-10 22:00:00", now],
  ["F20260610-10004-002", "P20260610-10004", "10004", "2026-06-10", "G-01-Z-01", "880-01-JC1-005", "unattempted", "1", "1", "2026-06-10 22:00:00", "2026-06-10 22:00:00", now],
];

const studentStatsHeaders = [
  "user_id",
  "stat_date",
  "continuous_days",
  "today_completion_rate",
  "weekly_completion_rate",
  "overall_accuracy",
  "repeat_wrong_rate",
  "current_badge_name",
  "next_badge_target",
  "badge_progress_value",
  "badge_progress_rate",
  "rank_in_class",
  "updated_at",
];

const studentStatsRows = [
  ["10001", "2026-06-10", "5", "0", "0.86", "0.74", "0.31", "暂无勋章", "7天连续学习勋章", "5", "0.7143", "8", now],
  ["10002", "2026-06-10", "18", "1", "0.94", "0.82", "0.22", "14天连续学习勋章", "21天连续学习勋章", "18", "0.8571", "1", now],
  ["10003", "2026-06-10", "15", "0", "0.88", "0.78", "0.26", "14天连续学习勋章", "21天连续学习勋章", "15", "0.7143", "2", now],
  ["10004", "2026-06-10", "23", "0.5", "0.91", "0.79", "0.24", "21天连续学习勋章", "30天连续学习勋章", "23", "0.7667", "1", now],
  ["10005", "2026-06-10", "19", "1", "0.87", "0.76", "0.28", "14天连续学习勋章", "21天连续学习勋章", "19", "0.9048", "2", now],
  ["10006", "2026-06-10", "17", "1", "0.82", "0.71", "0.34", "14天连续学习勋章", "21天连续学习勋章", "17", "0.8095", "3", now],
  ["10007", "2026-06-10", "12", "1", "0.92", "0.85", "0.18", "7天连续学习勋章", "14天连续学习勋章", "12", "0.8571", "1", now],
  ["10008", "2026-06-10", "9", "1", "0.84", "0.77", "0.27", "7天连续学习勋章", "14天连续学习勋章", "9", "0.6429", "2", now],
  ["10009", "2026-06-10", "0", "0", "0.2", "0.51", "0.46", "暂无勋章", "7天连续学习勋章", "0", "0", "4", now],
  ["10010", "2026-06-10", "7", "1", "0.9", "0.8", "0.25", "7天连续学习勋章", "14天连续学习勋章", "7", "0.5", "3", now],
  ["10011", "2026-06-10", "11", "1", "0.89", "0.81", "0.24", "7天连续学习勋章", "14天连续学习勋章", "11", "0.7857", "1", now],
  ["10012", "2026-06-10", "8", "1", "0.85", "0.76", "0.29", "7天连续学习勋章", "14天连续学习勋章", "8", "0.5714", "2", now],
  ["10013", "2026-06-10", "6", "0.9", "0.82", "0.73", "0.33", "暂无勋章", "7天连续学习勋章", "6", "0.8571", "3", now],
  ["10014", "2026-06-10", "4", "1", "0.78", "0.69", "0.37", "暂无勋章", "7天连续学习勋章", "4", "0.5714", "4", now],
  ["10015", "2026-06-10", "16", "1", "0.9", "0.77", "0.27", "14天连续学习勋章", "21天连续学习勋章", "16", "0.7619", "1", now],
  ["10016", "2026-06-10", "10", "0.8", "0.83", "0.72", "0.35", "7天连续学习勋章", "14天连续学习勋章", "10", "0.7143", "2", now],
  ["10017", "2026-06-10", "5", "1", "0.76", "0.68", "0.39", "暂无勋章", "7天连续学习勋章", "5", "0.7143", "3", now],
  ["10018", "2026-06-10", "2", "0.6", "0.62", "0.59", "0.44", "暂无勋章", "7天连续学习勋章", "2", "0.2857", "4", now],
  ["10019", "2026-06-10", "13", "1", "0.88", "0.75", "0.3", "7天连续学习勋章", "14天连续学习勋章", "13", "0.9286", "1", now],
  ["10020", "2026-06-10", "3", "0.8", "0.7", "0.64", "0.41", "暂无勋章", "7天连续学习勋章", "3", "0.4286", "5", now],
  ["10021", "2026-06-10", "14", "1", "0.91", "0.83", "0.21", "14天连续学习勋章", "21天连续学习勋章", "14", "0.6667", "1", now],
  ["10022", "2026-06-10", "6", "1", "0.8", "0.71", "0.34", "暂无勋章", "7天连续学习勋章", "6", "0.8571", "3", now],
];

const studentDailyActivityHeaders = [
  "activity_id",
  "user_id",
  "activity_date",
  "is_studied",
  "intensity_level",
  "target_minutes",
  "completed_minutes",
  "completed_questions",
  "submitted_type_count",
  "checkin_status",
  "created_at",
  "updated_at",
];

const studentDailyActivityRows = [
  ["A-10001-20260516", "10001", "2026-05-16", "1", "low", "180", "72", "5", "1", "checked", "2026-05-16 22:00:00", now],
  ["A-10001-20260517", "10001", "2026-05-17", "1", "medium", "180", "118", "8", "1", "checked", "2026-05-17 22:00:00", now],
  ["A-10001-20260518", "10001", "2026-05-18", "1", "low", "180", "86", "6", "1", "checked", "2026-05-18 22:00:00", now],
  ["A-10001-20260519", "10001", "2026-05-19", "1", "high", "180", "168", "13", "2", "checked", "2026-05-19 22:00:00", now],
  ["A-10001-20260520", "10001", "2026-05-20", "1", "low", "180", "70", "4", "1", "checked", "2026-05-20 22:00:00", now],
  ["A-10001-20260521", "10001", "2026-05-21", "1", "medium", "180", "126", "9", "1", "checked", "2026-05-21 22:00:00", now],
  ["A-10001-20260522", "10001", "2026-05-22", "1", "low", "180", "90", "6", "1", "checked", "2026-05-22 22:00:00", now],
  ["A-10001-20260523", "10001", "2026-05-23", "1", "high", "180", "172", "15", "2", "checked", "2026-05-23 22:00:00", now],
  ["A-10001-20260524", "10001", "2026-05-24", "1", "low", "180", "82", "5", "1", "checked", "2026-05-24 22:00:00", now],
  ["A-10001-20260525", "10001", "2026-05-25", "1", "high", "180", "165", "12", "2", "checked", "2026-05-25 22:00:00", now],
  ["A-10001-20260526", "10001", "2026-05-26", "1", "medium", "180", "128", "9", "1", "checked", "2026-05-26 22:00:00", now],
  ["A-10001-20260527", "10001", "2026-05-27", "1", "low", "180", "74", "5", "1", "checked", "2026-05-27 22:00:00", now],
  ["A-10001-20260528", "10001", "2026-05-28", "1", "medium", "180", "132", "10", "1", "checked", "2026-05-28 22:00:00", now],
  ["A-10001-20260529", "10001", "2026-05-29", "0", "none", "180", "0", "0", "0", "not_checked", "2026-05-29 22:00:00", now],
];

const typeMasteryStatsHeaders = [
  "mastery_id",
  "user_id",
  "stat_date",
  "type_id",
  "type_name",
  "mastery_rate",
  "status_tag",
  "submitted_question_count",
  "wrong_question_count",
  "sort_order",
  "updated_at",
];

const typeMasteryStatsRows = [
  ["M-10001-001", "10001", "2026-06-10", "G-01-Z-01", "极限与连续", "0.84", "良好", "25", "4", "1", now],
  ["M-10001-002", "10001", "2026-06-10", "G-02-Z-01", "导数应用", "0.76", "良好", "21", "5", "2", now],
  ["M-10001-003", "10001", "2026-06-10", "G-05-Z-01", "定积分", "0.63", "待提升", "19", "7", "3", now],
  ["M-10001-004", "10001", "2026-06-10", "G-06-Z-01", "二重积分", "0.58", "薄弱项", "17", "7", "4", now],
  ["M-10001-005", "10001", "2026-06-10", "L-01-Z-01", "线性方程组", "0.72", "待提升", "18", "5", "5", now],
  ["M-10001-006", "10001", "2026-06-10", "L-02-Z-01", "特征值", "0.61", "薄弱项", "15", "6", "6", now],
  ["M-10001-007", "10001", "2026-06-10", "P-01-Z-01", "随机变量分布", "0.66", "待提升", "16", "5", "7", now],
  ["M-10001-008", "10001", "2026-06-10", "G-07-Z-01", "向量与空间解析几何", "0.54", "薄弱项", "13", "6", "8", now],
  ["M-10001-009", "10001", "2026-06-10", "G-08-Z-01", "无穷级数", "0.48", "薄弱项", "12", "6", "9", now],
];

const lossReasonStatsHeaders = [
  "loss_reason_id",
  "user_id",
  "stat_date",
  "reason_code",
  "reason_name",
  "reason_rate",
  "wrong_question_count",
  "sort_order",
  "updated_at",
];

const lossReasonStatsRows = [
  ["LR-10001-001", "10001", "2026-06-10", "method_choice", "方法选择错误", "0.32", "16", "1", now],
  ["LR-10001-002", "10001", "2026-06-10", "calculation", "计算失误", "0.28", "14", "2", now],
  ["LR-10001-003", "10001", "2026-06-10", "concept", "概念混淆", "0.22", "11", "3", now],
  ["LR-10001-004", "10001", "2026-06-10", "missing_condition", "漏条件", "0.18", "9", "4", now],
];

const priorityRecommendationsHeaders = [
  "recommendation_id",
  "user_id",
  "stat_date",
  "priority_rank",
  "type_id",
  "type_name",
  "tag",
  "reason_text",
  "suggested_action",
  "icon_key",
  "updated_at",
];

const priorityRecommendationsRows = [
  ["PR-10001-001", "10001", "2026-06-10", "1", "G-06-Z-01", "二重积分", "薄弱项", "综合区间划分与积分域变换薄弱，易在边界与对称性上失分。", "复盘积分域划分题，优先完成边界识别训练。", "book", now],
  ["PR-10001-002", "10001", "2026-06-10", "2", "L-02-Z-01", "特征值", "薄弱项", "特征多项式与相似变换理解不牢，求解步骤容易出错。", "集中练习特征值求解与相似判定。", "note", now],
  ["PR-10001-003", "10001", "2026-06-10", "3", "L-01-Z-01", "线性方程组", "待提升", "消元与秩的判定不稳定，需巩固基本变换与解的结构。", "用 20 分钟复盘秩、解空间和参数讨论。", "triangle", now],
];

const studyRoomsHeaders = [
  "room_id",
  "room_name",
  "math_type",
  "target_exam_year",
  "online_count",
  "quiet_mode_enabled",
  "room_rule",
  "created_at",
  "updated_at",
];

const studyRoomsRows = [
  ["SR-M2-2026", "数学二冲刺自习室", "数学二", "2026", "128", "1", "不开麦、不聊天、按计划专注", "2026-06-01 09:00:00", now],
  ["SR-M1-2026", "数学一冲刺自习室", "数学一", "2026", "46", "1", "不开麦、不聊天、按计划专注", "2026-06-01 09:00:00", now],
];

const studentStudyGoalsHeaders = [
  "goal_id",
  "user_id",
  "study_date",
  "room_id",
  "target_minutes",
  "completed_minutes",
  "completion_rate",
  "current_focus_minutes",
  "current_task_type_id",
  "current_task_name",
  "focus_status",
  "current_round_started_at",
  "created_at",
  "updated_at",
];

const studentStudyGoalsRows = [
  ["SG-10001-20260610", "10001", "2026-06-10", "SR-M2-2026", "180", "90", "0.5", "45", "G-01-Z-01", "高数 | 极限与连续", "focusing", "2026-06-10 14:15:00", "2026-06-10 06:00:00", now],
  ["SG-10002-20260610", "10002", "2026-06-10", "SR-M2-2026", "180", "150", "0.8333", "0", "G-01-Z-02", "高数 | 分左右讨论的极限", "idle", "", "2026-06-10 06:00:00", now],
  ["SG-10007-20260610", "10007", "2026-06-10", "SR-M1-2026", "180", "120", "0.6667", "35", "G-01-Z-01", "高数 | 极限与连续", "focusing", "2026-06-10 14:25:00", "2026-06-10 06:00:00", now],
];

const studyRoomMembersHeaders = [
  "room_member_id",
  "room_id",
  "user_id",
  "online_status",
  "current_task_name",
  "focused_minutes_today",
  "last_seen_at",
  "created_at",
  "updated_at",
];

const studyRoomMembersRows = [
  ["RM-SR-M2-10001", "SR-M2-2026", "10001", "online", "正在做线代", "62", "2026-06-10 15:00:00", "2026-06-10 08:20:00", now],
  ["RM-SR-M2-10002", "SR-M2-2026", "10002", "online", "正在做高数", "48", "2026-06-10 14:58:00", "2026-06-10 08:10:00", now],
  ["RM-SR-M2-10004", "SR-M2-2026", "10004", "online", "正在做概率论", "55", "2026-06-10 14:56:00", "2026-06-10 07:54:00", now],
  ["RM-SR-M2-10005", "SR-M2-2026", "10005", "online", "正在做线代", "35", "2026-06-10 14:54:00", "2026-06-10 07:58:00", now],
  ["RM-SR-M2-10006", "SR-M2-2026", "10006", "online", "正在做高数", "28", "2026-06-10 14:52:00", "2026-06-10 08:03:00", now],
];

const studentChapterCompletionsHeaders = [
  "completion_id",
  "user_id",
  "raw_chapter_id",
  "chapter_name",
  "math_type",
  "plan_stage",
  "started_at",
  "completed_at",
  "spent_days",
  "completed_type_count",
  "total_type_count",
  "submitted_question_count",
  "wrong_question_count",
  "accuracy_rate",
  "main_loss_reasons",
  "review_type_ids",
  "review_type_names",
  "summary_template_id",
  "created_at",
  "updated_at",
];

const studentChapterCompletionsRows = [
  ["SCC-10001-G01", "10001", "G-01", "第一章 极限", "数学二", "强化", "2026-06-08", "2026-06-10 21:30:00", "3", "8", "8", "36", "8", "0.78", "计算失误、概念混淆", "G-01-Z-01,G-01-Z-02", "函数极限、无穷小比较", "CST-M2-G01-QH", "2026-06-10 21:30:00", now],
  ["SCC-10002-G01", "10002", "G-01", "第一章 极限", "数学二", "强化", "2026-06-07", "2026-06-09 22:10:00", "3", "8", "8", "40", "6", "0.85", "边界条件漏看、计算失误", "G-01-Z-02", "分左右讨论的极限", "CST-M2-G01-QH", "2026-06-09 22:10:00", now],
  ["SCC-10004-G02", "10004", "G-02", "第二章 一元函数微分学", "数学二", "强化", "2026-06-06", "2026-06-10 20:50:00", "5", "7", "7", "42", "10", "0.76", "公式套用错误、计算失误", "G-02-Z-01,G-02-Z-02", "导数定义辨析、复合函数求导", "CST-M2-G02-QH", "2026-06-10 20:50:00", now],
];

const chapterSummaryTemplatesHeaders = [
  "summary_template_id",
  "raw_chapter_id",
  "chapter_name",
  "math_type",
  "plan_stage",
  "summary_title",
  "summary_text",
  "key_points",
  "common_mistakes",
  "review_suggestions",
  "next_step_text",
  "is_active",
  "created_at",
  "updated_at",
];

const chapterSummaryTemplatesRows = [
  ["CST-M2-G01-QH", "G-01", "第一章 极限", "数学二", "强化", "极限章节小结", "极限是高等数学的入口章节，核心是理解函数趋近过程中的稳定趋势，并能把定义、等价无穷小、左右极限和连续性判断连接起来。完成本章后，后续导数、积分和级数相关内容都会建立在这个基础上。", "函数极限、数列极限、无穷小比较、连续性判断", "忽略左右极限、等价无穷小使用条件不清、代入前没有先判断定义域", "优先复盘错题中的条件判断步骤，把每道题先写出趋近方向和可替换条件。", "下一章进入一元函数微分学，重点从极限思想过渡到导数定义和求导规则。", "1", "2026-06-10 14:00:00", now],
  ["CST-M2-G02-QH", "G-02", "第二章 一元函数微分学", "数学二", "强化", "一元函数微分学小结", "本章的核心是把导数定义、求导法则和函数局部变化联系起来。学完本章后，应能判断可导性，熟练处理复合函数、隐函数和参数方程求导，并能解释导数在几何意义和变化率问题中的作用。", "导数定义、可导与连续、复合函数求导、隐函数求导", "把连续误认为必然可导、链式法则漏乘内层导数、隐函数求导忘记把 y 看作函数", "复盘时先区分题目考定义还是考运算，再按函数结构选择求导方法。", "后续微分应用会大量使用本章结论，建议保留一页常用求导结构清单。", "1", "2026-06-10 14:00:00", now],
  ["CST-M2-G03-QH", "G-03", "第三章 微分应用（一）函数性态", "数学二", "强化", "函数性态小结", "本章重点是用导数研究函数单调性、极值、凹凸性和渐近线，把计算结果转化为函数图像与性质判断。", "单调性、极值、凹凸性、渐近线", "驻点和不可导点漏列、区间端点讨论不完整、二阶导判断条件混淆", "整理每类函数性态题的固定步骤，尤其注意列表讨论区间符号。", "下一步继续处理中值定理和证明题，为综合应用打基础。", "1", "2026-06-10 14:00:00", now],
  ["CST-M2-G04-QH", "G-04", "第四章 微分应用（二）中值定理", "数学二", "强化", "中值定理小结", "本章把导数工具推进到证明和构造层面，关键是识别题目需要使用罗尔定理、拉格朗日中值定理还是柯西中值定理。", "罗尔定理、拉格朗日中值定理、柯西中值定理、辅助函数构造", "定理条件验证不完整、辅助函数构造方向不清、区间端点没有对应", "做证明题时先写出要证明的目标形式，再反推需要构造的函数。", "一元微分三个原始章节都完成后，成长页的一元微分展示卡可以作为整体模块复盘。", "1", "2026-06-10 14:00:00", now],
  ["CST-M2-G05-QH", "G-05", "第五章 一元函数积分学", "数学二", "强化", "一元积分小结", "本章核心是理解不定积分和定积分的计算方法，熟练选择换元、分部积分和常见公式。", "不定积分、定积分、换元积分、分部积分", "换元后上下限未同步、分部积分对象选择不当、常见积分公式记忆不牢", "按题型整理常用换元形式，遇到乘积结构先判断是否适合分部积分。", "下一章会把积分用于面积、体积和应用问题。", "1", "2026-06-10 14:00:00", now],
  ["CST-M2-G06-QH", "G-06", "第六章 一元函数积分学应用", "数学二", "强化", "一元积分应用小结", "本章重点是把积分计算转化为几何量和应用量，关键在于建立正确的积分表达式。", "面积、体积、变限积分、积分应用建模", "积分区间取错、图像边界判断不清、旋转体半径写反", "先画简图或写出上下边界，再建立积分式，最后再计算。", "G-05 和 G-06 都完成后，成长页的一元积分展示卡可以作为整体模块复盘。", "1", "2026-06-10 14:00:00", now],
];

await fs.mkdir(sampleDir, { recursive: true });

await writeWorkbook("users.xlsx", usersHeaders, usersRowsWithLoginPasswords, "Users");
await writeWorkbook("user_sessions.xlsx", userSessionsHeaders, userSessionsRows, "UserSessions");
await writeWorkbook("classes.xlsx", classesHeaders, classesRows, "Classes");
await writeWorkbook("student_profiles.xlsx", studentProfilesHeaders, studentProfilesRows, "StudentProfiles");
await writeWorkbook("question_types.xlsx", questionTypesHeaders, questionTypesRows, "QuestionTypes");
await writeWorkbook("questions.xlsx", questionsHeaders, questionsRows, "Questions");
await writeWorkbook("daily_plans.xlsx", dailyPlansHeaders, dailyPlansRows, "DailyPlans");
await writeWorkbook("question_feedbacks.xlsx", questionFeedbacksHeaders, questionFeedbacksRows, "QuestionFeedbacks");
await writeWorkbook("student_stats.xlsx", studentStatsHeaders, studentStatsRows, "StudentStats");
await writeWorkbook("student_daily_activity.xlsx", studentDailyActivityHeaders, studentDailyActivityRows, "StudentDailyActivity");
await writeWorkbook("type_mastery_stats.xlsx", typeMasteryStatsHeaders, typeMasteryStatsRows, "TypeMasteryStats");
await writeWorkbook("loss_reason_stats.xlsx", lossReasonStatsHeaders, lossReasonStatsRows, "LossReasonStats");
await writeWorkbook("priority_recommendations.xlsx", priorityRecommendationsHeaders, priorityRecommendationsRows, "PriorityRecommendations");
await writeWorkbook("study_rooms.xlsx", studyRoomsHeaders, studyRoomsRows, "StudyRooms");
await writeWorkbook("student_study_goals.xlsx", studentStudyGoalsHeaders, studentStudyGoalsRows, "StudentStudyGoals");
await writeWorkbook("study_room_members.xlsx", studyRoomMembersHeaders, studyRoomMembersRows, "StudyRoomMembers");
await writeWorkbook("student_chapter_completions.xlsx", studentChapterCompletionsHeaders, studentChapterCompletionsRows, "StudentChapterCompletions");
await writeWorkbook("chapter_summary_templates.xlsx", chapterSummaryTemplatesHeaders, chapterSummaryTemplatesRows, "ChapterSummaryTemplates");

console.log("Sample data workbooks generated in", sampleDir);
