<template>
<view class="page">
  <view class="card">
    <view class="card-head">
      <text class="card-title">新建项目</text>
    </view>
    <view class="add-row">
      <input
        class="add-input"
        placeholder="例如：学习英语、编程、健身…"
        placeholder-class="add-placeholder"
        :value="inputValue"
        confirm-type="done"
        @input="onInput"
        @confirm="onAdd"
      />
      <view class="add-btn" @tap="onAdd">添加</view>
    </view>
  </view>

  <view class="card">
    <view class="card-head">
      <text class="card-title">我的项目</text>
      <text class="card-total">{{list.length}} 个</text>
    </view>

    <template v-if="hasData">
      <view
        class="proj-row"
        v-for="item in list"
        :key="item.id"
        :data-id="item.id"
        @tap="goDetail"
      >
        <view class="dot" :style="{background: item.color}"></view>
        <view class="proj-main">
          <text class="proj-name">{{item.name}}</text>
          <text class="proj-total">累计 {{item.totalText}}</text>
        </view>
        <view class="proj-btn" :data-id="item.id" :data-name="item.name" @tap.stop="onEdit">编辑</view>
        <view class="proj-btn proj-btn-del" :data-id="item.id" :data-name="item.name" @tap.stop="onDelete">删除</view>
      </view>
    </template>
    <view v-else class="empty">还没有项目，先在上方创建一个吧</view>
  </view>
</view>
</template>

<script>
import store from '../../utils/store'
import util from '../../utils/util'

export default {
  data() {
    return { inputValue: '', list: [], hasData: false }
  },
  onShow() {
    this.load()
  },
  methods: {
    load() {
      Promise.all([store.getProjects(), store.getRecords()]).then(res => {
        const projects = res[0] || []
        const records = res[1] || []
        const totals = {}
        records.forEach(r => {
          totals[r.projectId] = (totals[r.projectId] || 0) + (r.duration || 0)
        })
        const list = projects.map(p => {
          const total = totals[p.id] || 0
          return { id: p.id, name: p.name, color: p.color, totalText: util.formatDuration(total), total }
        })
        this.list = list
        this.hasData = list.length > 0
      })
    },
    onInput(e) {
      this.inputValue = e.detail.value
    },
    onAdd() {
      const name = (this.inputValue || '').trim()
      if (!name) {
        uni.showToast({ title: '请输入项目名称', icon: 'none' })
        return
      }
      if (this.list.some(p => p.name === name)) {
        uni.showToast({ title: '项目已存在', icon: 'none' })
        return
      }
      store.addProject(name).then(project => {
        if (!project) {
          uni.showToast({ title: '项目已存在', icon: 'none' })
          return
        }
        this.inputValue = ''
        this.load()
        uni.showToast({ title: '已创建', icon: 'success' })
      })
    },
    goDetail(e) {
      uni.navigateTo({ url: '/pages/project-detail/project-detail?id=' + e.currentTarget.dataset.id })
    },
    onEdit(e) {
      const id = e.currentTarget.dataset.id
      const name = e.currentTarget.dataset.name
      uni.showModal({
        title: '编辑项目名称',
        editable: true,
        placeholderText: '请输入新的项目名称',
        content: name,
        success: r => {
          if (!r.confirm) return
          const newName = (r.content || '').trim()
          if (!newName) {
            uni.showToast({ title: '名称不能为空', icon: 'none' })
            return
          }
          store.updateProject(id, newName).then(() => {
            this.load()
            uni.showToast({ title: '已修改', icon: 'none' })
          })
        }
      })
    },
    onDelete(e) {
      const id = e.currentTarget.dataset.id
      const name = e.currentTarget.dataset.name
      uni.showModal({
        title: '删除项目',
        content: '确定删除「' + name + '」吗？已记录的历史时间会保留。',
        confirmColor: '#EB6F6F',
        success: r => {
          if (r.confirm) {
            store.deleteProject(id).then(() => {
              this.load()
              uni.showToast({ title: '已删除', icon: 'none' })
            })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.add-row { display: flex; align-items: center; }
.add-input { flex: 1; height: 88rpx; background: #F4F5F9; border-radius: 20rpx; padding: 0 28rpx; font-size: 28rpx; }
.add-placeholder { color: #A9AFBE; }
.add-btn { margin-left: 20rpx; height: 88rpx; padding: 0 44rpx; display: flex; align-items: center; justify-content: center; background: #5B8DEF; color: #FFFFFF; font-size: 30rpx; font-weight: 600; border-radius: 20rpx; }
.proj-row { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 2rpx solid #F3F4F8; }
.proj-row:last-child { border-bottom: none; }
.proj-main { flex: 1; display: flex; flex-direction: column; }
.proj-name { font-size: 30rpx; color: #1F2430; }
.proj-total { margin-top: 8rpx; font-size: 24rpx; color: #9AA0B0; }
.proj-btn { padding: 12rpx 22rpx; margin-left: 12rpx; font-size: 26rpx; color: #5B8DEF; background: #EEF2FB; border-radius: 16rpx; }
.proj-btn-del { color: #EB6F6F; background: #FDEFEF; }
</style>
