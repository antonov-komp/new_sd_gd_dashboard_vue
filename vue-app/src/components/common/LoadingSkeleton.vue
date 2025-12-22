<template>
  <div 
    class="skeleton" 
    :class="[`skeleton-${variant}`, { 'skeleton-animated': animated }]"
    :style="skeletonStyle"
  >
    <div v-if="animated" class="skeleton-shimmer"></div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'LoadingSkeleton',
  props: {
    width: {
      type: [String, Number],
      default: '100%'
    },
    height: {
      type: [String, Number],
      default: '20px'
    },
    variant: {
      type: String,
      default: 'rect',
      validator: (v) => ['rect', 'circle', 'text', 'table-row'].includes(v)
    },
    animated: {
      type: Boolean,
      default: true
    },
    borderRadius: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const skeletonStyle = computed(() => {
      const style = {
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height
      };
      
      if (props.borderRadius) {
        style.borderRadius = props.borderRadius;
      }
      
      return style;
    });

    return {
      skeletonStyle
    };
  }
};
</script>

<style scoped>
.skeleton {
  background: #f0f0f0;
  position: relative;
  overflow: hidden;
}

.skeleton-rect {
  border-radius: 4px;
}

.skeleton-circle {
  border-radius: 50%;
  aspect-ratio: 1;
}

.skeleton-text {
  border-radius: 4px;
  height: 16px;
}

.skeleton-table-row {
  border-radius: 0;
  height: 48px;
  margin-bottom: 1px;
}

.skeleton-animated {
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #f0f0f0 40%,
    #e0e0e0 50%,
    #f0f0f0 60%,
    #f0f0f0 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.6),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>

