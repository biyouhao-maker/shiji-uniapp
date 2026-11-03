<template>
<view class="page">
  <view class="profile-head">
    <view class="avatar">时</view>
    <view class="profile-info">
      <view class="profile-name">时记</view>
      <view class="profile-desc">记录时间花在哪里</view>
    </view>
  </view>

  <view class="card">
    <view class="overview">
      <view class="ov-item">
        <view class="ov-value">{{projectCount}}</view>
        <view class="ov-label">项目</view>
      </view>
      <view class="ov-item">
        <view class="ov-value">{{recordCount}}</view>
        <view class="ov-label">记录</view>
      </view>
      <view class="ov-item">
        <view class="ov-value">{{totalText}}</view>
        <view class="ov-label">累计时长</view>
      </view>
    </view>
  </view>

  <view class="card menu">
    <view class="menu-item" @tap="goHistory">
      <text class="menu-text">历史记录</text>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-item" @tap="goStats">
      <text class="menu-text">统计概览</text>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-item" @tap="clearData">
      <text class="menu-text">清空全部数据</text>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-item" @tap="about">
      <text class="menu-text">关于时记</text>
      <text class="menu-arrow">›</text>
    </view>
  </view>

  <view class="version">时记 V1.0</view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'

export default {
  data() {
    return { projectCount: 0, recordCount: 0, totalText: '0秒' }
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      Promise.all([store.getProjects(), store.getRecords()]).then(res => {
        const projects = res[0] || []
        const records = res[1] || []
        const total = records.reduce((s, r) => s + (r.duration || 0), 0)
        this.projectCount = projects.length
        this.recordCount = records.length
        this.totalText = util.formatDuration(total)
      })
    },
    goHistory() {
      uni.navigateTo({ url: '/pages/history/history' })
    },
    goStats() {
      uni.switchTab({ url: '/pages/stats/stats' })
    },
    clearData() {
      uni.showModal({
        title: '清空全部数据',
        content: '将删除所有项目、记录与正在进行的计时，且无法恢复。',
        confirmColor: '#EB6F6F',
        confirmText: '清空',
        success: r => {
          if (r.confirm) {
            store.clearAll().then(() => {
              this.load()
              uni.showToast({ title: '已清空', icon: 'none' })
            })
          }
        }
      })
    },
    about() {
      uni.showModal({
        title: '时记 V1.0',
        content: '记录时间花在哪里。\n数据保存在本地，支持 H5 / PWA / App 多端使用。',
        showCancel: false
      })
    }
  }
}
</script>

<style scoped>
.profile-head { display: flex; align-items: center; padding: 16rpx 8rpx 40rpx; }
.avatar { width: 120rpx; height: 120rpx; border-radius: 32rpx; background: #5B8DEF; color: #FFFFFF; font-size: 56rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 30rpx rgba(91, 141, 239, 0.35); }
.profile-info { margin-left: 28rpx; }
.profile-name { font-size: 40rpx; font-weight: 700; }
.profile-desc { margin-top: 8rpx; font-size: 26rpx; color: #9AA0B0; }
.overview { display: flex; }
.ov-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.ov-value { font-size: 36rpx; font-weight: 700; color: #1F2430; }
.ov-label { margin-top: 10rpx; font-size: 24rpx; color: #9AA0B0; }
.menu { padding: 8rpx 32rpx; }
.menu-item { display: flex; align-items: center; justify-content: space-between; padding: 30rpx 0; border-bottom: 2rpx solid #F3F4F8; }
.menu-item:last-child { border-bottom: none; }
.menu-text { font-size: 30rpx; color: #1F2430; }
.menu-arrow { font-size: 36rpx; color: #C4C9D4; }
.version { text-align: center; font-size: 24rpx; color: #B4B9C6; margin-top: 20rpx; }
</style>
