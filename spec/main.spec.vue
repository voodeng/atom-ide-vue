<template>
	<transition>
		<ma-in></ma-in>
	</transition>
</template>

<script>

	import MaIn from '../src/main'
	export default {

		components: {
		  MaIn
		},
		data() {
			hello: "World",
			foo: "Bar"
		},
		mounted() {

		},


	}
</script>
