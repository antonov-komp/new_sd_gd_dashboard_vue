<template>
  <div class="skeleton-log-list">
    <div class="skeleton-table-header">
      <LoadingSkeleton 
        v-for="i in 7" 
        :key="i"
        width="120px"
        height="16px"
        variant="text"
      />
    </div>
    <div 
      v-for="i in rows" 
      :key="i"
      class="skeleton-table-row"
    >
      <LoadingSkeleton 
        v-for="j in 7" 
        :key="j"
        width="100%"
        height="20px"
        variant="text"
        :style="{ width: getColumnWidth(j) }"
      />
    </div>
  </div>
</template>

<script>
import LoadingSkeleton from './LoadingSkeleton.vue';

export default {
  name: 'SkeletonLogList',
  components: {
    LoadingSkeleton
  },
  props: {
    rows: {
      type: Number,
      default: 5
    }
  },
  setup() {
    const getColumnWidth = (index) => {
      const widths = ['40px', '15%', '20%', '15%', '15%', '20%', '15%'];
      return widths[index - 1] || '100%';
    };

    return {
      getColumnWidth
    };
  }
};
</script>

<style scoped>
.skeleton-log-list {
  padding: 20px;
}

.skeleton-table-header {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-table-row {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 4px;
}
</style>

