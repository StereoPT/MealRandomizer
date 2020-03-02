<script>
	import { onMount } from 'svelte';

	let meal = {};

	onMount(async function() {
		const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
		const json = await response.json();
		console.log(json.meals[0]);
		meal = json.meals[0];
	});

	export let appName;
</script>

<main>
	<h1>{appName}!</h1>

	<p>{meal.idMeal}</p>
	<img src={meal.strMealThumb} alt="Meal Image">	
	<p>{meal.strMeal}</p>
	<p>{meal.strCategory}</p>
	<p>{meal.strArea}</p>
	<p>{meal.strInstructions}</p>
	<p>{meal.strTags}</p>
	<a href={meal.strSource}>{meal.strSource}</a>

	<ul>
		<li>{meal.strMeasure1} - {meal.strIngredient1}</li>
		<li>{meal.strMeasure2} - {meal.strIngredient2}</li>
		<li>{meal.strMeasure3} - {meal.strIngredient3}</li>
		<li>{meal.strMeasure4} - {meal.strIngredient4}</li>
		<li>{meal.strMeasure5} - {meal.strIngredient5}</li>
		<li>{meal.strMeasure6} - {meal.strIngredient6}</li>
		<li>{meal.strMeasure7} - {meal.strIngredient7}</li>
		<li>{meal.strMeasure8} - {meal.strIngredient8}</li>
		<li>{meal.strMeasure9} - {meal.strIngredient9}</li>
		<li>{meal.strMeasure10} - {meal.strIngredient10}</li>
		<li>{meal.strMeasure11} - {meal.strIngredient11}</li>
		<li>{meal.strMeasure12} - {meal.strIngredient12}</li>
		<li>{meal.strMeasure13} - {meal.strIngredient13}</li>
		<li>{meal.strMeasure14} - {meal.strIngredient14}</li>
		<li>{meal.strMeasure15} - {meal.strIngredient15}</li>
		<li>{meal.strMeasure16} - {meal.strIngredient16}</li>
		<li>{meal.strMeasure17} - {meal.strIngredient17}</li>
		<li>{meal.strMeasure18} - {meal.strIngredient18}</li>
		<li>{meal.strMeasure19} - {meal.strIngredient19}</li>
		<li>{meal.strMeasure20} - {meal.strIngredient20}</li>
	</ul>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>