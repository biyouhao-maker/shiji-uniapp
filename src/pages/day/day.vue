<template>
<view class="page">
  <view class="card head-card">
    <text class="head-date">{{dateText}}</text>
    <text class="head-total">总计 {{totalText}}</text>
  </view>

  <view class="card">
    <view class="card-head">
      <text class="card-title">项目分布</text>
    </view>
    <template v-if="list.length">
      <view class="proj-row" v-for="item in list" :key="item.projectId">
        <view class="proj-head">
          <view class="proj-name-wrap">
            <view class="dot" :style="{background: item.color}"></view>
            <text class="proj-name">{{item.name}}</text>
          </view>
          <text class="proj-dur">{{item.durationText}} · {{item.percent}}%</text>
        </view>
        <view class="bar">
          <view class="bar-fill" :style="{width: item.width + '%', background: item.color}"></view>
        </view>
      </view>
    </template>
    <view v-else class="empty">当天没有记录</view>
  </view>

  <view class="card">
    <view class="card-head">
      <text class="card-title">各项目时间段</text>
    </view>
    <template v-if="groups.length">
      <view class="day-group" v-for="item in groups" :key="item.projectId">
        <view class="day-group-head">
          <view class="dot" :style="{background: item.color}"></view>
          <text class="day-group-name">{{item.name}}</text>
          <text class="day-group-total">累计 {{item.totalText}}</text>
        </view>
        <view class="session" v-for="s in item.sessions" :key="s.id">
          <view class="session-line">
            <text class="session-time">{{s.timeText}}</text>
            <text class="session-dur">{{s.durationLabel}}</text>
          </view>
          <view v-if="s.pauses.length" class="session-pauses">
            <text class="session-pause" v-for="(p, pi) in s.pauses" :key="pi">暂停 {{p}}</text>
          </view>
        </view>
      </view>
    </template>
    <view v-else class="empty">当天没有记录</view>
  </view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'

export default {
  data() {
    return { dateText: '', totalText: '0秒', list: [], groups: [], hasData: false }
  },
  onLoad(options) {
    this._date = (options && options.date) || util.formatDate(Date.now())
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      Promise.all([store.getProjects(), store.getRecords()]).then(res => {
        const projects = res[0] || []
        const records = res[1] || []
        const dayRecords = records.filter(r => (r.date || util.formatDate(r.startTime)) === this._date)
        const total = dayRecords.reduce((s, r) => s + (r.duration || 0), 0)

        const map = {}
        dayRecords.forEach(r => {
          map[r.projectId] = (map[r.projectId] || 0) + (r.duration || 0)
        })
        const list = Object.keys(map)
          .map(pid => {
            const p = projects.find(x => x.id === pid)
            const sample = dayRecords.find(x => x.projectId === pid)
            const dur = map[pid]
            const percent = total > 0 ? Math.round((dur / total) * 100) : 0
            return {
              projectId: pid,
              name: p ? p.name : (sample && sample.projectName) || '已删除项目',
              color: p ? p.color : '#C4C9D4',
              duration: dur,
              durationText: util.formatDuration(dur),
              percent,
              width: total > 0 ? Math.max(4, percent) : 0
            }
          })
          .sort((a, b) => b.duration - a.duration)

        const grouped = {}
        dayRecords.forEach(r => {
          const p = projects.find(x => x.id === r.projectId)
          if (!grouped[r.projectId]) {
            grouped[r.projectId] = {
              projectId: r.projectId,
              name: p ? p.name : r.projectName || '已删除项目',
              color: p ? p.color : '#C4C9D4',
              sessions: [],
              total: 0
            }
          }
          const pauses = util.computePauses(r.segments)
          const durationText = util.formatDuration(r.duration)
          grouped[r.projectId].sessions.push({
            id: r.id,
            startTime: r.startTime,
            timeText: util.formatRange(r.startTime, r.endTime),
            durationText,
            durationLabel: pauses.length ? '有效时间 ' + durationText : durationText,
            pauses: pauses.map(p => util.formatRange(p.startTime, p.endTime))
          })
          grouped[r.projectId].total += r.duration || 0
        })
        const groups = Object.keys(grouped)
          .map(k => {
            const g = grouped[k]
            g.sessions.sort((a, b) => a.startTime - b.startTime)
            g.totalText = util.formatDuration(g.total)
            return g
          })
          .sort((a, b) => b.total - a.total)

        const ts = util.parseDate(this._date)
        const dateText = util.formatDateFull(ts) + ' ' + util.weekdayCN(ts)
        uni.setNavigationBarTitle({ title: util.dayLabel(ts) + ' 记录' })

        this.dateText = dateText
        this.totalText = util.formatDuration(total)
        this.list = list
        this.groups = groups
        this.hasData = dayRecords.length > 0
      })
    }
  }
}
</script>

<style scoped>
.head-card { display: flex; flex-direction: column; align-items: center; padding: 40rpx 32rpx; }
.head-date { font-size: 32rpx; color: #1F2430; }
.head-total { margin-top: 14rpx; font-size: 52rpx; font-weight: 700; color: #5B8DEF; }
.proj-row { padding: 18rpx 0; }
.proj-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.proj-name-wrap { display: flex; align-items: center; }
.proj-name { font-size: 28rpx; color: #333A4A; }
.proj-dur { font-size: 24rpx; color: #8A90A2; }
.day-group { padding: 18rpx 0; border-bottom: 2rpx solid #F3F4F8; }
.day-group:last-child { border-bottom: none; padding-bottom: 0; }
.day-group-head { display: flex; align-items: center; margin-bottom: 8rpx; }
.day-group-name { flex: 1; font-size: 28rpx; font-weight: 600; color: #1F2430; }
.day-group-total { font-size: 24rpx; color: #5B8DEF; }
.session { padding: 10rpx 0 10rpx 36rpx; }
.session-line { display: flex; align-items: center; justify-content: space-between; }
.session-time { font-size: 26rpx; color: #6B7280; }
.session-dur { font-size: 26rpx; color: #8A90A2; }
.session-pauses { margin-top: 6rpx; }
.session-pause { display: block; font-size: 22rpx; color: #B0B6C4; margin-top: 4rpx; }
</style>
