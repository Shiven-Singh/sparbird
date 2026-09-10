const status = document.getElementById("status");
const button = document.getElementById("go");

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Reading this page...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: profile }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    status.textContent = "Sending to your local Sparbird...";
    const response = await fetch("http://localhost:3000/api/persona", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    });

    if (!response.ok) throw new Error(`Sparbird replied ${response.status}`);
    const data = await response.json();
    status.textContent = `Persona ready: ${data.display_name}. Open localhost:3000 to run it.`;
  } catch (error) {
    status.textContent = `Could not reach Sparbird on localhost:3000. Start it with pnpm dev. (${error.message})`;
  } finally {
    button.disabled = false;
  }
});
