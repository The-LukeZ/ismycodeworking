<script lang="ts">
  import { PUBLIC_COUNTER_URL, PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
  // import { Turnstile } from "svelte-turnstile";
  import GithubCorner from "./GithubCorner.svelte";
  import { blur } from "svelte/transition";
  import { browser, dev } from "$app/environment";

  let timesClicked = $state(0);
  let reloadCaptcha = $state(false);
  let isLoading = $state(false);
  let currentResponse = $state("");
  let hasAsked = $state(false);
  let currentLoadingText = $state("");
  let error = $state({
    title: "",
    description: "",
  });
  let cfToken = $state("");

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

  // Seems like sveltekit doesn't preserve functions when declared "just in the script tag"
  // That is why we need to attach them to the window
  if (browser) {
    window.onTurnstileSuccess = function onTurnstileSuccess(token: string) {
      console.log("Turnstile success!", token);
      cfToken = token || "";
    };

    window.onTurnstileError = function onTurnstileError(errorCode: any) {
      cfToken = "";
      error = {
        title: "Turnstile Error",
        description: `Error Code: ${errorCode}`,
      };
    };

    window.onTurnstileExpired = function onTurnstileExpired() {
      cfToken = "";
      reloadCaptcha = !reloadCaptcha; // Trigger re-render of captcha
    };

    window.onTurnstileTimeout = function onTurnstileTimeout() {
      cfToken = "";
      error = {
        title: "Turnstile Timeout",
        description: "Captcha timed out. Please refresh the page.",
      };
    };
  }
</script>

<svelte:head>
  <title>Is My Code Working? 🤔</title>
  <meta name="description" content="Get an answer to the eternal developer question" />
  <meta property="og:title" content="Is My Code Working? 🤔" />
  <meta property="og:description" content="Get an answer to the eternal developer question" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<GithubCorner href="https://github.com/The-LukeZ/ismycodeworking" />

<div
  class="from-primary/10 to-secondary/10 flex h-screen w-screen select-none flex-col items-center justify-center bg-gradient-to-br p-4"
>
  <div class="card bg-base-100 w-full max-w-md shadow-2xl">
    <div class="card-body gap-5 text-center">
      <!-- Header -->
      <div class="space-y-2">
        <h1 class="text-primary text-3xl font-bold">🤔</h1>
        <h2 class="text-2xl font-bold">Is my code working?</h2>
        <p class="text-base-content/70">The eternal developer question</p>
      </div>

      <!-- Response Area -->
      <div class="min-h-30 flex flex-col items-center justify-center gap-5">
        {#if isLoading}
          <div class="mb-2 mt-3">
            <p class="text-base-content/60 inline-flex items-center gap-1 text-sm">
              <span>{currentLoadingText}</span>
              <span class="loading loading-sm loading-dots"></span>
            </p>
          </div>
        {:else if currentResponse}
          <div class="*:select-text">
            <div class="text-secondary text-3xl font-semibold">
              {currentResponse}
            </div>
          </div>
        {/if}

        {#if error.title !== ""}
          <div class="alert alert-error alert-vertical sm:alert-horizontal w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 class="font-bold">{error.title}</h3>
              <div class="text-xs">{error.description}</div>
            </div>
          </div>
        {/if}

        <button
          onclick={checkCode}
          class="btn btn-soft btn-lg btn-primary"
          disabled={cfToken === "" || isLoading}
        >
          {#if cfToken !== ""}
            {#key hasAsked}
              <span in:blur>
                {hasAsked ? "Ask Again" : "Check My Code"}
              </span>
            {/key}
          {:else}
            <span class="loading loading-dots"></span>
          {/if}
        </button>
        {#key reloadCaptcha}
          <div
            class="cf-turnstile"
            data-sitekey={PUBLIC_TURNSTILE_SITE_KEY}
            data-theme="dark"
            data-size="normal"
            data-callback="onTurnstileSuccess"
            data-error-callback="onTurnstileError"
            data-expired-callback="onTurnstileExpired"
            data-timeout-callback="onTurnstileTimeout"
            data-execution="render"
            data-appearance={dev ? "always" : "interaction-only"}
          ></div>
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
    class="text-base-content/30 hover:text-base-content duration-110 hover:scale-130 py-1.5 text-[8px] transition-all ease-in"
    >Made by LukeZ</a
  >
</div>
