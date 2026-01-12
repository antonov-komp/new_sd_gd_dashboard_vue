<template>
  <SectorDashboard sector-id="pdm" />
</template>

<script>
/**
 * Контроллер дашборда сектора PDM
 *
 * Гибридный подход: использует универсальный компонент SectorDashboard
 * с простой инициализацией для сектора PDM.
 *
 * @component SectorDashboardPDM
 */
import SectorDashboard from './SectorDashboard.vue';

export default {
  name: 'SectorDashboardPDM',
  components: {
    SectorDashboard
  }
};
</script>

<style scoped>
/* Специфические стили для сектора PDM, если нужны */
.dashboard-sector-pdm {
  /* Стили сектора PDM */
}
</style>