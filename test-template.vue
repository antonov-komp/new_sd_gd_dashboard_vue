<template>
  <div class="test">
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else-if="!hasData">No data</div>
    <div v-else>
      <Transition name="fade">
        <div class="content">
          <div class="debug">Debug info</div>
          <div v-if="stages && stages.length > 0" class="stages">
            <div v-for="stage in stages" :key="stage.id" class="stage">
              <h3>{{ stage.name }}</h3>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TestTemplate',
  data() {
    return {
      loading: false,
      error: null,
      hasData: true,
      stages: [{ id: 1, name: 'Test Stage' }]
    }
  }
}
</script>