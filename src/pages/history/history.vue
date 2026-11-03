<template>
<view class="page">
  <view class="card">
    <view class="card-head">
      <text class="card-title">历史记录</text>
      <text class="card-total">{{list.length}} 天</text>
    </view>

    <template v-if="hasData">
      <view class="day-block" v-for="item in list" :key="item.date">
        <view class="day-head" :data-date="item.date" @tap="goDay">
          <view class="day-head-left">
            <text class="day-label">{{item.dateText}}</text>
            <text class="day-sub">{{item.subText}}</text>
          </view>
          <view class="day-head-right">
            <text class="day-total">总计 {{item.totalText}}</text>
            <text class="day-arrow">›</text>
          </view>
        </view>

        <view class="day-groups">
          <view class="tgroup" v-for="g in item.groups" :key="g.projectId">
            <view class="tgroup-head">
              <view class="dot" :style="{background: g.color}"></view>
              <text class="tgroup-name">{{g.name}}</text>
              <text class="tgroup-total">累计 {{g.totalText}}</text>
            </view>
            <view class="tgroup-sessions">
              <view class="tsession" v-for="s in g.sessions" :key="s.id">
                <view class="tsession-line">
                  <text class="tsession-time">{{s.timeText}}</text>
                  <text class="tsession-dur">{{s.durationLabel}}</text>
                </view>
                <view v-if="s.pauses.length" class="tsession-pauses">
                  <text class="tsession-pause" v-for="(p, pi) in s.pauses" :key="pi">暂停 {{p}}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
    <view v-else class="empty">还没有任何记录，去首页开始一次计时吧</view>
  </view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'

export default {
  data() {
    return { list: [], hasData: false }
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      Promise.all([store.getRecords(), store.getProjects()]).then(res => {
        const records = res[0] || []
        const projects = res[1] || []

        const byDate = {}
        records.forEach(r => {
          const d = r.date || util.formatDate(r.startTime)
          if (!byDate[d]) byDate[d] = []
          byDate[d].push(r)
        })

        const nowYear = new Date().getFullYear()

        const list = Object.keys(byDate)
          .sort((a, b) => (a < b ? 1 : -1))
          .map(d => {
            const dayRecords = byDate[d].slice().sort((a, b) => a.startTime - b.startTime)
            const ts = util.parseDate(d)

            const gmap = {}
            const groups = []
            dayRecords.forEach(r => {
              const p = projects.find(x => x.id === r.projectId)
              if (!gmap[r.projectId]) {
                gmap[r.projectId] = {
                  projectId: r.projectId,
                  name: p ? p.name : (r.projectName || '已删除项目'),
                  color: p ? p.color : '#C4C9D4',
                  sessions: [],
                  total: 0
                }
                groups.push(gmap[r.projectId])
              }
              const g = gmap[r.projectId]
              const pauses = util.computePauses(r.segments)
              const durationText = util.formatDuration(r.duration)
              g.sessions.push({
                id: r.id,
                startTime: r.startTime,
                timeText: util.formatRange(r.startTime, r.endTime),
                durationLabel: pauses.length ? '有效时间 ' + durationText : durationText,
                pauses: pauses.map(x => util.formatRange(x.startTime, x.endTime))
              })
              g.total += r.duration || 0
            })
            groups.forEach(g => { g.totalText = util.formatDuration(g.total) })
            groups.sort((a, b) => b.total - a.total)

            const total = dayRecords.reduce((s, r) => s + (r.duration || 0), 0)
            const label = util.dayLabel(ts)
            const isRecent = label === '今天' || label === '昨天'
            const yearPrefix = new Date(ts).getFullYear() === nowYear ? '' : new Date(ts).getFullYear() + '年'

            return {
              date: d,
              dateText: label,
              subText: isRecent ? (util.formatMonthDay(ts) + ' ' + util.weekdayCN(ts)) : (yearPrefix + util.weekdayCN(ts)),
              totalText: util.formatDuration(total),
              count: dayRecords.length,
              groups
            }
          })

        this.list = list
        this.hasData = list.length > 0
      })
    },
    goDay(e) {
      uni.navigateTo({ url: '/pages/day/day?date=' + e.currentTarget.dataset.date })
    }
  }
}
</script>

<style scoped>
.day-block { padding: 20rpx 0; border-bottom: 2rpx solid #F3F4F8; }
.day-block:last-child { border-bottom: none; padding-bottom: 0; }
.day-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.day-head-left { display: flex; flex-direction: column; }
.day-label { font-size: 30rpx; font-weight: 600; color: #1F2430; }
.day-sub { margin-top: 6rpx; font-size: 22rpx; color: #B0B6C4; }
.day-head-right { display: flex; align-items: center; }
.day-total { font-size: 26rpx; font-weight: 600; color: #5B8DEF; }
.day-arrow { margin-left: 12rpx; font-size: 34rpx; color: #C4C9D4; }
.day-groups { padding-left: 8rpx; }
.tgroup { padding: 12rpx 0; }
.tgroup-head { display: flex; align-items: center; margin-bottom: 8rpx; }
.tgroup-name { flex: 1; font-size: 27rpx; color: #333A4A; font-weight: 600; }
.tgroup-total { font-size: 23rpx; color: #9AA0B0; }
.tgroup-sessions { padding-left: 36rpx; }
.tsession { padding: 8rpx 0; }
.tsession-line { display: flex; align-items: center; justify-content: space-between; }
.tsession-time { font-size: 26rpx; color: #4A5063; }
.tsession-dur { font-size: 25rpx; color: #8A90A2; }
.tsession-pauses { margin-top: 6rpx; }
.tsession-pause { display: block; font-size: 22rpx; color: #B0B6C4; margin-top: 4rpx; }
</style>
