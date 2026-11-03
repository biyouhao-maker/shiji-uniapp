<template>
<view class="page">
  <view class="tabs">
    <view :class="['tab', tab === 'day' ? 'tab-active' : '']" data-tab="day" @tap="switchTab">日</view>
    <view :class="['tab', tab === 'week' ? 'tab-active' : '']" data-tab="week" @tap="switchTab">周</view>
    <view :class="['tab', tab === 'month' ? 'tab-active' : '']" data-tab="month" @tap="switchTab">月</view>
  </view>

  <view class="card">
    <view class="range-nav">
      <view class="range-arrow" data-dir="-1" @tap="shift">‹</view>
      <text class="range-label">{{rangeLabel}}</text>
      <view class="range-arrow" data-dir="1" @tap="shift">›</view>
    </view>
    <view class="total-block">
      <text class="total-label">{{totalLabel}}</text>
      <text class="total-value">{{totalText}}</text>
      <text v-if="showAvg" class="total-avg">平均每天 {{avgText}}</text>
    </view>
  </view>

  <view class="card">
    <view class="card-head">
      <text class="card-title">项目排行</text>
      <text v-if="projectStats.length" class="card-total">{{projectStats.length}} 个项目</text>
    </view>

    <template v-if="projectStats.length">
      <view
        class="rank-row"
        v-for="(item, index) in projectStats"
        :key="item.projectId"
        :data-id="item.projectId"
        @tap="goProject"
      >
        <view class="rank-head">
          <text class="rank-no">{{index + 1}}</text>
          <view class="dot" :style="{background: item.color}"></view>
          <text class="rank-name">{{item.name}}</text>
          <text class="rank-dur">{{item.durationText}}</text>
        </view>
        <view class="rank-bar-line">
          <view class="bar">
            <view class="bar-fill" :style="{width: item.width + '%', background: item.color}"></view>
          </view>
          <text class="rank-percent">{{item.percent}}%</text>
        </view>
      </view>
    </template>

    <view v-else class="empty-block">
      <text class="empty-text">{{emptyText}}</text>
      <view v-if="isDay" class="empty-btn" @tap="goHome">开始记录</view>
    </view>
  </view>

  <view v-if="showTrend" class="card">
    <view class="card-head">
      <text class="card-title">时间趋势</text>
      <text class="card-total">点击柱状图查看当天</text>
    </view>

    <template v-if="hasData">
      <view class="trend">
        <view
          class="trend-col"
          v-for="item in trend"
          :key="item.date"
          :data-date="item.date"
          @tap="goDay"
        >
          <text v-if="item.showValue" class="trend-value">{{item.valueShort}}</text>
          <view class="trend-bar-wrap">
            <view
              :class="['trend-bar', item.isToday ? 'trend-bar-today' : '']"
              :style="{height: item.height + '%'}"
            ></view>
          </view>
          <text :class="['trend-label', !item.showLabel ? 'trend-label-hidden' : '', item.isToday ? 'trend-label-today' : '']">{{item.label}}</text>
        </view>
      </view>
    </template>

    <view v-else class="empty">{{emptyText}}</view>
  </view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'
import stats from '../../utils/stats'

