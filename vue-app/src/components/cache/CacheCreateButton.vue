<template>
  <div class="cache-create-button">
    <button
      @click="openModal"
      :disabled="creating"
      class="btn-create"
      :class="{ 'btn-disabled': creating }"
    >
      <span v-if="creating">Создание...</span>
      <span v-else>➕ Создать кеш</span>
    </button>
    
    <CacheCreateModal
      v-if="showModal"
      :module="module"
      @close="closeModal"
      @create="handleCreate"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import CacheCreateModal from './CacheCreateModal.vue';

export default {
  name: 'CacheCreateButton',
  components: {
    CacheCreateModal
  },
  props: {
    module: {
      type: Object,
      required: true
    }
  },
  emits: ['created'],
  setup(props, { emit }) {
    const showModal = ref(false);
    const creating = ref(false);
    
    const openModal = () => {
      showModal.value = true;
    };
    
    const closeModal = () => {
      showModal.value = false;
    };
    
    const handleCreate = async (result) => {
      creating.value = true;
      try {
        // Эмит события для обновления статуса кеша
        emit('created', result);
      } finally {
        creating.value = false;
      }
    };
    
    return {
      showModal,
      creating,
      openModal,
      closeModal,
      handleCreate
    };
  }
};
</script>

<style scoped>
.cache-create-button {
  display: inline-block;
}

.btn-create {
  padding: 8px 16px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn-create:hover:not(.btn-disabled) {
  background-color: #218838;
}

.btn-create.btn-disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>

