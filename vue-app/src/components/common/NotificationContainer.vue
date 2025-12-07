<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification" tag="div">
        <Notification
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @close="removeNotification(notification.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script>
import { computed } from 'vue';
import { useNotifications } from '@/composables/useNotifications.js';
import Notification from './Notification.vue';

export default {
  name: 'NotificationContainer',
  components: {
    Notification
  },
  setup() {
    const { notifications, removeNotification } = useNotifications();

    return {
      notifications,
      removeNotification
    };
  }
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  pointer-events: none;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .notification-container {
    left: 20px;
    right: 20px;
    max-width: 100%;
  }
}
</style>

