<script setup>
defineProps({name:String,size:{type:Number,default:20}});
const paths={
 todo:'M8 4h12v16H4V8 M4 3l2 2 4-4 M8 10h8 M8 15h8',
 content:'M4 3h11l5 5v13H4z M14 3v6h6 M8 13h8 M8 17h6',
 library:'M4 4v16 M9 4v16 M14 4l5 16 M3 20h18',
 agent:'M12 3v3 M8 3h8 M4 7h16v13H4z M8 11v2 M16 11v2 M8 17h8 M1 11v5 M23 11v5',
 settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
 plus:'M12 5v14 M5 12h14',
 check:'M5 12l4 4L19 6',
 close:'M6 6l12 12 M18 6L6 18',
 arrow:'M5 12h14 M14 7l5 5-5 5',
 mail:'M3 5h18v14H3z M3 5l9 8 9-8',
 link:'M9 15l6-6 M7 17l-2 2a3 3 0 01-4-4l4-4a3 3 0 014 0 M17 7l2-2a3 3 0 014 4l-4 4a3 3 0 01-4 0',
 refresh:'M20 8a8 8 0 10.3 7 M20 3v5h-5',
 logout:'M10 4H4v16h6 M8 12h13 M17 8l4 4-4 4',
 menu:'M4 6h16 M4 12h16 M4 18h16',
 search:'M10 3a7 7 0 110 14 7 7 0 010-14 M15 15l6 6',
 archive:'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
 copy:'M9 8h12v13H9z M15 8V3H3v12h6',
 clock:'M12 3a9 9 0 110 18 9 9 0 010-18 M12 7v5l3 2',
 chevron:'M9 5l7 7-7 7',
 download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
 upload:'M12 16V4 M7 9l5-5 5 5 M4 16v5h16v-5',
 lock:'M7 10V7a5 5 0 0110 0v3 M4 10h16v11H4z M12 14v3'
};
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]||paths.content"/></svg></template>
