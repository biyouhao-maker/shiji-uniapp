<template>
<view class="page">
  <view class="hero">
    <view class="hero-date">{{dateLabel}}</view>
    <view class="hero-sub">今天，时间花在哪里？</view>
  </view>

  <!-- 计时卡片 -->
  <view :class="['timer-card', status]">
    <view class="timer-project">
      <view v-if="status !== 'idle'" class="dot" :style="{background: activeColor}"></view>
      <text>{{status === 'idle' ? '未开始计时' : activeProjectName}}</text>
    </view>
    <view class="timer-value">{{elapsedText}}</view>
    <view class="timer-status">{{statusText}}</view>

    <view class="timer-actions">
      <template v-if="status === 'idle'">
        <view :class="['btn', 'btn-primary', selectedProjectId ? '' : 'btn-disabled']" @tap="onStart">开始计时</view>
      </template>
      <template v-else-if="status === 'running'">
        <view class="btn btn-outline" @tap="onPause">暂停</view>
        <view class="btn btn-white" @tap="onEnd">结束</view>
      </template>
      <template v-else>
        <view class="btn btn-white" @tap="onResume">继续</view>
        <view class="btn btn-outline" @tap="onEnd">结束</view>
      </template>
    </view>
  </view>

  <!-- 选择项目 -->
  <view v-if="status === 'idle'" class="card">
    <view class="card-head">
      <text class="card-title">选择项目</text>
    </view>
    <view v-if="projects.length" class="chips">
      <view
        v-for="item in projects"
        :key="item.id"
        :class="['chip', item.id === selectedProjectId ? 'chip-active' : '']"
        :style="item.id === selectedProjectId ? {borderColor: item.color} : {}"
        :data-id="item.id"
        @tap="onSelectProject"
      >
        <view class="chip-dot" :style="{background: item.color}"></view>
        <text>{{item.name}}</text>
      </view>
    </view>
    <view v-else class="empty">还没有项目，去「项目」页创建一个吧</view>
  </view>

  <!-- 今日记录 -->
  <view class="card">
    <view class="card-head">
      <text class="card-title">今日记录</text>
      <text class="card-total">总计 {{todayTotalText}}</text>
    </view>
    <template v-if="hasToday">
      <view class="tgroup" v-for="item in todayGroups" :key="item.projectId">
        <view class="tgroup-head">
          <view class="dot" :style="{background: item.color}"></view>
          <text class="tgroup-name">{{item.name}}</text>
          <text class="tgroup-total">今日累计 {{item.totalText}}</text>
        </view>
        <view class="tgroup-sessions">
          <view class="tsession" v-for="s in item.sessions" :key="s.id">
            <view class="tsession-line">
              <text class="tsession-time">{{s.timeText}}</text>
              <text :class="['tsession-dur', s.active ? 'tsession-active' : '']">{{s.durationLabel}}</text>
            </view>
            <view v-if="s.pauses.length" class="tsession-pauses">
              <text class="tsession-pause" v-for="(p, pi) in s.pauses" :key="pi">暂停 {{p}}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
    <view v-else class="empty">今天还没有记录</view>
  </view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'

const LONG_RUN_MS = 12 * 60 * 60 * 1000

