<template>
  <SectorDashboard sector-id="bitrix24" />
</template>

<script>
/**
 * Контроллер дашборда сектора Bitrix24
 *
 * Гибридный подход: использует универсальный компонент SectorDashboard
 * с простой инициализацией для сектора Bitrix24.
 *
 * @component SectorDashboardBitrix24
 */
import SectorDashboard from './SectorDashboard.vue';

export default {
  name: 'SectorDashboardBitrix24',
  components: {
    SectorDashboard
  }
};
</script>

<style scoped>
/* Специфические стили для сектора Bitrix24, если нужны */
.dashboard-sector-bitrix24 {
  /* Стили сектора Bitrix24 */
}
</style>