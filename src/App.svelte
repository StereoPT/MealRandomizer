<script>
	import { onMount } from 'svelte';

	let meal = { };

	async function getRandomMeal() {
		const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
		const json = await response.json();
		//console.log(json.meals[0]);
		return json.meals[0];
	}

	onMount(async function() {
		meal = getRandomMeal();
	});

	export let appName;
</script>

<nav class="navbar">
	<ul class="navbar-nav">
		<li class="logo">
			<a href="#" class="nav-link">
				<span class="link-text">MealRandomizer</span>
				<svg
            		aria-hidden="true"
            		focusable="false"
            		data-prefix="fad"
            		data-icon="angle-double-right"
            		role="img"
            		xmlns="http://www.w3.org/2000/svg"
            		viewBox="0 0 448 512"
            		class="svg-inline--fa fa-angle-double-right fa-w-14 fa-5x">
            		<g class="fa-group">
              			<path
                			fill="currentColor"
                			d="M224 273L88.37 409a23.78 23.78 0 0 1-33.8 0L32 386.36a23.94 23.94 0 0 1 0-33.89l96.13-96.37L32 159.73a23.94 23.94 0 0 1 0-33.89l22.44-22.79a23.78 23.78 0 0 1 33.8 0L223.88 239a23.94 23.94 0 0 1 .1 34z"
                			class="fa-secondary">
						</path>
              			<path
                			fill="currentColor"
                			d="M415.89 273L280.34 409a23.77 23.77 0 0 1-33.79 0L224 386.26a23.94 23.94 0 0 1 0-33.89L320.11 256l-96-96.47a23.94 23.94 0 0 1 0-33.89l22.52-22.59a23.77 23.77 0 0 1 33.79 0L416 239a24 24 0 0 1-.11 34z"
                			class="fa-primary">
			  			</path>
            		</g>
          		</svg>
			</a>
		</li>
		<li class="nav-item">
			<a href="#" class="nav-link">
				<svg
					aria-hidden="true"
					focusable="false"
					data-prefix="fas"
					data-icon="random"
					role="img"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
					class="svg-inline--fa fa-random fa-w-16">
					<path
						fill="currentColor"
						class="fa-primary"
						d="M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z">
					</path>
				</svg>
				<span class="link-text">Random</span>
			</a>
		</li>
		<li class="nav-item">
			<a href="#" class="nav-link">
				<svg
					aria-hidden="true"
					focusable="false"
					data-prefix="fas"
					data-icon="info-circle"
					role="img"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 512 512"
					class="svg-inline--fa fa-info-circle fa-w-16">
					<path
						fill="currentColor"
						class="fa-primary"
						d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z">
					</path>
				</svg>
				<span class="link-text">About</span>
			</a>
		</li>
	</ul>
</nav>

<main>
	{#await meal}
		<p>Waiting...</p>
	{:then meal}
		<div class="container">
			<img src={meal.strMealThumb} alt="Meal Image" class="meal-image">	
			<div>
				<h1 class="meal-title">{meal.strMeal}</h1>
				<p hidden>{meal.idMeal}</p>
				<span class="badge">{meal.strCategory}</span>
				<span class="badge">{meal.strArea}</span>
				<span class="badge">{meal.strTags}</span>
				<p class="instructions">{meal.strInstructions}</p>
			</div>
		</div>
		<!--<div>
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
		</div>-->
	{/await}
</main>