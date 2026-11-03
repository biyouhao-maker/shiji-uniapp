<script>
import store from './utils/store'

export default {
  onLaunch() {
    store.initIfEmpty()
      .then(() => store.getRecords())
      .catch(() => {})
  }
}
</script>

<style>
/* 全局样式已移至 src/common.css（main.js 中导入），确保构建时不会丢失 */
</style>
