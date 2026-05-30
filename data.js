/* =========================================================================
   Family Recipes — data layer
   -------------------------------------------------------------------------
   HOW TO ADD A RECIPE (two ways, both easy):

   1) Easiest: open the website, click "Add recipe", fill the form (or paste
      from Apple Notes). It generates a ready-to-paste recipe block. Copy it
      and paste it into the RECIPES array below, then commit to GitHub.

   2) By hand: copy any recipe object below, change the values, give it a
      unique "id", and add it to the RECIPES array.

   QUANTITY SCALING:
   Each ingredient has { amount, unit, item }. "amount" is the quantity for
   the recipe's base "servings". The site multiplies amount by
   (chosenServings / baseServings) automatically — so scaling Just Works.
   Use amount: null for things like "salt to taste".

   TWO RECIPE SHAPES (both supported):
   • Simple recipe: use top-level  ingredients: [...]  and  steps: [...]
   • Multi-phase recipe (like a pasta with dough + filling + sauce): use
       sections: [ { name: "The Dough", ingredients:[...], steps:[...] }, ... ]
     The Add-form's Apple Notes importer builds these automatically.
   ========================================================================= */

// The two cooks. Add more here if you like (e.g. siblings, dad).
const AUTHORS = {
  you:  { name: "You",  color: "#c0562f" },   // terracotta
  mom:  { name: "Mom",  color: "#5d7355" },   // sage
};

// Smart categories. The "Add" form lets you pick one of these.
const CATEGORIES = [
  { id: "appetizer", label: "Appetizer", color: "#b88a3e" },
  { id: "main",      label: "Main",      color: "#c0562f" },
  { id: "side",      label: "Side",      color: "#5d7355" },
  { id: "soup",      label: "Soup",      color: "#7a3b52" },
  { id: "salad",     label: "Salad",     color: "#6b8e4e" },
  { id: "dessert",   label: "Dessert",   color: "#c0567f" },
  { id: "breakfast", label: "Breakfast", color: "#d68c45" },
  { id: "bread",     label: "Bread",     color: "#a9763e" },
  { id: "drink",     label: "Drink",     color: "#4f7a8e" },
  { id: "sauce",     label: "Sauce",     color: "#8a6d3b" },
];

