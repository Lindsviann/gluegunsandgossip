const copyButton = document.getElementById('copy-cashtag');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const cashtag = document.getElementById('cashtag')?.textContent.trim();
    if (!cashtag) return;
    try {
      await navigator.clipboard.writeText(cashtag);
      copyButton.textContent = 'Copied';
    } catch {
      copyButton.textContent = cashtag;
    }
  });
}