export default {
  data() {
    return {
      dateLabel: '',
      projects: [],
      selectedProjectId: '',
      status: 'idle',
      statusText: '准备开始',
      activeProjectName: '',
      activeColor: '#5B8DEF',
      elapsedText: '00:00:00',
      todayGroups: [],
      todayTotalText: '0秒',
      hasToday: false
    }
  },
  onLoad() {
    this._projects = []
    this._records = []
    this._active = null
    this._ticker = null
    this._busy = false
    this._saving = false
  },
  onShow() {
    this.refresh()
  },
  onHide() {
    this.stopTicker()
  },
  onUnload() {
    this.stopTicker()
  },
  methods: {
    refresh() {
      return Promise.all([store.getProjects(), store.getRecords(), store.getActive()])
        .then(res => {
          this._projects = res[0] || []
          this._records = res[1] || []
          this._active = res[2] || null

          let selectedProjectId = this.selectedProjectId
          if (!this._projects.some(p => p.id === selectedProjectId)) {
            selectedProjectId = this._projects.length ? this._projects[0].id : ''
          }

          const status = this._active ? this._active.status : 'idle'
          this.dateLabel = util.formatDateLabel(Date.now())
          this.projects = this._projects
          this.selectedProjectId = selectedProjectId
          this.status = status
          this.statusText = status === 'running' ? '正在计时' : (status === 'paused' ? '已暂停' : '准备开始')

          if (this._active && this._active.status === 'running') {
            this.startTicker()
          } else {
            this.stopTicker()
          }
          this.render()
          this.maybeWarnLongRunning()
        })
    },
    computeElapsed(active) {
      if (!active) return 0
      const segs = active.segments || []
      if (!segs.length) return active.accumulated || 0
      let total = 0
      segs.forEach(s => {
        const end = s.endTime != null
          ? s.endTime
          : (active.status === 'running' ? Date.now() : s.startTime)
        if (end > s.startTime) total += end - s.startTime
      })
      return total
    },
    buildSession(record) {
      const pauses = util.computePauses(record.segments)
      const durationText = util.formatDuration(record.duration)
      return {
        id: record.id,
        startTime: record.startTime,
        timeText: util.formatRange(record.startTime, record.endTime),
        durationText,
        durationLabel: pauses.length ? '有效时间 ' + durationText : durationText,
        pauses: pauses.map(p => util.formatRange(p.startTime, p.endTime)),
        active: !!record.active
      }
    },
    render() {
      const projects = this._projects || []
      const today = util.formatDate(Date.now())
      const groups = {}

      const ensure = (pid, name, color) => {
        if (!groups[pid]) {
          groups[pid] = { projectId: pid, name, color, sessions: [], total: 0 }
        }
        return groups[pid]
      }

      ;(this._records || []).forEach(r => {
        const d = r.date || util.formatDate(r.startTime)
        if (d !== today) return
        const p = projects.find(x => x.id === r.projectId)
        const g = ensure(
          r.projectId,
          r.projectName || (p && p.name) || '已删除项目',
          (p && p.color) || '#C4C9D4'
        )
        g.sessions.push({
          ...this.buildSession(r),
          active: false
        })
        g.total += r.duration || 0
      })

      let elapsedText = '00:00:00'
      let activeProjectName = ''
      let activeColor = '#5B8DEF'
      if (this._active) {
        const elapsed = this.computeElapsed(this._active)
        const segs = this._active.segments || []
        const firstStart = segs.length ? segs[0].startTime : (this._active.sessionStart || Date.now())
        elapsedText = util.formatTimer(elapsed)
        const p = projects.find(x => x.id === this._active.projectId)
        activeProjectName = this._active.projectName || (p && p.name) || '已删除项目'
        activeColor = (p && p.color) || '#C4C9D4'

        if (util.formatDate(firstStart) === today) {
          const g = ensure(this._active.projectId, activeProjectName, activeColor)
          const lastSeg = segs.length ? segs[segs.length - 1] : null
          const endLabel = this._active.status === 'running'
            ? '进行中'
            : util.formatClock(lastSeg ? lastSeg.endTime : firstStart)
          const pauses = util.computePauses(segs)
          const durationText = util.formatDuration(elapsed)
          g.sessions.push({
            id: '__active__',
            startTime: firstStart,
            timeText: util.formatClock(firstStart) + ' - ' + endLabel,
            durationText,
            durationLabel: pauses.length ? '有效时间 ' + durationText : durationText,
            pauses: pauses.map(x => util.formatRange(x.startTime, x.endTime)),
            active: true
          })
          g.total += elapsed
        }
      }

      const list = Object.keys(groups).map(k => {
        const g = groups[k]
        g.sessions.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
        g.totalText = util.formatDuration(g.total)
        return g
      }).sort((a, b) => b.total - a.total)

      const total = list.reduce((s, g) => s + g.total, 0)

      this.elapsedText = elapsedText
      this.activeProjectName = activeProjectName
      this.activeColor = activeColor
      this.todayGroups = list
      this.todayTotalText = util.formatDuration(total)
      this.hasToday = list.length > 0
    },
    startTicker() {
      this.stopTicker()
      this._ticker = setInterval(() => this.render(), 1000)
    },
    stopTicker() {
      if (this._ticker) {
        clearInterval(this._ticker)
        this._ticker = null
      }
    },
    maybeWarnLongRunning() {
      const a = this._active
      if (!a || a.status !== 'running' || a.warnedLong) return
      if (this.computeElapsed(a) < LONG_RUN_MS) return
      uni.showModal({
        title: '计时仍在进行',
        content: '「' + (a.projectName || '该项目') + '」已连续计时超过 12 小时，是否仍在进行？',
        cancelText: '继续计时',
        confirmText: '结束并保存',
        success: r => {
          if (r.confirm) {
            this.finishActive()
          } else {
            a.warnedLong = true
            store.setActive(a)
          }
        }
      })
    },
    onSelectProject(e) {
      this.selectedProjectId = e.currentTarget.dataset.id
    },
    onStart() {
      if (this._busy) return
      if (this._active) {
        uni.showToast({ title: '已有正在进行的计时', icon: 'none' })
        return
      }
      const pid = this.selectedProjectId
      if (!pid) {
        uni.showToast({ title: '请先创建并选择项目', icon: 'none' })
        return
      }
      const project = this._projects.find(p => p.id === pid)
      const now = Date.now()
      const active = {
        projectId: pid,
        projectName: project ? project.name : '',
        status: 'running',
        sessionStart: now,
        segments: [{ startTime: now, endTime: null }],
        warnedLong: false
      }
      this._busy = true
      store.setActive(active).then(() => {
        this._busy = false
        this._active = active
        this.status = 'running'
        this.statusText = '正在计时'
        this.startTicker()
        this.render()
      })
    },
    onPause() {
      const a = this._active
      if (!a || a.status !== 'running') return
      const now = Date.now()
      const segs = a.segments || []
      if (segs.length) segs[segs.length - 1].endTime = now
      a.status = 'paused'
      store.setActive(a).then(() => {
        this.stopTicker()
        this.status = 'paused'
        this.statusText = '已暂停'
        this.render()
      })
    },
    onResume() {
      const a = this._active
      if (!a || a.status !== 'paused') return
      a.segments = a.segments || []
      a.segments.push({ startTime: Date.now(), endTime: null })
      a.status = 'running'
      store.setActive(a).then(() => {
        this.status = 'running'
        this.statusText = '正在计时'
        this.startTicker()
        this.render()
      })
    },
    onEnd() {
      const a = this._active
      if (!a) return
      const duration = this.computeElapsed(a)
      if (a.status === 'running') {
        uni.showModal({
          title: '结束当前计时？',
          content: '本次有效时长 ' + util.formatDuration(duration),
          confirmText: '结束',
          success: r => {
            if (r.confirm) this.finishActive()
          }
        })
      } else {
        this.finishActive()
      }
    },
    finishActive() {
      const a = this._active
      if (!a || this._saving) return
      this._saving = true

      const now = Date.now()
      const segments = (a.segments || []).map(s => ({
        startTime: s.startTime,
        endTime: s.endTime != null ? s.endTime : now
      }))
      if (!segments.length) {
        segments.push({ startTime: a.sessionStart || now, endTime: now })
      }
      const duration = util.sumSegments(segments)
      const startTime = segments[0].startTime
      const endTime = segments[segments.length - 1].endTime

      const project = (this._projects || []).find(p => p.id === a.projectId)
      const projectName = a.projectName || (project && project.name) || '已删除项目'

      const record = {
        id: 'r_' + (a.sessionStart || startTime).toString(36) + now.toString(36),
        projectId: a.projectId,
        projectName,
        date: util.formatDate(startTime),
        startTime,
        endTime,
        duration,
        segments
      }

      store.clearActive().then(() => {
        this._active = null
        this.stopTicker()

        if (duration < 1000) {
          this._saving = false
          uni.showToast({ title: '时长过短，未记录', icon: 'none' })
          this.refresh()
          return
        }
        store.addRecord(record).then(() => {
          this._saving = false
          uni.showToast({ title: '已记录 ' + util.formatDuration(duration), icon: 'none' })
          this.refresh()
        })
      })
    }
  }
}
</script>

