<script>
import Original from "@/components/ui-modes/BigCrunchButton";
export default { name: "UndeadCrunchButton", extends: Original };
</script>
<template>
  <section v-if="shouldDisplay" class="crunch-ready">
    <div><strong>魂界边界已至</strong><p>进行转生仪式，获取魂印。重置与保留内容见确认说明。</p></div>
    <button class="o-primary-btn" data-action="crunch" @click="handleClick">转生仪式</button>
  </section>
</template>
