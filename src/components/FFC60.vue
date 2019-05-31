<template>
</template>

<script>
    import commonBuy from '@/components/commonBuy';
    export default {
        name: 'FFC60',
        mixins: [commonBuy],
        mounted() {
            setInterval(() => {
                this.sendAjaxRequest();
            }, 4000)
        }
    }
</script>
