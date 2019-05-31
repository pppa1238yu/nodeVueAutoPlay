<template>
    <div class="home">
        <FFC30 :gameName="gemeNameFFC30"></FFC30>
        <FFC60 :gameName="gameNameFFC60"></FFC60>
    </div>
</template>

<script>
    // @ is an alias to /src
    import HelloWorld from '@/components/HelloWorld.vue'
    import API from '@/api/getData';
    import FFC30 from '@/components/FFC30';
    import FFC60 from '@/components/FFC60';

    const fs = require('fs');
    import axios from 'axios';

    export default {
        name: 'home',
        components: {
            HelloWorld,
            FFC30,
            FFC60
        },
        data() {
            return {
                gemeNameFFC30: ['flb30mxyssc', 'jpz30mxyssc', 'xjp30mxyssc', 'md30mxyssc', 'jnd30mxyssc', 'xdlswmxyssc', 'xjpswmxyssc'],
                gameNameFFC60: ['mdffxyssc', 'flbffxyssc', 'jpzffxyssc', 'jndfxyssc','blsffc', 'xtxffc', 'txffc', 'xdlxyssc']
            }
        }
    }
</script>
