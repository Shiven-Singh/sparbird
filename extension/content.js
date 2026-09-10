// Reads the profile page already open in this tab and hands it to your own local Sparbird.
// Nothing is sent anywhere else, and nothing is stored in the extension.

function textOf(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = node?.innerText?.trim();
    if (text) return text;
  }
  return "";
}

function readProfile() {
  const headline = textOf([
    "[data-generated-suggestion-target] .text-body-medium",
    ".text-body-medium.break-words",
    "main h2",
  ]);

  const name = textOf(["main h1", "h1"]);

  const about = textOf([
    "#about ~ .display-flex .inline-show-more-text",
    "section:has(#about) .inline-show-more-text",
    "main section p",
  ]);

  const posts = Array.from(document.querySelectorAll("main .feed-shared-update-v2, main article"))
    .slice(0, 3)
    .map((node) => node.innerText?.trim().slice(0, 400))
    .filter(Boolean);

  return { name, headline, about, recent_posts: posts, source_url: location.href };
}

// The last expression is what executeScript hands back to the popup.
readProfile();
