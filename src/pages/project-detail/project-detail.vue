<template>
<view class="page">
  <view class="card head-card">
    <view class="dot head-dot" :style="{background: color}"></view>
    <text class="head-name">{{name}}</text>
    <text class="head-total">累计 {{totalText}}</text>
  </view>

  <view class="card">
    <view class="card-head">
      <text class="card-title">时间统计</text>
    </view>
    <view class="stat-grid">
      <view class="stat-item">
        <text class="stat-value">{{todayText}}</text>
        <text class="stat-label">今日</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{weekText}}</text>
        <text class="stat-label">本周</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{monthText}}</text>
        <text class="stat-label">本月</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{historyText}}</text>
        <text class="stat-label">历史累计</text>
      </view>
    </view>
  </view>

  <view class="card">
    <view class="card-head">
      <text class="card-title">具体时间段</text>
    </view>
    <template v-if="hasData">
      <view class="day-group" v-for="item in groups" :key="item.date">
        <view class="day-group-head">
          <text class="day-group-date">{{item.dateText}}</text>
          <text class="day-group-total">{{item.totalText}}</text>
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
    <view v-else class="empty">该项目还没有记录</view>
  </view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'

export default {
  data() {
    return {
      name: '', color: '#5B8DEF',
      totalText: '0秒', todayText: '0秒', weekText: '0秒', monthText: '0秒', historyText: '0秒',
      groups: [], hasData: false
    }
  },
  onLoad(options) {
    this._projectId = (options && options.id) || ''
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      Promise.all([store.getProjectById(this._projectId), store.getRecords()]).then(res => {
        const project = res[0]
        const records = (res[1] || []).filter(r => r.projectId === this._projectId)

        const name = project
          ? project.name
          : (records.length && records[0].projectName) || '已删除项目'
        const color = project ? project.color : '#C4C9D4'

        const now = Date.now()
        const todayStart = util.startOfDay(now)
        const todayEnd = todayStart + util.ONE_DAY
        const weekStart = util.startOfWeek(now)
        const weekEnd = weekStart + 7 * util.ONE_DAY
        const monthStart = util.startOfMonth(now)
        const monthEnd = util.addMonths(monthStart, 1)

        let total = 0, todaySum = 0, weekSum = 0, monthSum = 0
        const byDate = {}

        records.forEach(r => {
          const d = r.duration || 0
          total += d
          if (r.startTime >= todayStart && r.startTime < todayEnd) todaySum += d
          if (r.startTime >= weekStart && r.startTime < weekEnd) weekSum += d
          if (r.startTime >= monthStart && r.startTime < monthEnd) monthSum += d

          const date = r.date || util.formatDate(r.startTime)
          if (!byDate[date]) {
            byDate[date] = { date, dateText: util.formatDateFull(util.parseDate(date)), total: 0, sessions: [] }
          }
          byDate[date].total += d
          const pauses = util.computePauses(r.segments)
          const durationText = util.formatDuration(d)
          byDate[date].sessions.push({
            id: r.id,
            startTime: r.startTime,
            timeText: util.formatRange(r.startTime, r.endTime),
            durationText,
            durationLabel: pauses.length ? '有效时间 ' + durationText : durationText,
            pauses: pauses.map(p => util.formatRange(p.startTime, p.endTime))
          })
        })

        const groups = Object.keys(byDate)
          .sort((a, b) => (a < b ? 1 : -1))
          .map(d => {
            const g = byDate[d]
            g.sessions.sort((a, b) => a.startTime - b.startTime)
            g.totalText = util.formatDuration(g.total)
            return g
          })

        uni.setNavigationBarTitle({ title: name })

        this.name = name
        this.color = color
        this.totalText = util.formatDuration(total)
        this.todayText = util.formatDuration(todaySum)
        this.weekText = util.formatDuration(weekSum)
        this.monthText = util.formatDuration(monthSum)
        this.historyText = util.formatDuration(total)
        this.groups = groups
        this.hasData = records.length > 0
      })
    }
  }
}
</script>

<style scoped>
.head-card { display: flex; flex-direction: column; align-items: center; padding: 44rpx 32rpx; }
.head-dot { width: 28rpx; height: 28rpx; margin: 0 0 18rpx; }
.head-name { font-size: 34rpx; font-weight: 600; color: #1F2430; }
.head-total { margin-top: 14rpx; font-size: 52rpx; font-weight: 700; color: #5B8DEF; }
.stat-grid { display: flex; flex-wrap: wrap; }
.stat-item { width: 50%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; padding: 22rpx 0; }
.stat-value { font-size: 34rpx; font-weight: 700; color: #1F2430; }
.stat-label { margin-top: 10rpx; font-size: 24rpx; color: #9AA0B0; }
.day-group { padding: 18rpx 0; border-bottom: 2rpx solid #F3F4F8; }
.day-group:last-child { border-bottom: none; padding-bottom: 0; }
.day-group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.day-group-date { font-size: 28rpx; font-weight: 600; color: #1F2430; }
.day-group-total { font-size: 24rpx; color: #5B8DEF; }
.session { padding: 10rpx 0 10rpx 20rpx; }
.session-line { display: flex; align-items: center; justify-content: space-between; }
.session-time { font-size: 26rpx; color: #6B7280; }
.session-dur { font-size: 26rpx; color: #8A90A2; }
.session-pauses { margin-top: 6rpx; }
.session-pause { display: block; font-size: 22rpx; color: #B0B6C4; margin-top: 4rpx; }
</style>
