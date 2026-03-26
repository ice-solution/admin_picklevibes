/**
 * 固定類別清單 — 僅允許從 UI 選取，避免自由輸入造成匯出／grep 不一致。
 * 若要增刪項目，請改此檔並重新部署。
 */
const CATEGORIES = ['場租', '器材', '營運', '課程收入', '活動', '薪資', '其他'];

function isAllowedCategory(value) {
  const s = String(value || '').trim();
  return CATEGORIES.includes(s);
}

/** 更新時：須為清單內，或與原值相同（相容舊資料尚未改選前） */
function isValidCategoryForUpdate(value, previousCategory) {
  if (isAllowedCategory(value)) return true;
  if (previousCategory == null) return false;
  return String(value || '').trim() === String(previousCategory).trim();
}

module.exports = { CATEGORIES, isAllowedCategory, isValidCategoryForUpdate };
