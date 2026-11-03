// utils/store.js - 纯本地存储版，兼容 H5/PWA/App 多端
import util from './util'
const KEY_PROJECTS = 'shiji_projects', KEY_RECORDS = 'shiji_records', KEY_ACTIVE = 'shiji_active', KEY_INITED = 'shiji_inited'
const PALETTE = ['#5B8DEF', '#F6A609', '#4FBF8B', '#EB6F6F', '#9B6DF3', '#38B2C4', '#E8734A', '#7C8AA0']
function read(key, def) { try { const v = uni.getStorageSync(key); return (v === '' || v === undefined || v === null) ? def : v } catch (e) { return def } }
function write(key, val) { try { uni.setStorageSync(key, val) } catch (e) {} }
function normalizeProject(p) { const createdAt = p.createdAt || Date.now(); return { id: p.id, name: p.name, color: p.color || PALETTE[0], createdAt, updatedAt: p.updatedAt || createdAt } }
function normalizeRecord(r) { const base = { id: r.id, projectId: r.projectId, projectName: r.projectName || '', date: r.date || util.formatDate(r.startTime), startTime: r.startTime, endTime: r.endTime, duration: r.duration || 0, segments: r.segments || [], createdAt: r.createdAt || r.endTime || Date.now() }; if (!base.projectName && r.name) base.projectName = r.name; return base }
function readProjects() { return (read(KEY_PROJECTS, []) || []).map(normalizeProject) }
function writeProjects(list) { const n = (list || []).map(normalizeProject); write(KEY_PROJECTS, n); return n }
function readRecords() { return (read(KEY_RECORDS, []) || []).map(normalizeRecord) }
function writeRecords(list) { const n = (list || []).map(normalizeRecord); write(KEY_RECORDS, n); return n }
function uid(prefix) { return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function getProjects() { return Promise.resolve(readProjects()) }
function getProjectById(id) { return getProjects().then(list => list.find(p => p.id === id) || null) }
function addProject(name) { const trimmed = (name || '').trim(); if (!trimmed) return Promise.resolve(null); const local = readProjects(); if (local.some(p => p.name === trimmed)) return Promise.resolve(null); const now = Date.now(); const project = { id: uid('p_'), name: trimmed, color: PALETTE[local.length % PALETTE.length], createdAt: now, updatedAt: now }; writeProjects(local.concat([project])); return Promise.resolve(project) }
function updateProject(id, name) { const trimmed = (name || '').trim(); if (!trimmed) return Promise.resolve(null); const list = readProjects(); const p = list.find(x => x.id === id); if (!p) return Promise.resolve(null); p.name = trimmed; p.updatedAt = Date.now(); writeProjects(list); return Promise.resolve(p) }
function deleteProject(id) { const list = readProjects(); const next = list.filter(x => x.id !== id); writeProjects(next); const active = read(KEY_ACTIVE, null); if (active && active.projectId === id) write(KEY_ACTIVE, null); return Promise.resolve(next) }
function getRecords() { return Promise.resolve(readRecords()) }
function getRecordsByDate(date) { return getRecords().then(list => list.filter(r => r.date === date)) }
function addRecord(record) { const local = readRecords(); if (local.some(r => r.id === record.id)) return Promise.resolve(record); const item = normalizeRecord(Object.assign({}, record, { createdAt: record.createdAt || Date.now() })); local.push(item); writeRecords(local); return Promise.resolve(item) }
function deleteTimeRecord(id) { const list = readRecords(); writeRecords(list.filter(x => x.id !== id)); return Promise.resolve() }
function getActive() { return Promise.resolve(read(KEY_ACTIVE, null)) }
function setActive(active) { write(KEY_ACTIVE, active); return Promise.resolve(active) }
function clearActive() { write(KEY_ACTIVE, null); return Promise.resolve(null) }
function initIfEmpty() { if (read(KEY_INITED, false)) return Promise.resolve(); return getProjects().then(list => { if (!list.length) { const now = Date.now(); const seeds = ['学习英语', '编程', '健身', '阅读']; writeProjects(seeds.map((name, i) => ({ id: 'p_seed_' + i, name, color: PALETTE[i % PALETTE.length], createdAt: now, updatedAt: now }))) } write(KEY_INITED, true) }) }
function clearAll() { write(KEY_PROJECTS, []); write(KEY_RECORDS, []); write(KEY_ACTIVE, null); return Promise.resolve() }
export default { PALETTE, getProjects, getProjectById, addProject, updateProject, deleteProject, getRecords, getRecordsByDate, addRecord, deleteTimeRecord, getActive, setActive, clearActive, initIfEmpty, clearAll }
