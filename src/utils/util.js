// utils/util.js
// 时间与格式化相关的纯函数工具，不依赖任何存储实现。

const WEEK_CN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const ONE_DAY = 24 * 60 * 60 * 1000

function pad2(n) { return n < 10 ? '0' + n : '' + n }
function formatDate(ts) { const d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) }
function parseDate(str) { const parts = String(str).split('-').map(Number); return new Date(parts[0], parts[1] - 1, parts[2]).getTime() }
function startOfDay(ts) { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
function startOfWeek(ts) { const d = new Date(startOfDay(ts)); const offset = (d.getDay() + 6) % 7; return d.getTime() - offset * ONE_DAY }
function startOfMonth(ts) { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), 1).getTime() }
function addDays(ts, n) { return startOfDay(ts) + n * ONE_DAY }
function addMonths(ts, n) { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime() }
function formatDateLabel(ts) { const d = new Date(ts); return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK_CN[d.getDay()] }
function formatMonthDay(ts) { const d = new Date(ts); return (d.getMonth() + 1) + '月' + d.getDate() + '日' }
function formatDateFull(ts) { const d = new Date(ts); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日' }
function formatRange(startTs, endTs) { return formatClock(startTs) + ' - ' + formatClock(endTs) }
function dayLabel(ts) { const today = startOfDay(Date.now()); const day = startOfDay(ts); const diff = Math.round((today - day) / ONE_DAY); if (diff === 0) return '今天'; if (diff === 1) return '昨天'; return formatMonthDay(ts) }
function weekdayCN(ts) { return WEEK_CN[new Date(ts).getDay()] }
function formatClock(ts) { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
function formatTimer(ms) { let t = Math.floor((ms || 0) / 1000); if (t < 0) t = 0; const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60; return pad2(h) + ':' + pad2(m) + ':' + pad2(s) }
function formatDuration(ms) { let t = Math.floor((ms || 0) / 1000); if (t < 0) t = 0; const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60; if (h > 0) return h + '小时' + m + '分'; if (m > 0) return m + '分'; return s + '秒' }
function sumSegments(segments) { return (segments || []).reduce((sum, s) => { if (s && s.startTime != null && s.endTime != null && s.endTime > s.startTime) return sum + (s.endTime - s.startTime); return sum }, 0) }
function computePauses(segments) { const segs = (segments || []).filter(s => s && s.startTime != null && s.endTime != null); segs.sort((a, b) => a.startTime - b.startTime); const pauses = []; for (let i = 0; i < segs.length - 1; i++) { const gapStart = segs[i].endTime; const gapEnd = segs[i + 1].startTime; if (gapEnd - gapStart >= 1000) pauses.push({ startTime: gapStart, endTime: gapEnd }) } return pauses }

export default { ONE_DAY, pad2, formatDate, parseDate, startOfDay, startOfWeek, startOfMonth, addDays, addMonths, formatDateLabel, formatMonthDay, formatDateFull, formatRange, formatClock, formatTimer, formatDuration, sumSegments, computePauses, dayLabel, weekdayCN }