export default {
  data() {
    return {
      tab: 'day', isDay: true, showTrend: false, showAvg: false,
      rangeLabel: '', totalLabel: '今日总记录', totalText: '0秒', avgText: '',
      projectStats: [], trend: [], hasData: false, emptyText: '还没有记录'
    }
  },
  onLoad() {
    this._anchor = Date.now()
  },
  onShow() {
    this.load()
  },
  methods: {
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab
      if (tab === this.tab) return
      this.tab = tab
      this.load()
    },
    shift(e) {
      const dir = Number(e.currentTarget.dataset.dir)
      const tab = this.tab
      if (tab === 'day') this._anchor = util.addDays(this._anchor, dir)
      else if (tab === 'week') this._anchor = util.addDays(this._anchor, dir * 7)
      else this._anchor = util.addMonths(this._anchor, dir)
      this.load()
    },
    load() {
      const tab = this.tab
      return Promise.all([store.getProjects(), store.getRecords()]).then(res => {
        const projects = res[0] || []
        const records = res[1] || []
        if (tab === 'day') this.renderDay(projects, records)
        else if (tab === 'week') this.renderRange(projects, records, 'week')
        else this.renderRange(projects, records, 'month')
      })
    },
    renderDay(projects, records) {
      const s = stats.getDayStats(records, projects, this._anchor)
      const ranking = stats.getProjectRanking(records, projects, s.ts, s.ts + util.ONE_DAY)
      const isRecent = s.dayLabel === '今天' || s.dayLabel === '昨天'
      const rangeLabel = isRecent
        ? s.dayLabel + ' · ' + s.monthDay + ' ' + s.weekday
        : s.monthDay + ' ' + s.weekday

      this.isDay = true
      this.showTrend = false
      this.showAvg = false
      this.rangeLabel = rangeLabel
      this.totalLabel = '今日总记录'
      this.totalText = s.totalText
      this.avgText = ''
      this.projectStats = ranking.list
      this.trend = []
      this.hasData = s.hasData
      this.emptyText = s.dayLabel === '今天' ? '今天还没有记录时间' : '这一天还没有记录时间'
    },
    renderRange(projects, records, mode) {
      const s = mode === 'week'
        ? stats.getWeekStats(records, projects, this._anchor)
        : stats.getMonthStats(records, projects, this._anchor)
      const ranking = stats.getProjectRanking(records, projects, s.start, s.end)

      this.isDay = false
      this.showTrend = true
      this.showAvg = true
      this.rangeLabel = s.rangeLabel
      this.totalLabel = mode === 'week' ? '本周总计' : '本月总计'
      this.totalText = s.totalText
      this.avgText = s.avgText
      this.projectStats = ranking.list
      this.trend = s.days
      this.hasData = s.hasData
      this.emptyText = mode === 'week' ? '本周还没有记录' : '本月还没有记录'
    },
    goDay(e) {
      const date = e.currentTarget.dataset.date
      if (!date) return
      uni.navigateTo({ url: '/pages/day/day?date=' + date })
    },
    goProject(e) {
      const id = e.currentTarget.dataset.id
      if (!id) return
      uni.navigateTo({ url: '/pages/project-detail/project-detail?id=' + id })
    },
    goHome() {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }
}
</script>

<style scoped>
.tabs { display: flex; background: #FFFFFF; border-radius: 24rpx; padding: 8rpx; margin-bottom: 28rpx; box-shadow: 0 10rpx 30rpx rgba(31, 36, 48, 0.05); }
.tab { flex: 1; height: 76rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #8A90A2; border-radius: 18rpx; }
.tab-active { background: #EEF2FB; color: #5B8DEF; font-weight: 600; }
.range-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.range-arrow { width: 64rpx; height: 64rpx; border-radius: 50%; background: #F4F5F9; color: #5B8DEF; font-size: 40rpx; display: flex; align-items: center; justify-content: center; line-height: 1; }
.range-label { font-size: 30rpx; font-weight: 600; }
.total-block { display: flex; flex-direction: column; align-items: center; padding: 16rpx 0 8rpx; }
.total-label { font-size: 24rpx; color: #9AA0B0; }
.total-value { margin-top: 12rpx; font-size: 60rpx; font-weight: 700; color: #1F2430; }
.total-avg { margin-top: 14rpx; font-size: 24rpx; color: #8A90A2; }
.rank-row { padding: 18rpx 0; border-bottom: 2rpx solid #F5F6FA; }
.rank-row:last-child { border-bottom: none; padding-bottom: 0; }
.rank-head { display: flex; align-items: center; margin-bottom: 14rpx; }
.rank-no { width: 40rpx; font-size: 26rpx; font-weight: 700; color: #C4C9D4; text-align: center; margin-right: 12rpx; }
.rank-name { flex: 1; font-size: 28rpx; color: #333A4A; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rank-dur { font-size: 26rpx; color: #4A5063; }
.rank-bar-line { display: flex; align-items: center; padding-left: 52rpx; }
.rank-bar-line .bar { flex: 1; }
.rank-percent { width: 84rpx; text-align: right; font-size: 24rpx; color: #8A90A2; }
.empty-block { display: flex; flex-direction: column; align-items: center; padding: 30rpx 0 10rpx; }
.empty-text { font-size: 26rpx; color: #9AA0B0; }
.empty-btn { margin-top: 26rpx; padding: 18rpx 56rpx; border-radius: 999rpx; background: #5B8DEF; color: #FFFFFF; font-size: 28rpx; font-weight: 600; }
.trend { display: flex; align-items: stretch; height: 260rpx; padding-top: 8rpx; }
.trend-col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
.trend-value { height: 32rpx; line-height: 32rpx; font-size: 18rpx; color: #9AA0B0; white-space: nowrap; }
.trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.trend-bar { width: 26rpx; max-width: 62%; border-radius: 8rpx 8rpx 0 0; background: #CFDCFB; min-height: 4rpx; }
.trend-bar-today { background: #5B8DEF; }
.trend-label { margin-top: 8rpx; height: 28rpx; line-height: 28rpx; font-size: 20rpx; color: #9AA0B0; }
.trend-label-hidden { color: transparent; }
.trend-label-today { color: #5B8DEF; font-weight: 600; }
</style>
