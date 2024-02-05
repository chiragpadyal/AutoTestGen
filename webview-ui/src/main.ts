import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		//@ts-ignore
		name: 'world'
	}
});

export default app;