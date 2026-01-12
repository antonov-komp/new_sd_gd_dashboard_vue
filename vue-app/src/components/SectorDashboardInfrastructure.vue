<template>
  <SectorDashboard sector-id="infrastructure" />
</template>

<script>
/**
 * Контроллер дашборда сектора Infrastructure
 *
 * Гибридный подход: использует универсальный компонент SectorDashboard
 * с простой инициализацией для сектора Infrastructure.
 *
 * @component SectorDashboardInfrastructure
 */
import SectorDashboard from './SectorDashboard.vue';

export default {
  name: 'SectorDashboardInfrastructure',
  components: {
    SectorDashboard
  }
};
</script>

<style scoped>
/* Специфические стили для сектора Infrastructure, если нужны */
.dashboard-sector-infrastructure {
  /* Стили сектора Infrastructure */
}
</style>