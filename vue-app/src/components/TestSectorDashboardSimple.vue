<template>
  <div class="test-dashboard">
    <h1>Test SectorDashboard</h1>
    <p>Sector ID: {{ sectorId }}</p>
    <p>Status: OK</p>
  </div>
</template>

<script>
export default {
  name: 'TestSectorDashboardSimple',
  props: {
    sectorId: {
      type: String,
      required: true
    }
  }
};
</script>

<style scoped>
.test-dashboard {
  padding: 20px;
  background: lightblue;
  border: 2px solid blue;
}
</style>