// CUSTOM (Forge Neo): keep one Forge tab per browser. Every restart opens a fresh tab, so old
// ones piled up. A newly loaded tab announces itself; every older tab closes. Chrome lets a page
// close itself only if it was opened by a script or has a single history entry, so a tab that
// cannot close is covered with a notice instead.

(function () {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("forge-neo-single-tab");

    function showStaleNotice() {
        if (document.getElementById("forge-stale-tab")) return;
        const cover = document.createElement("div");
        cover.id = "forge-stale-tab";
        cover.style.cssText = "position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(0,0,0,0.85);color:#fff;font:18px sans-serif;text-align:center;padding:16px";
        cover.innerHTML = "<div>A newer Forge tab is open. This one is out of date.</div>";
        const button = document.createElement("button");
        button.textContent = "Close this tab";
        button.style.cssText = "font:16px sans-serif;padding:8px 20px;cursor:pointer";
        button.onclick = () => window.close();
        cover.appendChild(button);
        document.body.appendChild(cover);
    }

    channel.onmessage = (event) => {
        if (event.data !== "new-tab") return;
        window.close();
        setTimeout(showStaleNotice, 300);
    };

    channel.postMessage("new-tab");
})();
