import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		appName: 'Meal Randomizer'
	}
});

export default app;