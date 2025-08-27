<script lang="ts">
  import GithubCorner from "./GithubCorner.svelte";
  import { blur } from "svelte/transition";

  let isLoading = $state(false);
  let currentResponse = $state("");
  let hasAsked = $state(false);
  let currentLoadingText = $state("");

  // We track the indices of the used items because it's more efficient to look those up instead of whole strings
  let usedResponseIndices = new Set<number>();
  let usedLoadingIndices = new Set<number>();

  const responses = [
    "No",
    "Yes",
    "It was 5 minutes ago",
    "Maybe",
    "On my computer",
    "Have you tried turning it off and on again?",
    "It depends on what you mean by 'working'",
    "Ask me again in 10 minutes",
    "Probably not",
    "Only on Fridays",
    "It's complicated",
    "Define 'working'",
    "Better than yesterday",
    "Not since the last deployment",
    "Ask ChatGPT, not me!",
    "Not according to one guy from Mongolia",
    "01101110 01101111",
  ];

  const loadingTexts = [
    "Consulting the code gods",
    "Checking for bugs",
    "Running diagnostics",
    "Asking Stack Overflow",
    "Compiling excuses",
    "Blaming the intern",
    "Unplugging the server",
    "Clearing the cache",
    "Updating dependencies",
    "Praying to the demo gods",
    "Checking if it works on my machine",
    "Running it in production",
    "Turning it off and on again",
    "Consulting the rubber duck",
    "Asking ChatGPT",
    "Touching some grass",
    "Looking at your code",
  ];

  function getRandomIndex(arrayLength: number, usedIndices: Set<number>): number {
    // Reset if all indices used
    if (usedIndices.size >= arrayLength) {
      usedIndices.clear();
    }

    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * arrayLength);
    } while (usedIndices.has(randomIndex));

    usedIndices.add(randomIndex);
    return randomIndex;
  }

  const getRandomLoadingText = () => loadingTexts[getRandomIndex(loadingTexts.length, usedLoadingIndices)];
  const getRandomResponse = () => responses[getRandomIndex(responses.length, usedResponseIndices)];

  async function checkCode() {
    currentLoadingText = "";
    currentResponse = "";
    isLoading = true;

    currentLoadingText = getRandomLoadingText();

    // Random delay between 1-4 seconds
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3000 + 1000));

    currentResponse = getRandomResponse();
    isLoading = false;
    if (!hasAsked) {
      hasAsked = true;
    }
  }
</script>

<svelte:head>
  <title>Is My Code Working? 🤔</title>
  <meta name="description" content="Get an answer to the eternal developer question" />
  <meta property="og:title" content="Is My Code Working? 🤔" />
  <meta property="og:description" content="Get an answer to the eternal developer question" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
</svelte:head>

<GithubCorner href="https://github.com/The-LukeZ/ismycodeworking" />

<div
  class="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4 select-none"
>
  <div class="card w-full max-w-md bg-base-100 shadow-2xl">
    <div class="card-body space-y-6 text-center">
      <!-- Header -->
      <div class="space-y-2">
        <h1 class="text-3xl font-bold text-primary">🤔</h1>
        <h2 class="text-2xl font-bold">Is my code working?</h2>
        <p class="text-base-content/70">The eternal developer question</p>
      </div>

      <!-- Response Area -->
      <div class="flex h-30 flex-col items-center justify-center gap-5">
        {#if isLoading}
          <p class="inline-flex items-center gap-1 text-sm text-base-content/60">
            <span>{currentLoadingText}</span>
            <span class="loading loading-sm loading-dots"></span>
          </p>
        {:else if currentResponse}
          <div class="space-y-4">
            <div class="text-3xl font-semibold text-secondary">
              {currentResponse}
            </div>
          </div>
        {/if}
        <button onclick={checkCode} class="btn btn-soft btn-lg btn-primary" disabled={isLoading}>
          {#key hasAsked}
            <span in:blur>
              {hasAsked ? "Ask Again" : "Check My Code"}
            </span>
          {/key}
        </button>
      </div>

      <!-- Footer -->
      <div class="border-t border-base-300 pt-4 text-xs text-base-content/40">
        Results may vary. Not responsible for broken deployments.
      </div>
    </div>
  </div>
  <a
    href="https://github.com/The-LukeZ"
    target="_blank"
    class="py-1.5 text-[8px] text-base-content/30 transition-all duration-110 ease-in hover:scale-130 hover:text-base-content"
    >Made by LukeZ</a
  >
</div>
