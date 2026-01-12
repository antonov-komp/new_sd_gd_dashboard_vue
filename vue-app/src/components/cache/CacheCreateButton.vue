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
  padding: 12px 20px;
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
}

.btn-create:hover:not(.btn-disabled) {
  background: linear-gradient(135deg, #218838, #1aa085);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.btn-create.btn-disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}
</style>