/* ---- The cookbook. Newest first looks nice but order doesn't matter. ---- */
const RECIPES = [
  {
    id: "cacio-e-pepe-cappelletti",
    title: "Cacio E Pepe y Cappelletti y vodka",
    author: "you",
    category: "main",
    description: "An ambitious project pasta — saffron cappelletti stuffed with a Panela cacio e pepe filling, finished in a spicy vodka emulsion.",
    image: "",
    servings: 6,
    prepMin: 120,
    cookMin: 30,
    sections: [
      {
        name: "The Saffron-Infused Silky Dough",
        ingredients: [
          { amount: 750, unit: "g", item: "Tipo \"00\" flour" },
          { amount: 4, unit: "", item: "Large whole eggs (Room temperature)" },
          { amount: 6, unit: "", item: "Large egg yolks (Room temperature)" },
          { amount: 1, unit: "tbsp", item: "Extra virgin olive oil" },
          { amount: 0.75, unit: "tsp", item: "Kosher salt" },
          { amount: 1, unit: "", item: "generous pinch (about 1/2 tsp) High-quality saffron threads" },
          { amount: 1, unit: "tbsp", item: "Hot water" },
        ],
        steps: [
          "Bloom the Saffron: Place the saffron threads in a mortar and pestle with a tiny pinch of coarse salt (the salt acts as an abrasive). Grind it into a fine powder. Transfer the powder to a small bowl and pour in the 1 tablespoon of hot water. Let it steep for 15 to 20 minutes until the water turns a vibrant, dark crimson.",
          "The Wet Mix: In a bowl, whisk together the whole eggs, egg yolks, olive oil, the 3/4 tsp of salt, and the entire saffron-infused liquid (scrape every bit of color out of the bowl).",
          "The Well: Mound the flour on a clean wooden board and create a deep, wide well in the center. Pour the golden egg mixture into the well.",
          "Incorporate: Using a fork, continuously beat the wet ingredients while slowly pulling in flour from the inner walls of the well.",
          "The Knead: Once the mixture forms a shaggy dough, use your hands to knead it aggressively for 10 to 12 minutes.",
          "The Rest: Wrap the dough airtight in plastic wrap. Let it rest at room temperature for exactly 45 minutes.",
        ],
      },
      {
        name: "The Panela Cacio e Pepe Filling",
        ingredients: [
          { amount: 1.8, unit: "lb", item: "Queso Panela (Crumbled)" },
          { amount: 1, unit: "cup", item: "plus 2 tbsp Parmigiano Reggiano (Finely grated)" },
          { amount: 0.333, unit: "cup", item: "Heavy cream (Cold)" },
          { amount: 2, unit: "tbsp", item: "Whole black peppercorns" },
          { amount: null, unit: "", item: "Zest of 1.5 Lemons" },
          { amount: null, unit: "", item: "Kosher salt (To taste)" },
        ],
        steps: [
          "Toast the Pepper: Place the whole black peppercorns in a dry skillet over medium heat. Toast for 2 to 3 minutes, shaking the pan frequently, until highly fragrant.",
          "Process the Panela: Place the crumbled Queso Panela into a food processor. Pulse several times until it reaches a fine, granular texture.",
          "Bind the Filling: Turn the food processor to low. Slowly stream in 1/3 cup of the heavy cream.",
          "Fold and Season: Transfer the whipped Panela to a large mixing bowl. Fold in the finely grated Parmigiano Reggiano, the toasted black pepper, and the lemon zest.",
          "Chill: Transfer the filling to a pastry bag (or a large ziplock bag). Refrigerate for 30 to 45 minutes to firm up the fats.",
        ],
      },
      {
        name: "Rolling & Shaping (The Atlas 150)",
        ingredients: [

        ],
        steps: [
          "Section the Dough: Cut off a quarter of the rested dough. Immediately re-wrap the remaining dough to keep it from drying out.",
          "Laminate: Set your Marcato Atlas 150 to setting 0. Pass the dough through. Fold the dough into thirds and pass it through setting 0 again.",
          "Roll for Thickness: Pass the laminated sheet sequentially through settings 1, 2, 3, 4, 5, and 6.",
          "Cut and Pipe: Lay the golden sheet flat and cut it into 2.5-inch squares.",
          "The Fold: Fold the square in half diagonally to create a triangle.",
          "Store: Place the finished cappelletti on a baking sheet heavily dusted with semolina flour.",
        ],
      },
      {
        name: "The Spicy Vodka Sauce & Emulsion — The Base",
        ingredients: [
          { amount: 0.25, unit: "cup", item: "Extra virgin olive oil" },
          { amount: 3, unit: "tbsp", item: "European butter" },
          { amount: 3, unit: "", item: "Shallots (Minced finely)" },
          { amount: 4, unit: "cloves", item: "Garlic (Microplaned)" },
          { amount: 9, unit: "oz", item: "Mutti Double-Concentrated Tomato Paste (2 tubes)" },
          { amount: 2, unit: "tbsp", item: "Pure Calabrian chili paste" },
          { amount: 0.75, unit: "cup", item: "Vodka" },
        ],
        steps: [

        ],
      },
      {
        name: "The Spicy Vodka Sauce & Emulsion — The Finish",
        ingredients: [
          { amount: 3, unit: "cup", item: "Heavy cream (Room temperature)" },
          { amount: 0.5, unit: "cup", item: "Parmigiano Reggiano (Freshly grated)" },
          { amount: null, unit: "", item: "Fresh basil (Torn)" },
          { amount: null, unit: "", item: "Kosher salt" },
        ],
        steps: [
          "Sweat the Aromatics: In a heavy-bottomed pan, heat the olive oil and butter over medium-low. Add the minced shallots with a pinch of salt.",
          "The Pincage: Squeeze the 9 oz of Mutti tomato paste into the pan. Increase the heat to medium.",
          "Deglaze: Remove the pan from the heat briefly. Pour in the vodka.",
          "Warm the Base: 15 minutes before serving, place your tomato-vodka base into a large, wide skillet over medium-low heat.",
          "Add the Cream: Slowly stream in the room-temperature heavy cream while stirring continuously.",
          "Boil the Pasta: Drop the saffron cappelletti into heavily salted, rapidly boiling water. Cook for 2 to 3 minutes.",
        ],
      },
    ],
    tips: [
    "This resting period hydrates the starches and relaxes the gluten network, making the dough pliable rather than rubbery.",
    "Piping cold, firm filling helps maintain sharp, precise angles when folding the pasta.",
    ],
  },
  {
    id: "moms-shakshuka",
    title: "Mom's Shakshuka",
    author: "mom",
    category: "breakfast",
    description: "Eggs gently poached in a smoky, slow-cooked pepper and tomato sauce. The dish that fills the whole kitchen with the smell of cumin.",
    image: "",
    servings: 4,
    prepMin: 15,
    cookMin: 30,
    ingredients: [
      { amount: 3,   unit: "tbsp", item: "olive oil" },
      { amount: 1,   unit: "",     item: "onion, finely diced" },
      { amount: 2,   unit: "",     item: "red bell peppers, sliced" },
      { amount: 4,   unit: "",     item: "garlic cloves, minced" },
      { amount: 2,   unit: "tsp",  item: "ground cumin" },
      { amount: 1,   unit: "tsp",  item: "sweet paprika" },
      { amount: 0.25,unit: "tsp",  item: "cayenne (optional)" },
      { amount: 800, unit: "g",    item: "crushed tomatoes" },
      { amount: 6,   unit: "",     item: "eggs" },
      { amount: null,unit: "",     item: "salt & black pepper to taste" },
      { amount: null,unit: "",     item: "fresh parsley & crumbled feta to finish" },
    ],
    steps: [
      "Warm the olive oil in a wide skillet over medium heat. Add the onion and peppers with a pinch of salt and cook slowly for 12–15 minutes until soft and sweet.",
      "Add the garlic, cumin, paprika and cayenne. Stir for 1 minute until fragrant.",
      "Pour in the crushed tomatoes. Simmer **uncovered** for 10–15 minutes until the sauce thickens and a spoon leaves a trail.",
      "Make wells in the sauce and crack an egg into each. Cover and cook 6–8 minutes until whites are set but yolks stay runny.",
      "Scatter with parsley and feta. Serve straight from the pan with warm bread.",
    ],
    tips: [
      "Season the sauce *before* adding the eggs — once the eggs are in you can't stir it without breaking the yolks.",
      "For glossy, restaurant-style yolks, baste the tops with a spoon of hot sauce instead of overcooking the whole egg.",
      "A pinch of sugar tames overly acidic tinned tomatoes — taste first, it's often unnecessary with good ones.",
    ],
  },
  {
    id: "weeknight-cacio-e-pepe",
    title: "Cacio e Pepe",
    author: "you",
    category: "main",
    description: "Three ingredients, infinite respect. Pasta in a silky pecorino-and-pepper sauce built entirely from starchy water and patience.",
    image: "",
    servings: 2,
    prepMin: 5,
    cookMin: 15,
    ingredients: [
      { amount: 200, unit: "g",   item: "spaghetti or tonnarelli" },
      { amount: 100, unit: "g",   item: "Pecorino Romano, finely grated" },
      { amount: 2,   unit: "tsp", item: "black peppercorns, freshly cracked" },
      { amount: null,unit: "",    item: "fine sea salt for the pasta water" },
    ],
    steps: [
      "Toast the cracked pepper in a dry pan for 30 seconds until fragrant. This wakes up the oils.",
      "Boil the pasta in **lightly** salted water (the cheese is salty) until 2 minutes shy of al dente. Save 2 cups of the starchy water.",
      "In a bowl, whisk the pecorino with a few tablespoons of *warm* (not boiling) pasta water into a smooth, thick paste.",
      "Add the toasted pepper and pasta to the pan with a splash of pasta water. Toss hard over low heat.",
      "Off the heat, fold in the cheese paste, tossing constantly and adding water by the spoonful until the sauce turns creamy and clings.",
    ],
    tips: [
      "Cheese hates boiling water — it seizes into rubbery clumps. Let the pan cool for 30 seconds before the pecorino goes in. This is the whole technique.",
      "Grate the pecorino as fine as dust; coarse shreds won't emulsify and you'll get a grainy sauce.",
      "Finish the pasta *in* the sauce, not the sauce on the pasta. The starch released in the final toss is what makes it glossy.",
    ],
  },
  {
    id: "brown-butter-choc-chip",
    title: "Brown Butter Chocolate Chip Cookies",
    author: "you",
    category: "dessert",
    description: "Deeply nutty, chewy in the middle, crisp at the edges, with pools of dark chocolate and a flake of sea salt on top.",
    image: "",
    servings: 18,
    prepMin: 20,
    cookMin: 12,
    ingredients: [
      { amount: 170, unit: "g",   item: "unsalted butter" },
      { amount: 150, unit: "g",   item: "brown sugar" },
      { amount: 100, unit: "g",   item: "white sugar" },
      { amount: 1,   unit: "",    item: "egg + 1 yolk" },
      { amount: 2,   unit: "tsp", item: "vanilla extract" },
      { amount: 230, unit: "g",   item: "all-purpose flour" },
      { amount: 0.75,unit: "tsp", item: "baking soda" },
      { amount: 0.75,unit: "tsp", item: "fine salt" },
      { amount: 200, unit: "g",   item: "dark chocolate, chopped" },
      { amount: null,unit: "",    item: "flaky sea salt to finish" },
    ],
    steps: [
      "Melt the butter and keep cooking, swirling, until it foams then turns amber and smells of toffee. Cool 10 minutes.",
      "Whisk the brown butter with both sugars, then the egg, yolk and vanilla until smooth and glossy (about 1 minute).",
      "Fold in flour, baking soda and salt until just combined, then the chopped chocolate.",
      "**Rest the dough** at least 30 minutes (overnight is better) so the flour hydrates and the flavour deepens.",
      "Scoop into balls, top with a few extra chocolate shards, and bake at 180°C / 355°F for 10–12 minutes until edges are set but centres look underdone. Finish with flaky salt.",
    ],
    tips: [
      "Pull them when the centres still look slightly raw — carry-over heat finishes them on the tray and keeps the middle fudgy.",
      "Resting the dough isn't optional for great cookies; it's the difference between flat-and-greasy and chewy-with-toffee-notes.",
      "Bang the tray on the counter once halfway through baking for that bakery-style rippled, crinkled edge.",
    ],
  },
  {
    id: "moms-chicken-soup",
    title: "Mom's Golden Chicken Soup",
    author: "mom",
    category: "soup",
    description: "The cure-all. A clear, deeply savory broth simmered low and slow until it turns liquid gold, with tender chicken and soft vegetables.",
    image: "",
    servings: 6,
    prepMin: 20,
    cookMin: 120,
    ingredients: [
      { amount: 1.5, unit: "kg",  item: "whole chicken (or thighs + wings)" },
      { amount: 3,   unit: "L",   item: "cold water" },
      { amount: 3,   unit: "",    item: "carrots, in chunks" },
      { amount: 3,   unit: "",    item: "celery stalks, in chunks" },
      { amount: 2,   unit: "",    item: "onions, halved" },
      { amount: 1,   unit: "",    item: "whole garlic head, halved" },
      { amount: 1,   unit: "bunch",item: "fresh dill & parsley, tied" },
      { amount: 2,   unit: "",    item: "bay leaves" },
      { amount: null,unit: "",    item: "salt & whole peppercorns to taste" },
    ],
    steps: [
      "Put the chicken in a big pot, cover with **cold** water, and bring slowly to a bare simmer. Skim off the grey foam as it rises — this is what keeps the broth clear.",
      "Add the vegetables, garlic, herbs, bay and peppercorns. Never let it boil hard; keep it at a lazy simmer.",
      "Simmer gently, partly covered, for 1.5–2 hours, skimming occasionally.",
      "Lift out the chicken, pull the meat from the bones, and return the meat. Strain the broth if you want it crystal clear.",
      "Season at the very end and finish with a handful of fresh dill.",
    ],
    tips: [
      "Always start in COLD water. A hot start seals the proteins and gives you a cloudy, flat-tasting broth.",
      "Never boil a stock — bubbling emulsifies the fat into the liquid and turns it greasy and murky. A few lazy bubbles is all you want.",
      "Salt only at the end. The broth concentrates as it reduces, and early salt almost always over-seasons it.",
    ],
  },
  {
    id: "burrata-tomato-salad",
    title: "Burrata with Heirloom Tomatoes",
    author: "you",
    category: "appetizer",
    description: "Peak-summer on a plate: cold creamy burrata, sweet tomatoes at room temperature, torn basil, good oil. Almost no cooking, all technique of taste.",
    image: "",
    servings: 4,
    prepMin: 15,
    cookMin: 0,
    ingredients: [
      { amount: 2,   unit: "",     item: "balls of burrata" },
      { amount: 600, unit: "g",    item: "mixed heirloom tomatoes" },
      { amount: 1,   unit: "handful",item: "fresh basil" },
      { amount: 4,   unit: "tbsp", item: "extra-virgin olive oil" },
      { amount: 1,   unit: "tsp",  item: "flaky sea salt" },
      { amount: null,unit: "",     item: "black pepper & a little aged balsamic" },
    ],
    steps: [
      "Take the burrata out of the fridge 20 minutes before serving — cold dulls its flavour and texture.",
      "Cut the tomatoes into varied shapes (wedges, slices, halved cherries) and salt them. Let them sit 10 minutes to draw out their juice.",
      "Arrange tomatoes on a plate, tuck the burrata in the middle and tear it open.",
      "Spoon over the tomato juices, drizzle generously with oil, scatter basil, and finish with flaky salt, pepper and a thread of balsamic.",
    ],
    tips: [
      "Salt the tomatoes early and on their own — the released juices become a free, intense dressing you'd otherwise throw away.",
      "Serve everything at room temperature. Fridge-cold mutes both the tomatoes' sweetness and the burrata's cream.",
      "Tear the burrata, don't slice it. The ragged edges catch oil and juice far better than clean cuts.",
    ],
  },
  {
    id: "smashed-roast-potatoes",
    title: "Crispy Smashed Roast Potatoes",
    author: "mom",
    category: "side",
    description: "Boiled until tender, smashed flat, then roasted hard until the edges shatter. Crunchy outside, fluffy inside — the best part of any dinner.",
    image: "",
    servings: 4,
    prepMin: 10,
    cookMin: 45,
    ingredients: [
      { amount: 1,   unit: "kg",   item: "baby potatoes" },
      { amount: 4,   unit: "tbsp", item: "olive oil or duck fat" },
      { amount: 4,   unit: "",     item: "garlic cloves, crushed" },
      { amount: 3,   unit: "sprigs",item: "rosemary" },
      { amount: null,unit: "",     item: "salt & pepper, generously" },
    ],
    steps: [
      "Boil the potatoes in well-salted water until a knife slides in easily, about 20 minutes. Drain and steam-dry 5 minutes.",
      "Place on an oiled tray and press each one flat with a glass or masher until the skin cracks.",
      "Drizzle generously with oil, season hard, and tuck garlic and rosemary around them.",
      "Roast at 220°C / 430°F for 25–30 minutes, flipping once, until deeply golden and crackling at the edges.",
    ],
    tips: [
      "Let the drained potatoes steam-dry in the colander for a few minutes — surface moisture is the enemy of crispiness.",
      "Don't crowd the tray. Potatoes touching each other steam instead of roast; give every one breathing room.",
      "Season the moment they come out, while the oil is still hot and the salt will stick.",
    ],
  },
];

/* ---- Saved external recipe links you both want to try ----
   Add to this array the same way — or use the "Add link" button on the site. */
const LINKS = [
  { title: "NYT Cooking — No-Knead Bread", url: "https://cooking.nytimes.com/recipes/11376-no-knead-bread", addedBy: "you", note: "For the weekend — try with the dutch oven" },
  { title: "Kenji's Ultimate Bolognese", url: "https://www.seriouseats.com/the-best-slow-cooked-bolognese-sauce-recipe", addedBy: "mom", note: "Mom wants to make this for Sunday dinner" },
  { title: "Half Baked Harvest — Marry Me Chicken", url: "https://www.halfbakedharvest.com/marry-me-chicken/", addedBy: "you", note: "Saw this everywhere, looks incredible" },
];
