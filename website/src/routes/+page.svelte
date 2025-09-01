<script lang="ts">
  import { PUBLIC_COUNTER_URL, PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
  import { Turnstile } from "svelte-turnstile";
  import GithubCorner from "./GithubCorner.svelte";
  import { blur } from "svelte/transition";
  import { dev } from "$app/environment";

  let timesClicked = $state(0);
  let reloadCaptcha = $state(false);
  let isLoading = $state(false);
  let currentResponse = $state("");
  let hasAsked = $state(false);
  let currentLoadingText = $state("");
  let error = $state("");
  let cfToken = "";

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
    if (timesClicked >= 5) {
      timesClicked = 0;
      reloadCaptcha = !reloadCaptcha; // Trigger re-render of captcha
    } else {
      timesClicked = timesClicked + 1;
    }

    currentLoadingText = getRandomLoadingText();

    // Random delay between 1-4 seconds
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3000 + 1000));

    if (cfToken && PUBLIC_COUNTER_URL) {
      navigator.sendBeacon(
        PUBLIC_COUNTER_URL,
        JSON.stringify({ clicked: true, cf_token: $state.snapshot(cfToken) }),
      );
    }

    currentResponse = getRandomResponse();
    isLoading = false;
    if (!hasAsked) {
      hasAsked = true;
    }
  }

  function onTurnstileSuccess(
    event: CustomEvent<{
      token: string;
      preClearanceObtained: boolean;
    }>,
  ) {
    console.log("Turnstile success:", event.detail.token);
    cfToken = event.detail.token || "";
  }

  function onTurnstileError(errorCode: any) {
    cfToken = "";
    error = `Error Code: ${errorCode}`;
  }

  function onTurnstileExpired() {
    cfToken = "";
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

{#if error !== ""}
  <div class="alert alert-error alert-vertical sm:alert-horizontal">
    <span>{error}</span>
  </div>
{/if}

<div
  class="from-primary/10 to-secondary/10 flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-br p-4 select-none"
>
  <div class="card bg-base-100 w-full max-w-md shadow-2xl">
    <div class="card-body space-y-6 text-center">
      <!-- Header -->
      <div class="space-y-2">
        <h1 class="text-primary text-3xl font-bold">🤔</h1>
        <h2 class="text-2xl font-bold">Is my code working?</h2>
        <p class="text-base-content/70">The eternal developer question</p>
      </div>

      <!-- Response Area -->
      <div class="flex min-h-30 flex-col items-center justify-center gap-5">
        {#if isLoading}
          <p class="text-base-content/60 inline-flex items-center gap-1 text-sm">
            <span>{currentLoadingText}</span>
            <span class="loading loading-sm loading-dots"></span>
          </p>
        {:else if currentResponse}
          <div class="mt-4 *:select-text">
            <div class="text-secondary text-3xl font-semibold">
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
        {#key reloadCaptcha}
          <Turnstile
            siteKey={PUBLIC_TURNSTILE_SITE_KEY}
            on:callback={onTurnstileSuccess}
            on:error={onTurnstileError}
            on:expired={onTurnstileExpired}
            execution="render"
            appearance={dev ? "always" : "interaction-only"}
            theme="dark"
            size={dev ? "normal" : "invisible"}
          />
        {/key}
      </div>

      <!-- Footer -->
      <div class="border-base-300 text-base-content/40 border-t pt-4 text-xs">
        Results may vary. Not responsible for broken deployments.
      </div>
    </div>
  </div>
  <a
    href="https://github.com/The-LukeZ"
    target="_blank"
    class="text-base-content/30 hover:text-base-content py-1.5 text-[8px] transition-all duration-110 ease-in hover:scale-130"
    >Made by LukeZ</a
  >
</div>