<style scoped>
.hero { padding: 12rpx 8rpx 28rpx; }
.hero-date { font-size: 46rpx; font-weight: 700; letter-spacing: 1rpx; }
.hero-sub { margin-top: 8rpx; font-size: 26rpx; color: #9AA0B0; }
.timer-card {
  border-radius: 32rpx; padding: 44rpx 32rpx 32rpx; margin-bottom: 28rpx;
  background: #FFFFFF; box-shadow: 0 14rpx 36rpx rgba(91, 141, 239, 0.12);
  display: flex; flex-direction: column; align-items: center;
}
.timer-card.running { background: #5B8DEF; color: #FFFFFF; box-shadow: 0 16rpx 40rpx rgba(91, 141, 239, 0.35); }
.timer-card.paused { background: #6C7690; color: #FFFFFF; box-shadow: 0 16rpx 40rpx rgba(108, 118, 144, 0.3); }
.timer-project { display: flex; align-items: center; font-size: 28rpx; opacity: 0.95; }
.timer-value { font-size: 96rpx; font-weight: 700; letter-spacing: 2rpx; margin: 20rpx 0 6rpx; }
.timer-status { font-size: 24rpx; opacity: 0.75; }
.timer-actions { display: flex; width: 100%; margin: 36rpx -8rpx 0; }
.timer-actions .btn { margin: 0 8rpx; }
.tgroup { padding: 18rpx 0; border-bottom: 2rpx solid #F3F4F8; }
.tgroup:last-child { border-bottom: none; padding-bottom: 0; }
.tgroup-head { display: flex; align-items: center; margin-bottom: 12rpx; }
.tgroup-name { flex: 1; font-size: 28rpx; color: #1F2430; font-weight: 600; }
.tgroup-total { font-size: 24rpx; color: #5B8DEF; }
.tgroup-sessions { padding-left: 36rpx; }
.tsession { padding: 12rpx 0; border-bottom: 2rpx dashed #F0F2F7; }
.tsession:last-child { border-bottom: none; }
.tsession-line { display: flex; align-items: center; justify-content: space-between; }
.tsession-time { font-size: 26rpx; color: #4A5063; }
.tsession-dur { font-size: 26rpx; color: #8A90A2; }
.tsession-active { color: #5B8DEF; font-weight: 600; }
.tsession-pauses { margin-top: 8rpx; }
.tsession-pause { display: block; font-size: 22rpx; color: #B0B6C4; margin-top: 4rpx; }
</style>
