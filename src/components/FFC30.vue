<template>
</template>

<script>

    import commonBuy from '@/components/commonBuy';
    export default {
        name: 'FFC30',
        mixins: [commonBuy],
        mounted() {
            setInterval(() => {
                this.sendAjaxRequest();
            }, 2000)
        }
    }
</script>
